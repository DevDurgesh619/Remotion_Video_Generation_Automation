/**
 * Spec Normalizer
 *
 * Fills in sensible defaults and sanitizes values so the renderer
 * always receives well-formed data. Runs after validation.
 */

import type { MotionSpec, SceneObject, TimelineEvent, GlowDefinition } from "./types";

export interface NormalizerDiagnostics {
  droppedEventTargets: string[];
}

/**
 * Normalize a MotionSpec: fill defaults, sanitize values, remove
 * broken timeline entries. Returns a new object (does not mutate input).
 */
export function normalizeSpec(
  spec: MotionSpec,
  options?: { rescueInvisible?: boolean },
): MotionSpec {
  const normalized: MotionSpec = {
    scene: spec.scene ?? "unnamed",
    duration: normalizeDuration(spec),
    fps: normalizeFps(spec),
    canvas: {
      w: spec.canvas?.w ?? 1920,
      h: spec.canvas?.h ?? 1080,
    },
    bg: spec.bg ?? "#FFFFFF",
    objects: normalizeObjects(spec.objects ?? []),
    timeline: [], // populated below
  };

  // Build set of valid object IDs
  const validIds = new Set(normalized.objects.map((o) => o.id));

  // Normalize timeline — remove entries targeting nonexistent objects
  const { timeline, droppedTargets } = normalizeTimeline(spec.timeline ?? [], validIds);
  normalized.timeline = timeline;

  // Warn about dropped events (these are a common cause of blank screens)
  if (droppedTargets.length > 0) {
    const unique = [...new Set(droppedTargets)];
    console.warn(
      `[specNormalizer] ${droppedTargets.length} timeline event(s) DROPPED — ` +
      `target IDs not found in objects: ${unique.map(t => `"${t}"`).join(", ")}. ` +
      `Check for ID typos (IDs are case-sensitive).`,
    );
  }

  // Optional: rescue objects that start invisible with no opacity animation
  if (options?.rescueInvisible) {
    normalized.objects = rescueInvisibleObjects(normalized.objects, normalized.timeline);
  }

  return normalized;
}

// ─── Duration ───────────────────────────────────────────────────────────────

function normalizeDuration(spec: MotionSpec & Record<string, any>): number {
  if (typeof spec.duration === "number" && spec.duration > 0) return spec.duration;
  // LLM sometimes uses `duration_sec`
  if (typeof (spec as any).duration_sec === "number" && (spec as any).duration_sec > 0) {
    return (spec as any).duration_sec;
  }
  return 4; // safe default: 4 seconds
}

// ─── FPS ────────────────────────────────────────────────────────────────────

function normalizeFps(spec: MotionSpec & Record<string, any>): number {
  if (typeof spec.fps === "number" && spec.fps > 0 && spec.fps <= 120) return spec.fps;
  return 30;
}

// ─── Objects ────────────────────────────────────────────────────────────────

function normalizeObjects(objects: SceneObject[]): SceneObject[] {
  return objects.map((obj, i) => ({
    ...obj,
    id: obj.id ?? `auto_${i}`,
    shape: obj.shape ?? "rectangle",
    opacity: clamp01(obj.opacity ?? 1),
    scale: sanitizeNumber(obj.scale ?? 1),
    rotation: sanitizeNumber(obj.rotation ?? 0),
    pos: obj.pos ? [sanitizeNumber(obj.pos[0]), sanitizeNumber(obj.pos[1])] as [number, number] : [0, 0] as [number, number],
    glow: normalizeObjectGlow((obj as any).glow),
  }));
}

/**
 * Normalize glow on a SceneObject.
 * LLM sometimes emits: { from: [blur, intensity, color], to: [...] }
 * We extract the "from" values as the initial static glow state.
 */
function normalizeObjectGlow(raw: unknown): GlowDefinition | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const g = raw as Record<string, unknown>;

  // Old LLM array format: { from: [blur, intensity, color], to: [...] }
  if (Array.isArray(g.from)) {
    const [blur, intensity, color] = g.from as unknown[];
    return {
      blur: sanitizeNumber(blur),
      intensity: clamp01(sanitizeNumber(intensity)),
      color: typeof color === "string" ? color : "transparent",
    };
  }

  // New keyed format: { blur, intensity, color }
  if (typeof g.blur === "number" || typeof g.intensity === "number") {
    return {
      blur: sanitizeNumber(g.blur),
      intensity: clamp01(sanitizeNumber(g.intensity)),
      color: typeof g.color === "string" ? g.color : "transparent",
    };
  }

  return undefined;
}

// ─── Timeline ───────────────────────────────────────────────────────────────

