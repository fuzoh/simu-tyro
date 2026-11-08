/**
 * § 8's mount order, and the four things that hang off it: the Session precedence, the wholesale
 * link, the rewrite trigger and the dropped-keys report. All of it `node`, no router and no DOM —
 * `initialAppState` takes the raw query string and the Session as parameters precisely so that it
 * can be (amendment A).
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { Session } from "@/lib/session/session.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { buildScene } from "@/lib/chart/scene.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { deriveResults } from "@/lib/rail/results.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { placeSpan } from "@/lib/scenario/geometry.ts";
import { DEFAULT_LAYERS } from "@/lib/session/session.ts";
import { replayTrial, TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { parseProfileCsv } from "@/lib/terrain/csv.ts";
import { loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";
import { encodeP1, URL_BUDGET_CHARS } from "@/lib/url/p1.ts";
import { FIRST_RUN_LINK } from "@/lib/url/scenario.ts";
import { canonicalLink } from "@/lib/url/schema.ts";

import type { AppState } from "./state.ts";

import { copyLink, publishedSearch, sessionOf } from "./persist.ts";
import { appReducer, initialAppState } from "./state.ts";

/** The query string of § 9's first-run link — a complete, canonical, nothing-to-do bag. */
const CANONICAL_QUERY = FIRST_RUN_LINK.slice(FIRST_RUN_LINK.indexOf("?"));

/** The samples behind {@link TRACE}, for the tests that need the decoded profile too. */
const TRACE_DATA = {
  d: Float64Array.from([0, 100, 200]),
  z: Float64Array.from([0, -5, -12]),
};

/** A real `p1.` payload: the validator walks it structurally, so a made-up one is a refusal. */
const TRACE = encodeP1({ ...TRACE_DATA, dev: 0 });

/** Where the tests' own cached profile came from: a CSV the user imported. */
const PONT = { kind: "csv", fileName: "pont.csv" } as const;

/** A returning user's Session: their own span, their own toggles, a rope kept on the side. */
function storedSession(): Session {
  const scenario = firstRunDefaults();
  scenario.geometry = { source: "manual", L: 420, h: -33 };
  scenario.rider.xD = 210;
  return {
    scenario,
    retainedMaterial: FIRST_RUN_RETAINED_TEXTILE,
    retainedManual: { L: 150, h: -18 },
    trace: null,
    retainedCsv: null,
    layers: { unloadedLine: true, chordAB: false, riderTip: false, trajectory: true },
  };
}

