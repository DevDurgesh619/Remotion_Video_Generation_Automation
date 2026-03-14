import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { uploadBuffer, uploadText } from "../r2";

const PROJECT_ROOT = path.resolve(process.cwd());

function getDurationFrames(specData: Record<string, unknown>): number {
  if (typeof specData.duration === "number" && specData.duration > 0) {
    return Math.floor(specData.duration * 30);
  }
  if (typeof specData.duration_sec === "number") {
    return Math.floor(specData.duration_sec * 30);
  }
  return 120;
}

// Common aspect ratio presets keyed by "W:H" string
const ASPECT_RATIO_PRESETS: Record<string, { width: number; height: number }> = {
  "16:9":  { width: 854,  height: 480 },
  "9:16":  { width: 480,  height: 854 },
  "4:3":   { width: 640,  height: 480 },
  "3:4":   { width: 480,  height: 640 },
  "1:1":   { width: 480,  height: 480 },
  "3:2":   { width: 720,  height: 480 },
  "2:3":   { width: 480,  height: 720 },
  "21:9":  { width: 1008, height: 432 },
};
const DEFAULT_DIMS = { width: 854, height: 480 };

function getDimensions(specData: Record<string, unknown>): { width: number; height: number } {
  // 1. Explicit aspect_ratio string e.g. "16:9"
  if (typeof specData.aspect_ratio === "string") {
    const key = specData.aspect_ratio.trim().replace(/\s/g, "");
    if (ASPECT_RATIO_PRESETS[key]) return ASPECT_RATIO_PRESETS[key];
  }

  // 2. canvas object with width/height from the spec (supports both w/h and width/height keys)
  const canvas = specData.canvas as Record<string, unknown> | undefined;
  if (canvas) {
    const cw = typeof canvas.w === "number" ? canvas.w : typeof canvas.width === "number" ? canvas.width : 0;
    const ch = typeof canvas.h === "number" ? canvas.h : typeof canvas.height === "number" ? canvas.height : 0;
    if (cw > 0 && ch > 0) return { width: cw, height: ch };
  }

  // 3. Top-level width/height
  if (typeof specData.width === "number" && typeof specData.height === "number") {
    return { width: specData.width, height: specData.height };
  }

  // Default: 16:9
  return DEFAULT_DIMS;
}

export function typeCheck(): { success: boolean; error: string | null } {
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe", cwd: PROJECT_ROOT });
    return { success: true, error: null };
  } catch (err) {
    const e = err as { stderr?: Buffer; stdout?: Buffer };
    const out = (e.stderr?.toString() ?? "") + (e.stdout?.toString() ?? "");
    const srcErrors = out
      .split("\n")
      .filter((l) => l.includes("src/") && l.includes("error TS"))
      .slice(0, 5)
      .join("\n");
    if (!srcErrors) return { success: true, error: null };
    return { success: false, error: srcErrors };
  }
}

export async function renderAndUpload(
  jobId: string,
  fullComponent: string,
  specData: Record<string, unknown>,
  specText: string
): Promise<{ videoKey: string; codeKey: string; specKey: string }> {
  const durationFrames = getDurationFrames(specData);
  const { width, height } = getDimensions(specData);
  const videoLocalPath = path.join(PROJECT_ROOT, "outputs", "video_" + jobId + ".mp4");
  const codeLocalPath = path.join(PROJECT_ROOT, "outputs", "code_" + jobId + ".tsx");
  const generatedMotionPath = path.join(PROJECT_ROOT, "src", "GeneratedMotion.tsx");

  // Ensure outputs directory exists
  fs.mkdirSync(path.join(PROJECT_ROOT, "outputs"), { recursive: true });

  // Write the component (this is safe because the queue processes one job at a time)
  fs.writeFileSync(generatedMotionPath, fullComponent, "utf-8");
  fs.writeFileSync(codeLocalPath, fullComponent, "utf-8");

  // TypeScript check
  const tsResult = typeCheck();
  if (!tsResult.success) {
    console.warn("[renderer] TS errors (continuing anyway):", tsResult.error?.slice(0, 200));
  }

  // Remotion render
  try {
    execSync(
      "npx remotion render src/index.ts GeneratedMotion " + videoLocalPath + " --concurrency=1",
      {
        stdio: "pipe",
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          REMOTION_APP_DURATION_FRAMES: String(durationFrames),
          REMOTION_APP_VIDEO_WIDTH: String(width),
          REMOTION_APP_VIDEO_HEIGHT: String(height),
        },
      }
    );
  } catch (err) {
    const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const stderr = e.stderr?.toString() ?? "";
    const stdout = e.stdout?.toString() ?? "";
    const detail = (stderr + "\n" + stdout).trim();
    throw new Error("Remotion render failed: " + (detail || e.message || "Unknown error").slice(0, 1000));
  }

  // Upload to R2
  const videoKey = "videos/video_" + jobId + ".mp4";
  const codeKey = "code/code_" + jobId + ".tsx";
  const specKey = "specs/spec_" + jobId + ".json";

  const videoBuffer = fs.readFileSync(videoLocalPath);
  await uploadBuffer(videoKey, videoBuffer, "video/mp4");
  await uploadText(codeKey, fullComponent, "text/plain");
  await uploadText(specKey, specText, "application/json");

  // Clean up local video file to save disk space
  try {
    fs.unlinkSync(videoLocalPath);
  } catch {
    // non-fatal
  }

  return { videoKey, codeKey, specKey };
}
