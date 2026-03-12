// ─── Prompt Expander ────────────────────────────────────────────────────────
// Converts simple user prompts into structured Motion Briefs.
// This is the "creative director" layer — it decides WHAT to animate,
// while convertToSpec.js decides HOW to encode it.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import dotenv from "dotenv";
import { ANIMATION_PRINCIPLES, PALETTE_PRESETS, EASING_STRATEGIES } from "./motionKnowledge.js";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Few-Shot Examples ──────────────────────────────────────────────────────

const FEW_SHOT_EXAMPLES = `
EXAMPLE 1 — Shape animation

User prompt: "three circles bouncing"

Motion Brief:
{
  "intent": "shape_animation",
  "title": "three_circles_bouncing",
  "duration": 7,
  "canvas": { "w": 1920, "h": 1080 },
  "style": {
    "background": "#1a1a2e",
    "palette": ["#e94560", "#0f3460", "#533483"],
    "mood": "playful"
  },
  "easingStrategy": {
    "entrance": "bounce",
    "motion": "ease-in-out",
    "exit": "ease-in"
  },
  "objects": [
    { "description": "Red circle, medium", "shape": "circle", "size": "medium", "color": "#e94560", "position": "left-third" },
    { "description": "Blue circle, medium", "shape": "circle", "size": "medium", "color": "#0f3460", "position": "center" },
    { "description": "Purple circle, medium", "shape": "circle", "size": "medium", "color": "#533483", "position": "right-third" }
  ],
  "choreography": [
    {
      "phase": "entrance",
      "time": [0, 1.5],
      "description": "Three circles appear with staggered bounce-in (0.3s apart, left to right) using bounce easing. Each starts at opacity 0, scale 0 and bounces to full size."
    },
    {
      "phase": "main_action",
      "time": [1.5, 5],
      "description": "Each circle bounces vertically with y oscillation (80px amplitude, moving down then back up) using ease-in-out easing. Stagger 0.25s apart creating a wave effect. Use repeat for continuous bouncing."
    },
    {
      "phase": "hold_and_exit",
      "time": [5, 7],
      "description": "Bouncing slows. All three circles fade out together over the last 1s with ease-in easing."
    }
  ]
}

---

EXAMPLE 2 — Data visualization

User prompt: "bar chart showing sales data"

Motion Brief:
{
  "intent": "data_visualization",
  "title": "sales_bar_chart",
  "duration": 10,
  "canvas": { "w": 1920, "h": 1080 },
  "style": {
    "background": "#0d1117",
    "palette": ["#2196F3", "#4CAF50", "#FF9800", "#E91E63"],
    "mood": "professional"
  },
  "easingStrategy": {
    "entrance": "ease-out-cubic",
    "motion": "ease-in-out",
    "exit": "ease-in"
  },
  "objects": [
    { "description": "Chart title 'Sales Performance'", "shape": "text", "position": "top-center" },
    { "description": "Bar chart with 4 categories (Q1-Q4) and sample revenue data", "shape": "barChart_generator", "position": "center" }
  ],
  "choreography": [
    {
      "phase": "entrance",
      "time": [0, 1],
      "description": "Title fades in at top with ease-out easing. Then axis labels and gridlines appear with fade-in."
    },
    {
      "phase": "main_action",
      "time": [1, 7],
      "description": "Four bars grow from baseline sequentially (1.2s per bar, 0.3s stagger) with ease-out easing. Each bar grows upward from 0 to its target height. Use barChart generator with sample data: Q1=$120K, Q2=$185K, Q3=$145K, Q4=$210K."
    },
    {
      "phase": "hold_and_exit",
      "time": [7, 10],
      "description": "Value labels appear above each bar with ease-out fade-in (staggered). Legend appears bottom-right. Hold final chart for 2s."
    }
  ],
  "dataHints": {
    "generatorType": "barChart",
    "categories": ["Q1", "Q2", "Q3", "Q4"],
    "values": [120, 185, 145, 210],
    "valueLabel": "Revenue ($K)"
  }
}

---

EXAMPLE 3 — Loading indicator

User prompt: "loading spinner"

Motion Brief:
{
  "intent": "loading_indicator",
  "title": "loading_spinner",
  "duration": 4,
  "canvas": { "w": 1920, "h": 1080 },
  "style": {
    "background": "#0a0a1a",
    "palette": ["#00F5FF", "#0088AA", "#004455"],
    "mood": "tech"
  },
  "easingStrategy": {
    "entrance": "ease-out-exp",
    "motion": "ease-in-out",
    "exit": "ease-in"
  },
  "objects": [
    { "description": "8 small circles arranged in a ring (radius 80px from center)", "shape": "circle", "size": "small", "position": "circular-ring" },
    { "description": "Loading text below the spinner", "shape": "text", "position": "bottom-center" }
  ],
  "choreography": [
    {
      "phase": "entrance",
      "time": [0, 0.5],
      "description": "All 8 circles and loading text fade in quickly together."
    },
    {
      "phase": "main_action",
      "time": [0.5, 3.5],
      "description": "The 8 circles pulse in sequence — each circle scales up slightly and glows brightly, then returns to dim state, creating a clockwise chase effect. Stagger 0.15s between each circle. Use repeat infinite to loop continuously. Loading text pulses gently (opacity 0.5 to 1, repeat infinite)."
    },
    {
      "phase": "hold_and_exit",
      "time": [3.5, 4],
      "description": "Animation continues looping until the end. No exit needed (it's a loop)."
    }
  ]
}

---

EXAMPLE 4 — Logo reveal

User prompt: "logo animation"

Motion Brief:
{
  "intent": "logo_reveal",
  "title": "logo_reveal_animation",
  "duration": 6,
  "canvas": { "w": 1920, "h": 1080 },
  "style": {
    "background": { "type": "gradient", "from": "#0D1B2A", "to": "#1B2838", "direction": "to bottom" },
    "palette": ["#FFD700", "#FFFFFF", "#4ECDC4"],
    "mood": "premium"
  },
  "easingStrategy": {
    "entrance": "ease-out-elastic",
    "motion": "ease-in-out",
    "exit": "ease-in-out"
  },
  "objects": [
    { "description": "Large central circle as logo mark, gold color", "shape": "circle", "size": "xlarge", "color": "#FFD700", "position": "center" },
    { "description": "Brand name text 'BRAND' below the logo mark", "shape": "text", "position": "bottom-center" },
    { "description": "Tagline text below brand name", "shape": "text", "position": "bottom-center" }
  ],
  "choreography": [
    {
      "phase": "entrance",
      "time": [0, 2],
      "description": "Logo mark appears with dramatic grow-from-center (scale 0 to 1 with overshoot via bounce-in). Add a golden glow effect that intensifies as it appears."
    },
    {
      "phase": "main_action",
      "time": [2, 4],
      "description": "Brand name text slides in from bottom with fade-in. Then tagline fades in below it 0.5s later. Logo mark does a subtle pulse (scale 1→1.05→1) once."
    },
    {
      "phase": "hold_and_exit",
      "time": [4, 6],
      "description": "Everything holds in final position. Subtle glow pulsing on the logo mark for premium feel. Hold until end."
    }
  ]
}

---

EXAMPLE 5 — Infographic / Dashboard

User prompt: "KPI dashboard"

Motion Brief:
{
  "intent": "infographic",
  "title": "kpi_dashboard",
  "duration": 14,
  "canvas": { "w": 1920, "h": 1080 },
  "style": {
    "background": { "type": "gradient", "from": "#0d1117", "to": "#1a2744", "direction": "to bottom right" },
    "palette": ["#2196F3", "#4CAF50", "#FF9800", "#E91E63"],
    "mood": "corporate"
  },
  "easingStrategy": {
    "entrance": "ease-out-cubic",
    "motion": "ease-in-out",
    "exit": "ease-in"
  },
  "objects": [
    { "description": "Dashboard title 'Performance Dashboard'", "shape": "text", "position": "top-center" },
    { "description": "4 KPI stat cards in a row (Revenue, Users, NPS, Growth)", "shape": "statGrid_generator", "position": "top-area" },
    { "description": "3 progress bars showing goal completion", "shape": "progress_bar_components", "position": "bottom-left-area" },
    { "description": "Callout box with summary insight", "shape": "callout_component", "position": "bottom-right" }
  ],
  "choreography": [
    {
      "phase": "entrance",
      "time": [0, 1],
      "description": "Dashboard title fades in and slides down slightly from top."
    },
    {
      "phase": "main_action",
      "time": [1, 10],
      "description": "KPI cards appear sequentially (0.3s stagger) with grow-from-center behavior. Then progress bars animate their fill from 0% to target value with staggered timing. Then callout box slides in from right. Use statGrid generator for KPI cards and progress_bar components."
    },
    {
      "phase": "hold_and_exit",
      "time": [10, 14],
      "description": "All elements hold in place. Subtle pulse on the highest KPI value for emphasis. Hold until end."
    }
  ],
  "dataHints": {
    "generators": ["statGrid", "processFlow"],
    "components": ["progress_bar", "callout_box", "badge"]
  }
}
`;

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Motion Graphics Creative Director.

