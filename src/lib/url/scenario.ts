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
 *   always » governs the state object; `te`, `mbf`, `ea` and `mbl` are the forces a link carries.
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
  Scenario,
  ScenarioDraft,
  TextileDraft,
  TightnessDraft,
} from "@/lib/scenario/types.ts";
import type { SteelSpec, TerminationId, TextileSpec } from "@/lib/sim";

import { tightnessDriver } from "@/lib/rail/values.ts";
import { FIRST_RUN_RETAINED_TEXTILE, FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { clampX } from "@/lib/scenario/geometry.ts";

import type {
  AcceptedSearch,
  ConstructionToken,
  FamilyToken,
  RopeClassToken,
  SearchKey,
  SearchValues,
  TerminationToken,
  TightnessKey,
} from "./schema.ts";

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

/** The key each Tightness Driver's field travels under. Total over the drivers and the keys. */
const DRIVER_KEY = {
  D_target: "fl",
  H_target: "te",
  L0: "lo",
  vRatio: "vr",
} as const satisfies Record<TightnessFieldId, TightnessKey>;

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
  Covers<TightnessKey, typeof DRIVER_KEY>,
] = [true, true, true];
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

/** The terrain keys of a completed bag: manual `L`/`h`, or imported `tr`/`sa`/`sb`. */
type CompletedTerrain =
  | (Pick<SearchValues, "L" | "h"> & Absent<"sa" | "sb" | "tr">)
  | (Pick<SearchValues, "sa" | "sb" | "tr"> & Absent<"L" | "h">);

/** Exactly one tightness driver — two refuse the link before it is ever completed. */
type CompletedDriver = {
  [D in TightnessKey]: Pick<SearchValues, D> & Absent<Exclude<TightnessKey, D>>;
}[TightnessKey];

/** The steel keys, Overrides optional because their absence is « non surchargée ». */
type CompletedSteel = { readonly fam: "ac" } & Pick<SearchValues, "d" | "r0" | "cst"> &
  Partial<Pick<SearchValues, "mbf" | "ea" | "mu">> &
  Absent<"cls" | "mbl" | "k">;

/** The textile keys, `mbl`/`mu`/`k` optional because a rope nobody typed is § 9's blanks. */
type CompletedTextile = { readonly fam: "tx" } & Pick<SearchValues, "cls"> &
  Partial<Pick<SearchValues, "mbl" | "mu" | "k">> &
  Absent<"d" | "r0" | "cst" | "mbf" | "ea">;

/**
 * A bag {@link completeFromDefaults} returned: every key the active configuration needs is present,
 * and only § 7's meanings of absence are optional — `reg`, the Overrides, the textile blanks, and
 * the inactive terrain source and family, which are absent outright.
 */
export type CompletedSearch = { readonly refused?: never } & Pick<
  SearchValues,
  "v" | "u" | "use" | "za" | "zb" | "ta" | "tb" | "na" | "nb" | "mp" | "hr" | "gm" | "daf" | "x"
> &
  Partial<Pick<SearchValues, "reg">> &
  CompletedTerrain &
  CompletedDriver &
  (CompletedSteel | CompletedTextile);

/**
 * The keys whose **absence is meaning**, never completed. `reg` absent is « — choisir — »,
 * `mbf`/`ea`/`mu` absent is « non surchargée », which differs from « equal to the formula value »,
 * and `mbl`/`k` absent — with `mu`, under `fam=tx` — is § 9's rope nobody typed.
 */
const NEVER_COMPLETED: ReadonlySet<SearchKey> = new Set<SearchKey>([
  "reg",
  "mbf",
  "ea",
  "mu",
  "mbl",
  "k",
]);

/** Membership, hoisted: the driver test runs once per key of every completed link. */
const TIGHTNESS_KEY_SET: ReadonlySet<SearchKey> = new Set<SearchKey>(TIGHTNESS_KEYS);

/**
 * The family a link with no `fam` is read under — § 9's shipped one, derived from the constant so
 * a defaults change cannot leave a stale token here. § 7 keeps `fam` explicit precisely because
 * « a URL with no line keys at all still needs a family ».
 */
