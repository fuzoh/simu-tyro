import { defaultStringifySearch } from "@tanstack/react-router";
import { describe, expect, it, test } from "vitest";

import type { Scenario } from "@/lib/scenario/types.ts";

import { FIRST_RUN_SCENARIO, firstRunDefaults } from "@/lib/scenario/first-run.ts";

import type { SearchKey } from "./schema.ts";

import { encodeP1 } from "./p1.ts";
import {
  completeFromDefaults,
  CONSTRUCTION_ID_BY_TOKEN,
  CONSTRUCTION_TOKEN_BY_ID,
  daNFromNewtons,
  FIRST_RUN_LINK,
  newtonsFromDaN,
  ROPE_CLASS_ID_BY_TOKEN,
  ROPE_CLASS_TOKEN_BY_ID,
  scenarioToSearch,
  searchToScenario,
} from "./scenario.ts";
import {
  CANONICAL_KEYS,
  canonicalLink,
  parseLinkSearch,
  salvageSearch,
  validateSearch,
} from "./schema.ts";

/**
 * `url/scenario.ts`'s gate — § 7's key table read in both directions, and § 9's completion of a
 * partial link. The load-bearing case is the **round trip**: `scenarioToSearch` and
 * `searchToScenario` are the two directions of one table, and a link that does not survive the
 * pair is a link that arrives as a different scenario from the one that was sent.
 */

const parse = parseLinkSearch;

/** A valid three-point `p1.` payload, built by the codec rather than transcribed. */
const TRACE = encodeP1({
  d: Float64Array.from([0, 50, 100]),
  z: Float64Array.from([0, -4, -9]),
  dev: null,
});

/** A query as the app completes it: the router's parse, the validator, then completion. */
function complete(query: string) {
  const search = validateSearch(parse(query));
  if (search.refused !== undefined) throw new Error(`${query} refused: ${search.refused.kind}`);
  return completeFromDefaults(search);
}

/** A query as the app holds it once it has arrived. */
function decode(query: string) {
  return searchToScenario(complete(query).search);
}

describe("recognised absent keys are completed from FIRST_RUN_SCENARIO", () => {
  test("a bare partial link is completed literally, and `x` to L/2 of the completed span", () => {
    const { search, completed } = complete("?L=250&h=-40");
    expect(search).toEqual({
      v: 1,
      u: "daN",
      use: "perm",
      L: 250,
      h: -40,
      za: 12,
      zb: 12,
      fl: 6,
      fam: "ac",
      d: 12,
      r0: 1770,
      cst: "iwrc",
      ta: "cosse",
      tb: "cosse",
      na: 0.9,
      nb: 0.9,
      mp: 120,
      hr: 2.1,
      gm: 1,
      daf: 1.2,
      x: 125,
    });
    expect(completed).toEqual([
      "v",
      "u",
      "use",
      "za",
      "zb",
      "fl",
      "fam",
      "d",
      "r0",
      "cst",
      "ta",
      "tb",
      "na",
      "nb",
      "mp",
      "hr",
      "gm",
      "daf",
      "x",
    ]);
    // § 7's measurement: `fl` completes to 6,0 m literally and never to 4 % of the arriving span.
    expect(search.fl).toBe(FIRST_RUN_SCENARIO.tightness.D_target);
  });

  test("`reg` is exempt — its absence is « — choisir — », never a value waiting to be filled", () => {
    const { search, completed } = complete("?L=250");
    expect("reg" in search).toBe(false);
    expect(completed).not.toContain("reg");
  });

  test("`mbf` / `ea` / `mu` are exempt — their absence is « non surchargée »", () => {
    const { search, completed } = complete("?L=250&fam=ac");
    for (const key of ["mbf", "ea", "mu"] satisfies SearchKey[]) {
      expect(key in search).toBe(false);
      expect(completed).not.toContain(key);
    }
  });

  test("a present key is never overwritten by its default", () => {
    const { search, completed } = complete("?za=4&zb=2.5&mp=95");
    expect(search.za).toBe(4);
    expect(search.zb).toBe(2.5);
    expect(search.mp).toBe(95);
    expect(completed).not.toContain("za");
    expect(completed).not.toContain("mp");
  });

  test("a driver that arrived is never joined by a completed one", () => {
    const { search } = complete("?L=250&lo=251.4");
    expect(search.lo).toBe(251.4);
    expect("fl" in search).toBe(false);
    expect("te" in search).toBe(false);
  });

  test("an imported link keeps `tr`/`sa`/`sb` and grows no `L`/`h`", () => {
    const { search } = complete(`?tr=${TRACE}&sa=10&sb=90`);
    expect(search.tr).toBe(TRACE);
    expect(search.sa).toBe(10);
    expect(search.sb).toBe(90);
    expect("L" in search).toBe(false);
    expect("h" in search).toBe(false);
    // `L = sb − sa`, so `x` completes to 40,0 m — half of the *imported* span.
    expect(search.x).toBe(40);
  });

  test("a manual link never grows `sa` / `sb`, and a `tr`-less link never grows `tr`", () => {
    const { search } = complete("?L=250");
    for (const key of ["sa", "sb", "tr"] satisfies SearchKey[]) expect(key in search).toBe(false);
  });

  test("`fam=tx` completes no steel key and invents no rope — `MBL`, `μ` and `k` stay blank", () => {
    const { search } = complete("?L=250&fam=tx");
    expect(search.fam).toBe("tx");
    for (const key of ["d", "r0", "cst", "mbl", "mu", "k"] satisfies SearchKey[]) {
      expect(key in search).toBe(false);
    }
    expect(search.cls).toBe("hmpe");
  });

  test("the completed bag is in canonical order", () => {
    const { search } = complete("?x=10&h=-40&L=250");
    const order = Object.keys(search);
    expect(order).toEqual([...CANONICAL_KEYS].filter((key) => order.includes(key)));
  });
});

