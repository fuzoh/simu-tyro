import { describe, expect, test } from "vitest";

import { proscribedIn } from "@/lib/vocabulary/labels.ts";

import { RETENSION } from "./retension.ts";

/** The whole text as the Page prints it. */
const printed = [RETENSION.title, RETENSION.text, RETENSION.source].join("\n");

describe("« Pourquoi on retend » quotes the trial and predicts nothing (#104, #14)", () => {
  test("it cites the trial and where its records are", () => {
    expect(printed).toContain("essai du 2026-11-01");
    expect(printed).toContain("docs/mesures dynamometre/");
  });

  test("it says the loss was observed once, on textile", () => {
    expect(RETENSION.text).toContain("observée une fois sur corde");
  });

  test("it carries the measured orders of magnitude, in kN, and when", () => {
    expect(RETENSION.text).toContain("0,1 à 0,15 kN par passage");
    expect(RETENSION.text).toContain("≈ 0,35 kN entre 16:04 et 16:57 sans retension");
  });

  test("every figure in it is one of the trial's, so none is computed", () => {
    // The README of `docs/mesures dynamometre/` and the ticket, read by hand: the date, the two
    // losses, the two times — nothing else.
    const figures = printed.match(/\d+(?:[,.:-]\d+)*/g) ?? [];
    expect(new Set(figures)).toEqual(
      new Set(["2026-11-01", "0,1", "0,15", "0,35", "16:04", "16:57"]),
    );
  });

  test("it suggests no length and no schedule", () => {
    // A length to take in is a figure in metres; a schedule is a number of passages or a duration.
    expect(printed).not.toMatch(/\d\s*(?:m|cm|mm)\b/);
    expect(printed).not.toMatch(/\d\s*(?:passages|min|h)\b/);
    for (const prediction of [
      "prévoir",
      "prévoi",
      "il faut",
      "faudra",
      "après chaque",
      "tous les",
    ]) {
      expect(printed.toLowerCase()).not.toContain(prediction);
    }
  });

  test("it says no word the interface never says", () => {
    expect(proscribedIn(printed)).toEqual([]);
  });
});
