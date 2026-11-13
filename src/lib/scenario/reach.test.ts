import { describe, expect, test, vi } from "vitest";

import type { Ride, RideSample } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { formatQuantity, QUANTITIES } from "@/lib/format/quantity.ts";

import type { ReachProposal, ReachReading, ReachRefusal } from "./reach.ts";
import type { ScenarioDraft } from "./types.ts";

import { readDynamics } from "./dynamics.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "./first-run.ts";
import {
  isReachTarget,
  proposeAnchorB,
  REACH,
  reachTargetOf,
  rideReach,
  withinTarget,
} from "./reach.ts";
import { sweepRider, sweepRiderOf, traverseInputs, traverseScenario } from "./traverse.ts";
import { deriveUnloaded, unloadedInputs } from "./unloaded.ts";

/**
 * How far the passager gets, and the height of B that puts that point on the target (#121).
 *
 * The search is never its own oracle. A proposal is checked against the **forward chain** — the
 * Scenario edited by hand to the proposed height, then solved, swept and ridden as any Scenario is
 * (`deriveUnloaded`, `sweepRider`, `readDynamics`) — and the farthest point of that ride is read
 * here with this file's own `Math.max`, not with `rideReach`.
 */

const SHIPPED = firstRunDefaults() as ScenarioDraft;

/** The shipped line on an HMPE corde, the parameter-test rope of `rail/values.test.ts`. */
const CORDE: ScenarioDraft = {
  ...SHIPPED,
  material: { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 },
  terminations: FIRST_RUN_RETAINED_TEXTILE.terminations,
};

/** A line running due north: the Vent's azimuth is its angle from head-on — 0 head, 180 tail. */
const NORTH = 0;
const HEAD = 0;
const TAIL = 180;

type Pose = {
  readonly profile?: Trace | null;
  readonly bearing?: number | null;
  readonly clearanceJudged?: boolean;
};

/** The Scenario solved, swept and ridden as the Page does it — the forward chain. */
function forward(scenario: ScenarioDraft, { profile = null, bearing = NORTH }: Pose = {}) {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, profile));
  if (!unloaded.ok) return { ok: false, unloaded } as const;
  const swept = sweepRider(unloaded, sweepRiderOf(scenario));
  if (swept === null) throw new Error("the traverse does not solve");
  const reading = readDynamics(scenario, unloaded, swept, profile, bearing);
  if (reading === null) throw new Error("a complete traverse has a ride");
  return { ok: true, unloaded, swept, reading } as const;
}

function solved(scenario: ScenarioDraft, pose: Pose = {}) {
  const chain = forward(scenario, pose);
  if (!chain.ok) throw new Error(`the line does not solve: ${chain.unloaded.stage}`);
  return chain;
}

function propose(scenario: ScenarioDraft, pose: Pose = {}): ReachReading {
  const { profile = null, bearing = NORTH, clearanceJudged = true } = pose;
  const { unloaded, reading } = solved(scenario, pose);
  return proposeAnchorB({
    scenario: traverseScenario(traverseInputs(scenario)),
    unloaded,
    reading,
    profile,
    bearing,
    clearanceJudged,
  });
}

function proposalOf(reading: ReachReading): ReachProposal {
  if (!reading.outcome.ok) {
    throw new Error(`no proposal: ${JSON.stringify(reading.outcome.refusal.kind)}`);
  }
  return reading.outcome.proposal;
}

function refusalOf(reading: ReachReading): ReachRefusal {
  if (reading.outcome.ok) {
    throw new Error(`a height was proposed: ${reading.outcome.proposal.deltaB}`);
  }
  return reading.outcome.refusal;
}

/** A manual line: its span, its dénivelé, and the Anchor Heights — the shipped 12 m unless said. */
function line(L: number, h: number, zB = 12, zA = 12): ScenarioDraft {
  return { ...SHIPPED, geometry: { source: "manual", L, h }, anchors: { zA, zB } };
}

function targeting(scenario: ScenarioDraft, reachTarget: number): ScenarioDraft {
  return { ...scenario, dynamics: { ...scenario.dynamics, reachTarget } };
}

/** One step of the grid a proposed height stands on, in tenths: 176 is 17,6 m. */
const tenths = (delta: number) => Math.round(delta * 10);

/**
 * The Scenario as the user would edit it to take the proposal: on a manual line the dénivelé and
 * B's Anchor Height move together — the ground stays where it is —, on an imported profil B's
 * Anchor Height alone, since the dénivelé derives from it there.
 */
