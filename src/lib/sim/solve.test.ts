import { afterEach, describe, expect, test, vi } from "vitest";

import type { SpanInput } from "./types.ts";

import { CHORD_BOUND, TOLERANCE, Z1, Z2, Z3 } from "./__fixtures__/theory-15.ts";
import { sampleCable } from "./catenary.ts";
import {
  SOLVER,
  chordBoundFloor,
  dampedStep,
  horizontalTensionFloor,
  isNearTaut,
  residualTolerance,
  seedIterates,
  solveSpan,
  straightBarIterate,
} from "./solve.ts";

/**
 * §5's damped Newton against `docs/simulation-theory.md` §15 — « voir § 11 — le plan de test »
 * for which row lands here: `Z1`, `Z2` and `Z3`'s statics, plus the level-span invariant
 * `V₀ = −w·L₀/2`, the mirrored span and the `EA → ∞` limit.
 *
 * **This file is the first that solves anything.** `catenary.test.ts` and `jacobian.test.ts` feed
 * §15's published `(H, V₀)` into the closed form; here the pair is *found*, so a sign error in
 * §4.1 or §4.2 that both of those files pass would surface as a solve that walks the wrong way.
 *
 * Three states are **injected, never hunted** — measured across 349 440 solves inside the
 * admissible envelope, `no-convergence`, `slack-limit` and `reseeded` never fire, and `damped`
 * fires in 0,6 % of iterations. They are reached with `vi.mock` on the collaborator
 * (`jacobian.ts`) and by calling the damping branch directly, never by widening `solveSpan`'s
 * signature and never with a pathological input the app's own ranges would refuse.
 *
 * The one exception is `invalid-input{field:"L0"}`: §5.4's chord bound **is** reachable from real
 * input, because the floor is the breaking load. Those cases assert `bound` and `boundKind`, not
 * merely the kind — without them « Tension impossible » is unwritable.
 */

/** Relative disagreement, read against the tier the row's provenance fixes. */
function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/** A `SpanInput` from a §15 row's stated inputs — the fixtures stay engine-type-free. */
function spanOf(p: {
  L: number;
  h: number;
  L0: number;
  w: number;
  EA: number;
  strength?: number;
}): SpanInput {
  return { L: p.L, h: p.h, L0: p.L0, w: p.w, EA: p.EA, loads: [], strength: p.strength };
}

/** The solved state, or a failed assertion naming the error the solver returned instead. */
function solved(input: SpanInput, warmStart?: { H: number; V0: number }) {
  const result = solveSpan(input, warmStart);
  if (!result.ok) throw new Error(`expected a solve, got ${JSON.stringify(result.error)}`);
  return result;
}

/** The lowest sampled point of an interleaved `x, z` polyline. */
function scanLowPoint(samples: Float64Array): { x: number; z: number } {
  let best = { x: samples[0], z: samples[1] };
  for (let i = 2; i < samples.length; i += 2) {
    if (samples[i + 1] < best.z) best = { x: samples[i], z: samples[i + 1] };
  }
  return best;
}

/**
 * The injected Jacobians of § 11's table. `real` delegates to §4.2, so every case above stays on
 * the true partials; the other three are the only way the two unreachable failure kinds and the
 * `reseeded` note are testable at all.
 */
const jacobian = vi.hoisted(() => ({
  mode: "real" as "real" | "singular" | "singular-once" | "vanishing",
  calls: 0,
}));

vi.mock(import("./jacobian.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    jacobianAt: (shape: Parameters<typeof actual.jacobianAt>[0], s: number) => {
      jacobian.calls++;
      // Rank one: the rows are proportional, so `det` is exactly 0 — §5.4's « singular /
      // ill-conditioned J » row, without any pathological input.
      const singular = { dxdH: 1e-3, dxdV0: 2e-3, dzdH: 1e-3, dzdV0: 2e-3 };
      if (jacobian.mode === "singular") return singular;
      if (jacobian.mode === "singular-once" && jacobian.calls === 1) return singular;
      // Partials 15 orders of magnitude too small: every Newton step is astronomically long and
      // negative in `H`, which is §4.3's `H → 0` — the line lying down.
      if (jacobian.mode === "vanishing") return { dxdH: 1e-18, dxdV0: 0, dzdH: 0, dzdV0: 1e-18 };
      return actual.jacobianAt(shape, s);
    },
  };
});

