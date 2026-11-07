/**
 * §10's safety framework — `docs/simulation-theory.md` §10.1 (the régimes and
 * `T_allow = η_t·MBF/k`), §10.2 (termination efficiency and the grips prohibition), §10.3 (knots
 * on textile) and §10.4 (the use-class gate), with §8.2's dynamic amplification as the envelope
 * the verdict judges. The five verdict states, the criteria × ends grid and the rows they feed
 * are fixed by « v1 build spec » § 6 — *sorties, verdict de sécurité et provenance*.
 *
 * **No number here is transcribed from `docs/references/`** — §14 records which of their worked
 * examples are fabricated, and three of §10.1's four rows are `[PAYWALLED]` or `[CONVENTION]`.
 * Every constant below is quoted from §10 or from a resolved ticket's measurement.
 *
 * Rules this module exists to keep:
 *
 * - **A régime is a rule set, not a `k`.** §10 is titled *regulatory — not tunable* and §10.1
 *   forbids blending, so the five entries are **ordered lists of criteria**, each with its own
 *   divisor, its own base and its own confidence tag, plus obligations this app cannot evaluate.
 *   **There is no free `k` anywhere** — not a field, not a parameter, not a default: a typed `k`
 *   is blending with extra steps. WorkSafe QLD is the reason the shape has to be a list: its two
 *   criteria bite on **different quantities**, and *which one binds* is information the user
 *   wants (a slack line is governed by the suspended load, a taut line by total tension).
 * - **The verdict judges the DAF-amplified envelope, per sweep step, per end.**
 *   `T_DAF = T_vide + DAF·(T_chargé − T_vide)` is §8.2's `pretension + DAF × suspended load`
 *   exactly, and it needs nothing from §8.3's paywalled load combination. `T_vide` is **one**
 *   unloaded solve, not a per-step quantity — a reporting requirement, not an engine change.
 *   Judging the un-amplified envelope was rejected: optimistic in the one direction that kills.
 * - **DAF touches the verdict only, never clearance.** §11's criterion is geometric; a heavier
 *   momentary load does not move the quasi-static sag the rider traverses at. `evaluateClearance`
 *   has no `DAF` parameter and must never grow one.
 * - **Total-tension `FS effectif` is per end** (`η_A·MBF/T_DAF,A`), because `η_t` is per end — one
 *   termination per anchor. **The suspended-load criterion is one cell, not per end**: §10.1's row
 *   is `[REGULATOR]` verbatim and says only « `FS ≥ 5` on suspended load », so the grid's two
 *   end cells are legitimately empty and the criterion renders **one** number. Its numerator is
 *   `min(η_A, η_B)·MBF` — a line fails at its **weakest** termination, so one criterion cannot
 *   honestly report two margins — and dropping `η_t` for bare `MBF` was rejected: it would be the
 *   only place in the app crediting an unterminated rope. Its denominator is
 *   `DAF·(T_chargé − T_vide)`, taken over the steps **and** both ends. Read as `MBF/P` — the
 *   natural misreading — the criterion scores 77 on the shipped line and can never bind, which
 *   silently deletes the two-criterion régime.
 * - **`Refusé — usage interdit` survives an ample margin.** §10.2's « shall not be used where the
 *   rope supports persons » is `[REGULATOR]`, not advice: a line on U-bolt grips reads a
 *   comfortable `FS effectif` and is still refused. It is neither a limits failure nor a warning
 *   above a pass — the latter is the dangerous option, because it is the green that gets read.
 * - **`coverage < 1` suppresses the verdict, it never qualifies it.** The steps that failed are
 *   the ill-conditioned ones, which is where the worst tension lives, so a verdict on the solved
 *   fraction is biased optimistic *by construction*. The cells that did converge stay populated —
 *   § 6 keeps them on screen under the traverse-scope caveat — but `governing` is `null` and the
 *   state is `indetermine`.
 * - **An absent régime never reaches here.** `Régime de sécurité` has no default and « régime
 *   choisi » is struck from the Solve Gate, so the app opens **verdict-less and still computes**:
 *   with no régime this function is *not called*, the banner carries the neutral prompt, and that
 *   state is emphatically **not** `Indéterminé` — « — » stays reserved to `Indéterminé` alone.
 * - **The 2× proof test is an uncomputable obligation**, carried as data rather than dropped:
 *   it is precisely why a verdict can never claim conformity. Likewise the ACCT 5:1 / 10:1
 *   conflict ships as **two adjacent entries** — one entry with a toggle would imply somebody
 *   knows which is right (§14 ledger #10, both `[PAYWALLED]`).
 * - **The engine is dependency-free, synchronous, pure and SI** — forces in newtons, `η` and `FS`
 *   dimensionless. The daN / kN / kgf selector never crosses this boundary.
 */

