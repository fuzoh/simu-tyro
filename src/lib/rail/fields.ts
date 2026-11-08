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
import type {
  CarryingLines,
  ForceUnit,
  TensioningDevice,
  TensioningSide,
  TightnessDraft,
  UseClass,
} from "@/lib/scenario/types.ts";
import type { RegimeId, SteelSpec, TextileSpec } from "@/lib/sim";
import type { LabelId, Register } from "@/lib/vocabulary/labels.ts";

import { formatQuantity, formatValue, fromDisplay, roundToDisplay } from "@/lib/format/quantity.ts";
import { clampX } from "@/lib/scenario/geometry.ts";
import { DYNAMICS, REGIMES } from "@/lib/sim";
import { heading, isHiddenTerm, label } from "@/lib/vocabulary/labels.ts";

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
  | "family"
  | "carryingLines"
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
  | "tensioningDevice"
  | "tensioningSide"
  | "D_target"
  | "T_target"
  | "H_target"
  | "L0"
  | "vRatio"
  | "mp"
  | "hRider"
  | "hClearMin"
  | "DAF"
  | "xD"
  | "windSpeed"
  | "windDirection"
  | "CdA"
  | "F0"
  | "kv"
  | "trolleyMu"
  | "rho"
  | "latA"
  | "lonA"
  | "latB"
  | "lonB";

/**
 * A field's tier-one hard rule — the whole of it. Two shapes, because § 7's message column has
 * two: a sign rule, and « the number must be readable at all ».
 */
type HardRule =
  /** `> 0`. `sentence` is § 7's own wording of the rule, stated as a property of the world. */
  | { readonly kind: "positive"; readonly sentence: string }
  /** `≥ 0` — « une hauteur négative n'existe pas ». */
  | { readonly kind: "non-negative"; readonly sentence: string }
  /** Finite and nothing more: the only committed-invalid state is « nombre illisible ». */
  | { readonly kind: "finite" };

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

/** « un frottement négatif n'existe pas » — the three trolley constants share it. */
const NO_NEGATIVE_FRICTION = "un frottement négatif n'existe pas";

/** A per-anchor field's label: the registry's heading, then which anchor. */
function withEnd(id: LabelId, end: "A" | "B"): string {
  return `${heading(id, "exact")} ${end}`;
}

/**
 * One coordinate of an anchor's Position: optional, unranged, in no gate. Typed field by field
 * because `NumericFieldId` and `GatedFieldId` are derived from the literal `quantity` and `gate`.
 */
