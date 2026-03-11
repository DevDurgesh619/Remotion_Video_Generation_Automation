/**
 * Spec VM Types
 *
 * TypeScript types for the Motion Spec JSON format.
 * These types match the actual spec format used in machine_specs_v2/.
 */

// ─── Background ─────────────────────────────────────────────────────────────

export interface GradientBackground {
  type: "gradient";
  from: string;
  to: string;
  direction?: string;
}

/** Background can be a solid color string or a gradient object */
export type Background = string | GradientBackground;

// ─── Shadow ─────────────────────────────────────────────────────────────────

export interface ShadowDefinition {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

// ─── Stroke ─────────────────────────────────────────────────────────────────

export interface StrokeDefinition {
  color: string;
  width: number;
}

// ─── Text Properties ────────────────────────────────────────────────────────

export interface TextDefinition {
  content: string;
  fontSize: number;
  fontWeight?: string;
  textColor: string;
}

// ─── Scene Object ───────────────────────────────────────────────────────────

export interface SceneObject {
  id: string;
  shape: string;

  // Dimensions — shapes use different conventions
  size?: [number, number];       // [width, height] for rectangles, triangles, lines
  diameter?: number;             // for circles

  // Appearance
  color?: string;
  opacity?: number;

  // Position: [x, y] relative to canvas center
  pos?: [number, number];

  // Nested properties
  shadow?: ShadowDefinition;
  stroke?: StrokeDefinition;
  text?: TextDefinition;

  // Media (SVG / image)
  src?: string;

  // Transform defaults
  scale?: number;
  rotation?: number;
}

// ─── Timeline Event ─────────────────────────────────────────────────────────
// Each event animates properties on a target object over a time range.
// Animatable properties are expressed as [from, to] tuples.

export interface TimelineEvent {
  target: string;
  time: [number, number];       // [start_sec, end_sec]
  easing?: string;

  // Scalar animatable properties — each expressed as [from, to]
  opacity?: [number, number];
  scale?: [number, number];
  rotation?: [number, number];
  x?: [number, number];
  y?: [number, number];
  diameter?: [number, number];
  color?: [string, string];

  // Compound animatable properties
  pos?: [[number, number], [number, number]];   // [[fromX, fromY], [toX, toY]]
  size?: [[number, number], [number, number]];   // [[fromW, fromH], [toW, toH]]

  // Nested animatable properties
  shadow?: {
    offsetX?: [number, number];
    offsetY?: [number, number];
    blur?: [number, number];
    color?: [string, string];
  };

  stroke?: {
    color?: [string, string];
    width?: [number, number];
  };

  text?: {
    fontSize?: [number, number];
    fontWeight?: string;
    textColor?: [string, string];
  };
}

// ─── Motion Spec (root) ─────────────────────────────────────────────────────

export interface MotionSpec {
  scene?: string;
  duration: number;
  fps: number;
  canvas?: { w: number; h: number };
  bg?: Background;
  objects: SceneObject[];
  timeline: TimelineEvent[];
}

// ─── Computed state returned per-object per-frame ───────────────────────────

export interface ComputedObjectState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  color: string;
  width: number;
  height: number;
  diameter: number;

  // Nested computed state
  shadow: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  } | null;

  stroke: {
    color: string;
    width: number;
  } | null;

  text: {
    content: string;
    fontSize: number;
    fontWeight: string;
    textColor: string;
  } | null;
}
