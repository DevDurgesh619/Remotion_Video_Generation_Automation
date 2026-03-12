# Deep Architectural Analysis & Improvement Plan for Shape-Motion-Lab

## Context

The shape-motion-lab system generates deterministic motion graphics videos from natural language prompts via the pipeline: **Prompt → LLM (GPT-4o) → MotionSpec JSON → SpecVM Runtime → Remotion → MP4**.

The SpecVM runtime (9 files, ~850 lines in `src/specvm/`) is architecturally sound for basic shape animations. However, **data-driven scenes (charts, infographics) cause combinatorial spec explosion** that overwhelms both the LLM and the spec format. This plan addresses the root cause and designs a scalable architecture for Phase 3.

---

## 1. Root Cause Analysis

### The Core Problem: Flat Object Model for Data-Driven Scenes

The MotionSpec format has no concept of **data-driven repetition or layout computation**. Every visual element must be an individual object with hand-calculated pixel positions.

**Evidence from actual specs:**

| Spec | Scene Type | Objects | Timeline Events | Lines | Root Cause |
|------|-----------|---------|----------------|-------|------------|
| spec_154 | Stacked bar chart | 34 | 36 | 970 | 4 quarters × 3 series = 12 bars + 12 value labels + axis labels + gridlines |
| spec_157 | Line chart | 44 | 57 | 1489 | 11 data points → 11 markers + 11 labels + 12 x-labels + y-labels + gridlines + pulse effects |
| spec_159 | Area chart | 28 | 33 | 825 | 12 data points → 12 markers + 12 labels + axes |

**Why this fails:**
1. **Spec bloat**: A simple 4-category bar chart produces 970 lines of JSON. The LLM must generate and maintain all of it
2. **LLM spatial math errors**: The LLM must compute pixel positions for every marker, label, and bar segment — spatial math it's unreliable at
3. **Timeline explosion**: N data points × M animation phases = N×M near-identical timeline events
4. **No domain knowledge**: The system doesn't know what a "bar chart" is — only rectangles at positions
5. **Missing primitives**: No polyline/path for line charts, no arc for pie charts, no polygon for area fills — charts are approximated with rectangles and circles

### What Works Well (Don't Break These)
- Basic shape animations (Level 1.0/1.1): clean, small specs
- SpecVM runtime: deterministic, crash-resistant, extensible registry
- Sparse spec format: 80-90% reduction vs v1 dense schema
- Validation + normalization layers
- Anchor system for bar charts

---

## 2. Recommended Architecture: Semantic Spec Layer + Chart Renderers

### Approach: Two-Tier Spec with Deterministic Expansion

The LLM generates a **semantic spec** (intent + data), and deterministic code expands it into the existing flat MotionSpec format before the SpecVM processes it.

**Why this approach over alternatives:**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| A. Domain generators | Small specs, domain-aware layout | Each chart type = new code | **Selected** (combined into D) |
| B. Templates/repeaters | General purpose | LLM still computes positions | Rejected |
| C. Composite shape renderers | Minimal spec | Bypasses timeline system, two rendering paradigms | Partially selected (for SVG shapes) |
| D. Semantic spec layer | Cleanest separation, LLM never computes pixels | Most complex to build | **Selected** |

The recommended architecture combines D (semantic expansion) with C (SVG renderers for curves/arcs):

```
LLM generates Semantic Spec (compact)
         │
         ▼
  specExpander.ts  ──── deterministic expansion
         │
         ▼
  Flat MotionSpec (auto-generated objects + timeline)
         │
         ▼
  validateSpec → normalizeSpec → SpecPlayer (existing, unchanged)
```

### What the LLM Generates (Before vs After)

**BEFORE — spec_154 stacked bar chart (970 lines):**
```json
{
  "objects": [
    { "id": "bar_q1_cloud", "shape": "rectangle", "size": [80, 0], "color": "#2196F3", "pos": [-450, 405], "anchor": "bottom" },
    { "id": "bar_q1_licensing", "shape": "rectangle", "size": [80, 0], "color": "#4CAF50", "pos": [-450, 345], "anchor": "bottom" },
    // ... 32 more objects, each with manually calculated positions ...
  ],
  "timeline": [
    { "target": "bar_q1_cloud", "time": [1, 1.3], "height": [0, 60] },
    { "target": "bar_q1_licensing", "time": [1.3, 1.5], "height": [0, 35] },
    // ... 34 more identical-pattern events ...
  ]
}
```

