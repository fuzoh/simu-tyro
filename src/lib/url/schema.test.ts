import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, test } from "vitest";

import type { DroppedKey, LinkRefusal, RefusalKind, ValidatedSearch } from "./schema.ts";

import { encodeP1 } from "./p1.ts";
import {
  CANONICAL_KEYS,
  canonicalLink,
  hasScenarioKey,
  isLinkRefusal,
  keepRefusalOutOfTheAddressBar,
  parseLinkSearch,
  REFUSAL_KINDS,
  reportDroppedKeys,
  salvageSearch,
  validateSearch,
} from "./schema.ts";

/**
 * `url/schema.ts`'s gate — « v1 build spec » § 7 (*The search-param schema — flat readable keys*,
 * *The key table*, *Canonical key order*, *Refusal, dropping, and rewriting — the salvage table*),
 * § 8 (*The validator's hard rules*, *Les surfaces du lien*) and
 * [amendments](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) **D** and **E**.
 *
 * Table-driven, one table per row of the salvage table, because the salvage table *is* the
 * contract: three refusal classes refuse the link whole — as a **returned marker**, amendment E,
 * never a throw — two salvage classes are ignored-and-named, and an out-of-range value is applied
 * as-is. Completion of recognised absent keys is gated in `./scenario.test.ts`.
 */

/** The router's own parse of a query string — `defaultParseSearch`, i.e. what the route receives. */
const parse = parseLinkSearch;

/**
 * The refusal marker a query yields, or a failure. Amendment E: `validateSearch` **returns**
 * normally for all three refusal classes, so this asserts the marker rather than catching a throw.
 */
function refusalFor(query: string): LinkRefusal {
  const search = validateSearch(parse(query));
  const { refused } = search;
  if (refused === undefined) throw new Error(`expected « ${query} » to refuse the link whole`);
  // Whole-link: the refusal suppresses the rest of the bag rather than merging with it.
  expect(Object.keys(search)).toEqual(["refused"]);
  return refused;
}

/** A valid three-point `p1.` payload, built by the codec rather than transcribed. */
const TRACE = encodeP1({
  d: Float64Array.from([0, 50, 100]),
  z: Float64Array.from([0, -4, -9]),
  dev: null,
});

describe("the key table and canonical order", () => {
  test("the canonical keys are § 7's key table, in its order, with no duplicate", () => {
    expect(CANONICAL_KEYS).toEqual([
      "v",
      "u",
      "use",
      "reg",
      "L",
      "h",
      "sa",
      "sb",
      "za",
      "zb",
      "fl",
      "te",
      "lo",
      "vr",
      "tp",
      "cp",
      "bp",
      "fam",
      "d",
      "r0",
      "cst",
      "mbf",
      "ea",
      "mu",
      "cls",
      "mbl",
      "k",
      "ta",
      "tb",
      "na",
      "nb",
      "mp",
      "hr",
      "gm",
      "daf",
      "x",
      "tr",
    ]);
    expect(new Set(CANONICAL_KEYS).size).toBe(CANONICAL_KEYS.length);
  });

  test("a bag built out of order is emitted in the key table's order", () => {
    // `qss.encode()` iterates `for (const key in obj)`, so insertion order *is* the query string:
    // two links to the same Scenario are string-identical only if the bag is canonicalised.
    const link = canonicalLink({ x: 120, L: 250, v: 1, h: -40 }, "/");
    expect(link).toBe("/?v=1&L=250&h=-40&x=120");
  });

  test("two Pages' links to one Scenario differ by the path alone", () => {
    // One schema for every Page (ADR-0002), so the query is the Scenario and the path is the Page.
    const search: ValidatedSearch = { x: 120, L: 250, v: 1, h: -40 };
    expect(canonicalLink(search, "/avance")).toBe("/avance?v=1&L=250&h=-40&x=120");
    expect(canonicalLink({}, "/avance")).toBe("/avance");
  });
});

