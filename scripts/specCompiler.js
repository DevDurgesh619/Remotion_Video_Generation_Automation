// ─────────────────────────────────────────────────────────────────────────────
// SPEC COMPILER — Deterministic Sparse Spec JSON → Remotion JSX
//
// Converts a sparse motion spec into a complete Remotion component string
// without any LLM involvement. Handles: translate (x/y/pos), opacity, scale,
// rotation, scaleX/Y, width, height, cornerRadius, skewX/Y, color, orbit.
//
// Usage:
//   const { compile } = require("./specCompiler");
//   const result = compile(specData);
//   // result.code         — full component string (with import/export)
//   // result.bodyCode     — just the component body (no import/export wrapper)
//   // result.fullyCovered — true if all animations were compiled deterministically
//   // result.unsupported  — list of unsupported timeline entry descriptions
//   // result.stats        — { objects, animations, compiled, skipped }
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;
const CLAMP = '{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }';

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE HELPERS — CSS for rendering each shape type
// ─────────────────────────────────────────────────────────────────────────────

const CLIP_PATHS = {
  triangle: {
    up: "polygon(50% 0%, 0% 100%, 100% 100%)",
    down: "polygon(0% 0%, 100% 0%, 50% 100%)",
    left: "polygon(100% 0%, 100% 100%, 0% 50%)",
    right: "polygon(0% 0%, 0% 100%, 100% 50%)",
  },
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
};

