import { describe, expect, it } from "vitest";

import { solveSpan } from "@/lib/sim";
import { TOLERANCE } from "@/lib/sim/__fixtures__/theory-15.ts";

import type { Outputs, Row } from "./run.ts";

import { baseCases, GEOMETRIES, LINES, REFERENCE_VARIANT, VARIANTS, WINDS } from "./cases.ts";
import {
  balanceBreach,
  differenceOf,
  fixedLength,
  inputOf,
  reactionShift,
  referenceOf,
  runFixedLength,
  runPoseTension,
  solveRow,
  TOLERANCES,
} from "./run.ts";

const [steel, rope] = LINES;
const [level, inclined] = GEOMETRIES;
const wind = (id: string) => WINDS.find((candidate) => candidate.id === id)!;
const variant = (id: string) => VARIANTS.find((candidate) => candidate.id === id)!;
const only = (id: string) => baseCases().filter((base) => base.id === id);

/** A row with the outputs a difference is taken on, and nothing solved behind it. */
function row(outputs: Partial<Outputs> | null, status: Row["status"] = "ok", id = "N"): Row {
  const base = baseCases()[0];
  return {
    convention: "L0 fixe",
    base,
    variant: variant(id),
    L0: 150,
    status,
    detail: "",
    outputs:
      outputs === null
        ? null
        : ({ reactionA: [0, 0, 0], reactionB: [0, 0, 0], ...outputs } as Outputs),
    residuals: null,
    refinement: null,
    iterations: 0,
  };
}

describe("TOLERANCES — §18.6, fixed before any difference", () => {
  it("puts the floor ten times above the refinement bar, and the balance bar three orders under it", () => {
    expect(TOLERANCES.floor.length).toBeCloseTo(10 * TOLERANCES.refinement.length, 15);
    expect(TOLERANCES.floor.force).toBeCloseTo(10 * TOLERANCES.refinement.force, 15);
    expect(TOLERANCES.force).toBe(TOLERANCES.floor.force / 1000);
    expect(TOLERANCES.reference).toBe(TOLERANCE.solvedScalar);
  });
});

describe("fixedLength — the main comparison's one L₀", () => {
  it("is the length at which the plane engine, without wind, reads the tension de pose at A", () => {
    for (const line of LINES) {
      for (const geometry of GEOMETRIES) {
        const L0 = fixedLength(line, geometry);
        const plane = solveSpan({ L: geometry.L, h: geometry.h, L0, ...line.material, loads: [] });
        if (!plane.ok) throw new Error("the plane engine did not solve the posed line");
        expect(Math.abs(plane.state.TA - line.poseTension) / line.poseTension).toBeLessThan(
          TOLERANCE.solvedScalar,
        );
      }
    }
  });
});

describe("inputOf", () => {
  it("puts the rider at the middle of the unstretched line, with the member's share of its weight", () => {
    const loaded = inputOf(rope, inclined, wind("travers-10"), variant("NA-0.1"), 146, true);
    expect(loaded.rider).toEqual({ s: 73, force: [0, 0, -588.6] });
    expect(loaded.d).toBe(0.011);
    expect(loaded.wind).toEqual({ along: 0, across: 10 });
    expect(loaded.aero.axial).toBe(0.1);
    expect(inputOf(rope, inclined, wind("calme"), REFERENCE_VARIANT, 146, false).rider).toBeNull();
  });
});

describe("solveRow — one equilibrium at two step counts, with its checks", () => {
  it("passes a case of the matrix, well inside every bar", () => {
    const L0 = fixedLength(steel, inclined);
    const solved = solveRow(
      inputOf(steel, inclined, wind("oblique-20"), variant("NLA-b-0.5-0.1"), L0, true),
      inclined,
    );
    expect(solved.status).toBe("ok");
    expect(solved.detail).toBe("");
    expect(solved.refinement!.length).toBeLessThan(TOLERANCES.refinement.length);
    expect(solved.refinement!.force).toBeLessThan(TOLERANCES.refinement.force);
    expect(solved.residuals!.force).toBeLessThan(TOLERANCES.force);
    // The rider's weight is on the line: the garde is the 20 m of the anchors less sag and gabarit.
    expect(solved.outputs!.clearance).toBeCloseTo(20 - 2.1 - solved.outputs!.sag, 1);
  });

  it("keeps a line that does not solve as a failure, with no outputs to compare", () => {
    // No weight: the engine has no plane line to start from.
    const input = {
      ...inputOf(steel, level, wind("travers-10"), REFERENCE_VARIANT, 150.5, false),
      w: 0,
    };
    const solved = solveRow(input, level);
    expect(solved.status).toBe("non convergé");
    expect(solved.outputs).toBeNull();
    expect(solved.detail).toContain("fermeture");
  });

  it("names an input it refuses", () => {
    const input = {
      ...inputOf(steel, level, wind("calme"), REFERENCE_VARIANT, 150.5, false),
      EA: 0,
    };
    expect(solveRow(input, level).detail).toBe("entrée refusée : EA = 0");
  });
});

describe("balanceBreach", () => {
  const clean = { closure: 0, force: 0, moment: 0, jump: 0, continuity: 0 };

  it("passes residuals under every bar, the moment read per metre of chord", () => {
    expect(balanceBreach({ ...clean, force: 9e-7, moment: 1.4e-4, jump: 9e-7 }, 150)).toBeNull();
  });

  it("names the first residual over its bar", () => {
    expect(balanceBreach({ ...clean, force: 2e-6 }, 150)).toContain("bilan des forces");
    expect(balanceBreach({ ...clean, moment: 1.6e-4 }, 150)).toContain("bilan des moments");
    expect(balanceBreach({ ...clean, jump: 2e-6 }, 150)).toContain("saut au passager");
    expect(balanceBreach({ ...clean, continuity: 2e-9 }, 150)).toContain("continuité");
  });
});

