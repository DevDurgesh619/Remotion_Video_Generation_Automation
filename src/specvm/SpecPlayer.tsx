/**
 * SpecPlayer — the Spec VM runtime component.
 *
 * Given a MotionSpec JSON, this component interprets every frame at runtime
 * without any code generation. It is the single entry point that replaces
 * the old TSX-code-gen pipeline.
 *
 * Architecture:
 *   spec → validate → normalize → frame → computeObjectState() per object → renderObject()
 */

import React, { useMemo } from "react";
import { useCurrentFrame, AbsoluteFill } from "remotion";
import type { MotionSpec, GradientBackground, ComputedObjectState } from "./types";
import { computeObjectState } from "./animationRuntime";
import { renderObject } from "./rendererRegistry";
import { validateSpec } from "./specValidator";
import { normalizeSpec } from "./specNormalizer";
import { expandSpec } from "./specExpander";
import { expandBehaviors } from "./behaviorExpander";
import { expandComponents } from "./componentExpander";
import { resolveSceneGraph } from "./sceneGraphResolver";

// ─── Background helper ─────────────────────────────────────────────────────

function resolveBackground(
  bg?: string | GradientBackground,
): React.CSSProperties {
  if (!bg) return { backgroundColor: "white" };

  if (typeof bg === "string") return { backgroundColor: bg };

  // Gradient
  const direction = bg.direction ?? "to bottom";
  return {
    background: `linear-gradient(${direction}, ${bg.from}, ${bg.to})`,
  };
}

// ─── SpecPlayer ─────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== "production";

export const SpecPlayer: React.FC<{ spec: MotionSpec }> = ({ spec }) => {
  // Validate & normalize once (not per frame)
  const safeSpec = useMemo(() => {
    // Pipeline: expand behaviors → expand generators → expand components → resolve scene graph → validate → normalize
    const { spec: behaviorExpanded, warnings: behaviorWarnings } = expandBehaviors(spec);

    // Surface behavior expansion failures loudly — unknown behavior = dropped event = potential blank screen
    if (behaviorWarnings.length > 0) {
      console.error(
        `[SpecVM] Spec "${spec.scene ?? "unnamed"}": ${behaviorWarnings.length} behavior expansion failure(s) — ` +
        `objects may be INVISIBLE if they started at opacity:0:`,
      );
      behaviorWarnings.forEach((w) =>
        console.error(`  ✗ Unknown behavior "${w.behavior}" on target "${w.target}" — event DROPPED`),
      );
    }

    const expanded          = expandSpec(behaviorExpanded);
    const componentsExpanded = expandComponents(expanded);
    const graphResolved     = resolveSceneGraph(componentsExpanded);
    const validation = validateSpec(graphResolved);

    if (validation.warnings.length > 0) {
      console.warn(
        `[SpecVM] Spec "${spec.scene ?? "unnamed"}" has ${validation.warnings.length} warning(s):`,
      );
      validation.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
    }
    if (validation.errors.length > 0) {
      console.error(
        `[SpecVM] Spec "${spec.scene ?? "unnamed"}" has ${validation.errors.length} error(s):`,
      );
      validation.errors.forEach((e) => console.error(`  ✗ ${e}`));
    }

    return normalizeSpec(graphResolved);
  }, [spec]);

  const frame = useCurrentFrame();
  const objects = safeSpec.objects ?? [];

  // ── Scene graph: pre-compute all states in topological order ──
  // sceneGraphResolver guarantees parents appear before children in the array.
  // We accumulate computed states so each child can look up its parent's world position.
  const computedStates = new Map<string, ComputedObjectState>();
  for (const obj of objects) {
    try {
      const parentState = obj.parent ? computedStates.get(obj.parent) : undefined;
      const state = computeObjectState(frame, safeSpec.fps, safeSpec, obj, parentState);
      computedStates.set(obj.id, state);
    } catch (err) {
      // Leave this object's state absent — render step will emit the diagnostic overlay
    }
  }

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        ...resolveBackground(safeSpec.bg),
        overflow: "hidden" as const,
      },
    },
    objects.map((obj) => {
      const state = computedStates.get(obj.id);
      if (!state) {
        if (IS_DEV) {
          return React.createElement("div", {
            key: obj.id,
            "data-specvm-error": obj.id,
            style: {
              position: "absolute" as const,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              padding: "8px 12px",
              background: "rgba(220,38,38,0.9)",
              color: "#fff",
              fontSize: 14,
              fontFamily: "monospace",
              borderRadius: 4,
              zIndex: 9999,
              maxWidth: 400,
              wordBreak: "break-all" as const,
            },
          }, `[SpecVM] "${obj.id}": state computation failed`);
        }
        return null;
      }
      try {
        return renderObject(obj, state);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[SpecVM] Error rendering object "${obj.id}" (shape: ${obj.shape}) at frame ${frame}: ${msg}`,
        );
        if (IS_DEV) {
          return React.createElement("div", {
            key: obj.id,
            "data-specvm-error": obj.id,
            style: {
              position: "absolute" as const,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              padding: "8px 12px",
              background: "rgba(220,38,38,0.9)",
              color: "#fff",
              fontSize: 14,
              fontFamily: "monospace",
              borderRadius: 4,
              zIndex: 9999,
              maxWidth: 400,
              wordBreak: "break-all" as const,
            },
          }, `[SpecVM] "${obj.id}": ${msg}`);
        }
        return null;
      }
    }),
  );
};
