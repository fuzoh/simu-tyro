import { describe, expect, test } from "vitest";

import type { Trace } from "@/lib/terrain/trace.ts";

import { SWISSTOPO_ATTRIBUTION, terrainDisclosure } from "@/lib/terrain/provenance.ts";

import { disclosureTips, opensOnFocus, tipClose, tipName, tipText } from "./tip.ts";

/**
 * #122's contract for the infobulles, on its pure half: **no information is removed** on the way
 * into a bubble — every part is kept, in order — and a warning keeps an icon of its own rather than
 * being folded into an explanation, so its presence is read without opening anything.
 */

describe("tipText — a row's several notes become one bubble", () => {
  test("every part is kept, in order, one paragraph each", () => {
    expect(tipText(["Ce que vaut le champ.", "Pourquoi l'option est indisponible."])).toBe(
      "Ce que vaut le champ.\n\nPourquoi l'option est indisponible.",
    );
  });

  test("absent and blank parts drop out, and nothing at all is no bubble", () => {
    expect(tipText([undefined, "Seule note.", null, "  "])).toBe("Seule note.");
    expect(tipText([null, undefined, ""])).toBeNull();
    expect(tipText([])).toBeNull();
  });
});

describe("tipName — the icon's accessible name says which kind it is", () => {
  test("help, warning and error read differently before the subject", () => {
    expect(tipName("help", "Portée")).toBe("Explication : Portée");
    expect(tipName("warning", "Prétension")).toBe("Avertissement : Prétension");
    expect(tipName("error", "Portée")).toBe("Erreur bloquante : Portée");
  });
});

describe("disclosureTips — the terrain disclosure behind its icons", () => {
  test("a manual terrain keeps its statement in the open and its detail in the bubble", () => {
    const lines = terrainDisclosure({ kind: "manual" });
    const tips = disclosureTips(lines);
    expect(tips.warnings).toEqual([]);
    expect(tips.shown).toEqual([{ text: lines[0]?.text, tip: lines[0]?.detail, tier: "info" }]);
  });

  test("every warning goes whole behind its own ⚠, statement then detail", () => {
    const tips = disclosureTips([
      { tier: "plain", text: "Profil importé · 3 points · pas max 12,0 m" },
      { tier: "warn", text: "Résolution grossière.", detail: "Ré-exporter ne changera rien." },
      { tier: "warn", text: "Distances peut-être en km ?" },
      { tier: "ok", text: "Profil rectiligne" },
    ]);
    expect(tips.warnings).toEqual([
      "Résolution grossière.\n\nRé-exporter ne changera rien.",
      "Distances peut-être en km ?",
    ]);
    expect(tips.shown.map((line) => line.text)).toEqual([
      "Profil importé · 3 points · pas max 12,0 m",
      "Profil rectiligne",
    ]);
  });

  test("the swisstopo attribution stays in the open, beside the data it sources", () => {
    const trace: Trace = {
      d: Float64Array.from([0, 50, 100, 150]),
      z: Float64Array.from([800, 790, 780, 770]),
      dev: 0.1,
      origin: { kind: "geoadmin" },
    };
    const lines = terrainDisclosure({ kind: "trace", trace });
    const tips = disclosureTips(lines);
    expect(tips.shown[0]?.text).toContain(SWISSTOPO_ATTRIBUTION);
    expect(tips.shown[0]?.tip).toBeNull();
  });

  test("no line is lost: each is shown or warned, never both", () => {
    const lines = [
      { tier: "info", text: "a", detail: "b" },
      { tier: "warn", text: "c" },
      { tier: "plain", text: "d" },
    ] as const;
    const tips = disclosureTips(lines);
    expect(tips.shown.length + tips.warnings.length).toBe(lines.length);
  });
});

describe("disclosureTips — the tier survives the move into the open", () => {
  test("a check that passed and one that could not be made keep different tiers", () => {
    const tips = disclosureTips([
      { tier: "ok", text: "Profil rectiligne" },
      { tier: "info", text: "Rectitude non vérifiable" },
      { tier: "plain", text: "Profil importé" },
    ]);
    expect(tips.shown.map((line) => line.tier)).toEqual(["ok", "info", "plain"]);
  });
});

describe("opensOnFocus — a keyboard focus opens the bubble, a restored one does not", () => {
  test("only a keyboard focus opens it", () => {
    expect(opensOnFocus(true, null)).toBe(true);
    expect(opensOnFocus(false, null)).toBe(false);
  });

  test("the focus Escape hands back to the icon does not reopen the bubble", () => {
    expect(opensOnFocus(true, tipClose("escape-key"))).toBe(false);
    expect(opensOnFocus(true, tipClose("close-press"))).toBe(false);
  });

  test("after any other close, the next keyboard focus opens it again", () => {
    for (const reason of ["trigger-hover", "outside-press", "focus-out", "trigger-press"]) {
      expect(opensOnFocus(true, tipClose(reason))).toBe(true);
    }
  });
});
