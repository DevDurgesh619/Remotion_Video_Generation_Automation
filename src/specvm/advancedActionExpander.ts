/**
 * Advanced Action Expander
 *
 * Converts `advanced_action` blocks in the timeline into raw timeline events
 * and/or new synthetic scene objects before the spec reaches the animation runtime.
 *
 * Supported action types:
 *   orbit   — circular motion → sequential pos keyframes
 *   morph   — shape/size transition → size + cornerRadius animation
 *   split   — divide object into N pieces → synthetic objects + exit animations
 *   scatter — fan pieces outward → synthetic objects + translate/opacity events
 *   shatter — burst into particles → synthetic objects + translate/rotate/opacity
 *   grid    — tile copies in a grid → synthetic objects with staggered reveals
 *   extrude — depth layer stack → synthetic layer objects with offset
 *
 * Fast-path: if no timeline event has `advanced_action`, the spec is returned
 * unchanged with zero overhead.
 */

import type {
  MotionSpec,
  TimelineEvent,
  SceneObject,
  AdvancedOrbitParams,
} from "./types";

// ─── Entry point ─────────────────────────────────────────────────────────────

export function expandAdvancedActions(spec: MotionSpec): MotionSpec {
  if (!spec.timeline.some((e) => (e as any).advanced_action)) {
    return spec;
  }

  const extraObjects: SceneObject[] = [];
  const newTimeline: TimelineEvent[] = [];

  for (const event of spec.timeline) {
    const action = (event as any).advanced_action;
    if (!action) {
      newTimeline.push(event);
      continue;
    }

    // Strip advanced_action; keep everything else as the base event
    const { advanced_action: _aa, ...baseEvent } = event as any;
    const sourceObj = spec.objects.find((o) => o.id === event.target);

    switch (action.type) {
      case "orbit":
        if (action.orbit) {
          newTimeline.push(...expandOrbit(baseEvent, action.orbit, spec.duration));
        } else {
          console.warn(`[advancedActionExpander] orbit action on "${event.target}" missing orbit params — skipped`);
        }
        break;

      case "morph":
        if (action.morph) {
          newTimeline.push(...expandMorph(baseEvent, action.morph));
        }
        break;

      case "split":
        if (action.split && sourceObj) {
          const result = expandSplit(baseEvent, action.split, sourceObj);
          extraObjects.push(...result.objects);
          newTimeline.push(...result.timeline);
        }
        break;

      case "scatter":
        if (action.scatter && sourceObj) {
          const result = expandScatter(baseEvent, action.scatter, sourceObj);
          extraObjects.push(...result.objects);
          newTimeline.push(...result.timeline);
        }
        break;

      case "shatter":
        if (action.shatter && sourceObj) {
          const result = expandShatter(baseEvent, action.shatter, sourceObj);
          extraObjects.push(...result.objects);
          newTimeline.push(...result.timeline);
        }
        break;

      case "grid":
        if (action.grid && sourceObj) {
          const result = expandGrid(baseEvent, action.grid, sourceObj);
          extraObjects.push(...result.objects);
          newTimeline.push(...result.timeline);
        }
        break;

      case "extrude":
        if (action.extrude && sourceObj) {
          const result = expandExtrude(baseEvent, action.extrude, sourceObj);
          extraObjects.push(...result.objects);
          newTimeline.push(...result.timeline);
        }
        break;

      default:
        console.warn(`[advancedActionExpander] Unknown action type "${action.type}" on "${event.target}" — skipped`);
        newTimeline.push(baseEvent);
    }
  }

  return {
    ...spec,
    objects: [...spec.objects, ...extraObjects],
    timeline: newTimeline,
  };
}

// ─── Orbit ───────────────────────────────────────────────────────────────────

function expandOrbit(
  base: any,
  orbit: AdvancedOrbitParams,
  specDuration: number,
): TimelineEvent[] {
  const time: [number, number] = base.time ?? [base.start_sec ?? 0, base.end_sec ?? specDuration];
  const cycleDuration = time[1] - time[0];
  if (cycleDuration <= 0) return [];

  const cycleEvents = buildOrbitCycle(base, orbit, time[0], cycleDuration);

  if (base.repeat === undefined) return cycleEvents;

  const numCycles =
    base.repeat === "infinite"
      ? Math.ceil((specDuration - time[0]) / cycleDuration) + 1
      : (base.repeat as number) + 1;

  const tiled: TimelineEvent[] = [];
  for (let cycle = 0; cycle < numCycles; cycle++) {
    const offset = cycle * cycleDuration;
    for (const seg of cycleEvents) {
      const segTime = seg.time!;
      const segStart = segTime[0] + offset;
      const segEnd   = segTime[1] + offset;
      if (segStart >= specDuration) break;
      tiled.push({ ...seg, time: [segStart, Math.min(segEnd, specDuration)] as [number, number] });
    }
  }
  return tiled;
}

