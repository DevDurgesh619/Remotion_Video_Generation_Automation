/**
 * Animation Runtime
 *
 * Pure-function helpers that convert timeline events into per-frame values.
 * All animation is driven by Remotion's `interpolate` — no CSS transitions.
 */

import { interpolate, Easing } from "remotion";
import type {
  MotionSpec,
  SceneObject,
  TimelineEvent,
  ComputedObjectState,
} from "./types";

// ─── Easing resolver ────────────────────────────────────────────────────────

type EasingFn = (t: number) => number;

/**
 * Map spec easing strings → Remotion Easing functions.
 * Falls back to linear when the string is unrecognised.
 */
function resolveEasing(easing?: string): EasingFn {
  if (!easing || easing === "linear") return Easing.linear;

  const map: Record<string, EasingFn> = {
    "ease-in": Easing.in(Easing.quad),
    "ease-out": Easing.out(Easing.quad),
    "ease-in-out": Easing.inOut(Easing.quad),
    "ease": Easing.inOut(Easing.quad),
    "ease-in-cubic": Easing.in(Easing.cubic),
    "ease-out-cubic": Easing.out(Easing.cubic),
    "ease-in-out-cubic": Easing.inOut(Easing.cubic),
    "ease-in-sin": Easing.in(Easing.sin),
    "ease-out-sin": Easing.out(Easing.sin),
    "ease-in-out-sin": Easing.inOut(Easing.sin),
    "ease-in-exp": Easing.in(Easing.exp),
    "ease-out-exp": Easing.out(Easing.exp),
    "ease-in-out-exp": Easing.inOut(Easing.exp),
    "ease-in-circle": Easing.in(Easing.circle),
    "ease-out-circle": Easing.out(Easing.circle),
    "ease-in-out-circle": Easing.inOut(Easing.circle),
  };

  return map[easing] ?? Easing.linear;
}

// ─── Scalar interpolation ───────────────────────────────────────────────────

/**
 * Interpolate a single numeric value between two frames.
 */
export function computeValue(
  frame: number,
  startFrame: number,
  endFrame: number,
  from: number,
  to: number,
  easing?: string,
): number {
  if (startFrame >= endFrame) {
    return frame < startFrame ? from : to;
  }
  return interpolate(frame, [startFrame, endFrame], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: resolveEasing(easing),
  });
}

// ─── Color interpolation ────────────────────────────────────────────────────

/**
 * Parse any CSS colour string into [r, g, b, a].
 * Supports #hex (3/4/6/8 chars), rgb(), rgba().
 */
function parseColor(color: string): [number, number, number, number] {
  // rgba() / rgb()
  const rgbaMatch = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (rgbaMatch) {
    return [
      Number(rgbaMatch[1]),
      Number(rgbaMatch[2]),
      Number(rgbaMatch[3]),
      rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    ];
  }

  // Hex
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length === 4) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

/**
 * Interpolate between two CSS colours at a given progress `t ∈ [0, 1]`.
 * Returns an rgba() string.
 */
function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1, a1] = parseColor(from);
  const [r2, g2, b2, a2] = parseColor(to);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  const a = a1 + (a2 - a1) * t;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Interpolate a colour across a frame range with easing.
 */
export function computeColorValue(
  frame: number,
  startFrame: number,
  endFrame: number,
  from: string,
  to: string,
  easing?: string,
): string {
  if (startFrame >= endFrame) {
    return frame < startFrame ? from : to;
  }

  // Compute progress with easing
  const rawProgress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: resolveEasing(easing),
  });

  return lerpColor(from, to, rawProgress);
}

// ─── Per-object state computation ───────────────────────────────────────────

/**
 * Given the current frame, fps and full spec, compute the resolved visual
 * state for a single scene object.
 *
 * This walks every relevant timeline event and applies interpolations in
 * order, so later events override earlier ones when they overlap.
 */
