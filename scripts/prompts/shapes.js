// ─────────────────────────────────────────────────────────────────────────────
// SHAPE RENDERING RULES — Always included. Covers how to render each shape.
// ─────────────────────────────────────────────────────────────────────────────

const SHAPE_RULES = `SHAPE RENDERING RULES
All shapes must be rendered as div elements.

Circle: Use borderRadius: "50%", set width and height to the diameter.

Rectangle/Square: Use width and height directly.

Triangle: Use clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" for upward-pointing.
  - facing "down": "polygon(0% 0%, 100% 0%, 50% 100%)"
  - facing "left": "polygon(100% 0%, 100% 100%, 0% 50%)"
  - facing "right": "polygon(0% 0%, 0% 100%, 100% 50%)"

Pentagon: Use clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)"

Star: Use clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"

Line: Use a div with a very small height (e.g., 2-4px) and a width for horizontal lines, or vice versa.

POSITIONING
By default, center shapes using:
position: "absolute",
left: "50%",
top: "50%",
transform: "translate(-50%, -50%)"

The spec "pos" field is [x, y] relative to canvas center.
Add the pos values to the translate: "translate(calc(-50% + Xpx), calc(-50% + Ypx))" — but since you cannot use calc, use:
left: "50%", top: "50%", transform: "translateX(" + (posX - halfWidth) + "px) translateY(" + (posY - halfHeight) + "px)"

Or more simply for a centered shape:
left: "50%", top: "50%", transform: "translate(-50%, -50%) translateX(" + posX + "px) translateY(" + posY + "px)"

OUTLINED SHAPES (stroke)
If object has "stroke" but "fill" is false:
- Set backgroundColor to "transparent"
- Use border: strokeWidth + "px solid " + strokeColor
- Use boxSizing: "border-box"`;

module.exports = SHAPE_RULES;
