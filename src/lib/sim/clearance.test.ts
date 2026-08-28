import { describe, expect, test } from "vitest";

import type { SpanInput, SweepStep, Terrain } from "./types.ts";

import {
  CLEARANCE_VS_DENIVELE,
  CLEARANCE_VS_FLECHE,
  FIRST_RUN_CLEARANCE,
  GROUND_CONTACT_CABLE,
  GROUND_CONTACT_RIDER,
  TOLERANCE,
  Z1,
} from "./__fixtures__/theory-15.ts";
import { xAt, zAt } from "./catenary.ts";
import { CLEARANCE, evaluateClearance } from "./clearance.ts";
import { solveSpan } from "./solve.ts";
import { sweep } from "./sweep.ts";
import { zGroundAt } from "./terrain.ts";

/**
 * §11's clearance reducer. **No §15 fixture covers this module** — inventing one is forbidden — so
 * every number below is a `[MEASURED]` row from a resolved ticket, asserted at the loosest tier;
 * everything else is a geometric identity, which is where the flat-ground cases earn their place.
 *
 * Four things this file exists to pin down:
 *
 * - **The opening screen's garde, all four outputs at once**: 2,42 m at `x` 74,4 with
 *   `contact: "none"` and **0** steps in violation. A garde that drifts is the app's central
 *   read-out drifting. (2,44 m at `x` 74,1 before ticket 37 put §11's scan on the rider's own
 *   node — the re-take is 21 mm *lower*, the conservative direction.)
 * - **The two sensitivities that forced the first-run geometry**: dénivelé buys no clearance
 *   (21 cm across 60 m of it) and flèche spends it metre-for-metre. They are one measurement
 *   about the *shape* of the output, and asserting only the shipped point would let both slopes
 *   go wrong while 2,44 stayed right.
 * - **Both contact kinds, because they are two separate verdicts.** Deep slack *converges* —
 *   « Câble au sol » is a clearance verdict, never a `SolveError` — and the passenger envelope is
 *   violated only **given `h_rider`**, which is why the two never collapse into one flag.
 * - **The inner minimum runs over the whole line, and always includes the rider's own node.** On
 *   flat ground it is analytically the lowest sampled vertex, which makes the ground-shift and
 *   `h_rider`-shift invariances exact — a fixture value alone would let a sign error through. The
 *   kink is a corner, not a sag: no uniform grid converges onto it, so §11 evaluates `s_D`
 *   explicitly.
 *
 * `[MEASURED]` rows assert at `TOLERANCE.measured` **floored at the half-ulp of the recorded
 * value's own last digit**: 1e-3 relative on a garde recorded as « 0,40 m » is ±0,4 mm, which is
 * a tighter bar than the measurement has digits — the opposite of what the tier is for. The floor
 * is the tier's, not this file's: voir `docs/conventions/testing.md` — *Tolerance* — and the
 * `TOLERANCE.measured` docblock, which state it once between them.
 */

/**
 * How far a value sits from its `[MEASURED]` row, **counted in bars**: `≤ 1` passes. The bar is
 * `TOLERANCE.measured`, floored at the half-ulp of the recorded value's own last digit, and the
 * ratio is what a failure prints — « 3,2 bars off » says more than two floats do.
 *
 * @param decimals the decimals the ticket recorded, which is the precision it actually has.
 */
function measuredOffBy(actual: number, expected: number, decimals: number): number {
  const bar = Math.max(TOLERANCE.measured * Math.abs(expected), 0.5 * 10 ** -decimals);
  return Math.abs(actual - expected) / bar;
}

/** § 4's manual ground: the straight line between the two anchor bases, in the anchor-A frame. */
function groundUnderAnchors(L: number, h: number, heightA: number, heightB: number): Terrain {
  return {
    kind: "profile",
    xs: Float64Array.from([0, L]),
    zs: Float64Array.from([-heightA, h - heightB]),
  };
}

/** A `SpanInput` from a fixture's stated inputs — the fixtures stay engine-type-free. */
function spanOf(p: { L: number; h: number; w: number; EA: number }, L0: number): SpanInput {
  return { L: p.L, h: p.h, L0, w: p.w, EA: p.EA, loads: [] };
}

