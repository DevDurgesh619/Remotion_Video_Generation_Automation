/**
 * Spec Validator
 *
 * Validates a MotionSpec JSON structure before rendering.
 * Returns structured errors and warnings without throwing.
 */

// import type { MotionSpec } from "./types";  // Not needed — validateSpec accepts unknown

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a MotionSpec. Returns errors (spec is broken) and warnings
 * (spec is suboptimal but renderable).
 */
export function validateSpec(spec: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec || typeof spec !== "object") {
    return { valid: false, errors: ["Spec is not an object"], warnings };
  }

  const s = spec as Record<string, unknown>;

  // ── Required fields ──

  if (typeof s.duration !== "number" || s.duration <= 0) {
    if (typeof s.duration_sec === "number") {
      warnings.push(`Uses "duration_sec" instead of "duration" — will be normalized`);
    } else {
      errors.push(`Missing or invalid "duration" (got ${JSON.stringify(s.duration)})`);
    }
  }

  if (s.fps !== undefined && (typeof s.fps !== "number" || s.fps <= 0)) {
    warnings.push(`Invalid "fps" (${JSON.stringify(s.fps)}) — will default to 30`);
  }

  if (!Array.isArray(s.objects)) {
    errors.push(`Missing "objects" array`);
  } else {
    // ── Object validation ──
    const seenIds = new Set<string>();
    for (let i = 0; i < s.objects.length; i++) {
      const obj = s.objects[i] as Record<string, unknown>;
      if (!obj || typeof obj !== "object") {
        errors.push(`objects[${i}] is not an object`);
        continue;
      }
      if (typeof obj.id !== "string" || obj.id.length === 0) {
        errors.push(`objects[${i}] is missing "id"`);
        continue;
      }
      if (seenIds.has(obj.id as string)) {
        warnings.push(`Duplicate object id "${obj.id}"`);
      }
      seenIds.add(obj.id as string);

      if (typeof obj.shape !== "string") {
        warnings.push(`Object "${obj.id}" is missing "shape" — will render as unknown`);
      }
    }
  }

  if (!Array.isArray(s.timeline)) {
    warnings.push(`Missing "timeline" array — no animations will play`);
  } else {
    const objectIds = Array.isArray(s.objects)
      ? new Set((s.objects as Array<Record<string, unknown>>).map((o) => o.id))
      : new Set<string>();

    for (let i = 0; i < s.timeline.length; i++) {
      const ev = s.timeline[i] as Record<string, unknown>;
      if (!ev || typeof ev !== "object") {
        warnings.push(`timeline[${i}] is not an object — will be skipped`);
        continue;
      }

      // ── Deprecation warning for legacy behavior field ──
      if (typeof ev.behavior === "string") {
        warnings.push(
          `timeline[${i}] uses deprecated "behavior" field ("${ev.behavior}") — ` +
          `migrate to explicit motion fields (translate, rotate_deg, opacity, etc.)`,
        );
      }

      // Check target exists
      if (typeof ev.target !== "string") {
        warnings.push(`timeline[${i}] is missing "target"`);
      } else if (!objectIds.has(ev.target)) {
        warnings.push(`timeline[${i}] targets "${ev.target}" which does not exist in objects`);
      }

      // ── Time: accept both v1 tuple and v2 start_sec/end_sec ──
      const hasV1Time = Array.isArray(ev.time) && ev.time.length === 2;
      const hasV2Time = typeof ev.start_sec === "number" || typeof ev.end_sec === "number";
      const hasAdvancedAction = ev.advanced_action !== undefined;

      if (!hasV1Time && !hasV2Time && !hasAdvancedAction && ev.behavior === undefined) {
        warnings.push(`timeline[${i}] has no time range — use "time":[start,end] or "start_sec"/"end_sec"`);
      }

      if (hasV1Time) {
        const [start, end] = ev.time as [unknown, unknown];
        if (typeof start !== "number" || typeof end !== "number") {
          warnings.push(`timeline[${i}] has non-numeric time values`);
        } else if ((start as number) > (end as number)) {
          warnings.push(`timeline[${i}] has start (${start}) > end (${end})`);
        }
      }

      if (hasV2Time) {
        const s0 = ev.start_sec as number;
        const e0 = ev.end_sec   as number;
        if (typeof s0 === "number" && typeof e0 === "number" && s0 > e0) {
          warnings.push(`timeline[${i}] has start_sec (${s0}) > end_sec (${e0})`);
        }
      }

      // Check for old glow array format — will be normalized, but warn so the LLM learns
      if (ev.glow !== undefined) {
        const g = ev.glow as Record<string, unknown>;
        if (Array.isArray(g.from) && Array.isArray(g.to)) {
          warnings.push(
            `timeline[${i}].glow uses old array format { from:[blur,intensity,color], to:[...] } — ` +
            `will be auto-normalized to keyed format { blur:[f,t], intensity:[f,t], color:[f,t] }`,
          );
        }
      }

      // Check for properties that are animated but not supported by the target shape's renderer
      if (typeof ev.target === "string" && Array.isArray(s.objects)) {
        const targetObj = (s.objects as Array<Record<string, unknown>>).find(
          (o) => o.id === ev.target,
        );
        const shape = targetObj?.shape as string | undefined;
        const cornerRadiusUnsupported = ["circle", "line", "text"];
        if ((ev.cornerRadius !== undefined || (ev as any).corner_radius_px !== undefined) && shape && cornerRadiusUnsupported.includes(shape)) {
          warnings.push(
            `timeline[${i}]: cornerRadius animation on shape "${shape}" ("${ev.target}") has no visual effect`,
          );
        }
      }

      // Check v1 numeric tuple props
      const numericTupleProps = [
        "rotation", "x", "y", "diameter", "width", "height", "cornerRadius", "scaleX", "scaleY",
      ];
      for (const prop of numericTupleProps) {
        if (ev[prop] !== undefined) {
          const val = ev[prop];
          if (!Array.isArray(val) || val.length !== 2) {
            warnings.push(`timeline[${i}].${prop} should be [from, to] (got ${JSON.stringify(val)})`);
          } else if (typeof val[0] !== "number" || typeof val[1] !== "number") {
            warnings.push(`timeline[${i}].${prop} has non-numeric values`);
          } else if (isNaN(val[0] as number) || isNaN(val[1] as number)) {
            warnings.push(`timeline[${i}].${prop} contains NaN`);
          }
        }
      }

      // opacity and scale may be tuple (v1) or object (v2) — only validate tuple form
      for (const prop of ["opacity", "scale"] as const) {
        const val = ev[prop];
        if (val !== undefined && Array.isArray(val)) {
          if (val.length !== 2 || typeof val[0] !== "number" || typeof val[1] !== "number") {
            warnings.push(`timeline[${i}].${prop} tuple should be [from, to] numbers`);
          }
        }
      }

      if (ev.color !== undefined) {
        const val = ev.color;
        if (!Array.isArray(val) || val.length !== 2) {
          warnings.push(`timeline[${i}].color should be [fromColor, toColor]`);
        }
      }
    }
  }

  // ── Opacity trap detection ──
  // If an object starts at opacity:0 but has no timeline event to restore it,
  // it will be permanently invisible — the most common cause of blank screens.
  if (Array.isArray(s.objects) && Array.isArray(s.timeline)) {
    for (const obj of s.objects as Array<Record<string, unknown>>) {
      if (typeof obj.id !== "string") continue;
      if (obj.opacity !== 0) continue;

      const hasOpacityAnimation = (s.timeline as Array<Record<string, unknown>>).some((ev) => {
        if (ev.target !== obj.id) return false;
        const op = ev.opacity as any;
        if (!op) return false;
        // v1 tuple: [from, to]
        if (Array.isArray(op)) return typeof op[1] === "number" && (op[1] as number) > 0;
        // v2 object: { from, to }
        if (typeof op === "object") return typeof op.to === "number" && (op.to as number) > 0;
        return false;
      });

      if (!hasOpacityAnimation) {
        warnings.push(
          `Object "${obj.id}" starts at opacity:0 with no opacity animation — will be PERMANENTLY INVISIBLE (blank screen). ` +
          `Add a timeline event with opacity:[0,1] or opacity:{from:0,to:1}.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