function edited(scenario: ScenarioDraft, steps: number): ScenarioDraft {
  const { geometry, anchors } = scenario;
  const zB = (tenths(anchors.zB) + steps) / 10;
  if (geometry.source !== "manual") return { ...scenario, anchors: { ...anchors, zB } };
  const h = (tenths(geometry.h) + steps) / 10;
  return { ...scenario, geometry: { ...geometry, h }, anchors: { ...anchors, zB } };
}

/** The farthest `x` of a ride, and whether it is B — read here, never through `rideReach`. */
function farthest({ samples, end }: Ride, L: number) {
  const maxX = Math.max(...samples.map(({ x }) => x));
  return { maxX, atB: end.kind === "arrival" || maxX >= L };
}

/** The windy ride of the Scenario edited by that many steps, read by {@link farthest}. */
function farthestAt(scenario: ScenarioDraft, steps: number, pose: Pose = {}) {
  const { reading, unloaded } = solved(edited(scenario, steps), pose);
  return farthest(reading.windy, unloaded.span.L);
}

/** A ride that only says where the passager was: `rideReach` reads `x` and the end. */
function rideThrough(xs: readonly number[], end: Ride["end"]): Ride {
  const samples: RideSample[] = xs.map((x, t) => ({ t, x, z: 0, v: 0, a: 0 }));
  return { samples, end };
}

describe("`rideReach` — three quantities that are not one another", () => {
  const L = 150;

  test("a ride that swings back: the farthest point is the turn, not where it rests", () => {
    // Out to 120 m, back to rest at 70 m.
    const out = rideThrough([0, 40, 90, 120, 100, 70], { kind: "stop", x: 70, t: 5 });
    expect(rideReach(out, L)).toEqual({
      maxX: 120,
      remaining: 30,
      reachesB: false,
      stopX: 70,
      end: "stop",
    });
  });

  test("the target is held to the farthest point: a Point d'arrêt before it is no answer", () => {
    const out = rideReach(rideThrough([0, 40, 90, 120, 100, 70], { kind: "stop", x: 70, t: 5 }), L);
    // The stop (70 m) is short of a target at 110 m; the passager went 10 m past it all the same.
    expect(withinTarget(out, 110)).toBe(false);
    expect(withinTarget(out, 120)).toBe(true);
    expect(withinTarget(out, 135)).toBe(true);
  });

  test("a ride that reaches B and comes back does not satisfy a target before B", () => {
    const bounced = rideThrough([0, 80, 150, 120, 85], { kind: "stop", x: 85, t: 4 });
    const reach = rideReach(bounced, L);
    expect(reach).toEqual({ maxX: 150, remaining: 0, reachesB: true, stopX: 85, end: "stop" });
    // It rests at 85 m, well under 90 % of the span — and B was reached on the way.
    expect(withinTarget(reach, 135)).toBe(false);
    expect(withinTarget(reach, 147)).toBe(false);
    // Not even a target at B's own abscissa: reaching B is what the target is there to avoid.
    expect(withinTarget(reach, 150)).toBe(false);
  });

  test("a ride that ends at B has no Point d'arrêt and nothing left to B", () => {
    const arrived = rideThrough([0, 60, 150], { kind: "arrival", v: 12.9, t: 14 });
    expect(rideReach(arrived, L)).toEqual({
      maxX: 150,
      remaining: 0,
      reachesB: true,
      stopX: null,
      end: "arrival",
    });
  });

  test("the farthest point is the largest x of the whole motion, not the first turn", () => {
    // A tail wind carries the passager farther on the second swing than on the first.
    const pushed = rideThrough([0, 60, 50, 100, 80], { kind: "stop", x: 80, t: 4 });
    expect(rideReach(pushed, L).maxX).toBe(100);
  });

  test("a swing that never settles has a farthest point and no Point d'arrêt", () => {
    const swinging = rideThrough([0, 110, 30, 105, 35], { kind: "unsettled", t: 900 });
    expect(rideReach(swinging, L)).toEqual({
      maxX: 110,
      remaining: 40,
      reachesB: false,
      stopX: null,
      end: "unsettled",
    });
  });

  test("on the engine's own ride over a level line, the passager turns far past where he rests", () => {
    const { reading, unloaded } = solved(line(150, 0));
    const reach = rideReach(reading.calm, unloaded.span.L);
    if (reading.calm.end.kind !== "stop") throw new Error("a level line stops the passager");
    expect(reach.stopX).toBe(reading.calm.end.x);
    expect(reach.maxX).toBe(farthest(reading.calm, 150).maxX);
    expect(reach.remaining).toBe(150 - reach.maxX);
    // The engine records the turn itself: the farthest point is a sample at rest.
    const turn = reading.calm.samples.find(({ x }) => x === reach.maxX);
    expect(turn?.v).toBe(0);
    // Tens of metres apart: one cannot stand for the other.
    expect(reach.maxX - reading.calm.end.x).toBeGreaterThan(40);
  });
});

