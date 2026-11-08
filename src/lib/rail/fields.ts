/**
 * The Rail's **field table and tier one** — « v1 build spec » § 3 (*The field table*, *Numeric
 * input — the widget is a correctness question*, *Display precision per quantity*) and § 7 (*Deux
 * états par champ — et un troisième message que le widget élu crée*), under
 * [amendment D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
 *
 * **Form validators own exactly tier one — what needs no physics.** That boundary is amendment D's
 * and it is not negotiable: the three gates are cross-field predicates over the derived Scenario
 * (`./gates.ts`), and §5.4's chord bound stays in the engine, where « Tension impossible » is an
 * engine refusal the UI surfaces rather than a field error. Nothing in this module derives a
 * physical quantity, and nothing in it reads `@/lib/sim` for a formula.
 *
 * Rules this module exists to keep:
 *
 * - **One declaration per quantity, two consumers.** {@link FIELDS} is read by the valibot schema
 *   TanStack Form validates with ({@link fieldSchema}) *and* by the gates, which attribute the same
 *   failure to a gate through the culprit table. A second copy of « `L > 0` » is the « one rule
 *   living in two places » failure § 7 exists to prevent.
 * - **Two states per field, and a third the elected widget creates.** The empty state is
 *   **neutral, lowercase, no icon** — « valeur requise »; the committed-invalid state is **⛔ and
 *   blocking**. Calling both « erreur » would make ordinary typing feel like a fault. And because
 *   every numeric field is `<input type="text" inputMode="decimal">`, **unparseable text is a
 *   reachable state**: « nombre illisible » exists, and it **quotes the raw text back**, because
 *   what the user typed is the evidence. `type="number"` hid that state by reporting an *empty*
 *   value — a rigger who types « 6,5 » lost the field with no message.
 * - **No message asserts an act** (invariant 2). Every state here is reachable on the **first frame
 *   of a link**, so « vous avez saisi » / « maintenant » are lies half the time. Messages state a
 *   property of the world; only *button* labels describe an effect.
 * - **The offending value is always echoed**, at the field's own display precision and in its own
 *   unit, because on an arrived link the user has not seen it yet.
 * - **No range check that needs a solve.** `L ∉ [50, 2000]`, `|h| > L`, `hauteur > 30` and
 *   `d ∉ [6, 26]` are **warnings** — non-blocking, needing no physics — and they live here beside
 *   the hard rule they are so easily confused with. The result-level ladder (`> 30 % MBL`,
 *   `flèche < 3 %`, `k` hors bande, the verdict) needs a solve and is § 6's, not this module's.
 * - **Values are canonical on the way out.** § 3's « SI internally, always »: a field displays in
 *   the selected force unit and {@link commitField} returns **newtons**, rounded to the row's
 *   display precision so that the value in state *is* the value on screen — § 3's prefill rule,
 *   which is why the precision table is state and not cosmetics.
 */

import * as v from "valibot";

import type { QuantityId } from "@/lib/format/quantity.ts";
import type { ForceUnit, TightnessDraft } from "@/lib/scenario/types.ts";
import type { SteelSpec, TextileSpec } from "@/lib/sim";
import type { LabelId } from "@/lib/vocabulary/labels.ts";

import { formatQuantity, formatValue, fromDisplay, roundToDisplay } from "@/lib/format/quantity.ts";
import { clampX } from "@/lib/scenario/geometry.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

/**
 * § 7's three gates. Declared here rather than in `./gates.ts` because every field names the gate
 * it belongs to, and « gates go in with the fields, not as a later pass ».
 */
export type GateId = "solve" | "clearance" | "verdict";

