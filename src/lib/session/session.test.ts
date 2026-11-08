import { describe, expect, test } from "vitest";

import type { Scenario } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { DEFAULT_MAP_DISPLAY } from "@/lib/map/display.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { encodeP1, URL_BUDGET_CHARS } from "@/lib/url/p1.ts";

import type { Session, SessionStorage } from "./session.ts";

import { clearSession, DEFAULT_LAYERS, readSession, SESSION_KEY, writeSession } from "./session.ts";

/**
 * `session/session.ts`'s gate — « v1 build spec » § 7 (*The Session — `localStorage`*, *Contracts*),
 * § 5 (*Layers*) and [amendment A](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md),
 * which is what lets every case below run in `node` with no DOM: the storage is a **parameter**.
 *
 * Two things are asserted throughout and never separately: a discard returns `null`, and a discard
 * leaves the bytes alone — « Effacer la session » is the only control that deletes anything.
 */

/** A storage stub. `budget` caps one blob's characters, which is how a quota failure is injected. */
function memoryStorage(entries: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(entries));
  const stub = {
    /** The bytes, for asserting that a discard wrote nothing. */
    map,
    /** Characters one value may hold, `null` = unlimited. */
    budget: null as number | null,
    getItem(key: string): string | null {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (stub.budget !== null && value.length > stub.budget) {
        // A plain `Error`, deliberately: the write side must not sniff for `QuotaExceededError`.
        const quota = new Error(`quota exceeded: ${value.length} > ${stub.budget}`);
        quota.name = "QuotaExceededError";
        throw quota;
      }
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
  };
  return stub;
}

/** A storage that refuses everything — Safari private mode, a disabled origin. */
const HOSTILE: SessionStorage = {
  getItem() {
    throw new Error("storage disabled");
  },
  setItem() {
    throw new Error("storage disabled");
  },
  removeItem() {
    throw new Error("storage disabled");
  },
};

/**
 * A cached profile whose altitudes are **off the centimetre grid on purpose**: the `p1.` codec
 * would quantise them by ceiling, and the Session is not a link.
 */
const TRACE: Trace = {
  d: Float64Array.from([0, 12.5, 40.25, 183.4]),
  z: Float64Array.from([1234.5678, 1230.1234, 1221.9999, 1196.0401]),
  dev: 0.4231,
  origin: { kind: "csv", fileName: "pont-du-diable.csv" },
};

/** The same profile as a link carries it — `tr` verbatim, and no filename. */
const PAYLOAD = encodeP1({ d: TRACE.d, z: TRACE.z, dev: TRACE.dev });

/**
 * A hand-authored profile too dense to share: § 8's oversize case, whose payload runs past the
 * 2000-character **URL** budget. Only « Copier le lien » refuses it; the Session must hold it.
 */
function denseTrace(points: number): Trace {
  const d = new Float64Array(points);
  const z = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    d[i] = Math.round(i * 24.7) / 100;
    z[i] = Math.round(54000 + 300 * Math.sin(i / 40)) / 100;
  }
  return { d, z, dev: null, origin: { kind: "csv", fileName: "profil-dense.csv" } };
}

/** That profile's `tr` value — over budget by construction, asserted in the case that uses it. */
const OVERSIZE_PAYLOAD = encodeP1(denseTrace(4812));

/** The thinnest legal Session: § 9's scenario, nothing retained, nothing cached. */
function bareSession(): Session {
  return {
    scenario: firstRunDefaults(),
    retainedMaterial: null,
    retainedManual: null,
    trace: null,
    retainedCsv: null,
    layers: DEFAULT_LAYERS,
    map: DEFAULT_MAP_DISPLAY,
  };
}

/** Every row of § 7's Session content table at once — the superset a link cannot carry. */
function fullSession(): Session {
  return {
    scenario: firstRunDefaults(),
    retainedMaterial: FIRST_RUN_RETAINED_TEXTILE,
    retainedManual: { L: 150, h: -18 },
    trace: TRACE,
    retainedCsv: null,
    layers: { unloadedLine: true, chordAB: false, riderTip: false, trajectory: true },
    map: { fond: "carte-nationale", pentes: true, view: "3d" },
  };
}

/** § 9's scenario on the imported profile, taken whole — `tr` verbatim, `L`/`h` derived. */
function importedScenario(): Scenario {
  const scenario = firstRunDefaults();
  scenario.geometry = { source: "trace", trace: PAYLOAD };
  return scenario;
}