describe("the target's domain — 50 to 98 % of the span, B and beyond excluded", () => {
  test("the shipped target is 90 %, inside the domain", () => {
    expect(REACH.target).toBe(90);
    expect(SHIPPED.dynamics.reachTarget).toBe(90);
    expect(isReachTarget(90)).toBe(true);
  });

  test("both ends are included, and nothing at B or past it is a target", () => {
    expect(isReachTarget(50)).toBe(true);
    expect(isReachTarget(98)).toBe(true);
    for (const out of [49, 98.5, 99, 100, 120, 0, -90, Number.NaN]) {
      expect(isReachTarget(out), `${out} %`).toBe(false);
    }
  });

  test("a target between whole percents is read at the percent it prints as", () => {
    // A link or a Session may hold one (ADR-0001); the field on Avancé commits whole percents.
    for (const [held, read] of [
      [98.4, 98],
      [97.5, 98],
      [49.5, 50],
      [49.6, 50],
      [90.4, 90],
      [98.5, 99],
      [49.4, 49],
    ] as const) {
      expect(reachTargetOf(held), `${held} %`).toBe(read);
      expect(formatQuantity("reachTarget", held), `${held} %`).toBe(`${read} %`);
      // What is judged is what is printed: never « 98 % sort du domaine 50 – 98 % ».
      expect(isReachTarget(held), `${held} %`).toBe(read >= 50 && read <= 98);
    }
  });

  test("the search is held to the target as read, and says which", () => {
    const whole = propose(targeting(SHIPPED, 98));
    const between = propose(targeting(SHIPPED, 98.4));
    expect(between.target).toBe(98);
    expect(between.targetX).toBe(whole.targetX);
    expect(proposalOf(between)).toEqual(proposalOf(whole));
    // Half a percent past the domain reads 99 %, and is refused as 99 %.
    const past = propose(targeting(SHIPPED, 98.5));
    expect(refusalOf(past)).toEqual({ kind: "target" });
    expect(past.target).toBe(99);
    // Just under the domain's foot it reads 50 %, and is searched there.
    const foot = propose(targeting(SHIPPED, 49.6));
    expect(foot.target).toBe(50);
    expect(foot.targetX).toBe(75);
    expect(proposalOf(foot)).toEqual(proposalOf(propose(targeting(SHIPPED, 50))));
  });

  test.each([99, 100, 120, 49])("target %d: refused, and no height stands in", (t) => {
    const reading = propose(targeting(SHIPPED, t));
    expect(refusalOf(reading)).toEqual({ kind: "target" });
    // The Scenario's own ride is still read: the refusal is about the target, not the line.
    expect(reading.target).toBe(t);
    expect(reading.current.windy.reachesB).toBe(true);
  });
});