export function computeObjectState(
  frame: number,
  fps: number,
  spec: MotionSpec,
  obj: SceneObject,
): ComputedObjectState {
  // ── Defaults from the object definition ──
  const posX = obj.pos ? obj.pos[0] : 0;
  const posY = obj.pos ? obj.pos[1] : 0;

  const state: ComputedObjectState = {
    x: posX,
    y: posY,
    scale: obj.scale ?? 1,
    rotation: obj.rotation ?? 0,
    opacity: obj.opacity ?? 1,
    color: obj.color ?? "#000000",
    width: obj.size ? obj.size[0] : (obj.diameter ?? 100),
    height: obj.size ? obj.size[1] : (obj.diameter ?? 100),
    diameter: obj.diameter ?? (obj.size ? Math.max(obj.size[0], obj.size[1]) : 100),

    shadow: obj.shadow
      ? { ...obj.shadow }
      : null,

    stroke: obj.stroke
      ? { ...obj.stroke }
      : null,

    text: obj.text
      ? { ...obj.text, fontWeight: obj.text.fontWeight ?? "normal" }
      : null,
  };

  // ── Collect all timeline events for this object ──
  const events: TimelineEvent[] = spec.timeline.filter(
    (e) => e.target === obj.id,
  );

  // Helper to find the active event for a specific property
  function getActiveEvent(hasProp: (ev: TimelineEvent) => boolean): TimelineEvent | undefined {
    const evs = events.filter(hasProp).sort((a, b) => a.time[0] - b.time[0]);
    if (evs.length === 0) return undefined;
    let chosen = evs[0];
    for (const ev of evs) {
      if (Math.round(ev.time[0] * fps) <= frame) {
        chosen = ev;
      }
    }
    return chosen;
  }

  // ── Evaluate properties individually ──

  const evOpacity = getActiveEvent(e => e.opacity !== undefined);
  if (evOpacity && evOpacity.opacity) {
    state.opacity = computeValue(frame, Math.round(evOpacity.time[0]*fps), Math.round(evOpacity.time[1]*fps), evOpacity.opacity[0], evOpacity.opacity[1], evOpacity.easing);
  }

  const evScale = getActiveEvent(e => e.scale !== undefined);
  if (evScale && evScale.scale) {
    state.scale = computeValue(frame, Math.round(evScale.time[0]*fps), Math.round(evScale.time[1]*fps), evScale.scale[0], evScale.scale[1], evScale.easing);
  }

  const evRotation = getActiveEvent(e => e.rotation !== undefined);
  if (evRotation && evRotation.rotation) {
    state.rotation = computeValue(frame, Math.round(evRotation.time[0]*fps), Math.round(evRotation.time[1]*fps), evRotation.rotation[0], evRotation.rotation[1], evRotation.easing);
  }

  const evX = getActiveEvent(e => e.x !== undefined);
  if (evX && evX.x) {
    state.x = computeValue(frame, Math.round(evX.time[0]*fps), Math.round(evX.time[1]*fps), evX.x[0], evX.x[1], evX.easing);
  }

  const evY = getActiveEvent(e => e.y !== undefined);
  if (evY && evY.y) {
    state.y = computeValue(frame, Math.round(evY.time[0]*fps), Math.round(evY.time[1]*fps), evY.y[0], evY.y[1], evY.easing);
  }

  const evPos = getActiveEvent(e => e.pos !== undefined);
  if (evPos && evPos.pos) {
    state.x = computeValue(frame, Math.round(evPos.time[0]*fps), Math.round(evPos.time[1]*fps), evPos.pos[0][0], evPos.pos[1][0], evPos.easing);
    state.y = computeValue(frame, Math.round(evPos.time[0]*fps), Math.round(evPos.time[1]*fps), evPos.pos[0][1], evPos.pos[1][1], evPos.easing);
  }

  const evColor = getActiveEvent(e => e.color !== undefined);
  if (evColor && evColor.color) {
    state.color = computeColorValue(frame, Math.round(evColor.time[0]*fps), Math.round(evColor.time[1]*fps), evColor.color[0], evColor.color[1], evColor.easing);
  }

  const evDiameter = getActiveEvent(e => e.diameter !== undefined);
  if (evDiameter && evDiameter.diameter) {
    const d = computeValue(frame, Math.round(evDiameter.time[0]*fps), Math.round(evDiameter.time[1]*fps), evDiameter.diameter[0], evDiameter.diameter[1], evDiameter.easing);
    state.diameter = d; state.width = d; state.height = d;
  }

  const evSize = getActiveEvent(e => e.size !== undefined);
  if (evSize && evSize.size) {
    state.width = computeValue(frame, Math.round(evSize.time[0]*fps), Math.round(evSize.time[1]*fps), evSize.size[0][0], evSize.size[1][0], evSize.easing);
    state.height = computeValue(frame, Math.round(evSize.time[0]*fps), Math.round(evSize.time[1]*fps), evSize.size[0][1], evSize.size[1][1], evSize.easing);
  }

  // ── Evaluate Nested properties ──

  const evShadowX = getActiveEvent(e => e.shadow?.offsetX !== undefined);
  const evShadowY = getActiveEvent(e => e.shadow?.offsetY !== undefined);
  const evShadowBlur = getActiveEvent(e => e.shadow?.blur !== undefined);
  const evShadowColor = getActiveEvent(e => e.shadow?.color !== undefined);
  
  if (evShadowX || evShadowY || evShadowBlur || evShadowColor) {
    if (!state.shadow) state.shadow = obj.shadow ? { ...obj.shadow } : { offsetX: 0, offsetY: 0, blur: 0, color: "transparent" };
    if (evShadowX && evShadowX.shadow?.offsetX) state.shadow.offsetX = computeValue(frame, Math.round(evShadowX.time[0]*fps), Math.round(evShadowX.time[1]*fps), evShadowX.shadow.offsetX[0], evShadowX.shadow.offsetX[1], evShadowX.easing);
    if (evShadowY && evShadowY.shadow?.offsetY) state.shadow.offsetY = computeValue(frame, Math.round(evShadowY.time[0]*fps), Math.round(evShadowY.time[1]*fps), evShadowY.shadow.offsetY[0], evShadowY.shadow.offsetY[1], evShadowY.easing);
    if (evShadowBlur && evShadowBlur.shadow?.blur) state.shadow.blur = computeValue(frame, Math.round(evShadowBlur.time[0]*fps), Math.round(evShadowBlur.time[1]*fps), evShadowBlur.shadow.blur[0], evShadowBlur.shadow.blur[1], evShadowBlur.easing);
    if (evShadowColor && evShadowColor.shadow?.color) state.shadow.color = computeColorValue(frame, Math.round(evShadowColor.time[0]*fps), Math.round(evShadowColor.time[1]*fps), evShadowColor.shadow.color[0], evShadowColor.shadow.color[1], evShadowColor.easing);
  }

  const evStrokeWidth = getActiveEvent(e => e.stroke?.width !== undefined);
  const evStrokeColor = getActiveEvent(e => e.stroke?.color !== undefined);
  
  if (evStrokeWidth || evStrokeColor) {
    if (!state.stroke) state.stroke = obj.stroke ? { ...obj.stroke } : { width: 1, color: "#000000" };
    if (evStrokeWidth && evStrokeWidth.stroke?.width) state.stroke.width = computeValue(frame, Math.round(evStrokeWidth.time[0]*fps), Math.round(evStrokeWidth.time[1]*fps), evStrokeWidth.stroke.width[0], evStrokeWidth.stroke.width[1], evStrokeWidth.easing);
    if (evStrokeColor && evStrokeColor.stroke?.color) state.stroke.color = computeColorValue(frame, Math.round(evStrokeColor.time[0]*fps), Math.round(evStrokeColor.time[1]*fps), evStrokeColor.stroke.color[0], evStrokeColor.stroke.color[1], evStrokeColor.easing);
  }

  const evTextSize = getActiveEvent(e => e.text?.fontSize !== undefined);
  const evTextColor = getActiveEvent(e => e.text?.textColor !== undefined);
  const evTextWeight = getActiveEvent(e => e.text?.fontWeight !== undefined);

  if (evTextSize || evTextColor || evTextWeight) {
    if (!state.text) state.text = obj.text ? { ...obj.text, fontWeight: obj.text.fontWeight ?? "normal" } : { content: "", fontSize: 16, textColor: "#000000", fontWeight: "normal" };
    if (evTextSize && evTextSize.text?.fontSize) state.text!.fontSize = computeValue(frame, Math.round(evTextSize.time[0]*fps), Math.round(evTextSize.time[1]*fps), evTextSize.text.fontSize[0], evTextSize.text.fontSize[1], evTextSize.easing);
    if (evTextColor && evTextColor.text?.textColor) state.text!.textColor = computeColorValue(frame, Math.round(evTextColor.time[0]*fps), Math.round(evTextColor.time[1]*fps), evTextColor.text.textColor[0], evTextColor.text.textColor[1], evTextColor.easing);
    if (evTextWeight && evTextWeight.text?.fontWeight) state.text!.fontWeight = evTextWeight.text.fontWeight;
  }

  return state;
}
