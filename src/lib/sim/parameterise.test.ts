import { afterEach, describe, expect, test, vi } from "vitest";

import type { SolveError, SpanInput } from "./types.ts";

import { CHORD_BOUND, CLEARANCE_VS_FLECHE, TOLERANCE, Z3, Z6 } from "./__fixtures__/theory-15.ts";
import {
  PARAMETERISE,
  closedFormSeedL0,
  resolveL0,
  tightnessBracket,
  tightnessFloor,
  unloadedSag,
} from "./parameterise.ts";
import { chordBoundFloor, solveSpan } from "./solve.ts";

/**
 * §7's inverse modes against `docs/simulation-theory.md` §15 — « voir § 11 — le plan de test » for
 * which row lands here: **`Z6`, and `Z6` is entirely new work**. The prototype implements no
 * inverse mode, so `check.ts` is not coverage for a single line of this file.
 *
 * Four things this file exists to pin down:
 *
 * - **The inversion returns §15's own `L₀`, and the forward re-solve returns the target.** 100,670 m
 *   from `H_target = 2451 N`, `H = 2451,000` back, flèche 5,1164 m — a bisection that stopped one
 *   iteration early would still look plausible in `L₀` alone, which is why all three are asserted.
 * - **The monotonicity the bisection rests on.** §7's « `H` strictly monotone decreasing in `L₀` »
 *   is the safety of the method, not a property of the answer: assert it *across the bracket*, or
 *   a solver that developed a fold would keep returning a number.
 * - **The §5.4 bound comes back in the quantity the user is editing**, in all three modes —
 *   9 074 daN in tension, 0,29 m in flèche, 197,40 m in direct length — and **never twice**.
 *   Without that, ticket 26's two mode-specific « Tension impossible » messages are unwritable.
 * - **Two refusals, two surfaces.** A rupture is « Tension impossible » and a bracket failure is
 *   « Cible inatteignable »; they share one `SolveError` union, so nothing but this mapping keeps
 *   them apart — and a `slack-limit` from inside a bracket must not escape as « Calcul
 *   impossible ».
 *
 * A bracket failure is **injected with `vi.mock` on `solve.ts`, never hunted**: it is reachable
 * only through targets the form's own ranges refuse, and an input that merely takes minutes to
 * fail tests nothing — voir `docs/conventions/testing.md`, *Injected states*.
 */

/** Flips `solveSpan` into a refusal from one call onwards, for the bracket-failure cases. */
const injected = vi.hoisted(() => ({
  failFromCall: -1,
  kind: "no-convergence" as "no-convergence" | "slack-limit",
  calls: 0,
}));

vi.mock("./solve.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./solve.ts")>();
  return {
    ...actual,
    solveSpan: (...args: Parameters<typeof actual.solveSpan>) => {
      const call = injected.calls++;
      if (injected.failFromCall >= 0 && call >= injected.failFromCall) {
        return {
          ok: false as const,
          error:
            injected.kind === "no-convergence"
              ? { kind: "no-convergence" as const, attempts: 5, residual: 0.5 }
              : { kind: "slack-limit" as const, hFloored: 0.05 },
        };
      }
      return actual.solveSpan(...args);
    },
  };
});

afterEach(() => {
  injected.failFromCall = -1;
  injected.kind = "no-convergence";
  injected.calls = 0;
});

/** Relative disagreement, read against the tier the row's provenance fixes. */
function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/**
 * How far a value sits from its `[MEASURED]` row, **counted in bars**: `≤ 1` passes. The bar is
 * `TOLERANCE.measured` floored at the half-ulp of the recorded value's own last digit — voir
 * `docs/conventions/testing.md`, *Tolerance*.
 *
 * @param decimals the decimals the spec recorded, in the unit the assertion is written in.
 */
function measuredOffBy(actual: number, expected: number, decimals: number): number {
  const bar = Math.max(TOLERANCE.measured * Math.abs(expected), 0.5 * 10 ** -decimals);
  return Math.abs(actual - expected) / bar;
}

