/**
 * `Valeurs déduites` — « v1 build spec » § 3 (*Valeurs déduites*, *Override — steel only, per
 * value, stale rather than silent*, *Tightness Spec*) and § 7 (*Le badge Override obsolète est
 * dérivé au chargement*).
 *
 * **Read-outs, never editable — and the split against `Résultats` is whether the rider is
 * involved.** Everything rider-free is a deduced value; everything traverse-dependent is a result
 * (A10). That is why this module runs the material chain, `resolveL0` and **one unloaded solve**
 * and stops there: no sweep, no §11 pass, no verdict. An earlier draft had a deduced-values block
 * *and* a results block both claiming the same read-outs, and the rider test is what separates
 * them — both §8.2's stiffening rule and §9.2's creep cap are about the **standing** line, so
 * `flèche / portée` and `tension permanente` belong here and not beside `T max`.
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

import type { EngineFailure } from "@/lib/app/refusals.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { DerivedMaterial, SpanInput, SpanState, SteelValues } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { equalAtDisplayPrecision } from "@/lib/format/quantity.ts";
import { engineTightness } from "@/lib/scenario/tightness.ts";
import {
  deriveSteel,
  deriveTextile,
  resolveL0,
  resolveSteelValues,
  sampleCable,
  solveSpan,
  STEEL,
  steelFormula,
  TEXTILE,
  unloadedSag,
} from "@/lib/sim";
import { deriveSpan } from "@/lib/terrain/trace.ts";

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
   * The engine's own refusal, verbatim — `invalid-input{field:"L0"}` is §5.4's chord bound and is
   * what A11 renders as « Tension impossible », with the bound already re-emitted in the driving
   * quantity by `resolveL0`. Never re-derived here.
   *
   * **The stage travels with it**, because `resolveL0` and `solveSpan` share one error union and
   * `no-convergence` out of the two is two different surfaces: a bracket failure is « Cible
   * inatteignable », the solver's own is « Calcul impossible ». Without the stage the mapping
   * would have to guess, and ELECTIONS §0.2 is explicitly about not collapsing the two.
   */
  readonly failure: EngineFailure | null;
};

/**
 * The rider-free half of the chain a parameter change runs: derive the material, resolve `L₀`,
 * solve the unloaded line.
 *
 * @param trace the active profile — read only in imported mode, where `L` and `h` derive from it.
 */
export function deduceValues(scenario: ScenarioDraft, trace: Trace | null): Deduced {
  const material = deducedMaterial(scenario);
  const span = deducedSpan(scenario, trace);
  const derived = solverInput(scenario);

  if (span === null || derived === null) {
    return { material, span, solve: null, failure: null };
  }

  const { L, h } = span;
  const L0 = resolveL0(engineTightness(scenario.tightness, scenario.rider.mp), {
    L,
    h,
    ...derived,
  });
  if (!L0.ok) return { material, span, solve: null, failure: { stage: "L0", error: L0.error } };

  const input: SpanInput = {
    L,
    h,
    L0: L0.value,
    w: derived.w,
    EA: derived.EA,
    loads: [],
    strength: derived.strength,
  };
  const solved = solveSpan(input);
  if (!solved.ok)
    return { material, span, solve: null, failure: { stage: "span", error: solved.error } };

  const sag = unloadedSag(solved.state, { L, h });
  return {
    material,
    span,
    solve: {
      L0: L0.value,
      H: solved.state.H,
      sag,
      sagAtX: sagPosition(solved.state, { L, h }),
      sagRatio: (sag / L) * 100,
      // The **greater unloaded anchor tension**, which is what §9.2's cap is read against — not
      // `H`, whose 2,79 % would flatter the shipped line by a tenth of a point.
      standingTension: (Math.max(solved.state.TA, solved.state.TB) / derived.strength) * 100,
    },
    failure: null,
  };
}

/**
 * Samples of the unloaded line the sag position is scanned over. **The position is scanned, the
 * value is not**: `unloadedSag` is closed-form and owns « 6,00 m », while « (à x 74,8 m) » is an
 * argmax over samples — because the alternative is re-deriving §4.1's `x(s)` in the app, which is
 * the « physics in the UI » § 5 forbids. 2400 samples put a vertex within 0,06 m at 150 m, half a
 * step of the row's own 0,1 m grain, and this runs once per parameter change.
 */
const SAG_SCAN = 2400;

/**
 * Where the unloaded line hangs lowest below the A–B chord — the « (à x 74,8 m) » § 3 prints
 * beside « Flèche à vide ». Nothing downstream reads it: it is a read-out and not an input.
 */
function sagPosition(state: SpanState, span: { L: number; h: number }): number {
  const samples = sampleCable(state, SAG_SCAN);
  let deepest = Number.NEGATIVE_INFINITY;
  let atX = 0;
  for (let i = 0; i < samples.length; i += 2) {
    const x = samples[i];
    const drop = (span.h * x) / span.L - samples[i + 1];
    if (drop > deepest) {
      deepest = drop;
      atX = x;
    }
  }
  return atX;
}

/** § 3's material read-outs, overrides and stale badges included. */
function deducedMaterial(scenario: ScenarioDraft): DeducedMaterial {
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
function deducedSpan(scenario: ScenarioDraft, trace: Trace | null): DeducedSpan | null {
  const { geometry } = scenario;
  if (geometry.source === "manual") {
    const { L, h } = geometry;
    if (!Number.isFinite(L) || L <= 0 || !Number.isFinite(h)) return null;
    return { L, h, chord: Math.hypot(L, h), bases: null };
  }
  if (trace === null || !(geometry.sb > geometry.sa)) return null;
  const { L, h, zBaseA, zBaseB } = deriveSpan(
    trace,
    { station: geometry.sa, height: scenario.anchors.zA },
    { station: geometry.sb, height: scenario.anchors.zB },
  );
  return { L, h, chord: Math.hypot(L, h), bases: { zBaseA, zBaseB } };
}

/** What the solver consumes, or `null` while a textile draft still has § 9's blanks. */
function solverInput(scenario: ScenarioDraft): DerivedMaterial | null {
  const spec = scenario.material;
  if (spec.family === "steel") return deriveSteel(spec);
  const { MBL, mu, k } = spec;
  if (MBL === null || mu === null || k === null) return null;
  return deriveTextile({ family: "textile", ropeClass: spec.ropeClass, MBL, mu, k });
}
