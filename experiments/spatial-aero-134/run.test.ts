import { afterEach, describe, expect, it, vi } from "vitest";

import { solveSpan } from "@/lib/sim";
import { TOLERANCE } from "@/lib/sim/__fixtures__/theory-15.ts";

import type { ForceMeasures, ShapeMeasures } from "./measures.ts";
import type { PoseFailure, PoseResult } from "./pose.ts";
import type { Outputs, Row } from "./run.ts";

import {
  baseCases,
  GEOMETRIES,
  LINES,
  REFERENCE_VARIANT,
  VARIANTS,
  windCase,
  WINDS,
} from "./cases.ts";
import {
  balanceBreach,
  differenceOf,
  fixedLength,
  FORCE_KEYS,
  inputOf,
  LENGTH_KEYS,
  lengthShift,
  reactionShift,
  runFixedLength,
  runPoseTension,
  solveRow,
  TOLERANCES,
} from "./run.ts";
import { SPATIAL } from "./solve.ts";

/**
 * The failures a row can report are **injected on the collaborators, never hunted**: the matrix
 * has no row that fails, and a line contrived to fail tests whatever made it fail
 * (`docs/conventions/testing.md`, Injected states). Everything is off unless a test sets it.
 */
const injected = vi.hoisted(() => ({
  /** `solveSpatial` finds no equilibrium at this number of steps. */
  noEquilibriumAt: null as number | null,
  /** Added to the force balance `residuals` reads. */
  forceResidual: 0,
  /**
   * Something added to one output read on a line of this many nodes — so on one of the two step
   * counts only: a length, a tension, or a lateral force on the reaction at an anchor.
   */
  gap: { nodes: 0, on: "sag" as keyof ShapeMeasures | keyof ForceMeasures, by: 0 },
  /** What `resolvePoseLength` answers instead of searching. */
  pose: null as PoseResult | null,
}));

vi.mock("./solve.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./solve.ts")>();
  return {
    ...actual,
    solveSpatial: (...args: Parameters<typeof actual.solveSpatial>) =>
      (args[1]?.steps ?? actual.SPATIAL.steps) === injected.noEquilibriumAt
        ? {
            ok: false as const,
            failure: { kind: "no-convergence" as const, closure: 0.3, iterations: 17 },
          }
        : actual.solveSpatial(...args),
  };
});

vi.mock("./measures.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./measures.ts")>();
  return {
    ...actual,
    residuals: (...args: Parameters<typeof actual.residuals>) => {
      const found = actual.residuals(...args);
      return { ...found, force: found.force + injected.forceResidual };
    },
    shapeMeasures: (...args: Parameters<typeof actual.shapeMeasures>) => {
      const found = actual.shapeMeasures(...args);
      const { nodes, on, by } = injected.gap;
      if (args[0].S.length !== nodes || !(on in found)) return found;
      return { ...found, [on]: found[on as keyof ShapeMeasures] + by };
    },
    forceMeasures: (...args: Parameters<typeof actual.forceMeasures>) => {
      const found = actual.forceMeasures(...args);
      const { nodes, on, by } = injected.gap;
      if (args[0].S.length !== nodes || !(on in found)) return found;
      if (on === "reactionA" || on === "reactionB") {
        const [x, y, z] = found[on];
        return { ...found, [on]: [x, y + by, z] as const };
      }
      return { ...found, [on]: found[on as "TA" | "TB" | "Tmax" | "HA"] + by };
    },
  };
});

vi.mock("./pose.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pose.ts")>();
  return {
    ...actual,
    resolvePoseLength: (...args: Parameters<typeof actual.resolvePoseLength>) =>
      injected.pose ?? actual.resolvePoseLength(...args),
  };
});

