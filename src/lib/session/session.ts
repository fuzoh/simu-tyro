/**
 * The Session — « v1 build spec » § 7 (*The Session — `localStorage`*, *Contracts*, *Scenario vs
 * Session*), § 5 (*Layers — a fixed always-on set plus exactly two toggles*), § 9 (*« Réinitialiser
 * le scénario » versus « Effacer la session »*) and
 * [amendments A and D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
 *
 * One key, `scoutech:session:v1`, holding **strictly more than a link carries**: the Scenario, the
 * retained inactive Material Spec, the retained manual `L`/`h` behind an import, the cached Trace
 * with its filename, and the display preferences.
 *
 * Rules this module exists to keep:
 *
 * - **The storage object is a parameter, never `localStorage` reached for.** That is amendment A's
 *   seam: with no DOM in the room the round-trip and the version-key case are plain `node` unit
 *   tests, and the client-only subtree passes the real `localStorage` in. `Storage` satisfies
 *   {@link SessionStorage} structurally, so the call site is `readSession(localStorage)`.
 * - **The version is in the key, so a schema change is a clean miss.** Nothing carries a version
 *   *inside* the blob: a v2 app writes `scoutech:session:v2` and a v1 blob is simply never read
 *   again. An unrecognised shape under this key is **discarded, never migrated silently** — a
 *   migration is a guess at what the user meant, and the guess lands in a safety tool's inputs.
 * - **A discard is not a deletion.** A blob that fails `JSON.parse` or fails the schema makes
 *   {@link readSession} return `null`; the bytes are left where they are. § 7 gives « Effacer la
 *   session » — behind a confirmation — as the **only** destructive control, and a read is not it.
 *   The next debounced write overwrites the blob anyway.
 * - **Valibot validates the stored shape on read.** The Session is a boundary — as much as the URL
 *   and the CSV are — so the schema lives here, and `src/lib/sim/` stays dependency-free. Unlike
 *   the URL schema this one is **valid-or-discard, not per-key salvage**: half a Session is not a
 *   weaker Session, it is a scenario nobody authored, which is the same failure a merge would be.
 * - **The Session is a superset of the Scenario, and the extras are what make the two Session
 *   controls distinct.** « Réinitialiser le scénario » returns {@link Session.scenario} to § 9's
 *   defaults while the retained spec, the cached Trace and the display preferences survive; only
 *   « Effacer la session » removes the key.
 * - **The cached Trace is stored as its own samples, not re-encoded through `p1.`.** The link
 *   codec quantises altitude by ceiling — safe-side and ≤ 0,010 m, but still lossy — and it is
 *   lossy because a URL has a 2000-character budget. `localStorage` has no such budget, and a
 *   refresh must return the user their own file, so `d` and `z` ride as plain number arrays and
 *   come back as `Float64Array`. The *active* imported geometry keeps carrying its `p1.` payload
 *   verbatim, exactly as the URL spells it.
 * - **Losing terrain on a refresh would be the app's worst refresh behaviour**, so the Trace is
 *   always cached — and when the write does not fit, {@link writeSession} stores the scenario
 *   **without** it and says which happened, rather than losing the whole session silently.
 * - **Nothing here throws.** A read runs inside the store's lazy initialiser at the client-only
 *   subtree's first render — there is no frame before it lands and no error boundary above it that
 *   should ever see a storage fault. A storage that throws (Safari private mode, a disabled
 *   origin) reads as « no session » and writes as `"échec"`.
 * - **The imported trace stays local.** Nothing in this module sends anything anywhere; the write
 *   side is one `setItem`.
 * - **Back is not undo, and this module makes no attempt at one.** No history of sessions, no
 *   stack: history restores search params but not the retained specs, so an undo built here would
 *   land the user somewhere subtly different from where they left.
 */

import * as v from "valibot";

import type { MapDisplay } from "@/lib/map/display.ts";
import type { EndTermination, ForceUnit, Scenario, TextileDraft } from "@/lib/scenario/types.ts";
import type { MaterialSpec, RegimeId, SteelSpec, TerminationId } from "@/lib/sim";
import type { Trace, TraceEnds, TraceOrigin } from "@/lib/terrain/trace.ts";

