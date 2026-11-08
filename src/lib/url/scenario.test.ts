import { defaultStringifySearch } from "@tanstack/react-router";
import { describe, expect, it, test } from "vitest";

import type { Scenario } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { appReducer, initialAppState } from "@/lib/app/state.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { applyShippedTerminations } from "@/lib/rail/values.ts";
import {
  FIRST_RUN_RETAINED_TEXTILE,
  FIRST_RUN_SCENARIO,
  firstRunDefaults,
} from "@/lib/scenario/first-run.ts";

import type { SearchKey } from "./schema.ts";

import { decodeP1, encodeP1 } from "./p1.ts";
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

/** Three stations `(20,500) (70,496) (120,491)`: a Trace starting after 0, ending before 150 m. */
const OFFSET_TRACE = encodeP1({
  d: Float64Array.from([20, 70, 120]),
  z: Float64Array.from([500, 496, 491]),
  dev: null,
});

/** The keys every completed link carries, whatever its family and terrain source. */
const ALWAYS_COMPLETED = [
  "v",
  "u",
  "use",
  "za",
  "zb",
  "fl",
  "fam",
  "ta",
  "tb",
  "na",
  "nb",
  "mp",
  "hr",
  "gm",
  "daf",
  "x",
] satisfies SearchKey[];

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

  test("`fam=tx` completes no steel key and invents no rope — `MBL` and `μ` stay blank", () => {
    const { search } = complete("?L=250&fam=tx");
    expect(search.fam).toBe("tx");
    for (const key of ["d", "r0", "cst", "mbl", "mu"] satisfies SearchKey[]) {
      expect(key in search).toBe(false);
    }
  });

  test("the completed bag is in canonical order", () => {
    const { search } = complete("?x=10&h=-40&L=250");
    const order = Object.keys(search);
    expect(order).toEqual([...CANONICAL_KEYS].filter((key) => order.includes(key)));
  });
});

