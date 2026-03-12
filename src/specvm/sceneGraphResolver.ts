/**
 * Scene Graph Resolver
 *
 * Pipeline step that runs after specExpander and before validateSpec:
 *   behaviorExpander → specExpander → sceneGraphResolver → validateSpec → normalizeSpec
 *
 * Responsibilities:
 *   1. Cycle detection: if A.parent = B and B.parent = A, break the cycle
 *      by clearing the offending parent and logging a warning.
 *   2. Topological sort: reorder spec.objects so every parent appears
 *      before all of its children. SpecPlayer relies on this ordering
 *      to look up parent states during per-frame computation.
 *
 * When no objects have a `parent` field, this is a fast no-op.
 */

import type { MotionSpec, SceneObject } from "./types";

// ─── Public entry point ──────────────────────────────────────────────────────

export function resolveSceneGraph(spec: MotionSpec): MotionSpec {
  const objects = spec.objects ?? [];

  // Fast path — no parent fields at all
  if (!objects.some((o) => o.parent !== undefined)) {
    return spec;
  }

  // Step 1: build id → object map, detect missing parent references
  const byId = new Map<string, SceneObject>();
  for (const obj of objects) {
    byId.set(obj.id, obj);
  }

  // Warn + clear references to unknown parent IDs
  const cleaned = objects.map((obj) => {
    if (obj.parent && !byId.has(obj.parent)) {
      console.warn(
        `[sceneGraphResolver] Object "${obj.id}" references unknown parent "${obj.parent}" — parent cleared.`,
      );
      return { ...obj, parent: undefined };
    }
    return obj;
  });

  // Step 2: cycle detection via DFS coloring
  // white = unvisited, gray = in current DFS path, black = done
  const color = new Map<string, "white" | "gray" | "black">();
  for (const obj of cleaned) color.set(obj.id, "white");

  // Collect IDs where cycles were detected (the edge parent→child that creates the cycle)
  const cycleBreaks = new Set<string>(); // IDs whose parent should be cleared

  function visit(id: string): void {
    const c = color.get(id);
    if (c === "black") return;
    if (c === "gray") {
      // We've re-entered this node — it's part of a cycle.
      // The calling frame will clear the parent of the child that pointed back here.
      return;
    }

    color.set(id, "gray");
    const obj = byId.get(id);
    if (obj?.parent) {
      const parentColor = color.get(obj.parent);
      if (parentColor === "gray") {
        // obj.parent is an ancestor of obj → cycle
        console.warn(
          `[sceneGraphResolver] Cycle detected: "${id}" → "${obj.parent}". ` +
            `Clearing parent on "${id}" to break the cycle.`,
        );
        cycleBreaks.add(id);
      } else {
        visit(obj.parent);
        // Re-check after visiting (parent may have been visited and is gray)
        if (color.get(obj.parent) === "gray") {
          console.warn(
            `[sceneGraphResolver] Cycle detected: "${id}" → "${obj.parent}". ` +
              `Clearing parent on "${id}" to break the cycle.`,
          );
          cycleBreaks.add(id);
        }
      }
    }
    color.set(id, "black");
  }

  for (const obj of cleaned) {
    if (color.get(obj.id) === "white") visit(obj.id);
  }

  // Apply cycle breaks
  const acyclic = cleaned.map((obj) =>
    cycleBreaks.has(obj.id) ? { ...obj, parent: undefined } : obj,
  );

  // Rebuild byId after cycle breaks
  const acyclicById = new Map<string, SceneObject>();
  for (const obj of acyclic) acyclicById.set(obj.id, obj);

  // Step 3: topological sort (Kahn's algorithm — stable, preserves original order for ties)
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>(); // parentId → [childId, ...]

  for (const obj of acyclic) {
    inDegree.set(obj.id, 0);
    children.set(obj.id, []);
  }

  for (const obj of acyclic) {
    if (obj.parent) {
      inDegree.set(obj.id, (inDegree.get(obj.id) ?? 0) + 1);
      children.get(obj.parent)!.push(obj.id);
    }
  }

  // Queue: roots (no parent) in original spec order
  const queue: string[] = acyclic
    .filter((o) => !o.parent)
    .map((o) => o.id);

  const sorted: SceneObject[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const obj = acyclicById.get(id);
    if (obj) sorted.push(obj);

    // Enqueue children in original spec order
    const childIds = children.get(id) ?? [];
    // Sort child IDs by their original index to maintain deterministic order
    childIds
      .map((cid) => ({ cid, idx: acyclic.findIndex((o) => o.id === cid) }))
      .sort((a, b) => a.idx - b.idx)
      .forEach(({ cid }) => {
        const deg = (inDegree.get(cid) ?? 1) - 1;
        inDegree.set(cid, deg);
        if (deg === 0) queue.push(cid);
      });
  }

  // Safety: append any stragglers (shouldn't happen after cycle removal)
  if (sorted.length < acyclic.length) {
    const sortedIds = new Set(sorted.map((o) => o.id));
    for (const obj of acyclic) {
      if (!sortedIds.has(obj.id)) sorted.push(obj);
    }
  }

  return { ...spec, objects: sorted };
}
