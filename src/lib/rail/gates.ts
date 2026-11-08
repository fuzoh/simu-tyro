/**
 * **The three gates** — « v1 build spec » § 7 (*Les trois grilles de validation*, *Le résumé
 * bloquant nomme la pire grille franchie*, *« Saisie en cours »*, *La table des champs
 * responsables*) and § 3 (*The three validation gates*, *Champ responsable*), under
 * [amendment D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
 *
 * **The gates are not form validators.** Solve / Clearance / Verdict are **cross-field predicates
 * over the derived Scenario**; a form validator is per-field and would split one gate across
 * seventeen fields, which is the « one rule living in two places » failure § 7 exists to prevent.
 * `./fields.ts` owns **exactly tier one**, and this module reads its output rather than repeating
 * any of its rules.
 *
 * Rules this module exists to keep:
 *
 * - **Three gates with distinct consequences, not one form tier.** A Solve breach removes « tout
 *   l'aval »; a Clearance breach removes the garde and its curve **alone** — the cable still
 *   draws; a Verdict breach removes the banner and the criteria × ends grid **alone**. That is why
 *   « ⛔ 2 erreurs bloquantes — aucun résultat » is true only for a Solve breach and the summary
 *   names the **worst gate breached** instead.
 * - **« Régime choisi » is struck from the Solve Gate.** It never blocks a solve — which is what
 *   makes the verdict-less first run coherent: garde min is geometric fact and the tension
 *   envelope is physics, and all a régime adds is a divisor.
 * - **An absent régime is not an error at all.** § 9: « — choisir — » is « **not** an empty
 *   required field ». It breaches the Verdict Gate through {@link GateReport.noRegime} — banner
 *   verdict and criteria × ends grid gone — while the blocking list stays empty, so § 8's rank 1
 *   cannot pre-empt the rank-4 neutral prompt and the picker carries no field message. The
 *   régime × famille/usage clash is a different thing: that one **is** a blocking error with its
 *   `[ Choisir un autre régime ]`, and § 8's message table has a row for it.
 * - **`x_D` sits in no gate.** It clamps on every path, and a clamp produces no error state.
 * - **§5.4's chord bound is not here.** `L₀ > chord/(1 + T_break/EA)` needs `EA` and `MBF`, so
 *   evaluating it would re-derive physics in the UI. It stays in the engine and surfaces as
 *   « Tension impossible », an engine refusal — never a field error and never a gate.
 * - **Attribution, never inference.** No hard check renders only on a read-out: every check is
 *   declared on a **quantity** and attributed to an editable field by {@link culprits}, the static
 *   table keyed by (grandeur × mode) — otherwise a check on a derived read-out, such as an imported
 *   `h`, would point at a field the user cannot edit.
 * - **The Scenario holds numbers; the form holds text.** A cleared field cannot be a number, so
 *   emptiness arrives here as a {@link FieldIssue} from the form while the Scenario keeps the last
 *   committed value — which is exactly what « Saisie en cours » freezes on screen. The two
 *   never-filled textile blanks are the one emptiness the *state* can hold (`null`), and they are
 *   read straight off the Scenario, because § 9's family flip must raise them before anything is
 *   typed.
 * - **Blocking errors are a list, not a singleton**, `use=perm & fam=tx & reg=secours10` raises
 *   two at once, **family first**, and applying one Fix Action leaves the other standing rather
 *   than cascading a silent second repair.
 */

import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { RegimeId, RegimeMismatch, TerminationId, TextileSpec } from "@/lib/sim";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { isFamilyAllowed, REGIMES, regimeMismatch, TERMINATIONS } from "@/lib/sim";
import { heading, label } from "@/lib/vocabulary/labels.ts";

import type { Deduced } from "./deduced.ts";
import type { FieldId, FieldIssue, FieldIssueKind, GateId } from "./fields.ts";

import {
  checkField,
  displayField,
  emptyMessage,
  FIELD_ORDER,
  FIELDS,
  fieldLabel,
  gateOf,
  isOptionalField,
} from "./fields.ts";
import {
  FIELD_ACCESS,
  fieldContext,
  GATED_FIELDS,
  heldValue,
  isGatedField,
  isNumericField,
  isOverrideField,
  SHIPPED_TERMINATIONS,
  TERMINATION_FIELD,
} from "./values.ts";

