import { afterEach, describe, expect, it, vi } from "vitest";

import type { ControlRow } from "./controls.ts";
import type { Outputs, Row } from "./run.ts";

import { baseCase, baseCases, COEFFICIENTS, VARIANTS, variantsOf, windCase } from "./cases.ts";
import {
  buildReport,
  clearanceOffset,
  controlsCsv,
  differenceCell,
  extreme,
  fr,
  inputsCsv,
  rowsCsv,
  scientific,
  signed,
  table,
} from "./report.ts";
import { runFixedLength, runPoseTension } from "./run.ts";

describe("numbers, the French way", () => {
  it("fr: a decimal comma, a true minus, no sign on a rounded zero", () => {
    expect(fr(1234.567, 1)).toBe("1234,6");
    expect(fr(-0.25, 2)).toBe("−0,25");
    expect(fr(-0.0004, 3)).toBe("0,000");
    expect(fr(Number.NaN, 2)).toBe("—");
  });

  it("signed: a plus on what is above zero once rounded", () => {
    expect(signed(0.25, 2)).toBe("+0,25");
    expect(signed(-0.25, 2)).toBe("−0,25");
    expect(signed(0.0004, 3)).toBe("0,000");
  });

  it("scientific: mantissa and a power of ten", () => {
    expect(scientific(1.6e-9)).toBe("1,6×10⁻⁹");
    expect(scientific(1e-6)).toBe("1,0×10⁻⁶");
    expect(scientific(-2.34e-4)).toBe("−2,3×10⁻⁴");
    expect(scientific(0)).toBe("0");
  });
});

describe("differenceCell — no percentage of nothing, no small number for nothing", () => {
  it("prints the absolute difference and, where it exists, the relative one", () => {
    expect(differenceCell({ absolute: 578.4, relative: 0.186, resolved: true }, 1)).toBe(
      "+578,4 (+18,6 %)",
    );
    expect(differenceCell({ absolute: -0.325, relative: null, resolved: true }, 3)).toBe("−0,325");
  });

  it("says a failure is a failure and an unresolved difference is under the floor", () => {
    expect(differenceCell(null, 1)).toBe("échec");
    expect(differenceCell({ absolute: 5e-5, relative: 1e-5, resolved: false }, 3)).toBe(
      "< plancher",
    );
  });

  it("does not print a resolved difference as zero, nor a tiny share as 0,0 %", () => {
    expect(differenceCell({ absolute: 2.3e-4, relative: 4e-5, resolved: true }, 3)).toBe(
      "2,3×10⁻⁴ (< 0,1 %)",
    );
  });

  it("prints a norm without a sign", () => {
    expect(differenceCell({ absolute: 581, relative: 0.186, resolved: true }, 1, true)).toBe(
      "581,0 (18,6 %)",
    );
  });
});

describe("table", () => {
  it("escapes a pipe inside a cell", () => {
    expect(table(["a", "|f_n|"], [["1", "2"]])).toBe("| a | \\|f_n\\| |\n| --- | --- |\n| 1 | 2 |");
  });
});

/** One base case of each comparison is enough to build every section. */
const part = baseCases().filter((base) => base.id === "acier-12|niveau|vide|travers-20");
const fixed = runFixedLength(part);
const pose = runPoseTension({
  lines: [part[0].line],
  geometries: [part[0].geometry],
  winds: [part[0].wind],
});
const passing: ControlRow = {
  family: "§15 sans vent",
  subject: "Z1",
  quantity: "H",
  unit: "N",
  expected: 1423.94,
  found: 1423.944,
  bar: 0.0057,
  pass: true,
  source: "simulation-theory.md §15 Z1",
};

