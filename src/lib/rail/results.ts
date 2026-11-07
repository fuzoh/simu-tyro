/**
 * The Rail's **output half**, as data — « v1 build spec » § 6 (*Les treize valeurs rapportées*,
 * *Discipline de portée*, *Le verdict juge l'enveloppe dynamiquement majorée*, *La grille critères
 * × extrémités*, *Cinq états de verdict*, *La marge est un facteur de sécurité effectif*) and § 9
 * (*« Résultats sans régime » — the reduced row set*).
 *
 * **There is no results panel.** The Rail is one scrolling column with an input half and an output
 * half; § 6 corrects the source ticket's name and forbids reviving it in an identifier, a comment
 * or a file name. Hence `results.ts` beside `deduced.ts`, and the split between the two is one
 * question: **is the rider involved?**
 *
 * Rules this module exists to keep:
 *
 * - **« — » belongs to `Indéterminé` alone.** A row that is *absent* renders nothing at all: no
 *   dash, no blank, no zero. Three tickets spent effort keeping that glyph unambiguous — *tenté,
 *   indisponible* — and a « consistency » pass that dashes empty cells undoes all three. Nothing in
 *   this module ever emits « — »; a row that cannot be reported is simply not in {@link Results}.
 * - **The headline `T max` is the DAF-amplified envelope, never the static one**, because
 *   `FS effectif` divides by it. A headline of 817 daN beside a printed 8,80 lets a reader compute
 *   `0,9·9074/817 = 10,00` and find the app contradicting itself — a *reconciliation* failure that
 *   is invisible in the exact state that ships, since a régime-less screen prints no `FS effectif`.
 *   The static envelope is a **detail row**, with the amplification beside it.
 * - **Margin reads as `FS effectif` against the required `k`, never a percentage utilisation.**
 *   Percent recruits the « 80 %, ça va » heuristic from engineering contexts with far more design
 *   margin than a zip line sized on paywalled constants. The absolute réserve in daN is the detail
 *   row, because that is the form that answers « combien puis-je encore tendre » with no arithmetic.
 * - **The verdict grammar is a mechanism, not copy taste.** It never says « conforme » / « non
 *   conforme », and it **always names the chosen régime inside the sentence**, so the claim is about
 *   the rule the user picked rather than about the law. That, the five states and « ce que cet outil
 *   ne calcule pas » are the three things that keep the app from reading as an attestation.
 * - **Scope discipline: traversée against position.** « Garde min (traversée) » and the read-out
 *   row's « Garde min. ligne (à x 101 m) » are two different numbers under near-identical labels, and
 *   only the first is what the verdict judges. Three redundant channels carry the distinction, and
 *   this module owns two of them: the section's « sur toute la traversée » and the `(traversée)`
 *   parenthesis on each label. The third — « à la position du passager » — is the read-out row's.
 *   The row's own label gained `ligne` with **amendment M** (ticket 41), which widens the gap between
 *   the two rather than touching either channel here: `ligne` reduces over `x`, `traversée` over
 *   `x_P`.
 *   The aggregates additionally **name the rider position that produced them**, which is what keeps
 *   the strip's number and the Rail's readable as two answers to two questions. Since ticket 37 put
 *   §11's scan on the rider's own node the two *coincide* on the opening screen (2,42 m either
 *   way); away from `x_D` 75 they part by metres, which is what the qualifier exists for.
 * - **The grid's empty cells are legitimate.** `T adm` is per end because `η_t` is; the
 *   suspended-load criterion is **one cell** whose numerator is `min(η_A, η_B)·MBF` — written out,
 *   because an implementer reading « FS ≥ 5 sur charge suspendue » alone writes `MBF/P`, scores 77
 *   and ships a criterion that can never bind. The 2× proof test is an obligation with no cells at
 *   all, and it is why a verdict can never claim conformity.
 *
 * Everything here is a pure function of the Scenario and the already-solved scene, so the whole
 * output half is a `node` test with no DOM in the room (amendment A). The strings are the spec's
 * and the numbers all go through § 3's one display-precision table.
 */