describe("completion follows the active family and names every key it fills", () => {
  test("`?fam=tx&L=250` completes both ends from the textile default, and names them", () => {
    // § 9's retained textile ends: « Œil cousu / épissuré », η 0,90 — never the steel cosse.
    const { search, completed } = complete("?fam=tx&L=250");
    expect(search).toMatchObject({ ta: "oeil", tb: "oeil", na: 0.9, nb: 0.9 });
    expect(completed).toEqual(expect.arrayContaining(["ta", "tb", "na", "nb"]));
    expect(searchToScenario(search).terminations).toEqual({
      A: { id: "oeil-cousu-epissure", eta: 0.9 },
      B: { id: "oeil-cousu-epissure", eta: 0.9 },
    });
  });

  test("`?fam=tx&ta=cosse&L=250` keeps the steel cosse as given and completes only the other end", () => {
    const { search, completed } = complete("?fam=tx&ta=cosse&L=250");
    expect(search.ta).toBe("cosse");
    expect(completed).not.toContain("ta");
    expect(searchToScenario(search).terminations).toEqual({
      A: { id: "cosse-oeil-flamand", eta: 0.9 },
      B: { id: "oeil-cousu-epissure", eta: 0.9 },
    });
  });

  test("an imported link with no stations completes them from the file's origin, and names them", () => {
    // Station A at the origin of the file, station B the shipped 150 m further on.
    const { search, completed } = complete(`?tr=${TRACE}`);
    expect(search).toMatchObject({ sa: 0, sb: 150 });
    expect(completed).toEqual(expect.arrayContaining(["sa", "sb"]));
    expect(searchToScenario(search).geometry).toEqual({
      source: "trace",
      trace: TRACE,
      sa: 0,
      sb: 150,
    });
  });

  test.each([
    { path: "manual, `L` given", query: "?L=250", x: 125 },
    { path: "manual, `L` completed to 150", query: "?h=-40", x: 75 },
    { path: "imported, stations 10 → 90", query: `?tr=${TRACE}&sa=10&sb=90`, x: 40 },
    { path: "imported, `sa` completed to 0 before 90", query: `?tr=${TRACE}&sb=90`, x: 45 },
    { path: "imported, `sb` completed to 10 + 150", query: `?tr=${TRACE}&sa=10`, x: 75 },
    { path: "imported, both stations completed", query: `?tr=${TRACE}`, x: 75 },
  ])("`x` completes to half the completed span — $path", ({ query, x }) => {
    const { search, completed } = complete(query);
    expect(search.x).toBe(x);
    expect(completed).toContain("x");
    expect(searchToScenario(search).rider.xD).toBe(x);
  });
});

