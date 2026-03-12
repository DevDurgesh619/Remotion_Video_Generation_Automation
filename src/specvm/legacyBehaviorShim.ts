/**
 * Legacy Behavior Shim
 *
 * Converts old-format specs (v1) to the new explicit-field format (v2) so the
 * rest of the pipeline only ever sees v2 data.
 *
 * Handles two legacy patterns:
 *
 * 1. `behavior` shorthand  — e.g. { behavior:"slide-in-left", params:{ distance:400 } }
 *    Expanded inline into explicit translate / opacity fields using the same logic
 *    that lived in behaviorLibrary.ts, but now producing v2 AnimationBlock fields
 *    instead of raw [from,to] tuples so the normalizer can handle them uniformly.
 *
 * 2. `motionType` — "orbit" / "move" / "follow" / "pivot"
 *    - "orbit"  → converted to advanced_action:{ type:"orbit", orbit:{…} } so
 *                  advancedActionExpander handles the keyframe math.
 *    - "move"   → stripped (semantic alias, pos already present).
 *    - "follow" / "pivot" → passed through unchanged (runtime handles them).
 *
 * Fast-path: if the spec carries no `behavior` or `motionType` fields, it is
 * returned unchanged — zero overhead for already-migrated specs.
 */

import type { MotionSpec, TimelineEvent, SceneObject } from "./types";

// ─── Entry point ─────────────────────────────────────────────────────────────

export function applyLegacyBehaviorShim(spec: MotionSpec): MotionSpec {
  const needsShim = spec.timeline.some(
    (e) => e.behavior !== undefined || e.motionType !== undefined,
  );
  if (!needsShim) return spec;

  // Build id → object map for position-dependent behaviors (slide-in-*, shake)
  const objectMap = new Map<string, SceneObject>();
  for (const obj of spec.objects ?? []) objectMap.set(obj.id, obj);

  const newTimeline: TimelineEvent[] = [];

  for (const event of spec.timeline) {
    // ── behavior field ───────────────────────────────────────────────────────
    if (event.behavior) {
      const obj = objectMap.get(event.target);
      const expanded = expandBehavior(event, obj);
      newTimeline.push(...expanded);
      continue;
    }

    // ── motionType field ─────────────────────────────────────────────────────
    if (event.motionType) {
      switch (event.motionType) {
        case "orbit": {
          // Re-wrap old OrbitParams into the new advanced_action format so
          // advancedActionExpander can handle it with consistent logic.
          const { motionType: _mt, orbit, ...rest } = event as any;
          if (orbit) {
            newTimeline.push({
              ...rest,
              advanced_action: {
                type: "orbit",
                orbit: {
                  center_x_px:   orbit.centerX   ?? 0,
                  center_y_px:   orbit.centerY   ?? 0,
                  radius_px:     orbit.radius    ?? 100,
                  degrees:       (orbit.endAngle ?? 360) - (orbit.startAngle ?? 0),
                  start_angle:   orbit.startAngle ?? 0,
                  direction:     orbit.direction === "counterclockwise" ? "ccw" : "cw",
                },
              },
            });
          } else {
            // orbit params missing — drop silently, event was already broken
            console.warn(
              `[legacyBehaviorShim] motionType:"orbit" on "${event.target}" has no orbit params — skipped`,
            );
          }
          break;
        }

        case "move": {
          // Semantic alias — strip motionType, keep everything else
          const { motionType: _mt, orbit: _o, followTarget: _ft, followOffset: _fo, followLag: _fl, ...rest } = event as any;
          newTimeline.push(rest as TimelineEvent);
          break;
        }

        // follow and pivot are resolved at runtime — pass through unchanged
        default:
          newTimeline.push(event);
          break;
      }
      continue;
    }

    // ── no legacy fields — pass through ─────────────────────────────────────
    newTimeline.push(event);
  }

  return { ...spec, timeline: newTimeline };
}

// ─── Behavior expansion ──────────────────────────────────────────────────────

/**
 * Converts a single legacy behavior event into one or more explicit-field events.
 * Uses the same semantics as the old behaviorLibrary but produces v2-style fields.
 * Unknown behavior names are warned and dropped.
 */