import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type {
  CellState,
  ClearanceResult,
  DerivedMaterial,
  SpanState,
  SweepResult,
  VerdictCell,
  VerdictResult,
  VerdictState,
} from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { formatQuantity, formatValue } from "@/lib/format/quantity.ts";
import { amplifiedTension, evaluateVerdict, REGIMES, scanTensionEnvelope } from "@/lib/sim";

import type { GateReport } from "./gates.ts";

import { evaluateGates } from "./gates.ts";

/** § 6's thirteen reported values, by id. Four are headline; the other nine are detail rows. */
export type ResultRowId =
  | "verdict"
  | "FS"
  | "Tmax"
  | "clearance"
  | "reserve"
  | "TadmA"
  | "TadmB"
  | "TmaxA"
  | "TmaxB"
  | "Tstatic"
  | "amplification"
  | "loadedSag"
  | "coverage";

/**
 * One reported value. **A row that cannot be reported is absent from the list** — there is no
 * « — » and no empty value here.
 */
export type ResultRow = {
  readonly id: ResultRowId;
  /** Carries § 6's `(traversée)` parenthesis wherever the quantity is a traverse aggregate. */
  readonly label: string;
  readonly value: string;
  /** « ancrage A, passager à x 74,4 m », « exigé 3,0 », « (η 0,90 · MBF / k) » — never a warning. */
  readonly qualifier: string | null;
  /** § 6's « quatre en tête, aucun accordéon »: a larger body at the top of the same block. */
  readonly rank: "headline" | "detail";
  /** « ↳ majoration dynamique » hangs under « T max statique ». */
  readonly indent: boolean;
  /**
   * « hors-limites » on the one row that carries its own threshold — « Garde min (traversée) »
   * under « Garde min. admise » (2026-09-23). `null` everywhere else: the tension rows are judged
   * by the verdict, not row by row.
   */
  readonly state: CellState | null;
};

/** One cell of the criteria × ends grid. `end: null` **is** the suspended-load cell. */
export type ResultGridCell = {
  readonly end: "A" | "B" | null;
  /** `η_end·MBF/k`. **`null` on the suspended-load cell**, which has no per-end allowable. */
  readonly Tadm: string | null;
  readonly FS: string;
  readonly state: CellState;
  /** Does the banner name this cell? Exactly one cell per grid, or none under a refusal. */
  readonly governing: boolean;
};

/** One row of the grid: a criterion, its divisor, its written formula and its cells. */
export type ResultGridRow = {
  readonly id: "tension-totale" | "charge-suspendue" | "essai-de-charge-2x";
  /** « Tension totale — k = 3,0 » / « Charge suspendue — FS ≥ 5,0 » / « Essai de charge 2× ». */
  readonly label: string;
  /** **Written out**, numerator included — the repair § 6 made at assembly. */
  readonly formula: string;
  /** The formula's two halves as numbers, on the criterion that needs them. */
  readonly detail: string | null;
  /** Empty on the obligation row, which is what « (vide) (vide) → non évalué » means. */
  readonly cells: readonly ResultGridCell[];
  /** « non évalué » — an obligation this app cannot check, carried rather than dropped. */
  readonly note: string | null;
};

/** § 8's rank-4 banner occupant, decided here and **placed** by A11. */
export type VerdictBanner = {
  readonly state: VerdictState;
  readonly text: string;
};

/** § 9's plain-text line that replaces the four `k`-dependent rows. */
export type RegimePrompt = {
  readonly before: string;
  /** The emphasised phrase focuses the picker — and it is the only affordance here. */
  readonly emphasis: string;
  readonly after: string;
};

