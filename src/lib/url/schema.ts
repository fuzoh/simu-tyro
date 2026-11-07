/**
 * The URL schema — « v1 build spec » § 7 (*The search-param schema — flat readable keys*, *The key
 * table*, *Canonical key order*, *Refusal, dropping, and rewriting — the salvage table*), § 8 (*The
 * validator's hard rules*, *Les surfaces du lien*) and
 * [amendment D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md), which replaces § 8's
 * hand-rolled parser with **valibot** while leaving the four hard rules untouched, and
 * [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md), which replaces § 8's
 * *thrown* refusal with a **marker salvaged into the validated search**.
 *
 * Rules this module exists to keep:
 *
 * - **The URL is a typing boundary, not a validation boundary.** A link restores state
 *   *faithfully, including invalid state*: `?L=-5` lights up the form's own validation exactly as
 *   typing it would, and `?reg=secours10&fam=ac` arrives already invalid and raises § 6's blocking
 *   error on the first frame. The parser rejects only what is **unrepresentable** — not a finite
 *   number, not a member of the enum, a key the schema does not know. Hence **no `v.minValue` /
 *   `v.maxValue` anywhere below**: re-checking ranges here would make three validation tiers with
 *   one rule living in two of them, and silently repairing a link yields a scenario neither party
 *   ever saw.
 * - **One schema per key, applied per key.** Never one object schema that fails whole: the
 *   required behaviour is per-key salvage **with a report** ({@link salvageSearch}). The three
 *   refusal classes are the exception, and they are whole-link.
 * - **A refusal is a returned marker, never a throw** — amendment E. On the pinned tree a thrown
 *   `validateSearch` answers **HTTP 500** under `ssr: false`, where the tree § 8 measured answered
 *   200, and § 8's refusal copy (« nothing failed to load and the status line agrees ») rests on
 *   the 200. So nothing here throws: a refused link comes back as `{ refused }`
 *   ({@link LinkRefusal}) and the index route renders the refusal surface as an ordinary
 *   component. The refusal is still **whole-link** — checked on the **raw** bag before any per-key
 *   salvage, and it **suppresses** the rest of the bag rather than merging with it.
 * - **`refused` is not a URL key, and keeping it out of the URL takes a middleware.** It is not in
 *   {@link CANONICAL_KEYS}, so neither {@link canonicalLink} nor the load-time rewrite can emit it
 *   — but the *router* can, and measured on the pinned tree it does: `applySearchMiddleware`
 *   returns `{ ...incoming, ...validated }`, `stringifySearch` writes **every** key of that merge,
 *   and `loadServerRoute` 307-redirects whenever the rebuilt href differs from the incoming one.
 *   A bare `/?v=3` therefore lands on `/?v=3&refused=%7B%22kind%22…` unless something removes the
 *   marker from the merge. {@link keepRefusalOutOfTheAddressBar} is that something, and the index
 *   route installing it is **not optional**.
 * - **No `transform`, anywhere.** `v.pipe(v.string(), v.transform(Number))` *is* the coercion the
 *   307 measurement forbids — returning `String(1)` for `bad=1` produced `307 → ?bad=%221%22`.
 *   Whatever the validator returns is what `stringifySearch` writes back, so every schema here
 *   validates shape and **returns the value untouched**.
 * - **Omit, never `undefined`.** Measured: returning `{ M: undefined }` makes the **server**
 *   307-strip the key — even under `ssr: false` — before any client code runs, which would make
 *   the dropped-keys strip unable to name it. A dropped key is *absent* from the returned bag.
 * - **Synchronous and cheap, because it runs 3× per document request**, on the server, inside a
 *   swallowing `try {…} catch {}` where module state is shared across users. `v.safeParse` is sync,
 *   which is the whole reason valibot is admissible here; `parseAsync` is not. Nothing in this
 *   module is stateful and nothing memoises.
 * - **`tr` is validated structurally and kept verbatim.** {@link validateP1} allocates no arrays;
 *   the real decode is a memoised derivation inside the client-only subtree and never enters the
 *   validated search object, because arrays in it would be stringified back into the address bar.
 * - **The tightness driver is encoded by which key is *present*** — `fl` / `te` / `lo`. Two present
 *   keys « are not a bad value but two contradictory models of the same line », so presence is
 *   counted on the **raw** bag, before per-key validation, and the link refuses whole.
 * - **Forces are daN in the URL, always**, whatever `u` says. `u` is display-only, so hand-editing
 *   `u=daN` → `u=kN` must not make the line 100× tighter. The engine holds newtons; {@link
 *   scenarioToSearch} is the one place the ÷10 happens, on the **write** side.
 * - **Absence carries exactly three meanings and never a fourth.** `reg` absent is « — choisir — »,
 *   `mbf`/`ea`/`mu` absent is « non surchargée », and a family- or terrain-scoped key absent means
 *   that configuration is not the active one. So `stripSearchParams` is rejected, every key with a
 *   value is stated even at its default, and {@link completeFromDefaults} exempts the first two.
 * - **The dropped-keys reporter takes the raw query string as a parameter**
 *   ({@link reportDroppedKeys}), never reading `window.location` — amendment A removed the jsdom
 *   environment that would otherwise be needed, and as a pure function this is a plain unit test.
 */

