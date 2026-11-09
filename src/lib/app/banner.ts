/**
 * **The banner, and the « Aucun résultat » cause line** — « v1 build spec » § 7 (*Les quatre
 * invariants*, *Le bandeau : un occupant, quatre rangs*, *Le résumé bloquant nomme la pire grille
 * franchie*, *« Aucun résultat » — une cause, trois échos*), as
 * [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) leaves rank 2.
 *
 * **The banner slot has exactly one occupant**, and that is invariant 4 rather than a layout note:
 * § 5's spine bought one banner band and a stack would let a dismissible link notice sit above a
 * « Hors limites ». So the precedence is a **pure reducer** over everything that could claim the
 * slot, and the four ranks are the whole of it:
 *
 * 1. **Blocking errors**, any gate — **count and jump link only**. The actionable message and its
 *    Fix Action live inline on the culpable field.
 * 2. **The three refusal states** (`./refusals.ts`), same visual class as blocking.
 * 3. **« Saisie en cours »** — neutral, and mid-edit rather than an error.
 * 4. **The verdict**, or the no-régime prompt.
 *
 * Rules this module exists to keep:
 *
 * - **Ranks 3 and 4 are mutually exclusive by construction** — an empty required field suppresses
 *   the verdict — and rank 4's two occupants are too, so their relative order is moot. The reducer
 *   still orders them, because « by construction » is a property of the callers and this function
 *   may not depend on it.
 * - **The blocking summary names the worst gate breached**, never « aucun résultat » flatly: under
 *   the three-gate split a bad `DAF` blocks the verdict while `T max` and `Garde min` are printed
 *   on screen, and « aucun résultat » beside a printed clearance is the app contradicting itself.
 *   `@/lib/rail/gates.ts` writes that sentence; this module only places it.
 * - **The strip, the import failures and the coarse-terrain ⚠ are not slot occupants.** The
 *   ignored-keys strip is about the **link** and not the line and must never be able to hide a
 *   verdict; parse failures render in the import block, because nothing about the current line
 *   changed; the terrain ⚠ never promotes out of Provenance.
 * - **A whole-link refusal never reaches the banner at all.** Amendment E made it a *rendered
 *   state* off `search.refused` rather than a thrown `validateSearch`, and it suppresses the whole
 *   screen instead of merging with it — the shell renders `LinkRefusalSurface` and there is no
 *   banner to occupy. Rank 2 is the **engine's** three refusals, which is what § 7 puts there.
 * - **The cause line is written once and echoed**, never once per row: the Rail is one scrolling
 *   column, so a rail reader may never have the banner in view, and a warning wall per row is what
 *   § 3 refused. It is a **sentence**, never a set of dashes — « — » is spent on `Indéterminé`.
 */

import type { EngineRefusal } from "@/lib/app/refusals.ts";
import type { FieldId, GateId } from "@/lib/rail/fields.ts";
import type { BlockingError, GateReport, SaisieEnCours } from "@/lib/rail/gates.ts";
import type { VerdictBanner } from "@/lib/rail/results.ts";
import type { VerdictState } from "@/lib/sim";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { fieldErrorLabel, lowerFirst } from "@/lib/rail/fields.ts";
import { blockingSummary, GATE_CONSEQUENCE, passedGates } from "@/lib/rail/gates.ts";
import { NO_REGIME_BANNER_BY_REGISTER } from "@/lib/rail/results.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import { REFUSAL_CAUSE } from "./refusals.ts";

/** The slot's jump link. A `<button>`, never an `<a href="#…">` — the URL is write-only. */
export const JUMP_LABEL = "voir la première";

/** § 7's `[ Choisir un régime ]`, beside the neutral no-régime strip. A **focus** action. */
export const CHOOSE_REGIME_LABEL = "Choisir un régime";

/** The same action on each register's Pages: a simplified Page says marge exigée (#61). */
export const CHOOSE_REGIME_BY_REGISTER: Record<Register, string> = {
  exact: CHOOSE_REGIME_LABEL,
  terrain: `Choisir une ${label("regime", "terrain")}`,
};

/**
 * The one thing in the slot. `rank` is carried rather than inferred so a consumer can style the
 * two blocking-class ranks alike without re-deriving the precedence it was just handed.
 */
export type BannerOccupant =
  /** Rank 1 — « ⛔ 2 erreurs bloquantes — aucun résultat » `[ voir la première ]`. */
  | {
      readonly rank: 1;
      readonly kind: "blocking";
      readonly text: string;
      /** The field the jump link targets: the **first** culprit, in worst-gate-then-rail order. */
      readonly target: FieldId;
      readonly action: typeof JUMP_LABEL;
    }
  /** Rank 2 — one of the three engine refusals, in the blocking visual class. */
  | {
      readonly rank: 2;
      readonly kind: "refusal";
      readonly text: string;
      readonly refusal: EngineRefusal;
    }
  /** Rank 3 — neutral. Mid-edit, not an error, and never a sixth verdict state. */
  | { readonly rank: 3; readonly kind: "saisie"; readonly text: string; readonly field: FieldId }
  /** Rank 4a — the verdict, in one of its five states. */
  | {
      readonly rank: 4;
      readonly kind: "verdict";
      readonly text: string;
      readonly state: VerdictState;
    }
  /** Rank 4b — the neutral strip: **no colour, no icon**, and its one discovery affordance. */
  | {
      readonly rank: 4;
      readonly kind: "no-regime";
      readonly text: string;
      readonly action: string;
    };

