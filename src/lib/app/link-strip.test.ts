import { describe, expect, test } from "vitest";

import type { ValidatedSearch } from "@/lib/url/schema.ts";

import { initialAppState } from "@/lib/app/state.ts";
import { TRACE_P1 } from "@/lib/url/__fixtures__/canonical-links.ts";
import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

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

  test("an unreadable `zan` names the Zone d'ancrage's length (#106)", () => {
    expect(strip("?L=250&zan=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « zan » n'était pas un nombre " +
        "(longueur de la zone d'ancrage ignorée).",
    );
  });

  test("`zan` absent is the shipped zones, a meaning and not a hole: never completed (#106)", () => {
    // Like `bp`, completing it would name the zones in the strip of every link older than the key.
    expect(strip("?L=250&h=-40")?.completed).not.toContain("zone d'ancrage");
    // Unreadable, it is ignored once, and still not completed in the second sentence.
    expect(strip("?L=250&zan=abc")?.completed).not.toContain("zone d'ancrage");
    // Present and readable, it is a value the link carries: nothing to report about it.
    const carried = strip("?L=250&h=-40&zan=5");
    expect(carried?.ignored).toBeNull();
    expect(carried?.completed).not.toContain("zone d'ancrage");
  });

  test("an unreadable `cib` names the target of the farthest point (#121)", () => {
    expect(strip("?L=250&cib=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « cib » n'était pas un nombre " +
        "(cible du point le plus loin ignorée).",
    );
  });

  test("`cib` absent is the shipped target, a meaning and not a hole: never completed (#121)", () => {
    expect(strip("?L=250&h=-40")?.completed).not.toContain("cible");
    expect(strip("?L=250&cib=abc")?.completed).not.toContain("cible");
    // Present and readable — out of its domain included — it is a value the link carries.
    for (const carried of [strip("?L=250&h=-40&cib=75"), strip("?L=250&h=-40&cib=120")]) {
      expect(carried?.ignored).toBeNull();
      expect(carried?.completed).not.toContain("cible");
    }
  });

  test("an unreadable `ww` or `wa` names its field of the Vent's profile (#120)", () => {
    expect(strip("?L=250&ww=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « ww » n'était pas un nombre " +
        "(largeur à mi-atténuation ignorée).",
    );
    expect(strip("?L=250&wa=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « wa » n'était pas un nombre " +
        "(atténuation aux ancrages ignorée).",
    );
  });

  test("`ww` and `wa` absent are the uniform wind, a meaning and not a hole: never completed (#120)", () => {
    // A link older than the keys opens on the wind it always was, and is not corrected for it.
    for (const sentence of [
      strip("?L=250&h=-40")?.completed,
      strip("?L=250&ww=abc&wa=abc")?.completed,
    ]) {
      expect(sentence).not.toContain("atténuation");
      expect(sentence).not.toContain("vent");
    }
    // Present and readable — out of its domain included — it is a value the link carries: the Wind
    // Gate judges it, the strip has nothing to report.
    for (const carried of [strip("?L=250&h=-40&ww=30&wa=40"), strip("?L=250&h=-40&ww=95&wa=110")]) {
      expect(carried?.ignored).toBeNull();
      expect(carried?.completed).not.toContain("atténuation");
    }
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
    expect(strip("?L=150&h=-18")?.completed).toContain("prétension 263,4 daN");
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
    // The ride's keys absent are §12.2's defaults (#89), likewise — on a câble and on a corde.
    for (const ride of [sentence, strip("?fam=tx&L=250")?.completed ?? ""]) {
      expect(ride).not.toContain("traînée");
      expect(ride).not.toContain("poulie");
      expect(ride).not.toContain("masse volumique");
    }
  });

  test("an unreadable ride constant is named by its own label (#89)", () => {
    expect(strip("?L=250&cda=x")?.ignored).toBe(
      "Une partie du lien a été ignorée : « cda » n'était pas un nombre " +
        "(surface de traînée C_dA ignorée).",
    );
    expect(strip("?fam=tx&L=250&f0=x")?.ignored).toBe(
      "Une partie du lien a été ignorée : « f0 » n'était pas un nombre " +
        "(frottement constant de la poulie F₀ ignoré).",
    );
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

describe("a coordinate without its pair (#90)", () => {
  test("is named with the twin it lacked, and the Position stays unknown", () => {
    const query = "?L=150&lata=46.843556";
    expect(strip(query)?.ignored).toBe(
      "Une partie du lien a été ignorée : « lata » sans « lona » (latitude A ignorée).",
    );
    expect(initialAppState({ query, session: null }).scenario.positions).toEqual({
      A: null,
      B: null,
    });
  });

  test("names a longitude by its own anchor, and the anchor that arrived whole is kept", () => {
    const query = "?L=150&lata=46.8&lona=6.5&lonb=6.6";
    expect(strip(query)?.ignored).toBe(
      "Une partie du lien a été ignorée : « lonb » sans « latb » (longitude B ignorée).",
    );
    expect(initialAppState({ query, session: null }).scenario.positions).toEqual({
      A: { lat: 46.8, lon: 6.5 },
      B: null,
    });
  });

  test("a link with no Position completes none, so it is not announced", () => {
    expect(strip("?L=150")?.completed).not.toMatch(/latitude|longitude/);
  });

  test("a profil off the Positions said with anything but `1` is named, not taken", () => {
    expect(strip("?L=150&ph=oui")?.ignored).toBe(
      "Une partie du lien a été ignorée : « ph » n'était pas une valeur reconnue (profil hors des Positions ignoré).",
    );
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

describe("on a terrain Page (#91)", () => {
  const QUERY = "?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6";
  const terrain = (query: string) =>
    linkStrip(initialAppState({ query, session: null }).link, "daN", "terrain");

  test("the completed fields are the ones the Page shows, in its own words", () => {
    const completed = terrain(QUERY)?.completed ?? "";
    expect(completed).toContain("diamètre 12,0 mm");
    expect(completed).toContain("masse du passager 120 kg");
    expect(exactTermsIn(completed)).toEqual([]);
    expect(proscribedIn(completed)).toEqual([]);
    for (const hidden of ["grade", "construction", "terminaison", "rendement", "majoration"]) {
      expect(completed).not.toContain(hidden);
    }
  });

  test("Avancé still names every completed field, exactly as before", () => {
    const completed = strip(QUERY)?.completed ?? "";
    expect(completed).toContain("diamètre nominal 12,0 mm");
    expect(completed).toContain("majoration au départ 1,2");
  });

  test("a value only Avancé shows is ignored without its exact name", () => {
    expect(terrain("?L=150&daf=abc")?.ignored).toBe(
      "Une partie du lien a été ignorée : « daf » n'était pas un nombre (réglage de la Page Avancé ignoré).",
    );
  });
});