describe("initialAppState — § 8's mount order", () => {
  describe("bare `/` means « restore the Session »", () => {
    it("opens on the Session, announces nothing and rewrites nothing", () => {
      const session = storedSession();
      const state = initialAppState({ query: "", session });

      expect(state.scenario).toEqual(session.scenario);
      expect(state.layers).toEqual(session.layers);
      expect(state.retainedManual).toEqual({ L: 150, h: -18 });
      // A rewrite here would make `/` destroy itself: the next refresh would stop restoring.
      expect(state.link.rewrite).toBeNull();
      expect(state.link.dropped).toEqual([]);
      expect(state.link.completed).toEqual([]);
    });

    it("falls back to § 9's shipped defaults when there is no Session", () => {
      const state = initialAppState({ query: "", session: null });

      expect(state.scenario).toEqual(firstRunDefaults());
      expect(state.layers).toEqual(DEFAULT_LAYERS);
      expect(state.retainedMaterial).toEqual(FIRST_RUN_RETAINED_TEXTILE);
      expect(state.trace).toBeNull();
      expect(state.link.rewrite).toBeNull();
    });

    it("treats `?v=1` alone as bare — `v` names the schema, not the line", () => {
      const session = storedSession();
      expect(initialAppState({ query: "?v=1", session }).scenario).toEqual(session.scenario);
    });
  });

  describe("any recognised key wins wholesale, and never merges", () => {
    it("takes the Scenario from the link and the extras from the Session", () => {
      const session = storedSession();
      const state = initialAppState({ query: "?L=250&h=-40", session });

      expect(state.scenario.geometry).toEqual({ source: "manual", L: 250, h: -40 });
      // Not the Session's 420 m span with the link's 250 m rider on it — a third scenario nobody
      // authored is exactly what « never a merge » forbids.
      expect(state.scenario.rider.xD).toBe(125);
      // The retained alternate, the cached Trace and the toggles are things a link never carries.
      expect(state.layers).toEqual(session.layers);
      expect(state.retainedManual).toEqual({ L: 150, h: -18 });
    });

    it("completes the recognised keys it omits, literally, from § 9", () => {
      const state = initialAppState({ query: "?L=250&h=-40", session: null });

      expect(state.link.completed).toContain("fl");
      expect(state.link.completed).toContain("mp");
      // `reg` and the three overrides are exempt: their absence **is** the meaning.
      expect(state.link.completed).not.toContain("reg");
      expect(state.link.completed).not.toContain("mbf");
      expect(state.scenario.regime).toBeNull();
      expect(state.scenario.tightness).toEqual({ mode: "sag", D_target: 6 });
    });
  });

  describe("the dropped-keys report", () => {
    it("names each dropped key with **which** fault it was", () => {
      const state = initialAppState({ query: "?L=250&h=-40&xy=1&za=oops", session: null });

      expect(state.link.dropped).toEqual([
        { key: "za", reason: "valeur-non-représentable" },
        { key: "xy", reason: "clé-inconnue" },
      ]);
    });

    it("still names the key when **nothing** recognised survived beside it", () => {
      // `?junk=zz` restores the Session like a bare `/`, but it is not bare: § 8's salvage table
      // gives « clé inconnue » a strip line, and the rewrite is the only thing that can take the
      // key out of the address bar. Losing the report here would lose the whole class.
      const state = initialAppState({ query: "?junk=zz", session: storedSession() });

      expect(state.link.dropped).toEqual([{ key: "junk", reason: "clé-inconnue" }]);
      // The empty bag — a bare `/`, which is what « restore the Session » looks like in an address
      // bar. **Never** the completed defaults: that would convert the restore into a shared link.
      expect(state.link.rewrite).toEqual({});
      expect(state.link.completed).toEqual([]);
      expect(state.scenario).toEqual(storedSession().scenario);
    });

    it("keeps the `v` a junk-only link arrived with, and drops only the junk", () => {
      const state = initialAppState({ query: "?v=1&xy=1", session: null });

      expect(state.link.dropped).toEqual([{ key: "xy", reason: "clé-inconnue" }]);
      expect(state.link.rewrite).toEqual({ v: 1 });
    });

    it("does **not** rewrite a bare `/` or a `?v=1` that dropped nothing", () => {
      expect(initialAppState({ query: "", session: null }).link.rewrite).toBeNull();
      expect(initialAppState({ query: "?v=1", session: null }).link.rewrite).toBeNull();
    });

    it("reports nothing beside a refusal — the refusal is whole-link", () => {
      const state = initialAppState({ query: "?v=3&xy=1", session: null });

      expect(state.link.refused).toMatchObject({ kind: "version-inconnue", received: 3 });
      expect(state.link.dropped).toEqual([]);
    });
  });

  describe("the refusal suppresses the screen rather than merging with it", () => {
    it("carries amendment E's marker and rewrites nothing", () => {
      const state = initialAppState({ query: "?fl=6&lo=151", session: null });

      expect(state.link.refused).toMatchObject({ kind: "deux-directeurs" });
      // Completion is the one operation that would turn « refused whole » into a silent repair.
      expect(state.link.rewrite).toBeNull();
      expect(state.link.completed).toEqual([]);
    });

    it("leaves the Session standing behind it — the back button lands on a live app", () => {
      const session = storedSession();
      expect(initialAppState({ query: "?v=3", session }).scenario).toEqual(session.scenario);
    });
  });

  describe("the rewrite is content, never order", () => {
    it("fires when a key was dropped", () => {
      const state = initialAppState({ query: "?L=250&h=-40&xy=1", session: null });
      expect(state.link.rewrite).not.toBeNull();
      expect(state.link.rewrite).not.toHaveProperty("xy");
    });

    it("fires when a key was completed", () => {
      expect(initialAppState({ query: "?L=250&h=-40", session: null }).link.rewrite).not.toBeNull();
    });

    it("fires when a key left because it is not the active configuration", () => {
      // A redundant `L` beside a `tr` gets no strip line — with a trace present `L` is derived —
      // but leaving it in the address bar would contradict the screen.
      const state = initialAppState({
        query: `?v=1&L=250&tr=${TRACE}${completeTail()}`,
        session: null,
      });
      expect(state.link.rewrite).not.toBeNull();
      expect(state.link.rewrite).not.toHaveProperty("L");
    });

    it("does **not** fire on a complete canonical link", () => {
      expect(initialAppState({ query: CANONICAL_QUERY, session: null }).link.rewrite).toBeNull();
    });

    it("does **not** fire on the same keys in another order", () => {
      const shuffled = CANONICAL_QUERY.slice(1).split("&").reverse().join("&");
      const state = initialAppState({ query: `?${shuffled}`, session: null });
      // Firing a `replace` for cosmetics would rewrite a URL the user is mid-way through editing.
      expect(state.link.rewrite).toBeNull();
      expect(state.scenario).toEqual(firstRunDefaults());
    });

    it("carries the clamped `x`, so the address bar holds what the app holds", () => {
      const state = initialAppState({ query: "?L=150&h=-18&x=400", session: null });

      expect(state.link.xClamped).toBe(true);
      expect(state.scenario.rider.xD).toBe(150);
      expect(state.link.rewrite).toMatchObject({ x: 150 });
    });

    it("does not claim a clamp that did not happen", () => {
      expect(initialAppState({ query: CANONICAL_QUERY, session: null }).link.xClamped).toBe(false);
    });
  });

  describe("an arriving `tr` is a profile, so it is decoded and not merely carried", () => {
    /** A link of an imported scenario: the payload, taken whole. */
    const IMPORTED_QUERY = `?v=1&tr=${TRACE}${completeTail()}`;

    it("holds the decoded Trace, so the span the profil describes exists", () => {
      // Without it `geometry.source === "trace"` stands beside `trace: null` — a profil with no
      // samples, no `Portée`, no `Dénivelé`, no ground, and « (aucun tracé) » on the identity line.
      const state = initialAppState({ query: IMPORTED_QUERY, session: null });

      expect(state.scenario.geometry).toEqual({ source: "trace", trace: TRACE });
      expect(state.trace?.d).toEqual(TRACE_DATA.d);
      expect(state.trace?.z).toEqual(TRACE_DATA.z);
      // § 4's third identity state: the filename does not travel, so the profile is « reçu par
      // lien » rather than a blank the UI has to guess at.
      expect(state.trace?.origin).toEqual({ kind: "lien" });
    });

    it("keeps the Session's own file when the link carries that same profile", () => {
      // § 8: « The Session keeps the filename, since that is the user's own session. » Reloading a
      // link built from your own import may not rename your file « tracé reçu par lien ».
      const session = storedSession();
      session.scenario.geometry = { source: "trace", trace: TRACE };
      const cached: Trace = { ...TRACE_DATA, dev: 0, origin: PONT };
      const state = initialAppState({
        query: IMPORTED_QUERY,
        session: { ...session, trace: cached },
      });

      expect(state.trace).toBe(cached);
    });

    it("decodes rather than adopting a cached Trace the link does not name", () => {
      // The payload is the identity test. A Session whose *active* geometry is manual has a Trace
      // in memory, not on the line, and nothing says it is the one that just arrived.
      const cached: Trace = { ...TRACE_DATA, dev: 0, origin: PONT };
      const state = initialAppState({
        query: IMPORTED_QUERY,
        session: { ...storedSession(), trace: cached },
      });

      expect(state.trace).not.toBe(cached);
      expect(state.trace?.origin).toEqual({ kind: "lien" });
    });

    it("leaves the cached Trace alone when the link carries no `tr` at all", () => {
      const cached: Trace = { ...TRACE_DATA, dev: 0, origin: PONT };
      const state = initialAppState({
        query: "?L=250&h=-40",
        session: { ...storedSession(), trace: cached },
      });

      expect(state.trace).toBe(cached);
      expect(state.scenario.geometry).toEqual({ source: "manual", L: 250, h: -40 });
    });

    it("opens a link from before #88 on the whole profil, naming `sa` and `sb` as unknown", () => {
      // The stations were the sender's placement; the profil now *is* the span, so they are keys
      // nothing reads — dropped with a strip line, never a refusal of the link.
      const state = initialAppState({
        query: `?v=1&sa=50&sb=150&tr=${TRACE}${completeTail()}`,
        session: null,
      });

      expect(state.link.refused).toBeNull();
      expect(state.link.dropped).toEqual([
        { key: "sa", reason: "clé-inconnue" },
        { key: "sb", reason: "clé-inconnue" },
      ]);
      expect(state.scenario.geometry).toEqual({ source: "trace", trace: TRACE });
      expect(state.link.rewrite).not.toHaveProperty("sa");
      expect(state.link.rewrite).not.toHaveProperty("sb");
    });
  });
});

