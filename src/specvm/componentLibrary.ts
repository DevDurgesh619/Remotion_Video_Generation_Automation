/**
 * Component Library
 *
 * Defines reusable composite widget templates.
 * The LLM can reference these by name in the `components` array of a MotionSpec:
 *
 *   "components": [
 *     { "componentType": "stat_card", "id": "rev", "pos": [-300, 0],
 *       "params": { "value": "$2.4M", "label": "Revenue", "accentColor": "#2196F3" } }
 *   ]
 *
 * Each template's expand() function produces SceneObjects + TimelineEvents
 * with IDs prefixed by the instanceId to prevent collisions.
 *
 * Available components: stat_card, progress_bar, badge, icon_label, callout_box
 */

import type { SceneObject, TimelineEvent } from "./types";

// ─── Template contract ───────────────────────────────────────────────────────

export interface ExpandedComponent {
  objects: SceneObject[];
  timeline: TimelineEvent[];
}

export interface ComponentTemplate {
  /** Human-readable description shown in debug output. */
  description: string;
  /**
   * Expand this component into flat objects + timeline.
   * @param instanceId  Unique ID prefix (e.g. "my_card") — all generated IDs use this prefix.
   * @param pos         Canvas-center position for the component's anchor point.
   * @param params      Template-specific parameters. Unknown keys are silently ignored.
   */
  expand(
    instanceId: string,
    pos: [number, number],
    params: Record<string, string | number | boolean>,
  ): ExpandedComponent;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function str(params: Record<string, string | number | boolean>, key: string, fallback: string): string {
  const v = params[key];
  return v !== undefined ? String(v) : fallback;
}

function num(params: Record<string, string | number | boolean>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : (v !== undefined ? Number(v) : fallback);
}

function bool(params: Record<string, string | number | boolean>, key: string, fallback: boolean): boolean {
  const v = params[key];
  return typeof v === "boolean" ? v : (v !== undefined ? v !== "false" && v !== "0" : fallback);
}

// ─── stat_card ────────────────────────────────────────────────────────────────

const statCard: ComponentTemplate = {
  description: "KPI card with a large value, label, optional icon, and optional change indicator.",
  expand(id, [cx, cy], params) {
    const objects: SceneObject[] = [];
    const timeline: TimelineEvent[] = [];

    const value       = str(params, "value",       "0");
    const label       = str(params, "label",       "");
    const iconId      = params.iconId ? String(params.iconId) : undefined;
    const accentColor = str(params, "accentColor", "#2196F3");
    const bgColor     = str(params, "bgColor",     "rgba(255,255,255,0.08)");
    const textColor   = str(params, "textColor",   "#FFFFFF");
    const w           = num(params, "width",  280);
    const h           = num(params, "height", 300);
    const startTime   = num(params, "startTime", 0);
    const changeText  = params.changeText ? String(params.changeText) : undefined;
    const changePos   = bool(params, "changePositive", true);

    // Background
    const bgId = `${id}_bg`;
    objects.push({ id: bgId, shape: "rectangle", size: [w, h], color: bgColor, pos: [cx, cy], cornerRadius: 16, opacity: 0, scale: 0.92 });
    timeline.push({ target: bgId, time: [startTime, startTime + 0.4], opacity: [0, 1], scale: [0.92, 1], easing: "ease-out-cubic" });

    // Accent strip
    const accentId = `${id}_accent`;
    objects.push({ id: accentId, shape: "rectangle", size: [w, 4], color: accentColor, pos: [cx, cy - h / 2 + 2], cornerRadius: 2, opacity: 0 });
    timeline.push({ target: accentId, time: [startTime + 0.1, startTime + 0.5], opacity: [0, 1] });

    // Icon
    const hasIcon = !!iconId;
    if (hasIcon) {
      const iconObjId = `${id}_icon`;
      objects.push({ id: iconObjId, shape: "asset", assetId: iconId, pos: [cx, cy - h * 0.18], size: [48, 48], opacity: 0 });
      timeline.push({ target: iconObjId, time: [startTime + 0.2, startTime + 0.6], opacity: [0, 1] });
    }

    // Value
    const valueY = hasIcon ? cy + 10 : cy - 10;
    const valueId = `${id}_value`;
    objects.push({ id: valueId, shape: "text", text: { content: value, fontSize: 46, fontWeight: "bold", textColor: accentColor }, pos: [cx, valueY], opacity: 0 });
    timeline.push({ target: valueId, time: [startTime + 0.2, startTime + 0.6], opacity: [0, 1] });

    // Label
    const labelY = valueY + 48;
    const labelId = `${id}_label`;
    objects.push({ id: labelId, shape: "text", text: { content: label, fontSize: 17, textColor }, pos: [cx, labelY], opacity: 0 });
    timeline.push({ target: labelId, time: [startTime + 0.3, startTime + 0.7], opacity: [0, 1] });

    // Change text
    if (changeText) {
      const changeColor = changePos ? "#4CAF50" : "#F44336";
      const changeId = `${id}_change`;
      objects.push({ id: changeId, shape: "text", text: { content: changeText, fontSize: 14, textColor: changeColor }, pos: [cx, labelY + 26], opacity: 0 });
      timeline.push({ target: changeId, time: [startTime + 0.4, startTime + 0.8], opacity: [0, 1] });
    }

    return { objects, timeline };
  },
};

// ─── progress_bar ─────────────────────────────────────────────────────────────

const progressBar: ComponentTemplate = {
  description: "Horizontal fill bar with an animated fill, label, and optional percentage text.",
  expand(id, [cx, cy], params) {
    const objects: SceneObject[] = [];
    const timeline: TimelineEvent[] = [];

    const value       = Math.min(100, Math.max(0, num(params, "value", 50)));
    const label       = params.label ? String(params.label) : undefined;
    const color       = str(params, "color",     "#2196F3");
    const bgColor     = str(params, "bgColor",   "rgba(255,255,255,0.1)");
    const textColor   = str(params, "textColor", "#FFFFFF");
    const barW        = num(params, "width",     400);
    const barH        = num(params, "height",    20);
    const showPct     = bool(params, "showPercent", true);
    const startTime   = num(params, "startTime", 0);
    const animDur     = num(params, "animDuration", 1.0);

    const labelY = label ? cy - barH / 2 - 16 : cy;
    const barY   = label ? cy : cy;

    // Label text
    if (label) {
      const labelId = `${id}_label`;
      objects.push({ id: labelId, shape: "text", text: { content: label, fontSize: 16, textColor }, pos: [cx - barW / 2, labelY], opacity: 0 });
      timeline.push({ target: labelId, time: [startTime, startTime + 0.4], opacity: [0, 1] });
    }

    // Background track
    const trackId = `${id}_track`;
    objects.push({ id: trackId, shape: "rectangle", size: [barW, barH], color: bgColor, pos: [cx, barY], cornerRadius: barH / 2, opacity: 0 });
    timeline.push({ target: trackId, time: [startTime + 0.1, startTime + 0.5], opacity: [0, 1] });

    // Fill bar — grows from left edge, so use anchor: "left"
    const fillW = (value / 100) * barW;
    const fillId = `${id}_fill`;
    objects.push({
      id: fillId, shape: "rectangle",
      size: [0, barH], color, cornerRadius: barH / 2,
      pos: [cx - barW / 2, barY], anchor: "left", opacity: 0,
    });
    timeline.push({
      target: fillId,
      time: [startTime + 0.4, startTime + 0.4 + animDur],
      width: [0, fillW], opacity: [0, 1], easing: "ease-out-cubic",
    });

    // Percentage text
    if (showPct) {
      const pctId = `${id}_pct`;
      objects.push({ id: pctId, shape: "text", text: { content: `${value}%`, fontSize: 15, fontWeight: "bold", textColor }, pos: [cx + barW / 2 + 24, barY], opacity: 0 });
      timeline.push({ target: pctId, time: [startTime + 0.3, startTime + 0.7], opacity: [0, 1] });
    }

    return { objects, timeline };
  },
};

// ─── badge ────────────────────────────────────────────────────────────────────

const badge: ComponentTemplate = {
  description: "Colored pill/badge label. Useful for tags, status indicators, and category chips.",
  expand(id, [cx, cy], params) {
    const objects: SceneObject[] = [];
    const timeline: TimelineEvent[] = [];

    const text        = str(params, "text",      "Badge");
    const bgColor     = str(params, "color",     "#2196F3");
    const textColor   = str(params, "textColor", "#FFFFFF");
    const fontSize    = num(params, "fontSize",  16);
    const w           = num(params, "width",     120);
    const h           = num(params, "height",    38);
    const startTime   = num(params, "startTime", 0);

    const bgId = `${id}_bg`;
    objects.push({ id: bgId, shape: "rectangle", size: [w, h], color: bgColor, pos: [cx, cy], cornerRadius: h / 2, opacity: 0, scale: 0.85 });
    timeline.push({ target: bgId, time: [startTime, startTime + 0.35], opacity: [0, 1], scale: [0.85, 1], easing: "ease-out-cubic" });

    const textId = `${id}_text`;
    objects.push({ id: textId, shape: "text", text: { content: text, fontSize, fontWeight: "bold", textColor }, pos: [cx, cy], opacity: 0 });
    timeline.push({ target: textId, time: [startTime + 0.05, startTime + 0.4], opacity: [0, 1] });

    return { objects, timeline };
  },
};

// ─── icon_label ───────────────────────────────────────────────────────────────

const iconLabel: ComponentTemplate = {
  description: "Asset icon centered above a text label. Useful for feature bullets and navigation icons.",
  expand(id, [cx, cy], params) {
    const objects: SceneObject[] = [];
    const timeline: TimelineEvent[] = [];

    const iconId    = str(params, "iconId",    "star");
    const label     = str(params, "label",     "");
    const iconSize  = num(params, "iconSize",  60);
    const fontSize  = num(params, "fontSize",  16);
    const textColor = str(params, "textColor", "#FFFFFF");
    const gap       = num(params, "gap",       10);
    const startTime = num(params, "startTime", 0);

    const iconY  = cy - gap / 2 - iconSize / 2;
    const labelY = cy + gap / 2 + iconSize / 2 + fontSize / 2;

    const iconObjId = `${id}_icon`;
    objects.push({ id: iconObjId, shape: "asset", assetId: iconId, pos: [cx, iconY], size: [iconSize, iconSize], opacity: 0, scale: 0.8 });
    timeline.push({ target: iconObjId, time: [startTime, startTime + 0.4], opacity: [0, 1], scale: [0.8, 1], easing: "ease-out-cubic" });

    const labelId = `${id}_label`;
    objects.push({ id: labelId, shape: "text", text: { content: label, fontSize, textColor }, pos: [cx, labelY], opacity: 0 });
    timeline.push({ target: labelId, time: [startTime + 0.15, startTime + 0.55], opacity: [0, 1] });

    return { objects, timeline };
  },
};

// ─── callout_box ──────────────────────────────────────────────────────────────

const calloutBox: ComponentTemplate = {
  description: "Highlighted info box with a colored left border, title, and optional body text.",
  expand(id, [cx, cy], params) {
    const objects: SceneObject[] = [];
    const timeline: TimelineEvent[] = [];

    const title       = str(params, "title",       "");
    const body        = params.body ? String(params.body) : undefined;
    const accentColor = str(params, "accentColor", "#FF9800");
    const bgColor     = str(params, "bgColor",     "rgba(255,255,255,0.07)");
    const textColor   = str(params, "textColor",   "#FFFFFF");
    const w           = num(params, "width",        500);
    const h           = num(params, "height",       body ? 140 : 90);
    const startTime   = num(params, "startTime",    0);

    // Background
    const bgId = `${id}_bg`;
    objects.push({ id: bgId, shape: "rectangle", size: [w, h], color: bgColor, pos: [cx, cy], cornerRadius: 8, opacity: 0 });
    timeline.push({ target: bgId, time: [startTime, startTime + 0.4], opacity: [0, 1] });

    // Left accent border (thin vertical strip)
    const borderId = `${id}_border`;
    objects.push({ id: borderId, shape: "rectangle", size: [4, h], color: accentColor, pos: [cx - w / 2 + 2, cy], cornerRadius: 2, opacity: 0 });
    timeline.push({ target: borderId, time: [startTime + 0.1, startTime + 0.5], opacity: [0, 1] });

    // Title
    const titleY = body ? cy - h * 0.18 : cy;
    const titleId = `${id}_title`;
    objects.push({ id: titleId, shape: "text", text: { content: title, fontSize: 20, fontWeight: "bold", textColor }, pos: [cx, titleY], opacity: 0 });
    timeline.push({ target: titleId, time: [startTime + 0.15, startTime + 0.55], opacity: [0, 1] });

    // Body
    if (body) {
      const bodyId = `${id}_body`;
      objects.push({ id: bodyId, shape: "text", text: { content: body, fontSize: 15, textColor: "rgba(255,255,255,0.8)" }, pos: [cx, cy + h * 0.18], opacity: 0 });
      timeline.push({ target: bodyId, time: [startTime + 0.25, startTime + 0.65], opacity: [0, 1] });
    }

    return { objects, timeline };
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const library: Record<string, ComponentTemplate> = {
  stat_card:    statCard,
  progress_bar: progressBar,
  badge:        badge,
  icon_label:   iconLabel,
  callout_box:  calloutBox,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Look up a component template by its registered name. Returns undefined for unknown types. */
export function getComponent(componentType: string): ComponentTemplate | undefined {
  return library[componentType];
}

/** Returns all registered component type names (useful for LLM prompts and debugging). */
export function listComponents(): string[] {
  return Object.keys(library);
}
