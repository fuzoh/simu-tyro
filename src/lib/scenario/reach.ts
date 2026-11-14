/**
 * **How far the passager gets, and the height of B that would put that point on a target** (#121).
 *
 * Two things, both compositions above the engine like `./dynamics.ts`:
 *
 * - {@link rideReach} reads three **distinct** quantities off a ride: the farthest point reached
 *   toward B over the whole motion, what is left to B from there, and the Point d'arrêt. A ride that
 *   swings back stops well short of where it turned, so the Point d'arrêt says nothing of how close
 *   to B the passager came — and a ride that reaches B has reached it, wherever it rests after.
 * - {@link proposeAnchorB} is the inverse: with A fixed, the variation of B's height for which that
 *   farthest point lands on the target — a share of the span, set on Avancé. It **proposes and
 *   applies nothing**: the Scenario is read, never written.
 *
 * No formula of its own. Every trial is the Scenario's own chain run again over a span whose B end
 * moved — `unloadedOn` (so the Tightness Driver resolves `L₀` afresh, and may refuse), the Sweep,
 * then §12.2's ride as `./dynamics.ts` poses it, with the Vent entered. What this module owns is the
 * search, its bounds and its refusals.
 *
 * Rules this module exists to keep:
 *
 * - **The farthest point is searched, never the Point d'arrêt.** The target is held to
 *   {@link RideReach.maxX} of the ride with the Vent entered; a height that only brings the final
 *   stop onto the target is no answer.
 * - **B moves in place, over the terrain as known.** The candidate raises or lowers B's end of the
 *   span and B's Anchor Height by the same amount, so the ground stays where it is and §11 can be
 *   read over it. B's foot is never searched and never moved: a real B elsewhere stands on another
 *   ground, which only a new profil can tell.
 * - **The proposal is on the grain a height is typed at** ({@link REACH.step}), rounded toward a
 *   higher B — the side where the passager stops shorter — and every figure it carries is recomputed
 *   at that rounded height, so what is printed is what the Scenario would give once edited.
 * - **The target is read at the whole percent it prints as** ({@link reachTargetOf}). A link may
 *   carry `cib=98.4`, kept as given (ADR-0001); what is judged against the domain and searched is
 *   the 98 % the field on Avancé and the sentences on Dynamique show, never a value nobody reads.
 * - **A refusal is a value with its reason**, never a fallback height: the target outside its
 *   domain, a target no height of B reaches, a line that stops solving on the way, a predicted
 *   contact outside the Zones d'ancrage, a garde that is not judged.
 */

import type { Ride, RideEnd } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { roundToDisplay } from "@/lib/format/quantity.ts";
import { ride, ridePath, sweep } from "@/lib/sim";

import type { DynamicsReading } from "./dynamics.ts";
import type { TraverseScenario } from "./traverse.ts";
import type { EngineFailure, UnloadedLine } from "./unloaded.ts";

import { poseRides, readDynamics } from "./dynamics.ts";
import { memberLoad, sweepRider } from "./traverse.ts";
import { unloadedOn } from "./unloaded.ts";

/**
 * The target's shipped value and domain, and the search's own two parameters. None is physics, and
 * none is in a reference report: the domain is a `[CONVENTION]` of #121, fixed before the search
 * was written and then measured on the lines `docs/simulation-theory.md` §12.2 tables.
 */