Your job is to convert simple, vague user prompts into structured "Motion Brief" JSON documents that describe a complete, high-quality animation plan.

The user will type things like "three circles bouncing", "car moving animation", "loading spinner", or "bar chart". You must expand these into detailed animation plans with objects, colors, layout, timing, and choreography.

OUTPUT FORMAT: Return ONLY valid JSON matching the Motion Brief schema below. No explanations, no markdown, no conversational text.

---

## MOTION BRIEF SCHEMA

{
  "intent": string,          // One of: shape_animation, data_visualization, infographic, scene, loading_indicator, text_animation, logo_reveal
  "title": string,           // Short snake_case identifier
  "duration": number,        // Total duration in seconds
  "canvas": { "w": 1920, "h": 1080 },

  "style": {
    "background": string | { "type": "gradient", "from": "#hex", "to": "#hex", "direction": "to bottom" },
    "palette": string[],     // 2-4 hex colors for the animation
    "mood": string           // playful, professional, dramatic, tech, premium, energetic, calm
  },

  "easingStrategy": {        // REQUIRED — derived from mood. Tells the spec converter which easing to use.
    "entrance": string,      // Easing for entrance phase (e.g., "bounce", "ease-out-cubic", "ease-out-elastic")
    "motion": string,        // Easing for main action phase (e.g., "ease-in-out", "ease-in-out-cubic")
    "exit": string           // Easing for exit/hold phase (e.g., "ease-in", "ease-in-out")
  },

  "objects": [               // What appears on screen
    {
      "description": string, // Natural language description of the object
      "shape": string,       // circle, rectangle, triangle, star, line, text, or *_generator / *_component hints
      "size": string,        // tiny, small, medium, large, xlarge (optional)
      "color": string,       // hex color (optional — can be derived from palette)
      "position": string     // Semantic: center, left-third, right-third, top-center, bottom-center, circular-ring, grid-2x2, etc.
    }
  ],

  "choreography": [          // How things move — MUST have 3 phases
    {
      "phase": "entrance",
      "time": [start, end],  // In seconds
      "description": string  // Detailed natural language animation description
    },
    {
      "phase": "main_action",
      "time": [start, end],
      "description": string
    },
    {
      "phase": "hold_and_exit",
      "time": [start, end],
      "description": string
    }
  ],

  "dataHints": {             // OPTIONAL — only for data_visualization or infographic intents
    "generatorType": string, // barChart, lineChart, pieChart, statGrid, processFlow
    "categories": string[],
    "values": number[],
    "valueLabel": string
  }
}