import { DEFAULT_MAP_DISPLAY, FONDS, MAP_VIEWS } from "@/lib/map/display.ts";
import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { REGIMES, TERMINATIONS } from "@/lib/sim";
import { P1Error, validateP1Structure } from "@/lib/url/p1.ts";

/**
 * The one key. **The version is in the key** — § 7 — so a schema change is a miss rather than a
 * parse error, and « Effacer la session » has exactly one thing to delete.
 */
export const SESSION_KEY = "scoutech:session:v1";

/**
 * What this module needs of a storage. The DOM's `Storage` satisfies it structurally, and so does
 * a plain object in a `node` test — which is the whole point of taking it as a parameter
 * (amendment A).
 */
export type SessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/**
 * The View Strip's layer toggles, which are **Session-only and never in the URL**: they change what
 * is drawn, never how a number reads — which is the line `u` sits on the other side of. § 5 shipped
 * the first two; the last two were added on the user's request of 2026-09-23.
 */
export type LayerToggles = {
  /** « ligne à vide ». */
  readonly unloadedLine: boolean;
  /** « corde A–B ». */
  readonly chordAB: boolean;
  /** « distances » — the two distances printed beside the rider's handle, moving with it. */
  readonly riderTip: boolean;
  /** « trajectoire » — the load's path over the whole traverse, dotted. */
  readonly trajectory: boolean;
};

/**
 * § 5's shipped states — « ligne à vide » **off**, « corde A–B » **on** — plus the two later layers:
 * the distances **on**, since they were asked for in order to be read, and the trajectory **off**.
 */
export const DEFAULT_LAYERS: LayerToggles = {
  unloadedLine: false,
  chordAB: true,
  riderTip: true,
  trajectory: false,
};

/**
 * The **retained inactive** Material Spec — § 7's « both Material Specs », of which the URL carries
 * only the active one.
 *
 * A {@link TextileDraft} rather than the engine's `TextileSpec` because § 9 ships the retained
 * textile with `MBL` and `μ` « vides et requis »: a rope nobody typed has no numbers, and a
 * complete spec is assignable to the draft anyway.
 *
 * **The terminations ride with the spec**, because § 3 retains « the inactive one — overrides *and
 * terminations* included » and the termination whitelist is scoped by family: a pair kept beside
 * the spec rather than inside it would let a flip land a steel `cosse` on a rope, which is a value
 * no picker on that screen can even show back.
 */
export type RetainedMaterial = {
  /** The inactive family's spec — steel complete, textile possibly still blank. */
  readonly spec: SteelSpec | TextileDraft;
  /** That family's two ends, exactly as they were when the family last drove the line. */
  readonly terminations: { readonly A: EndTermination; readonly B: EndTermination };
};

/** § 7's « retained manual `L`/`h` behind an import », restored by « Retirer le tracé ». */
export type RetainedManualGeometry = {
  /** Portée, m. */
  readonly L: number;
  /** Dénivelé, m. */
  readonly h: number;
};

/**
 * What the browser remembers — § 7's Session content table, one property per row. Strictly larger
 * than what a link carries, and that asymmetry is the point: the Session is *your session*, the URL
 * is *this line*.
 */
export type Session = {
  /** The active configuration — every URL key, and nothing retained on the side. */
  readonly scenario: Scenario;
  /** The other family's spec, kept so a flip back restores what was built. `null` = none yet. */
  readonly retainedMaterial: RetainedMaterial | null;
  /** The manual span an import displaced, `null` when no import ever displaced one. */
  readonly retainedManual: RetainedManualGeometry | null;
  /**
   * The cached profile — **cached even while inactive**, which is what makes « Réinitialiser le
   * scénario »'s promise to keep it real and « Tracé en mémoire … (non utilisé) » implementable.
   */
  readonly trace: Trace | null;
  /** The CSV a profil geo.admin displaced (#103): a file the app cannot fetch back. */
  readonly retainedCsv: Trace | null;
  /** § 5's two toggles. The other display preferences — `u`, the active tightness mode — are the
   * Scenario's own fields, so they persist with it rather than beside it. */
  readonly layers: LayerToggles;
  /** The vue de dessus's Fond de carte and Couche pentes (#93), 2D or 3D (#95) — never in a link. */
  readonly map: MapDisplay;
};

