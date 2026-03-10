import fs from "fs-extra";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const INPUT_FILE = "./prompts.json";
const OUTPUT_FOLDER = "./machine_specs_v2";

// ---------------------------------------------------------------------------
// FEW-SHOT EXAMPLES — these replace the old 200-line dense SCHEMA constant.
// The LLM learns the sparse format from concrete examples, not a template.
// ---------------------------------------------------------------------------

const EXAMPLES = `
EXAMPLE 1 — Simple fade-in (Level 1.0)

Prompt: "Circle Fade In. White background. Red circle (#E53935), 150px. Fades from invisible to fully visible over 1.2s, then holds for 2.8s. Total duration: 4s."

Output:
{
  "scene": "circle_fade_in",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 150,
      "color": "#E53935",
      "pos": [0, 0],
      "opacity": 0
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 1.2], "easing": "ease-out", "opacity": [0, 1] }
  ]
}

---

EXAMPLE 2 — Breathing scale loop (Level 1.1)

Prompt: "Circle Breathing Loop. Light background (#F5F5F5). Blue circle (#42A5F5), 160px, centered. Scale breathes: 100% → 108% → 100%, repeat for 6s (2 cycles, 3s each). Easing: ease-in-out. Total duration: 6s."

Output:
{
  "scene": "circle_breathing_loop",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#F5F5F5",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 160,
      "color": "#42A5F5",
      "pos": [0, 0]
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 1.5], "easing": "ease-in-out", "scale": [1, 1.08] },
    { "target": "circle_1", "time": [1.5, 3], "easing": "ease-in-out", "scale": [1.08, 1] },
    { "target": "circle_1", "time": [3, 4.5], "easing": "ease-in-out", "scale": [1, 1.08] },
    { "target": "circle_1", "time": [4.5, 6], "easing": "ease-in-out", "scale": [1.08, 1] }
  ]
}

---

EXAMPLE 3 — Multi-object coordination (Level 1.2)

Prompt: "Three Shapes Center Bounce. White background. Circle (140px red #F44336), square (140px blue #2196F3), triangle (140px base green #4CAF50). Animation (6s): 0-2s: Circle slides from left, square from right, triangle drops from top. All arrive at center with bounce. 2-4s: All three rotate slowly in place (each 180°). 4-5s: All scale together: 100% → 110% → 100%. 5-6s: Fade out together. Total duration: 6s."

Output:
{
  "scene": "three_shapes_center_bounce",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 140,
      "color": "#F44336",
      "pos": [-960, 0]
    },
    {
      "id": "square_1",
      "shape": "rectangle",
      "size": [140, 140],
      "color": "#2196F3",
      "pos": [960, 0]
    },
    {
      "id": "triangle_1",
      "shape": "triangle",
      "size": [140, 140],
      "color": "#4CAF50",
      "pos": [0, -540]
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 2], "easing": "bounce", "x": [-960, 0] },
    { "target": "square_1", "time": [0, 2], "easing": "bounce", "x": [960, 0] },
    { "target": "triangle_1", "time": [0, 2], "easing": "bounce", "y": [-540, 0] },
    { "target": "circle_1", "time": [2, 4], "rotation": [0, 180] },
    { "target": "square_1", "time": [2, 4], "rotation": [0, 180] },
    { "target": "triangle_1", "time": [2, 4], "rotation": [0, 180] },
    { "target": "circle_1", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "circle_1", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] },
    { "target": "square_1", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "square_1", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] },
    { "target": "triangle_1", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "triangle_1", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] },
    { "target": "circle_1", "time": [5, 6], "opacity": [1, 0] },
    { "target": "square_1", "time": [5, 6], "opacity": [1, 0] },
    { "target": "triangle_1", "time": [5, 6], "opacity": [1, 0] }
  ]
}
`;

