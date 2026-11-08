/**
 * The write side — « v1 build spec » § 7 (*The write side*, *The Session*, *Oversize refuses at
 * « Copier le lien »*). `node`, no router and no clipboard: the timers and the two side effects are
 * `./write-side.ts`'s, and their *timing* is asserted in `./write-side.test.ts`.
 *
 * What is asserted here is the pure half — the bag the app publishes, the Session it stores, which
 * writes each timer performs and in which order, and the one refusal the copy button can produce
 * out of its own arithmetic.
 */

import { describe, expect, it } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import {
  FIRST_RUN_RETAINED_TEXTILE,
  FIRST_RUN_SCENARIO,
  firstRunDefaults,
} from "@/lib/scenario/first-run.ts";
import { DEFAULT_LAYERS, readSession, writeSession } from "@/lib/session/session.ts";
import { encodeP1, URL_BUDGET_CHARS } from "@/lib/url/p1.ts";
import { FIRST_RUN_LINK, scenarioToSearch } from "@/lib/url/scenario.ts";

import type { AppState } from "./state.ts";

import {
  addressBarWrites,
  completeScenario,
  copyLink,
  publishable,
  publishedSearch,
  sessionOf,
  sessionWrites,
} from "./persist.ts";
import { initialAppState } from "./state.ts";

const ORIGIN = "https://scoutech.example";
/** The Page « Copier le lien » sits on. */
const PAGE = "/avance";

/** The app's state around a Scenario — every field a link never carries, at its shipped value. */
function appState(scenario: ScenarioDraft, trace: Trace | null = null): AppState {
  return {
    scenario,
    retainedMaterial: FIRST_RUN_RETAINED_TEXTILE,
    retainedManual: null,
    trace,
    layers: DEFAULT_LAYERS,
    link: { refused: null, dropped: [], completed: [], xClamped: false, rewrite: null },
  };
}

/** A draft still holding § 9's two textile blanks — « MBL et μ vides et requis ». */
function blankTextile(): ScenarioDraft {
  return { ...firstRunDefaults(), material: FIRST_RUN_RETAINED_TEXTILE.spec };
}

describe("what the app publishes", () => {
  it("is § 7's canonical bag, and § 9's own link on the shipped scenario", () => {
    expect(publishedSearch(firstRunDefaults())).toEqual(scenarioToSearch(FIRST_RUN_SCENARIO));
    const copied = copyLink({
      scenario: firstRunDefaults(),
      trace: null,
      origin: ORIGIN,
      page: PAGE,
    });
    const query = FIRST_RUN_LINK.slice(FIRST_RUN_LINK.indexOf("?"));
    expect(copied).toEqual({ ok: true, href: `${ORIGIN}/avance${query}` });
  });

  it("suspends both writes while a textile draft still has blanks", () => {
    // `Session.scenario` is a `Scenario`, and `scenarioToSearch` would emit a rope nobody owns.
    // The address bar keeps the last complete Scenario — the same rule « Saisie en cours » applies.
    expect(completeScenario(blankTextile())).toBeNull();
    expect(publishedSearch(blankTextile())).toBeNull();
    expect(sessionOf(appState(blankTextile()))).toBeNull();
    expect(copyLink({ scenario: blankTextile(), trace: null, origin: ORIGIN, page: PAGE })).toEqual(
      {
        ok: false,
        message: "Complétez les champs vides pour partager ce lien.",
      },
    );
  });

  it("completes a filled textile draft into a Scenario the engine's own types accept", () => {
    const filled: ScenarioDraft = {
      ...firstRunDefaults(),
      material: { ...FIRST_RUN_RETAINED_TEXTILE.spec, MBL: 100_000, mu: 0.08 },
    };
    const scenario = completeScenario(filled);
    expect(scenario?.material).toEqual({
      family: "textile",
      ropeClass: "hmpe",
      MBL: 100_000,
      mu: 0.08,
      k: 22,
    });
    expect(publishedSearch(filled)?.mbl).toBe(10_000);
  });
});

describe("the Session is strictly larger than the link", () => {
  it("carries the retained spec, the retained manual span, the Trace and the layer toggles", () => {
    const trace: Trace = {
      d: Float64Array.from([0, 100]),
      z: Float64Array.from([500, 490]),
      dev: 0,
      fileName: "profil.csv",
    };
    const state: AppState = {
      ...appState(firstRunDefaults(), trace),
      retainedManual: { L: 150, h: -18 },
      layers: { unloadedLine: true, chordAB: false, riderTip: false, trajectory: true },
    };
    const session = sessionOf(state);
    expect(session).not.toBeNull();
    expect(session?.scenario).toEqual(FIRST_RUN_SCENARIO);
    // None of these four is a URL key, and that asymmetry is the point: the Session is *your
    // session*, the URL is *this line*.
    expect(session?.retainedMaterial).toBe(FIRST_RUN_RETAINED_TEXTILE);
    expect(session?.retainedManual).toEqual({ L: 150, h: -18 });
    expect(session?.trace).toBe(trace);
    expect(session?.layers).toEqual({
      unloadedLine: true,
      chordAB: false,
      riderTip: false,
      trajectory: true,
    });
  });
});

