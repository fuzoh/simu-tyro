/**
 * The Page Statique's outputs (#91): the tension de pose, the flèche, the flèche chargée, the garde
 * au sol, and the Verdict — **read off the models Avancé prints from**, never re-derived. The
 * tension de pose and the flèche come off the rider-free chain the Rail's `Valeurs déduites` reads,
 * the other two and the Verdict off the same `Results` its `Résultats` block renders, so one link
 * reads the same on both Pages at display precision by construction; `./outputs.test.ts` holds it.
 *
 * Data shape — one {@link StatiqueOutputs}: four {@link StatiqueOutput} tiles, each a value or the
 * reason there is none (the two traverse aggregates with their scope), and one
 * {@link StatiqueVerdict}, which is a state, a request for a marge exigée, or an absence with its
 * cause.
 */

import type { Deduced } from "@/lib/rail/deduced.ts";
import type { ResultRow, ResultRowId, Results } from "@/lib/rail/results.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { VerdictState } from "@/lib/sim";

import { formatAtX, formatQuantity } from "@/lib/format/quantity.ts";
import { GATE_CONSEQUENCE } from "@/lib/rail/gates.ts";
import {
  CLEARANCE_SCOPE,
  NO_REGIME_BANNER_BY_REGISTER,
  refusalReason,
  TRAVERSE_SCOPE,
} from "@/lib/rail/results.ts";
import {
  demandedPretension,
  overLimitWarning,
  tmaxAtTensioningAnchor,
} from "@/lib/rail/tensioning.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import { OUTPUT_LABEL, pretensionWhere } from "./copy.ts";

/** The four outputs, in the order the Page prints them — and its Skeleton reserves them. */
export const STATIQUE_OUTPUT_IDS = ["pretension", "sag", "loadedSag", "clearance"] as const;

export type StatiqueOutputId = (typeof STATIQUE_OUTPUT_IDS)[number];

/** One output tile. */
export type StatiqueOutput = {
  readonly id: StatiqueOutputId;
  readonly label: string;
  /** The formatted value with its unit, or `null` when there is none to print. */
  readonly value: string | null;
  /** Where the value is read — « par ligne, ancrage A », « passager à x 74,4 m ». */
  readonly qualifier: string | null;
  /**
   * « sur toute la traversée » on the two traverse aggregates, which it scopes — the minimum and
   * the maximum over every passenger position — and `null` on the unloaded line's two tiles.
   */
  readonly scope: string | null;
  /** Why {@link value} is `null` — the cause sentence or the gate's consequence. Never a dash. */
  readonly absent: string | null;
  /** The limite de tension's Avertissement, without its glyph. */
  readonly warning: string | null;
  /** The garde au sol under the garde exigée — the one output that carries its own threshold. */
  readonly breach: boolean;
};

export type StatiqueVerdict =
  /** A judgement: its state, coloured by the Page, and the prohibition when it is « Interdit ». */
  | {
      readonly kind: "state";
      readonly state: VerdictState;
      readonly label: string;
      readonly reason: string | null;
    }
  /** « Résultats sans régime »: nothing was judged, and the Page asks for a marge exigée. */
  | { readonly kind: "no-regime"; readonly text: string }
  /** Nothing judged for a reason — no result at all, or a Verdict Gate breach. */
  | { readonly kind: "none"; readonly text: string };

export type StatiqueOutputs = {
  readonly outputs: readonly StatiqueOutput[];
  readonly verdict: StatiqueVerdict;
};

/** The tiles read over the whole traverse, which carry its scope. */
const TRAVERSE_OUTPUTS: readonly StatiqueOutputId[] = ["loadedSag", "clearance"];

/**
 * A tile's scope — the `Résultats`' own on the two traverse aggregates, « sur toute la traversée »
 * before there are any (the Skeleton's), and none on the unloaded line's two tiles. The garde's is
 * its own, which names the Zones d'ancrage it leaves out — the shipped ones before any result.
 */
export function scopeOf(id: StatiqueOutputId, results: Results | null = null): string | null {
  // The garde leaves the Zones d'ancrage out, and its tile says so (#106).
  if (id === "clearance") return results?.clearanceScope ?? CLEARANCE_SCOPE;
  return TRAVERSE_OUTPUTS.includes(id) ? (results?.scope ?? TRAVERSE_SCOPE) : null;
}

export type StatiqueInput = {
  readonly scenario: ScenarioDraft;
  /** The rider-free chain, from the Page root. */
  readonly deduced: Deduced;
  /** The traverse aggregate as the gates leave it; `null` is « Aucun résultat ». */
  readonly results: Results | null;
  /** « Aucun résultat — … », or `null` when nothing is suppressed. */
  readonly cause: string | null;
};

