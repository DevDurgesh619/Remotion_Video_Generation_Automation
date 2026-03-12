/**
 * Spec Expander
 *
 * Deterministically expands generator definitions into flat objects + timeline.
 * This runs BEFORE validation and normalization in the pipeline:
 *   spec -> expandSpec() -> validateSpec() -> normalizeSpec() -> render
 *
 * If no generators are present, returns the spec unchanged (backward compatible).
 */

import type {
  MotionSpec,
  SceneObject,
  TimelineEvent,
  GeneratorDefinition,
  BarChartGenerator,
  LineChartGenerator,
  PieChartGenerator,
  StatGridGenerator,
  ProcessFlowGenerator,
  ComparisonGenerator,
  TimelineGenerator,
  ChartAxisConfig,
} from "./types";

// ─── Result type from layout engines ────────────────────────────────────────

interface ExpandedElements {
  objects: SceneObject[];
  timeline: TimelineEvent[];
}

// ─── Main entry point ───────────────────────────────────────────────────────

export function expandSpec(spec: MotionSpec): MotionSpec {
  if (!spec.generators || spec.generators.length === 0) {
    return spec;
  }

  const canvas = spec.canvas ?? { w: 1920, h: 1080 };
  let allObjects: SceneObject[] = [...(spec.objects ?? [])];
  let allTimeline: TimelineEvent[] = [...(spec.timeline ?? [])];

  for (const gen of spec.generators) {
    const expanded = expandGenerator(gen, canvas);
    allObjects = allObjects.concat(expanded.objects);
    allTimeline = allTimeline.concat(expanded.timeline);
  }

  return {
    ...spec,
    objects: allObjects,
    timeline: allTimeline,
  };
}

// ─── Generator dispatcher ───────────────────────────────────────────────────

function expandGenerator(
  gen: GeneratorDefinition,
  canvas: { w: number; h: number }
): ExpandedElements {
  switch (gen.type) {
    case "barChart":
      return expandBarChart(gen, canvas);
    case "lineChart":
      return expandLineChart(gen, canvas);
    case "pieChart":
      return expandPieChart(gen, canvas);
    case "statGrid":
      return expandStatGrid(gen, canvas);
    case "processFlow":
      return expandProcessFlow(gen, canvas);
    case "comparison":
      return expandComparison(gen, canvas);
    case "timeline":
      return expandTimeline(gen, canvas);
    default:
      console.warn(`[specExpander] Unknown generator type: ${(gen as any).type}`);
      return { objects: [], timeline: [] };
  }
}

// ─── Utility: map a data value to pixel position within the chart area ──────

function valueToPixelY(
  value: number,
  min: number,
  max: number,
  areaTop: number,
  areaHeight: number
): number {
  // areaTop is the top y of the chart area, areaTop + areaHeight is the bottom
  // value=max maps to areaTop, value=min maps to areaTop + areaHeight
  const ratio = (value - min) / (max - min);
  return areaTop + areaHeight - ratio * areaHeight;
}

function resolveYAxis(
  series: { values: number[] }[],
  axisConfig?: ChartAxisConfig
): { min: number; max: number; step: number } {
  const allValues = series.flatMap((s) => s.values);
  const dataMax = Math.max(...allValues);

  const min = axisConfig?.min ?? 0;
  const max = axisConfig?.max ?? Math.ceil(dataMax * 1.2);
  const step = axisConfig?.step ?? Math.ceil(max / 5);

  return { min, max, step };
}

// ─── Bar Chart Layout Engine ────────────────────────────────────────────────