import type { SweepStep } from "./types.ts";

/** §0.2's trust vocabulary, restricted to the tags §10 and § 3 actually attach to these rows. */
export type ProvenanceTag =
  | "[STD-ATTESTED]"
  | "[REGULATOR]"
  | "[CONVENTION]"
  | "[UNVERIFIED:R1]"
  | "[DATASHEET/CONVENTION]";

/** The five selectable régimes of § 6, spelled as § 8's URL key `reg` carries them. */
export type RegimeId = "en15567" | "wsqld" | "acct10" | "ansi5" | "secours10";

/** The two quantities §10.1's criteria bite on. They are **not** interchangeable bases. */
export type CriterionBasis = "tension-totale" | "charge-suspendue";

/** An obligation the app records and **cannot evaluate** — which is why it can never certify. */
export type ObligationId = "essai-de-charge-2x";

/** One criterion of a régime: a divisor on a named base, with the confidence of its source. */
export type Criterion = {
  readonly basis: CriterionBasis;
  /** The régime's divisor on this base. Fixed by §10.1 — never a field, never a parameter. */
  readonly k: number;
  readonly tag: ProvenanceTag;
};

/**
 * A régime, as §10.1 writes it: a label, a confidence tag, an **ordered** list of criteria and the
 * obligations it imposes that this app cannot check.
 *
 * `requires` is the one availability rule § 6 keeps — « seul *Secours textile 10:1* est désactivé,
 * sous acier ou sous `PERMANENTE` », because that entry presupposes family B and is a category
 * error anywhere else. Everything else stays selectable: EN 15567-1 on a temporary rescue line is
 * conservative, not invalid, and the app has no authority to refuse it.
 */
export type Regime = {
  readonly id: RegimeId;
  /** The picker's own entry text — the verdict grammar **names the régime inside the sentence**. */
  readonly label: string;
  readonly tag: ProvenanceTag;
  readonly criteria: readonly Criterion[];
  readonly obligations: readonly ObligationId[];
  readonly requires: { readonly family: "textile"; readonly usage: "TEMPORAIRE" } | null;
};

/**
 * §10.1's four rows, as the five entries § 6 ships: the ACCT conflict is **two adjacent entries**,
 * `[CONVENTION]` 10:1 beside `[UNVERIFIED:R1]` 5:1, never one entry with a 5/10 toggle.
 *
 * WorkSafe QLD is listed with **total tension first**, which is the grid's own row order, and it
 * is the only entry with two criteria and an obligation.
 */
export const REGIMES = {
  en15567: {
    id: "en15567",
    label: "EN 15567-1",
    tag: "[STD-ATTESTED]",
    criteria: [{ basis: "tension-totale", k: 3, tag: "[STD-ATTESTED]" }],
    obligations: [],
    requires: null,
  },
  wsqld: {
    id: "wsqld",
    label: "WorkSafe QLD 2019",
    tag: "[REGULATOR]",
    criteria: [
      { basis: "tension-totale", k: 3, tag: "[REGULATOR]" },
      { basis: "charge-suspendue", k: 5, tag: "[REGULATOR]" },
    ],
    obligations: ["essai-de-charge-2x"],
    requires: null,
  },
  acct10: {
    id: "acct10",
    label: "ACCT / parcours acrobatique — 10:1",
    tag: "[CONVENTION]",
    criteria: [{ basis: "tension-totale", k: 10, tag: "[CONVENTION]" }],
    obligations: [],
    requires: null,
  },
  ansi5: {
    id: "ansi5",
    label: "ANSI/ACCT 03-2019 — 5:1",
    tag: "[UNVERIFIED:R1]",
    criteria: [{ basis: "tension-totale", k: 5, tag: "[UNVERIFIED:R1]" }],
    obligations: [],
    requires: null,
  },
  secours10: {
    id: "secours10",
    label: "Secours textile — 10:1",
    tag: "[CONVENTION]",
    criteria: [{ basis: "tension-totale", k: 10, tag: "[CONVENTION]" }],
    obligations: [],
    requires: { family: "textile", usage: "TEMPORAIRE" },
  },
} as const satisfies Record<RegimeId, Regime>;

