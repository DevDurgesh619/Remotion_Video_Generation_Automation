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

    shadow: obj.shadow
      ? { ...obj.shadow }
      : null,

    stroke: obj.stroke
      ? { ...obj.stroke }
      : null,

    text: obj.text
      ? { ...obj.text, fontWeight: obj.text.fontWeight ?? "normal" }
      : null,

    glow: obj.glow ? { ...obj.glow } : null,

    blur: obj.blur ?? 0,
    skewX: obj.skewX ?? 0,
    skewY: obj.skewY ?? 0,

    // World-space accumulated values — populated after parent-child resolution
    worldRotation: obj.rotation ?? 0,
    worldScale: obj.scale ?? 1,

    // Pivot resolved below from events / obj.pivot
    pivot: obj.pivot ?? [0, 0],
  };

  // ── Collect all timeline events for this object (with repeat expansion) ──
  const rawEvents: TimelineEvent[] = spec.timeline.filter(
    (e) => e.target === obj.id,
  );
  const events = expandRepeatingEvents(rawEvents, fps, spec.duration);

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

  // Individual width/height animations override compound size
  const evWidth = getActiveEvent(e => e.width !== undefined);
  if (evWidth && evWidth.width) {
    state.width = computeValue(frame, Math.round(evWidth.time[0]*fps), Math.round(evWidth.time[1]*fps), evWidth.width[0], evWidth.width[1], evWidth.easing);
  }

  const evHeight = getActiveEvent(e => e.height !== undefined);
  if (evHeight && evHeight.height) {
    state.height = computeValue(frame, Math.round(evHeight.time[0]*fps), Math.round(evHeight.time[1]*fps), evHeight.height[0], evHeight.height[1], evHeight.easing);
  }

  // Directional scaling
  const evScaleX = getActiveEvent(e => e.scaleX !== undefined);
  if (evScaleX && evScaleX.scaleX) {
    state.scaleX = computeValue(frame, Math.round(evScaleX.time[0]*fps), Math.round(evScaleX.time[1]*fps), evScaleX.scaleX[0], evScaleX.scaleX[1], evScaleX.easing);
  }

  const evScaleY = getActiveEvent(e => e.scaleY !== undefined);
  if (evScaleY && evScaleY.scaleY) {
    state.scaleY = computeValue(frame, Math.round(evScaleY.time[0]*fps), Math.round(evScaleY.time[1]*fps), evScaleY.scaleY[0], evScaleY.scaleY[1], evScaleY.easing);
  }

  // Corner radius
  const evCornerRadius = getActiveEvent(e => e.cornerRadius !== undefined);
  if (evCornerRadius && evCornerRadius.cornerRadius) {
    state.cornerRadius = computeValue(frame, Math.round(evCornerRadius.time[0]*fps), Math.round(evCornerRadius.time[1]*fps), evCornerRadius.cornerRadius[0], evCornerRadius.cornerRadius[1], evCornerRadius.easing);
  }


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

  // Glow
  const evGlowBlur = getActiveEvent(e => e.glow?.blur !== undefined);
  const evGlowIntensity = getActiveEvent(e => e.glow?.intensity !== undefined);
  const evGlowColor = getActiveEvent(e => e.glow?.color !== undefined);

  if (evGlowBlur || evGlowIntensity || evGlowColor) {
    if (!state.glow) state.glow = obj.glow ? { ...obj.glow } : { blur: 0, intensity: 0, color: "transparent" };
    if (evGlowBlur && evGlowBlur.glow?.blur) state.glow.blur = computeValue(frame, Math.round(evGlowBlur.time[0]*fps), Math.round(evGlowBlur.time[1]*fps), evGlowBlur.glow.blur[0], evGlowBlur.glow.blur[1], evGlowBlur.easing);
    if (evGlowIntensity && evGlowIntensity.glow?.intensity) state.glow.intensity = computeValue(frame, Math.round(evGlowIntensity.time[0]*fps), Math.round(evGlowIntensity.time[1]*fps), evGlowIntensity.glow.intensity[0], evGlowIntensity.glow.intensity[1], evGlowIntensity.easing);
    if (evGlowColor && evGlowColor.glow?.color) state.glow.color = computeColorValue(frame, Math.round(evGlowColor.time[0]*fps), Math.round(evGlowColor.time[1]*fps), evGlowColor.glow.color[0], evGlowColor.glow.color[1], evGlowColor.easing);
  }

  // Skew transform
  const evSkewX = getActiveEvent(e => e.skewX !== undefined);
  if (evSkewX && evSkewX.skewX) {
    state.skewX = computeValue(frame, Math.round(evSkewX.time[0]*fps), Math.round(evSkewX.time[1]*fps), evSkewX.skewX[0], evSkewX.skewX[1], evSkewX.easing);
  }

  const evSkewY = getActiveEvent(e => e.skewY !== undefined);
  if (evSkewY && evSkewY.skewY) {
    state.skewY = computeValue(frame, Math.round(evSkewY.time[0]*fps), Math.round(evSkewY.time[1]*fps), evSkewY.skewY[0], evSkewY.skewY[1], evSkewY.easing);
  }

  // CSS blur filter
  const evBlur = getActiveEvent(e => e.blur !== undefined);
  if (evBlur && evBlur.blur) {
    state.blur = computeValue(frame, Math.round(evBlur.time[0]*fps), Math.round(evBlur.time[1]*fps), evBlur.blur[0], evBlur.blur[1], evBlur.easing);
  }

  // ── Pivot resolution ──
  // Per-event pivotPoint overrides object-level pivot. Both default to [0,0].
  const evPivot = events.find(
    (e) =>
      e.pivotPoint !== undefined &&
      Math.round(e.time[0] * fps) <= frame &&
      frame <= Math.round(e.time[1] * fps),
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
        Math.round(e.time[0] * fps) <= frame &&
        frame <= Math.round(e.time[1] * fps),
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
  fps: number,
  totalDuration: number,
): TimelineEvent[] {
  const result: TimelineEvent[] = [];

  for (const ev of events) {
    if (ev.repeat === undefined) {
      result.push(ev);
      continue;
    }

    const segDuration = ev.time[1] - ev.time[0];
    if (segDuration <= 0) {
      result.push({ ...ev, repeat: undefined });
      continue;
    }

    const maxReps =
      ev.repeat === "infinite"
        ? Math.ceil((totalDuration - ev.time[0]) / segDuration) + 1
        : (ev.repeat as number) + 1; // +1 includes the original play

    for (let i = 0; i < maxReps; i++) {
      const start = ev.time[0] + i * segDuration;
      const end = start + segDuration;
      if (start >= totalDuration) break;

      const segment = { ...ev, time: [start, Math.min(end, totalDuration)] as [number, number], repeat: undefined };

      // Ping-pong: reverse from/to on odd repetitions
      if (i % 2 === 1) {
        swapTuples(segment);
      }

      result.push(segment);
    }
  }

  return result;
}

/** Swap [from, to] → [to, from] for all animatable tuple properties on an event (in place). */
function swapTuples(ev: TimelineEvent): void {
  const swap = <T>(t: [T, T] | undefined): [T, T] | undefined =>
    t ? [t[1], t[0]] : undefined;

  if (ev.opacity)      ev.opacity      = swap(ev.opacity)!;
  if (ev.scale)        ev.scale        = swap(ev.scale)!;
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