/** The stored blob as an object, for the cases that hand-build a malformed one. */
function storedBlob(session: Session): Record<string, unknown> {
  const storage = memoryStorage();
  writeSession(storage, session);
  return JSON.parse(storage.map.get(SESSION_KEY) ?? "null") as Record<string, unknown>;
}

describe("the round-trip", () => {
  test("a bare Session comes back identical, under exactly one key", () => {
    const storage = memoryStorage();
    const session = bareSession();

    expect(writeSession(storage, session)).toBe("écrit");
    expect([...storage.map.keys()]).toEqual([SESSION_KEY]);
    expect(readSession(storage)).toEqual(session);
  });

  test("the full Session comes back identical — every row of § 7's content table", () => {
    const storage = memoryStorage();
    const session = fullSession();

    expect(writeSession(storage, session)).toBe("écrit");
    expect(readSession(storage)).toEqual(session);
  });

  test("the Session is a superset of the Scenario: the retained extras survive the round-trip", () => {
    const storage = memoryStorage();
    writeSession(storage, fullSession());

    const restored = readSession(storage);
    // The retained inactive spec is § 9's textile, `MBL` and `μ` still « vides et requis ».
    expect(restored?.retainedMaterial).toEqual(FIRST_RUN_RETAINED_TEXTILE);
    // The retained manual span behind an import — what « Retirer le tracé » restores.
    expect(restored?.retainedManual).toEqual({ L: 150, h: -18 });
    // The layer toggles, which are Session-only and never in the URL.
    expect(restored?.layers).toEqual({
      unloadedLine: true,
      chordAB: false,
      riderTip: false,
      trajectory: true,
    });
  });

  test("the cached Trace comes back as `Float64Array`s, sample for sample, with no quantisation", () => {
    const storage = memoryStorage();
    writeSession(storage, fullSession());

    const trace = readSession(storage)?.trace;
    expect(trace?.d).toBeInstanceOf(Float64Array);
    expect(trace?.z).toBeInstanceOf(Float64Array);
    // Bit-identical, which is the whole reason the Session does not re-encode through `p1.`:
    // the codec's ceiling quantisation would move `z` up by ≤ 0,010 m on every refresh.
    expect(trace?.d).toEqual(TRACE.d);
    expect(trace?.z).toEqual(TRACE.z);
    expect(trace?.dev).toBe(TRACE.dev);
    expect(trace?.origin).toEqual({ kind: "csv", fileName: "pont-du-diable.csv" });
  });

  test("« profil reçu par lien » round-trips as its own origin, with no filename", () => {
    const storage = memoryStorage();
    writeSession(storage, { ...fullSession(), trace: { ...TRACE, origin: { kind: "lien" } } });

    expect(readSession(storage)?.trace?.origin).toEqual({ kind: "lien" });
  });

  test("a profil geo.admin comes back as one, with the CSV it displaced kept beside it (#103)", () => {
    const storage = memoryStorage();
    const geoadmin: Trace = { ...TRACE, origin: { kind: "geoadmin" } };
    writeSession(storage, { ...fullSession(), trace: geoadmin, retainedCsv: TRACE });

    const restored = readSession(storage);
    expect(restored?.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(restored?.retainedCsv?.origin).toEqual({
      kind: "csv",
      fileName: "pont-du-diable.csv",
    });
    expect(restored?.retainedCsv?.z).toEqual(TRACE.z);
  });

  test("a Session stored before #103 keeps its cached profil: the filename names its origin", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const { origin: _origin, ...samples } = blob.trace as Record<string, unknown>;
    const { retainedCsv: _retainedCsv, ...before } = blob;
    storage.map.set(
      SESSION_KEY,
      JSON.stringify({ ...before, trace: { ...samples, fileName: "pont-du-diable.csv" } }),
    );
    expect(readSession(storage)?.trace?.origin).toEqual({
      kind: "csv",
      fileName: "pont-du-diable.csv",
    });
    expect(readSession(storage)?.retainedCsv).toBeNull();

    storage.map.set(
      SESSION_KEY,
      JSON.stringify({ ...before, trace: { ...samples, fileName: null } }),
    );
    expect(readSession(storage)?.trace?.origin).toEqual({ kind: "lien" });
  });

  test("an imported geometry keeps its `p1.` payload verbatim", () => {
    const storage = memoryStorage();
    writeSession(storage, { ...fullSession(), scenario: importedScenario() });

    expect(readSession(storage)?.scenario.geometry).toEqual({ source: "trace", trace: PAYLOAD });
  });

  test("a Session from before #88 restores its profil whole: the stored stations are dropped", () => {
    const storage = memoryStorage();
    const blob = storedBlob({ ...fullSession(), scenario: importedScenario() });
    const scenario = blob.scenario as Record<string, unknown>;
    storage.map.set(
      SESSION_KEY,
      JSON.stringify({
        ...blob,
        scenario: {
          ...scenario,
          geometry: { source: "trace", trace: PAYLOAD, sa: 12.5, sb: 183.4 },
        },
      }),
    );

    const restored = readSession(storage);
    expect(restored?.scenario.geometry).toEqual({ source: "trace", trace: PAYLOAD });
    expect(restored?.trace).toEqual(TRACE);
  });

  test("an over-budget import round-trips: the 2000 characters are the URL's rule, not the Session's", () => {
    // § 8: an oversize trace « refuses at « Copier le lien » » and nowhere else. Discarding it here
    // would lose the user their terrain *and* their scenario on the next refresh.
    expect(OVERSIZE_PAYLOAD.length).toBeGreaterThan(URL_BUDGET_CHARS);
    const storage = memoryStorage();
    const session = {
      ...fullSession(),
      scenario: {
        ...firstRunDefaults(),
        geometry: { source: "trace", trace: OVERSIZE_PAYLOAD },
      } satisfies Scenario,
    };

    expect(writeSession(storage, session)).toBe("écrit");
    expect(readSession(storage)).toEqual(session);
  });

  test("absence survives: « non surchargée » does not come back as an empty override object", () => {
    const storage = memoryStorage();
    writeSession(storage, bareSession());

    const material = readSession(storage)?.scenario.material;
    expect(material?.family).toBe("steel");
    expect(material && "overrides" in material).toBe(false);
  });

  test("`regime: null` — « — choisir — » — round-trips as null, never as a défaut", () => {
    const storage = memoryStorage();
    writeSession(storage, bareSession());

    expect(readSession(storage)?.scenario.regime).toBeNull();
  });

  test("§ 5's shipped toggles: « ligne à vide » off, « corde A–B » on — distances on, trajectory off", () => {
    expect(DEFAULT_LAYERS).toEqual({
      unloadedLine: false,
      chordAB: true,
      riderTip: true,
      trajectory: false,
    });
  });

  test("a Session stored before the two later layers is kept, and they take their defaults", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...blob, layers: { unloadedLine: true, chordAB: false } }),
    );

    const restored = readSession(storage);
    // Not discarded: the cached Trace is the whole reason it matters.
    expect(restored?.trace).not.toBeNull();
    expect(restored?.layers).toEqual({
      unloadedLine: true,
      chordAB: false,
      riderTip: DEFAULT_LAYERS.riderTip,
      trajectory: DEFAULT_LAYERS.trajectory,
    });
  });
});

