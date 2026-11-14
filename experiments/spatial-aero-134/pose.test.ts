import { describe, expect, it } from "vitest";

import { Z1 } from "@/lib/sim/__fixtures__/theory-15.ts";

import type { SpatialInput } from "./solve.ts";

import { NO_AERO } from "./aero.ts";
import { resolvePoseLength } from "./pose.ts";
import { solveSpatial } from "./solve.ts";

const { L, h, w, EA } = Z1.in;
const LINE: Omit<SpatialInput, "L0" | "rider"> = {
  L,
  h,
  w,
  EA,
  d: 0.012,
  rho: 1.225,
  wind: { along: 0, across: 0 },
  aero: NO_AERO,
};

function posed(result: ReturnType<typeof resolvePoseLength>) {
  if (!result.ok) throw new Error(`no pose: ${JSON.stringify(result.failure)}`);
  return result;
}

describe("resolvePoseLength — §18.7's inverse", () => {
  // §15 Z1: at L₀ = 100,5 m the level line reads T_A = T_max = 1445,94 N. T ∝ (L₀ − L)^(−½), so
  // the six figures of the tension leave about 2 × 3,5×10⁻⁶ × 0,5 m on the length.
  const target = Z1.out.Tmax;

  it("without wind, returns the length §15 publishes for that tension — from the tight side", () => {
    const found = posed(resolvePoseLength(LINE, target, 100.3));
    expect(found.L0).toBeCloseTo(Z1.in.L0, 5);
    expect(found.tension).toBeCloseTo(target, 6);
  });

  it("and from the slack side", () => {
    const found = posed(resolvePoseLength(LINE, target, 100.9));
    expect(found.L0).toBeCloseTo(Z1.in.L0, 5);
  });

  it("under a wind and a model, the line solved anew at that length reads the target", () => {
    const blown = {
      ...LINE,
      wind: { along: -5, across: 15 },
      aero: { normal: 1.2, lift: -0.5, liftLaw: "binormal", axial: 0.1 } as const,
    };
    const found = posed(resolvePoseLength(blown, target, Z1.in.L0));
    const again = solveSpatial({ ...blown, L0: found.L0, rider: null });
    if (!again.ok) throw new Error("the posed line did not solve");
    const { Fx, Fy, Fz } = again.solution;
    expect(Math.hypot(Fx[0], Fy[0], Fz[0]) / target).toBeCloseTo(1, 8);
    // The wind and a downward lift load the line: the same tension needs a longer line.
    expect(found.L0).toBeGreaterThan(Z1.in.L0 + 0.01);
  });

  it("a tension the taut branch cannot reach is a failure, not a length", () => {
    // The line weighs 5 N/m over 100 m: no length reads 100 N at an anchor that carries 250 N.
    const result = resolvePoseLength(LINE, 100, Z1.in.L0);
    expect(result).toMatchObject({ ok: false, failure: { kind: "unreachable" } });
  });

  it("an equilibrium that fails on the way is the answer", () => {
    // No weight and no seed: the first equilibrium has no start.
    const result = resolvePoseLength({ ...LINE, w: 0 }, target, Z1.in.L0);
    expect(result).toMatchObject({ ok: false, failure: { kind: "equilibrium", L0: Z1.in.L0 } });
  });
});
