import { describe, expect, it } from "vitest";

import {
  baseCases,
  COEFFICIENTS,
  coefficientSources,
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
  scenarioSources,
  VARIANTS,
  variantsOf,
  windCase,
  WINDS,
} from "./cases.ts";

/** The installation of the matrix as delivered. */
const DELIVERED = scenarioSources({ geometries: GEOMETRIES, loads: LOAD_STATES, winds: WINDS });

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

  it("names a member as the glossary does: a ligne, never a « brin » nor a « montage »", () => {
    // GLOSSARY.md, Brins porteurs — the row's name is the glossary's term; what it avoids is
    // « brin » for one member (a brin is a strand inside a câble) and « montage » for the rig.
    const printed = [
      ...LINES.flatMap((candidate) => candidate.inputs),
      ...DELIVERED,
      ...coefficientSources(VARIANTS),
    ].flatMap(({ value, source }) => [value, source]);
    for (const text of printed) {
      expect(text).not.toMatch(/\bbrin\b/i);
      expect(text).not.toMatch(/montage/i);
    }
    const members = line("corde-bandit-11").inputs.find(({ name }) => name === "brins porteurs")!;
    expect(members.value).toBe("2 ; la ligne calculée porte la moitié du poids du passager");
    expect(members.source).toContain("les deux lignes de l'essai du 2026-11-01");
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
    const inputs = [...LINES.flatMap((candidate) => candidate.inputs), ...DELIVERED];
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
    const wind = DELIVERED.find(({ name }) => name === "vent")!;
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
      coefficientSources(VARIANTS).find((source) => source.name === name)?.provenance;
    expect(classOf("C_L")).toBe("sonde de sensibilité");
    expect(classOf("C_t")).toBe("sonde de sensibilité");
    expect(classOf("C_D⊥")).toBe("publiée non transférable");
  });
});

describe("the provenance lines state the matrix that ran, not the one delivered", () => {
  const valueOf = (sources: ReturnType<typeof coefficientSources>, name: string) =>
    sources.find((source) => source.name === name)?.value;

  it("coefficientSources: the delivered probes, zero first, the lift with both signs", () => {
    const delivered = coefficientSources(VARIANTS);
    expect(valueOf(delivered, "C_D⊥")).toBe("1,2");
    expect(valueOf(delivered, "C_L")).toBe("0 ; ±0,05 ; ±0,2 ; ±0,5");
    expect(valueOf(delivered, "C_t")).toBe("0 ; 0,02 ; 0,1");
    expect(valueOf(delivered, "ρ")).toBe("1,225 kg/m³");
  });

  it("coefficientSources: adjusted probes are stated as written, in the order they were given", () => {
    const adjusted = coefficientSources(
      variantsOf({ ...COEFFICIENTS, normal: 1.1, liftMagnitudes: [0.3, 0.1], axial: [0.05] }),
    );
    expect(valueOf(adjusted, "C_D⊥")).toBe("1,1");
    expect(valueOf(adjusted, "C_L")).toBe("0 ; ±0,3 ; ±0,1");
    expect(valueOf(adjusted, "C_t")).toBe("0 ; 0,05");
  });

  it("scenarioSources: the delivered installation", () => {
    expect(valueOf(DELIVERED, "portée")).toBe("150 m");
    expect(valueOf(DELIVERED, "dénivelé")).toBe("0 m ; −18 m");
    expect(valueOf(DELIVERED, "gabarit")).toBe("2,1 m");
    expect(valueOf(DELIVERED, "passager")).toContain("120 kg");
  });

  it("scenarioSources: one level geometry, no rider, one wind — and nothing that did not run", () => {
    const [level] = GEOMETRIES;
    const [unloaded] = LOAD_STATES;
    const wind = windCase(15, { id: "quasi-face", name: "presque de face", from: 10 });
    const ran = scenarioSources({ geometries: [level], loads: [unloaded], winds: [wind] });
    expect(valueOf(ran, "dénivelé")).toBe("0 m");
    expect(valueOf(ran, "vent")).toBe("uniforme et horizontal ; 15 m/s ; de 10°");
    expect(ran.map(({ name }) => name)).toEqual(["portée", "dénivelé", "sol", "gabarit", "vent"]);
    // Without a wind that blows there is no direction to state.
    const calm = scenarioSources({ geometries: [level], loads: [unloaded], winds: [WINDS[0]] });
    expect(valueOf(calm, "vent")).toBe("uniforme et horizontal ; 0 m/s");
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