/** The keys an imported link needs so that completion adds nothing and only the `L` row moves. */
function completeTail(): string {
  const canonical = CANONICAL_QUERY.slice(1)
    .split("&")
    .filter((pair) => !/^(v|L|h|x)=/.test(pair));
  return `&${canonical.join("&")}&x=100`;
}

describe("appReducer — one reducer over one object", () => {
  const state = initialAppState({ query: "", session: null });

  it("replaces the scenario wholesale", () => {
    const scenario = firstRunDefaults();
    scenario.rider.xD = 10;
    const next = appReducer(state, { type: "scénario/remplacé", scenario });
    expect(next.scenario.rider.xD).toBe(10);
    expect(next.layers).toBe(state.layers);
  });

  it("patches one part of it and leaves the rest identical", () => {
    const next = appReducer(state, {
      type: "scénario/modifié",
      patch: { regime: "en15567" },
    });
    expect(next.scenario.regime).toBe("en15567");
    expect(next.scenario.geometry).toBe(state.scenario.geometry);
    expect(state.scenario.regime).toBeNull();
  });

  it("sets the layer toggles without touching the scenario", () => {
    const layers = { unloadedLine: true, chordAB: false, riderTip: false, trajectory: true };
    const next = appReducer(state, { type: "calques/basculés", layers });
    expect(next.layers).toEqual(layers);
    expect(next.scenario).toBe(state.scenario);
  });
});