/** §10.2 (steel) and §10.3 / § 3 (textile), one picker entry per id. */
export type TerminationId =
  | "manchon-metal-resine"
  | "cosse-oeil-flamand"
  | "epissure"
  | "manchon-a-coin"
  | "serre-cables-etrier"
  | "oeil-cousu-epissure"
  | "epissure-longue-hmpe"
  | "noeud-de-huit"
  | "noeud-de-chaise"
  | "attelage-sans-tension";

/**
 * One termination. `eta` is the **default** the picker prefills — every §10.2/§10.3 value is a
 * `[CONVENTION]` or a range, so the binding provenance rule makes the field editable and the
 * verdict reads `η` from its input, never from this table. Every range takes its conservative
 * end: 0,90 not 0,95; 0,60 not 0,80.
 */
export type Termination = {
  readonly id: TerminationId;
  /** Which picker lists it. `"both"` is the one hardware-free end every family can rig. */
  readonly family: "steel" | "textile" | "both";
  readonly label: string;
  /** §10.2/§10.3's default efficiency — the picker's prefill, not the verdict's input. */
  readonly eta: number;
  readonly tag: ProvenanceTag;
  /**
   * §10.2's `[REGULATOR]` prohibition, WorkSafe QLD / AS 2076: « shall not be used where the rope
   * supports persons ». Selectable — a defensible `η_t` exists, so the user may model the
   * non-compliant rig they were sent to inspect — and **the verdict refuses it**.
   */
  readonly personProhibited: boolean;
  /**
   * A knot. §10.3 prohibits knots on HMPE — 0,25–0,50 describes a knot that *slips*, so there is
   * no efficiency to multiply by. The picker **disables** the option with that reason rather than
   * erroring: where no number exists there is nothing to compute with, hence nothing to judge.
   */
  readonly knot: boolean;
};

/**
 * §10.2's five steel terminations and § 3's four textile ones, with §10.3's efficiencies — plus
 * « Attelage sans tension », the one end offered to both families (decision of 2026-09-23).
 */
export const TERMINATIONS = {
  "manchon-metal-resine": {
    id: "manchon-metal-resine",
    family: "steel",
    label: "Manchon métal/résine (EN 13411-4)",
    eta: 1,
    tag: "[STD-ATTESTED]",
    personProhibited: false,
    knot: false,
  },
  "cosse-oeil-flamand": {
    id: "cosse-oeil-flamand",
    family: "steel",
    label: "Cosse à sertir / œil Flamand (EN 13411-3)",
    eta: 0.9,
    tag: "[STD-ATTESTED]",
    personProhibited: false,
    knot: false,
  },
  epissure: {
    id: "epissure",
    family: "steel",
    label: "Épissure (EN 13411-2)",
    eta: 0.8,
    tag: "[STD-ATTESTED]",
    personProhibited: false,
    knot: false,
  },
  "manchon-a-coin": {
    id: "manchon-a-coin",
    family: "steel",
    label: "Manchon à coin (EN 13411-6)",
    eta: 0.8,
    tag: "[CONVENTION]",
    personProhibited: false,
    knot: false,
  },
  "serre-cables-etrier": {
    id: "serre-cables-etrier",
    family: "steel",
    label: "Serre-câbles étrier (EN 13411-5)",
    eta: 0.8,
    tag: "[CONVENTION]",
    personProhibited: true,
    knot: false,
  },
  "oeil-cousu-epissure": {
    id: "oeil-cousu-epissure",
    family: "textile",
    label: "Œil cousu / épissuré",
    eta: 0.9,
    tag: "[CONVENTION]",
    personProhibited: false,
    knot: false,
  },
  "epissure-longue-hmpe": {
    id: "epissure-longue-hmpe",
    family: "textile",
    label: "Épissure longue HMPE",
    eta: 0.9,
    tag: "[DATASHEET/CONVENTION]",
    personProhibited: false,
    knot: false,
  },
  "noeud-de-huit": {
    id: "noeud-de-huit",
    family: "textile",
    label: "Nœud de huit (PA)",
    eta: 0.6,
    tag: "[CONVENTION]",
    personProhibited: false,
    knot: true,
  },
  "noeud-de-chaise": {
    id: "noeud-de-chaise",
    family: "textile",
    label: "Nœud de chaise (PA)",
    eta: 0.55,
    tag: "[CONVENTION]",
    personProhibited: false,
    knot: true,
  },
  /**
   * An end **attached without being put under tension** — the line is hitched to its anchor and the
   * attachment itself carries no share of the working load, so nothing reduces the line's breaking
   * strength there: `η = 1`. Decision of 2026-09-23 (repo owner), not a §10.2/§10.3 value, hence
   * `[CONVENTION]`. Offered under both families, and editable like every other `η`.
   */
  "attelage-sans-tension": {
    id: "attelage-sans-tension",
    family: "both",
    label: "Attelage sans tension",
    eta: 1,
    tag: "[CONVENTION]",
    personProhibited: false,
    knot: false,
  },
} as const satisfies Record<TerminationId, Termination>;