/** Everything the Rail's `Résultats` block renders. */
export type Results = {
  /** « sur toute la traversée » — channel one of § 6's three scope signals. */
  readonly scope: string;
  /** « aucun régime choisi », beside the scope label, or `null`. */
  readonly aside: string | null;
  /** § 6's thirteen, minus whatever is absent. Headline rows first, in table order. */
  readonly rows: readonly ResultRow[];
  /** Absent — **not dashed** — with no régime: one gate suppresses the banner and the grid alone. */
  readonly grid: readonly ResultGridRow[];
  /** Set **only** in « Résultats sans régime ». */
  readonly prompt: RegimePrompt | null;
  /** `null` with no régime: nothing was attempted, so this is emphatically not `Indéterminé`. */
  readonly banner: VerdictBanner | null;
  /** The engine's own verdict, for a caller that needs more than the rendered rows. */
  readonly verdict: VerdictResult | null;
};

/** Channel one of the scope discipline: the block header, above every row. */
export const TRAVERSE_SCOPE = "sur toute la traversée";

/** Channel two, on the header, so the reduction and the scope read in one glance. */
export const NO_REGIME_ASIDE = "aucun régime choisi";

/**
 * § 9's replacement for the four `k`-dependent rows — **one plain-text line, no second button**:
 * `[ Choisir un régime ]` already lives in the banner, and two identical buttons 200 px apart is
 * the warning wall the parameter model refused.
 */
export const REGIME_PROMPT: RegimePrompt = {
  before:
    "FS effectif, réserve de tension et T admissible aux ancrages A et B dépendent du régime — choisissez un ",
  emphasis: "régime de sécurité",
  after: ".",
};

/**
 * § 8's neutral strip — **no colour and no icon**, deliberately not the verdict's chrome, because
 * colouring the absence of a judgement would be a judgement. A11 places it at rank 4 beside the
 * `[ Choisir un régime ]` button, which is the discovery path a neutral strip needs.
 */
export const NO_REGIME_BANNER = "Choisissez un régime de sécurité pour obtenir un verdict.";

/**
 * The solved traverse {@link deriveResults} reports — the fields of the chart's `SceneBase` it
 * reads, typed here so `lib/rail` does not depend on `lib/chart`.
 */
export type SolvedTraverse = {
  readonly L: number;
  readonly h: number;
  /** The unloaded line — `T_vide` at both ends. */
  readonly unloaded: SpanState;
  readonly material: DerivedMaterial;
  readonly traverse: SweepResult;
  readonly clearance: ClearanceResult;
};

/** What {@link deriveResults} reads. The scene is already solved: this module never solves. */
export type ResultsInput = {
  readonly scenario: TraverseScenario;
  /** The active profile, or `null` in manual mode — the Solve Gate's stations read it. */
  readonly trace: Trace | null;
  /**
   * The scenario's half of the scene — the sweep, the unloaded solve and §11, computed **once**
   * behind the `useSweep` seam and shared with the Chart Block. `null` is « Aucun résultat ».
   */
  readonly base: SolvedTraverse | null;
  /**
   * The **standing** gate report, from the app root — the one the banner and the charts read, over
   * the Scenario **and** the text the form currently holds. Omitted, the gates are evaluated over
   * the Scenario alone, which is what a link arrival and every `node` test have: a Scenario of
   * numbers cannot hold an emptied field or « 12,3,4 », so with no form in the room the two agree.
   *
   * It is a parameter rather than a second `evaluateGates` call because a committed-invalid « −5 »
   * lives in the **form** and never reaches the Scenario — re-deriving here would keep printing a
   * verdict under a banner that says there is none.
   */
  readonly report?: GateReport;
};

/**
 * The Rail's output half.
 *
 * @returns `null` for « Aucun résultat » — no scene, or a Solve Gate breach. The cause line that
 *   replaces the block in that state is A11's, and it is a *sentence*, never a set of dashes.
 */