function buildOrbitCycle(
  base: any,
  orbit: AdvancedOrbitParams,
  cycleStart: number,
  cycleDuration: number,
): TimelineEvent[] {
  const dirMul = orbit.direction === "ccw" ? -1 : 1;
  const startDeg = orbit.start_angle ?? 0;
  const sweep    = orbit.degrees * dirMul;
  const numSegments = Math.max(4, Math.min(120, Math.ceil(Math.abs(orbit.degrees) / 15)));
  const segments: TimelineEvent[] = [];

  for (let i = 0; i < numSegments; i++) {
    const t0    = cycleStart + (i / numSegments) * cycleDuration;
    const t1    = cycleStart + ((i + 1) / numSegments) * cycleDuration;
    const a0Deg = startDeg + (i / numSegments) * sweep;
    const a1Deg = startDeg + ((i + 1) / numSegments) * sweep;
    const a0    = (a0Deg * Math.PI) / 180;
    const a1    = (a1Deg * Math.PI) / 180;

    const fromX = orbit.center_x_px + orbit.radius_px * Math.cos(a0);
    const toX   = orbit.center_x_px + orbit.radius_px * Math.cos(a1);
    const fromY = orbit.center_y_px + orbit.radius_px * Math.sin(a0);
    const toY   = orbit.center_y_px + orbit.radius_px * Math.sin(a1);

    const seg: TimelineEvent = {
      target: base.target,
      time: [t0, t1] as [number, number],
      easing: base.easing ?? "linear",
      pos: [[fromX, fromY], [toX, toY]],
    };

    if (orbit.maintain_facing) {
      seg.rotation = [a0Deg, a1Deg];
    }

    segments.push(seg);
  }
  return segments;
}

// ─── Morph ───────────────────────────────────────────────────────────────────

function expandMorph(base: any, morph: any): TimelineEvent[] {
  const time: [number, number] = base.time ?? [base.start_sec ?? 0, base.end_sec ?? 4];
  return [
    {
      target: base.target,
      time,
      easing: base.easing ?? "ease-in-out",
      size:  [[base._fromW ?? 0, base._fromH ?? 0], [morph.target_width_px, morph.target_height_px]] as [[number, number], [number, number]],
      // cornerRadius morph: if target is "circle", push cornerRadius to 50% of size
      ...(morph.target_shape === "circle"
        ? { cornerRadius: [0, Math.max(morph.target_width_px, morph.target_height_px) / 2] as [number, number] }
        : {}),
    },
  ];
}

// ─── Shatter ─────────────────────────────────────────────────────────────────

function expandShatter(
  base: any,
  shatter: { particle_count: number; explosion_radius_px: number },
  source: SceneObject,
): { objects: SceneObject[]; timeline: TimelineEvent[] } {
  const time: [number, number] = base.time ?? [base.start_sec ?? 0, base.end_sec ?? 2];
  const particles: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];
  const srcX = source.pos?.[0] ?? 0;
  const srcY = source.pos?.[1] ?? 0;
  const srcDiam = source.diameter ?? (source.size ? Math.min(source.size[0], source.size[1]) : 20);
  const particleDiam = Math.max(4, Math.round(srcDiam * 0.25));

  for (let i = 0; i < shatter.particle_count; i++) {
    const angle = (360 / shatter.particle_count) * i;
    const id = `${source.id}_shard_${i}`;
    const toX = srcX + shatter.explosion_radius_px * Math.cos((angle * Math.PI) / 180);
    const toY = srcY + shatter.explosion_radius_px * Math.sin((angle * Math.PI) / 180);

    particles.push({
      id,
      shape: "circle",
      diameter: particleDiam,
      color: source.color ?? "#FFFFFF",
      pos: [srcX, srcY],
      opacity: 1,
    });

    timeline.push({
      target: id,
      time,
      easing: "ease-out",
      pos: [[srcX, srcY], [toX, toY]],
      opacity: [1, 0] as [number, number],
      rotation: [0, angle * 3] as [number, number],
    });
  }

  // Fade out the source object itself
  timeline.push({
    target: source.id,
    time,
    easing: "ease-out",
    opacity: [1, 0] as [number, number],
  });

  return { objects: particles, timeline };
}

// ─── Split ───────────────────────────────────────────────────────────────────