import type { SearchMiddleware } from "@tanstack/react-router";

import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import * as v from "valibot";

import type { Scenario } from "@/lib/scenario/types.ts";
import type { RegimeId, TerminationId } from "@/lib/sim";

import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";

import { P1Error, validateP1 } from "./p1.ts";

/**
 * § 7's key table, **in its order**. The rewrite emits the full canonical bag in exactly this
 * order, which is achievable because `router-core/dist/esm/qss.js`'s `encode()` iterates
 * `for (const key in obj)` and appends via `URLSearchParams.set`: object insertion order survives
 * into the query string. Two links to the same Scenario are then string-identical, which is what
 * makes « Copier le lien » diffable and a bug report reproducible.
 *
 * `mu` appears **once**, in the steel-override group: it is the same physical quantity in both
 * families and `fam` already fixes whether it is an override or a direct input.
 */
export const CANONICAL_KEYS = [
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
] as const;

/** One of § 7's ~30 readable flat keys. */
export type SearchKey = (typeof CANONICAL_KEYS)[number];

/** § 7's `u` tokens. Identical to `ForceUnit` — the URL spells the unit the app spells. */
export const FORCE_UNIT_TOKENS = ["daN", "kN", "kgf"] as const;

/** § 7's `use` tokens. `perm` is §10.4's restrictive branch. */
export const USE_TOKENS = ["perm", "tempo"] as const;

/** § 7's `use` token. */
export type UseToken = (typeof USE_TOKENS)[number];

/** § 7's `reg` tokens. Identical to {@link RegimeId}, so no mapping table is needed. */
export const REGIME_TOKENS = [
  "en15567",
  "wsqld",
  "acct10",
  "ansi5",
  "secours10",
] as const satisfies readonly RegimeId[];

/** § 7's `fam` tokens — `ac` acier, `tx` textile. */
export const FAMILY_TOKENS = ["ac", "tx"] as const;

/** § 7's `fam` token. */
export type FamilyToken = (typeof FAMILY_TOKENS)[number];

/** § 7's `cst` tokens — `tc` âme textile, `iwrc` âme métallique. */
export const CONSTRUCTION_TOKENS = ["tc", "iwrc"] as const;

/** § 7's `cst` token. */
export type ConstructionToken = (typeof CONSTRUCTION_TOKENS)[number];

/** § 7's `cls` tokens. */
export const ROPE_CLASS_TOKENS = ["hmpe", "pa", "pes"] as const;

/** § 7's `cls` token. */
export type RopeClassToken = (typeof ROPE_CLASS_TOKENS)[number];

/**
 * § 7's `ta` / `tb` tokens — five steel, four textile, `epissure` shared, plus `attelage`, which
 * both families publish (2026-09-23). The schema accepts all nine regardless of `fam`, because a textile termination under steel is an **invalid
 * combination**, not an unrepresentable value: it arrives and raises its blocking error, exactly
 * as `reg=secours10&fam=ac` does.
 */
export const TERMINATION_TOKENS = [
  "manchon",
  "cosse",
  "epissure",
  "coin",
  "serre",
  "oeil",
  "huit",
  "chaise",
  "attelage",
] as const;