/**
 * What {@link writeSession} did, because § 7's quota rule is « store the scenario without it **and
 * say so** » — a silent trace-less write would let a refresh lose terrain with no explanation.
 */
export type WriteOutcome =
  /** The whole Session is stored. */
  | "écrit"
  /** Stored without the cached Trace and the kept CSV: they did not fit. The caller says so. */
  | "sans-tracé"
  /** Nothing was stored, and what was already there is untouched. */
  | "échec";

/**
 * The cached Trace as it is stored: `Float64Array` is not JSON, so the samples ride as plain
 * arrays. **Not** re-encoded through `p1.` — voir the module note on the codec's ceiling
 * quantisation.
 */
type StoredTrace = {
  readonly d: readonly number[];
  readonly z: readonly number[];
  readonly dev: number | null;
  readonly origin: TraceOrigin;
  readonly ends?: TraceEnds;
};

/** The Session as JSON holds it — a {@link Session} with each Trace's two arrays widened. */
type StoredSession = Omit<Session, "trace" | "retainedCsv"> & {
  readonly trace: StoredTrace | null;
  readonly retainedCsv: StoredTrace | null;
};

/**
 * A finite number, and nothing else. `JSON.stringify` writes `NaN` and both infinities as `null`,
 * so a blob that ever held one fails here and is discarded whole — which is the intended reading:
 * an unrepresentable number in a persisted scenario is a corrupt blob, not a value to salvage.
 */
const FINITE = v.pipe(v.number(), v.finite());

/** The engine's régime ids, derived from its own table so a new régime cannot leave a stale copy. */
const REGIME_IDS = Object.keys(REGIMES) as [RegimeId, ...RegimeId[]];

/** The engine's termination ids, derived the same way. */
const TERMINATION_IDS = Object.keys(TERMINATIONS) as [TerminationId, ...TerminationId[]];

/** § 7's `u`. Display only: it changes no number's meaning anywhere. */
const FORCE_UNIT: v.GenericSchema<unknown, ForceUnit> = v.picklist(["daN", "kN", "kgf"]);

/**
 * § 7's geometry union — manual `L`/`h`, or an import's verbatim `p1.` payload, taken whole. The
 * payload is checked **structurally**, by the codec that wrote it: a corrupt one would otherwise
 * surface as a throw inside a memoised derivation, several frames after the read that could still
 * have discarded it. Structurally and **not** against the address budget — voir
 * {@link isDecodableP1}.
 *
 * A Session written before #88 also holds two stations here; `v.object` drops unknown keys, so its
 * retained profil comes back whole rather than discarding the user's import.
 */
const GEOMETRY: v.GenericSchema<unknown, Scenario["geometry"]> = v.variant("source", [
  v.object({ source: v.literal("manual"), L: FINITE, h: FINITE }),
  v.object({
    source: v.literal("trace"),
    trace: v.pipe(v.string(), v.check(isDecodableP1, "not a p1. payload")),
    offPositions: v.optional(v.literal(true)),
  }),
]);

/** § 7's presence-encoded Tightness Driver, as state spells it: one mode, one target. */
const TIGHTNESS: v.GenericSchema<unknown, Scenario["tightness"]> = v.variant("mode", [
  v.object({ mode: v.literal("sag"), D_target: FINITE }),
  v.object({ mode: v.literal("tension"), H_target: FINITE }),
  v.object({ mode: v.literal("anchor"), T_target: FINITE }),
  v.object({ mode: v.literal("length"), L0: FINITE }),
  v.object({ mode: v.literal("ratio"), ratio: FINITE }),
]);

/**
 * §13.1's steel spec. `overrides` **absent** is « non surchargée » — never `{}`, never zeroes.
 *
 * Left inferred rather than annotated `v.GenericSchema<unknown, SteelSpec>`, because `v.variant`
 * takes object schemas and a widened one is not one. The type link is not lost: {@link
 * MATERIAL_SPEC} and {@link RETAINED_MATERIAL} carry it for both arms at once.
 */
const STEEL_SPEC = v.object({
  family: v.literal("steel"),
  d: FINITE,
  R0: v.picklist([1770, 1960]),
  construction: v.picklist(["fibre-core", "iwrc"]),
  overrides: v.optional(
    v.object({ MBF: v.optional(FINITE), EA: v.optional(FINITE), mu: v.optional(FINITE) }),
  ),
});

