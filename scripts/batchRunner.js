require("dotenv").config();
const fs = require("fs");
const { execSync } = require("child_process");
const OpenAI = require("openai");
const { createObjectCsvWriter } = require("csv-writer");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompts = JSON.parse(fs.readFileSync("./prompts.json"));
const SPEC_FOLDER = "./machine_specs";
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

// Parse duration from prompt (e.g. "Total duration: 6s" → 180 frames)
function parseDuration(promptText) {
  const match = promptText.match(/Total duration:\s*(\d+(?:\.\d+)?)\s*s/);
  if (match) {
    const seconds = parseFloat(match[1]);
    return Math.floor(seconds * 30); // FPS = 30
  }
  console.warn("No duration found, defaulting to 120 frames");
  return 120;
}
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
async function generateCode(promptText) {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `ROLE
You generate deterministic Remotion animation code from a structured animation specification.

INPUT FORMAT
The input is a Universal Motion Spec JSON.
You must read the JSON and generate Remotion animation code that implements the animation exactly.
Never interpret natural-language instructions.
Only follow the JSON specification.

ENVIRONMENT
Renderer: Remotion
Runtime: Node (not browser)
Global FPS: 30
Total frames = duration_sec * 30
Do NOT output markdown code fences.
Do NOT output jsx or tsx.
Return raw JSX only.

ALLOWED API
You may use only:
div
AbsoluteFill
useCurrentFrame
interpolate

You must not use any other APIs or libraries, including but not limited to:
framer-motion or motion.div
CSS keyframe animations
requestAnimationFrame
window, document
random values
React hooks other than useCurrentFrame

OUTPUT RULES
You must output only the component body.
You must not output:
import statements
export statements
function definitions
markdown
comments
explanations

The output must be valid JSX code that can be placed inside a Remotion component.

MANDATORY STRUCTURE
Your code must follow this structure:
Declare const frame = useCurrentFrame(); at the top.
Declare all derived animation values next.
Return a single AbsoluteFill as the root element.

Shape:
const frame = useCurrentFrame();
// animation calculations here
return (
<AbsoluteFill style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}>
{/* shape divs here */}

);

Rules:
There must be exactly one AbsoluteFill root.
The code must contain a return statement.
All shapes must be div elements.

STRING SAFETY RULES
You must never use:
backticks
template literals
placeholder interpolation syntax (for example, a variable between the characters dollar-brace and closing-brace in a template literal)
the dollar symbol
All dynamic strings must use concatenation.

Correct:
const transformValue = "translate(-50%, -50%) translateX(" + x + "px)";
Incorrect:
transform written using template literal style instead of string concatenation (never use any placeholder-style interpolation; always build the string with "translateX(" + x + "px)")

VARIABLE RULES
Every variable must be declared before use.
Use let for values that can change, const for values that never change.
Never reassign a const.

JSX SYNTAX RULES
JSX must be valid and balanced.
Declare all const and let before the return.
Never declare variables inside JSX.
Use {} for dynamic values in JSX.

Correct:
width: size + "px"

CRITICAL RULES:

transform MUST be: "translateX(-100%) translateY(-50%)"

NEVER use: "translate(-50%, -50%)"

width MUST interpolate from 0 to size.width_px

Copy this transform EXACTLY - do not modify
For other directions (right-to-left): use translateX(0%) translateY(-50%)

LINE ANIMATION TRANSFORMS - CORRECTED (CRITICAL FIX):
When animating the "width" of a line, NEVER use "translate(-50%, -50%)". Because the percentage recalculates as the width grows, it causes the line to grow symmetrically from the center in both directions. You MUST use fixed pixels for the X translation based on the FINAL max width.
stroke_draw.direction: "left-to-right" (Anchors left edge, grows to the right)
Calculate half of the FINAL target width (e.g., if target is 450px, half is 225px).
Set transform: "translateX(-225px) translateY(-50%)"
Animate the "width" from 0 to 450px.

POLYGON STROKE DRAW ANIMATION RULE (CRITICAL FOR DIVS)
You CANNOT use standard CSS borders to animate a stroke on a triangle, pentagon, or star because "clipPath" cuts off borders.
You CANNOT use SVG or path.
To animate a "stroke draw" on a clip-pathed shape, you MUST use the "Conic Gradient Mask" technique with two stacked divs.

DASHED LINE & MARCHING ANIMATION RULES (CRITICAL FOR DIVS)
Because you can only use div, you MUST use 'repeating-linear-gradient' to create dashed lines. Do NOT use 'border-style: dashed'.
Set the background image of the line using string concatenation.

DIAGONAL SLIDING & OFF-SCREEN MATH (CRITICAL)
When a prompt asks for a shape to slide along a "diagonal path" or "45° angle" from a corner, the X and Y translation values MUST be mathematically equal (e.g., -1200 and -1200).
Do NOT use the exact 16:9 screen corner coordinates like -960 (X) and -540 (Y).

OSCILLATION & CYCLE TIMING CONFLICTS (CRITICAL)
If the text prompt explicitly specifies a fast timing and cycle count BUT the JSON timeline stretches it out into a single slow sequence, YOU MUST TRUST THE TEXT PROMPT. Manually unroll the math based on the text prompt's cycle count.

ABSOLUTE CENTERING & TRANSFORM ORIGIN (CRITICAL FOR BAR CHARTS)
By default, center shapes using:
position: "absolute",
left: "50%",
top: "50%",
transform: "translate(-50%, -50%)"

HOWEVER, if the JSON specifies transform_origin: "bottom" (e.g., Bar Charts growing upward), you MUST NOT use the standard centering transform. Instead, anchor it to the bottom of the screen or a specific baseline:
left: "50%",
bottom: "20%",
transformOrigin: "bottom center",
transform: "translateX(-50%) scaleY(" + scaleY + ")"

INTERPOLATION RULES
All uses of interpolate must respect:
inputRange must contain exactly two numbers.
outputRange must contain exactly two values.
inputRange[0] must be strictly less than inputRange[1].
inputRange values must be strictly increasing.
Never use reversed ranges.
Never use duplicate values.
inputRange and outputRange must have the same length.
Interpolated values must be numeric.
Never pass strings into interpolate.
Always clamp extrapolation.

FRAME TIMING RULES
Convert seconds to frames using the global FPS = 30.
startFrame = start_sec * 30
endFrame = end_sec * 30
You must always use frame numbers in interpolate.

STAGGERED SEQUENCES & MANUALLY UNROLLED MATH (CRITICAL FOR MULTI-SHAPE)
Because loops (.map, for) are strictly banned, if the JSON specifies a sequence with stagger_sec across multiple target_object_ids (e.g., a wave or domino effect), you MUST manually calculate and write out the interpolated variables for EVERY single shape.
Example: If stagger is 0.5s (15 frames), write separate interpolations where Shape 1 starts at frame 0, Shape 2 at frame 15, Shape 3 at frame 30, etc.

COLOR ANIMATION & BLEND MODES
You must not interpolate hex color strings directly. To animate colors, interpolate each RGB channel separately and build an "rgb(r,g,b)" string.
If the JSON specifies a blend_mode (e.g., "screen", "multiply"), apply it to the style object as mixBlendMode: "screen".
If the JSON specifies a z_index, apply it to the style object as zIndex.

GLOW, SHADOW & PULSE ANIMATION RULES (CRITICAL)
To create a glow effect on a div, use the 'boxShadow' style property.
When animating the blur radius or spread, you MUST build the string using strict concatenation.

TEXT COUNTERS (CRITICAL FOR UI/CHARTS)
If animating a text number (e.g., a percentage counter), use Math.round() on the interpolated numeric value and strictly concatenate the text inside the div payload.
Example: {prefix + Math.round(interpolatedValue) + suffix}

BACKGROUND RULE
The root AbsoluteFill must always define a background.

SHAPE RULES
Only div elements are allowed for shapes.
Circle: borderRadius: "50%"
Rectangle: Use width and height.
Triangles or complex shapes: Use clipPath.

NO LOOPS RULE
You must never generate elements programmatically.
Forbidden: for loops, while loops, .map(), Array.from().
All shapes must be written explicitly. If 9 shapes are required, write 9 separate div elements manually.

GRID RULES
Grids must be built using explicit offsets only (e.g., translateX(-100px), translateX(0px)). You must not generate grids using loops.

ORBIT GROUP RULE
For shared-orbit animations: Use a parent wrapper div centered at (0,0). Apply rotation to the parent. Position children relative to the center.

FINAL VALIDATION CHECKLIST
Before producing your output, you must ensure:
No external libraries.
No loops (for, while, .map, etc.).
No template literals, no backticks, no $ symbol.
All interpolate ranges are valid (exactly 2 increasing values).
All variables are declared before use.
JSX braces and parentheses are balanced.
All shapes are div elements.
There is exactly one AbsoluteFill root.

OUTPUT REQUIREMENT
Return only the JSX component body that uses useCurrentFrame and the JSON spec.
Do not include explanations, comments, or any non-code text.
MULTI-OBJECT RULE: If the animation spec contains multiple objects, you must render each object as its own div while maintaining the correct timing and staggered math.`,
      },
      {
  role: "user",
  content: "Motion Spec JSON:\n" + promptText
},
    ],
  });
  let code = response.choices[0].message.content;

  code = cleanLLMCode(code);

  return code;
}