/** § 7's `ta` / `tb` token. */
export type TerminationToken = (typeof TERMINATION_TOKENS)[number];

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

/** § 7's `r0` — the two grades § 3 publishes. A third is unrepresentable, not out of range. */
export const GRADES = [1770, 1960] as const;

/**
 * § 7's tightness drivers — three, plus `vr` (« Rapport V », `P / H`, added 2026-09-23). **Exactly
 * one** may be present; two is a refusal.
 */
export const TIGHTNESS_KEYS = ["fl", "te", "lo", "vr"] as const;

/**
 * A validated bag: § 7's key table with every key optional, because **absence is meaning** and
 * because a salvaged key is *omitted* rather than set to `undefined`.
 *
 * Every value is the value that arrived, untouched — a number stays a number and `tr` stays the
 * string the sender sent.
 *
 * {@link refused} is the one member that is **not** a URL key: it is amendment E's marker, set on
 * a link that refuses whole, and when it is set it is the **only** member — the refusal suppresses
 * the rest of the screen rather than merging with it.
 */
export type ValidatedSearch = {
  /**
   * Amendment E's whole-link refusal, or absent. Not a key of § 7's table: it never round-trips
   * through the address bar, because {@link canonicalLink} emits {@link CANONICAL_KEYS} only.
   */
  readonly refused?: LinkRefusal;
} & Readonly<Partial<{ [K in SearchKey]: v.InferOutput<(typeof KEY_SCHEMAS)[K]> }>>;

/**
 * A finite number, and nothing else. `v.number()` already refuses `NaN`; `v.finite()` adds the two
 * infinities, which `JSON.parse` produces from `1e999`. **No range check** — that is the form's.
 */
const FINITE = v.pipe(v.number(), v.finite());

/**
 * One schema per key, § 7's key table transcribed. Applied **per key**, never as an object schema:
 * an object schema fails whole, and the required behaviour is per-key salvage with a report.
 *
 * `ValidatedSearch` is derived from this table; the per-key notes live on the entries.
 */
const KEY_SCHEMAS = {
  v: v.literal(1), // Schema version. Absent ⇒ 1; anything but 1 refuses the whole link.
  u: v.picklist(FORCE_UNIT_TOKENS), // Display unit. Changes no number's meaning anywhere.
  use: v.picklist(USE_TOKENS),
  // Absent **is** « — choisir — », never a fallback to be filled in.
  reg: v.picklist(REGIME_TOKENS),
  L: FINITE, // Portée, m — manual geometry only.
  h: FINITE, // Dénivelé, m — manual geometry only.
  sa: FINITE, // Station A, m in file coordinates — imported geometry only.
  sb: FINITE, // Station B, m in file coordinates — imported geometry only. `L = sb − sa`.
  za: FINITE, // Hauteur d'ancrage A, m.
  zb: FINITE, // Hauteur d'ancrage B, m.
  fl: FINITE, // Flèche à vide cible, m.
  te: FINITE, // Prétension cible, **daN**.
  lo: FINITE, // Longueur non tendue, m.
  // « Rapport V » `P / H`, dimensionless. Presence selects the driver, like the three above.
  vr: FINITE,
  fam: v.picklist(FAMILY_TOKENS),
  d: FINITE, // Diamètre nominal, mm — acier.
  r0: v.picklist(GRADES),
  cst: v.picklist(CONSTRUCTION_TOKENS),
  mbf: FINITE, // `MBF` surchargée, **daN** — acier. Absent = non surchargée.
  ea: FINITE, // `EA` surchargée, **daN** — acier. Absent = non surchargée.
  mu: FINITE, // Masse linéique, kg/m — surcharge acier *or* saisie textile; `fam` fixes which.
  cls: v.picklist(ROPE_CLASS_TOKENS),
  mbl: FINITE, // Charge de rupture, **daN** — textile.
  k: FINITE, // Raideur relative `EA/MBL` — textile.
  ta: v.picklist(TERMINATION_TOKENS),
  tb: v.picklist(TERMINATION_TOKENS),
  na: FINITE, // `η_t` A.
  nb: FINITE, // `η_t` B.
  mp: FINITE, // Masse passager, kg.
  hr: FINITE, // Enveloppe passager, m.
  gm: FINITE, // Garde min. admise, m (2026-09-23).
  daf: FINITE, // Coefficient dynamique.
  x: FINITE, // Position du passager, m — clamped to `[0, L]` by the store, **never here**.
  // `tr` is validated **structurally** by the codec, not by valibot: sentinel, base64url alphabet,
  // varint walk, declared `n` against bytes consumed, character budget. A structural failure is a
  // refusal, not a salvage, so it is handled in {@link refuse} rather than here.
  tr: v.string(),
} satisfies Record<SearchKey, v.GenericSchema>;