afterEach(() => {
  jacobian.mode = "real";
  jacobian.calls = 0;
});

describe("Z1 — unloaded level span, mild slack", () => {
  const input = spanOf(Z1.in);
  const { state, notes } = solved(input);

  test("H = 1423.94 N", () => {
    expect(relativeError(state.H, Z1.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("V₀ = −251.250 N and V_B = +251.250 N", () => {
    expect(relativeError(state.V0, Z1.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.VB, Z1.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("T_max = 1445.94 N, and it is the greater of the two ends", () => {
    expect(relativeError(state.Tmax, Z1.out.Tmax)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(state.Tmax).toBe(Math.max(state.TA, state.TB));
  });

  test("the state echoes its inputs, so it can be sampled on its own", () => {
    expect(state.L0).toBe(Z1.in.L0);
    expect(state.w).toBe(Z1.in.w);
    expect(state.EA).toBe(Z1.in.EA);
    expect(state.loads).toEqual([]);
  });

  test("it converged inside §5.1's iteration cap, with no note to report", () => {
    expect(state.iterations).toBeGreaterThan(0);
    expect(state.iterations).toBeLessThan(SOLVER.maxIterations);
    expect(notes).toEqual([]);
  });
});

describe("Z2 — unloaded level span, deep slack", () => {
  const input = spanOf(Z2.in);
  const { state } = solved(input);

  test("H = 1442.11 N and V₀ = −510.000 N", () => {
    expect(relativeError(state.H, Z2.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.V0, Z2.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("T_A = T_B = 1529.63 N — a level span loads both ends alike", () => {
    expect(relativeError(state.TA, Z2.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.TB, Z2.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(state.TA).toBeCloseTo(state.TB, 9);
  });

  test("z_min = −8.75376 m", () => {
    // 2000 samples over `L₀ = 102` puts a sample on `s = 51 = −V₀/w` exactly, so the scanned
    // minimum *is* the analytic one and the `solvedScalar` bar applies to the value.
    const low = scanLowPoint(sampleCable(state, 2000));
    expect(relativeError(low.z, Z2.out.zMin)).toBeLessThan(TOLERANCE.solvedScalar);
  });
});

describe("Z3 — unloaded inclined span, B lower", () => {
  const input = spanOf(Z3.in);
  const { state } = solved(input);

  test("H = 1286.38 N", () => {
    expect(relativeError(state.H, Z3.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("V₀ = −468.701 N and V_B = +141.299 N", () => {
    expect(relativeError(state.V0, Z3.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.VB, Z3.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("T_A = 1369.11 N, T_B = 1294.12 N, and T_A > T_B", () => {
    expect(relativeError(state.TA, Z3.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.TB, Z3.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    // The upper anchor carries more, and `T_max` is its tension. A solver that mirrored §2's
    // sign convention would return this pair the other way round and still match on `H`.
    expect(state.TA).toBeGreaterThan(state.TB);
    expect(state.Tmax).toBe(state.TA);
  });
});

describe("the residual §5.3 converges on is the anchor-position error, in metres", () => {
  test.each([
    ["Z1", Z1.in],
    ["Z2", Z2.in],
    ["Z3", Z3.in],
  ])("%s closes on (L, h) to §5.3's tolerance", (_key, row) => {
    const input = spanOf(row);
    const { state } = solved(input);
    const samples = sampleCable(state, 1);
    expect(Math.hypot(samples[2] - input.L, samples[3] - input.h)).toBeLessThanOrEqual(
      residualTolerance(input.L),
    );
  });

  test("1×10⁻⁶ m absolute for spans ≲ 1000 m, 1×10⁻⁶·L beyond", () => {
    expect(residualTolerance(100)).toBe(1e-6);
    expect(residualTolerance(1000)).toBe(1e-6);
    expect(residualTolerance(2000)).toBe(2e-3);
  });
});

describe("V₀ = −w·L₀/2 for h = 0, loads: [] — exact, and levelSpanShortcut's whole claim", () => {
  test.each([
    ["Z1", Z1.in],
    ["Z2", Z2.in],
  ])("%s returns the shortcut's V₀ bit for bit, not to a tolerance", (_key, row) => {
    const { state } = solved(spanOf(row));
    expect(state.V0).toBe((-row.w * row.L0) / 2);
  });

  test("it holds off-fixture too — the shortcut is exact, not fitted to Z1 and Z2", () => {
    for (const L0 of [200.05, 201, 240, 400]) {
      const { state } = solved(spanOf({ L: 200, h: 0, L0, w: 6.4, EA: 8e6 }));
      expect(state.V0).toBe((-6.4 * L0) / 2);
      expect(state.VB).toBe(-state.V0);
    }
  });

  test("an inclined span converges to its V₀ instead — the shortcut must not fire", () => {
    const { state } = solved(spanOf(Z3.in));
    expect(state.V0).not.toBe((-Z3.in.w * Z3.in.L0) / 2);
  });
});

describe("symmetry — mirroring a span swaps its ends and leaves H alone", () => {
  // Z3 read from B: the same physical cable traversed the other way. §2's `V(s)` reverses sign
  // with the direction, so `V₀' = −V_B` and `T_A' = T_B`. `H` is direction-blind.
  const mirrored = solved(spanOf({ ...Z3.in, h: -Z3.in.h })).state;

  test("H is unchanged", () => {
    expect(relativeError(mirrored.H, Z3.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the reactions swap and change sign", () => {
    expect(relativeError(mirrored.V0, -Z3.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(mirrored.VB, -Z3.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the tensions swap, and T_max stays with the upper anchor — now B", () => {
    expect(relativeError(mirrored.TA, Z3.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(mirrored.TB, Z3.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(mirrored.Tmax).toBe(mirrored.TB);
  });
});

describe("EA → 10¹⁴ is the inextensible catenary (7 s.f.)", () => {
  /** §15's own bar for this invariant. */
  const SEVEN_SF = 5e-8;

  test("Z1's geometry, stiffened: L₀ = 2C·sinh(L/2C) with C = H/w", () => {
    // The elastic solve has no closed form; the inextensible limit does, and it is the one
    // §15 states. A solver that dropped §4.1's `H·s/EA` term would pass Z1 at 10⁻³ and fail here.
    const { state } = solved(spanOf({ ...Z1.in, EA: 1e14 }));
    const C = state.H / Z1.in.w;
    expect(relativeError(2 * C * Math.sinh(Z1.in.L / (2 * C)), Z1.in.L0)).toBeLessThan(SEVEN_SF);
  });

  test("stiffening raises H — the elastic solve stretches, the rigid one cannot", () => {
    const elastic = solved(spanOf(Z1.in)).state;
    const rigid = solved(spanOf({ ...Z1.in, EA: 1e14 })).state;
    expect(rigid.H).toBeGreaterThan(elastic.H);
    // …and by a per-cent, not by an order: `Z1` stretches 14 mm against 0,5 m of slack, so the
    // elastic term is a correction to the inextensible answer rather than a different answer.
    expect(relativeError(rigid.H, elastic.H)).toBeLessThan(3e-2);
  });
});

describe("§5.4's chord bound — « Tension impossible », the one reachable refusal", () => {
  const { w, EA, MBF } = CHORD_BOUND.in;

  // The offending `L₀`s are the spec's own message example (« valeur : 190,00 m » against a
  // 197,40 m floor) and its 1000 m counterpart. They sit **below** the floor: 197,404 m and
  // 987,02 m are the floor *rounded to the displayed grain* — 197,4039944 and 987,019972 exactly
  // — so the floor itself still solves, which is the next case.
  test.each([
    ["200 m level span", 200, CHORD_BOUND.out.floor200, 190],
    ["1000 m level span", 1000, CHORD_BOUND.out.floor1000, 980],
  ])("%s: a sub-floor L₀ is refused with its bound", (_label, L, measuredFloor, L0) => {
    const result = solveSpan(spanOf({ L, h: 0, L0, w, EA, strength: MBF }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid-input");
    if (result.error.kind !== "invalid-input") return;
    expect(result.error.field).toBe("L0");
    expect(result.error.value).toBe(L0);
    // The bound is the engine's own `chord/(1 + MBF/EA)`, and it agrees with the measurement.
    expect(result.error.bound).toBe(chordBoundFloor({ L, h: 0, EA }, MBF));
    expect(relativeError(result.error.bound, measuredFloor)).toBeLessThan(TOLERANCE.measured);
    // `min`, not `max`: the copy is « Longueur non tendue minimale pour ce câble ».
    expect(result.error.boundKind).toBe("min");
  });

  test.each([
    ["200 m", 200, CHORD_BOUND.out.TmaxRatio200],
    ["1000 m", 1000, CHORD_BOUND.out.TmaxRatio1000],
  ])("%s: at the floor the line is at its breaking load", (_label, L, ratio) => {
    // This is why the refusal carries no fix action: there is no reachable state where a line
    // solves cleanly and the verdict says rupture. The floor itself still solves — the bound is
    // strict — and what it solves to is `MBF`.
    const floor = chordBoundFloor({ L, h: 0, EA }, MBF);
    const { state } = solved(spanOf({ L, h: 0, L0: floor, w, EA, strength: MBF }));
    expect(relativeError(state.Tmax / MBF, ratio)).toBeLessThan(TOLERANCE.measured);
  });

  test("the bound is strict: one nanometre under the floor already refuses", () => {
    const floor = chordBoundFloor({ L: 200, h: 0, EA }, MBF);
    const under = solveSpan(spanOf({ L: 200, h: 0, L0: floor - 1e-9, w, EA, strength: MBF }));
    expect(under.ok).toBe(false);
    expect(solveSpan(spanOf({ L: 200, h: 0, L0: floor, w, EA, strength: MBF })).ok).toBe(true);
  });

  test("an admissible L₀ above the floor solves — the bound refuses nothing else", () => {
    const { state } = solved(spanOf({ L: 200, h: 0, L0: 200.5, w, EA, strength: MBF }));
    expect(state.Tmax).toBeLessThan(MBF);
  });

  test("without a breaking load the pre-check does not run — the fixtures stay material-free", () => {
    // §15's rows carry no material, so `strength` is optional and its absence must not refuse.
    const result = solveSpan(spanOf({ L: 200, h: 0, L0: 190, w, EA }));
    expect(result.ok).toBe(true);
  });

  test("the floor is chord/(1 + T_break/EA), inclined spans included", () => {
    expect(chordBoundFloor({ L: 200, h: 0, EA }, MBF)).toBe(200 / (1 + MBF / EA));
    expect(chordBoundFloor({ L: 120, h: -15, EA }, MBF)).toBe(Math.hypot(120, 15) / (1 + MBF / EA));
    // Textile is the reason this is not a constant: `T_break/EA` is ≈ 0,013 for 12 mm steel and
    // ≈ 0,67 for a PA rope, so the same `L₀` survives one family and not the other.
    expect(chordBoundFloor({ L: 200, h: 0, EA: 45e3 }, 30e3)).toBeLessThan(
      chordBoundFloor({ L: 200, h: 0, EA }, MBF),
    );
  });
});

describe("tier-one refusals — non-finite or non-positive L₀, w, EA, L", () => {
  const base = { L: 100, h: 0, L0: 100.5, w: 5, EA: 1e7 };

  test.each([
    ["L", { L: 0 }],
    ["L", { L: -100 }],
    ["L", { L: Number.NaN }],
    ["L0", { L0: 0 }],
    ["L0", { L0: Number.POSITIVE_INFINITY }],
    ["w", { w: 0 }],
    ["w", { w: -5 }],
    ["EA", { EA: 0 }],
    ["EA", { EA: Number.NaN }],
    ["h", { h: Number.NaN }],
  ])("%s is named as the culprit, never inferred", (field, patch) => {
    const result = solveSpan(spanOf({ ...base, ...patch }));
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "invalid-input") throw new Error("expected a refusal");
    expect(result.error.field).toBe(field);
  });

  test("a zero-length span reaches the solver and points back at L", () => {
    // « station B = station A » yields `L = 0`, which is a field the user can act on.
    const result = solveSpan(spanOf({ ...base, L: 0 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      kind: "invalid-input",
      field: "L",
      value: 0,
      bound: 0,
      boundKind: "min",
    });
  });
});

describe("§5.1's damping — the note that fires in 0,6 % of iterations", () => {
  const from = { H: 1000, V0: -250 };
  const step = { H: 800, V0: 0 };
  const floor = horizontalTensionFloor(5);

  test("α = 1 when the full Newton step already decreases the residual", () => {
    const taken = dampedStep(from, step, 1, () => 0.5, floor);
    expect(taken).toMatchObject({ accepted: true, damped: false, alpha: 1, norm: 0.5 });
    expect(taken.next).toEqual({ H: 1800, V0: -250 });
  });

  test("α is halved until the norm decreases, and the note fires", () => {
    // Overshoot: only a half step improves on the current 1 m residual.
    const taken = dampedStep(from, step, 1, (at) => (at.H > 1500 ? 2 : 0.5), floor);
    expect(taken.accepted).toBe(true);
    expect(taken.damped).toBe(true);
    expect(taken.alpha).toBe(0.5);
    expect(taken.next).toEqual({ H: 1400, V0: -250 });
  });

  test("it halves as many times as it needs to, then gives up on the attempt", () => {
    const taken = dampedStep(from, step, 1, () => 2, floor);
    expect(taken.accepted).toBe(false);
    expect(taken.floored).toBe(false);
    expect(taken.next).toBe(from);
    expect(taken.norm).toBe(1);
  });

  test("§4.3's H > 0 clamp is enforced through the damping, not beside it", () => {
    // A step that would take `H` under the floor is refused, not clamped: clamping would report
    // a point Newton never evaluated.
    const evaluated: number[] = [];
    const taken = dampedStep(
      from,
      { H: -1e9, V0: 0 },
      1,
      (at) => {
        evaluated.push(at.H);
        return 0.5;
      },
      floor,
    );
    expect(taken.accepted).toBe(true);
    expect(taken.next.H).toBeGreaterThan(floor);
    expect(evaluated.every((H) => H > floor)).toBe(true);
  });

  test("every candidate at the floor is §4.3's H → 0, and says so", () => {
    const taken = dampedStep(from, { H: -1e30, V0: 0 }, 1, () => 0.5, floor);
    expect(taken.accepted).toBe(false);
    expect(taken.floored).toBe(true);
  });
});

describe("§5.2's seeds", () => {
  test("Peyrot–Goulois leads, and it is close enough to be one damped step away", () => {
    const [first] = seedIterates(spanOf(Z1.in));
    expect(relativeError(first.H, Z1.out.H)).toBeLessThan(0.02);
    expect(first.V0).toBeLessThan(0);
  });

  test("a warm start goes in front of them, and never replaces them", () => {
    const warm = { H: 1423, V0: -251 };
    const seeds = seedIterates(spanOf(Z1.in), warm);
    expect(seeds[0]).toEqual(warm);
    expect(seeds.length).toBeGreaterThan(1);
  });

  test("there are never more than §5.1's five attempts' worth", () => {
    for (const row of [Z1.in, Z2.in, Z3.in]) {
      expect(seedIterates(spanOf(row)).length).toBe(SOLVER.maxAttempts);
    }
  });

  test("a stretched line (L₀ < chord) is seeded by §4.3's straight bar", () => {
    // Neither sag-based seed is real there: `L₀ − chord < 0` under both square roots.
    const taut = spanOf({ L: 200, h: 0, L0: 199, w: 5.36, EA: 6.9e6 });
    const bar = straightBarIterate(taut);
    expect(bar).not.toBeNull();
    expect(seedIterates(taut)[0].H).toBe(bar?.H);
    expect(solveSpan(taut).ok).toBe(true);
  });

  test("every seed keeps H > 0 — §4.3's clamp starts at the seed", () => {
    for (const seed of seedIterates(spanOf(Z3.in), { H: -1, V0: 0 })) {
      expect(seed.H).toBeGreaterThan(0);
    }
  });

  test("§6.1's identity, one reading: a load shifts Peyrot–Goulois' V₀ by exactly −ΣP", () => {
    // § 6.1 fixes `V_B = V₀ + w·L₀ + ΣP`, so inverting it gives `V₀ = V_B − w·L₀ − ΣP`. § 5.2's
    // `V₀,B` is stated for the **unloaded** line and carries no `P`, so the whole of ΣP lands on
    // `V₀` — half of it is the § 6.1 identity read twice over. Asserted as the *shift* rather than
    // by restating § 5.2 here, which would make the case a copy of the code it guards.
    const bare = spanOf(Z1.in);
    const P = 1177.2;
    const loaded: SpanInput = { ...bare, loads: [{ P, s: bare.L0 / 2 }] };
    const [bareSeed] = seedIterates(bare);
    const [loadedSeed] = seedIterates(loaded);
    expect(loadedSeed.V0).toBeCloseTo(bareSeed.V0 - P, 9);
    // § 5.2's `H₀ = |w·L/(2λ₀)|` has no `P` in it at all, so the load moves one component only.
    expect(loadedSeed.H).toBe(bareSeed.H);
  });

  test("and §4.3's bar seed shifts by −ΣP/2 — its own derivation, not the same reading", () => {
    // The other family, and the reason § 6.1's identity does not settle every seed by analogy:
    // `straightBarIterate` splits the self-weight **evenly** between the ends (`V₀ = T·h/d −
    // w·L₀/2`, which returns § 4.1's exact `−w·L₀/2` on a level span), so the consistent form
    // there is `−(w·L₀ + ΣP)/2` — the bar's `V₀` less `ΣP/2`. § 5.2's parabolic seed is in the
    // same family. Two forms, two derivations, both right; what was wrong was one function
    // carrying § 6.1's inversion with the symmetric split's factor.
    const stretched = spanOf({ L: 200, h: -30, L0: 199, w: 5.36, EA: 6.9e6 });
    const P = 1177.2;
    const bar = straightBarIterate(stretched);
    expect(bar).not.toBeNull();
    const [seed] = seedIterates({ ...stretched, loads: [{ P, s: 100 }] });
    expect(seed.V0).toBeCloseTo((bar?.V0 ?? 0) - P / 2, 9);
  });

  test("a warm start at the answer costs no iterations at all", () => {
    const first = solved(spanOf(Z1.in)).state;
    const again = solved(spanOf(Z1.in), { H: first.H, V0: first.V0 }).state;
    expect(again.iterations).toBe(0);
    expect(again.H).toBe(first.H);
  });

  test("a hopeless warm start costs one attempt, never the answer", () => {
    const { state } = solved(spanOf(Z1.in), { H: 1e12, V0: 5e5 });
    expect(relativeError(state.H, Z1.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
  });
});

describe("§4.3's near-taut fallback — the straight elastic bar", () => {
  // `w·L₀/H < 10⁻⁴` fired 0 times in 349 440 solves (minimum observed ratio 3,51×10⁻⁴), so the
  // branch is called directly rather than waited for.
  const taut = spanOf({ L: 100, h: 0, L0: 99.99, w: 5, EA: 1e12 });

  test("T₀ = (d/L₀ − 1)·EA along the chord, with the weight split between the ends", () => {
    const bar = straightBarIterate(taut);
    const T = (100 / 99.99 - 1) * 1e12;
    expect(bar?.H).toBe(T);
    expect(bar?.V0).toBe((-5 * 99.99) / 2);
  });

  test("the condition is w·L₀/H, and this line is under it", () => {
    expect(isNearTaut(5, 99.99, straightBarIterate(taut)?.H ?? 0)).toBe(true);
    expect(isNearTaut(Z1.in.w, Z1.in.L0, Z1.out.H)).toBe(false);
  });

  test("solveSpan takes the fallback and reports it as a note, having iterated nothing", () => {
    const { state, notes } = solved(taut);
    expect(notes).toEqual(["near-taut-fallback"]);
    expect(state.iterations).toBe(0);
    expect(state.H).toBe(straightBarIterate(taut)?.H);
  });

  test("a slack line has no bar at all", () => {
    expect(straightBarIterate(spanOf(Z1.in))).toBeNull();
  });

  test("the branch is reachable on the stretched side only, and needs no slack twin", () => {
    // Ticket 37 defect 5, decided here rather than left implicit. §4.3 states the near-taut test as
    // a property of the *catenary* — `asinh` ratios ill-conditioned below 10⁻⁴ — and the review
    // observed that the guard cannot fire on a slack line, because the fallback it gates is the
    // elastic bar and `T = (chord/L₀ − 1)·EA > 0` only where `L₀ < chord`. **The branch stays, with
    // a reachable path**: the case above takes it, on the stretched side, where the bar *is* the
    // answer. It needs no slack twin for two measured reasons.
    //
    // First, on the slack side `w·L₀/H` has a **floor** — a slack line's `H` is bounded by its own
    // elastic stretch — and the floor is set by `EA`. At `L₀ = chord + 10⁻⁹` on a level 100 m span
    // it measures 0,120 at the shipped 12 mm steel's `EA` 6,9 MN, 2,29×10⁻² at 1 GN and 2,29×10⁻³
    // at 1 TN: § 4.3's 10⁻⁴ is first crossed near `EA` 10¹⁵ N, six orders above any rope. Second,
    // where the band *is* reached Newton simply converges — 10¹⁵ N takes two damped iterations and
    // 10¹⁸ N takes none — so there is nothing for a fallback to rescue.
    const chord = 100;
    const barely = spanOf({ L: chord, h: 0, L0: chord + 1e-9, w: 5, EA: 1e12 });
    expect(straightBarIterate(barely)).toBeNull();
    const { state, notes } = solved(barely);
    expect(notes).not.toContain("near-taut-fallback");
    expect(state.H).toBeGreaterThan(0);
    // The floor, at the `EA` three orders above the shipped rope's: still two orders clear of the
    // ill-conditioned band, so the branch has nothing to do here.
    expect(isNearTaut(barely.w, barely.L0, state.H)).toBe(false);
    expect((barely.w * barely.L0) / state.H).toBeCloseTo(2.29e-3, 5);

    // And past the floor, where §4.3's condition really does hold on a slack line, the answer is
    // still Newton's: no bar exists, no note is emitted, and the residual is met anyway.
    const absurd = spanOf({ L: chord, h: 0, L0: chord + 1e-9, w: 5, EA: 1e18 });
    expect(straightBarIterate(absurd)).toBeNull();
    const beyond = solved(absurd);
    expect(isNearTaut(absurd.w, absurd.L0, beyond.state.H)).toBe(true);
    expect(beyond.notes).not.toContain("near-taut-fallback");
  });
});

describe("injected: no-convergence, slack-limit and the reseeded note", () => {
  test("a singular Jacobian exhausts §5.1's five attempts and carries its residual", () => {
    jacobian.mode = "singular";
    const result = solveSpan(spanOf(Z3.in));
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "no-convergence") {
      throw new Error("expected no-convergence");
    }
    expect(result.error.attempts).toBe(SOLVER.maxAttempts);
    expect(result.error.residual).toBeGreaterThan(residualTolerance(Z3.in.L));
    expect(Number.isFinite(result.error.residual)).toBe(true);
  });

  test("failing only the first attempt re-seeds, succeeds, and says reseeded", () => {
    jacobian.mode = "singular-once";
    const { state, notes } = solved(spanOf(Z3.in));
    expect(notes).toContain("reseeded");
    expect(relativeError(state.H, Z3.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("H driven to the floor is slack-limit, and it reports the floor it hit", () => {
    jacobian.mode = "vanishing";
    const result = solveSpan(spanOf(Z1.in));
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "slack-limit") throw new Error("expected slack-limit");
    // MoorPy's `slack_kx = 0.01·|w|`, the floor §4.3 puts under the horizontal stiffness.
    expect(result.error.hFloored).toBe(0.01 * Z1.in.w);
    expect(horizontalTensionFloor(Z1.in.w)).toBe(0.01 * Z1.in.w);
  });

  test("the mock is off by default, so every case above ran on §4.2's own partials", () => {
    expect(jacobian.mode).toBe("real");
    expect(relativeError(solved(spanOf(Z1.in)).state.H, Z1.out.H)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });
});

describe("solveSpan is pure, and failure is a value", () => {
  test("the same input twice gives the same state, and the input is untouched", () => {
    const input = spanOf(Z3.in);
    const before = structuredClone(input);
    expect(solved(input).state).toEqual(solved(input).state);
    expect(input).toEqual(before);
  });

  test("the echoed loads are the state's own array, not the caller's", () => {
    const loads = [{ P: 1177, s: 50 }];
    const { state } = solved({ ...spanOf(Z1.in), loads });
    expect(state.loads).toEqual(loads);
    expect(state.loads).not.toBe(loads);
  });

  test("nothing here throws — a sweep that loses one step keeps the other 259", () => {
    expect(() => solveSpan(spanOf({ L: 0, h: 0, L0: 0, w: 0, EA: 0 }))).not.toThrow();
    jacobian.mode = "singular";
    expect(() => solveSpan(spanOf(Z3.in))).not.toThrow();
  });
});