export const REACH = {
  /** The target shipped, % of the span: the farthest point at nine tenths of the way to B. */
  target: 90,
  /**
   * The target's domain, % of the span, both ends included.
   *
   * - **98, not 99.** A target at B or past it asks for the arrival the proposal exists to avoid,
   *   and 99 % is short of B on paper only: on each of the seven lines checked, 50 m to 2000 m, a
   *   10 km/h tail wind carries the passager of a 99 % proposal to B, and so does the low end of
   *   the `C_dA` field's own band (0,30 m², `DYNAMICS.CdABand`) on all but the 50 m one.
   *   **98 % is the last whole percent kept, not a safe one**: from 300 m of span on, either
   *   variation reaches B from a target of 94 – 97 % already. Only up to 93 % did both leave the
   *   passager short of B on every line — the shipped 90 % at 96,2 % of the span at most.
   *   `docs/simulation-theory.md` §12.2 tables it.
   * - **50** is mid-span. Under it the passager turns back before half the line — the opposite of
   *   what the proposal is for — and a mistyped « 9 » for « 90 » would be answered with a B raised
   *   by tens of metres rather than questioned.
   */
  targetBand: { min: 50, max: 98 },
  /**
   * The highest target, % of the span, whose proposal stayed short of B under both variations
   * measured — a 10 km/h tail wind nobody entered, `C_dA` at the low end of its field's band — on
   * each of the seven lines of `docs/simulation-theory.md` §12.2 `[MEASURED]`. Above it the domain
   * still answers, and the proposal says that it stands within the model's own sensitivity of B.
   */
  steadyMax: 93,
  /**
   * The grain of a proposed height, m — the Anchor Height's own (`QUANTITIES.anchorHeight`). The
   * search walks it: {@link STEPS_PER_METRE} is read off it.
   */
  step: 0.1,
  /**
   * How far short of the target the proposed height may leave the farthest point, as a share of the
   * span. One step of B was measured to move that point by 1,8 % of the span at most (a 50 m line);
   * near three times that, the target sits where the farthest point jumps — no line measured does
   * it — and there is no height to propose.
   */
  maxShortfall: 0.05,
} as const;

/** How many {@link REACH.step}s make a metre: heights are counted in whole steps, never summed. */
const STEPS_PER_METRE = Math.round(1 / REACH.step);

/** One ride, read along the span — three quantities that are not one another. */
export type RideReach = {
  /** The farthest the passager gets toward B over the whole motion, m from A. */
  readonly maxX: number;
  /** What is left to B from that point, m — `0` when B is reached. */
  readonly remaining: number;
  /** B is reached at some instant of the motion, wherever the passager rests afterwards. */
  readonly reachesB: boolean;
  /** The Point d'arrêt, m from A — `null` when the ride ends at B or never settles. */
  readonly stopX: number | null;
  /** How the ride ends: at B, at rest, or still swinging. */
  readonly end: RideEnd["kind"];
};

/**
 * A ride's farthest point, the distance left to B and its Point d'arrêt.
 *
 * The farthest point is the largest `x` over **every** sample, not the first turn and not the last
 * sample: the engine records each turning point exactly, so the maximum is one of them.
 *
 * @param L the span, m.
 */
export function rideReach({ samples, end }: Ride, L: number): RideReach {
  let maxX = 0;
  for (const sample of samples) if (sample.x > maxX) maxX = sample.x;
  const reachesB = end.kind === "arrival" || maxX >= L;
  if (reachesB) maxX = L;
  return {
    maxX,
    remaining: L - maxX,
    reachesB,
    stopX: end.kind === "stop" ? end.x : null,
    end: end.kind,
  };
}

/**
 * Does the ride keep its farthest point on the target or short of it? A ride that reaches B does
 * not, whatever the target and wherever it stops after: the target is before B.
 *
 * @param targetX the target, m from A.
 */
export function withinTarget(reach: RideReach, targetX: number): boolean {
  return !reach.reachesB && reach.maxX <= targetX;
}

/**
 * The target as it is read, % of the span: **the whole percent it prints as**. The field on Avancé
 * commits whole percents, but a link or a Session may hold `98.4` (kept as given, ADR-0001), which
 * every Page shows as « 98 % » — so 98 % is what the domain judges and the search is held to.
 * Judged raw, that target would be refused as « 98 % », outside a domain that ends at 98 %.
 */
export function reachTargetOf(target: number): number {
  return roundToDisplay("reachTarget", target);
}

/**
 * Is the target one a proposal can be searched for — inside {@link REACH.targetBand}, read as
 * {@link reachTargetOf} reads it?
 */
export function isReachTarget(target: number): boolean {
  const read = reachTargetOf(target);
  return read >= REACH.targetBand.min && read <= REACH.targetBand.max;
}

/** Why a trial height has no ride: the rider-free chain stopped, or the traverse has a hole. */
export type TrialFailure = EngineFailure | { readonly stage: "traverse"; readonly error: null };

