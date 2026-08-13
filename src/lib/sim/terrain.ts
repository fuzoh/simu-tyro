/**
 * The engine's only terrain seam — `docs/simulation-theory.md` §11 (the ground-clearance
 * criterion this ground is read for) and §2 (frame, signs, units); the terrain *format* decisions
 * are the build spec's § 4 (« Terrain et import de profil CSV »). Underlying reference report:
 * `docs/references/simulation tyrolienne.md` (profil en travers, rendu de la coupe) — but **no
 * value is transcribed from it**: §14 records which of its worked examples are fabricated, and
 * this module contains no constant at all.
 *
 * Rules this module exists to keep:
 *
 * - **Terrain crosses as data, never a closure.** A closure cannot be structured-cloned and a
 *   megamorphic callback would sit in the clearance inner loop, which runs `260 × 60` times per
 *   parameter change. `Terrain` is declared in `types.ts` with the rest of the contract and
 *   re-exported here, because « the `Terrain` union + `zGroundAt` » is one module (voir § 2 —
 *   *Module layout*).
 * - **Manual ground is not a separate kind.** The straight line between the two anchor bases is
 *   the **two-point case** of `profile` — `xs: [0, L]`, `zs: [z_base_A, z_base_B]` in the
 *   anchor-A-top frame — which is what makes §11 clearance live from first launch with no
 *   import. `flat` stays in the union for fixtures. Rejected: an `x0` offset field, which would
 *   put an offset in that same inner loop.
 * - **This module is engine-pure.** The CSV parser and the `Trace → Terrain` derivation live
 *   **outside** `src/lib/sim/` (voir § 4 — « La Trace est immuable ; le `Terrain` est dérivé à un
 *   seul joint »), which is the property that keeps every §15 fixture free of terrain stubs:
 *   nothing upstream of `clearance.ts` has ever heard of the ground.
 * - **The engine is dependency-free and SI** — `m`, `z` positive up, `x` measured from anchor A.
 */

import type { Terrain } from "./types.ts";

export type { Terrain };

/**
 * Ground height at a horizontal position, by **linear interpolation between the profile's own
 * samples** — § 4's « les échantillons du fichier, jamais de rééchantillonnage ».
 *
 * Outside the profile the ends are **held, never extrapolated**: `x < xs[0]` reads `zs[0]` and
 * `x > xs[last]` reads `zs[last]`. The derivation seam guarantees `xs[0] === 0` and
 * `xs[last] === L` exactly — it synthesises interpolated endpoints for that reason — so inside a
 * span the clamp is unreachable, and outside it (the shared x domain runs to `portée + 5 %`) a
 * held end is the only honest answer a file that stops there can give.
 *
 * Binary search rather than a cached cursor: the clearance scan walks `x` monotonically per step
 * but **restarts at every step**, and 200-point profiles (§ 4's measured export ceiling) make
 * `log₂ 200 ≈ 8` comparisons cheaper than the state a cursor would have to carry.
 *
 * @param terrain `flat` answers everywhere; `profile` is assumed to hold at least two samples
 *   with strictly increasing `xs`, which is the CSV seam's post-condition (`aucune-donnée`,
 *   `trop-peu-de-points`, `distance-non-croissante` and `distance-dupliquée` are its refusals,
 *   never this function's).
 * @param x metres from anchor A.
 * @returns the ground height, m, in the same anchor-A-top frame as the cable.
 */
export function zGroundAt(terrain: Terrain, x: number): number {
  if (terrain.kind === "flat") return terrain.z;

  const { xs, zs } = terrain;
  const last = xs.length - 1;
  if (x <= xs[0]) return zs[0];
  if (x >= xs[last]) return zs[last];

  // The bracketing pair `xs[lo] ≤ x < xs[hi]`, `hi === lo + 1` on exit.
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }

  // `xs[lo] < xs[hi]` is guaranteed even on a profile with duplicated `x`: the search only raises
  // `lo` past a sample it found `≤ x`, and only lowers `hi` onto one it found `> x`. So the
  // divisor is never zero and `distance-dupliquée` stays the CSV seam's refusal, not a branch.
  return zs[lo] + ((x - xs[lo]) / (xs[hi] - xs[lo])) * (zs[hi] - zs[lo]);
}