function expandBarChart(
  gen: BarChartGenerator,
  _canvas: { w: number; h: number }
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const { area } = gen.layout;
  const barWidth = gen.layout.barWidth ?? 60;
  const barGap = gen.layout.barGap ?? 20;
  const groupGap = gen.layout.groupGap ?? 40;
  const variant = gen.variant ?? "regular";
  const categories = gen.data.categories;
  const series = gen.data.series;
  const numCategories = categories.length;
  const numSeries = series.length;
  const prefix = gen.id;

  // Resolve y-axis
  const yAxis = resolveYAxis(
    variant === "stacked"
      ? [{ values: categories.map((_, ci) => series.reduce((sum, s) => sum + s.values[ci], 0)) }]
      : series,
    gen.axes?.y
  );

  // Chart area boundaries
  const chartLeft = area.x;
  const chartBottom = area.y + area.height;
  const chartTop = area.y;

  // Animation config
  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 1;
  const staggerDelay = anim.staggerDelay ?? 0.3;
  const growDuration = anim.growDuration ?? 0.8;
  const easing = anim.easing ?? "ease-out";

  // Calculate total width needed and center bars
  let totalWidth: number;
  if (variant === "grouped") {
    const groupWidth = numSeries * barWidth + (numSeries - 1) * barGap;
    totalWidth = numCategories * groupWidth + (numCategories - 1) * groupGap;
  } else {
    totalWidth = numCategories * barWidth + (numCategories - 1) * groupGap;
  }
  const startX = chartLeft + (area.width - totalWidth) / 2;

  // ── Title ──
  if (gen.title) {
    const titleId = `${prefix}_title`;
    objects.push({
      id: titleId,
      shape: "text",
      text: {
        content: gen.title.text,
        fontSize: gen.title.fontSize ?? 32,
        fontWeight: gen.title.fontWeight ?? "bold",
        textColor: gen.title.color ?? "#FFFFFF",
      },
      pos: [area.x + area.width / 2, chartTop - 40],
      opacity: 0,
    });
    timeline.push({
      target: titleId,
      time: [0, 0.5],
      opacity: [0, 1],
    });
  }

  // ── Y-axis gridlines and labels ──
  const gridConfig = gen.gridlines ?? {};
  const gridColor = gridConfig.color ?? "#FFFFFF";
  const gridOpacity = gridConfig.opacity ?? 0.15;
  const showGrid = gridConfig.show !== false;

  for (let v = yAxis.min + yAxis.step; v <= yAxis.max; v += yAxis.step) {
    const py = valueToPixelY(v, yAxis.min, yAxis.max, chartTop, area.height);

    // Gridline
    if (showGrid) {
      const gridId = `${prefix}_grid_${v}`;
      objects.push({
        id: gridId,
        shape: "line",
        size: [area.width, 1],
        color: gridColor,
        pos: [area.x + area.width / 2, py],
        opacity: gridOpacity,
      });
    }

    // Y-axis label
    const yLabelId = `${prefix}_ylabel_${v}`;
    const axisLabelColor = gen.axes?.y?.labelColor ?? "#FFFFFF";
    const axisLabelFontSize = gen.axes?.y?.labelFontSize ?? 16;
    objects.push({
      id: yLabelId,
      shape: "text",
      text: {
        content: String(v),
        fontSize: axisLabelFontSize,
        textColor: axisLabelColor,
      },
      pos: [chartLeft - 40, py],
      opacity: 0,
    });
    timeline.push({
      target: yLabelId,
      time: [0.5, 1],
      opacity: [0, 1],
    });
  }

  // ── Bars ──
  let barIndex = 0;

  for (let ci = 0; ci < numCategories; ci++) {
    let categoryX: number;

    if (variant === "grouped") {
      const groupWidth = numSeries * barWidth + (numSeries - 1) * barGap;
      categoryX = startX + ci * (groupWidth + groupGap) + groupWidth / 2;
    } else {
      categoryX = startX + ci * (barWidth + groupGap) + barWidth / 2;
    }

    let stackOffset = 0;

    for (let si = 0; si < numSeries; si++) {
      const value = series[si].values[ci];
      const barHeight = (value / yAxis.max) * area.height;
      const barId = `${prefix}_bar_${ci}_${si}`;

      let barX: number;
      let barY: number;

      if (variant === "stacked") {
        barX = categoryX;
        barY = chartBottom - stackOffset;
        stackOffset += barHeight;
      } else if (variant === "grouped") {
        barX = categoryX - (numSeries * barWidth + (numSeries - 1) * barGap) / 2 + si * (barWidth + barGap) + barWidth / 2;
        barY = chartBottom;
      } else {
        // regular: single series per category
        barX = categoryX;
        barY = chartBottom;
      }

      objects.push({
        id: barId,
        shape: "rectangle",
        size: [barWidth, 0],
        color: series[si].color,
        pos: [barX, barY],
        anchor: "bottom",
      });

      const barStartTime = animStartTime + barIndex * staggerDelay;
      timeline.push({
        target: barId,
        time: [barStartTime, barStartTime + growDuration],
        easing,
        height: [0, barHeight],
      });

      // Value label
      if (gen.valueLabels?.show !== false) {
        const vlId = `${prefix}_vlabel_${ci}_${si}`;
        const vlFontSize = gen.valueLabels?.fontSize ?? 14;
        const vlColor = gen.valueLabels?.color ?? "#FFFFFF";
        const labelY = variant === "stacked"
          ? barY - stackOffset + barHeight / 2
          : barY - barHeight / 2;

        objects.push({
          id: vlId,
          shape: "text",
          text: {
            content: String(value),
            fontSize: vlFontSize,
            fontWeight: "bold",
            textColor: vlColor,
          },
          pos: [barX, labelY],
          opacity: 0,
        });

        const labelDelay = anim.labelReveal === "fade_with_bar" ? 0 : growDuration;
        timeline.push({
          target: vlId,
          time: [barStartTime + labelDelay, barStartTime + labelDelay + 0.3],
          opacity: [0, 1],
        });
      }

      barIndex++;
    }

    // X-axis label
    const xLabelId = `${prefix}_xlabel_${ci}`;
    const xLabelColor = gen.axes?.x?.labelColor ?? "#FFFFFF";
    const xLabelFontSize = gen.axes?.x?.labelFontSize ?? 18;
    objects.push({
      id: xLabelId,
      shape: "text",
      text: {
        content: categories[ci],
        fontSize: xLabelFontSize,
        textColor: xLabelColor,
      },
      pos: [categoryX, chartBottom + 30],
      opacity: 0,
    });
    timeline.push({
      target: xLabelId,
      time: [animStartTime + ci * staggerDelay, animStartTime + ci * staggerDelay + 0.5],
      opacity: [0, 1],
    });
  }

  // ── Legend ──
  if (gen.legend?.show !== false && numSeries > 1) {
    const legendId = `${prefix}_legend`;
    const legendContent = series.map((s) => s.name).join("\n");
    objects.push({
      id: legendId,
      shape: "text",
      text: {
        content: legendContent,
        fontSize: 12,
        textColor: gen.title?.color ?? "#FFFFFF",
      },
      pos: [area.x + area.width - 60, chartTop + 20],
      opacity: 0,
    });
    timeline.push({
      target: legendId,
      time: [0, 0.5],
      opacity: [0, 1],
    });
  }

  return { objects, timeline };
}

// ─── Line Chart Layout Engine ───────────────────────────────────────────────