/** Set membership, hoisted out of the per-request path — `validateSearch` runs 3× per request. */
const KEY_SET: ReadonlySet<string> = new Set<string>(CANONICAL_KEYS);

/**
 * The keys that make a link a *scenario*. `v` is excluded on purpose: it names the schema, not the
 * line, so `/?v=1` still means « restore the Session » exactly as a bare `/` does.
 */
const SCENARIO_KEY_SET: ReadonlySet<string> = new Set<string>(
  CANONICAL_KEYS.filter((key) => key !== "v"),
);

/**
 * § 8's four refusal reason lines, keyed. The French copy is the UI's — this is the selector.
 *
 * - `version-inconnue` — « version de schéma inconnue (v = 3) »
 * - `tracé-illisible` — « tracé illisible »
 * - `tracé-hors-budget` — « tracé trop volumineux pour cette adresse »
 * - `deux-directeurs` — « flèche à vide cible, prétension cible, longueur non tendue et rapport V
 *   cible : deux valeurs de tension dans le même lien »
 */
export const REFUSAL_KINDS = [
  "version-inconnue",
  "tracé-illisible",
  "tracé-hors-budget",
  "deux-directeurs",
] as const;

/** Which of § 8's four reason lines a refusal selects. */
export type RefusalKind = (typeof REFUSAL_KINDS)[number];

/**
 * A link refused **whole** — amendment E's carrier, *returned* by {@link validateSearch} as
 * `search.refused` and never thrown.
 *
 * It is a plain data object rather than an `Error` subclass for one reason: it now travels inside
 * the validated search, which the router may stringify or dehydrate, and only a JSON-shaped value
 * survives that intact. `received` comes from `JSON.parse` or from our own token list, so the whole
 * marker is serialisable by construction.
 *
 * What it carries is § 8's refusal unchanged — the kind, the message and what arrived — so the
 * `node` unit tests keep asserting the refusal with no router in the room.
 */
export type LinkRefusal = {
  /** Selects § 8's reason line. */
  readonly kind: RefusalKind;
  /** Why, in English, for a bug report. The user-facing French is the reason line's. */
  readonly message: string;
  /** What arrived, for the reason lines that quote it — « version de schéma inconnue (v = 3) ». */
  readonly received: unknown;
};

/** Membership, hoisted: the guard below runs on every bag that carries a `refused` key. */
const REFUSAL_KIND_SET: ReadonlySet<string> = new Set<string>(REFUSAL_KINDS);

/**
 * Is this a refusal marker we produced? Structural, because {@link validateSearch} may be handed
 * its own output back: `buildLocation`'s search middleware returns `{ ...incoming, ...validated }`
 * and the validator runs again on the merge, so a marker that failed to survive a second pass
 * would oscillate the refusal surface.
 *
 * All three members are checked, `received` included. It is `unknown`, so *any* value passes — but
 * its **presence** does not, and a hand-written `?refused={"kind":"version-inconnue","message":"x"}`
 * that skipped it would be typed {@link LinkRefusal} while § 8's reason line quoted `undefined`
 * into « version de schéma inconnue (v = …) ». The guard promises exactly what the type declares.
 */
export function isLinkRefusal(value: unknown): value is LinkRefusal {
  if (typeof value !== "object" || value === null) return false;
  const { kind, message } = value as { kind?: unknown; message?: unknown };
  return (
    typeof kind === "string" &&
    REFUSAL_KIND_SET.has(kind) &&
    typeof message === "string" &&
    "received" in value
  );
}

/** § 8's two salvageable kinds, and there is no third — the strip says **which** it was. */
export type DropReason = "clé-inconnue" | "valeur-non-représentable";