describe("extreme", () => {
  it("finds the difference of greatest magnitude and the row it is on, the reference left out", () => {
    const found = extreme(fixed, "Tmax", () => true)!;
    expect(found.row.variant.id).not.toBe("N");
    for (const row of fixed.slice(1)) {
      const gap = Math.abs(row.outputs!.Tmax - fixed[0].outputs!.Tmax);
      expect(Math.abs(found.difference.absolute)).toBeGreaterThanOrEqual(gap);
    }
  });

  it("has nothing to give when no row is kept", () => {
    expect(extreme(fixed, "Tmax", () => false)).toBeNull();
  });
});

describe("buildReport — controls gate the conclusions (§18.6)", () => {
  it("prints both comparisons, apart, when every control passes", () => {
    const report = buildReport({ fixed, pose, controls: [passing] });
    expect(report).toContain("**Tous les contrôles passent.**");
    expect(report).toContain("## 6. Comparaison principale — longueur non tendue identique");
    expect(report).toContain("## 7. Comparaison séparée — tension de pose identique");
    expect(report).toContain("## 8. Lecture");
    expect(report).not.toContain("Diagnostic");
    expect(report.indexOf("## 4. Contrôles")).toBeLessThan(report.indexOf("## 6. Comparaison"));
  });

  it("stops at the diagnostic, with no comparison, when one control fails", () => {
    const failing: ControlRow = { ...passing, found: 1500, pass: false };
    const report = buildReport({ fixed, pose, controls: [passing, failing] });
    expect(report).toContain("## 5. Diagnostic — pas de conclusion sur la physique");
    expect(report).toContain("**Grandeurs en échec :**");
    expect(report).not.toContain("Comparaison principale");
    expect(report).not.toContain("## 8. Lecture");
  });

  it("lists a failed row as a failure, and gives it no difference", () => {
    const broken = fixed.map((row, i) =>
      i === 3
        ? { ...row, status: "non convergé" as const, detail: "fermeture 7.1e+1 m", outputs: null }
        : row,
    );
    const report = buildReport({ fixed: broken, pose, controls: [passing] });
    expect(report).toContain("**Cas en échec**");
    expect(report).toContain("fermeture 7.1e+1 m");
    expect(report).not.toContain("Aucun cas en échec");
  });

  it("goes on past a failed row, and says it is left out rather than that everything passes", () => {
    const fail = (rows: readonly Row[], indices: readonly number[]): Row[] =>
      rows.map((row, i) =>
        indices.includes(i) ? { ...row, status: "raffinement hors tolérance" as const } : row,
      );
    const one = buildReport({ fixed: fail(fixed, [3]), pose, controls: [passing] });
    expect(one).toContain(
      "**Tous les contrôles du prototype passent ; 1 ligne en échec, listée ci-dessus, est exclue des écarts.**",
    );
    expect(one).not.toContain("**Tous les contrôles passent.**");
    // A row is not a control: the comparison is still printed, without that row.
    expect(one).toContain("## 6. Comparaison principale — longueur non tendue identique");
    expect(one).not.toContain("Diagnostic");
    // Rows of both comparisons are counted together.
    const three = buildReport({
      fixed: fail(fixed, [3, 4]),
      pose: fail(pose, [7]),
      controls: [passing],
    });
    expect(three).toContain(
      "**Tous les contrôles du prototype passent ; 3 lignes en échec, listées ci-dessus, sont exclues des écarts.**",
    );
  });

  it("calls the probes probes and adopts nothing", () => {
    const report = buildReport({ fixed, pose, controls: [passing] });
    expect(report).toContain("sonde de sensibilité");
    expect(report).toContain("publiée non transférable");
    expect(report).toContain("Aucun n'est adopté");
    expect(report).toContain("Décision de production encore ouverte");
  });

  it("names the straight span between the anchors as the glossary does: ligne A–B", () => {
    const report = buildReport({ fixed, pose, controls: [passing] });
    expect(report).toContain("N·m par mètre de ligne A–B");
    expect(report).toContain("au-dessus** de la ligne A–B");
    // GLOSSARY.md, Span — avoided: « corde » for the chord (a corde is a line of the matrix) and
    // « droite A–B ».
    expect(report).not.toContain("mètre de corde");
    expect(report).not.toContain("droite A–B");
  });

  it("names a member of a line as the glossary does: a ligne, not a « brin » nor a « montage »", () => {
    // The textile line is the one with two Brins porteurs: one of its cases, under the reference.
    const rope = baseCases().filter((base) => base.id === "corde-bandit-11|niveau|vide|travers-20");
    const report = buildReport({
      fixed: [...fixed, ...runFixedLength(rope, VARIANTS.slice(0, 1))],
      pose,
      controls: [passing],
    });
    expect(report).toContain(
      "| brins porteurs | 2 ; la ligne calculée porte la moitié du poids du passager | convention |",
    );
    // GLOSSARY.md, Brins porteurs — avoided: « brin » for one member, and « montage ».
    expect(report).not.toMatch(/\bbrin\b/i);
    expect(report).not.toMatch(/montage/i);
  });

  describe("under another clock", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("carries no date and no duration: the same rows give the same report another day", () => {
      vi.useFakeTimers({ now: new Date("2026-11-14T08:00:00Z") });
      const today = buildReport({ fixed, pose, controls: [passing] });
      // Four years and some hours later, on a clock that has also run for longer.
      vi.setSystemTime(new Date("2030-02-03T17:45:12Z"));
      vi.advanceTimersByTime(90_000);
      expect(buildReport({ fixed, pose, controls: [passing] })).toBe(today);
    });
  });
});

