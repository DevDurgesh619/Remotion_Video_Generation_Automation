#!/usr/bin/env node
// ─── Generate Video ─────────────────────────────────────────────────────────
// End-to-end pipeline: Simple Prompt → Motion Brief → MotionSpec → Video
//
// Usage:
//   node scripts/generateVideo.js "three circles bouncing"
//   node scripts/generateVideo.js --id 300 "loading spinner"
//   node scripts/generateVideo.js --brief-only "logo animation"   (stops after Motion Brief)
//   node scripts/generateVideo.js --spec-only "bar chart"         (stops after MotionSpec)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs-extra";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { expandPrompt } from "./promptExpander.js";
import { convertFromBrief } from "./convertToSpec.js";

dotenv.config();

const SPEC_FOLDER = "./machine_specs_v2";
const OUTPUT_FOLDER = "./outputs";
const BRIEF_FOLDER = "./motion_briefs";

// ─── Parse CLI args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { id: null, briefOnly: false, specOnly: false, prompt: "" };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      opts.id = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--brief-only") {
      opts.briefOnly = true;
    } else if (args[i] === "--spec-only") {
      opts.specOnly = true;
    } else {
      positional.push(args[i]);
    }
  }

  opts.prompt = positional.join(" ");
  return opts;
}

// ─── Generate a unique ID ──────────────────────────────────────────────────

async function getNextId() {
  await fs.ensureDir(SPEC_FOLDER);
  const files = await fs.readdir(SPEC_FOLDER);
  const ids = files
    .filter(f => f.startsWith("spec_") && f.endsWith(".json"))
    .map(f => parseInt(f.replace("spec_", "").replace(".json", ""), 10))
    .filter(n => !isNaN(n));

  return ids.length > 0 ? Math.max(...ids) + 1 : 300;
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

async function generate(opts) {
  const { prompt, briefOnly, specOnly } = opts;
  const id = opts.id || await getNextId();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        SHAPE-MOTION-LAB — VIDEO GENERATOR               ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Prompt: " + prompt.slice(0, 47).padEnd(47) + "║");
  console.log("║  ID:     " + String(id).padEnd(47) + "║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ─── Step 1: Expand Prompt → Motion Brief ─────────────────────────────

  console.log("━━━ STEP 1: Prompt Expansion ━━━");
  let motionBrief;
  try {
    motionBrief = await expandPrompt(prompt);
  } catch (err) {
    console.error("❌ Prompt expansion failed:", err.message);
    process.exit(1);
  }

  // Save the brief for debugging
  await fs.ensureDir(BRIEF_FOLDER);
  const briefPath = BRIEF_FOLDER + "/brief_" + id + ".json";
  await fs.writeFile(briefPath, JSON.stringify(motionBrief, null, 2));
  console.log("📋 Saved Motion Brief → " + briefPath);

  if (briefOnly) {
    console.log("\n─── MOTION BRIEF ───");
    console.log(JSON.stringify(motionBrief, null, 2));
    console.log("\n✅ Done (--brief-only mode)");
    return { motionBrief, spec: null, videoPath: null };
  }

  // ─── Step 2: Motion Brief → MotionSpec ────────────────────────────────

  console.log("\n━━━ STEP 2: Spec Generation ━━━");
  let spec;
  try {
    spec = await convertFromBrief(motionBrief);
  } catch (err) {
    console.error("❌ Spec generation failed:", err.message);
    process.exit(1);
  }

  // Save the spec
  await fs.ensureDir(SPEC_FOLDER);
  const specPath = SPEC_FOLDER + "/spec_" + id + ".json";
  await fs.writeFile(specPath, JSON.stringify(spec, null, 2));
  console.log("📄 Saved MotionSpec → " + specPath + " (" + JSON.stringify(spec).length + " bytes)");

  if (specOnly) {
    console.log("\n─── MOTION SPEC ───");
    console.log(JSON.stringify(spec, null, 2));
    console.log("\n✅ Done (--spec-only mode)");
    return { motionBrief, spec, videoPath: null };
  }

  // ─── Step 3: Render Video ─────────────────────────────────────────────

  console.log("\n━━━ STEP 3: Video Rendering ━━━");

  const fps = spec.fps || 30;
  const durationInFrames = Math.round(spec.duration * fps);
  const width = spec.canvas?.w || 1920;
  const height = spec.canvas?.h || 1080;

  console.log("⏱  Duration: " + durationInFrames + " frames (" + spec.duration + "s @ " + fps + " fps)");
  console.log("📐 Canvas: " + width + "×" + height);

  await fs.ensureDir(OUTPUT_FOLDER);
  const videoPath = OUTPUT_FOLDER + "/video_" + id + ".mp4";

  console.log("🎬 Rendering...");
  try {
    execSync(
      "npx remotion render src/index.ts GeneratedMotion " + videoPath,
      {
        stdio: "inherit",
        env: {
          ...process.env,
          REMOTION_APP_DURATION_FRAMES: String(durationInFrames),
          REMOTION_APP_VIDEO_WIDTH: String(width),
          REMOTION_APP_VIDEO_HEIGHT: String(height),
          REMOTION_APP_SPEC_FILE: "spec_" + id + ".json",
          REMOTION_APP_SPEC_VERSION: "v2",
        },
      }
    );
  } catch (renderErr) {
    console.error("❌ Render failed:", renderErr.message?.slice(0, 300));
    process.exit(1);
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ VIDEO GENERATED                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Brief: " + briefPath.padEnd(48) + "║");
  console.log("║  Spec:  " + specPath.padEnd(48) + "║");
  console.log("║  Video: " + videoPath.padEnd(48) + "║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  return { motionBrief, spec, videoPath };
}

// ─── Exports for server.js ──────────────────────────────────────────────────

export { generate };

// ─── CLI Entry Point ────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] && process.argv[1].includes("generateVideo");
if (isDirectRun) {
  const opts = parseArgs();

  if (!opts.prompt) {
    console.error("Usage: node scripts/generateVideo.js [--id N] [--brief-only|--spec-only] \"your prompt\"");
    console.error("");
    console.error("Examples:");
    console.error('  node scripts/generateVideo.js "three circles bouncing"');
    console.error('  node scripts/generateVideo.js --id 300 "loading spinner"');
    console.error('  node scripts/generateVideo.js --brief-only "logo animation"');
    console.error('  node scripts/generateVideo.js --spec-only "bar chart showing sales"');
    process.exit(1);
  }

  generate(opts).catch(err => {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  });
}
