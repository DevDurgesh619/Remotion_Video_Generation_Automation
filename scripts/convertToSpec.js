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

EXAMPLE 5A — Glow pulse loop

Prompt: "Circle Glow Effect. Black background. White circle (#FFFFFF), 150px diameter, centered. Circle has outer glow. Glow intensity pulses: 0.3 → 0.9 → 0.3 alpha over 2.5s. Complete 1.5 pulses. Total duration: 4s."

Output:
{
  "scene": "circle_glow_pulse",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#000000",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 150,
      "color": "#FFFFFF",
      "pos": [0, 0],
      "glow": { "blur": 30, "intensity": 0.3, "color": "#FFFFFF" }
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 2.5], "easing": "ease-in-out", "glow": { "intensity": [0.3, 0.9] }, "repeat": "infinite" }
  ]
}

NOTE: Set the initial glow on the object. Then animate glow.intensity with repeat:"infinite".
The runtime ping-pongs: 0.3→0.9 then 0.9→0.3 then 0.3→0.9… Use half-cycle duration as the time window.

---

EXAMPLE 5B — Blur focus (defocus → sharp)

Prompt: "Circle Blur Focus. White background. Red circle (#D32F2F), 175px diameter, centered. Starts heavily blurred (blur radius 20px, opacity 40%). Sharpens to crystal clear over 2s. Hold sharp 2s. Total duration: 4s."

Output:
{
  "scene": "circle_blur_focus",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 175,
      "color": "#D32F2F",
      "pos": [0, 0],
      "blur": 20,
      "opacity": 0.4
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 2], "easing": "ease-out", "blur": [20, 0] },
    { "target": "circle_1", "time": [0, 2], "easing": "ease-out", "opacity": [0.4, 1.0] }
  ]
}

NOTE: Set "blur" on the object for the initial blurred state. Animate blur:[20,0] to sharpen.
Animate opacity simultaneously so the shape becomes fully opaque as it sharpens.

---

EXAMPLE 5C — Elastic scale overshoot (scale in with bounce)

Prompt: "Circle Scale In. Light grey background. Blue circle (#1976D2), 180px, centered. Scale from 0% to 100% over 1s with elastic ease — slight overshoot to 105%, settle to 100%. Hold 3s. Total duration: 4s."

Output:
{
  "scene": "circle_scale_elastic",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#F5F5F5",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 180,
      "color": "#1976D2",
      "pos": [0, 0],
      "opacity": 0,
      "scale": 0
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 0.7], "easing": "ease-out-cubic", "scale": [0, 1.07], "opacity": [0, 1] },
    { "target": "circle_1", "time": [0.7, 1.0], "easing": "ease-in-out", "scale": [1.07, 1.0] }
  ]
}

NOTE: For "elastic ease with overshoot to X%": use 2-phase approach.
Phase 1 (70% of duration): scale 0→overshoot with ease-out-cubic.
Phase 2 (30% of duration): scale overshoot→1.0 with ease-in-out.
Alternative: use "easing": "ease-out-elastic" on a single scale event for automatic spring physics.

---

EXAMPLE 5D — Bounce gravity drop with multi-bounce

Prompt: "Circle Drop Gravity. White background. Purple circle (#7B1FA2), 170px diameter. Starts off-screen top. Drops to center with gravity acceleration, bounces once (goes 30px below center, bounces 10px up, settles) over 1.6s total. Hold 2.4s. Total duration: 4s."

Output:
{
  "scene": "circle_drop_gravity",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 170,
      "color": "#7B1FA2",
      "pos": [0, -700]
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 0.9], "easing": "ease-in", "y": [-700, 30] },
    { "target": "circle_1", "time": [0.9, 1.2], "easing": "ease-out", "y": [30, -10] },
    { "target": "circle_1", "time": [1.2, 1.6], "easing": "ease-in-out", "y": [-10, 0] }
  ]
}

NOTE: For gravity + bounce: start at y=-700 (off-screen top). Fall with ease-in to slightly below target.
Bounce back up with ease-out. Settle with ease-in-out. For simple single-bounce settling you can
also use: { "y": [-700, 0], "easing": "ease-out-bounce" } — the bounce easing handles it automatically.

---