function expandLineChart(
  gen: LineChartGenerator,
  _canvas: { w: number; h: number }
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const { area } = gen.layout;
  const categories = gen.data.categories;
  const series = gen.data.series;
  const numPoints = categories.length;
  const prefix = gen.id;

  // Resolve y-axis
  const yAxis = resolveYAxis(series, gen.axes?.y);

  const chartLeft = area.x;
  const chartTop = area.y;
  const chartBottom = area.y + area.height;

  // Animation config
  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 1;
  const pointDuration = anim.staggerDelay ?? 0.3;
  const easing = anim.easing ?? "ease-out";

  // ── Title ──
  if (gen.title) {
    const titleId = `${prefix}_title`;
    objects.push({
      id: titleId,
      shape: "text",
      text: {
        content: gen.title.text,
        fontSize: gen.title.fontSize ?? 28,
        fontWeight: gen.title.fontWeight ?? "bold",
        textColor: gen.title.color ?? "#FFFFFF",
      },
      pos: [area.x + area.width / 2, chartTop - 40],
      opacity: 0,
    });
    timeline.push({
      target: titleId,
      time: [0, 0.5],
      opacity: [0, 1],
    });
  }

  // ── Y-axis gridlines and labels ──
  const gridConfig = gen.gridlines ?? {};
  const gridColor = gridConfig.color ?? "#FFFFFF";
  const gridOpacity = gridConfig.opacity ?? 0.2;

  for (let v = yAxis.min; v <= yAxis.max; v += yAxis.step) {
    const py = valueToPixelY(v, yAxis.min, yAxis.max, chartTop, area.height);

    // Gridline
    if (gridConfig.show !== false && v > yAxis.min) {
      const gridId = `${prefix}_grid_${v}`;
      objects.push({
        id: gridId,
        shape: "line",
        size: [area.width, 1],
        color: gridColor,
        pos: [area.x + area.width / 2, py],
        opacity: 0,
      });
      timeline.push({
        target: gridId,
        time: [0.5, 1],
        opacity: [0, gridOpacity],
      });
    }

    // Y-axis label
    const yLabelId = `${prefix}_ylabel_${v}`;
    objects.push({
      id: yLabelId,
      shape: "text",
      text: {
        content: String(v),
        fontSize: gen.axes?.y?.labelFontSize ?? 16,
        textColor: gen.axes?.y?.labelColor ?? "#FFFFFF",
      },
      pos: [chartLeft - 40, py],
      opacity: 0,
    });
    timeline.push({
      target: yLabelId,
      time: [0.5, 1],
      opacity: [0, 1],
    });
  }

  // ── Data points: markers and labels per series ──
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const markerConfig = gen.markers ?? {};
    const markerDiameter = markerConfig.diameter ?? 10;
    const markerColor = markerConfig.color ?? s.color;
    const markerStrokeColor = markerConfig.strokeColor ?? s.color;
    const markerStrokeWidth = markerConfig.strokeWidth ?? 2;

    for (let pi = 0; pi < numPoints; pi++) {
      const value = s.values[pi];
      const px = chartLeft + (pi / Math.max(numPoints - 1, 1)) * area.width;
      const py = valueToPixelY(value, yAxis.min, yAxis.max, chartTop, area.height);
      const pointTime = animStartTime + pi * pointDuration;

      // Marker
      const markerId = `${prefix}_marker_${si}_${pi}`;
      objects.push({
        id: markerId,
        shape: markerConfig.shape === "square" ? "square" : "circle",
        diameter: markerDiameter,
        color: markerColor,
        stroke: { color: markerStrokeColor, width: markerStrokeWidth },
        pos: [px, py],
        opacity: 0,
        scale: 0.8,
      });
      timeline.push({
        target: markerId,
        time: [pointTime, pointTime + pointDuration],
        opacity: [0, 1],
        scale: [0.8, 1],
        easing,
      });

      // Value label
      if (gen.valueLabels?.show !== false) {
        const vlId = `${prefix}_vlabel_${si}_${pi}`;
        objects.push({
          id: vlId,
          shape: "text",
          text: {
            content: String(value),
            fontSize: gen.valueLabels?.fontSize ?? 12,
            fontWeight: "bold",
            textColor: gen.valueLabels?.color ?? "#FFFFFF",
          },
          pos: [px, py - markerDiameter - 8],
          opacity: 0,
        });

        const labelStart = animStartTime + numPoints * pointDuration;
        timeline.push({
          target: vlId,
          time: [labelStart + pi * 0.1, labelStart + pi * 0.1 + 0.3],
          opacity: [0, 1],
        });
      }
    }
  }

  // ── X-axis labels ──
  const xLabelColor = gen.axes?.x?.labelColor ?? "#FFFFFF";
  const xLabelFontSize = gen.axes?.x?.labelFontSize ?? 16;
  const xLabelsStart = animStartTime + numPoints * pointDuration + numPoints * 0.1 + 0.5;

  for (let ci = 0; ci < numPoints; ci++) {
    const px = chartLeft + (ci / Math.max(numPoints - 1, 1)) * area.width;
    const xLabelId = `${prefix}_xlabel_${ci}`;
    objects.push({
      id: xLabelId,
      shape: "text",
      text: {
        content: categories[ci],
        fontSize: xLabelFontSize,
        textColor: xLabelColor,
      },
      pos: [px, chartBottom + 30],
      opacity: 0,
    });
    timeline.push({
      target: xLabelId,
      time: [xLabelsStart, xLabelsStart + 0.5],
      opacity: [0, 1],
    });
  }

  return { objects, timeline };
}

// ─── Pie Chart Layout Engine ────────────────────────────────────────────────