/** §10's three thresholds. Not tunable, and deliberately not five: each is quoted, not chosen. */
export const VERDICT = {
  /**
   * `Marge faible` fires at `FS_eff < 1,1·k`. A line at 3,05 against `k = 3,0` has no margin left
   * for the coefficients this tool admits it does not know — so it is **not** green with a note.
   */
  lowMarginFactor: 1.1,
  /**
   * §8.2's stiffening threshold on `flèche / portée`. Below it the line stiffens *and* the DAF's
   * own measurement regime — a controlled step-off on a taut line — no longer describes it, which
   * is why one condition raises **two** warnings.
   */
  sagRatioWarning: 0.03,
  /**
   * §9.2's creep cap on standing tension, textile only: keep a textile line below 30 % MBL. It is
   * a **service-life** bound, not a strength one — the strength claim is the verdict's.
   */
  standingTensionCap: 0.3,
} as const;

/**
 * What the verdict needs, and nothing else — « v1 build spec » § 2, *The verdict entry point*.
 *
 * **`family`** is an addition to § 2's code block, for the same reason `SpanInput.strength` is
 * one: §10.4's gate is a *family × usage* rule, and `strength` is `MBF` or `MBL` without saying
 * which. Inferring the family from a termination id was rejected: it would make a use-class refusal
 * depend on a hardware pick, so a textile rope with (impossible) steel terminations would walk
 * through the gate.
 */
export type VerdictInput = {
  /** The solved traverse. The **failed** steps are absent — `coverage` is what reports them. */
  steps: SweepStep[];
  /** `solved / grid.length`. Anything below 1 suppresses the verdict. */
  coverage: number;
  /** **One** unloaded solve, per end, N — not a per-step quantity. */
  Tvide: { TA: number; TB: number };
  /** §8.2's dynamic amplification factor; 1,2 is the `[FIELD:SSF]` step-off ceiling. */
  DAF: number;
  /** The chosen régime. An **absent** régime never reaches here — see the module docblock. */
  regime: RegimeId;
  /** Termination efficiency per end, dimensionless — one picker per anchor, editable. */
  eta: { A: number; B: number };
  /** `MBF` (steel) or `MBL` (textile), N. */
  strength: number;
  /** §10.4's use class. `PERMANENTE` is the restrictive branch. */
  usage: "PERMANENTE" | "TEMPORAIRE";
  /** Which anchor carries what — read for §10.2's prohibition, never for `η`. */
  terminations: { A: TerminationId; B: TerminationId };
  /** §10.4's other half: `PERMANENTE` ⇒ steel only. */
  family: "steel" | "textile";
};

/** The three states a **cell** can hold. The other two verdict states are properties of the line. */
export type CellState = "dans-les-limites" | "marge-faible" | "hors-limites";

/**
 * § 6's five states, because each maps a different user action: do nothing · increase the margin ·
 * change the design · change the hardware · no figure is available.
 */
export type VerdictState = CellState | "refuse-usage-interdit" | "indetermine";

/** Why a line is refused. Each is a `[REGULATOR]` rule or a use-class boundary, never a margin. */
export type RefusalId =
  /** §10.2 — U-bolt grips on a line that supports persons. Survives an ample margin. */
  | "serre-cables-sur-ligne-portant-des-personnes"
  /** §10.4 — family B is disqualified for permanent public attractions. */
  | "textile-en-installation-permanente"
  /** § 6 — « Secours textile 10:1 » presupposes family B under a temporary use class. */
  | "regime-indisponible-pour-cette-ligne";

/**
 * § 6's Avertissement tier: §8.2's two taut-line rows and §9.2's creep cap — {@link lineWarnings}.
 */
export type VerdictWarningId =
  /** §8.2 — below 3 % the line stiffens and the model starts mis-reporting dynamics. */
  | "fleche-sur-portee-sous-3-pct"
  /** §8.2 — the same condition invalidates the regime the DAF 1,2 ceiling was measured in. */
  | "daf-hors-de-son-regime-de-mesure"
  /** §9.2 — textile above 30 % MBL standing: creep and service life, **not** strength. */
  | "tension-permanente-sur-30-pct-mbl";

