/**
 * **Le bandeau des clés ignorées** — « v1 build spec » § 8 (*Les surfaces du lien*), written as a
 * pure function of what the link did on arrival so the whole of its copy is a `node` test
 * (amendment A).
 *
 * It is a dismissible **full-width strip above rail and charts**, and deliberately **not** a banner
 * occupant: it is about the **link** and not the line, and it must never be able to hide a verdict
 * (invariant 4). Three sentences, each of which answers a different question:
 *
 * ```
 * Une partie du lien a été ignorée : clé inconnue « xy » ; « za » n'était pas
 * un nombre (hauteur d'ancrage A ignorée).
 * Champs absents du lien, complétés depuis le scénario par défaut :
 * masse du passager 120 kg · enveloppe passager 2,1 m · coefficient dynamique 1,2.
 * L'adresse a été corrigée pour indiquer les valeurs utilisées.          [ ✕ ]
 * ```
 *
 * Rules this module exists to keep:
 *
 * - **Each dropped key says *which* kind it was.** « ignoré » alone cannot distinguish the sender's
 *   typo from a value we could not read, and the two are different faults with different repairs.
 * - **The completion sentence names the values, not just the fields.** That is the whole answer to
 *   the fourth-meaning-of-absence objection: the recipient can read every number they got, and tell
 *   the sender's numbers from ours.
 * - **A refused link produces no strip**, and neither does a bare `/`: a refusal is whole-link and
 *   has its own surface, and « restore the Session » is the defined normal case — a notice for it
 *   is noise.
 * - **`fl` + `lo` is gone from the copy.** Two tightness drivers refuse the link whole (§ 8), so
 *   that case no longer reaches the strip at all.
 * - **The gender of every field is carried, not guessed.** « hauteur d'ancrage A ignorée » against
 *   « dénivelé ignoré » is French agreement, and a single spelling would be wrong half the time.
 */

import type { LinkArrival } from "@/lib/app/state.ts";
import type { QuantityId } from "@/lib/format/quantity.ts";
import type { FieldId } from "@/lib/rail/fields.ts";
import type { ForceUnit } from "@/lib/scenario/types.ts";
import type { DroppedKey, SearchKey, TerminationToken, ValidatedSearch } from "@/lib/url/schema.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import {
  CONSTRUCTION_LABEL,
  FIELDS,
  lowerFirst,
  ROPE_CLASS_LABEL,
  TENSIONING_DEVICE_LABEL,
  TENSIONING_SIDE_LABEL,
} from "@/lib/rail/fields.ts";
import { TERMINATIONS } from "@/lib/sim";
import {
  CONSTRUCTION_TOKEN_BY_ID,
  newtonsFromDaN,
  ROPE_CLASS_TOKEN_BY_ID,
  TENSIONING_DEVICE_TOKEN_BY_ID,
  TENSIONING_SIDE_TOKEN_BY_ID,
  terminationIdFromToken,
} from "@/lib/url/scenario.ts";

/** The three sentences, each `null` when this arrival has nothing to say with it. */
export type LinkStrip = {
  /** « Une partie du lien a été ignorée : … » */
  readonly ignored: string | null;
  /** « Champs absents du lien, complétés depuis le scénario par défaut : … » */
  readonly completed: string | null;
  /** « L'adresse a été corrigée pour indiquer les valeurs utilisées. » */
  readonly rewritten: string | null;
};

/** § 8's third sentence, fixed. It states the rewrite; it never asserts an act of the user's. */
const REWRITTEN = "L'adresse a été corrigée pour indiquer les valeurs utilisées.";

/**
 * What a URL key is, in French. Most rows borrow § 3's own `errorLabel`, so the strip and the ⛔
 * messages cannot drift apart; the handful with no field of their own carry their label here.
 *
 * `genre` is French agreement for « ignoré(e) », and `daN` marks the keys § 7 serialises in
 * decanewtons — the URL's one unit convention, undone here so the value prints in the unit the
 * recipient's selector is on.
 */
type KeyRow = {
  readonly label: string;
  readonly genre: "m" | "f";
  /** § 3's display-precision row, or `null` for a token-valued key. */
  readonly quantity: QuantityId | null;
  /** Does the URL carry this force in daN? Then ×10 puts it back in the newtons the app holds. */
  readonly daN?: true;
};

