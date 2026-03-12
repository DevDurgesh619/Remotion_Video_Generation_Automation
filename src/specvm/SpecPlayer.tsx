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
import { expandMotionTypes } from "./motionTypeExpander";
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

    // Expand semantic motion types (orbit → pos keyframes, move → pass-through)
    const motionExpanded    = expandMotionTypes(behaviorExpanded);
    const expanded          = expandSpec(motionExpanded);
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
  // We accumulate computed states so each child can look up its parent's world position,
  // and so motionType:"follow" events can read already-computed target states.
  const computedStates = new Map<string, ComputedObjectState>();

  // PASS 1 — compute all object states (property interpolation + parent transform)
  for (const obj of objects) {
    try {
      const parentState = obj.parent ? computedStates.get(obj.parent) : undefined;
      const state = computeObjectState(frame, safeSpec.fps, safeSpec, obj, parentState, computedStates);
      computedStates.set(obj.id, state);
    } catch (err) {
      // Leave this object's state absent — render step will emit the diagnostic overlay
    }
  }

  // PASS 2 — apply persistent SceneObject.constraints
  // Runs after all states are computed so targets are fully resolved.
  for (const obj of objects) {
    if (!obj.constraints?.length) continue;
    const state = computedStates.get(obj.id);
    if (!state) continue;

    for (const c of obj.constraints) {
      if (c.type === "follow" || c.type === "attach") {
        const targetState = computedStates.get(c.target ?? "");
        if (!targetState) continue;

        if (c.lag && c.lag > 0) {
          const lagFrame = Math.max(0, frame - Math.round(c.lag * safeSpec.fps));
          const targetObj = safeSpec.objects.find((o) => o.id === c.target);
          if (targetObj) {
            const laggedTarget = computeObjectState(lagFrame, safeSpec.fps, safeSpec, targetObj);
            state.x = laggedTarget.x + (c.offsetX ?? 0);
            state.y = laggedTarget.y + (c.offsetY ?? 0);
          }
        } else if (c.type === "attach") {
          // Attach: rotate the offset by target's current rotation
          const θ = (targetState.rotation * Math.PI) / 180;
          const ox = c.offsetX ?? 0;
          const oy = c.offsetY ?? 0;
          state.x = targetState.x + ox * Math.cos(θ) - oy * Math.sin(θ);
          state.y = targetState.y + ox * Math.sin(θ) + oy * Math.cos(θ);
        } else {
          // Follow: simple offset from target's current position
          state.x = targetState.x + (c.offsetX ?? 0);
          state.y = targetState.y + (c.offsetY ?? 0);
        }
      } else if (c.type === "lock") {
        // Lock: hold at frame-0 computed values
        const frame0State = computeObjectState(0, safeSpec.fps, safeSpec, obj);
        if (c.lockX) state.x = frame0State.x;
        if (c.lockY) state.y = frame0State.y;
        if (c.lockRotation) state.rotation = frame0State.rotation;
      }
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