function expandPieChart(
  gen: PieChartGenerator,
  _canvas: { w: number; h: number }
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const center = gen.layout.center ?? [0, 0];
  const radius = gen.layout.radius ?? 200;
  const innerRadius = gen.layout.innerRadius ?? 0;
  const segments = gen.data.segments;
  const prefix = gen.id;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Animation config
  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 0.5;
  const staggerDelay = anim.staggerDelay ?? 0.3;
  const growDuration = anim.growDuration ?? 0.6;
  const easing = anim.easing ?? "ease-out";

  // ── Title ──
  if (gen.title) {
    const titleId = `${prefix}_title`;
    objects.push({
      id: titleId,
      shape: "text",
      text: {
        content: gen.title.text,
        fontSize: gen.title.fontSize ?? 28,
        fontWeight: gen.title.fontWeight ?? "bold",
        textColor: gen.title.color ?? "#FFFFFF",
      },
      pos: [center[0], center[1] - radius - 50],
      opacity: 0,
    });
    timeline.push({
      target: titleId,
      time: [0, 0.5],
      opacity: [0, 1],
    });
  }

  // ── Pie segments as arcs ──
  let startAngle = -90; // start from top

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const sweepAngle = (seg.value / total) * 360;
    const arcId = `${prefix}_arc_${i}`;

    objects.push({
      id: arcId,
      shape: "arc",
      color: seg.color,
      pos: center as [number, number],
      size: [radius * 2, radius * 2],
      // Arc-specific properties stored in custom fields
      // The arc renderer will read these
      arcStartAngle: startAngle,
      arcSweepAngle: sweepAngle,
      arcInnerRadius: innerRadius,
      opacity: 0,
      scale: 0,
    } as any); // arc-specific fields handled by arc renderer

    const segStartTime = animStartTime + i * staggerDelay;
    timeline.push({
      target: arcId,
      time: [segStartTime, segStartTime + growDuration],
      opacity: [0, 1],
      scale: [0, 1],
      easing,
    });

    // Value label at midpoint of arc
    if (gen.valueLabels?.show !== false) {
      const midAngle = startAngle + sweepAngle / 2;
      const midAngleRad = (midAngle * Math.PI) / 180;
      const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.65;
      const labelX = center[0] + Math.cos(midAngleRad) * labelRadius;
      const labelY = center[1] + Math.sin(midAngleRad) * labelRadius;

      const format = gen.valueLabels?.format ?? "percent";
      const labelContent =
        format === "percent"
          ? `${Math.round((seg.value / total) * 100)}%`
          : String(seg.value);

      const vlId = `${prefix}_vlabel_${i}`;
      objects.push({
        id: vlId,
        shape: "text",
        text: {
          content: labelContent,
          fontSize: gen.valueLabels?.fontSize ?? 14,
          fontWeight: "bold",
          textColor: gen.valueLabels?.color ?? "#FFFFFF",
        },
        pos: [labelX, labelY],
        opacity: 0,
      });
      timeline.push({
        target: vlId,
        time: [segStartTime + growDuration, segStartTime + growDuration + 0.3],
        opacity: [0, 1],
      });
    }

    // Segment label (outside the pie)
    const midAngle = startAngle + sweepAngle / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;
    const outerLabelRadius = radius + 30;
    const outerLabelX = center[0] + Math.cos(midAngleRad) * outerLabelRadius;
    const outerLabelY = center[1] + Math.sin(midAngleRad) * outerLabelRadius;

    const segLabelId = `${prefix}_seglabel_${i}`;
    objects.push({
      id: segLabelId,
      shape: "text",
      text: {
        content: seg.label,
        fontSize: 14,
        textColor: gen.title?.color ?? "#FFFFFF",
      },
      pos: [outerLabelX, outerLabelY],
      opacity: 0,
    });
    timeline.push({
      target: segLabelId,
      time: [animStartTime + i * staggerDelay + growDuration, animStartTime + i * staggerDelay + growDuration + 0.3],
      opacity: [0, 1],
    });

    startAngle += sweepAngle;
  }

  return { objects, timeline };
}

// ─── StatGrid Layout Engine ──────────────────────────────────────────────────