const SYSTEM_PROMPT = `You are an expert Motion Graphics Specification Generator.

Your sole objective is to convert natural language motion graphics prompts into a compact, deterministic JSON specification called the **Sparse Motion Spec**.

OUTPUT FORMAT: Return ONLY valid JSON. No conversational text, no explanations, no markdown formatting.

---

SPARSE MOTION SPEC SCHEMA

The spec has 5 top-level keys: scene, duration, fps, canvas, bg, objects, timeline.

1. SCENE METADATA
   - "scene": short snake_case name derived from the prompt
   - "duration": total duration in seconds (number)
   - "fps": always 30
   - "canvas": { "w": 1920, "h": 1080 }
   - "bg": background color as hex string. For gradients use: { "type": "gradient", "from": "#hex", "to": "#hex", "direction": "to bottom" }

2. OBJECTS ARRAY
   Each object has ONLY the properties it needs. Omit any property that uses its default value.

   Required fields:
   - "id": unique string identifier (e.g., "circle_1", "rect_2")
   - "shape": "circle" | "rectangle" | "triangle" | "pentagon" | "star" | "line"

   Optional fields (include ONLY if needed):
   - "diameter": number (for circles)
   - "size": [width, height] (for rectangles, triangles, etc.)
   - "color": hex string (default: none / transparent)
   - "stroke": { "color": "#hex", "width": number } (for outlined shapes)
   - "fill": false (default is true; only include if explicitly no fill)
   - "pos": [x, y] (default: [0, 0] = canvas center)
   - "opacity": number 0-1 (default: 1; set to 0 if shape starts invisible)
   - "rotation": degrees (default: 0)
   - "scale": number (default: 1)
   - "cornerRadius": number (for rounded rectangles)
   - "facing": "up" | "down" | "left" | "right" (for triangles; default: "up")
   - "zIndex": number (for layering)
   - "blendMode": "screen" | "multiply" etc.

   POSITIONING: Canvas origin is center (0, 0). Positive x = right, positive y = down.
   Off-screen left = x: -960, right = x: 960, top = y: -540, bottom = y: 540.

3. TIMELINE ARRAY
   Each entry animates ONE property of ONE object over ONE time range.

   Required fields:
   - "target": the object id string
   - "time": [startSec, endSec]

   Animated properties (include ONLY the ones being animated):
   - "x": [from, to] — horizontal translation
   - "y": [from, to] — vertical translation
   - "pos": [[fromX, fromY], [toX, toY]] — combined position (use when both x and y change)
   - "opacity": [from, to]
   - "scale": [from, to]
   - "rotation": [from, to] — in degrees
   - "scaleX": [from, to] — independent width scaling
   - "scaleY": [from, to] — independent height scaling
   - "color": [fromHex, toHex] — color transition
   - "cornerRadius": [from, to]
   - "skewX": [from, to]
   - "skewY": [from, to]
   - "width": [from, to] — for line/bar growth animations
   - "height": [from, to] — for bar growth animations
   - "strokeWidth": [from, to]
   - "shadow": { "from": [ox, oy, blur, spread, color], "to": [ox, oy, blur, spread, color] }
   - "glow": { "from": [blur, intensity, color], "to": [blur, intensity, color] }

   Advanced animation properties:
   - "orbit": { "center": [x, y], "radius": px, "degrees": totalDeg }
   - "bounce": { "floor": yPx, "heights": [h1, h2, ...] }
   - "morphTo": { "shape": "circle"|"rectangle"|..., "size": [w, h] }

   Optional per-entry:
   - "easing": "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring" | "bounce" (default: "linear")

   CRITICAL RULES:
   - time[0] must be strictly less than time[1]
   - Each timeline entry animates ONLY ONE property (or a small related group like orbit)
   - If a shape scales AND rotates in the same time range, create TWO separate timeline entries
   - Simultaneous animations on the same object are separate entries with the same time range
   - Sequential phases are separate entries with non-overlapping time ranges
   - For staggered sequences, create separate entries per object with offset times

---

${EXAMPLES}

---

Convert the following prompt into a Sparse Motion Spec JSON. Return ONLY the JSON.`;

