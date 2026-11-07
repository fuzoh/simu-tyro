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

import type {
  EndTermination,
  Scenario,
  ScenarioDraft,
  TextileDraft,
  TightnessDraft,
} from "@/lib/scenario/types.ts";
import type { SteelSpec, TerminationId, TextileSpec } from "@/lib/sim";

import { FIRST_RUN_RETAINED_TEXTILE, FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { clampX } from "@/lib/scenario/geometry.ts";

import type {
  ConstructionToken,
  FamilyToken,
  RopeClassToken,
  SearchKey,
  TerminationToken,
  ValidatedSearch,
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
] = [true, true];
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

/** The id each token means, per family — `epissure` is the one token both families spell. */
const TERMINATION_ID_BY_TOKEN: Record<
  "steel" | "textile",
  Record<TerminationToken, TerminationId | null>
> = {
  steel: {
    manchon: "manchon-metal-resine",
    cosse: "cosse-oeil-flamand",
    epissure: "epissure",
    coin: "manchon-a-coin",
    serre: "serre-cables-etrier",
    oeil: null,
    huit: null,
    chaise: null,
    attelage: "attelage-sans-tension",
  },
  textile: {
    manchon: null,
    cosse: null,
    epissure: "epissure-longue-hmpe",
    coin: null,
    serre: null,
    oeil: "oeil-cousu-epissure",
    huit: "noeud-de-huit",
    chaise: "noeud-de-chaise",
    attelage: "attelage-sans-tension",
  },
};

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

/**
 * Which {@link TerminationId} a token names under a family, or `null` when that family does not
 * publish it. The app's tier, not the URL's: an out-of-family token is kept by the schema and
 * refused by the picker.
 */
export function terminationIdFromToken(
  token: TerminationToken,
  family: "steel" | "textile",
): TerminationId | null {
  return TERMINATION_ID_BY_TOKEN[family][token];
}

/**
 * The keys whose **absence is meaning**, never completed. § 7's first two meanings: `reg` absent is
 * « — choisir — », and `mbf`/`ea`/`mu` absent is « non surchargée », which differs from « equal to
 * the formula value ».
 */
const NEVER_COMPLETED: ReadonlySet<SearchKey> = new Set<SearchKey>(["reg", "mbf", "ea", "mu"]);

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
  readonly search: ValidatedSearch;
  /** The completed keys, in canonical order. The strip names the **values**, read from `search`. */
  readonly completed: readonly SearchKey[];
};

/**
 * § 7's completion rule: **partial recognised links are completed literally** from
 * `FIRST_RUN_SCENARIO`, and the address bar is then rewritten to the completed Scenario.
 *
 * Literally, and that is measured, not stylistic: `?L=250&h=-40` completed with `fl=6.0` lands
 * clear at garde 1,25 m with an honest 2,40 % ⚠, while a "smart" 4 %-of-span completion lands at
 * **−2,39 m — on the ground**.
 *
 * Three groups are exempt, all of them § 7's three meanings of absence:
 *
 * 1. `reg` and `mbf`/`ea`/`mu` — {@link NEVER_COMPLETED}.
 * 2. The **inactive** terrain source. `tr` present ⇒ imported: `L`/`h` are derived read-outs and
 *    are dropped rather than completed; `tr` absent ⇒ manual, and `sa`/`sb` never appear.
 * 3. The **inactive** family, and a rope nobody typed. Under `fam=tx` no steel key is completed
 *    and **no rope is invented**: § 9 ships `MBL` and `μ` « vides et requis », because one made-up
 *    `MBL` decides the verdict. Those two blocking errors are the correct arrival state. The rope
 *    **class** is the exception: it is a choice among three, not a measurement, so it is completed
 *    from the shipped textile default and named.
 *
 * `x` is the one non-literal completion — `L/2` of the *completed* span, 125,0 m for `?L=250&h=-40`
 * rather than the constant 75,0 — because it selects a **view**, and a viewpoint off the end of the
 * span is worse than a moved viewpoint.
 *
 * A **refused** bag is returned untouched, completing nothing. Completion is the one operation
 * that would turn « refused whole » into a silent repair — a scenario neither party ever saw,
 * built entirely out of our defaults — so the marker short-circuits it.
 *
 * @param search a validated bag. Only meaningful when {@link hasScenarioKey} is true: a bare `/`
 *   restores the Session and is never rewritten.
 */