async function run() {
  for (const item of prompts) {
    const specPath = `${SPEC_FOLDER}/spec_${item.id}.json`;

if (!fs.existsSync(specPath)) {
  console.log(`❌ Missing spec for ${item.id}`);
  continue;
}

const spec = fs.readFileSync(specPath, "utf8");
    const codePath = `outputs/code_${item.id}.tsx`;
    const videoPath = `outputs/video_${item.id}.mp4`;

    // Skip if video already exists
    if (fs.existsSync(videoPath)) {
      console.log(`Skipping ${item.id} (already rendered)`);
      continue;
    }

    console.log(`Processing ${item.id}: ${item.prompt}`);

    // Parse duration from prompt
    const specData = JSON.parse(spec);
const durationInFrames = specData.duration_sec * 30;
    console.log(`Prompt ${item.id}: ${durationInFrames} frames (${durationInFrames / 30}s)`);

  let jsxContent;
const codeExists = fs.existsSync(codePath);

if (codeExists) {
  console.log(`Using existing code for ${item.id}`);

  // Load the code exactly as it is
  jsxContent = fs.readFileSync(codePath, "utf8");

} else {
  console.log(`Generating code for ${item.id}`);

  jsxContent = await generateCode(spec);

  // Validation + retry only for newly generated code
  for (let attempt = 0; attempt < 2; attempt++) {
    if (
      jsxContent.includes("${") ||
      jsxContent.includes("`") ||
      jsxContent.match(/interpolate\s*\([^)]*\[[^]]*,[^]]*,[^]]*/)
    ) {
      console.log("Retrying due to invalid generation...");
      jsxContent = await generateCode(spec);
    } else {
      break;
    }
  }
}
    // Additional checks...
    if (jsxContent.match(/const\s+\w+\s*=\s*[^;]+;\s*[\s\S]*\1\s*=/)) {
      console.log(`❌ Possible const reassignment in prompt ${item.id}`);
      continue;
    }
    if (jsxContent.match(/interpolate\s*\([^)]*\[[^]]*,[^]]*\],\s*\[[^]]*,[^]]*,[^]]*\]/)) {
      console.log(`❌ RGB array interpolation detected in prompt ${item.id}`);
      continue;
    }
    if (jsxContent.includes("for (") || jsxContent.includes("for(")) {
      console.log(`❌ Loop detected in prompt ${item.id}`);
      continue;
    }

    // Generate dynamic root.tsx with correct duration
    let fullComponent;