export type { GateId } from "./fields.ts";

/**
 * § 7's own third column — « ce que l'échec supprime », as the banner's summary says it. The
 * summary carries **only** the count and the jump link; the actionable message and its Fix Action
 * live inline on the culpable field.
 */
export const GATE_CONSEQUENCE: Record<GateId, string> = {
  solve: "aucun résultat",
  clearance: "garde au sol indisponible",
  verdict: "aucun verdict",
};

/** Worst first. A Solve breach subsumes the other two, which is why it names the summary. */
const GATE_RANK: Record<GateId, number> = { solve: 0, clearance: 1, verdict: 2 };

/**
 * § 7's four Fix Actions, and the fifth ADR-0001 admits for an end the line cannot use. **Their
 * labels describe the effect of pressing them** (invariant 2): a *message* states a property of
 * the world, and a verb naming the effect is accurate whether the state was entered or arrived on
 * the first frame of a link.
 */
export type FixActionId =
  | "passer-au-cable"
  | "passer-en-usage-temporaire"
  | "choisir-un-autre-regime"
  | "passer-a-la-terminaison-de-depart";

export type FixAction = { readonly id: FixActionId; readonly label: string };

/** The fifth names the end it sets, which depends on the family, so it is built at the gate. */
const FIX: Record<Exclude<FixActionId, "passer-a-la-terminaison-de-depart">, FixAction> = {
  "passer-au-cable": { id: "passer-au-cable", label: `Passer au ${label("cable", "terrain")}` },
  "passer-en-usage-temporaire": {
    id: "passer-en-usage-temporaire",
    label: `Passer à l'${label("temporaryInstallation", "exact")}`,
  },
  // A **focus** action, not a value-setting one: no single correct régime exists.
  "choisir-un-autre-regime": { id: "choisir-un-autre-regime", label: "Choisir un autre régime" },
};

/** The régime's Fix Action and its message's subject on a simplified Page, which says marge exigée. */
const REGIME_WORDING: Record<Register, { readonly fix: string; readonly subject: string }> = {
  exact: { fix: FIX["choisir-un-autre-regime"].label, subject: "Régime" },
  terrain: {
    fix: `Choisir une autre ${label("regime", "terrain")}`,
    subject: heading("regime", "terrain"),
  },
};

/** One breach: which gate, which field is to blame, what it says, and what repairs it. */
export type BlockingError = {
  readonly gate: GateId;
  /**
   * `empty` renders **neutral, lowercase, no icon** on the control and still breaches the gate — a
   * field the user never filled is not mid-edit, so § 9's family flip raises two of these. `invalid`
   * and `unreadable` render ⛔.
   */
  readonly kind: FieldIssueKind;
  /** The **first** culpable field in table order — where the message and the Fix Action anchor. */
  readonly field: FieldId;
  /** The other culprits: **error outline only**, no second copy of the message. */
  readonly alsoOutlined: readonly FieldId[];
  readonly message: string;
  readonly fixes: readonly FixAction[];
};

/** What the three gates decided, in one object. */
export type GateReport = {
  /** Worst gate first, then rail order. The banner's jump link targets `errors[0]`. */
  readonly errors: readonly BlockingError[];
  /** Per gate: did it pass? A failed gate suppresses exactly what § 7's table says it does. */
  readonly passed: Record<GateId, boolean>;
  /** The worst gate breached, or `null` when nothing is on the blocking list. */
  readonly worst: GateId | null;
  /**
   * `Régime de sécurité` sits at « — choisir — ». It **breaches the Verdict Gate without being an
   * error**: § 9 says the absence « is **not** an empty required field », it is struck from the
   * form tier and the first screen is verdict-less by design. So the banner and the criteria ×
   * ends grid go — {@link GateReport.passed}`.verdict` is false — while {@link
   * GateReport.errors} stays empty, which is what leaves § 8's rank 4 reachable: rank 1 pre-empts
   * rank 4, so an error here would make the neutral no-regime prompt structurally unreachable.
   */
  readonly noRegime: boolean;
};