describe("`proposeAnchorB` — the inverse, checked against the forward chain", () => {
  /** The proposed height keeps the farthest point on the target; one step lower passes it. */
  function expectTightest(scenario: ScenarioDraft, pose: Pose = {}) {
    const reading = propose(scenario, pose);
    const proposal = proposalOf(reading);
    const steps = tenths(proposal.deltaB);
    // On the grid a height is typed at: a whole number of 0,1 m.
    expect(proposal.deltaB).toBe(steps / 10);

    const at = farthestAt(scenario, steps, pose);
    expect(at.atB).toBe(false);
    expect(at.maxX).toBeLessThanOrEqual(reading.targetX);
    // … and close under it: one step of B moves the farthest point by far less than 5 % of L.
    expect(reading.targetX - at.maxX).toBeLessThan(REACH.maxShortfall * reading.L);

    const lower = farthestAt(scenario, steps - 1, pose);
    expect(lower.atB || lower.maxX > reading.targetX).toBe(true);
    return { reading, proposal, steps, at };
  }

  test("the grid the search walks is the grain an Anchor Height is typed at, read off `REACH.step`", () => {
    expect(REACH.step).toBe(10 ** -QUANTITIES.anchorHeight.decimals);
    for (const scenario of [SHIPPED, line(150, 0), targeting(SHIPPED, 61)]) {
      const { deltaB } = proposalOf(propose(scenario));
      // A whole number of steps, with no float left over from summing them.
      const steps = Math.round(deltaB / REACH.step);
      expect(deltaB).toBe(steps / Math.round(1 / REACH.step));
      expect(formatQuantity("anchorHeight", deltaB)).toBe(
        `${deltaB.toFixed(1).replace(".", ",")} m`,
      );
    }
  });

  test("the shipped line carries the passager to B: B is to be raised", () => {
    const { reading, proposal } = expectTightest(SHIPPED);
    expect(reading.current.windy.reachesB).toBe(true);
    expect(reading.targetX).toBe(135);
    expect(proposal.deltaB).toBeGreaterThan(0);
    // [MEASURED] 2026-11-13, the shipped 150 m line: « Monter B de 17,6 m ».
    expect(proposal.deltaB).toBe(17.6);
  });

  test("a level line stops the passager short of the target: B is to be lowered", () => {
    const level = line(150, 0);
    const { reading, proposal } = expectTightest(level);
    expect(reading.current.windy.reachesB).toBe(false);
    expect(reading.current.windy.maxX).toBeLessThan(reading.targetX);
    expect(proposal.deltaB).toBeLessThan(0);
    // [MEASURED] 2026-11-13: « Descendre B de 0,4 m ».
    expect(proposal.deltaB).toBe(-0.4);
  });

  test("raised or lowered, the search lands on one and the same line", () => {
    // The shipped line falls 18 m and the level one 0 m; both proposals are the line falling 0,4 m.
    const raised = proposalOf(propose(SHIPPED));
    const lowered = proposalOf(propose(line(150, 0)));
    expect(raised.h).toBeCloseTo(lowered.h, 9);
    expect(raised.L0).toBeCloseTo(lowered.L0, 9);
    expect(raised.windy.maxX).toBeCloseTo(lowered.windy.maxX, 6);
    expect(raised.windy.stopX).toBeCloseTo(lowered.windy.stopX ?? Number.NaN, 6);
  });

  test("a line already on the target is kept where it is: a variation of zero", () => {
    const { proposal } = expectTightest(line(150, -0.4, 29.6));
    expect(proposal.deltaB).toBe(0);
    expect(Object.is(proposal.deltaB, -0)).toBe(false);
  });

  test("A stays fixed and B moves in place: the dénivelé and B's Anchor Height by the same amount", () => {
    const reading = propose(SHIPPED);
    const proposal = proposalOf(reading);
    expect(reading.current.h).toBe(-18);
    expect(reading.current.zB).toBe(12);
    expect(proposal.h).toBeCloseTo(-18 + proposal.deltaB, 9);
    expect(proposal.zB).toBeCloseTo(12 + proposal.deltaB, 9);
  });

  test("every figure of the proposal is the edited Scenario's own", () => {
    const reading = propose(SHIPPED);
    const proposal = proposalOf(reading);
    const once = solved(edited(SHIPPED, tenths(proposal.deltaB)));
    const { maxX } = farthest(once.reading.windy, 150);
    expect(proposal.windy.maxX).toBeCloseTo(maxX, 9);
    expect(proposal.windy.remaining).toBeCloseTo(150 - maxX, 9);
    if (once.reading.windy.end.kind !== "stop") throw new Error("the candidate stops short");
    expect(proposal.windy.stopX).toBeCloseTo(once.reading.windy.end.x, 9);
    expect(proposal.L0).toBeCloseTo(once.unloaded.L0, 9);
    expect(proposal.Tvide.TA).toBeCloseTo(once.unloaded.state.TA, 6);
    expect(proposal.Tvide.TB).toBeCloseTo(once.unloaded.state.TB, 6);
    expect(proposal.clearance).toBeCloseTo(once.swept.clearance.hMin, 9);
    expect(proposal.quasiStatic).toBe(once.reading.quasiStatic.exceeded);
  });

  test("the three quantities of the candidate stay apart", () => {
    const { windy } = proposalOf(propose(SHIPPED));
    expect(windy.reachesB).toBe(false);
    expect(windy.remaining).toBeCloseTo(150 - windy.maxX, 9);
    // The Point d'arrêt is tens of metres behind the farthest point.
    expect(windy.maxX - (windy.stopX ?? Number.NaN)).toBeGreaterThan(40);
  });

  test("it proposes and applies nothing: the Scenario, the line and the rides are left as given", () => {
    const { unloaded, reading } = solved(SHIPPED);
    const scenario = traverseScenario(traverseInputs(SHIPPED));
    const before = structuredClone({ scenario, span: unloaded.span, L0: unloaded.L0 });
    const out = proposeAnchorB({
      scenario,
      unloaded,
      reading,
      profile: null,
      bearing: NORTH,
      clearanceJudged: true,
    });
    expect(out.outcome.ok).toBe(true);
    expect({ scenario, span: unloaded.span, L0: unloaded.L0 }).toEqual(before);
    expect(out.current).toMatchObject({ h: -18, zB: 12, L0: unloaded.L0 });
  });

  test("it is an estimation, like every dynamic output", () => {
    expect(propose(SHIPPED).estimate).toBe(true);
    expect(propose(targeting(SHIPPED, 120)).estimate).toBe(true);
  });

  test.each([50, 60, 75, 98])("target %d: met the same way", (t) => {
    const { reading } = expectTightest(targeting(SHIPPED, t));
    expect(reading.targetX).toBeCloseTo((t / 100) * 150, 9);
  });

  test("a higher target asks for a lower B", () => {
    const at = (t: number) => proposalOf(propose(targeting(SHIPPED, t))).deltaB;
    expect(at(50)).toBeGreaterThan(at(75));
    expect(at(75)).toBeGreaterThan(at(90));
    expect(at(90)).toBeGreaterThan(at(98));
  });

  test.each([
    ["a corde", CORDE],
    // 500 m falling 40 m, anchors 60 m up, laid on a 15 m flèche à vide.
    [
      "a long span",
      { ...line(500, -40, 60, 60), tightness: { mode: "sag", D_target: 15 } } as ScenarioDraft,
    ],
    ["two Brins porteurs", { ...SHIPPED, carryingLines: 2 } as ScenarioDraft],
    ["a heavier passager", { ...SHIPPED, rider: { ...SHIPPED.rider, mp: 140 } }],
  ] as const)("%s: the proposal holds on the forward chain too", (_, scenario) => {
    const { reading, proposal } = expectTightest(scenario);
    // Each of these lines carries the passager to B as it stands: B is to be raised.
    expect(reading.current.windy.reachesB).toBe(true);
    expect(proposal.deltaB).toBeGreaterThan(0);
  });
});