export function statiqueOutputs({
  scenario,
  deduced,
  results,
  cause,
}: StatiqueInput): StatiqueOutputs {
  const { unit, tightness } = scenario;
  const missing = cause ?? label("aucun-resultat", "terrain");
  // Under a cause the rider-free tiles go too, as their rows do from `Valeurs déduites` — and the
  // driver's own number with them: the Scenario holds the last value the gates accepted, not the
  // text they refused, and a tension de pose the line cannot reach is not a result.
  const solve = cause === null ? deduced.solve : null;

  const tile = (id: StatiqueOutputId) => blankTile(id, results);

  const demanded = cause === null ? demandedPretension(scenario, solve) : null;
  const pretension: StatiqueOutput = {
    ...tile("pretension"),
    value: demanded === null ? null : formatQuantity("T_target", demanded, unit),
    qualifier: pretensionWhere(scenario.tensioningSide),
    absent: demanded === null ? missing : null,
    warning: overLimitWarning(scenario, tmaxAtTensioningAnchor(scenario, results)),
  };

  // The flèche à vide the line was set to, or the one it hangs at — the field or the read-out,
  // whichever Avancé shows for this driver.
  const sagValue =
    cause !== null ? null : tightness.mode === "sag" ? tightness.D_target : (solve?.sag ?? null);
  const sag: StatiqueOutput = {
    ...tile("sag"),
    value: sagValue === null ? null : formatQuantity("sag", sagValue),
    qualifier: solve === null ? null : formatAtX(solve.sagAtX),
    absent: sagValue === null ? missing : null,
  };

  const loadedSag = fromRow(tile("loadedSag"), results, "loadedSag", missing);
  const clearanceRow = fromRow(tile("clearance"), results, "clearance", missing);
  // Present results without the garde is a Clearance Gate breach, which removes it alone.
  const clearance: StatiqueOutput =
    results !== null && clearanceRow.value === null
      ? { ...clearanceRow, absent: GATE_CONSEQUENCE.clearance }
      : clearanceRow;

  return {
    outputs: [pretension, sag, loadedSag, clearance],
    verdict: verdictOf(scenario, results, missing),
  };
}

/** The tension de pose *field*: what it shows while it does not drive, and its Avertissement. */
export type PretensionField = {
  /** The read-out another driver's line stands at, N per member; the target on this driver. */
  readonly readOut: number | null;
  /** The limite de tension's Avertissement, without its glyph. */
  readonly warning: string | null;
};

/**
 * The tension de pose field, warned as Avancé warns it: the limite de tension is read against the
 * traverse's « T max » at the device's anchor, so under « Aucun résultat » there is none and the
 * Avertissement goes with it — as another driver's read-out does, with the solve.
 */
export function pretensionField({
  scenario,
  deduced,
  results,
  cause,
}: StatiqueInput): PretensionField {
  const readOut = demandedPretension(scenario, cause === null ? deduced.solve : null);
  return {
    readOut,
    warning: overLimitWarning(scenario, tmaxAtTensioningAnchor(scenario, results)),
  };
}

function blankTile(id: StatiqueOutputId, results: Results | null): StatiqueOutput {
  return {
    id,
    label: OUTPUT_LABEL[id],
    value: null,
    qualifier: null,
    scope: scopeOf(id, results),
    absent: null,
    warning: null,
    breach: false,
  };
}

/** A tile read off the `Résultats` row of the same id, which carries its value and its state. */
function fromRow(
  base: StatiqueOutput,
  results: Results | null,
  id: ResultRowId,
  missing: string,
): StatiqueOutput {
  const row: ResultRow | undefined = results?.rows.find((candidate) => candidate.id === id);
  if (row === undefined) return { ...base, absent: missing };
  return {
    ...base,
    value: row.value,
    qualifier: row.qualifier,
    breach: row.state === "hors-limites",
  };
}

function verdictOf(
  scenario: ScenarioDraft,
  results: Results | null,
  missing: string,
): StatiqueVerdict {
  if (results === null) return { kind: "none", text: missing };
  const { verdict } = results;
  if (verdict !== null) {
    return {
      kind: "state",
      state: verdict.state,
      label: label(verdict.state, "terrain"),
      reason: refusalReason(verdict, "terrain"),
    };
  }
  if (scenario.regime === null) {
    return { kind: "no-regime", text: NO_REGIME_BANNER_BY_REGISTER.terrain };
  }
  return { kind: "none", text: GATE_CONSEQUENCE.verdict };
}