afterEach(() => {
  injected.noEquilibriumAt = null;
  injected.forceResidual = 0;
  injected.gap = { nodes: 0, on: "sag", by: 0 };
  injected.pose = null;
});

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

  it("reports §18.3's three loads in N per stretched metre, each under its own name", () => {
    // A head wind of 20 m/s on the unloaded, inclined cable: u = (−20, 0, 0), so u_t = −20·t_x
    // and |u_n|² = 400·(1 − t_x²) at every node, whichever way the lift pushes the line.
    const head = windCase(20, { id: "face", name: "de face", from: 0 });
    const L0 = fixedLength(steel, inclined);
    const solved = solveRow(
      inputOf(steel, inclined, head, variant("NLA-b+0.5-0.1"), L0, false),
      inclined,
    );
    const out = solved.outputs!;
    // The axial drag is greatest where the line is level — its lowest point, inside the span:
    // ½ × 1,225 × 0,1 × 0,012 × 20² = 0,294 N/m.
    expect(out.axialMax).toBeCloseTo(0.294, 6);
    // The normal drag is greatest where the line is steepest — at A, the upper anchor, where
    // t_x = H_A/T_A: ½ × 1,225 × 1,2 × 0,012 × 20² = 3,528 N/m, times 1 − t_x².
    expect(out.normalMax).toBeCloseTo(3.528 * (1 - (out.HA / out.TA) ** 2), 12);
    // The binormal lift is the normal drag times |C_L|/C_D⊥ = 0,5/1,2, node by node.
    expect(out.liftMax / out.normalMax).toBeCloseTo(0.5 / 1.2, 12);
    expect(out.liftMean / out.normalMean).toBeCloseTo(0.5 / 1.2, 12);
    // A mean stays under its maximum: far under for the normal drag, nil at the lowest point;
    // barely for the axial drag, which a slope of a few degrees hardly reduces.
    expect(out.normalMean).toBeGreaterThan(0);
    expect(out.normalMean).toBeLessThan(0.5 * out.normalMax);
    expect(out.axialMean).toBeGreaterThan(0.95 * out.axialMax);
    expect(out.axialMean).toBeLessThan(out.axialMax);
  });

  it("reports the mean stretch of the line, 1 + T/EA along it", () => {
    // The unloaded rope on level anchors, without wind: 1400 N at both ends and, with a flèche
    // near 1,4 m, 1 N less at its lowest point. On EA = 39,37 kN: 1 + 1400/39 370 = 1,03556.
    const solved = solveRow(
      inputOf(rope, level, wind("calme"), REFERENCE_VARIANT, fixedLength(rope, level), false),
      level,
    );
    expect(solved.outputs!.stretch).toBeCloseTo(1 + 1400 / 39_370, 4);
    expect(solved.outputs!.stretch).toBeLessThan(1 + 1400 / 39_370);
  });

  // An input the shot refuses is the one failure a row reaches from its inputs; a line with no
  // equilibrium is injected, below.
  it("names an input it refuses", () => {
    const input = {
      ...inputOf(steel, level, wind("calme"), REFERENCE_VARIANT, 150.5, false),
      EA: 0,
    };
    expect(solveRow(input, level).detail).toBe("entrée refusée : EA = 0");
  });
});