const DEFAULT_FAMILY: FamilyToken = FIRST_RUN_SCENARIO.material.family === "steel" ? "ac" : "tx";

/**
 * Where an imported link with no `sa` starts: the file's own origin. With the shipped span after
 * it, a trace link missing its stations still describes a line, and both stations are named.
 */
const FILE_ORIGIN = 0;

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
 * Literally, and that is measured, not stylistic: `?L=250&h=-40` completed with `fl=6.0` lands
 * clear at garde 1,25 m with an honest 2,40 % ⚠, while a "smart" 4 %-of-span completion lands at
 * **−2,39 m — on the ground**.
 *
 * The values come from the **active family's** shipped default: `FIRST_RUN_SCENARIO` for steel,
 * and for textile the retained textile default, so `?fam=tx` completes the rope class and both ends
 * with « Œil cousu / épissuré » rather than the steel cosse. A key given in the link is kept as
 * given, an out-of-family termination included.
 *
 * Three groups are exempt, all of them § 7's meanings of absence:
 *
 * 1. {@link NEVER_COMPLETED}: `reg`, the Overrides and the textile blanks. Under `fam=tx` **no rope
 *    is invented**: § 9 ships `MBL` and `μ` « vides et requis », because one made-up `MBL` decides
 *    the verdict, and those two blocking errors are the correct arrival state.
 * 2. The **inactive** terrain source. `tr` present ⇒ imported: `L`/`h` are derived read-outs and
 *    are dropped rather than completed; `tr` absent ⇒ manual, and `sa`/`sb` never appear.
 * 3. The **inactive** family's keys, dropped the same way.
 *
 * Three keys complete from the link rather than from a constant. An imported link's `sa`
 * completes to {@link FILE_ORIGIN} and its `sb` to `sa` plus the shipped span. `x` completes to
 * half the *completed* span — 125,0 m for `?L=250&h=-40` rather than the constant 75,0 — because
 * it selects a **view**, and a viewpoint off the end of the span is worse than a moved viewpoint.
 *
 * @param search an accepted bag. Only meaningful when `hasScenarioKey` is true: a bare `/`
 *   restores the Session and is never rewritten. A refused link never reaches here, because
 *   completing it would turn « refused whole » into a scenario neither party ever saw.
 */