/** One section of the report: from its heading to the next heading of its level or above. */
function section(report: string, heading: string): string {
  const from = report.indexOf(`\n${heading}`);
  if (from === -1) throw new Error(`no « ${heading} » in the report`);
  const level = heading.indexOf(" ");
  const rest = report.slice(from + 1 + heading.length);
  const next = rest.search(new RegExp(`\\n#{1,${level}} `));
  return heading + (next === -1 ? rest : rest.slice(0, next));
}

describe("buildReport — an adjusted matrix is reported as it was run", () => {
  // Another C_D⊥, probes listed largest first, one axial drag, and a near-head wind 10° off the
  // line instead of 5°.
  const variants = variantsOf({
    ...COEFFICIENTS,
    normal: 1.1,
    liftMagnitudes: [0.3, 0.1],
    axial: [0.05],
  });
  const { line, geometry, load } = part[0];
  const wind = windCase(20, { id: "quasi-face", name: "presque de face", from: 10 });
  const adjusted = {
    fixed: runFixedLength([baseCase(line, geometry, load, wind)], variants),
    pose: runPoseTension({ lines: [line], geometries: [geometry], winds: [wind], variants }),
    controls: [passing],
  };
  const report = buildReport(adjusted);

  it("prints each coefficient as it was written, not rounded to a column", () => {
    expect(report).toContain("|f_a\\|, sonde C_t = 0,05");
    expect(report).toContain("|f_L\\| binormale, sonde C_L = 0,3");
    expect(report).toContain("traînée axiale, C_t = 0,05");
    expect(report).toContain("portance binormale ±0,3 et axiale 0,05");
    expect(report).toContain("plus petites sondes (C_L = ±0,1, C_t = 0,05)");
    expect(report).toContain("|f_n\\|, C_D⊥ = 1,1");
    expect(report).toContain("`C_D⊥ = 1,1` est lui-même un ordre de grandeur");
    // Nothing of the default matrix is left: neither its probes nor their rounding.
    expect(report).not.toMatch(/C_t = 0,1\b/);
    expect(report).not.toMatch(/C_L = ±?0,5\b/);
    expect(report).not.toContain("C_D⊥ = 1,2");
  });

  it("states in section 3 the coefficients and the installation that were run", () => {
    const coefficients = section(report, "### Coefficients aérodynamiques");
    expect(coefficients).toContain("| C_D⊥ | 1,1 | publiée non transférable |");
    expect(coefficients).toContain("| C_L | 0 ; ±0,3 ; ±0,1 | sonde de sensibilité |");
    expect(coefficients).toContain("| C_t | 0 ; 0,05 | sonde de sensibilité |");
    const installation = section(report, "### Installation");
    expect(installation).toContain("| portée | 150 m |");
    // One level geometry and one wind: neither the −18 m nor the winds of the delivered matrix.
    expect(installation).toContain("| dénivelé | 0 m |");
    expect(installation).toContain("| vent | uniforme et horizontal ; 20 m/s ; de 10° |");
    // The textile line was not run: its inputs are not listed.
    const inputs = section(report, "## 3. Entrées et provenance");
    expect(inputs).toContain("### Câble acier 12 mm");
    expect(inputs).not.toContain("Courant Bandit");
  });

  it("shows the largest probes by their size, wherever they stand in the list", () => {
    const byWind = section(report, "### Écarts vent par vent, aux plus grandes sondes");
    expect(byWind).toContain("portance binormale, C_L = ±0,3");
    expect(byWind).toContain("portance impaire en lacet, C_L = ±0,3");
    expect(byWind).not.toContain("C_L = ±0,1");
  });

  it("reports the length of each model for the probes that were run", () => {
    const lengths = section(report, "### Longueur de chaque modèle");
    for (const id of ["NL-b+0.3", "NL-b-0.3", "NL-y+0.3", "NL-y-0.3", "NA-0.05"]) {
      expect(lengths).toContain(`ΔL₀ \`${id}\` (mm)`);
    }
    // One wind, five differences of length, none of them a failure.
    const [row] = lengths.split("\n").filter((text) => text.startsWith("| acier-12 |"));
    expect(row.split("|").slice(6, 11)).toHaveLength(5);
    expect(row).not.toContain("échec");
    expect(row).not.toContain("—");
  });

  it("tabulates the wind that was run, and no wind that was not", () => {
    const byWind = section(report, "### Écarts vent par vent, aux plus grandes sondes");
    expect(byWind).toContain("| 20 m/s presque de face (10°) | portance binormale, C_L = ±0,3 |");
    expect(byWind).not.toContain("(5°)");
    expect(byWind).not.toContain("de travers");
    expect(byWind).not.toContain("échec");
    expect(report).toContain("| Vents | `quasi-face-20` |");
  });

  it("says of the two orientation laws only what the laws it ran allow", () => {
    expect(report).toContain("sous deux lois de dépendance à l'angle de lacet");
    expect(report).toContain("les deux lois testées répondent différemment");
    const oneLaw = variantsOf({ ...COEFFICIENTS, liftLaws: ["yaw-odd"] });
    const alone = buildReport({
      fixed: runFixedLength(part, oneLaw),
      pose: runPoseTension({
        lines: [line],
        geometries: [geometry],
        winds: [wind],
        variants: oneLaw,
      }),
      controls: [passing],
    });
    expect(alone).toContain("sous une seule des deux lois de dépendance à l'angle de lacet");
    expect(alone).toContain(
      "Une seule des deux lois d'orientation de §18.3 est jouée ici — la loi impaire en lacet",
    );
    expect(alone).not.toContain("les deux lois testées");
    expect(alone).not.toContain("portance binormale");
    expect(alone).not.toContain("n'est pas recroisée");
  });

  it("counts the matrix it was given", () => {
    // 1 reference + 2 laws × 2 magnitudes × 2 signs + 1 axial + 2 magnitudes × 2 signs × 1 axial;
    // the separate comparison runs both load states.
    expect(variants).toHaveLength(14);
    expect(report).toContain(
      "Soit 1 cas de base, chacun sous 14 variantes de coefficients : 14 lignes dans la comparaison principale, 28 dans la comparaison séparée.",
    );
  });
});