describe("the version is in the key", () => {
  test("a blob under another version is neither read nor migrated nor deleted", () => {
    const v2 = JSON.stringify({ scenario: firstRunDefaults(), somethingNew: true });
    const storage = memoryStorage({ "scoutech:session:v2": v2 });

    expect(readSession(storage)).toBeNull();
    expect(storage.map.get("scoutech:session:v2")).toBe(v2);
  });

  test("the write side touches `scoutech:session:v1` and nothing else", () => {
    const v2 = JSON.stringify({ scenario: firstRunDefaults() });
    const storage = memoryStorage({ "scoutech:session:v2": v2 });

    writeSession(storage, bareSession());
    expect([...storage.map.keys()].sort()).toEqual(["scoutech:session:v1", "scoutech:session:v2"]);
    expect(storage.map.get("scoutech:session:v2")).toBe(v2);
  });

  test("an older shape stored under this key is discarded, never migrated silently", () => {
    // A plausible previous schema: the Scenario, flat, with no Session wrapper around it.
    const legacy = JSON.stringify(firstRunDefaults());
    const storage = memoryStorage({ [SESSION_KEY]: legacy });

    expect(readSession(storage)).toBeNull();
    // Nothing was repaired into place: a read never writes.
    expect(storage.map.get(SESSION_KEY)).toBe(legacy);
  });

  test("an absent key is « no session », not an error", () => {
    expect(readSession(memoryStorage())).toBeNull();
  });
});