/** What the gates read. Everything else in the app is downstream of these three. */
export type GateInput = {
  readonly scenario: TraverseScenario;
  /**
   * Tier one's standing failures, from the form. Text the Scenario cannot hold: an emptied field,
   * or « 12,3,4 ». Omitted, the gates judge the Scenario alone — which is what a link arrival, a
   * Session restore and every `node` test do.
   */
  readonly issues?: readonly FieldIssue[];
  /** The Page's vocabulary, which names the fields in the messages. `exact` when absent. */
  readonly register?: Register;
};

/**
 * § 7's culprit table, **static and indexed by (grandeur × mode)** — never a dependency graph and
 * never inference. The mapping is tiny, mode-indexed, and has to be reviewable beside § 3's field
 * table; exactly one tightness quantity is state per mode, so the table has one row per mode by
 * construction.
 *
 * Two of its rules are properties of §13.1 rather than of the error surface, and they are why the
 * Material Spec needs no new machinery: **an overridden derived value is its own culprit** —
 * override turns the read-out into an editable field, so attribution collapses to identity — and
 * **the steel rows follow the formulas, not the field group**: `MBF = K·d²·R₀/1000` depends on all
 * three inputs, while `EA = E_app·C·d²` and `μ = W·d²/100` depend on **`d` alone**, because
 * `E_app`, `C` and `W` are pinned midpoints and not construction-indexed. Listing Grade and
 * Construction as culprits for `EA` would send a user to two fields that cannot move the number.
 */
export type Grandeur = "L" | "h" | "L0" | "MBF" | "EA" | "mu";

/** The mode each row of the culprit table is indexed by. One discriminator per grandeur family. */
export type CulpritMode =
  | "manuel"
  | "importé"
  | "mode Longueur"
  | "mode Flèche"
  | "mode Prétension"
  | "mode Tension horizontale"
  | "mode Rapport V"
  | "câble"
  | "câble surchargé"
  | "corde";

const CULPRITS: Partial<Record<`${Grandeur}/${CulpritMode}`, readonly FieldId[]>> = {
  "L/manuel": ["L"],
  "h/manuel": ["h"],
  // An imported `L` is the profil's own extent: no field moves it, so it has no row.
  "h/importé": ["zA", "zB"],
  "L0/mode Longueur": ["L0"],
  "L0/mode Flèche": ["D_target"],
  "L0/mode Prétension": ["T_target"],
  "L0/mode Tension horizontale": ["H_target"],
  "L0/mode Rapport V": ["vRatio"],
  "MBF/câble": ["d", "R0", "cst"],
  "MBF/câble surchargé": ["mbfOverride"],
  "EA/câble": ["d"],
  "EA/câble surchargé": ["eaOverride"],
  "EA/corde": ["k", "MBL"],
  "mu/câble": ["d"],
  "mu/câble surchargé": ["muOverride"],
  "mu/corde": ["muTextile"],
};

/**
 * The fields a failure of `grandeur` is attributed to, in table order. The **first** carries the
 * message and the Fix Action; the others take the error outline only.
 */
export function culprits(grandeur: Grandeur, mode: CulpritMode): readonly FieldId[] {
  return CULPRITS[`${grandeur}/${mode}`] ?? [];
}

/**
 * The cause clause of § 8's « Régime × famille / usage » message row, for a régime that
 * {@link regimeMismatch} has just rejected.
 *
 * § 10.1 disables a régime on **two independent conditions** — « sous acier, **ou** sous
 * `PERMANENTE` » — so the clause names each **mismatch**, never the state the Scenario happens to
 * hold. Under `textile` + `PERMANENTE` the rope is this régime's own *precondition*: naming it
 * would send the user to repair the one part already right. Steel under `PERMANENTE` misses both,
 * and the clause names both, family first. `requires.usage` is `TEMPORAIRE` for every régime that
 * constrains it, so a use-class miss can only ever be `PERMANENTE`.
 */
function unavailabilityCause(mismatch: RegimeMismatch, family: "steel" | "textile"): string {
  const causes: string[] = [];
  if (mismatch.family) causes.push(`avec ${FAMILY_REQUIRED[family]}`);
  if (mismatch.usage) causes.push("en installation permanente");
  return causes.join(" et ");
}

