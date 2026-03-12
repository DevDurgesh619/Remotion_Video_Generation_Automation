// ─── Motion Knowledge Base ──────────────────────────────────────────────────
// Expert animation principles used by the prompt expander to generate
// high-quality Motion Briefs from simple user prompts.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Color Palettes ─────────────────────────────────────────────────────────

export const PALETTE_PRESETS = {
  vibrant: {
    bg: "#0d1117",
    colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"],
  },
  neon: {
    bg: "#0a0a1a",
    colors: ["#00F5FF", "#FF00E5", "#39FF14", "#FFD700", "#FF4500"],
  },
  pastel: {
    bg: "#F8F9FA",
    colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E8BAFF"],
  },
  corporate: {
    bg: "#FFFFFF",
    colors: ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336"],
  },
  darkModern: {
    bg: "#1a1a2e",
    colors: ["#e94560", "#0f3460", "#533483", "#16213e", "#FFD700"],
  },
  ocean: {
    bg: "#0D1B2A",
    colors: ["#1B98E0", "#00B4D8", "#48CAE4", "#90E0EF", "#ADE8F4"],
  },
  sunset: {
    bg: "#1a0a2e",
    colors: ["#FF6B35", "#F7C59F", "#E8505B", "#FFD166", "#06D6A0"],
  },
  monochrome: {
    bg: "#111111",
    colors: ["#FFFFFF", "#CCCCCC", "#999999", "#666666", "#333333"],
  },
};

// ─── Layout Presets ─────────────────────────────────────────────────────────

export const LAYOUT_PRESETS = {
  // Semantic positions → pixel coordinates (canvas center = 0,0)
  positions: {
    center: [0, 0],
    "left-third": [-300, 0],
    "right-third": [300, 0],
    "top-center": [0, -200],
    "bottom-center": [0, 200],
    "top-left": [-350, -200],
    "top-right": [350, -200],
    "bottom-left": [-350, 200],
    "bottom-right": [350, 200],
  },

  // Semantic sizes → pixel values
  sizes: {
    tiny: { diameter: 40, size: [40, 40] },
    small: { diameter: 70, size: [70, 70] },
    medium: { diameter: 120, size: [120, 120] },
    large: { diameter: 180, size: [180, 180] },
    xlarge: { diameter: 280, size: [280, 280] },
  },

  // Common arrangements for N objects
  arrangements: {
    2: "horizontal-spread",
    3: "horizontal-even",
    4: "grid-2x2",
    5: "pentagon-circular",
    6: "grid-2x3",
    8: "circular",
    12: "clock-positions",
  },
};

// ─── Duration Guidelines ────────────────────────────────────────────────────

export const DURATION_GUIDELINES = {
  simple: { min: 4, max: 6, description: "1-2 objects, basic motion" },
  medium: { min: 6, max: 8, description: "3-5 objects, coordinated motion" },
  complex: { min: 8, max: 12, description: "6+ objects, choreographed sequences" },
  dataViz: { min: 8, max: 14, description: "charts, graphs, data-driven" },
  infographic: { min: 10, max: 16, description: "dashboards, KPI displays" },
  loading: { min: 3, max: 5, description: "spinners, loaders (looping feel)" },
};

// ─── Animation Principles ───────────────────────────────────────────────────
// These are embedded directly into the system prompt as expert knowledge.