describe("solveRow — a row that fails a check stays, as a failure (§18.6)", () => {
  const input = () =>
    inputOf(
      steel,
      inclined,
      wind("oblique-20"),
      variant("NL-b+0.5"),
      fixedLength(steel, inclined),
      false,
    );

  it("reports the closure and the iterations of a line with no equilibrium", () => {
    injected.noEquilibriumAt = SPATIAL.steps;
    expect(solveRow(input(), inclined)).toEqual({
      status: "non convergé",
      detail: "fermeture 3.00e-1 m après 17 itérations",
      outputs: null,
      residuals: null,
      refinement: null,
      iterations: 17,
    });
  });

  it("has nothing to refine a line with no equilibrium at twice the steps", () => {
    injected.noEquilibriumAt = 2 * SPATIAL.steps;
    const solved = solveRow(input(), inclined);
    expect(solved.status).toBe("raffinement non résolu");
    expect(solved.detail).toBe("pas d'équilibre à 480 pas");
    expect(solved.outputs).toBeNull();
    expect(solved.refinement).toBeNull();
  });

  it("fails a line whose force balance is over its bar, and keeps its figures for the diagnostic", () => {
    injected.forceResidual = 5 * TOLERANCES.force;
    const solved = solveRow(input(), inclined);
    expect(solved.status).toBe("bilan hors tolérance");
    expect(solved.detail).toContain("bilan des forces 5.00e-6 N");
    expect(solved.outputs).not.toBeNull();
    expect(solved.residuals!.force).toBeGreaterThan(TOLERANCES.force);
  });

  // §18.6 holds the gap between the two step counts to its bar on every length and on every
  // force reported. Each is moved alone on the coarser line, the others left as solved.
  const coarse = SPATIAL.steps + 1;

  it.each(["reactionA", "reactionB"] as const)(
    "fails a line whose %s turns between the two step counts, its tensions unmoved",
    (anchor) => {
      // 1 mN sideways on a reaction of some 3 kN changes |F| by about 10⁻¹⁰ N: only the vector
      // shows.
      injected.gap = { nodes: coarse, on: anchor, by: 1e-3 };
      const solved = solveRow(input(), inclined);
      expect(solved.status).toBe("raffinement hors tolérance");
      expect(solved.refinement!.force).toBeCloseTo(1e-3, 6);
      expect(solved.refinement!.length).toBeLessThan(TOLERANCES.refinement.length);
      expect(solved.detail).toContain("1.00e-3 N");
    },
  );

  it.each(FORCE_KEYS)("fails a line whose %s moves by 1 mN between the two step counts", (key) => {
    injected.gap = { nodes: coarse, on: key, by: 1e-3 };
    const solved = solveRow(input(), inclined);
    expect(solved.status).toBe("raffinement hors tolérance");
    expect(solved.refinement!.force).toBeCloseTo(1e-3, 6);
    expect(solved.refinement!.length).toBeLessThan(TOLERANCES.refinement.length);
  });

  it.each(LENGTH_KEYS)(
    "fails a line whose %s moves by 0,02 mm between the two step counts, its forces unmoved",
    (key) => {
      // Twice the 0,01 mm bar, on one length alone.
      injected.gap = { nodes: coarse, on: key, by: 2e-5 };
      const solved = solveRow(input(), inclined);
      expect(solved.status).toBe("raffinement hors tolérance");
      expect(solved.refinement!.length).toBeCloseTo(2e-5, 7);
      expect(solved.refinement!.force).toBeLessThan(TOLERANCES.refinement.force);
      expect(solved.detail).toMatch(/^écart 2\.0\de-5 m, /);
      // The figures stay, for the diagnostic.
      expect(solved.outputs).not.toBeNull();
    },
  );

  it("passes a line whose gap is half a bar: 0,005 mm on a length, 0,05 mN on a force", () => {
    injected.gap = { nodes: coarse, on: "clearance", by: 5e-6 };
    const length = solveRow(input(), inclined);
    expect(length.status).toBe("ok");
    expect(length.refinement!.length).toBeCloseTo(5e-6, 7);
    injected.gap = { nodes: coarse, on: "reactionB", by: 5e-5 };
    const force = solveRow(input(), inclined);
    expect(force.status).toBe("ok");
    expect(force.refinement!.force).toBeCloseTo(5e-5, 6);
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

describe("lengthShift — the length a model needs beyond the reference's", () => {
  const posed = (L0: number, status: Row["status"] = "ok", id = "NA-0.1"): Row => ({
    ...row({}, status, id),
    L0,
  });
  const reference = posed(150, "ok", "N");

  it("is the difference of the two lengths, in metres and without a percentage", () => {
    expect(lengthShift(posed(150.25), reference)).toEqual({
      absolute: 0.25,
      relative: null,
      resolved: true,
    });
    expect(lengthShift(posed(149.5), reference)!.absolute).toBe(-0.5);
  });

  it("does not read a difference under the 0,1 mm floor", () => {
    expect(lengthShift(posed(150.00005), reference)!.resolved).toBe(false);
    expect(lengthShift(posed(149.99995), reference)!.resolved).toBe(false);
    expect(lengthShift(posed(150.0002), reference)!.resolved).toBe(true);
  });

  it("gives nothing for a row or a reference that failed its checks, whatever its length", () => {
    expect(lengthShift(posed(150.25, "raffinement hors tolérance"), reference)).toBeNull();
    expect(lengthShift(posed(150.25), posed(150, "bilan hors tolérance", "N"))).toBeNull();
    expect(lengthShift(posed(Number.NaN, "pose non résolue"), reference)).toBeNull();
    expect(lengthShift(posed(150.25), undefined)).toBeNull();
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
  });

  it("runs the variants it is given, the matrix's own by default", () => {
    const two = [REFERENCE_VARIANT, variant("NA-0.1")];
    const base = only("corde-bandit-11|incline|vide|travers-10");
    expect(runFixedLength(base, two).map((solved) => solved.variant.id)).toEqual(["N", "NA-0.1"]);
    const posed = runPoseTension({
      lines: [rope],
      geometries: [inclined],
      winds: [wind("travers-10")],
      variants: two,
    });
    expect(posed.map((solved) => `${solved.base.load.id} ${solved.variant.id}`)).toEqual([
      "vide N",
      "passager N",
      "vide NA-0.1",
      "passager NA-0.1",
    ]);
  });

  it("a pose that cannot be resolved leaves both load states as failures, with no length", () => {
    injected.pose = { ok: false, failure: { kind: "unreachable", L0: 151.25, tension: 900 } };
    const unposed = runPoseTension({
      lines: [rope],
      geometries: [inclined],
      winds: [wind("travers-10")],
      variants: [REFERENCE_VARIANT, variant("NA-0.1")],
    });
    expect(unposed).toHaveLength(4);
    for (const failed of unposed) {
      expect(failed.status).toBe("pose non résolue");
      expect(failed.detail).toBe(
        "tension hors d'atteinte sur la branche tendue : 900.0 N à L0 = 151.2500 m",
      );
      expect(failed.L0).toBeNaN();
      expect(failed.outputs).toBeNull();
    }
    // A failed row has no difference, and gives none to the rows compared with it.
    expect(differenceOf(unposed[2], unposed[0], "Tmax")).toBeNull();
  });

  it("says where the search for a pose stopped and what it found there, whatever stopped it", () => {
    const detailOf = (failure: PoseFailure): string => {
      injected.pose = { ok: false, failure };
      const [unposed] = runPoseTension({
        lines: [rope],
        geometries: [inclined],
        winds: [wind("travers-10")],
        variants: [REFERENCE_VARIANT],
      });
      return unposed.detail;
    };
    expect(detailOf({ kind: "no-convergence", L0: 146.0312, tension: 1398.4 })).toBe(
      "recherche de la longueur non convergée : 1398.4 N à L0 = 146.0312 m",
    );
    // The line that did not solve on the way reports its own closure, or the input it refused.
    expect(
      detailOf({
        kind: "equilibrium",
        L0: 152.5,
        failure: { kind: "no-convergence", closure: 71.3, iterations: 60 },
      }),
    ).toBe("pas d'équilibre à L0 = 152.5000 m : fermeture 7.13e+1 m après 60 itérations");
    expect(
      detailOf({
        kind: "equilibrium",
        L0: 140,
        failure: { kind: "invalid-input", field: "L0", value: 140 },
      }),
    ).toBe("pas d'équilibre à L0 = 140.0000 m : entrée refusée : L0 = 140");
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