function expandStatGrid(
  gen: StatGridGenerator,
  _canvas: { w: number; h: number },
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const { area } = gen.layout;
  const columns = gen.layout.columns ?? Math.min(gen.stats.length, 4);
  const cardGap = gen.layout.cardGap ?? 20;
  const cardWidth = gen.layout.cardWidth ??
    Math.floor((area.width - (columns - 1) * cardGap) / columns);
  const cardHeight = gen.layout.cardHeight ?? 280;
  const textColor = gen.textColor ?? "#FFFFFF";
  const prefix = gen.id;

  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 0.5;
  const staggerDelay = anim.staggerDelay ?? 0.2;
  const easing = anim.easing ?? "ease-out-cubic";

  // ── Title ──
  if (gen.title) {
    const titleId = `${prefix}_title`;
    objects.push({
      id: titleId,
      shape: "text",
      text: {
        content: gen.title.text,
        fontSize: gen.title.fontSize ?? 30,
        fontWeight: gen.title.fontWeight ?? "bold",
        textColor: gen.title.color ?? textColor,
      },
      pos: [area.x + area.width / 2, area.y - 40],
      opacity: 0,
    });
    timeline.push({ target: titleId, time: [0, 0.5], opacity: [0, 1] });
  }

  const rows = Math.ceil(gen.stats.length / columns);
  const totalWidth = columns * cardWidth + (columns - 1) * cardGap;
  const totalHeight = rows * cardHeight + (rows - 1) * cardGap;
  const startX = area.x + (area.width - totalWidth) / 2;
  const startY = area.y + (area.height - totalHeight) / 2;

  for (let i = 0; i < gen.stats.length; i++) {
    const stat = gen.stats[i];
    const col = i % columns;
    const row = Math.floor(i / columns);

    const cx = startX + col * (cardWidth + cardGap) + cardWidth / 2;
    const cy = startY + row * (cardHeight + cardGap) + cardHeight / 2;
    const accentColor = stat.color ?? "#2196F3";
    const bgColor = stat.bgColor ?? "rgba(255,255,255,0.08)";
    const cardStart = animStartTime + i * staggerDelay;

    // Card background
    const bgId = `${prefix}_card_bg_${i}`;
    objects.push({
      id: bgId, shape: "rectangle",
      size: [cardWidth, cardHeight],
      color: bgColor,
      pos: [cx, cy],
      cornerRadius: 16, opacity: 0, scale: 0.92,
    });
    timeline.push({
      target: bgId,
      time: [cardStart, cardStart + 0.4],
      opacity: [0, 1], scale: [0.92, 1], easing,
    });

    // Top accent strip
    const accentId = `${prefix}_card_accent_${i}`;
    objects.push({
      id: accentId, shape: "rectangle",
      size: [cardWidth, 4],
      color: accentColor,
      pos: [cx, cy - cardHeight / 2 + 2],
      cornerRadius: 2, opacity: 0,
    });
    timeline.push({ target: accentId, time: [cardStart + 0.1, cardStart + 0.5], opacity: [0, 1] });

    // Icon (optional)
    const hasIcon = !!stat.iconId;
    if (hasIcon) {
      const iconId = `${prefix}_card_icon_${i}`;
      objects.push({
        id: iconId, shape: "asset",
        assetId: stat.iconId,
        pos: [cx, cy - cardHeight * 0.18],
        size: [48, 48], opacity: 0,
      });
      timeline.push({ target: iconId, time: [cardStart + 0.2, cardStart + 0.6], opacity: [0, 1] });
    }

    // Value
    const valueY = hasIcon ? cy + 10 : cy - 10;
    const valueId = `${prefix}_card_value_${i}`;
    objects.push({
      id: valueId, shape: "text",
      text: { content: stat.value, fontSize: 44, fontWeight: "bold", textColor: accentColor },
      pos: [cx, valueY], opacity: 0,
    });
    timeline.push({ target: valueId, time: [cardStart + 0.2, cardStart + 0.6], opacity: [0, 1] });

    // Label
    const labelY = valueY + 46;
    const labelId = `${prefix}_card_label_${i}`;
    objects.push({
      id: labelId, shape: "text",
      text: { content: stat.label, fontSize: 17, textColor },
      pos: [cx, labelY], opacity: 0,
    });
    timeline.push({ target: labelId, time: [cardStart + 0.3, cardStart + 0.7], opacity: [0, 1] });

    // Change text (optional)
    if (stat.changeText) {
      const changeColor = stat.changePositive === false ? "#F44336" : "#4CAF50";
      const changeId = `${prefix}_card_change_${i}`;
      objects.push({
        id: changeId, shape: "text",
        text: { content: stat.changeText, fontSize: 14, textColor: changeColor },
        pos: [cx, labelY + 26], opacity: 0,
      });
      timeline.push({ target: changeId, time: [cardStart + 0.4, cardStart + 0.8], opacity: [0, 1] });
    }
  }

  return { objects, timeline };
}

// ─── ProcessFlow Layout Engine ───────────────────────────────────────────────