export function deriveResults({ scenario, trace, base, report }: ResultsInput): Results | null {
  const gates = report ?? evaluateGates({ scenario, trace });
  if (base === null || !gates.passed.solve) return null;

  const { unit } = scenario;
  const strengthLabel = scenario.material.family === "steel" ? "MBF" : "MBL";
  const { DAF } = scenario.rider;
  // A `DAF` the Verdict Gate has already refused may not be multiplied into a printed envelope: at
  // `daf=-1` — a value a link can carry — `T_vide + DAF·(T − T_vide)` reads *below* the standing
  // tension, which is the one direction that kills. § 7 removes the banner and the grid on a
  // Verdict Gate breach; the amplified rows go with them when it is the `DAF` that is broken, and
  // « T max statique » stays, because that row needs no `DAF` at all.
  const amplify = Number.isFinite(DAF) && DAF > 0;

  const envelope = envelopes(base, DAF);
  const headlineEnd = envelope.headline;
  const rows: ResultRow[] = [];
  const verdict =
    gates.passed.verdict && scenario.regime !== null
      ? evaluateVerdict({
          steps: base.traverse.steps,
          coverage: base.traverse.coverage,
          Tvide: { TA: base.unloaded.TA, TB: base.unloaded.TB },
          DAF,
          regime: scenario.regime,
          eta: { A: scenario.terminations.A.eta, B: scenario.terminations.B.eta },
          strength: base.material.strength,
          usage: scenario.usage,
          terminations: { A: scenario.terminations.A.id, B: scenario.terminations.B.id },
          family: scenario.material.family,
          // **No `sagRatio`**: § 6's two taut-line warnings are scored beside the rows they qualify
          // — `flèche / portée` and the `DAF` figure — and both must fire *without* a régime, so
          // `./provenance.ts`'s ladder owns them. Passing it here would render each one twice.
        })
      : null;

  const banner = verdict === null ? null : { state: verdict.state, text: verdictSentence(verdict) };

  // ── The four headline rows ────────────────────────────────────────────────────────────────
  if (banner !== null && verdict !== null) {
    rows.push(row("verdict", "Verdict", banner.text, null, "headline"));
    const required = requiredDivisor(verdict);
    rows.push(
      row(
        "FS",
        "FS effectif",
        formatQuantity("FS", verdict.ends[verdict.headline.end].FS),
        required === null ? null : `exigé ${divisor(required)}`,
        "headline",
      ),
    );
  }

  if (amplify) {
    rows.push(
      row(
        "Tmax",
        "T max (traversée)",
        formatQuantity("Tdaf", envelope[headlineEnd].Tdaf, unit),
        qualify(`ancrage ${headlineEnd}`, riderAt(base, envelope[headlineEnd].atStepIndex)),
        "headline",
      ),
    );
  }

  // A Clearance Gate breach removes the garde **and its curve alone** — the cable still draws and
  // every tension row stands. That is the whole reason the three gates are three.
  if (gates.passed.clearance) {
    const breach = clearanceBreached(base.clearance.hMin, scenario.rider.hClearMin);
    rows.push({
      ...row(
        "clearance",
        "Garde min (traversée)",
        formatQuantity("clearance", base.clearance.hMin),
        qualify(
          breach
            ? `sous la garde admise ${formatQuantity("h_clear_min", scenario.rider.hClearMin)}`
            : null,
          riderAt(base, base.clearance.atStepIndex),
        ),
        "headline",
      ),
      state: breach ? "hors-limites" : null,
    });
  }

  // ── The nine detail rows ──────────────────────────────────────────────────────────────────
  if (verdict !== null && verdict.reserve !== null) {
    rows.push(
      row(
        "reserve",
        "Réserve de tension",
        signed("tensionReserve", verdict.reserve.value, unit),
        `avant T adm (ancrage ${verdict.reserve.end})`,
        "detail",
      ),
    );
  }

  if (verdict !== null) {
    for (const end of ["A", "B"] as const) {
      const Tadm = verdict.cells.find((cell) => cell.end === end)?.Tadm ?? null;
      if (Tadm === null) continue;
      rows.push(
        row(
          end === "A" ? "TadmA" : "TadmB",
          `T adm ancrage ${end}`,
          formatQuantity("Tadm", Tadm, unit),
          `(η ${formatValue("eta", scenario.terminations[end].eta)} · ${strengthLabel} / k)`,
          "detail",
        ),
      );
    }
  }

  if (amplify) {
    for (const end of ["A", "B"] as const) {
      rows.push(
        row(
          end === "A" ? "TmaxA" : "TmaxB",
          `T max ancrage ${end}`,
          formatQuantity("Tdaf", envelope[end].Tdaf, unit),
          null,
          "detail",
        ),
      );
    }
  }

  // **The static envelope is picked by the static ordering**, not by the amplified one. The two
  // agree on any line the app can draw — the higher-tension anchor is the higher-tension anchor
  // whatever `DAF` multiplies it by — except at the `DAF ≤ 0` a link can carry, where the amplified
  // ordering *inverts*: the row that survives the Verdict Gate breach would then report the lesser
  // anchor under the other one's name, understating the one tension number left on screen.
  const staticEnd = envelope.staticHeadline;
  rows.push(
    row(
      "Tstatic",
      "T max statique",
      formatQuantity("Tstatic", envelope[staticEnd].Tstatic, unit),
      `ancrage ${staticEnd}`,
      "detail",
    ),
  );
  if (amplify) {
    rows.push({
      id: "amplification",
      label: "↳ majoration dynamique",
      // Decomposition of the row above it, so it hangs off the **same** end that row reports.
      value: signed("Tdaf", envelope[staticEnd].Tdaf - envelope[staticEnd].Tstatic, unit),
      qualifier: `(DAF ${formatValue("DAF", DAF)})`,
      rank: "detail",
      // The one indented row in the block: it is a decomposition of the row above it, not a
      // fourteenth quantity.
      indent: true,
      state: null,
    });
  }

  rows.push(
    row(
      "loadedSag",
      "Flèche chargée max",
      formatQuantity("loadedSag", loadedSag(base)),
      null,
      "detail",
    ),
  );
  rows.push(row("coverage", "Couverture", coverageValue(base), null, "detail"));

  // **« Résultats sans régime » is keyed on the régime, never on the verdict.** § 6: « Une sixième
  // situation n'est pas un état : avec aucun régime choisi le bandeau est absent et remplacé par
  // une invite — rien n'a été tenté. » A Verdict Gate breach is *not* that situation: a régime was
  // chosen and something was attempted, so telling the user to choose one contradicts the picker
  // beside it and the régime the aggregate has pinned 100 px below. It also keeps A11's « aucun
  // verdict » banner from landing directly above an invitation that denies it.
  const noRegime = scenario.regime === null;

  return {
    scope: TRAVERSE_SCOPE,
    aside: noRegime ? NO_REGIME_ASIDE : null,
    rows,
    // **Five things absent, not four**: the criteria × ends grid goes with the four rows, because
    // one gate suppresses both — and that suppression *is* keyed on the verdict, since a Verdict
    // Gate breach removes exactly the banner and the grid.
    grid: verdict === null ? [] : gridOf(verdict, strengthLabel, unit),
    prompt: noRegime ? REGIME_PROMPT : null,
    banner,
    verdict,
  };
}