/** Every control of the Rail's input half that a check can be attributed to. */
export type FieldId =
  | "usage"
  | "regime"
  | "L"
  | "h"
  | "zA"
  | "zB"
  | "sa"
  | "sb"
  | "family"
  | "d"
  | "R0"
  | "cst"
  | "mbfOverride"
  | "eaOverride"
  | "muOverride"
  | "cls"
  | "MBL"
  | "muTextile"
  | "dTextile"
  | "k"
  | "ta"
  | "tb"
  | "etaA"
  | "etaB"
  | "D_target"
  | "H_target"
  | "L0"
  | "vRatio"
  | "mp"
  | "hRider"
  | "hClearMin"
  | "DAF"
  | "xD";

/**
 * A field's tier-one hard rule — the whole of it. Three shapes, because § 7's message column has
 * three: a sign rule, « the number must be readable at all », and the station's in-trace bound,
 * which needs the file's extent and therefore states its own copy.
 */
type HardRule =
  /** `> 0`. `sentence` is § 7's own wording of the rule, stated as a property of the world. */
  | { readonly kind: "positive"; readonly sentence: string }
  /** `≥ 0` — « une hauteur négative n'existe pas ». */
  | { readonly kind: "non-negative"; readonly sentence: string }
  /** Finite and nothing more: the only committed-invalid state is « nombre illisible ». */
  | { readonly kind: "finite" }
  /** « dans le tracé » — the bound is the file's, so the message is built from the extent. */
  | { readonly kind: "in-trace" };

/** § 3's non-blocking warning band, and the copy it renders. Needs no physics and no solve. */
type WarningRule =
  /** Outside `[min, max]` in the field's display unit. */
  | { readonly kind: "band"; readonly min: number; readonly max: number; readonly copy: string }
  /** `|h| > L` — the > 45° line, the one warning that reads another field. */
  | { readonly kind: "steeper-than-45"; readonly copy: string }
  /** Above a ceiling. */
  | { readonly kind: "above"; readonly max: number; readonly copy: string };

/** One row of § 3's field table, plus the two things § 7 adds: a gate and an error label. */
export type FieldSpec = {
  readonly id: FieldId;
  /** § 3's « Champ (FR) » — what the control is labelled. */
  readonly label: string;
  /**
   * The name § 7's ⛔ template prints. It differs from {@link label} for exactly three fields —
   * « Masse » is « Masse du passager » in a message, and the two `k` spellings likewise — because
   * a label sits under a group heading that supplies the context a message has to carry itself.
   */
  readonly errorLabel: string;
  /** § 3's display-precision row: the unit, the decimals and the comma. `null` for the pickers. */
  readonly quantity: QuantityId | null;
  /** Tier one. `null` for a select that ships with a value and cannot be emptied. */
  readonly rule: HardRule | null;
  /** Blank is a legitimate value — « absent », not « vide et requis » — so no empty state. */
  readonly optional?: true;
  /** § 3's warning column — non-blocking, and never a reason to withhold a number. */
  readonly warning: WarningRule | null;
  /** Which of § 7's three gates this field's failure breaches. `null` for `x_D`, which is in none. */
  readonly gate: GateId | null;
};

/** « une longueur strictement positive est requise » and its four siblings, written once each. */
const POSITIVE_LENGTH = "une longueur strictement positive est requise";
const POSITIVE_HEIGHT = "une hauteur strictement positive est requise";
const POSITIVE_VALUE = "une valeur strictement positive est requise";

/** A per-anchor field's label: the registry's heading, then which anchor. */
function withEnd(id: LabelId, end: "A" | "B"): string {
  return `${heading(id, "exact")} ${end}`;
}

/**
 * § 3's field table, in **rail order** — the order the Rail renders and the order § 7's culprit
 * table means by « the first culpable field ».
 *
 * Three rows are § 3's `Valeurs déduites` and appear here because **an overridden derived value is
 * its own culprit**: override turns a read-out into an editable field, so attribution collapses to
 * identity and the field needs a label, a precision row and a rule like any other.
 */
