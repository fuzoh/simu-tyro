import type { Terrain } from "@/lib/sim";
import type { AnchorPlacement, Trace } from "@/lib/terrain/trace.ts";

import { deriveSpan, deriveTerrain } from "@/lib/terrain/trace.ts";

import type { AnchorHeights, Geometry } from "./types.ts";

/**
 * The span a {@link Geometry} describes: typed `Portée` in manual mode, `s_B − s_A` in imported
 * mode. This is the **one** derivation `source` drives — the same arithmetic `deriveSpan` performs
 * on a decoded Trace, and the only part of it a clamp needs, which is why it does not wait for the
 * Trace to be decoded.
 *
 * It lives here because it had two copies (`rail/values.ts` and `app/state.ts`), which is the
 * shape ticket 38 item 4 asks the discriminant to take where a branch is a *derivation* rather
 * than a module's own question. The value is returned **raw**: `NaN`, zero and negatives all reach
 * the caller, because « no span at all » is a different refusal in each of them — `null` for the
 * Rail's clamp, « leave `x_D` where it is » for the reducer's.
 */
export function spanOfGeometry(geometry: Geometry): number {
  return geometry.source === "manual" ? geometry.L : geometry.sb - geometry.sa;
}

/** A span the engine can be posed: `L`, `h`, the anchors it stands on and the ground under it. */
export type PlacedSpan = {
  /** Portée, m. */
  readonly L: number;
  /** Dénivelé, m — anchor top to anchor top, negative when B is lower. */
  readonly h: number;
  /** Both Anchor Heights the span was placed with, m. */
  readonly anchors: AnchorHeights;
  /** The engine's ground over `[0, L]`, in the anchor-A-top frame. */
  readonly terrain: Terrain;
  /**
   * The Trace the span was placed on, anchor A's placement and both base altitudes in the file's
   * own frame. `null` in manual mode, whose straight ground has no altitude to read.
   */
  readonly onTrace: {
    readonly trace: Trace;
    readonly a: AnchorPlacement;
    readonly zBaseA: number;
    readonly zBaseB: number;
  } | null;
};

/**
 * The anchors placed on the geometry — **the one place the geometry guards live**, read by the
 * unloaded derivation, and through it by the Valeurs déduites and the chart frame.
 *
 * @returns `null` for § 8's *exception géométrique*: a non-finite or non-positive `L`, a
 *   non-finite `h`, `station B ≤ station A`, or a `trace` geometry with no Trace loaded.
 */
export function placeSpan(
  { geometry, anchors }: { geometry: Geometry; anchors: AnchorHeights },
  trace: Trace | null,
): PlacedSpan | null {
  if (geometry.source === "manual") {
    const { L, h } = geometry;
    if (!Number.isFinite(L) || L <= 0 || !Number.isFinite(h)) return null;
    // § 4's manual ground: the straight line between the two anchor bases, in the anchor-A-top
    // frame. Its two points are the cable's own ends, so it costs the clearance reducer nothing.
    const terrain: Terrain = {
      kind: "profile",
      xs: Float64Array.from([0, L]),
      zs: Float64Array.from([-anchors.zA, h - anchors.zB]),
    };
    return { L, h, anchors, terrain, onTrace: null };
  }

  if (trace === null) return null;
  const a = { station: geometry.sa, height: anchors.zA };
  const b = { station: geometry.sb, height: anchors.zB };
  // `station B ≤ station A` is § 4's blocked placement, repaired by `[ Inverser A et B ]`. It has
  // no span, and `deriveTerrain` would throw on it.
  if (!(b.station > a.station)) return null;

  const { L, h, zBaseA, zBaseB } = deriveSpan(trace, a, b);
  const terrain = deriveTerrain(trace, a, b);
  return { L, h, anchors, terrain, onTrace: { trace, a, zBaseA, zBaseB } };
}

/**
 * The one `x_D` clamp: it applies on **every** path — geometry change, link arrival, typed input,
 * pointer — because `x_D` selects a view. Rule, in order: a non-finite `xD` is `0`; with no span to
 * clamp to (`L` non-finite or ≤ 0) `xD` is returned as is; otherwise `xD` is clamped into `[0, L]`.
 *
 * Silent here only in the sense that this function does not render: the caller compares its own
 * input against the result and owns the transient inline note when the clamp moved a link's `x`
 * (« position ramenée à la portée : 0 – 150,0 m »), because discarding sender state with no trace
 * is the thing the clamp was elected *against*.
 */
export function clampX(xD: number, L: number): number {
  if (!Number.isFinite(xD)) return 0;
  if (!Number.isFinite(L) || L <= 0) return xD;
  if (xD < 0) return 0;
  return xD > L ? L : xD;
}