function coordinateField<Id extends FieldId>(
  id: Id,
  term: "latitude" | "longitude",
  end: "A" | "B",
) {
  return {
    id,
    label: withEnd(term, end),
    errorLabel: withEnd(term, end),
    quantity: "coordinate",
    rule: { kind: "finite" },
    optional: true,
    warning: null,
    gate: null,
  } as const;
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

  family: {
    id: "family",
    label: heading("lineFamily", "exact"),
    errorLabel: heading("lineFamily", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    gate: "solve",
  },
  carryingLines: {
    id: "carryingLines",
    label: heading("carryingLines", "exact"),
    // « nombre de Brins porteurs ignoré » — the strip prints this name, and the count agrees.
    errorLabel: `Nombre de ${label("carryingLines", "exact")}`,
    quantity: null,
    rule: null,
    warning: null,
    // It sets the load each member is solved under.
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
  tensioningDevice: {
    id: "tensioningDevice",
    label: heading("tensioningDevice", "exact"),
    errorLabel: heading("tensioningDevice", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    // Descriptive: it crosses none of the three gates — see {@link TensioningDevice}.
    gate: null,
  },
  tensioningSide: {
    id: "tensioningSide",
    label: heading("tensioningSide", "exact"),
    errorLabel: heading("tensioningSide", "exact"),
    quantity: null,
    rule: null,
    warning: null,
    // It is where a prétension is read, so it moves `L₀` whenever the prétension drives.
    gate: "solve",
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
  T_target: {
    id: "T_target",
    label: heading("pretension", "exact"),
    errorLabel: heading("pretension", "exact"),
    quantity: "T_target",
    rule: { kind: "positive", sentence: "une tension strictement positive est requise" },
    warning: null,
    gate: "solve",
  },
  H_target: {
    id: "H_target",
    label: heading("horizontalTension", "exact"),
    errorLabel: heading("horizontalTension", "exact"),
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
  // The two Vent fields sit in no gate: only the ride (#89) and the Banane read them, so a bad one
  // must not take the statics or the Verdict down. Tier one still refuses the text, as typed.
  windSpeed: {
    id: "windSpeed",
    label: heading("windSpeed", "exact"),
    errorLabel: heading("windSpeed", "exact"),
    quantity: "windSpeed",
    rule: { kind: "non-negative", sentence: "une vitesse négative n'existe pas" },
    warning: null,
    gate: null,
  },
  windDirection: {
    id: "windDirection",
    label: heading("windDirection", "exact"),
    errorLabel: heading("windDirection", "exact"),
    quantity: "windDirection",
    rule: { kind: "finite" },
    warning: null,
    gate: null,
  },
  // The ride's constants (#89, #104): §12.2's, every one editable and labelled. They sit in no
  // gate — only the passager's ride reads them, never the statics or the Verdict.
  CdA: {
    id: "CdA",
    label: heading("dragArea", "exact"),
    errorLabel: heading("dragArea", "exact"),
    quantity: "CdA",
    rule: { kind: "non-negative", sentence: "une surface négative n'existe pas" },
    warning: {
      kind: "band",
      min: DYNAMICS.CdABand.min,
      max: DYNAMICS.CdABand.max,
      copy: `surface hors de la plage du champ (${formatValue("CdA", DYNAMICS.CdABand.min)} – ${formatValue("CdA", DYNAMICS.CdABand.max)} m²) [CONVENTION]`,
    },
    gate: null,
  },
  F0: {
    id: "F0",
    label: heading("trolleyConstantFriction", "exact"),
    errorLabel: heading("trolleyConstantFriction", "exact"),
    quantity: "F0",
    rule: { kind: "non-negative", sentence: NO_NEGATIVE_FRICTION },
    warning: null,
    gate: null,
  },
  kv: {
    id: "kv",
    label: heading("trolleySpeedFriction", "exact"),
    errorLabel: heading("trolleySpeedFriction", "exact"),
    quantity: "kv",
    rule: { kind: "non-negative", sentence: NO_NEGATIVE_FRICTION },
    warning: null,
    gate: null,
  },
  trolleyMu: {
    id: "trolleyMu",
    label: heading("trolleyFrictionRatio", "exact"),
    errorLabel: heading("trolleyFrictionRatio", "exact"),
    quantity: "trolleyMu",
    rule: { kind: "non-negative", sentence: NO_NEGATIVE_FRICTION },
    warning: null,
    gate: null,
  },
  // Blank is §12.2's « lu » half: the ISA density at the profil's mean altitude, or 1,225.
  rho: {
    id: "rho",
    label: heading("airDensity", "exact"),
    errorLabel: heading("airDensity", "exact"),
    quantity: "rho",
    rule: { kind: "non-negative", sentence: "une masse volumique négative n'existe pas" },
    optional: true,
    warning: null,
    gate: null,
  },
  // The two Positions (#90). Both sit in no gate — no computation reads a Position — and a blank
  // pair is « inconnue », not « vide et requis », so none is required.
  latA: coordinateField("latA", "latitude", "A"),
  lonA: coordinateField("lonA", "longitude", "A"),
  latB: coordinateField("latB", "latitude", "B"),
  lonB: coordinateField("lonB", "longitude", "B"),
} as const satisfies Record<FieldId, FieldSpec>;

/**
 * The fields a simplified Page names in the terrain register (#61), by the vocabulary id each is
 * spelled from. A field whose term is `hiddenOnTerrain` is set on Avancé alone, so a terrain
 * message names it {@link AVANCE_SETTING} rather than print the word the Page must not show. Every
 * other field reads the same on every Page.
 */
const TERRAIN_TERM = {
  regime: "regime",
  d: "diameter",
  dTextile: "diameter",
  T_target: "pretension",
  D_target: "sag",
  L0: "unstretchedLength",
  R0: "grade",
  cst: "construction",
  cls: "ropeClass",
  eaOverride: "axialStiffness",
  muOverride: "linearMass",
  muTextile: "linearMass",
  k: "relativeStiffness",
  ta: "termination",
  tb: "termination",
  etaA: "efficiency",
  etaB: "efficiency",
  H_target: "horizontalTension",
  vRatio: "vRatio",
  DAF: "startMultiplier",
  CdA: "dragArea",
  F0: "trolleyConstantFriction",
  kv: "trolleySpeedFriction",
  trolleyMu: "trolleyFrictionRatio",
  rho: "airDensity",
} as const satisfies Partial<Record<FieldId, LabelId>>;

/** How a terrain message names a field only Avancé shows. */
export const AVANCE_SETTING = "Réglage de la Page Avancé";

function terrainTerm(id: FieldId): LabelId | undefined {
  return (TERRAIN_TERM as Partial<Record<FieldId, LabelId>>)[id];
}

/** Is this field set on Avancé alone — absent from a simplified Page and unnamed there? */
export function isHiddenOnTerrain(id: FieldId): boolean {
  const term = terrainTerm(id);
  return term !== undefined && isHiddenTerm(term);
}

/** What the control is labelled on a Page of this register. */
export function fieldLabel(id: FieldId, register: Register = "exact"): string {
  return register === "terrain" ? terrainName(id, FIELDS[id].label) : FIELDS[id].label;
}

/** The name a message prints for this field on a Page of this register. */
export function fieldErrorLabel(id: FieldId, register: Register = "exact"): string {
  return register === "terrain" ? terrainName(id, FIELDS[id].errorLabel) : FIELDS[id].errorLabel;
}

function terrainName(id: FieldId, exact: string): string {
  const term = terrainTerm(id);
  if (term === undefined) return exact;
  return isHiddenTerm(term) ? AVANCE_SETTING : heading(term, "terrain");
}

/**
 * The fields whose blank is « absent »: the textile diameter, the air density read rather than
 * typed, and the four coordinates.
 */
export type OptionalFieldId = "dTextile" | "rho" | "latA" | "lonA" | "latB" | "lonB";

/** Whether a blank is « absent » for this field (read off {@link FieldSpec.optional}). */
export function isOptionalField(id: FieldId): id is OptionalFieldId {
  return (FIELDS[id] as FieldSpec).optional === true;
}

/** Rail order — what « the first culpable field in table order » means. */
export const FIELD_ORDER = Object.keys(FIELDS) as readonly FieldId[];

/**
 * The field each Tightness Driver edits — the one place a driver is mapped to its field, so the
 * segmented control, the gates, the refusals and the link all agree on it.
 */
export const TIGHTNESS_FIELD = {
  sag: "D_target",
  anchor: "T_target",
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
  // In imported mode `h = (z_last + hauteur_B) − (z_first + hauteur_A)`, so the anchor heights are
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

  /** `Portée`, m — the only warning that reads a second field (`|h| > L`). */
  readonly L?: number;
  /** The Page's vocabulary, which names the field in a message. `exact` when absent. */
  readonly register?: Register;
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

/** `Côté de la Mise en tension`'s two entries: the two anchors, as the Rail names them. */
export const TENSIONING_SIDE_LABEL = {
  A: `${heading("anchor", "exact")} A`,
  B: `${heading("anchor", "exact")} B`,
} as const satisfies Record<TensioningSide, string>;

/** `Mise en tension`'s three entries: the mouflage and the two Maestro. */
export const TENSIONING_DEVICE_LABEL = {
  pulley: heading("pulleySystem", "exact"),
  "maestro-s": `${heading("maestro", "exact")} S`,
  "maestro-l": `${heading("maestro", "exact")} L`,
} as const satisfies Record<TensioningDevice, string>;

/** One picker entry. */
export type PickerOption<Id extends string> = { readonly value: Id; readonly label: string };

/**
 * A picker's two conventions: the empty entry a value nobody chose shows, and the suffix that says
 * an entry is unavailable — the row's note says why.
 */
export const PICKER_COPY = { empty: "— choisir —", unavailable: "indisponible" } as const;

/** A stale Override's badge, before the formula's value, and the action that restores it. */
export const OVERRIDE_COPY = { stale: "la formule donne", recalculate: "Recalculer" } as const;

/** The line's two families, as each register names them: Avancé names the material as well. */
export const FAMILY_LABEL = {
  exact: { steel: "Câble acier", textile: "Corde textile" },
  terrain: { steel: heading("cable", "terrain"), textile: heading("rope", "terrain") },
} as const satisfies Record<Register, Record<"steel" | "textile", string>>;

/** `Installation`'s two entries, in a Page's vocabulary. */
export function usageOptions(register: Register): readonly PickerOption<UseClass>[] {
  return [
    { value: "PERMANENTE", label: heading("permanentInstallation", register) },
    { value: "TEMPORAIRE", label: heading("temporaryInstallation", register) },
  ];
}

/**
 * The régime picker's value as the Scenario holds it: `null` for the empty entry, or a régime the
 * engine knows — a value off the DOM is a string, and only one of these is a `RegimeId`.
 */
export function regimeChoice(value: string): RegimeId | null {
  return Object.values(REGIMES).find((regime) => regime.id === value)?.id ?? null;
}

/**
 * `Brins porteurs`'s two entries, in the glossary's words: one member is a « ligne », two are the
 * « ligne du haut » and the « ligne du bas ». Keyed by the count as text, which a radio holds.
 */
export const CARRYING_LINES_OPTIONS = [
  { value: "1", label: `1 ${label("line", "exact")}` },
  {
    value: "2",
    label: `2 ${label("line", "exact")}s (${label("upperLine", "exact")}, ${label("lowerLine", "exact")})`,
  },
] as const satisfies readonly PickerOption<`${CarryingLines}`>[];

export const TENSIONING_SIDE_OPTIONS = pickerOptions(TENSIONING_SIDE_LABEL);

export const TENSIONING_DEVICE_OPTIONS = pickerOptions(TENSIONING_DEVICE_LABEL);

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
function blocking(id: FieldId, rule: string, value: string, register?: Register): string {
  return `⛔ ${fieldErrorLabel(id, register)} — ${rule}. Valeur : ${value}.`;
}

/**
 * « nombre illisible », and it **quotes the raw text back** — what the user typed is the evidence,
 * and the state exists at all because § 3 elected `inputMode="decimal"` over `type="number"`.
 */
export function unreadableMessage(id: FieldId, raw: string, register?: Register): string {
  return `⛔ ${fieldErrorLabel(id, register)} — nombre illisible. Saisie : « ${raw.trim()} ».`;
}

/**
 * Tier one on one field's raw text. **This is the whole of what a form validator may decide**:
 * emptiness, readability and a sign rule — no physics at all.
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
    return {
      field: id,
      kind: "unreadable",
      message: unreadableMessage(id, raw, context.register),
    };
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
        message: blocking(id, spec.rule.sentence, echo(id, shown, unit), context.register),
      };
    case "non-negative":
      if (shown >= 0) return null;
      return {
        field: id,
        kind: "invalid",
        message: blocking(id, spec.rule.sentence, echo(id, shown, unit), context.register),
      };
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