describe("the Tightness Driver is kept, and resolved afresh at every height", () => {
  test("a tension de pose: the longueur à vide follows B, the target tension stays", () => {
    // The shipped driver is the anchor tension, 2634 N.
    const reading = propose(SHIPPED);
    const proposal = proposalOf(reading);
    expect(SHIPPED.tightness).toEqual({ mode: "anchor", T_target: 2634 });
    expect(proposal.L0).not.toBeCloseTo(reading.current.L0, 2);
    // A chord 18 m less steep is shorter, and so is the line laid on it for the same tension.
    expect(proposal.L0).toBeLessThan(reading.current.L0);
  });

  test("a longueur à vide typed is the candidate's own: the line is not re-cut", () => {
    const cut: ScenarioDraft = { ...SHIPPED, tightness: { mode: "length", L0: 151.2 } };
    const reading = propose(cut);
    const proposal = proposalOf(reading);
    expect(reading.current.L0).toBe(151.2);
    expect(proposal.L0).toBe(151.2);
  });

  test("the tension de pose the driver leaves is carried for the Scenario and for the candidate", () => {
    // The shipped driver is the tension at A: it is the one figure B's move leaves alone.
    const held = propose(SHIPPED);
    expect(held.current.Tvide.TA).toBeCloseTo(2634, 1);
    expect(proposalOf(held).Tvide.TA).toBeCloseTo(2634, 1);
    // The line's own state, both ends: B hangs lower, so its tension is the lighter one.
    const { unloaded } = solved(SHIPPED);
    expect(held.current.Tvide).toEqual({ TA: unloaded.state.TA, TB: unloaded.state.TB });
    expect(held.current.Tvide.TB).toBeLessThan(held.current.Tvide.TA);

    // A typed length is not re-cut, so raising B goes into the tension — the consequence of the
    // Tightness Driver the proposal has to show, since it re-judges no Verdict.
    const cut: ScenarioDraft = { ...SHIPPED, tightness: { mode: "length", L0: 151.2 } };
    const reading = propose(cut);
    const proposal = proposalOf(reading);
    expect(proposal.deltaB).toBeGreaterThan(0);
    const once = solved(edited(cut, tenths(proposal.deltaB)));
    expect(proposal.Tvide.TA).toBeCloseTo(once.unloaded.state.TA, 6);
    expect(proposal.Tvide.TB).toBeCloseTo(once.unloaded.state.TB, 6);
    expect(proposal.Tvide.TA).not.toBeCloseTo(reading.current.Tvide.TA, 0);
  });

  test.each([
    ["flèche à vide", { mode: "sag", D_target: 6 }],
    ["tension horizontale", { mode: "tension", H_target: 2535 }],
    ["longueur", { mode: "length", L0: 151.2 }],
    ["rapport V", { mode: "ratio", ratio: 0.5 }],
  ] as const)("driven by the %s, the proposal still holds on the forward chain", (_, tightness) => {
    const driven: ScenarioDraft = { ...SHIPPED, tightness };
    const reading = propose(driven);
    const proposal = proposalOf(reading);
    const steps = tenths(proposal.deltaB);
    const at = farthestAt(driven, steps);
    expect(at.atB).toBe(false);
    expect(at.maxX).toBeLessThanOrEqual(reading.targetX);
    const lower = farthestAt(driven, steps - 1);
    expect(lower.atB || lower.maxX > reading.targetX).toBe(true);
    expect(proposal.L0).toBeCloseTo(solved(edited(driven, steps)).unloaded.L0, 9);
  });
});

