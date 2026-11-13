/**
 * The Scenario codec — « v1 build spec » § 7 (*The key table*, *Refusal, dropping, and rewriting —
 * the salvage table*) and § 9 (*Le premier lancement*): the token tables, the completion of a
 * partial link from the shipped defaults, and the two directions between a bag and a Scenario.
 * `./schema.ts` keeps what the router needs — the key table, the per-key salvage, the refusal and
 * the middleware.
 *
 * Rules this module exists to keep:
 *
 * - **Both directions read the same tables.** {@link scenarioToSearch} and {@link searchToScenario}
 *   sit side by side so a token, a unit or a key cannot be taught to one direction only.
 * - **The URL's daN become the state's newtons here, and nowhere else.** § 3's « SI internally,
 *   always » governs the state object; `te`, `tp`, `mbf`, `ea`, `mbl` and `f0` are the forces a
 *   link carries.
 * - **A blank is `null`, never a number nobody typed.** `?fam=tx` with no `mbl`/`mu` is § 9's
 *   « vides et requis » — the correct arrival state, and two blocking errors rather than an
 *   invented rope. Hence a {@link ScenarioDraft} rather than a `Scenario` on the way in.
 * - **`x` clamps, and it is the only key that does.** § 7's one elected exception: `x_D` selects a
 *   *view*, and refusing to draw a valid span because the viewpoint is stale is worse than moving
 *   the viewpoint. Every other out-of-range value is applied as it arrived.
 * - **`lib/scenario` imports nothing from here.** The Scenario is the app's type; the URL is one of
 *   its transports, and the dependency runs one way.
 */

import type { TightnessFieldId } from "@/lib/rail/fields.ts";
import type {
  DynamicsConstants,
  Position,
  Scenario,
  ScenarioDraft,
  TensioningDevice,
  TensioningSide,
  TextileDraft,
  TightnessDraft,
} from "@/lib/scenario/types.ts";
import type { SteelSpec, TerminationId, TextileSpec } from "@/lib/sim";