/** Why there is no height to propose. */
export type ReachRefusal =
  /** The target is outside {@link REACH.targetBand} — at B, past it, or under mid-span. */
  | { readonly kind: "target" }
  /**
   * No height of B within the search's bounds puts the farthest point on the target. `lowest`: B's
   * anchor is on the ground and the passager still stops short. `highest`: the line climbs at 45°
   * and the passager still passes the target.
   */
  | {
      readonly kind: "unreachable";
      readonly bound: "lowest" | "highest";
      /** The variation at that bound, m. */
      readonly deltaB: number;
    }
  /**
   * The farthest point jumps over the target between two neighbouring heights: `beyond` passes it,
   * `short` falls more than {@link REACH.maxShortfall} of the span under it.
   */
  | {
      readonly kind: "jump";
      readonly deltaB: number;
      readonly beyond: RideReach;
      readonly short: RideReach;
    }
  /** The line stops solving, or its traverse loses steps, before a height reaches the target. */
  | {
      readonly kind: "failed";
      /** The first variation tried that has no ride, m. */
      readonly deltaB: number;
      readonly failure: TrialFailure;
    }
  /** The candidate touches the known terrain outside the Zones d'ancrage. */
  | { readonly kind: "contact"; readonly deltaB: number; readonly contact: "rider" | "cable" }
  /** §11 judges nothing on this line — a Clearance Gate breach — so no contact can be ruled out. */
  | { readonly kind: "unjudged" };

/**
 * The unloaded line's tension at each anchor, N per member — what the Tightness Driver leaves on
 * the line once it has resolved `L₀`. Carried for the Scenario as it stands and for the candidate,
 * so a proposal says what moving B does to the tension de pose when another driver is kept: a
 * typed `L₀` is not re-cut, and the whole variation of B then goes into the tension.
 */
export type StandingTension = { readonly TA: number; readonly TB: number };

const standingTension = ({ state }: UnloadedLine): StandingTension => ({
  TA: state.TA,
  TB: state.TB,
});

/** A height of B that puts the farthest point on the target, and what it was recomputed to. */
export type ReachProposal = {
  /**
   * The variation of B's height, m, a whole number of {@link REACH.step}s: positive raises B,
   * negative lowers it, `0` leaves it where it is.
   */
  readonly deltaB: number;
  /** The candidate's dénivelé, m — anchor top to anchor top. */
  readonly h: number;
  /** The candidate's Anchor Height at B, m. */
  readonly zB: number;
  /** The unstretched length the Tightness Driver resolves on the candidate, m. */
  readonly L0: number;
  /** The candidate's unloaded tension at each anchor, N per member — see {@link StandingTension}. */
  readonly Tvide: StandingTension;
  /** The candidate's ride with the Vent entered — the one the target is held to. */
  readonly windy: RideReach;
  /** The candidate's ride without wind, for comparison. `windy` itself when no wind pushes. */
  readonly calm: RideReach;
  /** §11's minimum garde over the candidate's traverse, outside the Zones d'ancrage, m. */
  readonly clearance: number;
  /** §12.1's `v/c` passes its threshold on one of the candidate's rides. */
  readonly quasiStatic: boolean;
};

/** The reach of the Scenario's own rides, and the proposal or its refusal. */
export type ReachReading = {
  /** Like every dynamic output, an estimation (#6). */
  readonly estimate: true;
  /** The target, % of the span, as it is read: a whole percent ({@link reachTargetOf}). */
  readonly target: number;
  /** The span, m. */
  readonly L: number;
  /** The target, m from A. */
  readonly targetX: number;
  /** No wind pushes along the line: the two rides are one. */
  readonly windless: boolean;
  /** The Scenario as it stands: its rides' reach, and what the proposal is a variation of. */
  readonly current: {
    readonly windy: RideReach;
    readonly calm: RideReach;
    readonly h: number;
    readonly zB: number;
    readonly L0: number;
    readonly Tvide: StandingTension;
  };
  readonly outcome:
    | { readonly ok: true; readonly proposal: ReachProposal }
    | { readonly ok: false; readonly refusal: ReachRefusal };
};

/** What the search reads of the Scenario — Traverse scope, so a scrub of `x_D` re-runs nothing. */
export type ReachScenario = Pick<
  TraverseScenario,
  "material" | "tightness" | "tensioningSide" | "carryingLines" | "wind" | "dynamics" | "rider"
>;

