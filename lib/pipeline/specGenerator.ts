import OpenAI from "openai";

const EXAMPLES = `
EXAMPLE 1 — Simple fade-in (Level 1.0)

Prompt: "Circle Fade In. White background. Red circle (#E53935), 150px. Fades from invisible to fully visible over 1.2s, then holds for 2.8s. Total duration: 4s."

Output:
{
  "scene": "circle_fade_in",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 150,
      "color": "#E53935",
      "pos": [0, 0],
      "opacity": 0
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 1.2], "easing": "ease-out", "opacity": [0, 1] }
  ]
}

---

EXAMPLE 2 — Breathing scale loop (Level 1.1)

Prompt: "Circle Breathing Loop. Light background (#F5F5F5). Blue circle (#42A5F5), 160px, centered. Scale breathes: 100% to 108% to 100%, repeat for 6s (2 cycles, 3s each). Easing: ease-in-out. Total duration: 6s."

Output:
{
  "scene": "circle_breathing_loop",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#F5F5F5",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 160,
      "color": "#42A5F5",
      "pos": [0, 0]
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 1.5], "easing": "ease-in-out", "scale": [1, 1.08] },
    { "target": "circle_1", "time": [1.5, 3], "easing": "ease-in-out", "scale": [1.08, 1] },
    { "target": "circle_1", "time": [3, 4.5], "easing": "ease-in-out", "scale": [1, 1.08] },
    { "target": "circle_1", "time": [4.5, 6], "easing": "ease-in-out", "scale": [1.08, 1] }
  ]
}

---

EXAMPLE 3 — Multi-object coordination (Level 1.2)

Prompt: "Three Shapes Center Bounce. White background. Circle (140px red #F44336), square (140px blue #2196F3), triangle (140px base green #4CAF50). Animation (6s): 0-2s: Circle slides from left, square from right, triangle drops from top. All arrive at center with bounce. 2-4s: All three rotate slowly in place (each 180deg). 4-5s: All scale together: 100% to 110% to 100%. 5-6s: Fade out together. Total duration: 6s."

Output:
{
  "scene": "three_shapes_center_bounce",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    { "id": "circle_1", "shape": "circle", "diameter": 140, "color": "#F44336", "pos": [-960, 0] },
    { "id": "square_1", "shape": "rectangle", "size": [140, 140], "color": "#2196F3", "pos": [960, 0] },
    { "id": "triangle_1", "shape": "triangle", "size": [140, 140], "color": "#4CAF50", "pos": [0, -540] }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 2], "easing": "bounce", "x": [-960, 0] },
    { "target": "square_1", "time": [0, 2], "easing": "bounce", "x": [960, 0] },
    { "target": "triangle_1", "time": [0, 2], "easing": "bounce", "y": [-540, 0] },
    { "target": "circle_1", "time": [2, 4], "rotation": [0, 180] },
    { "target": "square_1", "time": [2, 4], "rotation": [0, 180] },
    { "target": "triangle_1", "time": [2, 4], "rotation": [0, 180] },
    { "target": "circle_1", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "circle_1", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] },
    { "target": "square_1", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "square_1", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] },
    { "target": "triangle_1", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "triangle_1", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] },
    { "target": "circle_1", "time": [5, 6], "opacity": [1, 0] },
    { "target": "square_1", "time": [5, 6], "opacity": [1, 0] },
    { "target": "triangle_1", "time": [5, 6], "opacity": [1, 0] }
  ]
}

---

EXAMPLE 4 — Parent-child group animation (Level 1.2)

Prompt: "Planet and Moon. Dark space background (#1A1A2E). A blue planet (120px circle, #2196F3) orbits the canvas center at radius 200px, one full clockwise loop over 4s. A small white moon (40px circle, #FFFFFF) is attached to the planet and rotates around the planet at 90px radius, completing 2 full loops in the same 4s. Total duration: 4s."

Output:
{
  "scene": "planet_moon_orbit",
  "duration": 4,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#1A1A2E",
  "objects": [
    { "id": "planet_1", "shape": "circle", "diameter": 120, "color": "#2196F3", "pos": [200, 0] },
    { "id": "moon_1", "shape": "circle", "diameter": 40, "color": "#FFFFFF", "parent": "planet_1", "offset": [90, 0] }
  ],
  "timeline": [
    { "target": "planet_1", "time": [0, 4], "orbit": { "center": [0, 0], "radius": 200, "degrees": 360 } },
    { "target": "moon_1", "time": [0, 4], "orbit": { "center": [0, 0], "radius": 90, "degrees": 720 } }
  ]
}

---

EXAMPLE 5 — Text typewriter animation (Level 1.1)

Prompt: "Title Card. Black background (#000000). White bold text 'MOTION GRAPHICS' centered, 96px Arial. Text types in character by character over 1.5s, then holds for 1s, then fades out over 0.5s. Total: 3s."

Output:
{
  "scene": "title_typewriter",
  "duration": 3,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#000000",
  "objects": [
    {
      "id": "title_1",
      "shape": "text",
      "text": "MOTION GRAPHICS",
      "fontSize": 96,
      "fontWeight": "bold",
      "fontFamily": "Arial",
      "color": "#FFFFFF",
      "textAlign": "center",
      "pos": [0, 0],
      "opacity": 1
    }
  ],
  "timeline": [
    { "target": "title_1", "time": [0, 1.5], "chars": [0, 15] },
    { "target": "title_1", "time": [2.5, 3], "opacity": [1, 0] }
  ]
}

---

EXAMPLE 6 — Pie chart with sweep reveal (Level 2.1)

Prompt: "Basic Pie Chart. White background. Circle (300px diameter, centered). Two slices: Blue (#2196F3) for 70%, Green (#4CAF50) for 30%. Animation (6s): 0-3s: Entire pie sweeps in radially from 0 to 360 (blue fills first, then green). 3-6s: Hold complete. Total duration: 6s."

Data accuracy: 70% = 252deg, 30% = 108deg. Segments sum to 100. Sweep [0, 360] reveals full pie.

Output:
{
  "scene": "basic_pie_chart",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "pie_1",
      "shape": "pie",
      "diameter": 300,
      "pos": [0, 0],
      "segments": [
        { "label": "Blue", "value": 70, "color": "#2196F3" },
        { "label": "Green", "value": 30, "color": "#4CAF50" }
      ]
    }
  ],
  "timeline": [
    { "target": "pie_1", "time": [0, 3], "easing": "ease-out", "sweep": [0, 360] }
  ]
}

---

EXAMPLE 7 — Donut chart with counter (Level 2.1)

Prompt: "Donut Progress Ring. Light grey background (#F5F5F5). Donut (280px diameter, 40px ring thickness, centered). Track ring is light grey (#E0E0E0). Progress ring is purple (#9C27B0). Center text '0%' in 48px bold. Animation (7s): 0-1s: Track ring fades in. 1-4s: Progress ring sweeps from 0 to 270 (75%). Center text counts from 0% to 75%. 4-5s: Text pulses scale 100%->110%->100%. 5-7s: Hold. Total: 7s."

Data accuracy: 75% = 270deg. Sweep [0, 270]. Counter [0, 75] with "%" suffix. Thickness 40px.

Output:
{
  "scene": "donut_progress_ring",
  "duration": 7,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#F5F5F5",
  "objects": [
    {
      "id": "donut_1",
      "shape": "donut",
      "diameter": 280,
      "thickness": 40,
      "pos": [0, 0],
      "opacity": 0,
      "segments": [
        { "label": "Progress", "value": 75, "color": "#9C27B0" },
        { "label": "Track", "value": 25, "color": "#E0E0E0" }
      ]
    },
    {
      "id": "counter_text",
      "shape": "text",
      "text": "0%",
      "fontSize": 48,
      "fontWeight": "bold",
      "fontFamily": "Arial",
      "color": "#333333",
      "textAlign": "center",
      "pos": [0, 0],
      "opacity": 0
    }
  ],
  "timeline": [
    { "target": "donut_1", "time": [0, 1], "opacity": [0, 1] },
    { "target": "counter_text", "time": [0, 1], "opacity": [0, 1] },
    { "target": "donut_1", "time": [1, 4], "easing": "ease-out", "sweep": [0, 270] },
    { "target": "counter_text", "time": [1, 4], "counter": [0, 75] },
    { "target": "counter_text", "time": [4, 4.5], "easing": "ease-in-out", "scale": [1, 1.1] },
    { "target": "counter_text", "time": [4.5, 5], "easing": "ease-in-out", "scale": [1.1, 1] }
  ]
}

---

EXAMPLE 8 — Bar chart with growing bars (Level 2.1)

Prompt: "Simple Bar Chart. White background. Three vertical bars (60px wide, 20px gaps) centered. Bar A (blue #2196F3, 200px tall), Bar B (green #4CAF50, 280px tall), Bar C (orange #FF9800, 160px tall). Bars grow from a common baseline upward. Animation (6s): 0-1s: Horizontal baseline fades in. 1-2s: Bar A grows. 2-3s: Bar B grows. 3-4s: Bar C grows. 4-6s: Hold. Total: 6s."

Data accuracy: Bar A height=200px, Bar B height=280px, Bar C height=160px. Each bar size[1] matches exactly. Width=60px each, gaps=20px.

Output:
{
  "scene": "simple_bar_chart",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "baseline",
      "shape": "line",
      "size": [260, 2],
      "color": "#333333",
      "pos": [0, 150],
      "opacity": 0
    },
    {
      "id": "bar_a",
      "shape": "rectangle",
      "size": [60, 200],
      "color": "#2196F3",
      "pos": [-80, 50],
      "anchor": "bottom-center",
      "scale": 1
    },
    {
      "id": "bar_b",
      "shape": "rectangle",
      "size": [60, 280],
      "color": "#4CAF50",
      "pos": [0, 10],
      "anchor": "bottom-center",
      "scale": 1
    },
    {
      "id": "bar_c",
      "shape": "rectangle",
      "size": [60, 160],
      "color": "#FF9800",
      "pos": [80, 70],
      "anchor": "bottom-center",
      "scale": 1
    }
  ],
  "timeline": [
    { "target": "baseline", "time": [0, 1], "opacity": [0, 1] },
    { "target": "bar_a", "time": [1, 2], "easing": "ease-out", "scaleY": [0, 1] },
    { "target": "bar_b", "time": [2, 3], "easing": "ease-out", "scaleY": [0, 1] },
    { "target": "bar_c", "time": [3, 4], "easing": "ease-out", "scaleY": [0, 1] }
  ]
}

---

EXAMPLE 9 — Shape with blur, stroke-dash, and perspective tilt

Prompt: "Glowing Focus Circle. Dark background. A circle (200px, white stroke, no fill) draws its outline from 0% to 100%. Starts blurry and focuses in. Then tilts in 3D. Animation (6s): 0-2s: Circle outline draws from 0% to 100%. Simultaneously blur goes from 10px to 0. 2-4s: Circle tilts 30 degrees on Y axis. 4-6s: Hold."

Output:
{
  "scene": "glowing_focus_circle",
  "duration": 6,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#212121",
  "objects": [
    {
      "id": "circle_1",
      "shape": "circle",
      "diameter": 200,
      "stroke": { "color": "#FFFFFF", "width": 3 },
      "fill": false,
      "pos": [0, 0],
      "perspective": 800
    }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 2], "strokeDash": [0, 100] },
    { "target": "circle_1", "time": [0, 2], "blur": [10, 0] },
    { "target": "circle_1", "time": [2, 4], "rotateY": [0, 30] }
  ]
}

---

EXAMPLE 10 — Line graph with data point decomposition (Level 2.1)

Prompt: "Simple Line Graph. White background. 4 data points connected by lines. Point A at bottom-left, B at middle-high, C at middle-low, D at top-right. Blue line 4px. Dots at each point 16px. Animation (8s): 0-6s: Polyline draws left to right. 6-8s: Dots pop in with bounce. Total: 8s."

Structural decomposition: 4 data points = polyline (1 shape) + 4 marker circles. Each marker is a separate object.

Output:
{
  "scene": "simple_line_graph",
  "duration": 8,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "line_path",
      "shape": "polyline",
      "vertices": [[-300, 200], [-100, -150], [100, 100], [300, -200]],
      "stroke": { "color": "#1976D2", "width": 4 },
      "opacity": 0
    },
    {
      "id": "dot_a",
      "shape": "circle",
      "diameter": 16,
      "color": "#1976D2",
      "pos": [-300, 200],
      "scale": 0
    },
    {
      "id": "dot_b",
      "shape": "circle",
      "diameter": 16,
      "color": "#1976D2",
      "pos": [-100, -150],
      "scale": 0
    },
    {
      "id": "dot_c",
      "shape": "circle",
      "diameter": 16,
      "color": "#1976D2",
      "pos": [100, 100],
      "scale": 0
    },
    {
      "id": "dot_d",
      "shape": "circle",
      "diameter": 16,
      "color": "#1976D2",
      "pos": [300, -200],
      "scale": 0
    }
  ],
  "timeline": [
    { "target": "line_path", "time": [0, 6], "opacity": [0, 1], "clipExpand": [0, 100] },
    { "target": "dot_a", "time": [6, 6.5], "easing": "bounce", "scale": [0, 1] },
    { "target": "dot_b", "time": [6.5, 7], "easing": "bounce", "scale": [0, 1] },
    { "target": "dot_c", "time": [7, 7.5], "easing": "bounce", "scale": [0, 1] },
    { "target": "dot_d", "time": [7.5, 8], "easing": "bounce", "scale": [0, 1] }
  ]
}

---

EXAMPLE 11 — Area chart with polygon fill and decomposed elements (Level 2.1)

Prompt: "Revenue Area Chart. White background. 5 monthly data points (Jan:100, Feb:180, Mar:140, Apr:220, May:200). Green area fill. Green line on top. Markers at each point. Labels below. Animation (8s): 0-1s: Axes fade in. 1-5s: Area reveals left to right. 5-7s: Markers and labels appear. 7-8s: Hold."

Structural decomposition: 5 data points = 1 polygon (area fill) + 1 polyline (stroke) + 5 markers + 5 labels + 2 axes = 14 objects.

Data accuracy: Vertex Y positions derived from data values. Jan=100 maps to y=100, Feb=180 maps to y=20, etc. (higher value = higher position = lower Y). Baseline at y=200.

Output:
{
  "scene": "revenue_area_chart",
  "duration": 8,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    {
      "id": "x_axis",
      "shape": "line",
      "size": [600, 2],
      "color": "#333333",
      "pos": [0, 200],
      "opacity": 0
    },
    {
      "id": "y_axis",
      "shape": "line",
      "size": [2, 400],
      "color": "#333333",
      "pos": [-300, 0],
      "opacity": 0
    },
    {
      "id": "area_fill",
      "shape": "polygon",
      "vertices": [[-300, 200], [-300, 100], [-150, 20], [0, 60], [150, -20], [300, 0], [300, 200]],
      "color": "#4CAF50",
      "opacity": 0.3
    },
    {
      "id": "line_stroke",
      "shape": "polyline",
      "vertices": [[-300, 100], [-150, 20], [0, 60], [150, -20], [300, 0]],
      "stroke": { "color": "#4CAF50", "width": 3 }
    },
    {
      "id": "marker_1",
      "shape": "circle",
      "diameter": 10,
      "color": "#FFFFFF",
      "stroke": { "color": "#4CAF50", "width": 2 },
      "pos": [-300, 100],
      "scale": 0
    },
    {
      "id": "marker_2",
      "shape": "circle",
      "diameter": 10,
      "color": "#FFFFFF",
      "stroke": { "color": "#4CAF50", "width": 2 },
      "pos": [-150, 20],
      "scale": 0
    },
    {
      "id": "marker_3",
      "shape": "circle",
      "diameter": 10,
      "color": "#FFFFFF",
      "stroke": { "color": "#4CAF50", "width": 2 },
      "pos": [0, 60],
      "scale": 0
    },
    {
      "id": "marker_4",
      "shape": "circle",
      "diameter": 10,
      "color": "#FFFFFF",
      "stroke": { "color": "#4CAF50", "width": 2 },
      "pos": [150, -20],
      "scale": 0
    },
    {
      "id": "marker_5",
      "shape": "circle",
      "diameter": 10,
      "color": "#FFFFFF",
      "stroke": { "color": "#4CAF50", "width": 2 },
      "pos": [300, 0],
      "scale": 0
    },
    {
      "id": "label_jan",
      "shape": "text",
      "text": "Jan",
      "fontSize": 14,
      "fontFamily": "Arial",
      "color": "#666666",
      "pos": [-300, 220],
      "opacity": 0
    },
    {
      "id": "label_feb",
      "shape": "text",
      "text": "Feb",
      "fontSize": 14,
      "fontFamily": "Arial",
      "color": "#666666",
      "pos": [-150, 220],
      "opacity": 0
    },
    {
      "id": "label_mar",
      "shape": "text",
      "text": "Mar",
      "fontSize": 14,
      "fontFamily": "Arial",
      "color": "#666666",
      "pos": [0, 220],
      "opacity": 0
    },
    {
      "id": "label_apr",
      "shape": "text",
      "text": "Apr",
      "fontSize": 14,
      "fontFamily": "Arial",
      "color": "#666666",
      "pos": [150, 220],
      "opacity": 0
    },
    {
      "id": "label_may",
      "shape": "text",
      "text": "May",
      "fontSize": 14,
      "fontFamily": "Arial",
      "color": "#666666",
      "pos": [300, 220],
      "opacity": 0
    }
  ],
  "timeline": [
    { "target": "x_axis", "time": [0, 1], "opacity": [0, 1] },
    { "target": "y_axis", "time": [0, 1], "opacity": [0, 1] },
    { "target": "area_fill", "time": [1, 5], "clipExpand": [0, 100] },
    { "target": "line_stroke", "time": [1, 5], "clipExpand": [0, 100] },
    { "target": "marker_1", "time": [5, 5.4], "scale": [0, 1] },
    { "target": "marker_2", "time": [5.4, 5.8], "scale": [0, 1] },
    { "target": "marker_3", "time": [5.8, 6.2], "scale": [0, 1] },
    { "target": "marker_4", "time": [6.2, 6.6], "scale": [0, 1] },
    { "target": "marker_5", "time": [6.6, 7], "scale": [0, 1] },
    { "target": "label_jan", "time": [5, 5.4], "opacity": [0, 1] },
    { "target": "label_feb", "time": [5.4, 5.8], "opacity": [0, 1] },
    { "target": "label_mar", "time": [5.8, 6.2], "opacity": [0, 1] },
    { "target": "label_apr", "time": [6.2, 6.6], "opacity": [0, 1] },
    { "target": "label_may", "time": [6.6, 7], "opacity": [0, 1] }
  ]
}
`;

