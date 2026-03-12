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
    // Bounce — decelerating bounce at the end (great for drop/settle animations)
    "bounce":            Easing.out(Easing.bounce),
    "ease-out-bounce":   Easing.out(Easing.bounce),
    "ease-in-bounce":    Easing.in(Easing.bounce),
    // Elastic — springy overshoot (great for "pop in" reveals)
    "elastic":           Easing.out(Easing.elastic(1)),
    "ease-out-elastic":  Easing.out(Easing.elastic(1)),
    "ease-in-elastic":   Easing.in(Easing.elastic(1)),
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
 *
 * @param parentState — when the object has a `parent`, pass the already-computed
 *   parent state here. When inheritRotation/inheritScale are set, full 2D affine
 *   math is applied; otherwise falls back to simple additive 2D position offset.
 * @param allComputedStates — the running map of already-computed states for all
 *   objects processed so far this frame. Used by motionType:"follow" events.
 */
export function computeObjectState(
  frame: number,
  fps: number,
  spec: MotionSpec,
  obj: SceneObject,
  parentState?: ComputedObjectState,
  allComputedStates?: Map<string, ComputedObjectState>,
): ComputedObjectState {
  // ── Defaults from the object definition ──
  // If the object has a parent, use localPos as the base offset (relative to parent).
  // Otherwise fall back to pos (absolute canvas-center coordinates).
  const basePos = obj.parent
    ? (obj.localPos ?? obj.pos ?? [0, 0])
    : (obj.pos ?? [0, 0]);
  const posX = basePos[0];
  const posY = basePos[1];

  const state: ComputedObjectState = {
    x: posX,
    y: posY,
    scale: obj.scale ?? 1,
    scaleX: 1,
    scaleY: 1,
    rotation: obj.rotation ?? 0,
    opacity: obj.opacity ?? 1,
    color: obj.color ?? "#000000",
    width: obj.size ? obj.size[0] : (obj.diameter ?? 100),
    height: obj.size ? obj.size[1] : (obj.diameter ?? 100),
    diameter: obj.diameter ?? (obj.size ? Math.max(obj.size[0], obj.size[1]) : 100),
    cornerRadius: obj.cornerRadius ?? 0,
    shadow: obj.shadow ? { ...obj.shadow } : null,
    stroke: obj.stroke ? { ...obj.stroke } : null,
    text: obj.text ? { ...obj.text, fontWeight: obj.text.fontWeight ?? "normal" } : null,
    glow: obj.glow ? { ...obj.glow } : null,
    blur: obj.blur ?? 0,
    skewX: obj.skewX ?? 0,
    skewY: obj.skewY ?? 0,
    strokeCoverage: 1,   // 1 = fully drawn (no stroke_draw animation)
    dashOffset: 0,
    worldRotation: obj.rotation ?? 0,
    worldScale: obj.scale ?? 1,
    pivot: obj.pivot ?? [0, 0],
  };

  // ── Collect all timeline events for this object (with repeat expansion) ──
  // By the time events reach the runtime, the normalizer has guaranteed that
  // every event has a `time` tuple. The non-null assertion below is safe.
  const rawEvents: TimelineEvent[] = spec.timeline.filter(
    (e) => e.target === obj.id && e.time !== undefined,
  );
  const events = expandRepeatingEvents(rawEvents, fps, spec.duration);

  // Shorthand: extract the guaranteed `time` tuple from a post-normalization event.
  const et = (ev: TimelineEvent): [number, number] => ev.time!;

  // Helper to find the active event for a specific property
  function getActiveEvent(hasProp: (ev: TimelineEvent) => boolean): TimelineEvent | undefined {
    const evs = events.filter(hasProp).sort((a, b) => et(a)[0] - et(b)[0]);
    if (evs.length === 0) return undefined;
    let chosen = evs[0];
    for (const ev of evs) {
      if (Math.round(et(ev)[0] * fps) <= frame) chosen = ev;
    }
    return chosen;
  }

  // Compute helpers: frame-range shorthand
  const sf = (ev: TimelineEvent) => Math.round(et(ev)[0] * fps);
  const ef = (ev: TimelineEvent) => Math.round(et(ev)[1] * fps);

  // ── Evaluate properties individually ──

  const evOpacity = getActiveEvent(e => e.opacity !== undefined);
  if (evOpacity) {
    const op = evOpacity.opacity;
    if (Array.isArray(op)) {
      state.opacity = computeValue(frame, sf(evOpacity), ef(evOpacity), op[0], op[1], evOpacity.easing);
    }
  }

  const evScale = getActiveEvent(e => e.scale !== undefined);
  if (evScale) {
    const sc = evScale.scale;
    if (Array.isArray(sc)) {
      state.scale = computeValue(frame, sf(evScale), ef(evScale), sc[0], sc[1], evScale.easing);
    }
  }

  const evRotation = getActiveEvent(e => e.rotation !== undefined);
  if (evRotation && evRotation.rotation) {
    state.rotation = computeValue(frame, sf(evRotation), ef(evRotation), evRotation.rotation[0], evRotation.rotation[1], evRotation.easing);
  }

  const evX = getActiveEvent(e => e.x !== undefined);
  if (evX && evX.x) {
    state.x = computeValue(frame, sf(evX), ef(evX), evX.x[0], evX.x[1], evX.easing);
  }

  const evY = getActiveEvent(e => e.y !== undefined);
  if (evY && evY.y) {
    state.y = computeValue(frame, sf(evY), ef(evY), evY.y[0], evY.y[1], evY.easing);
  }

  const evPos = getActiveEvent(e => e.pos !== undefined);
  if (evPos && evPos.pos) {
    state.x = computeValue(frame, sf(evPos), ef(evPos), evPos.pos[0][0], evPos.pos[1][0], evPos.easing);
    state.y = computeValue(frame, sf(evPos), ef(evPos), evPos.pos[0][1], evPos.pos[1][1], evPos.easing);
  }

  const evColor = getActiveEvent(e => e.color !== undefined);
  if (evColor && evColor.color) {
    state.color = computeColorValue(frame, sf(evColor), ef(evColor), evColor.color[0], evColor.color[1], evColor.easing);
  }

  const evDiameter = getActiveEvent(e => e.diameter !== undefined);
  if (evDiameter && evDiameter.diameter) {
    const d = computeValue(frame, sf(evDiameter), ef(evDiameter), evDiameter.diameter[0], evDiameter.diameter[1], evDiameter.easing);
    state.diameter = d; state.width = d; state.height = d;
  }

  const evSize = getActiveEvent(e => e.size !== undefined);
  if (evSize && evSize.size) {
    state.width  = computeValue(frame, sf(evSize), ef(evSize), evSize.size[0][0], evSize.size[1][0], evSize.easing);
    state.height = computeValue(frame, sf(evSize), ef(evSize), evSize.size[0][1], evSize.size[1][1], evSize.easing);
  }

  const evWidth = getActiveEvent(e => e.width !== undefined);
  if (evWidth && evWidth.width) {
    state.width = computeValue(frame, sf(evWidth), ef(evWidth), evWidth.width[0], evWidth.width[1], evWidth.easing);
  }

  const evHeight = getActiveEvent(e => e.height !== undefined);
  if (evHeight && evHeight.height) {
    state.height = computeValue(frame, sf(evHeight), ef(evHeight), evHeight.height[0], evHeight.height[1], evHeight.easing);
  }

  const evScaleX = getActiveEvent(e => e.scaleX !== undefined);
  if (evScaleX && evScaleX.scaleX) {
    state.scaleX = computeValue(frame, sf(evScaleX), ef(evScaleX), evScaleX.scaleX[0], evScaleX.scaleX[1], evScaleX.easing);
  }

  const evScaleY = getActiveEvent(e => e.scaleY !== undefined);
  if (evScaleY && evScaleY.scaleY) {
    state.scaleY = computeValue(frame, sf(evScaleY), ef(evScaleY), evScaleY.scaleY[0], evScaleY.scaleY[1], evScaleY.easing);
  }

  const evCornerRadius = getActiveEvent(e => e.cornerRadius !== undefined);
  if (evCornerRadius && evCornerRadius.cornerRadius) {
    state.cornerRadius = computeValue(frame, sf(evCornerRadius), ef(evCornerRadius), evCornerRadius.cornerRadius[0], evCornerRadius.cornerRadius[1], evCornerRadius.easing);
  }

  const evShadowX    = getActiveEvent(e => e.shadow?.offsetX !== undefined);
  const evShadowY    = getActiveEvent(e => e.shadow?.offsetY !== undefined);
  const evShadowBlur = getActiveEvent(e => e.shadow?.blur    !== undefined);
  const evShadowColor = getActiveEvent(e => e.shadow?.color  !== undefined);

  if (evShadowX || evShadowY || evShadowBlur || evShadowColor) {
    if (!state.shadow) state.shadow = obj.shadow ? { ...obj.shadow } : { offsetX: 0, offsetY: 0, blur: 0, color: "transparent" };
    if (evShadowX    && evShadowX.shadow?.offsetX)    state.shadow.offsetX = computeValue(frame, sf(evShadowX), ef(evShadowX), evShadowX.shadow.offsetX[0], evShadowX.shadow.offsetX[1], evShadowX.easing);
    if (evShadowY    && evShadowY.shadow?.offsetY)    state.shadow.offsetY = computeValue(frame, sf(evShadowY), ef(evShadowY), evShadowY.shadow.offsetY[0], evShadowY.shadow.offsetY[1], evShadowY.easing);
    if (evShadowBlur && evShadowBlur.shadow?.blur)    state.shadow.blur    = computeValue(frame, sf(evShadowBlur), ef(evShadowBlur), evShadowBlur.shadow.blur[0], evShadowBlur.shadow.blur[1], evShadowBlur.easing);
    if (evShadowColor && evShadowColor.shadow?.color) state.shadow.color   = computeColorValue(frame, sf(evShadowColor), ef(evShadowColor), evShadowColor.shadow.color[0], evShadowColor.shadow.color[1], evShadowColor.easing);
  }

  const evStrokeWidth = getActiveEvent(e => e.stroke?.width !== undefined);
  const evStrokeColor = getActiveEvent(e => e.stroke?.color !== undefined);

  if (evStrokeWidth || evStrokeColor) {
    if (!state.stroke) state.stroke = obj.stroke ? { ...obj.stroke } : { width: 1, color: "#000000" };
    if (evStrokeWidth && evStrokeWidth.stroke?.width) state.stroke.width = computeValue(frame, sf(evStrokeWidth), ef(evStrokeWidth), evStrokeWidth.stroke.width[0], evStrokeWidth.stroke.width[1], evStrokeWidth.easing);
    if (evStrokeColor && evStrokeColor.stroke?.color) state.stroke.color = computeColorValue(frame, sf(evStrokeColor), ef(evStrokeColor), evStrokeColor.stroke.color[0], evStrokeColor.stroke.color[1], evStrokeColor.easing);
  }

  const evTextSize   = getActiveEvent(e => e.text?.fontSize   !== undefined);
  const evTextColor  = getActiveEvent(e => e.text?.textColor  !== undefined);
  const evTextWeight = getActiveEvent(e => e.text?.fontWeight !== undefined);

  if (evTextSize || evTextColor || evTextWeight) {
    if (!state.text) state.text = obj.text ? { ...obj.text, fontWeight: obj.text.fontWeight ?? "normal" } : { content: "", fontSize: 16, textColor: "#000000", fontWeight: "normal" };
    if (evTextSize   && evTextSize.text?.fontSize)   state.text!.fontSize  = computeValue(frame, sf(evTextSize), ef(evTextSize), evTextSize.text.fontSize[0], evTextSize.text.fontSize[1], evTextSize.easing);
    if (evTextColor  && evTextColor.text?.textColor) state.text!.textColor = computeColorValue(frame, sf(evTextColor), ef(evTextColor), evTextColor.text.textColor[0], evTextColor.text.textColor[1], evTextColor.easing);
    if (evTextWeight && evTextWeight.text?.fontWeight) state.text!.fontWeight = evTextWeight.text.fontWeight;
  }

  const evGlowBlur      = getActiveEvent(e => e.glow?.blur      !== undefined);
  const evGlowIntensity = getActiveEvent(e => e.glow?.intensity !== undefined);
  const evGlowColor     = getActiveEvent(e => e.glow?.color     !== undefined);

  if (evGlowBlur || evGlowIntensity || evGlowColor) {
    if (!state.glow) state.glow = obj.glow ? { ...obj.glow } : { blur: 0, intensity: 0, color: "transparent" };
    if (evGlowBlur      && evGlowBlur.glow?.blur)           state.glow.blur      = computeValue(frame, sf(evGlowBlur), ef(evGlowBlur), evGlowBlur.glow.blur[0], evGlowBlur.glow.blur[1], evGlowBlur.easing);
    if (evGlowIntensity && evGlowIntensity.glow?.intensity) state.glow.intensity = computeValue(frame, sf(evGlowIntensity), ef(evGlowIntensity), evGlowIntensity.glow.intensity[0], evGlowIntensity.glow.intensity[1], evGlowIntensity.easing);
    if (evGlowColor     && evGlowColor.glow?.color)         state.glow.color     = computeColorValue(frame, sf(evGlowColor), ef(evGlowColor), evGlowColor.glow.color[0], evGlowColor.glow.color[1], evGlowColor.easing);
  }

  const evSkewX = getActiveEvent(e => e.skewX !== undefined);
  if (evSkewX && evSkewX.skewX) {
    state.skewX = computeValue(frame, sf(evSkewX), ef(evSkewX), evSkewX.skewX[0], evSkewX.skewX[1], evSkewX.easing);
  }

  const evSkewY = getActiveEvent(e => e.skewY !== undefined);
  if (evSkewY && evSkewY.skewY) {
    state.skewY = computeValue(frame, sf(evSkewY), ef(evSkewY), evSkewY.skewY[0], evSkewY.skewY[1], evSkewY.easing);
  }

  const evBlur = getActiveEvent(e => e.blur !== undefined);
  if (evBlur && evBlur.blur) {
    state.blur = computeValue(frame, sf(evBlur), ef(evBlur), evBlur.blur[0], evBlur.blur[1], evBlur.easing);
  }

  // ── Stroke draw coverage (stroke_draw field) ──
  const evStrokeDraw = getActiveEvent(e => (e as any).stroke_draw !== undefined);
  if (evStrokeDraw) {
    const sd = (evStrokeDraw as any).stroke_draw;
    state.strokeCoverage = computeValue(frame, sf(evStrokeDraw), ef(evStrokeDraw), sd.coverage_from, sd.coverage_to, evStrokeDraw.easing);
  }

  // ── Dash pattern offset (dash_pattern field) ──
  const evDash = getActiveEvent(e => (e as any).dash_pattern !== undefined);
  if (evDash) {
    const dp = (evDash as any).dash_pattern;
    state.dashOffset = computeValue(frame, sf(evDash), ef(evDash), dp.offset_from_px, dp.offset_to_px, evDash.easing);
  }

  // ── Pivot resolution ──
  const evPivot = events.find(
    (e) =>
      e.pivotPoint !== undefined &&
      Math.round(et(e)[0] * fps) <= frame &&
      frame <= Math.round(et(e)[1] * fps),
  );
  if (evPivot?.pivotPoint) {
    state.pivot = evPivot.pivotPoint;
  }

  // ── motionType:"follow" — track another object's position ──
  // Evaluated here so it can be overridden by the parent-child block below.
  if (allComputedStates) {
    const evFollow = events.find(
      (e) =>
        e.motionType === "follow" &&
        e.followTarget &&
        Math.round(et(e)[0] * fps) <= frame &&
        frame <= Math.round(et(e)[1] * fps),
    );
    if (evFollow && evFollow.followTarget) {
      const lagFrames = Math.round((evFollow.followLag ?? 0) * fps);
      let targetState: ComputedObjectState | undefined;
      if (lagFrames > 0) {
        const laggedFrame = Math.max(0, frame - lagFrames);
        const targetObj = spec.objects.find((o) => o.id === evFollow.followTarget);
        if (targetObj) {
          targetState = computeObjectState(laggedFrame, fps, spec, targetObj);
        }
      } else {
        targetState = allComputedStates.get(evFollow.followTarget);
      }
      if (targetState) {
        state.x = targetState.x + (evFollow.followOffset?.[0] ?? 0);
        state.y = targetState.y + (evFollow.followOffset?.[1] ?? 0);
      }
    }
  }

  // ── Parent-child transform (scene graph) ──
  if (parentState) {
    if (obj.inheritRotation || obj.inheritScale) {
      // Full 2D affine path — rotate child's local offset by parent world rotation
      const parentRotRad = (parentState.worldRotation * Math.PI) / 180;
      const parentSc = obj.inheritScale ? parentState.worldScale : 1;
      const localX = state.x;
      const localY = state.y;
      const rotatedX = localX * Math.cos(parentRotRad) - localY * Math.sin(parentRotRad);
      const rotatedY = localX * Math.sin(parentRotRad) + localY * Math.cos(parentRotRad);
      state.x = parentState.x + rotatedX * parentSc;
      state.y = parentState.y + rotatedY * parentSc;
      if (obj.inheritRotation) state.rotation += parentState.worldRotation;
      if (obj.inheritScale) state.scale *= parentState.worldScale;
    } else {
      // Backward-compat path: simple additive 2D position offset
      state.x += parentState.x;
      state.y += parentState.y;
    }
  }

  // ── Accumulate world-space values for children ──
  state.worldRotation = state.rotation;
  state.worldScale = state.scale;

  return state;
}

