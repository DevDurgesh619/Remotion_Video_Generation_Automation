require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const OpenAI = require("openai");
const { createObjectCsvWriter } = require("csv-writer");
const { assemblePrompt, getPromptSummary } = require("./prompts/assembler");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompts = JSON.parse(fs.readFileSync("./prompts.json"));

// ---------------------------------------------------------------------------
// CONFIGURATION — Switch between v1 (dense) and v2 (sparse) spec folders
// ---------------------------------------------------------------------------
const SPEC_VERSION = process.env.SPEC_VERSION || "v2";
const SPEC_FOLDER = SPEC_VERSION === "v1" ? "./machine_specs" : "./machine_specs_v2";
const ERROR_LOG_FILE = "./errors_tracing.json";

const csvWriter = createObjectCsvWriter({
  path: "results.csv",
  header: [
    { id: "id", title: "ID" },
    { id: "category", title: "Category" },
    { id: "prompt", title: "Prompt" },
    { id: "videoLink", title: "Video" },
    { id: "codeLink", title: "Code" },
    { id: "visualClarity", title: "Visual Clarity (1-5)" },
    { id: "motionSmoothness", title: "Motion Smoothness (1-5)" },
    { id: "promptFaithfulness", title: "Prompt Faithfulness (1-5)" },
    { id: "codeCleanliness", title: "Code Cleanliness (1-5)" },
    { id: "reusability", title: "Reusability (1-5)" },
    { id: "notes", title: "Notes" },
  ],
  append: true,
});

// ---------------------------------------------------------------------------
// ERROR LOGGING — Auto-append to errors_tracing.json
// ---------------------------------------------------------------------------
function logError(promptId, promptTitle, errorType, layer, rootCause) {
  let errors = [];
  try {
    if (fs.existsSync(ERROR_LOG_FILE)) {
      errors = JSON.parse(fs.readFileSync(ERROR_LOG_FILE, "utf8"));
    }
  } catch (_) {
    errors = [];
  }

  const nextId = errors.length > 0
    ? Math.max(...errors.map(function(e) { return e.id || 0; })) + 1
    : 1;

  errors.push({
    id: nextId,
    prompt: promptTitle,
    prompt_id: promptId,
    error_type: errorType,
    layer: layer,
    root_cause: rootCause,
    timestamp: new Date().toISOString(),
  });

  fs.writeFileSync(ERROR_LOG_FILE, JSON.stringify(errors, null, 2));
  console.log("  Logged error to " + ERROR_LOG_FILE);
}

// ---------------------------------------------------------------------------
// CODE CLEANING — Strip markdown fences and headers from LLM output
// ---------------------------------------------------------------------------
function cleanLLMCode(code) {
  if (!code) return "";

  return code
    .replace(/```jsx/g, "")
    .replace(/```tsx/g, "")
    .replace(/```typescript/g, "")
    .replace(/```javascript/g, "")
    .replace(/```/g, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/```[a-zA-Z]*/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// STATIC VALIDATION — Quick regex checks on generated code
// ---------------------------------------------------------------------------
function staticValidation(code) {
  const issues = [];

  if (code.includes("${")) {
    issues.push("Template literal interpolation detected (${...})");
  }
  if (code.includes("`")) {
    issues.push("Backtick detected (template literal)");
  }
  if (code.includes("for (") || code.includes("for(")) {
    issues.push("for loop detected");
  }
  if (code.includes(".map(") || code.includes(".map (")) {
    issues.push(".map() loop detected");
  }
  if (code.includes("Array.from")) {
    issues.push("Array.from detected");
  }
  if (code.includes("while (") || code.includes("while(")) {
    issues.push("while loop detected");
  }
  // Check for framer-motion usage
  if (code.includes("motion.div") || code.includes("framer-motion")) {
    issues.push("framer-motion usage detected");
  }
  // Check for import/export (should not be in body)
  if (code.includes("import ") || code.includes("export ")) {
    issues.push("import/export statement detected in body");
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TYPESCRIPT COMPILATION CHECK (Task 2)
// ---------------------------------------------------------------------------
function typeCheckComponent() {
  try {
    execSync("npx tsc --noEmit", {
      stdio: "pipe",
      cwd: process.cwd(),
    });
    return { success: true, error: null };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    const stdout = err.stdout ? err.stdout.toString() : "";
    const errorOutput = stderr || stdout || "Unknown TypeScript error";
    // Only look at errors in src/ files, ignore node_modules type conflicts
    const srcErrors = errorOutput
      .split("\n")
      .filter(function(line) { return line.includes("src/") && line.includes("error TS"); })
      .slice(0, 5)
      .join("\n");
    if (!srcErrors) {
      // No src/ errors — only node_modules type conflicts, which are fine
      return { success: true, error: null };
    }
    return { success: false, error: srcErrors };
  }
}

// ---------------------------------------------------------------------------
// ASSET DETECTION — Check if spec contains asset shape objects
// ---------------------------------------------------------------------------
function specHasAssets(specData) {
  if (Array.isArray(specData.objects)) {
    return specData.objects.some(function(o) { return o.shape === "asset"; });
  }
  return false;
}

// ---------------------------------------------------------------------------
// DURATION EXTRACTION — from spec (sparse format)
// ---------------------------------------------------------------------------
function getDurationFromSpec(specData) {
  // Sparse spec: top-level "duration" in seconds
  if (specData.duration && typeof specData.duration === "number") {
    return Math.floor(specData.duration * 30);
  }
  // Legacy dense spec: "duration_sec"
  if (specData.duration_sec && typeof specData.duration_sec === "number") {
    return Math.floor(specData.duration_sec * 30);
  }
  console.warn("  No duration found in spec, defaulting to 120 frames");
  return 120;
}

// ---------------------------------------------------------------------------
// CODE GENERATION — Uses modular prompt assembly (Task 4)
// ---------------------------------------------------------------------------
async function generateCode(specText, specData) {
  // Assemble the system prompt based on spec content
  const systemPrompt = assemblePrompt(specData);
  const summary = getPromptSummary(specData);
  console.log("  Prompt modules loaded: " + summary.totalModules + " (" + summary.advancedModules + " advanced: " + summary.advancedTypes.join(", ") + ")");

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: "Motion Spec JSON:\n" + specText,
      },
    ],
  });

  let code = response.choices[0].message.content;
  code = cleanLLMCode(code);
  return code;
}