/** One anchor's tension envelope over the traverse. `FS` is régime-independent: `η·MBF/T_DAF`. */
export type EndEnvelope = {
  /** The unloaded tension at this end, N — echoed, because `T_DAF` is unreadable without it. */
  Tvide: number;
  /** The greatest **static** tension over the traverse, N — § 6's « T max statique ». */
  Tstatic: number;
  /** `T_vide + DAF·(T_chargé − T_vide)`, N — the figure `FS effectif` divides by. */
  Tdaf: number;
  /** `T_DAF − T_chargé`, N — § 6's « ↳ majoration dynamique ». */
  amplification: number;
  /** Index into `steps` of the worst step at this end; **−1** when the traverse is empty. */
  atStepIndex: number;
  /** `η·MBF / T_DAF` — the headline, and the same number whatever régime is chosen. */
  FS: number;
};

/** One cell of the criteria × ends grid. `end` is `null` on the criterion that is not per end. */
export type VerdictCell = {
  readonly criterion: CriterionBasis;
  /** `null` **is** the suspended-load cell: one number, because a line fails at its weakest end. */
  readonly end: "A" | "B" | null;
  readonly k: number;
  readonly tag: ProvenanceTag;
  /** `η_end·MBF/k`, N — `null` on the suspended-load cell, which has no per-end allowable. */
  readonly Tadm: number | null;
  readonly FS: number;
  readonly state: CellState;
};

/** What § 6's `Résultats` block and the criteria × ends grid read. */
export type VerdictResult = {
  state: VerdictState;
  regime: RegimeId;
  /** Set **only** with `state: "refuse-usage-interdit"`; `null` otherwise. */
  refusal: RefusalId | null;
  /** Echoed, because `Indéterminé`'s banner counts the steps that did solve. */
  coverage: number;
  stepsSolved: number;
  ends: { A: EndEnvelope; B: EndEnvelope };
  /** § 6's headline « T max » — the **amplified** envelope, never the static one. */
  headline: { end: "A" | "B"; Tdaf: number; atStepIndex: number };
  /** The grid, in régime order; empty on an empty traverse. */
  cells: VerdictCell[];
  /**
   * The cell the banner names — worst state first, then the lowest `FS effectif`. `null` under a
   * refusal (the banner names the prohibition) and under `Indéterminé` (a verdict on the solved
   * fraction is biased optimistic by construction), while `cells` stays populated.
   */
  governing: VerdictCell | null;
  /** `T adm − T max` majoré at the **least favourable** end, N — § 6's « Réserve de tension ». */
  reserve: { value: number; end: "A" | "B" } | null;
  /** The suspended-load cell's two halves, written down — `null` when the régime has no such row. */
  suspendedLoad: {
    /** `min(η_A, η_B)·MBF`, N. */
    numerator: number;
    /** `max over steps and ends of DAF·(T_chargé − T_vide)`, N. */
    denominator: number;
    atStepIndex: number;
    atEnd: "A" | "B";
  } | null;
  /** What the régime demands and this app cannot evaluate — hence: never a claim of conformity. */
  obligations: readonly ObligationId[];
};

/**
 * Which of a régime's `requires` clauses the line misses — `null` where the régime is available.
 * Both flags can be set at once (steel *and* `PERMANENTE`), so a caller wording the reason can name
 * every cause rather than the first one it tests.
 */
export type RegimeMismatch = { readonly family: boolean; readonly usage: boolean };

/**
 * § 6's one availability rule, as data. Only « Secours textile 10:1 » carries a requirement —
 * family B under a temporary use class — and a régime that is merely conservative for the line is
 * **not** unavailable: the app has no authority to refuse it. The sentences that explain a mismatch
 * are the app's; this returns which clauses failed.
 */
export function regimeMismatch(
  regime: RegimeId,
  family: "steel" | "textile",
  usage: "PERMANENTE" | "TEMPORAIRE",
): RegimeMismatch | null {
  const { requires } = REGIMES[regime];
  if (requires === null) return null;
  const mismatch = { family: requires.family !== family, usage: requires.usage !== usage };
  return mismatch.family || mismatch.usage ? mismatch : null;
}

/** {@link regimeMismatch} as the pickers' predicate. */
export function isRegimeAvailable(
  regime: RegimeId,
  family: "steel" | "textile",
  usage: "PERMANENTE" | "TEMPORAIRE",
): boolean {
  return regimeMismatch(regime, family, usage) === null;
}