function normalizeTimeline(
  timeline: TimelineEvent[],
  validIds: Set<string>,
): { timeline: TimelineEvent[]; droppedTargets: string[] } {
  const droppedTargets: string[] = [];

  // Step 1: coerce v2 explicit-field format to the internal tuple format
  const coerced = timeline.map(normalizeV2Fields);

  const result = coerced
    .filter((ev) => {
      if (!validIds.has(ev.target)) {
        droppedTargets.push(ev.target);
        return false;
      }
      // After coercion every valid event must have a `time` tuple
      const t = ev.time;
      if (!Array.isArray(t) || t.length !== 2) return false;
      if (typeof t[0] !== "number" || typeof t[1] !== "number") return false;
      return true;
    })
    .map((ev) => {
      const normalized = { ...ev };
      const t = ev.time!; // guaranteed by filter above

      normalized.time = [
        Math.max(0, sanitizeNumber(t[0])),
        Math.max(0, sanitizeNumber(t[1])),
      ] as [number, number];

      if (normalized.time[0] > normalized.time[1]) {
        normalized.time = [normalized.time[1], normalized.time[0]];
      }

      // Sanitize numeric tuples
      const numericProps = [
        "opacity", "scale", "rotation", "x", "y", "diameter",
        "width", "height", "cornerRadius", "scaleX", "scaleY",
      ] as const;

      for (const prop of numericProps) {
        const val = (normalized as any)[prop];
        if (val !== undefined && Array.isArray(val) && val.length === 2) {
          (normalized as any)[prop] = [sanitizeNumber(val[0]), sanitizeNumber(val[1])];
        }
      }

      if ((normalized as any).glow) {
        (normalized as any).glow = normalizeTimelineGlow((normalized as any).glow);
      }

      return normalized;
    })
    .sort((a, b) => (a.time![0]) - (b.time![0]));

  return { timeline: result, droppedTargets };
}

/**
 * Converts v2 explicit-field AnimationBlock fields to the internal tuple format.
 *
 * v2 fields handled:
 *   start_sec / end_sec       → time: [start, end]
 *   translate.from_x/to_x    → x: [from, to]
 *   translate.from_y/to_y    → y: [from, to]
 *   rotate_deg.from/to       → rotation: [from, to]
 *   scale (object form)      → scaleX/scaleY or uniform scale tuple
 *   opacity (object form)    → opacity: [from, to]
 *   corner_radius_px.from/to → cornerRadius: [from, to]
 *   skew_deg.from_x/to_x    → skewX: [from, to]
 *   skew_deg.from_y/to_y    → skewY: [from, to]
 *   style_transition.color   → color: [from, to]
 *   style_transition.shadow  → shadow: { offsetX/Y/blur/color tuples }
 *   style_transition.glow    → glow: { blur/intensity tuples }
 *
 * Fields without a v1 equivalent (stroke_draw, dash_pattern, advanced_action)
 * are left in place for the animation runtime to consume directly.
 */