function expandBehavior(event: TimelineEvent, obj?: SceneObject): TimelineEvent[] {
  // Strip legacy fields; we'll rebuild the event with explicit fields
  const { behavior, params, ...base } = event as any;
  const p = params ?? {};
  const time = event.time ?? [event.start_sec ?? 0, event.end_sec ?? 1];

  switch (behavior) {
    case "fade-in":
      return [{ ...base, time, opacity: [0, 1] as [number, number], easing: base.easing ?? "ease-out" }];

    case "fade-out":
      return [{ ...base, time, opacity: [1, 0] as [number, number], easing: base.easing ?? "ease-in" }];

    case "grow-from-center": {
      return [{ ...base, time, scale: [0, 1] as [number, number], opacity: [0, 1] as [number, number], easing: base.easing ?? "ease-out" }];
    }

    case "bounce-in": {
      const dur = time[1] - time[0];
      const mid = time[0] + dur * 0.7;
      return [
        { ...base, time: [time[0], mid] as [number, number], scale: [0, 1.15] as [number, number], easing: "ease-out" },
        { ...base, time: [mid, time[1]] as [number, number], scale: [1.15, 1] as [number, number], easing: "ease-in-out" },
      ];
    }

    case "pulse": {
      const amplitude = typeof p.amplitude === "number" ? p.amplitude : 0.08;
      return [{
        ...base,
        time,
        scale: [1, 1 + amplitude] as [number, number],
        easing: base.easing ?? "ease-in-out",
        repeat: p.cycles !== undefined ? (Number(p.cycles) - 1) : "infinite",
      }];
    }

    case "shake": {
      const distance = typeof p.distance === "number" ? p.distance : 10;
      const cycles   = typeof p.cycles   === "number" ? p.cycles   : 4;
      const dur      = time[1] - time[0];
      const stepDur  = dur / (cycles * 2);
      const events: TimelineEvent[] = [];
      for (let i = 0; i < cycles * 2; i++) {
        const segStart = time[0] + i * stepDur;
        const segEnd   = segStart + stepDur;
        const fromX    = i % 2 === 0 ? -distance : distance;
        const toX      = i % 2 === 0 ? distance  : -distance;
        events.push({ ...base, time: [segStart, segEnd] as [number, number], x: [fromX, toX] as [number, number], easing: "linear" });
      }
      return events;
    }

    case "slide-in-left": {
      const distance = typeof p.distance === "number" ? p.distance : 400;
      const startX   = (obj?.pos?.[0] ?? 0) - distance;
      const endX     = obj?.pos?.[0] ?? 0;
      return [
        { ...base, time, x: [startX, endX] as [number, number], easing: base.easing ?? "ease-out-cubic" },
        { ...base, time, opacity: [0, 1] as [number, number], easing: "ease-out" },
      ];
    }

    case "slide-in-right": {
      const distance = typeof p.distance === "number" ? p.distance : 400;
      const startX   = (obj?.pos?.[0] ?? 0) + distance;
      const endX     = obj?.pos?.[0] ?? 0;
      return [
        { ...base, time, x: [startX, endX] as [number, number], easing: base.easing ?? "ease-out-cubic" },
        { ...base, time, opacity: [0, 1] as [number, number], easing: "ease-out" },
      ];
    }

    case "slide-in-top": {
      const distance = typeof p.distance === "number" ? p.distance : 300;
      const startY   = (obj?.pos?.[1] ?? 0) - distance;
      const endY     = obj?.pos?.[1] ?? 0;
      return [
        { ...base, time, y: [startY, endY] as [number, number], easing: base.easing ?? "ease-out-cubic" },
        { ...base, time, opacity: [0, 1] as [number, number], easing: "ease-out" },
      ];
    }

    case "slide-in-bottom": {
      const distance = typeof p.distance === "number" ? p.distance : 300;
      const startY   = (obj?.pos?.[1] ?? 0) + distance;
      const endY     = obj?.pos?.[1] ?? 0;
      return [
        { ...base, time, y: [startY, endY] as [number, number], easing: base.easing ?? "ease-out-cubic" },
        { ...base, time, opacity: [0, 1] as [number, number], easing: "ease-out" },
      ];
    }

    default:
      console.warn(
        `[legacyBehaviorShim] Unknown behavior "${behavior}" on target "${event.target}" — event DROPPED.`,
      );
      return [];
  }
}