/** How the select note names the entry it explains, per register. */
const THIS_REGIME: Record<Register, string> = {
  exact: "ce régime",
  terrain: `cette ${label("regime", "terrain")}`,
};

/** What a régime's `requires` asks for, as the noun the select note needs. */
const FAMILY_REQUIRED = {
  steel: `un ${label("cable", "terrain")}`,
  textile: `une ${label("rope", "terrain")}`,
} as const;
const USAGE_REQUIRED = {
  PERMANENTE: `une ${label("permanentInstallation", "exact")}`,
  TEMPORAIRE: `une ${label("temporaryInstallation", "exact")}`,
} as const;
/** And what is currently selected, for the clause that names it. */
const FAMILY_ACTIVE = {
  steel: `le ${label("cable", "terrain")}`,
  textile: `la ${label("rope", "terrain")}`,
} as const;

/**
 * § 10.1 — « une entrée indisponible **montre sa raison** »: the régime select's note, `null` where
 * the entry is choosable. The option itself already reads « — indisponible », which says *that*;
 * this says *why*.
 *
 * **Three forms, because both clauses can fail at once** — steel *and* `PERMANENTE`. § 10.1 asks
 * for one reason per row, so the pair is one sentence rather than two notes.
 */
export function regimeUnavailableNote(
  regime: RegimeId,
  family: "steel" | "textile",
  usage: "PERMANENTE" | "TEMPORAIRE",
  register: Register = "exact",
): string | null {
  const mismatch = regimeMismatch(regime, family, usage);
  const { requires } = REGIMES[regime];
  if (mismatch === null || requires === null) return null;
  const subject = THIS_REGIME[register];
  if (mismatch.family && mismatch.usage) {
    return `Indisponible — ${subject} suppose ${FAMILY_REQUIRED[requires.family]} et ${USAGE_REQUIRED[requires.usage]}.`;
  }
  if (mismatch.family) {
    return `Indisponible — ${subject} suppose ${FAMILY_REQUIRED[requires.family]} ; la famille active est ${FAMILY_ACTIVE[family]}.`;
  }
  return `Indisponible — ${subject} ne couvre pas ${USAGE_REQUIRED[usage]}.`;
}

/** §10.4, stated where `Corde` is disabled — the rule is a fact worth teaching. */
export const TEXTILE_UNAVAILABLE_REASON =
  "§10.4 : fluage, UV/abrasion et fusion par friction (HMPE ~144–152 °C) ⇒ câble seul en installation permanente.";

/** §10.3, likewise: not forbidden — there is simply no efficiency to multiply by. */
const KNOT_ON_HMPE_REASON =
  "§10.3 : sur HMPE le nœud glisse (0,25–0,50). Aucun rendement défendable ⇒ épissure obligatoire.";

type Family = ScenarioDraft["material"]["family"];

/** Why the line cannot use an end — `null` when it can. */
type TerminationFault = "other-family" | "knot-on-hmpe";

function terminationFault(
  id: TerminationId,
  family: Family,
  ropeClass: TextileSpec["ropeClass"] | null,
): TerminationFault | null {
  const termination = TERMINATIONS[id];
  if (termination.family !== "both" && termination.family !== family) return "other-family";
  // §10.3's 0,25–0,50 describes a knot that *slips*: there is no efficiency to multiply by.
  if (termination.knot && ropeClass === "hmpe") return "knot-on-hmpe";
  return null;
}

/** One entry of a termination picker. */
export type TerminationOption = {
  readonly value: TerminationId;
  readonly label: string;
  readonly disabled: boolean;
};

/**
 * A termination picker's entries: the active family's ends plus « Attelage sans tension », with
 * §10.3's knots disabled on HMPE. Serre-câbles étrier stays **selectable** — a defensible `η_t`
 * exists and the Verdict refuses the rig.
 *
 * @param selected the end the line holds. One of the other family is still listed, last and
 *   disabled: a native select left without its option would show the first entry instead, beside
 *   the Verdict Gate's error about a different one, and that error is its reason.
 * @returns the entries and the row's one reason, `null` when no knot is disabled. Both knots are
 *   disabled by the same rule, and printing it twice says nothing the first copy did not.
 */
