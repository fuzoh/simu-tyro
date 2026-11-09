/**
 * The Rail's `Provenance` section and the warning ladder — « v1 build spec » § 6 (*Provenance :
 * deux idiomes, deux niveaux de pastille, trois paliers d'avertissement*, *L'agrégat*, *« Ce que
 * cet outil ne calcule pas »*) and § 9 (*The opening screen, region by region*: « the aggregate
 * count is 4 »).
 *
 * **Two idioms, because coefficients and input data answer two different questions** — « is this
 * number backed by a source? » against « what does this file let us check? ». The second is the
 * terrain disclosure block and lives in `@/lib/terrain/provenance.ts`; this module owns the first,
 * plus the ladder that decides how loudly anything is said.
 *
 * Rules this module exists to keep:
 *
 * - **Two chip levels, and the second is a granularity rather than a second chip.** On the surface
 *   there is exactly one chip — « ⚠ non confirmé » — covering exactly `[PAYWALLED]` +
 *   `[CONVENTION]` + `[UNVERIFIED:R1]`, the three tags the binding provenance rule groups. §0.2's
 *   seven-tag vocabulary lives **in the popover**, with the `docs/simulation-theory.md` reference.
 *   A seven-level trust taxonomy on screen is unactionable: the user only ever decides « I accept
 *   this number or I type my own ».
 * - **`DAF` is a fourth case the two-level scheme did not have**: well attested (`[FIELD:SSF]`,
 *   the reference's highest-confidence tag) **and** editable, so it carries a provenance popover
 *   and **no chip**, and it is **not** an aggregate member.
 * - **Editing an Unconfirmed Default flips its chip but never removes it from the aggregate.**
 *   « aucune valeur normative n'existe » stays true whatever the user types, and 100 kg typed is no
 *   more standards-backed than the 120 kg shipped.
 * - **The régime is pinned first and visually separated.** It is not one input among six: it
 *   multiplies into every margin of the grid, so with ACCT selected the whole verdict rests on a
 *   convention [R1] and [R2] contradict each other about.
 * - **The ambient tier fires *always*, which is why it is never an alarm.** Textile `k` sits
 *   outside its attested 10–30 % MBL band on every zip line ever modelled (≈0,6 % standing, ≈6,3 %
 *   loaded), so an ⚠ there would fire on every rope and mean nothing. Coarse terrain, by contrast,
 *   is **conditional** on a design choice and names a blind spot in the app's main output — it is a
 *   warning, and it is confirmed at that tier rather than demoted to ambient.
 * - **The `flèche < 3 %` warning appears twice on purpose.** It is the only warning in the app that
 *   invalidates another decision: below 3 % the line stiffens, and the `DAF` 1,2 ceiling was
 *   measured on a *controlled step-off on a taut line*. So it renders on `flèche / portée` **and**
 *   beside the `DAF` figure. A taut line therefore always shows two warnings at once, and that is
 *   not a double report.
 */

import type { Deduced } from "@/lib/rail/deduced.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { RegimeId, TerminationId, VerdictWarningId } from "@/lib/sim";

import { equalAtDisplayPrecision, formatQuantity } from "@/lib/format/quantity.ts";
import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { lineWarnings, REGIMES, TERMINATIONS } from "@/lib/sim";
import { heading, label } from "@/lib/vocabulary/labels.ts";

import type { StrengthSymbol } from "./fields.ts";
import type { Results } from "./results.ts";

import { strengthSymbol } from "./fields.ts";
import { presetProvenance } from "./presets.ts";
import { deviceOnCableWarning, overLimitWarning, tmaxAtTensioningAnchor } from "./tensioning.ts";

/**
 * The popover copy, one entry per provenance surface. §0.2's fine-grained tag and the
 * `docs/simulation-theory.md` § reference travel **together**: a tag with no § is a claim nobody
 * can check, and a § with no tag is a citation with no confidence attached.
 *
 * Shared with the input half, so a chip on a field and the same value's aggregate entry can never
 * disagree about what backs it.
 */