/**
 * Flèche à vide — the greatest **vertical** distance from the A–B chord down to the unloaded
 * cable. §7's inverse (`parameterise.ts`, a later stage) is what the app will use; here it is the
 * measurement's own driving quantity, and the only way to restate « flèche 5 / 6 / 7 / 8 m » as
 * the `L₀` the engine takes. Cross-checked below against the one `L₀` ticket 14 recorded.
 */
function unloadedSag(span: SpanInput): number {
  const solved = solveSpan(span);
  if (!solved.ok) throw new Error(`expected a solve, got ${JSON.stringify(solved.error)}`);
  const state = solved.state;
  let sag = Number.NEGATIVE_INFINITY;
  const samples = 4000;
  for (let i = 0; i <= samples; i++) {
    const s = (span.L0 * i) / samples;
    const below = (span.h * xAt(state, s)) / span.L - zAt(state, s);
    if (below > sag) sag = below;
  }
  return sag;
}

/** `L₀` for a target flèche — bisection on the monotone `D(L₀)`, § 7 mode 3's outer loop. */
function l0ForFleche(span: SpanInput, target: number): number {
  const chord = Math.hypot(span.L, span.h);
  let lo = chord * (1 + 1e-7);
  let hi = chord * 1.01;
  while (unloadedSag({ ...span, L0: hi }) < target) hi *= 1.01;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (unloadedSag({ ...span, L0: mid }) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The whole chain a parameter change runs: sweep the traverse, then reduce §11 over it. */
function garde(span: SpanInput, P: number, terrain: Terrain, hRider: number) {
  const traverse = sweep(span, P, FIRST_RUN_CLEARANCE.in.sweepSteps);
  const clearance = evaluateClearance(
    span,
    P,
    traverse.steps,
    terrain,
    hRider,
    FIRST_RUN_CLEARANCE.in.samplesPerStep,
  );
  return { traverse, clearance };
}

/** Sweep steps whose own worst clearance is negative — « pas en violation ». */
function stepsInViolation(perStep: Float64Array): number {
  let count = 0;
  for (const value of perStep) if (value < 0) count++;
  return count;
}

describe("the first-run line — 2,42 m at x 74,4, contact none, 0 steps in violation", () => {
  const { in: given, out: measured } = FIRST_RUN_CLEARANCE;
  const span = spanOf(given, given.L0);
  const terrain = groundUnderAnchors(given.L, given.h, given.anchorHeight, given.anchorHeight);
  const { traverse, clearance } = garde(span, given.P, terrain, given.hRider);

  test("the traverse solves whole — 260 steps, coverage 1", () => {
    expect(traverse.grid.length).toBe(260);
    expect(traverse.coverage).toBe(measured.coverage);
  });

  test("garde min is 2,42 m", () => {
    expect(measuredOffBy(clearance.hMin, measured.hMin, 2)).toBeLessThanOrEqual(1);
  });

  test("it sits at x 74,4 m", () => {
    expect(measuredOffBy(clearance.atX, measured.atX, 1)).toBeLessThanOrEqual(1);
  });

  test("the rider is at x 74,4 m at that step — on the worst point, so the cell does not relabel", () => {
    expect(
      measuredOffBy(traverse.steps[clearance.atStepIndex].xD, measured.atRiderX, 1),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(clearance.atX - traverse.steps[clearance.atStepIndex].xD)).toBeLessThan(
      Math.max(1, 0.01 * given.L),
    );
  });

  test("nothing is in contact — no step in violation, no cable in the ground", () => {
    expect(clearance.contact).toBe(FIRST_RUN_CLEARANCE.contact);
    expect(stepsInViolation(clearance.perStep)).toBe(measured.stepsInViolation);
    expect(clearance.perStepCable.some((flag) => flag === 1)).toBe(false);
  });

  test("the aggregate is the least of the per-step minima, at the step it names", () => {
    expect(clearance.perStep.length).toBe(traverse.steps.length);
    expect(clearance.perStepX.length).toBe(traverse.steps.length);
    expect(clearance.perStepCable.length).toBe(traverse.steps.length);
    expect(clearance.hMin).toBe(Math.min(...clearance.perStep));
    expect(clearance.perStep[clearance.atStepIndex]).toBe(clearance.hMin);
    expect(clearance.perStepX[clearance.atStepIndex]).toBe(clearance.atX);
  });

  test("densifying the scan buys centimetres — 60 samples per step is the measured resolution", () => {
    // 600 refines 60: every coarse vertex is a dense vertex, so the dense minimum can only be
    // lower. What it recovers is the convexity between two vertices — the cable's own sag across
    // one segment. The trolley kink is no longer part of it: ticket 37 forced `s_D` into the
    // sample set, which is why what is left here is millimetres rather than the two centimetres
    // it used to be. Centimetres, never metres, and the frame budget scales with
    // `steps × samplesPerStep`: nobody densifies this scan.
    const dense = evaluateClearance(span, given.P, traverse.steps, terrain, given.hRider, 600);
    expect(dense.hMin).toBeLessThanOrEqual(clearance.hMin);
    expect(clearance.hMin - dense.hMin).toBeLessThan(0.05);
  });

  test("the reducer is pure — the same steps reduce to the same numbers twice", () => {
    const again = evaluateClearance(
      span,
      given.P,
      traverse.steps,
      terrain,
      given.hRider,
      given.samplesPerStep,
    );
    expect(again.hMin).toBe(clearance.hMin);
    expect(again.atX).toBe(clearance.atX);
    expect([...again.perStep]).toEqual([...clearance.perStep]);
  });
});

describe("garde is independent of dénivelé — 44 m of it moves garde by 21 cm", () => {
  const { in: given, out: measured } = CLEARANCE_VS_DENIVELE;
  const rows = [
    { h: 0, L0: measured.L0AtH0, expected: measured.h0 },
    { h: -18, L0: measured.L0AtH18, expected: measured.h18 },
    { h: -40, L0: measured.L0AtH40, expected: measured.h40 },
    { h: -60, L0: measured.L0AtH60, expected: measured.h60 },
  ];

  const measuredRows = rows.map((row) => {
    const span = spanOf({ ...given, h: row.h }, row.L0);
    const terrain = groundUnderAnchors(given.L, row.h, given.anchorHeight, given.anchorHeight);
    return { ...row, ...garde(span, given.P, terrain, given.hRider) };
  });

  for (const row of measuredRows) {
    test(`h = ${row.h} m ⇒ garde ${row.expected} m, contact none`, () => {
      expect(row.traverse.coverage).toBe(1);
      expect(measuredOffBy(row.clearance.hMin, row.expected, 2)).toBeLessThanOrEqual(1);
      expect(row.clearance.contact).toBe(CLEARANCE_VS_DENIVELE.contact);
    });
  }

  test("the whole 60 m of dénivelé is worth less than a quarter of a metre of garde", () => {
    const spread = measuredRows[0].clearance.hMin - measuredRows[3].clearance.hMin;
    expect(measuredOffBy(spread, measured.h0 - measured.h60, 2)).toBeLessThanOrEqual(1);
    expect(spread).toBeLessThan(0.25);
  });
});

describe("garde moves metre-for-metre with flèche", () => {
  const { in: given, out: measured } = CLEARANCE_VS_FLECHE;
  const seed = spanOf(given, Math.hypot(given.L, given.h) * 1.001);
  const terrain = groundUnderAnchors(given.L, given.h, given.anchorHeight, given.anchorHeight);
  const targets = [
    { fleche: 5, expected: measured.fleche5 },
    { fleche: 6, expected: measured.fleche6 },
    { fleche: 7, expected: measured.fleche7 },
    { fleche: 8, expected: measured.fleche8 },
  ];

  const rows = targets.map((row) => {
    const L0 = l0ForFleche(seed, row.fleche);
    return { ...row, L0, ...garde(spanOf(given, L0), given.P, terrain, given.hRider) };
  });

  test("the flèche 6,0 m inversion returns ticket 14's own L₀ — 151,644 m", () => {
    expect(measuredOffBy(rows[1].L0, measured.L0AtFleche6, 3)).toBeLessThanOrEqual(1);
  });

  for (const row of rows) {
    test(`flèche ${row.fleche},0 m ⇒ garde ${row.expected} m`, () => {
      expect(row.traverse.coverage).toBe(1);
      expect(measuredOffBy(row.clearance.hMin, row.expected, 2)).toBeLessThanOrEqual(1);
      expect(row.clearance.contact).toBe(CLEARANCE_VS_FLECHE.contact);
    });
  }

  test("each metre of flèche costs about a metre of garde — the app's most elastic input", () => {
    for (let i = 1; i < rows.length; i++) {
      const cost = rows[i - 1].clearance.hMin - rows[i].clearance.hMin;
      expect(cost).toBeGreaterThan(0.9);
      expect(cost).toBeLessThan(1.1);
    }
  });
});

describe("contact: cable — deep slack converges, it is not a solver failure", () => {
  const { in: given, out: measured } = GROUND_CONTACT_CABLE;
  const bases: Terrain = {
    kind: "profile",
    xs: Float64Array.from([0, given.L]),
    zs: Float64Array.from([given.zBaseA, given.zBaseB]),
  };

  test("L₀ 400 m on a 200 m span ⇒ garde −170,24 m, coverage 1", () => {
    const { traverse, clearance } = garde(spanOf(given, given.L0), given.P, bases, given.hRider);
    expect(traverse.coverage).toBe(measured.coverage);
    expect(measuredOffBy(clearance.hMin, measured.hMin, 2)).toBeLessThanOrEqual(1);
    expect(clearance.contact).toBe(GROUND_CONTACT_CABLE.contact);
    expect(clearance.hMin).toBeLessThan(0);
  });

  test("the shallower slack — L₀ 200,5 m ⇒ −7,61 m — is already « Câble au sol »", () => {
    const { traverse, clearance } = garde(
      spanOf(given, given.L0Shallow),
      given.P,
      bases,
      given.hRider,
    );
    expect(traverse.coverage).toBe(measured.coverage);
    expect(measuredOffBy(clearance.hMin, measured.hMinShallow, 2)).toBeLessThanOrEqual(1);
    expect(clearance.contact).toBe(GROUND_CONTACT_CABLE.contact);
  });

  test("the cable kind is flagged per step, not only in aggregate", () => {
    const { clearance } = garde(spanOf(given, given.L0), given.P, bases, given.hRider);
    expect(clearance.perStepCable.every((flag) => flag === 1)).toBe(true);
    // A step whose cable is in the ground is necessarily a step in violation; the reverse is not
    // true, which is the whole reason the two kinds are two separate verdicts.
    const flagged = [...clearance.perStep].filter((_, i) => clearance.perStepCable[i] === 1);
    expect(Math.max(...flagged)).toBeLessThan(0);
  });
});

describe("contact: rider — the envelope is crossed although the cable clears", () => {
  const { in: given, out: measured } = GROUND_CONTACT_RIDER;
  const seed = spanOf(given, Math.hypot(given.L, given.h) * 1.001);
  const span = spanOf(given, l0ForFleche(seed, given.fleche));
  const terrain = groundUnderAnchors(given.L, given.h, given.anchorHeightA, given.anchorHeightB);
  const { traverse, clearance } = garde(span, given.P, terrain, given.hRider);

  test("anchors A 12 / B 6 at flèche 6,0 m ⇒ −1,55 m, coverage 1", () => {
    expect(traverse.coverage).toBe(measured.coverage);
    expect(measuredOffBy(clearance.hMin, measured.hMin, 2)).toBeLessThanOrEqual(1);
  });

  test("it is the rider kind, and no step reports the cable in the ground", () => {
    expect(clearance.contact).toBe(GROUND_CONTACT_RIDER.contact);
    expect(clearance.perStepCable.some((flag) => flag === 1)).toBe(false);
  });

  test("the same line clears the ground once the envelope is taken away", () => {
    const bare = evaluateClearance(
      span,
      given.P,
      traverse.steps,
      terrain,
      0,
      FIRST_RUN_CLEARANCE.in.samplesPerStep,
    );
    expect(bare.contact).toBe("none");
    expect(bare.hMin).toBeGreaterThan(0);
    // `h_rider` shifts every clearance by exactly itself — the envelope is a translation.
    expect(bare.hMin - given.hRider).toBeCloseTo(clearance.hMin, 12);
  });
});

describe("an imported profile is scanned at its own sample points, not only the cable's", () => {
  // § 4 is explicit — « `evaluateClearance` scan[s] at the terrain's own sample points » — and its
  // ≈5 mm error bound is derived *per terrain segment*: `h_clear` is convex there only because
  // `z_ground` is linear there. A 200-point profile (§ 4's measured export ceiling) puts a terrain
  // vertex every 0,75 m on the first-run line, while 60 samples per step put a cable vertex every
  // ≈2,5 m. A feature narrower than a cable segment is invisible to a cable-vertex-only scan —
  // and « Câble au sol » would then read green, which is the « manufactures confidence » failure
  // § 4 rejects resampling to avoid.
  const { in: given } = FIRST_RUN_CLEARANCE;
  const span = spanOf(given, given.L0);
  const traverse = sweep(span, given.P, given.sweepSteps);

  /** The manual ground plane, re-sampled at `count` points — the same plane, more vertices. */
  function planeAt(count: number): { xs: Float64Array; zs: Float64Array } {
    const xs = new Float64Array(count);
    const zs = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const x = (given.L * i) / (count - 1);
      xs[i] = x;
      zs[i] = -given.anchorHeight + (given.h * x) / given.L;
    }
    return { xs, zs };
  }

  const plane200: Terrain = { kind: "profile", ...planeAt(200) };

  // One 5 m spike on a single sample, at x 75,75 — between two cable vertices by construction.
  const ridged: Terrain = (() => {
    const { xs, zs } = planeAt(200);
    let peak = 0;
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i] - 75.75) < Math.abs(xs[peak] - 75.75)) peak = i;
    }
    zs[peak] += 5;
    return { kind: "profile", xs, zs };
  })();

  const reduce = (terrain: Terrain, samples: number = given.samplesPerStep) =>
    evaluateClearance(span, given.P, traverse.steps, terrain, given.hRider, samples);

  test("the 200-point plane is the two-point plane — extra vertices on a line add nothing", () => {
    const twoPoint = groundUnderAnchors(given.L, given.h, given.anchorHeight, given.anchorHeight);
    expect(reduce(plane200).hMin).toBeCloseTo(reduce(twoPoint).hMin, 9);
  });

  test("a ridge narrower than a cable segment is still seen — it is not scanned over", () => {
    const clearance = reduce(ridged);
    expect(clearance.hMin).toBeLessThan(0);
    expect(clearance.contact).toBe("cable");
    // The ridge is what the minimum sits on, not some unrelated point of the traverse.
    expect(Math.abs(clearance.atX - 75.75)).toBeLessThan(1);
  });

  test("and the 60-sample scan agrees with a refined one to centimetres, never metres", () => {
    // Refining the *cable* grid 60 → 4000 can only lower the minimum, and what it recovers is
    // bounded by the **cable** spacing, not by the terrain's: at a terrain vertex the ground is
    // exact and the cable is read off the bracketing segment's chord. If the terrain's vertices
    // were missing from the coarse scan the gap here would be the ridge's own 5 m. Ticket 09
    // measured it at **69 mm** and named the trolley kink, not the convexity, as the cause;
    // ticket 37 forced `s_D` into the sample set, and the residual re-measures at **0,13 mm** —
    // the ridge still sits where the kink passes, but the kink is now evaluated. Two and a half
    // orders below § 4's ≈5 mm claim, and the coarse scan stays the conservative of the two.
    const coarse = reduce(ridged);
    const dense = reduce(ridged, 4000);
    expect(dense.hMin).toBeLessThanOrEqual(coarse.hMin);
    expect(coarse.hMin - dense.hMin).toBeLessThan(0.001);
  });
});

