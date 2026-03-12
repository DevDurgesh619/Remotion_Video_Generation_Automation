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

// ─── Glow ────────────────────────────────────────────────────────────────────

export interface GlowDefinition {
  blur: number;       // px spread of the glow
  intensity: number;  // 0-1 opacity multiplier applied to the glow color
  color: string;      // CSS color string
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
  glow?: GlowDefinition;

  // Media (SVG / image)
  src?: string;

  // Transform defaults
  scale?: number;
  rotation?: number;

  // Layout & rendering hints
  anchor?: "center" | "bottom" | "left" | "top" | "right";
  fill?: boolean;                // false = outline-only (uses stroke)
  facing?: "up" | "down" | "left" | "right";  // triangle direction
  cornerRadius?: number;
  zIndex?: number;

  // Scene graph — parent-child transform hierarchy
  parent?: string;               // ID of parent object; child world pos = parent world pos + localPos
  localPos?: [number, number];   // position relative to parent (used when parent is set)

  // Asset reference — used with shape: "asset"
  assetId?: string;              // look up in assetRegistry for src + default size
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

  // Individual dimension animations (used by bar charts, etc.)
  width?: [number, number];
  height?: [number, number];

  // Directional scaling
  scaleX?: [number, number];
  scaleY?: [number, number];

  // Shape property animations
  cornerRadius?: [number, number];

  // Compound animatable properties
  pos?: [[number, number], [number, number]];   // [[fromX, fromY], [toX, toY]]
  size?: [[number, number], [number, number]];   // [[fromW, fromH], [toW, toH]]

  // Repeat — plays the animation segment N additional times (ping-pong style).
  // repeat: 1  → plays twice (original + 1 reverse)
  // repeat: "infinite" → loops until spec duration ends
  repeat?: number | "infinite";

  // Behavior shorthand — resolved by behaviorExpander before the spec reaches SpecVM.
  // Example: { "target": "hero", "time": [0, 1.5], "behavior": "slide-in-left", "params": { "distance": 400 } }
  behavior?: string;
  params?: Record<string, number | string | boolean>;

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

  glow?: {
    blur?: [number, number];
    intensity?: [number, number];
    color?: [string, string];
  };
}

// ─── Generator Types ───────────────────────────────────────────────────────
// Generators allow compact, data-driven scene descriptions.
// The specExpander deterministically expands generators into objects + timeline.

export interface ChartLayoutArea {
  x: number;       // left edge x (relative to canvas center)
  y: number;       // top edge y (relative to canvas center)
  width: number;
  height: number;
}

export interface ChartAxisConfig {
  min?: number;
  max?: number;
  step?: number;
  label?: string | null;
  labelColor?: string;
  labelFontSize?: number;
}

export interface ChartTitleConfig {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
}

export interface ChartLegendConfig {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  show?: boolean;
}

export interface ChartGridlineConfig {
  color?: string;
  opacity?: number;
  show?: boolean;
}

export interface ChartAnimationConfig {
  style?: "staggered_grow" | "sequential_reveal" | "simultaneous" | "cascade_left" | "cascade_right";
  staggerDelay?: number;
  growDuration?: number;
  easing?: string;
  labelReveal?: "fade_after_bar" | "fade_with_bar" | "none";
  startTime?: number;
}

export interface DataSeries {
  name: string;
  color: string;
  values: number[];
}

// ─── Bar Chart Generator ───────────────────────────────────────────────────

export interface BarChartGenerator {
  type: "barChart";
  id: string;
  variant?: "regular" | "stacked" | "grouped";
  layout: {
    area: ChartLayoutArea;
    barWidth?: number;
    barGap?: number;
    groupGap?: number;
  };
  data: {
    categories: string[];
    series: DataSeries[];
  };
  axes?: {
    x?: ChartAxisConfig;
    y?: ChartAxisConfig;
  };
  title?: ChartTitleConfig;
  legend?: ChartLegendConfig;
  gridlines?: ChartGridlineConfig;
  valueLabels?: { show?: boolean; fontSize?: number; color?: string };
  animation?: ChartAnimationConfig;
}

// ─── Line Chart Generator ──────────────────────────────────────────────────

