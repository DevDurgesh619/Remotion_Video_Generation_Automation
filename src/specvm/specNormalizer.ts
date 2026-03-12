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

  const result = timeline
    .filter((ev) => {
      // Remove entries targeting nonexistent objects
      if (!validIds.has(ev.target)) {
        droppedTargets.push(ev.target);
        return false;
      }
      // Remove entries with invalid time
      if (!Array.isArray(ev.time) || ev.time.length !== 2) return false;
      if (typeof ev.time[0] !== "number" || typeof ev.time[1] !== "number") return false;
      return true;
    })
    .map((ev) => {
      const normalized = { ...ev };

      // Ensure time is non-negative and ordered
      normalized.time = [
        Math.max(0, sanitizeNumber(ev.time[0])),
        Math.max(0, sanitizeNumber(ev.time[1])),
      ] as [number, number];

      if (normalized.time[0] > normalized.time[1]) {
        // Swap if backwards
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

      // Normalize glow on timeline events
      // LLM format: { from: [blur, intensity, color], to: [blur, intensity, color] }
      // Canonical format: { blur: [f,t], intensity: [f,t], color: [f,t] }
      if ((normalized as any).glow) {
        (normalized as any).glow = normalizeTimelineGlow((normalized as any).glow);
      }

      return normalized;
    })
    .sort((a, b) => a.time[0] - b.time[0]);

  return { timeline: result, droppedTargets };
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
