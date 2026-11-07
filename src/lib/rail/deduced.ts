/**
 * `Valeurs déduites` — « v1 build spec » § 3 (*Valeurs déduites*, *Override — steel only, per
 * value, stale rather than silent*, *Tightness Spec*) and § 7 (*Le badge Override obsolète est
 * dérivé au chargement*).
 *
 * **Read-outs, never editable — and the split against `Résultats` is whether the rider is
 * involved.** Everything rider-free is a deduced value; everything traverse-dependent is a result
 * (A10). That is why this module formats `deriveUnloaded`'s result — the material chain, `L₀` and
 * **one unloaded solve**, run once and shared with the chart scene — and stops there: no sweep, no
 * §11 pass, no verdict. An earlier draft had a deduced-values block *and* a results block both
 * claiming the same read-outs, and the rider test is what separates them — both §8.2's stiffening
 * rule and §9.2's creep cap are about the **standing** line, so `flèche / portée` and `tension
 * permanente` belong here and not beside `T max`.
 *
 * Rules this module exists to keep:
 *
 * - **`corde` and `w` are the only two rows independent of a solve**, which is why they survive
 *   « Aucun résultat » while every other row is replaced by the cause line. They are returned
 *   separately from {@link Deduced.solve} for exactly that reason.
 * - **The stale Override badge is derived, never carried as state.** The URL has no staleness key,
 *   so a link from a sender whose override was stale would arrive as a plain override and the
 *   recipient would see a 12 mm breaking force on a 16 mm rope with no badge — the worst thing to
 *   hide, since `MBF` drives the Verdict. Each override is compared against the formula for the
 *   current `(d, R₀, construction)` **on every load and every link arrival**.
 * - **That comparison runs at the field's display precision, never on floats.** A prefill writes
 *   the *displayed* value into state, so a freshly created override holds 9074 daN against a
 *   formula value of 9073,98: float equality would badge every override on every load, and a badge
 *   that always fires is a badge nobody reads.
 * - **Textile has no override affordance at all.** `MBL` and `μ` are already direct inputs, `EA` is
 *   a read-out and `k` is the sole source of truth for stiffness — a writable `EA` would create a
 *   real ambiguity the moment `MBL` is edited.
 * - **The engine owns every physical rule.** A failure comes back as the engine's own `SolveError`
 *   — §5.4's chord bound included — and this module neither re-derives nor re-words it.
 */

import type { PlacedSpan } from "@/lib/scenario/geometry.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { EngineFailure, Unloaded } from "@/lib/scenario/unloaded.ts";
import type { SteelValues } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { equalAtDisplayPrecision } from "@/lib/format/quantity.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { resolveSteelValues, STEEL, steelFormula, TEXTILE } from "@/lib/sim";

/** Which of the three steel read-outs the user has typed over, and which of those have gone stale. */
export type OverrideFlags = { readonly MBF: boolean; readonly EA: boolean; readonly mu: boolean };

/** § 3's material read-outs. `null` wherever the active spec is still incomplete. */
export type DeducedMaterial = {
  readonly family: "steel" | "textile";
  /** `MBF` | `MBL`, N — always shown. */
  readonly strength: number | null;
  /** `EA`, N — rendered in **MN**, the one declared carve-out from the force selector. */
  readonly EA: number | null;
  /** `μ`, kg/m — **steel only**: for textile it is a field, not a read-out. */
  readonly mu: number | null;
  /** `w = μ·g`, N/m — solve-independent, so it survives « Aucun résultat ». */
  readonly w: number | null;
  /** §13.1's chain **override-blind** — the stale badge's other operand. `null` for textile. */
  readonly formula: SteelValues | null;
  /** « valeur saisie »: a typed derived value. Overriding `MBF` **downgrades** its provenance. */
  readonly overridden: OverrideFlags;
  /** The stale badge: the override no longer matches the formula, at display precision. */
  readonly stale: OverrideFlags;
};

/** The span the read-outs describe. In imported mode `L` and `h` are themselves deduced rows. */
export type DeducedSpan = {
  readonly L: number;
  readonly h: number;
  /** `√(L² + h²)`, m — compared against `L₀` in §5.4's bound, hence its 2 decimals. */
  readonly chord: number;
  /**
   * § 4's « Alt. base A » / « Alt. base B » — the ground altitude under each anchor, m, in the
   * file's own frame. **`null` in manual mode**, which has no profile to read an altitude off: there
   * the two `hauteur d'ancrage` fields sit on a straight line whose altitude is not a quantity the
   * app knows. They are read-outs beside `Portée` and `Dénivelé`, and nothing downstream consumes
   * them — `h` already carries the only difference they make.
   */
  readonly bases: { readonly zBaseA: number; readonly zBaseB: number } | null;
};

/** What one unloaded solve adds. Absent — never dashed — when the line does not solve. */
export type DeducedSolve = {
  /** `L₀`, m. Present as a read-out **hors mode Longueur**, where it is the driving field. */
  readonly L0: number;
  /** `H à vide`, N. Present **hors mode Tension**. */
  readonly H: number;
  /** `Flèche à vide`, m, and where it sits. Present **hors mode Flèche**. */
  readonly sag: number;
  readonly sagAtX: number;
  /** `Flèche / portée`, **percent** — §8.2's threshold is 3 %, so 4,00 against 3,99 must read. */
  readonly sagRatio: number;
  /** `Tension permanente`, **percent of `MBF`** — §9.2's cap is 30 %, the useful regime under 7 %. */
  readonly standingTension: number;
};