describe("the three refusal classes come back as a marker, never as a throw", () => {
  const refusals: ReadonlyArray<{
    readonly name: string;
    readonly query: string;
    readonly kind: LinkRefusal["kind"];
  }> = [
    { name: "an unknown schema version", query: "?v=3&L=250", kind: "version-inconnue" },
    { name: "a non-numeric schema version", query: "?v=%22a%22", kind: "version-inconnue" },
    { name: "an undecodable trace — no sentinel", query: "?tr=AAAA", kind: "tracé-illisible" },
    {
      name: "an undecodable trace — truncated payload",
      query: `?tr=${TRACE.slice(0, TRACE.length - 3)}`,
      kind: "tracé-illisible",
    },
    { name: "a trace that is not even a string", query: "?tr=1234", kind: "tracé-illisible" },
    {
      name: "an oversize trace",
      query: `?tr=p1.${"A".repeat(2001)}`,
      kind: "tracé-hors-budget",
    },
    { name: "two tightness drivers — fl + lo", query: "?fl=6&lo=151.64", kind: "deux-directeurs" },
    { name: "two tightness drivers — fl + te", query: "?fl=6&te=253.5", kind: "deux-directeurs" },
    { name: "two tightness drivers — vr + te", query: "?vr=0.8&te=253.5", kind: "deux-directeurs" },
    {
      name: "two tightness drivers — te + lo",
      query: "?te=253.5&lo=151.64",
      kind: "deux-directeurs",
    },
    // The fifth driver joins the same rule (#85): the prétension beside any other is two models.
    { name: "two tightness drivers — tp + te", query: "?tp=260&te=253.5", kind: "deux-directeurs" },
    { name: "two tightness drivers — tp + fl", query: "?tp=260&fl=6", kind: "deux-directeurs" },
    {
      name: "two tightness drivers — tp + lo",
      query: "?lo=151.64&tp=260",
      kind: "deux-directeurs",
    },
    { name: "two tightness drivers — tp + vr", query: "?vr=0.8&tp=260", kind: "deux-directeurs" },
    {
      name: "three tightness drivers at once",
      query: "?fl=6&te=253.5&lo=151.64",
      kind: "deux-directeurs",
    },
    {
      name: "two drivers, one of them unrepresentable — presence is the encoding",
      query: "?fl=abc&lo=151.64",
      kind: "deux-directeurs",
    },
  ];

  test.each(refusals)("$name refuses the link whole", ({ query, kind }) => {
    // The gate, as amendment E rewrote it: no throw, so the router never sees a failed match and
    // the refusal surface answers **200**. On the pinned tree a throw answers 500, and § 8's
    // refusal copy — « nothing failed to load and the status line agrees » — rests on the 200.
    expect(() => validateSearch(parse(query))).not.toThrow();
    const refusal = refusalFor(query);
    expect(refusal.kind).toBe(kind);
    // What the reason line needs is all the marker has to carry.
    expect(isLinkRefusal(refusal)).toBe(true);
    expect(typeof refusal.message).toBe("string");
  });

  test("the four reason-line kinds are the ones the marker may hold", () => {
    expect(REFUSAL_KINDS).toEqual([
      "version-inconnue",
      "tracé-illisible",
      "tracé-hors-budget",
      "deux-directeurs",
    ]);
  });

  test("`salvageSearch` refuses whole: the marker, and no salvage report beside it", () => {
    // « Applied whole or refused whole »: the refusal is checked on the **raw** bag before any
    // per-key pass, so the unknown `xy` and the unrepresentable `za` are never even reported —
    // there is no strip on a refused link, only the refusal surface.
    const salvage = salvageSearch(parse("?v=3&L=250&xy=3&za=quatre"));
    expect(salvage.dropped).toEqual([]);
    expect(salvage.search.refused?.kind).toBe("version-inconnue");
    expect(reportDroppedKeys("?v=3&xy=3")).toEqual([]);
  });

  test("the rewrite cannot emit the marker, but that is only half the invariant", () => {
    // `refused` is not a key of § 7's table, so *our* writer cannot emit it: a refused link that
    // somehow reached it would produce a bare `/`, never `?refused=…`. The router's own writer is
    // the other half, and it is asserted against a real router below — this assertion alone is
    // vacuous with respect to the path that actually 307s.
    expect(canonicalLink(validateSearch(parse("?v=3&L=250")), "/")).toBe("/");
  });

  test("the marker survives a second pass, because the router validates its own merge", () => {
    // `buildLocation`'s search middleware returns `{ ...incoming, ...validated }` and validates
    // again; a marker dropped as an unknown key on that pass would flip the refusal off.
    const once = validateSearch(parse("?fl=6&lo=151.64"));
    expect(validateSearch({ ...once })).toEqual(once);
    expect(validateSearch({ ...parse("?fl=6&lo=151.64"), ...once })).toEqual(once);
  });

  test("`v` absent means v1 and never refuses", () => {
    expect(validateSearch(parse("?L=250&h=-40"))).toEqual({ L: 250, h: -40 });
  });

  test("`v=1` is the one accepted version", () => {
    expect(validateSearch(parse("?v=1&L=250"))).toEqual({ v: 1, L: 250 });
  });

  test("the unknown version names the value it saw, for § 8's reason line", () => {
    expect(refusalFor("?v=3").received).toBe(3);
  });

  test("a single driver is never a contradiction", () => {
    expect(validateSearch(parse("?fl=6"))).toEqual({ fl: 6 });
    expect(validateSearch(parse("?te=253.5"))).toEqual({ te: 253.5 });
    expect(validateSearch(parse("?lo=151.64"))).toEqual({ lo: 151.64 });
  });

  test("a valid trace is kept verbatim, never decoded into the validated search", () => {
    const search = validateSearch(parse(`?tr=${TRACE}&sa=0&sb=100`));
    expect(search.tr).toBe(TRACE);
    expect(search).toEqual({ tr: TRACE, sa: 0, sb: 100 });
  });
});

