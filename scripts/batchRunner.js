// SHAPE-MOTION-LAB — BATCH RUNNER v3 (Spec VM)
// Pipeline: Spec JSON → Remotion render (via SpecPlayer runtime)
// No code generation. No LLM. No compiler. No TypeScript validation.

require("dotenv").config();
const fs = require("fs");
const { execSync } = require("child_process");
const { createObjectCsvWriter } = require("csv-writer");

// ─── Configuration ──────────────────────────────────────────────────────────

const SPEC_VERSION = process.env.SPEC_VERSION || "v2";
const SPEC_FOLDER =
  SPEC_VERSION === "v1" ? "./machine_specs" : "./machine_specs_v2";
const ERROR_LOG_FILE = "./errors_tracing.json";
const PARALLEL_BATCH_SIZE = parseInt(process.env.PARALLEL_BATCH || "1", 10);

const prompts = JSON.parse(fs.readFileSync("./prompts.json"));

const csvWriter = createObjectCsvWriter({
  path: "results.csv",
  header: [
    { id: "id", title: "ID" },
    { id: "category", title: "Category" },
    { id: "prompt", title: "Prompt" },
    { id: "videoLink", title: "Video" },
    { id: "specLink", title: "Spec" },
    { id: "method", title: "Method" },
    { id: "visualClarity", title: "Visual Clarity (1-5)" },
    { id: "motionSmoothness", title: "Motion Smoothness (1-5)" },
    { id: "promptFaithfulness", title: "Prompt Faithfulness (1-5)" },
    { id: "codeCleanliness", title: "Code Cleanliness (1-5)" },
    { id: "reusability", title: "Reusability (1-5)" },
    { id: "notes", title: "Notes" },
  ],
  append: true,
});

// ─── Error logging ──────────────────────────────────────────────────────────

function logError(promptId, promptTitle, errorType, layer, rootCause) {
  let errors = [];
  try {
    if (fs.existsSync(ERROR_LOG_FILE)) {
      errors = JSON.parse(fs.readFileSync(ERROR_LOG_FILE, "utf8"));
    }
  } catch (_) {
    errors = [];
  }

  const nextId =
    errors.length > 0
      ? Math.max(...errors.map(function (e) { return e.id || 0; })) + 1
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
  console.log("  📝 Logged error to " + ERROR_LOG_FILE);
}

// ─── Duration extraction ────────────────────────────────────────────────────

function getDurationFromSpec(specData) {
  const fps = specData.fps || 30;

  if (specData.duration && typeof specData.duration === "number") {
    return Math.round(specData.duration * fps);
  }
  if (specData.duration_sec && typeof specData.duration_sec === "number") {
    return Math.round(specData.duration_sec * fps);
  }

  console.warn("  ⚠️  No duration found in spec, defaulting to 120 frames");
  return 120;
}

// ─── Canvas dimensions ──────────────────────────────────────────────────────

function getCanvasDimensions(specData) {
  return {
    width: specData.canvas && specData.canvas.w ? specData.canvas.w : 720,
    height: specData.canvas && specData.canvas.h ? specData.canvas.h : 720,
  };
}

// ─── Process a single prompt ────────────────────────────────────────────────