export type ReachInput = {
  readonly scenario: ReachScenario;
  /** The Scenario's own line, solved. */
  readonly unloaded: UnloadedLine;
  /** The Scenario's own rides, as the gates leave them. */
  readonly reading: DynamicsReading;
  /** The **active** imported profil, `null` on a manual line — it sets `ρ`, as for the rides. */
  readonly profile: Trace | null;
  /** The bearing of A → B the Vent is projected on, or `null` without Positions. */
  readonly bearing: number | null;
  /** May §11's garde be read on this line? False on a Clearance Gate breach. */
  readonly clearanceJudged: boolean;
};

/** One trial height: the line it gives and how far its ride with the Vent gets. */
type Trial =
  | { readonly ok: true; readonly line: UnloadedLine; readonly reach: RideReach }
  | { readonly ok: false; readonly failure: TrialFailure };

/** What a height answers the search: is the farthest point within the target — or is there no ride? */
type Answer = { readonly ok: true; readonly within: boolean } | { readonly ok: false };

/** Where the search ends, in whole {@link REACH.step}s from the Scenario's own height. */
type Bracket =
  /** Two neighbouring heights, one within the target and one past it. */
  | { readonly kind: "pair"; readonly within: number; readonly beyond: number }
  /** The bound was reached and still answers as the Scenario's own height does. */
  | { readonly kind: "bound"; readonly at: number }
  /** A height with no ride stands before any that answers the other way. */
  | { readonly kind: "wall"; readonly at: number };

/**
 * The two neighbouring heights between which the farthest point crosses the target.
 *
 * From the Scenario's own height the stride doubles toward the side the target is on, up to the
 * bound, until a height answers the other way; the interval is then halved down to two neighbours.
 * A height with no ride is a wall, not an answer: the search closes in on it from the last height
 * that had one, and stops there if nothing answers the other way before it.
 *
 * @param here the Scenario's own answer: is its farthest point within the target already?
 * @param bound the last height the search may try, on the side it walks to — `≤ 0` when `here`.
 * @param ask a height's answer.
 */
function bracket(here: boolean, bound: number, ask: (steps: number) => Answer): Bracket {
  // Within the target already: B comes down. Past it, or at B: B goes up.
  const toward = here ? -1 : 1;
  const pair = (near: number, far: number): Bracket =>
    here
      ? { kind: "pair", within: near, beyond: far }
      : { kind: "pair", within: far, beyond: near };

  let near = 0;
  let far = 0;
  let wall: number | null = null;
  for (let stride = 1; ;) {
    let next: number;
    if (wall === null) {
      const left = toward * (bound - near);
      if (left <= 0) return { kind: "bound", at: near };
      next = near + toward * Math.min(stride, left);
    } else {
      next = near + Math.trunc((wall - near) / 2);
      if (next === near) return { kind: "wall", at: wall };
    }
    const answer = ask(next);
    if (!answer.ok) wall = next;
    else if (answer.within === here) {
      near = next;
      stride *= 2;
    } else {
      far = next;
      break;
    }
  }
  while (Math.abs(far - near) > 1) {
    const mid = near + Math.trunc((far - near) / 2);
    const answer = ask(mid);
    if (!answer.ok) return { kind: "wall", at: mid };
    if (answer.within === here) near = mid;
    else far = mid;
  }
  return pair(near, far);
}

/**
 * The variation of B's height that puts the farthest point of the ride with the Vent entered on
 * the Scenario's target, A fixed — or why there is none.
 *
 * The search walks whole {@link REACH.step}s of height ({@link bracket}): raising B shortens the
 * ride and lowering it lengthens it. The proposal is the lower of the two neighbouring heights
 * that keeps the farthest point on the target or short of it.
 *
 * Bounds: B's Anchor Height stays at or above the ground (`z_B + Δ ≥ 0`), and the line climbs no
 * steeper than 45° (`h + Δ ≤ L`), the bound past which the dénivelé field itself warns.
 */
