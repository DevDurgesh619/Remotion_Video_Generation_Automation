import OpenAI from "openai";
import { createRequire } from "module";

// Import CommonJS prompt rule modules without modifying them
const _require = createRequire(import.meta.url);
const BASE_RULES = _require("../../scripts/prompts/base.js") as string;
const SHAPE_RULES = _require("../../scripts/prompts/shapes.js") as string;
const ANIMATION_RULES = _require("../../scripts/prompts/animations.js") as string;
const { getAdvancedRules } = _require("../../scripts/prompts/advanced.js") as {
  getAdvancedRules: (spec: object) => string[];
};
const { getDatavizRules } = _require("../../scripts/prompts/dataviz.js") as {
  getDatavizRules: (spec: object) => string[];
};
const { getAssetRules } = _require("../../scripts/prompts/assets.js") as {
  getAssetRules: (spec: object) => string[];
};

const VALIDATION_CHECKLIST = `FINAL VALIDATION CHECKLIST
Before producing your output, ensure:
- No external libraries.
- No loops (for, while, .map, Array.from).
- No template literals, no backticks, no dollar symbol.
- All interpolate ranges are valid (exactly 2 increasing values).
- All variables are declared before use.
- JSX braces and parentheses are balanced.
- All shapes are div elements (except polyline shapes which use inline SVG, and asset shapes which use the pre-imported Asset component).
- There is exactly one AbsoluteFill root.
- The AbsoluteFill has a backgroundColor matching the spec "bg" field.

OUTPUT REQUIREMENT
Return only the JSX component body. No explanations, comments, or non-code text.
MULTI-OBJECT RULE: Each object in the spec gets its own div with correct timing.`;

function assembleSystemPrompt(specData: object): string {
  const parts = [BASE_RULES, "", SHAPE_RULES, "", ANIMATION_RULES];

  const advancedRules = getAdvancedRules(specData);
  if (advancedRules.length > 0) {
    parts.push("");
    parts.push("ADVANCED ANIMATION RULES (specific to this spec):");
    for (const rule of advancedRules) {
      parts.push("");
      parts.push(rule);
    }
  }

  // Conditionally add dataviz rules based on spec content
  const datavizRules = getDatavizRules(specData);
  if (datavizRules.length > 0) {
    parts.push("");
    parts.push("DATA VISUALIZATION RULES (specific to this spec):");
    for (const rule of datavizRules) {
      parts.push("");
      parts.push(rule);
    }
  }

  // Conditionally add asset rules based on spec content
  const assetRules = getAssetRules(specData);
  if (assetRules.length > 0) {
    parts.push("");
    parts.push("ASSET RENDERING RULES (specific to this spec):");
    for (const rule of assetRules) {
      parts.push("");
      parts.push(rule);
    }
  }

  parts.push("");
  parts.push(VALIDATION_CHECKLIST);
  return parts.join("\n");
}

function cleanCode(code: string): string {
  return code
    .replace(/```jsx/g, "")
    .replace(/```tsx/g, "")
    .replace(/```typescript/g, "")
    .replace(/```javascript/g, "")
    .replace(/```/g, "")
    .replace(/^#+\s.*$/gm, "")
    .trim();
}

function staticValidate(code: string): string[] {
  const issues: string[] = [];
  if (code.includes("${")) issues.push("Template literal interpolation detected");
  if (code.includes("`")) issues.push("Backtick detected");
  if (code.includes("for (") || code.includes("for(")) issues.push("for loop detected");
  if (code.includes(".map(")) issues.push(".map() detected");
  if (code.includes("Array.from")) issues.push("Array.from detected");
  if (code.includes("while (") || code.includes("while(")) issues.push("while loop detected");
  if (code.includes("motion.div") || code.includes("framer-motion")) issues.push("framer-motion detected");
  if (code.includes("import ") || code.includes("export ")) issues.push("import/export in body");
  return issues;
}

function wrapComponent(body: string, hasAssets: boolean = false): string {
  let imports = 'import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";\n';
  if (hasAssets) {
    imports += 'import { Asset } from "./assets/Asset";\n';
  }
  return (
    imports + "\n" +
    "export const GeneratedMotion = () => {\n" +
    body +
    "\n};\n"
  );
}

function specHasAssets(specData: object): boolean {
  const data = specData as Record<string, unknown>;
  if (Array.isArray(data.objects)) {
    return data.objects.some(
      (o: Record<string, unknown>) => o.shape === "asset"
    );
  }
  return false;
}

export async function generateAnimationCode(
  specText: string,
  specData: object
): Promise<{ code: string; fullComponent: string; issues: string[] }> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const systemPrompt = assembleSystemPrompt(specData);

  const callLLM = async (messages: { role: string; content: string }[]) => {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
    });
    return cleanCode(response.choices[0].message.content ?? "");
  };

  // First attempt
  let code = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Motion Spec JSON:\n" + specText },
  ]);

  // Static validation retries
  for (let attempt = 0; attempt < 2; attempt++) {
    const issues = staticValidate(code);
    if (issues.length === 0) break;
    code = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Motion Spec JSON:\n" + specText },
    ]);
  }

  const finalIssues = staticValidate(code);
  const hasAssets = specHasAssets(specData);
  const fullComponent = wrapComponent(code, hasAssets);

  return { code, fullComponent, issues: finalIssues };
}

export async function fixAnimationCode(
  specText: string,
  specData: object,
  previousCode: string,
  tsError: string
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const systemPrompt = assembleSystemPrompt(specData);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Motion Spec JSON:\n" + specText },
      { role: "assistant", content: previousCode },
      {
        role: "user",
        content:
          "The code above has TypeScript compilation errors:\n\n" +
          tsError +
          "\n\nPlease fix the code and return the corrected JSX component body. Return ONLY the fixed code.",
      },
    ],
  });

  return cleanCode(response.choices[0].message.content ?? "");
}

export { wrapComponent };