async function processPrompt(item) {
  const specPath = SPEC_FOLDER + "/spec_" + item.id + ".json";

  // 1. Check spec exists
  if (!fs.existsSync(specPath)) {
    console.log("❌ Missing spec for " + item.id + " at " + specPath);
    return { success: false, method: "none", id: item.id };
  }

  const videoPath = "outputs/video_" + item.id + ".mp4";

  // 2. Skip if already rendered
  if (fs.existsSync(videoPath)) {
    console.log("⏭  Skipping " + item.id + " (already rendered)");
    return { success: true, method: "cached", id: item.id };
  }

  console.log(
    "🔄 Processing " + item.id + ": " + item.prompt.slice(0, 60) + "..."
  );

  // 3. Parse spec JSON
  let specData;
  try {
    const raw = fs.readFileSync(specPath, "utf8");
    specData = JSON.parse(raw);
  } catch (parseErr) {
    console.log("  ❌ Invalid JSON in spec file for " + item.id);
    logError(item.id, item.prompt, "JSON Parse Error", "spec", parseErr.message);
    return { success: false, method: "none", id: item.id };
  }

  // 4. Compute duration & canvas
  const fps = specData.fps || 30;
  const durationInFrames = getDurationFromSpec(specData);
  const canvas = getCanvasDimensions(specData);

  console.log(
    "  ⏱  Duration: " + durationInFrames + " frames (" +
    (durationInFrames / fps).toFixed(1) + "s @ " + fps + " fps)"
  );
  console.log("  📐 Canvas: " + canvas.width + "×" + canvas.height);

  // 5. Render with Remotion (SpecPlayer reads SPEC_PATH at runtime)
  console.log("  🎬 Rendering via Spec VM...");
  try {
    execSync(
      "npx remotion render src/index.ts GeneratedMotion " + videoPath,
      {
        stdio: "inherit",
        env: Object.assign({}, process.env, {
          REMOTION_APP_DURATION_FRAMES: String(durationInFrames),
          REMOTION_APP_VIDEO_WIDTH: String(canvas.width),
          REMOTION_APP_VIDEO_HEIGHT: String(canvas.height),
          REMOTION_APP_SPEC_FILE: "spec_" + item.id + ".json",
          REMOTION_APP_SPEC_VERSION: SPEC_VERSION,
        }),
      }
    );
  } catch (renderErr) {
    const errMsg = renderErr.message || "Unknown render error";
    console.log("  ❌ Render failed: " + errMsg.slice(0, 300));
    logError(
      item.id,
      item.prompt,
      "Render Error",
      "specvm_runtime",
      errMsg.slice(0, 500)
    );
    return { success: false, method: "specvm", id: item.id };
  }

  // 6. Log results to CSV
  await csvWriter.writeRecords([
    {
      id: item.id,
      category: item.category,
      prompt: item.prompt,
      videoLink: '=HYPERLINK("' + videoPath + '", "View Video")',
      specLink: '=HYPERLINK("' + specPath + '", "View Spec")',
      method: "specvm",
      visualClarity: "",
      motionSmoothness: "",
      promptFaithfulness: "",
      codeCleanliness: "",
      reusability: "",
      notes: "",
    },
  ]);

  console.log(
    "  ✅ Finished " + item.id + " [SPEC VM] (" + durationInFrames + " frames)\n"
  );
  return { success: true, method: "specvm", id: item.id };
}

// ─── Main pipeline ──────────────────────────────────────────────────────────

async function run() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        SHAPE-MOTION-LAB — BATCH RUNNER v3 (Spec VM)    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Spec folder:  " + SPEC_FOLDER.padEnd(41) + "║");
  console.log("║  Engine:       " + "Spec VM (runtime interpreter)".padEnd(41) + "║");
  console.log("║  Parallel:     " + (PARALLEL_BATCH_SIZE + " concurrent").padEnd(41) + "║");
  console.log("║  Prompts:      " + (prompts.length + " total").padEnd(41) + "║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Ensure output directory exists
  if (!fs.existsSync("outputs")) fs.mkdirSync("outputs", { recursive: true });

  const results = { specvm: 0, cached: 0, failed: 0 };

  if (PARALLEL_BATCH_SIZE > 1) {
    // ─── PARALLEL MODE ───
    console.log(
      "Running in parallel mode (batch size: " + PARALLEL_BATCH_SIZE + ")\n"
    );

    for (let i = 0; i < prompts.length; i += PARALLEL_BATCH_SIZE) {
      const batch = prompts.slice(i, i + PARALLEL_BATCH_SIZE);

      // Remotion renders are serialised within each batch because the
      // renderer reads from the same src/ entry point. True parallelism
      // would require isolated working directories.
      for (const item of batch) {
        const result = await processPrompt(item);
        if (result.success) {
          results[result.method] = (results[result.method] || 0) + 1;
        } else {
          results.failed++;
        }
      }
    }
  } else {
    // ─── SEQUENTIAL MODE ───
    for (const item of prompts) {
      const result = await processPrompt(item);
      if (result.success) {
        results[result.method] = (results[result.method] || 0) + 1;
      } else {
        results.failed++;
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                   BATCH RUN SUMMARY                     ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Spec VM:      " + String(results.specvm).padEnd(41) + "║");
  console.log("║  Cached:       " + String(results.cached).padEnd(41) + "║");
  console.log("║  Failed:       " + String(results.failed).padEnd(41) + "║");
  console.log("║  Total:        " + String(prompts.length).padEnd(41) + "║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

run();
