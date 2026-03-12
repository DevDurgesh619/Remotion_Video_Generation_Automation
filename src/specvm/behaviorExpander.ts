/**
 * Behavior Expander
 *
 * Resolves behavior-shorthand timeline events into raw timeline events
 * before the spec reaches the SpecVM runtime.
 *
 * Pipeline position (runs first):
 *   spec → expandBehaviors() → expandSpec() → validateSpec() → normalizeSpec() → render
 *
 * If no timeline events carry a `behavior` field, the spec is returned
 * unchanged (backward compatible, zero overhead).
 */

import type { MotionSpec, TimelineEvent, SceneObject } from "./types";
import { BEHAVIOR_LIBRARY } from "./behaviorLibrary";

// ─── Warning type ─────────────────────────────────────────────────────────────

export interface ExpanderWarning {
  type: "unknown_behavior";
  behavior: string;
  target: string;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export interface ExpandBehaviorsResult {
  spec: MotionSpec;
  warnings: ExpanderWarning[];
}

export function expandBehaviors(spec: MotionSpec): ExpandBehaviorsResult {
  const warnings: ExpanderWarning[] = [];

  // Fast path: nothing to expand
  if (!spec.timeline.some((e) => e.behavior)) {
    return { spec, warnings };
  }

  // Build id → SceneObject map for position lookups (needed by slide-in-* / shake)
  const objectMap = new Map<string, SceneObject>();
  for (const obj of spec.objects ?? []) {
    objectMap.set(obj.id, obj);
  }

  const expandedTimeline: TimelineEvent[] = [];

  for (const event of spec.timeline) {
    if (!event.behavior) {
      // Not a behavior event — pass through unchanged
      expandedTimeline.push(event);
      continue;
    }

    const fn = BEHAVIOR_LIBRARY[event.behavior];
    if (!fn) {
      const warning: ExpanderWarning = {
        type: "unknown_behavior",
        behavior: event.behavior,
        target: event.target,
      };
      warnings.push(warning);
      console.warn(
        `[behaviorExpander] Unknown behavior "${event.behavior}" on target "${event.target}". ` +
        `Event DROPPED — object may remain in its initial state (blank if opacity:0).`,
      );
      continue;
    }

    const params = event.params ?? {};
    const obj = objectMap.get(event.target);
    const rawEvents = fn(event.target, event.time, params, obj);
    expandedTimeline.push(...rawEvents);
  }

  return { spec: { ...spec, timeline: expandedTimeline }, warnings };
}