/**
 * A9's five actions — the ones that touch more than one property of the state object. Everything
 * else the Rail does is a `scénario/modifié` patch built by `@/lib/rail/values.ts`.
 */
describe("appReducer — the Rail's five structural actions", () => {
  const first = initialAppState({ query: "", session: null });

  describe("« Réinitialiser le scénario » — § 9's reset table, column by column", () => {
    const edited = appReducer(
      { ...first, trace: { ...TRACE_DATA, dev: 0, origin: PONT } },
      { type: "scénario/modifié", patch: { unit: "kN", regime: "en15567" } },
    );
    const reset = appReducer(edited, { type: "scénario/réinitialisé" });

    it("returns the active configuration to the shipped defaults", () => {
      expect(reset.scenario.geometry).toEqual({ source: "manual", L: 150, h: -18 });
      expect(reset.scenario.tightness).toEqual({ mode: "sag", D_target: 6 });
      // « — choisir — » again: the régime is part of the active configuration.
      expect(reset.scenario.regime).toBeNull();
    });

    it("keeps the Trace cached, the retained spec and the display preferences", () => {
      // Keeping it cached forces a re-add path, or the cache is dead weight — hence the
      // file-identity line's fourth state.
      expect(reset.trace).toBe(edited.trace);
      expect(reset.retainedMaterial).toBe(edited.retainedMaterial);
      expect(reset.layers).toBe(edited.layers);
      expect(reset.scenario.unit).toBe("kN");
    });
  });

  describe("the family flip retains **both** Material Specs", () => {
    const textile = appReducer(first, { type: "matériau/famille", family: "textile" });

    it("§ 9's blank rope is what a first flip lands on", () => {
      // No rope ships: one invented `MBL` decides the verdict.
      expect(textile.scenario.material).toEqual(FIRST_RUN_RETAINED_TEXTILE.spec);
      expect(textile.retainedMaterial?.spec).toEqual(first.scenario.material);
    });

    it("the terminations flip with the family — the whitelist is scoped by it", () => {
      // A steel `cosse` left on a rope is a value the textile picker's own option list does not
      // contain, so the control would silently display its first option instead — § 3 retains the
      // inactive spec « overrides *and* terminations included ».
      expect(textile.scenario.terminations).toEqual(FIRST_RUN_RETAINED_TEXTILE.terminations);
      expect(textile.retainedMaterial?.terminations).toEqual(first.scenario.terminations);
    });

    it("flipping back restores what you built, overrides and terminations included", () => {
      const built = appReducer(textile, {
        type: "scénario/modifié",
        patch: {
          material: { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 },
          terminations: {
            A: { id: "epissure-longue-hmpe", eta: 0.9 },
            B: { id: "oeil-cousu-epissure", eta: 0.85 },
          },
        },
      });
      const backToSteel = appReducer(built, { type: "matériau/famille", family: "steel" });
      expect(backToSteel.scenario.material).toEqual(first.scenario.material);
      expect(backToSteel.scenario.terminations).toEqual(first.scenario.terminations);
      expect(backToSteel.retainedMaterial?.spec).toEqual(built.scenario.material);
      expect(backToSteel.retainedMaterial?.terminations).toEqual(built.scenario.terminations);

      // And the rope comes back exactly as it was left, hardware and all.
      const backToTextile = appReducer(backToSteel, {
        type: "matériau/famille",
        family: "textile",
      });
      expect(backToTextile.scenario.material).toEqual(built.scenario.material);
      expect(backToTextile.scenario.terminations).toEqual(built.scenario.terminations);
    });

    it("asking for the family already active changes nothing", () => {
      expect(appReducer(first, { type: "matériau/famille", family: "steel" })).toBe(first);
    });
  });

  describe("import, removal and re-use — one Trace, three lifetimes", () => {
    const trace: Trace = { ...TRACE_DATA, dev: 0, origin: PONT };
    const imported = appReducer(first, { type: "tracé/importé", trace, tr: TRACE });

    it("the profil is taken whole — A over its first sample, B over its last", () => {
      expect(imported.scenario.geometry).toEqual({ source: "trace", trace: TRACE });
      expect(imported.trace).toBe(trace);
    });

    it("the displaced manual `L`/`h` are retained and restored **exactly**", () => {
      const removed = appReducer(imported, { type: "tracé/retiré" });
      expect(imported.retainedManual).toEqual({ L: 150, h: -18 });
      expect(removed.scenario.geometry).toEqual({ source: "manual", L: 150, h: -18 });
      // Removal changes the terrain source, **not** the Trace.
      expect(removed.trace).toBe(trace);
    });

    it("« Réutiliser ce tracé » takes the profil back exactly as an import does", () => {
      const removed = appReducer(imported, { type: "tracé/retiré" });
      const reused = appReducer(removed, { type: "tracé/réutilisé", tr: TRACE });
      expect(reused.scenario.geometry).toEqual(imported.scenario.geometry);
    });

    it("a reset leaves the fourth state behind: cached, and no longer the terrain", () => {
      const reset = appReducer(imported, { type: "scénario/réinitialisé" });
      expect(reset.scenario.geometry).toEqual({ source: "manual", L: 150, h: -18 });
      expect(reset.trace).toBe(trace);
    });

    it("a terrain source change brings `x_D` with it — the clamp is on every path", () => {
      // The 200 m trace lets the viewpoint travel past the 150 m manual span; the removal that
      // brings the manual span back has to bring the viewpoint back too, or state and the URL
      // publish a position the span does not contain while the scene draws the rider at B.
      const far = appReducer(imported, {
        type: "scénario/modifié",
        patch: { rider: { ...imported.scenario.rider, xD: 190 } },
      });
      expect(appReducer(far, { type: "tracé/retiré" }).scenario.rider.xD).toBe(150);

      // The same in the other direction: an import never *shortens* this span, so nothing moves.
      expect(imported.scenario.rider.xD).toBe(75);
    });

    it("removing nothing is a no-op, and re-using nothing cannot invent a trace", () => {
      expect(appReducer(first, { type: "tracé/retiré" })).toBe(first);
      expect(appReducer(first, { type: "tracé/réutilisé", tr: TRACE })).toBe(first);
    });
  });
});