export function completeFromDefaults(search: AcceptedSearch): Completion {
  const imported = search.tr !== undefined;
  const family = search.fam ?? DEFAULT_FAMILY;
  const hasDriver = TIGHTNESS_KEYS.some((key) => search[key] !== undefined);
  const values = completionValues(search, family);

  const out: Record<string, unknown> = {};
  const completed: SearchKey[] = [];

  for (const key of CANONICAL_KEYS) {
    if (!inActiveConfiguration(key, imported, family)) continue;

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

/** What each absent key of this link completes to: the active family's bag, plus the three rules. */
function completionValues(search: AcceptedSearch, family: FamilyToken): AcceptedSearch {
  const firstRun = FIRST_RUN_SCENARIO.geometry;
  const sa = search.sa ?? FILE_ORIGIN;
  const terrain: CompletedTerrain =
    search.tr === undefined
      ? { L: search.L ?? firstRun.L, h: search.h ?? firstRun.h }
      : { tr: search.tr, sa, sb: search.sb ?? sa + firstRun.L };
  return { ...SHIPPED_BY_FAMILY[family], ...terrain, x: spanOf(terrain) / 2 };
}

/**
 * Is this key part of the **active** configuration? § 7's one governing rule: « the URL carries the
 * active configuration and never a retained alternate », so an imported link has `tr`/`sa`/`sb` and
 * no `L`/`h`, a steel link has no `cls`/`mbl`/`k`, and a textile link has no `d`/`r0`/`cst`.
 *
 * Out-of-scope keys leave the canonical bag **without** a strip line: the strip's two kinds are an
 * unknown key and an unrepresentable value, and a redundant `L` beside a `tr` is neither — with a
 * trace present `L` is derived, so nothing the line needs is removed.
 */
function inActiveConfiguration(key: SearchKey, imported: boolean, family: FamilyToken): boolean {
  switch (key) {
    case "L":
    case "h":
      return !imported;
    case "sa":
    case "sb":
    case "tr":
      return imported;
    case "d":
    case "r0":
    case "cst":
    case "mbf":
    case "ea":
      return family === "ac";
    case "cls":
    case "mbl":
    case "k":
      return family === "tx";
    default:
      // `mu` is deliberately not scoped: it is the same physical quantity in both families.
      return true;
  }
}

/** The span a bag describes, m — `L` in manual mode, `sb − sa` in imported mode. */
function spanOf(bag: CompletedTerrain): number {
  return bag.tr === undefined ? bag.L : bag.sb - bag.sa;
}

/** § 7's presence-encoded driver, back into the app's union. */
function tightness(search: CompletedDriver): TightnessDraft {
  if (search.fl !== undefined) return { mode: "sag", D_target: search.fl };
  if (search.te !== undefined) return { mode: "tension", H_target: newtonsFromDaN(search.te) };
  if (search.lo !== undefined) return { mode: "length", L0: search.lo };
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

/** The textile arm — a **draft**: `mbl`, `mu` and `k` absent are § 9's blanks, not zeros. */
function textile(search: CompletedTextile): TextileDraft {
  return {
    family: "textile",
    ropeClass: ROPE_CLASS_ID_BY_TOKEN[search.cls],
    MBL: search.mbl === undefined ? null : newtonsFromDaN(search.mbl),
    mu: search.mu ?? null,
    k: search.k ?? null,
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
        : { source: "trace", trace: search.tr, sa: search.sa, sb: search.sb },
    anchors: { zA: search.za, zB: search.zb },
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
      DAF: search.daf,
      xD: clampX(search.x, spanOf(search)),
    },
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
  } else {
    out.sa = geometry.sa;
    out.sb = geometry.sb;
  }
  out.za = anchors.zA;
  out.zb = anchors.zB;

  const driver = tightnessDriver(scenario);
  const driverKey = DRIVER_KEY[driver.field];
  out[driverKey] = driverKey === "te" ? daNFromNewtons(driver.value) : driver.value;

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
  out.daf = rider.DAF;
  out.x = rider.xD;

  if (geometry.source === "trace") out.tr = geometry.trace;

  return out as CompletedSearch;
}

/**
 * § 9's shipped Scenario as a bag — the completion source, derived from the constant rather than
 * transcribed beside it, so a defaults change cannot leave a second copy behind.
 */
const FIRST_RUN_SEARCH: CompletedSearch = scenarioToSearch(FIRST_RUN_SCENARIO);

/**
 * The textile keys a shipped default completes: the rope class and both ends, read from the
 * retained textile default because the first-run Scenario is steel. `mbl`, `mu` and `k` stay blank
 * on purpose.
 */
const { spec: TEXTILE_SPEC, terminations: TEXTILE_ENDS } = FIRST_RUN_RETAINED_TEXTILE;

/**
 * Each family's completion source. The textile bag overlays the steel first-run one, so every key
 * a textile link can lack — the class and the ends — comes from the textile default, and the steel
 * keys left beneath it are out of the textile configuration and never read.
 */
const SHIPPED_BY_FAMILY: Readonly<Record<FamilyToken, AcceptedSearch>> = {
  ac: FIRST_RUN_SEARCH,
  tx: {
    ...FIRST_RUN_SEARCH,
    cls: ROPE_CLASS_TOKEN_BY_ID[TEXTILE_SPEC.ropeClass],
    ta: TERMINATION_TOKEN_BY_ID[TEXTILE_ENDS.A.id],
    tb: TERMINATION_TOKEN_BY_ID[TEXTILE_ENDS.B.id],
    na: TEXTILE_ENDS.A.eta,
    nb: TEXTILE_ENDS.B.eta,
  },
};

/**
 * § 9's first-run link, which « Copier le lien » produces from the shipped defaults. The address
 * bar itself stays **bare** on first run: `/` *means* « restore the Session », so it is never
 * rewritten on load.
 *
 * **142 characters, measured against the installed router** — 137 before `gm` (2026-09-23).
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
export const FIRST_RUN_LINK: string = canonicalLink(FIRST_RUN_SEARCH);