describe("a blob that fails its schema is discarded, whole", () => {
  /** Each row is a blob under `scoutech:session:v1` that must read as « no session ». */
  const CASES: readonly { readonly name: string; readonly blob: string }[] = [
    { name: "not JSON at all", blob: "{scenario:" },
    { name: "JSON, but not an object", blob: "42" },
    { name: "JSON null", blob: "null" },
    { name: "an array", blob: "[]" },
    {
      name: "a missing row of the content table",
      blob: JSON.stringify({ ...storedBlob(fullSession()), layers: undefined }),
    },
    {
      name: "a missing Scenario",
      blob: JSON.stringify({ ...storedBlob(fullSession()), scenario: null }),
    },
    {
      name: "an unrecognised régime id",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: { ...firstRunDefaults(), regime: "en15567-2" },
      }),
    },
    {
      name: "an unrecognised termination id",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: {
          ...firstRunDefaults(),
          terminations: { A: { id: "colle", eta: 0.9 }, B: { id: "cosse-oeil-flamand", eta: 0.9 } },
        },
      }),
    },
    {
      name: "an unrecognised tightness mode",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: { ...firstRunDefaults(), tightness: { mode: "flèche", D_target: 6 } },
      }),
    },
    {
      name: "a number that `JSON.stringify` wrote as null — a NaN or an infinity",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: { ...firstRunDefaults(), geometry: { source: "manual", L: null, h: -18 } },
      }),
    },
    {
      name: "a number stored as a string",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: { ...firstRunDefaults(), anchors: { zA: "12", zB: 12 } },
      }),
    },
    {
      name: "a cached Trace whose two columns disagree",
      blob: JSON.stringify({
        ...storedBlob(fullSession()),
        trace: { d: [0, 10, 20], z: [1, 2], dev: null, origin: { kind: "lien" } },
      }),
    },
    {
      name: "an empty cached Trace",
      blob: JSON.stringify({
        ...storedBlob(fullSession()),
        trace: { d: [], z: [], dev: null, origin: { kind: "lien" } },
      }),
    },
    {
      name: "an imported geometry whose payload is not a `p1.` trace",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: {
          ...firstRunDefaults(),
          geometry: { source: "trace", trace: "p1.@@@@" },
        },
      }),
    },
    {
      name: "an imported geometry whose payload was truncated",
      blob: JSON.stringify({
        ...storedBlob(bareSession()),
        scenario: {
          ...firstRunDefaults(),
          geometry: { source: "trace", trace: PAYLOAD.slice(0, 20) },
        },
      }),
    },
    {
      name: "a retained textile spec with a string where a number or null belongs",
      blob: JSON.stringify({
        ...storedBlob(fullSession()),
        retainedMaterial: {
          spec: { family: "textile", ropeClass: "hmpe", MBL: "100000", mu: null, k: 22 },
          terminations: FIRST_RUN_RETAINED_TEXTILE.terminations,
        },
      }),
    },
    {
      name: "a retained spec of an unknown family",
      blob: JSON.stringify({
        ...storedBlob(fullSession()),
        retainedMaterial: {
          spec: { family: "chaîne", pitch: 12 },
          terminations: FIRST_RUN_RETAINED_TEXTILE.terminations,
        },
      }),
    },
    {
      name: "a retained spec with no terminations beside it",
      blob: JSON.stringify({
        ...storedBlob(fullSession()),
        // Half a retained pair is not a weaker one: it is a family whose hardware nobody chose,
        // and the flip would land a steel termination on a rope.
        retainedMaterial: { spec: FIRST_RUN_RETAINED_TEXTILE.spec },
      }),
    },
    {
      name: "a layer toggle that is not a boolean",
      blob: JSON.stringify({
        ...storedBlob(fullSession()),
        layers: { unloadedLine: "on", chordAB: true },
      }),
    },
  ];

  test.each(CASES)("$name reads as null, and the blob is left alone", ({ blob }) => {
    const storage = memoryStorage({ [SESSION_KEY]: blob });

    expect(readSession(storage)).toBeNull();
    expect(storage.map.get(SESSION_KEY)).toBe(blob);
  });

  test("a complete session written after a discard reads back normally", () => {
    const storage = memoryStorage({ [SESSION_KEY]: "{ nonsense" });

    expect(readSession(storage)).toBeNull();
    expect(writeSession(storage, fullSession())).toBe("écrit");
    expect(readSession(storage)).toEqual(fullSession());
  });
});

