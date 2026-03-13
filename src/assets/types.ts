// ─────────────────────────────────────────────────────────────────────────────
// Asset component type definitions
// ─────────────────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

export interface AssetProps {
  /** Asset identifier — must match a key in SVG_ASSETS registry */
  id: string;
  /** Display width in pixels */
  width?: number;
  /** Display height in pixels */
  height?: number;
  /** Override all path fill colors (replaces "currentColor" and any existing fills) */
  color?: string;
  /** Override all path stroke colors */
  stroke?: string;
  /** Override all path stroke widths */
  strokeWidth?: number;
  /** CSS styles applied to the root <svg> element */
  style?: CSSProperties;
  /** Per-path-index color overrides — key is path index (0-based), value is fill color */
  pathColors?: Record<number, string>;
  /** Per-path-index opacity overrides — key is path index (0-based), value is opacity 0-1 */
  pathOpacity?: Record<number, number>;
}