EXAMPLE 5E — Line draw-on (growing line)

Prompt: "Line Draw On Horizontal. Light background. Horizontal line 450px length, 3px thick, blue (#2196F3), centered. Draws from left to right over 2s. Hold complete 2s. Total duration: 4s."

Output:
{
  "scene": "line_draw_horizontal",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#F5F5F5",
  "objects": [
    {
      "id": "h_line",
      "shape": "rectangle",
      "size": [0, 3],
      "color": "#2196F3",
      "pos": [-225, 0],
      "anchor": "left"
    }
  ],
  "timeline": [
    { "target": "h_line", "time": [0, 2], "easing": "linear", "width": [0, 450] }
  ]
}

NOTE: For horizontal line draw-on: use shape "rectangle", initial size [0, thickness], anchor:"left".
The pos.x should be the LEFT EDGE of where the line starts (center_x - half_length).
Animate width:[0, fullLength]. For vertical draw-on: size:[thickness,0], anchor:"top", animate height:[0,fullLength].

---

EXAMPLE 5 — Explicit motion fields (v2 schema)

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
    { "target": "hero_circle", "time": [0, 1.5], "easing": "ease-out-cubic", "x": [-500, 0], "opacity": [0, 1] },
    { "target": "hero_circle", "time": [2, 3.5], "easing": "ease-in-out", "scale": [1, 1.15], "repeat": "infinite" },
    { "target": "hero_circle", "time": [5.5, 7], "opacity": [1, 0] }
  ]
}

NOTE: Do NOT use "behavior" or "motionType" fields — they are deprecated.
Always express motion using explicit fields: x/y/pos, opacity, scale, rotation, etc.
For "slide in from left": compute x from the object's rest position minus the slide distance.
For "pulse": use scale with repeat:"infinite" — the runtime ping-pongs automatically.
For "fade out": use opacity:[1,0].
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
   - "blur": number — initial CSS blur in px (default: 0). Use for shapes that start blurred.
   - "skewX": number — initial horizontal skew in degrees (default: 0)
   - "skewY": number — initial vertical skew in degrees (default: 0)

   HIERARCHY (parent-child):
   - "parent": string — ID of parent object. Child world position = parent world pos + localPos.
   - "localPos": [x, y] — position relative to parent center (use instead of "pos" when parent is set).
   - "inheritRotation": true — child inherits parent's world rotation. Use for arm rigs, solar systems.
   - "inheritScale": true — child inherits parent's world scale. (default: false for both)
   Example: pivot object at center + arm child with localPos:[70,0] + inheritRotation:true.
   Animating the pivot object's rotation swings the arm in an arc.

   TRANSFORM PIVOT (rotation/scale origin):
   - "pivot": [x, y] — local-space offset from center for rotation and scale origin (default: [0,0]).
   - pivot:[0,0] = rotate around center (default). pivot:[-70,0] = rotate around left edge of a 140px-wide shape.
   - Use for door hinges, clock hands, robot arms attached at one end.
   Example: { "id": "hand", "size": [120,10], "pos": [60,0], "pivot": [-60,0] }
   → rotation animates around the left edge (the "shoulder" joint).

   CONSTRAINTS (persistent inter-object relationships):
   - "constraints": [{ "type": "follow"|"attach"|"lock", ... }]
   - follow: { "type": "follow", "target": "id", "offsetX": 0, "offsetY": -60 }
     → object tracks target's position every frame. Add "lag": 0.2 for a trail/shadow effect.
   - attach: { "type": "attach", "target": "id", "offsetX": 30, "offsetY": 0 }
     → like follow, but the offset rotates with the target's rotation (rigid attachment).
   - lock: { "type": "lock", "lockX": true, "lockY": false }
     → freezes the specified axes at the frame-0 position.
   Example: label following a moving ball — add constraints:[{type:"follow",target:"ball",offsetY:-60}] to the label object.

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
   Canvas edges: left x=-960, right x=960, top y=-540, bottom y=540.
   Off-screen (truly hidden outside canvas):
     left x=-1200, right x=1200, top y=-700, bottom y=700.
   When the prompt says "+120% canvas width" → x = ±1152. Always use off-screen values
   (not edge values) when a shape "starts off-screen" or "slides in from outside".

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
   - "blur": [from, to]   — CSS blur filter in px (0=sharp, 20=heavily blurred). Use for focus/defocus effects.
   - "skewX": [from, to]  — horizontal skew in degrees. Creates parallelogram shape.
   - "skewY": [from, to]  — vertical skew in degrees.

   ADVANCED ACTIONS (for complex motion — use advanced_action field):
   - Circular motion ("orbit"):
     { "target": "planet", "time": [0,4], "advanced_action": { "type": "orbit",
       "orbit": { "center_x_px": 0, "center_y_px": 0, "radius_px": 150, "degrees": 360, "direction": "cw" } },
       "repeat": "infinite", "easing": "linear" }

   - Shatter burst:
     { "target": "obj", "time": [2,3], "advanced_action": { "type": "shatter",
       "shatter": { "particle_count": 16, "explosion_radius_px": 200 } } }

   - Morph to another shape:
     { "target": "rect", "time": [1,2], "advanced_action": { "type": "morph",
       "morph": { "target_shape": "circle", "target_width_px": 100, "target_height_px": 100 } } }

   - "pivotPoint": [x, y] — per-event local pivot override for this timeline event's rotation/scale.
     Overrides the object-level "pivot" just for the duration of this entry.

   Optional per-entry:
   - "easing": "linear" | "ease-in" | "ease-out" | "ease-in-out" |
               "ease-in-cubic" | "ease-out-cubic" | "ease-in-out-cubic" |
               "ease-in-sin" | "ease-out-sin" | "ease-in-out-sin" |
               "bounce" | "ease-out-bounce" | "ease-in-bounce" |
               "elastic" | "ease-out-elastic" | "ease-in-elastic"
     (default: "linear")
     - "ease-out-bounce": realistic multi-bounce deceleration (drop/gravity settle)
     - "ease-out-elastic": springy overshoot then snap back (for impactful reveals)
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
   - "strokeWidth" — use "stroke": { "width": [f,t] } instead
   - "morphTo" — not implemented
   - "blendMode" — not implemented
   - "fontFamily" on text objects — not rendered (use fontSize/fontWeight instead)

