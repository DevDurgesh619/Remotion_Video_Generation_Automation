/**
 * Renderer Registry
 *
 * Maps object `shape` strings to their renderer functions.
 * Adding a new object type requires only:
 *   1. A new renderer function
 *   2. A new entry in `rendererRegistry`
 *
 * The VM core (SpecPlayer, animationRuntime) never needs to change.
 */

import React from "react";
import type { SceneObject, ComputedObjectState } from "./types";
import {
  renderCircle,
  renderSquare,
  renderRectangle,
  renderTriangle,
  renderLine,
  renderPentagon,
  renderStar,
} from "./shapeRenderers";
import { renderSVG, renderImage, renderText, renderAsset } from "./mediaRenderers";
import { renderArc, renderPolyline, renderPolygon } from "./chartRenderers";

// ─── Renderer function type ─────────────────────────────────────────────────

export type RendererFn = (
  obj: SceneObject,
  state: ComputedObjectState,
) => React.ReactElement;

// ─── Registry ───────────────────────────────────────────────────────────────

export const rendererRegistry: Record<string, RendererFn> = {
  circle: renderCircle,
  square: renderSquare,
  rectangle: renderRectangle,
  triangle: renderTriangle,
  line: renderLine,
  svg: renderSVG,
  image: renderImage,
  text: renderText,
  asset: renderAsset,
  arc: renderArc,
  polyline: renderPolyline,
  polygon: renderPolygon,
  pentagon: renderPentagon,
  star: renderStar,
};

// ─── Track warnings to avoid per-frame spam ─────────────────────────────────

const warnedShapes = new Set<string>();

// ─── Public helper ──────────────────────────────────────────────────────────

/**
 * Look up the renderer for `obj.shape` and invoke it.
 * Falls back to a visible debug placeholder for unknown types so the
 * animation never crashes. Warnings are deduplicated.
 */
export function renderObject(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const renderer = rendererRegistry[obj.shape];

  if (renderer) {
    return renderer(obj, state);
  }

  // Unknown shape — warn once per shape type (not per frame)
  const warnKey = `${obj.shape}:${obj.id}`;
  if (!warnedShapes.has(warnKey)) {
    warnedShapes.add(warnKey);
    console.warn(
      `[SpecVM] No renderer registered for shape "${obj.shape}" (object "${obj.id}"). ` +
        `Register one in rendererRegistry. Rendering fallback placeholder.`,
    );
  }

  // Render a visible placeholder (small, semi-transparent) instead of invisible
  return React.createElement("div", {
    key: obj.id,
    "data-specvm-unknown": obj.shape,
    style: {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: `translate(${state.x}px, ${state.y}px)`,
      width: 20,
      height: 20,
      marginLeft: -10,
      marginTop: -10,
      backgroundColor: "rgba(255, 0, 0, 0.3)",
      border: "1px dashed red",
      borderRadius: 2,
      opacity: state.opacity,
    },
  });
}