/** One dropped key, named with its reason: « ignoré » alone cannot distinguish typo from fault. */
export type DroppedKey = { readonly key: string; readonly reason: DropReason };

/**
 * What {@link salvageSearch} returns: the bag the route gets, and the strip's evidence.
 *
 * A refused link returns `{ search: { refused }, dropped: [] }` — the refusal is whole-link, so
 * there is no strip beside it, only the refusal surface.
 */
export type Salvage = {
  readonly search: ValidatedSearch;
  readonly dropped: readonly DroppedKey[];
};

/**
 * The router's own parse of a query string — `defaultParseSearch`, i.e. `parseSearchWith(JSON.parse)`.
 * Exposed because the dropped-keys strip works from the **raw** query string and must see exactly
 * what the route saw: `L=250` as the number 250, `use=perm` as the string `"perm"`, and a `p1.`
 * payload as a string because the sentinel makes `JSON.parse` throw.
 */
export function parseLinkSearch(query: string): Record<string, unknown> {
  return defaultParseSearch(query) as Record<string, unknown>;
}

/**
 * The three refusal classes, checked against the **raw** bag before any per-key salvage, and
 * **returned** rather than thrown (amendment E).
 *
 * Order matters only in that `v` comes first: an unknown schema version means nothing else in the
 * bag can be interpreted at all.
 *
 * @returns the marker, or `undefined` when the link is not refused whole.
 */
function refuse(raw: Record<string, unknown>): LinkRefusal | undefined {
  // A marker handed back to us — `buildLocation` merges the validated bag into the incoming one
  // and re-validates — is passed through, so a second pass cannot turn a refusal into a salvage.
  if (isLinkRefusal(raw.refused)) return raw.refused;

  if ("v" in raw && raw.v !== 1) {
    return {
      kind: "version-inconnue",
      message: `unknown schema version ${String(raw.v)}`,
      received: raw.v,
    };
  }

  if ("tr" in raw) {
    const tr = raw.tr;
    if (typeof tr !== "string") {
      return {
        kind: "tracé-illisible",
        message: `tr is ${typeof tr}, not a p1. payload`,
        received: tr,
      };
    }
    try {
      validateP1(tr);
    } catch (error) {
      if (error instanceof P1Error) {
        const kind = error.kind === "hors-budget" ? "tracé-hors-budget" : "tracé-illisible";
        return { kind, message: error.message, received: tr };
      }
      throw error;
    }
  }

  // Presence, not value: « two present keys are not a bad value but two contradictory models of
  // the same line ». Composed with completion-from-defaults, dropping both would silently supply
  // our own Flèche 6,0 m in the one quantity that scales every tension in the criteria grid.
  const drivers = TIGHTNESS_KEYS.filter((key) => key in raw);
  if (drivers.length > 1) {
    return {
      kind: "deux-directeurs",
      message: `two tightness drivers present: ${drivers.join(", ")}`,
      received: drivers,
    };
  }

  return undefined;
}

/**
 * § 7's salvage table, whole: the three refusal classes refuse the link **whole**, an unknown key
 * or an unrepresentable value is **ignored and named**, and anything else is **applied as-is**.
 *
 * Nothing here throws. A refusal short-circuits the per-key pass entirely — it is « applied whole
 * or refused whole », so a refused link yields the marker and *no* salvaged keys.
 *
 * @param raw the parsed search bag, as the router hands it over.
 * @returns the validated bag in canonical order, plus the evidence the strip renders.
 */
export function salvageSearch(raw: Record<string, unknown>): Salvage {
  const refused = refuse(raw);
  if (refused !== undefined) return { search: { refused }, dropped: [] };

  const dropped: DroppedKey[] = [];
  // Built in canonical order so the rewrite's bag is ordered by construction rather than by a
  // later sort — `qss.encode()` iterates insertion order.
  const search: Record<string, unknown> = {};

  for (const key of CANONICAL_KEYS) {
    if (!(key in raw)) continue;
    const result = v.safeParse(KEY_SCHEMAS[key], raw[key]);
    // Omit, never `{ key: undefined }`: that shape makes the **server** 307-strip the key before
    // any client code runs, and the strip could then never name it.
    if (result.success) search[key] = result.output;
    else dropped.push({ key, reason: "valeur-non-représentable" });
  }

  for (const key of Object.keys(raw)) {
    if (!KEY_SET.has(key)) dropped.push({ key, reason: "clé-inconnue" });
  }

  // The cast is the one place the per-key loop's key/value correlation is asserted: every value in
  // `search` is `KEY_SCHEMAS[key]`'s output, which is `ValidatedSearch[key]` by construction.
  return { search: search as ValidatedSearch, dropped };
}

