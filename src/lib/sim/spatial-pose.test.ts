/**
 * §19.7's drivers and §19.10's inversion. Oracles: §15's Z6 and `resolveL0` without wind; under
 * wind, direct → inverse round trips whose expected `L₀` is the one the test chose; the
 * definitions of `H_K` and `T_K`; and the monotone scans of §19.10 over §19.17's matrix — asserted
 * beyond each driver's noise band, never trusted. A reversal is injected (`vi.mock`), not hunted.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnchorSide, SpanGeometry, TightnessSpec } from "./parameterise.ts";
import type { LineAero, SpatialState } from "./types.ts";

import { TOLERANCE, Z6 } from "./__fixtures__/theory-15.ts";
import { deriveSteel } from "./materials/steel.ts";
import { deriveTextile } from "./materials/textile.ts";
import { resolveL0, tightnessFloor } from "./parameterise.ts";
import { residualTolerance } from "./solve.ts";
import { resolveSpatialL0 } from "./spatial-pose.ts";
import { unloadedReadings } from "./spatial-sample.ts";
import { solveSpatial, SPATIAL } from "./spatial-solve.ts";

/** A reversal, injected: every length but the floor reads `H_A` far above the floor's. */
const inject = vi.hoisted(() => ({ reversal: false, floor: Number.NaN }));

vi.mock("./spatial-solve.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("./spatial-solve.ts")>();
  return {
    ...real,
    solveSpatial: (...args: Parameters<typeof real.solveSpatial>) => {
      const result = real.solveSpatial(...args);
      if (!inject.reversal || !result.ok || args[0].L0 === inject.floor) return result;
      return { ...result, state: { ...result.state, HA: 1e9 } };
    },
  };
});

beforeEach(() => {
  inject.reversal = false;
});

const rel = (value: number, expected: number) => Math.abs(value / expected - 1);

const steel = deriveSteel({ family: "steel", d: 12, R0: 1770, construction: "fibre-core" });
const textile = deriveTextile({
  family: "textile",
  ropeClass: "polyester",
  MBL: 30000,
  mu: 0.08,
  k: 20,
});
const SPAN: SpanGeometry = { L: 150, h: -18, w: steel.w, EA: steel.EA, strength: steel.strength };

const aeroOf = (speed: number, from: number, attenuation = 0, d = 0.012): LineAero => ({
  field: { speed, from, profile: { width: 50, attenuation } },
  bearing: 0,
  rho: 1.2,
  d,
  CDn: 1.2,
});

function unloadedAt(span: SpanGeometry, L0: number, aero: LineAero | null): SpatialState {
  const result = solveSpatial({ ...span, L0, aero, rider: null });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.state;
}

