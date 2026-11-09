import { describe, expect, test } from "vitest";

import type { Trace } from "@/lib/terrain/trace.ts";

import { airDensityOf } from "@/lib/scenario/dynamics.ts";
import { proscribedIn } from "@/lib/vocabulary/labels.ts";

import {
  airDensityShown,
  DYNAMICS_HEADING,
  QUASI_STATIC_LABEL,
  quasiStaticRow,
  STEEL_TROLLEY_NOTE,
  trolleyMuChip,
} from "./dynamics.ts";

/** A level profil at 1500 m: its mean altitude is 1500 m. */
const AT_1500: Trace = {
  d: Float64Array.from([0, 300]),
  z: Float64Array.from([1500, 1500]),
  dev: null,
  origin: { kind: "csv", fileName: "t.csv" },
};

describe("ρ on Avancé — read unless typed, and said where it is read from (§12.2)", () => {
  test("no profil: the field idles on the sea-level 1,225 and says so", () => {
    const shown = airDensityShown(airDensityOf(null, null));
    expect(shown.idle).toBe("1,225");
    expect(shown.note).toContain("niveau de la mer");
  });

  test("an imported profil: the ISA density at its mean altitude", () => {
    // p = 101325·(1 − 2,25577×10⁻⁵·1500)^5,2559 = 84 556 Pa, T = 288,15 − 9,75 = 278,4 K,
    // ρ = 84 556 / (287,05 · 278,4) = 1,058 kg/m³ — worked by hand, §12.2's « ≈ 1,06 (1500 m) ».
    const shown = airDensityShown(airDensityOf(null, AT_1500));
    expect(shown.idle).toBe("1,058");
    expect(shown.note).toContain("altitude moyenne du profil");
  });

  test("a typed ρ shows as typed, and says how to go back to the read one", () => {
    const shown = airDensityShown(airDensityOf(1.1, AT_1500));
    expect(shown.idle).toBeUndefined();
    expect(shown.note).toContain("Valeur saisie");
  });
});

describe("§12.1's check, read on its own row", () => {
  test("no row without a ride", () => {
    expect(quasiStaticRow(null)).toBeNull();
  });

  test("under the threshold: the figure and where it is reached, no avertissement", () => {
    expect(quasiStaticRow({ quasiStatic: { ratio: 0.084, atX: 120.34, exceeded: false } })).toEqual(
      {
        value: "0,08 à x 120,3 m",
        warning: null,
        cause: null,
      },
    );
  });

  test("rides the gates withhold: no figure, and why in its place", () => {
    const cause = "Aucune estimation — surface de traînée C_dA invalide.";
    expect(quasiStaticRow(null, cause)).toEqual({ value: null, warning: null, cause });
  });

  test("above it: the avertissement names the threshold and the section", () => {
    const row = quasiStaticRow({ quasiStatic: { ratio: 0.234, atX: 80, exceeded: true } });
    expect(row?.value).toBe("0,23 à x 80,0 m");
    expect(row?.warning).toContain("au-dessus de 0,20 (§12.1)");
    expect(row?.warning).toContain("trajectoire figée");
  });
});

describe("the câble's μ, an Unconfirmed Default", () => {
  test("« non confirmé » as shipped, « valeur utilisateur » once typed over", () => {
    expect(trolleyMuChip(0.015)).toBe("non confirmé");
    expect(trolleyMuChip(0.02)).toBe("valeur utilisateur");
  });
});

describe("the group's words", () => {
  test("say no word the interface never says", () => {
    const row = quasiStaticRow({ quasiStatic: { ratio: 0.3, atX: 10, exceeded: true } });
    const words = [DYNAMICS_HEADING, STEEL_TROLLEY_NOTE, QUASI_STATIC_LABEL, row?.warning ?? ""];
    for (const source of ["typed", "profile", "sea-level"] as const) {
      words.push(airDensityShown({ value: 1.2, source }).note);
    }
    expect(words.flatMap((text) => proscribedIn(text))).toEqual([]);
  });
});