**AFTER — same chart (~45 lines):**
```json
{
  "scene": "stacked_bar_chart_revenue",
  "duration": 11,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#1a237e",
  "generators": [
    {
      "type": "barChart",
      "id": "revenue_chart",
      "variant": "stacked",
      "layout": { "area": { "x": -450, "y": -400, "width": 1200, "height": 700 }, "barWidth": 80 },
      "data": {
        "categories": ["Q1", "Q2", "Q3", "Q4"],
        "series": [
          { "name": "Cloud", "color": "#2196F3", "values": [45, 55, 65, 70] },
          { "name": "Licensing", "color": "#4CAF50", "values": [20, 18, 22, 25] },
          { "name": "Services", "color": "#9C27B0", "values": [8, 10, 12, 15] }
        ]
      },
      "axes": { "y": { "min": 0, "max": 160, "step": 40 }, "x": { "labelColor": "#FFFFFF" } },
      "title": { "text": "Revenue by Stream", "color": "#FFFFFF", "fontSize": 32 },
      "animation": { "style": "staggered_grow", "staggerDelay": 0.3, "easing": "ease-out-cubic" }
    }
  ],
  "objects": [],
  "timeline": []
}
```

**Reduction: 970 lines → ~45 lines. LLM specifies data + style, code computes all positions.**

Non-chart specs are completely unchanged (backward compatible).

---

## 3. PLAN 1 — Fix Current System: Implementation Roadmap

### Step 1: Extend Type System
**File:** [types.ts](src/specvm/types.ts)
- Add `GeneratorDefinition` union type (`BarChartGenerator | LineChartGenerator | PieChartGenerator`)
- Add `generators?: GeneratorDefinition[]` to `MotionSpec`
- Each generator type has: `type`, `id`, `layout`, `data`, `axes`, `title`, `animation`
- Animation presets: `"staggered_grow"`, `"sequential_reveal"`, `"simultaneous"`, `"cascade_left"`

### Step 2: Create Spec Expander (core new component)
**File:** `src/specvm/specExpander.ts` (NEW)
- Main function: `expandSpec(spec: MotionSpec): MotionSpec`
- No-op when `generators` is absent (backward compatible)
- Per-generator layout engines:
  - `expandBarChart()` — handles regular, stacked, grouped variants
    - Computes bar positions from data values + layout area
    - Generates y-axis scale mapping (value → pixel)
    - Computes stacking offsets for stacked bars
    - Creates bar objects with `anchor: "bottom"`, label objects, axis objects, gridlines
    - Generates timeline events based on animation preset
  - `expandLineChart()` — generates marker circles + value labels at computed positions
  - `expandPieChart()` — generates arc objects (requires new renderer)
- Merges generated objects/timeline with any manually-specified ones

### Step 3: Add SVG-Based Chart Renderers
**File:** `src/specvm/chartRenderers.tsx` (NEW)
- `renderPolyline` — SVG `<polyline>` for line charts with stroke-dasharray animation
- `renderPolygon` — SVG `<polygon>` for area chart fills
- `renderArc` — SVG arc path for pie/donut chart segments
- All use the same `wrapperStyle()` positioning system from [renderHelpers.ts](src/specvm/renderHelpers.ts)

**File:** [rendererRegistry.ts](src/specvm/rendererRegistry.ts)
- Register: `polyline`, `polygon`, `arc` shape types

### Step 4: Integrate into Pipeline
**File:** [SpecPlayer.tsx](src/specvm/SpecPlayer.tsx)
- Add `expandSpec()` as first step in the `useMemo` pipeline:
  ```
  spec → expandSpec() → validateSpec() → normalizeSpec() → render
  ```
- One line addition to existing code