describe("the quota rule — store the scenario without the Trace, and say so", () => {
  test("a Trace that does not fit is dropped, the scenario is kept, and the outcome says which", () => {
    const storage = memoryStorage();
    const scenarioOnly = JSON.stringify({ ...storedBlob(fullSession()), trace: null });
    // Room for the scenario alone, and not a character more.
    storage.budget = scenarioOnly.length;

    expect(writeSession(storage, fullSession())).toBe("sans-tracé");

    const restored = readSession(storage);
    expect(restored?.trace).toBeNull();
    expect(restored?.scenario).toEqual(firstRunDefaults());
    expect(restored?.retainedMaterial).toEqual(FIRST_RUN_RETAINED_TEXTILE);
  });

  test("the CSV kept behind a profil geo.admin is dropped with the Trace, never alone", () => {
    const storage = memoryStorage();
    const session = { ...fullSession(), retainedCsv: TRACE };
    storage.budget = JSON.stringify({
      ...storedBlob(session),
      trace: null,
      retainedCsv: null,
    }).length;

    expect(writeSession(storage, session)).toBe("sans-tracé");
    const restored = readSession(storage);
    expect(restored?.trace).toBeNull();
    expect(restored?.retainedCsv).toBeNull();
  });

  test("an imported line survives a dropped cache: the payload rides in the Scenario", () => {
    const storage = memoryStorage();
    const session = { ...fullSession(), scenario: importedScenario() };
    storage.budget = JSON.stringify({ ...storedBlob(session), trace: null }).length;

    expect(writeSession(storage, session)).toBe("sans-tracé");
    expect(readSession(storage)?.scenario.geometry).toEqual({ source: "trace", trace: PAYLOAD });
  });

  test("a storage that refuses even the scenario reports « échec » and destroys nothing", () => {
    const storage = memoryStorage();
    writeSession(storage, bareSession());
    const before = storage.map.get(SESSION_KEY);

    storage.budget = 0;
    expect(writeSession(storage, fullSession())).toBe("échec");
    expect(storage.map.get(SESSION_KEY)).toBe(before);
  });

  test("a trace-less Session that does not fit fails once, without a pointless retry", () => {
    const storage = memoryStorage();
    let attempts = 0;
    const counting: SessionStorage = {
      ...storage,
      setItem() {
        attempts++;
        throw new Error("full");
      },
    };

    expect(writeSession(counting, bareSession())).toBe("échec");
    expect(attempts).toBe(1);
  });
});

describe("« Effacer la session » — the only destructive control", () => {
  test("it removes this key and leaves every other one standing", () => {
    const storage = memoryStorage({ "unrelated:key": "kept" });
    writeSession(storage, fullSession());

    clearSession(storage);

    expect(readSession(storage)).toBeNull();
    expect(storage.map.get("unrelated:key")).toBe("kept");
  });
});

describe("a storage that throws is « no session », never a crash", () => {
  test("the read runs in a lazy initialiser, so it can only return null", () => {
    expect(readSession(HOSTILE)).toBeNull();
  });

  test("the write reports « échec »", () => {
    expect(writeSession(HOSTILE, fullSession())).toBe("échec");
  });

  test("the clear is silent", () => {
    expect(() => clearSession(HOSTILE)).not.toThrow();
  });
});

describe("a textile spec carrying its diameter", () => {
  test("`d` survives a write and a read", () => {
    const scenario: Scenario = {
      ...firstRunDefaults(),
      usage: "TEMPORAIRE",
      regime: "secours10",
      material: {
        family: "textile",
        ropeClass: "pa-en1891a",
        MBL: 31_000,
        mu: 0.073,
        k: 1.27,
        d: 11,
      },
      terminations: structuredClone(FIRST_RUN_RETAINED_TEXTILE.terminations),
    };
    const storage = memoryStorage();
    writeSession(storage, { ...bareSession(), scenario });
    expect(readSession(storage)?.scenario.material).toEqual(scenario.material);
  });
});