const SYSTEM_PROMPT = `You are an expert Motion Graphics Specification Generator.

Your sole objective is to convert natural language motion graphics prompts into a compact, deterministic JSON specification called the **Sparse Motion Spec**.

OUTPUT FORMAT: Return ONLY valid JSON. No conversational text, no explanations, no markdown formatting.

---

SPARSE MOTION SPEC SCHEMA

The spec has 5 top-level keys: scene, duration, fps, canvas, bg, objects, timeline.

1. SCENE METADATA
   - "scene": short snake_case name derived from the prompt
   - "duration": total duration in seconds (number)
   - "fps": always 30
   - "canvas": { "w": 1920, "h": 1080 }
   - "bg": background color as hex string. For gradients use: { "type": "gradient", "from": "#hex", "to": "#hex", "direction": "to bottom" }

2. OBJECTS ARRAY
   Each object has ONLY the properties it needs. Omit any property that uses its default value.

   Required fields:
   - "id": unique string identifier (e.g., "circle_1", "rect_2")
   - "shape": "circle" | "rectangle" | "triangle" | "pentagon" | "star" | "line" | "text" | "pie" | "donut" | "gauge" | "polygon" | "polyline"

   Optional fields (include ONLY if needed):
   - "diameter": number (for circles)
   - "size": [width, height] (for rectangles, triangles, etc.)
   - "color": hex string (default: none / transparent)
   - "stroke": { "color": "#hex", "width": number } (for outlined shapes)
   - "fill": false (default is true; only include if explicitly no fill)
   - "pos": [x, y] (default: [0, 0] = canvas center)
   - "opacity": number 0-1 (default: 1; set to 0 if shape starts invisible)
   - "rotation": degrees (default: 0)
   - "scale": number (default: 1)
   - "cornerRadius": number (for rounded rectangles)
   - "facing": "up" | "down" | "left" | "right" (for triangles; default: "up")
   - "zIndex": number (for layering)
   - "blendMode": "screen" | "multiply" etc.
   - "parent": string — id of the parent object; this object's transforms are relative to parent's center
   - "offset": [x, y] — position relative to parent's center (use instead of "pos" when "parent" is set)
   - "anchor": "top-left"|"top-center"|"top-right"|"left-center"|"center"|"right-center"|"bottom-left"|"bottom-center"|"bottom-right" — transform-origin pivot for all transforms on this object
   - "fixed": true — pins this object to absolute canvas coordinates, not affected by any parent transforms
   - "perspective": number — CSS perspective distance in px (required when rotateX/rotateY is used, e.g., 800)

   DATA VISUALIZATION OBJECT FIELDS (for pie, donut, gauge shapes):
   - "segments": [{ "label": "string", "value": number, "color": "#hex" }, ...] — data segments with values and colors
   - "innerDiameter": number — hole diameter for donut charts (in px)
   - "thickness": number — ring thickness for donut charts (in px, alternative to innerDiameter)
   - "needle": { "length": number, "color": "#hex" } — gauge needle configuration
   - "gridLines": true — show faint background grid lines behind the chart

   POLYGON / POLYLINE OBJECT FIELDS (for data-driven shapes):
   - "vertices": [[x1,y1], [x2,y2], ...] — vertex coordinates in px relative to canvas center. For polygon shapes, the area is filled. For polyline shapes, only the stroke is drawn.
   - "closed": true — for polyline, close the path back to the first point (default: false)

   TEXT OBJECT FIELDS (include only when shape is "text"):
   - "text": string — the text content to display
   - "fontSize": number — font size in pixels (e.g., 64)
   - "fontWeight": "normal" | "bold" | "100" | "400" | "700" | "900"
   - "fontFamily": string — system-safe fonts only: "Arial", "Helvetica", "Georgia", "Times New Roman", "monospace", "sans-serif", "serif"
   - "fontStyle": "normal" | "italic"
   - "textAlign": "left" | "center" | "right" (default: "center")
   - "letterSpacing": number — spacing between characters in pixels (default: 0)
   - "lineHeight": number — line height multiplier (default: 1.2)
   - "textTransform": "none" | "uppercase" | "lowercase" | "capitalize"
   - "maxWidth": number — maximum width in pixels before text wraps
   - "cursor": true — show a blinking cursor after text (for typewriter animations)

   POSITIONING: Canvas origin is center (0, 0). Positive x = right, positive y = down.
   Off-screen left = x: -960, right = x: 960, top = y: -540, bottom = y: 540.

3. TIMELINE ARRAY
   Each entry animates ONE property of ONE object over ONE time range.

   Required fields:
   - "target": the object id string
   - "time": [startSec, endSec]

   Animated properties (include ONLY the ones being animated):
   - "x": [from, to] — horizontal translation
   - "y": [from, to] — vertical translation
   - "pos": [[fromX, fromY], [toX, toY]] — combined position (use when both x and y change)
   - "opacity": [from, to]
   - "scale": [from, to]
   - "rotation": [from, to] — in degrees
   - "scaleX": [from, to] — independent width scaling
   - "scaleY": [from, to] — independent height scaling
   - "color": [fromHex, toHex] — color transition
   - "cornerRadius": [from, to]
   - "skewX": [from, to]
   - "skewY": [from, to]
   - "width": [from, to] — for line/bar growth animations
   - "height": [from, to] — for bar growth animations
   - "strokeWidth": [from, to]
   - "shadow": { "from": [ox, oy, blur, spread, color], "to": [ox, oy, blur, spread, color] }
   - "glow": { "from": [blur, intensity, color], "to": [blur, intensity, color] }

   Advanced animation properties:
   - "orbit": { "center": [x, y], "radius": px, "degrees": totalDeg }
   - "bounce": { "floor": yPx, "heights": [h1, h2, ...] }
   - "pivot": [canvasX, canvasY] — rotate or scale around this canvas-coordinate point instead of the object's own center
   - "anchor": same values as object anchor — overrides the object-level anchor for this animation entry only
   - "trail": { "follows": "target_id", "delay": seconds } — this object follows the target's position with a time lag
   - "chars": [fromCount, toCount] — typewriter reveal by character count (for text shape targets)
   - "words": [fromCount, toCount] — typewriter reveal by word count (for text shape targets)
   - "textColor": [fromHex, toHex] — animate the text fill color (for text shape targets)
   - "fontSize": [from, to] — animate font size in pixels (for text shape targets)
   - "letterSpacing": [from, to] — animate letter spacing in pixels (for text shape targets)
   - "morphTo": { "shape": "circle"|"rectangle"|..., "size": [w, h] }
   - "sweep": [fromDeg, toDeg] — conic-gradient sweep angle for pie/donut/gauge reveal animation
   - "needleRotation": [fromDeg, toDeg] — gauge needle rotation angle
   - "counter": [fromNum, toNum] — animated number display (for text objects showing counters)
   - "clipExpand": [from%, to%] — clip-path horizontal reveal percentage (for area graphs)
   - "blur": [fromPx, toPx] — animate CSS filter blur (e.g., [10, 0] for focus-in, [0, 8] for defocus)
   - "strokeDash": [from%, to%] — animate stroke/outline drawing from 0% to 100% visibility
   - "gradientAngle": [fromDeg, toDeg] — animate linear-gradient angle rotation
   - "rotateX": [fromDeg, toDeg] — 3D tilt around X axis (creates top/bottom perspective distortion)
   - "rotateY": [fromDeg, toDeg] — 3D tilt around Y axis (creates left/right perspective distortion)

   Optional per-entry:
   - "easing": "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring" | "bounce" (default: "linear")

   CRITICAL RULES:
   - time[0] must be strictly less than time[1]
   - Each timeline entry animates ONLY ONE property (or a small related group like orbit)
   - If a shape scales AND rotates in the same time range, create TWO separate timeline entries
   - Simultaneous animations on the same object are separate entries with the same time range
   - Sequential phases are separate entries with non-overlapping time ranges
   - For staggered sequences, create separate entries per object with offset times

---

DATA ACCURACY RULES FOR DATAVIZ PROMPTS:
When the prompt describes a data visualization, you MUST preserve the exact data values:

PIE / DONUT:
- Convert percentages to segment "value" fields: "value": 70 means 70% of the total = 252deg
- The sum of all segment values must equal 100 (or proportionally correct)
- sweep timeline must end at the exact cumulative degree (e.g., 252deg for 70%, 360deg for full)

BAR CHARTS:
- Each bar's "size" height must match the prompt's stated pixel height exactly
- Bar positions must reflect the correct spacing and alignment from the prompt
- Value labels must show the exact numbers stated in the prompt

GAUGES / SPEEDOMETERS:
- "needleRotation" end value must map the data value to the gauge's degree range
- For a 180deg gauge showing value 85 out of 100: needleRotation target = 85/100 * 180 = 153deg
- Segment boundaries must match the prompt's described ranges exactly

COUNTERS:
- "counter" timeline must use [0, exactTargetValue] from the prompt
- If the prompt says "counts to 75%", counter must be [0, 75]
- Text suffix ("%", "k", "$") must match the prompt

FUNNEL / PYRAMID:
- Tier widths and heights must match the prompt's stated dimensions exactly
- Label values (10k, 5k, 1k) must match the prompt exactly

ACTIVITY RINGS:
- Each ring's sweep target must match the exact percentage from the prompt
- 80% = 288deg, 60% = 216deg, 40% = 144deg

SCATTER PLOTS:
- Dot positions should be spread meaningfully across the chart area
- The number of dots must match the prompt exactly

GENERAL:
- Never approximate or round data values from the prompt
- Preserve exact hex colors, pixel sizes, and percentages as stated

---

DATAVIZ STRUCTURAL DECOMPOSITION RULES:
When the prompt describes a data visualization, you MUST decompose it into individual elements. NEVER collapse chart components into single objects.

MARKERS / DATA POINTS:
- Each data point marker is a SEPARATE circle object with its own id, pos, and style.
- A chart with 12 data points = 12 individual circle objects (marker_1, marker_2, ... marker_12).
- NEVER use a single circle object to represent multiple markers.

LABELS:
- Each axis label is a SEPARATE text object with its own id and pos.
- X-axis with "Jan Feb Mar ... Dec" = 12 individual text objects, NOT one text with spaces.
- Y-axis with "$0 $10K $20K $30K $40K $50K" = 6 individual text objects.
- Value labels above data points = individual text objects per data point.

GRIDLINES:
- Each horizontal gridline is a SEPARATE line object at a specific Y position.
- 5 gridlines = 5 line objects (gridline_1 through gridline_5), NOT one line object.

AREA CHARTS:
- The filled area shape MUST be a "polygon" object with "vertices" defining the actual data curve.
- Vertices are computed from the data points plus the baseline corners.
- Example: for data points at heights [100, 150, 120], the polygon vertices include the data points AND the bottom-left and bottom-right baseline corners to close the area.
- NEVER use a rectangle to represent an area chart fill.

LINE GRAPHS:
- The line stroke MUST be a "polyline" object with "vertices" matching the data coordinates.
- NEVER use a single horizontal line to represent a multi-point line graph.

RADAR / SPIDER CHARTS:
- The data polygon MUST be a "polygon" object with vertices at the actual data distances from center.
- Each vertex position is calculated: x = distance * cos(angle), y = distance * sin(angle).
- NEVER use a uniform pentagon with scale animation for irregular data.
- Concentric web lines = multiple separate pentagon objects at different sizes.

GENERAL PRINCIPLE:
If a chart has N data points, expect roughly 2N-3N objects (markers + labels + the chart shape itself).
A chart with 12 data points typically needs 30-40 objects. This is correct and expected.

---

${EXAMPLES}

---

Convert the following prompt into a Sparse Motion Spec JSON. Return ONLY the JSON.`;

