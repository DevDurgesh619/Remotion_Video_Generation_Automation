#!/usr/bin/env node
// ─── Dashboard API Server ───────────────────────────────────────────────────
// Simple HTTP server for the Shape Motion Lab dashboard.
//
// Endpoints:
//   POST /api/generate   - Run the full pipeline (prompt → brief → spec → video)
//   POST /api/expand     - Expand prompt to Motion Brief only
//   POST /api/spec       - Convert Motion Brief to MotionSpec only
//   GET  /api/specs/:id  - Get a spec by ID
//   GET  /api/video/:id  - Serve a rendered video
//
// Usage:
//   node scripts/server.js          (default port 3100)
//   PORT=8080 node scripts/server.js
// ─────────────────────────────────────────────────────────────────────────────

import http from "http";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { expandPrompt } from "./promptExpander.js";
import { convertFromBrief } from "./convertToSpec.js";
import { enrichSpec } from "./specEnricher.js";
import { execSync } from "child_process";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(process.env.PORT || "3100", 10);

const SPEC_FOLDER = path.join(ROOT, "machine_specs_v2");
const OUTPUT_FOLDER = path.join(ROOT, "outputs");
const BRIEF_FOLDER = path.join(ROOT, "motion_briefs");
const DASHBOARD_DIR = path.join(ROOT, "public");

// ─── Helpers ────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function cors(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
}

async function getNextId() {
  await fs.ensureDir(SPEC_FOLDER);
  const files = await fs.readdir(SPEC_FOLDER);
  const ids = files
    .filter(f => f.startsWith("spec_") && f.endsWith(".json"))
    .map(f => parseInt(f.replace("spec_", "").replace(".json", ""), 10))
    .filter(n => !isNaN(n));
  return ids.length > 0 ? Math.max(...ids) + 1 : 300;
}

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Access-Control-Allow-Origin": "*",
  });
  fs.createReadStream(filePath).pipe(res);
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

async function handleExpand(req, res) {
  const body = JSON.parse(await readBody(req));
  if (!body.prompt) return json(res, 400, { error: "Missing 'prompt' field" });

  try {
    const brief = await expandPrompt(body.prompt);
    json(res, 200, { success: true, brief });
  } catch (err) {
    json(res, 500, { error: err.message });
  }
}

async function handleSpec(req, res) {
  const body = JSON.parse(await readBody(req));
  if (!body.brief) return json(res, 400, { error: "Missing 'brief' field" });

  try {
    const rawSpec = await convertFromBrief(body.brief);
    const spec = enrichSpec(rawSpec);
    json(res, 200, { success: true, spec });
  } catch (err) {
    json(res, 500, { error: err.message });
  }
}

async function handleGenerate(req, res) {
  const body = JSON.parse(await readBody(req));
  if (!body.prompt) return json(res, 400, { error: "Missing 'prompt' field" });

  const id = body.id || await getNextId();

  try {
    // Step 1: Expand prompt
    console.log("📝 Step 1: Expanding prompt...");
    const brief = await expandPrompt(body.prompt);

    await fs.ensureDir(BRIEF_FOLDER);
    await fs.writeFile(
      path.join(BRIEF_FOLDER, "brief_" + id + ".json"),
      JSON.stringify(brief, null, 2)
    );

    // Step 2: Convert to spec
    console.log("📄 Step 2: Generating spec...");
    const rawSpec = await convertFromBrief(brief);
    const spec = enrichSpec(rawSpec);

    await fs.ensureDir(SPEC_FOLDER);
    const specPath = path.join(SPEC_FOLDER, "spec_" + id + ".json");
    await fs.writeFile(specPath, JSON.stringify(spec, null, 2));

    // Step 3: Render video
    console.log("🎬 Step 3: Rendering video...");
    await fs.ensureDir(OUTPUT_FOLDER);
    const videoPath = path.join(OUTPUT_FOLDER, "video_" + id + ".mp4");

    const fps = spec.fps || 30;
    const durationInFrames = Math.round(spec.duration * fps);
    const width = spec.canvas?.w || 1920;
    const height = spec.canvas?.h || 1080;

    execSync(
      "npx remotion render src/index.ts GeneratedMotion " + videoPath,
      {
        cwd: ROOT,
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

    console.log("✅ Video generated: video_" + id + ".mp4");

    json(res, 200, {
      success: true,
      id,
      brief,
      spec,
      videoUrl: "/api/video/" + id,
    });
  } catch (err) {
    console.error("❌ Pipeline error:", err.message);
    json(res, 500, { error: err.message });
  }
}

// ─── Server ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  // CORS preflight
  if (req.method === "OPTIONS") return cors(res);

  try {
    // API routes
    if (req.method === "POST" && url.pathname === "/api/expand") {
      return await handleExpand(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/spec") {
      return await handleSpec(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/generate") {
      return await handleGenerate(req, res);
    }

    // Serve spec JSON
    const specMatch = url.pathname.match(/^\/api\/specs\/(\d+)$/);
    if (specMatch) {
      const specFile = path.join(SPEC_FOLDER, "spec_" + specMatch[1] + ".json");
      return serveStatic(res, specFile);
    }

    // Serve video
    const videoMatch = url.pathname.match(/^\/api\/video\/(\d+)$/);
    if (videoMatch) {
      const videoFile = path.join(OUTPUT_FOLDER, "video_" + videoMatch[1] + ".mp4");
      return serveStatic(res, videoFile);
    }

    // Serve dashboard static files
    let filePath = path.join(DASHBOARD_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    if (fs.existsSync(filePath)) {
      return serveStatic(res, filePath);
    }

    // Fallback to index.html for SPA routing
    filePath = path.join(DASHBOARD_DIR, "index.html");
    if (fs.existsSync(filePath)) {
      return serveStatic(res, filePath);
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    console.error("Server error:", err);
    json(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        SHAPE-MOTION-LAB — DASHBOARD SERVER              ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Dashboard: http://localhost:" + String(PORT).padEnd(33) + "║");
  console.log("║  API:       http://localhost:" + (PORT + "/api").padEnd(33) + "║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
});