describe("Brins porteurs in the Session (#84)", () => {
  test("two members survive a write and a read", () => {
    const storage = memoryStorage();
    writeSession(storage, {
      ...bareSession(),
      scenario: { ...firstRunDefaults(), carryingLines: 2 },
    });
    expect(readSession(storage)?.scenario.carryingLines).toBe(2);
  });

  test("a Session stored before the key is kept, and reads one member", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const older = { ...(blob.scenario as Record<string, unknown>) };
    delete older.carryingLines;
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: older }));

    const restored = readSession(storage);
    // Not discarded: its cached Trace survives a key it could not have held.
    expect(restored?.trace).not.toBeNull();
    expect(restored?.scenario.carryingLines).toBe(1);
  });

  test("a third member is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const scenario = { ...(blob.scenario as Record<string, unknown>), carryingLines: 3 };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario }));
    expect(readSession(storage)).toBeNull();
  });
});

describe("the tensioning side and the prétension driver in the Session (#85)", () => {
  test("side B and a prétension driver survive a write and a read", () => {
    const storage = memoryStorage();
    const scenario: Scenario = {
      ...firstRunDefaults(),
      tensioningSide: "B",
      tightness: { mode: "anchor", T_target: 2500 },
    };
    writeSession(storage, { ...bareSession(), scenario });
    expect(readSession(storage)?.scenario).toMatchObject({
      tensioningSide: "B",
      tightness: { mode: "anchor", T_target: 2500 },
    });
  });

  test("a Session stored before the key is kept, and reads side A", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const older = { ...(blob.scenario as Record<string, unknown>) };
    delete older.tensioningSide;
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: older }));

    const restored = readSession(storage);
    expect(restored?.trace).not.toBeNull();
    expect(restored?.scenario.tensioningSide).toBe("A");
  });

  test("a third side is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const scenario = { ...(blob.scenario as Record<string, unknown>), tensioningSide: "C" };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario }));
    expect(readSession(storage)).toBeNull();
  });
});

describe("the Mise en tension device in the Session (#86)", () => {
  test("a Maestro survives a write and a read", () => {
    const storage = memoryStorage();
    writeSession(storage, {
      ...bareSession(),
      scenario: { ...firstRunDefaults(), tensioningDevice: "maestro-l" },
    });
    expect(readSession(storage)?.scenario.tensioningDevice).toBe("maestro-l");
  });

  test("a Session stored before the key is kept, and reads the mouflage", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const older = { ...(blob.scenario as Record<string, unknown>) };
    delete older.tensioningDevice;
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: older }));

    const restored = readSession(storage);
    expect(restored?.trace).not.toBeNull();
    expect(restored?.scenario.tensioningDevice).toBe("pulley");
  });

  test("an unknown device is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const scenario = { ...(blob.scenario as Record<string, unknown>), tensioningDevice: "rig" };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario }));
    expect(readSession(storage)).toBeNull();
  });
});

describe("the Vent in the Session (#87)", () => {
  test("a wind survives a write and a read", () => {
    const storage = memoryStorage();
    const wind = { speedKmh: 50, directionDeg: 45 };
    writeSession(storage, { ...bareSession(), scenario: { ...firstRunDefaults(), wind } });
    expect(readSession(storage)?.scenario.wind).toEqual(wind);
  });

  test("a Session stored before the key is kept, and reads no wind", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const older = { ...(blob.scenario as Record<string, unknown>) };
    delete older.wind;
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: older }));

    const restored = readSession(storage);
    expect(restored?.trace).not.toBeNull();
    expect(restored?.scenario.wind).toEqual({ speedKmh: 0, directionDeg: 0 });
  });
});

describe("the ride's constants in the Session (#89)", () => {
  test("typed constants survive a write and a read, `ρ` included", () => {
    const storage = memoryStorage();
    const dynamics = { CdA: 0.5, rho: 1.069, F0: 20, kv: 2, mu: 0.02 };
    writeSession(storage, { ...bareSession(), scenario: { ...firstRunDefaults(), dynamics } });
    expect(readSession(storage)?.scenario.dynamics).toEqual(dynamics);
  });

  test("a Session stored before the key is kept, and rides on §12.2's defaults", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const older = { ...(blob.scenario as Record<string, unknown>) };
    delete older.dynamics;
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: older }));

    const restored = readSession(storage);
    expect(restored?.trace).not.toBeNull();
    expect(restored?.scenario.dynamics).toEqual({
      CdA: 0.45,
      rho: null,
      F0: 15,
      kv: 1.5,
      mu: 0.015,
    });
  });

  test("a constant that is not a number is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const scenario = blob.scenario as Record<string, unknown>;
    const dynamics = { ...(scenario.dynamics as Record<string, unknown>), CdA: "0,45" };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: { ...scenario, dynamics } }));
    expect(readSession(storage)).toBeNull();
  });
});