// ---------------------------------------------------------------------------
// CODE GENERATION WITH ERROR FEEDBACK — Retry with TS error context
// ---------------------------------------------------------------------------
async function generateCodeWithFix(specText, specData, previousCode, tsError) {
  const systemPrompt = assemblePrompt(specData);

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: "Motion Spec JSON:\n" + specText,
      },
      {
        role: "assistant",
        content: previousCode,
      },
      {
        role: "user",
        content: "The code above has TypeScript compilation errors:\n\n" + tsError + "\n\nPlease fix the code and return the corrected JSX component body. Return ONLY the fixed code, no explanations.",
      },
    ],
  });

  let code = response.choices[0].message.content;
  code = cleanLLMCode(code);
  return code;
}

// ---------------------------------------------------------------------------
// MAIN PIPELINE
// ---------------------------------------------------------------------------
async function run() {
  console.log("Using spec folder: " + SPEC_FOLDER);
  console.log("Processing " + prompts.length + " prompts...\n");

  for (const item of prompts) {
    const specPath = SPEC_FOLDER + "/spec_" + item.id + ".json";

    if (!fs.existsSync(specPath)) {
      console.log("❌ Missing spec for " + item.id + " at " + specPath);
      continue;
    }

    const spec = fs.readFileSync(specPath, "utf8");
    const codePath = "outputs/code_" + item.id + ".tsx";
    const videoPath = "outputs/video_" + item.id + ".mp4";

    // Skip if video already exists
    if (fs.existsSync(videoPath)) {
      console.log("Skipping " + item.id + " (already rendered)");
      continue;
    }

    console.log("Processing " + item.id + ": " + item.prompt.slice(0, 60) + "...");

    // Parse spec
    let specData;
    try {
      specData = JSON.parse(spec);
    } catch (parseErr) {
      console.log("  ❌ Invalid JSON in spec file for " + item.id);
      logError(item.id, item.prompt, "JSON Parse Error", "spec", parseErr.message);
      continue;
    }

    const durationInFrames = getDurationFromSpec(specData);
    console.log("  Duration: " + durationInFrames + " frames (" + (durationInFrames / 30) + "s)");

    // --- STEP 1: Get or generate code ---
    let jsxContent;
    const codeExists = fs.existsSync(codePath);

    if (codeExists) {
      console.log("  Using existing code");
      jsxContent = fs.readFileSync(codePath, "utf8");
    } else {
      console.log("  Generating code...");
      jsxContent = await generateCode(spec, specData);

      // --- Static validation + retry ---
      for (let attempt = 0; attempt < 2; attempt++) {
        const issues = staticValidation(jsxContent);
        if (issues.length > 0) {
          console.log("  ⚠️  Static issues: " + issues.join(", "));
          console.log("  Retrying generation (attempt " + (attempt + 2) + "/3)...");
          jsxContent = await generateCode(spec, specData);
        } else {
          break;
        }
      }

      // Final static check — log but don't skip (let TS check catch real issues)
      const finalIssues = staticValidation(jsxContent);
      if (finalIssues.length > 0) {
        console.log("  ⚠️  Remaining static issues after retries: " + finalIssues.join(", "));
      }
    }

    // --- STEP 2: Wrap in full component ---
    const hasAssets = specHasAssets(specData);
    let fullComponent;
    if (codeExists) {
      fullComponent = jsxContent;
    } else {
      let imports = 'import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";\n';
      if (hasAssets) {
        imports += 'import { Asset } from "./assets/Asset";\n';
      }
      fullComponent =
        imports + "\n" +
        "export const GeneratedMotion = () => {\n" +
        jsxContent +
        "\n};\n";
    }

    // Write the generated component
    fs.writeFileSync("src/GeneratedMotion.tsx", fullComponent);
    fs.writeFileSync(codePath, fullComponent);

    // --- STEP 3: TypeScript compilation check (Task 2) ---
    console.log("  TypeScript checking...");
    let tsResult = typeCheckComponent();

    if (!tsResult.success && !codeExists) {
      console.log("  ❌ TypeScript error: " + tsResult.error.slice(0, 200));
      console.log("  Retrying with error feedback...");

      // Retry with error context
      jsxContent = await generateCodeWithFix(spec, specData, jsxContent, tsResult.error);

      let retryImports = 'import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";\n';
      if (hasAssets) {
        retryImports += 'import { Asset } from "./assets/Asset";\n';
      }
      fullComponent =
        retryImports + "\n" +
        "export const GeneratedMotion = () => {\n" +
        jsxContent +
        "\n};\n";

      fs.writeFileSync("src/GeneratedMotion.tsx", fullComponent);
      fs.writeFileSync(codePath, fullComponent);

      // Re-check
      tsResult = typeCheckComponent();

      if (!tsResult.success) {
        console.log("  ❌ TypeScript still failing after retry: " + tsResult.error.slice(0, 200));
        logError(item.id, item.prompt, "TypeScript Error", "code_generation", tsResult.error.slice(0, 500));
        // Continue to try rendering anyway — some TS errors don't prevent rendering
      } else {
        console.log("  ✅ TypeScript fixed on retry");
      }
    } else if (!tsResult.success && codeExists) {
      console.log("  ⚠️  Existing code has TS errors (skipping fix): " + tsResult.error.slice(0, 200));
    } else {
      console.log("  ✅ TypeScript OK");
    }

    // --- STEP 4: Render with Remotion (Task 3 & 5) ---
    // Pass duration as env var instead of rewriting Root.tsx (Task 5)
    console.log("  Rendering...");
    try {
      execSync(
  `npx remotion render src/index.ts GeneratedMotion ${videoPath}`,
  {
    stdio: "inherit",
    env: {
      ...process.env,
      REMOTION_APP_DURATION_FRAMES: String(durationInFrames),
      REMOTION_APP_VIDEO_WIDTH: "1920",
      REMOTION_APP_VIDEO_HEIGHT: "1080"
    }
  }
);
    } catch (renderErr) {
      // --- Task 3: Capture render errors instead of crashing ---
      const errMsg = renderErr.message || "Unknown render error";
      console.log("  ❌ Render failed: " + errMsg.slice(0, 300));
      logError(
        item.id,
        item.prompt,
        "Render Error",
        "remotion_runtime",
        errMsg.slice(0, 500)
      );
      continue; // Skip to next prompt instead of crashing
    }

    // --- STEP 5: Log results to CSV ---
    await csvWriter.writeRecords([
      {
        id: item.id,
        category: item.category,
        prompt: item.prompt,
        videoLink: '=HYPERLINK("' + videoPath + '", "View Video")',
        codeLink: '=HYPERLINK("' + codePath + '", "View Code")',
        visualClarity: "",
        motionSmoothness: "",
        promptFaithfulness: "",
        codeCleanliness: "",
        reusability: "",
        notes: "",
      },
    ]);

    console.log("  ✅ Finished " + item.id + " (" + durationInFrames + " frames)\n");
  }

  console.log("\n🎉 Batch run complete.");
}

run();