/**
 * The half of « the marker never reaches the address bar » that `canonicalLink` cannot see. The
 * router builds hrefs of its own: `applySearchMiddleware` merges `{ ...incoming, ...validated }`,
 * `stringifySearch` writes every key of the merge, and `loadServerRoute` 307s whenever the rebuilt
 * href differs from the one that arrived. So the invariant has to be asserted **through a router**,
 * on the same call `loadServerRoute` makes.
 *
 * Still a `node` unit test under amendment A: a router is constructed and asked to build a
 * location. Nothing renders, nothing needs a DOM.
 */
describe("the marker never reaches the address bar — asserted through the router", () => {
  /**
   * What `loadServerRoute` compares. `next.publicHref` is the incoming href, `canonical.publicHref`
   * is the rebuild; equal means 200 with the URL untouched, different means a 307 to the rebuild.
   *
   * @param query the incoming query string.
   * @param install whether the index route installs {@link keepRefusalOutOfTheAddressBar} — false
   *   is the control, and it is what documents why the middleware is not optional.
   */
  function rebuild(query: string, install: boolean) {
    const root = createRootRoute({});
    const index = createRoute({
      getParentRoute: () => root,
      path: "/",
      validateSearch,
      ...(install ? { search: { middlewares: [keepRefusalOutOfTheAddressBar] } } : {}),
    });
    const router = createRouter({
      routeTree: root.addChildren([index]),
      history: createMemoryHistory({ initialEntries: [`/${query}`] }),
    });
    router.updateLatestLocation();
    const canonical = router.buildLocation({
      to: "/",
      search: true,
      params: true,
      hash: true,
      state: true,
      _includeValidateSearch: true,
    });
    return {
      incoming: router.latestLocation.publicHref,
      rebuilt: canonical.publicHref,
      matched: router.matchRoutes(router.latestLocation).at(-1)?.search as
        | ValidatedSearch
        | undefined,
    };
  }

  const refusedLinks: ReadonlyArray<{
    readonly name: string;
    readonly query: string;
    readonly kind: RefusalKind;
  }> = [
    { name: "an unknown version", query: "?v=3", kind: "version-inconnue" },
    { name: "two tightness drivers", query: "?fl=6&lo=151.64", kind: "deux-directeurs" },
    { name: "an undecodable trace", query: "?tr=p1.%C2%A3%C2%A3", kind: "tracé-illisible" },
  ];

  test.each(refusedLinks)("$name is written back exactly as it arrived", ({ query, kind }) => {
    const { incoming, rebuilt, matched } = rebuild(query, true);
    // No 307, so the address bar keeps the sender's link and « Copier le lien » ships no marker.
    expect(rebuilt).toBe(incoming);
    expect(rebuilt).not.toContain("refused");
    // And the refusal surface still has its marker: `matchRoutes` runs no search middleware.
    expect(matched?.refused?.kind).toBe(kind);
  });

  test("without the middleware the router 307s the marker into the URL — the control", () => {
    // Measured on the pinned tree, and the reason the middleware exists. If this stops holding,
    // the middleware became unnecessary; it did not become wrong.
    const { incoming, rebuilt } = rebuild("?v=3", false);
    expect(incoming).toBe("/?v=3");
    expect(rebuilt).toContain("refused=");
    expect(rebuilt).not.toBe(incoming);
  });

  test("an accepted link is untouched by the middleware", () => {
    const { incoming, rebuilt, matched } = rebuild("?L=250&h=-40", true);
    expect(rebuilt).toBe(incoming);
    expect(matched).toEqual({ L: 250, h: -40 });
  });

  test("an unknown key still survives the load, because only the rewrite cleans it", () => {
    // Probe 5: `search.strict` is unset, so `?xy=3` stays in the URL for the strip to name.
    const { incoming, rebuilt } = rebuild("?L=250&xy=3", true);
    expect(rebuilt).toBe(incoming);
    expect(reportDroppedKeys("?L=250&xy=3")).toEqual([{ key: "xy", reason: "clé-inconnue" }]);
  });
});