/** §10.4, as the theory doc states it: permanent public attractions are steel only. */
export function isFamilyAllowed(
  family: "steel" | "textile",
  usage: "PERMANENTE" | "TEMPORAIRE",
): boolean {
  return family === "steel" || usage === "TEMPORAIRE";
}

/** `T_adm = η_t·MBF/k` — §10.1's allowable, termination efficiency multiplying **before** `k`. */
export function allowableTension(eta: number, strength: number, k: number): number {
  return (eta * strength) / k;
}

/** §8.2's envelope for one end at one step: `T_vide + DAF·(T_chargé − T_vide)`. */
export function amplifiedTension(Tvide: number, Tcharge: number, DAF: number): number {
  return Tvide + DAF * (Tcharge - Tvide);
}

/** What § 6's Avertissement tier reads: the standing line alone, with no régime and no rider. */
export type LineWarningInput = {
  readonly family: "steel" | "textile";
  /** Flèche à vide / portée, dimensionless. */
  readonly sagRatio: number;
  /** **One** unloaded solve, per end, N. */
  readonly Tvide: { readonly TA: number; readonly TB: number };
  /** `MBF` (steel) or `MBL` (textile), N. */
  readonly strength: number;
};

/**
 * § 6's warning tier — §8.2's stiffening threshold and §9.2's textile creep cap, the one place each
 * is compared. **Régime-free**: both are properties of the standing line, true whatever régime is
 * selected and on a screen where none is, which is where {@link evaluateVerdict} is not called.
 */
export function lineWarnings(i: LineWarningInput): VerdictWarningId[] {
  const warnings: VerdictWarningId[] = [];
  if (i.sagRatio < VERDICT.sagRatioWarning) {
    warnings.push("fleche-sur-portee-sous-3-pct");
    // Not a duplicate of the line above: one qualifies `flèche / portée`, the other qualifies the
    // `DAF` figure, whose 1,2 ceiling was measured on a controlled step-off on a *taut* line. A
    // taut line therefore always shows both, across the whole feasible band — do not remove one.
    warnings.push("daf-hors-de-son-regime-de-mesure");
  }
  if (
    i.family === "textile" &&
    Math.max(i.Tvide.TA, i.Tvide.TB) > VERDICT.standingTensionCap * i.strength
  ) {
    warnings.push("tension-permanente-sur-30-pct-mbl");
  }
  return warnings;
}

/**
 * The traverse's tension envelope: both ends' static maxima and §10.1's suspended denominator.
 *
 * The per-end shape is stated inline rather than named, because {@link EndEnvelope} — the *printed*
 * envelope, with `T_vide`, `T_DAF` and `FS` on it — already carries that name's meaning, and two
 * exported `End…Envelope` types for adjacent concepts is one reading error waiting to happen.
 */
export type TensionEnvelopeScan = {
  readonly A: {
    /** The greatest **static** tension the traverse puts on this end, N. */
    readonly Tstatic: number;
    /** Which step carries it, indexed into the **solved** steps — `−1` for an empty traverse. */
    readonly atStepIndex: number;
  };
  readonly B: { readonly Tstatic: number; readonly atStepIndex: number };
  /**
   * `max over steps **and** ends of DAF·(T_chargé − T_vide)` — §10.1's `[REGULATOR]` denominator.
   * A caller printing only the per-end envelope ignores it; it rides along because it is the same
   * pass, and a second pass over the traverse to recover it would be the duplication this scan
   * exists to remove.
   */
  readonly suspended: {
    readonly value: number;
    readonly atStepIndex: number;
    readonly end: "A" | "B";
  };
};

/**
 * **The** worst-tension-per-end scan — one pass over the traverse, one owner.
 *
 * `evaluateVerdict` scores the régime against it, and A10's reduced row set prints `T max` from it
 * **with no régime chosen**, where `evaluateVerdict` is by contract not called at all. Those are
 * two callers of one envelope, not two envelopes: before ticket 38 the Rail re-implemented the
 * scan and a test asserted the two agreed, which made a régime-model change able to break the
 * agreement from either side.
 *
 * An **empty** traverse has no envelope: `Number.NEGATIVE_INFINITY` and `−1`, the reducer's own
 * identity, left for the caller to read as the flag it is rather than folded into a `NaN` here —
 * `evaluateVerdict` needs `NaN` in its printed rows, and the Rail does not.
 *
 * @param steps the **solved** sweep steps, in grid order.
 * @param Tvide one unloaded solve per end, N — not a per-step quantity.
 * @param DAF §8.2's dynamic amplification factor, read only by `suspended`.
 */