export function terminationOptions(
  family: Family,
  ropeClass: TextileSpec["ropeClass"] | null,
  selected: TerminationId,
): { readonly options: readonly TerminationOption[]; readonly reason: string | null } {
  const options = Object.values(TERMINATIONS).flatMap((termination) => {
    const fault = terminationFault(termination.id, family, ropeClass);
    if (fault === "other-family") return [];
    return [{ value: termination.id, label: termination.label, disabled: fault !== null }];
  });
  const reason = options.some((option) => option.disabled) ? KNOT_ON_HMPE_REASON : null;
  if (options.some((option) => option.value === selected)) return { options, reason };
  const held = { value: selected, label: TERMINATIONS[selected].label, disabled: true };
  return { options: [...options, held], reason };
}

function terminationFaultMessage(fault: TerminationFault, family: Family): string {
  if (fault === "knot-on-hmpe") {
    return "⛔ Nœud impossible sur HMPE — il y glisse, sans rendement défendable (§10.3).";
  }
  return family === "steel"
    ? "⛔ Terminaison de corde impossible sur un câble (§10.2)."
    : "⛔ Terminaison de câble impossible sur une corde (§10.3).";
}

/** Manual or imported geometry — the mode half of every (grandeur × mode) row. */
function geometryMode(scenario: TraverseScenario): "manual" | "trace" {
  return scenario.geometry.source;
}

/**
 * Is this control on screen for this Scenario? A field the current mode, family or tightness
 * driver does not render cannot be a culprit — a stale issue on `MBL` under `fam=ac` would block a
 * steel line on a rope nobody can see.
 *
 * A gated numeric field is on screen where its lens reads anything at all. The pickers have no
 * lens, so the two steel pickers and the rope class keep their family rule here.
 */
export function isFieldActive(id: FieldId, scenario: TraverseScenario): boolean {
  if (isGatedField(id)) return FIELD_ACCESS[id].read(scenario) !== undefined;
  const steel = scenario.material.family === "steel";
  if (id === "R0" || id === "cst") return steel;
  if (id === "cls") return !steel;
  return true;
}

/**
 * The three gates over one Scenario.
 *
 * @returns every standing breach, worst gate first then rail order, with the three pass flags §
 *   7's table hangs its three different suppressions off.
 */