describe("completion follows the active family and names every key it fills", () => {
  test("`?fam=tx&L=250` completes the class and both ends from the textile default, and names them", () => {
    // § 9's retained textile: classe HMPE, ends « Œil cousu / épissuré » — never the steel cosse.
    const { search, completed } = complete("?fam=tx&L=250");
    expect(search).toMatchObject({ cls: "hmpe", ta: "oeil", tb: "oeil" });
    expect(completed).toEqual(expect.arrayContaining(["cls", "ta", "tb", "na", "nb"]));
    const scenario = searchToScenario(search);
    expect(scenario.material).toMatchObject({
      ropeClass: FIRST_RUN_RETAINED_TEXTILE.spec.ropeClass,
    });
    expect(scenario.terminations).toEqual(FIRST_RUN_RETAINED_TEXTILE.terminations);
  });

  test("a missing `na`/`nb` takes the decoded end's own η, not the shipped end's 0,90", () => {
    // §10.3: figure-eight 0,60–0,80, conservative 0,60; bowline 0,55–0,70, conservative 0,55.
    const knots = complete("?use=tempo&fam=tx&cls=hmpe&ta=huit&tb=chaise");
    expect(knots.search).toMatchObject({ na: 0.6, nb: 0.55 });
    expect(knots.completed).toEqual(expect.arrayContaining(["na", "nb"]));
    // §10.2: wedge socket 0,80 — under steel, and kept as given out of family.
    expect(complete("?fam=ac&ta=coin").search.na).toBe(0.8);
    expect(complete("?fam=ac&ta=huit").search.na).toBe(0.6);
  });

  test("a given `na` is kept beside a completed `nb`", () => {
    expect(complete("?fam=tx&ta=huit&na=0.7&tb=huit").search).toMatchObject({ na: 0.7, nb: 0.6 });
  });

  test("a missing `k` takes the rope class's §13.2 default, and is named", () => {
    const hmpe = complete("?fam=tx&cls=hmpe");
    expect(hmpe.search.k).toBe(22);
    expect(hmpe.completed).toContain("k");
    expect(decode("?fam=tx&cls=pa").material).toMatchObject({ ropeClass: "pa-en1891a", k: 1.5 });
    expect(complete("?fam=tx").search.k).toBe(22);
  });

  test("polyester's `k` stays blank — §13.2 publishes none", () => {
    const { search, completed } = complete("?fam=tx&cls=pes");
    expect("k" in search).toBe(false);
    expect(completed).not.toContain("k");
  });

  test("a given `k` is kept", () => {
    expect(complete("?fam=tx&cls=hmpe&k=30").search.k).toBe(30);
  });

  test("an unknown `cls` is dropped as unreadable and completed with the shipped class", () => {
    expect(salvageSearch(parse("?fam=tx&cls=zzz&L=250")).dropped).toEqual([
      { key: "cls", reason: "valeur-non-représentable" },
    ]);
    const { search, completed } = complete("?fam=tx&cls=zzz&L=250");
    expect(search.cls).toBe("hmpe");
    expect(completed).toContain("cls");
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

  test("an imported link with no stations completes them to the Trace's ends, and names them", () => {
    // #55: the 100 m TRACE ends before the old « `sa` + 150 m », which put station B off the Trace.
    const { search, completed } = complete(`?tr=${TRACE}`);
    expect(search).toMatchObject({ sa: 0, sb: 100 });
    expect(completed).toEqual(expect.arrayContaining(["sa", "sb"]));
    expect(searchToScenario(search).geometry).toEqual({
      source: "trace",
      trace: TRACE,
      sa: 0,
      sb: 100,
    });
  });

  test.each([
    { config: "steel, manual", query: "?fam=ac", keys: ["L", "h", "d", "r0", "cst"] },
    {
      config: "steel, imported",
      query: `?fam=ac&tr=${TRACE}`,
      keys: ["tr", "sa", "sb", "d", "r0", "cst"],
    },
    { config: "textile, manual", query: "?fam=tx", keys: ["L", "h", "cls"] },
    { config: "textile, imported", query: `?fam=tx&tr=${TRACE}`, keys: ["tr", "sa", "sb", "cls"] },
  ] satisfies { config: string; query: string; keys: SearchKey[] }[])(
    "a $config link completes every key its configuration needs",
    ({ query, keys }) => {
      const required = [...ALWAYS_COMPLETED, ...keys];
      expect(Object.keys(complete(query).search)).toEqual(expect.arrayContaining(required));
    },
  );

  test.each([
    { path: "manual, `L` given", query: "?L=250", x: 125 },
    { path: "manual, `L` completed to 150", query: "?h=-40", x: 75 },
    { path: "imported, stations 10 → 90", query: `?tr=${TRACE}&sa=10&sb=90`, x: 40 },
    { path: "imported, `sa` completed to 0 before 90", query: `?tr=${TRACE}&sb=90`, x: 45 },
    { path: "imported, `sb` completed to the Trace's end 100", query: `?tr=${TRACE}&sa=10`, x: 45 },
    { path: "imported, both stations completed to 0 → 100", query: `?tr=${TRACE}`, x: 50 },
    { path: "imported, both completed to 20 → 120", query: `?tr=${OFFSET_TRACE}`, x: 50 },
  ])("`x` completes to half the completed span — $path", ({ query, x }) => {
    const { search, completed } = complete(query);
    expect(search.x).toBe(x);
    expect(completed).toContain("x");
    expect(searchToScenario(search).rider.xD).toBe(x);
  });
});

describe("an imported link's absent stations complete to the Trace's ends — #55", () => {
  /** The Trace a link's `tr` names, as `initialAppState` decodes it beside the Scenario. */
  const traceOf = (tr: string): Trace => ({ ...decodeP1(tr), fileName: null });

  /** The gates' errors on a completed link, read with its Trace beside it. */
  const errorsOf = (query: string, tr: string) =>
    evaluateGates({ scenario: decode(query), trace: traceOf(tr) }).errors.map(
      ({ field, message }) => ({ field, message }),
    );

  test("neither station given: `sa` and `sb` complete to the first and last Trace distance", () => {
    // A Trace that starts after 0 and ends before 150 m: both of the old constants fell off it.
    const { search, completed } = complete(`?tr=${OFFSET_TRACE}`);
    expect(search).toMatchObject({ sa: 20, sb: 120 });
    expect(completed).toEqual(expect.arrayContaining(["sa", "sb"]));
    expect(errorsOf(`?tr=${OFFSET_TRACE}`, OFFSET_TRACE)).toEqual([]);
  });

  test("the completed stations are where an in-app import places them", () => {
    const imported = appReducer(initialAppState({ query: "", session: null }), {
      type: "tracé/importé",
      trace: { ...traceOf(OFFSET_TRACE), fileName: "t.csv" },
      tr: OFFSET_TRACE,
    }).scenario.geometry;
    expect(decode(`?tr=${OFFSET_TRACE}`).geometry).toEqual(imported);
  });

  test("a Trace shorter than 150 m with only `sa` inside it completes `sb` to its end", () => {
    const { search, completed } = complete(`?tr=${OFFSET_TRACE}&sa=40`);
    expect(search).toMatchObject({ sa: 40, sb: 120, x: 40 });
    expect(completed).toContain("sb");
    expect(completed).not.toContain("sa");
    expect(errorsOf(`?tr=${OFFSET_TRACE}&sa=40`, OFFSET_TRACE)).toEqual([]);
  });

  test("an explicit `sb` past the Trace's end is kept as given and raises « Distance hors du profil »", () => {
    // ADR-0001: a station the link carries is never moved back onto the Trace.
    const { search, completed } = complete(`?tr=${OFFSET_TRACE}&sb=300`);
    expect(search).toMatchObject({ sa: 20, sb: 300 });
    expect(completed).not.toContain("sb");
    expect(errorsOf(`?tr=${OFFSET_TRACE}&sb=300`, OFFSET_TRACE)).toEqual([
      { field: "sb", message: "⛔ Distance hors du profil (20,0 – 120,0 m). Valeur : 300,0 m." },
    ]);
  });

  test("the completed `x` is half of `sb − sa` for the completed stations", () => {
    for (const query of [
      `?tr=${OFFSET_TRACE}`,
      `?tr=${OFFSET_TRACE}&sa=40`,
      `?tr=${TRACE}&sb=60`,
    ]) {
      const { search } = complete(query);
      if (search.tr === undefined) throw new Error(`${query} completed to a manual link`);
      expect(search.x).toBe((search.sb - search.sa) / 2);
    }
  });

  test("a `tr` that does not decode keeps the old completion — the file origin, then 150 m", () => {
    // Unreachable through the validator, which refuses such a payload whole; completion still must
    // not throw on one, and #55 does not change how a bad `tr` is handled.
    const { search } = completeFromDefaults({ tr: "p1.AAAA" });
    expect(search).toMatchObject({ sa: 0, sb: 150, x: 75 });
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
    // 2026-09-23**: `&gm=1` — « Garde exigée » — is five more characters.
    expect(FIRST_RUN_LINK).toHaveLength(142);
    expect(FIRST_RUN_LINK).not.toContain("reg=");
    expect(FIRST_RUN_LINK).not.toContain("mbf=");
    expect(FIRST_RUN_LINK).not.toContain("ea=");
    expect(FIRST_RUN_LINK).not.toContain("mu=");
  });

  test("round-trips: parsing it back yields the same bag, and re-emitting the same string", () => {
    const search = validateSearch(parse(FIRST_RUN_LINK.slice(1)));
    expect(search).toEqual(scenarioToSearch(FIRST_RUN_SCENARIO));
    expect(canonicalLink(search, "/")).toBe(FIRST_RUN_LINK);
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
      expect(`/${defaultStringifySearch(search)}`).toBe(canonicalLink(search, "/"));
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

  it("reads `bp` absent as one Brin porteur — and neither completes nor names it (#84)", () => {
    // A link from before the key: one member, and nothing in the strip or the address bar moves.
    const { search, completed } = complete("?L=250&h=-40");
    expect(searchToScenario(search).carryingLines).toBe(1);
    expect(search.bp).toBeUndefined();
    expect(completed).not.toContain("bp");
    expect(decode("?L=250&bp=2").carryingLines).toBe(2);
    expect(decode("?L=250&bp=1").carryingLines).toBe(1);
  });

  it("reads `cp` absent as the Mise en tension at A — and neither completes nor names it (#85)", () => {
    const { search, completed } = complete("?L=250&h=-40");
    expect(searchToScenario(search).tensioningSide).toBe("A");
    expect(search.cp).toBeUndefined();
    expect(completed).not.toContain("cp");
    expect(decode("?L=250&cp=b").tensioningSide).toBe("B");
    expect(decode("?L=250&cp=a").tensioningSide).toBe("A");
  });

  it("reads `mt` absent as the mouflage — and neither completes nor names it (#86)", () => {
    const { search, completed } = complete("?L=250&h=-40");
    expect(searchToScenario(search).tensioningDevice).toBe("pulley");
    expect(search.mt).toBeUndefined();
    expect(completed).not.toContain("mt");
    expect(decode("?L=250&mt=ms").tensioningDevice).toBe("maestro-s");
    expect(decode("?L=250&mt=ml").tensioningDevice).toBe("maestro-l");
    expect(decode("?L=250&mt=mou").tensioningDevice).toBe("pulley");
  });

  it("keeps a Maestro that arrives beside a câble, as given (ADR-0001)", () => {
    const scenario = decode("?L=250&fam=ac&d=12&r0=1770&cst=iwrc&mt=ms");
    expect(scenario.material.family).toBe("steel");
    expect(scenario.tensioningDevice).toBe("maestro-s");
  });

  it("turns the URL's daN back into the state's newtons — `te`, `tp` and `mbl`", () => {
    // A link written before #85 keeps meaning what it meant: `te` is still `H`.
    expect(decode("?te=253.5").tightness).toEqual({ mode: "tension", H_target: 2535 });
    expect(decode("?tp=263.4").tightness).toEqual({ mode: "anchor", T_target: 2634 });
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

describe("ADR-0001 — a link arrives as given, and the gates judge it", () => {
  test("a knot on HMPE decodes unchanged, blocks the verdict, and its Fix Action clears it", () => {
    const link = decode(
      "?use=tempo&reg=secours10&fam=tx&cls=hmpe&mbl=20000&mu=0.07&k=22&ta=huit&tb=chaise",
    );
    expect(link.terminations).toEqual({
      A: { id: "noeud-de-huit", eta: 0.6 },
      B: { id: "noeud-de-chaise", eta: 0.55 },
    });
    const { errors } = evaluateGates({ scenario: link, trace: null });
    expect(errors).toEqual([
      {
        gate: "verdict",
        kind: "invalid",
        field: "ta",
        alsoOutlined: ["tb"],
        message: "⛔ Nœud impossible sur HMPE — il y glisse, sans rendement défendable (§10.3).",
        fixes: [
          { id: "passer-a-la-terminaison-de-depart", label: "Passer à « Œil cousu / épissuré »" },
        ],
      },
    ]);
    const fixed = applyShippedTerminations(link, errors[0]);
    expect(evaluateGates({ scenario: fixed, trace: null }).errors).toEqual([]);
  });

  test("an end of the other family is kept, not swapped for the family's own", () => {
    expect(decode("?fam=ac&ta=huit").terminations.A).toEqual({ id: "noeud-de-huit", eta: 0.6 });
    const steelEnd = decode("?use=tempo&fam=tx&cls=pa&mbl=30000&mu=0.08&tb=cosse");
    expect(steelEnd.terminations.B).toEqual({ id: "cosse-oeil-flamand", eta: 0.9 });
    expect(evaluateGates({ scenario: steelEnd, trace: null }).errors.map((e) => e.field)).toEqual([
      "tb",
    ]);
  });
});