export function scanTensionEnvelope(
  steps: readonly SweepStep[],
  Tvide: { readonly TA: number; readonly TB: number },
  DAF: number,
): TensionEnvelopeScan {
  let TstaticA = Number.NEGATIVE_INFINITY;
  let TstaticB = Number.NEGATIVE_INFINITY;
  let atA = -1;
  let atB = -1;
  let suspended = Number.NEGATIVE_INFINITY;
  let suspendedAt = -1;
  let suspendedEnd: "A" | "B" = "A";

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.TA > TstaticA) {
      TstaticA = step.TA;
      atA = i;
    }
    if (step.TB > TstaticB) {
      TstaticB = step.TB;
      atB = i;
    }
    const suspendedA = DAF * (step.TA - Tvide.TA);
    if (suspendedA > suspended) {
      suspended = suspendedA;
      suspendedAt = i;
      suspendedEnd = "A";
    }
    const suspendedB = DAF * (step.TB - Tvide.TB);
    if (suspendedB > suspended) {
      suspended = suspendedB;
      suspendedAt = i;
      suspendedEnd = "B";
    }
  }

  return {
    A: { Tstatic: TstaticA, atStepIndex: atA },
    B: { Tstatic: TstaticB, atStepIndex: atB },
    suspended: { value: suspended, atStepIndex: suspendedAt, end: suspendedEnd },
  };
}

/** `FS_eff` against the régime's divisor — the only place the three cell states are decided. */
function cellState(FS: number, k: number): CellState {
  if (FS < k) return "hors-limites";
  if (FS < VERDICT.lowMarginFactor * k) return "marge-faible";
  return "dans-les-limites";
}

const SEVERITY: Record<CellState, number> = {
  "dans-les-limites": 0,
  "marge-faible": 1,
  "hors-limites": 2,
};

/**
 * The banner names **one** cell. Worst state first — a failing criterion has to be the one named,
 * whatever its `FS` reads against another criterion's divisor — then the lowest `FS effectif`,
 * which is what § 6 applies on the shipped line: 8,80 on total tension against the suspended
 * load's 12,29, so **total tension governs** although its `k` is the smaller of the two.
 */
function governingCell(cells: VerdictCell[]): VerdictCell | null {
  let best: VerdictCell | null = null;
  for (const cell of cells) {
    if (best === null) {
      best = cell;
      continue;
    }
    const bySeverity = SEVERITY[cell.state] - SEVERITY[best.state];
    if (bySeverity > 0 || (bySeverity === 0 && cell.FS < best.FS)) best = cell;
  }
  return best;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`evaluateVerdict: ${name} must be finite and > 0, got ${value}`);
  }
}

/**
 * §10, whole: the régime's criteria scored against the DAF-amplified envelope, per end where `η_t`
 * makes that meaningful and in one cell where §10.1 does not.
 *
 * Order of business, and the order is a decision:
 *
 * 1. **The two use-class refusals, then §10.2's prohibition.** All three survive any margin, so
 *    none of them may be reached *through* the numbers. The app normally catches the first two
 *    earlier still — §10.4's family gate and the régime-availability gate are blocking errors with
 *    Fix Actions, above the verdict in the banner's precedence — but the engine refuses rather than
 *    trusting that, because the alternative is a computed pass on a prohibited line.
 * 2. **`coverage < 1` ⇒ `Indéterminé`**, suppressing the verdict and leaving the converged cells
 *    on screen.
 * 3. Otherwise the grid decides, and the banner names the governing cell.
 *
 * The envelopes and the grid are computed in **every** case — a refusal still has a
 * `T max` and a `FS effectif` to show, which is exactly § 6's point about a refusal surviving an
 * ample margin.
 *
 * @param v the traverse, the unloaded solve, the régime and the hardware. `steps` must be the
 *   sweep's solved steps; `Tvide` is one unloaded solve of the same span.
 * @returns the five-state verdict plus every row § 6's `Résultats` block prints.
 * @throws RangeError when `DAF`, `strength` or either `η` is not finite and positive, when
 *   `coverage` is outside `[0, 1]`, or when the régime id is unknown — caller bugs of tier one's
 *   class, never physics failures.
 */