export function evaluateGates({
  scenario,
  issues = [],
  register = "exact",
}: GateInput): GateReport {
  const mode = geometryMode(scenario);
  const errors: BlockingError[] = [];
  /** One breach per field: a scenario-level check never doubles a standing form issue. */
  const claimed = new Set<FieldId>();

  const push = (error: BlockingError) => {
    if (claimed.has(error.field)) return;
    claimed.add(error.field);
    errors.push(error);
  };

  // ── Tier one, as the form currently sees it ────────────────────────────────────────────────
  for (const issue of issues) {
    if (!isFieldActive(issue.field, scenario)) continue;
    const gate = gateOf(issue.field, mode);
    if (gate === null) continue;
    push({
      gate,
      kind: issue.kind,
      field: issue.field,
      alsoOutlined: [],
      message: issue.message,
      fixes: [],
    });
  }

  // ── §10.4, the use-class gate — family first ───────────────────────────────────────────────
  // The boundary is a **use-class boundary, not a physical ban**, and the transition path is a
  // blocking error with two Fix Actions rather than a silent auto-switch, which would discard the
  // Material Spec the user just built. Neither repair is privileged: withholding the second forces
  // a link's recipient to throw away the very spec the link was sent to show them.
  if (!isFamilyAllowed(scenario.material.family, scenario.usage)) {
    push({
      gate: "solve",
      kind: "invalid",
      field: "family",
      alsoOutlined: ["usage"],
      message: "⛔ Corde impossible en installation permanente (§10.4).",
      fixes: [FIX["passer-au-cable"], FIX["passer-en-usage-temporaire"]],
    });
  }

  // ── The Verdict Gate's régime ──────────────────────────────────────────────────────────────
  // « — choisir — » is **not an empty required field** (§ 9): it is legitimate state, struck from
  // the form tier, and it raises **no** blocking error. What it does is suppress the Verdict Gate
  // — {@link GateReport.noRegime} below — which removes the banner verdict and the criteria × ends
  // grid and leaves § 8's rank-4 neutral prompt as the banner's occupant. Filing it as an error
  // would put rank 1 in the slot instead and make that prompt unreachable.
  const noRegime = scenario.regime === null;
  const mismatch =
    scenario.regime === null
      ? null
      : regimeMismatch(scenario.regime, scenario.material.family, scenario.usage);
  if (scenario.regime !== null && mismatch !== null) {
    push({
      gate: "verdict",
      kind: "invalid",
      field: "regime",
      alsoOutlined: [],
      message: `⛔ ${REGIME_WORDING[register].subject} « ${REGIMES[scenario.regime].label} » indisponible ${unavailabilityCause(
        mismatch,
        scenario.material.family,
      )}.`,
      fixes: [{ id: "choisir-un-autre-regime", label: REGIME_WORDING[register].fix }],
    });
  }

  // ── The ends the line cannot use ───────────────────────────────────────────────────────────
  // The picker never offers them, but a link, a Session or a class switch can carry one, and
  // ADR-0001 keeps it as given. One error per cause, so a single press repairs every end it names
  // and an end with another cause keeps its own message.
  const family = scenario.material.family;
  const ropeClass = scenario.material.family === "textile" ? scenario.material.ropeClass : null;
  for (const fault of ["other-family", "knot-on-hmpe"] as const) {
    const ends = (["A", "B"] as const).filter(
      (end) => terminationFault(scenario.terminations[end].id, family, ropeClass) === fault,
    );
    if (ends.length === 0) continue;
    const [first, ...rest] = ends;
    const { id } = SHIPPED_TERMINATIONS[family][first];
    push({
      gate: "verdict",
      kind: "invalid",
      field: TERMINATION_FIELD[first],
      alsoOutlined: rest.map((end) => TERMINATION_FIELD[end]),
      message: terminationFaultMessage(fault, family),
      fixes: [
        {
          id: "passer-a-la-terminaison-de-depart",
          label: `Passer à « ${TERMINATIONS[id].label} »`,
        },
      ],
    });
  }

  // ── Every number the Scenario holds, as a link can carry it ────────────────────────────────
  // `?L=-5` restores state faithfully, including invalid state, and must light up here on the first
  // frame even though nobody has typed into the field yet.
  const context = fieldContext(scenario, register);
  for (const field of GATED_FIELDS) {
    const value = FIELD_ACCESS[field].read(scenario);
    if (value === undefined) continue;
    if (value === null) {
      // An unset Override is « non surchargée »: it shows the formula and judges nothing. The other
      // blanks are the textile ones the *state* can hold. **No rope ships**: one invented `MBL`
      // decides the verdict (100 kN ⇒ FS 11,94 « dans les limites »; 60 kN ⇒ 7,63 « hors limites »
      // on the same line). Flipping to `Corde` under `TEMPORAIRE` therefore lands on two
      // blank required fields — which is **not** « Saisie en cours »: a field the user never
      // filled is not mid-edit, so it blocks and keeps no stale picture. Polyester adds a third,
      // and its message carries the reason rather than the hole.
      // An optional field's blank is « absent » (the textile diameter) and judges nothing either.
      if (!isOverrideField(field) && !isOptionalField(field)) {
        push({
          gate: "solve",
          kind: "empty",
          field,
          alsoOutlined: [],
          message: emptyMessage(field, context),
          fixes: [],
        });
      }
      continue;
    }
    // Canonical → the text the field shows, so a message echoes « −10,0 daN » and not the raw
    // newtons: § 7's template quotes the value **in the field's own quantity and unit**.
    const issue = checkField(field, displayField(field, value, scenario.unit), context);
    if (issue === null) continue;
    const gate = gateOf(field, mode);
    if (gate === null) continue;
    push({ gate, kind: issue.kind, field, alsoOutlined: [], message: issue.message, fixes: [] });
  }

  errors.sort(
    (a, b) =>
      GATE_RANK[a.gate] - GATE_RANK[b.gate] ||
      FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field),
  );

  const passed: Record<GateId, boolean> = { solve: true, clearance: true, verdict: true };
  for (const error of errors) passed[error.gate] = false;
  // The one gate breach that is not an error: an absent régime suppresses the verdict and the grid
  // without entering the blocking list, so `worst` and `blockingSummary` stay derived from
  // `errors` alone and the first screen carries **no** « ⛔ 1 erreur bloquante ».
  if (noRegime) passed.verdict = false;
  const worst = errors.length === 0 ? null : errors[0].gate;

  return { errors, passed, worst, noRegime };
}

