/**
 * The proposal of a height for B, in words (#121) — `@/lib/scenario/reach.ts`'s reading as the Page
 * Dynamique prints it, in the terrain register. **Read off the search, never re-derived**: every
 * figure is the candidate's own, recomputed there at the proposed height.
 *
 * Data shape — one {@link ReachOutputs}: the target, the Scenario as it stands, then either a
 * proposal — a height variation, the candidate's rides each read by three quantities that are not
 * one another, the assumptions it stands on and the warnings it carries — or the sentence that says
 * why there is none. Never both, and never a height beside a refusal.
 */

import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type {
  ReachInput,
  ReachProposal,
  ReachReading,
  ReachRefusal,
  RideReach,
} from "@/lib/scenario/reach.ts";
import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Unloaded } from "@/lib/scenario/unloaded.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { engineRefusal, REFUSAL_CAUSE } from "@/lib/app/refusals.ts";
import { formatAtX, formatQuantity, formatValue } from "@/lib/format/quantity.ts";
import { FIELDS } from "@/lib/rail/fields.ts";
import { windBearing } from "@/lib/rail/gates.ts";
import { tightnessDriver } from "@/lib/rail/values.ts";
import { proposeAnchorB, REACH } from "@/lib/scenario/reach.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

import type { RideId } from "./outputs.ts";

import { ARRIVES_AT_END, NEVER_SETTLES, REACH_COPY, RIDE_LABEL, WARNING_COPY } from "./copy.ts";

/** One ride at one height of B, as three tiles print it. */
export type ReachRideOutput = {
  readonly id: RideId;
  /** Which ride, at which height: « Avec la hauteur proposée et le vent saisi ». */
  readonly label: string;
  /** B is reached at some instant: the farthest point is B itself. */
  readonly reachesB: boolean;
  /** « à x 134,6 m », or « arrive au bout ». */
  readonly farthest: string;
  /** « 89,7 % de la portée » — `null` when B is reached. */
  readonly share: string | null;
  /** « 15,4 m », or « aucune : B est atteint ». */
  readonly remaining: string;
  /** The ride ends at rest short of B: {@link stop} is a position, not a sentence. */
  readonly stopsShort: boolean;
  /** « à x 80,2 m », « arrive au bout » or « oscille sans s'arrêter ». */
  readonly stop: string;
};

/** A height of B, proposed. */
export type ReachProposalOutput = {
  /**
   * « Monter B de » and « 17,6 m », « Descendre B de » and « 0,4 m » — or « Garder B à cette
   * hauteur » and no amount, when the Scenario's own height is the one.
   */
  readonly headline: { readonly action: string; readonly amount: string | null };
  /** « estimation · rien n'est appliqué ». */
  readonly note: string;
  /** The candidate's ride the target is held to, then — when a wind pushes — the one without. */
  readonly rides: readonly ReachRideOutput[];
  /** What the proposal stands on, one sentence each. */
  readonly assumptions: readonly string[];
  /** What it must be read with — the Page prints each behind a ⚠. */
  readonly warnings: readonly string[];
};

export type ReachOutputs = {
  /** « Cible : point le plus loin à 90 % de la portée, soit à x 135,0 m. Elle se règle sur … ». */
  readonly target: string;
  /** The Scenario as it stands, read the same way — one sentence. */
  readonly current: string;
  readonly proposal: ReachProposalOutput | null;
  /** « Aucune proposition : … » — `null` exactly when there is a proposal. */
  readonly refusal: string | null;
};

/** What the sentences read of the Scenario beside the search's own reading. */
export type ReachWording = Pick<ScenarioDraft, "tightness" | "unit">;

/** A length in prose: the field's `-` becomes the typographic minus, as in every message. */
const prose = (text: string) => text.replace("-", "−");

/** A height variation without its sign: the verb carries the direction. */
const height = (delta: number) => formatQuantity("anchorHeight", Math.abs(delta));