export const ANIMATION_PRINCIPLES = `
## ANIMATION DESIGN PRINCIPLES

You are an expert motion graphics director. Apply these principles when
expanding user prompts into Motion Briefs.

### A. ENTRANCE PATTERNS
- Default entrance: fade-in + slight scale (0.9→1) over 0.5-0.8s, ease-out-cubic
- Impactful entrance: bounce-in (scale overshoot 0→1.15→1)
- Directional entrance: slide-in from the direction that matches the narrative
- Staggered group entrance: each item enters 0.15-0.3s after the previous
- NEVER start more than 4-5 objects simultaneously — always stagger groups
- First object should appear within 0.3s of video start (no long blank openings)

### B. MOTION QUALITY RULES
- "bouncing" → vertical y oscillation with bounce easing, staggered timing for wave effect
- "spinning" → rotation 0-360°, ease-in-out for organic feel, linear for mechanical
- "pulsing" / "breathing" → scale 1→1.08→1 with ease-in-out, 1-2s per cycle
- "floating" → slow y oscillation (20-30px amplitude) over 2-3s, ease-in-out
- "shaking" → rapid x oscillation (10-20px), 4-6 cycles in 0.5s
- "growing" → scale from 0 to 1 or height from 0 to target, ease-out
- "orbiting" → use x/y position animation in circular path
- Objects should NEVER stop abruptly — always use easing curves
- Minimum animation duration: 0.3s (anything shorter looks like a glitch)
- Hold final state for at least 1s before video ends

### C. CHOREOGRAPHY PATTERNS
Every animation should have 3 phases:
1. ENTRANCE (15-25% of duration): Objects appear on screen
2. MAIN ACTION (50-65% of duration): The core motion/effect the user requested
3. HOLD or EXIT (15-25% of duration): Final state holds, or graceful exit

For multi-object scenes:
- Use staggered timing to create rhythm (0.15-0.3s between objects)
- Create visual hierarchy — hero element enters first or most prominently
- Related objects should move together or in coordinated patterns
- Contrast: mix fast and slow, big and small motions

### D. LAYOUT RULES
- 2-3 objects: space evenly across center third (-300 to 300 on x-axis)
- 4+ objects: grid layout or circular arrangement
- Text always above or below visual elements, never overlapping shapes
- Leave 60px minimum padding from canvas edges
- Vertical center of interest slightly above canvas center (y: -40 to -80)
- For data visualizations: title at top, chart in center, legend below or right

### E. COLOR & STYLE
- Default to dark backgrounds (#0d1117, #1a1a2e) for modern, professional look
- Use 2-4 accent colors maximum from a harmonious palette
- White text on dark backgrounds, dark grey (#333) text on light backgrounds
- Related objects share color family; contrasting objects use complementary colors
- Add subtle glow effects on key elements for premium feel
- For data viz: use distinct, readable colors for each data series

### F. DURATION SELECTION
- Simple (1-2 objects): 4-6 seconds
- Medium (3-5 objects): 6-8 seconds
- Complex (6+ objects or data viz): 8-12 seconds
- Infographics/dashboards: 10-16 seconds
- Loading animations: 3-5 seconds (with repeat/loop feel)
- Always add 1-2s hold at the end before the video ends

### G. MOTION SEMANTICS — COMMON PROMPT INTERPRETATIONS
When the user says...
- "bouncing" → vertical bounce with bounce easing, wave stagger if multiple
- "spinning" → continuous rotation animation
- "loading" / "spinner" → circular arrangement, sequential opacity/scale
- "explosion" / "burst" → objects fly outward from center with ease-out
- "merge" / "combine" → objects move toward center, overlap
- "wave" → objects oscillate with staggered timing
- "zoom" → scale animation from small to large (or large to small)
- "slide" → horizontal or vertical position animation
- "reveal" → fade-in or grow-from-center, often staggered
- "sparkle" / "twinkle" → opacity cycling with stagger
- "shake" → rapid small x oscillation
- "grow" → scale or height/width animation from 0 to target
- "chart" / "graph" → data visualization with sequential bar/line reveal
- "dashboard" → multiple KPI cards, charts, progress bars
- "logo" → dramatic entrance with glow, scale overshoot, premium feel

### H. DATA VISUALIZATION PATTERNS
When intent is data visualization:
- Prefer using generators (barChart, lineChart, pieChart) for compact specs
- If user mentions specific data, include it; otherwise invent plausible sample data
- Title appears first (0-0.5s), then axes (0.5-1s), then data elements (1s+)
- Value labels appear AFTER their visual element finishes growing
- Use staggered animation for each data point/bar
- Include legends, axis labels, and gridlines for polished look

### I. AVAILABLE BEHAVIORS (use in choreography descriptions)
The runtime supports these behavior shortcuts — prefer them over raw descriptions:
- fade-in, fade-out — opacity transitions
- grow-from-center — scale 0→1 + opacity 0→1
- bounce-in — scale overshoot + opacity reveal
- slide-in-left, slide-in-right, slide-in-top, slide-in-bottom — directional slides
- pulse — breathing scale loop
- shake — horizontal oscillation

### J. AVAILABLE GENERATORS (for data visualization intents)
When the intent is data_visualization or infographic, recommend generators:
- barChart — vertical or horizontal bar charts with grouped/stacked bars
- lineChart — line charts with data points and markers
- pieChart — pie or donut charts with segments
- statGrid — KPI stat cards in a grid layout
- processFlow — step-by-step pipeline with arrows
`;
