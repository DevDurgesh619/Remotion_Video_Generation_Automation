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

EXAMPLE 2 — Breathing scale loop with repeat (Level 1.1)

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
    { "target": "circle_1", "time": [0, 3], "easing": "ease-in-out", "scale": [1, 1.08], "repeat": "infinite" }
  ]
}

NOTE: "repeat": "infinite" automatically ping-pongs (1→1.08 then 1.08→1 then 1→1.08…).
Use it instead of manually copying timeline entries for looping animations.
Use "repeat": N (a number) to loop exactly N additional times beyond the first play.

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

---

EXAMPLE 4 — Bar chart with text labels (Level 2.0)

Prompt: "Bar Chart Three Bars. Light grey background. Three vertical bars (rectangles): 80px wide each, 150px apart horizontally. Colors: bar 1 blue (#1976D2), bar 2 orange (#F57C00), bar 3 green (#388E3C). Animation (6s): 0-2s: Bar 1 grows upward from 0px to 200px height. 2-4s: Bar 2 grows to 280px. 4-6s: Bar 3 grows to 360px. Title 'Sales Data' at top. Value labels appear above bars after growth. Total duration: 6s."

Output:
{
  "scene": "bar_chart_three_bars",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#F5F5F5",
  "objects": [
    {
      "id": "title",
      "shape": "text",
      "text": { "content": "Sales Data", "fontSize": 32, "fontWeight": "bold", "textColor": "#333333" },
      "pos": [0, -450],
      "opacity": 0
    },
    {
      "id": "bar_1",
      "shape": "rectangle",
      "size": [80, 0],
      "color": "#1976D2",
      "pos": [-150, 200],
      "anchor": "bottom",
      "cornerRadius": 8
    },
    {
      "id": "bar_2",
      "shape": "rectangle",
      "size": [80, 0],
      "color": "#F57C00",
      "pos": [0, 200],
      "anchor": "bottom",
      "cornerRadius": 8
    },
    {
      "id": "bar_3",
      "shape": "rectangle",
      "size": [80, 0],
      "color": "#388E3C",
      "pos": [150, 200],
      "anchor": "bottom",
      "cornerRadius": 8
    },
    {
      "id": "label_1",
      "shape": "text",
      "text": { "content": "200", "fontSize": 18, "fontWeight": "bold", "textColor": "#1976D2" },
      "pos": [-150, -10],
      "opacity": 0
    },
    {
      "id": "label_2",
      "shape": "text",
      "text": { "content": "280", "fontSize": 18, "fontWeight": "bold", "textColor": "#F57C00" },
      "pos": [0, -90],
      "opacity": 0
    },
    {
      "id": "label_3",
      "shape": "text",
      "text": { "content": "360", "fontSize": 18, "fontWeight": "bold", "textColor": "#388E3C" },
      "pos": [150, -170],
      "opacity": 0
    },
    {
      "id": "x_q1",
      "shape": "text",
      "text": { "content": "Q1", "fontSize": 20, "textColor": "#666666" },
      "pos": [-150, 240],
      "opacity": 0
    },
    {
      "id": "x_q2",
      "shape": "text",
      "text": { "content": "Q2", "fontSize": 20, "textColor": "#666666" },
      "pos": [0, 240],
      "opacity": 0
    },
    {
      "id": "x_q3",
      "shape": "text",
      "text": { "content": "Q3", "fontSize": 20, "textColor": "#666666" },
      "pos": [150, 240],
      "opacity": 0
    }
  ],
  "timeline": [
    { "target": "title", "time": [0, 0.5], "opacity": [0, 1] },
    { "target": "bar_1", "time": [0, 2], "easing": "ease-out", "height": [0, 200] },
    { "target": "bar_2", "time": [2, 4], "easing": "ease-out", "height": [0, 280] },
    { "target": "bar_3", "time": [4, 6], "easing": "ease-out", "height": [0, 360] },
    { "target": "label_1", "time": [2, 2.5], "opacity": [0, 1] },
    { "target": "label_2", "time": [4, 4.5], "opacity": [0, 1] },
    { "target": "label_3", "time": [5.5, 6], "opacity": [0, 1] },
    { "target": "x_q1", "time": [2, 2.3], "opacity": [0, 1] },
    { "target": "x_q2", "time": [4, 4.3], "opacity": [0, 1] },
    { "target": "x_q3", "time": [5.5, 5.8], "opacity": [0, 1] }
  ]
}

---

EXAMPLE 5 — Behavior shortcuts (Phase 2B)

Prompt: "Hero entrance. Dark blue background (#0D1B2A). White circle (120px) slides in from the left, then pulses twice, then fades out. Total duration: 7s."

Output:
{
  "scene": "hero_entrance",
  "duration": 7,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#0D1B2A",
  "objects": [
    {
      "id": "hero_circle",
      "shape": "circle",
      "diameter": 120,
      "color": "#FFFFFF",
      "pos": [0, 0],
      "opacity": 0
    }
  ],
  "timeline": [
    { "target": "hero_circle", "time": [0, 1.5], "behavior": "slide-in-left", "params": { "distance": 500 } },
    { "target": "hero_circle", "time": [2, 5], "behavior": "pulse", "params": { "amplitude": 0.15, "cycles": 2 } },
    { "target": "hero_circle", "time": [5.5, 7], "behavior": "fade-out" }
  ]
}
`;

const SYSTEM_PROMPT = `You are an expert Motion Graphics Specification Generator.

