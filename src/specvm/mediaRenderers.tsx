/**
 * Media Renderers
 *
 * Renderers for non-shape object types: SVG, image, and text.
 * Uses shared helpers from renderHelpers.ts for consistent positioning.
 */

import React from "react";
import { Img, staticFile } from "remotion";
import type { SceneObject, ComputedObjectState } from "./types";
import { buildTransform } from "./renderHelpers";
import { getAsset } from "./assetRegistry";

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
      zIndex: obj.zIndex ?? undefined,
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
      zIndex: obj.zIndex ?? undefined,
    },
  });
}

// ─── Asset renderer ─────────────────────────────────────────────────────────

/**
 * Renders an object with shape: "asset".
 * Looks up the asset in the registry via obj.assetId to resolve src and default size.
 * Falls back to obj.src if assetId is absent or unknown.
 * Uses the registry's defaultSize when the spec provides no explicit `size`.
 */
export function renderAsset(
  obj: SceneObject,
  state: ComputedObjectState,
): React.ReactElement {
  const assetDef = obj.assetId ? getAsset(obj.assetId) : undefined;

  if (!assetDef && !obj.src) {
    console.warn(
      `[SpecVM] Asset object "${obj.id}" has no assetId or src — rendering placeholder.`,
    );
  }

  const rawSrc = assetDef?.src ?? obj.src ?? "";
  // staticFile() resolves public/ assets correctly in both dev and headless render
  const src = staticFile(rawSrc.replace(/^\//, ""));

  // Use asset default size only when the spec omits an explicit size/diameter
  const defaultW = assetDef?.defaultSize[0] ?? 100;
  const defaultH = assetDef?.defaultSize[1] ?? 100;
  const w = obj.size ? state.width : defaultW;
  const h = obj.size ? state.height : defaultH;

  return React.createElement(Img, {
    key: obj.id,
    src,
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
      zIndex: obj.zIndex ?? undefined,
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

  // Text rendering strategy:
  // - Outer div: positioned at canvas center, translated to obj pos via transform
  // - The outer div has zero width/height so it's just a positioning anchor
  // - Inner div: uses transform translate(-50%, -50%) to center text ON the point
  // This ensures text is visually centered on its pos coordinate regardless of text length

  return React.createElement(
    "div",
    {
      key: obj.id,
      style: {
        position: "absolute" as const,
        left: "50%",
        top: "50%",
        transform: buildTransform(state),
        opacity: state.opacity,
        zIndex: obj.zIndex ?? undefined,
        // Zero-size anchor point
        width: 0,
        height: 0,
        overflow: "visible" as const,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          // Center the text on the anchor point
          transform: "translate(-50%, -50%)",
          whiteSpace: "pre-wrap" as const,
          fontSize: textDef.fontSize,
          fontWeight: textDef.fontWeight,
          color: textDef.textColor,
          textAlign: "center" as const,
          lineHeight: 1.3,
          // Prevent text from wrapping to a tiny width
          width: "max-content" as const,
        },
      },
      textDef.content,
    ),
  );
}

