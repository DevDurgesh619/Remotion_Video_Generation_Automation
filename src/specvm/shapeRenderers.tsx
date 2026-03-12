/**
 * Shape Renderers
 *
 * Each renderer takes a SceneObject + ComputedObjectState and returns a
 * positioned React element. All positioning uses the shared helpers from
 * renderHelpers.ts so behaviour is consistent across renderers.
 */

import React from "react";
import type { SceneObject, ComputedObjectState } from "./types";
import {
  wrapperStyle,
  buildBoxShadow,
  buildGlowShadow,
  buildGlowFilter,
  buildFillAndStroke,
} from "./renderHelpers";

/** Merge box-shadow and glow-shadow into a single CSS value. */
function combinedBoxShadow(state: ComputedObjectState): string | undefined {
  const parts = [buildBoxShadow(state), buildGlowShadow(state)].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

// ─── Circle ─────────────────────────────────────────────────────────────────

export function renderCircle(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const d = state.diameter;
  return React.createElement("div", {
    key: obj.id,
    style: {
      ...wrapperStyle(obj, state, d, d),
      borderRadius: "50%",
      ...buildFillAndStroke(obj, state),
      boxShadow: combinedBoxShadow(state),
    },
  });
}

// ─── Square ─────────────────────────────────────────────────────────────────

export function renderSquare(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const side = state.width;
  return React.createElement("div", {
    key: obj.id,
    style: {
      ...wrapperStyle(obj, state, side, side),
      borderRadius: state.cornerRadius > 0 ? state.cornerRadius : undefined,
      ...buildFillAndStroke(obj, state),
      boxShadow: combinedBoxShadow(state),
    },
  });
}

// ─── Rectangle ──────────────────────────────────────────────────────────────

export function renderRectangle(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  return React.createElement("div", {
    key: obj.id,
    style: {
      ...wrapperStyle(obj, state, w, h),
      borderRadius: state.cornerRadius > 0 ? state.cornerRadius : undefined,
      ...buildFillAndStroke(obj, state),
      boxShadow: combinedBoxShadow(state),
    },
  });
}

// ─── Triangle ───────────────────────────────────────────────────────────────
//
// Rendered as SVG <path> so that:
//   • cornerRadius is fully supported (quadratic-bezier rounding at each vertex)
//   • stroke renders correctly (clip-path was clipping the border)

export function renderTriangle(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  const r = Math.max(0, state.cornerRadius);
  const pathD = buildTrianglePath(w, h, obj.facing ?? "up", r);
  const fillColor = obj.fill === false ? "none" : (state.color || "#000000");

  return React.createElement(
    "div",
    { key: obj.id, style: { ...wrapperStyle(obj, state, w, h), filter: buildGlowFilter(state) } },
    React.createElement(
      "svg",
      {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        style: { display: "block", overflow: "visible" },
      },
      React.createElement("path", {
        d: pathD,
        fill: fillColor,
        stroke: state.stroke ? state.stroke.color : "none",
        strokeWidth: state.stroke ? state.stroke.width : 0,
      }),
    ),
  );
}

/**
 * Compute an SVG path string for a triangle with optional corner rounding.
 * Rounding uses quadratic bezier curves so cornerRadius animates smoothly.
 */
function buildTrianglePath(
  w: number,
  h: number,
  facing: string,
  r: number,
): string {
  let pts: [number, number][];
  switch (facing) {
    case "down":  pts = [[0, 0], [w, 0], [w / 2, h]]; break;
    case "left":  pts = [[w, 0], [w, h], [0, h / 2]]; break;
    case "right": pts = [[0, 0], [0, h], [w, h / 2]]; break;
    default:      pts = [[0, h], [w, h], [w / 2, 0]]; // up
  }

  const n = pts.length;

  if (r <= 0) {
    return (
      `M ${tf(pts[0][0])} ${tf(pts[0][1])} ` +
      pts.slice(1).map((p) => `L ${tf(p[0])} ${tf(p[1])}`).join(" ") +
      " Z"
    );
  }

  const segs: string[] = [];

  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const ipx = prev[0] - curr[0], ipy = prev[1] - curr[1];
    const ipLen = Math.sqrt(ipx * ipx + ipy * ipy);

    const opx = next[0] - curr[0], opy = next[1] - curr[1];
    const opLen = Math.sqrt(opx * opx + opy * opy);

    // Clamp so the arc never overflows an adjacent edge
    const cr = Math.min(r, ipLen / 2, opLen / 2);

    // Tangent point on the incoming edge (bezier start)
    const t1x = curr[0] + (ipx / ipLen) * cr;
    const t1y = curr[1] + (ipy / ipLen) * cr;

    // Tangent point on the outgoing edge (bezier end)
    const t2x = curr[0] + (opx / opLen) * cr;
    const t2y = curr[1] + (opy / opLen) * cr;

    segs.push(i === 0
      ? `M ${tf(t1x)} ${tf(t1y)}`
      : `L ${tf(t1x)} ${tf(t1y)}`);

    // Quadratic bezier: vertex as control point → smooth rounded corner
    segs.push(`Q ${tf(curr[0])} ${tf(curr[1])} ${tf(t2x)} ${tf(t2y)}`);
  }

  segs.push("Z");
  return segs.join(" ");
}

function tf(n: number): string { return n.toFixed(2); }

// ─── Line ───────────────────────────────────────────────────────────────────

export function renderLine(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  const strokeWidth = state.stroke?.width ?? 2;
  const strokeColor = state.stroke?.color ?? state.color;

  // A line is a narrow rectangle. Ensure minimum visibility.
  const lineW = Math.max(w, strokeWidth);
  const lineH = Math.max(h, strokeWidth);

  return React.createElement("div", {
    key: obj.id,
    style: {
      ...wrapperStyle(obj, state, lineW, lineH),
      backgroundColor: strokeColor,
    },
  });
}