describe("without wind — resolveL0, unchanged (§19.16)", () => {
  it("meets §15's Z6 and is resolveL0's L₀ bit for bit", () => {
    const span = { L: Z6.in.L, h: Z6.in.h, w: Z6.in.w, EA: Z6.in.EA, strength: 1e6 };
    const spec: TightnessSpec = { mode: "tension", H_target: Z6.in.HTarget };
    const pose = resolveSpatialL0(spec, span, null, "A");
    const plane = resolveL0(spec, span);
    if (!pose.ok || !plane.ok) throw new Error("Z6 must resolve");
    expect(pose.value.L0).toBe(plane.value);
    expect(rel(pose.value.L0, Z6.out.L0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(pose.value.state.method).toBe("closed-form");
    expect(pose.value.state.HA).toBe(pose.value.state.HB);
  });

  it("delegates a nil speed too", () => {
    const pose = resolveSpatialL0({ mode: "sag", D_target: 1.6 }, SPAN, aeroOf(0, 90), "A");
    const plane = resolveL0({ mode: "sag", D_target: 1.6 }, SPAN);
    expect(pose.ok && plane.ok && pose.value.L0 === plane.value).toBe(true);
  });
});

describe("§19.17 control 10 — every driver round-trips under wind, at K = A and K = B", () => {
  const winds: [string, LineAero][] = [
    ["crosswind 15 m/s", aeroOf(15, 90)],
    ["oblique 25 m/s under a 40 % profile", aeroOf(25, 60, 40)],
  ];
  // The oracle is the length the test chose; the target is read off the line at that length.
  for (const L0 of [151.644, 1.3 * Math.hypot(150, 18)]) {
    for (const [name, aero] of winds) {
      describe(`${name}, L₀ = ${L0.toFixed(3)} m`, () => {
        const state = unloadedAt(SPAN, L0, aero);
        const read = unloadedReadings(state);
        const specs: [TightnessSpec, AnchorSide][] = [
          [{ mode: "tension", H_target: state.HA }, "A"],
          [{ mode: "tension", H_target: state.HB }, "B"],
          [{ mode: "anchor", side: "A", T_target: state.TA }, "A"],
          [{ mode: "anchor", side: "B", T_target: state.TB }, "B"],
          [{ mode: "sag", D_target: read.sag.value }, "A"],
          [{ mode: "length", L0 }, "A"],
        ];
        for (const [spec, side] of specs) {
          it(`${spec.mode}${spec.mode === "length" || spec.mode === "sag" ? "" : ` at ${side}`}`, () => {
            const pose = resolveSpatialL0(spec, SPAN, aero, side);
            if (!pose.ok) throw new Error(JSON.stringify(pose.error));
            expect(pose.value.state.method).toBe("shooting");
            const longer = unloadedAt(SPAN, L0 + 1e-3, aero);
            // Past the tension de pose's minimum (the longer line reads more): §19.10 keeps the taut
            // branch, so the answer is the shorter length that reads the same tension — never the
            // slack one the test started from.
            const slackBranch =
              spec.mode === "anchor" &&
              (spec.side === "A" ? longer.TA > state.TA : longer.TB > state.TB);
            const back = side === "A" ? pose.value.state.TA : pose.value.state.TB;
            const target = spec.mode === "anchor" ? spec.T_target : back;
            expect(rel(back, target)).toBeLessThan(1e-9);
            const found =
              rel(pose.value.L0, L0) < 1e-9
                ? "the same"
                : pose.value.L0 < L0
                  ? "shorter"
                  : "longer";
            expect(found).toBe(slackBranch ? "shorter" : "the same");
          });
        }
      });
    }
  }
});

describe("§19.7 — H_K is F_x at K, not the horizontal norm, not the tension de pose", () => {
  const state = unloadedAt(SPAN, 151.644, aeroOf(15, 90));

  it("reads H_A = F_x(0) and H_B = F_x(L₀), both positive, different under crosswind", () => {
    expect(state.HA).toBe(state.FA.x);
    expect(state.HB).toBe(state.FB.x);
    expect(state.HA).toBeGreaterThan(0);
    expect(state.HB).toBeGreaterThan(0);
    expect(state.HA).not.toBe(state.HB);
  });

  it("keeps T_K² = H_K² + F_y² + F_z², with F_y ≠ 0: H_K < √(F_x² + F_y²) < T_K", () => {
    expect(state.TA ** 2).toBeCloseTo(state.HA ** 2 + state.FA.y ** 2 + state.FA.z ** 2, 4);
    expect(Math.abs(state.FA.y)).toBeGreaterThan(1);
    expect(state.HA).toBeLessThan(Math.hypot(state.FA.x, state.FA.y));
    expect(Math.hypot(state.FA.x, state.FA.y)).toBeLessThan(state.TA);
  });
});

describe("§19.10 — the floor's reading under wind is the bound", () => {
  it("refuses a target beyond it, with the spatial reading as the bound — not the plane one", () => {
    const aero = aeroOf(25, 90);
    const atFloor = unloadedAt(SPAN, tightnessFloor(SPAN), aero);
    const pose = resolveSpatialL0({ mode: "sag", D_target: 1e-3 }, SPAN, aero, "A");
    const plane = resolveL0({ mode: "sag", D_target: 1e-3 }, SPAN);
    expect(pose.ok).toBe(false);
    expect(!pose.ok && pose.error).toMatchObject({
      kind: "invalid-input",
      field: "D_target",
      bound: unloadedReadings(atFloor).sag.value,
      boundKind: "min",
    });
    expect(
      !plane.ok &&
        !pose.ok &&
        plane.error.kind === "invalid-input" &&
        pose.error.kind === "invalid-input" &&
        plane.error.bound !== pose.error.bound,
    ).toBe(true);
  });

  it("refuses a length under the floor, as resolveL0 does", () => {
    const pose = resolveSpatialL0({ mode: "length", L0: 140 }, SPAN, aeroOf(15, 90), "A");
    expect(!pose.ok && pose.error).toMatchObject({
      kind: "invalid-input",
      field: "L0",
      value: 140,
    });
  });

  it("says a tension de pose under the taut branch's minimum is unreachable", () => {
    const pose = resolveSpatialL0(
      { mode: "anchor", side: "A", T_target: 1 },
      SPAN,
      aeroOf(15, 90),
      "A",
    );
    expect(!pose.ok && pose.error).toMatchObject({ kind: "no-convergence", reason: "unreachable" });
  });
});

describe("§19.10 — a reversal is never resolved by picking a root (injected)", () => {
  it("is no-convergence « non-monotone »", () => {
    inject.reversal = true;
    inject.floor = tightnessFloor(SPAN);
    const pose = resolveSpatialL0({ mode: "tension", H_target: 2700 }, SPAN, aeroOf(15, 90), "A");
    expect(!pose.ok && pose.error).toMatchObject({
      kind: "no-convergence",
      reason: "non-monotone",
    });
  });
});

describe("§19.10 — the drivers are monotone over [floor, 1,10·chord] on §19.17's matrix", () => {
  // Steel 12 mm and polyester 11 mm; level and −18 m; across, tail and 45°; 10 and 30 m/s;
  // uniform and a 40 % profile. 20 lengths per scan, each warm from the one before.
  const materials = [
    ["steel 12 mm", steel, 0.012],
    ["textile 11 mm", textile, 0.011],
  ] as const;
  for (const [material, m, d] of materials) {
    for (const h of [0, -18]) {
      it(`${material}, h = ${h} m`, () => {
        const span: SpanGeometry = { L: 150, h, w: m.w, EA: m.EA, strength: m.strength };
        const floor = tightnessFloor(span);
        const top = 1.1 * Math.hypot(span.L, h);
        const tensionNoise = (L0: number) =>
          (span.EA * SPATIAL.polishFactor * residualTolerance(span.L)) / L0;
        for (const from of [90, 180, 45]) {
          for (const speed of [10, 30]) {
            for (const attenuation of [0, 40]) {
              const aero = aeroOf(speed, from, attenuation, d);
              const rows: {
                L0: number;
                HA: number;
                HB: number;
                TA: number;
                TB: number;
                D: number;
              }[] = [];
              const failures: string[] = [];
              let warm: Parameters<typeof solveSpatial>[1];
              for (let i = 0; i <= 20; i++) {
                const L0 = floor + ((top - floor) * i) / 20;
                const result = solveSpatial({ ...span, L0, aero, rider: null }, warm);
                if (!result.ok) {
                  // The one failure the matrix holds: a slack line a strong tail wind pushes past B.
                  failures.push(result.error.kind);
                  warm = undefined;
                  continue;
                }
                warm = result.warm;
                const s = result.state;
                rows.push({
                  L0,
                  HA: s.HA,
                  HB: s.HB,
                  TA: s.TA,
                  TB: s.TB,
                  D: unloadedReadings(s).sag.value,
                });
              }
              expect(failures.filter((kind) => kind !== "outside-model")).toEqual([]);
              expect(rows.length).toBeGreaterThan(10);
              // Every step that moves a driver the wrong way beyond its noise band, by name.
              const reversals: string[] = [];
              let turnedA = false;
              let turnedB = false;
              for (let i = 1; i < rows.length; i++) {
                const [a, b] = [rows[i - 1], rows[i]];
                const band = tensionNoise(b.L0);
                if (b.HA > a.HA + band) reversals.push(`H_A at ${b.L0}`);
                if (b.HB > a.HB + band) reversals.push(`H_B at ${b.L0}`);
                if (b.D < a.D - 1e-5) reversals.push(`D at ${b.L0}`);
                // T_K falls, may bottom out, and never falls again once it has risen.
                if (turnedA && b.TA < a.TA - band) reversals.push(`T_A at ${b.L0}`);
                if (turnedB && b.TB < a.TB - band) reversals.push(`T_B at ${b.L0}`);
                turnedA ||= b.TA > a.TA + band;
                turnedB ||= b.TB > a.TB + band;
              }
              expect(reversals).toEqual([]);
            }
          }
        }
      });
    }
  }
});