---

4. EXPLICIT MOTION FIELD DECISION RULES

   NEVER use "behavior" or "motionType" fields — they are deprecated and will produce warnings.
   Express every animation using the explicit fields below.

   COMMON PATTERNS — always use these exact explicit expressions:

   "fade in"           → opacity: [0, 1]
   "fade out"          → opacity: [1, 0]
   "slide in from left"→ x: [<rest_x - distance>, <rest_x>], opacity: [0, 1]  (two separate entries)
   "slide in from right"→ x: [<rest_x + distance>, <rest_x>], opacity: [0, 1]
   "slide in from top" → y: [<rest_y - distance>, <rest_y>], opacity: [0, 1]
   "grow from center"  → scale: [0, 1], opacity: [0, 1]
   "bounce in"         → Phase 1 (70%): scale:[0, 1.12] ease-out-cubic
                          Phase 2 (30%): scale:[1.12, 1.0] ease-in-out
   "pulse / breathe"   → scale: [1, 1.08], repeat:"infinite", easing:"ease-in-out"
   "shake"             → Multiple x events alternating: x:[-10,10] then x:[10,-10] etc.
   "orbit / circular"  → advanced_action: { type:"orbit", orbit:{ center_x_px, center_y_px, radius_px, degrees:360, direction:"cw" } }
   "spin 360°"         → rotation: [0, 360]
   "color transition"  → color: [fromHex, toHex]

   MINIMALITY RULES — follow these strictly:
   1. Only emit a timeline block if the object animates. Static objects need no timeline entry.
   2. Only emit fields that change. If only X moves, emit only x:[from,to]. Do not emit y.
   3. Prefer one entry with multiple fields (x + opacity in same entry) when they share the same time and easing.
   4. Never emit a field where from === to (no movement = no entry needed).
   5. Omit "easing" when "linear" is correct.
   6. Use repeat:"infinite" for loops — never manually duplicate timeline entries.

---