Your sole objective is to convert natural language motion graphics prompts into a compact, deterministic JSON specification called the **Sparse Motion Spec**.

OUTPUT FORMAT: Return ONLY valid JSON. No conversational text, no explanations, no markdown formatting.

---

SPARSE MOTION SPEC SCHEMA

The spec has 7 top-level keys: scene, duration, fps, canvas, bg, objects, timeline.
(Optional: generators — for compact chart definitions expanded by the runtime.)

1. SCENE METADATA
   - "scene": short snake_case name derived from the prompt
   - "duration": total duration in seconds (number)
   - "fps": always 30
   - "canvas": { "w": 1920, "h": 1080 }
   - "bg": background color as hex string. For gradients use: { "type": "gradient", "from": "#hex", "to": "#hex", "direction": "to bottom" }

2. OBJECTS ARRAY
   Each object has ONLY the properties it needs. Omit any property that uses its default value.

   Required fields:
   - "id": unique string identifier (e.g., "circle_1", "rect_2", "title")
   - "shape": "circle" | "rectangle" | "triangle" | "pentagon" | "star" | "line" | "text"

   Optional fields (include ONLY if needed):
   - "diameter": number (for circles)
   - "size": [width, height] (for rectangles, triangles, etc.)
   - "color": hex string (fill color for shapes; default: none / transparent)
   - "stroke": { "color": "#hex", "width": number } (for outlined shapes)
   - "fill": false (default is true; only include if explicitly no fill)
   - "pos": [x, y] (default: [0, 0] = canvas center)
   - "opacity": number 0-1 (default: 1; set to 0 if shape starts invisible)
     IMPORTANT: If you set opacity to 0, you MUST include a timeline event that animates
     opacity to a value > 0 (e.g. opacity:[0,1]) or use behavior:"fade-in". Otherwise the
     object will be PERMANENTLY INVISIBLE and the animation will appear as a blank screen.
   - "rotation": degrees (default: 0)
   - "scale": number (default: 1)
   - "cornerRadius": number (for rounded rectangles)
   - "facing": "up" | "down" | "left" | "right" (for triangles; default: "up")
   - "zIndex": number (for layering)
   - "anchor": "bottom" | "top" | "left" | "right" (for bars that grow FROM an edge; determines transformOrigin)

   TEXT OBJECT FIELDS (when shape is "text"):
   - "text": { "content": "string", "fontSize": number, "fontWeight": "normal"|"bold", "textColor": "#hex", "fontFamily": "string" }
   - Use text objects for titles, labels, axis labels, value counters, legends, annotations
   - NEVER use rectangles as placeholders for text — always use shape: "text" with content

   BAR CHART RULES:
   - For bars that grow from a baseline, use "anchor": "bottom" and animate height from [0, targetHeight]
   - For horizontal bars growing from left, use "anchor": "left" and animate width from [0, targetWidth]
   - Text labels (axis labels, value labels, titles) must be shape: "text" with actual content
   - Each text element (title, each label, each axis tick) is a SEPARATE object

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
   - "width": [from, to] — for line/bar growth animations
   - "height": [from, to] — for bar growth animations
   - "shadow": { "offsetX": [f,t], "offsetY": [f,t], "blur": [f,t], "color": [fromHex, toHex] }
   - "glow": { "blur": [from, to], "intensity": [from, to], "color": [fromHex, toHex] }
     (blur = px spread, intensity = 0-1 opacity of glow, color = glow color)

   Optional per-entry:
   - "easing": "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" (default: "linear")
   - "repeat": number | "infinite" — repeat the animation N additional times (ping-pong style).
     Use "repeat": "infinite" for continuous loops. Use "repeat": N to loop N extra times.
     Example: { "target": "icon", "time": [0, 1], "scale": [1, 1.1], "repeat": "infinite" }
     This plays scale 1→1.1 then 1.1→1 then 1→1.1… until the video ends.
     ALWAYS prefer repeat over manually copying timeline entries.

   CRITICAL RULES:
   - time[0] must be strictly less than time[1]
   - Each timeline entry animates ONLY ONE property (or a small related group like orbit)
   - If a shape scales AND rotates in the same time range, create TWO separate timeline entries
   - Simultaneous animations on the same object are separate entries with the same time range
   - Sequential phases are separate entries with non-overlapping time ranges
   - For staggered sequences, create separate entries per object with offset times

---

UNSUPPORTED PROPERTIES — DO NOT USE (they will be silently ignored):
   - "skewX" / "skewY" — not implemented in the renderer
   - "strokeWidth" — use "stroke": { "width": [f,t] } instead
   - "orbit", "bounce", "morphTo" — not implemented; use raw x/y/scale events instead
   - "blendMode" — not implemented
   - "fontFamily" on text objects — not rendered (use fontSize/fontWeight instead)

