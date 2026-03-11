/**
 * Shape Renderers
 *
 * Each renderer takes a SceneObject + ComputedObjectState and returns a
 * positioned React element. All positioning uses absolute + transform so
 * the coordinate system has (0, 0) at canvas centre.
 */

import React from "react";
import type { SceneObject, ComputedObjectState } from "./types";

// ─── Shared helpers ─────────────────────────────────────────────────────────

function buildTransform(state: ComputedObjectState): string {
  const parts: string[] = [
    `translate(${state.x}px, ${state.y}px)`,
  ];
  if (state.scale !== 1) parts.push(`scale(${state.scale})`);
  if (state.rotation !== 0) parts.push(`rotate(${state.rotation}deg)`);
  return parts.join(" ");
}

function buildBoxShadow(state: ComputedObjectState): string | undefined {
  if (!state.shadow) return undefined;
  const { offsetX, offsetY, blur, color } = state.shadow;
  return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
}

/**
 * Wrapper style common to all renderers.
 * It positions the object with its centre at (canvasW/2 + x, canvasH/2 + y).
 */
function wrapperStyle(state: ComputedObjectState): React.CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: buildTransform(state),
    opacity: state.opacity,
  };
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
      ...wrapperStyle(state),
      width: d,
      height: d,
      marginLeft: -d / 2,
      marginTop: -d / 2,
      borderRadius: "50%",
      backgroundColor: state.color,
      boxShadow: buildBoxShadow(state),
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
      ...wrapperStyle(state),
      width: side,
      height: side,
      marginLeft: -side / 2,
      marginTop: -side / 2,
      backgroundColor: state.color,
      boxShadow: buildBoxShadow(state),
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
      ...wrapperStyle(state),
      width: w,
      height: h,
      marginLeft: -w / 2,
      marginTop: -h / 2,
      backgroundColor: state.color,
      boxShadow: buildBoxShadow(state),
    },
  });
}

// ─── Triangle ───────────────────────────────────────────────────────────────

export function renderTriangle(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;

  return React.createElement("div", {
    key: obj.id,
    style: {
      ...wrapperStyle(state),
      width: 0,
      height: 0,
      marginLeft: -w / 2,
      marginTop: -h / 2,
      borderLeft: `${w / 2}px solid transparent`,
      borderRight: `${w / 2}px solid transparent`,
      borderBottom: `${h}px solid ${state.color}`,
    },
  });
}

// ─── Line ───────────────────────────────────────────────────────────────────

export function renderLine(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;
  const strokeWidth = state.stroke?.width ?? 2;
  const strokeColor = state.stroke?.color ?? state.color;

  // A line is just a narrow rectangle. If both w and h are 0,
  // fall back to a dot.
  const lineW = Math.max(w, strokeWidth);
  const lineH = Math.max(h, strokeWidth);

  return React.createElement("div", {
    key: obj.id,
    style: {
      ...wrapperStyle(state),
      width: lineW,
      height: lineH,
      marginLeft: -lineW / 2,
      marginTop: -lineH / 2,
      backgroundColor: strokeColor,
    },
  });
}
