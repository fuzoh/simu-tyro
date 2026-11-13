import { describe, expect, it } from "vitest";

import type { ControlRow } from "./controls.ts";

import { baseCases, VARIANTS } from "./cases.ts";
import {
  buildReport,
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

  it("calls the probes probes and adopts nothing", () => {
    const report = buildReport({ fixed, pose, controls: [passing] });
    expect(report).toContain("sonde de sensibilité");
    expect(report).toContain("publiée non transférable");
    expect(report).toContain("Aucun n'est adopté");
    expect(report).toContain("Décision de production encore ouverte");
  });

  it("carries no date and no duration: the same rows give the same report", () => {
    expect(buildReport({ fixed, pose, controls: [passing] })).toBe(
      buildReport({ fixed, pose, controls: [passing] }),
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

  it("controlsCsv and inputsCsv quote a field that holds the delimiter", () => {
    expect(controlsCsv([{ ...passing, source: "a, b" }])).toContain('oui,"a, b"\n');
    const inputs = inputsCsv();
    expect(inputs.split("\n")[0]).toBe("objet,grandeur,valeur,provenance,source");
    expect(inputs).toContain('coefficients,C_L,"0 ; ±0,05 ; ±0,2 ; ±0,5",sonde de sensibilité,');
  });
});