describe("an unknown or unrepresentable key is ignored and named", () => {
  const salvaged: ReadonlyArray<{
    readonly name: string;
    readonly query: string;
    readonly dropped: readonly DroppedKey[];
    readonly kept: ValidatedSearch;
  }> = [
    {
      name: "a key the schema does not know",
      query: "?L=250&xy=3&h=-40",
      dropped: [{ key: "xy", reason: "clé-inconnue" }],
      kept: { L: 250, h: -40 },
    },
    {
      name: "a number key that did not arrive as a number",
      query: "?L=250&za=quatre",
      dropped: [{ key: "za", reason: "valeur-non-représentable" }],
      kept: { L: 250 },
    },
    {
      name: "a number key that arrived as a boolean",
      query: "?L=250&daf=true",
      dropped: [{ key: "daf", reason: "valeur-non-représentable" }],
      kept: { L: 250 },
    },
    {
      name: "a non-finite number",
      query: "?L=250&h=1e999",
      dropped: [{ key: "h", reason: "valeur-non-représentable" }],
      kept: { L: 250 },
    },
    {
      name: "a token outside its enum",
      query: "?u=daN&use=jamais&reg=en15567",
      dropped: [{ key: "use", reason: "valeur-non-représentable" }],
      kept: { u: "daN", reg: "en15567" },
    },
    {
      name: "a grade the schema does not publish",
      query: "?fam=ac&d=12&r0=1800&cst=iwrc",
      dropped: [{ key: "r0", reason: "valeur-non-représentable" }],
      kept: { fam: "ac", d: 12, cst: "iwrc" },
    },
    {
      name: "a third Brin porteur, which the schema does not publish",
      query: "?L=250&bp=3",
      dropped: [{ key: "bp", reason: "valeur-non-représentable" }],
      kept: { L: 250 },
    },
    {
      name: "a third anchor for the Mise en tension, which the schema does not publish",
      query: "?L=250&cp=c",
      dropped: [{ key: "cp", reason: "valeur-non-représentable" }],
      kept: { L: 250 },
    },
    {
      name: "a duplicate key, which arrives as an array",
      query: "?L=250&L=300",
      dropped: [{ key: "L", reason: "valeur-non-représentable" }],
      kept: {},
    },
    {
      name: "both salvage kinds at once, each named with its own reason",
      query: "?xy=3&za=quatre&L=250",
      dropped: [
        { key: "za", reason: "valeur-non-représentable" },
        { key: "xy", reason: "clé-inconnue" },
      ],
      kept: { L: 250 },
    },
  ];

  test.each(salvaged)("$name is dropped and named", ({ query, dropped, kept }) => {
    const salvage = salvageSearch(parse(query));
    expect(salvage.search).toEqual(kept);
    expect(salvage.dropped).toEqual(dropped);
  });

  test("`validateSearch` itself never returns the report, and never `{ key: undefined }`", () => {
    // Measured: `{ M: undefined }` makes the **server** 307-strip the key before any client code
    // runs, even under `ssr: false` — so a dropped key must be *absent*, not present-and-undefined.
    const search = validateSearch(parse("?L=250&za=quatre&xy=3"));
    expect(Object.keys(search)).toEqual(["L"]);
    expect("za" in search).toBe(false);
    expect("dropped" in search).toBe(false);
  });

  test("a hand-written `refused` that is not a marker is an unknown key, not a refusal", () => {
    // The pass-through is for the router handing us back our own output. A query string can only
    // carry JSON, so anything that fails the structural guard is named in the strip like any typo.
    expect(isLinkRefusal({ kind: "pas-un-motif", message: "x" })).toBe(false);
    expect(isLinkRefusal("version-inconnue")).toBe(false);
    expect(isLinkRefusal(null)).toBe(false);
    // `received` is part of what the type declares, so it is part of what the guard checks: § 8's
    // « version de schéma inconnue (v = 3) » quotes it, and a marker without it would render
    // `undefined` with no type error to warn anyone.
    expect(isLinkRefusal({ kind: "version-inconnue", message: "x" })).toBe(false);
    expect(isLinkRefusal({ kind: "version-inconnue", message: "x", received: undefined })).toBe(
      true,
    );
    const salvage = salvageSearch(parse("?L=250&refused=%7B%22kind%22%3A%22nope%22%7D"));
    expect(salvage.search).toEqual({ L: 250 });
    expect(salvage.dropped).toEqual([{ key: "refused", reason: "clé-inconnue" }]);
  });

  test("the reporter takes the raw query string, never `window.location`", () => {
    // Amendment A: the seam is a parameter, which is what keeps this a plain `node` unit test.
    expect(reportDroppedKeys("?L=250&xy=3")).toEqual([{ key: "xy", reason: "clé-inconnue" }]);
    expect(reportDroppedKeys("L=250&xy=3")).toEqual([{ key: "xy", reason: "clé-inconnue" }]);
    expect(reportDroppedKeys("")).toEqual([]);
  });
});