describe("buildReport — the length of each model is a difference like any other (§18.6)", () => {
  // The unloaded row of one model, or of the reference, with something injected on it.
  const withUnloaded = (id: string, patch: Partial<Row>): Row[] =>
    pose.map((row) =>
      row.base.load.id === "vide" && row.variant.id === id ? { ...row, ...patch } : row,
    );
  const reference = pose.find((row) => row.base.load.id === "vide" && row.variant.id === "N")!;
  /** The five ΔL₀ cells of the one wind run: NL-b+0.5, NL-b-0.5, NL-y+0.5, NL-y-0.5, NA-0.1. */
  const shifts = (rows: readonly Row[]): string[] => {
    const lengths = section(
      buildReport({ fixed, pose: rows, controls: [passing] }),
      "### Longueur de chaque modèle",
    );
    const [line] = lengths.split("\n").filter((text) => text.startsWith("| acier-12 |"));
    return line
      .split("|")
      .map((cell) => cell.trim())
      .slice(6, 11);
  };

  it("prints a length difference above the floor in millimetres, with its sign", () => {
    expect(shifts(withUnloaded("NA-0.1", { L0: reference.L0 + 2e-4 }))[4]).toBe("+0,2");
    expect(shifts(withUnloaded("NA-0.1", { L0: reference.L0 - 0.0123 }))[4]).toBe("−12,3");
  });

  it("writes no number for a length difference under the 0,1 mm floor", () => {
    expect(shifts(withUnloaded("NA-0.1", { L0: reference.L0 + 5e-5 }))[4]).toBe("< plancher");
    expect(shifts(withUnloaded("NA-0.1", { L0: reference.L0 - 5e-5 }))[4]).toBe("< plancher");
  });

  it("gives no difference to a model whose unloaded line failed its checks, its length known", () => {
    const failed = shifts(
      withUnloaded("NL-b+0.5", { status: "raffinement hors tolérance", detail: "écart 2e-5 m" }),
    );
    expect(failed[0]).toBe("échec");
    // The other models keep theirs: a downward lift needs a longer line for the same pose.
    expect(failed[1]).toMatch(/^\+\d+,\d$/);
  });

  it("gives no difference to any model when the reference failed its checks", () => {
    expect(shifts(withUnloaded("N", { status: "bilan hors tolérance" }))).toEqual(
      Array.from({ length: 5 }, () => "échec"),
    );
  });
});

