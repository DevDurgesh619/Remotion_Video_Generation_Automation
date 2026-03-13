// ─────────────────────────────────────────────────────────────────────────────
// ASSET RULES — Conditionally included when the spec contains "asset" shapes.
// Teaches the LLM how to render SVG assets using the pre-imported Asset component.
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_RULES = "ASSET SHAPE RENDERING RULES\n" +
  "When the spec contains an object with \"shape\": \"asset\":\n\n" +
  "The object will have:\n" +
  "  - \"assetId\": string (e.g., \"rocket\", \"car\", \"smartphone\")\n" +
  "  - \"size\": [width, height] in pixels\n" +
  "  - Standard properties: \"pos\", \"color\", \"opacity\", \"rotation\", \"scale\"\n\n" +
  "RENDERING — The Asset component is PRE-IMPORTED (do NOT write import statements).\n" +
  "Use it exactly like a div element for positioning:\n\n" +
  "  <Asset id={\"rocket\"} width={120} height={120} color={\"#FFFFFF\"}\n" +
  "    style={{\n" +
  "      position: \"absolute\",\n" +
  "      left: \"50%\",\n" +
  "      top: \"50%\",\n" +
  "      transform: \"translate(-50%, -50%) translateX(\" + posX + \"px) translateY(\" + posY + \"px)\"\n" +
  "    }} />\n\n" +
  "ANIMATION — Asset objects animate EXACTLY like div shapes.\n" +
  "All transform properties (x, y, scale, rotation, opacity) work identically:\n\n" +
  "  const rocketX = interpolate(frame, [startFrame, endFrame], [fromX, toX],\n" +
  "    { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n" +
  "  const rocketY = interpolate(frame, [startFrame, endFrame], [fromY, toY],\n" +
  "    { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n" +
  "  const rocketOpacity = interpolate(frame, [startFrame, endFrame], [fromOp, toOp],\n" +
  "    { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n" +
  "  const rocketScale = interpolate(frame, [startFrame, endFrame], [fromScale, toScale],\n" +
  "    { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n" +
  "  const rocketRotation = interpolate(frame, [startFrame, endFrame], [fromDeg, toDeg],\n" +
  "    { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n\n" +
  "  <Asset id={\"rocket\"} width={120} height={120} color={\"#FF6B35\"}\n" +
  "    style={{\n" +
  "      position: \"absolute\",\n" +
  "      left: \"50%\",\n" +
  "      top: \"50%\",\n" +
  "      transform: \"translate(-50%, -50%) translateX(\" + rocketX + \"px) translateY(\" + rocketY + \"px) scale(\" + rocketScale + \") rotate(\" + rocketRotation + \"deg)\",\n" +
  "      opacity: rocketOpacity\n" +
  "    }} />\n\n" +
  "STROKE CONTROL:\n" +
  "  If the spec includes \"stroke\" on an asset object, pass it as props:\n" +
  "  <Asset id={\"car\"} width={80} height={80} stroke={\"#FFFFFF\"} strokeWidth={2}\n" +
  "    style={{...}} />\n\n" +
  "CRITICAL RULES:\n" +
  "  - The Asset component is already imported by the wrapper. Do NOT write import statements.\n" +
  "  - Asset id prop must be a string matching the spec's assetId exactly.\n" +
  "  - Position assets using the same center-relative coordinate system as all other shapes.\n" +
  "  - Apply ALL transforms via the style.transform string, same as div shapes.\n" +
  "  - Do NOT use template literals. Build all transform strings with + concatenation.\n" +
  "  - Asset objects are NOT divs — they render as <svg> elements. Do NOT set backgroundColor on them.\n" +
  "  - Use the \"color\" prop to set the fill color, NOT style.color or style.backgroundColor.";

// ─────────────────────────────────────────────────────────────────────────────
// Detect whether asset rules are needed
// ─────────────────────────────────────────────────────────────────────────────
function getAssetRules(specData) {
  const specStr = JSON.stringify(specData);
  if (specStr.includes('"asset"')) {
    return [ASSET_RULES];
  }
  return [];
}

module.exports = { getAssetRules };
