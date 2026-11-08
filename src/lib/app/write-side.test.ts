/**
 * The write side's *timing* — « v1 build spec » § 7's two debounces, and #57's ordering rule: when
 * the address bar becomes a bare `/` because the draft is oversize, storage already holds the
 * Session of that edit.
 *
 * `node` and fake timers. The harness below stands in for `@/components/app/use-persist.ts`, which
 * does exactly this and nothing more: on every edit, disarm both pending writes and arm both again.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Session, SessionStorage } from "@/lib/session/session.ts";
import type { Trace } from "@/lib/terrain/trace.ts";
import type { ValidatedSearch } from "@/lib/url/schema.ts";

import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { DEFAULT_LAYERS, readSession } from "@/lib/session/session.ts";
import { encodeP1 } from "@/lib/url/p1.ts";

import type { AppState } from "./state.ts";
import type { Pending, WriteEffects } from "./write-side.ts";

import {
  publishable,
  SESSION_WRITE_DEBOUNCE_MS,
  sessionOf,
  URL_WRITE_DEBOUNCE_MS,
} from "./persist.ts";
import { armAddressBarWrite, armSessionWrite, writtenSearch } from "./write-side.ts";

const ORIGIN = "https://scoutech.example";
const PAGE = "/avance";

/** The app's state around a Scenario — every field a link never carries, at its shipped value. */
function appState(scenario: ScenarioDraft, trace: Trace | null = null): AppState {
  return {
    scenario,
    retainedMaterial: FIRST_RUN_RETAINED_TEXTILE,
    retainedManual: null,
    trace,
    retainedCsv: null,
    layers: DEFAULT_LAYERS,
    link: { refused: null, dropped: [], completed: [], xClamped: false, rewrite: null },
  };
}

/** A deterministic pseudo-random relief: the codec's worst shape. 600 points is oversize. */
function imported(points: number): AppState {
  const d = new Float64Array(points);
  const z = new Float64Array(points);
  let seed = 12345;
  for (let i = 0; i < points; i++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    d[i] = i * 0.5;
    z[i] = 500 + Math.round((seed / 2 ** 31) * 4000) / 100;
  }
  const trace: Trace = { d, z, dev: 0, origin: { kind: "csv", fileName: "releve.csv" } };
  const scenario: ScenarioDraft = {
    ...firstRunDefaults(),
    geometry: { source: "trace", trace: encodeP1(trace) },
  };
  return appState(scenario, trace);
}

/** A draft still holding § 9's two textile blanks. */
function blankTextile(): AppState {
  return appState({ ...firstRunDefaults(), material: FIRST_RUN_RETAINED_TEXTILE.spec });
}

function memoryStorage(): SessionStorage & { readonly sets: () => number } {
  const entries = new Map<string, string>();
  let sets = 0;
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      sets++;
      entries.set(key, value);
    },
    removeItem: (key) => void entries.delete(key),
    sets: () => sets,
  };
}

/** One address-bar write, with what storage held **at that instant** — #57's whole question. */
type Navigation = { readonly at: number; readonly search: ValidatedSearch; stored: Session | null };

/**
 * `usePersist`, minus React, with the hook's two dependency lists: the address-bar write re-arms
 * when the Scenario or the suspension changes, the Session write when anything does.
 */