describe("buildReport — a group without a row is not a failure", () => {
  // Two base cases that share neither their speed nor their load state.
  const cases = baseCases().filter(
    ({ id }) =>
      id === "acier-12|niveau|vide|travers-10" || id === "acier-12|niveau|passager|travers-20",
  );
  const sparse = runFixedLength(cases);
  const bySize = section(
    buildReport({ fixed: sparse, pose, controls: [passing] }),
    "### Écarts par taille de sonde",
  );
  const cells = (speed: string, state: string) =>
    bySize
      .split("\n")
      .find((text) => text.startsWith(`| portance binormale, C_L = ±0,5 | ${speed} | ${state} |`))!
      .split(" | ")
      .slice(3, 10);

  it("prints « — » where the matrix holds no case, and figures where it does", () => {
    expect(cells("20 m/s", "vide")).toEqual(["—", "—", "—", "—", "—", "—", "—"]);
    expect(cells("10 m/s", "passager")).toEqual(["—", "—", "—", "—", "—", "—", "—"]);
    expect(cells("10 m/s", "vide").some((cell) => cell === "—" || cell === "échec")).toBe(false);
  });

  it("still prints « échec » for a group whose rows are there and gave no difference", () => {
    const failed = sparse.map((row) =>
      row.base.wind.speed === 10 && row.variant.model !== "normale"
        ? { ...row, status: "non convergé" as const, outputs: null }
        : row,
    );
    const table = section(
      buildReport({ fixed: failed, pose, controls: [passing] }),
      "### Écarts par taille de sonde",
    );
    expect(table).toContain("| portance binormale, C_L = ±0,5 | 10 m/s | vide | échec | échec |");
  });
});

