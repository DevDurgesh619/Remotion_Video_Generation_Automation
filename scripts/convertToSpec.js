import fs from "fs-extra";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const INPUT_FILE = "./prompts.json";
const OUTPUT_FOLDER = "./machine_specs";

const SCHEMA = `{
  "scene_id": "",
  "scene_name": "",
  "duration_sec": 0,
  "fps": 30,

  "canvas": {
    "width_px": 1920,
    "height_px": 1080,
    "aspect_ratio": "16:9",
    "perspective_px": 1000       // Crucial for 3D tilts and flips
  },

  "background": {
    "type": "solid",               
    "color": "",                   
    "gradient_start": "",
    "gradient_end": "",
    "gradient_direction": "",      
    "image_url": ""
  },

  "global_layout": {
    "origin": "center",            
    "safe_margin_px": 0
  },

  "objects": [
    {
      "id": "",
      "type": "shape",             
      "shape": "",                 // "circle" | "rectangle" | "triangle" | "pentagon" | "star" | "line" | "spiral" | "zigzag" | "custom_path"
      "subtype": "",               
      "count": 1,

      "orientation": {             
        "facing": "",              
        "rotation_deg": 0          
      },

      "size": {
        "width_px": 0,
        "height_px": 0,
        "diameter_px": 0,          
        "thickness_px": 0          
      },

      "corner_radius_px": 0,       
      "color": "",                 
      "stroke_color": "",
      "stroke_width_px": 0,
      "fill_enabled": true,

      "effects": {
        "shadow": {
          "enabled": false,
          "offset_x_px": 0,
          "offset_y_px": 0,
          "blur_px": 0,
          "spread_px": 0,
          "color": "rgba(0,0,0,0)"
        },
        "glow": {
          "enabled": false,
          "color": "",
          "blur_px": 0,
          "intensity": 0
        },
        "gradient_fill": {
          "enabled": false,
          "start_color": "",
          "end_color": "",
          "direction": "",
          "offset_pct": 0         // For liquid gradient flows
        }
      },

      "initial_state": {
        "position": {
          "x_value": 0,
          "x_unit": "px",          
          "y_value": 0,
          "y_unit": "px"           
        },
        "rotation_deg": 0,
        "scale": 1.0,
        "opacity": 1.0
      }
    }
  ],

  "animations": [
    {
      "id": "",
      "target_object_id": "",
      "type": "",                  // "transform", "color_shift", "effects_shift", "stroke_draw", "morph", "split", "shatter", "orbit", "extrude"

      "start_sec": 0,
      "end_sec": 0,
      "duration_sec": 0,
      "easing": "linear",          // "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring" | "bounce"

      // 1. STANDARD TRANSFORMS
      "transform": {
        "translate": {
          "from_x": 0, "to_x": 0, "x_unit": "px",
          "from_y": 0, "to_y": 0, "y_unit": "px"
        },
        "rotate_deg": {
          "from": 0, "to": 0,
          "axis": "2d",            // "2d" | "x-3d" | "y-3d"
          "direction": "clockwise" 
        },
        "scale": {
          "from_x": 1.0, "to_x": 1.0, // Split for independent width/height scaling (e.g. Rectangle Width Wave)
          "from_y": 1.0, "to_y": 1.0
        },
        "opacity": {
          "from": 1.0, "to": 1.0
        },
        "corner_radius_px": {
          "from": 0, "to": 0       // Handles Rectangle to Pill transitions
        },
        "skew_deg": {
          "from_x": 0, "to_x": 0,
          "from_y": 0, "to_y": 0
        }
      },

      // 2. COLOR & EFFECTS TRANSITIONS
      "style_transition": {
        "color": {
          "from": "", "to": ""
        },
        "shadow": {
          "from_offset_x": 0, "to_offset_x": 0,
          "from_offset_y": 0, "to_offset_y": 0,
          "from_blur": 0, "to_blur": 0,
          "color": ""
        },
        "glow": {
          "from_blur": 0, "to_blur": 0,
          "from_intensity": 0, "to_intensity": 0
        },
        "gradient_flow": {
          "from_offset_pct": 0, "to_offset_pct": 100
        }
      },

      // 3. STROKE & PATH DRAWING
      "stroke_draw": {
        "coverage_from": 0.0,
        "coverage_to": 1.0,
        "direction": "clockwise",
        "thickness_px": { "from": 0, "to": 0 }
      },
      "dash_pattern": {
        "dash_px": 0,
        "gap_px": 0,
        "offset_from_px": 0,
        "offset_to_px": 0
      },

      // 4. ADVANCED MUTATIONS & ACTIONS
      "advanced_actions": {
        // Handled via Remotion changing the underlying SVG/Div
        "morph": {
          "target_shape": "",      // e.g., "ellipse", "star"
          "target_width_px": 0,
          "target_height_px": 0
        },
        // Handled via Remotion mapping an array into multiple elements
        "split": {
          "pieces": 0,
          "grid": {"rows": 0, "cols": 0},
          "scatter_distance_px": 0,
          "scatter_rotation_deg": 0
        },
        "shatter": {
          "particle_count": 0,
          "explosion_radius_px": 0
        },
        "orbit": {
          "center_x_px": 0,
          "center_y_px": 0,
          "radius_px": 0,
          "degrees": 360,
          "maintain_facing": true
        },
        "extrude": {
          "layers": 0,
          "offset_x_px": 0,
          "offset_y_px": 0,
          "opacity_fade": true
        }
      }
    }
  ]
}`;
const DELAY_MS = 3000; // delay between requests (helps avoid rate limits)
const BATCH_SIZE = 2;     // number of requests before pause
const BATCH_DELAY = 40000; // 20 seconds pause between batches
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function convertPrompt(promptText) {

  const response = await client.responses.create({
    model: "gpt-4o",
    temperature: 0,
    input: [
      {
        role: "system",
        content: `You are an expert Motion Graphics Specification Generator.

Your sole objective is to convert complex, multi-phase natural language motion graphics prompts into a deterministic, machine-readable JSON specification called the **Universal Motion Spec**.

The output will be piped directly into a React/Remotion rendering engine. Any deviation from the schema, hallucinated fields, or invalid JSON will cause a fatal compiler crash.

---

1. THE GOLDEN RULES (STRICT COMPLIANCE)
ONLY JSON: Output absolutely nothing but valid JSON. No conversational text, no explanations, no comments, and NEVER use markdown formatting (do NOT wrap the output in code blocks or use markdown formatting).

SCHEMA LOCK: You MUST follow the provided schema exactly. DO NOT invent, rename, or delete fields.

EMPTY STATES: If a schema field is not required by the prompt, leave strings as "", numbers as 0, arrays as [], and booleans as false. Do NOT remove the key.

DATA TYPES: Strict adherence to data types is mandatory. Do not wrap numbers or booleans in quotes.

ID REFERENCING: Every object must have a unique id (e.g., "circle_1"). Every item in the animations array MUST reference a valid object via target_object_id.

2. SCENE & CANVAS DEFAULTS
scene_id: Must match the ID provided in the prompt.

scene_name: Generate a short, descriptive 2-4 word title based on the prompt.

If total duration is provided, fill duration_sec. If not, calculate it based on the timeline.

fps: Default to 30.

Canvas defaults: width_px: 1920, height_px: 1080, aspect_ratio: "16:9".

3D Perspective: If the prompt mentions 3D tilts, flips, or perspective, set canvas.perspective_px to 1000. Otherwise, leave it at 0.

3. OBJECT EXTRACTION
Extract all distinct shapes and text into the objects array.

Set the correct type ("shape", "text", "line").

Set the correct shape ("circle", "rectangle", "triangle", "pentagon", "star", "spiral", "zigzag", "custom_path").

Extract specific hex codes or color names exactly as written into color or stroke_color.

position: Assume the canvas origin is "center" (x: 0, y: 0) unless a specific offset is mentioned.

4. TIMELINE & SYNCHRONIZATION LOGIC (CRITICAL)
Complex prompts describe multiple phases (e.g., 0-2s, 2-4s). You must break these down into discrete animation blocks inside the animations array.

Sequential Phases: Create a separate animation object for each time block.

Simultaneous Actions: If a shape scales AND changes color from 0-2s, create TWO separate animation objects in the array. Both will share the same target_object_id, start_sec: 0, and end_sec: 2. One will have type: "scale", and the other will have type: "color_transition".

Calculate duration_sec for each animation block (end_sec - start_sec).

5. ANIMATION TYPES & MAPPING
Map the prompt's action to the correct animation type.

LEVEL 1.0 CORE ANIMATIONS (Always use these for basic motion):

translate: Moving position (x, y).

rotate: 2D rotation.

scale: Changing size.

fade: Changing opacity.

draw: Drawing a stroke/line over time.

path_motion: Moving along a defined path.

color_transition: Changing fill or stroke color.

physics_bounce: Gravity drops and bouncing.

LEVEL 2.0 ADVANCED ANIMATIONS (Use for complex shape manipulation):

3d_rotate: For 3D flips and perspective tilts (populate rotate_deg.axis as "x-3d" or "y-3d").

skew: For slanting and shearing shapes.

corner_round: For transitioning between sharp corners and rounded/pill shapes.

shadow_shift: For moving shadows or changing shadow blur/opacity.

glow_pulse: For animating glow blur and intensity.

gradient_flow: For moving liquid-like gradients across a shape.

morph: When a shape transforms into another shape (e.g., Square to Circle). Populate advanced_actions.morph.

split: When a single shape breaks into a grid of smaller identical shapes. Populate advanced_actions.split.

shatter: For particle explosions. Populate advanced_actions.shatter.

orbit: When a shape travels along an invisible circular path. Populate advanced_actions.orbit.

extrude: For 3D depth duplication effects. Populate advanced_actions.extrude.

OUTPUT REQUIREMENT
Return ONLY valid JSON.

`
      },
      {
        role: "user",
        content: `
Schema:

${SCHEMA}

Prompt:

${promptText}
`
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

  const outputPath = `${OUTPUT_FOLDER}/spec_${id}.json`;

  if (await fs.pathExists(outputPath)) {
    console.log(`Skipping ${id} (already generated)`);
    continue;
  }

  try {

    console.log(`Processing prompt ${id}`);

    const spec = await convertPrompt(prompt);

    const cleaned = spec
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    await fs.writeFile(outputPath, cleaned);

    console.log(`Saved ${outputPath}`);

  } catch (error) {

    console.error(`Error on prompt ${id}`, error.message);

    await sleep(10000);
  }

  // small delay between each request
  await sleep(DELAY_MS);

  // 🚀 batch pause after every 4 requests
  if ((i + 1) % BATCH_SIZE === 0) {

    console.log(`Batch limit reached. Waiting 20 seconds...`);

    await sleep(BATCH_DELAY);
  }
}
}

main();