describe("the Vent entered is in the search, and the ride without it is beside", () => {
  const blowing = (directionDeg: number, speedKmh = 30): ScenarioDraft => ({
    ...SHIPPED,
    wind: { speedKmh, directionDeg },
  });
  const calm = proposalOf(propose(SHIPPED));

  test("without wind the two rides are one", () => {
    const reading = propose(SHIPPED);
    expect(reading.windless).toBe(true);
    expect(proposalOf(reading).calm).toEqual(proposalOf(reading).windy);
  });

  test("a head wind holds the passager back: B is raised less than without wind", () => {
    const reading = propose(blowing(HEAD));
    const proposal = proposalOf(reading);
    expect(reading.windless).toBe(false);
    expect(proposal.deltaB).toBeGreaterThan(0);
    expect(proposal.deltaB).toBeLessThan(calm.deltaB);
  });

  test("a tail wind pushes the passager on: B is raised more than without wind", () => {
    const proposal = proposalOf(propose(blowing(TAIL)));
    expect(proposal.deltaB).toBeGreaterThan(calm.deltaB);
  });

  test("the target is held to the ride with the Vent entered, on the forward chain", () => {
    for (const direction of [HEAD, TAIL]) {
      const scenario = blowing(direction);
      const reading = propose(scenario);
      const steps = tenths(proposalOf(reading).deltaB);
      const at = farthestAt(scenario, steps);
      expect(at.atB).toBe(false);
      expect(at.maxX).toBeLessThanOrEqual(reading.targetX);
      const lower = farthestAt(scenario, steps - 1);
      expect(lower.atB || lower.maxX > reading.targetX).toBe(true);
    }
  });

  test("the comparison without wind is the candidate's calm ride, not the target's", () => {
    const scenario = blowing(TAIL);
    const proposal = proposalOf(propose(scenario));
    const once = solved(edited(scenario, tenths(proposal.deltaB)));
    expect(proposal.calm.maxX).toBeCloseTo(farthest(once.reading.calm, 150).maxX, 9);
    // Without the push, the same height leaves the passager shorter.
    expect(proposal.calm.maxX).toBeLessThan(proposal.windy.maxX);
  });

  test("a height that holds only by a head wind says so: without wind the passager reaches B", () => {
    const proposal = proposalOf(propose(blowing(HEAD)));
    expect(proposal.windy.reachesB).toBe(false);
    expect(proposal.calm.reachesB).toBe(true);
    expect(proposal.calm.remaining).toBe(0);
  });

  test("a wind with no bearing to project it on is not applied, as for the rides", () => {
    const reading = propose(blowing(TAIL), { bearing: null });
    expect(reading.windless).toBe(true);
    expect(proposalOf(reading).deltaB).toBe(calm.deltaB);
  });
});