/** §13.2's textile spec, complete — what the engine consumes when textile is the active family. */
const TEXTILE_SPEC = v.object({
  family: v.literal("textile"),
  ropeClass: v.picklist(["hmpe", "pa-en1891a", "polyester"]),
  MBL: FINITE,
  mu: FINITE,
  k: FINITE,
  d: v.optional(FINITE),
});

/**
 * A textile spec **as the form holds it** — § 9's « vides et requis ». `null` is « blank and
 * required », never zero, so the three numbers are nullable and a complete spec still parses.
 */
const TEXTILE_DRAFT = v.object({
  family: v.literal("textile"),
  ropeClass: v.picklist(["hmpe", "pa-en1891a", "polyester"]),
  MBL: v.nullable(FINITE),
  mu: v.nullable(FINITE),
  k: v.nullable(FINITE),
  d: v.optional(FINITE),
});

/** The **active** Material Spec: whichever family is driving the line, complete. */
const MATERIAL_SPEC: v.GenericSchema<unknown, MaterialSpec> = v.variant("family", [
  STEEL_SPEC,
  TEXTILE_SPEC,
]);

/** One end's hardware. `eta` is a **field**, so it is stored and read, never re-looked-up. */
const END_TERMINATION: v.GenericSchema<unknown, Scenario["terminations"]["A"]> = v.object({
  id: v.picklist(TERMINATION_IDS),
  eta: FINITE,
});

/** The **retained** pair: the inactive spec — steel complete, textile possibly blank — and its ends. */
const RETAINED_MATERIAL: v.GenericSchema<unknown, RetainedMaterial> = v.object({
  spec: v.variant("family", [STEEL_SPEC, TEXTILE_DRAFT]),
  terminations: v.object({ A: END_TERMINATION, B: END_TERMINATION }),
});

/** A Position as stored: both coordinates, finite. */
const POSITION = v.object({ lat: FINITE, lon: FINITE });

/** § 7's key table as state spells it. `regime: null` **is** « — choisir — », a legitimate state. */
const SCENARIO: v.GenericSchema<unknown, Scenario> = v.object({
  unit: FORCE_UNIT,
  usage: v.picklist(["PERMANENTE", "TEMPORAIRE"]),
  regime: v.nullable(v.picklist(REGIME_IDS)),
  geometry: GEOMETRY,
  anchors: v.object({ zA: FINITE, zB: FINITE }),
  // Added with #84, optional with the shipped one member for the same reason as `hClearMin`.
  carryingLines: v.optional(v.picklist([1, 2]), FIRST_RUN_SCENARIO.carryingLines),
  // Added with #85, optional with the shipped side for the same reason.
  tensioningSide: v.optional(v.picklist(["A", "B"]), FIRST_RUN_SCENARIO.tensioningSide),
  tensioningDevice: v.optional(
    v.picklist(["pulley", "maestro-s", "maestro-l"]),
    FIRST_RUN_SCENARIO.tensioningDevice,
  ),
  tightness: TIGHTNESS,
  material: MATERIAL_SPEC,
  terminations: v.object({ A: END_TERMINATION, B: END_TERMINATION }),
  rider: v.object({
    mp: FINITE,
    hRider: FINITE,
    // Added 2026-09-23. **Optional with the shipped default**, so a Session written before it is
    // not discarded for lacking a key nobody could have set.
    hClearMin: v.optional(FINITE, FIRST_RUN_SCENARIO.rider.hClearMin),
    DAF: FINITE,
    xD: FINITE,
  }),
  // Added with #87, optional with no wind: a Session written before it had no wind to carry.
  wind: v.optional(v.object({ speedKmh: FINITE, directionDeg: FINITE }), FIRST_RUN_SCENARIO.wind),
  // Added with #89, optional for the same reason: a Session written before it rode on §12.2's
  // defaults. A function, so a restored Session never shares the shipped object.
  dynamics: v.optional(
    v.object({ CdA: FINITE, rho: v.nullable(FINITE), F0: FINITE, kv: FINITE, mu: FINITE }),
    () => ({ ...FIRST_RUN_SCENARIO.dynamics }),
  ),
  // Added with #90, optional with both Positions unknown: a Session written before it had none.
  positions: v.optional(v.object({ A: v.nullable(POSITION), B: v.nullable(POSITION) }), () => ({
    ...FIRST_RUN_SCENARIO.positions,
  })),
});