/** Everything that can claim the slot, in one object. Every field is optional-by-`null`. */
export type BannerInput = {
  readonly report: GateReport;
  /** The engine's refusal for this Scenario, or `null`. Rank 2. */
  readonly refusal: EngineRefusal | null;
  /** « Saisie en cours », from `saisieEnCours` — a required field empty **and holding focus**. */
  readonly saisie: SaisieEnCours | null;
  /** The verdict sentence, from `deriveResults`. `null` whenever no verdict was computed. */
  readonly verdict: VerdictBanner | null;
  /** The Page's vocabulary, which words the no-régime prompt. `exact` when absent. */
  readonly register?: Register;
};

/**
 * § 7's precedence, as a reducer.
 *
 * @returns the single occupant, or `null` when nothing claims the slot — a solved line with no
 *   verdict *and* no régime cannot happen (rank 4b covers it), so `null` means the band is empty
 *   and reserved, which is the Skeleton's own state.
 */
export function banner({
  report,
  refusal,
  saisie,
  verdict,
  register = "exact",
}: BannerInput): BannerOccupant | null {
  const standing = standingReport(report, saisie);
  // **The summary may never promise more than the screen shows.** Rank 1 pre-empts rank 2 — that
  // is § 7's precedence and it stands — but a live engine refusal has already removed « tout
  // l'aval », so « 1 erreur bloquante — aucun verdict » beside five cells reading « Aucun résultat
  // — tension impossible. » is the very contradiction the per-gate summaries exist to prevent.
  const summary = blockingSummary(standing, refusal !== null);
  if (summary !== null) {
    // `blockingSummary` is `null` exactly when the list is empty, so this index is safe — but the
    // fallback is written rather than asserted, because a crash in the error surface is the one
    // place a defect is guaranteed to reach a user who is already stuck.
    const first: BlockingError | undefined = standing.errors[0];
    if (first !== undefined) {
      return {
        rank: 1,
        kind: "blocking",
        text: summary,
        target: first.field,
        action: JUMP_LABEL,
      };
    }
  }

  if (refusal !== null) {
    return { rank: 2, kind: "refusal", text: refusal.message, refusal };
  }

  if (saisie !== null) {
    return { rank: 3, kind: "saisie", text: saisie.message, field: saisie.field };
  }

  if (verdict !== null) {
    return { rank: 4, kind: "verdict", text: verdict.text, state: verdict.state };
  }

  if (report.noRegime) {
    return {
      rank: 4,
      kind: "no-regime",
      text: NO_REGIME_BANNER_BY_REGISTER[register],
      action: CHOOSE_REGIME_BY_REGISTER[register],
    };
  }

  return null;
}

/**
 * § 7's cause sentence — « Aucun résultat — portée invalide. » — written **once** here and echoed
 * by each suppressed region: the five read-out cells, `Résultats`, and the solve-dependent rows of
 * `Valeurs déduites`.
 *
 * *One spanning sentence rather than « — » per cell*, because that glyph is spent on `Indéterminé`
 * — *attempted, unavailable* — and reusing it for *nothing attempted* collides with the
 * distinction § 6 bought five verdict states to preserve. *And not empty frames either*: a blank
 * value cell reads as a rendering fault.
 *
 * @returns `null` when nothing is suppressed. A Clearance or Verdict Gate breach returns `null`
 *   too: those remove the garde, or the banner and the grid, and the numbers that survive are not
 *   « aucun résultat ».
 */
export function noResultCause({
  report,
  refusal,
  saisie = null,
  register = "exact",
}: {
  readonly report: GateReport;
  readonly refusal: EngineRefusal | null;
  /** Mid-edit suppresses nothing: the output half **freezes** on the last valid Sweep instead. */
  readonly saisie?: SaisieEnCours | null;
  /** The Page's vocabulary, which names the culpable field. `exact` when absent. */
  readonly register?: Register;
}): string | null {
  if (refusal !== null)
    return `${label("aucun-resultat", register)} — ${REFUSAL_CAUSE[refusal.id]}.`;
  const first = standingReport(report, saisie).errors.find((error) => error.gate === "solve");
  if (first === undefined) return null;
  return `${label("aucun-resultat", register)} — ${fieldCause(first, register)}.`;
}

