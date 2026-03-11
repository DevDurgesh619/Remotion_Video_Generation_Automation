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
} from "./shapeRenderers";
import { renderSVG, renderImage, renderText } from "./mediaRenderers";

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
};

// ─── Public helper ──────────────────────────────────────────────────────────

/**
 * Look up the renderer for `obj.shape` and invoke it.
 * Falls back to a transparent placeholder for unknown types so the
 * animation never crashes.
 */
export function renderObject(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const renderer = rendererRegistry[obj.shape];

  if (renderer) {
    return renderer(obj, state);
  }

  // Unknown shape — render an invisible placeholder with a console warning
  console.warn(
    `[SpecVM] No renderer registered for shape "${obj.shape}" (object "${obj.id}"). ` +
      `Register one in rendererRegistry.`,
  );

  return React.createElement("div", {
    key: obj.id,
    "data-specvm-unknown": obj.shape,
    style: { display: "none" },
  });
}