export const PROVENANCE_COPY = {
  regime:
    "Le régime choisi multiplie dans chaque marge de la grille. Trois des cinq entrées sont [CONVENTION] ou [UNVERIFIED:R1], et [R1] et [R2] se contredisent sur le rapport ACCT.\n§10.1 · docs/simulation-theory.md",
  mp: "120 kg attribué à EN 15567-1 §4.1.2 mais introuvable dans le texte primaire [UNVERIFIED:R1]. Acheter la norme.\n§8.1 · docs/simulation-theory.md",
  hRider:
    "Gabarit du passager 2,1 m — [CONVENTION]. Aucune valeur normative publiée.\n§11 · docs/simulation-theory.md",
  DAF: "Majoration au départ 1,2 — [FIELD:SSF], le tag de plus haute confiance de la référence. Configurable, et sans pastille « non confirmé ».\n§8.2 · docs/simulation-theory.md",
  EA: "EA = E_app·C·d² avec E_app 115 GPa et C 0,4165, les milieux des plages §13.1 (100–130 GPa, 0,384–0,449). La plage complète donne 5,53–8,41 MN à 12 mm, soit ×1,52.\n§13.1 · docs/simulation-theory.md",
  mu: "μ = W·d²/100 avec W 0,3795, le milieu de la plage §13.1 (0,359–0,400) [STD-ATTESTED].\n§13.1 · docs/simulation-theory.md",
  MBF: "MBF = K·d²·R₀/1000, K 0,330 (6×19) / 0,356 (6×19 métallique) [STD-ATTESTED]. Les tables EN 12385-4 complètes sont [PAYWALLED].\n§13.1 · docs/simulation-theory.md",
  k: "k = EA/MBL — §13.2 publie 22 à 10 % MBL et 31 à 30 % MBL, et une tyrolienne n'entre jamais dans cette bande (0,6 % à vide, 6,3 % chargée).\n§13.2 · docs/simulation-theory.md",
  termination:
    "Rendement de terminaison — chaque plage §10.2/§10.3 est prise à son extrémité conservatrice.\n§10.2, §10.3 · docs/simulation-theory.md",
  EAtextile:
    "EA = k·MBL — la raideur relative §13.2 [DATASHEET], mesurée hors de la bande où une tyrolienne travaille.\n§13.2 · docs/simulation-theory.md",
  CdA: "C_dA 0,45 m² — ajustement de la SSF sur sa ligne instrumentée de 1109 m [FIELD:SSF] : une campagne, un spéléologue en harnais sur corde. La plage 0,30–0,60 m² du champ n'est pas sur la page SSF [CONVENTION].\n§12.2 · docs/simulation-theory.md",
  trolleyFriction:
    "F₀ 15 N et k_v 1,5 kg/s — ajustement mesuré par la SSF sur corde [FIELD:SSF], indépendant du poids du passager. La page SSF ne nomme aucune poulie.\n§12.2 · docs/simulation-theory.md",
  trolleyMu:
    "μ 0,015 — repli à μ constant, extrémité basse de la plage 0,015–0,02, sans source primaire ouverte [CONVENTION]. Aucune source ouverte ne sépare le câble de la corde.\n§12.2 · docs/simulation-theory.md",
  rho: "ρ — atmosphère type (ISA), ρ = p/(R_s·T) à l'altitude moyenne du profil importé, 1,225 kg/m³ sans profil ; [R1] et [R2] concordent. Une valeur saisie la remplace.\n§12.2 · docs/simulation-theory.md",
} as const;

/** Which aggregate line this is. Membership is mechanically derivable from § 6's own table. */
export type AggregateEntryId =
  | "regime"
  | "mp"
  | "hRider"
  | "EA"
  | "mu"
  | "EAtextile"
  | "k"
  | "etaA"
  | "etaB"
  | "MBF";

/**
 * The surface chip. **One label for the unconfirmed tags** and one for a value the user supplied —
 * « valeur utilisateur » on an input, « valeur saisie » on a derived read-out that was typed over.
 */
export type ChipLabel = "non confirmé" | "valeur utilisateur" | "valeur saisie";

/** One line of the expanded aggregate. */
export type AggregateEntry = {
  readonly id: AggregateEntryId;
  readonly label: string;
  /** The value as the Rail prints it, so the list reads without cross-referencing the fields. */
  readonly value: string | null;
  readonly chip: ChipLabel;
  /** §0.2's fine-grained tag plus the § reference — the popover, never a second warning. */
  readonly detail: string;
  /** The régime alone: **pinned first and visually separated**. */
  readonly pinned: boolean;
};