/**
 * **« Saisie en cours » is mid-edit, not an error** (§ 7), so the field the caret is in may not
 * also stand on the blocking list — rank 1 pre-empts rank 3, and the state would be structurally
 * unreachable. Exactly the shape of the `noRegime` correction A9 made one gate over.
 *
 * Nothing is *suppressed* by it either: the Scenario still holds that field's last committed
 * value, which is what the frozen picture is drawn from. So the gate flags are recomputed from the
 * errors that remain, and an absent régime keeps suppressing the verdict as it always did.
 *
 * **Exported because every surface has to read the same report.** The banner, the cause sentence
 * and `./suppression.ts`'s three suppressions are one decision seen from three places, and a
 * consumer that filtered mid-edit itself would be a second answer. Applying it twice is a no-op.
 */
export function standingReport(report: GateReport, saisie: SaisieEnCours | null): GateReport {
  if (saisie === null) return report;
  const errors = report.errors.filter(
    (error) => !(error.field === saisie.field && error.kind === "empty"),
  );
  if (errors.length === report.errors.length) return report;
  const passed = passedGates(errors, report.noRegime);
  return { ...report, errors, passed, worst: errors[0]?.gate ?? null };
}

/**
 * The clause after the dash, from the culpable field. **« invalide » rather than a per-field
 * phrase**: it is gender-neutral in French, so one rule spells every row of § 7's message table
 * without a second column nobody would keep in step. An *empty* field is not invalid — nothing was
 * typed — so it echoes the field's own neutral message instead.
 */
function fieldCause(error: BlockingError, register: Register): string {
  const label = lowerFirst(fieldErrorLabel(error.field, register));
  return error.kind === "empty" ? `${label} : valeur requise` : `${label} invalide`;
}

/**
 * The report as a Page that prints **some gates' outputs only** reads it: the breaches of the
 * others stand on no value of that Page, and a banner saying « aucun verdict » beside a computed
 * ride, or « aucune estimation » beside a Verdict, is the Page contradicting itself. Without the
 * Verdict Gate there is no régime to ask for, so the reducer's rank 4b cannot fire either.
 *
 * @param gates the gates whose outputs the Page prints — its banner, its notice and its jump read
 *   this report, and nothing else.
 */
export function pageReport(report: GateReport, gates: readonly GateId[]): GateReport {
  const errors = report.errors.filter((error) => gates.includes(error.gate));
  const noRegime = report.noRegime && gates.includes("verdict");
  if (errors.length === report.errors.length && noRegime === report.noRegime) return report;
  return {
    errors,
    passed: passedGates(errors, noRegime),
    worst: errors[0]?.gate ?? null,
    noRegime,
  };
}

/**
 * What withholds the passager's ride from a line that stands — « Aucune estimation — vitesse du
 * vent invalide. » — written once, like {@link noResultCause}, and echoed wherever a ride would be
 * read: Dynamique's tiles and curve, Terrain's vitesse d'arrivée, Avancé's `v/c` row. A Wind Gate
 * breach withholds it as well, because the ride reads the Vent.
 *
 * @returns `null` while the ride may be read, and under « Aucun résultat » or a refusal, whose own
 *   cause already says there is no line to ride.
 */
export function rideCause({
  report,
  refusal,
  saisie = null,
  register = "exact",
}: {
  readonly report: GateReport;
  readonly refusal: EngineRefusal | null;
  readonly saisie?: SaisieEnCours | null;
  readonly register?: Register;
}): string | null {
  if (refusal !== null) return null;
  const { errors } = standingReport(report, saisie);
  if (errors.some((error) => error.gate === "solve")) return null;
  return withheld(errors, ["wind", "ride"], GATE_CONSEQUENCE.ride, register);
}

/**
 * What withholds the Vent — « Vent indisponible — vitesse du vent invalide. » — said where the rose
 * would read it, on every Page that draws the vue de dessus. The Banane and the rose's wind are not
 * drawn meanwhile: a negative speed would bow the line the wrong way.
 *
 * @returns `null` while the Vent may be read. The statics have no say: the Vent is drawn over the
 *   ligne A–B, which stands without a solve.
 */
export function windCause({
  report,
  saisie = null,
  register = "exact",
}: {
  readonly report: GateReport;
  readonly saisie?: SaisieEnCours | null;
  readonly register?: Register;
}): string | null {
  const { errors } = standingReport(report, saisie);
  return withheld(errors, ["wind"], GATE_CONSEQUENCE.wind, register);
}

/** The cause sentence of what `gates` withhold, from their first breach, or `null` without one. */
function withheld(
  errors: readonly BlockingError[],
  gates: readonly GateId[],
  consequence: string,
  register: Register,
): string | null {
  const first = errors.find((error) => gates.includes(error.gate));
  if (first === undefined) return null;
  const opening = consequence.charAt(0).toLocaleUpperCase("fr") + consequence.slice(1);
  return `${opening} — ${fieldCause(first, register)}.`;
}