function expandProcessFlow(
  gen: ProcessFlowGenerator,
  _canvas: { w: number; h: number },
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const { area } = gen.layout;
  const direction = gen.layout.direction ?? "horizontal";
  const n = gen.steps.length;
  const prefix = gen.id;
  const stepColor = gen.stepColor ?? "#2196F3";
  const arrowColor = gen.arrowColor ?? "#FFFFFF";
  const textColor = gen.textColor ?? "#FFFFFF";

  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 0.5;
  const staggerDelay = anim.staggerDelay ?? 0.35;
  const easing = anim.easing ?? "ease-out-cubic";

  const ARROW_SIZE = direction === "horizontal" ? 40 : 30;

  if (direction === "horizontal") {
    const boxWidth = gen.layout.boxWidth ??
      Math.floor((area.width - (n - 1) * ARROW_SIZE) / n);
    const boxHeight = gen.layout.boxHeight ?? 160;
    const centerY = area.y + area.height / 2;
    const totalWidth = n * boxWidth + (n - 1) * ARROW_SIZE;
    const startX = area.x + (area.width - totalWidth) / 2;

    for (let i = 0; i < n; i++) {
      const step = gen.steps[i];
      const cx = startX + i * (boxWidth + ARROW_SIZE) + boxWidth / 2;
      const color = step.color ?? stepColor;
      const stepStart = animStartTime + i * staggerDelay;

      // Step box
      const bgId = `${prefix}_step_bg_${i}`;
      objects.push({
        id: bgId, shape: "rectangle",
        size: [boxWidth, boxHeight], color,
        pos: [cx, centerY], cornerRadius: 12, opacity: 0, scale: 0.85,
      });
      timeline.push({ target: bgId, time: [stepStart, stepStart + 0.4], opacity: [0, 1], scale: [0.85, 1], easing });

      // Number circle
      const numBgId = `${prefix}_step_numbg_${i}`;
      objects.push({
        id: numBgId, shape: "circle", diameter: 36,
        color: "rgba(0,0,0,0.25)",
        pos: [cx, centerY - boxHeight / 2 + 22], opacity: 0,
      });
      timeline.push({ target: numBgId, time: [stepStart + 0.1, stepStart + 0.45], opacity: [0, 1] });

      const numId = `${prefix}_step_num_${i}`;
      objects.push({
        id: numId, shape: "text",
        text: { content: step.number ?? String(i + 1), fontSize: 17, fontWeight: "bold", textColor: "#FFFFFF" },
        pos: [cx, centerY - boxHeight / 2 + 22], opacity: 0,
      });
      timeline.push({ target: numId, time: [stepStart + 0.1, stepStart + 0.45], opacity: [0, 1] });

      // Title
      const titleId = `${prefix}_step_title_${i}`;
      const titleY = step.description ? centerY - 8 : centerY + 4;
      objects.push({
        id: titleId, shape: "text",
        text: { content: step.title, fontSize: 17, fontWeight: "bold", textColor },
        pos: [cx, titleY], opacity: 0,
      });
      timeline.push({ target: titleId, time: [stepStart + 0.2, stepStart + 0.55], opacity: [0, 1] });

      // Description
      if (step.description) {
        const descId = `${prefix}_step_desc_${i}`;
        objects.push({
          id: descId, shape: "text",
          text: { content: step.description, fontSize: 13, textColor: "rgba(255,255,255,0.75)" },
          pos: [cx, centerY + 18], opacity: 0,
        });
        timeline.push({ target: descId, time: [stepStart + 0.3, stepStart + 0.65], opacity: [0, 1] });
      }

      // Arrow connector (not after last step)
      if (i < n - 1) {
        const arrowX = cx + boxWidth / 2 + ARROW_SIZE / 2;
        const arrowId = `${prefix}_arrow_${i}`;
        objects.push({
          id: arrowId, shape: "text",
          text: { content: "→", fontSize: 26, fontWeight: "bold", textColor: arrowColor },
          pos: [arrowX, centerY], opacity: 0,
        });
        timeline.push({ target: arrowId, time: [stepStart + 0.25, stepStart + 0.55], opacity: [0, 1] });
      }
    }
  } else {
    // Vertical flow
    const boxWidth = gen.layout.boxWidth ?? area.width;
    const boxHeight = gen.layout.boxHeight ?? 100;
    const centerX = area.x + area.width / 2;
    const totalHeight = n * boxHeight + (n - 1) * ARROW_SIZE;
    const startY = area.y + (area.height - totalHeight) / 2;

    for (let i = 0; i < n; i++) {
      const step = gen.steps[i];
      const cy = startY + i * (boxHeight + ARROW_SIZE) + boxHeight / 2;
      const color = step.color ?? stepColor;
      const stepStart = animStartTime + i * staggerDelay;

      const bgId = `${prefix}_step_bg_${i}`;
      objects.push({
        id: bgId, shape: "rectangle",
        size: [boxWidth, boxHeight], color,
        pos: [centerX, cy], cornerRadius: 12, opacity: 0, scale: 0.9,
      });
      timeline.push({ target: bgId, time: [stepStart, stepStart + 0.4], opacity: [0, 1], scale: [0.9, 1], easing });

      // Number badge (left side)
      const numBgId = `${prefix}_step_numbg_${i}`;
      objects.push({
        id: numBgId, shape: "circle", diameter: 32,
        color: "rgba(0,0,0,0.25)",
        pos: [centerX - boxWidth / 2 + 22, cy], opacity: 0,
      });
      timeline.push({ target: numBgId, time: [stepStart + 0.1, stepStart + 0.45], opacity: [0, 1] });

      const numId = `${prefix}_step_num_${i}`;
      objects.push({
        id: numId, shape: "text",
        text: { content: step.number ?? String(i + 1), fontSize: 15, fontWeight: "bold", textColor: "#FFFFFF" },
        pos: [centerX - boxWidth / 2 + 22, cy], opacity: 0,
      });
      timeline.push({ target: numId, time: [stepStart + 0.1, stepStart + 0.45], opacity: [0, 1] });

      const titleId = `${prefix}_step_title_${i}`;
      objects.push({
        id: titleId, shape: "text",
        text: { content: step.title, fontSize: 17, fontWeight: "bold", textColor },
        pos: [centerX + 20, step.description ? cy - 10 : cy], opacity: 0,
      });
      timeline.push({ target: titleId, time: [stepStart + 0.2, stepStart + 0.55], opacity: [0, 1] });

      if (step.description) {
        const descId = `${prefix}_step_desc_${i}`;
        objects.push({
          id: descId, shape: "text",
          text: { content: step.description, fontSize: 13, textColor: "rgba(255,255,255,0.75)" },
          pos: [centerX + 20, cy + 12], opacity: 0,
        });
        timeline.push({ target: descId, time: [stepStart + 0.3, stepStart + 0.65], opacity: [0, 1] });
      }

      if (i < n - 1) {
        const arrowY = cy + boxHeight / 2 + ARROW_SIZE / 2;
        const arrowId = `${prefix}_arrow_${i}`;
        objects.push({
          id: arrowId, shape: "text",
          text: { content: "↓", fontSize: 22, fontWeight: "bold", textColor: arrowColor },
          pos: [centerX - boxWidth / 2 + 22, arrowY], opacity: 0,
        });
        timeline.push({ target: arrowId, time: [stepStart + 0.25, stepStart + 0.55], opacity: [0, 1] });
      }
    }
  }

  return { objects, timeline };
}

// ─── Comparison Layout Engine ────────────────────────────────────────────────

