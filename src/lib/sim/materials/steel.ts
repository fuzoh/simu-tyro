/**
 * Family A — steel wire rope, `docs/simulation-theory.md` §13.1 (EN 12385-4 `K`-factors, the
 * apparent-modulus stiffness chain, the nominal-mass factor). Underlying reference report:
 * `docs/references/tyrolienne sur cable.md` — but **no value is transcribed from it**: §13.1
 * already refutes [R1 B15]'s per-diameter MBL table against these same `K`-factors and its `EA`
 * column outright (it implies `E > 190 GPa`, above solid steel), and §14 records both rulings.
 * Every number below is §13.1's or a midpoint the build spec pins in prose.
 *
 * Rules this module exists to keep:
 *
 * - **Steel derives from geometry; textile transcribes from a datasheet.** That asymmetry is the
 *   A/B separation, and it lives *here* — `steel.ts` and `textile.ts` share **no base module, no
 *   common helper and no `materials/index.ts` barrel**, which is why `g = 9,81` is declared in
 *   both. Adding the barrel is the specific « tidying » that undoes the decision; the two files
 *   duplicating one physical constant is the cheap half of the trade.
 * - **`E_app` and `C` are pinned in prose, never fields.** They only ever appear as the product
 *   `E_app·C`, and two knobs for one number is two ways to be wrong about a quantity nobody has
 *   independent knowledge of. The escape hatch is the `EA` **override**, which is strictly more
 *   expressive. `W` likewise.
 * - **Range-valued factors give point values, never bands.** `EA` spans 5,53–8,41 MN at 12 mm,
 *   but `[5,53 ; 8,41] MN` is the union of two handbook ranges, not a confidence interval — and
 *   `MBF`, the quantity the verdict turns on, has no range at all (`K` is a discrete pick). One
 *   scalar, the ranges stated in the provenance popover.
 * - **No free `K` field and no free-numeric grade.** `K` is `[STD-ATTESTED]` for exactly 6×19 at
 *   1770/1960; a free `K` is the invented constant `docs/conventions/simulation.md` forbids. A
 *   6×36 user types their datasheet's `MBF` and `μ` as overrides instead.
 * - **Overrides are steel-only, per value, and never cleared.** This module applies them and
 *   nothing else: surviving a `d` change with a **stale badge** is the UI's half of the rule, and
 *   {@link steelFormula} — override-blind by construction — is what that badge compares against.
 * - **Zero shipped product presets.** Every product row in `docs/references/` is compromised.
 * - **The engine is dependency-free and SI at its outputs**: `DerivedMaterial` is N/m, N, N. The
 *   `d`-in-mm inputs are § 3's field units and §13.1's own, and they never leave this file.
 */

import type { DerivedMaterial, MaterialSpec } from "../types.ts";

/** The steel arm of `MaterialSpec` — the *input* spec, not the derived numbers. */
export type SteelSpec = Extract<MaterialSpec, { family: "steel" }>;

/**
 * §13.1's three derived values, in the units § 3's « Valeurs déduites » block reports them
 * against: `MBF` in **N** (displayed daN), `EA` in **N** (displayed MN), `μ` in **kg/m**.
 */
export type SteelValues = {
  /** Minimum breaking force, N. */
  MBF: number;
  /** Axial stiffness, N. */
  EA: number;
  /** Linear mass, kg/m. */
  mu: number;
};