/** The unloaded span at one `L₀`, solved — what every read-out below is taken off. */
function solvedAt(span: { L: number; h: number; w: number; EA: number }, L0: number) {
  const input: SpanInput = { L: span.L, h: span.h, L0, w: span.w, EA: span.EA, loads: [] };
  const result = solveSpan(input);
  if (!result.ok) throw new Error(`expected a solve, got ${JSON.stringify(result.error)}`);
  return result.state;
}

/**
 * § 7's refusal surfaces for an error **coming out of `resolveL0`**. The mapping is what users
 * see, and the whole point of the two error kinds is that they do not collapse onto one banner.
 */
function surfaceOf(error: SolveError): string {
  if (error.kind === "invalid-input") {
    const driving = error.field === "L0" || error.field.endsWith("_target");
    return driving ? "Tension impossible" : "champ invalide";
  }
  // `no-convergence` **and** anything normalised into it: out of `resolveL0`, a bracket failure
  // for any reason other than rupture is one state, not two.
  return "Cible inatteignable";
}

/** The value the resolution failed with, or a thrown assertion — refusals are values, not throws. */
function refusalOf(result: ReturnType<typeof resolveL0>): SolveError {
  if (result.ok) throw new Error(`expected a refusal, got L₀ = ${result.value}`);
  return result.error;
}

/** The resolved `L₀`, or a thrown assertion. */
function resolvedL0(result: ReturnType<typeof resolveL0>): number {
  if (!result.ok) throw new Error(`expected an L₀, got ${JSON.stringify(result.error)}`);
  return result.value;
}

/**
 * §15's `Z6` states no material, and an inversion needs a breaking load for exactly one reason:
 * §5.4's floor is where the bracket starts. Every positive value puts that floor below `Z6`'s
 * answer on this line, so this is a **stand-in, not a claim** — the last case of the block below
 * asserts the resolved `L₀` does not move when it changes by two orders of magnitude.
 */
const Z6_STANDIN_STRENGTH = 1e5;

const Z6_SPAN = {
  L: Z6.in.L,
  h: Z6.in.h,
  w: Z6.in.w,
  EA: Z6.in.EA,
  strength: Z6_STANDIN_STRENGTH,
};