/**
 * § 7's blocking summary, which **names the worst gate breached**. ELECTIONS §0.4's « ⛔ 2 erreurs
 * bloquantes — aucun résultat » is true only for a Solve breach: under the three-gate split a bad
 * `DAF` blocks the verdict while `T max` and `Garde min` are printed on screen, and « aucun
 * résultat » beside a printed clearance is the app contradicting itself.
 *
 * @param refused is an engine refusal standing beside the blocking list? A refusal has already
 *   removed « tout l'aval », so the worst consequence on screen is « aucun résultat » whatever the
 *   gate the field error belongs to. Rank 1 still pre-empts rank 2 — that is § 7's precedence — but
 *   the sentence it puts in the slot may not promise results the screen does not carry.
 * @returns the slot's line, or `null` when nothing is breached. The **count and the jump link
 *   only** — the actionable message lives inline on the culpable field.
 */
export function blockingSummary(report: GateReport, refused = false): string | null {
  if (report.worst === null) return null;
  const gate: GateId = refused ? "solve" : report.worst;
  const count = report.errors.length;
  const plural = count > 1 ? "s" : "";
  return `⛔ ${count} erreur${plural} bloquante${plural} — ${GATE_CONSEQUENCE[gate]}`;
}

/** What « Saisie en cours » says, and the value it attributes every number on screen to. */
export type SaisieEnCours = {
  readonly field: FieldId;
  /** « Saisie en cours — ces valeurs correspondent à Flèche à vide 6,00 m. » */
  readonly message: string;
};

/**
 * **Firing rule: a required field is empty *and holds focus*.** Mid-edit, not an error.
 *
 * The focus clause is what keeps the state bounded — mid-edit lasts as long as the caret is in the
 * field. A required field that is empty and **blurred**, or that was **never filled**, is not
 * mid-edit at all and falls to « Aucun résultat » with no stale picture; without the clause,
 * walking away from a half-typed form leaves a stale Sweep on screen indefinitely, which is the one
 * thing the split exists to prevent.
 *
 * Focus is passed in rather than read off `isTouched`: **TanStack Form marks every field touched on
 * submit, and this app has no submit** — it is live and continuous — so nothing here may depend on
 * that transition, and « holds focus » is the property § 7 actually names.
 *
 * @param focused the field the caret is in, or `null`.
 * @param lastCommitted the value the Scenario still holds for that field, already formatted — the
 *   mark **names the field and its last committed value**, which attributes every number on screen
 *   unambiguously where opacity would only say « something here is provisional ».
 */
export function saisieEnCours(
  report: GateReport,
  focused: FieldId | null,
  lastCommitted: string | null,
  register: Register = "exact",
): SaisieEnCours | null {
  if (focused === null) return null;
  const breach = report.errors.find((error) => error.field === focused);
  if (breach === undefined || breach.kind !== "empty") return null;
  const value = lastCommitted === null ? "" : ` ${lastCommitted}`;
  return {
    field: focused,
    message: `${label("saisie-en-cours", register)} — ces valeurs correspondent à ${fieldLabel(focused, register)}${value}.`,
  };
}

/**
 * The last committed value of a field, formatted for {@link saisieEnCours}'s sentence — what the
 * Rail shows for it, so an unset Override names its formula value.
 */
export function committedValue(
  scenario: ScenarioDraft,
  field: FieldId,
  deduced: Deduced,
): string | null {
  if (!isNumericField(field)) return null;
  const value = heldValue(scenario, field, deduced);
  if (value === null || value === undefined) return null;
  return formatQuantity(FIELDS[field].quantity, value, scenario.unit);
}
