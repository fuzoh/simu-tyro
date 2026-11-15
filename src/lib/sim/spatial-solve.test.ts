/**
 * §19's spatial solve against oracles that do not come from it (§19.17): §15's fixtures (control 1),
 * the inextensible catenary in the plane of a constant load (controls 2 and 3), the weightless
 * crossflow closed form (control 4), force and moment balance re-integrated by Simpson's rule from
 * the load written out by hand (control 5), the mirror (control 6), the two-member share (control
 * 7), refinement `N` against `2N` (control 9) and the profile actually read (control 11). Rare
 * failure kinds are injected on the shot (`vi.mock`), as `solve.test.ts` does.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LineAero, SpatialSpanInput, SpatialState, Vec3 } from "./types.ts";
import type { WindField } from "./wind-profile.ts";

import { TOLERANCE, Z1, Z2, Z3, Z4, Z5 } from "./__fixtures__/theory-15.ts";
import { loadNode } from "./loads.ts";
import { solveSpan } from "./solve.ts";
import { readExtrema, sampleSpatial, type SpatialSamples } from "./spatial-sample.ts";
import { shootSpatial, solveSpatial, SPATIAL } from "./spatial-solve.ts";
import { windAt } from "./wind-profile.ts";

/** What the injected shot does: nothing (`real`), refuse every stage, or never close. */
const inject = vi.hoisted(() => ({ mode: "real" as "real" | "slack" | "stall" }));

vi.mock("./shoot.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("./shoot.ts")>();
  class Injected extends real.Shooter {
    override run(...args: Parameters<InstanceType<typeof real.Shooter>["run"]>): boolean {
      if (inject.mode === "slack") {
        this.refusal = real.REFUSAL.slack;
        return false;
      }
      const ok = super.run(...args);
      // A shot that always ends a metre past B, whatever F_A: Newton cannot close it.
      if (inject.mode === "stall" && ok) this.x = 101;
      return ok;
    }
  }
  return { ...real, Shooter: Injected };
});

beforeEach(() => {
  inject.mode = "real";
});

const rel = (value: number, expected: number) => Math.abs(value / expected - 1);
const G = 9.81;

const field = (speed: number, from: number, attenuation = 0, width = 50): WindField => ({
  speed,
  from,
  profile: { width, attenuation },
});
const aeroOf = (f: WindField, d = 0.012, rho = 1.225): LineAero => ({
  field: f,
  bearing: 0,
  rho,
  d,
  CDn: 1.2,
});

/** The first-run line (§15's CHORD_BOUND material), 150 m, −18 m. */
const LINE = { L: 150, h: -18, L0: 151.644, w: 0.5465 * G, EA: 6.9e6 } as const;
const RIDER = { weight: 90 * G, share: 1, hRider: 2.1 } as const;

function solved(input: SpatialSpanInput): SpatialState {
  const result = solveSpatial(input);
  if (!result.ok) throw new Error(`no solution: ${JSON.stringify(result.error)}`);
  return result.state;
}

function shot(...args: Parameters<typeof shootSpatial>): SpatialState {
  const result = shootSpatial(...args);
  if (!result.ok) throw new Error(`no solution: ${JSON.stringify(result.error)}`);
  return result.state;
}

/**
 * §19.4's `q₀` per unstretched metre at one node, **written out here** from the reference rather
 * than read from the integrator: `(0, 0, −w) + λ·½·ρ·C_D⊥·d·|u_n|·u_n`, `u` from `windAt`.
 */
function loadAt(input: SpatialSpanInput, s: SpatialSamples, i: number): [number, number, number] {
  const T = s.T[i];
  const [tx, ty, tz] = [s.Fx[i] / T, s.Fy[i] / T, s.Fz[i] / T];
  let q: [number, number, number] = [0, 0, -input.w];
  const aero = input.aero;
  if (aero !== null && aero.field.speed > 0) {
    // The last node sits on B within the closure; the field is read on the span.
    const x = Math.min(Math.max(s.x[i], 0), input.L);
    const u = windAt(aero.field, x, input.L, aero.bearing);
    const ut = u.along * tx + u.across * ty;
    const n = [u.along - ut * tx, u.across - ut * ty, -ut * tz];
    const k = (1 + T / input.EA) * 0.5 * aero.rho * aero.CDn * aero.d * Math.hypot(...n);
    q = [k * n[0], k * n[1], -input.w + k * n[2]];
  }
  return q;
}