function expandComparison(
  gen: ComparisonGenerator,
  _canvas: { w: number; h: number },
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const { area } = gen.layout;
  const rowHeight = gen.layout.rowHeight ?? 60;
  const featureLabelWidth = gen.layout.featureLabelWidth ?? Math.floor(area.width * 0.4);
  const colWidth = (area.width - featureLabelWidth) / 2;
  const textColor = gen.textColor ?? "#FFFFFF";
  const checkColor = gen.checkColor ?? "#4CAF50";
  const crossColor = gen.crossColor ?? "#F44336";
  const prefix = gen.id;

  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 0.5;
  const staggerDelay = anim.staggerDelay ?? 0.12;

  const headerH = 70;
  const headerY = area.y + headerH / 2;

  // Column X centres
  const labelCX = area.x + featureLabelWidth / 2;
  const colACX = area.x + featureLabelWidth + colWidth / 2;
  const colBCX = area.x + featureLabelWidth + colWidth + colWidth / 2;

  // ── Column header backgrounds ──
  const aHdrBgId = `${prefix}_col_a_hdr_bg`;
  objects.push({
    id: aHdrBgId, shape: "rectangle",
    size: [colWidth - 6, headerH - 10],
    color: gen.columnA.bgColor ?? "rgba(255,255,255,0.07)",
    pos: [colACX, headerY], cornerRadius: 8, opacity: 0,
  });
  timeline.push({ target: aHdrBgId, time: [0, 0.4], opacity: [0, 1] });

  const bHdrBgId = `${prefix}_col_b_hdr_bg`;
  objects.push({
    id: bHdrBgId, shape: "rectangle",
    size: [colWidth - 6, headerH - 10],
    color: gen.columnB.bgColor ?? "rgba(33,150,243,0.18)",
    pos: [colBCX, headerY], cornerRadius: 8, opacity: 0,
  });
  timeline.push({ target: bHdrBgId, time: [0, 0.4], opacity: [0, 1] });

  // ── Column header titles ──
  const aHdrId = `${prefix}_col_a_hdr`;
  objects.push({
    id: aHdrId, shape: "text",
    text: { content: gen.columnA.title, fontSize: 22, fontWeight: "bold", textColor: gen.columnA.titleColor ?? textColor },
    pos: [colACX, headerY], opacity: 0,
  });
  timeline.push({ target: aHdrId, time: [0.1, 0.5], opacity: [0, 1] });

  const bHdrId = `${prefix}_col_b_hdr`;
  objects.push({
    id: bHdrId, shape: "text",
    text: { content: gen.columnB.title, fontSize: 22, fontWeight: "bold", textColor: gen.columnB.titleColor ?? "#FFD700" },
    pos: [colBCX, headerY], opacity: 0,
  });
  timeline.push({ target: bHdrId, time: [0.1, 0.5], opacity: [0, 1] });

  // ── Divider below header ──
  const divId = `${prefix}_header_divider`;
  objects.push({
    id: divId, shape: "line",
    size: [area.width, 1],
    color: "rgba(255,255,255,0.2)",
    pos: [area.x + area.width / 2, area.y + headerH],
    opacity: 0,
  });
  timeline.push({ target: divId, time: [0.3, 0.7], opacity: [0, 1] });

  // ── Feature rows ──
  for (let i = 0; i < gen.features.length; i++) {
    const feat = gen.features[i];
    const rowY = area.y + headerH + (i + 0.5) * rowHeight;
    const rowStart = animStartTime + i * staggerDelay;

    // Zebra stripe
    if (i % 2 === 0) {
      const rowBgId = `${prefix}_row_bg_${i}`;
      objects.push({
        id: rowBgId, shape: "rectangle",
        size: [area.width, rowHeight - 2],
        color: "rgba(255,255,255,0.04)",
        pos: [area.x + area.width / 2, rowY], opacity: 0,
      });
      timeline.push({ target: rowBgId, time: [rowStart - 0.05, rowStart + 0.25], opacity: [0, 1] });
    }

    // Feature label
    const featLabelId = `${prefix}_feat_label_${i}`;
    objects.push({
      id: featLabelId, shape: "text",
      text: { content: feat.label, fontSize: 16, textColor },
      pos: [labelCX, rowY], opacity: 0,
    });
    timeline.push({ target: featLabelId, time: [rowStart, rowStart + 0.3], opacity: [0, 1] });

    // Helper: resolve cell content + color
    function cellDisplay(val: boolean | string): [string, string] {
      if (val === true)  return ["✓", checkColor];
      if (val === false) return ["✗", crossColor];
      return [String(val), textColor];
    }

    // Column A value
    const [aText, aColor] = cellDisplay(feat.a);
    const aValId = `${prefix}_feat_a_${i}`;
    objects.push({
      id: aValId, shape: "text",
      text: { content: aText, fontSize: 22, fontWeight: "bold", textColor: aColor },
      pos: [colACX, rowY], opacity: 0,
    });
    timeline.push({ target: aValId, time: [rowStart + 0.05, rowStart + 0.35], opacity: [0, 1] });

    // Column B value
    const [bText, bColor] = cellDisplay(feat.b);
    const bValId = `${prefix}_feat_b_${i}`;
    objects.push({
      id: bValId, shape: "text",
      text: { content: bText, fontSize: 22, fontWeight: "bold", textColor: bColor },
      pos: [colBCX, rowY], opacity: 0,
    });
    timeline.push({ target: bValId, time: [rowStart + 0.1, rowStart + 0.4], opacity: [0, 1] });
  }

  return { objects, timeline };
}

// ─── Timeline Layout Engine ──────────────────────────────────────────────────
// NOTE: local variable name `tlEvent` avoids conflict with the TimelineEvent animation type.

