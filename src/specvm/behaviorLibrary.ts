/**
 * Behavior Library
 *
 * Predefined motion patterns the LLM can reference by name instead of
 * specifying raw keyframes. Each behavior function receives a target id,
 * a time range, a params object, and (optionally) the scene object for
 * position context, and returns one or more raw TimelineEvents.
 *
 * Available behaviors:
 *   fade-in | fade-out | grow-from-center | bounce-in | pulse | shake
 *   slide-in-left | slide-in-right | slide-in-top | slide-in-bottom
 */

import type { TimelineEvent, SceneObject } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BehaviorParams = Record<string, number | string | boolean>;

export type BehaviorFn = (
  target: string,
  time: [number, number],
  params: BehaviorParams,
  obj?: SceneObject,
) => TimelineEvent[];

// ─── fade-in ─────────────────────────────────────────────────────────────────
// Fades opacity from 0 → 1 over the given time range.

const fadeIn: BehaviorFn = (target, time, params) => {
  const easing = (params.easing as string) ?? "ease-out";
  return [{ target, time, opacity: [0, 1], easing }];
};

// ─── fade-out ────────────────────────────────────────────────────────────────
// Fades opacity from 1 → 0 over the given time range.

const fadeOut: BehaviorFn = (target, time, params) => {
  const easing = (params.easing as string) ?? "ease-in";
  return [{ target, time, opacity: [1, 0], easing }];
};

// ─── grow-from-center ────────────────────────────────────────────────────────
// Scale 0 → 1 + opacity 0 → 1. Good for revealing shapes and text.

const growFromCenter: BehaviorFn = (target, time, params) => {
  const easing = (params.easing as string) ?? "ease-out-cubic";
  return [
    { target, time, scale: [0, 1], easing },
    { target, time, opacity: [0, 1], easing },
  ];
};

// ─── bounce-in ───────────────────────────────────────────────────────────────
// Scale 0 → 1.15 (70% of duration), then 1.15 → 1 (remaining 30%).
// Produces an elastic overshoot effect without spring physics.

const bounceIn: BehaviorFn = (target, time, params) => {
  const easing = (params.easing as string) ?? "ease-out";
  const duration = time[1] - time[0];
  const phase1End = time[0] + duration * 0.7;

  return [
    { target, time, opacity: [0, 1], easing: "ease-out" },
    { target, time: [time[0], phase1End], scale: [0, 1.15], easing },
    { target, time: [phase1End, time[1]], scale: [1.15, 1], easing: "ease-in" },
  ];
};

// ─── pulse ───────────────────────────────────────────────────────────────────
// Scale breathes 1 → 1+amplitude → 1, repeated `cycles` times.
// params: { amplitude: 0.1, cycles: 1 }

const pulse: BehaviorFn = (target, time, params) => {
  const amplitude = (params.amplitude as number) ?? 0.1;
  const cycles = Math.max(1, Math.round((params.cycles as number) ?? 1));
  const easing = (params.easing as string) ?? "ease-in-out";
  const duration = time[1] - time[0];
  const halfCycle = duration / (cycles * 2);
  const events: TimelineEvent[] = [];

  for (let i = 0; i < cycles; i++) {
    const t0 = time[0] + i * 2 * halfCycle;
    const t1 = t0 + halfCycle;
    const t2 = t1 + halfCycle;
    events.push({ target, time: [t0, t1], scale: [1, 1 + amplitude], easing });
    events.push({ target, time: [t1, t2], scale: [1 + amplitude, 1], easing });
  }

  return events;
};

// ─── shake ───────────────────────────────────────────────────────────────────
// Rapid horizontal oscillations around the object's resting x position.
// params: { amplitude: 20, cycles: 4 }

const shake: BehaviorFn = (target, time, params, obj) => {
  const amplitude = (params.amplitude as number) ?? 20;
  const cycles = Math.max(1, Math.round((params.cycles as number) ?? 4));
  const objX = obj?.pos?.[0] ?? 0;
  const duration = time[1] - time[0];
  const stepDuration = duration / (cycles * 2);
  const events: TimelineEvent[] = [];

  for (let i = 0; i < cycles; i++) {
    const t0 = time[0] + i * 2 * stepDuration;
    const t1 = t0 + stepDuration;
    const t2 = t1 + stepDuration;
    const dir = i % 2 === 0 ? 1 : -1;
    events.push({
      target,
      time: [t0, t1],
      x: [objX, objX + amplitude * dir],
      easing: "ease-in-out",
    });
    events.push({
      target,
      time: [t1, t2],
      x: [objX + amplitude * dir, objX],
      easing: "ease-in-out",
    });
  }

  return events;
};

// ─── slide-in-left ───────────────────────────────────────────────────────────
// Object enters from the left side: x slides from (objX - distance) → objX.
// params: { distance: 400 }

const slideInLeft: BehaviorFn = (target, time, params, obj) => {
  const distance = (params.distance as number) ?? 400;
  const easing = (params.easing as string) ?? "ease-out-cubic";
  const objX = obj?.pos?.[0] ?? 0;

  return [
    { target, time, x: [objX - distance, objX], easing },
    { target, time, opacity: [0, 1], easing: "ease-out" },
  ];
};

// ─── slide-in-right ──────────────────────────────────────────────────────────
// Object enters from the right side: x slides from (objX + distance) → objX.
// params: { distance: 400 }

const slideInRight: BehaviorFn = (target, time, params, obj) => {
  const distance = (params.distance as number) ?? 400;
  const easing = (params.easing as string) ?? "ease-out-cubic";
  const objX = obj?.pos?.[0] ?? 0;

  return [
    { target, time, x: [objX + distance, objX], easing },
    { target, time, opacity: [0, 1], easing: "ease-out" },
  ];
};

// ─── slide-in-top ────────────────────────────────────────────────────────────
// Object drops in from above: y slides from (objY - distance) → objY.
// params: { distance: 300 }

const slideInTop: BehaviorFn = (target, time, params, obj) => {
  const distance = (params.distance as number) ?? 300;
  const easing = (params.easing as string) ?? "ease-out-cubic";
  const objY = obj?.pos?.[1] ?? 0;

  return [
    { target, time, y: [objY - distance, objY], easing },
    { target, time, opacity: [0, 1], easing: "ease-out" },
  ];
};

// ─── slide-in-bottom ─────────────────────────────────────────────────────────
// Object rises in from below: y slides from (objY + distance) → objY.
// params: { distance: 300 }

const slideInBottom: BehaviorFn = (target, time, params, obj) => {
  const distance = (params.distance as number) ?? 300;
  const easing = (params.easing as string) ?? "ease-out-cubic";
  const objY = obj?.pos?.[1] ?? 0;

  return [
    { target, time, y: [objY + distance, objY], easing },
    { target, time, opacity: [0, 1], easing: "ease-out" },
  ];
};

// ─── Behavior Registry ───────────────────────────────────────────────────────

export const BEHAVIOR_LIBRARY: Record<string, BehaviorFn> = {
  "fade-in": fadeIn,
  "fade-out": fadeOut,
  "grow-from-center": growFromCenter,
  "bounce-in": bounceIn,
  "pulse": pulse,
  "shake": shake,
  "slide-in-left": slideInLeft,
  "slide-in-right": slideInRight,
  "slide-in-top": slideInTop,
  "slide-in-bottom": slideInBottom,
};