export const FIELDS = {
  usage: {
    id: "usage",
    label: heading("installation", "exact"),
    errorLabel: heading("installation", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "solve",
  },
  regime: {
    id: "regime",
    label: heading("regime", "exact"),
    errorLabel: heading("regime", "exact"),
    quantity: null,
    // « — choisir — » **is** the absence, and absence is what the Verdict Gate refuses. It is not
    // a hard rule on a typed value, so it has no `rule`: `./gates.ts` reads `regime === null`.
    rule: null,
    warning: null,
    gate: "verdict",
  },
  L: {
    id: "L",
    label: heading("span", "exact"),
    errorLabel: heading("span", "exact"),
    quantity: "L",
    rule: { kind: "positive", sentence: POSITIVE_LENGTH },
    warning: {
      kind: "band",
      min: 50,
      max: 2000,
      copy: "hors du domaine de validité (50 – 2000 m)",
    },
    gate: "solve",
  },
  h: {
    id: "h",
    label: heading("elevationDifference", "exact"),
    errorLabel: heading("elevationDifference", "exact"),
    quantity: "h",
    // `h < 0` **means** B below A: a downhill line has a negative dénivelé, so the only committed
    // invalid state here is text that is not a number at all.
    rule: { kind: "finite" },
    warning: { kind: "steeper-than-45", copy: "pente supérieure à 45° (|dénivelé| > portée)" },
    gate: "solve",
  },
  zA: {
    id: "zA",
    label: withEnd("anchorHeight", "A"),
    errorLabel: withEnd("anchorHeight", "A"),
    quantity: "anchorHeight",
    rule: { kind: "non-negative", sentence: "une hauteur négative n'existe pas" },
    warning: { kind: "above", max: 30, copy: "hauteur d'ancrage supérieure à 30 m" },
    gate: "clearance",
  },
  zB: {
    id: "zB",
    label: withEnd("anchorHeight", "B"),
    errorLabel: withEnd("anchorHeight", "B"),
    quantity: "anchorHeight",
    rule: { kind: "non-negative", sentence: "une hauteur négative n'existe pas" },
    warning: { kind: "above", max: 30, copy: "hauteur d'ancrage supérieure à 30 m" },
    gate: "clearance",
  },
  sa: {
    id: "sa",
    label: withEnd("distance", "A"),
    errorLabel: withEnd("distance", "A"),
    quantity: "station",
    rule: { kind: "in-trace" },
    warning: null,
    // `L` and `h` are **derived** from the stations, so a station failure takes the whole span
    // down — § 7's culprit table, row « `L` importé → Station A, Station B ».
    gate: "solve",
  },
  sb: {
    id: "sb",
    label: withEnd("distance", "B"),
    errorLabel: withEnd("distance", "B"),
    quantity: "station",
    rule: { kind: "in-trace" },
    warning: null,
    gate: "solve",
  },
  family: {
    id: "family",
    label: heading("lineFamily", "exact"),
    errorLabel: heading("lineFamily", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "solve",
  },
  d: {
    id: "d",
    label: heading("diameter", "exact"),
    errorLabel: heading("diameter", "exact"),
    quantity: "d",
    rule: { kind: "positive", sentence: "un diamètre strictement positif est requis" },
    // `[CONVENTION]` — **ours, not §13.1's**: the attested examples sit at 6 mm, the paywalled
    // EN 12385-4 tables run 10–20 mm, and 26 mm is where zip-line practice stops.
    warning: {
      kind: "band",
      min: 6,
      max: 26,
      copy: "diamètre hors de la bande usuelle (6 – 26 mm) [CONVENTION]",
    },
    gate: "solve",
  },
  R0: {
    id: "R0",
    label: heading("grade", "exact"),
    errorLabel: heading("grade", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "solve",
  },
  cst: {
    id: "cst",
    label: heading("construction", "exact"),
    errorLabel: heading("construction", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "solve",
  },
  mbfOverride: {
    id: "mbfOverride",
    label: heading("breakingLoad", "exact"),
    errorLabel: heading("breakingLoad", "exact"),
    quantity: "MBF",
    rule: { kind: "positive", sentence: "une charge strictement positive est requise" },
    warning: null,
    gate: "solve",
  },
  eaOverride: {
    id: "eaOverride",
    label: heading("axialStiffness", "exact"),
    errorLabel: heading("axialStiffness", "exact"),
    quantity: "EA",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    warning: null,
    gate: "solve",
  },
  muOverride: {
    id: "muOverride",
    label: heading("linearMass", "exact"),
    errorLabel: heading("linearMass", "exact"),
    quantity: "mu",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    warning: null,
    gate: "solve",
  },
  cls: {
    id: "cls",
    label: heading("ropeClass", "exact"),
    errorLabel: heading("ropeClass", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "solve",
  },
  MBL: {
    id: "MBL",
    label: heading("breakingLoad", "exact"),
    errorLabel: heading("breakingLoad", "exact"),
    quantity: "MBL",
    rule: { kind: "positive", sentence: "une charge strictement positive est requise" },
    warning: null,
    gate: "solve",
  },
  muTextile: {
    id: "muTextile",
    label: heading("linearMass", "exact"),
    errorLabel: heading("linearMass", "exact"),
    quantity: "mu",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    warning: null,
    gate: "solve",
  },
  dTextile: {
    id: "dTextile",
    label: heading("diameter", "exact"),
    errorLabel: heading("diameter", "exact"),
    quantity: "d",
    rule: { kind: "positive", sentence: "un diamètre strictement positif est requis" },
    optional: true,
    warning: null,
    // Solve although no formula reads `d`: a zero or negative diameter from a link is a malformed
    // spec, and the link carries `d` onward for the tensioning use.
    gate: "solve",
  },
  k: {
    id: "k",
    label: heading("relativeStiffness", "exact"),
    errorLabel: "Raideur relative k",
    quantity: "k",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    // §13.2 indexes `k` by working load and **a zip line never enters that band** — so the honesty
    // mechanism is a result-level warning on the computed `% MBL` (§ 6), ambient rather than an
    // alarm, and the field carries the « non confirmé » chip instead of a threshold.
    warning: null,
    gate: "solve",
  },
  ta: {
    id: "ta",
    label: withEnd("termination", "A"),
    errorLabel: withEnd("termination", "A"),
    quantity: null,
    // No tier-one rule: the picker disables what the line cannot use, and an end that arrives
    // anyway is a scenario-level Verdict error in `./gates.ts` (ADR-0001).
    rule: null,
    warning: null,
    gate: "verdict",
  },
  tb: {
    id: "tb",
    label: withEnd("termination", "B"),
    errorLabel: withEnd("termination", "B"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "verdict",
  },
  etaA: {
    id: "etaA",
    label: `${heading("efficiency", "exact")} η`,
    errorLabel: `${heading("efficiency", "exact")} de ${label("termination", "exact")} A`,
    quantity: "eta",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    warning: null,
    gate: "verdict",
  },
  etaB: {
    id: "etaB",
    label: `${heading("efficiency", "exact")} η`,
    errorLabel: `${heading("efficiency", "exact")} de ${label("termination", "exact")} B`,
    quantity: "eta",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    warning: null,
    gate: "verdict",
  },
  D_target: {
    id: "D_target",
    label: heading("sag", "exact"),
    errorLabel: heading("sag", "exact"),
    quantity: "D_target",
    rule: { kind: "positive", sentence: "une flèche strictement positive est requise" },
    warning: null,
    gate: "solve",
  },
  H_target: {
    id: "H_target",
    label: heading("pretension", "exact"),
    errorLabel: heading("pretension", "exact"),
    quantity: "H_target",
    rule: { kind: "positive", sentence: "une tension strictement positive est requise" },
    warning: null,
    gate: "solve",
  },
  L0: {
    id: "L0",
    label: heading("unstretchedLength", "exact"),
    errorLabel: heading("unstretchedLength", "exact"),
    quantity: "L0",
    rule: { kind: "positive", sentence: POSITIVE_LENGTH },
    warning: null,
    gate: "solve",
  },
  vRatio: {
    id: "vRatio",
    label: heading("vRatio", "exact"),
    errorLabel: heading("vRatio", "exact"),
    quantity: "vRatio",
    rule: { kind: "positive", sentence: "un rapport P / H strictement positif est requis" },
    warning: null,
    gate: "solve",
  },
  mp: {
    id: "mp",
    label: "Masse",
    errorLabel: heading("passengerMass", "exact"),
    quantity: "m_p",
    rule: { kind: "positive", sentence: "une masse strictement positive est requise" },
    warning: null,
    // The magnitude of the single `PointLoad`: with no rider there is no loaded `SpanState`.
    gate: "solve",
  },
  hRider: {
    id: "hRider",
    label: heading("riderEnvelope", "exact"),
    errorLabel: heading("riderEnvelope", "exact"),
    quantity: "h_rider",
    rule: { kind: "positive", sentence: POSITIVE_HEIGHT },
    warning: null,
    // It enters only `evaluateClearance`'s envelope.
    gate: "clearance",
  },
  hClearMin: {
    id: "hClearMin",
    label: heading("requiredClearance", "exact"),
    errorLabel: heading("requiredClearance", "exact"),
    quantity: "h_clear_min",
    // `0` is « aucun seuil », a legitimate value; only a negative garde is nonsense.
    rule: { kind: "non-negative", sentence: "une garde négative n'existe pas" },
    warning: null,
    // It qualifies the clearance read-out and nothing else — never the solve, never the verdict.
    gate: "clearance",
  },
  DAF: {
    id: "DAF",
    label: heading("startMultiplier", "exact"),
    errorLabel: heading("startMultiplier", "exact"),
    quantity: "DAF",
    rule: { kind: "positive", sentence: POSITIVE_VALUE },
    warning: null,
    // It enters only `T_vide + DAF·(T_chargé − T_vide)` and does not touch clearance.
    gate: "verdict",
  },
  xD: {
    id: "xD",
    label: heading("riderPosition", "exact"),
    errorLabel: heading("riderPosition", "exact"),
    quantity: "x_D",
    // **It clamps on every path** — typed input, a geometry change, a link arrival — and says so
    // with a transient note. A clamp produces no error state, so `x_D` sits in **no gate**.
    rule: null,
    warning: null,
    gate: null,
  },
} as const satisfies Record<FieldId, FieldSpec>;

/** Rail order — what « the first culpable field in table order » means. */
/** Whether a blank is « absent » for this field (read off {@link FieldSpec.optional}). */
export function isOptionalField(id: FieldId): id is "dTextile" {
  return (FIELDS[id] as FieldSpec).optional === true;
}

export const FIELD_ORDER = Object.keys(FIELDS) as readonly FieldId[];

/**
 * The field each Tightness Driver edits — the one place a driver is mapped to its field, so the
 * segmented control, the gates, the refusals and the link all agree on it.
 */
export const TIGHTNESS_FIELD = {
  sag: "D_target",
  tension: "H_target",
  length: "L0",
  ratio: "vRatio",
} as const satisfies Record<TightnessDraft["mode"], FieldId>;

/** A field a Tightness Driver edits. */
export type TightnessFieldId = (typeof TIGHTNESS_FIELD)[TightnessDraft["mode"]];

/**
 * The three fields of the `Passager` group land in **three different gates**, which is itself the
 * evidence the split was right. Asserted rather than commented, because a later « tidy » that
 * grouped the gate by rail section would silently undo § 7's central finding.
 */
export function gateOf(id: FieldId, mode: "manual" | "trace"): GateId | null {
  // In imported mode `h = (z(d_B) + hauteur_B) − (z(d_A) + hauteur_A)`, so the anchor heights are
  // a **Solve** input there — § 7's culprit table, row « `h` importé ». In manual mode they feed
  // the Terrain only and never `solveSpan`, which is the Clearance Gate's own row.
  if (mode === "trace" && (id === "zA" || id === "zB")) return "solve";
  return FIELDS[id].gate;
}

/** What a field's text can be wrong about. Three kinds, because § 7's field column has three. */
export type FieldIssueKind =
  /** Empty and required — **neutral, lowercase, no icon**. Not an error; not yet a value. */
  | "empty"
  /** The elected widget's own state: text that is not a number. Quotes the raw text back. */
  | "unreadable"
  /** A committed value the hard rule refuses — **⛔ and blocking**. */
  | "invalid";

/** One standing failure on one field: what it is, and the exact string the control renders. */
export type FieldIssue = {
  readonly field: FieldId;
  readonly kind: FieldIssueKind;
  readonly message: string;
};

/** What tier one needs to know beyond the raw text. Never physics, never a solve. */
export type FieldContext = {
  /** The global force selector — the unit the field displays in, so the unit the echo prints. */
  readonly unit?: ForceUnit;
  /** `Classe de corde`, for the one empty message that carries a reason instead of a hole. */
  readonly ropeClass?: TextileSpec["ropeClass"];
  /** The imported profile's `Distance` extent, m, in file coordinates — the stations' bound. */
  readonly extent?: { readonly min: number; readonly max: number };
  /** `Portée`, m — the only warning that reads a second field (`|h| > L`). */
  readonly L?: number;
};

/**
 * § 3's *Numeric input*: `,` **and** `.` are both accepted, because a keypad may offer either, and
 * anything else is not a number. Deliberately stricter than `Number()`, which reads `""` as 0,
 * `" "` as 0 and `"0x10"` as 16 — three silent wrong answers in a tool whose output is a margin.
 *
 * @returns the number, or `null` for « nombre illisible ». An infinity is unreadable too: nothing
 *   in this app has a value the field cannot show back.
 */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim();
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/**
 * What the View Strip's `x` field commits for the text in it: `null` when the text is not a number
 * (the field reverts to the last committed position and says nothing), otherwise the position
 * clamped into `[0, L]` and whether the clamp moved it.
 */
export function riderPositionEntry(
  raw: string,
  L: number,
): { readonly xD: number; readonly clamped: boolean } | null {
  const typed = parseDecimal(raw);
  if (typed === null) return null;
  const xD = clampX(typed, L);
  return { xD, clamped: xD !== typed };
}

/**
 * The value as the message echoes it: at the field's own display precision, in its own unit, from
 * a value **in the field's display unit** (which is what the user typed).
 *
 * The sign is § 3's typographic minus rather than the field's hyphen: a message is prose and is
 * never typed back into a keypad, where {@link formatValue}'s plain `-` has to survive a re-type.
 */
function echo(id: FieldId, shown: number, unit: ForceUnit): string {
  const { quantity } = FIELDS[id];
  if (quantity === null) return String(shown);
  return formatQuantity(quantity, fromDisplay(quantity, shown, unit), unit).replace("-", "−");
}

/** « valeur requise » — neutral, lowercase, unpunctuated. Ticket 11's rendering governs. */
export const REQUIRED_MESSAGE = "valeur requise";

/**
 * « Portée » → « portée », and **« MBL » stays « MBL »**: a label that is an acronym or a symbol is
 * not a sentence's first word being capitalised, and lowercasing it would print « mBL ».
 *
 * It lives beside the labels rather than beside either of its two callers — the banner's cause
 * clause and the « clé ignorée » strip — because a second copy is a second answer for « MBL ».
 */
export function lowerFirst(label: string): string {
  const [first, second] = [label[0] ?? "", label[1] ?? ""];
  if (first !== first.toLocaleUpperCase("fr") || second !== second.toLocaleLowerCase("fr")) {
    return label;
  }
  return first.toLocaleLowerCase("fr") + label.slice(1);
}

/** The breaking strength's symbol: `MBF` for a steel cable, `MBL` for a textile rope. */
export type StrengthSymbol = "MBF" | "MBL";

/** What the strength a percentage or a formula is read against is called on this family. */
export function strengthSymbol(family: "steel" | "textile"): StrengthSymbol {
  return family === "steel" ? "MBF" : "MBL";
}

/**
 * `Classe de corde`'s entries, in the Rail's order. The link strip prints them mid-sentence
 * through {@link lowerFirst}, so « Polyamide » reads « polyamide » there and « HMPE » stays.
 */
export const ROPE_CLASS_LABEL = {
  hmpe: "HMPE 12 torons",
  "pa-en1891a": "Polyamide EN 1891 type A",
  polyester: "Polyester semi-statique",
} as const satisfies Record<TextileSpec["ropeClass"], string>;

/** `Construction`'s two entries: « 6×19 » and « 6×19 métallique », with no âme and no gaine. */
export const CONSTRUCTION_LABEL = {
  "fibre-core": label("constructionFibreCore", "exact"),
  iwrc: label("constructionIwrc", "exact"),
} as const satisfies Record<SteelSpec["construction"], string>;

/** One picker entry. */
export type PickerOption<Id extends string> = { readonly value: Id; readonly label: string };

export const ROPE_CLASS_OPTIONS = pickerOptions(ROPE_CLASS_LABEL);

export const CONSTRUCTION_OPTIONS = pickerOptions(CONSTRUCTION_LABEL);

/** A label table as a picker's entries, in the table's order. */
function pickerOptions<Id extends string>(
  labels: Readonly<Record<Id, string>>,
): readonly PickerOption<Id>[] {
  return (Object.keys(labels) as Id[]).map((value) => ({ value, label: labels[value] }));
}

/**
 * The empty state's copy. One field's differs: for polyester the blank is **not an omission** —
 * §13.2 places the class only « between the two » and R1's `k = 25–35` is refuted, so nobody
 * published the number and the message says so rather than asking for a value that does not exist.
 */
export function emptyMessage(id: FieldId, context: FieldContext = {}): string {
  if (id === "k" && context.ropeClass === "polyester") {
    return `${REQUIRED_MESSAGE} — aucune valeur publiée pour le polyester`;
  }
  return REQUIRED_MESSAGE;
}

/** § 7's fixed template: `⛔ <Champ> — <la règle, énoncée>. Valeur : <v>.` */
function blocking(id: FieldId, rule: string, value: string): string {
  return `⛔ ${FIELDS[id].errorLabel} — ${rule}. Valeur : ${value}.`;
}

/**
 * « nombre illisible », and it **quotes the raw text back** — what the user typed is the evidence,
 * and the state exists at all because § 3 elected `inputMode="decimal"` over `type="number"`.
 */
export function unreadableMessage(id: FieldId, raw: string): string {
  return `⛔ ${FIELDS[id].errorLabel} — nombre illisible. Saisie : « ${raw.trim()} ».`;
}

/**
 * Tier one on one field's raw text. **This is the whole of what a form validator may decide**:
 * emptiness, readability, a sign rule, and the station's in-trace bound, which is the file's own
 * extent and no physics at all.
 *
 * @returns the standing issue, or `null` when the text is a value tier one accepts. An
 *   out-of-range-but-representable value is **valid here** and lights up as a warning or as an
 *   engine refusal — never as a second copy of a rule that lives downstream.
 */
export function checkField(
  id: FieldId,
  raw: string,
  context: FieldContext = {},
): FieldIssue | null {
  const spec: FieldSpec = FIELDS[id];
  if (spec.rule === null) return null;

  if (raw.trim() === "") {
    if (spec.optional === true) return null;
    return { field: id, kind: "empty", message: emptyMessage(id, context) };
  }

  const shown = parseDecimal(raw);
  if (shown === null) {
    return { field: id, kind: "unreadable", message: unreadableMessage(id, raw) };
  }

  const unit = context.unit ?? "daN";
  switch (spec.rule.kind) {
    case "finite":
      return null;
    case "positive":
      if (shown > 0) return null;
      return {
        field: id,
        kind: "invalid",
        message: blocking(id, spec.rule.sentence, echo(id, shown, unit)),
      };
    case "non-negative":
      if (shown >= 0) return null;
      return {
        field: id,
        kind: "invalid",
        message: blocking(id, spec.rule.sentence, echo(id, shown, unit)),
      };
    case "in-trace": {
      const extent = context.extent;
      if (extent === undefined || (shown >= extent.min && shown <= extent.max)) return null;
      const from = formatValue("station", extent.min);
      const to = formatValue("station", extent.max);
      return {
        field: id,
        kind: "invalid",
        // This row's message names the bound instead of the field, because the bound is the file's
        // and the two distances share one rule — § 7 writes it once, for « Distance A / B ».
        message: `⛔ Distance hors du profil (${from} – ${to} m). Valeur : ${echo(id, shown, unit)}.`,
      };
    }
  }
}

/**
 * § 3's warning column — **non-blocking, needs no solve, and never withholds a number**. A warning
 * is not a lesser error: it is the app saying « this is outside what the references cover », which
 * is a different claim from « this cannot be computed ».
 *
 * @returns the copy, or `null`. The `⚠` glyph is the renderer's; the string is the statement.
 */
export function warningFor(id: FieldId, value: number, context: FieldContext = {}): string | null {
  const { warning } = FIELDS[id];
  if (warning === null || !Number.isFinite(value)) return null;
  switch (warning.kind) {
    case "band":
      return value < warning.min || value > warning.max ? warning.copy : null;
    case "above":
      return value > warning.max ? warning.copy : null;
    case "steeper-than-45": {
      const L = context.L;
      if (L === undefined || !(L > 0)) return null;
      return Math.abs(value) > L ? warning.copy : null;
    }
  }
}

/**
 * Display text → **canonical** state, § 3's prefill rule applied at the one place a user writes:
 * the value that enters state is the value the field shows, never the float behind it. 201,84
 * enters state, 201,8412773 never does — which is what makes the URL exact and short by
 * construction and the stale-Override badge comparable at all.
 *
 * @returns newtons for every force (including `EA`), metres, millimetres, kilograms — or `null`
 *   when the text is not a number.
 */
export function commitField(id: FieldId, raw: string, context: FieldContext = {}): number | null {
  const shown = parseDecimal(raw);
  if (shown === null) return null;
  const { quantity } = FIELDS[id];
  if (quantity === null) return shown;
  const unit = context.unit ?? "daN";
  return roundToDisplay(quantity, fromDisplay(quantity, shown, unit), unit);
}

/** Canonical state → the text the field shows. The inverse of {@link commitField}, and padded. */
export function displayField(id: FieldId, value: number, unit: ForceUnit = "daN"): string {
  const { quantity } = FIELDS[id];
  if (quantity === null) return String(value);
  return formatValue(quantity, value, unit);
}

/**
 * The field's tier one as a **Standard Schema**, which is what TanStack Form validates with.
 *
 * `v.rawCheck` rather than `v.check`, so {@link checkField} runs **once** and its message travels
 * verbatim: valibot's own messages never reach the UI — the French strings are the spec's. And
 * **no `transform`**: the field's value stays the string the user is typing, because the
 * string→number step is a *commit*, not a parse the validator performs behind their back.
 */
export function fieldSchema(id: FieldId, context: FieldContext = {}) {
  return v.pipe(
    v.string(),
    v.rawCheck<string>(({ dataset, addIssue }) => {
      if (!dataset.typed) return;
      const issue = checkField(id, dataset.value, context);
      if (issue !== null) addIssue({ message: issue.message });
    }),
  );
}
