// ─────────────────────────────────────────────────────────────────────────────
// ASSET COMPONENT — Renders SVG assets from the registry.
// Used by GeneratedMotion to display real-world objects (rocket, car, etc.)
// instead of basic geometric shapes.
//
// Supports: color overrides, stroke overrides, per-path color/opacity control,
// and standard CSS positioning/transform for animation.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { SVG_ASSETS } from "./registry";
import type { AssetProps } from "./types";

export const Asset: React.FC<AssetProps> = ({
  id,
  width = 100,
  height = 100,
  color,
  stroke,
  strokeWidth,
  style,
  pathColors,
  pathOpacity,
}) => {
  const asset = SVG_ASSETS[id];
  if (!asset) return null;

  const children = asset.paths.map((p, i) => {
    // Determine fill: pathColors override > global color override > original fill
    let fill = p.fill || "currentColor";
    if (color) {
      fill = fill === "none" ? "none" : color;
    }
    if (pathColors && pathColors[i] !== undefined) {
      fill = pathColors[i];
    }

    // Determine stroke
    let pathStroke = p.stroke;
    if (stroke) {
      pathStroke = stroke;
    }

    // Determine stroke width
    let pathStrokeWidth = p.strokeWidth;
    if (strokeWidth !== undefined) {
      pathStrokeWidth = strokeWidth;
    }

    // Determine opacity
    let opacity: number | undefined = p.opacity;
    if (pathOpacity && pathOpacity[i] !== undefined) {
      opacity = pathOpacity[i];
    }

    const pathProps: Record<string, unknown> = {
      key: i,
      d: p.d,
      fill: fill,
    };

    if (pathStroke) pathProps.stroke = pathStroke;
    if (pathStrokeWidth) pathProps.strokeWidth = pathStrokeWidth;
    if (opacity !== undefined) pathProps.opacity = opacity;
    if (p.fillRule) pathProps.fillRule = p.fillRule;
    if (p.clipRule) pathProps.clipRule = p.clipRule;

    return React.createElement("path", pathProps);
  });

  return React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: asset.viewBox,
      width: width,
      height: height,
      style: style,
    },
    ...children
  );
};