import { tightnessDriver } from "@/lib/rail/values.ts";
import { FIRST_RUN_RETAINED_TEXTILE, FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { clampX } from "@/lib/scenario/geometry.ts";
import { DYNAMICS, TERMINATIONS, TEXTILE } from "@/lib/sim";
import { traceExtent } from "@/lib/terrain/trace.ts";

import type {
  AcceptedSearch,
  ConstructionToken,
  FamilyToken,
  RopeClassToken,
  SearchKey,
  SearchValues,
  TensioningDeviceToken,
  TensioningSideToken,
  TerminationToken,
  TightnessKey,
} from "./schema.ts";

import { decodeP1, P1Error } from "./p1.ts";
import { CANONICAL_KEYS, canonicalLink, TIGHTNESS_KEYS } from "./schema.ts";

/** The write-side direction of `cst`. Total over the engine's constructions. */
export const CONSTRUCTION_TOKEN_BY_ID = {
  "fibre-core": "tc",
  iwrc: "iwrc",
} as const satisfies Record<SteelSpec["construction"], ConstructionToken>;

/** The write-side direction of `cls`. Total over the engine's rope classes. */
export const ROPE_CLASS_TOKEN_BY_ID = {
  hmpe: "hmpe",
  "pa-en1891a": "pa",
  polyester: "pes",
} as const satisfies Record<TextileSpec["ropeClass"], RopeClassToken>;

/** The write-side direction of `cp`. Total over the two anchors. */
export const TENSIONING_SIDE_TOKEN_BY_ID = {
  A: "a",
  B: "b",
} as const satisfies Record<TensioningSide, TensioningSideToken>;

/** The write-side direction of `mt`. `pulley` is `mt` absent, so its `mou` is only ever read. */
export const TENSIONING_DEVICE_TOKEN_BY_ID = {
  pulley: "mou",
  "maestro-s": "ms",
  "maestro-l": "ml",
} as const satisfies Record<TensioningDevice, TensioningDeviceToken>;

/** The key each Tightness Driver's field travels under. Total over the drivers and the keys. */
const DRIVER_KEY = {
  D_target: "fl",
  H_target: "te",
  T_target: "tp",
  L0: "lo",
  vRatio: "vr",
} as const satisfies Record<TightnessFieldId, TightnessKey>;

/** The two drivers that are forces, and therefore daN on the wire. */
const FORCE_DRIVER_KEYS: ReadonlySet<TightnessKey> = new Set<TightnessKey>(["te", "tp"]);

type Values<T> = T[keyof T];

/** Resolves to `true` only when the token tuple and its table name exactly the same tokens. */
type Covers<Token extends string, Table> = [Token] extends [Values<Table>]
  ? [Values<Table>] extends [Token]
    ? true
    : never
  : never;

const TOKEN_TABLES_COVER_TUPLES: [
  Covers<ConstructionToken, typeof CONSTRUCTION_TOKEN_BY_ID>,
  Covers<RopeClassToken, typeof ROPE_CLASS_TOKEN_BY_ID>,
  Covers<TensioningSideToken, typeof TENSIONING_SIDE_TOKEN_BY_ID>,
  Covers<TensioningDeviceToken, typeof TENSIONING_DEVICE_TOKEN_BY_ID>,
  Covers<TightnessKey, typeof DRIVER_KEY>,
] = [true, true, true, true, true];
void TOKEN_TABLES_COVER_TUPLES;

/**
 * The read side of a token table, derived so the two directions cannot disagree. The result is
 * keyed by token, and a token the schema does not know is `undefined`, never a neighbour's id.
 */
function invert<Id extends string, Token extends string>(
  byId: Readonly<Record<Id, Token>>,
): Readonly<Record<Token, Id>> {
  return Object.fromEntries(
    (Object.keys(byId) as Id[]).map((id): [Token, Id] => [byId[id], id]),
  ) as Record<Token, Id>;
}

export const CONSTRUCTION_ID_BY_TOKEN = invert<SteelSpec["construction"], ConstructionToken>(
  CONSTRUCTION_TOKEN_BY_ID,
);

export const ROPE_CLASS_ID_BY_TOKEN = invert<TextileSpec["ropeClass"], RopeClassToken>(
  ROPE_CLASS_TOKEN_BY_ID,
);

const TENSIONING_SIDE_BY_TOKEN = invert<TensioningSide, TensioningSideToken>(
  TENSIONING_SIDE_TOKEN_BY_ID,
);

const TENSIONING_DEVICE_BY_TOKEN = invert<TensioningDevice, TensioningDeviceToken>(
  TENSIONING_DEVICE_TOKEN_BY_ID,
);

/** N → daN. § 7: forces serialise in daN, **fixed**, and ×10 exactly, so the step is lossless. */
export function daNFromNewtons(newtons: number): number {
  return newtons / 10;
}

/** daN → N, the exact inverse of {@link daNFromNewtons}. */
export function newtonsFromDaN(daN: number): number {
  return daN * 10;
}

/**
 * The hardware a token names under each family. Only `epissure` changes with `fam`; every other
 * token names one piece of hardware whatever `fam` says, so an out-of-family token
 * (`?fam=ac&ta=huit`) arrives **as given** — ADR-0001 — and the gate that owns the combination
 * raises it, rather than the decoder swapping in an end nobody chose.
 */
const TERMINATION_ID_BY_TOKEN = {
  steel: {
    manchon: "manchon-metal-resine",
    cosse: "cosse-oeil-flamand",
    epissure: "epissure",
    coin: "manchon-a-coin",
    serre: "serre-cables-etrier",
    oeil: "oeil-cousu-epissure",
    huit: "noeud-de-huit",
    chaise: "noeud-de-chaise",
    attelage: "attelage-sans-tension",
  },
  textile: {
    manchon: "manchon-metal-resine",
    cosse: "cosse-oeil-flamand",
    epissure: "epissure-longue-hmpe",
    coin: "manchon-a-coin",
    serre: "serre-cables-etrier",
    oeil: "oeil-cousu-epissure",
    huit: "noeud-de-huit",
    chaise: "noeud-de-chaise",
    attelage: "attelage-sans-tension",
  },
} as const satisfies Record<"steel" | "textile", Record<TerminationToken, TerminationId>>;

/** The write-side direction. Total over {@link TerminationId}, so no end can fail to serialise. */
export const TERMINATION_TOKEN_BY_ID = {
  "manchon-metal-resine": "manchon",
  "cosse-oeil-flamand": "cosse",
  epissure: "epissure",
  "manchon-a-coin": "coin",
  "serre-cables-etrier": "serre",
  "oeil-cousu-epissure": "oeil",
  "epissure-longue-hmpe": "epissure",
  "noeud-de-huit": "huit",
  "noeud-de-chaise": "chaise",
  "attelage-sans-tension": "attelage",
} as const satisfies Record<TerminationId, TerminationToken>;

/** Which {@link TerminationId} a token names under a family — `fam` decides only `epissure`. */
export function terminationIdFromToken(
  token: TerminationToken,
  family: "steel" | "textile",
): TerminationId {
  return TERMINATION_ID_BY_TOKEN[family][token];
}

type Absent<K extends SearchKey> = { readonly [P in K]?: never };

/**
 * The terrain keys of a completed bag: manual `L`/`h`, or the imported profil `tr` and whether it
 * runs off the Positions, `ph`.
 */
type CompletedTerrain =
  | (Pick<SearchValues, "L" | "h"> & Absent<"tr" | "ph">)
  | (Pick<SearchValues, "tr"> & Partial<Pick<SearchValues, "ph">> & Absent<"L" | "h">);

/** Exactly one tightness driver — two refuse the link before it is ever completed. */
type CompletedDriver = {
  [D in TightnessKey]: Pick<SearchValues, D> & Absent<Exclude<TightnessKey, D>>;
}[TightnessKey];

/**
 * The steel keys, Overrides optional because their absence is « non surchargée », and the câble's
 * trolley `μ` because its absence is §12.2's default.
 */
type CompletedSteel = { readonly fam: "ac" } & Pick<SearchValues, "d" | "r0" | "cst"> &
  Partial<Pick<SearchValues, "mbf" | "ea" | "mu" | "mur">> &
  Absent<"cls" | "mbl" | "k" | "f0" | "kv">;

/**
 * The textile keys, `mbl`/`mu` optional because a rope nobody typed is § 9's blanks, `k`
 * because polyester ships it blank, `d` because a diameter nobody typed is simply absent, and the
 * corde's trolley `f0`/`kv` because their absence is the SSF fit.
 */
type CompletedTextile = { readonly fam: "tx" } & Pick<SearchValues, "cls"> &
  Partial<Pick<SearchValues, "mbl" | "mu" | "k" | "d" | "f0" | "kv">> &
  Absent<"r0" | "cst" | "mbf" | "ea" | "mur">;

/**
 * A bag {@link completeFromDefaults} returned: every key the active configuration needs is present,
 * and only § 7's meanings of absence are optional — `reg`, the Overrides, the textile blanks, and
 * the inactive terrain source and family, which are absent outright.
 */
export type CompletedSearch = { readonly refused?: never } & Pick<
  SearchValues,
  "v" | "u" | "use" | "za" | "zb" | "ta" | "tb" | "na" | "nb" | "mp" | "hr" | "gm" | "daf" | "x"
> &
  Partial<
    Pick<
      SearchValues,
      | "reg"
      | "bp"
      | "cp"
      | "mt"
      | "zan"
      | "ws"
      | "wd"
      | "cda"
      | "rho"
      | "cib"
      | "lata"
      | "lona"
      | "latb"
      | "lonb"
    >
  > &
  CompletedTerrain &
  CompletedDriver &
  (CompletedSteel | CompletedTextile);

/**
 * The keys whose **absence is meaning**, never completed. `reg` absent is « — choisir — »,
 * `mbf`/`ea`/`mu` absent is « non surchargée », which differs from « equal to the formula value »,
 * `mbl` absent — with `mu`, under `fam=tx` — is § 9's rope nobody typed, `bp` absent is one
 * Brin porteur, `cp` absent is the Mise en tension at A, `mt` absent is the mouflage, `zan` absent
 * is the shipped Zones d'ancrage, `ws` / `wd` absent is no wind, `cda` / `f0` / `kv` / `mur` / `rho` absent is §12.2's default for the ride,
 * `cib` absent is the shipped target of the passager's farthest point, the four coordinates absent are Positions unknown and `ph` absent is a profil that runs between them:
 * completing any would rewrite, and name in the strip, every link older than the key.
 */
const NEVER_COMPLETED: ReadonlySet<SearchKey> = new Set<SearchKey>([
  "reg",
  "bp",
  "cp",
  "mt",
  "zan",
  "ws",
  "wd",
  "cda",
  "f0",
  "kv",
  "mur",
  "rho",
  "cib",
  "lata",
  "lona",
  "latb",
  "lonb",
  "ph",
  "mbf",
  "ea",
  "mu",
  "mbl",
]);

/** Membership, hoisted: the driver test runs once per key of every completed link. */
const TIGHTNESS_KEY_SET: ReadonlySet<SearchKey> = new Set<SearchKey>(TIGHTNESS_KEYS);

/**
 * The family a link with no `fam` is read under — § 9's shipped one, derived from the constant so
 * a defaults change cannot leave a stale token here. § 7 keeps `fam` explicit precisely because
 * « a URL with no line keys at all still needs a family ».
 */
const DEFAULT_FAMILY: FamilyToken = FIRST_RUN_SCENARIO.material.family === "steel" ? "ac" : "tx";

/** What {@link completeFromDefaults} returns — the canonical bag, and the strip's second sentence. */
export type Completion = {
  readonly search: CompletedSearch;
  /** The completed keys, in canonical order. The strip names the **values**, read from `search`. */
  readonly completed: readonly SearchKey[];
};

/**
 * § 7's completion rule: **partial recognised links are completed literally** from the shipped
 * defaults, and the address bar is then rewritten to the completed Scenario. Every completed key
 * is listed in {@link Completion.completed}, so the link strip names it: completion is the one
 * rewrite ADR-0001 admits, and only because it is never silent.
 *
 * Literally, and that is measured, not stylistic: `?L=250&h=-40` completed with a literal 6,0 m
 * flèche (the first-run driver before it became the tension de pose) lands clear at garde 1,25 m
 * with an honest 2,40 % ⚠, while a "smart" 4 %-of-span completion lands at **−2,39 m — on the
 * ground**.
 *
 * The values come from the **active family's** shipped default: `FIRST_RUN_SCENARIO` for steel,
 * and for textile the retained textile default, so `?fam=tx` completes the rope class and both ends
 * with « Œil cousu / épissuré » rather than the steel cosse. A key given in the link is kept as
 * given, an out-of-family termination included.
 *
 * Three groups are exempt, all of them § 7's meanings of absence:
 *
 * 1. {@link NEVER_COMPLETED}: `reg`, `bp`, `cp`, `mt`, `zan`, `ws`, `wd`, the ride's constants, `cib`,
 *    the Positions and `ph`, the Overrides and the textile blanks. Under `fam=tx`
 *    **no rope is invented**: § 9 ships `MBL` and `μ` « vides et requis », because one made-up
 *    `MBL` decides the verdict, and those two blocking errors are the correct arrival state.
 *    Polyester's `k` stays blank too, because §13.2 publishes none.
 * 2. The **inactive** terrain source. `tr` present ⇒ imported: `L`/`h` are derived read-outs of
 *    the whole profil and are dropped rather than completed; `tr` absent ⇒ manual. `ph` goes
 *    with `tr`, and only where both Positions are known: there is no line to run off otherwise.
 * 3. The **inactive** family's keys, dropped the same way.
 *
 * Some keys complete from the link rather than from a constant. `x` completes to half the
 * *completed* span — 125,0 m for `?L=250&h=-40` rather than the constant 75,0, half the profil's
 * extent for a `tr` — because it selects a **view**, and a viewpoint off the end of the span is
 * worse than a moved viewpoint.
 * `na`/`nb` complete to the decoded end's own `η`, so `?ta=huit` is judged on the knot's 0,60 and
 * not on the shipped end's 0,90, and `k` completes to the decoded rope class's `TEXTILE.kDefault`.
 *
 * @param search an accepted bag. Only meaningful when `hasScenarioKey` is true: a bare `/`
 *   restores the Session and is never rewritten. A refused link never reaches here, because
 *   completing it would turn « refused whole » into a scenario neither party ever saw.
 */
export function completeFromDefaults(search: AcceptedSearch): Completion {
  const imported = search.tr !== undefined;
  const located = search.lata !== undefined && search.latb !== undefined;
  const family = search.fam ?? DEFAULT_FAMILY;
  const hasDriver = TIGHTNESS_KEYS.some((key) => search[key] !== undefined);
  const values = completionValues(search, family);

  const out: Record<string, unknown> = {};
  const completed: SearchKey[] = [];

  for (const key of CANONICAL_KEYS) {
    if (!inActiveConfiguration(key, imported, located, family)) continue;

    const present = search[key];
    if (present !== undefined) {
      out[key] = present;
      continue;
    }
    if (NEVER_COMPLETED.has(key)) continue;
    // A driver that arrived is never joined by a completed one; a link with none gets § 9's
    // Flèche, because with no driver « the remainder does not describe a line at all ».
    if (hasDriver && TIGHTNESS_KEY_SET.has(key)) continue;

    const value = values[key];
    if (value === undefined) continue;
    out[key] = value;
    completed.push(key);
  }

  // Sound by construction: every active key is now present or one of the exempt absences above.
  return { search: out as CompletedSearch, completed };
}

/** What each absent key of this link completes to: the active family's bag, plus the link rules. */
function completionValues(search: AcceptedSearch, family: FamilyToken): AcceptedSearch {
  const shipped = SHIPPED_BY_FAMILY[family];
  const firstRun = FIRST_RUN_SCENARIO.geometry;
  const terrain: CompletedTerrain =
    search.tr === undefined
      ? { L: search.L ?? firstRun.L, h: search.h ?? firstRun.h }
      : { tr: search.tr };
  const lineFamily = family === "tx" ? "textile" : "steel";
  const eta = (token: TerminationToken) =>
    TERMINATIONS[terminationIdFromToken(token, lineFamily)].eta;
  const cls = search.cls ?? shipped.cls;
  const k = cls === undefined ? null : TEXTILE.kDefault[ROPE_CLASS_ID_BY_TOKEN[cls]];
  return {
    ...shipped,
    ...terrain,
    na: eta(search.ta ?? shipped.ta),
    nb: eta(search.tb ?? shipped.tb),
    ...(k === null ? {} : { k }),
    x: spanOf(terrain) / 2,
  };
}

/**
 * Is this key part of the **active** configuration? § 7's one governing rule: « the URL carries the
 * active configuration and never a retained alternate », so an imported link has `tr` and no
 * `L`/`h`, a steel link has no `cls`/`mbl`/`k`, and a textile link has no `r0`/`cst`.
 *
 * Out-of-scope keys leave the canonical bag **without** a strip line: the strip's two kinds are an
 * unknown key and an unrepresentable value, and a redundant `L` beside a `tr` is neither — with a
 * trace present `L` is derived, so nothing the line needs is removed.
 *
 * @param located both Positions are in the bag — the salvage has already dropped a lone coordinate.
 */
function inActiveConfiguration(
  key: SearchKey,
  imported: boolean,
  located: boolean,
  family: FamilyToken,
): boolean {
  switch (key) {
    case "L":
    case "h":
      return !imported;
    case "tr":
      return imported;
    case "ph":
      return imported && located;
    case "r0":
    case "cst":
    case "mbf":
    case "ea":
    case "mur":
      return family === "ac";
    case "cls":
    case "mbl":
    case "k":
    case "f0":
    case "kv":
      return family === "tx";
    default:
      // `mu` and `d` are deliberately not scoped: the same physical quantities in both families.
      // `d` is completed for steel only — {@link SHIPPED_BY_FAMILY} ships none for textile.
      return true;
  }
}

/** The span a bag describes, m — `L` in manual mode, the profil's whole extent in imported mode. */
function spanOf(bag: CompletedTerrain): number {
  return bag.tr === undefined ? bag.L : profilExtent(bag.tr);
}

/**
 * The extent of the profil a `tr` encodes. A payload that does not decode falls back to the shipped
 * span, because how a bad payload is handled is the refusal's business, not completion's. An
 * accepted bag cannot carry one: the validator walked it with the same structural check `decodeP1`
 * runs first.
 */
function profilExtent(tr: string): number {
  try {
    return traceExtent(decodeP1(tr));
  } catch (error) {
    if (error instanceof P1Error) return FIRST_RUN_SCENARIO.geometry.L;
    throw error;
  }
}

/** § 7's presence-encoded driver, back into the app's union. */
function tightness(search: CompletedDriver): TightnessDraft {
  if (search.fl !== undefined) return { mode: "sag", D_target: search.fl };
  if (search.te !== undefined) return { mode: "tension", H_target: newtonsFromDaN(search.te) };
  if (search.lo !== undefined) return { mode: "length", L0: search.lo };
  if (search.tp !== undefined) return { mode: "anchor", T_target: newtonsFromDaN(search.tp) };
  return { mode: "ratio", ratio: search.vr };
}

/** The steel arm — `mbf`/`ea` in daN, `mu` in kg/m, and **absence is « non surchargée »**. */
function steel(search: CompletedSteel): SteelSpec {
  const overrides: { MBF?: number; EA?: number; mu?: number } = {};
  if (search.mbf !== undefined) overrides.MBF = newtonsFromDaN(search.mbf);
  if (search.ea !== undefined) overrides.EA = newtonsFromDaN(search.ea);
  if (search.mu !== undefined) overrides.mu = search.mu;

  const spec: SteelSpec = {
    family: "steel",
    d: search.d,
    R0: search.r0,
    construction: CONSTRUCTION_ID_BY_TOKEN[search.cst],
  };
  // Omit the key entirely when nothing was overridden: `overrides: {}` and `overrides: undefined`
  // read the same to the engine, but only the absent one round-trips back to an absent `mbf`.
  return Object.keys(overrides).length === 0 ? spec : { ...spec, overrides };
}

/** The textile arm — a **draft**: `mbl`, `mu` and polyester's `k` absent are § 9's blanks. */
function textile(search: CompletedTextile): TextileDraft {
  return {
    family: "textile",
    ropeClass: ROPE_CLASS_ID_BY_TOKEN[search.cls],
    MBL: search.mbl === undefined ? null : newtonsFromDaN(search.mbl),
    mu: search.mu ?? null,
    k: search.k ?? null,
    ...(search.d === undefined ? {} : { d: search.d }),
  };
}

/**
 * A completed bag as the app's state object — the read side of {@link scenarioToSearch}. Pure
 * conversion: every value it needs is in the bag, so nothing here falls back to a default.
 *
 * @param search the bag {@link completeFromDefaults} returned.
 * @returns the draft the store holds. The textile blanks are `null` on purpose, and `x` is clamped
 *   to the span — the one key that is.
 */
export function searchToScenario(search: CompletedSearch): ScenarioDraft {
  const family = search.fam === "tx" ? "textile" : "steel";
  return {
    // `u` is display-only — it changes no number's meaning anywhere, here least of all.
    unit: search.u,
    usage: search.use === "tempo" ? "TEMPORAIRE" : "PERMANENTE",
    // Absent **is** « — choisir — », and it is never completed, so it is never defaulted either.
    regime: search.reg ?? null,
    geometry:
      search.tr === undefined
        ? { source: "manual", L: search.L, h: search.h }
        : { source: "trace", trace: search.tr, ...(search.ph === 1 ? { offPositions: true } : {}) },
    anchors: { zA: search.za, zB: search.zb },
    // Absent **is** one member — the meaning of absence, never a completed default.
    carryingLines: search.bp ?? 1,
    // Absent **is** A, likewise.
    tensioningSide: search.cp === undefined ? "A" : TENSIONING_SIDE_BY_TOKEN[search.cp],
    // Absent **is** the mouflage, likewise — and a Maestro on a câble is kept as it arrived.
    tensioningDevice: search.mt === undefined ? "pulley" : TENSIONING_DEVICE_BY_TOKEN[search.mt],
    tightness: tightness(search),
    material: search.fam === "tx" ? textile(search) : steel(search),
    terminations: {
      A: { id: terminationIdFromToken(search.ta, family), eta: search.na },
      B: { id: terminationIdFromToken(search.tb, family), eta: search.nb },
    },
    rider: {
      mp: search.mp,
      hRider: search.hr,
      hClearMin: search.gm,
      // Absent **is** the shipped Zones d'ancrage — a link older than the key reads them.
      anchorZone: search.zan ?? FIRST_RUN_SCENARIO.rider.anchorZone,
      DAF: search.daf,
      xD: clampX(search.x, spanOf(search)),
    },
    // Absent **is** no wind, each key on its own: a link may state a direction before any speed.
    wind: { speedKmh: search.ws ?? 0, directionDeg: search.wd ?? 0 },
    dynamics: dynamics(search),
    positions: {
      A: positionOf(search.lata, search.lona),
      B: positionOf(search.latb, search.lonb),
    },
  };
}

/** A Position from its two keys. The schema has dropped a lone one, so both or neither arrive. */
function positionOf(lat: number | undefined, lon: number | undefined): Position | null {
  return lat === undefined || lon === undefined ? null : { lat, lon };
}

/**
 * The ride's constants (#89): each key absent **is** §12.2's default, on its own. `ρ` absent stays
 * `null`, the derived default. The other family's trolley keys never reach a completed bag, so its
 * law reads its defaults.
 */
function dynamics(search: CompletedSearch): DynamicsConstants {
  return {
    CdA: search.cda ?? DYNAMICS.CdA,
    rho: search.rho ?? null,
    F0: search.f0 === undefined ? DYNAMICS.textile.F0 : newtonsFromDaN(search.f0),
    kv: search.kv ?? DYNAMICS.textile.kv,
    mu: search.mur ?? DYNAMICS.steel.mu,
    // Absent **is** the shipped target — a link older than the key reads it.
    reachTarget: search.cib ?? FIRST_RUN_SCENARIO.dynamics.reachTarget,
  };
}

/**
 * A Scenario as § 7's canonical bag — the write side, and the only place the engine's newtons
 * become the URL's daN. Keys are inserted in {@link CANONICAL_KEYS} order, which *is* the emitted
 * query string's order.
 *
 * Nothing is rounded here: § 7 moved the precision decision upstream (« a prefill writes the
 * *displayed* value into state, never the underlying float »), so serialisation is **verbatim** and
 * there is no rounding decision left at the URL.
 */
export function scenarioToSearch(scenario: Scenario): CompletedSearch {
  const { geometry, material, terminations, rider, anchors } = scenario;
  const out: Record<string, unknown> = {};

  out.v = 1;
  out.u = scenario.unit;
  out.use = scenario.usage === "PERMANENTE" ? "perm" : "tempo";
  // `regime: null` **is** « — choisir — »: the key is omitted, never emitted empty.
  if (scenario.regime !== null) out.reg = scenario.regime;

  if (geometry.source === "manual") {
    out.L = geometry.L;
    out.h = geometry.h;
  }
  out.za = anchors.zA;
  out.zb = anchors.zB;

  const driver = tightnessDriver(scenario);
  const driverKey = DRIVER_KEY[driver.field];
  out[driverKey] = FORCE_DRIVER_KEYS.has(driverKey) ? daNFromNewtons(driver.value) : driver.value;

  // A is `cp` **absent**, one member is `bp` **absent** and the mouflage is `mt` **absent**, so the
  // links written before any of the keys stay string-identical.
  if (scenario.tensioningSide === "B") out.cp = TENSIONING_SIDE_TOKEN_BY_ID.B;
  if (scenario.carryingLines === 2) out.bp = 2;
  if (scenario.tensioningDevice !== "pulley") {
    out.mt = TENSIONING_DEVICE_TOKEN_BY_ID[scenario.tensioningDevice];
  }

  if (material.family === "steel") {
    out.fam = "ac";
    out.d = material.d;
    out.r0 = material.R0;
    out.cst = CONSTRUCTION_TOKEN_BY_ID[material.construction];
    const overrides = material.overrides;
    // Absence **is** « non surchargée ». An override of `0` is still an override, so the test is
    // `!== undefined` rather than truthiness.
    if (overrides?.MBF !== undefined) out.mbf = daNFromNewtons(overrides.MBF);
    if (overrides?.EA !== undefined) out.ea = daNFromNewtons(overrides.EA);
    if (overrides?.mu !== undefined) out.mu = overrides.mu;
  } else {
    out.fam = "tx";
    // `mu` is inserted **before** `cls`/`mbl`, which is its one slot in {@link CANONICAL_KEYS}: it
    // is the same key in both families, so it cannot also sit in the textile group. Insertion order
    // *is* the emitted query string, and {@link canonicalLink} re-inserts in `CANONICAL_KEYS`
    // order — emitting `mu` last here made « Copier le lien » and the address bar disagree as
    // strings for a textile line, which is exactly the diffability § 7 buys with a canonical order.
    if (material.d !== undefined) out.d = material.d;
    out.mu = material.mu;
    out.cls = ROPE_CLASS_TOKEN_BY_ID[material.ropeClass];
    out.mbl = daNFromNewtons(material.MBL);
    out.k = material.k;
  }

  out.ta = TERMINATION_TOKEN_BY_ID[terminations.A.id];
  out.tb = TERMINATION_TOKEN_BY_ID[terminations.B.id];
  out.na = terminations.A.eta;
  out.nb = terminations.B.eta;

  out.mp = rider.mp;
  out.hr = rider.hRider;
  out.gm = rider.hClearMin;
  // The shipped Zones d'ancrage are `zan` **absent**, so the links written before the key stay
  // string-identical.
  if (rider.anchorZone !== FIRST_RUN_SCENARIO.rider.anchorZone) out.zan = rider.anchorZone;
  out.daf = rider.DAF;
  // Each is written only off its default, because no wind is both keys **absent**.
  if (scenario.wind.speedKmh !== 0) out.ws = scenario.wind.speedKmh;
  if (scenario.wind.directionDeg !== 0) out.wd = scenario.wind.directionDeg;
  // Likewise the ride's constants: §12.2's defaults are the keys **absent**, `F₀` in daN, and only
  // the active family's trolley travels.
  const { CdA, rho, F0, kv, mu, reachTarget } = scenario.dynamics;
  if (CdA !== DYNAMICS.CdA) out.cda = CdA;
  if (material.family === "textile") {
    if (F0 !== DYNAMICS.textile.F0) out.f0 = daNFromNewtons(F0);
    if (kv !== DYNAMICS.textile.kv) out.kv = kv;
  } else if (mu !== DYNAMICS.steel.mu) {
    out.mur = mu;
  }
  if (rho !== null) out.rho = rho;
  // The shipped target is `cib` **absent**, so the links written before the key stay
  // string-identical.
  if (reachTarget !== FIRST_RUN_SCENARIO.dynamics.reachTarget) out.cib = reachTarget;
  out.x = rider.xD;
  // Unknown is the four keys **absent**, so a link with no Position stays string-identical.
  const { A, B } = scenario.positions;
  if (A !== null) {
    out.lata = A.lat;
    out.lona = A.lon;
  }
  if (B !== null) {
    out.latb = B.lat;
    out.lonb = B.lon;
  }

  if (geometry.source === "trace") {
    if (geometry.offPositions === true) out.ph = 1;
    out.tr = geometry.trace;
  }

  return out as CompletedSearch;
}

/**
 * § 9's shipped Scenario as a bag — the completion source, derived from the constant rather than
 * transcribed beside it, so a defaults change cannot leave a second copy behind.
 */
const FIRST_RUN_SEARCH: CompletedSearch = scenarioToSearch(FIRST_RUN_SCENARIO);

/**
 * The textile keys a shipped default completes: the rope class and both ends, read from the
 * retained textile default because the first-run Scenario is steel. `mbl` and `mu` stay blank on
 * purpose; `k` is completed in {@link completionValues} from the decoded class's
 * `TEXTILE.kDefault`, and stays blank only for polyester.
 */
const { spec: TEXTILE_SPEC, terminations: TEXTILE_ENDS } = FIRST_RUN_RETAINED_TEXTILE;

/**
 * Each family's completion source. The textile bag overlays the steel first-run one, so every key
 * a textile link can lack — the class and the ends — comes from the textile default, and the steel
 * keys left beneath it are out of the textile configuration and never read. The `η` the steel bag
 * carries is replaced in {@link completionValues}, which reads it off the end the link decodes to.
 */
const SHIPPED_BY_FAMILY: Readonly<
  Record<FamilyToken, AcceptedSearch & Pick<SearchValues, "ta" | "tb">>
> = {
  ac: FIRST_RUN_SEARCH,
  tx: {
    ...FIRST_RUN_SEARCH,
    d: undefined,
    cls: ROPE_CLASS_TOKEN_BY_ID[TEXTILE_SPEC.ropeClass],
    ta: TERMINATION_TOKEN_BY_ID[TEXTILE_ENDS.A.id],
    tb: TERMINATION_TOKEN_BY_ID[TEXTILE_ENDS.B.id],
  },
};

/**
 * § 9's first-run link onto `/`, the path every link shared before the Pages pointed at; « Copier
 * le lien » produces the same search on the Page it is pressed on (ADR-0002). The address bar
 * itself stays **bare** on first run: a bare Page *means* « restore the Session », so it is never
 * rewritten on load.
 *
 * **146 characters, measured against the installed router** — 137 before `gm` (2026-09-23), 142
 * with it and `fl=6`, 146 since first run drives by `tp=263.4` (four characters longer).
 * § 7, § 9 and § 11 all quote **141**,
 * counted off § 9's *printed* sketch, which spells `fl=6.0` and `x=75.0` — and that sketch is not
 * emittable. The spec keeps the router's default codecs (« no global codec override »), and
 * `stringifySearchWith(JSON.stringify, JSON.parse)` renders the number `6` as `6`, while the string
 * `"6.0"` comes back out as `%226.0%22`. § 3 states the same conclusion from the other side:
 * « padding is display-only: state holds a *number* whose value equals the displayed value, so the
 * URL serialises `6` ». 141 − the four characters of those two paddings = **137**. What the count
 * exists to lock is unchanged: the key table, the canonical order, and the two absence meanings
 * (`reg`, `mbf`/`ea`/`mu`).
 */
export const FIRST_RUN_LINK: string = canonicalLink(FIRST_RUN_SEARCH, "/");