function normalizeV2Fields(ev: TimelineEvent): TimelineEvent {
  const out: any = { ...ev };

  // ── Time: start_sec / end_sec → time tuple ──
  if (out.time === undefined && (out.start_sec !== undefined || out.end_sec !== undefined)) {
    out.time = [out.start_sec ?? 0, out.end_sec ?? 0] as [number, number];
  }
  delete out.start_sec;
  delete out.end_sec;

  // ── translate → x / y ──
  if (out.translate) {
    const tr = out.translate;
    if (tr.from_x !== undefined && tr.to_x !== undefined) {
      out.x = [tr.from_x, tr.to_x] as [number, number];
    }
    if (tr.from_y !== undefined && tr.to_y !== undefined) {
      out.y = [tr.from_y, tr.to_y] as [number, number];
    }
    delete out.translate;
  }

  // ── rotate_deg → rotation ──
  if (out.rotate_deg) {
    out.rotation = [out.rotate_deg.from, out.rotate_deg.to] as [number, number];
    delete out.rotate_deg;
  }

  // ── scale (object form) → scaleX / scaleY or uniform scale ──
  if (out.scale !== null && typeof out.scale === "object" && !Array.isArray(out.scale)) {
    const s = out.scale as any;
    const uniformX = s.from_x !== undefined && s.to_x !== undefined;
    const uniformY = s.from_y !== undefined && s.to_y !== undefined;
    if (uniformX && uniformY && s.from_x === s.from_y && s.to_x === s.to_y) {
      out.scale = [s.from_x, s.to_x] as [number, number];
    } else {
      if (uniformX) out.scaleX = [s.from_x, s.to_x] as [number, number];
      if (uniformY) out.scaleY = [s.from_y, s.to_y] as [number, number];
      delete out.scale;
    }
  }

  // ── opacity (object form) → opacity tuple ──
  if (out.opacity !== null && typeof out.opacity === "object" && !Array.isArray(out.opacity)) {
    const o = out.opacity as any;
    out.opacity = [o.from, o.to] as [number, number];
  }

  // ── corner_radius_px → cornerRadius ──
  if (out.corner_radius_px) {
    out.cornerRadius = [out.corner_radius_px.from, out.corner_radius_px.to] as [number, number];
    delete out.corner_radius_px;
  }

  // ── skew_deg → skewX / skewY ──
  if (out.skew_deg) {
    const sk = out.skew_deg;
    if (sk.from_x !== undefined && sk.to_x !== undefined) {
      out.skewX = [sk.from_x, sk.to_x] as [number, number];
    }
    if (sk.from_y !== undefined && sk.to_y !== undefined) {
      out.skewY = [sk.from_y, sk.to_y] as [number, number];
    }
    delete out.skew_deg;
  }

  // ── style_transition → color / shadow / glow ──
  if (out.style_transition) {
    const st = out.style_transition;

    if (st.color) {
      out.color = [st.color.from, st.color.to] as [string, string];
    }

    if (st.shadow) {
      const sh = st.shadow;
      out.shadow = {
        ...(sh.from_offset_x !== undefined ? { offsetX: [sh.from_offset_x, sh.to_offset_x ?? sh.from_offset_x] as [number, number] } : {}),
        ...(sh.from_offset_y !== undefined ? { offsetY: [sh.from_offset_y, sh.to_offset_y ?? sh.from_offset_y] as [number, number] } : {}),
        ...(sh.from_blur     !== undefined ? { blur:    [sh.from_blur, sh.to_blur ?? sh.from_blur] as [number, number] } : {}),
        ...(sh.color         !== undefined ? { color:   [sh.color, sh.color] as [string, string] } : {}),
      };
    }

    if (st.glow) {
      const gl = st.glow;
      out.glow = {
        ...(gl.from_blur      !== undefined ? { blur:      [gl.from_blur, gl.to_blur ?? gl.from_blur] as [number, number] } : {}),
        ...(gl.from_intensity !== undefined ? { intensity: [gl.from_intensity, gl.to_intensity ?? gl.from_intensity] as [number, number] } : {}),
      };
    }

    delete out.style_transition;
  }

  return out as TimelineEvent;
}

/**
 * Normalize glow on a TimelineEvent.
 * LLM format: { from: [blur, intensity, color], to: [blur, intensity, color] }
 * Canonical format: { blur: [from, to], intensity: [from, to], color: [from, to] }
 */
function normalizeTimelineGlow(raw: unknown): TimelineEvent["glow"] {
  if (!raw || typeof raw !== "object") return undefined;
  const g = raw as Record<string, unknown>;

  // Old LLM array format: { from: [...], to: [...] }
  if (Array.isArray(g.from) && Array.isArray(g.to)) {
    const [fBlur, fIntensity, fColor] = g.from as unknown[];
    const [tBlur, tIntensity, tColor] = g.to as unknown[];
    return {
      blur: [sanitizeNumber(fBlur), sanitizeNumber(tBlur)],
      intensity: [clamp01(sanitizeNumber(fIntensity)), clamp01(sanitizeNumber(tIntensity))],
      color: [
        typeof fColor === "string" ? fColor : "transparent",
        typeof tColor === "string" ? tColor : "transparent",
      ],
    };
  }

  // Already canonical keyed format — pass through
  return g as TimelineEvent["glow"];
}

// ─── Rescue invisible objects ────────────────────────────────────────────────

/**
 * If an object starts at opacity:0 and has no timeline event that restores
 * opacity, it will be permanently invisible. When rescueInvisible is enabled,
 * clamp the object's initial opacity to 1 and log an error.
 */
function rescueInvisibleObjects(
  objects: SceneObject[],
  timeline: TimelineEvent[],
): SceneObject[] {
  return objects.map((obj) => {
    if ((obj.opacity ?? 1) !== 0) return obj;

    const hasOpacityRestoration = timeline.some(
      (ev) =>
        ev.target === obj.id &&
        Array.isArray(ev.opacity) &&
        ev.opacity[1] > 0,
    );

    if (!hasOpacityRestoration) {
      console.error(
        `[specNormalizer] RESCUE: Object "${obj.id}" starts at opacity:0 with no opacity animation. ` +
        `Forcing opacity to 1 to prevent blank screen.`,
      );
      return { ...obj, opacity: 1 };
    }

    return obj;
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sanitizeNumber(n: unknown): number {
  if (typeof n !== "number" || isNaN(n) || !isFinite(n)) return 0;
  return n;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, sanitizeNumber(n)));
}
