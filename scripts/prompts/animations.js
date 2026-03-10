// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION RULES — Always included. Covers interpolation, frame timing,
// and standard animation patterns.
// ─────────────────────────────────────────────────────────────────────────────

const ANIMATION_RULES = `INTERPOLATION RULES
All uses of interpolate must respect:
- inputRange must contain exactly two numbers.
- outputRange must contain exactly two values.
- inputRange[0] must be strictly less than inputRange[1].
- inputRange values must be strictly increasing.
- Never use reversed ranges or duplicate values.
- inputRange and outputRange must have the same length.
- Interpolated values must be numeric. Never pass strings into interpolate.
- Always clamp extrapolation:
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }

CORRECT PATTERN:
const opacity = interpolate(frame, [0, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

FRAME TIMING
The spec "time" field has [startSec, endSec].
Convert to frames: startFrame = time[0] * 30, endFrame = time[1] * 30.
Always use frame numbers (integers) in interpolate inputRange.

ANIMATION PROPERTY MAPPING
The sparse spec timeline entries have flat properties. Map them as follows:

"opacity": [from, to] → interpolate opacity value
"scale": [from, to] → interpolate and apply as transform: "scale(" + val + ")"
"rotation": [from, to] → interpolate degrees, apply as: "rotate(" + val + "deg)"
"x": [from, to] → interpolate X position in pixels
"y": [from, to] → interpolate Y position in pixels
"width": [from, to] → interpolate width for line/bar growth
"height": [from, to] → interpolate height for bar growth
"scaleX": [from, to] → independent X scaling
"scaleY": [from, to] → independent Y scaling
"cornerRadius": [from, to] → interpolate borderRadius
"skewX": [from, to] → interpolate skewX degrees
"skewY": [from, to] → interpolate skewY degrees

COMBINING TRANSFORMS
When multiple transform properties apply to the same object at the same frame, combine them:
transform: "translate(-50%, -50%) translateX(" + x + "px) translateY(" + y + "px) rotate(" + rot + "deg) scale(" + s + ")"

EASING MAPPING
"linear" → Easing.linear (default, no easing needed)
"ease-in" → Easing.in(Easing.ease)
"ease-out" → Easing.out(Easing.ease)
"ease-in-out" → Easing.inOut(Easing.ease)
Note: Since you can only use interpolate (no Easing import), map easings as follows:
- "linear": no easing option needed
- For "ease-in", "ease-out", "ease-in-out": you may omit them or use linear (Remotion interpolate does not natively support CSS easing names without the Easing import). Use linear to keep determinism.
- "spring" and "bounce": use linear with manual keyframe subdivision if needed.

NO LOOPS RULE
You must never generate elements programmatically.
Forbidden: for loops, while loops, .map(), Array.from().
All shapes must be written explicitly.

STAGGERED SEQUENCES
If the spec has multiple timeline entries with offset times for different objects (e.g., a wave or stagger effect), write separate interpolation variables for EVERY single shape.`;

module.exports = ANIMATION_RULES;