### Step 5: Update LLM Prompts
**File:** [convertToSpec.js](scripts/convertToSpec.js)
- Add few-shot examples showing generator-based specs for charts
- Add prompt classifier: if prompt mentions "chart", "graph", "data" → include generator examples
- Keep existing few-shot examples for shape animations

### Step 6: Validation
- Write unit tests for each layout engine (barChart, lineChart, pieChart)
- Compare expanded output against existing hand-crafted specs (spec_154, spec_157, spec_159)
- Render expanded specs and visually compare to existing videos
- Test backward compatibility: all existing specs render identically

---

## 4. PLAN 2 — Phase 3 Architecture: Multi-Domain Scalable System

### 4.1 Scene Graph (Parent-Child Transforms)

**Problem:** Currently all objects are positioned independently. A label can't "follow" a moving marker. A product's components can't move as a group.

**Solution:** Add optional `parent` field to `SceneObject`:
```typescript
interface SceneObject {
  // ... existing fields ...
  parent?: string;           // ID of parent object
  localPos?: [number, number]; // position relative to parent
}
```

**Implementation in** [animationRuntime.ts](src/specvm/animationRuntime.ts):
- After computing child state, add parent's computed `x,y` to child's `x,y`
- Simple additive 2D transform (no matrix math)
- Rendering order: depth-first tree traversal in SpecPlayer

### 4.2 Asset Registry

**File:** `src/specvm/assetRegistry.ts` (NEW)
```typescript
const assets = {
  "rocket": { type: "svg", src: "/assets/rocket.svg", defaultSize: [120, 200] },
  "phone":  { type: "svg", src: "/assets/phone.svg",  defaultSize: [180, 360] },
  "car":    { type: "svg", src: "/assets/car.svg",     defaultSize: [300, 150] }
};
```

Spec usage:
```json
{ "id": "hero_rocket", "shape": "asset", "assetId": "rocket", "pos": [0, 100], "scale": 1.5 }
```

The existing SVG renderer can handle this with a registry lookup for `src`.

### 4.3 Animation Behavior Library

**File:** `src/specvm/behaviorLibrary.ts` (NEW)

Predefined motion patterns the LLM can reference by name instead of specifying raw keyframes:

```json
{ "target": "rocket", "time": [0, 2], "behavior": "slide-in-left", "params": { "distance": 400 } }
```

Core behaviors: `fade-in`, `fade-out`, `slide-in-{left,right,top,bottom}`, `bounce-in`, `pulse`, `orbit`, `typewriter`, `count-up`, `draw-path`, `shake`, `grow-from-center`

**File:** `src/specvm/behaviorExpander.ts` (NEW)
- Expands behavior references to raw timeline events before SpecVM processes them

### 4.4 Extended Generators (beyond charts)

Add generator types for common infographic patterns:
- `statGrid` — grid of stat cards (icon + number + label)
- `processFlow` — step 1 → step 2 → step 3 with arrows
- `comparison` — side-by-side feature comparison
- `timeline` — horizontal/vertical event timeline

Each gets a layout engine in `specExpander.ts`.

### 4.5 Full Phase 3 Pipeline

```
LLM → Semantic Spec
         │
    behaviorExpander.ts    (behavior refs → raw timeline)
         │
    specExpander.ts        (generators → objects + timeline)
         │
    sceneGraphResolver.ts  (parent-child transform resolution)
         │
    validateSpec → normalizeSpec → SpecPlayer → Remotion → MP4
```

Each step: `MotionSpec → MotionSpec`. Composable, testable, independently debuggable.

### 4.6 How the LLM's Role Changes

| Current Role | New Role |
|---|---|
| Pixel position calculator | Scene director (layout areas, not pixels) |
| Animation value specifier | Behavior selector (names, not keyframes) |
| Object duplicator (34 objects) | Data provider (arrays of values) |
| Coordinate math | Creative decisions (what to show, how to animate) |

---

## 5. Implementation Priority Order