/** §13.1's factors, and the midpoints the build spec pins in prose beside them. */
export const STEEL = {
  /**
   * EN 12385-4 6×19 class factors, `[STD-ATTESTED]` [R2 B15] — `MBF [kN] = K·d²·R₀/1000`.
   * Attested against 6 mm 6×19: 12,9 kN (1770 FC), 14,4 kN (1770 IWRC), 21,0 kN (1960 FC). The
   * full 10–20 mm tables are `[PAYWALLED]`, so every larger diameter is computed from `K`.
   */
  K: {
    /** 6×19 âme textile. */
    "fibre-core": 0.33,
    /** 6×19 âme métallique. */
    iwrc: 0.356,
  },
  /**
   * Apparent rope modulus, Pa — the **pinned midpoint** of §13.1's `E_app ≈ 100–130 GPa` (≈60 %
   * of wire modulus, Feyrer/Costello lineage). Stated in the provenance popover so the number is
   * reproducible; never an exposed field.
   */
  EApp: 115e9,
  /** Metallic-area factor — pinned midpoint of §13.1's `C = 0.384–0.449`. */
  C: 0.4165,
  /**
   * Nominal-mass factor, `μ = W·d²/100` — pinned midpoint of §13.1's `W = 0.359–0.400`
   * `[STD-ATTESTED]`.
   */
  W: 0.3795,
  /** m/s² — § 2's fixed, unexposed `g`. Declared here because materials share no helper. */
  g: 9.81,
} as const;

/**
 * §13.1's derivation chain from geometry alone, **override-blind**. This is the stale-Override
 * badge's input: on every load and every link arrival each override is compared against the
 * formula for the current `(d, R₀, construction)` and badged if it differs — a comparison that
 * runs at the field's **display precision**, never on floats, because a freshly prefilled
 * override holds the displayed 9074 daN against a formula value of 9073,98.
 *
 * ```
 * MBF [kN] = K · d² · R₀ / 1000     K = 0.330 (âme textile) / 0.356 (âme métallique)
 * EA       = E_app · C · d²         E_app 115 GPa, C 0,4165
 * μ        = W · d² / 100           W 0,3795
 * ```
 *
 * Two unit conversions the formulas above leave implicit, both confined to this function: the
 * `/1000` in the `MBF` line is exactly the kN→N factor, so in newtons it cancels; and `d²` is
 * mm², so `E_app·C·d²` needs ×10⁻⁶ to land in newtons.
 *
 * **`EA` and `μ` depend on `d` alone** — the midpoints are pinned and not construction-indexed —
 * while `MBF` depends on all three inputs. That split is what § 3's culprit table encodes, and
 * changing it here would silently change which field an error blames.
 *
 * @param d nominal diameter, **mm**. Passing metres scales `MBF` and `EA` by 10⁻⁶.
 * @param R0 tensile grade, N/mm² (= MPa).
 */
export function steelFormula(
  d: number,
  R0: SteelSpec["R0"],
  construction: SteelSpec["construction"],
): SteelValues {
  const dSquared = d * d;
  return {
    MBF: STEEL.K[construction] * dSquared * R0,
    EA: STEEL.EApp * STEEL.C * dSquared * 1e-6,
    mu: (STEEL.W * dSquared) / 100,
  };
}

/**
 * The three read-outs as the user sees them — {@link steelFormula} with the spec's **per-value**
 * overrides applied. Independent and persistent: overriding `MBF` leaves `EA` and `μ` on the
 * formula, and an override survives a change to `d`, `R₀` or construction rather than being
 * cleared (which would discard datasheet numbers) or silently kept (which would leave a 16 mm
 * rope reporting a 12 mm breaking force).
 *
 * One function rather than the UI merging the two itself: override precedence is one rule, and a
 * second copy of it beside the « valeur saisie » pastille is a second copy that can disagree.
 */
export function resolveSteelValues(spec: SteelSpec): SteelValues {
  const formula = steelFormula(spec.d, spec.R0, spec.construction);
  return {
    MBF: spec.overrides?.MBF ?? formula.MBF,
    EA: spec.overrides?.EA ?? formula.EA,
    mu: spec.overrides?.mu ?? formula.mu,
  };
}

/**
 * What the solver consumes — §13.1's chain reduced to § 2's `{ w, EA, strength }`, in N/m, N, N.
 * `strength` is `MBF`: the verdict divides `η_t·MBF` by a tension, and §5.4's chord bound reads
 * the same number, which is why it is one field and not two.
 */
export function deriveSteel(spec: SteelSpec): DerivedMaterial {
  const { MBF, EA, mu } = resolveSteelValues(spec);
  return { w: mu * STEEL.g, EA, strength: MBF };
}