/** A row borrowed from § 3's field table — one label, one precision row, no second copy. */
function fromField(id: FieldId, genre: "m" | "f", daN?: true): KeyRow {
  const { errorLabel, quantity } = FIELDS[id];
  return daN === undefined
    ? { label: errorLabel, genre, quantity }
    : { label: errorLabel, genre, quantity, daN };
}

/** Every key but `v`, so a new search key does not compile until the strip can name it. */
type StripKey = Exclude<SearchKey, "v">;

const KEYS: Record<StripKey, KeyRow> = {
  u: { label: "Unité de force", genre: "f", quantity: null },
  use: fromField("usage", "f"),
  reg: fromField("regime", "m"),
  L: fromField("L", "f"),
  h: fromField("h", "m"),
  za: fromField("zA", "f"),
  zb: fromField("zB", "f"),
  fl: fromField("D_target", "f"),
  te: fromField("H_target", "f", true),
  lo: fromField("L0", "f"),
  vr: fromField("vRatio", "m"),
  tp: fromField("T_target", "f", true),
  cp: fromField("tensioningSide", "m"),
  bp: fromField("carryingLines", "m"),
  mt: fromField("tensioningDevice", "f"),
  fam: fromField("family", "f"),
  d: fromField("d", "m"),
  r0: fromField("R0", "m"),
  cst: fromField("cst", "f"),
  mbf: fromField("mbfOverride", "f", true),
  ea: fromField("eaOverride", "f", true),
  mu: fromField("muOverride", "f"),
  cls: fromField("cls", "f"),
  mbl: fromField("MBL", "f", true),
  k: fromField("k", "f"),
  ta: fromField("ta", "f"),
  tb: fromField("tb", "f"),
  na: fromField("etaA", "m"),
  nb: fromField("etaB", "m"),
  mp: fromField("mp", "f"),
  hr: fromField("hRider", "m"),
  gm: fromField("hClearMin", "f"),
  daf: fromField("DAF", "f"),
  ws: fromField("windSpeed", "f"),
  wd: fromField("windDirection", "f"),
  x: fromField("xD", "f"),
  tr: { label: "Profil", genre: "m", quantity: null },
  // `v` is deliberately absent: it is the schema version, not a champ of the scenario, and naming
  // « version de schéma 1 » among the completed fields buries the numbers the sentence exists for.
  // An unrecognised `v` refuses the link whole, so it never reaches the first sentence either.
};

/** `dropped` carries arbitrary sender strings, and `v` has no row on purpose. */
function isStripKey(key: string): key is StripKey {
  return Object.hasOwn(KEYS, key);
}

/**
 * A token → label table, walked through the domain → token table the URL already owns. The labels
 * are the Rail's own, lowered because the strip prints them mid-sentence.
 */
function labelsByToken<Id extends string>(
  tokenById: Readonly<Record<Id, string>>,
  labelById: Readonly<Record<Id, string>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    (Object.keys(tokenById) as Id[]).map((id): [string, string] => [
      tokenById[id],
      lowerFirst(labelById[id]),
    ]),
  );
}

/** The French wording of the token-valued keys, so the strip never prints a wire token at a user. */
const TOKENS: Record<StripKey, Readonly<Record<string, string>> | null> = {
  u: { daN: "daN", kN: "kN", kgf: "kgf" },
  use: { perm: "permanente", tempo: "temporaire" },
  reg: null,
  L: null,
  h: null,
  za: null,
  zb: null,
  fl: null,
  te: null,
  lo: null,
  vr: null,
  tp: null,
  cp: labelsByToken(TENSIONING_SIDE_TOKEN_BY_ID, TENSIONING_SIDE_LABEL),
  bp: null,
  mt: labelsByToken(TENSIONING_DEVICE_TOKEN_BY_ID, TENSIONING_DEVICE_LABEL),
  fam: { ac: "acier", tx: "textile" },
  d: null,
  r0: null,
  cst: labelsByToken(CONSTRUCTION_TOKEN_BY_ID, CONSTRUCTION_LABEL),
  mbf: null,
  ea: null,
  mu: null,
  cls: labelsByToken(ROPE_CLASS_TOKEN_BY_ID, ROPE_CLASS_LABEL),
  mbl: null,
  k: null,
  ta: null,
  tb: null,
  na: null,
  nb: null,
  mp: null,
  hr: null,
  gm: null,
  daf: null,
  ws: null,
  wd: null,
  x: null,
  tr: null,
};

