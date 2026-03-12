// ─── Spec Enricher ──────────────────────────────────────────────────────────
// Deterministic post-processing pass that fills quality gaps in LLM-generated
// specs. Runs AFTER spec generation and BEFORE rendering.
//
// Three passes:
//   1. Default Easing Injection — adds easing to entries missing it
//   2. Continuity Repair — fixes discontinuities between sequential phases
//   3. Multi-Property Split — separates combined opacity+position entries
// ─────────────────────────────────────────────────────────────────────────────

// ─── Animatable property keys (used for continuity tracking) ────────────────

const SCALAR_PROPS = [
  "opacity", "scale", "rotation", "x", "y",
  "width", "height", "scaleX", "scaleY",
  "cornerRadius", "blur", "skewX", "skewY", "diameter",
];

const POSITION_PROPS = ["x", "y", "pos"];

// ─── Pass 1: Default Easing Injection ───────────────────────────────────────

function inferEasing(entry, totalDuration) {
  // Skip behavior entries — behaviors handle their own easing
  if (entry.behavior) return null;

  // Already has easing — leave it
  if (entry.easing) return null;

  const [startSec, endSec] = entry.time;
  const midpoint = totalDuration / 2;

  // Opacity-specific easing
  if (entry.opacity) {
    const [from, to] = entry.opacity;
    if (from < to) return "ease-out";       // fade-in
    if (from > to) return "ease-in";        // fade-out
  }

  // Scale-specific easing
  if (entry.scale || entry.scaleX || entry.scaleY) {
    return "ease-in-out";
  }

  // Rotation — smooth
  if (entry.rotation) {
    return "ease-in-out";
  }

  // Position-based: use timeline position to determine entrance vs exit
  if (entry.x !== undefined || entry.y !== undefined || entry.pos !== undefined) {
    const entryEnd = endSec;
    const entryStart = startSec;

    // First 30% of duration → entrance easing
    if (entryEnd <= totalDuration * 0.35) {
      return "ease-out-cubic";
    }
    // Last 25% of duration → exit easing
    if (entryStart >= totalDuration * 0.75) {
      return "ease-in";
    }
    return "ease-in-out";
  }

  // Glow, shadow, stroke — smooth
  if (entry.glow || entry.shadow || entry.stroke) {
    return "ease-in-out";
  }

  // Blur (focus effects)
  if (entry.blur) {
    return "ease-out";
  }

  // Default fallback
  return "ease-in-out";
}

function injectEasing(spec) {
  const totalDuration = spec.duration || 4;
  let injectedCount = 0;

  for (const entry of spec.timeline) {
    const easing = inferEasing(entry, totalDuration);
    if (easing) {
      entry.easing = easing;
      injectedCount++;
    }
  }

  if (injectedCount > 0) {
    console.log(`[specEnricher] Injected easing into ${injectedCount} timeline entries`);
  }
}

// ─── Pass 2: Continuity Repair ──────────────────────────────────────────────

function getEndValue(entry, prop) {
  const val = entry[prop];
  if (!val) return undefined;

  if (prop === "pos") {
    // pos: [[fromX, fromY], [toX, toY]]
    return Array.isArray(val[1]) ? val[1] : undefined;
  }

  // Scalar: [from, to]
  if (Array.isArray(val) && val.length === 2) {
    return val[1];
  }

  return undefined;
}

function getStartValue(entry, prop) {
  const val = entry[prop];
  if (!val) return undefined;

  if (prop === "pos") {
    return Array.isArray(val[0]) ? val[0] : undefined;
  }

  if (Array.isArray(val) && val.length === 2) {
    return val[0];
  }

  return undefined;
}

function setStartValue(entry, prop, value) {
  if (prop === "pos" && Array.isArray(entry.pos)) {
    entry.pos[0] = value;
  } else if (Array.isArray(entry[prop]) && entry[prop].length === 2) {
    entry[prop][0] = value;
  }
}

function repairContinuity(spec) {
  // Group timeline entries by target object
  const byTarget = new Map();
  for (const entry of spec.timeline) {
    if (entry.behavior) continue; // Skip behavior entries
    const target = entry.target;
    if (!byTarget.has(target)) byTarget.set(target, []);
    byTarget.get(target).push(entry);
  }

  let repairCount = 0;

  for (const [targetId, entries] of byTarget) {
    // Sort by start time
    entries.sort((a, b) => a.time[0] - b.time[0]);

    // For each animatable property, track end values across sequential entries
    const allProps = [...SCALAR_PROPS, "pos"];

    for (const prop of allProps) {
      // Find entries that animate this property
      const propEntries = entries.filter(e => e[prop] !== undefined);

      for (let i = 1; i < propEntries.length; i++) {
        const prev = propEntries[i - 1];
        const curr = propEntries[i];

        const prevEnd = getEndValue(prev, prop);
        const currStart = getStartValue(curr, prop);

        if (prevEnd === undefined || currStart === undefined) continue;

        // Compare values
        const prevEndStr = JSON.stringify(prevEnd);
        const currStartStr = JSON.stringify(currStart);

        if (prevEndStr !== currStartStr) {
          console.warn(
            `[specEnricher] Continuity gap on "${targetId}.${prop}": ` +
            `phase ending at t=${prev.time[1]}s has end=${prevEndStr}, ` +
            `but next phase starting at t=${curr.time[0]}s has start=${currStartStr}. ` +
            `Auto-repairing start → ${prevEndStr}`
          );
          setStartValue(curr, prop, JSON.parse(prevEndStr));
          repairCount++;
        }
      }
    }
  }

  if (repairCount > 0) {
    console.log(`[specEnricher] Repaired ${repairCount} continuity gaps`);
  }
}

// ─── Pass 3: Multi-Property Split ───────────────────────────────────────────

function splitMultiPropertyEntries(spec) {
  const newTimeline = [];
  let splitCount = 0;

  for (const entry of spec.timeline) {
    if (entry.behavior) {
      newTimeline.push(entry);
      continue;
    }

    const hasOpacity = entry.opacity !== undefined;
    const hasPosition = entry.x !== undefined || entry.y !== undefined || entry.pos !== undefined;
    const hasScale = entry.scale !== undefined || entry.scaleX !== undefined || entry.scaleY !== undefined;
    const hasRotation = entry.rotation !== undefined;

    // Only split if opacity is combined with position or multiple transform types
    const shouldSplit = hasOpacity && (hasPosition || (hasScale && hasRotation));

    if (!shouldSplit) {
      newTimeline.push(entry);
      continue;
    }

    // Extract shared fields
    const base = {
      target: entry.target,
      time: [...entry.time],
    };
    if (entry.easing) base.easing = entry.easing;

    // Create opacity-only entry
    const opacityEntry = { ...base, opacity: entry.opacity };
    newTimeline.push(opacityEntry);

    // Create the remaining entry without opacity
    const restEntry = { ...entry };
    delete restEntry.opacity;
    newTimeline.push(restEntry);

    splitCount++;
  }

  if (splitCount > 0) {
    spec.timeline = newTimeline;
    console.log(`[specEnricher] Split ${splitCount} multi-property timeline entries`);
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function enrichSpec(spec) {
  if (!spec || !Array.isArray(spec.timeline) || spec.timeline.length === 0) {
    return spec;
  }

  // Work on a deep copy to avoid mutating the input
  const enriched = JSON.parse(JSON.stringify(spec));

  // Pass 1: Inject default easing
  injectEasing(enriched);

  // Pass 2: Repair continuity gaps
  repairContinuity(enriched);

  // Pass 3: Split multi-property entries
  splitMultiPropertyEntries(enriched);

  return enriched;
}