COMMON ANIMATION PATTERNS (use these exact patterns when you see the corresponding description):

  "elastic ease with overshoot to X%, settle to 100%"
    → 2-phase scale: phase1 [0→1.07] ease-out-cubic (70% of duration), phase2 [1.07→1.0] ease-in-out (30%)

  "drops with gravity, bounces once/twice, settles"
    → 3-4 phase y-animation: ease-in fall → ease-out bounce up → ease-in fall → ease-out settle
    OR use a single y event with "easing": "ease-out-bounce" for simple single-bounce settling

  "blurred/out of focus, sharpens to crystal clear"
    → object: { "blur": 20, "opacity": 0.4 }, timeline: { "blur": [20, 0], "opacity": [0.4, 1.0] }

  "glow pulses / glow intensity oscillates"
    → object: { "glow": { "blur": 30, "intensity": 0.5, "color": "#hex" } }
      timeline: { "glow": { "intensity": [0.3, 0.9] }, "repeat": "infinite" }
      (use half-cycle duration for one pulse period, repeat:"infinite" to loop)

  "opacity pulses N times" / "scale breathes N times"
    → Use "repeat": N-1 (or "repeat": "infinite" for continuous) with half-cycle duration
    NEVER manually copy timeline entries for repeating animations.

  "line draws from left to right" / "width expands from 0"
    → shape: "rectangle", size: [0, thickness], anchor: "left"
      timeline: { "width": [0, targetLength] }

  "line draws from top to bottom" / "height grows from 0"
    → shape: "rectangle", size: [thickness, 0], anchor: "top"
      timeline: { "height": [0, targetLength] }

  "skews to parallelogram" / "skew transform"
    → timeline: { "skewX": [0, 15] } then { "skewX": [15, 0] }

  "shadow grows" / "shadow moves"
    → timeline: { "shadow": { "blur": [4, 32] } } or { "shadow": { "offsetX": [4, -4] } }

  "stroke border pulses in thickness"
    → timeline: { "stroke": { "width": [2, 8] }, "repeat": "infinite" }

  "starts off-screen" (any direction)
    → Use x: ±1200 for left/right, y: ±700 for top/bottom (NOT ±960/±540 which are canvas edges)

  "slides in from left/right/top/bottom" (behavior shortcut)
    → Use behavior: "slide-in-left" / "slide-in-right" / "slide-in-top" / "slide-in-bottom"
      These automatically position the shape off-screen and slide it to its pos.

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

---

EASING RULES — CRITICAL FOR ANIMATION QUALITY:
- EVERY timeline entry MUST have an "easing" field. NEVER omit easing — linear motion looks mechanical and lifeless.
- Use the Brief's style.mood to select easing curves:
  - playful     → entrance: "bounce",           motion: "ease-in-out",       exit: "ease-in"
  - dramatic    → entrance: "ease-out-cubic",    motion: "ease-in-out-cubic", exit: "ease-in-cubic"
  - tech        → entrance: "ease-out-exp",      motion: "ease-in-out",       exit: "ease-in"
  - premium     → entrance: "ease-out-elastic",  motion: "ease-in-out",       exit: "ease-in-out"
  - professional→ entrance: "ease-out-cubic",    motion: "ease-in-out",       exit: "ease-in"
  - energetic   → entrance: "bounce",            motion: "ease-out-bounce",   exit: "ease-in"
  - calm        → entrance: "ease-out-sin",      motion: "ease-in-out-sin",   exit: "ease-in-sin"
  - corporate   → entrance: "ease-out-cubic",    motion: "ease-in-out",       exit: "ease-in"
- If the Brief has an "easingStrategy" field, use those easing values directly.
- Special property rules: fade-in (opacity 0→1) → "ease-out", fade-out (opacity 1→0) → "ease-in", scale → "ease-in-out"
- ONLY use "linear" if the prompt explicitly asks for constant-speed or mechanical motion.

---

CONTINUITY RULES — CRITICAL FOR SMOOTH MOTION:
- When phase N animates a property to value V, phase N+1 MUST start that property at V.
- Track end states of every animated property (position, rotation, scale, opacity) across phases.
- Example: if phase 1 rotates circle_1 to 180°, phase 2's rotation MUST start at [180, ...].
- Example: if phase 1 moves triangle to pos [0, -100], phase 2 MUST start from [0, -100].

---

