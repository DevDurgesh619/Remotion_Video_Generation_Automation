#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// SVG ASSET FETCHER — Downloads curated SVGs from manifest and generates
// a TypeScript registry for the Asset component.
//
// Usage:  node scripts/fetchSvgAssets.js
//         node scripts/fetchSvgAssets.js --force   (re-download existing)
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "assets", "manifest.json");
const SVG_DIR = path.join(PROJECT_ROOT, "src", "assets", "svg");
const REGISTRY_PATH = path.join(PROJECT_ROOT, "src", "assets", "registry.ts");
const LICENSES_PATH = path.join(PROJECT_ROOT, "src", "assets", "LICENSES.md");

const MAX_PATHS_WARN = 15;
const DOWNLOAD_DELAY_MS = 500; // be polite to SVGRepo

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const request = client.get(url, { headers: { "User-Agent": "shape-motion-lab-asset-fetcher/1.0" } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error("HTTP " + res.statusCode + " for " + url));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error("Timeout fetching " + url));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse an SVG string and extract structured data:
 * viewBox, and all path/circle/rect/ellipse/line/polygon/polyline elements.
 */
function parseSvg(svgString) {
  // Extract viewBox
  const viewBoxMatch = svgString.match(/viewBox\s*=\s*"([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

  const elements = [];

  // Extract <path> elements
  const pathRegex = /<path\s([^>]*?)\/?\s*>/gi;
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const d = extractAttr(attrs, "d");
    if (!d) continue;
    elements.push({
      type: "path",
      d: d,
      fill: extractAttr(attrs, "fill"),
      stroke: extractAttr(attrs, "stroke"),
      strokeWidth: extractAttr(attrs, "stroke-width"),
      opacity: extractAttr(attrs, "opacity"),
      fillRule: extractAttr(attrs, "fill-rule"),
      clipRule: extractAttr(attrs, "clip-rule"),
    });
  }

  // Extract <circle> elements and convert to path
  const circleRegex = /<circle\s([^>]*?)\/?\s*>/gi;
  while ((match = circleRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const cx = parseFloat(extractAttr(attrs, "cx") || "0");
    const cy = parseFloat(extractAttr(attrs, "cy") || "0");
    const r = parseFloat(extractAttr(attrs, "r") || "0");
    if (r <= 0) continue;
    // Convert circle to path (two arcs)
    const d = "M" + (cx - r) + "," + cy +
              "a" + r + "," + r + " 0 1,0 " + (r * 2) + ",0" +
              "a" + r + "," + r + " 0 1,0 -" + (r * 2) + ",0Z";
    elements.push({
      type: "path",
      d: d,
      fill: extractAttr(attrs, "fill"),
      stroke: extractAttr(attrs, "stroke"),
      strokeWidth: extractAttr(attrs, "stroke-width"),
      opacity: extractAttr(attrs, "opacity"),
    });
  }

  // Extract <rect> elements and convert to path
  const rectRegex = /<rect\s([^>]*?)\/?\s*>/gi;
  while ((match = rectRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const x = parseFloat(extractAttr(attrs, "x") || "0");
    const y = parseFloat(extractAttr(attrs, "y") || "0");
    const w = parseFloat(extractAttr(attrs, "width") || "0");
    const h = parseFloat(extractAttr(attrs, "height") || "0");
    if (w <= 0 || h <= 0) continue;
    const rx = parseFloat(extractAttr(attrs, "rx") || "0");
    const ry = parseFloat(extractAttr(attrs, "ry") || rx.toString());
    let d;
    if (rx > 0 || ry > 0) {
      d = "M" + (x + rx) + "," + y +
          "h" + (w - 2 * rx) +
          "a" + rx + "," + ry + " 0 0 1 " + rx + "," + ry +
          "v" + (h - 2 * ry) +
          "a" + rx + "," + ry + " 0 0 1 -" + rx + "," + ry +
          "h-" + (w - 2 * rx) +
          "a" + rx + "," + ry + " 0 0 1 -" + rx + ",-" + ry +
          "v-" + (h - 2 * ry) +
          "a" + rx + "," + ry + " 0 0 1 " + rx + ",-" + ry + "Z";
    } else {
      d = "M" + x + "," + y + "h" + w + "v" + h + "h-" + w + "Z";
    }
    elements.push({
      type: "path",
      d: d,
      fill: extractAttr(attrs, "fill"),
      stroke: extractAttr(attrs, "stroke"),
      strokeWidth: extractAttr(attrs, "stroke-width"),
      opacity: extractAttr(attrs, "opacity"),
    });
  }

  // Extract <ellipse> elements and convert to path
  const ellipseRegex = /<ellipse\s([^>]*?)\/?\s*>/gi;
  while ((match = ellipseRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const cx = parseFloat(extractAttr(attrs, "cx") || "0");
    const cy = parseFloat(extractAttr(attrs, "cy") || "0");
    const rx = parseFloat(extractAttr(attrs, "rx") || "0");
    const ry = parseFloat(extractAttr(attrs, "ry") || "0");
    if (rx <= 0 || ry <= 0) continue;
    const d = "M" + (cx - rx) + "," + cy +
              "a" + rx + "," + ry + " 0 1,0 " + (rx * 2) + ",0" +
              "a" + rx + "," + ry + " 0 1,0 -" + (rx * 2) + ",0Z";
    elements.push({
      type: "path",
      d: d,
      fill: extractAttr(attrs, "fill"),
      stroke: extractAttr(attrs, "stroke"),
      strokeWidth: extractAttr(attrs, "stroke-width"),
      opacity: extractAttr(attrs, "opacity"),
    });
  }

  // Extract <polygon> elements and convert to path
  const polygonRegex = /<polygon\s([^>]*?)\/?\s*>/gi;
  while ((match = polygonRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const points = extractAttr(attrs, "points");
    if (!points) continue;
    const pairs = points.trim().split(/[\s,]+/);
    let d = "M" + pairs[0] + "," + pairs[1];
    for (let i = 2; i < pairs.length; i += 2) {
      d += "L" + pairs[i] + "," + pairs[i + 1];
    }
    d += "Z";
    elements.push({
      type: "path",
      d: d,
      fill: extractAttr(attrs, "fill"),
      stroke: extractAttr(attrs, "stroke"),
      strokeWidth: extractAttr(attrs, "stroke-width"),
      opacity: extractAttr(attrs, "opacity"),
    });
  }

  // Extract <line> elements and convert to path
  const lineRegex = /<line\s([^>]*?)\/?\s*>/gi;
  while ((match = lineRegex.exec(svgString)) !== null) {
    const attrs = match[1];
    const x1 = extractAttr(attrs, "x1") || "0";
    const y1 = extractAttr(attrs, "y1") || "0";
    const x2 = extractAttr(attrs, "x2") || "0";
    const y2 = extractAttr(attrs, "y2") || "0";
    const d = "M" + x1 + "," + y1 + "L" + x2 + "," + y2;
    elements.push({
      type: "path",
      d: d,
      fill: "none",
      stroke: extractAttr(attrs, "stroke"),
      strokeWidth: extractAttr(attrs, "stroke-width"),
      opacity: extractAttr(attrs, "opacity"),
    });
  }

  return { viewBox, elements };
}

function extractAttr(attrString, name) {
  const regex = new RegExp(name + '\\s*=\\s*"([^"]*)"', "i");
  const match = attrString.match(regex);
  return match ? match[1] : null;
}

/**
 * Clean element data for the registry — remove nulls/undefined.
 */
function cleanElement(el) {
  const cleaned = { d: el.d };
  if (el.fill && el.fill !== "none") cleaned.fill = el.fill;
  if (el.stroke && el.stroke !== "none") cleaned.stroke = el.stroke;
  if (el.strokeWidth) cleaned.strokeWidth = parseFloat(el.strokeWidth);
  if (el.opacity && el.opacity !== "1") cleaned.opacity = parseFloat(el.opacity);
  if (el.fillRule) cleaned.fillRule = el.fillRule;
  if (el.clipRule) cleaned.clipRule = el.clipRule;
  return cleaned;
}

/**
 * Generate the TypeScript registry file content.
 */
function generateRegistry(assetsData) {
  const lines = [
    "// ─────────────────────────────────────────────────────────────────────────────",
    "// AUTO-GENERATED by scripts/fetchSvgAssets.js — DO NOT EDIT MANUALLY",
    "// ─────────────────────────────────────────────────────────────────────────────",
    "",
    "export interface SvgPathData {",
    "  d: string;",
    "  fill?: string;",
    "  stroke?: string;",
    "  strokeWidth?: number;",
    "  opacity?: number;",
    "  fillRule?: string;",
    "  clipRule?: string;",
    "}",
    "",
    "export interface SvgAssetData {",
    "  viewBox: string;",
    "  paths: SvgPathData[];",
    "}",
    "",
    "export const SVG_ASSETS: Record<string, SvgAssetData> = {",
  ];

  for (const asset of assetsData) {
    lines.push("  \"" + asset.id + "\": {");
    lines.push("    viewBox: \"" + asset.viewBox + "\",");
    lines.push("    paths: [");
    for (const p of asset.paths) {
      const parts = [];
      parts.push("d: \"" + p.d.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + "\"");
      if (p.fill) parts.push("fill: \"" + p.fill + "\"");
      if (p.stroke) parts.push("stroke: \"" + p.stroke + "\"");
      if (p.strokeWidth) parts.push("strokeWidth: " + p.strokeWidth);
      if (p.opacity) parts.push("opacity: " + p.opacity);
      if (p.fillRule) parts.push("fillRule: \"" + p.fillRule + "\"");
      if (p.clipRule) parts.push("clipRule: \"" + p.clipRule + "\"");
      lines.push("      { " + parts.join(", ") + " },");
    }
    lines.push("    ],");
    lines.push("  },");
  }

  lines.push("};");
  lines.push("");
  lines.push("export const AVAILABLE_ASSET_IDS = Object.keys(SVG_ASSETS);");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the LICENSES.md file.
 */
function generateLicenses(manifest) {
  const lines = [
    "# SVG Asset Licenses",
    "",
    "All SVG assets in this directory are sourced from SVGRepo with permissive licenses.",
    "",
    "| Asset ID | License | Source |",
    "|----------|---------|--------|",
  ];
  for (const entry of manifest) {
    lines.push("| " + entry.id + " | " + entry.license + " | " + entry.source + " |");
  }
  lines.push("");
  lines.push("These assets are used under their respective open-source licenses.");
  lines.push("");
  return lines.join("\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const forceDownload = process.argv.includes("--force");

  // Read manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("ERROR: Manifest not found at " + MANIFEST_PATH);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  console.log("Found " + manifest.length + " assets in manifest.\n");

  // Ensure SVG directory exists
  fs.mkdirSync(SVG_DIR, { recursive: true });

  const assetsData = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of manifest) {
    const svgPath = path.join(SVG_DIR, entry.id + ".svg");
    let svgContent;

    // Check if already downloaded
    if (!forceDownload && fs.existsSync(svgPath)) {
      svgContent = fs.readFileSync(svgPath, "utf-8");
      skipped++;
      process.stdout.write("  [skip] " + entry.id + " (already exists)\n");
    } else {
      // Download
      try {
        process.stdout.write("  [fetch] " + entry.id + " ... ");
        svgContent = await fetchUrl(entry.url);
        fs.writeFileSync(svgPath, svgContent, "utf-8");
        downloaded++;
        process.stdout.write("OK\n");
        // Be polite to the server
        if (downloaded < manifest.length) {
          await sleep(DOWNLOAD_DELAY_MS);
        }
      } catch (err) {
        process.stdout.write("FAILED (" + err.message + ")\n");
        failed++;
        continue;
      }
    }

    // Parse SVG
    const parsed = parseSvg(svgContent);
    const paths = parsed.elements.map(cleanElement);

    if (paths.length === 0) {
      console.warn("  [warn] " + entry.id + ": no drawable elements found");
    }
    if (paths.length > MAX_PATHS_WARN) {
      console.warn("  [warn] " + entry.id + ": " + paths.length + " paths (complex SVG, may be hard to animate)");
    }

    assetsData.push({
      id: entry.id,
      viewBox: parsed.viewBox,
      paths: paths,
    });
  }

  // Generate registry
  const registryContent = generateRegistry(assetsData);
  fs.writeFileSync(REGISTRY_PATH, registryContent, "utf-8");
  console.log("\nGenerated registry: " + REGISTRY_PATH);

  // Generate licenses
  const licensesContent = generateLicenses(manifest);
  fs.writeFileSync(LICENSES_PATH, licensesContent, "utf-8");
  console.log("Generated licenses: " + LICENSES_PATH);

  // Summary
  console.log("\n── Summary ──");
  console.log("  Downloaded: " + downloaded);
  console.log("  Skipped:    " + skipped);
  console.log("  Failed:     " + failed);
  console.log("  Total in registry: " + assetsData.length);
  console.log("\nDone! Run 'npx tsc --noEmit' to verify TypeScript compilation.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