export function evaluateVerdict(v: VerdictInput): VerdictResult {
  requirePositive("DAF", v.DAF);
  requirePositive("strength", v.strength);
  requirePositive("eta.A", v.eta.A);
  requirePositive("eta.B", v.eta.B);
  if (!Number.isFinite(v.coverage) || v.coverage < 0 || v.coverage > 1) {
    throw new RangeError(`evaluateVerdict: coverage must lie in [0, 1], got ${v.coverage}`);
  }
  const regime: Regime | undefined = REGIMES[v.regime];
  if (regime === undefined) {
    throw new RangeError(`evaluateVerdict: unknown régime ${String(v.regime)}`);
  }

  const { DAF, strength } = v;
  const etaMin = Math.min(v.eta.A, v.eta.B);

  // One pass over the traverse, in the scan both callers share — the static maximum per end, and
  // the suspended-load denominator, which is a maximum over the steps **and** over the two ends.
  const scan = scanTensionEnvelope(v.steps, v.Tvide, DAF);
  const suspended = scan.suspended.value;

  // An empty traverse has no envelope — `NaN` and `−1`, the same flag `evaluateClearance` returns
  // rather than a garde read off a traverse that never happened. `coverage` is 0 there, so the
  // state is `Indéterminé` and no cell is scored.
  const empty = v.steps.length === 0;
  const envelope = (
    Tvide: number,
    Tstatic: number,
    atStepIndex: number,
    eta: number,
  ): EndEnvelope => {
    const Tdaf = empty ? Number.NaN : amplifiedTension(Tvide, Tstatic, DAF);
    return {
      Tvide,
      Tstatic: empty ? Number.NaN : Tstatic,
      Tdaf,
      amplification: empty ? Number.NaN : Tdaf - Tstatic,
      atStepIndex,
      FS: (eta * strength) / Tdaf,
    };
  };

  const ends = {
    A: envelope(v.Tvide.TA, scan.A.Tstatic, scan.A.atStepIndex, v.eta.A),
    B: envelope(v.Tvide.TB, scan.B.Tstatic, scan.B.atStepIndex, v.eta.B),
  };

  const headlineEnd: "A" | "B" = empty || ends.A.Tdaf >= ends.B.Tdaf ? "A" : "B";
  const headline = {
    end: headlineEnd,
    Tdaf: ends[headlineEnd].Tdaf,
    atStepIndex: ends[headlineEnd].atStepIndex,
  };

  const cells: VerdictCell[] = [];
  let suspendedLoad: VerdictResult["suspendedLoad"] = null;
  let reserve: VerdictResult["reserve"] = null;

  if (!empty) {
    for (const criterion of regime.criteria) {
      if (criterion.basis === "tension-totale") {
        for (const end of ["A", "B"] as const) {
          const eta = v.eta[end];
          const Tadm = allowableTension(eta, strength, criterion.k);
          const FS = ends[end].FS;
          cells.push({
            criterion: criterion.basis,
            end,
            k: criterion.k,
            tag: criterion.tag,
            Tadm,
            FS,
            state: cellState(FS, criterion.k),
          });
          // § 6: the réserve is `T adm − T max` majoré, taken at the **least favourable** end.
          const value = Tadm - ends[end].Tdaf;
          if (reserve === null || value < reserve.value) reserve = { value, end };
        }
        continue;
      }
      // §10.1's `[REGULATOR]` row: one cell, `min(η_A, η_B)·MBF` over `DAF·(T_chargé − T_vide)`.
      const numerator = etaMin * strength;
      const FS = numerator / suspended;
      suspendedLoad = {
        numerator,
        denominator: suspended,
        atStepIndex: scan.suspended.atStepIndex,
        atEnd: scan.suspended.end,
      };
      cells.push({
        criterion: criterion.basis,
        end: null,
        k: criterion.k,
        tag: criterion.tag,
        Tadm: null,
        FS,
        state: cellState(FS, criterion.k),
      });
    }
  }

  const refusal: RefusalId | null = !isFamilyAllowed(v.family, v.usage)
    ? "textile-en-installation-permanente"
    : !isRegimeAvailable(v.regime, v.family, v.usage)
      ? "regime-indisponible-pour-cette-ligne"
      : TERMINATIONS[v.terminations.A].personProhibited ||
          TERMINATIONS[v.terminations.B].personProhibited
        ? "serre-cables-sur-ligne-portant-des-personnes"
        : null;

  const governing = refusal !== null || v.coverage < 1 ? null : governingCell(cells);
  const state: VerdictState =
    refusal !== null
      ? "refuse-usage-interdit"
      : v.coverage < 1 || governing === null
        ? "indetermine"
        : governing.state;

  return {
    state,
    regime: v.regime,
    refusal,
    coverage: v.coverage,
    stepsSolved: v.steps.length,
    ends,
    headline,
    cells,
    governing,
    reserve,
    suspendedLoad,
    obligations: regime.obligations,
  };
}