/** Simpson's rule over each piece of the nodes, of `f(i)` (three components). */
function simpson(s: SpatialSamples, f: (i: number) => number[]): number[] {
  const total = [0, 0, 0];
  const pieces =
    s.node < 0
      ? [[0, s.S.length - 1]]
      : [
          [0, s.node],
          [s.node + 1, s.S.length - 1],
        ];
  for (const [from, to] of pieces) {
    const h = (s.S[to] - s.S[from]) / (to - from);
    for (let i = from; i <= to; i++) {
      const weight = i === from || i === to ? 1 : (i - from) % 2 === 1 ? 4 : 2;
      const v = f(i);
      for (let c = 0; c < 3; c++) total[c] += (h / 3) * weight * v[c];
    }
  }
  return total;
}

const cross = (a: number[], b: number[]) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const asArray = (v: Vec3) => [v.x, v.y, v.z];

describe("§19.17 control 1 — no wind, the shot against §15", () => {
  const plain = (fixture: { in: { L: number; h: number; L0: number; w: number; EA: number } }) => ({
    ...fixture.in,
    aero: null,
    rider: null,
  });

  it("Z1, Z2 and Z3 unloaded at the solved-scalar tier", () => {
    const z1 = shot(plain(Z1));
    expect(rel(z1.HA, Z1.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z1.FA.z, Z1.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z1.FB.z, Z1.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z1.Tmax, Z1.out.Tmax)).toBeLessThan(TOLERANCE.solvedScalar);
    const z2 = shot(plain(Z2));
    expect(rel(z2.HA, Z2.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z2.TA, Z2.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z2.TB, Z2.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    const z3 = shot(plain(Z3));
    expect(rel(z3.HA, Z3.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z3.FA.z, Z3.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z3.FB.z, Z3.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z3.TA, Z3.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z3.TB, Z3.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    // Without wind the line stays in its plane and H is the same at both ends.
    expect(z3.FA.y).toBe(0);
    expect(rel(z3.HB, z3.HA)).toBeLessThan(1e-12);
  });

  it("Z4 and Z5 loaded: the node and its reactions", () => {
    const { L, h, L0, w, EA, P } = Z4.in;
    const z4 = shot({
      L,
      h,
      L0,
      w,
      EA,
      aero: null,
      rider: { sP: Z4.out.sP, weight: P, share: 1, hRider: 2.1 },
    });
    expect(rel(z4.HA, Z4.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z4.FA.z, Z4.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z4.FB.z, Z4.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z4.TA, Z4.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z4.node?.rD.z ?? 0, Z4.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);

    const z5in = Z5.in;
    const z5 = shot({
      L: z5in.L,
      h: z5in.h,
      L0: z5in.L0,
      w: z5in.w,
      EA: z5in.EA,
      aero: null,
      rider: { sP: z5in.sD, weight: z5in.P, share: 1, hRider: 2.1 },
    });
    expect(rel(z5.HA, Z5.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z5.FA.z, Z5.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z5.node?.rD.x ?? 0, Z5.out.xD)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(z5.node?.rD.z ?? 0, Z5.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  it("solveSpatial without wind is solveSpan, bit for bit (§19.16)", () => {
    const { L, h, L0, w, EA, P } = Z5.in;
    for (const aero of [null, aeroOf(field(0, 90))]) {
      const state = solved({
        L,
        h,
        L0,
        w,
        EA,
        aero,
        rider: { sP: Z5.in.sD, weight: P, share: 1, hRider: 2.1 },
      });
      const plane = solveSpan({ L, h, L0, w, EA, loads: [{ P, s: Z5.in.sD }] });
      if (!plane.ok) throw new Error("§15's Z5 must solve");
      expect(state.method).toBe("closed-form");
      expect(state.FA).toEqual({ x: plane.state.H, y: 0, z: plane.state.V0 });
      expect(state.FB).toEqual({ x: plane.state.H, y: 0, z: plane.state.VB });
      expect([state.TA, state.TB, state.Tmax]).toEqual([
        plane.state.TA,
        plane.state.TB,
        plane.state.Tmax,
      ]);
      expect([state.HA, state.HB]).toEqual([plane.state.H, plane.state.H]);
      const node = loadNode(plane.state, Z5.in.sD);
      expect(state.node?.rD).toEqual({ x: node.x, y: 0, z: node.z });
    }
  });

  it("refuses with solveSpan's own payload, §5.4's chord bound included", () => {
    const result = solveSpatial({
      ...LINE,
      L0: 140,
      strength: 90740,
      aero: aeroOf(field(10, 90)),
      rider: null,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatchObject({
      kind: "invalid-input",
      field: "L0",
      value: 140,
    });
  });

  it("refuses a missing diameter under wind, and a rider off the line", () => {
    const noD = solveSpatial({ ...LINE, aero: { ...aeroOf(field(10, 90)), d: 0 }, rider: null });
    expect(!noD.ok && noD.error).toMatchObject({ kind: "invalid-input", field: "d" });
    const off = solveSpatial({ ...LINE, aero: null, rider: { ...RIDER, sP: LINE.L0 } });
    expect(!off.ok && off.error).toMatchObject({ kind: "invalid-input", field: "sP" });
  });

  it("accepts ρ = 0 under wind, which the field accepts: no drag, §15's Z5 in its plane", () => {
    // `f_n = ½ρC_D⊥d·…` and the rider's drag both vanish with ρ: the shot is the plane line.
    const { L, h, L0, w, EA, P } = Z5.in;
    const result = solveSpatial({
      L,
      h,
      L0,
      w,
      EA,
      aero: aeroOf(field(15, 90), 0.012, 0),
      rider: { sP: Z5.in.sD, weight: P, share: 1, hRider: 2.1 },
    });
    if (!result.ok) throw new Error(`ρ = 0 must solve, got ${result.error.kind}`);
    const state = result.state;
    expect(rel(state.HA, Z5.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(state.FA.z, Z5.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(state.node?.rD.z ?? 0, Z5.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(Math.abs(state.node?.rD.y ?? Number.NaN)).toBeLessThan(1e-9);
  });

  it("still refuses a negative ρ", () => {
    const negative = solveSpatial({ ...LINE, aero: aeroOf(field(10, 90), 0.012, -1), rider: null });
    expect(!negative.ok && negative.error).toMatchObject({ kind: "invalid-input", field: "rho" });
  });
});

/** The inextensible level catenary of span `L` and length `L₀`: `2C·sinh(L/2C) = L₀`, by bisection. */
function catenaryParameter(L: number, L0: number): number {
  let lo = L / 1000;
  let hi = 1e9;
  for (let k = 0; k < 400; k++) {
    const mid = Math.sqrt(lo * hi);
    if (2 * mid * Math.sinh(L / (2 * mid)) > L0) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

describe("§19.17 controls 2 and 3 — a constant load vector is a catenary in its own plane", () => {
  // Z1's span: L 100, level, L₀ 100,5. The test-only `prescribed` load is shot's internal seam.
  const span = { L: 100, h: 0, L0: 100.5 };
  const C = catenaryParameter(span.L, span.L0);

  it("control 2: EA → 10¹⁴ meets y = C·cosh(x/C) to 7 significant figures", () => {
    const state = shot({ ...span, w: 5, EA: 1e14, aero: null, rider: null });
    const s = sampleSpatial(state);
    const sag = readExtrema(s, span).sag.value;
    const digits = 10 ** -TOLERANCE.inextensibleSignificantFigures;
    expect(rel(state.HA, 5 * C)).toBeLessThan(digits);
    expect(rel(state.TA, 5 * Math.hypot(C, span.L0 / 2))).toBeLessThan(digits);
    expect(rel(sag, C * (Math.cosh(span.L / (2 * C)) - 1))).toBeLessThan(digits);
  });

  it("control 3: Z1 under w = 3 and p_y = 4 is Z1 tilted by atan(4/3) about A–B", () => {
    // |q₀| = 5, Z1's own `w`: the same catenary, in the plane tilted toward +y.
    const state = shot({
      ...span,
      w: 3,
      EA: Z1.in.EA,
      aero: null,
      rider: null,
      prescribed: { x: 0, y: 4, z: 0 },
    });
    const read = readExtrema(sampleSpatial(state), span);
    const z1Sag = -Z1.out.zMin;
    expect(rel(state.HA, Z1.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(state.TA, Z1.out.Tmax)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(state.Tmax, Z1.out.Tmax)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(read.sag.value, 0.6 * z1Sag)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(read.lateral.value, 0.8 * z1Sag)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(read.lateral.value).toBeGreaterThan(0);
    // §2's level-span symmetry, in the tilted plane: the reactions split the load evenly, and the
    // line pulls A toward the side the load pushes it.
    expect(rel(state.FA.y, (4 * span.L0) / 2)).toBeLessThan(TOLERANCE.solvedScalar);
  });
});

describe("§19.17 control 4 — weightless crossflow, the closed form", () => {
  it("holds T constant and the catenary of parameter T/p, at 10⁻⁸", () => {
    // Level 100 m, a pure crosswind of 20 m/s: p = ½·ρ·C_D⊥·d·U². T is chosen; L₀ follows from
    // `L = (2T/p)·asinh(p·Σ/(2T))`, `Σ = (1 + T/EA)·L₀`, and the solve must find that T again.
    const aero = aeroOf(field(20, 90), 0.012, 1.225);
    const p = 0.5 * 1.225 * 1.2 * 0.012 * 400;
    const L = 100;
    const EA = 1e8;
    const T = 250 * p;
    const Sigma = ((2 * T) / p) * Math.sinh((p * L) / (2 * T));
    const L0 = Sigma / (1 + T / EA);
    const state = shot(
      { L, h: 0, L0, w: 0, EA, aero, rider: null },
      { FA: { x: T, y: 0, z: 0 }, jacobian: null },
    );
    expect(rel(state.TA, T)).toBeLessThan(1e-8);
    expect(rel(state.TB, T)).toBeLessThan(1e-8);
    expect(rel(state.Tmax, T)).toBeLessThan(1e-8);
    const offset = (T / p) * (Math.sqrt(1 + ((p * Sigma) / (2 * T)) ** 2) - 1);
    const read = readExtrema(sampleSpatial(state), { L, h: 0 });
    expect(rel(read.lateral.value, offset)).toBeLessThan(1e-8);
    // The wind from the right of A → B pushes the line to its left, +y.
    expect(read.lateral.value).toBeGreaterThan(0);
    expect(read.sag.value).toBe(0);
  });
});

describe("§19.17 control 5 — balances re-integrated from the load written out by hand", () => {
  const cases: [string, SpatialSpanInput][] = [
    [
      "inclined, loaded, oblique wind under a 40 % profile",
      { ...LINE, aero: aeroOf(field(18, 60, 40)), rider: { ...RIDER, sP: 60 } },
    ],
    [
      "inclined, loaded, crosswind, two members",
      { ...LINE, aero: aeroOf(field(25, 270)), rider: { ...RIDER, sP: 100, share: 0.5 } },
    ],
    [
      "level, unloaded, head wind under a 70 % profile",
      { ...LINE, h: 0, L0: 150.6, aero: aeroOf(field(20, 0, 70, 30)), rider: null },
    ],
  ];

  for (const [name, input] of cases) {
    describe(`${name}`, () => {
      const state = solved(input);
      const s = sampleSpatial(state);
      const P = state.node === null ? [0, 0, 0] : asArray(state.node.Pext);

      it("closes on B within tol(L)", () => {
        const last = s.S.length - 1;
        expect(Math.hypot(s.x[last] - input.L, s.y[last], s.z[last] - input.h)).toBeLessThan(1e-6);
      });

      it("balances forces: F(L₀) − F(0) + ∫q₀ dS + P_ext = 0 within 10⁻⁶ N", () => {
        const Q = simpson(s, (i) => loadAt(input, s, i));
        const residual = [0, 1, 2].map(
          (c) => asArray(state.FB)[c] - asArray(state.FA)[c] + Q[c] + P[c],
        );
        expect(Math.hypot(...residual)).toBeLessThan(1e-6);
      });

      it("balances moments about A within 10⁻⁶ N·m per metre of chord", () => {
        const M = simpson(s, (i) => cross([s.x[i], s.y[i], s.z[i]], loadAt(input, s, i)));
        const MB = cross([input.L, 0, input.h], asArray(state.FB));
        const MP = state.node === null ? [0, 0, 0] : cross(asArray(state.node.rD), P);
        const residual = [0, 1, 2].map((c) => MB[c] + M[c] + MP[c]);
        expect(Math.hypot(...residual)).toBeLessThan(1e-6 * Math.hypot(input.L, input.h));
      });

      describe.skipIf(input.rider === null)("at the rider's node", () => {
        it("jumps by −P_ext at a shared node (10⁻⁶ N, 10⁻⁹ m)", () => {
          const k = s.node;
          expect(
            Math.hypot(s.x[k + 1] - s.x[k], s.y[k + 1] - s.y[k], s.z[k + 1] - s.z[k]),
          ).toBeLessThan(1e-9);
          const jump = [
            s.Fx[k + 1] - s.Fx[k] + P[0],
            s.Fy[k + 1] - s.Fy[k] + P[1],
            s.Fz[k + 1] - s.Fz[k] + P[2],
          ];
          expect(Math.hypot(...jump)).toBeLessThan(1e-6);
        });

        it("puts §19.5's force at the trolley's own x, shared by n_c (§19.6)", () => {
          // Written out: ½·ρ·1,0·π·c·√(b²u_x² + a²u_y²)·u, c = 0,40·h, b = 0,125·h, a = 0,075·h.
          const rider = input.rider;
          const aero = input.aero as LineAero;
          if (rider === null || state.node === null) throw new Error("loaded case");
          const u = windAt(aero.field, state.node.rD.x, input.L, aero.bearing);
          const [a, b, c] = [0.075 * rider.hRider, 0.125 * rider.hRider, 0.4 * rider.hRider];
          const k =
            0.5 *
            aero.rho *
            1.0 *
            Math.PI *
            c *
            Math.sqrt(b * b * u.along ** 2 + a * a * u.across ** 2);
          expect(P[0]).toBeCloseTo(rider.share * k * u.along, 10);
          expect(P[1]).toBeCloseTo(rider.share * k * u.across, 10);
          expect(P[2]).toBe(-rider.share * rider.weight);
        });
      });
    });
  }
});

describe("§19.17 control 6 — the mirror", () => {
  it("u_y → −u_y gives y → −y and the same tensions, flèche and node height", () => {
    // From 60° and from 300° on a line bearing north: the same along-wind, opposite across.
    const left = solved({ ...LINE, aero: aeroOf(field(18, 60, 40)), rider: { ...RIDER, sP: 70 } });
    const right = solved({
      ...LINE,
      aero: aeroOf(field(18, 300, 40)),
      rider: { ...RIDER, sP: 70 },
    });
    expect(right.TA).toBeCloseTo(left.TA, 6);
    expect(right.TB).toBeCloseTo(left.TB, 6);
    expect(right.Tmax).toBeCloseTo(left.Tmax, 6);
    expect(right.FA.y).toBeCloseTo(-left.FA.y, 6);
    expect(right.node?.rD.y).toBeCloseTo(-(left.node?.rD.y ?? 0), 9);
    expect(right.node?.rD.z).toBeCloseTo(left.node?.rD.z ?? 0, 9);
    const a = sampleSpatial(left);
    const b = sampleSpatial(right);
    for (let i = 0; i < a.S.length; i += 17) {
      expect(b.y[i]).toBeCloseTo(-a.y[i], 9);
      expect(b.z[i]).toBeCloseTo(a.z[i], 9);
    }
    expect(left.node?.rD.y).toBeGreaterThan(0);
  });
});

describe("§19.17 control 7 — two members", () => {
  it("shares the whole rider vector, never the member's own weight and wind", () => {
    const aero = aeroOf(field(20, 90));
    const one = solved({ ...LINE, aero, rider: { ...RIDER, sP: 75, share: 1 } });
    const half = solved({ ...LINE, aero, rider: { ...RIDER, sP: 75, share: 0.5 } });
    // Each member's own load stays whole: control 5's balance with the whole `w` and drag holds on
    // the shared member (above, « two members »); here the shared vector is half the whole one at
    // the same wind — read at each line's own `x_D`, which the share moves.
    const at = (state: SpatialState) => windAt(aero.field, state.node?.rD.x ?? 0, LINE.L, 0);
    expect(at(one).across).toBe(at(half).across);
    expect(half.node?.Pext.y).toBeCloseTo((one.node?.Pext.y ?? 0) / 2, 9);
    expect(half.node?.Pext.z).toBe(-RIDER.weight / 2);
    // Half the rider on the same line: a smaller tension, never half of it — the line weighs.
    expect(half.Tmax).toBeLessThan(one.Tmax);
    expect(half.Tmax).toBeGreaterThan(one.Tmax / 2);
  });
});

describe("§19.17 control 9 — refinement, N against 2N, at §19.9's bars", () => {
  const cases: [string, SpatialSpanInput, number][] = [
    [
      "150 m loaded under crosswind",
      { ...LINE, aero: aeroOf(field(20, 90)), rider: { ...RIDER, sP: 60 } },
      SPATIAL.polishFactor,
    ],
    [
      "150 m unloaded, oblique under a profile",
      { ...LINE, aero: aeroOf(field(20, 60, 40)), rider: null },
      SPATIAL.polishFactor,
    ],
    // Past 1000 m `tol(L)` grows with `L`; polished further so the closure's `EA·ε/L₀` stays under
    // the force bar it is compared at.
    [
      "1500 m loaded under crosswind",
      {
        L: 1500,
        h: -120,
        L0: 1504.5,
        w: 5.36,
        EA: 6.9e6,
        aero: aeroOf(field(20, 90)),
        rider: { ...RIDER, sP: 700 },
      },
      1e-6,
    ],
    [
      "1500 m unloaded, oblique under a profile",
      {
        L: 1500,
        h: -120,
        L0: 1504.5,
        w: 5.36,
        EA: 6.9e6,
        aero: aeroOf(field(20, 120, 40)),
        rider: null,
      },
      1e-6,
    ],
  ];

  for (const [name, input, polishFactor] of cases) {
    it(`${name}`, () => {
      const coarse = shot(input, undefined, { polishFactor });
      const fine = shot(input, undefined, { steps: 2 * SPATIAL.steps, polishFactor });
      const lengthBar = 1e-5 * Math.max(1, input.L / 1000);
      const forceBar = Math.max(1e-4, 1e-9 * coarse.Tmax);
      const gap = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      expect(gap(coarse.FA, fine.FA)).toBeLessThan(forceBar);
      expect(gap(coarse.FB, fine.FB)).toBeLessThan(forceBar);
      expect(Math.abs(coarse.Tmax - fine.Tmax)).toBeLessThan(forceBar);
      const origin = { x: 0, y: 0, z: 0 };
      expect(coarse.node === null).toBe(fine.node === null);
      expect(gap(coarse.node?.rD ?? origin, fine.node?.rD ?? origin)).toBeLessThan(lengthBar);
      const a = readExtrema(sampleSpatial(coarse), input);
      const b = readExtrema(sampleSpatial(fine), input);
      for (const key of ["sag", "rise", "lateral", "ecart"] as const) {
        expect(Math.abs(a[key].value - b[key].value)).toBeLessThan(lengthBar);
      }
    });
  }
});

describe("§19.17 control 11 — the profile is read", () => {
  it("a 40 % attenuation moves the line; a nil one is the uniform wind, whatever its width", () => {
    const uniform = solved({ ...LINE, aero: aeroOf(field(20, 90, 0, 50)), rider: null });
    const otherWidth = solved({ ...LINE, aero: aeroOf(field(20, 90, 0, 20)), rider: null });
    const profiled = solved({ ...LINE, aero: aeroOf(field(20, 90, 40, 50)), rider: null });
    expect(otherWidth.FA).toEqual(uniform.FA);
    expect(otherWidth.Tmax).toBe(uniform.Tmax);
    // Less wind toward the anchors at the same mid-span speed: less lateral load.
    expect(uniform.FA.y - profiled.FA.y).toBeGreaterThan(1);
  });
});

describe("§19.11 — failure as a value, in its class", () => {
  it("is outside-model for a slack textile line a tail wind pushes past B", () => {
    // Polyester 30 kN, 80 g/m, k 20, d 11 mm; L₀ 1,10·chord; a 30 m/s tail wind.
    const result = solveSpatial({
      L: 150,
      h: 0,
      L0: 165,
      w: 0.08 * G,
      EA: 20 * 30000,
      aero: aeroOf(field(30, 180), 0.011, 1.2),
      rider: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("outside-model");
    expect(result.error.kind === "outside-model" && result.error.x).toBeGreaterThan(150);
  });

  it("is slack-limit when every attempt refuses on the tension floor (injected)", () => {
    inject.mode = "slack";
    const result = solveSpatial({ ...LINE, aero: aeroOf(field(10, 90)), rider: null });
    expect(result).toEqual({ ok: false, error: { kind: "slack-limit", hFloored: 0.01 * LINE.w } });
  });

  it("is no-convergence with its diagnostic when no attempt closes (injected)", () => {
    inject.mode = "stall";
    const result = solveSpatial({
      L: 100,
      h: 0,
      L0: 100.5,
      w: 5,
      EA: 1e7,
      aero: aeroOf(field(10, 90)),
      rider: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "no-convergence")
      throw new Error("no-convergence expected");
    expect(result.error.reason).toBe("attempts");
    expect(result.error.attempts).toBeGreaterThanOrEqual(2);
    // The shot ends at x = 101 whatever F_A: the closure never drops under a metre.
    expect(result.error.residual).toBeGreaterThanOrEqual(1);
  });

  it("never answers a windy failure with the plane model (Q24)", () => {
    inject.mode = "stall";
    const result = solveSpatial({ ...LINE, aero: aeroOf(field(10, 90)), rider: null });
    expect(result.ok).toBe(false);
  });
});