function getShapeStyles(obj) {
  const styles = {};
  const shape = obj.shape;

  if (shape === "circle") {
    const d = obj.diameter || 100;
    styles.width = d;
    styles.height = d;
    styles.borderRadius = '"50%"';
  } else if (shape === "rectangle") {
    const size = obj.size || [100, 100];
    styles.width = size[0];
    styles.height = size[1];
    if (obj.cornerRadius) {
      styles.borderRadius = obj.cornerRadius;
    }
  } else if (shape === "triangle") {
    const size = obj.size || [100, 100];
    styles.width = size[0];
    styles.height = size[1];
    const facing = obj.facing || "up";
    const clip = CLIP_PATHS.triangle[facing] || CLIP_PATHS.triangle.up;
    styles.clipPath = '"' + clip + '"';
  } else if (shape === "pentagon") {
    const size = obj.size || [100, 100];
    styles.width = size[0];
    styles.height = size[1];
    styles.clipPath = '"' + CLIP_PATHS.pentagon + '"';
  } else if (shape === "star") {
    const size = obj.size || [100, 100];
    styles.width = size[0];
    styles.height = size[1];
    styles.clipPath = '"' + CLIP_PATHS.star + '"';
  } else if (shape === "line") {
    const size = obj.size || [200, 3];
    styles.width = size[0];
    styles.height = size[1];
  } else if (shape === "text") {
    // Text objects — styles are set via text properties
    const txt = obj.text || {};
    styles.fontSize = txt.fontSize || 16;
    styles.fontWeight = '"' + (txt.fontWeight || "normal") + '"';
    styles.fontFamily = '"' + (txt.fontFamily || "Inter, Arial, sans-serif") + '"';
    styles.color = '"' + (txt.textColor || "#FFFFFF") + '"';
    styles.whiteSpace = '"nowrap"';
    styles.textAlign = '"center"';
  } else {
    // Default fallback
    const size = obj.size || [100, 100];
    styles.width = size[0];
    styles.height = size[1];
  }

  // Color / fill / stroke
  if (obj.stroke && obj.fill === false) {
    styles.backgroundColor = '"transparent"';
    styles.border =
      obj.stroke.width + ' + "px solid ' + obj.stroke.color + '"';
    styles.boxSizing = '"border-box"';
  } else if (obj.stroke && obj.fill !== false) {
    if (obj.color) styles.backgroundColor = '"' + obj.color + '"';
    styles.border =
      obj.stroke.width + ' + "px solid ' + obj.stroke.color + '"';
    styles.boxSizing = '"border-box"';
  } else if (obj.color) {
    styles.backgroundColor = '"' + obj.color + '"';
  }

  return styles;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEX → RGB HELPER
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN ANIMATABLE PROPERTIES — properties the compiler can handle
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_PROPS = new Set([
  "target",
  "time",
  "easing",
  "x",
  "y",
  "pos",
  "opacity",
  "scale",
  "rotation",
  "scaleX",
  "scaleY",
  "width",
  "height",
  "cornerRadius",
  "skewX",
  "skewY",
  "color",
  "orbit",
  "strokeWidth",
]);

function isSupported(entry) {
  const keys = Object.keys(entry);
  for (const key of keys) {
    if (!STANDARD_PROPS.has(key)) {
      return false;
    }
  }
  return true;
}

function getUnsupportedProps(entry) {
  return Object.keys(entry).filter(function (k) {
    return !STANDARD_PROPS.has(k);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE VARIABLE NAME — turn object id into a valid JS variable prefix
// ─────────────────────────────────────────────────────────────────────────────

function safeVar(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPILER
// ─────────────────────────────────────────────────────────────────────────────

function compile(spec) {
  const fps = spec.fps || FPS;
  const bg =
    typeof spec.bg === "string"
      ? spec.bg
      : spec.bg && spec.bg.type === "gradient"
        ? null // gradients need special handling
        : "#000000";

  const bgIsGradient = spec.bg && typeof spec.bg === "object" && spec.bg.type === "gradient";

  const objects = spec.objects || [];
  const timeline = spec.timeline || [];

  // Track compilation stats
  let compiledCount = 0;
  let skippedCount = 0;
  const unsupported = [];

  // ─── Group timeline entries by target object ───
  const entriesByObject = {};
  for (const obj of objects) {
    entriesByObject[obj.id] = [];
  }
  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    if (!entriesByObject[entry.target]) {
      entriesByObject[entry.target] = [];
    }
    if (isSupported(entry)) {
      entriesByObject[entry.target].push({ index: i, entry: entry });
      compiledCount++;
    } else {
      unsupported.push(
        "timeline[" + i + "] target=" + entry.target +
        " unsupported: " + getUnsupportedProps(entry).join(", ")
      );
      skippedCount++;
    }
  }

  // ─── Generate interpolation variables for each object ───
  const lines = [];
  lines.push("const frame = useCurrentFrame();");
  lines.push("");

  for (const obj of objects) {
    const prefix = safeVar(obj.id);
    const entries = entriesByObject[obj.id] || [];

    lines.push("// --- " + obj.id + " ---");

    // Collect all animated properties across all timeline entries for this object
    const animatedProps = new Set();
    for (const { entry } of entries) {
      if (entry.x) animatedProps.add("x");
      if (entry.y) animatedProps.add("y");
      if (entry.pos) animatedProps.add("pos");
      if (entry.opacity) animatedProps.add("opacity");
      if (entry.scale) animatedProps.add("scale");
      if (entry.rotation) animatedProps.add("rotation");
      if (entry.scaleX) animatedProps.add("scaleX");
      if (entry.scaleY) animatedProps.add("scaleY");
      if (entry.width) animatedProps.add("width");
      if (entry.height) animatedProps.add("height");
      if (entry.cornerRadius) animatedProps.add("cornerRadius");
      if (entry.skewX) animatedProps.add("skewX");
      if (entry.skewY) animatedProps.add("skewY");
      if (entry.color) animatedProps.add("color");
      if (entry.orbit) animatedProps.add("orbit");
      if (entry.strokeWidth) animatedProps.add("strokeWidth");
    }

    // For properties with multiple timeline entries (multiple phases),
    // generate chained if/else blocks
    const propEntries = {};
    for (const { entry: e, index: idx } of entries) {
      const propsInEntry = [];
      if (e.x) propsInEntry.push("x");
      if (e.y) propsInEntry.push("y");
      if (e.pos) { propsInEntry.push("posX"); propsInEntry.push("posY"); }
      if (e.opacity) propsInEntry.push("opacity");
      if (e.scale) propsInEntry.push("scale");
      if (e.rotation) propsInEntry.push("rotation");
      if (e.scaleX) propsInEntry.push("scaleX");
      if (e.scaleY) propsInEntry.push("scaleY");
      if (e.width) propsInEntry.push("width");
      if (e.height) propsInEntry.push("height");
      if (e.cornerRadius) propsInEntry.push("cornerRadius");
      if (e.skewX) propsInEntry.push("skewX");
      if (e.skewY) propsInEntry.push("skewY");
      if (e.color) propsInEntry.push("color");
      if (e.orbit) { propsInEntry.push("orbitX"); propsInEntry.push("orbitY"); }
      if (e.strokeWidth) propsInEntry.push("strokeWidth");

      for (const prop of propsInEntry) {
        if (!propEntries[prop]) propEntries[prop] = [];
        propEntries[prop].push({ entry: e, index: idx });
      }
    }

    // Generate variables for each animated property
    // For single-phase properties: const. For multi-phase: let with if/else chain.
    for (const prop of Object.keys(propEntries)) {
      const phases = propEntries[prop];

      if (prop === "color") {
        // Color requires RGB decomposition
        generateColorVar(lines, prefix, phases, fps);
        continue;
      }

      if (prop === "orbitX" || prop === "orbitY") {
        if (prop === "orbitX") {
          // Generate orbit calculation (both X and Y together)
          generateOrbitVars(lines, prefix, phases, fps);
        }
        // orbitY is handled within orbitX generation
        continue;
      }

      if (prop === "posX" || prop === "posY") {
        if (prop === "posX") {
          generatePosVars(lines, prefix, phases, fps);
        }
        continue;
      }

      // Standard numeric property
      generateNumericVar(lines, prefix, prop, phases, fps, obj);
    }

    // Set defaults for non-animated transform properties so the JSX always has them
    if (!animatedProps.has("x") && !animatedProps.has("pos") && !animatedProps.has("orbit")) {
      const posX = obj.pos ? obj.pos[0] : 0;
      lines.push("const " + prefix + "_x = " + posX + ";");
    }
    if (!animatedProps.has("y") && !animatedProps.has("pos") && !animatedProps.has("orbit")) {
      const posY = obj.pos ? obj.pos[1] : 0;
      lines.push("const " + prefix + "_y = " + posY + ";");
    }
    if (!animatedProps.has("opacity")) {
      const op = obj.opacity !== undefined ? obj.opacity : 1;
      lines.push("const " + prefix + "_opacity = " + op + ";");
    }
    if (!animatedProps.has("scale")) {
      const sc = obj.scale !== undefined ? obj.scale : 1;
      lines.push("const " + prefix + "_scale = " + sc + ";");
    }
    if (!animatedProps.has("rotation")) {
      const rot = obj.rotation || 0;
      lines.push("const " + prefix + "_rotation = " + rot + ";");
    }

    lines.push("");
  }

  // ─── Generate JSX return ───
  lines.push("return (");

  // Background
  if (bgIsGradient) {
    const dir = spec.bg.direction || "to bottom";
    const bgStyle =
      "{ background: \"linear-gradient(" + dir + ", " +
      spec.bg.from + ", " + spec.bg.to + ')", overflow: "hidden" }';
    lines.push("  <AbsoluteFill style=" + bgStyle + ">");
  } else {
    lines.push(
      '  <AbsoluteFill style={{ backgroundColor: "' +
        (bg || "#000000") +
        '", overflow: "hidden" }}>'
    );
  }

  // Render each object
  for (const obj of objects) {
    const prefix = safeVar(obj.id);
    const shapeStyles = getShapeStyles(obj);
    const entries = entriesByObject[obj.id] || [];

    // Collect which positional system this object uses
    const hasOrbit = entries.some(function (e) { return e.entry.orbit; });
    const hasPos = entries.some(function (e) { return e.entry.pos; });

    // Determine position variable names
    let xVar = prefix + "_x";
    let yVar = prefix + "_y";
    if (hasOrbit) {
      // Object uses orbit — position comes from orbit calc for the orbit phase
      // Since orbit might only cover part of the timeline, we combine
      xVar = prefix + "_x";
      yVar = prefix + "_y";
    }
    if (hasPos) {
      xVar = prefix + "_posX";
      yVar = prefix + "_posY";
    }

    // Determine anchor-based transform
    const anchor = obj.anchor;
    let transformExpr;
    let posStrategy = "center"; // default: absolute center positioning

    if (anchor === "bottom") {
      // Bar grows FROM bottom edge upward
      transformExpr = '"translateX(-50%) translateX(" + ' + xVar + ' + "px) translateY(" + ' + yVar + ' + "px) rotate(" + ' + prefix + '_rotation + "deg) scale(" + ' + prefix + '_scale + ")"';
      posStrategy = "bottom";
    } else if (anchor === "left") {
      // Bar grows FROM left edge rightward
      transformExpr = '"translateY(-50%) translateX(" + ' + xVar + ' + "px) translateY(" + ' + yVar + ' + "px) rotate(" + ' + prefix + '_rotation + "deg) scale(" + ' + prefix + '_scale + ")"';
      posStrategy = "left";
    } else {
      // Default: center positioning
      const transformParts = [];
      transformParts.push('"translate(-50%, -50%) translateX(" + ' + xVar + ' + "px) translateY(" + ' + yVar + ' + "px)');
      transformParts.push(' rotate(" + ' + prefix + '_rotation + "deg)');
      transformParts.push(' scale(" + ' + prefix + '_scale + ")"');
      transformExpr = transformParts.join("");
    }

    // Build the style object string
    let styleLines = [];
    styleLines.push('          position: "absolute"');

    if (posStrategy === "bottom") {
      styleLines.push('          left: "50%"');
      styleLines.push('          bottom: "50%"');
      styleLines.push('          transformOrigin: "bottom center"');
    } else if (posStrategy === "left") {
      styleLines.push('          left: "50%"');
      styleLines.push('          top: "50%"');
      styleLines.push('          transformOrigin: "left center"');
    } else {
      styleLines.push('          left: "50%"');
      styleLines.push('          top: "50%"');
    }

    // Shape-specific styles
    const isTextShape = obj.shape === "text";
    for (const [key, val] of Object.entries(shapeStyles)) {
      if (key === "width" || key === "height") {
        // Check if width/height is animated
        const propEntryList = (entriesByObject[obj.id] || []);
        const isWidthAnimated = key === "width" && propEntryList.some(function (e) { return e.entry.width; });
        const isHeightAnimated = key === "height" && propEntryList.some(function (e) { return e.entry.height; });
        if (isWidthAnimated) {
          styleLines.push("          width: " + prefix + "_width");
        } else if (isHeightAnimated) {
          styleLines.push("          height: " + prefix + "_height");
        } else {
          styleLines.push("          " + key + ": " + val);
        }
      } else {
        styleLines.push("          " + key + ": " + val);
      }
    }

    // Dynamic styles from animated properties
    const animatedPropSet = new Set();
    for (const { entry } of entries) {
      Object.keys(entry).forEach(function (k) {
        if (k !== "target" && k !== "time" && k !== "easing") animatedPropSet.add(k);
      });
    }

    if (animatedPropSet.has("cornerRadius")) {
      styleLines.push("          borderRadius: " + prefix + "_cornerRadius");
    }

    if (animatedPropSet.has("color")) {
      styleLines.push("          backgroundColor: " + prefix + "_color");
    }

    if (animatedPropSet.has("strokeWidth")) {
      styleLines.push(
        '          border: ' + prefix + '_strokeWidth + "px solid " + "' +
        (obj.stroke ? obj.stroke.color : obj.color || "#000") + '"'
      );
    }

    styleLines.push("          opacity: " + prefix + "_opacity");
    styleLines.push("          transform: " + transformExpr);

    // Assemble the element — text objects get inner content, shapes are self-closing
    if (isTextShape && obj.text && obj.text.content) {
      const content = obj.text.content.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      lines.push("    <div");
      lines.push("      style={{");
      lines.push(styleLines.join(",\n") + ",");
      lines.push("      }}");
      lines.push('    >{"' + content + '"}</div>');
    } else {
      lines.push("    <div");
      lines.push("      style={{");
      lines.push(styleLines.join(",\n") + ",");
      lines.push("      }}");
      lines.push("    />");
    }
  }

  lines.push("  </AbsoluteFill>");
  lines.push(");");

  // ─── Assemble final component code ───
  const bodyCode = lines.join("\n");

  const fullCode =
    'import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";\n\n' +
    "export const GeneratedMotion = () => {\n" +
    bodyCode +
    "\n};\n";

  return {
    code: fullCode,
    bodyCode: bodyCode,
    fullyCovered: skippedCount === 0,
    unsupported: unsupported,
    stats: {
      objects: objects.length,
      animations: timeline.length,
      compiled: compiledCount,
      skipped: skippedCount,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NUMERIC VARIABLE GENERATOR
// Generates interpolation code for a standard numeric property.
// Multi-phase → if/else chain. Single phase → direct const.
// ─────────────────────────────────────────────────────────────────────────────

function generateNumericVar(lines, prefix, prop, phases, fps, obj) {
  const varName = prefix + "_" + prop;

  // Determine the initial (default) value for this property
  let defaultVal = 0;
  if (prop === "opacity") defaultVal = obj.opacity !== undefined ? obj.opacity : 1;
  if (prop === "scale") defaultVal = obj.scale !== undefined ? obj.scale : 1;
  if (prop === "rotation") defaultVal = obj.rotation || 0;
  if (prop === "x") defaultVal = obj.pos ? obj.pos[0] : 0;
  if (prop === "y") defaultVal = obj.pos ? obj.pos[1] : 0;
  if (prop === "width") {
    if (obj.size) defaultVal = obj.size[0];
    else if (obj.diameter) defaultVal = obj.diameter;
    else defaultVal = 100;
  }
  if (prop === "height") {
    if (obj.size) defaultVal = obj.size[1];
    else if (obj.diameter) defaultVal = obj.diameter;
    else defaultVal = 100;
  }

  if (phases.length === 1) {
    const e = phases[0].entry;
    const startF = Math.round(e.time[0] * fps);
    const endF = Math.round(e.time[1] * fps);
    const vals = e[prop];
    lines.push(
      "const " + varName + " = interpolate(frame, [" +
      startF + ", " + endF + "], [" +
      vals[0] + ", " + vals[1] + "], " + CLAMP + ");"
    );
  } else {
    // Multi-phase: let variable with if/else chain
    lines.push("let " + varName + " = " + defaultVal + ";");
    for (let i = 0; i < phases.length; i++) {
      const e = phases[i].entry;
      const startF = Math.round(e.time[0] * fps);
      const endF = Math.round(e.time[1] * fps);
      const vals = e[prop];
      const cond = (i === 0 ? "if" : "} else if") +
        " (frame >= " + startF + " && frame <= " + endF + ") {";
      lines.push(cond);
      lines.push(
        "  " + varName + " = interpolate(frame, [" +
        startF + ", " + endF + "], [" +
        vals[0] + ", " + vals[1] + "], " + CLAMP + ");"
      );
    }
    lines.push("}");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOR VARIABLE GENERATOR
// Decomposes hex colors to RGB channels, interpolates each, then rebuilds.
// ─────────────────────────────────────────────────────────────────────────────

function generateColorVar(lines, prefix, phases, fps) {
  const varName = prefix + "_color";

  if (phases.length === 1) {
    const e = phases[0].entry;
    const startF = Math.round(e.time[0] * fps);
    const endF = Math.round(e.time[1] * fps);
    const fromRgb = hexToRgb(e.color[0]);
    const toRgb = hexToRgb(e.color[1]);

    lines.push(
      "const " + prefix + "_r = interpolate(frame, [" +
      startF + ", " + endF + "], [" + fromRgb.r + ", " + toRgb.r + "], " + CLAMP + ");"
    );
    lines.push(
      "const " + prefix + "_g = interpolate(frame, [" +
      startF + ", " + endF + "], [" + fromRgb.g + ", " + toRgb.g + "], " + CLAMP + ");"
    );
    lines.push(
      "const " + prefix + "_b = interpolate(frame, [" +
      startF + ", " + endF + "], [" + fromRgb.b + ", " + toRgb.b + "], " + CLAMP + ");"
    );
    lines.push(
      'const ' + varName + ' = "rgb(" + Math.round(' + prefix + '_r) + "," + Math.round(' + prefix + '_g) + "," + Math.round(' + prefix + '_b) + ")";'
    );
  } else {
    // Multi-phase color: need let variables for r/g/b
    const initColor = phases[0].entry.color[0];
    const initRgb = hexToRgb(initColor);

    lines.push("let " + prefix + "_r = " + initRgb.r + ";");
    lines.push("let " + prefix + "_g = " + initRgb.g + ";");
    lines.push("let " + prefix + "_b = " + initRgb.b + ";");

    for (let i = 0; i < phases.length; i++) {
      const e = phases[i].entry;
      const startF = Math.round(e.time[0] * fps);
      const endF = Math.round(e.time[1] * fps);
      const fromRgb = hexToRgb(e.color[0]);
      const toRgb = hexToRgb(e.color[1]);

      const cond = (i === 0 ? "if" : "} else if") +
        " (frame >= " + startF + " && frame <= " + endF + ") {";
      lines.push(cond);
      lines.push(
        "  " + prefix + "_r = interpolate(frame, [" +
        startF + ", " + endF + "], [" + fromRgb.r + ", " + toRgb.r + "], " + CLAMP + ");"
      );
      lines.push(
        "  " + prefix + "_g = interpolate(frame, [" +
        startF + ", " + endF + "], [" + fromRgb.g + ", " + toRgb.g + "], " + CLAMP + ");"
      );
      lines.push(
        "  " + prefix + "_b = interpolate(frame, [" +
        startF + ", " + endF + "], [" + fromRgb.b + ", " + toRgb.b + "], " + CLAMP + ");"
      );
    }
    lines.push("}");
    lines.push(
      'const ' + varName + ' = "rgb(" + Math.round(' + prefix + '_r) + "," + Math.round(' + prefix + '_g) + "," + Math.round(' + prefix + '_b) + ")";'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORBIT VARIABLE GENERATOR
// Generates trigonometric position calculation from orbit spec.
// ─────────────────────────────────────────────────────────────────────────────

function generateOrbitVars(lines, prefix, phases, fps) {
  // Orbit phases produce both X and Y position
  // For orbit, we override the x/y variables
  for (let i = 0; i < phases.length; i++) {
    const e = phases[i].entry;
    const orb = e.orbit;
    const startF = Math.round(e.time[0] * fps);
    const endF = Math.round(e.time[1] * fps);

    const cx = orb.center ? orb.center[0] : 0;
    const cy = orb.center ? orb.center[1] : 0;
    const radius = orb.radius || 180;
    const startAngle = orb.startAngle || 0;
    const totalDeg = orb.degrees || 360;

    const angleVar = prefix + "_orbitAngle_" + i;
    const radVar = prefix + "_orbitRad_" + i;

    lines.push(
      "const " + angleVar + " = interpolate(frame, [" +
      startF + ", " + endF + "], [" +
      startAngle + ", " + (startAngle + totalDeg) + "], " + CLAMP + ");"
    );
    lines.push(
      "const " + radVar + " = " + angleVar + " * Math.PI / 180;"
    );

    // Override x/y with orbit-computed position
    // If there are multiple orbit phases, use the last one's values
    // (in practice, multiple orbit phases for same object is uncommon)
    if (i === phases.length - 1) {
      lines.push(
        "const " + prefix + "_x = " + cx + " + " + radius + " * Math.cos(" + radVar + ");"
      );
      lines.push(
        "const " + prefix + "_y = " + cy + " + " + radius + " * Math.sin(" + radVar + ");"
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POS VARIABLE GENERATOR
// Generates variables for combined pos: [[fromX, fromY], [toX, toY]]
// ─────────────────────────────────────────────────────────────────────────────

function generatePosVars(lines, prefix, phases, fps) {
  if (phases.length === 1) {
    const e = phases[0].entry;
    const startF = Math.round(e.time[0] * fps);
    const endF = Math.round(e.time[1] * fps);
    const posArr = e.pos;

    lines.push(
      "const " + prefix + "_posX = interpolate(frame, [" +
      startF + ", " + endF + "], [" +
      posArr[0][0] + ", " + posArr[1][0] + "], " + CLAMP + ");"
    );
    lines.push(
      "const " + prefix + "_posY = interpolate(frame, [" +
      startF + ", " + endF + "], [" +
      posArr[0][1] + ", " + posArr[1][1] + "], " + CLAMP + ");"
    );
  } else {
    // Multi-phase pos
    const initPos = phases[0].entry.pos[0];
    lines.push("let " + prefix + "_posX = " + initPos[0] + ";");
    lines.push("let " + prefix + "_posY = " + initPos[1] + ";");

    for (let i = 0; i < phases.length; i++) {
      const e = phases[i].entry;
      const startF = Math.round(e.time[0] * fps);
      const endF = Math.round(e.time[1] * fps);
      const posArr = e.pos;

      const cond = (i === 0 ? "if" : "} else if") +
        " (frame >= " + startF + " && frame <= " + endF + ") {";
      lines.push(cond);
      lines.push(
        "  " + prefix + "_posX = interpolate(frame, [" +
        startF + ", " + endF + "], [" +
        posArr[0][0] + ", " + posArr[1][0] + "], " + CLAMP + ");"
      );
      lines.push(
        "  " + prefix + "_posY = interpolate(frame, [" +
        startF + ", " + endF + "], [" +
        posArr[0][1] + ", " + posArr[1][1] + "], " + CLAMP + ");"
      );
    }
    lines.push("}");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

module.exports = { compile };