---

## INTENT CLASSIFICATION GUIDE

Classify the user's prompt into one of these intents:

- **shape_animation**: Basic shapes with motion (circles, squares, triangles, stars). Default for any geometric shape prompt.
- **data_visualization**: Charts, graphs, data display (bar chart, pie chart, line graph). Triggered by words like "chart", "graph", "data", "statistics".
- **infographic**: Dashboards, KPI displays, stat cards, progress indicators. Triggered by "dashboard", "KPI", "infographic", "stats".
- **scene**: Multi-object narrative scenes (rocket launch, sunrise, city). Triggered by real-world scenarios.
- **loading_indicator**: Spinners, loaders, progress animations. Triggered by "loading", "spinner", "loader".
- **text_animation**: Kinetic typography, text reveals. Triggered by "text", "typography", "title animation".
- **logo_reveal**: Brand/logo entrance animations. Triggered by "logo", "brand", "intro".

---

${ANIMATION_PRINCIPLES}

---

## PALETTE SELECTION GUIDE

Choose palettes based on mood:
- playful/energetic → vibrant warm colors (reds, oranges, yellows) on dark background
- professional/corporate → blues, greens, grays on white or dark navy
- dramatic/premium → gold, white on very dark background with gradients
- tech/modern → cyan, magenta, neon green on near-black
- calm/minimal → pastels on light background