TIMELINE STRUCTURE:
- Each timeline entry should animate ONLY ONE property (or one compound like pos).
- If an object moves AND fades simultaneously, create TWO separate entries with the same time range.
- Exception: pos (combined x+y as [[fromX,fromY],[toX,toY]]) counts as one property.

---

SEMANTIC SIZE & POSITION TRANSLATION:
- Sizes: tiny=40px, small=70px, medium=120px, large=180px, xlarge=280px
  (use as diameter for circles, or [size, size] for rectangles/triangles)
- Positions:
  center=[0, 0], left-third=[-300, 0], right-third=[300, 0],
  left-center=[-300, 0], right-center=[300, 0],
  top-center=[0, -200], bottom-center=[0, 200],
  top-left=[-350, -200], top-right=[350, -200],
  bottom-left=[-350, 200], bottom-right=[350, 200]
- For "circular-ring": arrange N objects in a circle of radius 80-120px from center, evenly spaced
- For "grid-2x2": arrange at [-150, -100], [150, -100], [-150, 100], [150, 100]

---

OBJECT DESCRIPTION → FIELD MAPPINGS:
Read each object's "description" field and apply these rules to set the correct schema fields:

TRIANGLE ORIENTATION — always set "facing" based on direction keyword in description:
- "pointing down" / "faces down" / "downward" → "facing": "down"
- "pointing up" / "faces up" / "upward" → "facing": "up" (default, but set explicitly for clarity)
- "pointing left" / "faces left" / "leftward" → "facing": "left"
- "pointing right" / "faces right" / "rightward" → "facing": "right"
Example: { "description": "Red triangle pointing right", "shape": "triangle", "size": "medium" }
→ object: { "id": "tri_1", "shape": "triangle", "size": [120, 120], "color": "#E53935", "facing": "right", "pos": [...] }

COMPOUND / GROUPED OBJECTS — when description says objects move as one unit, or an object has sub-parts:
- Use a "group" shape as the parent container, then set "parent" and "localPos" on each child
- Animate the group's position — children inherit the movement automatically
- Set "inheritRotation": true if children should spin with the group; false (default) if they rotate independently
Example: { "description": "Car body with two wheels" }
→ objects: [ { "id": "car_group", "shape": "group", "pos": [...] },
              { "id": "car_body", "shape": "rectangle", "parent": "car_group", "localPos": [0, 0], "size": [220, 80], "color": "..." },
              { "id": "wheel_l", "shape": "circle", "parent": "car_group", "localPos": [-70, 50], "diameter": 44, "inheritRotation": false } ]

PIVOT / HINGE — when description says rotation is around an end point, edge, or shoulder:
- Set "pivot": [offset_x, offset_y] so rotation happens around that local point, not the center
Example: "clock hand rotating around its base" → "pivot": [0, half_height] (rotates from the bottom end)
Example: "door swinging open from left hinge" → "pivot": [-half_width, 0]

ANCHOR — when description says shape grows from an edge (bars, meters, fill indicators):
- "grows from bottom" / "bar rising upward" → "anchor": "bottom", animate height:[0, targetH]
- "grows from left" / "fills from left" → "anchor": "left", animate width:[0, targetW]
- "grows from top" → "anchor": "top", animate height:[0, targetH]

VISUAL DECORATION — apply these object-level fields when descriptions mention them:
- "rounded corners" / "pill shape" / "soft edges" → add "cornerRadius": 12  (adjust 8–32 to taste)
- "glowing" / "neon" / "lit up" / "with glow" → add "glow": { "blur": 30, "intensity": 0.5, "color": "<same as shape color>" }
- "blurred" / "out of focus" / "hazy" / "soft" → add "blur": 15  (px; animate to 0 to sharpen)
- "drop shadow" / "with shadow" → add "shadow": { "offsetX": 4, "offsetY": 6, "blur": 14, "color": "#00000066" }

ADVANCED ACTIONS — translate choreography keywords to advanced_action blocks:
- "explodes" / "shatters" / "bursts apart" / "breaks into pieces"
  → { "target": "...", "time": [...], "advanced_action": { "type": "shatter", "shatter": { "particle_count": 16, "explosion_radius_px": 180 } } }