/** « B monté de 17,6 m » — a variation named inside a sentence. */
function moved(delta: number): string {
  return `B ${delta < 0 ? "descendu" : "monté"} de ${height(delta)}`;
}

/**
 * @param reading the search's reading.
 * @param wording the Tightness Driver and the force unit, for the assumption that names the first.
 */
export function reachOutputs(reading: ReachReading, wording: ReachWording): ReachOutputs {
  const { current, L, outcome, target, targetX, windless } = reading;
  const span = label("span", "terrain");
  const held = windless ? "" : `, ${RIDE_LABEL.windy.toLocaleLowerCase("fr")}`;
  return {
    target: `Cible : ${label("farthestPoint", "terrain")} à ${formatQuantity("reachTarget", target)} de la ${span}, soit ${formatAtX(targetX)}. Elle se règle sur la ${label("page", "terrain")} Avancé.`,
    current: `${REACH_COPY.current}${held} : ${reachSentence(current.windy, L)}.`,
    proposal: outcome.ok ? proposalOutput(reading, outcome.proposal, wording) : null,
    refusal: outcome.ok
      ? null
      : `${REACH_COPY.refused} : ${refusalSentence(outcome.refusal, reading, wording)}`,
  };
}

/** A ride's three quantities in one clause — the Scenario as it stands takes a line, not tiles. */
function reachSentence(reach: RideReach, L: number): string {
  if (reach.reachesB) return `le ${label("passenger", "terrain")} ${ARRIVES_AT_END}`;
  const stop =
    reach.stopX === null
      ? NEVER_SETTLES
      : `${label("stopPoint", "terrain")} ${formatAtX(reach.stopX)}`;
  return `${label("farthestPoint", "terrain")} ${formatAtX(reach.maxX)} (${share(reach, L)}), ${formatQuantity("remainingToB", reach.remaining)} ${REACH_COPY.beforeB} ; ${stop}`;
}

/** « 89,7 % de la portée ». */
function share(reach: RideReach, L: number): string {
  return `${formatQuantity("reachShare", (reach.maxX / L) * 100)} ${REACH_COPY.ofSpan}`;
}

function rideOutput(id: RideId, title: string, reach: RideReach, L: number): ReachRideOutput {
  return {
    id,
    label: title,
    reachesB: reach.reachesB,
    farthest: reach.reachesB ? ARRIVES_AT_END : formatAtX(reach.maxX),
    share: reach.reachesB ? null : share(reach, L),
    remaining: reach.reachesB
      ? REACH_COPY.noneLeft
      : formatQuantity("remainingToB", reach.remaining),
    stopsShort: reach.stopX !== null,
    stop:
      reach.stopX !== null
        ? formatAtX(reach.stopX)
        : reach.end === "arrival"
          ? ARRIVES_AT_END
          : NEVER_SETTLES,
  };
}

