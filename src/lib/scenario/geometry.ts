import type { Terrain } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { deriveSpan, deriveTerrain, traceExtent } from "@/lib/terrain/trace.ts";

import type { AnchorHeights, Geometry } from "./types.ts";

/**
 * The span a {@link Geometry} describes: typed `Portée` in manual mode, the whole extent of the
 * Trace in imported mode — the same `L` `deriveSpan` returns, without deriving the terrain.
 *
 * It lives here because it had two copies (`rail/values.ts` and `app/state.ts`), which is the
 * shape ticket 38 item 4 asks the discriminant to take where a branch is a *derivation* rather
 * than a module's own question. The value is returned **raw**: `NaN`, zero and negatives all reach
 * the caller, because « no span at all » is a different refusal in each of them — `null` for the
 * Rail's clamp, « leave `x_D` where it is » for the reducer's.
 *
 * @param trace the decoded profile beside an imported geometry, `null` when none is loaded — which
 *   is no span at all (`NaN`). Ignored in manual mode.
 */
export function spanOfGeometry(geometry: Geometry, trace: Pick<Trace, "d"> | null): number {
  if (geometry.source === "manual") return geometry.L;
  return trace === null ? Number.NaN : traceExtent(trace);
}

/** A span the engine can be posed: `L`, `h`, the anchors it stands on and the ground under it. */
export type PlacedSpan = {
  /** Portée, m. */
  readonly L: number;
  /** Dénivelé, m — anchor top to anchor top, negative when B is lower. */
  readonly h: number;
  /** Both Anchor Heights the span was placed with, m. */
  readonly anchors: AnchorHeights;
  /** The engine's ground over `[0, L]`, in the anchor-A-top frame — a profile in both modes. */
  readonly terrain: Extract<Terrain, { kind: "profile" }>;
  /**
   * The ground altitude under each anchor, in the file's own frame — the profil's first and last
   * samples. `null` in manual mode, whose straight ground has no altitude to read.
   */
  readonly bases: { readonly zBaseA: number; readonly zBaseB: number } | null;
};

/**
 * The anchors placed on the geometry — **the one place the geometry guards live**, read by the
 * unloaded derivation, and through it by the Valeurs déduites and the chart frame. An imported
 * profil is taken whole: anchor A on its first sample, B on its last.
 *
 * @returns `null` for § 8's *exception géométrique*: a non-finite or non-positive `L`, a
 *   non-finite `h`, or a `trace` geometry with no Trace — or a one-sample one — loaded.
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
    const terrain: PlacedSpan["terrain"] = {
      kind: "profile",
      xs: Float64Array.from([0, L]),
      zs: Float64Array.from([-anchors.zA, h - anchors.zB]),
    };
    return { L, h, anchors, terrain, bases: null };
  }

  if (trace === null) return null;
  const { L, h, zBaseA, zBaseB } = deriveSpan(trace, anchors);
  // A one-sample profil — the Session's blob check admits one — has no span to stand on.
  if (!(L > 0)) return null;
  return { L, h, anchors, terrain: deriveTerrain(trace, anchors.zA), bases: { zBaseA, zBaseB } };
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