describe("the rider node is evaluated at every load position — §11's `x = x_P`", () => {
  // § 11 fixes the worst point per load position **at `x = x_P`**, and the loaded low point *is*
  // the trolley's kink: `z_cable` has a corner there, so no amount of uniform sampling in `s`
  // converges onto it — the two neighbours of the vertex are read instead, and the cable is
  // convex between them, so the miss is always in the **optimistic** direction. That direction is
  // what separates this from the review's other four findings: it moved a safety read-out, not a
  // seed. `s_D` is therefore forced into every step's sample set — one extra sample per step, not
  // a denser grid.
  const { in: given } = FIRST_RUN_CLEARANCE;
  const span = spanOf(given, given.L0);
  const traverse = sweep(span, given.P, given.sweepSteps);
  const terrain = groundUnderAnchors(given.L, given.h, given.anchorHeight, given.anchorHeight);
  const clearance = evaluateClearance(
    span,
    given.P,
    traverse.steps,
    terrain,
    given.hRider,
    given.samplesPerStep,
  );

  /** §11's `h_clear(x_P; x_P)` — the clearance **at** the step's own kink, exactly. */
  function atRider(step: SweepStep): number {
    const shape = {
      H: step.H,
      V0: step.V0,
      w: span.w,
      EA: span.EA,
      loads: [{ P: given.P, s: step.sD }],
    };
    const x = xAt(shape, step.sD);
    return zAt(shape, step.sD) - zGroundAt(terrain, x) - given.hRider;
  }

  test("the kink is a vertex the uniform grid never lands on — so the case is not vacuous", () => {
    // If `s_D` fell on the grid the assertions below would hold for free. It does not: `s_D` is
    // the arc the trolley has travelled, and the grid is 60 equal divisions of `L₀`. Only a step
    // that parks the rider on an anchor can coincide.
    const spacing = span.L0 / given.samplesPerStep;
    let onGrid = 0;
    for (const step of traverse.steps) {
      const offset = step.sD % spacing;
      if (Math.min(offset, spacing - offset) < 1e-9) onGrid++;
    }
    expect(onGrid).toBeLessThanOrEqual(2);
    expect(traverse.steps.length).toBeGreaterThan(onGrid + 200);
  });

  test("no step reports a clearance above its own rider node", () => {
    // The defect, stated as the property it violated: the reducer may not return a number the
    // rider's own position refutes. Ticket 09's residual bound was argued for the *sag* between
    // two vertices and does not cover a kink, which is why this is an inequality on every one of
    // the 260 steps rather than a tolerance.
    for (let i = 0; i < traverse.steps.length; i++) {
      expect(clearance.perStep[i]).toBeLessThanOrEqual(atRider(traverse.steps[i]) + 1e-12);
    }
  });

  test("refining the cable grid 60 → 4000 recovers nothing — the minimum is a sampled vertex", () => {
    // Ticket 09 measured that residual at **18,5 mm** on smooth ground and named the kink as its
    // cause. With `s_D` in the sample set the traverse minimum sits *on* a sampled vertex, so the
    // residual re-measures at **0,00 mm** — refining the grid recovers nothing at all here — and
    // the coarse scan is still the conservative of the two.
    const dense = evaluateClearance(span, given.P, traverse.steps, terrain, given.hRider, 4000);
    expect(dense.hMin).toBeLessThanOrEqual(clearance.hMin);
    expect(clearance.hMin - dense.hMin).toBeLessThan(0.001);
  });

  describe("on a level span over flat ground the kink *is* the minimum, exactly", () => {
    // §15's Z1 line: level, so the loaded low point is the kink itself over the whole middle of
    // the traverse — the strongest form of the claim, an equality rather than a bound. Near either
    // anchor the rider's own node is *not* the lowest point (the unloaded sag beyond it is), which
    // is exactly why the fix adds `s_D` to the scan instead of replacing the scan with it.
    const level = spanOf({ L: Z1.in.L, h: Z1.in.h, w: Z1.in.w, EA: Z1.in.EA }, Z1.in.L0);
    const P = 1177;
    const z = -8;
    const flat: Terrain = { kind: "flat", z };
    const levelTraverse = sweep(level, P, 240);
    const levelClearance = evaluateClearance(
      level,
      P,
      levelTraverse.steps,
      flat,
      2.1,
      CLEARANCE.samplesPerStep,
    );
    const kinkAt = (step: SweepStep) =>
      zAt(
        { H: step.H, V0: step.V0, w: level.w, EA: level.EA, loads: [{ P, s: step.sD }] },
        step.sD,
      ) -
      z -
      2.1;

    test("mid-traverse, the per-step minimum equals the rider node to the bit", () => {
      for (const index of [60, 130, 200]) {
        expect(levelClearance.perStep[index]).toBeCloseTo(kinkAt(levelTraverse.steps[index]), 12);
      }
    });

    test("and the uniform grid alone read those steps 9 to 19 mm high", () => {
      // The magnitude, recorded so a regression that quietly drops `s_D` again fails loudly
      // rather than drifting: the grid's own minimum sits **above** the kink by this much.
      for (const index of [60, 130]) {
        const step = levelTraverse.steps[index];
        const shape = {
          H: step.H,
          V0: step.V0,
          w: level.w,
          EA: level.EA,
          loads: [{ P, s: step.sD }],
        };
        let gridMin = Number.POSITIVE_INFINITY;
        for (let k = 0; k <= CLEARANCE.samplesPerStep; k++) {
          const s =
            k === CLEARANCE.samplesPerStep ? level.L0 : (level.L0 * k) / CLEARANCE.samplesPerStep;
          gridMin = Math.min(gridMin, zAt(shape, s));
        }
        const missed = gridMin - z - 2.1 - levelClearance.perStep[index];
        expect(missed).toBeGreaterThan(0.008);
        expect(missed).toBeLessThan(0.02);
      }
    });
  });
});

