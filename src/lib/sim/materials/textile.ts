/**
 * Family B — textile rope, `docs/simulation-theory.md` §13.2 (the `EA = k·MBL` stiffness
 * convention and its three rope classes). Underlying reference report:
 * `docs/references/tyrolienne sur corde.md` — but **no value is transcribed from it**: §13.2
 * refutes [R1 C5]'s `k = 40 ± 5` and its `EA = 18·MBL` (which contradicts its own elongation
 * rows), and §14 records both. The two `k` defaults below are §13.2's `[DATASHEET]` figures,
 * arithmetic-verified by [R2 C5].
 *
 * Rules this module exists to keep:
 *
 * - **Textile transcribes from a datasheet; steel derives from geometry.** That asymmetry is the
 *   A/B separation, and it lives *here* — `textile.ts` and `steel.ts` share **no base module, no
 *   common helper and no `materials/index.ts` barrel**, which is why `g = 9,81` is declared in
 *   both. §13.2 gives no `MBL(d)` and no `μ(d)`, so this family has four inputs and exactly one
 *   derived value; there is nothing here to factor out with steel except the multiplication.
 * - **`EA = k·MBL`, never a fibre modulus** (C5 resolved: 110 GPa is the *fibre* figure and a
 *   finished braid is far softer). `EA` stays a **read-out**: making it writable would create a
 *   real ambiguity the moment `MBL` is edited — « my rope has `k = 22` » and « my rope has
 *   `EA = 2200 kN` » disagree about what survives — so `k` is the sole source of truth for
 *   stiffness and this family has **no override affordance** at all.
 * - **No rope ships.** §13.2 compromises every product row in both research runs, and — measured
 *   — one invented `MBL` decides the verdict: 100 kN scores 11,94 « dans les limites » where
 *   60 kN scores 7,63 « hors limites » on the same line. `MBL` and `μ` are blank and required.
 * - **`k` is a plain field whose out-of-band warning is ambient, and fires always.** §13.2
 *   indexes `k` by working load (22 @ 10 % MBL, 31 @ 30 % MBL) and a zip line never enters that
 *   band — measured 0,6 % MBL standing, 6,3 % loaded. The honesty mechanism is a result-level
 *   warning driven by the computed `% MBL` (« voir § 6 »), not a band selector and not
 *   auto-iteration on `k(%MBL)`, which would extrapolate a two-point table backwards past its
 *   lowest point and dress the result as convergence.
 * - **Diamètre is not a field.** Nothing in v1 consumes it, and a field that changes no number
 *   teaches that some fields do not matter.
 * - **The engine is dependency-free and SI**: `DerivedMaterial` is N/m, N, N.
 */

import type { DerivedMaterial, MaterialSpec } from "../types.ts";

/** The textile arm of `MaterialSpec` — four transcribed inputs, one derived value. */
export type TextileSpec = Extract<MaterialSpec, { family: "textile" }>;

/** §13.2's class data, and the `g` this family needs to turn `μ` into `w`. */
export const TEXTILE = {
  /**
   * The shipped `k` default per class — one of exactly two things `Classe de corde` drives (the
   * other is the termination whitelist; **not** creep grade, §9 is out of scope).
   *
   * **Polyester is `null`, not a number**: §13.2 places it only « between the two » and R1's
   * `k = 25–35` is `[UNVERIFIED:R1]`. A class whose stiffness field is mandatory and empty states
   * the truth — nobody published it, and this is the one class unusable without a datasheet in
   * hand. Filling the hole with an interpolation would be the invented constant
   * `docs/conventions/simulation.md` forbids.
   */
  kDefault: {
    /** 12-strand HMPE (SK78 class), spliced and bedded-in, `[DATASHEET]` at 10 % MBL. */
    hmpe: 22,
    /** EN 1891 type A polyamide 10,5–11 mm at the CE band, `[DATASHEET]`. */
    "pa-en1891a": 1.5,
    /** No published figure. Blank and `requis`. */
    polyester: null,
  },
  /**
   * The load band §13.2's `k` table was measured over, in **% MBL** — 22 at 10 %, 31 at 30 %.
   * A zip line sits an order of magnitude below it, which is why the out-of-band warning is
   * ambient state rather than an alarm: it fires always. Its wording and tiers are « voir § 6 ».
   */
  attestedBandPercentMBL: { min: 10, max: 30 },
  /** m/s² — § 2's fixed, unexposed `g`. Declared here because materials share no helper. */
  g: 9.81,
} as const;

/**
 * What the solver consumes — §13.2's `EA = k·MBL` plus `w = μ·g`, in N/m, N, N. `strength` is the
 * transcribed `MBL`, untouched: there is no derivation to run on it and no override to apply.
 *
 * Deliberately the whole module's function surface. A second entry point returning `{ EA }` alone
 * would be a helper for one multiplication, and the family's only derived value is already named
 * by the type it returns.
 */
export function deriveTextile(spec: TextileSpec): DerivedMaterial {
  return { w: spec.mu * TEXTILE.g, EA: spec.k * spec.MBL, strength: spec.MBL };
}