/**
 * § 6's five states, one sentence each — **never « conforme » / « non conforme », and the chosen
 * régime is named inside the sentence** wherever the sentence is a claim about limits.
 *
 * The two states that name no régime are the two that make no such claim: a refusal is a
 * prohibition that survives any margin (naming a régime there would suggest another régime could
 * repair it), and `Indéterminé` reports that nothing was judged at all.
 */
export function verdictSentence(verdict: VerdictResult): string {
  const label = REGIMES[verdict.regime].label;

  if (verdict.state === "refuse-usage-interdit") {
    return `Refusé — ${REFUSAL_COPY[verdict.refusal ?? "serre-cables-sur-ligne-portant-des-personnes"]}`;
  }
  if (verdict.state === "indetermine") {
    const total = verdict.coverage === 0 ? 0 : Math.round(verdict.stepsSolved / verdict.coverage);
    return `Indéterminé — ${verdict.stepsSolved} des ${total} pas résolus`;
  }

  const cell = verdict.governing;
  if (cell === null) return `Indéterminé — ${verdict.stepsSolved} pas résolus`;

  if (verdict.state === "hors-limites") {
    return `Hors limites — ${label}, critère ${criterionName(cell)}`;
  }
  if (verdict.state === "marge-faible") {
    // § 6's own copy reads « Marge faible — FS effectif 3,05 pour k = 3,0 » and names no régime;
    // the grammar rule — « nomme **toujours** le régime choisi à l'intérieur de la phrase » — is
    // the mechanism, and it is the stricter of the two. Hence the régime, then the spec's clause.
    return `Marge faible — ${label} : FS effectif ${formatQuantity("FS", cell.FS)} pour k = ${divisor(cell.k)}`;
  }
  return `Dans les limites — ${label} (k = ${divisor(cell.k)})`;
}