/** § 6's always-visible line, its count, and the list behind the disclosure triangle. */
export type Aggregate = {
  /** « ⚠ 4 valeurs sans référence normative confirmée » — the count is the one figure worth a glance. */
  readonly summary: string;
  readonly count: number;
  readonly entries: readonly AggregateEntry[];
};

/**
 * § 6's membership rule, applied to the active configuration.
 *
 * @param deduced the material read-outs, for the values the list prints beside each entry. Omitted,
 *   the entries carry no value — membership never depends on it.
 */
export function provenanceAggregate(scenario: ScenarioDraft, deduced?: Deduced): Aggregate {
  const entries: AggregateEntry[] = [];
  const { unit } = scenario;

  // **The régime is pinned first**, and only when it is one of the three unconfirmed entries: EN
  // 15567-1 is `[STD-ATTESTED]` and WorkSafe QLD is `[REGULATOR]`, so neither joins the list.
  if (scenario.regime !== null && isUnconfirmedTag(scenario.regime)) {
    entries.push({
      id: "regime",
      label: "Régime de sécurité",
      value: REGIMES[scenario.regime].label,
      chip: "non confirmé",
      detail: PROVENANCE_COPY.regime,
      pinned: true,
    });
  }

  // The two Unconfirmed Defaults, **always** — editing one flips its chip and keeps its line.
  entries.push({
    id: "mp",
    label: "Masse du passager",
    value: formatQuantity("m_p", scenario.rider.mp),
    chip: edited("m_p", scenario.rider.mp, FIRST_RUN_SCENARIO.rider.mp)
      ? "valeur utilisateur"
      : "non confirmé",
    detail: PROVENANCE_COPY.mp,
    pinned: false,
  });
  entries.push({
    id: "hRider",
    label: heading("riderEnvelope", "exact"),
    value: formatQuantity("h_rider", scenario.rider.hRider),
    chip: edited("h_rider", scenario.rider.hRider, FIRST_RUN_SCENARIO.rider.hRider)
      ? "valeur utilisateur"
      : "non confirmé",
    detail: PROVENANCE_COPY.hRider,
    pinned: false,
  });

  if (scenario.material.family === "steel") {
    const overrides = scenario.material.overrides ?? {};
    // `EA` and `μ` are always members: `E_app` and `C` are `[CONVENTION]` ranges and `W` is a range
    // whose midpoint we chose. An override does not remove them — it only renames the chip.
    entries.push({
      id: "EA",
      label: "Raideur axiale EA",
      value: reading("EA", deduced?.material.EA),
      chip: overrides.EA === undefined ? "non confirmé" : "valeur saisie",
      detail: PROVENANCE_COPY.EA,
      pinned: false,
    });
    entries.push({
      id: "mu",
      label: "Masse linéique μ",
      value: reading("mu", deduced?.material.mu),
      chip: overrides.mu === undefined ? "non confirmé" : "valeur saisie",
      detail: PROVENANCE_COPY.mu,
      pinned: false,
    });
    // **`MBF` acier joins only when it is overridden**: unoverridden it is the app's one
    // `[STD-ATTESTED]` derived value, and the override is what downgrades it.
    if (overrides.MBF !== undefined) {
      entries.push({
        id: "MBF",
        label: "Charge de rupture MBF",
        value: formatQuantity("MBF", overrides.MBF, unit),
        chip: "valeur saisie",
        detail: PROVENANCE_COPY.MBF,
        pinned: false,
      });
    }
  } else {
    const spec = scenario.material;
    // The preset's `k` is a deduction with its own note; the aggregate carries it so the field
    // chip and this entry cannot disagree about what backs the value.
    const deduction = presetProvenance(spec).k;
    const presetNote = deduction?.tone === "warning" ? `\n${deduction.detail}` : "";
    entries.push({
      id: "EAtextile",
      label: "Raideur axiale EA",
      value: reading("EA", deduced?.material.EA),
      chip: "non confirmé",
      detail: PROVENANCE_COPY.EAtextile + presetNote,
      pinned: false,
    });
    entries.push({
      id: "k",
      label: "Raideur relative k",
      value: reading("k", spec.k),
      chip: "non confirmé",
      detail: PROVENANCE_COPY.k + presetNote,
      pinned: false,
    });
  }

  // **Only three groups of terminations are members**: manchon à coin, serre-câbles étrier and
  // **every** textile one. The terminations table's tags govern over the chip-mapping table's
  // « toutes sauf manchon », which lumped cosse and épissure in with the conventioned rows.
  for (const end of ["A", "B"] as const) {
    const termination = scenario.terminations[end];
    if (!isUnconfirmedTermination(termination.id)) continue;
    entries.push({
      id: end === "A" ? "etaA" : "etaB",
      label: `Rendement de terminaison ${end}`,
      value: formatQuantity("eta", termination.eta),
      chip: edited("eta", termination.eta, TERMINATIONS[termination.id].eta)
        ? "valeur utilisateur"
        : "non confirmé",
      detail: PROVENANCE_COPY.termination,
      pinned: false,
    });
  }

  const count = entries.length;
  return {
    summary: `${count} valeur${count > 1 ? "s" : ""} sans référence normative confirmée`,
    count,
    entries,
  };
}