function expandTimeline(
  gen: TimelineGenerator,
  _canvas: { w: number; h: number },
): ExpandedElements {
  const objects: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];

  const { area } = gen.layout;
  const direction = gen.layout.direction ?? "horizontal";
  const dotRadius = gen.layout.dotRadius ?? 10;
  const lineColor = gen.lineColor ?? "rgba(255,255,255,0.35)";
  const dotColor = gen.dotColor ?? "#2196F3";
  const textColor = gen.textColor ?? "#FFFFFF";
  const n = gen.events.length;
  const prefix = gen.id;

  const anim = gen.animation ?? {};
  const animStartTime = anim.startTime ?? 0.5;
  const staggerDelay = anim.staggerDelay ?? 0.4;
  const easing = anim.easing ?? "ease-out";

  if (direction === "horizontal") {
    const lineY = area.y + area.height / 2;

    // Spine line
    const lineId = `${prefix}_spine`;
    objects.push({
      id: lineId, shape: "line",
      size: [area.width, 2], color: lineColor,
      pos: [area.x + area.width / 2, lineY], opacity: 0,
    });
    timeline.push({ target: lineId, time: [0, animStartTime], opacity: [0, 1] });

    for (let i = 0; i < n; i++) {
      const tlEvent = gen.events[i];
      const ex = n === 1
        ? area.x + area.width / 2
        : area.x + (i / (n - 1)) * area.width;
      const evStart = animStartTime + i * staggerDelay;
      const isAbove = i % 2 === 0; // alternate labels above/below spine
      const eventDotColor = tlEvent.color ?? dotColor;

      // Dot
      const dotId = `${prefix}_dot_${i}`;
      objects.push({
        id: dotId, shape: "circle",
        diameter: dotRadius * 2, color: eventDotColor,
        pos: [ex, lineY], opacity: 0, scale: 0,
      });
      timeline.push({ target: dotId, time: [evStart, evStart + 0.35], opacity: [0, 1], scale: [0, 1], easing });

      // Short connector tick
      const tickId = `${prefix}_tick_${i}`;
      const tickLen = 20;
      objects.push({
        id: tickId, shape: "line",
        size: [1, tickLen], color: eventDotColor,
        pos: [ex, isAbove ? lineY - tickLen / 2 - dotRadius : lineY + tickLen / 2 + dotRadius],
        opacity: 0,
      });
      timeline.push({ target: tickId, time: [evStart + 0.1, evStart + 0.4], opacity: [0, 1] });

      const offset = isAbove ? -1 : 1; // -1 = above line, +1 = below line
      const baseY = lineY + offset * (dotRadius + tickLen + 10);

      // Date label
      const dateId = `${prefix}_date_${i}`;
      objects.push({
        id: dateId, shape: "text",
        text: { content: tlEvent.date, fontSize: 15, fontWeight: "bold", textColor: eventDotColor },
        pos: [ex, baseY], opacity: 0,
      });
      timeline.push({ target: dateId, time: [evStart + 0.1, evStart + 0.45], opacity: [0, 1] });

      // Event label
      const labelId = `${prefix}_label_${i}`;
      objects.push({
        id: labelId, shape: "text",
        text: { content: tlEvent.label, fontSize: 17, fontWeight: "bold", textColor },
        pos: [ex, baseY + offset * 26], opacity: 0,
      });
      timeline.push({ target: labelId, time: [evStart + 0.2, evStart + 0.55], opacity: [0, 1] });

      // Description
      if (tlEvent.description) {
        const descId = `${prefix}_desc_${i}`;
        objects.push({
          id: descId, shape: "text",
          text: { content: tlEvent.description, fontSize: 13, textColor: "rgba(255,255,255,0.65)" },
          pos: [ex, baseY + offset * 50], opacity: 0,
        });
        timeline.push({ target: descId, time: [evStart + 0.3, evStart + 0.65], opacity: [0, 1] });
      }
    }
  } else {
    // Vertical spine
    const spineX = area.x + area.width / 2;

    const lineId = `${prefix}_spine`;
    objects.push({
      id: lineId, shape: "line",
      size: [2, area.height], color: lineColor,
      pos: [spineX, area.y + area.height / 2], opacity: 0,
    });
    timeline.push({ target: lineId, time: [0, animStartTime], opacity: [0, 1] });

    for (let i = 0; i < n; i++) {
      const tlEvent = gen.events[i];
      const ey = n === 1
        ? area.y + area.height / 2
        : area.y + (i / (n - 1)) * area.height;
      const evStart = animStartTime + i * staggerDelay;
      const isRight = i % 2 === 0; // alternate labels left/right of spine
      const eventDotColor = tlEvent.color ?? dotColor;

      const dotId = `${prefix}_dot_${i}`;
      objects.push({
        id: dotId, shape: "circle",
        diameter: dotRadius * 2, color: eventDotColor,
        pos: [spineX, ey], opacity: 0, scale: 0,
      });
      timeline.push({ target: dotId, time: [evStart, evStart + 0.35], opacity: [0, 1], scale: [0, 1], easing });

      const side = isRight ? 1 : -1;
      const textX = spineX + side * (dotRadius + 20);

      const dateId = `${prefix}_date_${i}`;
      objects.push({
        id: dateId, shape: "text",
        text: { content: tlEvent.date, fontSize: 14, fontWeight: "bold", textColor: eventDotColor },
        pos: [textX, ey - 14], opacity: 0,
      });
      timeline.push({ target: dateId, time: [evStart + 0.1, evStart + 0.45], opacity: [0, 1] });

      const labelId = `${prefix}_label_${i}`;
      objects.push({
        id: labelId, shape: "text",
        text: { content: tlEvent.label, fontSize: 16, fontWeight: "bold", textColor },
        pos: [textX, ey + 8], opacity: 0,
      });
      timeline.push({ target: labelId, time: [evStart + 0.2, evStart + 0.55], opacity: [0, 1] });

      if (tlEvent.description) {
        const descId = `${prefix}_desc_${i}`;
        objects.push({
          id: descId, shape: "text",
          text: { content: tlEvent.description, fontSize: 12, textColor: "rgba(255,255,255,0.65)" },
          pos: [textX, ey + 26], opacity: 0,
        });
        timeline.push({ target: descId, time: [evStart + 0.3, evStart + 0.65], opacity: [0, 1] });
      }
    }
  }

  return { objects, timeline };
}