const DELAY_MS = 3000;
const BATCH_SIZE = 2;
const BATCH_DELAY = 40000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Validate the sparse spec has all required top-level fields and structure
// ---------------------------------------------------------------------------
function validateSpec(spec) {
  const errors = [];

  if (typeof spec.scene !== "string" || !spec.scene) errors.push("Missing or invalid 'scene'");
  if (typeof spec.duration !== "number" || spec.duration <= 0) errors.push("Missing or invalid 'duration'");
  if (typeof spec.fps !== "number") errors.push("Missing 'fps'");
  if (!spec.canvas || typeof spec.canvas.w !== "number") errors.push("Missing or invalid 'canvas'");
  if (!spec.bg) errors.push("Missing 'bg'");
  if (!Array.isArray(spec.objects) || spec.objects.length === 0) errors.push("Missing or empty 'objects'");
  if (!Array.isArray(spec.timeline) || spec.timeline.length === 0) errors.push("Missing or empty 'timeline'");

  // Validate objects
  const objectIds = new Set();
  if (Array.isArray(spec.objects)) {
    for (const obj of spec.objects) {
      if (!obj.id) errors.push("Object missing 'id'");
      if (!obj.shape) errors.push("Object '" + (obj.id || "unknown") + "' missing 'shape'");
      if (obj.id) objectIds.add(obj.id);
    }
  }

  // Validate timeline entries
  if (Array.isArray(spec.timeline)) {
    for (let i = 0; i < spec.timeline.length; i++) {
      const entry = spec.timeline[i];
      if (!entry.target) errors.push("Timeline[" + i + "] missing 'target'");
      if (!Array.isArray(entry.time) || entry.time.length !== 2) {
        errors.push("Timeline[" + i + "] missing or invalid 'time'");
      } else if (entry.time[0] >= entry.time[1]) {
        errors.push("Timeline[" + i + "] time[0] must be < time[1]");
      }
      if (entry.target && !objectIds.has(entry.target)) {
        errors.push("Timeline[" + i + "] references unknown target '" + entry.target + "'");
      }
    }
  }

  return errors;
}

async function convertPrompt(promptText) {
  const response = await client.responses.create({
    model: "gpt-4o",
    temperature: 0,
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: promptText
      }
    ]
  });

  return response.output[0].content[0].text;
}

async function main() {
  await fs.ensureDir(OUTPUT_FOLDER);

  const prompts = await fs.readJson(INPUT_FILE);

  for (let i = 0; i < prompts.length; i++) {
    const item = prompts[i];
    const id = item.id;
    const prompt = item.prompt;

    const outputPath = OUTPUT_FOLDER + "/spec_" + id + ".json";

    if (await fs.pathExists(outputPath)) {
      console.log("Skipping " + id + " (already generated)");
      continue;
    }

    let retries = 0;
    const MAX_RETRIES = 2;

    while (retries <= MAX_RETRIES) {
      try {
        console.log("Processing prompt " + id + (retries > 0 ? " (retry " + retries + ")" : ""));

        const rawSpec = await convertPrompt(prompt);

        const cleaned = rawSpec
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        // Parse and validate
        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("Invalid JSON from LLM for prompt " + id + ": " + parseErr.message);
          retries++;
          if (retries <= MAX_RETRIES) {
            await sleep(5000);
            continue;
          }
          break;
        }

        const validationErrors = validateSpec(parsed);
        if (validationErrors.length > 0) {
          console.warn("Validation warnings for prompt " + id + ":");
          validationErrors.forEach(e => console.warn("  - " + e));
          if (validationErrors.some(e => e.includes("Missing"))) {
            retries++;
            if (retries <= MAX_RETRIES) {
              console.log("Retrying due to validation errors...");
              await sleep(5000);
              continue;
            }
          }
        }

        // Write the validated spec
        await fs.writeFile(outputPath, JSON.stringify(parsed, null, 2));
        console.log("Saved " + outputPath + " (" + JSON.stringify(parsed).length + " bytes)");
        break; // success — exit retry loop

      } catch (error) {
        console.error("Error on prompt " + id, error.message);
        retries++;
        if (retries <= MAX_RETRIES) {
          await sleep(10000);
        }
      }
    }

    // Small delay between each request
    await sleep(DELAY_MS);

    // Batch pause
    if ((i + 1) % BATCH_SIZE === 0) {
      console.log("Batch limit reached. Waiting " + (BATCH_DELAY / 1000) + " seconds...");
      await sleep(BATCH_DELAY);
    }
  }
}

main();