function mount({ storage }: { storage: SessionStorage | null }) {
  const navigations: Navigation[] = [];
  const effects: WriteEffects = {
    origin: () => ORIGIN,
    page: () => PAGE,
    storage: () => storage,
    navigate: (search) => {
      navigations.push({
        at: Date.now(),
        search,
        stored: storage === null ? null : readSession(storage),
      });
    },
  };
  let current: AppState | null = null;
  let wasSuspended: boolean | null = null;
  let addressBar: Pending | undefined;
  let session: Pending | undefined;
  const read = () => {
    if (current === null) throw new Error("unreachable: read before the first edit");
    return current;
  };
  return {
    navigations,
    edit(state: AppState, { suspended = false }: { suspended?: boolean } = {}) {
      const rearm = current?.scenario !== state.scenario || wasSuspended !== suspended;
      current = state;
      wasSuspended = suspended;
      if (rearm) {
        addressBar?.cancel();
        addressBar = armAddressBarWrite({ read, suspended, effects });
      }
      session?.cancel();
      session = armSessionWrite({ state, suspended, effects });
    },
    /** A link leaving the Page: both pending writes, performed now. */
    leave() {
      return [...(session?.flush() ?? []), ...(addressBar?.flush() ?? [])];
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("an oversize edit — the Session is stored before the address bar reads `/` (#57)", () => {
  it("holds the edit's Session in storage at the instant the address bar becomes bare `/`", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    const oversize = imported(600);
    expect(publishable(oversize.scenario, ORIGIN, PAGE)).toEqual({ ok: false, reason: "oversize" });

    // The Session *before* the edit — what a reload used to restore silently.
    app.edit(appState(firstRunDefaults()));
    vi.advanceTimersByTime(SESSION_WRITE_DEBOUNCE_MS);
    expect(readSession(storage)?.trace).toBeNull();
    app.navigations.length = 0;

    app.edit(oversize);
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS - 1);
    expect(app.navigations).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(app.navigations).toHaveLength(1);
    const [navigation] = app.navigations;
    expect(navigation.search).toEqual({});
    expect(navigation.stored?.trace?.d.length).toBe(600);
    expect(navigation.stored?.scenario.geometry).toEqual(oversize.scenario.geometry);
    expect(navigation.stored).toEqual(sessionOf(oversize));
  });

  it("keeps the ≈1 s Session write, which rewrites the same content", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    const oversize = imported(600);
    app.edit(oversize);

    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS);
    expect(storage.sets()).toBe(1);
    const early = readSession(storage);

    vi.advanceTimersByTime(SESSION_WRITE_DEBOUNCE_MS - URL_WRITE_DEBOUNCE_MS);
    expect(storage.sets()).toBe(2);
    expect(readSession(storage)).toEqual(early);
  });

  it("stores the state as it stands when the timer fires, not when it was armed", () => {
    // A layer toggle does not re-arm the address-bar timer, but the Session it stores carries it.
    const storage = memoryStorage();
    const app = mount({ storage });
    const oversize = imported(600);
    app.edit(oversize);
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS / 2);
    const toggled: AppState = { ...oversize, layers: { ...oversize.layers, trajectory: true } };
    expect(toggled.scenario).toBe(oversize.scenario);
    app.edit(toggled);
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS / 2);
    expect(app.navigations).toHaveLength(1);
    expect(app.navigations[0].at).toBe(URL_WRITE_DEBOUNCE_MS);
    expect(app.navigations[0].stored?.layers.trajectory).toBe(true);
  });

  it("still writes the address bar when storage is unavailable", () => {
    const app = mount({ storage: null });
    app.edit(imported(600));
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS);
    expect(app.navigations).toEqual([{ at: URL_WRITE_DEBOUNCE_MS, search: {}, stored: null }]);
    expect(() => vi.advanceTimersByTime(SESSION_WRITE_DEBOUNCE_MS)).not.toThrow();
  });
});