describe("the token tables", () => {
  test("write side pins every domain value to its § 7 token", () => {
    expect(CONSTRUCTION_TOKEN_BY_ID).toEqual({ "fibre-core": "tc", iwrc: "iwrc" });
    expect(ROPE_CLASS_TOKEN_BY_ID).toEqual({ hmpe: "hmpe", "pa-en1891a": "pa", polyester: "pes" });
  });

  test("the read side is the exact inverse and knows no other token", () => {
    expect(CONSTRUCTION_ID_BY_TOKEN).toEqual({ tc: "fibre-core", iwrc: "iwrc" });
    expect(ROPE_CLASS_ID_BY_TOKEN).toEqual({ hmpe: "hmpe", pa: "pa-en1891a", pes: "polyester" });
    expect(Reflect.get(ROPE_CLASS_ID_BY_TOKEN, "zzz")).toBeUndefined();
  });

  test("a force crosses between newtons and daN once, in both directions", () => {
    expect(daNFromNewtons(52_000)).toBe(5200);
    expect(newtonsFromDaN(5200)).toBe(52_000);
  });

  test("a textile link with no `cls` is completed with the shipped class and says so", () => {
    const { search, completed } = complete("?fam=tx&L=250");
    expect(search.cls).toBe("hmpe");
    expect(completed).toContain("cls");
  });

  test("an unknown `cls` is dropped as unreadable, never mapped to a class", () => {
    expect(salvageSearch(parse("?fam=tx&cls=zzz&L=250")).dropped).toEqual([
      { key: "cls", reason: "valeur-non-représentable" },
    ]);
    const { search, completed } = complete("?fam=tx&cls=zzz&L=250");
    expect(search.cls).toBe("hmpe");
    expect(completed).toContain("cls");
  });
});

describe("the first-run link", () => {
  test("is § 9's shipped scenario, in canonical order", () => {
    expect(FIRST_RUN_LINK).toBe(
      "/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&fam=ac&d=12&r0=1770" +
        "&cst=iwrc&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
    );
  });

  test("is 142 characters — `reg` absent, `mbf`/`ea`/`mu` absent", () => {
    // § 7/§ 9/§ 11 quote **141**, counted off § 9's *printed* sketch, which spells `fl=6.0` and
    // `x=75.0`. That sketch is not emittable: the spec keeps the router's default codecs, and
    // `stringifySearchWith(JSON.stringify, JSON.parse)` renders the number 6 as `6` and the
    // string `"6.0"` as `%226.0%22`. § 3 says the same thing from the other side — « padding is
    // display-only: state holds a number whose value equals the displayed value, so the URL
    // serialises `6` ». So 141 − 4 = **137**, measured against the installed router; the two
    // absence meanings the count exists to lock are asserted below, unchanged. **142 since
    // 2026-09-23**: `&gm=1` — « Garde min. admise » — is five more characters.
    expect(FIRST_RUN_LINK).toHaveLength(142);
    expect(FIRST_RUN_LINK).not.toContain("reg=");
    expect(FIRST_RUN_LINK).not.toContain("mbf=");
    expect(FIRST_RUN_LINK).not.toContain("ea=");
    expect(FIRST_RUN_LINK).not.toContain("mu=");
  });

  test("round-trips: parsing it back yields the same bag, and re-emitting the same string", () => {
    const search = validateSearch(parse(FIRST_RUN_LINK.slice(1)));
    expect(search).toEqual(scenarioToSearch(FIRST_RUN_SCENARIO));
    expect(canonicalLink(search)).toBe(FIRST_RUN_LINK);
    expect(complete(FIRST_RUN_LINK.slice(1)).completed).toEqual([]);
  });
});

