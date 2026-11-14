import { beforeAll, describe, expect, it } from "vitest";

import type { ControlFamily, ControlRow } from "./controls.ts";
import type { Row } from "./run.ts";

import { baseCases } from "./cases.ts";
import { CLOSED_FORM_BAR, judge, matrixHealth, mirrorSubject, runControls } from "./controls.ts";
import { runFixedLength, TOLERANCES } from "./run.ts";

describe("judge", () => {
  it("passes a value within the bar and fails one beyond it", () => {
    expect(judge(100, 100.0004, 4e-4)).toBe(true);
    expect(judge(100, 99.9996, 4e-4)).toBe(true);
    expect(judge(100, 100.0005, 4e-4)).toBe(false);
  });

  it("never passes a line that did not solve", () => {
    expect(judge(100, Number.NaN, 1)).toBe(false);
    expect(judge(0, Infinity, 1)).toBe(false);
  });
});

describe("runControls — §18.6, on the whole main comparison", () => {
  // The whole matrix at fixed L₀, solved once: controls 2 and 7 read its rows, and the matrix as
  // delivered must hold no failed row. In a hook, not at collection: a matrix that throws fails
  // these tests by name. Nothing is compared with the archived tables — `matrix.ts --check` does.
  let fixed: Row[];
  let controls: ControlRow[];
  beforeAll(() => {
    fixed = runFixedLength();
    controls = runControls(fixed);
  }, 120_000);
  const of = (family: ControlFamily) => controls.filter((control) => control.family === family);
  const one = (family: ControlFamily, quantity: string) =>
    of(family).find((control) => control.quantity === quantity)!;

  it("every row of the main comparison has a verified equilibrium", () => {
    const health = matrixHealth(fixed);
    expect(health.rows).toBe(72 * 27);
    expect(health.statuses.ok).toBe(health.rows);
    expect(health.worst.force).toBeLessThan(TOLERANCES.force);
    expect(health.worst.momentPerMetre).toBeLessThan(TOLERANCES.momentPerMetre);
    expect(health.worst.refinementLength).toBeLessThan(TOLERANCES.refinement.length);
    expect(health.worst.refinementForce).toBeLessThan(TOLERANCES.refinement.force);
    // The gabarit stays above the prescribed ground: no garde of the tables is a contact.
    expect(fixed.every(({ outputs }) => outputs !== null && outputs.clearance > 0)).toBe(true);
  });

  it("every control passes", () => {
    expect(controls.filter(({ pass }) => !pass)).toEqual([]);
  });

  it("covers the seven controls of §18.6, none skipped", () => {
    expect(of("§15 sans vent").map(({ subject }) => subject)).toEqual(
      expect.arrayContaining(["Z1", "Z2", "Z3", "Z4", "Z5"]),
    );
    // 2 lines × 2 geometries × 2 load states, without wind.
    expect(new Set(of("moteur plan sans vent").map(({ subject }) => subject)).size).toBe(8);
    expect(of("variantes sans vent")).toHaveLength(16);
    expect(of("traînée normale seule").length).toBeGreaterThan(0);
    expect(of("portance seule").length).toBeGreaterThan(0);
    expect(of("traînée axiale seule")).toHaveLength(4);
    expect(of("charge uniforme")).toHaveLength(4);
    expect(of("miroir")).toHaveLength(4);
  });

  it("takes the closed forms' expected values from the formulas, by hand", () => {
    // Normal drag: p = ½ × 1,225 × 1,2 × 0,012 × 20² = 3,528 N/m; Σ = (1 + 2000/10⁷) × 100 m.
    const tau = (3.528 * 100.02) / 4000;
    expect(one("traînée normale seule", "déport").expected).toBeCloseTo(
      (2000 / 3.528) * (Math.sqrt(1 + tau * tau) - 1),
      12,
    );
    expect(one("traînée normale seule", "T_A").expected).toBe(2000);
    // Lift: p = ½ × 1,225 × 0,5 × 0,012 × 20² = 1,47 N/m, R = 2000/1,47.
    const R = 2000 / 1.47;
    expect(one("portance seule", "remontée").expected).toBeCloseTo(
      R * (1 - Math.cos(100.02 / (2 * R))),
      10,
    );
    // Axial drag: ½ × 1,225 × 0,1 × 0,012 × 20² × 100,1 m = 0,294 × 100,1 = 29,4294 N.
    const drops = of("traînée axiale seule").filter(({ quantity }) => quantity === "T_A − T_B");
    expect(drops.map(({ expected }) => expected)).toEqual([
      expect.closeTo(29.4294, 10),
      expect.closeTo(-29.4294, 10),
    ]);
  });

  it("holds the closed forms to their own bar, and §15 to the solved-scalars tier", () => {
    const drag = one("traînée normale seule", "T_A");
    expect(drag.bar).toBeCloseTo(2000 * CLOSED_FORM_BAR, 15);
    const z1 = of("§15 sans vent").find(
      ({ subject, quantity }) => subject === "Z1" && quantity === "H",
    )!;
    expect(z1.expected).toBe(1423.94);
    expect(z1.bar).toBeCloseTo(1423.94 * 4e-6, 12);
  });

  it("tilts Z1's catenary by atan(4/3): 3/5 of its sag down, 4/5 sideways", () => {
    expect(one("charge uniforme", "flèche").expected).toBeCloseTo(0.6 * 4.39987, 12);
    expect(one("charge uniforme", "déport").expected).toBeCloseTo(0.8 * 4.39987, 12);
  });

  it("mirrors the déport and keeps the tensions", () => {
    const sway = one("miroir", "déport");
    expect(Math.abs(sway.expected)).toBeGreaterThan(0.1);
    expect(sway.found).toBeCloseTo(sway.expected, 6);
  });

  describe("a control the matrix gives no case to fails — it is never left out", () => {
    const family = (rows: readonly Row[], name: ControlFamily) =>
      runControls(rows).filter((control) => control.family === name);

    it("takes the mirror on the row with the most to mirror, picked by what it is", () => {
      // The largest lift with the largest axial drag; a rider, inclined anchors, a wind that is
      // also axial, and of those the strongest crosswind: 20 m/s at 45°, on the first line.
      const subject = mirrorSubject(fixed)!;
      expect(subject.variant.aero).toMatchObject({ lift: 0.5, axial: 0.1 });
      expect(subject.base.id).toBe("acier-12|incline|passager|oblique-20");
      expect(of("miroir")[0].subject).toBe("acier-12|incline|passager|oblique-20, NLA-b+0.5-0.1");
    });

    it("fails the mirror's four quantities when no row has both a lift and a crosswind", () => {
      const calm = fixed.filter((row) => row.base.wind.speed === 0);
      expect(mirrorSubject(calm)).toBeNull();
      const mirror = family(calm, "miroir");
      expect(mirror.map(({ quantity }) => quantity)).toEqual(["T_A", "T_max", "flèche", "déport"]);
      expect(mirror.map(({ pass }) => pass)).toEqual([false, false, false, false]);
      expect(mirror.every(({ found }) => Number.isNaN(found))).toBe(true);
    });

    it("fails the mirror when its row has no equilibrium", () => {
      const subject = mirrorSubject(fixed)!;
      const broken = fixed.map((row) =>
        row === subject ? { ...row, status: "non convergé" as const, outputs: null } : row,
      );
      const mirror = family(broken, "miroir");
      expect(mirror).toHaveLength(4);
      expect(mirror.some(({ pass }) => pass)).toBe(false);
      expect(mirror[0].subject).toContain("non convergé");
    });

    it("fails the return to the plane engine when the matrix has no calm case", () => {
      const windy = fixed.filter((row) => row.base.wind.speed > 0);
      for (const name of ["moteur plan sans vent", "variantes sans vent"] as const) {
        const rows = family(windy, name);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.some(({ pass }) => pass)).toBe(false);
      }
    });
  });
});

describe("matrixHealth", () => {
  it("counts every status and keeps the worst residual of the rows that have one", () => {
    // One base case under its reference: the rest of the matrix has nothing to say here.
    const [base] = runFixedLength(baseCases().slice(0, 1));
    const failed: Row = {
      ...base,
      status: "non convergé",
      outputs: null,
      residuals: null,
      refinement: null,
    };
    const loose: Row = {
      ...base,
      status: "bilan hors tolérance",
      residuals: { closure: 1e-7, force: 3e-5, moment: 0.3, jump: 0, continuity: 0 },
    };
    const health = matrixHealth([base, failed, loose]);
    expect(health.rows).toBe(3);
    expect(health.statuses.ok).toBe(1);
    expect(health.statuses["non convergé"]).toBe(1);
    expect(health.statuses["bilan hors tolérance"]).toBe(1);
    expect(health.worst.force).toBe(3e-5);
    // 0,3 N·m over the 150 m chord of the first case.
    expect(health.worst.momentPerMetre).toBeCloseTo(0.002, 12);
  });
});
