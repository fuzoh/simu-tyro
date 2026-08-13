import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { Trace } from "./trace.ts";

import { parseProfileCsv } from "./csv.ts";
import { isStraight, terrainDisclosure } from "./provenance.ts";

/**
 * The terrain-provenance disclosure block — « v1 build spec » § 6 (*La qualité du terrain est
 * toujours divulguée — en mode manuel aussi*) and § 4's trigger conditions.
 *
 * Three properties carry the section: the block exists in **manual** mode (its absence would read
 * as « aucun souci de terrain » in the exact mode where the ground is a two-point idealisation),
 * the point count and max spacing show **whether or not** a warning fires, and straightness has
 * **three** states — « we could not check » must not read like « we checked and it is bad ».
 */

function trace(d: readonly number[], dev: number | null): Trace {
  return {
    d: Float64Array.from(d),
    z: Float64Array.from(d.map(() => 100)),
    dev,
    fileName: "t.csv",
  };
}

/** 200 points over `length` m — the exporter's fixed count, so the pitch is `length/199`. */
function exported(length: number, dev: number | null): Trace {
  return trace(
    Array.from({ length: 200 }, (_, i) => (i * length) / 199),
    dev,
  );
}

describe("manual ground", () => {
  const lines = terrainDisclosure({ kind: "manual" });

  test("the block is present in manual mode too", () => {
    expect(lines).toHaveLength(1);
    expect(lines[0].tier).toBe("info");
    expect(lines[0].text).toBe(
      "Terrain — ligne droite entre les pieds d'ancrage (aucun profil importé)",
    );
  });

  test("and it carries the measured consequence, not only the model", () => {
    // Without this sentence a user modelling a gorge by hand reads a failure that does not exist.
    expect(lines[0].detail).toContain("le dénivelé ne gagne aucune garde");
    expect(lines[0].detail).toContain("garde min 2,46 / 2,44 / 2,37 / 2,25 m");
    expect(lines[0].detail).toContain("−62,8 m sur une ligne de 1109 m");
  });
});

describe("an imported profile", () => {
  test("discloses its point count and max spacing with no warning at all", () => {
    const lines = terrainDisclosure({ kind: "trace", trace: exported(183.4, 0.007) });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      tier: "plain",
      text: "Profil importé · 200 points · pas max 0,9 m",
    });
    expect(lines[1]).toEqual({ tier: "ok", text: "Tracé rectiligne (écart max 0,01 m)" });
  });

  test("the real trace1 reads exactly as § 6's clean case", () => {
    const text = readFileSync(
      new URL("../../../docs/references/example-profile-trace1.csv", import.meta.url),
      "utf8",
    );
    const result = parseProfileCsv(text, "example-profile-trace1.csv");
    if (!result.ok) throw new Error("expected trace1 to parse");

    const lines = terrainDisclosure({ kind: "trace", trace: result.trace });
    expect(lines[0].text).toBe("Profil importé · 200 points · pas max 1,0 m");
    expect(lines[1]).toEqual({ tier: "ok", text: "Tracé rectiligne (écart max 0,01 m)" });
  });

  test("a coarse import warns, and the copy states the cap is per export", () => {
    const lines = terrainDisclosure({ kind: "trace", trace: exported(1500, 0.01) });
    expect(lines[0].text).toBe("Profil importé · 200 points · pas max 7,5 m");
    expect(lines[1]).toEqual({
      tier: "warn",
      text:
        "Résolution du terrain grossière (pas > 5 m) — un relief entre deux points de mesure " +
        "n'est pas vu par le calcul de garde au sol.",
      detail:
        "L'export du géoportail est limité à 200 points quelle que soit la longueur : " +
        "ré-exporter ne changera rien. Un profil plus dense doit venir d'une autre source.",
    });
  });

  test("the 5 m threshold is crossed at ≈995 m of span, not before", () => {
    const tiers = (length: number) =>
      terrainDisclosure({ kind: "trace", trace: exported(length, 0) }).map((line) => line.tier);
    expect(tiers(500)).not.toContain("warn");
    expect(tiers(990)).not.toContain("warn");
    expect(tiers(1000)).toContain("warn");
  });
});

describe("straightness — three states, and the third is about a missing check", () => {
  const linesFor = (dev: number | null, length = 220) =>
    terrainDisclosure({ kind: "trace", trace: exported(length, dev) });

  test("✓ rectiligne names the measured deviation", () => {
    expect(linesFor(0.009)[1]).toEqual({
      tier: "ok",
      text: "Tracé rectiligne (écart max 0,01 m)",
    });
  });

  test("⚠ non rectiligne says L is therefore overestimated", () => {
    expect(linesFor(34)[1]).toEqual({
      tier: "warn",
      text: "Tracé non rectiligne (écart max 34,00 m sur 220,0 m).",
      detail:
        "La portée L est mesurée le long du tracé, pas en ligne droite — elle est surestimée.",
    });
  });

  test("ℹ non vérifiable is an ℹ, never a ⚠ — a hand-authored file has no coordinates", () => {
    expect(linesFor(null)[1]).toEqual({
      tier: "info",
      text: "Rectitude non vérifiable (coordonnées absentes).",
    });
  });

  test("the verdict is relative to the trace's own extent, with an absolute floor", () => {
    expect(isStraight(0.009, 224)).toBe(true);
    expect(isStraight(1, 224)).toBe(true);
    expect(isStraight(2, 224)).toBe(false);
    expect(isStraight(34, 220)).toBe(false);
    // The floor keeps a short hand-authored trace from being warned about centimetres.
    expect(isStraight(0.05, 8)).toBe(true);
  });
});

describe("the km hint", () => {
  test("fires under 5 m of total distance, and belongs to the accepted file's block", () => {
    const lines = terrainDisclosure({ kind: "trace", trace: trace([0, 1.5, 3], null) });
    expect(lines.at(-1)).toEqual({
      tier: "warn",
      text: "Distances peut-être en km plutôt qu'en mètres ?",
    });
  });

  test("does not fire on a legitimate trace", () => {
    const lines = terrainDisclosure({ kind: "trace", trace: exported(183.4, 0.007) });
    expect(lines.map((line) => line.text).join(" ")).not.toContain("km");
  });
});