export function completeFromDefaults(search: ValidatedSearch): Completion {
  if (search.refused !== undefined) return { search, completed: [] };

  const imported = search.tr !== undefined;
  const family = search.fam ?? DEFAULT_FAMILY;
  const hasDriver = TIGHTNESS_KEYS.some((key) => search[key] !== undefined);

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

    const fallback = FIRST_RUN_SEARCH[key] ?? TEXTILE_COMPLETION[key];
    if (fallback === undefined) continue;
    out[key] = fallback;
    completed.push(key);
  }

  if (out.x !== undefined && search.x === undefined) {
    const span = spanOf(out);
    if (span !== undefined) out.x = span / 2;
  }

  return { search: out as ValidatedSearch, completed };
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

/** The completed span, m — `L` in manual mode, `sb − sa` in imported mode, `undefined` if neither. */
function spanOf(bag: Record<string, unknown>): number | undefined {
  const { L, sa, sb } = bag;
  if (typeof L === "number") return L;
  if (typeof sa === "number" && typeof sb === "number") return sb - sa;
  return undefined;
}

/**
 * One end's hardware. The token is the URL's, the id is the app's, and `fam` fixes which set is
 * legal: an out-of-family token (`?fam=ac&ta=huit`) is **kept by the schema and refused here**,
 * falling back to § 9's shipped end rather than inventing a steel « nœud de huit ». That is the
 * app's tier, exactly where § 7 puts it — the URL types, the app validates.
 */
function endTermination(
  token: TerminationToken | undefined,
  eta: number | undefined,
  family: "steel" | "textile",
  fallback: EndTermination,
): EndTermination {
  const id: TerminationId | null =
    token === undefined ? null : terminationIdFromToken(token, family);
  return { id: id ?? fallback.id, eta: eta ?? fallback.eta };
}

/** § 7's presence-encoded driver, back into the engine's union. Exactly one key can be present:
 * two is a refusal that never reaches this function. */
function tightness(search: ValidatedSearch): TightnessDraft {
  if (search.fl !== undefined) return { mode: "sag", D_target: search.fl };
  if (search.te !== undefined) return { mode: "tension", H_target: newtonsFromDaN(search.te) };
  if (search.lo !== undefined) return { mode: "length", L0: search.lo };
  if (search.vr !== undefined) return { mode: "ratio", ratio: search.vr };
  return { ...FIRST_RUN_SCENARIO.tightness };
}

/** The steel arm — `mbf`/`ea` in daN, `mu` in kg/m, and **absence is « non surchargée »**. */
function steel(search: ValidatedSearch): SteelSpec {
  const shipped = FIRST_RUN_SCENARIO.material;
  const overrides: { MBF?: number; EA?: number; mu?: number } = {};
  if (search.mbf !== undefined) overrides.MBF = newtonsFromDaN(search.mbf);
  if (search.ea !== undefined) overrides.EA = newtonsFromDaN(search.ea);
  if (search.mu !== undefined) overrides.mu = search.mu;

  const spec: SteelSpec = {
    family: "steel",
    d: search.d ?? shipped.d,
    R0: search.r0 ?? shipped.R0,
    construction:
      search.cst === undefined ? shipped.construction : CONSTRUCTION_ID_BY_TOKEN[search.cst],
  };
  // Omit the key entirely when nothing was overridden: `overrides: {}` and `overrides: undefined`
  // read the same to the engine, but only the absent one round-trips back to an absent `mbf`.
  return Object.keys(overrides).length === 0 ? spec : { ...spec, overrides };
}