/**
 * § 8's strip, for one page load.
 *
 * @param link what the link did on arrival, from `initialAppState`. A refused link has an empty
 *   `dropped` and no completion, so it produces `null` here without a second refusal check.
 * @param unit the force selector the app opened on — the completed forces print in it, because a
 *   number the recipient cannot compare against their own screen answers nothing.
 * @returns the three sentences, or `null` when the link had nothing to report: a bare `/`, a
 *   Session restore, or a link that arrived complete and untouched.
 */
export function linkStrip(link: LinkArrival, unit: ForceUnit = "daN"): LinkStrip | null {
  const ignored = ignoredSentence(link.dropped);
  const completed = completedSentence(link.completed, link.rewrite, unit);
  if (ignored === null && completed === null) return null;
  return { ignored, completed, rewritten: link.rewrite === null ? null : REWRITTEN };
}

/**
 * « Une partie du lien a été ignorée : clé inconnue « xy » ; « za » n'était pas un nombre (…). »
 *
 * **Unknown keys first**, which is § 8's own sample order and reads best: the keys that cost the
 * recipient nothing are dispatched before the ones that displaced a field. `salvageSearch` builds
 * its list in canonical-key order because the *rewrite* needs that; the sentence is presentation,
 * and it is this module's.
 */
function ignoredSentence(dropped: readonly DroppedKey[]): string | null {
  if (dropped.length === 0) return null;
  const ordered = [
    ...dropped.filter((key) => key.reason === "clé-inconnue"),
    ...dropped.filter((key) => key.reason !== "clé-inconnue"),
  ];
  return `Une partie du lien a été ignorée : ${ordered.map(clause).join(" ; ")}.`;
}

/**
 * One dropped key's clause. The two salvageable kinds read differently on purpose — an unknown key
 * is the sender's typo and nothing of ours was displaced, while an unreadable value **did** displace
 * a field, so the clause names it.
 */
function clause({ key, reason }: DroppedKey): string {
  if (reason === "clé-inconnue") return `clé inconnue « ${key} »`;
  if (!isStripKey(key)) return `« ${key} » n'était pas une valeur exploitable`;
  const row = KEYS[key];
  const label = lowerFirst(row.label);
  // « n'était pas un nombre » is § 8's own wording and is true of every numeric key; a token-valued
  // key is not a number at all, and saying so of `?fam=zz` would be a lie in the one sentence whose
  // job is to tell the sender's typo apart from a value we could not read.
  const fault = row.quantity === null ? "n'était pas une valeur reconnue" : "n'était pas un nombre";
  return `« ${key} » ${fault} (${label} ignoré${row.genre === "f" ? "e" : ""})`;
}

/**
 * « Champs absents du lien, complétés depuis le scénario par défaut : masse du passager 120 kg · … »
 *
 * The values come from the **canonical bag** — the one the rewrite puts in the address bar — so the
 * sentence and the URL cannot disagree about the numbers the recipient got.
 */
function completedSentence(
  completed: readonly SearchKey[],
  rewrite: ValidatedSearch | null,
  unit: ForceUnit,
): string | null {
  if (completed.length === 0 || rewrite === null) return null;
  const named = completed.flatMap((key) => {
    const value = rewrite[key];
    if (!isStripKey(key) || value === undefined) return [];
    const row = KEYS[key];
    return [`${lowerFirst(row.label)} ${render(key, row, value, rewrite, unit)}`];
  });
  if (named.length === 0) return null;
  return `Champs absents du lien, complétés depuis le scénario par défaut : ${named.join(" · ")}.`;
}

/** One completed value, at § 3's display precision for a number and in French for a token. */
function render(
  key: StripKey,
  row: KeyRow,
  value: unknown,
  bag: ValidatedSearch,
  unit: ForceUnit,
): string {
  if (typeof value === "number" && row.quantity !== null) {
    // § 7 serialises every force in daN, ×10 exactly; `formatQuantity` takes the canonical newtons.
    return formatQuantity(row.quantity, row.daN === true ? newtonsFromDaN(value) : value, unit);
  }
  const token = String(value);
  if (key === "ta" || key === "tb") return terminationLabel(token, bag);
  return TOKENS[key]?.[token] ?? token;
}

/**
 * A termination token, as §10.3's own catalogue spells it — never the wire token, and never a
 * second spelling written here: `epissure` means two different pieces of hardware depending on the
 * family, and the picker the recipient is about to look at reads from this same table.
 */
function terminationLabel(token: string, bag: ValidatedSearch): string {
  const family = bag.fam === "tx" ? "textile" : "steel";
  return TERMINATIONS[terminationIdFromToken(token as TerminationToken, family)].label;
}
