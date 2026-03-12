#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// SPEC REGENERATOR — Regenerates specs for specific prompt IDs using the 
// updated convertToSpec schema (with text objects and anchor support).
//
// Usage:
//   node scripts/regenerateSpecs.js 151 152 153   # specific IDs
//   node scripts/regenerateSpecs.js 151-170        # range
//   node scripts/regenerateSpecs.js --all          # all prompts
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs-extra";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_FILE = "./prompts.json";
const OUTPUT_FOLDER = "./machine_specs_v2";

// Import the SYSTEM_PROMPT from convertToSpec (reuse the schema definition)
// Since we can't easily import, we'll inline it from the updated convertToSpec

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

EXAMPLE 2 — Bar chart with text labels (Level 2.0)

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
   - "rotation": degrees (default: 0)
   - "scale": number (default: 1)
   - "cornerRadius": number (for rounded rectangles)
   - "facing": "up" | "down" | "left" | "right" (for triangles; default: "up")
   - "anchor": "bottom" | "top" | "left" | "right" (for bars that grow FROM an edge)

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
   - "pos": [[fromX, fromY], [toX, toY]] — combined position
   - "opacity": [from, to]
   - "scale": [from, to]
   - "rotation": [from, to] — in degrees
   - "scaleX": [from, to]
   - "scaleY": [from, to]
   - "color": [fromHex, toHex] — color transition
   - "cornerRadius": [from, to]
   - "width": [from, to] — for bar/line growth animations
   - "height": [from, to] — for bar growth animations

   Advanced animation properties:
   - "orbit": { "center": [x, y], "radius": px, "degrees": totalDeg }

   Optional per-entry:
   - "easing": "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring" | "bounce"

   CRITICAL RULES:
   - time[0] must be strictly less than time[1]
   - Each timeline entry animates ONLY ONE property (or a small related group like orbit)
   - If a shape scales AND rotates in the same time range, create TWO separate timeline entries
   - For staggered sequences, create separate entries per object with offset times

---

${EXAMPLES}

---

Convert the following prompt into a Sparse Motion Spec JSON. Return ONLY the JSON.`;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateSpec(spec) {
  const errors = [];
  if (typeof spec.scene !== "string" || !spec.scene) errors.push("Missing 'scene'");
  if (typeof spec.duration !== "number" || spec.duration <= 0) errors.push("Missing 'duration'");
  if (typeof spec.fps !== "number") errors.push("Missing 'fps'");
  if (!spec.canvas) errors.push("Missing 'canvas'");
  if (!spec.bg) errors.push("Missing 'bg'");
  if (!Array.isArray(spec.objects) || spec.objects.length === 0) errors.push("Missing 'objects'");
  if (!Array.isArray(spec.timeline) || spec.timeline.length === 0) errors.push("Missing 'timeline'");

  const objectIds = new Set();
  if (Array.isArray(spec.objects)) {
    for (const obj of spec.objects) {
      if (!obj.id) errors.push("Object missing 'id'");
      if (!obj.shape) errors.push("Object " + obj.id + " missing 'shape'");
      if (obj.id) objectIds.add(obj.id);
    }
  }

  if (Array.isArray(spec.timeline)) {
    for (let i = 0; i < spec.timeline.length; i++) {
      const entry = spec.timeline[i];
      if (!entry.target) errors.push("Timeline[" + i + "] missing 'target'");
      else if (!objectIds.has(entry.target)) errors.push("Timeline[" + i + "] target '" + entry.target + "' not in objects");
      if (!entry.time || !Array.isArray(entry.time)) errors.push("Timeline[" + i + "] missing 'time'");
      else if (entry.time[0] >= entry.time[1]) errors.push("Timeline[" + i + "] invalid time range");
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Generate spec for a single prompt
// ---------------------------------------------------------------------------
async function generateSpec(promptText, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptText },
        ],
        temperature: 0.2,
      });

      let content = response.choices[0].message.content;
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const spec = JSON.parse(content);
      const errors = validateSpec(spec);
      if (errors.length > 0) {
        console.log("    ⚠️  Validation errors (attempt " + (attempt + 1) + "): " + errors.join("; "));
        if (attempt < maxRetries) continue;
      }

      return spec;
    } catch (err) {
      console.log("    ❌ Error (attempt " + (attempt + 1) + "): " + err.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const prompts = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

  let targetIds = [];
  if (args.includes("--all")) {
    targetIds = prompts.map(p => p.id);
  } else {
    for (const arg of args) {
      if (arg.includes("-")) {
        const [start, end] = arg.split("-").map(Number);
        for (let i = start; i <= end; i++) targetIds.push(i);
      } else {
        targetIds.push(parseInt(arg, 10));
      }
    }
  }

  if (targetIds.length === 0) {
    console.log("Usage: node scripts/regenerateSpecs.js 151-170");
    console.log("       node scripts/regenerateSpecs.js 151 152 153");
    console.log("       node scripts/regenerateSpecs.js --all");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║         SPEC REGENERATOR (v2 schema)                ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("  Target IDs: " + targetIds.join(", "));
  console.log("  Output: " + OUTPUT_FOLDER + "/");
  console.log("");

  fs.ensureDirSync(OUTPUT_FOLDER);

  let success = 0, failed = 0;

  for (const id of targetIds) {
    const promptObj = prompts.find(p => p.id === id);
    if (!promptObj) {
      console.log("⚠️  Prompt ID " + id + " not found in prompts.json");
      failed++;
      continue;
    }

    console.log("🔄 [" + id + "] " + promptObj.prompt.slice(0, 60) + "...");

    const spec = await generateSpec(promptObj.prompt);
    if (spec) {
      const outPath = OUTPUT_FOLDER + "/spec_" + id + ".json";
      fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
      
      // Count text objects and anchored bars
      const textCount = (spec.objects || []).filter(o => o.shape === "text").length;
      const anchoredCount = (spec.objects || []).filter(o => o.anchor).length;
      
      console.log("  ✅ Written (" + spec.objects.length + " objects, " + spec.timeline.length + " anims, " + textCount + " text, " + anchoredCount + " anchored)");
      success++;
    } else {
      console.log("  ❌ Failed after retries");
      failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("Done: " + success + " regenerated, " + failed + " failed");
}

main();