describe("Z6 — L₀ from a target pretension (§7 mode 2)", () => {
  const L0 = resolvedL0(resolveL0({ mode: "tension", H_target: Z6.in.HTarget }, Z6_SPAN));

  test("L₀ = 100.670 m", () => {
    expect(relativeError(L0, Z6.out.L0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the forward re-solve gives H = 2451.000 N", () => {
    // The claim the mode makes: not « a length near the answer » but « the length that produces
    // the tension asked for ». `H` is what the user typed, read back off the solved span.
    expect(relativeError(solvedAt(Z6_SPAN, L0).H, Z6.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(solvedAt(Z6_SPAN, L0).H, Z6.in.HTarget)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });

  test("the flèche at that L₀ is 5.1164 m", () => {
    const D = unloadedSag(solvedAt(Z6_SPAN, L0), Z6_SPAN);
    expect(relativeError(D, Z6.out.D)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("§7's closed-form seed is 100.669 — a seed, not the answer", () => {
    const seed = closedFormSeedL0(Z6_SPAN, Z6.in.HTarget);
    expect(relativeError(seed, Z6.out.closedFormSeed)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(seed).not.toBe(L0);
  });

  test("the seed lies inside the bracket the bisection runs on", () => {
    // §7 offers the closed form as a seed; « valid seed » is a claim about *this* interval, which
    // the answer alone cannot make. [R1 B5]'s refuted twin fails exactly here — it returns an
    // `L₀` below the chord, outside any bracket.
    const bracket = tightnessBracket({ mode: "tension", H_target: Z6.in.HTarget }, Z6_SPAN);
    expect(bracket.ok).toBe(true);
    if (!bracket.ok) return;
    const seed = closedFormSeedL0(Z6_SPAN, Z6.in.HTarget);
    expect(seed).toBeGreaterThan(bracket.value.lower);
    expect(seed).toBeLessThan(bracket.value.upper);
    expect(bracket.value.lower).toBe(tightnessFloor(Z6_SPAN));
  });

  test("the answer does not depend on the stand-in breaking load", () => {
    // §5.4's floor only has to sit *below* the answer for the bracket to exist. If it ever leaked
    // into the answer, `Z6` would have become a material fixture, which §15 says it is not.
    for (const strength of [1e4, 1e6]) {
      const other = resolvedL0(
        resolveL0({ mode: "tension", H_target: Z6.in.HTarget }, { ...Z6_SPAN, strength }),
      );
      expect(relativeError(other, L0)).toBeLessThan(TOLERANCE.solvedScalar);
    }
  });
});

describe("monotonicity across the bracket — what makes the bisection safe", () => {
  const inclined = { L: Z3.in.L, h: Z3.in.h, w: Z3.in.w, EA: Z3.in.EA, strength: 1e5 };

  test.each([
    ["Z6's level span", Z6_SPAN],
    ["Z3's inclined span", inclined],
  ])("%s: H falls and flèche rises, strictly, at every step", (_label, span) => {
    const bracket = tightnessBracket({ mode: "tension", H_target: 2451 }, span);
    expect(bracket.ok).toBe(true);
    if (!bracket.ok) return;
    const { lower, upper } = bracket.value;

    let previous = solvedAt(span, lower);
    for (let step = 1; step <= 40; step++) {
      const state = solvedAt(span, lower + ((upper - lower) * step) / 40);
      expect(state.H).toBeLessThan(previous.H);
      expect(unloadedSag(state, span)).toBeGreaterThan(unloadedSag(previous, span));
      previous = state;
    }
  });

  test("the bracket straddles the target — that is what makes it a bracket", () => {
    const bracket = tightnessBracket({ mode: "tension", H_target: Z6.in.HTarget }, Z6_SPAN);
    expect(bracket.ok).toBe(true);
    if (!bracket.ok) return;
    expect(solvedAt(Z6_SPAN, bracket.value.lower).H).toBeGreaterThan(Z6.in.HTarget);
    expect(solvedAt(Z6_SPAN, bracket.value.upper).H).toBeLessThan(Z6.in.HTarget);
  });

  test("the lower bound is §5.4's floor, not §7's chord", () => {
    // §7 writes « lower bound `L₀ = chord` ». The chord is itself below the floor, so a bisection
    // anchored there asks `solveSpan` for a line that has already broken and gets the refusal
    // instead of a bound.
    const floor = tightnessFloor(Z6_SPAN);
    expect(floor).toBeLessThan(Math.hypot(Z6_SPAN.L, Z6_SPAN.h));
    expect(floor).toBe(chordBoundFloor(Z6_SPAN, Z6_SPAN.strength));
  });
});

describe("flèche à vide — §7 mode 3", () => {
  test("unloadedSag is Z3's sag below the chord, 7.0811 m", () => {
    // Exact, not scanned: the deepest point is where the tangent is parallel to the chord, and on
    // the unloaded line `V(s)` is affine, so that `s` is closed-form.
    const state = solvedAt({ L: Z3.in.L, h: Z3.in.h, w: Z3.in.w, EA: Z3.in.EA }, Z3.in.L0);
    expect(relativeError(unloadedSag(state, Z3.in), Z3.out.D)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the two inverse modes agree on one line — Z6's flèche returns Z6's L₀", () => {
    // Mode 3 is « seed `H`, refine, then mode 2 »: on the line where both targets describe the
    // same span, the two must land on the same `L₀` or one of them is not solving §7's problem.
    const L0 = resolvedL0(resolveL0({ mode: "sag", D_target: Z6.out.D }, Z6_SPAN));
    expect(relativeError(L0, Z6.out.L0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the resolved L₀ reproduces the flèche asked for", () => {
    for (const D_target of [1.5, 5.1164, 12]) {
      const L0 = resolvedL0(resolveL0({ mode: "sag", D_target }, Z6_SPAN));
      expect(relativeError(unloadedSag(solvedAt(Z6_SPAN, L0), Z6_SPAN), D_target)).toBeLessThan(
        TOLERANCE.solvedScalar,
      );
    }
  });

  test("ticket 14's first-run line: flèche 6,00 m ⇒ L₀ 151,644 m", () => {
    // The one `L₀` ticket 14 recorded, and the reason it matters: § 3 ships `Flèche` as the active
    // segment because it is the only mode whose value is exact at display precision. This is the
    // measurement `clearance.test.ts` reaches through its own bisection — the two must agree, or
    // the app's opening garde is not the garde that was measured.
    const first = {
      L: 150,
      h: -18,
      w: CLEARANCE_VS_FLECHE.in.w,
      EA: CLEARANCE_VS_FLECHE.in.EA,
      strength: CHORD_BOUND.in.MBF,
    };
    const L0 = resolvedL0(resolveL0({ mode: "sag", D_target: 6 }, first));
    expect(measuredOffBy(L0, CLEARANCE_VS_FLECHE.out.L0AtFleche6, 3)).toBeLessThanOrEqual(1);
  });
});

describe("the §5.4 bound comes back in the driving quantity", () => {
  const { w, EA, MBF } = CHORD_BOUND.in;
  const span200 = { L: 200, h: 0, w, EA, strength: MBF };
  const span1000 = { L: 1000, h: 0, w, EA, strength: MBF };

  test("tension mode: « Prétension maximale atteignable : 9 074 daN »", () => {
    const error = refusalOf(resolveL0({ mode: "tension", H_target: 1e6 }, span200));
    expect(error.kind).toBe("invalid-input");
    if (error.kind !== "invalid-input") return;
    expect(error.field).toBe("H_target");
    expect(error.value).toBe(1e6);
    // `max`, not `min`: the copy is a ceiling on a tension, not a floor on a length.
    expect(error.boundKind).toBe("max");
    // Recorded in daN to 0 decimals, so the assertion is written in daN.
    expect(
      measuredOffBy(error.bound / 10, CHORD_BOUND.out.HMaxAttainable200 / 10, 0),
    ).toBeLessThanOrEqual(1);
  });

  test("flèche mode: « Flèche minimale atteignable : 0,29 m »", () => {
    const error = refusalOf(resolveL0({ mode: "sag", D_target: 0.1 }, span200));
    expect(error.kind).toBe("invalid-input");
    if (error.kind !== "invalid-input") return;
    expect(error.field).toBe("D_target");
    expect(error.value).toBe(0.1);
    // `min`, not `max`: less flèche is more tension, and the floor is where the line breaks.
    expect(error.boundKind).toBe("min");
    expect(measuredOffBy(error.bound, CHORD_BOUND.out.DMinAttainable200, 2)).toBeLessThanOrEqual(1);
  });

  test("flèche mode at 1000 m: 7,21 m — the bound is the span's, not a constant", () => {
    const error = refusalOf(resolveL0({ mode: "sag", D_target: 1 }, span1000));
    expect(error.kind).toBe("invalid-input");
    if (error.kind !== "invalid-input") return;
    expect(measuredOffBy(error.bound, CHORD_BOUND.out.DMinAttainable1000, 2)).toBeLessThanOrEqual(
      1,
    );
  });

  test("length mode: « Longueur non tendue minimale pour ce câble : 197,40 m »", () => {
    // The bound is violable in **all three** modes — ticket 04 §7's line 261 was struck on that
    // ground — and direct `L₀` is the one mode that quotes `solveSpan`'s own floor unchanged.
    const error = refusalOf(resolveL0({ mode: "length", L0: 190 }, span200));
    expect(error.kind).toBe("invalid-input");
    if (error.kind !== "invalid-input") return;
    expect(error.field).toBe("L0");
    expect(error.value).toBe(190);
    expect(error.boundKind).toBe("min");
    expect(error.bound).toBe(chordBoundFloor(span200, MBF));
    expect(measuredOffBy(error.bound, CHORD_BOUND.out.floor200, 3)).toBeLessThanOrEqual(1);
  });

  test("the bound is quoted once, in the driving field's own quantity", () => {
    // Never an `L₀` in metres beside a tension field: that is the eyeball-confusion the
    // re-emission exists to prevent, and it is a property of *which field* is named.
    const tension = refusalOf(resolveL0({ mode: "tension", H_target: 1e6 }, span200));
    const sag = refusalOf(resolveL0({ mode: "sag", D_target: 0.1 }, span200));
    for (const error of [tension, sag]) {
      expect(error.kind).toBe("invalid-input");
      if (error.kind !== "invalid-input") continue;
      expect(error.field).not.toBe("L0");
      expect(surfaceOf(error)).toBe("Tension impossible");
    }
  });

  test("all three modes refuse the same one line, each in its own quantity", () => {
    const fields = [
      refusalOf(resolveL0({ mode: "length", L0: 190 }, span200)),
      refusalOf(resolveL0({ mode: "tension", H_target: 1e6 }, span200)),
      refusalOf(resolveL0({ mode: "sag", D_target: 0.1 }, span200)),
    ].map((error) => (error.kind === "invalid-input" ? error.field : error.kind));
    expect(fields).toEqual(["L0", "H_target", "D_target"]);
  });

  test("the bound is attainable — asking for exactly it resolves, at the floor", () => {
    // « atteignable » is the copy's word. The floor itself still solves (the bound is strict), so
    // a target *at* the bound must return a length rather than the refusal one ulp away from it.
    const bound = refusalOf(resolveL0({ mode: "tension", H_target: 1e6 }, span200));
    if (bound.kind !== "invalid-input") return;
    const L0 = resolvedL0(resolveL0({ mode: "tension", H_target: bound.bound }, span200));
    expect(Math.abs(L0 - tightnessFloor(span200))).toBeLessThan(1e-3);
  });

  test("an admissible target on the same line resolves — the bound refuses nothing else", () => {
    const L0 = resolvedL0(resolveL0({ mode: "tension", H_target: 2500 }, span200));
    expect(L0).toBeGreaterThan(tightnessFloor(span200));
    expect(relativeError(solvedAt(span200, L0).H, 2500)).toBeLessThan(TOLERANCE.solvedScalar);
  });
});

describe("« Cible inatteignable » — a bracket failure, injected", () => {
  const span = {
    L: 150,
    h: -18,
    w: CLEARANCE_VS_FLECHE.in.w,
    EA: CLEARANCE_VS_FLECHE.in.EA,
    strength: CHORD_BOUND.in.MBF,
  };

  test("a solve that fails while the bracket grows is no-convergence, not a rupture", () => {
    // Call 0 is the span at the floor — the inversion needs it to decide the target is reachable
    // at all — so failing from call 1 is precisely « the bracket could not be built ».
    injected.failFromCall = 1;
    const error = refusalOf(resolveL0({ mode: "sag", D_target: 6 }, span));
    expect(error.kind).toBe("no-convergence");
    expect(surfaceOf(error)).toBe("Cible inatteignable");
  });

  test("a slack-limit inside the bracket is normalised, not passed through", () => {
    // Left alone it would render « Calcul impossible ». § 7 puts every non-rupture bracket failure
    // on one surface, so the kind is normalised where the bracket is, not in the banner.
    injected.failFromCall = 1;
    injected.kind = "slack-limit";
    const error = refusalOf(resolveL0({ mode: "sag", D_target: 6 }, span));
    expect(error.kind).toBe("no-convergence");
    expect(surfaceOf(error)).toBe("Cible inatteignable");
  });

  test("the refusal carries no bound, so nothing competes with the target in the copy", () => {
    // « aucune longueur non tendue ne donne cette flèche à vide (6,00 m) » names the *target*, and
    // the target is the caller's — it holds the `TightnessSpec`. A bound here would be a second
    // number in a message that has no attainable value to offer.
    injected.failFromCall = 1;
    const error = refusalOf(resolveL0({ mode: "sag", D_target: 6 }, span));
    expect(error).not.toHaveProperty("bound");
    expect(error).not.toHaveProperty("field");
  });

  test("a rupture is not a bracket failure — the two surfaces stay apart", () => {
    const rupture = refusalOf(resolveL0({ mode: "sag", D_target: 0.01 }, span));
    expect(surfaceOf(rupture)).toBe("Tension impossible");
    injected.failFromCall = 1;
    const unreachable = refusalOf(resolveL0({ mode: "sag", D_target: 6 }, span));
    expect(surfaceOf(unreachable)).not.toBe(surfaceOf(rupture));
  });

  test("the doubling cap is what ends an unbracketable growth", () => {
    // §7's « upper bound grown by doubling the slack » needs a stop, and the stop is a count, not
    // a length: nothing about the physics says which `L₀` is absurd.
    expect(PARAMETERISE.maxDoublings).toBeGreaterThan(0);
    expect(PARAMETERISE.maxBisections).toBeGreaterThan(0);
  });
});

describe("mode length — no inversion to run", () => {
  const { w, EA, MBF } = CHORD_BOUND.in;
  const span = { L: 200, h: 0, w, EA, strength: MBF };

  test("an admissible L₀ comes back untouched, to the last bit", () => {
    // `L₀` is first-class state: mode 1 is the identity on it, not a round trip through a solve.
    expect(resolvedL0(resolveL0({ mode: "length", L0: 200.5 }, span))).toBe(200.5);
  });

  test("no solve runs — the mode that has nothing to invert costs nothing", () => {
    injected.calls = 0;
    resolveL0({ mode: "length", L0: 200.5 }, span);
    expect(injected.calls).toBe(0);
  });

  test.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
  ])("tier one: a %s L₀ is refused on the field itself", (_label, L0) => {
    const error = refusalOf(resolveL0({ mode: "length", L0 }, span));
    expect(error.kind).toBe("invalid-input");
    if (error.kind !== "invalid-input") return;
    expect(error.field).toBe("L0");
  });
});

describe("tier one on the span passes through — it is not a statement about the target", () => {
  const { w, EA, MBF } = CHORD_BOUND.in;
  const span = { L: 200, h: 0, w, EA, strength: MBF };

  test.each([
    ["L", { L: 0 }],
    ["w", { w: -1 }],
    ["EA", { EA: Number.NaN }],
    ["h", { h: Number.NaN }],
    // Not one of § 2's four, and checked here for a reason: `solveSpan` *skips* §5.4's bound when
    // the breaking load is unusable, which would turn this module's one re-emitted refusal into
    // no refusal at all.
    ["strength", { strength: 0 }],
  ])("%s", (field, broken) => {
    for (const spec of [
      { mode: "tension", H_target: 2500 } as const,
      { mode: "sag", D_target: 6 } as const,
      { mode: "length", L0: 200.5 } as const,
    ]) {
      const error = refusalOf(resolveL0(spec, { ...span, ...broken }));
      expect(error.kind).toBe("invalid-input");
      if (error.kind !== "invalid-input") continue;
      expect(error.field).toBe(field);
      expect(surfaceOf(error)).toBe("champ invalide");
    }
  });

  test("a target that is not a number is refused in the driving field, not in the span", () => {
    for (const [field, spec] of [
      ["H_target", { mode: "tension", H_target: Number.NaN } as const],
      ["D_target", { mode: "sag", D_target: -2 } as const],
    ] as const) {
      const error = refusalOf(resolveL0(spec, span));
      expect(error.kind).toBe("invalid-input");
      if (error.kind !== "invalid-input") continue;
      expect(error.field).toBe(field);
    }
  });
});
