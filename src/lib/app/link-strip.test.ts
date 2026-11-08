import { describe, expect, test } from "vitest";

import type { ValidatedSearch } from "@/lib/url/schema.ts";

import { initialAppState } from "@/lib/app/state.ts";
import { TRACE_P1 } from "@/lib/url/__fixtures__/canonical-links.ts";

import { linkStrip } from "./link-strip.ts";

/**
 * § 8's « bandeau des clés ignorées », end to end from a raw query string — `initialAppState` takes
 * one as a parameter, so the whole strip is a `node` case with no router and no DOM (amendment A).
 *
 * Three claims are what the strip exists for, and each has a case below: **each dropped key says
 * which kind it was**, **the completion sentence names the values and not just the fields**, and
 * **a link with nothing to report produces no strip at all**.
 */

function strip(query: string) {
  return linkStrip(initialAppState({ query, session: null }).link);
}

describe("§ 8's first sentence — each dropped key with its reason", () => {
  test("an unknown key and an unreadable value read differently, in one sentence", () => {
    // § 8's own example: « ignoré » alone cannot distinguish the sender's typo from a value we
    // could not read, so each key says which it was, and the unreadable one names what it cost.
    expect(strip("?v=1&xy=3&za=abc&L=150")?.ignored).toBe(
      "Une partie du lien a été ignorée : clé inconnue « xy » ; " +
        "« za » n'était pas un nombre (hauteur d'ancrage A ignorée).",
    );
  });

  test("French agreement follows the field, not the sentence", () => {
    expect(strip("?L=150&h=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « h » n'était pas un nombre (dénivelé ignoré).",
    );
  });

  test("French agreement holds for the fields whose gender changed with the vocabulary", () => {
    expect(strip("?L=150&use=zz")?.ignored).toContain("(installation ignorée)");
    expect(strip("?L=150&hr=abc")?.ignored).toContain("(gabarit du passager ignoré)");
    expect(strip("?L=150&daf=abc")?.ignored).toContain("(majoration au départ ignorée)");
  });

  test("a token-valued key is not a number, and the clause does not claim it was", () => {
    // « n'était pas un nombre » is § 8's wording for `za`; saying it of `?fam=zz` would be a lie in
    // the one sentence whose job is to tell a typo apart from a value we could not read.
    expect(strip("?L=150&fam=zz")?.ignored).toContain(
      "« fam » n'était pas une valeur reconnue (famille de ligne ignorée)",
    );
  });
});

describe("§ 8's first sentence — the `vr` and `gm` keys are named like every other key", () => {
  test("an unreadable `gm` names the minimum clearance", () => {
    expect(strip("?L=250&gm=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « gm » n'était pas un nombre (garde exigée ignorée).",
    );
  });

  test("an unreadable `vr` names Rapport V", () => {
    expect(strip("?L=250&vr=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « vr » n'était pas un nombre (rapport V ignoré).",
    );
  });

  test("a third anchor for the Mise en tension is not a value the link can carry", () => {
    expect(strip("?L=250&cp=c")?.ignored).toBe(
      "Une partie du lien a été ignorée : « cp » n'était pas une valeur reconnue " +
        "(côté de la Mise en tension ignoré).",
    );
  });

  test("an unreadable `tp` names the prétension", () => {
    expect(strip("?L=250&tp=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « tp » n'était pas un nombre (prétension ignorée).",
    );
  });

  test("a third Brin porteur is not a value the link can carry, and the clause says so", () => {
    expect(strip("?L=250&bp=3")?.ignored).toBe(
      "Une partie du lien a été ignorée : « bp » n'était pas une valeur reconnue " +
        "(nombre de Brins porteurs ignoré).",
    );
  });

  test("a Mise en tension the link cannot carry is named, in the feminine", () => {
    expect(strip("?L=250&mt=mx")?.ignored).toBe(
      "Une partie du lien a été ignorée : « mt » n'était pas une valeur reconnue " +
        "(mise en tension ignorée).",
    );
  });
});

describe("§ 8's second sentence — the completion names the values", () => {
  test("it prints every number the recipient got, at display precision", () => {
    const sentence = strip("?L=250&h=-40")?.completed ?? "";
    expect(sentence).toMatch(/^Champs absents du lien, complétés depuis le scénario par défaut : /);
    expect(sentence).toContain("masse du passager 120 kg");
    expect(sentence).toContain("gabarit du passager 2,1 m");
    expect(sentence).toContain("majoration au départ 1,2");
    // § 9's `x` is the one non-literal completion: `L/2` of the **completed** span.
    expect(sentence).toContain("position du passager 125,0 m");
    expect(sentence).toMatch(/\.$/);
  });

  test("the minimum clearance, a safety criterion, is named with its value", () => {
    expect(strip("?L=250&h=-40")?.completed).toContain("garde exigée 1,0 m");
  });

  test("a token-valued completion is French, never the wire token", () => {
    expect(strip("?L=250&h=-40")?.completed).toContain("installation permanente");
  });

  test("a force is undone from the URL's daN into the unit the screen reads", () => {
    // § 7 serialises every force in daN; the strip prints what the recipient's own field shows.
    expect(strip("?te=900&L=150")?.completed).not.toContain("tension horizontale");
    expect(strip("?tp=900&L=150")?.completed).not.toContain("prétension");
    expect(strip("?L=150&h=-18")?.completed).toContain("flèche à vide 6,00 m");
  });

  test("what absence *means* is never completed, so the strip never names it", () => {
    // § 7's three meanings of absence: `reg` absent is « — choisir — » and `mbf`/`ea`/`mu` absent
    // is « non surchargée ». Neither is a hole the defaults may fill.
    const sentence = strip("?L=250&h=-40")?.completed ?? "";
    expect(sentence).not.toContain("régime");
    expect(sentence).not.toContain("charge de rupture");
    // `bp` absent is one Brin porteur (#84): a link older than the key is not corrected for it.
    expect(sentence).not.toContain("Brins porteurs");
    // `mt` absent is the mouflage (#86), likewise.
    expect(sentence).not.toContain("Mise en tension");
    // `cp` absent is the Mise en tension at A (#85), likewise.
    expect(sentence).not.toContain("Mise en tension");
    // `ws` and `wd` absent are no wind (#87), likewise.
    expect(sentence).not.toContain("vent");
  });
});

describe("an unknown rope class is ignored and the default class is named, never assumed", () => {
  test("`cls=zzz` is reported as unreadable and the completed class is named", () => {
    const result = strip("?fam=tx&cls=zzz&L=250");
    expect(result?.ignored).toBe(
      "Une partie du lien a été ignorée : « cls » n'était pas une valeur reconnue " +
        "(classe de corde ignorée).",
    );
    expect(result?.completed).toContain("classe de corde HMPE 12 torons");
  });

  test("a textile link with no `cls` at all names the completed class too", () => {
    expect(strip("?fam=tx&L=250")?.completed).toContain("classe de corde HMPE 12 torons");
  });

  test("a textile link with no ends names the textile ends it was given, not the steel cosse", () => {
    const sentence = strip("?fam=tx&L=250")?.completed ?? "";
    expect(sentence).toContain("terminaison A Œil cousu / épissuré");
    expect(sentence).toContain("terminaison B Œil cousu / épissuré");
    expect(sentence).not.toContain("Cosse");
  });

  test("a rope link with no `k` names the class's published stiffness and the knot's η", () => {
    // §13.2: `k` 22 for HMPE; §10.3: figure-eight conservative 0,60, never the shipped 0,90.
    const sentence = strip("?use=tempo&fam=tx&cls=hmpe&ta=huit")?.completed ?? "";
    expect(sentence).toContain("raideur relative k 22,0");
    expect(sentence).toContain("rendement de terminaison A 0,60");
  });

  test("an imported link completes no distance: the profil is taken whole (#88)", () => {
    const completed = strip(`?tr=${TRACE_P1}`)?.completed;
    expect(completed).not.toContain("distance");
    // The viewpoint lands mid-profil — TRACE_P1 runs 0 → 100 m.
    expect(completed).toContain("position du passager 50,0 m");
  });

  test("a link from before #88 names its two stations as unknown keys, and is not refused", () => {
    const state = initialAppState({ query: `?v=1&sa=10&sb=90&tr=${TRACE_P1}`, session: null });
    expect(state.link.refused).toBeNull();
    expect(linkStrip(state.link)?.ignored).toBe(
      "Une partie du lien a été ignorée : clé inconnue « sa » ; clé inconnue « sb ».",
    );
  });

  test("each token reads in the French of its domain value", () => {
    const base = initialAppState({ query: "", session: null }).link;
    const completedLabel = (rewrite: ValidatedSearch, key: "cls" | "cst") =>
      linkStrip({ ...base, completed: [key], rewrite })?.completed;
    expect(completedLabel({ cls: "hmpe" }, "cls")).toContain("classe de corde HMPE 12 torons");
    expect(completedLabel({ cls: "pa" }, "cls")).toContain(
      "classe de corde polyamide EN 1891 type A",
    );
    expect(completedLabel({ cls: "pes" }, "cls")).toContain(
      "classe de corde polyester semi-statique",
    );
    expect(completedLabel({ cst: "tc" }, "cst")).toContain("construction 6×19");
    expect(completedLabel({ cst: "iwrc" }, "cst")).toContain("construction 6×19 métallique");
  });
});

describe("a completed force is converted from the URL's daN into the screen's unit", () => {
  test("`te=900` daN prints as 9,000 kN under the kN selector", () => {
    const base = initialAppState({ query: "", session: null }).link;
    const link = { ...base, completed: ["te" as const], rewrite: { te: 900 } };
    expect(linkStrip(link, "kN")?.completed).toContain("tension horizontale 9,000 kN");
  });

  test("`tp=900` daN prints as the prétension, 9,000 kN under the kN selector", () => {
    const base = initialAppState({ query: "", session: null }).link;
    const link = { ...base, completed: ["tp" as const], rewrite: { tp: 900 } };
    expect(linkStrip(link, "kN")?.completed).toContain("prétension 9,000 kN");
  });
});

describe("§ 8's third sentence, and the states that produce no strip at all", () => {
  test("the rewrite is stated whenever the address bar was corrected", () => {
    expect(strip("?L=250&junk=zz")?.rewritten).toBe(
      "L'adresse a été corrigée pour indiquer les valeurs utilisées.",
    );
  });

  test("a bare `/` announces nothing — restoring the Session is the defined normal case", () => {
    expect(strip("")).toBeNull();
  });

  test("a complete canonical link says nothing either: nothing was dropped, nothing completed", () => {
    const complete = initialAppState({ query: "", session: null });
    expect(linkStrip({ ...complete.link, dropped: [], completed: [] })).toBeNull();
  });

  test("a refused link has no strip beside it — the refusal is whole-link", () => {
    const refused = initialAppState({ query: "?v=3&L=150", session: null });
    expect(refused.link.refused).not.toBeNull();
    expect(linkStrip(refused.link)).toBeNull();
  });
});
