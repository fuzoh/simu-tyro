import { describe, expect, test } from "vitest";

import type { Trace, TraceOrigin } from "@/lib/terrain/trace.ts";
import type { StateId } from "@/lib/vocabulary/labels.ts";

import { terrainDisclosure } from "@/lib/terrain/provenance.ts";
import { exactTermsIn, label, proscribedIn } from "@/lib/vocabulary/labels.ts";

import { statiqueLabelTable } from "./copy.ts";

/**
 * The Page Statique's label table against #61's two lists (#91): no word the interface never says,
 * and no term only Avancé names. « estimation » is a word the Page has no use for — Statique
 * computes the statics, it does not estimate them — so it is refused here on top of both.
 */
const STATES: readonly StateId[] = [
  "dans-les-limites",
  "marge-faible",
  "hors-limites",
  "refuse-usage-interdit",
  "indetermine",
  "aucun-resultat",
  "saisie-en-cours",
];

const table = [...statiqueLabelTable(), ...STATES.map((id) => label(id, "terrain"))];

describe("the Page Statique's label table", () => {
  test.each(table.map((copy) => [copy] as const))("« %s » uses no proscribed word", (copy) => {
    expect(proscribedIn(copy)).toEqual([]);
  });

  test.each(table.map((copy) => [copy] as const))("« %s » uses no exact-register term", (copy) => {
    expect(exactTermsIn(copy)).toEqual([]);
  });

  test("never says « estimation »", () => {
    expect(table.filter((copy) => copy.toLocaleLowerCase("fr").includes("estimation"))).toEqual([]);
  });
});

/** A profil of `points` samples over `length` m — enough to reach each line of the disclosure. */
function profil(origin: TraceOrigin, length: number, points: number, dev: number | null): Trace {
  const d = Array.from({ length: points }, (_, i) => (i * length) / (points - 1));
  return { d: Float64Array.from(d), z: Float64Array.from(d.map(() => 100)), dev, origin };
}

/**
 * The profil's disclosure prints numbers read off the profil, so it is not in the fixed table: each
 * of its lines is reached here instead — the swisstopo attribution, the coarse resolution, the
 * three straightness states and the km hint (#91, #103).
 */
describe("the profil's disclosure Statique prints", () => {
  const disclosed = [
    profil({ kind: "geoadmin" }, 1500, 200, 0.0005),
    profil({ kind: "lien" }, 1500, 200, 50),
    profil({ kind: "csv", fileName: "court.csv" }, 3, 4, null),
  ].flatMap((trace) =>
    terrainDisclosure({ kind: "trace", trace }).flatMap(({ text, detail }) =>
      detail === undefined ? [text] : [text, detail],
    ),
  );

  test.each([
    /© swisstopo/,
    /^Résolution du terrain grossière/,
    /^Profil rectiligne/,
    /^Profil non rectiligne/,
    /^Rectitude non vérifiable/,
    /^Distances peut-être en km/,
  ])("reaches the line %s", (line) => {
    expect(disclosed.some((text) => line.test(text))).toBe(true);
  });

  test.each(disclosed.map((copy) => [copy] as const))(
    "« %s » stays in the terrain register",
    (copy) => {
      expect(proscribedIn(copy)).toEqual([]);
      expect(exactTermsIn(copy)).toEqual([]);
      expect(copy.toLocaleLowerCase("fr")).not.toContain("estimation");
    },
  );
});