/** The textile arm — a **draft**: `mbl` and `mu` absent are § 9's two blanks, not zeros. */
function textile(search: ValidatedSearch): TextileDraft {
  return {
    family: "textile",
    ropeClass:
      search.cls === undefined
        ? FIRST_RUN_RETAINED_TEXTILE.spec.ropeClass
        : ROPE_CLASS_ID_BY_TOKEN[search.cls],
    MBL: search.mbl === undefined ? null : newtonsFromDaN(search.mbl),
    mu: search.mu ?? null,
    k: search.k ?? null,
  };
}

/**
 * A validated (and normally completed) bag as the app's state object — the read side of
 * {@link scenarioToSearch}.
 *
 * @param search the bag {@link completeFromDefaults} returned. A bag carrying `refused` never reaches
 *   here: the refusal surface suppresses the screen rather than merging with it.
 * @returns the draft the store holds. Total by construction — every field falls back to § 9's
 *   shipped value, except the two textile blanks, which fall back to `null` on purpose.
 */
export function searchToScenario(search: ValidatedSearch): ScenarioDraft {
  const shipped = FIRST_RUN_SCENARIO;
  const family: "steel" | "textile" = search.fam === "tx" ? "textile" : "steel";

  const geometry: ScenarioDraft["geometry"] =
    search.tr !== undefined
      ? {
          source: "trace",
          trace: search.tr,
          sa: search.sa ?? 0,
          sb: search.sb ?? (search.sa ?? 0) + shipped.geometry.L,
        }
      : { source: "manual", L: search.L ?? shipped.geometry.L, h: search.h ?? shipped.geometry.h };

  const xD = search.x ?? shipped.rider.xD;
  const span = spanOf(search);

  return {
    // `u` is display-only — it changes no number's meaning anywhere, here least of all.
    unit: search.u ?? shipped.unit,
    usage: search.use === "tempo" ? "TEMPORAIRE" : "PERMANENTE",
    // Absent **is** « — choisir — », and it is never completed, so it is never defaulted either.
    regime: search.reg ?? null,
    geometry,
    anchors: { zA: search.za ?? shipped.anchors.zA, zB: search.zb ?? shipped.anchors.zB },
    tightness: tightness(search),
    material: family === "textile" ? textile(search) : steel(search),
    terminations: {
      A: endTermination(search.ta, search.na, family, shipped.terminations.A),
      B: endTermination(search.tb, search.nb, family, shipped.terminations.B),
    },
    rider: {
      mp: search.mp ?? shipped.rider.mp,
      hRider: search.hr ?? shipped.rider.hRider,
      hClearMin: search.gm ?? shipped.rider.hClearMin,
      DAF: search.daf ?? shipped.rider.DAF,
      xD: span === undefined ? xD : clampX(xD, span),
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
export function scenarioToSearch(scenario: Scenario): ValidatedSearch {
  const { geometry, tightness, material, terminations, rider, anchors } = scenario;
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

  if (tightness.mode === "sag") out.fl = tightness.D_target;
  else if (tightness.mode === "tension") out.te = daNFromNewtons(tightness.H_target);
  else if (tightness.mode === "ratio") out.vr = tightness.ratio;
  else out.lo = tightness.L0;

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

  return out as ValidatedSearch;
}

/**
 * § 9's shipped Scenario as a bag — the completion source, derived from the constant rather than
 * transcribed beside it, so a defaults change cannot leave a second copy behind.
 */
const FIRST_RUN_SEARCH: ValidatedSearch = scenarioToSearch(FIRST_RUN_SCENARIO);

/**
 * The one textile key a shipped default can complete: the rope class. `mbl`, `mu` and `k` stay
 * blank on purpose, and the first-run Scenario is steel, so its bag carries no `cls` to complete
 * from — the class is read from the retained textile default instead.
 */
const TEXTILE_COMPLETION: ValidatedSearch = {
  cls: ROPE_CLASS_TOKEN_BY_ID[FIRST_RUN_RETAINED_TEXTILE.spec.ropeClass],
};

/**
 * § 9's first-run link, which « Copier le lien » produces from the shipped defaults. The address
 * bar itself stays **bare** on first run: `/` *means* « restore the Session », so it is never
 * rewritten on load.
 *
 * **142 characters, measured against the installed router** — 137 before `gm` (2026-09-23). § 7, § 9 and § 11 all quote **141**,
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