/**
 * A value the aggregate prints, or `null` where the spec is still blank. **Never « — »** — that
 * glyph belongs to `Indéterminé`, and a blank textile datasheet is « rien n'a été saisi ».
 */
function reading(quantity: "EA" | "mu" | "k", value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : formatQuantity(quantity, value);
}

/**
 * The tags the binding provenance rule groups — `[PAYWALLED]`, `[CONVENTION]` and
 * `[UNVERIFIED:R1]`. Of §10.1's five entries three carry one of them: ACCT 10:1 and Secours
 * textile are `[CONVENTION]`, ANSI/ACCT 5:1 is `[UNVERIFIED:R1]`; EN 15567-1 is `[STD-ATTESTED]`
 * and WorkSafe QLD is `[REGULATOR]`, so neither is a member.
 */
function isUnconfirmedTag(regime: RegimeId): boolean {
  const { tag } = REGIMES[regime];
  return tag === "[CONVENTION]" || tag === "[UNVERIFIED:R1]";
}

/**
 * § 6's termination membership: « seulement Manchon à coin, Serre-câbles étrier, et **toutes** les
 * terminaisons textiles ». Read off the catalogue's own tags rather than listed by id, so a new
 * termination joins or stays out by its tag rather than by someone remembering this line.
 */
function isUnconfirmedTermination(id: TerminationId): boolean {
  return TERMINATIONS[id].tag !== "[STD-ATTESTED]";
}

/**
 * Has the user moved this value off the one it shipped with? **Compared at display precision**,
 * like the stale-Override badge: the chip is about what the user reads, and a float that renders
 * identically has not been edited in any sense the reader can see.
 *
 * A link carrying the shipped value therefore reads as unedited, which is the right answer for the
 * only thing the chip decides — whether the line says « non confirmé » or « valeur utilisateur ».
 * The aggregate entry itself is unaffected either way, which is § 6's actual rule.
 */
function edited(quantity: "m_p" | "h_rider" | "eta", value: number, shipped: number): boolean {
  return !equalAtDisplayPrecision(quantity, value, shipped);
}

/** § 6's three tiers: how loudly a thing is said, and each tier is defined by a property. */
export type WarningTier =
  /** Plain status text beside the value, **no ⚠** — it fires *always*, so an alarm would mean nothing. */
  | "ambiant"
  /** ⚠ inline on the row it qualifies. Conditional on something the user controls. */
  | "avertissement"
  /** The banner, state `Interdit`. A `[REGULATOR]` prohibition, not advice. */
  | "verdict";

/**
 * Every rung of the ladder, including the two this module does not render. The three line warnings
 * are the engine's own identifiers; `k-hors-bande` is the one rung this module scores itself.
 */
export type LadderId =
  | "k-hors-bande"
  | VerdictWarningId
  | "terrain-grossier"
  | "serre-cables-refuse"
  | TensioningRungId;