/**
 * The `k` the headline `FS effectif` is printed against — **the divisor of the criterion that
 * figure belongs to**, which is total tension and nothing else.
 *
 * `EndEnvelope.FS` is `η·MBF/T_DAF`: a *total-tension* ratio, régime-independent by construction.
 * Reading the divisor off `verdict.governing` instead pairs it with whichever cell scores worst,
 * and under WorkSafe QLD the suspended-load cell can govern while total tension passes — the
 * headline then reads « 3,15 · exigé 5,0 » against a grid whose own total-tension cell scores 4,x.
 * That is exactly the *reconciliation* failure § 6 spends a page preventing on `T max`: a reader
 * who divides finds the app contradicting itself. The banner still names the governing cell — the
 * two answer different questions, and only this row is a ratio the reader can re-derive.
 *
 * It is also what keeps the row whole under `Refusé` and `Indéterminé`, where `governing` is `null`
 * **by contract** while a régime is very much chosen: § 6 defines the headline as « `FS effectif`
 * …, affiché contre le `k` exigé par le régime », and a lone safety factor invites the reader to
 * supply their own `k`. The cells survive both states, and `REGIMES` covers the empty traverse.
 *
 * @returns `null` only for a régime with no total-tension criterion — none of § 6's five, but the
 *   row then drops its qualifier rather than inventing one.
 */
function requiredDivisor(verdict: VerdictResult): number | null {
  const cells = verdict.cells.filter((cell) => cell.criterion === "tension-totale");
  const cell = cells.find((candidate) => candidate.end === verdict.headline.end) ?? cells[0];
  if (cell !== undefined) return cell.k;
  const criterion = REGIMES[verdict.regime].criteria.find(
    (candidate) => candidate.basis === "tension-totale",
  );
  return criterion?.k ?? null;
}

/** § 6's three refusals, each a `[REGULATOR]` rule or a use-class boundary — never a margin. */
const REFUSAL_COPY = {
  "serre-cables-sur-ligne-portant-des-personnes":
    "serre-câbles sur une ligne portant des personnes",
  "textile-en-installation-permanente": "corde textile en installation permanente (§10.4)",
  "regime-indisponible-pour-cette-ligne": "régime indisponible pour cette ligne",
} as const;

/** Which quantity a criterion bites on — « lequel est contraignant est une information ». */
function criterionName(cell: VerdictCell): string {
  if (cell.criterion === "charge-suspendue") return "charge suspendue";
  return cell.end === null ? "tension totale" : `tension totale (ancrage ${cell.end})`;
}

/**
 * The criteria × ends grid. Two shapes, and the difference is § 6's whole point: `T adm` is per end
 * because `η_t` is, while the suspended-load criterion renders **one** number — a line fails at its
 * weakest termination, so one criterion cannot honestly report two margins.
 */