/** Everything § 3's `Valeurs déduites` block reports, plus why a row is missing when one is. */
export type Deduced = {
  readonly material: DeducedMaterial;
  /** `null` for a placement with no span at all — `station B ≤ station A`, or no trace loaded. */
  readonly span: DeducedSpan | null;
  readonly solve: DeducedSolve | null;
  /**
   * Where the unloaded chain stopped, `null` when it solved. Stages `geometry` and `material` are
   * « nothing to solve yet » and carry no error. Stages `L0` and `span` carry the engine's own
   * refusal, verbatim — `invalid-input{field:"L0"}` is §5.4's chord bound and is what A11 renders
   * as « Tension impossible », with the bound already re-emitted in the driving quantity by
   * `resolveL0`. Never re-derived here.
   *
   * **The stage travels with it**, because `resolveL0` and `solveSpan` share one error union and
   * `no-convergence` out of the two is two different surfaces: a bracket failure is « Cible
   * inatteignable », the solver's own is « Calcul impossible ». Without the stage the mapping
   * would have to guess, and ELECTIONS §0.2 is explicitly about not collapsing the two.
   */
  readonly failure: EngineFailure | null;
};

/**
 * The rider-free half of the chain, derived and formatted in one call — for a caller with no memo
 * to share. The app derives the line once and calls {@link deducedFrom}.
 *
 * @param trace the active profile — read only in imported mode, where `L` and `h` derive from it.
 */
export function deduceValues(scenario: ScenarioDraft, trace: Trace | null): Deduced {
  return deducedFrom(scenario, deriveUnloaded(unloadedInputs(scenario, trace)));
}

/**
 * § 3's read-outs over an already-derived unloaded line. **No solve runs here**: the material
 * display reads the spec and the unit, every other row reads `unloaded`.
 */
export function deducedFrom(
  scenario: Pick<ScenarioDraft, "material" | "unit">,
  unloaded: Unloaded,
): Deduced {
  const material = deducedMaterial(scenario);
  const span = deducedSpan(unloaded.span);
  if (!unloaded.ok) {
    // The stage and the error alone: the span is a read-out of its own.
    const { ok: _ok, span: _span, ...failure } = unloaded;
    return { material, span, solve: null, failure };
  }

  const { L0, state, sag, sagAtX } = unloaded;
  return {
    material,
    span,
    solve: {
      L0,
      H: state.H,
      sag,
      sagAtX,
      sagRatio: (sag / unloaded.span.L) * 100,
      // The **greater unloaded anchor tension**, which is what §9.2's cap is read against — not
      // `H`, whose 2,79 % would flatter the shipped line by a tenth of a point.
      standingTension: (Math.max(state.TA, state.TB) / unloaded.material.strength) * 100,
    },
    failure: null,
  };
}

/** § 3's material read-outs, overrides and stale badges included. */
function deducedMaterial(scenario: Pick<ScenarioDraft, "material" | "unit">): DeducedMaterial {
  const spec = scenario.material;
  const none: OverrideFlags = { MBF: false, EA: false, mu: false };

  if (spec.family === "textile") {
    const { MBL, mu, k } = spec;
    return {
      family: "textile",
      strength: MBL,
      // `EA = k·MBL` — §13.2's stiffness convention, never a fibre modulus.
      EA: MBL === null || k === null ? null : k * MBL,
      // For textile `μ` is a **field**, so there is no deduced row to print here.
      mu: null,
      // `w = μ·g` alone: it needs neither `MBL` nor `k`, which is what keeps `Poids linéique`
      // present on a rope whose datasheet fields are still blank.
      w: mu === null ? null : mu * TEXTILE.g,
      formula: null,
      overridden: none,
      stale: none,
    };
  }

  const formula = steelFormula(spec.d, spec.R0, spec.construction);
  const { MBF, EA, mu } = spec.overrides ?? {};
  // `resolveSteelValues` is the one place override precedence lives — a second copy of it beside
  // the « valeur saisie » pastille is a second copy that can disagree.
  const values = resolveSteelValues(spec);
  const overridden: OverrideFlags = {
    MBF: MBF !== undefined,
    EA: EA !== undefined,
    mu: mu !== undefined,
  };
  return {
    family: "steel",
    strength: values.MBF,
    EA: values.EA,
    mu: values.mu,
    // § 2's fixed, unexposed `g`, read from §13.1's own module rather than re-typed.
    w: values.mu * STEEL.g,
    formula,
    overridden,
    stale: {
      MBF: MBF !== undefined && !equalAtDisplayPrecision("MBF", MBF, formula.MBF, scenario.unit),
      EA: EA !== undefined && !equalAtDisplayPrecision("EA", EA, formula.EA, scenario.unit),
      mu: mu !== undefined && !equalAtDisplayPrecision("mu", mu, formula.mu, scenario.unit),
    },
  };
}

/** The span, typed in manual mode and derived from the stations in imported mode. */
function deducedSpan(placed: PlacedSpan | null): DeducedSpan | null {
  if (placed === null) return null;
  const { L, h, onTrace } = placed;
  return {
    L,
    h,
    chord: Math.hypot(L, h),
    bases: onTrace === null ? null : { zBaseA: onTrace.zBaseA, zBaseB: onTrace.zBaseB },
  };
}