/** The two rungs the Mise en tension adds (#86). Both are descriptive: neither touches a result. */
export type TensioningRungId = "tension-sur-limite-du-dispositif" | "maestro-sur-cable";

/** Which surface renders a rung — so nothing is rendered twice and nothing has no owner. */
export type LadderOwner =
  /** A row of `Valeurs déduites` or of `Paramètres`, through {@link warningLadder}. */
  | "rail-row"
  /** The terrain disclosure block — `@/lib/terrain/provenance.ts` emits its own copy. */
  | "terrain"
  /** The banner, at rank 4 — `@/lib/rail/results.ts` writes the sentence. */
  | "banner";

/** The ladder as a table: one row per rung, its tier and its owner. */
export const WARNING_LADDER: Record<LadderId, { tier: WarningTier; owner: LadderOwner }> = {
  // Ambient because it fires on **every** textile line: §13.2's `k` is published for 10–30 % MBL
  // and a zip line never enters that band, so an ⚠ here would be permanent and therefore mute.
  "k-hors-bande": { tier: "ambiant", owner: "rail-row" },
  // §9.2 — creep and service life, **not** strength. The strength claim is the verdict's.
  "tension-permanente-sur-30-pct-mbl": { tier: "avertissement", owner: "rail-row" },
  // §8.2 — below 3 % the line stiffens and the model starts mis-reporting the dynamic response.
  "fleche-sur-portee-sous-3-pct": { tier: "avertissement", owner: "rail-row" },
  // The same condition, said beside the figure it invalidates. **Not a duplicate.**
  "daf-hors-de-son-regime-de-mesure": { tier: "avertissement", owner: "rail-row" },
  // Conditional on a design choice (spacing = longueur/199, crossing 5 m at ≈995 m of span) and it
  // names a blind spot in `garde min` — hence a warning, not the ambient tier.
  "terrain-grossier": { tier: "avertissement", owner: "terrain" },
  // §10.2's `[REGULATOR]` prohibition. It survives an ample margin, so it cannot be a warning.
  "serre-cables-refuse": { tier: "verdict", owner: "banner" },
  // Conditional on the device and the diameter the user chose, and read on the line's « T max »
  // at the anchor carrying the device. The limit is a charge d'utilisation, so it warns and never
  // blocks: nothing downstream reads the device.
  "tension-sur-limite-du-dispositif": { tier: "avertissement", owner: "rail-row" },
  // A Maestro that arrived on a câble: kept as given (ADR-0001), said once, with a Fix Action.
  "maestro-sur-cable": { tier: "avertissement", owner: "rail-row" },
};

/** Which Rail row a rung hangs on. */
export type LadderRow =
  | "k"
  | "standingTension"
  | "sagRatio"
  | "DAF"
  | "pretension"
  | "tensioningDevice";

/** One rung that is currently firing. */
export type LadderWarning = {
  readonly id: LadderId;
  readonly tier: WarningTier;
  readonly row: LadderRow;
  /** The copy, **without** the glyph: the renderer owns ⚠ and the ambient tier carries none. */
  readonly text: string;
};

/**
 * The row and the copy of each engine warning, given what the line's strength is called. The text
 * carries no glyph: the renderer owns ⚠.
 */
const LINE_WARNING_RUNGS: Record<
  VerdictWarningId,
  { row: LadderRow; text: (strength: StrengthSymbol) => string }
> = {
  "tension-permanente-sur-30-pct-mbl": {
    row: "standingTension",
    text: (strength) =>
      `${label("standingTension", "exact")} au-dessus de 30 % ${strength} — fluage et durée de vie (§9.2), pas résistance.`,
  },
  "fleche-sur-portee-sous-3-pct": {
    row: "sagRatio",
    text: () =>
      "flèche / portée sous 3 % — la ligne se raidit et le modèle rapporte mal la réponse dynamique (§8.2).",
  },
  // **Two places, one condition.** The DAF 1,2 ceiling was measured on a controlled step-off on a
  // *taut* line, so a stiff line is outside the regime it was measured in. Removing either half
  // hides half the finding.
  "daf-hors-de-son-regime-de-mesure": {
    row: "DAF",
    text: () =>
      "hors du régime où 1,2 a été mesuré : la ligne est trop raide (flèche / portée sous 3 %, §8.2).",
  },
};