describe("#88's trial — the geoadmin profil of 2026-11-08, imported with nothing else typed", () => {
  /** `[MEASURED]` geoadmin export of 2026-11-08: 200 points over 435,2 m. */
  function trialProfil(): Trace {
    const text = readFileSync(
      new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
      "utf8",
    );
    const parsed = parseProfileCsv(text, "trace-geoadmin-2026-11-08.csv");
    if (!parsed.ok) throw new Error("the trial profil must import");
    return parsed.trace;
  }

  // The anchor heights of the trial, and a régime so that there is a verdict to reach.
  const ready = appReducer(initialAppState({ query: "", session: null }), {
    type: "scénario/modifié",
    patch: { anchors: { zA: 1.5, zB: 1 }, regime: "en15567" },
  });
  const trace = trialProfil();
  const state = appReducer(ready, { type: "tracé/importé", trace, tr: encodeP1(trace) });

  it("spans the whole profil: L 435,2 m, h −15,5 m, the ground lowest near 243 m", () => {
    const placed = placeSpan(state.scenario, state.trace);
    if (placed === null) throw new Error("the trial profil must place");
    expect(placed.L).toBeCloseTo(435.2, 9);
    expect(placed.h).toBeCloseTo(-15.5, 9);
    const lowest = placed.terrain.zs.indexOf(Math.min(...placed.terrain.zs));
    expect(placed.terrain.xs[lowest]).toBeCloseTo(242.7, 9);
  });

  it("passes every gate and reaches a verdict", () => {
    const report = evaluateGates({ scenario: state.scenario });
    expect(report.errors).toEqual([]);
    const results = deriveResults({
      scenario: state.scenario,
      base: buildScene({ scenario: state.scenario, trace: state.trace }),
      report,
    });
    expect(results?.verdict).not.toBeNull();
  });
});