describe("scenarioToSearch — the write side", () => {
  test("forces serialise in daN always, whatever `u` says", () => {
    // Hand-editing `u=daN` → `u=kN` must not make the line 100× tighter.
    const scenario: Scenario = {
      ...structuredClone<Scenario>(FIRST_RUN_SCENARIO),
      unit: "kN",
      tightness: { mode: "tension", H_target: 2535 },
      material: {
        family: "steel",
        d: 12,
        R0: 1770,
        construction: "iwrc",
        overrides: { MBF: 90740, EA: 69000000, mu: 0.5465 },
      },
    };
    const search = scenarioToSearch(scenario);
    expect(search.u).toBe("kN");
    expect(search.te).toBe(253.5);
    expect(search.mbf).toBe(9074);
    expect(search.ea).toBe(6900000);
    expect(search.mu).toBe(0.5465);
  });

  test("a textile scenario emits the textile keys and no steel key", () => {
    const scenario: Scenario = {
      ...structuredClone<Scenario>(FIRST_RUN_SCENARIO),
      usage: "TEMPORAIRE",
      material: { family: "textile", ropeClass: "pa-en1891a", MBL: 300000, mu: 0.082, k: 1.5 },
      terminations: {
        A: { id: "oeil-cousu-epissure", eta: 0.9 },
        B: { id: "epissure-longue-hmpe", eta: 0.85 },
      },
    };
    const search = scenarioToSearch(scenario);
    expect(search.fam).toBe("tx");
    expect(search.cls).toBe("pa");
    expect(search.mbl).toBe(30000);
    expect(search.k).toBe(1.5);
    expect(search.use).toBe("tempo");
    // `epissure` serves both families — `fam` fixes which id it means, exactly as `mu` does.
    expect(search.ta).toBe("oeil");
    expect(search.tb).toBe("epissure");
    for (const key of ["d", "r0", "cst", "mbf", "ea"] satisfies SearchKey[]) {
      expect(key in search).toBe(false);
    }
  });

  test("an imported scenario emits `tr`/`sa`/`sb` and no `L`/`h`", () => {
    const scenario: Scenario = {
      ...structuredClone<Scenario>(FIRST_RUN_SCENARIO),
      geometry: { source: "trace", trace: TRACE, sa: 10, sb: 90 },
    };
    const search = scenarioToSearch(scenario);
    expect(search.tr).toBe(TRACE);
    expect(search.sa).toBe(10);
    expect(search.sb).toBe(90);
    expect("L" in search).toBe(false);
    expect("h" in search).toBe(false);
  });

  test("`regime: null` emits no `reg` key at all", () => {
    expect("reg" in scenarioToSearch(FIRST_RUN_SCENARIO)).toBe(false);
    const chosen = scenarioToSearch({ ...FIRST_RUN_SCENARIO, regime: "en15567" });
    expect(chosen.reg).toBe("en15567");
  });

  test("the emitted bag is in canonical order, in both families", () => {
    // Regression, ticket 32: the textile branch inserted `mu` after `cls`/`mbl`, so the debounced
    // address-bar write — which stringifies **this** bag's insertion order — put `mu` where
    // `CANONICAL_KEYS` does not, and disagreed with `canonicalLink`'s string for the same Scenario.
    const textile: Scenario = {
      ...structuredClone<Scenario>(FIRST_RUN_SCENARIO),
      material: { family: "textile", ropeClass: "hmpe", MBL: 300000, mu: 0.16, k: 22 },
    };
    const steel: Scenario = {
      ...structuredClone<Scenario>(FIRST_RUN_SCENARIO),
      material: {
        family: "steel",
        d: 12,
        R0: 1770,
        construction: "iwrc",
        overrides: { MBF: 90740, EA: 69000000, mu: 0.5465 },
      },
    };
    for (const scenario of [textile, steel, FIRST_RUN_SCENARIO]) {
      const search = scenarioToSearch(scenario);
      const emitted = Object.keys(search);
      expect(emitted).toEqual([...CANONICAL_KEYS].filter((key) => emitted.includes(key)));
      // The consequence, stated where a reader will look for it: « Copier le lien » builds its href
      // with `canonicalLink`, the address bar gets this bag as-is, and § 7 requires the two strings
      // to be identical (« two links to the same Scenario are then string-identical »).
      expect(`/${defaultStringifySearch(search)}`).toBe(canonicalLink(search));
    }
  });
});

