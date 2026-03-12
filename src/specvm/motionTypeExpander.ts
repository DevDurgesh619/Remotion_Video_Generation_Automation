/**
 * Motion Type Expander
 *
 * Converts semantic motion declarations into raw timeline events before the
 * spec reaches the animation runtime.
 *
 * Supported expansions:
 *   "orbit" → N sequential pos keyframes tracing a circular arc
 *   "move"  → strips motionType, passes pos through unchanged (semantic alias)
 *
 * "follow" and "pivot" are passed through unchanged:
 *   "follow" is resolved per-frame in animationRuntime (needs live object states)
 *   "pivot"  is applied at render time via ComputedObjectState.pivot
 *
 * Fast-path: if no timeline event has a motionType field, returns spec unchanged
 * with zero overhead for existing specs.
 */

import type { MotionSpec, TimelineEvent, OrbitParams } from "./types";

// ─── Public entry point ──────────────────────────────────────────────────────

export function expandMotionTypes(spec: MotionSpec): MotionSpec {
  // Fast-path: skip if no motionType events exist
  if (!spec.timeline.some((e) => e.motionType !== undefined)) {
    return spec;
  }

  const newTimeline: TimelineEvent[] = [];

  for (const event of spec.timeline) {
    if (!event.motionType) {
      newTimeline.push(event);
      continue;
    }

    switch (event.motionType) {
      case "orbit":
        newTimeline.push(...expandOrbit(event, spec.duration));
        break;

      case "move": {
        // Semantic alias — strip motionType, keep everything else
        const { motionType: _mt, orbit: _o, followTarget: _ft, followOffset: _fo, followLag: _fl, ...rest } = event;
        newTimeline.push(rest as TimelineEvent);
        break;
      }

      // follow and pivot pass through — handled at runtime / render time
      default:
        newTimeline.push(event);
        break;
    }
  }

  return { ...spec, timeline: newTimeline };
}

// ─── Orbit expansion ─────────────────────────────────────────────────────────

/**
 * Converts one orbit event into N sequential pos keyframes.
 *
 * The orbit is pre-sampled at 15° intervals (clamped to 4–120 segments).
 * Linear easing between keyframes produces a smooth circular arc.
 *
 * If the event has repeat:"infinite" or repeat:N, the expander tiles the full
 * arc inline (bypassing the runtime ping-pong repeater, which only handles
 * single-property tuples and would reverse the orbit incorrectly).
 */
function expandOrbit(event: TimelineEvent, specDuration: number): TimelineEvent[] {
  const orb = event.orbit;
  if (!orb) {
    console.warn(`[SpecVM] motionType:"orbit" on target "${event.target}" missing "orbit" params — skipped`);
    return [event];
  }

  const cycleDuration = event.time[1] - event.time[0];
  if (cycleDuration <= 0) return [];

  // Build one full arc cycle as segments
  const cycleEvents = buildOrbitCycle(event, orb, event.time[0], cycleDuration);

  // Tile for repeat
  if (event.repeat === undefined) {
    return cycleEvents;
  }

  const numCycles =
    event.repeat === "infinite"
      ? Math.ceil((specDuration - event.time[0]) / cycleDuration) + 1
      : (event.repeat as number) + 1;

  const tiled: TimelineEvent[] = [];
  for (let cycle = 0; cycle < numCycles; cycle++) {
    const offset = cycle * cycleDuration;
    for (const seg of cycleEvents) {
      const segStart = seg.time[0] + offset;
      const segEnd = seg.time[1] + offset;
      if (segStart >= specDuration) break;
      tiled.push({
        ...seg,
        time: [segStart, Math.min(segEnd, specDuration)] as [number, number],
      });
    }
  }

  return tiled;
}

function buildOrbitCycle(
  event: TimelineEvent,
  orb: OrbitParams,
  cycleStart: number,
  cycleDuration: number,
): TimelineEvent[] {
  const direction = orb.direction ?? "clockwise";
  let startDeg = orb.startAngle;
  let endDeg = orb.endAngle;

  // Compute the angular sweep in the chosen direction
  let sweep: number;
  if (direction === "clockwise") {
    if (endDeg <= startDeg) endDeg += 360;
    sweep = endDeg - startDeg; // positive, degrees to travel clockwise
  } else {
    if (startDeg <= endDeg) startDeg += 360;
    sweep = startDeg - endDeg; // positive, degrees to travel counterclockwise
  }

  // Number of linear segments: 1 per 15°, clamped to [4, 120]
  const numSegments = Math.max(4, Math.min(120, Math.ceil(sweep / 15)));

  const segments: TimelineEvent[] = [];
  for (let i = 0; i < numSegments; i++) {
    const t0 = cycleStart + (i / numSegments) * cycleDuration;
    const t1 = cycleStart + ((i + 1) / numSegments) * cycleDuration;

    const frac0 = i / numSegments;
    const frac1 = (i + 1) / numSegments;

    const angleDeg0 =
      direction === "clockwise" ? startDeg + frac0 * sweep : startDeg - frac0 * sweep;
    const angleDeg1 =
      direction === "clockwise" ? startDeg + frac1 * sweep : startDeg - frac1 * sweep;

    const a0 = (angleDeg0 * Math.PI) / 180;
    const a1 = (angleDeg1 * Math.PI) / 180;

    const fromX = orb.centerX + orb.radius * Math.cos(a0);
    const fromY = orb.centerY + orb.radius * Math.sin(a0);
    const toX = orb.centerX + orb.radius * Math.cos(a1);
    const toY = orb.centerY + orb.radius * Math.sin(a1);

    // Strip orbit-specific fields; keep target, easing, and any other relevant fields
    const { motionType: _mt, orbit: _o, repeat: _r, followTarget: _ft, followOffset: _fo, followLag: _fl, pivotPoint: _pp, ...base } = event;

    segments.push({
      ...base,
      time: [t0, t1] as [number, number],
      pos: [[fromX, fromY], [toX, toY]],
      easing: event.easing ?? "linear",
    });
  }

  return segments;
}