function gridOf(
  verdict: VerdictResult,
  strengthLabel: string,
  unit: ScenarioDraft["unit"],
): ResultGridRow[] {
  const rows: ResultGridRow[] = [];
  const governing = verdict.governing;

  const total = verdict.cells.filter((cell) => cell.criterion === "tension-totale");
  if (total.length > 0) {
    rows.push({
      id: "tension-totale",
      label: `Tension totale — k = ${divisor(total[0].k)}`,
      formula: `T adm = η · ${strengthLabel} / k — FS = η · ${strengthLabel} / T max majoré`,
      detail: null,
      cells: total.map((cell) => gridCell(cell, governing, unit)),
      note: null,
    });
  }

  const suspended = verdict.cells.find((cell) => cell.criterion === "charge-suspendue");
  if (suspended !== undefined) {
    const halves = verdict.suspendedLoad;
    rows.push({
      id: "charge-suspendue",
      label: `Charge suspendue — FS ≥ ${divisor(suspended.k)}`,
      // **Written out, numerator included.** Read as `MBF / P` — the natural misreading of « FS ≥ 5
      // sur charge suspendue » — this criterion scores 77 on the shipped line and can never bind,
      // which silently deletes the two-criterion régime WorkSafe QLD exists to be.
      formula: `min(η_A, η_B) · ${strengthLabel} / max[ DAF · (T chargé − T à vide) ]`,
      detail:
        halves === null
          ? null
          : `${formatQuantity("Tadm", halves.numerator, unit)} / ${formatQuantity(
              "Tadm",
              halves.denominator,
              unit,
            )} — une seule cellule, pas par extrémité`,
      cells: [gridCell(suspended, governing, unit)],
      note: null,
    });
  }

  for (const obligation of verdict.obligations) {
    rows.push({
      id: obligation,
      label: "Essai de charge 2×",
      formula: "",
      detail: null,
      // No cells at all — and this is why a verdict can never claim conformity.
      cells: [],
      note: "non évalué",
    });
  }

  return rows;
}

function gridCell(
  cell: VerdictCell,
  governing: VerdictCell | null,
  unit: ScenarioDraft["unit"],
): ResultGridCell {
  return {
    end: cell.end,
    Tadm: cell.Tadm === null ? null : formatQuantity("Tadm", cell.Tadm, unit),
    FS: formatQuantity("FS", cell.FS),
    state: cell.state,
    governing:
      governing !== null && governing.criterion === cell.criterion && governing.end === cell.end,
  };
}

/** One end's tension envelope over the traverse, in the two forms § 6 prints. */
type EndFigures = {
  /** The greatest **static** tension over the traverse, N. */
  readonly Tstatic: number;
  /** `T_vide + DAF·(T_chargé − T_vide)`, N — the figure `FS effectif` divides by. */
  readonly Tdaf: number;
  readonly atStepIndex: number;
};

/** Both ends' envelopes, and which of them each of the two headline forms reports. */
type Envelope = {
  readonly A: EndFigures;
  readonly B: EndFigures;
  /** The worst **amplified** end — § 6's headline « T max », the figure `FS effectif` divides by. */
  readonly headline: "A" | "B";
  /** The worst **static** end — « T max statique », which owes `DAF` nothing and must not read it. */
  readonly staticHeadline: "A" | "B";
};

/**
 * The traverse's envelope per end, plus which end carries the headline.
 *
 * **This is the one place the app amplifies a tension**, and it exists because § 9's reduced row
 * set prints `T max` **with no régime chosen**, where `evaluateVerdict` — which owns the same
 * arithmetic — is by contract not called at all. The **scan** is no longer a second copy: since
 * ticket 38 it is `scanTensionEnvelope`, the engine's own single pass, so what the app still owns
 * here is the presentation choice — which end each of the two headlines names — and nothing about
 * where the maximum sits.
 *
 * `T_DAF` is monotone in `T_chargé` for `DAF > 0`, so the amplified maximum sits at the same step
 * as the static one and the scan needs one pass. At `DAF ≤ 0` — a value a link can carry — the two
 * orderings part, which is why `staticHeadline` is picked on `Tstatic` and never through `Tdaf`.
 */
function envelopes(base: SolvedTraverse, DAF: number): Envelope {
  const Tvide = { A: base.unloaded.TA, B: base.unloaded.TB };
  // §10.1's suspended denominator rides along on the same pass and is dropped here: § 9 never
  // prints it, and at a refused `DAF ≤ 0` it is a maximum of negatives with no meaning to print.
  const scan = scanTensionEnvelope(base.traverse.steps, base.unloaded, DAF);

  const A: EndFigures = {
    Tstatic: scan.A.Tstatic,
    Tdaf: amplifiedTension(Tvide.A, scan.A.Tstatic, DAF),
    atStepIndex: scan.A.atStepIndex,
  };
  const B: EndFigures = {
    Tstatic: scan.B.Tstatic,
    Tdaf: amplifiedTension(Tvide.B, scan.B.Tstatic, DAF),
    atStepIndex: scan.B.atStepIndex,
  };
  return {
    A,
    B,
    headline: A.Tdaf >= B.Tdaf ? "A" : "B",
    staticHeadline: A.Tstatic >= B.Tstatic ? "A" : "B",
  };
}

