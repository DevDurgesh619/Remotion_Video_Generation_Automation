#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// SPEC COMPILER TEST — Standalone test for the deterministic spec compiler.
//
// Usage:
//   node scripts/specCompiler.test.js                          # run built-in tests
//   node scripts/specCompiler.test.js machine_specs_v2/spec_1.json  # compile a spec file
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const { compile } = require("./specCompiler");

// ─── BUILT-IN TEST SPECS ─────────────────────────────────────────────────────

const TEST_SPECS = {

  // Test 1: Simple single-shape fade-in
  "circle_fade_in": {
    scene: "circle_fade_in",
    duration: 4,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#FFFFFF",
    objects: [
      { id: "circle_1", shape: "circle", diameter: 150, color: "#E53935", pos: [0, 0], opacity: 0 }
    ],
    timeline: [
      { target: "circle_1", time: [0, 1.2], easing: "ease-out", opacity: [0, 1] }
    ]
  },

  // Test 2: Multi-phase scale (breathing)
  "circle_breathing": {
    scene: "circle_breathing",
    duration: 6,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#F5F5F5",
    objects: [
      { id: "circle_1", shape: "circle", diameter: 160, color: "#42A5F5", pos: [0, 0] }
    ],
    timeline: [
      { target: "circle_1", time: [0, 1.5], easing: "ease-in-out", scale: [1, 1.08] },
      { target: "circle_1", time: [1.5, 3], easing: "ease-in-out", scale: [1.08, 1] },
      { target: "circle_1", time: [3, 4.5], easing: "ease-in-out", scale: [1, 1.08] },
      { target: "circle_1", time: [4.5, 6], easing: "ease-in-out", scale: [1.08, 1] },
    ]
  },

  // Test 3: Multi-object coordination
  "three_shapes_bounce": {
    scene: "three_shapes_center_bounce",
    duration: 6,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#FFFFFF",
    objects: [
      { id: "circle_1", shape: "circle", diameter: 140, color: "#F44336", pos: [-960, 0] },
      { id: "square_1", shape: "rectangle", size: [140, 140], color: "#2196F3", pos: [960, 0] },
      { id: "triangle_1", shape: "triangle", size: [140, 140], color: "#4CAF50", pos: [0, -540] }
    ],
    timeline: [
      { target: "circle_1", time: [0, 2], easing: "bounce", x: [-960, 0] },
      { target: "square_1", time: [0, 2], easing: "bounce", x: [960, 0] },
      { target: "triangle_1", time: [0, 2], easing: "bounce", y: [-540, 0] },
      { target: "circle_1", time: [2, 4], rotation: [0, 180] },
      { target: "square_1", time: [2, 4], rotation: [0, 180] },
      { target: "triangle_1", time: [2, 4], rotation: [0, 180] },
      { target: "circle_1", time: [4, 4.5], easing: "ease-in-out", scale: [1, 1.1] },
      { target: "circle_1", time: [4.5, 5], easing: "ease-in-out", scale: [1.1, 1] },
      { target: "square_1", time: [4, 4.5], easing: "ease-in-out", scale: [1, 1.1] },
      { target: "square_1", time: [4.5, 5], easing: "ease-in-out", scale: [1.1, 1] },
      { target: "triangle_1", time: [4, 4.5], easing: "ease-in-out", scale: [1, 1.1] },
      { target: "triangle_1", time: [4.5, 5], easing: "ease-in-out", scale: [1.1, 1] },
      { target: "circle_1", time: [5, 6], opacity: [1, 0] },
      { target: "square_1", time: [5, 6], opacity: [1, 0] },
      { target: "triangle_1", time: [5, 6], opacity: [1, 0] }
    ]
  },

  // Test 4: Color transition
  "color_shift": {
    scene: "color_shift",
    duration: 4,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#000000",
    objects: [
      { id: "box_1", shape: "rectangle", size: [200, 200], color: "#FF0000", pos: [0, 0] }
    ],
    timeline: [
      { target: "box_1", time: [0, 4], color: ["#FF0000", "#0000FF"] }
    ]
  },

  // Test 5: Orbit
  "orbit_test": {
    scene: "orbit_test",
    duration: 6,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#000000",
    objects: [
      { id: "center", shape: "circle", diameter: 40, color: "#FFFFFF", pos: [0, 0] },
      { id: "orbiter", shape: "circle", diameter: 60, color: "#FF0000", pos: [180, 0] }
    ],
    timeline: [
      { target: "orbiter", time: [0, 6], orbit: { center: [0, 0], radius: 180, degrees: 360 } }
    ]
  },

  // Test 6: Stroke shape (outlined circle)
  "outlined_circle": {
    scene: "outlined_circle",
    duration: 4,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#000000",
    objects: [
      { id: "ring_1", shape: "circle", diameter: 200, stroke: { color: "#FFD700", width: 4 }, fill: false, pos: [0, 0] }
    ],
    timeline: [
      { target: "ring_1", time: [0, 2], scale: [1, 1.2] },
      { target: "ring_1", time: [2, 4], scale: [1.2, 1] }
    ]
  },

  // Test 7: Gradient background
  "gradient_bg": {
    scene: "gradient_bg",
    duration: 4,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: { type: "gradient", from: "#E3F2FD", to: "#BBDEFB", direction: "to bottom" },
    objects: [
      { id: "circle_1", shape: "circle", diameter: 100, color: "#E91E63", pos: [0, 0] }
    ],
    timeline: [
      { target: "circle_1", time: [0, 2], opacity: [0, 1] }
    ]
  },

  // Test 8: Combined position (pos: [[fromX, fromY], [toX, toY]])
  "combined_pos": {
    scene: "combined_pos",
    duration: 4,
    fps: 30,
    canvas: { w: 1920, h: 1080 },
    bg: "#FFFFFF",
    objects: [
      { id: "dot_1", shape: "circle", diameter: 80, color: "#9C27B0", pos: [-400, -300] }
    ],
    timeline: [
      { target: "dot_1", time: [0, 4], pos: [[-400, -300], [400, 300]] }
    ]
  },
};