- "orbits" / "circles around" / "revolves around"
  → { "target": "...", "time": [...], "easing": "linear", "repeat": "infinite", "advanced_action": { "type": "orbit", "orbit": { "center_x_px": 0, "center_y_px": 0, "radius_px": 150, "degrees": 360, "direction": "cw" } } }
- "morphs into" / "transforms shape"
  → { "target": "...", "time": [...], "advanced_action": { "type": "morph", "morph": { "target_shape": "circle", "target_width_px": 120, "target_height_px": 120 } } }

---

TRANSLATION RULES:
- Choreography phases: translate each phase description into concrete timeline events with exact numeric values
- Honor the Brief's style (background, palette, duration) exactly
- Apply all OBJECT DESCRIPTION → FIELD MAPPINGS above before writing any object
- Use behavior shortcuts (fade-in, bounce-in, slide-in-*, pulse, shake) when the choreography mentions them
- For data_visualization intents: if dataHints exist, use generators (barChart, lineChart, pieChart)
- For infographic intents: use generators (statGrid, processFlow) and components (progress_bar, callout_box, badge)

---

BRIEF-TO-SPEC EXAMPLE 1 — Triangle with facing + text label (mood: "energetic"):

Input Brief:
{
  "intent": "shape_animation",
  "title": "arrow_point_and_label",
  "duration": 5,
  "style": { "background": "#111111", "mood": "energetic" },
  "objects": [
    { "description": "Large red triangle pointing right, centered", "shape": "triangle", "size": "large", "color": "#F44336", "position": "center" },
    { "description": "White label text below the triangle", "shape": "text", "position": "bottom-center" }
  ],
  "choreography": [
    { "phase": "entrance", "time": [0, 1.5], "description": "Triangle drops in from off-screen top with bounce." },
    { "phase": "main_action", "time": [1.5, 3.5], "description": "Triangle pulses scale 100% to 110% repeatedly." },
    { "phase": "hold_and_exit", "time": [3.5, 5], "description": "Label 'GO' fades in below, then both fade out." }
  ]
}

Correct Output Spec:
{
  "scene": "arrow_point_and_label",
  "duration": 5,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#111111",
  "objects": [
    { "id": "arrow_tri", "shape": "triangle", "size": [180, 180], "color": "#F44336", "facing": "right", "pos": [0, -700] },
    { "id": "go_label", "shape": "text", "text": { "content": "GO", "fontSize": 36, "fontWeight": "bold", "textColor": "#FFFFFF" }, "pos": [0, 200], "opacity": 0 }
  ],
  "timeline": [
    { "target": "arrow_tri", "time": [0, 1.5], "easing": "bounce", "y": [-700, 0] },
    { "target": "arrow_tri", "time": [1.5, 3.5], "easing": "ease-in-out", "scale": [1, 1.1], "repeat": "infinite" },
    { "target": "go_label", "time": [3.5, 4.2], "easing": "ease-out", "opacity": [0, 1] },
    { "target": "arrow_tri", "time": [4.2, 5], "easing": "ease-in", "opacity": [1, 0] },
    { "target": "go_label", "time": [4.2, 5], "easing": "ease-in", "opacity": [1, 0] }
  ]
}

Key decisions: "pointing right" → facing:"right". Text object uses nested text field with content/fontSize/fontWeight/textColor.
Energetic mood → entrance:"bounce", motion:"ease-in-out", exit:"ease-in". Scale pulse uses repeat:"infinite".

---

BRIEF-TO-SPEC EXAMPLE 2 — Grouped compound object (mood: "tech"):

Input Brief:
{
  "intent": "shape_animation",
  "title": "rocket_launch",
  "duration": 6,
  "style": { "background": "#0a0a0a", "mood": "tech" },
  "objects": [
    { "description": "Rocket body (white rectangle) with blue flame below it, moving as one unit", "shape": "rectangle", "size": "medium", "color": "#FFFFFF", "position": "bottom-center" }
  ],
  "choreography": [
    { "phase": "entrance", "time": [0, 2.5], "description": "Rocket group slides up from off-screen bottom to center." },
    { "phase": "main_action", "time": [2.5, 4.5], "description": "Rocket holds at center, flame pulses scale." },
    { "phase": "hold_and_exit", "time": [4.5, 6], "description": "Rocket group accelerates off-screen top and fades." }
  ]
}

