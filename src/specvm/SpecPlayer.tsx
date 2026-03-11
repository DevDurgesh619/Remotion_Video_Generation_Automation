/**
 * SpecPlayer — the Spec VM runtime component.
 *
 * Given a MotionSpec JSON, this component interprets every frame at runtime
 * without any code generation. It is the single entry point that replaces
 * the old TSX-code-gen pipeline.
 *
 * Architecture:
 *   frame → computeObjectState() per object → renderObject() per object
 */

import React from "react";
import { useCurrentFrame, AbsoluteFill } from "remotion";
import type { MotionSpec, GradientBackground } from "./types";
import { computeObjectState } from "./animationRuntime";
import { renderObject } from "./rendererRegistry";

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

export const SpecPlayer: React.FC<{ spec: MotionSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
console.log("Rendering spec:", spec.scene);
  return React.createElement(
    AbsoluteFill,
    {
      style: {
        ...resolveBackground(spec.bg),
        overflow: "hidden" as const,
      },
    },
    spec.objects.map((obj) => {
      const state = computeObjectState(frame, spec.fps, spec, obj);
      return renderObject(obj, state);
    }),
  );
};
