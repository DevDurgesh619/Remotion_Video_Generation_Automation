// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED RULES — Conditionally included based on spec content.
// Each export is a separate rule block loaded only when needed.
// ─────────────────────────────────────────────────────────────────────────────

const ORBIT_RULES = `ORBIT ANIMATION RULES
When the spec contains "orbit" in a timeline entry:
orbit: { center: [cx, cy], radius: radiusPx, degrees: totalDeg }

Use trigonometry to calculate the position at each frame:
const angle = interpolate(frame, [startFrame, endFrame], [startAngleDeg, startAngleDeg + totalDeg], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const radians = angle * Math.PI / 180;
const orbX = cx + radius * Math.cos(radians);
const orbY = cy + radius * Math.sin(radians);

For shared-orbit animations with multiple objects, use a parent wrapper div centered at the orbit center and apply rotation to the parent. Position child shapes relative to the center at their radius offset.`;

const GLOW_SHADOW_RULES = `GLOW & SHADOW ANIMATION RULES
To create a glow effect, use the "boxShadow" CSS property.
Build the string using strict concatenation:
boxShadow: "0px 0px " + blur + "px " + spread + "px " + color

When animating glow or shadow, interpolate the numeric values (blur, spread, offsets) and concatenate the result.

Shadow format: boxShadow: offsetX + "px " + offsetY + "px " + blur + "px " + spread + "px " + color`;

const COLOR_RULES = `COLOR ANIMATION RULES
You must not interpolate hex color strings directly.
To animate colors, parse the hex to RGB, interpolate each channel separately:
const r = interpolate(frame, [start, end], [fromR, toR], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const g = interpolate(frame, [start, end], [fromG, toG], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const b = interpolate(frame, [start, end], [fromB, toB], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const animColor = "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";

If the spec specifies "blendMode", apply it as: mixBlendMode: "screen"`;

const LINE_DRAW_RULES = `LINE ANIMATION & STROKE DRAW RULES
When animating the "width" of a line (drawing effect):
NEVER use "translate(-50%, -50%)" because the percentage recalculates as width grows.
Use fixed pixel translations based on the FINAL max width:
- Calculate half = finalWidth / 2
- Set transform: "translateX(-" + half + "px) translateY(-50%)"
- Animate width from 0 to finalWidth

POLYGON STROKE DRAW (for clip-pathed shapes like triangles, pentagons, stars):
You CANNOT use CSS borders on clip-pathed shapes.
Use the "Conic Gradient Mask" technique with two stacked divs:
1. Outer div with the shape color and clip-path
2. Inner div slightly smaller, centered, with background color matching the scene background

DASHED LINES:
Use repeating-linear-gradient instead of border-style: dashed.
Build the gradient string using concatenation.`;

const BOUNCE_PHYSICS_RULES = `BOUNCE & PHYSICS ANIMATION RULES
When the spec contains "bounce" in a timeline entry:
bounce: { floor: yPx, heights: [h1, h2, ...] }

Implement as chained interpolations:
1. Drop from initial Y to floor with ease-in
2. Rise from floor to (floor - h1) with ease-out
3. Drop back to floor with ease-in
4. Rise to (floor - h2) with ease-out
... continue for each bounce height

Calculate frame ranges proportionally within the total animation time.
Each successive bounce should be shorter in duration.`;

const BAR_CHART_RULES = `BAR CHART & TRANSFORM ORIGIN RULES
When a shape needs to grow from a specific anchor (like a bar growing upward):
Do NOT use the standard centering transform.
Instead anchor to the specified edge:
left: "50%",
bottom: "20%",
transformOrigin: "bottom center",
transform: "translateX(-50%) scaleY(" + scaleY + ")"

TEXT COUNTERS:
If displaying an animated number (e.g., percentage counter), use:
{Math.round(interpolatedValue) + "%"}`;

// ─────────────────────────────────────────────────────────────────────────────
// Detect which advanced rules are needed based on spec content
// ─────────────────────────────────────────────────────────────────────────────
function getAdvancedRules(specData) {
  const rules = [];
  const specStr = JSON.stringify(specData);

  // Check timeline for advanced animation types
  if (specStr.includes('"orbit"')) {
    rules.push(ORBIT_RULES);
  }

  if (specStr.includes('"glow"') || specStr.includes('"shadow"')) {
    rules.push(GLOW_SHADOW_RULES);
  }

  if (specStr.includes('"color"') && Array.isArray(specData.timeline)) {
    const hasColorAnim = specData.timeline.some(t => t.color && Array.isArray(t.color));
    if (hasColorAnim) {
      rules.push(COLOR_RULES);
    }
  }

  if (specStr.includes('"line"') || specStr.includes('"strokeWidth"') || specStr.includes('"width"')) {
    rules.push(LINE_DRAW_RULES);
  }

  if (specStr.includes('"bounce"')) {
    rules.push(BOUNCE_PHYSICS_RULES);
  }

  if (specStr.includes('"height"') || specStr.includes('"scaleY"')) {
    rules.push(BAR_CHART_RULES);
  }

  return rules;
}

module.exports = { getAdvancedRules };
