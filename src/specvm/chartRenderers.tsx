/**
 * Chart Renderers
 *
 * SVG-based renderers for chart primitives: arc (pie/donut segments),
 * polyline (line charts), and polygon (area chart fills).
 *
 * These use the same wrapperStyle() positioning system as shape renderers.
 */

import React from "react";
import type { SceneObject, ComputedObjectState } from "./types";
import { wrapperStyle, buildGlowFilter } from "./renderHelpers";

// ─── Arc (pie/donut segment) ────────────────────────────────────────────────

/**
 * Renders a pie/donut arc segment using SVG path.
 *
 * Arc-specific properties on the SceneObject (added by specExpander):
 *   arcStartAngle: number   (degrees, 0 = right, -90 = top)
 *   arcSweepAngle: number   (degrees)
 *   arcInnerRadius: number  (0 for pie, >0 for donut)
 */
export function renderArc(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  const outerRadius = Math.min(w, h) / 2;
  const innerRadius = (obj as any).arcInnerRadius ?? 0;
  const startAngle = (obj as any).arcStartAngle ?? 0;
  const sweepAngle = (obj as any).arcSweepAngle ?? 90;

  const cx = w / 2;
  const cy = h / 2;

  const path = describeArc(cx, cy, outerRadius, innerRadius, startAngle, sweepAngle);

  return React.createElement(
    "div",
    {
      key: obj.id,
      style: { ...wrapperStyle(obj, state, w, h), filter: buildGlowFilter(state) },
    },
    React.createElement(
      "svg",
      {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        style: { overflow: "visible" },
      },
      React.createElement("path", {
        d: path,
        fill: state.color,
        stroke: state.stroke?.color,
        strokeWidth: state.stroke?.width,
      })
    )
  );
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngleDeg: number,
  sweepAngleDeg: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Clamp sweep to avoid degenerate paths
  const sweep = Math.min(sweepAngleDeg, 359.99);
  const largeArc = sweep > 180 ? 1 : 0;

  const startRad = toRad(startAngleDeg);
  const endRad = toRad(startAngleDeg + sweep);

  // Outer arc points
  const ox1 = cx + outerR * Math.cos(startRad);
  const oy1 = cy + outerR * Math.sin(startRad);
  const ox2 = cx + outerR * Math.cos(endRad);
  const oy2 = cy + outerR * Math.sin(endRad);

  if (innerR <= 0) {
    // Pie slice: arc + lines to center
    return [
      `M ${cx} ${cy}`,
      `L ${ox1} ${oy1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
      `Z`,
    ].join(" ");
  }

  // Donut segment: outer arc + inner arc (reversed)
  const ix1 = cx + innerR * Math.cos(startRad);
  const iy1 = cy + innerR * Math.sin(startRad);
  const ix2 = cx + innerR * Math.cos(endRad);
  const iy2 = cy + innerR * Math.sin(endRad);

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    `Z`,
  ].join(" ");
}

// ─── Polyline (line chart strokes) ──────────────────────────────────────────

/**
 * Renders an SVG polyline from a `points` string stored on the object.
 *
 * Polyline-specific properties on SceneObject (added by specExpander):
 *   polylinePoints: string   (SVG points format: "x1,y1 x2,y2 x3,y3")
 */
export function renderPolyline(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  const points = (obj as any).polylinePoints ?? "";
  const strokeColor = state.stroke?.color ?? state.color;
  const strokeWidth = state.stroke?.width ?? 2;

  return React.createElement(
    "div",
    {
      key: obj.id,
      style: wrapperStyle(obj, state, w, h),
    },
    React.createElement(
      "svg",
      {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        style: { overflow: "visible" },
      },
      React.createElement("polyline", {
        points,
        fill: "none",
        stroke: strokeColor,
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      })
    )
  );
}

// ─── Polygon (area chart fills) ─────────────────────────────────────────────

/**
 * Renders an SVG polygon for area chart fills.
 *
 * Polygon-specific properties on SceneObject (added by specExpander):
 *   polygonPoints: string   (SVG points format: "x1,y1 x2,y2 x3,y3")
 */
export function renderPolygon(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  const points = (obj as any).polygonPoints ?? "";

  return React.createElement(
    "div",
    {
      key: obj.id,
      style: wrapperStyle(obj, state, w, h),
    },
    React.createElement(
      "svg",
      {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        style: { overflow: "visible" },
      },
      React.createElement("polygon", {
        points,
        fill: state.color,
        fillOpacity: state.opacity,
        stroke: state.stroke?.color,
        strokeWidth: state.stroke?.width,
      })
    )
  );
}