### Phase 2A: Generators (Plan 1) — Estimated 1-2 weeks
1. `types.ts` — generator type definitions
2. `specExpander.ts` — bar chart layout engine first
3. `chartRenderers.tsx` — polyline, polygon, arc renderers
4. `rendererRegistry.ts` — register new renderers
5. `SpecPlayer.tsx` — add expandSpec() to pipeline
6. Add line chart + pie chart layout engines
7. `convertToSpec.js` — update LLM few-shot examples
8. Test against existing specs

### Phase 2B: Behaviors — Estimated 1 week
9. `behaviorLibrary.ts` — 10 core behaviors
10. `behaviorExpander.ts` — expansion logic
11. `types.ts` — add `behavior` + `params` to TimelineEvent
12. Update LLM prompts with behavior examples

### Phase 3A: Scene Graph + Assets — Estimated 2 weeks
13. `types.ts` — add `parent`, `localPos` to SceneObject
14. `animationRuntime.ts` — parent-child transform resolution
15. `SpecPlayer.tsx` — tree traversal rendering
16. `assetRegistry.ts` — initial SVG asset set
17. Register `asset` shape type

### Phase 3B: Extended Generators — Estimated 2 weeks
18. `statGrid`, `processFlow`, `comparison`, `timeline` generators
19. `componentLibrary.ts` — reusable composite components
20. `componentExpander.ts` — component expansion

---

## 6. Key Files Summary

| File | Action | Phase |
|------|--------|-------|
| [src/specvm/types.ts](src/specvm/types.ts) | Modify | 2A |
| `src/specvm/specExpander.ts` | Create | 2A |
| `src/specvm/chartRenderers.tsx` | Create | 2A |
| [src/specvm/rendererRegistry.ts](src/specvm/rendererRegistry.ts) | Modify | 2A |
| [src/specvm/SpecPlayer.tsx](src/specvm/SpecPlayer.tsx) | Modify | 2A |
| [scripts/convertToSpec.js](scripts/convertToSpec.js) | Modify | 2A |
| `src/specvm/behaviorLibrary.ts` | Create | 2B |
| `src/specvm/behaviorExpander.ts` | Create | 2B |
| `src/specvm/assetRegistry.ts` | Create | 3A |
| `src/specvm/sceneGraphResolver.ts` | Create | 3A |
| [src/specvm/animationRuntime.ts](src/specvm/animationRuntime.ts) | Modify | 3A |
| `src/specvm/componentLibrary.ts` | Create | 3B |
| `src/specvm/componentExpander.ts` | Create | 3B |

---

## 7. Verification Plan

### For Plan 1 (Generators)
1. **Unit tests**: Each layout engine produces correct object counts, positions, and timeline events
2. **Regression test**: Expand compact bar chart spec → compare output with existing spec_154 objects/positions
3. **Render test**: `npm run dev` → preview expanded specs in Remotion Studio
4. **Backward compatibility**: All 43 existing v2 specs render identically (no `generators` field = no-op)
5. **Batch test**: Re-run `batchRunner.js` for chart prompts with generator-enabled `convertToSpec.js`

### For Plan 2 (Phase 3)
1. **Scene graph test**: Parent moves → child moves with it. Verify with 2-object parent-child spec
2. **Asset test**: Reference asset by ID → renders correct SVG at correct position
3. **Behavior test**: `"behavior": "bounce-in"` → produces correct timeline events
4. **Integration test**: Full pipeline with semantic spec → expanded → rendered → video output

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Generator schema confuses LLM | LLM generates invalid generators | Keep generator schemas <15 required fields; heavy defaults; few-shot examples |
| Expanded specs hard to debug | Can't tell why chart looks wrong | Add `debug: true` option to log expanded spec to console |
| SVG renderers add complexity | Rendering bugs in polyline/arc | Use same wrapperStyle() positioning; thorough unit tests |
| Breaking backward compatibility | Existing specs stop working | expandSpec() is no-op when generators absent; all existing specs tested |
| Scene graph cycles | Infinite loop in transform resolution | Cycle detection in sceneGraphResolver with warning |
| Behavior library becomes second schema | LLM has too many formats to learn | Keep behaviors simple (max 3 params); raw timeline always available as fallback |