/**
 * « Garde min. admise » — does the traverse minimum fall under the user's threshold? A threshold of
 * `0` (or less, which a link can carry) disables the check: nothing is judged against no bound.
 * Shared by the Rail's headline row and the read-out cell so the two cannot disagree.
 */
export function clearanceBreached(hMin: number, hClearMin: number): boolean {
  return hClearMin > 0 && Number.isFinite(hMin) && hMin < hClearMin;
}

/**
 * « Flèche chargée max » — the deepest the loaded line hangs below the A–B chord over the
 * traverse, which is the rider's own node: the kink is the low point of a loaded catenary.
 */
function loadedSag(base: SolvedTraverse): number {
  let deepest = 0;
  for (const step of base.traverse.steps) {
    const drop = (base.h * step.xD) / base.L - step.zD;
    if (drop > deepest) deepest = drop;
  }
  return deepest;
}

/**
 * « 260 / 260 pas ». The denominator is **`grid.length`**, not `SWEEP_STEPS`: the grid is 240
 * uniform steps plus 10 geometric tail steps per end, so a fully solved traverse printed against
 * 240 would read 260/240.
 */
function coverageValue(base: SolvedTraverse): string {
  const solved = base.traverse.steps.length;
  return `${formatValue("coverage", solved)} / ${formatValue("coverage", base.traverse.grid.length)} pas`;
}

/**
 * « les agrégats nomment la position du passager qui les produit » — the cheap addition that does
 * most of the scope discipline's work: « Garde min. ligne 2,42 m — passager à x 74,4 m » says which
 * question the number answered, so the strip's own reading at `x_D` 75,0 is a second answer rather
 * than a rounding bug. On the opening screen the two agree to 0,3 mm since ticket 37; at ancrages
 * 12 / 20 with the rider at the far anchor they read 7,22 m and 17,90 m.
 *
 * @returns `null` where the traverse has no such step — **never a « — »**, which is spent on
 *   `Indéterminé`. An absent position simply drops the clause.
 */
function riderAt(base: SolvedTraverse, stepIndex: number): string | null {
  const step = base.traverse.steps[stepIndex];
  return step === undefined ? null : `passager à x ${formatValue("extremumX", step.xD)} m`;
}

/** Joins a qualifier's two optional clauses without ever leaving a dangling comma. */
function qualify(head: string | null, tail: string | null): string | null {
  const parts = [head, tail].filter((part) => part !== null);
  return parts.length === 0 ? null : parts.join(", ");
}

/**
 * A signed reading, with the `+` § 6 prints on the réserve and on the amplification.
 * {@link formatValue} carries the minus on its own, so only the positive sign is added here.
 */
function signed(id: "tensionReserve" | "Tdaf", value: number, unit: ScenarioDraft["unit"]): string {
  const shown = formatQuantity(id, value, unit);
  return value > 0 ? `+${shown}` : shown;
}

/**
 * A régime's divisor — « k = 3,0 » and « exigé 3,0 », the two forms § 6 prints in a sentence.
 * Renders through § 3's table like every other quantity, under its own id `regimeK` — kept
 * distinct from the textile relative stiffness `k` that table already names. This wrapper exists
 * only so the five call sites read `divisor(k)` rather than repeating the id.
 */
function divisor(k: number): string {
  return formatValue("regimeK", k);
}

function row(
  id: ResultRowId,
  label: string,
  value: string,
  qualifier: string | null,
  rank: "headline" | "detail",
): ResultRow {
  return { id, label, value, qualifier, rank, indent: false, state: null };
}