describe("#90's Positions — they follow the profil, end to end", () => {
  const A = { lat: 46.843556, lon: 6.525035 };
  const B = { lat: 46.846166, lon: 6.520783 };
  const csv = readFileSync(
    new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
    "utf8",
  );
  function importFile(text: string) {
    const parsed = parseProfileCsv(text, "trace.csv");
    if (!parsed.ok) throw new Error("the file must import");
    return parsed.trace;
  }
  function linkSearch(scenario: typeof bare.scenario) {
    const search = publishedSearch(scenario);
    if (search === null) throw new Error("the Scenario must be publishable");
    return search;
  }
  const withCoordinates = importFile(csv);
  const bare = initialAppState({ query: "", session: null });
  const imported = appReducer(bare, {
    type: "tracé/importé",
    trace: withCoordinates,
    tr: encodeP1(withCoordinates),
  });

  it("importing the verified CSV fills A and B, and the link carries them", () => {
    expect(imported.scenario.positions).toEqual({ A, B });
    const link = canonicalLink(linkSearch(imported.scenario), "/");
    expect(link).toContain("lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783");
  });

  it("a CSV with no coordinate columns leaves the Positions empty, even over typed ones", () => {
    const typed = appReducer(bare, {
      type: "scénario/modifié",
      patch: { positions: { A, B: null } },
    });
    const plain = importFile("Distance;Altitude\n0;100\n50;95\n100;90\n");
    const after = appReducer(typed, { type: "tracé/importé", trace: plain, tr: encodeP1(plain) });
    expect(after.scenario.positions).toEqual({ A: null, B: null });
  });

  it("removing a profil whose file had no coordinates keeps the Positions typed since", () => {
    const plain = importFile("Distance;Altitude\n0;100\n50;95\n100;90\n");
    const loaded = appReducer(bare, { type: "tracé/importé", trace: plain, tr: encodeP1(plain) });
    const typed = appReducer(loaded, {
      type: "scénario/modifié",
      patch: { positions: { A, B: null } },
    });
    const removed = appReducer(typed, { type: "tracé/retiré" });
    expect(removed.scenario.positions).toEqual({ A, B: null });
  });

  it("removing the profil unsets the Positions, and re-using it brings them back", () => {
    const removed = appReducer(imported, { type: "tracé/retiré" });
    expect(removed.scenario.positions).toEqual({ A: null, B: null });
    expect(removed.trace?.ends).toEqual({ A, B });
    const reused = appReducer(removed, { type: "tracé/réutilisé", tr: encodeP1(withCoordinates) });
    expect(reused.scenario.positions).toEqual({ A, B });
  });

  it("a link arrives with its Positions, and the profil it carries keeps them as its ends", () => {
    const query = canonicalLink(linkSearch(imported.scenario), "/").slice(2);
    const arrived = initialAppState({ query, session: null });
    expect(arrived.scenario.positions).toEqual({ A, B });
    expect(arrived.trace?.ends).toEqual({ A, B });
    expect(arrived.trace?.origin).toEqual({ kind: "lien" });
  });

  it("a link's Positions win over the cached file's, so « Réutiliser » restores the link's", () => {
    const retyped = { A: { lat: 46.8, lon: 6.5 }, B: { lat: 46.9, lon: 6.6 } };
    const query = canonicalLink(
      linkSearch({ ...imported.scenario, positions: retyped }),
      "/",
    ).slice(2);
    const session: Session = {
      scenario: imported.scenario as Session["scenario"],
      retainedMaterial: imported.retainedMaterial,
      retainedManual: imported.retainedManual,
      trace: imported.trace,
      retainedCsv: imported.retainedCsv,
      layers: imported.layers,
    };
    const arrived = initialAppState({ query, session });
    expect(arrived.scenario.positions).toEqual(retyped);
    expect(arrived.trace?.ends).toEqual(retyped);
    expect(arrived.trace?.origin).toEqual({ kind: "csv", fileName: "trace.csv" });
  });

  it("changes neither the Results nor the Verdict", () => {
    const ready = appReducer(imported, {
      type: "scénario/modifié",
      patch: { anchors: { zA: 1.5, zB: 1 }, regime: "en15567" },
    });
    const read = (scenario: typeof ready.scenario) =>
      deriveResults({
        scenario,
        base: buildScene({ scenario, trace: ready.trace }),
        report: evaluateGates({ scenario }),
      });
    const unplaced = { ...ready.scenario, positions: { A: null, B: null } };
    expect(read(ready.scenario)).toEqual(read(unplaced));
    expect(read(ready.scenario)?.verdict).not.toBeNull();
  });
});

