/**
 * Asset Registry
 *
 * Maps named asset IDs → { type, src, defaultSize }.
 * Used by objects with shape: "asset" to resolve their source URL
 * and default dimensions without needing explicit `size` in the spec.
 *
 * Spec usage:
 *   { "id": "hero", "shape": "asset", "assetId": "rocket", "pos": [0, 100], "scale": 1.5 }
 *
 * Assets are loaded from the Remotion `public/` folder.
 * Add SVG/PNG files to public/assets/ and register them here.
 */

export interface AssetDefinition {
  type: "svg" | "image";
  src: string;               // path relative to public/ (e.g. "/assets/rocket.svg")
  defaultSize: [number, number]; // [width, height] in px used when spec omits `size`
}

// ─── Asset table ─────────────────────────────────────────────────────────────

const assets: Record<string, AssetDefinition> = {
  // ── Vehicles ──────────────────────────────────────────────────────────────
  rocket: { type: "svg", src: "/assets/rocket.svg",      defaultSize: [120, 200] },
  car:    { type: "svg", src: "/assets/car.svg",          defaultSize: [300, 150] },
  plane:  { type: "svg", src: "/assets/plane.svg",        defaultSize: [280, 120] },

  // ── Devices ───────────────────────────────────────────────────────────────
  phone:  { type: "svg", src: "/assets/phone.svg",        defaultSize: [180, 360] },
  laptop: { type: "svg", src: "/assets/laptop.svg",       defaultSize: [320, 220] },
  tablet: { type: "svg", src: "/assets/tablet.svg",       defaultSize: [240, 300] },

  // ── Nature / Misc ─────────────────────────────────────────────────────────
  tree:   { type: "svg", src: "/assets/tree.svg",         defaultSize: [120, 200] },
  cloud:  { type: "svg", src: "/assets/cloud.svg",        defaultSize: [200, 120] },
  star:   { type: "svg", src: "/assets/star.svg",         defaultSize: [80,  80]  },
  heart:  { type: "svg", src: "/assets/heart.svg",        defaultSize: [80,  80]  },

  // ── UI / Data Viz ─────────────────────────────────────────────────────────
  chart:  { type: "svg", src: "/assets/chart.svg",        defaultSize: [200, 160] },
  arrow:  { type: "svg", src: "/assets/arrow.svg",        defaultSize: [120, 60]  },
  check:  { type: "svg", src: "/assets/check.svg",        defaultSize: [80,  80]  },
  cross:  { type: "svg", src: "/assets/cross.svg",        defaultSize: [80,  80]  },
  person: { type: "svg", src: "/assets/person.svg",       defaultSize: [80,  160] },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Look up an asset by its registered ID.
 * Returns undefined for unknown IDs — callers should fall back to obj.src.
 */
export function getAsset(assetId: string): AssetDefinition | undefined {
  return assets[assetId];
}

/**
 * Return all registered asset IDs (useful for debugging / prompt generation).
 */
export function listAssets(): string[] {
  return Object.keys(assets);
}