/**
 * The index route's `validateSearch`. Pure, synchronous, allocation-light and side-effect-free,
 * because it runs **3× per document request** — on the server, where module state is shared across
 * requests, inside a `try {…} catch {}` that swallows throws at one of the three call sites.
 *
 * It returns the bag and **nothing else**: the dropped-keys report may not ride here, because the
 * router stringifies the validated object straight back into the address bar.
 *
 * **It never throws** (amendment E). § 8's three refusal classes — unknown `v`, `tr` undecodable or
 * oversize, two tightness drivers present — come back as `search.refused`, which the index route
 * renders as an ordinary component at **HTTP 200**. On the pinned tree a throw would answer 500,
 * and « nothing failed to load and the status line agrees » is copy the app has to keep true.
 *
 * `refused` is the **only** key it ever synthesises — every other key it returns was in the raw
 * bag — which is why {@link keepRefusalOutOfTheAddressBar} has exactly one key to remove.
 */
export function validateSearch(raw: Record<string, unknown>): ValidatedSearch {
  return salvageSearch(raw).search;
}

/**
 * The index route's one `search.middlewares` entry, and **installing it is not optional**: it is
 * the only thing standing between amendment E's marker and the address bar.
 *
 * Amendment E's marker is a key {@link validateSearch} *synthesises* — the raw bag never carries
 * it — and on the pinned tree (`@tanstack/react-router` 1.170.27) a synthesised key is a **307**.
 * Measured, not deduced:
 *
 * 1. `router.js`'s `applySearchMiddleware` wraps each route's `validateSearch` in a middleware
 *    returning `{ ...result, ...validated }`, and `buildLocation` stringifies **that merge** —
 *    `stringifySearch` writes every key it finds, not only {@link CANONICAL_KEYS}.
 * 2. `load-server.js`'s `loadServerRoute` rebuilds the canonical location on every document
 *    request with `_includeValidateSearch: true` and throws a redirect when its `publicHref`
 *    differs from the incoming one.
 *
 * So `/?v=3` rebuilds as `/?v=3&refused=%7B%22kind%22%3A%22version-inconnue%22…` and 307s there:
 * the user's address bar spells our marker as JSON and « Copier le lien » ships it. `search.strict`
 * does not save it — it is unset (probe 5) and the middleware path runs `validateSearch`
 * regardless.
 *
 * Removing the marker from the merge fixes it at the one place that decides the href, and it costs
 * the refusal surface nothing: `matchRoutes` does **not** run search middlewares, so the match's
 * search still carries `refused` and ticket 22 still reads `Route.useSearch().refused`. The
 * rebuilt href then equals the incoming one key-for-key — a refused link is written back exactly
 * as it arrived, which is « refused whole » spelled in the address bar: nothing repaired, nothing
 * added.
 *
 * Hand-rolled rather than `stripSearchParams(["refused"])` because that helper also feeds
 * `meta.removedAny`, which changes how `retainSearchParams` treats the key — machinery this app
 * has no other use for, for a one-key deletion.
 */
export const keepRefusalOutOfTheAddressBar: SearchMiddleware<ValidatedSearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  if (result.refused === undefined) return result;
  const withoutRefusal: Record<string, unknown> = { ...result };
  delete withoutRefusal.refused;
  // Insertion order survives the delete, so the remaining keys keep the order they merged in and
  // the href stays string-identical to the one that arrived.
  return withoutRefusal as ValidatedSearch;
};

