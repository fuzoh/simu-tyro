import { describe, expect, it } from "vitest";

import {
  baseCases,
  COEFFICIENT_SOURCES,
  COEFFICIENTS,
  GEOMETRIES,
  GROUND,
  groundOf,
  LINES,
  LOAD_STATES,
  REFERENCE_VARIANT,
  riderForce,
  VARIANTS,
  WINDS,
} from "./cases.ts";

const line = (id: string) => {
  const found = LINES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no line ${id}`);
  return found;
};

describe("LINES — every property is cited arithmetic, none is invented", () => {
  it("the steel line is §13.1's 12 mm 6×19 IWRC, 1770", () => {
    const steel = line("acier-12");
    // μ = 0,3795 × 12² / 100 = 0,54648 kg/m; w = μ·g = 0,54648 × 9,81.
    expect(steel.material.w).toBeCloseTo(0.54648 * 9.81, 9);
    // EA = 115 GPa × 0,4165 × 144 mm² = 6 897 240 N.
    expect(steel.material.EA).toBeCloseTo(6_897_240, 3);
    expect(steel.d).toBe(0.012);
    expect(steel.carryingMembers).toBe(1);
  });

  it("the textile line is the dated Courant Bandit sheet, its stiffness arithmetic on it", () => {
    const rope = line("corde-bandit-11");
    // 73 g/m × 9,81.
    expect(rope.material.w).toBeCloseTo(0.073 * 9.81, 9);
    // EA = k·MBL = 1,27 × 31 000 N.
    expect(rope.material.EA).toBeCloseTo(39_370, 6);
    expect(rope.d).toBe(0.011);
    expect(rope.carryingMembers).toBe(2);
  });

  it("names a provenance and a source for every input, and calls no textile figure measured but the pose", () => {
    const inputs = LINES.flatMap((candidate) => candidate.inputs);
    expect(inputs.every(({ source }) => source.length > 10)).toBe(true);
    const measured = line("corde-bandit-11").inputs.filter(
      ({ provenance }) => provenance === "mesurée",
    );
    expect(measured.map(({ name }) => name)).toEqual(["tension de pose"]);
  });
});

describe("the rider — one prescribed vector, the same in every model", () => {
  it("is its weight alone: 120 kg × 9,81 on one member, half of it on each of two", () => {
    expect(riderForce(line("acier-12"))).toEqual([0, 0, -1177.2]);
    expect(riderForce(line("corde-bandit-11"))).toEqual([0, 0, -588.6]);
  });
});

describe("the ground", () => {
  it("is a straight line between the anchor bases, 20 m under each", () => {
    const [level, inclined] = GEOMETRIES;
    expect([...groundOf(level).zs]).toEqual([-20, -20]);
    expect([...groundOf(inclined).zs]).toEqual([-20, -38]);
    expect([...groundOf(inclined).xs]).toEqual([0, 150]);
    expect(GROUND.gabarit).toBe(2.1);
  });
});

describe("WINDS — none, across, oblique, almost parallel", () => {
  const byId = (id: string) => WINDS.find((wind) => wind.id === id)!.components;

  it("starts with no wind", () => {
    expect(WINDS[0].components).toEqual({ along: 0, across: 0 });
    expect(WINDS).toHaveLength(9);
  });

  it("a crosswind has no component along the line and blows from the right", () => {
    expect(byId("travers-20")).toEqual({ along: 0, across: 20 });
  });

  it("an oblique wind is a head wind at 45°", () => {
    const { along, across } = byId("oblique-10");
    expect(along).toBeCloseTo(-10 / Math.SQRT2, 12);
    expect(across).toBeCloseTo(10 / Math.SQRT2, 12);
  });

  it("the two almost parallel winds are 5° off the line, one from each end", () => {
    const head = byId("quasi-face-20");
    const tail = byId("quasi-dos-20");
    // sin 5° = 0,0871557…, cos 5° = 0,9961947…
    expect(head.along).toBeCloseTo(-20 * 0.9961946980917455, 12);
    expect(tail.along).toBeCloseTo(20 * 0.9961946980917455, 12);
    expect(head.across).toBeCloseTo(20 * 0.08715574274765817, 12);
    expect(tail.across).toBeCloseTo(head.across, 12);
  });
});

describe("VARIANTS — a finite matrix of probes around one reference", () => {
  it("has the reference first: normal drag alone, C_D⊥ = 1,2", () => {
    expect(REFERENCE_VARIANT).toBe(VARIANTS[0]);
    expect(REFERENCE_VARIANT.aero).toEqual({ normal: 1.2, lift: 0, liftLaw: "binormal", axial: 0 });
  });

  it("holds 27 variants with distinct identifiers, every one on the same C_D⊥", () => {
    // 1 + 2 laws × 3 magnitudes × 2 signs + 2 axial + 3 magnitudes × 2 signs × 2 axial.
    expect(VARIANTS).toHaveLength(1 + 12 + 2 + 12);
    expect(new Set(VARIANTS.map(({ id }) => id)).size).toBe(VARIANTS.length);
    expect(VARIANTS.every(({ aero }) => aero.normal === COEFFICIENTS.normal)).toBe(true);
  });

  it("runs every lift magnitude with both signs under both laws", () => {
    for (const law of COEFFICIENTS.liftLaws) {
      for (const magnitude of COEFFICIENTS.liftMagnitudes) {
        for (const lift of [magnitude, -magnitude]) {
          const found = VARIANTS.filter(
            ({ model, aero }) =>
              model === "normale+portance" && aero.liftLaw === law && aero.lift === lift,
          );
          expect(found).toHaveLength(1);
          expect(found[0].aero.axial).toBe(0);
        }
      }
    }
  });

  it("names the four models of the brief", () => {
    expect(new Set(VARIANTS.map(({ model }) => model))).toEqual(
      new Set(["normale", "normale+portance", "normale+axiale", "normale+portance+axiale"]),
    );
  });

  it("calls every lift and axial coefficient a probe, and C_D⊥ not transferable", () => {
    const classOf = (name: string) =>
      COEFFICIENT_SOURCES.find((source) => source.name === name)?.provenance;
    expect(classOf("C_L")).toBe("sonde de sensibilité");
    expect(classOf("C_t")).toBe("sonde de sensibilité");
    expect(classOf("C_D⊥")).toBe("publiée non transférable");
  });
});

describe("baseCases", () => {
  it("crosses two lines, two geometries, two load states and nine winds", () => {
    const cases = baseCases();
    expect(cases).toHaveLength(
      LINES.length * GEOMETRIES.length * LOAD_STATES.length * WINDS.length,
    );
    expect(cases).toHaveLength(72);
    expect(new Set(cases.map(({ id }) => id)).size).toBe(72);
    expect(cases[0].id).toBe("acier-12|niveau|vide|calme");
  });
});