Available preset palettes for reference:
${Object.entries(PALETTE_PRESETS).map(([name, p]) => `- ${name}: bg=${p.bg}, colors=[${p.colors.join(", ")}]`).join("\n")}

---

## EASING STRATEGY (REQUIRED)

Every Motion Brief MUST include an "easingStrategy" field derived from the mood.
Use these mappings:
${Object.entries(EASING_STRATEGIES).map(([mood, e]) => `- ${mood}: entrance="${e.entrance}", motion="${e.motion}", exit="${e.exit}"`).join("\n")}

The easingStrategy tells the spec converter which easing curves to use for each phase.
Also mention easing in choreography descriptions (e.g., "slides in with bounce easing").

---

## CRITICAL RULES

1. ALWAYS include exactly 3 choreography phases: entrance, main_action, hold_and_exit
2. The choreography time ranges must cover the full duration with no gaps
3. Objects should be SPECIFIC — don't say "some shapes", say "3 medium circles"
4. Choreography descriptions must be DETAILED — include easing names, stagger timing, amplitude, and end positions
5. Reference available behaviors (fade-in, bounce-in, slide-in-*, pulse, shake) in choreography descriptions
6. ALWAYS include "easingStrategy" field — derive it from the mood using the easing strategy table above
7. Mention easing in choreography descriptions (e.g., "bounces in with bounce easing", "fades out with ease-in")
8. For data visualizations, include plausible sample data in dataHints
9. Duration should match the complexity (see duration guidelines in animation principles)
10. Never leave objects invisible without an entrance animation
11. If the user mentions a specific color or shape, honor their request
12. If the prompt is extremely vague (e.g., "animate something"), create an appealing shape animation with 3-5 objects

---

${FEW_SHOT_EXAMPLES}

---