export function proposeAnchorB({
  scenario,
  unloaded,
  reading,
  profile,
  bearing,
  clearanceJudged,
}: ReachInput): ReachReading {
  const { span } = unloaded;
  const { L } = span;
  const target = reachTargetOf(scenario.dynamics.reachTarget);
  const targetX = (target / 100) * L;
  const base = {
    estimate: true,
    target,
    L,
    targetX,
    windless: reading.windless,
    current: {
      windy: rideReach(reading.windy, L),
      calm: rideReach(reading.calm, L),
      h: span.h,
      zB: span.anchors.zB,
      L0: unloaded.L0,
      Tvide: standingTension(unloaded),
    },
  } as const;
  const refuse = (refusal: ReachRefusal): ReachReading => ({
    ...base,
    outcome: { ok: false, refusal },
  });

  if (!isReachTarget(target)) return refuse({ kind: "target" });
  if (!clearanceJudged) return refuse({ kind: "unjudged" });

  const { material, tightness, tensioningSide, carryingLines, rider } = scenario;
  const { posed, along } = poseRides(scenario, profile, bearing);
  const P = memberLoad(rider.mp, carryingLines);
  const heightOf = (steps: number) => steps / STEPS_PER_METRE;

  const trials = new Map<number, Trial>();
  /** The Scenario's own chain over the span with B moved by that many steps, ridden with the Vent. */
  const trial = (steps: number): Trial => {
    const known = trials.get(steps);
    if (known !== undefined) return known;
    const made = ((): Trial => {
      const delta = heightOf(steps);
      // B's end and B's Anchor Height move together, so the ground stays where it is.
      const moved = {
        ...span,
        h: span.h + delta,
        anchors: { ...span.anchors, zB: span.anchors.zB + delta },
      };
      const line =
        steps === 0
          ? unloaded
          : unloadedOn(moved, { material, tightness, tensioningSide, mp: rider.mp });
      if (!line.ok) return { ok: false, failure: line };
      const traverse = sweep(line.input, P);
      // As for the Scenario's own rides: a ride across a hole would run on a slope nobody solved.
      if (traverse.steps.length === 0 || traverse.coverage < 1) {
        return { ok: false, failure: { stage: "traverse", error: null } };
      }
      const path = ridePath(traverse.steps, line.span);
      return { ok: true, line, reach: rideReach(ride({ ...posed, path, windAlong: along }), L) };
    })();
    trials.set(steps, made);
    return made;
  };
  const failureAt = (steps: number): TrialFailure => {
    const tried = trial(steps);
    return tried.ok ? { stage: "traverse", error: null } : tried.failure;
  };

  // The Scenario's own ride answers for no variation at all.
  const here = withinTarget(base.current.windy, targetX);
  const bound = here
    ? -Math.floor(span.anchors.zB * STEPS_PER_METRE + 1e-9)
    : Math.floor((L - span.h) * STEPS_PER_METRE + 1e-9);
  const found = bracket(here, bound, (steps) => {
    const tried = trial(steps);
    return tried.ok ? { ok: true, within: withinTarget(tried.reach, targetX) } : { ok: false };
  });
  if (found.kind === "bound") {
    return refuse({
      kind: "unreachable",
      bound: here ? "lowest" : "highest",
      deltaB: heightOf(found.at),
    });
  }
  if (found.kind === "wall") {
    return refuse({ kind: "failed", deltaB: heightOf(found.at), failure: failureAt(found.at) });
  }

  const within = trial(found.within);
  const beyond = trial(found.beyond);
  if (!within.ok || !beyond.ok) throw new Error("proposeAnchorB: a bracket end without a ride");
  const deltaB = heightOf(found.within);
  if (targetX - within.reach.maxX > REACH.maxShortfall * L) {
    return refuse({ kind: "jump", deltaB, beyond: beyond.reach, short: within.reach });
  }

  // The candidate, recomputed as the Scenario would be once edited: §11, then both rides.
  const swept = sweepRider(within.line, { ...rider, carryingLines });
  const rides =
    swept === null ? null : readDynamics(scenario, within.line, swept, profile, bearing);
  if (swept === null || rides === null) {
    return refuse({ kind: "failed", deltaB, failure: { stage: "traverse", error: null } });
  }
  const { clearance } = swept;
  if (clearance.atStepIndex < 0) return refuse({ kind: "unjudged" });
  if (clearance.contact !== "none") {
    return refuse({ kind: "contact", deltaB, contact: clearance.contact });
  }

  return {
    ...base,
    outcome: {
      ok: true,
      proposal: {
        deltaB,
        h: within.line.span.h,
        zB: within.line.span.anchors.zB,
        L0: within.line.L0,
        Tvide: standingTension(within.line),
        windy: rideReach(rides.windy, L),
        calm: rideReach(rides.calm, L),
        clearance: clearance.hMin,
        quasiStatic: rides.quasiStatic.exceeded,
      },
    },
  };
}