// ─── RUN TESTS ───────────────────────────────────────────────────────────────

function runBuiltInTests() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║          SPEC COMPILER — BUILT-IN TESTS             ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;

  for (const [name, spec] of Object.entries(TEST_SPECS)) {
    process.stdout.write("  " + name + "... ");

    try {
      const result = compile(spec);

      // Basic sanity checks
      const checks = [];

      if (!result.code.includes("useCurrentFrame")) {
        checks.push("missing useCurrentFrame");
      }
      if (!result.code.includes("AbsoluteFill")) {
        checks.push("missing AbsoluteFill");
      }
      if (!result.code.includes("interpolate")) {
        checks.push("missing interpolate");
      }
      if (!result.code.includes("return (")) {
        checks.push("missing return statement");
      }
      if (!result.code.includes("GeneratedMotion")) {
        checks.push("missing component export");
      }

      // Check no template literals
      if (result.code.includes("${")) {
        checks.push("contains template literal ${");
      }
      if (result.code.includes("`")) {
        checks.push("contains backtick");
      }

      if (checks.length > 0) {
        console.log("❌ FAIL — " + checks.join(", "));
        failed++;
      } else {
        const coverage = result.fullyCovered ? "100%" : (result.stats.compiled + "/" + result.stats.animations);
        console.log("✅ PASS (" + result.stats.objects + " objects, " + result.stats.animations + " anims, coverage: " + coverage + ", " + result.code.length + " bytes)");
        passed++;
      }
    } catch (err) {
      console.log("❌ CRASH — " + err.message);
      failed++;
    }
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("Results: " + passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
  console.log("─────────────────────────────────────────────────────────\n");

  return failed === 0;
}

function compileFile(filePath) {
  console.log("Compiling: " + filePath + "\n");

  const spec = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const result = compile(spec);

  console.log("═══════════════════════════════════════════════════════");
  console.log("COMPILATION RESULT");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Objects:     " + result.stats.objects);
  console.log("  Animations:  " + result.stats.animations);
  console.log("  Compiled:    " + result.stats.compiled);
  console.log("  Skipped:     " + result.stats.skipped);
  console.log("  Coverage:    " + (result.fullyCovered ? "100% ✅" : Math.round(result.stats.compiled / result.stats.animations * 100) + "% ⚠️"));
  console.log("  Output size: " + result.code.length + " bytes");

  if (result.unsupported.length > 0) {
    console.log("\n  Unsupported animations:");
    for (const u of result.unsupported) {
      console.log("    ⚠️  " + u);
    }
  }

  // Write the compiled output
  const outPath = filePath.replace(".json", "_compiled.tsx");
  fs.writeFileSync(outPath, result.code);
  console.log("\n  Written to: " + outPath);

  console.log("\n═══════════════════════════════════════════════════════\n");

  // Print the generated code
  console.log("GENERATED CODE:");
  console.log("───────────────────────────────────────────────────────");
  console.log(result.code);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length > 0) {
  // Compile a specific spec file
  compileFile(args[0]);
} else {
  // Run built-in tests
  const success = runBuiltInTests();
  process.exit(success ? 0 : 1);
}