describe("an in-budget edit — both writes keep their own timing", () => {
  it("writes the address bar at ≈400 ms and the Session at ≈1 s", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    const fitting = imported(200);
    const link = publishable(fitting.scenario, ORIGIN, PAGE);
    expect(link.ok).toBe(true);
    app.edit(fitting);

    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS - 1);
    expect(app.navigations).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(app.navigations).toEqual([
      { at: URL_WRITE_DEBOUNCE_MS, search: link.ok ? link.search : null, stored: null },
    ]);

    vi.advanceTimersByTime(SESSION_WRITE_DEBOUNCE_MS - URL_WRITE_DEBOUNCE_MS - 1);
    expect(storage.sets()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(storage.sets()).toBe(1);
    expect(readSession(storage)).toEqual(sessionOf(fitting));
    expect(app.navigations).toHaveLength(1);
  });

  it("writes a burst once, from its last edit", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    app.edit(imported(600));
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS - 1);
    const fitting = imported(200);
    app.edit(fitting);

    vi.advanceTimersByTime(SESSION_WRITE_DEBOUNCE_MS);
    expect(app.navigations.map((n) => n.at)).toEqual([2 * URL_WRITE_DEBOUNCE_MS - 1]);
    expect(app.navigations[0].search).not.toEqual({});
    expect(storage.sets()).toBe(1);
    expect(readSession(storage)).toEqual(sessionOf(fitting));
  });

  it("writes neither while § 9's textile blanks stand", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    app.edit(blankTextile());
    vi.advanceTimersByTime(10 * SESSION_WRITE_DEBOUNCE_MS);
    expect(app.navigations).toEqual([]);
    expect(storage.sets()).toBe(0);
  });
});

describe("« Saisie en cours » suspends both writes together", () => {
  it.each([
    ["un brouillon dans le budget", () => imported(200)],
    ["un brouillon hors budget", () => imported(600)],
  ])("%s : ni la barre d'adresse ni la Session", (_, state) => {
    const storage = memoryStorage();
    const app = mount({ storage });
    app.edit(state(), { suspended: true });
    vi.advanceTimersByTime(10 * SESSION_WRITE_DEBOUNCE_MS);
    expect(app.navigations).toEqual([]);
    expect(storage.sets()).toBe(0);
  });

  it("disarms what was pending when it starts", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    const oversize = imported(600);
    app.edit(oversize);
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS - 1);
    app.edit(oversize, { suspended: true });
    vi.advanceTimersByTime(10 * SESSION_WRITE_DEBOUNCE_MS);
    expect(app.navigations).toEqual([]);
    expect(storage.sets()).toBe(0);
  });
});

describe("a Page left inside the debounce hands over its last edit", () => {
  it("performs both pending writes at once, and says what the address bar now holds", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    const fitting = imported(200);
    const link = publishable(fitting.scenario, ORIGIN, PAGE);
    app.edit(fitting);
    vi.advanceTimersByTime(URL_WRITE_DEBOUNCE_MS / 4);

    const written = app.leave();
    expect(written).toEqual([
      { to: "session", session: sessionOf(fitting) },
      { to: "address-bar", search: link.ok ? link.search : null },
    ]);
    expect(writtenSearch(written)).toEqual(link.ok ? link.search : null);
    expect(app.navigations.map((n) => n.at)).toEqual([URL_WRITE_DEBOUNCE_MS / 4]);
    expect(readSession(storage)).toEqual(sessionOf(fitting));
  });

  it("hands over a bare search for an oversize draft, whose Session is already stored", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    const oversize = imported(600);
    app.edit(oversize);
    expect(writtenSearch(app.leave())).toEqual({});
    expect(readSession(storage)).toEqual(sessionOf(oversize));
  });

  it("writes each once: the timers that would have fired write nothing more", () => {
    const storage = memoryStorage();
    const app = mount({ storage });
    app.edit(imported(200));
    app.leave();
    vi.advanceTimersByTime(10 * SESSION_WRITE_DEBOUNCE_MS);
    expect(app.navigations).toHaveLength(1);
    expect(storage.sets()).toBe(1);
    expect(app.leave()).toEqual([]);
  });

  it("has nothing to hand over once the writes have run, or under « Saisie en cours »", () => {
    const app = mount({ storage: memoryStorage() });
    app.edit(imported(200));
    vi.advanceTimersByTime(SESSION_WRITE_DEBOUNCE_MS);
    expect(app.leave()).toEqual([]);
    app.edit(imported(150), { suspended: true });
    expect(writtenSearch(app.leave())).toBeNull();
  });
});