interface SpecValidationResult {
  valid: boolean;
  errors: string[];
  spec: object | null;
}

function validateSpec(spec: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (typeof spec.scene !== "string" || !spec.scene) errors.push("Missing or invalid 'scene'");
  if (typeof spec.duration !== "number" || (spec.duration as number) <= 0) errors.push("Missing or invalid 'duration'");
  if (typeof spec.fps !== "number") errors.push("Missing 'fps'");
  if (!spec.canvas || typeof (spec.canvas as Record<string, unknown>).w !== "number") errors.push("Missing or invalid 'canvas'");
  if (!spec.bg) errors.push("Missing 'bg'");
  if (!Array.isArray(spec.objects) || (spec.objects as unknown[]).length === 0) errors.push("Missing or empty 'objects'");
  if (!Array.isArray(spec.timeline) || (spec.timeline as unknown[]).length === 0) errors.push("Missing or empty 'timeline'");

  // Validate objects
  const objectIds = new Set<string>();
  if (Array.isArray(spec.objects)) {
    for (const obj of spec.objects as Record<string, unknown>[]) {
      if (!obj.id) errors.push("Object missing 'id'");
      if (!obj.shape) errors.push("Object '" + (obj.id || "unknown") + "' missing 'shape'");
      if ((obj.shape === "polygon" || obj.shape === "polyline") && !Array.isArray(obj.vertices)) {
        errors.push("Object '" + (obj.id || "unknown") + "' with shape '" + obj.shape + "' missing 'vertices' array");
      }
      if (obj.id) objectIds.add(obj.id as string);
    }
  }

  // Validate timeline entries
  if (Array.isArray(spec.timeline)) {
    for (let i = 0; i < (spec.timeline as Record<string, unknown>[]).length; i++) {
      const entry = (spec.timeline as Record<string, unknown>[])[i];
      if (!entry.target) errors.push("Timeline[" + i + "] missing 'target'");
      if (!Array.isArray(entry.time) || (entry.time as unknown[]).length !== 2) {
        errors.push("Timeline[" + i + "] missing or invalid 'time'");
      } else if ((entry.time as number[])[0] >= (entry.time as number[])[1]) {
        errors.push("Timeline[" + i + "] time[0] must be < time[1]");
      }
      if (entry.target && !objectIds.has(entry.target as string)) {
        errors.push("Timeline[" + i + "] references unknown target '" + entry.target + "'");
      }
    }
  }

  return errors;
}

export async function generateSpec(promptText: string): Promise<SpecValidationResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const MAX_RETRIES = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.responses.create({
        model: "gpt-4o",
        temperature: 0,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptText },
        ],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (response.output[0] as any).content[0].text as string;
      const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        lastError = "Invalid JSON from LLM: " + (parseErr as Error).message;
        if (attempt < MAX_RETRIES) continue;
        return { valid: false, errors: [lastError], spec: null };
      }

      const errors = validateSpec(parsed);
      const hasCritical = errors.some((e) => e.includes("Missing"));

      if (hasCritical && attempt < MAX_RETRIES) {
        lastError = "Validation failed: " + errors.join("; ");
        continue;
      }

      return { valid: errors.length === 0, errors, spec: parsed };
    } catch (err) {
      lastError = (err as Error).message;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
    }
  }

  return { valid: false, errors: [lastError], spec: null };
}
