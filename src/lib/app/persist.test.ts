/**
 * The write side — « v1 build spec » § 7 (*The write side*, *The Session*, *Oversize refuses at
 * « Copier le lien »*). `node`, no router and no clipboard: the timers and the two side effects are
 * `@/components/app/use-persist.ts`'s, and their *timing* belongs to ticket 31 (amendment B).
 *
 * What is asserted here is the pure half — the bag the app publishes, the Session it stores, and
 * the one refusal the copy button can produce out of its own arithmetic.
 */

import { describe, expect, it } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import {
  FIRST_RUN_RETAINED_TEXTILE,
  FIRST_RUN_SCENARIO,
  firstRunDefaults,
} from "@/lib/scenario/first-run.ts";
import { DEFAULT_LAYERS } from "@/lib/session/session.ts";
import { encodeP1, URL_BUDGET_CHARS } from "@/lib/url/p1.ts";
import { FIRST_RUN_LINK, scenarioToSearch } from "@/lib/url/scenario.ts";

import type { AppState } from "./state.ts";

import { completeScenario, copyLink, publishedSearch, sessionOf } from "./persist.ts";

const ORIGIN = "https://scoutech.example";

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
    const copied = copyLink({ scenario: firstRunDefaults(), trace: null, origin: ORIGIN });
    expect(copied).toEqual({ ok: true, href: `${ORIGIN}${FIRST_RUN_LINK}` });
  });

  it("suspends both writes while a textile draft still has blanks", () => {
    // `Session.scenario` is a `Scenario`, and `scenarioToSearch` would emit a rope nobody owns.
    // The address bar keeps the last complete Scenario — the same rule « Saisie en cours » applies.
    expect(completeScenario(blankTextile())).toBeNull();
    expect(publishedSearch(blankTextile())).toBeNull();
    expect(sessionOf(appState(blankTextile()))).toBeNull();
    expect(copyLink({ scenario: blankTextile(), trace: null, origin: ORIGIN })).toEqual({
      ok: false,
      message: "Complétez les champs vides pour partager ce lien.",
    });
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
    const result = copyLink({ scenario, trace, origin: ORIGIN });
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
    const result = copyLink({ scenario, trace, origin: ORIGIN });
    expect(result.ok).toBe(true);
    expect((result.ok ? result.href : "").length).toBeLessThanOrEqual(URL_BUDGET_CHARS);
    expect((result.ok ? result.href : "").length).toBeGreaterThan(0);
  });
});
