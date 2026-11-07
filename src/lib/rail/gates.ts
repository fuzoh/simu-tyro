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
 *   table keyed by (grandeur × mode). Without it `station B = station A` yields `L = 0`, reaches
 *   `solveSpan` and returns `invalid-input{field:"L"}` pointing at a field the user cannot edit.
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
import type { RegimeId } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { isFamilyAllowed, isRegimeAvailable, REGIMES } from "@/lib/sim";

import type { FieldId, FieldIssue, FieldIssueKind, GateId } from "./fields.ts";

import { checkField, displayField, emptyMessage, FIELD_ORDER, FIELDS, gateOf } from "./fields.ts";

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
 * § 7's four Fix Actions. **Their labels describe the effect of pressing them** (invariant 2):
 * a *message* states a property of the world, and a verb naming the effect is accurate whether the
 * state was entered or arrived on the first frame of a link.
 */
export type FixActionId =
  | "inverser-a-b"
  | "passer-a-l-acier"
  | "passer-en-usage-temporaire"
  | "choisir-un-autre-regime";

export type FixAction = { readonly id: FixActionId; readonly label: string };

const FIX: Record<FixActionId, FixAction> = {
  "inverser-a-b": { id: "inverser-a-b", label: "Inverser A et B" },
  "passer-a-l-acier": { id: "passer-a-l-acier", label: "Passer à l'acier" },
  "passer-en-usage-temporaire": {
    id: "passer-en-usage-temporaire",
    label: "Passer en usage temporaire",
  },
  // A **focus** action, not a value-setting one: no single correct régime exists.
  "choisir-un-autre-regime": { id: "choisir-un-autre-regime", label: "Choisir un autre régime" },
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
  /** The active profile, or `null` in manual mode — the stations' bound comes from it. */
  readonly trace: Trace | null;
  /**
   * Tier one's standing failures, from the form. Text the Scenario cannot hold: an emptied field,
   * or « 12,3,4 ». Omitted, the gates judge the Scenario alone — which is what a link arrival, a
   * Session restore and every `node` test do.
   */
  readonly issues?: readonly FieldIssue[];
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
  | "mode Tension"
  | "mode Rapport V"
  | "acier"
  | "acier surchargé"
  | "textile";

const CULPRITS: Partial<Record<`${Grandeur}/${CulpritMode}`, readonly FieldId[]>> = {
  "L/manuel": ["L"],
  "L/importé": ["sa", "sb"],
  "h/manuel": ["h"],
  "h/importé": ["sa", "sb", "zA", "zB"],
  "L0/mode Longueur": ["L0"],
  "L0/mode Flèche": ["D_target"],
  "L0/mode Tension": ["H_target"],
  "L0/mode Rapport V": ["vRatio"],
  "MBF/acier": ["d", "R0", "cst"],
  "MBF/acier surchargé": ["mbfOverride"],
  "EA/acier": ["d"],
  "EA/acier surchargé": ["eaOverride"],
  "EA/textile": ["k", "MBL"],
  "mu/acier": ["d"],
  "mu/acier surchargé": ["muOverride"],
  "mu/textile": ["muTextile"],
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
 * {@link isRegimeAvailable} has just rejected.
 *
 * § 10.1 disables a régime on **two independent conditions** — « seul *Secours textile 10:1* est
 * désactivé — sous acier, **ou** sous `PERMANENTE` » — so the clause names the **mismatch**, never
 * the state the Scenario happens to hold. Under `textile` + `PERMANENTE` the rope is this régime's
 * own *precondition*: naming it would send the user to repair the one part already right, and the
 * family breach § 10.4 files alongside it already names the rope. **Family first when both miss**,
 * which keeps § 8's shipped steel string verbatim. `requires.usage` is `TEMPORAIRE` for every
 * régime that constrains it, so a use-class miss can only ever be `PERMANENTE`.
 */
function unavailabilityCause(regime: RegimeId, family: "steel" | "textile"): string {
  const { requires } = REGIMES[regime];
  if (requires !== null && requires.family !== family) {
    return family === "steel" ? "avec un câble acier" : "avec une corde textile";
  }
  return "en installation permanente";
}

/** Manual or imported geometry — the mode half of every (grandeur × mode) row. */
function geometryMode(scenario: TraverseScenario): "manual" | "trace" {
  return scenario.geometry.source;
}

/**
 * Is this control on screen for this Scenario? A field the current mode, family or tightness
 * driver does not render cannot be a culprit — a stale issue on `MBL` under `fam=ac` would block a
 * steel line on a rope nobody can see.
 */
export function isFieldActive(id: FieldId, scenario: TraverseScenario): boolean {
  const manual = scenario.geometry.source === "manual";
  const steel = scenario.material.family === "steel";
  switch (id) {
    case "L":
    case "h":
      return manual;
    case "sa":
    case "sb":
      return !manual;
    case "d":
    case "R0":
    case "cst":
      return steel;
    // The three derived rows are editable at all times on a steel line — typing into one is what
    // creates the override. A *scenario-level* check still only runs on an override that exists,
    // because `materialScalars` only lists the keys the spec actually holds.
    case "mbfOverride":
    case "eaOverride":
    case "muOverride":
      return steel;
    case "cls":
    case "MBL":
    case "muTextile":
    case "k":
      return !steel;
    case "D_target":
      return scenario.tightness.mode === "sag";
    case "H_target":
      return scenario.tightness.mode === "tension";
    case "L0":
      return scenario.tightness.mode === "length";
    case "vRatio":
      return scenario.tightness.mode === "ratio";
    default:
      return true;
  }
}

/**
 * The three gates over one Scenario.
 *
 * @returns every standing breach, worst gate first then rail order, with the three pass flags §
 *   7's table hangs its three different suppressions off.
 */
export function evaluateGates({ scenario, trace, issues = [] }: GateInput): GateReport {
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
      message: "⛔ Corde textile impossible en installation permanente (§10.4).",
      fixes: [FIX["passer-a-l-acier"], FIX["passer-en-usage-temporaire"]],
    });
  }

  // ── The Verdict Gate's régime ──────────────────────────────────────────────────────────────
  // « — choisir — » is **not an empty required field** (§ 9): it is legitimate state, struck from
  // the form tier, and it raises **no** blocking error. What it does is suppress the Verdict Gate
  // — {@link GateReport.noRegime} below — which removes the banner verdict and the criteria × ends
  // grid and leaves § 8's rank-4 neutral prompt as the banner's occupant. Filing it as an error
  // would put rank 1 in the slot instead and make that prompt unreachable.
  const noRegime = scenario.regime === null;
  if (
    scenario.regime !== null &&
    !isRegimeAvailable(scenario.regime, scenario.material.family, scenario.usage)
  ) {
    push({
      gate: "verdict",
      kind: "invalid",
      field: "regime",
      alsoOutlined: [],
      // The cause clause names the **blocking condition**, not the family — see
      // {@link unavailabilityCause}: reading the family alone blamed the rope this régime requires.
      message: `⛔ Régime « ${REGIMES[scenario.regime].label} » indisponible ${unavailabilityCause(
        scenario.regime,
        scenario.material.family,
      )}.`,
      fixes: [FIX["choisir-un-autre-regime"]],
    });
  }

  // ── The textile blanks the *state* can hold ────────────────────────────────────────────────
  // **No rope ships**: one invented `MBL` decides the verdict (100 kN ⇒ FS 11,94 « dans les
  // limites »; 60 kN ⇒ 7,63 « hors limites » on the same line). Flipping to `Corde textile` under
  // `TEMPORAIRE` therefore lands on two blank required fields — which is **not** « Saisie en
  // cours »: a field the user never filled is not mid-edit, so it blocks and keeps no stale
  // picture. Polyester adds a third, and its message carries the reason rather than the hole.
  if (scenario.material.family === "textile") {
    const spec = scenario.material;
    const blanks: readonly [FieldId, number | null][] = [
      ["MBL", spec.MBL],
      ["muTextile", spec.mu],
      ["k", spec.k],
    ];
    for (const [field, value] of blanks) {
      if (value !== null) continue;
      push({
        gate: "solve",
        kind: "empty",
        field,
        alsoOutlined: [],
        message: emptyMessage(field, { ropeClass: spec.ropeClass }),
        fixes: [],
      });
    }
  }

  // ── Imported placement — the hard checks that must run on **derived** values ────────────────
  if (scenario.geometry.source === "trace") {
    const { sa, sb } = scenario.geometry;
    const extent =
      trace === null ? undefined : { min: trace.d[0], max: trace.d[trace.d.length - 1] };

    for (const [field, station] of [
      ["sa", sa],
      ["sb", sb],
    ] as const) {
      const issue = checkField(field, displayField(field, station, scenario.unit), { extent });
      if (issue !== null) {
        push({
          gate: "solve",
          kind: issue.kind,
          field,
          alsoOutlined: [],
          message: issue.message,
          fixes: [],
        });
      }
    }

    // `L = d_B − d_A` is a **read-out** here, so `L > 0` is attributed back to the stations. Not
    // a silent auto-swap: normalising to `A = min(station)` would **flip the sign of `h`**, the
    // silent model reinterpretation the §10.4 family gate already ruled out.
    if (!(sb > sa)) {
      const [first, ...rest] = culprits("L", "importé");
      push({
        gate: "solve",
        kind: "invalid",
        field: first,
        alsoOutlined: rest,
        message: "⛔ Portée nulle ou négative — l'ancrage B est avant l'ancrage A.",
        fixes: [FIX["inverser-a-b"]],
      });
    }
  } else {
    // Manual mode types `L` and `h` directly, so § 3's hard ranges are field rules and tier one has
    // already run them on the text. What is left is the value a **link** can carry: `?L=-5`
    // restores state faithfully, including invalid state, and must light up here on the first frame
    // even though nobody has typed into the field yet.
    const { L, h } = scenario.geometry;
    for (const [field, value] of [
      ["L", L],
      ["h", h],
    ] as const) {
      const issue = checkField(field, displayField(field, value, scenario.unit), {});
      if (issue !== null) {
        push({
          gate: "solve",
          kind: issue.kind,
          field,
          alsoOutlined: [],
          message: issue.message,
          fixes: [],
        });
      }
    }
  }

  // ── The remaining scenario-borne numbers a link can carry out of range ─────────────────────
  const scalars: readonly (readonly [FieldId, number])[] = [
    ["zA", scenario.anchors.zA],
    ["zB", scenario.anchors.zB],
    ["mp", scenario.rider.mp],
    ["hRider", scenario.rider.hRider],
    ["hClearMin", scenario.rider.hClearMin],
    ["DAF", scenario.rider.DAF],
    ["etaA", scenario.terminations.A.eta],
    ["etaB", scenario.terminations.B.eta],
    ...tightnessScalar(scenario),
    ...materialScalars(scenario),
  ];
  for (const [field, value] of scalars) {
    if (!isFieldActive(field, scenario)) continue;
    // Canonical → the text the field shows, so a message echoes « −10,0 daN » and not the raw
    // newtons: § 7's template quotes the value **in the field's own quantity and unit**.
    const issue = checkField(field, displayField(field, value, scenario.unit), {
      unit: scenario.unit,
    });
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

/** The driving tightness field and its value — exactly one is state per mode, by construction. */
function tightnessScalar(scenario: TraverseScenario): readonly (readonly [FieldId, number])[] {
  const { tightness } = scenario;
  if (tightness.mode === "sag") return [["D_target", tightness.D_target]];
  if (tightness.mode === "tension") return [["H_target", tightness.H_target]];
  if (tightness.mode === "ratio") return [["vRatio", tightness.ratio]];
  return [["L0", tightness.L0]];
}

/** The active Material Spec's own numbers, overrides included — they are their own culprits. */
function materialScalars(scenario: TraverseScenario): readonly (readonly [FieldId, number])[] {
  const spec = scenario.material;
  if (spec.family === "steel") {
    const out: (readonly [FieldId, number])[] = [["d", spec.d]];
    const { MBF, EA, mu } = spec.overrides ?? {};
    if (MBF !== undefined) out.push(["mbfOverride", MBF]);
    if (EA !== undefined) out.push(["eaOverride", EA]);
    if (mu !== undefined) out.push(["muOverride", mu]);
    return out;
  }
  const out: (readonly [FieldId, number])[] = [];
  if (spec.MBL !== null) out.push(["MBL", spec.MBL]);
  if (spec.mu !== null) out.push(["muTextile", spec.mu]);
  if (spec.k !== null) out.push(["k", spec.k]);
  return out;
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
  /** « Saisie en cours — ces valeurs correspondent à Flèche à vide cible 6,00 m. » */
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
): SaisieEnCours | null {
  if (focused === null) return null;
  const breach = report.errors.find((error) => error.field === focused);
  if (breach === undefined || breach.kind !== "empty") return null;
  const value = lastCommitted === null ? "" : ` ${lastCommitted}`;
  return {
    field: focused,
    message: `Saisie en cours — ces valeurs correspondent à ${FIELDS[focused].label}${value}.`,
  };
}

/** The last committed value of a field, formatted for {@link saisieEnCours}'s sentence. */
export function committedValue(scenario: ScenarioDraft, field: FieldId): string | null {
  const { quantity } = FIELDS[field];
  if (quantity === null) return null;
  const value = scalarOf(scenario, field);
  return value === null ? null : formatQuantity(quantity, value, scenario.unit);
}

/** Every scalar the Scenario holds, by field. `null` where the field is not a number in state. */
function scalarOf(scenario: ScenarioDraft, field: FieldId): number | null {
  const { geometry, anchors, rider, tightness, terminations, material } = scenario;
  switch (field) {
    case "L":
      return geometry.source === "manual" ? geometry.L : null;
    case "h":
      return geometry.source === "manual" ? geometry.h : null;
    case "sa":
      return geometry.source === "trace" ? geometry.sa : null;
    case "sb":
      return geometry.source === "trace" ? geometry.sb : null;
    case "zA":
      return anchors.zA;
    case "zB":
      return anchors.zB;
    case "mp":
      return rider.mp;
    case "hRider":
      return rider.hRider;
    case "hClearMin":
      return rider.hClearMin;
    case "DAF":
      return rider.DAF;
    case "xD":
      return rider.xD;
    case "etaA":
      return terminations.A.eta;
    case "etaB":
      return terminations.B.eta;
    case "D_target":
      return tightness.mode === "sag" ? tightness.D_target : null;
    case "H_target":
      return tightness.mode === "tension" ? tightness.H_target : null;
    case "L0":
      return tightness.mode === "length" ? tightness.L0 : null;
    case "d":
      return material.family === "steel" ? material.d : null;
    case "MBL":
      return material.family === "textile" ? material.MBL : null;
    case "muTextile":
      return material.family === "textile" ? material.mu : null;
    case "k":
      return material.family === "textile" ? material.k : null;
    case "mbfOverride":
      return material.family === "steel" ? (material.overrides?.MBF ?? null) : null;
    case "eaOverride":
      return material.family === "steel" ? (material.overrides?.EA ?? null) : null;
    case "muOverride":
      return material.family === "steel" ? (material.overrides?.mu ?? null) : null;
    default:
      return null;
  }
}