/**
 * The rungs the Rail's own rows carry, for this Scenario.
 *
 * The terrain rung is **not** here — `terrainDisclosure` emits it inside the block it belongs to —
 * and neither is the verdict rung, which is a banner state rather than a row annotation.
 * {@link WARNING_LADDER} records all six so the ladder is readable in one place.
 *
 * These fire **with or without a régime**, which is why they come from the engine's régime-free
 * `lineWarnings` rather than from `evaluateVerdict`: the verdict is not called at all on a
 * régime-less screen, and « flèche / portée 2,4 % » is true whatever the user has selected.
 */
export function warningLadder(
  scenario: ScenarioDraft,
  deduced: Deduced,
  results: Results | null = null,
): readonly LadderWarning[] {
  const warnings: LadderWarning[] = [];
  const spec = scenario.material;

  if (spec.family === "textile" && spec.k !== null) {
    warnings.push({
      id: "k-hors-bande",
      tier: "ambiant",
      row: "k",
      text: "k publié pour 10–30 % MBL (§13.2) — une tyrolienne travaille sous cette bande : ≈ 0,6 % MBL au repos, ≈ 6,3 % chargée.",
    });
  }

  // Before the solve guard: a Maestro on a câble is a fact of the Scenario.
  const onCable = deviceOnCableWarning(scenario);
  if (onCable !== null) {
    warnings.push({
      id: "maestro-sur-cable",
      tier: WARNING_LADDER["maestro-sur-cable"].tier,
      row: "tensioningDevice",
      text: onCable,
    });
  }
  const overLimit = overLimitWarning(scenario, tmaxAtTensioningAnchor(scenario, results));
  if (overLimit !== null) {
    warnings.push({
      id: "tension-sur-limite-du-dispositif",
      tier: WARNING_LADDER["tension-sur-limite-du-dispositif"].tier,
      row: "pretension",
      text: overLimit,
    });
  }

  const { solve } = deduced;
  const { strength } = deduced.material;
  if (solve === null || strength === null) return warnings;

  const fired = lineWarnings({
    family: spec.family,
    // The read-out is in percent; the engine takes the fraction.
    sagRatio: solve.sagRatio / 100,
    Tvide: solve.Tvide,
    strength,
  });
  for (const id of fired) {
    const { row, text } = LINE_WARNING_RUNGS[id];
    warnings.push({
      id,
      tier: WARNING_LADDER[id].tier,
      row,
      text: text(strengthSymbol(spec.family)),
    });
  }

  return warnings;
}

/**
 * § 6's standing block, five static lines that never change — the only place a user learns that a
 * passing verdict says nothing about wind. With the five verdict states and the grammar that
 * refuses « conforme », it is one of the three mechanisms that keep the app from reading as an
 * attestation, and it is the trio a print target would undo in one move.
 */
export const NOT_COMPUTED_LINES = [
  "La combinaison de charges normative EN 15567 n'est pas appliquée — texte payant.",
  "L'essai de charge 2× (WorkSafe QLD) n'est pas évalué.",
  "Banane chiffrée en mètres et garde au sol sous vent avec passager : hors périmètre (§8.4, modèle 2-D). La Banane n'est qu'une allure dessinée.",
  "Freinage et tension dynamique de la ligne : hors périmètre (§12.2, §12.3). La dynamique du passager n'est qu'une estimation, hors verdict.",
  "Aucune attestation de conformité.",
] as const;

/**
 * §8.3 asks that the load combination be **exposed and labelled**; § 6 settles where: **prose on
 * the surface, formula in the popover** of the first line.
 *
 * *Printing it in the open was rejected*: an unapplied formula on display invites exactly the
 * mental arithmetic it is labelled against — somebody applies those γ factors by hand and believes
 * the result. On demand it informs; on the surface it misleads.
 */
export const LOAD_COMBINATION_FORMULA =
  "E_d = γ_G·T_pre + γ_Q·(T_user·DAF) + γ_W·F_wind          [UNVERIFIED:R1]\n" +
  "Registre §14 ligne 11 : [R1] cite des valeurs de clause exactes issues de normes qu'il liste simultanément comme payantes.";