if (codeExists) {
  fullComponent = jsxContent;
} else {
  fullComponent = `
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
${jsxContent}
};
`;
}

    fs.writeFileSync("src/GeneratedMotion.tsx", fullComponent);
    fs.writeFileSync(codePath, fullComponent);

    // Generate dynamic root.tsx with correct duration
    // ✅ FIXED
const rootComponent = `
import { Composition } from "remotion";
import { GeneratedMotion } from "./GeneratedMotion";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="GeneratedMotion"
        component={GeneratedMotion}
        durationInFrames={${durationInFrames}}
        fps={30}
        width={720}
        height={720}
      />
    </>
  );
};
`;

    fs.writeFileSync("src/root.tsx", rootComponent);

    console.log("Rendering...");

    execSync(
      `npx remotion render src/index.ts GeneratedMotion ${videoPath}`,
      { stdio: "inherit" }
    );

    await csvWriter.writeRecords([
      {
        id: item.id,
        category: item.category,
        prompt: item.prompt,
        videoLink: `=HYPERLINK("${videoPath}", "View Video")`,
        codeLink: `=HYPERLINK("${codePath}", "View Code")`,
        visualClarity: "",
        motionSmoothness: "",
        promptFaithfulness: "",
        codeCleanliness: "",
        reusability: "",
        notes: "",
      },
    ]);

    console.log(`✅ Finished ${item.id} (${durationInFrames} frames)`);
  }
}

run();