function proposalOutput(
  { current, L, windless }: ReachReading,
  proposal: ReachProposal,
  wording: ReachWording,
): ReachProposalOutput {
  const { deltaB } = proposal;
  const rides = windless
    ? [rideOutput("windy", REACH_COPY.proposed, proposal.windy, L)]
    : [
        rideOutput("windy", REACH_COPY.proposedWindy, proposal.windy, L),
        rideOutput("calm", REACH_COPY.proposedCalm, proposal.calm, L),
      ];

  const anchorHeight = `${label("anchorHeight", "terrain")} B`;
  const dropped = label("elevationDifference", "terrain");
  const assumptions = [
    deltaB === 0
      ? `A et B là où ils sont : ${anchorHeight} ${formatQuantity("anchorHeight", current.zB)}, ${dropped} ${prose(formatQuantity("h", current.h))}.`
      : `A fixe, B ${deltaB < 0 ? "descendu" : "monté"} sur place : ${anchorHeight} ${formatQuantity("anchorHeight", current.zB)} → ${formatQuantity("anchorHeight", proposal.zB)}, ${dropped} ${prose(formatQuantity("h", current.h))} → ${prose(formatQuantity("h", proposal.h))}. Le ${label("profile", "terrain")} et les positions ne bougent pas.`,
    tensionAssumption(wording, current.L0, proposal.L0),
    `${heading("passengerMass", "terrain")}, ${label("wind", "terrain")} saisi et réglages de la ${label("page", "terrain")} Avancé : ceux du scénario.`,
    `${heading("groundClearance", "terrain")} sur le ${label("profile", "terrain")} connu, hors ${label("anchorZones", "terrain")} : ${prose(formatQuantity("clearance", proposal.clearance))} au plus près.`,
    REACH_COPY.untouched,
  ];

  const warnings = [
    REACH_COPY.noPromise,
    REACH_COPY.movedB,
    ...(!windless && proposal.calm.reachesB ? [REACH_COPY.calmReachesB] : []),
    ...(proposal.quasiStatic ? [WARNING_COPY["quasi-static"]] : []),
  ];

  return {
    headline:
      deltaB === 0
        ? { action: REACH_COPY.keep, amount: null }
        : { action: deltaB < 0 ? REACH_COPY.lower : REACH_COPY.raise, amount: height(deltaB) },
    note: REACH_COPY.notApplied,
    rides,
    assumptions,
    warnings,
  };
}

/**
 * The Tightness Driver, kept: every trial height resolves the line again for the same target, so
 * the longueur à vide moves with B — unless it is the driver, and then the tension does.
 */
function tensionAssumption({ tightness, unit }: ReachWording, from: number, to: number): string {
  const { field, value } = tightnessDriver({ tightness });
  const length = label("unstretchedLength", "terrain");
  if (field === "L0") {
    return `${heading("unstretchedLength", "terrain")} ${REACH_COPY.kept} : ${formatQuantity("L0", value)} ; la tension de la ${label("line", "terrain")} change avec la hauteur de B.`;
  }
  // Two lengths that print alike are printed once: an arrow between twins reads as a mistake.
  const [before, after] = [formatQuantity("L0", from), formatQuantity("L0", to)];
  const lengths = before === after ? `${length} ${before}` : `${length} ${before} → ${after}`;
  // The two drivers only Avancé offers are not named here, and neither is their value.
  if (field === "H_target" || field === "vRatio") {
    return `${REACH_COPY.avanceTension} ${REACH_COPY.kept} ; ${lengths}.`;
  }
  const name = heading(field === "T_target" ? "pretension" : "sag", "terrain");
  return `${name} ${REACH_COPY.kept} : ${formatQuantity(FIELDS[field].quantity, value, unit)} ; ${lengths}.`;
}