describe("differenceOf — absolute first, a percentage only of something", () => {
  const reference = row({ Tmax: 2000, sag: 5, sway: 0.004 });

  it("gives the absolute and the relative difference of a force", () => {
    const found = differenceOf(row({ Tmax: 2100 }, "ok", "NA-0.1"), reference, "Tmax");
    expect(found).toEqual({ absolute: 100, relative: 0.05, resolved: true });
  });

  it("gives no percentage when the reference is nearly nil", () => {
    // A déport of 4 mm under the 0,1 m bar: 0,3 m more is not « +7500 % ».
    const found = differenceOf(row({ sway: 0.304 }, "ok", "NA-0.1"), reference, "sway");
    expect(found!.absolute).toBeCloseTo(0.3, 12);
    expect(found!.relative).toBeNull();
    expect(found!.resolved).toBe(true);
  });

  it("does not read a difference under the numerical floor", () => {
    expect(differenceOf(row({ sag: 5.00005 }, "ok", "NA-0.1"), reference, "sag")!.resolved).toBe(
      false,
    );
    expect(differenceOf(row({ sag: 5.0002 }, "ok", "NA-0.1"), reference, "sag")!.resolved).toBe(
      true,
    );
    expect(
      differenceOf(row({ Tmax: 2000.0005 }, "ok", "NA-0.1"), reference, "Tmax")!.resolved,
    ).toBe(false);
  });

  it("is relative to the magnitude of a negative reference", () => {
    const found = differenceOf(row({ sway: -0.6 }, "ok", "NA-0.1"), row({ sway: -0.5 }), "sway");
    expect(found!.absolute).toBeCloseTo(-0.1, 12);
    expect(found!.relative).toBeCloseTo(-0.2, 12);
  });

  it("gives nothing for a row or a reference that failed its checks", () => {
    const failed = row({ Tmax: 2100 }, "raffinement hors tolérance", "NA-0.1");
    expect(differenceOf(failed, reference, "Tmax")).toBeNull();
    expect(
      differenceOf(row({ Tmax: 2100 }, "ok", "NA-0.1"), row(null, "non convergé"), "Tmax"),
    ).toBeNull();
    expect(differenceOf(row({ Tmax: 2100 }, "ok", "NA-0.1"), undefined, "Tmax")).toBeNull();
  });
});

describe("reactionShift", () => {
  it("is the norm of the vector difference: a reaction that turns without growing shows", () => {
    const reference = row({ reactionA: [3000, 0, -4000] });
    const turned = row({ reactionA: [3000, 300, -4000] }, "ok", "NA-0.1");
    expect(reactionShift(turned, reference, "reactionA")).toEqual({
      absolute: 300,
      relative: 0.06,
      resolved: true,
    });
  });
});

describe("the two comparisons, on a part of the matrix", () => {
  const fixed = runFixedLength(only("corde-bandit-11|incline|vide|travers-10"));
  const pose = runPoseTension({
    lines: [rope],
    geometries: [inclined],
    winds: [wind("travers-10")],
  });

  it("the main comparison holds one L₀ for every variant: no length is recomputed", () => {
    expect(fixed).toHaveLength(VARIANTS.length);
    expect(fixed.every(({ status }) => status === "ok")).toBe(true);
    expect(new Set(fixed.map(({ L0 }) => L0)).size).toBe(1);
    expect(fixed[0].L0).toBe(fixedLength(rope, inclined));
    expect(fixed[0].variant).toBe(REFERENCE_VARIANT);
    expect(referenceOf(fixed[5], fixed)).toBe(fixed[0]);
  });

  it("the separate comparison reports each model's L₀, and its unloaded line reads the tension de pose", () => {
    expect(pose).toHaveLength(2 * VARIANTS.length);
    expect(pose.every(({ convention }) => convention === "tension de pose")).toBe(true);
    const unloaded = pose.filter(({ base }) => base.load.id === "vide");
    for (const posed of unloaded) {
      expect(posed.outputs!.TA / rope.poseTension).toBeCloseTo(1, 8);
    }
    // A lift changes the load on the line, so the length that reads the same tension changes.
    const lengthOf = (id: string) => unloaded.find((posed) => posed.variant.id === id)!.L0;
    expect(lengthOf("NL-b+0.5")).toBeLessThan(lengthOf("N") - 0.01);
    expect(lengthOf("NL-b-0.5")).toBeGreaterThan(lengthOf("N") + 0.01);
    // The loaded line is solved at the length of its own model.
    const loaded = pose.find(
      ({ base, variant: v }) => base.load.id === "passager" && v.id === "NL-b+0.5",
    )!;
    expect(loaded.L0).toBe(lengthOf("NL-b+0.5"));
  });

  it("at a fixed L₀ a downward lift on the unloaded rope deepens the flèche, an upward one reduces it", () => {
    const sagOf = (id: string) => fixed.find((solved) => solved.variant.id === id)!.outputs!.sag;
    expect(sagOf("NL-b-0.5")).toBeGreaterThan(sagOf("N") + 0.1);
    expect(sagOf("NL-b+0.5")).toBeLessThan(sagOf("N") - 0.1);
    // The yaw-odd law is nil in a pure crossflow on an undeflected line: almost no effect here.
    expect(Math.abs(sagOf("NL-y+0.5") - sagOf("N"))).toBeLessThan(0.02);
  });
});