describe("buildReport — the garde on the prescribed ground", () => {
  const moved = (rows: readonly Row[], shift: (row: Row, i: number) => number): Row[] =>
    rows.map((row, i) =>
      row.outputs === null
        ? row
        : { ...row, outputs: { ...row.outputs, clearance: row.outputs.clearance + shift(row, i) } },
    );

  it("says the gabarit clears the ground when every garde is positive", () => {
    const report = buildReport({ fixed, pose, controls: [passing] });
    expect(report).toContain("aucune garde lue ici n'est un contact");
    expect(report).not.toContain("atteint ou traverse le sol prescrit");
  });

  it("says a contact is a contact: a ground 30 m higher is reached by every line", () => {
    const report = buildReport({ fixed: moved(fixed, () => -30), pose, controls: [passing] });
    expect(report).toContain(
      `**le gabarit atteint ou traverse le sol prescrit dans ${fixed.length} lignes sur ${fixed.length + pose.length}**`,
    );
    expect(report).not.toContain("aucune garde lue ici n'est un contact");
    expect(report).toMatch(/Plus petite garde de toute la matrice : −1\d,\d\d m/);
  });

  it("clearanceOffset: garde + flèche is the 20 m of the anchors less the 2,1 m gabarit", () => {
    expect(clearanceOffset(fixed)).toBeCloseTo(17.9, 9);
    // One line over a ground that is not parallel to A–B: the garde no longer mirrors the flèche.
    expect(clearanceOffset(moved(fixed, (_, i) => (i === 4 ? 0.5 : 0)))).toBeNull();
    expect(clearanceOffset([])).toBeNull();
  });

  it("where the garde only mirrors the flèche, says so and prints no percentage of it", () => {
    const report = buildReport({ fixed, pose, controls: [passing] });
    expect(report).toContain("la garde vaut 17,9 m moins la flèche");
    expect(report).toContain("`Δgarde = −Δflèche`");
    const bySize = section(report, "### Écarts par taille de sonde");
    const row = bySize
      .split("\n")
      .find((text) => text.startsWith("| portance binormale, C_L = ±0,5 | 20 m/s | vide |"))!
      .split(" | ");
    // Δflèche keeps its percentage; Δgarde is the same length with the other sign, and bare.
    expect(row[4]).toMatch(/^−\d,\d{3} \(−\d+,\d %\)$/);
    expect(row[7]).toBe(row[4].replace(/ \(.*$/, "").replace("−", "+"));
  });

  it("where it does not, prints the garde like any other difference", () => {
    const uneven = moved(fixed, (row) => (row.variant.model === "normale" ? 0 : 0.5));
    const report = buildReport({ fixed: uneven, pose, controls: [passing] });
    const main = section(report, "## 6. Comparaison principale");
    expect(main).not.toContain("Δgarde = −Δflèche");
    const row = section(report, "### Écarts par taille de sonde")
      .split("\n")
      .find((text) => text.startsWith("| portance binormale, C_L = ±0,5 | 20 m/s | vide |"))!
      .split(" | ");
    expect(row[7]).toMatch(/^\+\d,\d{3} \(\+\d+,\d %\)$/);
  });
});

/**
 * Rows nothing solved, every figure written by hand: one base case under the reference and under
 * one variant of each other model. The differences are round numbers, so that what a cell must
 * print is read off this fixture — never off the report.
 */
const REFERENCE: Outputs = {
  TA: 1000,
  TB: 1250,
  Tmax: 2000,
  HA: 800,
  // Norms 1000 N and 1250 N.
  reactionA: [800, 0, -600],
  reactionB: [-1000, 0, -750],
  sag: 5,
  rise: 0,
  sway: 1,
  combined: 4,
  clearance: 10,
  normalMean: 2,
  normalMax: 2.5,
  liftMean: 0,
  liftMax: 0,
  axialMean: 0,
  axialMax: 0,
};

function hand(id: string, outputs: Partial<Outputs> = {}, patch: Partial<Row> = {}): Row {
  return {
    convention: "L0 fixe",
    base: part[0],
    variant: VARIANTS.find((variant) => variant.id === id)!,
    L0: 150.5,
    status: "ok",
    detail: "",
    outputs: { ...REFERENCE, ...outputs },
    residuals: { closure: 1e-7, force: 2e-7, moment: 3e-5, jump: 4e-8, continuity: 5e-10 },
    refinement: { length: 6e-7, force: 7e-6 },
    iterations: 9,
    ...patch,
  };
}

const HAND: readonly Row[] = [
  hand("N"),
  // The largest lift alone: +100 N on 2000 N, +0,5 m on 5 m of flèche, −0,3 m on 10 m of garde.
  hand("NL-b+0.5", { Tmax: 2100, sag: 5.5, sway: 0.75, combined: 4.8, clearance: 9.7 }),
  // The smallest lift alone: +10 N, +0,05 m, −0,03 m.
  hand("NL-b+0.05", { Tmax: 2010, sag: 5.05, clearance: 9.97 }),
  // The axial drag alone: +300 N, and lengths that move by millimetres — 2, −4, 3 and −1.
  hand("NA-0.1", { Tmax: 2300, sag: 5.002, sway: 0.996, combined: 4.003, clearance: 9.999 }),
];

/** {@link HAND} with the outputs of one variant written anew, or its row patched. */
const handWith = (id: string, outputs: Partial<Outputs>, patch: Partial<Row> = {}): Row[] =>
  HAND.map((row) => (row.variant.id === id ? hand(id, outputs, patch) : row));

describe("buildReport — section 8 states the figures the reading rests on", () => {
  const reading = (rows: readonly Row[]): string =>
    section(buildReport({ fixed: rows, pose, controls: [passing] }), "## 8. Lecture");

  it("gives the axial drag its tension, and the greatest of the lengths it moves", () => {
    // The déport moves most: 4 mm.
    expect(reading(HAND)).toContain(
      "Traînée axiale (`C_t` jusqu'à 0,1) : `T_max` +300,0 N (+15,0 %) ; aucune longueur ne bouge de plus de 0,004 m.",
    );
  });

  it("writes no number for lengths that all stay under the floor (§18.6)", () => {
    // 0,05 mm of flèche and −0,02 mm of déport: both under the 0,1 mm floor.
    const still = handWith("NA-0.1", { Tmax: 2300, sag: 5.00005, sway: 0.99998 });
    const text = reading(still);
    expect(text).toContain(
      "`T_max` +300,0 N (+15,0 %) ; aucune longueur ne bouge au-dessus du plancher.",
    );
    expect(text).not.toContain("aucune longueur ne bouge de plus de");
    expect(text).not.toContain("×10⁻⁵");
  });

  it("says a failure is a failure when no axial row passed its checks", () => {
    const failed = handWith("NA-0.1", { Tmax: 2300 }, { status: "raffinement hors tolérance" });
    expect(reading(failed)).toContain(
      "Traînée axiale (`C_t` jusqu'à 0,1) : `T_max` échec ; longueurs : échec.",
    );
  });
});

describe("the CSV tables", () => {
  it("rowsCsv: one line per row, the reference without differences, the others with", () => {
    const lines = rowsCsv(fixed).trimEnd().split("\n");
    expect(lines).toHaveLength(1 + VARIANTS.length);
    const header = lines[0].split(",");
    expect(header.slice(0, 2)).toEqual(["convention", "cas"]);
    const at = (line: string, column: string) => line.split(",")[header.indexOf(column)];
    expect(at(lines[1], "variante")).toBe("N");
    expect(at(lines[1], "ecart_Tmax_N")).toBe("");
    expect(at(lines[1], "statut")).toBe("ok");
    const lifted = lines.find((line) => at(line, "variante") === "NL-b-0.5")!;
    expect(Number(at(lifted, "ecart_Tmax_N"))).toBeCloseTo(
      fixed.find((row) => row.variant.id === "NL-b-0.5")!.outputs!.Tmax - fixed[0].outputs!.Tmax,
      2,
    );
    expect(at(lifted, "loi_portance")).toBe("binormal");
    expect(at(lifted, "C_L")).toBe("-0.5");
  });

  it("rowsCsv: a difference under the floor is flagged and left empty, not written as a number", () => {
    const [reference, other] = fixed;
    const noisy: Row = {
      ...other,
      outputs: {
        ...reference.outputs!,
        // 0,05 mm of flèche is under the 0,1 mm floor; 100 N of tension is far above it.
        sag: reference.outputs!.sag + 5e-5,
        Tmax: reference.outputs!.Tmax + 100,
      },
    };
    const [header, first, second] = rowsCsv([reference, noisy])
      .trimEnd()
      .split("\n")
      .map((text) => text.split(","));
    const at = (cells: string[], column: string) => cells[header.indexOf(column)];
    expect(at(second, "ecart_fleche_m")).toBe("");
    expect(at(second, "ecart_relatif_fleche")).toBe("");
    expect(at(second, "ecart_resolu_fleche")).toBe("non");
    expect(at(second, "ecart_Tmax_N")).toBe("100");
    // Four significant figures in the table.
    expect(Number(at(second, "ecart_relatif_Tmax"))).toBeCloseTo(100 / reference.outputs!.Tmax, 4);
    expect(at(second, "ecart_resolu_Tmax")).toBe("oui");
    // The reference has no difference to resolve: all three cells stay empty.
    expect(at(first, "ecart_Tmax_N")).toBe("");
    expect(at(first, "ecart_resolu_Tmax")).toBe("");
    expect(header).toContain("ecart_max_AB_m");
    expect(header).toContain("ecart_resolu_ecart_max_AB");
  });

  it("controlsCsv and inputsCsv quote a field that holds the delimiter", () => {
    expect(controlsCsv([{ ...passing, source: "a, b" }])).toContain('oui,"a, b"\n');
    const inputs = inputsCsv([...fixed, ...pose]);
    expect(inputs.split("\n")[0]).toBe("objet,grandeur,valeur,provenance,source");
    expect(inputs).toContain('coefficients,C_L,"0 ; ±0,05 ; ±0,2 ; ±0,5",sonde de sensibilité,');
  });

  it("inputsCsv lists the inputs of the rows it is given, not those of the delivered matrix", () => {
    const variants = variantsOf({ ...COEFFICIENTS, liftMagnitudes: [0.3, 0.1], axial: [0.05] });
    const subjects = (text: string) => new Set(text.split("\n").map((line) => line.split(",")[0]));
    const adjusted = inputsCsv(runFixedLength(part, variants));
    expect(adjusted).toContain('coefficients,C_L,"0 ; ±0,3 ; ±0,1",sonde de sensibilité,');
    expect(adjusted).toContain('coefficients,C_t,"0 ; 0,05",sonde de sensibilité,');
    expect(adjusted).toContain("installation,dénivelé,0 m,scénario,");
    expect(adjusted).toContain(
      "installation,vent,uniforme et horizontal ; 20 m/s ; de 90°,scénario,",
    );
    // One steel case, unloaded: neither the textile line nor a rider is an input of these rows.
    expect(subjects(adjusted)).toEqual(
      new Set(["objet", "acier-12", "installation", "coefficients", ""]),
    );
    expect(adjusted).not.toContain("installation,passager,");
  });
});