describe("a refusal is a reason, never a height", () => {
  test("B's anchor on the ground and the passager still short: out of reach, lowest", () => {
    // 500 m of level line: the passager turns back at 79 % of the span, and B stands 12 m up.
    const long = targeting(line(500, 0), 95);
    const reading = propose(long);
    expect(refusalOf(reading)).toEqual({ kind: "unreachable", bound: "lowest", deltaB: -12 });
    // The forward chain agrees: with B on the ground the farthest point is still short.
    const grounded = farthestAt(long, -120);
    expect(grounded.atB).toBe(false);
    expect(grounded.maxX).toBeLessThan(reading.targetX);
  });

  test("B already on the ground: out of reach with no variation at all", () => {
    const reading = propose(line(150, 6, 0));
    expect(refusalOf(reading)).toEqual({ kind: "unreachable", bound: "lowest", deltaB: 0 });
  });

  test("a line climbing at 45° and the passager still past the target: out of reach, highest", () => {
    // Only a gale does it — 400 km/h in the back, far outside any line's use: the bound is the
    // one thing read here. The dénivelé may grow to the span: 150 − (−18) = 168 m.
    const gale: ScenarioDraft = {
      ...targeting(SHIPPED, 50),
      wind: { speedKmh: 400, directionDeg: TAIL },
    };
    expect(refusalOf(propose(gale))).toEqual({
      kind: "unreachable",
      bound: "highest",
      deltaB: 168,
    });
    expect(farthestAt(gale, 1680).atB).toBe(true);
  });

  test("a line that stops solving on the way: the height where it stops, and the engine's reason", () => {
    // A typed longueur à vide barely over the chord, and a trolley that holds: the passager needs
    // B some 27 m lower, and §5.4's floor passes the typed length before that.
    const held: ScenarioDraft = {
      ...line(150, 0, 40, 40),
      tightness: { mode: "length", L0: 150.05 },
      dynamics: { ...SHIPPED.dynamics, mu: 0.2 },
    };
    const refusal = refusalOf(propose(held));
    if (refusal.kind !== "failed") throw new Error(`expected a failed search: ${refusal.kind}`);
    expect(refusal.failure.stage).toBe("L0");
    expect(refusal.failure.error).toMatchObject({
      kind: "invalid-input",
      field: "L0",
      boundKind: "min",
    });
    // The forward chain stops at that very height, and solves one step before it.
    const steps = tenths(refusal.deltaB);
    expect(steps).toBeLessThan(0);
    expect(forward(edited(held, steps)).ok).toBe(false);
    expect(forward(edited(held, steps + 1)).ok).toBe(true);
    // … where the passager is still far short of the target.
    expect(farthestAt(held, steps + 1).maxX).toBeLessThan(135);
  });

  test("a candidate whose passager would touch the terrain outside the Zones d'ancrage", () => {
    // A level line 10 m up clears the ground; lowering B for 98 % brings the passager onto it.
    const low = targeting(line(150, 0, 10, 10), 98);
    const refusal = refusalOf(propose(low));
    if (refusal.kind !== "contact") throw new Error(`expected a contact: ${refusal.kind}`);
    expect(refusal.contact).toBe("rider");
    expect(refusal.deltaB).toBeLessThan(0);
    // The forward chain reads the same contact on the edited Scenario, and none on the current one.
    expect(solved(edited(low, tenths(refusal.deltaB))).swept.clearance.contact).toBe("rider");
    expect(solved(low).swept.clearance.contact).toBe("none");
  });

  test("a candidate whose line itself would touch the terrain", () => {
    // Half a metre lower at both ends, the same lowering lays the line itself on the ground.
    const low = targeting(line(150, 0, 9.5, 9.5), 98);
    const refusal = refusalOf(propose(low));
    if (refusal.kind !== "contact") throw new Error(`expected a contact: ${refusal.kind}`);
    expect(refusal.contact).toBe("cable");
    expect(solved(edited(low, tenths(refusal.deltaB))).swept.clearance.contact).toBe("cable");
    expect(solved(low).swept.clearance.contact).toBe("none");
  });

  test("a garde that is not judged: no contact can be ruled out, so no height", () => {
    // The same shipped line that gets a proposal when its garde is read.
    expect(propose(SHIPPED).outcome.ok).toBe(true);
    expect(refusalOf(propose(SHIPPED, { clearanceJudged: false }))).toEqual({ kind: "unjudged" });
  });
});