describe("oversize refuses at « Copier le lien » — it never degrades", () => {
  /** A hand-authored profile of `points` samples: the only shape that can exceed the budget. */
  function bigTrace(points: number): Trace {
    const d = new Float64Array(points);
    const z = new Float64Array(points);
    for (let i = 0; i < points; i++) {
      d[i] = i * 0.5;
      // Alternating altitudes so the delta coding cannot compress the payload away.
      z[i] = 500 + (i % 7) * 0.13;
    }
    return { d, z, dev: 0, fileName: "releve-a-la-main.csv" };
  }

  it("names the point count and sends the user to the file", () => {
    const trace = bigTrace(4812);
    const scenario: ScenarioDraft = {
      ...firstRunDefaults(),
      geometry: { source: "trace", trace: encodeP1(trace), sa: 0, sb: trace.d[4811] },
    };
    const result = copyLink({ scenario, trace, origin: ORIGIN, page: PAGE });
    expect(result.ok).toBe(false);
    // « 4 812 » with a narrow no-break space, so the count cannot wrap into two numbers.
    expect(result).toEqual({
      ok: false,
      message: "Tracé trop volumineux pour un lien (4 812 points). Partagez le fichier CSV.",
    });
  });

  it("copies a real-sized import, because the budget stands on measurement", () => {
    // The three real traces cost 859–910 characters against 2000, so a 200-point profile — the
    // geoportal export's own cap — is comfortably inside it.
    const trace = bigTrace(200);
    const scenario: ScenarioDraft = {
      ...firstRunDefaults(),
      geometry: { source: "trace", trace: encodeP1(trace), sa: 0, sb: trace.d[199] },
    };
    const result = copyLink({ scenario, trace, origin: ORIGIN, page: PAGE });
    expect(result.ok).toBe(true);
    expect((result.ok ? result.href : "").length).toBeLessThanOrEqual(URL_BUDGET_CHARS);
    expect((result.ok ? result.href : "").length).toBeGreaterThan(0);
  });
});

describe("one gate for both writers — an oversize import never reaches the address bar", () => {
  /** 600 samples with a deterministic pseudo-random relief: the codec's worst shape. */
  function ruggedTrace(points: number): Trace {
    const d = new Float64Array(points);
    const z = new Float64Array(points);
    let seed = 12345;
    for (let i = 0; i < points; i++) {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      d[i] = i * 0.5;
      z[i] = 500 + Math.round((seed / 2 ** 31) * 4000) / 100;
    }
    return { d, z, dev: 0, fileName: "releve.csv" };
  }

  function imported(points: number) {
    const trace = ruggedTrace(points);
    const scenario: ScenarioDraft = {
      ...firstRunDefaults(),
      geometry: { source: "trace", trace: encodeP1(trace), sa: 0, sb: trace.d[points - 1] },
    };
    return { trace, scenario };
  }

  function memoryStorage() {
    const entries = new Map<string, string>();
    return {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key),
    };
  }

  it("calls a 600-point import oversize, and the Session restores it with no refusal", () => {
    const { trace, scenario } = imported(600);
    expect(publishable(scenario, ORIGIN, PAGE)).toEqual({ ok: false, reason: "oversize" });

    const session = sessionOf(appState(scenario, trace));
    expect(session).not.toBeNull();
    const restored = initialAppState({ query: "", session });
    expect(restored.link.refused).toBeNull();
    expect(restored.trace).toBe(trace);
    expect(restored.scenario.geometry).toEqual(scenario.geometry);
  });

  it("writes the Session, then a bare `/`, which load never rewrites", () => {
    const { trace, scenario } = imported(600);
    const state = appState(scenario, trace);
    const session = sessionOf(state);
    expect(session).not.toBeNull();
    // The order is the point (#57): `/` means « restore the Session », so the Session goes first.
    expect(addressBarWrites(state, ORIGIN, PAGE)).toEqual([
      { to: "session", session },
      { to: "address-bar", search: {} },
    ]);

    const storage = memoryStorage();
    if (session !== null) writeSession(storage, session);
    const reloaded = initialAppState({ query: "", session: readSession(storage) });
    expect(reloaded.link.rewrite).toBeNull();
    expect(reloaded.link.refused).toBeNull();
    expect(reloaded.trace?.d.length).toBe(600);
  });

  it("leaves the address bar untouched while a textile draft has blanks", () => {
    expect(publishable(blankTextile(), ORIGIN, PAGE)).toEqual({ ok: false, reason: "incomplete" });
    expect(addressBarWrites(appState(blankTextile()), ORIGIN, PAGE)).toEqual([]);
    expect(sessionWrites(appState(blankTextile()))).toEqual([]);
  });

  it("publishes a fitting draft as the canonical bag and href copy uses", () => {
    const { scenario } = imported(200);
    const result = publishable(scenario, ORIGIN, PAGE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.search).toEqual(publishedSearch(scenario));
    // The address bar alone: an in-budget Session keeps its own, slower timer.
    expect(addressBarWrites(appState(scenario), ORIGIN, PAGE)).toEqual([
      { to: "address-bar", search: result.search },
    ]);
    expect(copyLink({ scenario, trace: null, origin: ORIGIN, page: PAGE })).toEqual({
      ok: true,
      href: result.href,
    });
  });

  it("measures the whole href, origin included", () => {
    const { scenario } = imported(200);
    const fits = publishable(scenario, ORIGIN, PAGE);
    expect(fits.ok).toBe(true);
    const long = `https://${"a".repeat(URL_BUDGET_CHARS)}.example`;
    expect(publishable(scenario, long, PAGE)).toEqual({ ok: false, reason: "oversize" });
  });

  it("measures the Page's path too, so the address bar and the copy agree on every Page", () => {
    const { scenario } = imported(200);
    const atRoot = publishable(scenario, ORIGIN, "/");
    if (!atRoot.ok) throw new Error("a 200-point import fits the budget");
    // An origin that leaves the link onto `/` exactly at the budget: « avance » is what overflows.
    const origin = ORIGIN + "a".repeat(URL_BUDGET_CHARS - atRoot.href.length);
    expect(publishable(scenario, origin, "/").ok).toBe(true);
    expect(publishable(scenario, origin, PAGE)).toEqual({ ok: false, reason: "oversize" });
  });
});