Correct Output Spec:
{
  "scene": "rocket_launch",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#0a0a0a",
  "objects": [
    { "id": "rocket_group", "shape": "group", "pos": [0, 800] },
    { "id": "rocket_body", "shape": "rectangle", "parent": "rocket_group", "localPos": [0, 0], "size": [60, 120], "color": "#FFFFFF", "cornerRadius": 8 },
    { "id": "flame", "shape": "triangle", "parent": "rocket_group", "localPos": [0, 80], "size": [40, 50], "color": "#FF6D00", "facing": "down", "glow": { "blur": 20, "intensity": 0.7, "color": "#FF6D00" } }
  ],
  "timeline": [
    { "target": "rocket_group", "time": [0, 2.5], "easing": "ease-out-exp", "y": [800, 0] },
    { "target": "flame", "time": [2.5, 4.5], "easing": "ease-in-out", "scale": [1, 1.2], "repeat": "infinite" },
    { "target": "rocket_group", "time": [4.5, 6], "easing": "ease-in", "y": [0, -800] },
    { "target": "rocket_group", "time": [4.5, 6], "easing": "ease-in", "opacity": [1, 0] }
  ]
}

Key decisions: One group object drives all children's world position. Children use localPos (relative to group).
"flame below" → flame localPos y is positive (below). Flame is a triangle facing:"down". Glow added for visual effect.
Tech mood → entrance:ease-out-exp, motion:ease-in-out, exit:ease-in.

---

BRIEF-TO-SPEC EXAMPLE 3 — Simple circle (original reference, mood: "tech"):

Input Brief (mood: "tech"):
{
  "intent": "shape_animation",
  "title": "circle_slide_rotate",
  "duration": 6,
  "style": { "background": "#0a0a1a", "mood": "tech" },
  "objects": [
    { "description": "Cyan circle, medium, centered", "shape": "circle", "size": "medium", "color": "#00F5FF", "position": "center" }
  ],
  "choreography": [
    { "phase": "entrance", "time": [0, 2], "description": "Circle slides in from the left to center." },
    { "phase": "main_action", "time": [2, 4.5], "description": "Circle rotates 360 degrees and scales up to 130%." },
    { "phase": "hold_and_exit", "time": [4.5, 6], "description": "Circle fades out while scaling back to 100%." }
  ]
}

Correct Output Spec:
{
  "scene": "circle_slide_rotate",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#0a0a1a",
  "objects": [
    { "id": "circle_1", "shape": "circle", "diameter": 120, "color": "#00F5FF", "pos": [-1200, 0] }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 2], "easing": "ease-out-exp", "x": [-1200, 0] },
    { "target": "circle_1", "time": [2, 4.5], "easing": "ease-in-out", "rotation": [0, 360] },
    { "target": "circle_1", "time": [2, 4.5], "easing": "ease-in-out", "scale": [1, 1.3] },
    { "target": "circle_1", "time": [4.5, 6], "easing": "ease-in", "opacity": [1, 0] },
    { "target": "circle_1", "time": [4.5, 6], "easing": "ease-in", "scale": [1.3, 1] }
  ]
}

Note how: every entry has easing (tech mood → entrance: ease-out-exp, motion: ease-in-out, exit: ease-in),
rotation and scale are SEPARATE entries, exit scale starts at 1.3 (continuity from main_action phase).

---

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
  let missingEasingCount = 0;
  let multiPropCount = 0;

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

      // Quality checks (non-blocking warnings)
      if (!entry.easing && !entry.behavior) {
        missingEasingCount++;
      }
      const hasOpacity = entry.opacity !== undefined;
      const hasPosition = entry.x !== undefined || entry.y !== undefined || entry.pos !== undefined;
      if (hasOpacity && hasPosition) {
        multiPropCount++;
      }
    }

    // Quality warnings
    const totalEntries = spec.timeline.length;
    if (totalEntries > 0 && missingEasingCount / totalEntries > 0.3) {
      errors.push("Quality: " + missingEasingCount + "/" + totalEntries + " timeline entries missing easing (will default to linear)");
    }
    if (multiPropCount > 0) {
      errors.push("Quality: " + multiPropCount + " entries combine opacity with position — consider splitting");
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