/** Where a cached profil came from (#103). */
const TRACE_ORIGIN: v.GenericSchema<unknown, TraceOrigin> = v.variant("kind", [
  v.object({ kind: v.literal("csv"), fileName: v.string() }),
  v.object({ kind: v.literal("geoadmin") }),
  v.object({ kind: v.literal("lien") }),
]);

/**
 * A cached profile. The one cross-field check is that the two columns agree and hold at least one
 * sample — every consumer indexes `z` by `d`'s index, so a blob where they disagree is not a
 * degraded trace but an unreadable one. Strict increase is `csv.ts`'s and the codec's, not a
 * property re-derived here.
 */
const TRACE: v.GenericSchema<unknown, StoredTrace> = v.pipe(
  v.object({
    d: v.array(FINITE),
    z: v.array(FINITE),
    dev: v.nullable(FINITE),
    origin: v.optional(TRACE_ORIGIN),
    // Before #103 a Session spelled the origin as a filename, `null` for a profil received by link.
    // Read so that the cached profil of a Session stored then is not discarded with it.
    fileName: v.optional(v.nullable(v.string())),
    // Added with #90: a cached Trace keeps the coordinates of its two ends when the file had them.
    ends: v.optional(v.object({ A: POSITION, B: POSITION })),
  }),
  v.check(
    (trace) => trace.d.length > 0 && trace.d.length === trace.z.length,
    "d and z must be non-empty and of equal length",
  ),
  v.check(
    (trace) => trace.origin !== undefined || trace.fileName !== undefined,
    "a cached profil says where it came from",
  ),
  v.transform(({ origin, fileName, ...samples }): StoredTrace => ({
    ...samples,
    origin: origin ?? (typeof fileName === "string" ? { kind: "csv", fileName } : { kind: "lien" }),
  })),
);

/**
 * The stored Session, whole. **Valid or discarded** — no per-key salvage: a Session missing its
 * geometry is not a Session with one key ignored, and completing it from § 9's defaults would
 * restore a line neither the user nor the app ever built.
 */
const STORED_SESSION: v.GenericSchema<unknown, StoredSession> = v.object({
  scenario: SCENARIO,
  retainedMaterial: v.nullable(RETAINED_MATERIAL),
  retainedManual: v.nullable(v.object({ L: FINITE, h: FINITE })),
  trace: v.nullable(TRACE),
  // Added with #103, optional with none: a Session stored before it had no profil geo.admin.
  retainedCsv: v.optional(v.nullable(TRACE), null),
  // The two later layers are **optional with their defaults**: a Session stored before they existed
  // is otherwise whole, and « valid or discarded » would throw away its cached Trace over two
  // display preferences it could not have held.
  layers: v.object({
    unloadedLine: v.boolean(),
    chordAB: v.boolean(),
    riderTip: v.optional(v.boolean(), DEFAULT_LAYERS.riderTip),
    trajectory: v.optional(v.boolean(), DEFAULT_LAYERS.trajectory),
  }),
  // Added with #93, optional with the carte claire for the same reason as the later layers; its
  // `view` came with #95, optional with the vue de dessus for the same reason again.
  map: v.optional(
    v.object({
      fond: v.picklist(FONDS),
      pentes: v.boolean(),
      view: v.optional(v.picklist(MAP_VIEWS), DEFAULT_MAP_DISPLAY.view),
    }),
    () => ({ ...DEFAULT_MAP_DISPLAY }),
  ),
});

/**
 * Is this string a structurally sound `p1.` payload? Structural only, and it allocates nothing.
 *
 * **Without the address budget**, deliberately: `validateP1` also refuses a payload over 2000
 * characters, and that rule belongs to the URL. § 8 checks the size at « Copier le lien » — which
 * « refuses rather than degrades » there and nowhere else — so a hand-authored 4 812-point import
 * is a legitimate app state. Applied here it would discard the whole Session, cached Trace
 * included, on the next refresh: the worst refresh behaviour the app has, over a rule about
 * sharing.
 */
function isDecodableP1(raw: string): boolean {
  try {
    validateP1Structure(raw);
    return true;
  } catch (error) {
    if (error instanceof P1Error) return false;
    throw error;
  }
}