---

4. BEHAVIOR SHORTCUTS (optional — use instead of raw keyframes when appropriate)

   A timeline entry can use a "behavior" shorthand instead of specifying raw animated properties.
   The runtime automatically expands behaviors into the correct keyframes.

   Format:
   { "target": "id", "time": [start, end], "behavior": "name", "params": { ... } }

   Available behaviors and their params:
   - "fade-in"           — opacity 0→1. No params needed.
   - "fade-out"          — opacity 1→0. No params needed.
   - "grow-from-center"  — scale 0→1 + opacity 0→1. No params needed.
   - "bounce-in"         — scale overshoot + opacity reveal. No params needed.
   - "slide-in-left"     — slides from left: params: { "distance": 400 }
   - "slide-in-right"    — slides from right: params: { "distance": 400 }
   - "slide-in-top"      — drops from above: params: { "distance": 300 }
   - "slide-in-bottom"   — rises from below: params: { "distance": 300 }
   - "pulse"             — breathing scale loop: params: { "amplitude": 0.1, "cycles": 2 }
   - "shake"             — horizontal oscillation: params: { "amplitude": 20, "cycles": 4 }

   All behaviors also accept: "params": { "easing": "ease-out-cubic" } to override easing.

   WHEN TO USE BEHAVIORS:
   - Use "slide-in-left" instead of manually computing x: [-960, 0]
   - Use "fade-in" / "fade-out" for simple opacity transitions
   - Use "bounce-in" for impactful reveals of hero elements
   - Use "pulse" for looping attention effects (icons, CTAs)
   - Use "shake" for emphasis or error states
   - Mix behaviors and raw properties freely in the same timeline

   IMPORTANT: "time" must still satisfy time[0] < time[1].

---

${EXAMPLES}

---

Convert the following prompt into a Sparse Motion Spec JSON. Return ONLY the JSON.`;

// ---------------------------------------------------------------------------
// Motion Brief preamble — prepended when input is a structured Motion Brief
// instead of a raw user prompt. This guides the LLM to do precise technical
// translation rather than creative interpretation.
// ---------------------------------------------------------------------------

const BRIEF_PREAMBLE = `You are receiving a structured Motion Brief (JSON) that has already been creatively planned by a motion graphics director. Your job is PRECISE TECHNICAL TRANSLATION — convert the Brief into a valid Sparse Motion Spec.

IMPORTANT TRANSLATION RULES:
- Semantic sizes: tiny=40px, small=70px, medium=120px, large=180px, xlarge=280px (use as diameter for circles, or [size, size] for rectangles/triangles)
- Semantic positions:
  center=[0, 0], left-third=[-300, 0], right-third=[300, 0],
  top-center=[0, -200], bottom-center=[0, 200],
  top-left=[-350, -200], top-right=[350, -200],
  bottom-left=[-350, 200], bottom-right=[350, 200]
- For "circular-ring" positions: arrange N objects in a circle of radius 80-120px from center, evenly spaced
- For "grid-2x2" positions: arrange at [-150, -100], [150, -100], [-150, 100], [150, 100]
- Choreography phases: translate each phase description into concrete timeline events with exact values
- Honor the Brief's style (background, palette, duration) exactly
- Use behavior shortcuts (fade-in, bounce-in, slide-in-*, pulse, shake) when the choreography description mentions them
- For data_visualization intents: if dataHints exist, use generators (barChart, lineChart, pieChart) to keep specs compact
- For infographic intents: use generators (statGrid, processFlow) and components (progress_bar, callout_box, badge)

The Motion Brief is provided below. Convert it into a valid Sparse Motion Spec JSON.
Return ONLY the JSON.

MOTION BRIEF:
`;

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

export async function convertPrompt(promptText) {
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

// ---------------------------------------------------------------------------
// Convert a Motion Brief (structured JSON) into a MotionSpec.
// Uses the same LLM + schema docs but with a preamble that shifts the LLM
// from "creative interpretation" mode to "precise translation" mode.
// ---------------------------------------------------------------------------

export async function convertFromBrief(motionBrief) {
  const briefJson = typeof motionBrief === "string"
    ? motionBrief
    : JSON.stringify(motionBrief, null, 2);

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
        content: BRIEF_PREAMBLE + briefJson
      }
    ]
  });

  const rawText = response.output[0].content[0].text;

  // Clean and parse
  const cleaned = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error("Failed to parse MotionSpec JSON from Brief: " + parseErr.message + "\nRaw:\n" + cleaned.slice(0, 500));
  }

  const errors = validateSpec(parsed);
  if (errors.length > 0) {
    console.warn("⚠️  Spec validation warnings:");
    errors.forEach(e => console.warn("  - " + e));

    const critical = errors.filter(e => e.includes("Missing"));
    if (critical.length > 0) {
      throw new Error("Spec has critical validation errors: " + critical.join("; "));
    }
  }

  return parsed;
}

export { validateSpec };

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

// Only run batch mode when executed directly
const isDirectRun = process.argv[1] && process.argv[1].includes("convertToSpec");
if (isDirectRun) {
  main();
}