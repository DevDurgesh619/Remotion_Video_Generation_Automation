/**
 * Render Helpers
 *
 * Shared positioning, transform, and styling helpers used by all renderers.
 * Consolidates duplicated code from shapeRenderers and mediaRenderers.
 * 
 * COORDINATE SYSTEM:
 *   - Canvas origin (0,0) is at canvas CENTER
 *   - Positive X → right, positive Y → down
 *   - All objects start positioned at CSS `left: 50%; top: 50%`
 *   - Then translated by (obj.pos[0], obj.pos[1]) from center
 * 
 * ANCHOR SYSTEM (critical for bar charts):
 *   - "center" (default): object centered on its pos coordinate
 *   - "bottom": object's BOTTOM EDGE sits at pos.y; grows UPWARD as height increases
 *   - "top": object's TOP EDGE sits at pos.y; grows DOWNWARD
 *   - "left": object's LEFT EDGE sits at pos.x; grows RIGHTWARD
 *   - "right": object's RIGHT EDGE sits at pos.x; grows LEFTWARD
 */

import type { SceneObject, ComputedObjectState } from "./types";

// ─── Transform ──────────────────────────────────────────────────────────────

export function buildTransform(state: ComputedObjectState): string {
  const parts: string[] = [
    `translate(${state.x}px, ${state.y}px)`,
  ];
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    parts.push(`scale(${state.scaleX}, ${state.scaleY})`);
  } else if (state.scale !== 1) {
    parts.push(`scale(${state.scale})`);
  }
  if (state.rotation !== 0) parts.push(`rotate(${state.rotation}deg)`);
  return parts.join(" ");
}

// ─── Box Shadow ─────────────────────────────────────────────────────────────

export function buildBoxShadow(state: ComputedObjectState): string | undefined {
  if (!state.shadow) return undefined;
  const { offsetX, offsetY, blur, color } = state.shadow;
  return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
}

// ─── Glow Shadow ─────────────────────────────────────────────────────────────

/**
 * Converts a glow state into a CSS box-shadow string suitable for div-based
 * shapes. For SVG-based shapes (triangle, arc) use buildGlowFilter() instead.
 *
 * Intensity is applied by scaling the alpha channel of the glow color.
 */
export function buildGlowShadow(state: ComputedObjectState): string | undefined {
  if (!state.glow) return undefined;
  const { blur, intensity, color } = state.glow;
  if (blur <= 0 || intensity <= 0) return undefined;
  // Apply intensity as alpha modifier using rgba overlay
  return `0 0 ${blur}px ${blur / 2}px ${applyAlpha(color, intensity)}`;
}

/**
 * Converts a glow state into a CSS filter drop-shadow string for SVG wrappers.
 * Use this for triangle, arc, polyline renderers where box-shadow is clipped.
 */
export function buildGlowFilter(state: ComputedObjectState): string | undefined {
  if (!state.glow) return undefined;
  const { blur, intensity, color } = state.glow;
  if (blur <= 0 || intensity <= 0) return undefined;
  return `drop-shadow(0 0 ${blur}px ${applyAlpha(color, intensity)})`;
}

/** Parse a CSS color and apply an intensity multiplier to its alpha channel. */
function applyAlpha(color: string, intensity: number): string {
  // Try rgba/rgb
  const rgba = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    const a = rgba[4] !== undefined ? Number(rgba[4]) * intensity : intensity;
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${a.toFixed(3)})`;
  }
  // Hex → parse then re-emit with alpha
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${intensity.toFixed(3)})`;
}

// ─── Wrapper Style ──────────────────────────────────────────────────────────

/**
 * Builds the CSS style for positioning an object on the canvas.
 * 
 * The anchor determines which edge of the element is pinned to the
 * pos coordinate. This is critical for bar charts where bars must
 * grow upward from a shared baseline.
 * 
 * Example: anchor="bottom", pos=[-180, 216], height animates 0→180
 *   - The bottom edge stays at y=216 (the baseline)
 *   - marginTop = -height pulls the element up so its bottom is at pos.y
 *   - As height grows, the bar visually grows UPWARD
 */
export function wrapperStyle(
  obj: SceneObject,
  state: ComputedObjectState,
  width: number,
  height: number,
): React.CSSProperties {
  const anchor = obj.anchor ?? "center";

  const base: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    opacity: state.opacity,
    zIndex: obj.zIndex ?? undefined,
    transform: buildTransform(state),
  };

  switch (anchor) {
    case "bottom":
      // Bottom edge pinned at pos.y — element grows UPWARD
      // marginTop = -height ensures the bottom edge stays at the translate position
      // marginLeft = -width/2 centers horizontally on pos.x
      return {
        ...base,
        width,
        height,
        marginLeft: -width / 2,
        marginTop: -height,
        transformOrigin: "bottom center",
      };

    case "top":
      // Top edge pinned at pos.y — element grows DOWNWARD
      // No marginTop needed — top edge naturally at translate position
      return {
        ...base,
        width,
        height,
        marginLeft: -width / 2,
        marginTop: 0,
        transformOrigin: "top center",
      };

    case "left":
      // Left edge pinned at pos.x — element grows RIGHTWARD
      return {
        ...base,
        width,
        height,
        marginLeft: 0,
        marginTop: -height / 2,
        transformOrigin: "left center",
      };

    case "right":
      // Right edge pinned at pos.x — element grows LEFTWARD
      return {
        ...base,
        width,
        height,
        marginLeft: -width,
        marginTop: -height / 2,
        transformOrigin: "right center",
      };

    default:
      // Center-anchored (default): element centered on pos
      return {
        ...base,
        width,
        height,
        marginLeft: -width / 2,
        marginTop: -height / 2,
      };
  }
}

// ─── Stroke + Fill helpers ──────────────────────────────────────────────────

/**
 * Returns background and border styles based on fill/stroke configuration.
 */
export function buildFillAndStroke(
  obj: SceneObject,
  state: ComputedObjectState,
): React.CSSProperties {
  const styles: React.CSSProperties = {};

  if (obj.fill === false) {
    // Outline-only mode
    styles.backgroundColor = "transparent";
  } else {
    styles.backgroundColor = state.color;
  }

  if (state.stroke) {
    styles.border = `${state.stroke.width}px solid ${state.stroke.color}`;
    styles.boxSizing = "border-box";
  }

  return styles;
}

// ─── Triangle clip paths ────────────────────────────────────────────────────

const TRIANGLE_CLIPS: Record<string, string> = {
  up: "polygon(50% 0%, 0% 100%, 100% 100%)",
  down: "polygon(0% 0%, 100% 0%, 50% 100%)",
  left: "polygon(100% 0%, 100% 100%, 0% 50%)",
  right: "polygon(0% 0%, 0% 100%, 100% 50%)",
};

export function getTriangleClipPath(facing?: string): string {
  return TRIANGLE_CLIPS[facing ?? "up"] ?? TRIANGLE_CLIPS.up;
}
