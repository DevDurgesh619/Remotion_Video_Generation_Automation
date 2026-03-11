/**
 * Media Renderers
 *
 * Renderers for non-shape object types: SVG, image, and text.
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

// ─── SVG renderer ───────────────────────────────────────────────────────────

export function renderSVG(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;

  return React.createElement("img", {
    key: obj.id,
    src: obj.src,
    style: {
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      transform: buildTransform(state),
      width: w,
      height: h,
      marginLeft: -w / 2,
      marginTop: -h / 2,
      opacity: state.opacity,
      objectFit: "contain" as const,
    },
  });
}

// ─── Image renderer ─────────────────────────────────────────────────────────

export function renderImage(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const w = state.width;
  const h = state.height;

  return React.createElement("img", {
    key: obj.id,
    src: obj.src,
    style: {
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      transform: buildTransform(state),
      width: w,
      height: h,
      marginLeft: -w / 2,
      marginTop: -h / 2,
      opacity: state.opacity,
      objectFit: "cover" as const,
    },
  });
}

// ─── Text renderer ──────────────────────────────────────────────────────────

export function renderText(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const textDef = state.text ?? {
    content: obj.text?.content ?? "",
    fontSize: 16,
    fontWeight: "normal",
    textColor: state.color,
  };

  return React.createElement(
    "div",
    {
      key: obj.id,
      style: {
        position: "absolute" as const,
        left: "50%",
        top: "50%",
        transform: buildTransform(state),
        // Let the text size itself naturally; translate handles positioning
        whiteSpace: "nowrap" as const,
        fontSize: textDef.fontSize,
        fontWeight: textDef.fontWeight,
        color: textDef.textColor,
        opacity: state.opacity,
        // Centre the text element itself on the coordinate
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    textDef.content,
  );
}