describe("#103's profil geo.admin — loaded between the two Positions, a third origin", () => {
  const ORIGIN = "https://scoutech.example";
  const csv = readFileSync(
    new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
    "utf8",
  );
  const parsed = parseProfileCsv(csv, "trace-geoadmin-2026-11-08.csv");
  if (!parsed.ok) throw new Error("the trial CSV must import");
  const fromCsv = parsed.trace;

  /** The trial's anchor heights and a régime, so that there is a Verdict to compare. */
  const ready = appReducer(initialAppState({ query: "", session: null }), {
    type: "scénario/modifié",
    patch: { anchors: { zA: 1.5, zB: 1 }, regime: "en15567" },
  });
  const onCsv = appReducer(ready, {
    type: "tracé/importé",
    trace: fromCsv,
    tr: encodeP1(fromCsv),
  });

  /** « Charger le profil geo.admin », as the button runs it: the loader, then one dispatch. */
  async function loadOver(state: AppState, fetch: Fetch): Promise<AppState> {
    const { A, B } = state.scenario.positions;
    if (A === null || B === null) throw new Error("both Positions are needed");
    const outcome = await loadGeoadminProfile({ A, B }, fetch);
    if (!outcome.ok) return state;
    return appReducer(state, {
      type: "tracé/importé",
      trace: outcome.trace,
      tr: encodeP1(outcome.trace),
    });
  }

  function verdictOf(state: AppState) {
    const { scenario, trace } = state;
    return deriveResults({
      scenario,
      base: buildScene({ scenario, trace }),
      report: evaluateGates({ scenario }),
    })?.verdict;
  }

  it("loaded over a CSV, it is the active source and the CSV stays in the Session", async () => {
    const loaded = await loadOver(onCsv, replayTrial());

    expect(loaded.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(loaded.trace?.d.length).toBe(200);
    expect(loaded.scenario.geometry).toEqual({
      source: "trace",
      trace: encodeP1(loaded.trace ?? fromCsv),
    });
    // The anchors stand on the profil's two ends, at the heights they had.
    expect(loaded.scenario.anchors).toEqual({ zA: 1.5, zB: 1 });
    expect(loaded.scenario.positions).toEqual(TRIAL_ENDS);

    const session = sessionOf(loaded);
    expect(session?.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(session?.retainedCsv).toBe(fromCsv);
  });

  it("a CSV cached behind manual geometry is kept just the same", async () => {
    const removed = appReducer(onCsv, { type: "tracé/retiré" });
    const typed = appReducer(removed, {
      type: "scénario/modifié",
      patch: { positions: TRIAL_ENDS },
    });
    const loaded = await loadOver(typed, replayTrial());
    expect(loaded.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(loaded.retainedCsv).toBe(fromCsv);
  });

  it("re-using the kept CSV puts it back, and nothing is kept behind it", async () => {
    const loaded = await loadOver(onCsv, replayTrial());
    const kept = loaded.retainedCsv;
    if (kept === null) throw new Error("the CSV must be kept");
    const back = appReducer(loaded, { type: "tracé/importé", trace: kept, tr: encodeP1(kept) });
    expect(back.trace).toBe(fromCsv);
    expect(back.retainedCsv).toBeNull();
  });

  it("a failed load leaves the line exactly as it was", async () => {
    const offline: Fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await loadOver(onCsv, offline)).toBe(onCsv);
  });

  it("the link carries Positions and points, and reopens offline on the same Verdict", async () => {
    const loaded = await loadOver(onCsv, replayTrial());
    const copied = copyLink({
      scenario: loaded.scenario,
      trace: loaded.trace,
      origin: ORIGIN,
      page: "/avance",
    });
    if (!copied.ok) throw new Error(copied.message);
    expect(copied.href.length).toBeLessThanOrEqual(URL_BUDGET_CHARS);
    expect(copied.href).toContain("lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783");
    expect(copied.href).toContain(`tr=${encodeP1(loaded.trace ?? fromCsv)}`);

    // A recipient with no Session and no network: opening the link fetches nothing, and a press
    // of « Charger le profil geo.admin » there fails without moving the line.
    const offline: Fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    const reopened = initialAppState({
      query: copied.href.slice(copied.href.indexOf("?")),
      session: null,
    });
    const pressed = await loadOver(reopened, offline);

    expect(pressed).toBe(reopened);
    expect(reopened.trace?.origin).toEqual({ kind: "lien" });
    expect(reopened.scenario.positions).toEqual(TRIAL_ENDS);
    const verdict = verdictOf(loaded);
    expect(verdict).not.toBeNull();
    expect(verdictOf(pressed)).toEqual(verdict);
  });
});
