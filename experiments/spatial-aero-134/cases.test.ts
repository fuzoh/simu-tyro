import { describe, expect, it } from "vitest";

import {
  baseCases,
  COEFFICIENT_SOURCES,
  COEFFICIENTS,
  french,
  GEOMETRIES,
  GROUND,
  groundOf,
  isReference,
  largestProbes,
  LINES,
  list,
  LOAD_STATES,
  REFERENCE_VARIANT,
  riderForce,
  SCENARIO_SOURCES,
  VARIANTS,
  variantsOf,
  windCase,
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

  it("names a provenance and a source for every input", () => {
    const inputs = LINES.flatMap((candidate) => candidate.inputs);
    expect(inputs.every(({ source }) => source.length > 10)).toBe(true);
  });

  it("files as product data only what the dated sheet states", () => {
    const classOf = (name: string) =>
      line("corde-bandit-11").inputs.find((input) => input.name === name)?.provenance;
    expect(classOf("diamètre")).toBe("fiche produit");
    expect(classOf("masse linéique")).toBe("fiche produit");
    expect(classOf("charge de rupture")).toBe("fiche produit");
    // k·MBL is arithmetic on the sheet's elongation, which Courant does not state as a stiffness.
    expect(classOf("raideur axiale")).toBe("dérivée de la fiche, non confirmée");
  });

  it("calls no input measured: a pose read on another span is a scenario", () => {
    const inputs = [...LINES.flatMap((candidate) => candidate.inputs), ...SCENARIO_SOURCES];
    expect(inputs.filter(({ provenance }) => provenance === "mesurée")).toEqual([]);
    const pose = line("corde-bandit-11").inputs.find(({ name }) => name === "tension de pose")!;
    expect(pose.provenance).toBe("scénario");
    expect(pose.source).toContain("435 m");
  });
});

describe("how the report prints a value of the matrix", () => {
  it("french: the number as written, with a decimal comma and a true minus", () => {
    expect(french(0.05)).toBe("0,05");
    expect(french(0.5)).toBe("0,5");
    expect(french(-18)).toBe("−18");
    expect(french(175)).toBe("175");
  });

  it("list: a French enumeration", () => {
    expect(list([])).toBe("");
    expect(list(["90°"])).toBe("90°");
    expect(list(["90°", "45°"])).toBe("90° et 45°");
    expect(list(["90°", "45°", "5°"])).toBe("90°, 45° et 5°");
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

  it("names a wind after its speed and its direction, the angle as it is set", () => {
    const wind = windCase(15, { id: "quasi-face", name: "presque de face", from: 10 });
    expect(wind.id).toBe("quasi-face-15");
    expect(wind.label).toBe("15 m/s presque de face (10°)");
    // sin 10° = 0,173648…, cos 10° = 0,984807…
    expect(wind.components.across).toBeCloseTo(15 * 0.17364817766693033, 12);
    expect(wind.components.along).toBeCloseTo(-15 * 0.984807753012208, 12);
    expect(WINDS.map(({ label }) => label).slice(0, 5)).toEqual([
      "sans vent",
      "10 m/s de travers (90°)",
      "10 m/s oblique de face (45°)",
      "10 m/s presque de face (5°)",
      "10 m/s presque de dos (175°)",
    ]);
  });

  it("states the winds of the installation from the list it runs", () => {
    const wind = SCENARIO_SOURCES.find(({ name }) => name === "vent")!;
    expect(wind.value).toBe("uniforme et horizontal ; 0, 10 et 20 m/s ; de 90°, 45°, 5° et 175°");
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

  it("names each variant after its model and its coefficients", () => {
    expect(VARIANTS.map(({ id }) => id)).toEqual([
      "N",
      ...["b", "y"].flatMap((law) =>
        ["+0.05", "-0.05", "+0.2", "-0.2", "+0.5", "-0.5"].map((lift) => `NL-${law}${lift}`),
      ),
      "NA-0.02",
      "NA-0.1",
      ...["+0.05", "-0.05", "+0.2", "-0.2", "+0.5", "-0.5"].flatMap((lift) => [
        `NLA-b${lift}-0.02`,
        `NLA-b${lift}-0.1`,
      ]),
    ]);
    expect(VARIANTS.filter(isReference)).toEqual([REFERENCE_VARIANT]);
  });

  it("builds another finite matrix from adjusted probes, the first law crossed with the axial drag", () => {
    const adjusted = variantsOf({
      normal: 1.1,
      liftMagnitudes: [0.3, 0.1],
      liftLaws: ["yaw-odd"],
      axial: [0.05],
    });
    expect(adjusted.map(({ id }) => id)).toEqual([
      "N",
      "NL-y+0.3",
      "NL-y-0.3",
      "NL-y+0.1",
      "NL-y-0.1",
      "NA-0.05",
      "NLA-y+0.3-0.05",
      "NLA-y-0.3-0.05",
      "NLA-y+0.1-0.05",
      "NLA-y-0.1-0.05",
    ]);
    expect(adjusted.every(({ aero }) => aero.normal === 1.1)).toBe(true);
    expect(adjusted.at(-1)!.aero).toEqual({
      normal: 1.1,
      lift: -0.1,
      liftLaw: "yaw-odd",
      axial: 0.05,
    });
  });

  it("refuses probes the four models cannot be built from", () => {
    const adjusted = (patch: Partial<Parameters<typeof variantsOf>[0]>) => () =>
      variantsOf({ ...COEFFICIENTS, ...patch });
    expect(adjusted({ axial: [] })).toThrow("COEFFICIENTS.axial");
    expect(adjusted({ liftMagnitudes: [] })).toThrow("COEFFICIENTS.liftMagnitudes");
    // Zero is the reference and the signs are the matrix's own: a probe is a positive size.
    expect(adjusted({ liftMagnitudes: [0, 0.2] })).toThrow("COEFFICIENTS.liftMagnitudes");
    expect(adjusted({ liftMagnitudes: [-0.2] })).toThrow("COEFFICIENTS.liftMagnitudes");
    expect(adjusted({ axial: [0.1, 0.1] })).toThrow("COEFFICIENTS.axial");
    expect(adjusted({ liftLaws: [] })).toThrow("COEFFICIENTS.liftLaws");
  });

  it("picks the largest probe of each added force by its size, wherever it stands in the list", () => {
    expect(largestProbes(VARIANTS).map(({ id }) => id)).toEqual([
      "NL-b+0.5",
      "NL-b-0.5",
      "NL-y+0.5",
      "NL-y-0.5",
      "NA-0.1",
    ]);
    const descending = variantsOf({
      ...COEFFICIENTS,
      liftMagnitudes: [0.4, 0.1],
      axial: [0.08, 0.02],
    });
    expect(largestProbes(descending).map(({ id }) => id)).toEqual([
      "NL-b+0.4",
      "NL-b-0.4",
      "NL-y+0.4",
      "NL-y-0.4",
      "NA-0.08",
    ]);
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