// ─── Repeat expansion (Phase D) ──────────────────────────────────────────────

/**
 * Pre-expands timeline events that carry a `repeat` field into sequential
 * time windows before getActiveEvent() runs.
 *
 * Uses ping-pong: odd repetitions swap from/to so looping animations
 * reverse smoothly (e.g. scale 1→1.08 then 1.08→1 then 1→1.08…).
 *
 * Example:
 *   { time:[0,3], scale:[1,1.08], repeat:"infinite" }  (duration=6)
 *   →  { time:[0,3], scale:[1,1.08] }
 *      { time:[3,6], scale:[1.08,1] }   ← reversed
 */
function expandRepeatingEvents(
  events: TimelineEvent[],
  _fps: number,
  totalDuration: number,
): TimelineEvent[] {
  const result: TimelineEvent[] = [];

  for (const ev of events) {
    if (ev.repeat === undefined) {
      result.push(ev);
      continue;
    }

    // By the time events reach this function the normalizer has set `time`.
    const evTime = ev.time!;
    const segDuration = evTime[1] - evTime[0];
    if (segDuration <= 0) {
      result.push({ ...ev, repeat: undefined });
      continue;
    }

    const maxReps =
      ev.repeat === "infinite"
        ? Math.ceil((totalDuration - evTime[0]) / segDuration) + 1
        : (ev.repeat as number) + 1;

    for (let i = 0; i < maxReps; i++) {
      const start = evTime[0] + i * segDuration;
      const end = start + segDuration;
      if (start >= totalDuration) break;

      const segment = { ...ev, time: [start, Math.min(end, totalDuration)] as [number, number], repeat: undefined };

      if (i % 2 === 1) swapTuples(segment);

      result.push(segment);
    }
  }

  return result;
}