describe("searchToScenario — the read side of § 7's key table", () => {
  it("round-trips § 9's shipped Scenario through the URL and back", () => {
    expect(searchToScenario(scenarioToSearch(FIRST_RUN_SCENARIO))).toEqual(firstRunDefaults());
  });

  it("keeps `reg` absent as « — choisir — », never as a defaulted régime", () => {
    expect(decode("?L=250").regime).toBeNull();
    expect(decode("?L=250&reg=en15567").regime).toBe("en15567");
  });

  it("turns the URL's daN back into the state's newtons — `te` and `mbl`", () => {
    expect(decode("?te=253.5").tightness).toEqual({ mode: "tension", H_target: 2535 });
    expect(decode("?fam=tx&cls=hmpe&mbl=10000&mu=0.1&k=22").material).toEqual({
      family: "textile",
      ropeClass: "hmpe",
      MBL: 100_000,
      mu: 0.1,
      k: 22,
    });
  });

  it("reads the tightness driver from **which** key is present", () => {
    expect(decode("?fl=6").tightness).toEqual({ mode: "sag", D_target: 6 });
    expect(decode("?lo=151.64").tightness).toEqual({ mode: "length", L0: 151.64 });
    expect(decode("?vr=0.82").tightness).toEqual({ mode: "ratio", ratio: 0.82 });
  });

  it("leaves § 9's textile blanks blank — a rope nobody typed has no numbers", () => {
    expect(decode("?fam=tx&cls=hmpe&k=22").material).toEqual({
      family: "textile",
      ropeClass: "hmpe",
      MBL: null,
      mu: null,
      k: 22,
    });
    expect(decode("?fam=tx&cls=pes").material).toEqual({
      family: "textile",
      ropeClass: "polyester",
      MBL: null,
      mu: null,
      k: null,
    });
  });

  it("treats an absent steel override as « non surchargée », not as the formula value", () => {
    expect(decode("?fam=ac&d=12&r0=1770&cst=iwrc").material).toEqual({
      family: "steel",
      d: 12,
      R0: 1770,
      construction: "iwrc",
    });
    expect(decode("?fam=ac&mbf=9074&mu=0.5465").material).toMatchObject({
      overrides: { MBF: 90_740, mu: 0.5465 },
    });
  });

  it("resolves a termination token under the family `fam` fixes", () => {
    expect(decode("?fam=ac&ta=epissure").terminations.A.id).toBe("epissure");
    expect(decode("?fam=tx&ta=epissure").terminations.A.id).toBe("epissure-longue-hmpe");
  });

  it("keeps an out-of-family termination as given, for the gate to raise", () => {
    // ADR-0001: `?fam=ac&ta=huit` types cleanly, and the only hardware `huit` names is the knot.
    // Swapping in the steel cosse would be a silent repair of the sender's line.
    expect(decode("?fam=ac&ta=huit").terminations.A.id).toBe("noeud-de-huit");
  });

  it("carries an imported link's `tr` verbatim and never decodes it", () => {
    expect(decode(`?tr=${TRACE}&sa=10&sb=210`).geometry).toEqual({
      source: "trace",
      trace: TRACE,
      sa: 10,
      sb: 210,
    });
  });

  it("clamps `x` to the span on arrival — the one elected exception", () => {
    expect(decode("?L=150&h=0&x=400").rider.xD).toBe(150);
    expect(decode("?L=150&h=0&x=-12").rider.xD).toBe(0);
    expect(decode(`?tr=${TRACE}&sa=10&sb=210&x=500`).rider.xD).toBe(200);
  });

  it("applies an out-of-range value as it arrived — everything but `x`", () => {
    // § 7: « ?L=-5 loads into the field and lights up the Solve Gate's existing form validation
    // exactly as typing −5 would ». The URL repairs nothing.
    expect(decode("?L=-5&h=0").geometry).toEqual({ source: "manual", L: -5, h: 0 });
    expect(decode("?mp=0").rider.mp).toBe(0);
  });

  it("is total over a completed link — every field is filled or blank on purpose", () => {
    const scenario = decode("?L=250&h=-40");
    expect(scenario.geometry).toEqual({ source: "manual", L: 250, h: -40 });
    // § 7 completes `fl` **literally** to 6,0 m, and `x` to `L/2` of the *completed* span.
    expect(scenario.tightness).toEqual({ mode: "sag", D_target: 6 });
    expect(scenario.rider.xD).toBe(125);
  });
});