describe("an out-of-range but representable value is applied as-is", () => {
  // § 7's governing principle: the URL is a **typing boundary, not a validation boundary**. Every
  // row here is a value the form's own validation will refuse — arriving faithfully is the point.
  const asIs: ReadonlyArray<{
    readonly name: string;
    readonly query: string;
    readonly kept: ValidatedSearch;
  }> = [
    { name: "a negative span", query: "?L=-5", kept: { L: -5 } },
    { name: "a span far past the 2000 m ceiling", query: "?L=99999", kept: { L: 99999 } },
    { name: "a zero passenger mass", query: "?mp=0", kept: { mp: 0 } },
    { name: "an efficiency above 1", query: "?na=1.4", kept: { na: 1.4 } },
    { name: "a negative flèche target", query: "?fl=-3", kept: { fl: -3 } },
    {
      name: "a rider position outside the span",
      query: "?L=150&x=9000",
      kept: { L: 150, x: 9000 },
    },
    {
      name: "a régime forbidden under the family — it arrives already invalid",
      query: "?reg=secours10&fam=ac",
      kept: { reg: "secours10", fam: "ac" },
    },
    {
      name: "a textile termination under steel",
      query: "?fam=ac&ta=huit&tb=chaise",
      kept: { fam: "ac", ta: "huit", tb: "chaise" },
    },
  ];

  test.each(asIs)("$name is applied unchanged", ({ query, kept }) => {
    expect(validateSearch(parse(query))).toEqual(kept);
  });

  test("nothing is coerced — the value returned is the value received", () => {
    // Measured: returning `String(1)` for `bad=1` produced `307 → ?bad=%221%22`. Whatever the
    // validator returns is what `stringifySearch` writes back.
    const raw = parse("?L=250&u=daN&r0=1770&fl=6.0");
    const search = validateSearch(raw);
    for (const [key, value] of Object.entries(search)) expect(value).toBe(raw[key]);
  });

  test("it is idempotent, because the router runs it 3× per document request", () => {
    // Call sites measured at `router.js` `matchRoutesLightweight`, the search middleware inside
    // `buildLocation`, and `matchRoutesInternal` — again per `buildLocation`. A validator whose
    // second pass differed from its first would oscillate the address bar.
    const once = validateSearch(parse("?v=1&L=250&h=-40&xy=3&za=quatre&fl=6"));
    expect(validateSearch({ ...once })).toEqual(once);
    expect(salvageSearch({ ...once }).dropped).toEqual([]);
  });
});

describe("a link with no scenario key restores the Session", () => {
  test("a bare `/` carries no scenario key, so nothing is completed and the Session wins", () => {
    expect(hasScenarioKey(validateSearch(parse("")))).toBe(false);
    // `v` alone is the schema version, not a scenario key: `/?v=1` still means « restore ».
    expect(hasScenarioKey(validateSearch(parse("?v=1")))).toBe(false);
    expect(hasScenarioKey(validateSearch(parse("?L=250")))).toBe(true);
  });
});