describe("flat ground — the three contact states, and the identities behind them", () => {
  // §15's Z1 line, a level 100 m span: on flat ground the inner minimum is analytically the
  // lowest cable vertex, so every shift below is exact rather than measured.
  const span = spanOf({ L: Z1.in.L, h: Z1.in.h, w: Z1.in.w, EA: Z1.in.EA }, Z1.in.L0);
  const P = 1177;
  const hRider = 2.1;
  const traverse = sweep(span, P, 240);
  const flatAt = (z: number): Terrain => ({ kind: "flat", z });
  const reduce = (terrain: Terrain, envelope = hRider) =>
    evaluateClearance(span, P, traverse.steps, terrain, envelope, CLEARANCE.samplesPerStep);

  test("ground well below the cable ⇒ contact none, garde positive", () => {
    const clearance = reduce(flatAt(-8));
    expect(clearance.contact).toBe("none");
    expect(clearance.hMin).toBeGreaterThan(0);
    expect(clearance.perStepCable.some((flag) => flag === 1)).toBe(false);
  });

  test("ground inside the envelope but under the cable ⇒ contact rider", () => {
    const clearance = reduce(flatAt(-6));
    expect(clearance.contact).toBe("rider");
    expect(clearance.hMin).toBeLessThan(0);
    // The claim is only true given `h_rider`: the cable itself is clear everywhere.
    expect(clearance.perStepCable.some((flag) => flag === 1)).toBe(false);
  });

  test("ground above the cable ⇒ contact cable, which outranks the envelope kind", () => {
    const clearance = reduce(flatAt(-3));
    expect(clearance.contact).toBe("cable");
    expect(clearance.hMin).toBeLessThan(0);
    expect(clearance.perStepCable.some((flag) => flag === 1)).toBe(true);
  });

  test("« Câble au sol » is reported even with no envelope at all", () => {
    expect(reduce(flatAt(-3), 0).contact).toBe("cable");
    // With `h_rider` 0 the rider kind is unreachable: the envelope is what creates it.
    expect(reduce(flatAt(-6), 0).contact).toBe("none");
  });

  test("raising the ground by δ lowers every clearance by exactly δ", () => {
    const base = reduce(flatAt(-8));
    const raised = reduce(flatAt(-8 + 1.5));
    expect(raised.hMin).toBeCloseTo(base.hMin - 1.5, 10);
    expect(raised.atX).toBe(base.atX);
    expect(raised.atStepIndex).toBe(base.atStepIndex);
  });

  test("so does widening the envelope by δ", () => {
    const base = reduce(flatAt(-8));
    const wider = reduce(flatAt(-8), hRider + 1.5);
    expect(wider.hMin).toBeCloseTo(base.hMin - 1.5, 10);
    expect(wider.atStepIndex).toBe(base.atStepIndex);
  });

  test("a two-point profile with equal ends is the same terrain, to the bit", () => {
    const asProfile: Terrain = {
      kind: "profile",
      xs: Float64Array.from([0, Z1.in.L]),
      zs: Float64Array.from([-8, -8]),
    };
    const flat = reduce(flatAt(-8));
    const profiled = reduce(asProfile);
    expect(profiled.hMin).toBe(flat.hMin);
    expect(profiled.atX).toBe(flat.atX);
    expect([...profiled.perStep]).toEqual([...flat.perStep]);
  });

  test("on flat ground the per-step minimum is the step's lowest sampled vertex", () => {
    // The sample set is the uniform grid **plus the step's own `s_D`** — §11 evaluates the load
    // position itself, so the identity has to name the kink or it would re-assert the defect
    // ticket 37 closed.
    const z = -8;
    const clearance = reduce(flatAt(z));
    for (const index of [0, 7, 130, traverse.steps.length - 1]) {
      const step = traverse.steps[index];
      const shape = { H: step.H, V0: step.V0, w: span.w, EA: span.EA, loads: [{ P, s: step.sD }] };
      let lowest = zAt(shape, step.sD);
      for (let k = 0; k <= CLEARANCE.samplesPerStep; k++) {
        const s =
          k === CLEARANCE.samplesPerStep ? span.L0 : (span.L0 * k) / CLEARANCE.samplesPerStep;
        lowest = Math.min(lowest, zAt(shape, s));
      }
      expect(clearance.perStep[index]).toBeCloseTo(lowest - z - hRider, 12);
    }
  });
});