describe("ADR-0001 — a restored Session is kept as given, and the gates judge it", () => {
  test("a knot on HMPE comes back unchanged and blocks the verdict on Terminaison A", () => {
    const knotted: Scenario = {
      ...firstRunDefaults(),
      usage: "TEMPORAIRE",
      regime: "secours10",
      material: { family: "textile", ropeClass: "hmpe", MBL: 200_000, mu: 0.07, k: 22 },
      terminations: {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "noeud-de-chaise", eta: 0.55 },
      },
    };
    const storage = memoryStorage();
    writeSession(storage, { ...bareSession(), scenario: knotted });

    const restored = readSession(storage);
    if (restored === null) throw new Error("the stored Session was discarded");
    expect(restored.scenario.terminations).toEqual(knotted.terminations);
    expect(evaluateGates({ scenario: restored.scenario }).errors).toEqual([
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
  });
});

describe("the Positions in the Session (#90)", () => {
  const A = { lat: 46.843556, lon: 6.525035 };
  const B = { lat: 46.846166, lon: 6.520783 };

  test("Positions survive a write and a read", () => {
    const storage = memoryStorage();
    const positions = { A, B: null };
    writeSession(storage, { ...bareSession(), scenario: { ...firstRunDefaults(), positions } });
    expect(readSession(storage)?.scenario.positions).toEqual(positions);
  });

  test("a cached Trace keeps the coordinates of its ends, and one without has none", () => {
    const storage = memoryStorage();
    writeSession(storage, { ...bareSession(), trace: { ...TRACE, ends: { A, B } } });
    expect(readSession(storage)?.trace?.ends).toEqual({ A, B });

    writeSession(storage, { ...bareSession(), trace: TRACE });
    expect(readSession(storage)?.trace).not.toHaveProperty("ends");
  });

  test("a Session stored before the key is kept, and reads both Positions unknown", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const older = { ...(blob.scenario as Record<string, unknown>) };
    delete older.positions;
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: older }));

    const restored = readSession(storage);
    expect(restored?.trace).not.toBeNull();
    expect(restored?.scenario.positions).toEqual({ A: null, B: null });
  });

  test("a coordinate that is not a number is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const scenario = blob.scenario as Record<string, unknown>;
    const positions = { A: { lat: "46,84", lon: 6.5 }, B: null };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, scenario: { ...scenario, positions } }));
    expect(readSession(storage)).toBeNull();
  });
});

describe("the vue de dessus's Fond de carte and Couche pentes (#93), 2D or 3D (#95), in the Session", () => {
  test("the orthophoto under the Couche pentes, in 3D, survives a write and a read", () => {
    const storage = memoryStorage();
    const map = { fond: "orthophoto", pentes: true, view: "3d" } as const;
    writeSession(storage, { ...bareSession(), map });
    expect(readSession(storage)?.map).toEqual(map);
  });

  test("a Session stored before the key is kept, and reads the carte claire alone", () => {
    const storage = memoryStorage();
    const { map: _map, ...older } = storedBlob(fullSession());
    storage.setItem(SESSION_KEY, JSON.stringify(older));

    const restored = readSession(storage);
    expect(restored?.trace).not.toBeNull();
    expect(restored?.map).toEqual({ fond: "carte-claire", pentes: false, view: "2d" });
  });

  test("a Session stored before the Vue 3D keeps its Fond and reads the vue de dessus", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const before95 = { fond: "carte-nationale", pentes: true };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, map: before95 }));
    expect(readSession(storage)?.map).toEqual({ ...before95, view: "2d" });
  });

  test("a view the app does not know is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    const map = { fond: "carte-claire", pentes: false, view: "vr" };
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, map }));
    expect(readSession(storage)).toBeNull();
  });

  test("a Fond the app does not know is not a Session — the blob is discarded whole", () => {
    const storage = memoryStorage();
    const blob = storedBlob(fullSession());
    storage.setItem(SESSION_KEY, JSON.stringify({ ...blob, map: { fond: "osm", pentes: false } }));
    expect(readSession(storage)).toBeNull();
  });
});