export interface LineChartGenerator {
  type: "lineChart";
  id: string;
  layout: {
    area: ChartLayoutArea;
  };
  data: {
    categories: string[];
    series: DataSeries[];
  };
  markers?: {
    shape?: "circle" | "square";
    diameter?: number;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
  valueLabels?: { show?: boolean; fontSize?: number; color?: string };
  axes?: {
    x?: ChartAxisConfig;
    y?: ChartAxisConfig;
  };
  title?: ChartTitleConfig;
  gridlines?: ChartGridlineConfig;
  animation?: ChartAnimationConfig;
}

// ─── Pie Chart Generator ───────────────────────────────────────────────────

export interface PieChartGenerator {
  type: "pieChart";
  id: string;
  layout: {
    center?: [number, number];
    radius?: number;
    innerRadius?: number;       // >0 for donut chart
  };
  data: {
    segments: Array<{
      label: string;
      value: number;
      color: string;
    }>;
  };
  title?: ChartTitleConfig;
  legend?: ChartLegendConfig;
  valueLabels?: { show?: boolean; fontSize?: number; color?: string; format?: "value" | "percent" };
  animation?: ChartAnimationConfig;
}

// ─── StatGrid Generator ─────────────────────────────────────────────────────

export interface StatGridStat {
  value: string;          // display value ("$2.4M", "12,400", "98%")
  label: string;          // card label
  iconId?: string;        // assetRegistry ID for an icon above the value
  color?: string;         // accent color for value text and top strip
  bgColor?: string;       // card background (default: translucent white)
  changeText?: string;    // e.g. "+12% MoM" shown below label
  changePositive?: boolean; // true → green, false → red, default true
}

export interface StatGridGenerator {
  type: "statGrid";
  id: string;
  layout: {
    area: ChartLayoutArea;
    columns?: number;       // cards per row (default: min(stats.length, 4))
    cardWidth?: number;     // px (default: auto-fit from area)
    cardHeight?: number;    // px (default: 280)
    cardGap?: number;       // gap between cards (default: 20)
  };
  stats: StatGridStat[];
  title?: ChartTitleConfig;
  textColor?: string;
  animation?: ChartAnimationConfig;
}

// ─── ProcessFlow Generator ──────────────────────────────────────────────────

export interface ProcessStep {
  number?: string;        // display number/label inside circle (default: auto "1", "2" …)
  title: string;
  description?: string;
  color?: string;         // override default stepColor for this step
}

export interface ProcessFlowGenerator {
  type: "processFlow";
  id: string;
  layout: {
    area: ChartLayoutArea;
    direction?: "horizontal" | "vertical"; // default: "horizontal"
    boxWidth?: number;
    boxHeight?: number;
  };
  steps: ProcessStep[];
  stepColor?: string;     // default box fill color
  arrowColor?: string;    // color of → or ↓ connectors
  textColor?: string;
  animation?: ChartAnimationConfig;
}

// ─── Comparison Generator ───────────────────────────────────────────────────

export interface ComparisonFeature {
  label: string;
  a: boolean | string;    // true → ✓, false → ✗, string → custom text
  b: boolean | string;
}

export interface ComparisonGenerator {
  type: "comparison";
  id: string;
  layout: {
    area: ChartLayoutArea;
    rowHeight?: number;           // px per feature row (default: 60)
    featureLabelWidth?: number;   // px for the left label column (default: 40% of area width)
  };
  columnA: { title: string; titleColor?: string; bgColor?: string };
  columnB: { title: string; titleColor?: string; bgColor?: string };
  features: ComparisonFeature[];
  textColor?: string;
  checkColor?: string;    // default: "#4CAF50"
  crossColor?: string;    // default: "#F44336"
  animation?: ChartAnimationConfig;
}

// ─── Timeline Generator ─────────────────────────────────────────────────────
// NOTE: Individual timeline events are called TimelineEntry to avoid conflict
// with the animation TimelineEvent type.

export interface TimelineEntry {
  date: string;
  label: string;
  description?: string;
  color?: string;         // dot + date color override
}

export interface TimelineGenerator {
  type: "timeline";
  id: string;
  layout: {
    area: ChartLayoutArea;
    direction?: "horizontal" | "vertical"; // default: "horizontal"
    dotRadius?: number;                    // default: 10
  };
  events: TimelineEntry[];
  lineColor?: string;     // default: "rgba(255,255,255,0.4)"
  dotColor?: string;      // default: "#2196F3"
  textColor?: string;     // default: "#FFFFFF"
  animation?: ChartAnimationConfig;
}

// ─── Component Instance ─────────────────────────────────────────────────────
// Referenced by the `components` array in MotionSpec.
// componentExpander resolves each instance using componentLibrary.

export interface ComponentInstance {
  componentType: string;                                   // registered name in componentLibrary
  id: string;                                              // unique ID prefix for generated objects
  pos?: [number, number];                                  // canvas-center position
  params?: Record<string, string | number | boolean>;     // template-specific parameters
}

// ─── Generator Union ───────────────────────────────────────────────────────

export type GeneratorDefinition =
  | BarChartGenerator
  | LineChartGenerator
  | PieChartGenerator
  | StatGridGenerator
  | ProcessFlowGenerator
  | ComparisonGenerator
  | TimelineGenerator;

// ─── Motion Spec (root) ─────────────────────────────────────────────────────

export interface MotionSpec {
  scene?: string;
  duration: number;
  fps: number;
  canvas?: { w: number; h: number };
  bg?: Background;
  generators?: GeneratorDefinition[];
  components?: ComponentInstance[];   // expanded by componentExpander before sceneGraphResolver
  objects: SceneObject[];
  timeline: TimelineEvent[];
}

// ─── Computed state returned per-object per-frame ───────────────────────────

export interface ComputedObjectState {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  color: string;
  width: number;
  height: number;
  diameter: number;
  cornerRadius: number;

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

  glow: GlowDefinition | null;
}