describe("an imported profil: B's Anchor Height alone moves, the ground does not", () => {
  /** A profil that starts at 540 m and falls 10 m to B, 150 m on. */
  const PROFIL: Trace = {
    d: Float64Array.from([0, 50, 100, 150]),
    z: Float64Array.from([540, 536, 533, 530]),
    dev: null,
    origin: { kind: "lien" },
  };
  const onProfil: ScenarioDraft = {
    ...SHIPPED,
    geometry: { source: "trace", trace: "fixture" },
  };
  const pose = { profile: PROFIL } as const;

  test("the candidate is the Scenario with B's Anchor Height edited, over the same profil", () => {
    const reading = propose(onProfil, pose);
    const proposal = proposalOf(reading);
    // Anchors 12 m up at both ends of a ground falling 10 m: the dénivelé is the ground's.
    expect(reading.current.h).toBeCloseTo(-10, 9);
    expect(proposal.zB).toBeCloseTo(12 + proposal.deltaB, 9);
    expect(proposal.h).toBeCloseTo(-10 + proposal.deltaB, 9);

    const steps = tenths(proposal.deltaB);
    const once = solved(edited(onProfil, steps), pose);
    expect(once.unloaded.span.h).toBeCloseTo(proposal.h, 9);
    expect(proposal.windy.maxX).toBeCloseTo(farthest(once.reading.windy, 150).maxX, 9);
    expect(proposal.clearance).toBeCloseTo(once.swept.clearance.hMin, 9);
    const lower = farthestAt(onProfil, steps - 1, pose);
    expect(lower.atB || lower.maxX > reading.targetX).toBe(true);
  });
});

describe("injected — `vi.doMock` on the engine barrel", () => {
  /**
   * A ride the engine does not give on any line measured: the passager reaches B while B stands
   * more than 5 m under A, and turns back at 60 % of the span from there on — so the farthest
   * point jumps over a 90 % target between two neighbouring heights.
   */
  async function withJumpingRide<T>(run: (mocked: typeof import("./reach.ts")) => T): Promise<T> {
    vi.resetModules();
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      const ride: typeof sim.ride = ({ path }) => {
        const L = path.x[path.x.length - 1];
        const h = path.z[path.z.length - 1];
        return h < -5.05
          ? { samples: [{ t: 0, x: 0, z: 0, v: 0, a: 0 }], end: { kind: "arrival", v: 3, t: 20 } }
          : {
              samples: [
                { t: 0, x: 0, z: 0, v: 0, a: 0 },
                { t: 9, x: 0.6 * L, z: 0, v: 0, a: 0 },
                { t: 20, x: 0.4 * L, z: 0, v: 0, a: 0 },
              ],
              end: { kind: "stop", x: 0.4 * L, t: 20 },
            };
      };
      return { ...sim, ride };
    });
    try {
      return run(await import("./reach.ts"));
    } finally {
      vi.doUnmock("@/lib/sim");
      vi.resetModules();
    }
  }

  test("a farthest point that jumps over the target: no height puts it there, and none is given", async () => {
    const { unloaded } = solved(SHIPPED);
    // The Scenario's own ride arrives, as the shipped line's does.
    const arrival: Ride = {
      samples: [{ t: 0, x: 0, z: 0, v: 0, a: 0 }],
      end: { kind: "arrival", v: 3, t: 20 },
    };
    const reading = { ...solved(SHIPPED).reading, calm: arrival, windy: arrival };
    const out = await withJumpingRide((mocked) =>
      mocked.proposeAnchorB({
        scenario: traverseScenario(traverseInputs(SHIPPED)),
        unloaded,
        reading,
        profile: null,
        bearing: NORTH,
        clearanceJudged: true,
      }),
    );
    // B stands 18 m under A: 13,0 m up it is 5,0 m under, the first height that turns back.
    expect(refusalOf(out)).toEqual({
      kind: "jump",
      deltaB: 13,
      beyond: { maxX: 150, remaining: 0, reachesB: true, stopX: null, end: "arrival" },
      short: { maxX: 90, remaining: 60, reachesB: false, stopX: 60, end: "stop" },
    });
  });
});
