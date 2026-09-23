/**
 * The bridge from the app's {@link TightnessDraft} to the engine's `TightnessSpec`.
 *
 * « Rapport V » is `P / H`: the passenger's design load over the horizontal pretension. It is what
 * decides how far the loaded line folds under the rider — at `P / H ≈ 1` the cable leaves the
 * anchor at ~45° — and it depends on the passenger's mass, so it cannot be a fixed `H_target`. It
 * resolves to one here, and the engine never sees the ratio.
 */

import type { TightnessSpec } from "@/lib/sim";

import { G } from "@/lib/format/quantity.ts";

import type { TightnessDraft } from "./types.ts";

/**
 * @param tightness the driver as state holds it.
 * @param mp the passenger's mass, kg — the same `m_p` the sweep loads the line with.
 * @returns the engine's spec. A non-positive or non-finite ratio passes through as a non-finite
 *   `H_target`, which `resolveL0` refuses as tier one would; the field's own `> 0` rule fires first.
 */
export function engineTightness(tightness: TightnessDraft, mp: number): TightnessSpec {
  if (tightness.mode !== "ratio") return tightness;
  return { mode: "tension", H_target: (mp * G) / tightness.ratio };
}
