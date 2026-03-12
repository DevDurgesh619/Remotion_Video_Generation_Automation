/**
 * Component Expander
 *
 * Pipeline step that expands `components` array entries into flat objects + timeline
 * using templates registered in componentLibrary.
 *
 * Runs AFTER specExpander (generators) and BEFORE sceneGraphResolver in the pipeline:
 *   behaviorExpander → specExpander → componentExpander → sceneGraphResolver → validateSpec
 *
 * If no `components` array is present, returns the spec unchanged (backward compatible).
 *
 * Spec usage:
 *   "components": [
 *     { "componentType": "stat_card", "id": "rev", "pos": [-300, 0],
 *       "params": { "value": "$2.4M", "label": "Revenue", "accentColor": "#2196F3" } },
 *     { "componentType": "progress_bar", "id": "prog1", "pos": [0, 200],
 *       "params": { "value": 72, "label": "Completion", "color": "#4CAF50" } }
 *   ]
 */

import type { MotionSpec } from "./types";
import { getComponent, listComponents } from "./componentLibrary";

// ─── Public entry point ──────────────────────────────────────────────────────

export function expandComponents(spec: MotionSpec): MotionSpec {
  if (!spec.components || spec.components.length === 0) {
    return spec;
  }

  let allObjects    = [...(spec.objects  ?? [])];
  let allTimeline   = [...(spec.timeline ?? [])];

  for (const instance of spec.components) {
    const template = getComponent(instance.componentType);

    if (!template) {
      console.warn(
        `[componentExpander] Unknown component type "${instance.componentType}" (id: "${instance.id}"). ` +
          `Available types: ${listComponents().join(", ")}`,
      );
      continue;
    }

    // Ensure IDs are unique across instances — all generated object IDs are prefixed with instance.id
    const pos: [number, number] = instance.pos ?? [0, 0];
    const params = instance.params ?? {};

    try {
      const { objects, timeline } = template.expand(instance.id, pos, params);
      allObjects  = allObjects.concat(objects);
      allTimeline = allTimeline.concat(timeline);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[componentExpander] Failed to expand component "${instance.componentType}" (id: "${instance.id}"): ${msg}`,
      );
    }
  }

  return {
    ...spec,
    objects:  allObjects,
    timeline: allTimeline,
  };
}