/**
 * § 8's dropped-keys strip, computed **client-side on first mount from the raw query string,
 * before the rewrite `replace` fires** — the only place where the evidence and the renderer
 * coexist. Taking the string as a parameter is amendment A's seam: no `window.location`, no jsdom,
 * a plain unit test.
 *
 * @param query the raw query string, leading `?` optional.
 * @returns each dropped key with its reason, in the order the strip names them — **empty** when
 *   the link refuses whole, because then there is no strip, only the refusal surface.
 */
export function reportDroppedKeys(query: string): readonly DroppedKey[] {
  return salvageSearch(parseLinkSearch(query)).dropped;
}

/**
 * Does this bag describe a scenario? If not, bare `/` semantics apply: restore the Session.
 *
 * A refused link describes none: `refused` is not a scenario key, and the refusal surface
 * suppresses the screen rather than opening on the Session.
 */
export function hasScenarioKey(search: ValidatedSearch): boolean {
  for (const key of Object.keys(search)) if (SCENARIO_KEY_SET.has(key)) return true;
  return false;
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
 *    `MBL` decides the verdict. Those two blocking errors are the correct arrival state.
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

    const fallback = FIRST_RUN_SEARCH[key];
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

/** N → daN. § 7: forces serialise in daN, **fixed**, and ×10 exactly, so the step is lossless. */
function daN(newtons: number): number {
  return newtons / 10;
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
  else if (tightness.mode === "tension") out.te = daN(tightness.H_target);
  else if (tightness.mode === "ratio") out.vr = tightness.ratio;
  else out.lo = tightness.L0;

  if (material.family === "steel") {
    out.fam = "ac";
    out.d = material.d;
    out.r0 = material.R0;
    out.cst = material.construction === "iwrc" ? "iwrc" : "tc";
    const overrides = material.overrides;
    // Absence **is** « non surchargée ». An override of `0` is still an override, so the test is
    // `!== undefined` rather than truthiness.
    if (overrides?.MBF !== undefined) out.mbf = daN(overrides.MBF);
    if (overrides?.EA !== undefined) out.ea = daN(overrides.EA);
    if (overrides?.mu !== undefined) out.mu = overrides.mu;
  } else {
    out.fam = "tx";
    // `mu` is inserted **before** `cls`/`mbl`, which is its one slot in {@link CANONICAL_KEYS}: it
    // is the same key in both families, so it cannot also sit in the textile group. Insertion order
    // *is* the emitted query string, and {@link canonicalLink} re-inserts in `CANONICAL_KEYS`
    // order — emitting `mu` last here made « Copier le lien » and the address bar disagree as
    // strings for a textile line, which is exactly the diffability § 7 buys with a canonical order.
    out.mu = material.mu;
    out.cls =
      material.ropeClass === "pa-en1891a"
        ? "pa"
        : material.ropeClass === "polyester"
          ? "pes"
          : "hmpe";
    out.mbl = daN(material.MBL);
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
 * A canonical bag as the link the address bar holds — `/` plus the router's own
 * `defaultStringifySearch`, so the string asserted in a test is the string the router emits.
 *
 * Keys are re-inserted in canonical order first: a bag built by hand, or by spreading a partial
 * one, would otherwise emit in *its* insertion order and two links to the same Scenario would stop
 * being string-identical.
 *
 * Iterating {@link CANONICAL_KEYS} keeps amendment E's `refused` marker out of **this** writer —
 * it is not a key of § 7's table, so the rewrite cannot emit it. That is not the whole invariant,
 * though, and it was once mistaken for it: the router builds hrefs of its own from
 * `{ ...incoming, ...validated }` and would emit the marker there. {@link
 * keepRefusalOutOfTheAddressBar} covers that path, and a refused link is never rewritten anyway
 * ({@link completeFromDefaults} short-circuits).
 */
export function canonicalLink(search: ValidatedSearch): string {
  const ordered: Record<string, unknown> = {};
  for (const key of CANONICAL_KEYS) {
    const value = search[key];
    if (value !== undefined) ordered[key] = value;
  }
  return `/${defaultStringifySearch(ordered)}`;
}

/**
 * § 9's shipped Scenario as a bag — the completion source, derived from the constant rather than
 * transcribed beside it, so a defaults change cannot leave a second copy behind.
 */
const FIRST_RUN_SEARCH: ValidatedSearch = scenarioToSearch(FIRST_RUN_SCENARIO);

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