Convert the following user prompt into a Motion Brief JSON. Return ONLY the JSON.`;

// ─── Motion Brief Validation ────────────────────────────────────────────────

function validateMotionBrief(brief) {
  const errors = [];

  if (!brief.intent) errors.push("Missing 'intent'");
  if (!brief.title) errors.push("Missing 'title'");
  if (typeof brief.duration !== "number" || brief.duration <= 0) {
    errors.push("Missing or invalid 'duration'");
  }
  if (!brief.style || !brief.style.background) {
    errors.push("Missing 'style.background'");
  }
  if (!Array.isArray(brief.objects) || brief.objects.length === 0) {
    errors.push("Missing or empty 'objects'");
  }
  if (!Array.isArray(brief.choreography) || brief.choreography.length === 0) {
    errors.push("Missing or empty 'choreography'");
  }

  // Validate choreography phases
  if (Array.isArray(brief.choreography)) {
    for (let i = 0; i < brief.choreography.length; i++) {
      const phase = brief.choreography[i];
      if (!phase.phase) errors.push(`Choreography[${i}] missing 'phase'`);
      if (!Array.isArray(phase.time) || phase.time.length !== 2) {
        errors.push(`Choreography[${i}] missing or invalid 'time'`);
      } else if (phase.time[0] >= phase.time[1]) {
        errors.push(`Choreography[${i}] time[0] must be < time[1]`);
      }
      if (!phase.description) {
        errors.push(`Choreography[${i}] missing 'description'`);
      }
    }
  }

  // Validate objects
  if (Array.isArray(brief.objects)) {
    for (let i = 0; i < brief.objects.length; i++) {
      if (!brief.objects[i].description) {
        errors.push(`Objects[${i}] missing 'description'`);
      }
    }
  }

  const validIntents = [
    "shape_animation", "data_visualization", "infographic",
    "scene", "loading_indicator", "text_animation", "logo_reveal",
  ];
  if (brief.intent && !validIntents.includes(brief.intent)) {
    errors.push(`Invalid intent '${brief.intent}'. Must be one of: ${validIntents.join(", ")}`);
  }

  // Quality: warn if easingStrategy is missing
  if (!brief.easingStrategy) {
    errors.push("Missing 'easingStrategy' — easing will be inferred from mood by the enricher");
  }

  // Quality: warn if choreography descriptions lack easing terms
  const easingTerms = ["easing", "ease", "bounce", "elastic", "cubic", "linear", "spring"];
  if (Array.isArray(brief.choreography)) {
    for (let i = 0; i < brief.choreography.length; i++) {
      const desc = (brief.choreography[i].description || "").toLowerCase();
      const hasEasingMention = easingTerms.some(term => desc.includes(term));
      if (!hasEasingMention) {
        errors.push(`Choreography[${i}] description doesn't mention easing — animations may feel mechanical`);
      }
    }
  }

  return errors;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function expandPrompt(simplePrompt) {
  console.log("🎬 Expanding prompt: \"" + simplePrompt + "\"");

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    temperature: 0,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: simplePrompt },
    ],
  });

  const rawText = response.output[0].content[0].text;

  // Clean up potential markdown wrapping
  const cleaned = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let brief;
  try {
    brief = JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error("Failed to parse Motion Brief JSON: " + parseErr.message + "\nRaw output:\n" + cleaned.slice(0, 500));
  }

  // Auto-inject easingStrategy if missing (derive from mood)
  if (!brief.easingStrategy && brief.style?.mood) {
    const mood = brief.style.mood;
    brief.easingStrategy = EASING_STRATEGIES[mood] || EASING_STRATEGIES.professional;
    console.log(`[promptExpander] Auto-injected easingStrategy from mood "${mood}"`);
  }

  // Validate the brief
  const errors = validateMotionBrief(brief);
  if (errors.length > 0) {
    console.warn("⚠️  Motion Brief validation warnings:");
    errors.forEach(e => console.warn("  - " + e));

    // Only throw on critical errors
    const critical = errors.filter(e =>
      e.includes("Missing 'intent'") ||
      e.includes("Missing or empty 'objects'") ||
      e.includes("Missing or empty 'choreography'")
    );
    if (critical.length > 0) {
      throw new Error("Motion Brief has critical errors: " + critical.join("; "));
    }
  }

  console.log("✅ Motion Brief generated: " + brief.title + " (" + brief.intent + ", " + brief.duration + "s)");
  return brief;
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] && process.argv[1].includes("promptExpander");
if (isDirectRun) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.error("Usage: node scripts/promptExpander.js <prompt>");
    console.error('Example: node scripts/promptExpander.js "three circles bouncing"');
    process.exit(1);
  }

  expandPrompt(prompt)
    .then(brief => {
      console.log("\n─── MOTION BRIEF ───");
      console.log(JSON.stringify(brief, null, 2));
    })
    .catch(err => {
      console.error("❌ Error:", err.message);
      process.exit(1);
    });
}