function expandSplit(
  base: any,
  split: { pieces: number; direction?: string },
  source: SceneObject,
): { objects: SceneObject[]; timeline: TimelineEvent[] } {
  const time: [number, number] = base.time ?? [base.start_sec ?? 0, base.end_sec ?? 2];
  const pieces: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];
  const direction = split.direction ?? "horizontal";
  const n = split.pieces;
  const srcW = source.size?.[0] ?? source.diameter ?? 100;
  const srcH = source.size?.[1] ?? source.diameter ?? 100;
  const srcX = source.pos?.[0] ?? 0;
  const srcY = source.pos?.[1] ?? 0;

  for (let i = 0; i < n; i++) {
    const id = `${source.id}_piece_${i}`;
    let pieceX = srcX;
    let pieceY = srcY;
    let pieceW = srcW;
    let pieceH = srcH;
    let toX = srcX;
    let toY = srcY;

    if (direction === "horizontal") {
      pieceW = srcW / n;
      pieceX = srcX - srcW / 2 + pieceW * (i + 0.5);
      toX = pieceX + (i - (n - 1) / 2) * pieceW * 1.5;
    } else {
      pieceH = srcH / n;
      pieceY = srcY - srcH / 2 + pieceH * (i + 0.5);
      toY = pieceY + (i - (n - 1) / 2) * pieceH * 1.5;
    }

    pieces.push({
      id,
      shape: source.shape,
      size: [pieceW, pieceH],
      color: source.color,
      pos: [pieceX, pieceY],
    });

    timeline.push({
      target: id,
      time,
      easing: base.easing ?? "ease-out",
      pos: [[pieceX, pieceY], [toX, toY]],
      opacity: [1, 0] as [number, number],
    });
  }

  // Hide the source object
  timeline.push({ target: source.id, time, opacity: [1, 0] as [number, number] });

  return { objects: pieces, timeline };
}

// ─── Scatter ─────────────────────────────────────────────────────────────────

function expandScatter(
  base: any,
  scatter: { scatter_distance_px: number; scatter_rotation_deg?: number },
  source: SceneObject,
): { objects: SceneObject[]; timeline: TimelineEvent[] } {
  // Scatter works like shatter but with fewer, larger pieces at even angles
  const syntheticShatter = { particle_count: 8, explosion_radius_px: scatter.scatter_distance_px };
  const result = expandShatter(base, syntheticShatter, source);

  // Apply scatter_rotation_deg to each piece
  if (scatter.scatter_rotation_deg) {
    const rot = scatter.scatter_rotation_deg;
    result.timeline = result.timeline.map((ev) => {
      if (ev.target === source.id) return ev;
      return { ...ev, rotation: [0, rot] as [number, number] };
    });
  }

  return result;
}

// ─── Grid ────────────────────────────────────────────────────────────────────

function expandGrid(
  base: any,
  grid: { rows: number; cols: number },
  source: SceneObject,
): { objects: SceneObject[]; timeline: TimelineEvent[] } {
  const time: [number, number] = base.time ?? [base.start_sec ?? 0, base.end_sec ?? 2];
  const copies: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];
  const srcW = source.size?.[0] ?? source.diameter ?? 80;
  const srcH = source.size?.[1] ?? source.diameter ?? 80;
  const gap   = 10;
  const totalW = grid.cols * (srcW + gap) - gap;
  const totalH = grid.rows * (srcH + gap) - gap;
  const startX = -(totalW / 2) + srcW / 2;
  const startY = -(totalH / 2) + srcH / 2;
  const duration = time[1] - time[0];
  const stagger  = duration / (grid.rows * grid.cols);

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const idx = r * grid.cols + c;
      const id  = `${source.id}_grid_${idx}`;
      const posX = startX + c * (srcW + gap);
      const posY = startY + r * (srcH + gap);

      copies.push({
        id,
        shape: source.shape,
        size: source.size ? [srcW, srcH] : undefined,
        diameter: source.diameter,
        color: source.color,
        pos: [posX, posY],
        opacity: 0,
      });

      const evStart = Math.min(time[0] + idx * stagger, time[1] - 0.2);
      timeline.push({
        target: id,
        time: [evStart, evStart + 0.4] as [number, number],
        easing: "ease-out",
        opacity: [0, 1] as [number, number],
        scale:   [0.5, 1] as [number, number],
      });
    }
  }

  // Hide original
  timeline.push({ target: source.id, time: [time[0], time[0]] as [number, number], opacity: [1, 0] as [number, number] });

  return { objects: copies, timeline };
}

// ─── Extrude ─────────────────────────────────────────────────────────────────

function expandExtrude(
  base: any,
  extrude: { layers: number; offset_x_px: number; offset_y_px: number; opacity_fade?: boolean },
  source: SceneObject,
): { objects: SceneObject[]; timeline: TimelineEvent[] } {
  const time: [number, number] = base.time ?? [base.start_sec ?? 0, base.end_sec ?? 2];
  const layers: SceneObject[] = [];
  const timeline: TimelineEvent[] = [];
  const srcX = source.pos?.[0] ?? 0;
  const srcY = source.pos?.[1] ?? 0;

  for (let i = 1; i <= extrude.layers; i++) {
    const id      = `${source.id}_extrude_${i}`;
    const layerX  = srcX + extrude.offset_x_px * i;
    const layerY  = srcY + extrude.offset_y_px * i;
    const opacity = extrude.opacity_fade ? Math.max(0, 1 - i / (extrude.layers + 1)) : 0.7;

    layers.push({
      id,
      shape:  source.shape,
      size:   source.size,
      diameter: source.diameter,
      color:  source.color,
      pos:    [layerX, layerY],
      opacity: 0,
      zIndex: (source.zIndex ?? 0) - i, // behind source
    });

    timeline.push({
      target: id,
      time,
      easing: "ease-out",
      opacity: [0, opacity] as [number, number],
    });
  }

  return { objects: layers, timeline };
}