/** Why there is no height to propose — the reason, and never a height in its place. */
function refusalSentence(
  refusal: ReachRefusal,
  { target, current }: ReachReading,
  { tightness, unit }: ReachWording,
): string {
  const farthest = label("farthestPoint", "terrain");
  const anchor = label("anchor", "terrain");
  switch (refusal.kind) {
    case "target":
      return `la cible de ${formatQuantity("reachTarget", target)} sort du domaine ${formatValue("reachTarget", REACH.targetBand.min)} – ${formatQuantity("reachTarget", REACH.targetBand.max)} de la ${label("span", "terrain")}. Une cible à B ou au-delà demanderait l'arrivée que la proposition évite ; elle se règle sur la ${label("page", "terrain")} Avancé.`;
    case "unjudged":
      return `la ${label("groundClearance", "terrain")} n'est pas jugée sur cette ${label("line", "terrain")}, et un contact avec le terrain ne peut donc pas être écarté.`;
    case "unreachable":
      return refusal.bound === "lowest"
        ? `même avec l'${anchor} B au sol${refusal.deltaB === 0 ? "" : ` (${moved(refusal.deltaB)})`}, le ${farthest} reste avant la cible. Descendre B davantage demande un autre emplacement, donc un autre ${label("profile", "terrain")}.`
        : `même avec ${moved(refusal.deltaB)}, une ${label("line", "terrain")} qui monte à 45°, le ${label("passenger", "terrain")} dépasse encore la cible.`;
    case "jump":
      return `autour de ${moved(refusal.deltaB)}, le ${farthest} passe ${
        refusal.beyond.reachesB
          ? "de B"
          : `de x ${formatQuantity("extremumX", refusal.beyond.maxX)}`
      } à x ${formatQuantity("extremumX", refusal.short.maxX)} sans s'arrêter sur la cible : aucune hauteur de B ne l'y place.`;
    case "failed": {
      const named =
        refusal.failure.stage === "traverse"
          ? null
          : engineRefusal(refusal.failure, { tightness, unit, register: "terrain" });
      const cause =
        refusal.failure.stage === "traverse"
          ? `la ${label("traverse", "terrain")} y est incomplète`
          : named === null
            ? `la ${label("line", "terrain")} ne s'y calcule pas`
            : `${REFUSAL_CAUSE[named.id]} avec le réglage de tension du scénario`;
      return `le calcul s'arrête à ${moved(refusal.deltaB)}, avant d'atteindre la cible : ${cause}.`;
    }
    case "contact":
      return `avec ${moved(refusal.deltaB)}, ${
        refusal.contact === "cable"
          ? `la ${label("line", "terrain")} toucherait le terrain`
          : `le ${label("passenger", "terrain")} toucherait le terrain`
      } hors ${label("anchorZones", "terrain")}, sur le ${label("profile", "terrain")} connu (${label("anchorHeight", "terrain")} B ${formatQuantity("anchorHeight", current.zB + refusal.deltaB)}).`;
  }
}

/** What the Page hands the search: its own solved line and rides, as the gates leave them. */
export type ReachPage = {
  /** The rider-free chain, raw — a line with a ride has solved. */
  readonly unloaded: Unloaded;
  /** The Scenario without `x_D`, which the search does not read: a scrub re-runs nothing. */
  readonly traverse: TraverseScenario;
  /** The cached Trace; it sets `ρ` only while it is the line's ground, as for the rides. */
  readonly trace: Trace | null;
  /** The two rides as the gates leave them (`gatedRides`), `null` while none is read. */
  readonly rides: DynamicsReading | null;
  /** May the garde au sol be read (`ErrorSurfaces.clearance`)? */
  readonly clearance: boolean;
};

/** One search, posed: what it reads, and the words its answer is written with. */
export type ReachSearch = { readonly input: ReachInput; readonly wording: ReachWording };

/**
 * The search as the gates leave it — **the one way the Page poses it**: off the gated rides, so no
 * height is searched for a ride the gates withhold, with the Vent projected on the same bearing and
 * `ρ` read off the same profil as theirs. The wording travels with it, so an answer is never worded
 * with the Tightness Driver of another Scenario than the one it was searched on.
 *
 * @returns `null` while there is no ride to propose from; the Page says why there is none.
 */
export function reachSearch({
  unloaded,
  traverse,
  trace,
  rides,
  clearance,
}: ReachPage): ReachSearch | null {
  if (rides === null || !unloaded.ok) return null;
  return {
    input: {
      scenario: traverse,
      unloaded,
      reading: rides,
      profile: traverse.geometry.source === "trace" ? trace : null,
      bearing: windBearing(traverse),
      clearanceJudged: clearance,
    },
    wording: { tightness: traverse.tightness, unit: traverse.unit },
  };
}

/** The search, run and worded — a dozen solves of the whole chain: the Page memoises it. */
export function reachProposal({ input, wording }: ReachSearch): ReachOutputs {
  return reachOutputs(proposeAnchorB(input), wording);
}