/** Swap [from, to] → [to, from] for all animatable tuple properties on an event (in place). */
function swapTuples(ev: TimelineEvent): void {
  const swap = <T>(t: [T, T] | undefined): [T, T] | undefined =>
    t ? [t[1], t[0]] : undefined;

  // opacity and scale are union types; only swap if they are already in tuple form
  // (the normalizer guarantees tuple form before the runtime, but swapTuples runs
  // on already-normalised events, so the cast is safe here).
  if (ev.opacity && Array.isArray(ev.opacity)) ev.opacity = swap(ev.opacity as [number, number])!;
  if (ev.scale   && Array.isArray(ev.scale))   ev.scale   = swap(ev.scale   as [number, number])!;
  if (ev.rotation)     ev.rotation     = swap(ev.rotation)!;
  if (ev.x)            ev.x            = swap(ev.x)!;
  if (ev.y)            ev.y            = swap(ev.y)!;
  if (ev.color)        ev.color        = swap(ev.color)!;
  if (ev.diameter)     ev.diameter     = swap(ev.diameter)!;
  if (ev.width)        ev.width        = swap(ev.width)!;
  if (ev.height)       ev.height       = swap(ev.height)!;
  if (ev.scaleX)       ev.scaleX       = swap(ev.scaleX)!;
  if (ev.scaleY)       ev.scaleY       = swap(ev.scaleY)!;
  if (ev.cornerRadius) ev.cornerRadius = swap(ev.cornerRadius)!;
  if (ev.pos)          ev.pos          = swap(ev.pos)!;
  if (ev.size)         ev.size         = swap(ev.size)!;
  if (ev.blur)         ev.blur         = swap(ev.blur)!;
  if (ev.skewX)        ev.skewX        = swap(ev.skewX)!;
  if (ev.skewY)        ev.skewY        = swap(ev.skewY)!;

  if (ev.shadow) {
    if (ev.shadow.offsetX) ev.shadow.offsetX = swap(ev.shadow.offsetX)!;
    if (ev.shadow.offsetY) ev.shadow.offsetY = swap(ev.shadow.offsetY)!;
    if (ev.shadow.blur)    ev.shadow.blur    = swap(ev.shadow.blur)!;
    if (ev.shadow.color)   ev.shadow.color   = swap(ev.shadow.color)!;
  }

  if (ev.glow) {
    if (ev.glow.blur)      ev.glow.blur      = swap(ev.glow.blur)!;
    if (ev.glow.intensity) ev.glow.intensity = swap(ev.glow.intensity)!;
    if (ev.glow.color)     ev.glow.color     = swap(ev.glow.color)!;
  }
}