/**
 * Read the Session — **synchronous**, because it runs in the store's lazy initialiser at the
 * client-only subtree's first render and there is no frame before it lands.
 *
 * `null` means « no session »: the key is absent, its blob is not JSON, or the blob does not match
 * the schema. All three land in the same place, `firstRunDefaults()`, and none of them writes,
 * repairs or deletes anything.
 *
 * @param storage the storage to read from — `localStorage` in the app, a stub in a test.
 * @returns the Session, or `null`. Never throws.
 */
export function readSession(storage: SessionStorage): Session | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SESSION_KEY);
  } catch {
    // A storage that refuses to be read (a disabled origin, Safari private mode) is « no session ».
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = v.safeParse(STORED_SESSION, parsed);
  if (!result.success) return null;
  return hydrate(result.output);
}

/**
 * Write the Session. **Debounced ≈1 s by the caller**, and suspended entirely under « Saisie en
 * cours » — a browser crash mid-edit then loses the *edit* and keeps the last complete Scenario,
 * which is the intended trade and the one place the user's most recent keystrokes are deliberately
 * not persisted.
 *
 * On a storage failure the cached Trace is dropped and the scenario is written alone, because
 * losing the scenario as well would make a full quota cost the user everything rather than the one
 * thing that filled it. The return value is how the caller « says so ».
 *
 * @param storage the storage to write to.
 * @param session the complete Session.
 * @returns which of the three § 7 outcomes happened. Never throws.
 */
export function writeSession(storage: SessionStorage, session: Session): WriteOutcome {
  const stored = dehydrate(session);
  if (trySet(storage, JSON.stringify(stored))) return "écrit";
  // Nothing left to shed: a scenario alone that will not fit is a storage that is not writable.
  if (stored.trace === null && stored.retainedCsv === null) return "échec";
  const traceless = { ...stored, trace: null, retainedCsv: null };
  if (trySet(storage, JSON.stringify(traceless))) return "sans-tracé";
  return "échec";
}

/**
 * « Effacer la session » — the **only destructive control**, always behind a confirmation, with an
 * extra warning when the cached Trace arrived by link and therefore cannot be re-imported. This
 * function is the deletion; the confirmation and the warning are the caller's.
 *
 * It removes this key and nothing else: another origin key is not this app's to delete.
 *
 * @param storage the storage to clear.
 */
export function clearSession(storage: SessionStorage): void {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // A storage that refuses removal has nothing this app could restore anyway.
  }
}

/** One `setItem`, its throw turned into a boolean — quota, and every other storage fault. */
function trySet(storage: SessionStorage, payload: string): boolean {
  try {
    storage.setItem(SESSION_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

/** In-memory Session → the JSON shape: each Trace's two typed arrays widen to plain arrays. */
function dehydrate(session: Session): StoredSession {
  return {
    scenario: session.scenario,
    retainedMaterial: session.retainedMaterial,
    retainedManual: session.retainedManual,
    trace: session.trace === null ? null : storedTrace(session.trace),
    retainedCsv: session.retainedCsv === null ? null : storedTrace(session.retainedCsv),
    layers: session.layers,
    map: session.map,
  };
}

/** The JSON shape → an in-memory Session: the samples become `Float64Array` again, losslessly. */
function hydrate(stored: StoredSession): Session {
  return {
    scenario: stored.scenario,
    retainedMaterial: stored.retainedMaterial,
    retainedManual: stored.retainedManual,
    trace: stored.trace === null ? null : heldTrace(stored.trace),
    retainedCsv: stored.retainedCsv === null ? null : heldTrace(stored.retainedCsv),
    layers: stored.layers,
    map: stored.map,
  };
}

function storedTrace(trace: Trace): StoredTrace {
  return {
    d: Array.from(trace.d),
    z: Array.from(trace.z),
    dev: trace.dev,
    origin: trace.origin,
    ...(trace.ends === undefined ? {} : { ends: trace.ends }),
  };
}

function heldTrace(trace: StoredTrace): Trace {
  return {
    d: Float64Array.from(trace.d),
    z: Float64Array.from(trace.z),
    dev: trace.dev,
    origin: trace.origin,
    ...(trace.ends === undefined ? {} : { ends: trace.ends }),
  };
}