describe("the reducer's own contract", () => {
  const span = spanOf({ L: Z1.in.L, h: Z1.in.h, w: Z1.in.w, EA: Z1.in.EA }, Z1.in.L0);
  const traverse = sweep(span, 1177, 240);
  const flat: Terrain = { kind: "flat", z: -8 };

  test("`samplesPerStep` defaults to the measured 60", () => {
    const byDefault = evaluateClearance(span, 1177, traverse.steps, flat, 2.1);
    const explicit = evaluateClearance(span, 1177, traverse.steps, flat, 2.1, 60);
    expect(CLEARANCE.samplesPerStep).toBe(60);
    expect(byDefault.hMin).toBe(explicit.hMin);
  });

  test("a span that already carries a rider is a caller bug, not a physics failure", () => {
    const loaded: SpanInput = { ...span, loads: [{ P: 1177, s: 50 }] };
    expect(() => evaluateClearance(loaded, 1177, traverse.steps, flat, 2.1)).toThrow(RangeError);
  });

  test("a non-integer or non-positive `samplesPerStep` throws", () => {
    for (const bad of [0, -1, 2.5, Number.NaN]) {
      expect(() => evaluateClearance(span, 1177, traverse.steps, flat, 2.1, bad)).toThrow(
        RangeError,
      );
    }
  });

  test("an empty traverse has no minimum, and says so with atStepIndex −1", () => {
    const empty: SweepStep[] = [];
    const clearance = evaluateClearance(span, 1177, empty, flat, 2.1);
    expect(clearance.hMin).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(clearance.atX)).toBe(true);
    expect(clearance.atStepIndex).toBe(-1);
    expect(clearance.contact).toBe("none");
    expect(clearance.perStep.length).toBe(0);
  });

  test("it mutates neither the span nor the steps it reduces", () => {
    const before = JSON.stringify({ span, steps: traverse.steps });
    evaluateClearance(span, 1177, traverse.steps, flat, 2.1);
    expect(JSON.stringify({ span, steps: traverse.steps })).toBe(before);
  });
});
