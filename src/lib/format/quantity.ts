/**
 * The **display-precision table** — « v1 build spec » § 3 (*Précision d'affichage par grandeur*,
 * *Units, the force selector, and the two constants*, *Numeric input*) and § 8 (*Precision —
 * refuse the trade, and round earlier*). **One** implementation of that table; § 11 records that
 * the path was left free and the **singleness** was not, so nothing anywhere else calls
 * `toFixed` on a quantity.
 *
 * Rules this module exists to keep:
 *
 * - **This is load-bearing state, not cosmetics.** § 8's rule is « a prefill writes the
 *   *displayed* value into state, never the underlying float » — 201,84 enters state,
 *   201,8412773 never does — which is what makes serialisation verbatim and leaves no rounding
 *   decision at the URL. {@link roundToDisplay} is that rule; {@link formatValue} only renders it.
 * - **Three consumers, and two of them are not readers**: the prefill rule (the tightness mode
 *   switch, « Recalculer » on a stale Override), the **stale-Override badge**, which compares
 *   override against formula *at display precision* ({@link equalAtDisplayPrecision}), and the
 *   first-run regression lock, which asserts formatted strings rather than floats. A missing or
 *   too-coarse row is not a formatting gap: it is a badge firing on **every** load for **every**
 *   override, training the user to ignore the badge that exists to catch a 12 mm breaking force
 *   on a 16 mm rope.
 * - **Every row states a *minimum*, with its reason.** The table is a measured sensitivity
 *   decision, not a mechanical derivation from units and hard ranges: `L₀` is the sharp case, at
 *   **2 decimals**, because 1 decimal (151,6 against 151,644 m) shifts flèche by 0,21 m, `H` by
 *   3,5 % and garde by 0,20 m — **8 % of the shipped clearance margin** — where 2 decimals cost
 *   0,02 m. The reasons live in the rows below and must travel with any change to one.
 * - **Fixed decimals, padded**: a row at 2 decimals renders « 6,00 », never « 6 ». Padding is
 *   display-only — state holds a *number* whose value equals the displayed value, so the URL
 *   serialises `6` and the field still shows « 6,00 ».
 * - **Rounding is always visible.** The field shows exactly what state holds: a user who types
 *   82,5 kg sees « 83 kg » commit, and nothing is rounded behind the user's back. That property
 *   is what makes coarse rows on insensitive quantities acceptable.
 * - **Forces convert, never re-label.** The force selector is global — never per-field — and
 *   **a unit switch never writes state**: « le changement d'unité n'écrit jamais dans l'état ;
 *   daN→X→daN est l'identité ». State stays canonical, each unit carries its own display
 *   precision, and the URL keeps serialising daN. Without that invariant, MBF 9074 daN → 90,7 kN
 *   → 9070 daN moves the quantity the Verdict divides by by 4 daN per toggle, and the claim that
 *   a display control is *provably physics-neutral* — which is what kills the 10× input-error
 *   class — quietly stops holding. It is also why `kN` carries the daN decimals **+ 2**: the
 *   resolution never coarsens on a switch.
 * - **Strict global, one declared carve-out: `EA` renders in MN.** The strict-global rule's
 *   argument is *eyeball comparability* (437 daN read against 90,7 kN), and `EA` is never
 *   compared to a tension by eye — three orders of magnitude larger, consumed only inside ratios.
 *   It reads « 6,90 MN » under every setting of the selector and serialises in **daN** in the
 *   URL like every other force. **`MBF` obeys the selector strictly**: a kN carve-out there would
 *   put 90,7 kN beside 437 daN and invite a 100× misread.
 *
 * Canonical units — what every function here takes and returns — are § 3's: « **SI internally,
 * always. Canonical storage is newtons**, so unit round-trips are lossless. » State holds what
 * the engine holds, so state, engine and this module never disagree: **metres**, **millimetres**
 * (`d`), **kilograms**, **kg/m**, **newtons** and **N/m** for every force (including `EA`),
 * **percent** for the percent rows, and plain numbers for the dimensionless ones. `daN` is a
 * *display* unit here exactly like `kN` and `kgf` — and it is the URL's, where
 * `src/lib/url/scenario.ts` divides by ten on the write side: the one N → daN conversion in the
 * codebase.
 */

import type { ForceUnit } from "@/lib/scenario/types.ts";

/**
 * § 3's `g`, m/s² — **fixed and unexposed**. It varies ≤ 0,3 % over the Earth, immaterial beside
 * the ±15 % spread in `EA` and `MBF`, and exposing it would add a fourth way to get a wrong
 * answer plus URL state and fixture surface.
 *
 * The app-side copy of the constant the engine declares in `materials/steel.ts` and
 * `materials/textile.ts` — those two share no helper *by decision*, and the engine is
 * dependency-free, so it cannot read this one. `quantity.test.ts` asserts the three agree.
 */
export const G = 9.81;

/**
 * The strict definition of the kilogram-force, N/kgf. **Two constants, each correct in its
 * role**: {@link G} for physics, `KGF` for the unit. A 120 kg mass therefore reads as
 * **120,04 kgf**, and the 0,03 % discrepancy is disclosed in the kgf note rather than papered
 * over.
 */
export const KGF = 9.80665;

/** § 3's *Numeric input* table: the decimal mark of every displayed value, French copy. */
export const DECIMAL_MARK = ",";

/**
 * How a row's unit behaves under the global force selector — the discriminator that decides both
 * the conversion and the label, so no row can carry one without the other.
 */
type UnitKind =
  /** Metres. Never converted. */
  | "m"
  /** Millimetres — `d` only, § 3's field unit and §13.1's own. */
  | "mm"
  /** Kilograms. */
  | "kg"
  /** Kilometres per hour — the wind's speed, as it is read off an anemometer and typed. */
  | "km/h"
  /** Degrees of arc — the wind's bearing. */
  | "°"
  /** Linear mass, kg/m — a mass, so the force selector does not touch it. */
  | "kg/m"
  /** A force: **newtons canonical** — § 3's SI storage — displayed in the selected unit. */
  | "force"
  /** A force per unit length: N/m canonical, `w` follows the selector as daN/m ⁄ kN/m ⁄ kgf/m. */
  | "force/m"
  /** The declared carve-out: newtons canonical, **always** displayed in MN. `EA` alone. */
  | "MN"
  /** Percent — the value is already a percentage, never a ratio. */
  | "%"
  /** Dimensionless: `k`, `η`, `DAF`, `FS effectif`. No label, no space. */
  | ""
  /** Sweep steps — « Couverture 260 / 260 pas », integer, no decimal mark. */
  | "pas";

/** One row of § 3's table: what the quantity is, and the **minimum** precision it may display. */
type QuantityRow = {
  readonly unit: UnitKind;
  /**
   * Decimals in the unit the row **displays** in. For `force` and `force/m` rows that is § 3's
   * **daN column**, the selector's default; {@link displayDecimals} derives `kN` (+2) and `kgf`
   * (unchanged) from it. For every other row the display unit is also the canonical one.
   */
  readonly decimals: number;
};

/**
 * § 3's *Précision d'affichage par grandeur*, both halves — « Inputs and deduced values » and
 * « Results and read-out cells » — as **one** table, because it is one table and the first-run
 * lock freezes strings from both. Each row's comment is the spec's *Minimum justifié par*
 * column: a change to a number here without a change to its reason is a change nobody can audit.
 */
export const QUANTITIES = {
  // ─── Inputs and deduced values ───────────────────────────────────────────────────────────

  /** `Portée` `L`, m — 0,1 m over 50–2000 m; never prefilled. */
  L: { unit: "m", decimals: 1 },
  /** `Dénivelé` `h`, m — idem; 44 m of dénivelé are worth only 0,21 m of garde. */
  h: { unit: "m", decimals: 1 },
  /** `Hauteur d'ancrage A / B`, m — garde moves metre for metre, so 0,1 m suffices. */
  anchorHeight: { unit: "m", decimals: 1 },
  /** `Station A / B`, m — the file's own grain (`Distance` is written to 0,1 m). */
  station: { unit: "m", decimals: 1 },
  /**
   * `Alt. base A / B`, m — the ground altitude § 4's anchor-placement block prints beside `Portée`
   * and `Dénivelé`. The grain is that block's own printed « 540,4 m » — the file's `Altitude`
   * column, written to 0,1 m, exactly as `Station` reads `Distance`. A read-out, never a field:
   * `h` already carries the difference these two altitudes make, so no solve consumes them.
   */
  zBase: { unit: "m", decimals: 1 },
  /**
   * `Flèche à vide cible` `D_target`, m — **prefilled from a read-out**, so 1 decimal would cost
   * ±0,05 m of garde per round trip through the tightness mode switch.
   */
  D_target: { unit: "m", decimals: 2 },
  /**
   * `Prétension` `T_target`, daN — the tension at the tensioning anchor, per member (#85).
   * Prefilled from its read-out like `H`, and read on the same dynamometer grain; the deduced
   * `Prétension` row renders through this row too.
   */
  T_target: { unit: "force", decimals: 1 },
  /**
   * `Tension horizontale` `H_target`, daN — prefilled; 0,05 daN has no effect. The deduced
   * `Tension horizontale` read-out is the same grandeur at the same grain, and § 3 tables it
   * once: both render through this row.
   */
  H_target: { unit: "force", decimals: 1 },
  /**
   * `Longueur non tendue` `L₀`, m — **measured**: 1 decimal is 0,21 m of flèche, 0,20 m of garde,
   * 8 % of the shipped margin. The sharp row, and the reason this table is not derivable.
   */
  L0: { unit: "m", decimals: 2 },
  /**
   * `Rapport V` `P / H` — dimensionless, prefilled from `m_p·g / H`; 2 decimals keep a 0,82
   * round trip through the mode switch inside 0,6 % of `H`.
   */
  vRatio: { unit: "", decimals: 2 },
  /** `Diamètre nominal` `d`, mm — `MBF ∝ d²`, so rounding 12,7 → 13 inflates `MBF` by 4,8 %. */
  d: { unit: "mm", decimals: 1 },
  /**
   * `Raideur relative` `k` — the two published defaults (22 and 1,5) must show as they are, and the
   * Courant Bandit 11 mm preset's deduced 1,27 must too: one decimal would show it as 1,3, a 2 %
   * move of `EA` the state does not hold. Departs from the v1 spec's one-decimal table (« 22,0 / 1,5 »),
   * deliberately (issue #83).
   */
  k: { unit: "", decimals: 2 },
  /** `Charge de rupture` `MBL`, daN — typed off a datasheet, always whole in daN. */
  MBL: { unit: "force", decimals: 0 },
  /** `Masse linéique` `μ`, kg/m — steel's `μ` is deduced to 4 decimals and enters `w` linearly. */
  mu: { unit: "kg/m", decimals: 4 },
  /** `Rendement de terminaison` `η_A` / `η_B` — §10.2/§10.3 publish their values to 2 decimals. */
  eta: { unit: "", decimals: 2 },
  /** `Masse du passager` `m_p`, kg — 1 kg is 0,8 % of `P`, an order under `EA`/`MBF`'s ±15 %. */
  m_p: { unit: "kg", decimals: 0 },
  /** `Enveloppe passager` `h_rider`, m — subtracted straight from garde; 0,1 m is 4 % of it. */
  h_rider: { unit: "m", decimals: 1 },
  /** `Garde min. admise` `h_clear,min`, m — a threshold compared to a 2-decimal garde; 0,1 m suffices. */
  h_clear_min: { unit: "m", decimals: 1 },
  /** `Coefficient dynamique` `DAF` — multiplies a tension gap: 0,05 on 664 daN is 33 daN. */
  DAF: { unit: "", decimals: 1 },
  /** `Position du passager` `x_D`, m — 1 px ≈ 1,2 m at 1500 m, so 0,1 m is under the pointer. */
  x_D: { unit: "m", decimals: 1 },
  /** `Vitesse du vent`, km/h — a forecast or an anemometer reads whole km/h, and no model reads finer. */
  windSpeed: { unit: "km/h", decimals: 0 },
  /** `Direction du vent`, ° — « 45 à 55° » is how the field trial reported it: whole degrees. */
  windDirection: { unit: "°", decimals: 0 },
  /**
   * `Charge de rupture` `MBF`, daN — **consumed by the Override badge**: the formula gives
   * 9073,98 where a freshly prefilled override holds 9074, and float equality would badge it.
   */
  MBF: { unit: "force", decimals: 0 },
  /**
   * `Raideur axiale` `EA`, **MN** — the declared carve-out. Badge consumer too; 0,01 MN is
   * 0,15 % over a ×1,52 range.
   */
  EA: { unit: "MN", decimals: 2 },
  /** `Poids linéique` `w`, daN/m — `w = μ·g` with `μ` at 4 decimals. */
  w: { unit: "force/m", decimals: 3 },
  /** `Corde` `√(L²+h²)`, m — compared against `L₀` (2 decimals) in §5.4's bound. */
  chord: { unit: "m", decimals: 2 },
  /** `Flèche à vide`, m — the same grandeur as `D_target`, hence the same grain. */
  sag: { unit: "m", decimals: 2 },
  /** `Flèche / portée`, % — §8.2's threshold is 3 %, and 4,00 against 3,99 has to be readable. */
  sagRatio: { unit: "%", decimals: 2 },
  /** `Tension permanente`, % MBF — §9.2's cap is 30 % and the useful regime sits under 7 %. */
  standingTension: { unit: "%", decimals: 2 },

  // ─── Results and read-out cells ──────────────────────────────────────────────────────────

  /**
   * `T_A` / `T_B` max statiques, daN. **1 decimal governs**: the first-run lock freezes
   * « 817,1 daN » while the rail's detail row and the strip's cell *sketch* « 817 daN » — the
   * frozen strings govern, and anyone preferring 0 decimals changes the lock in the same commit.
   */
  Tstatic: { unit: "force", decimals: 1 },
  /** `Enveloppe DAF`, daN — the headline `T max`, and what `FS effectif` divides by. */
  Tdaf: { unit: "force", decimals: 1 },
  /**
   * `Charge par ligne`, daN — `m_p·g / 2` on each of two Brins porteurs (#84). Read beside the
   * tensions it loads, so at their grain; whole kilograms halve to 0,49 daN steps, which it keeps.
   */
  memberLoad: { unit: "force", decimals: 1 },
  /** `Flèche chargée max`, m. */
  loadedSag: { unit: "m", decimals: 2 },
  /** `Garde min`, m — the app's central output. */
  clearance: { unit: "m", decimals: 2 },
  /** `Écart à vide`, m — the load's drop below the unloaded line at `x_D`, a flèche's grain. */
  unloadedGap: { unit: "m", decimals: 2 },
  /** The position of an extremum, `x` in m. */
  extremumX: { unit: "m", decimals: 1 },
  /** `FS effectif` — a safety factor, never a percentage. */
  FS: { unit: "", decimals: 2 },
  /**
   * `k` exigé par le régime — the safety divisor a régime fixes (3,0 sur tension totale, 5,0 sur
   * charge suspendue): both are published constants, so 1 decimal reproduces them exactly, exactly
   * as the textile `k` above does at the same precision. **Its own id**, not `k`: § 3's table
   * already spends that name on textile relative stiffness, a different grandeur that happens to
   * share a letter with a régime's divisor.
   */
  regimeK: { unit: "", decimals: 1 },
  /** `T adm` par extrémité, daN. Régime-dependent, therefore **absent** on the first screen. */
  Tadm: { unit: "force", decimals: 0 },
  /** `Réserve de tension`, daN — signed. Régime-dependent, absent on the first screen. */
  tensionReserve: { unit: "force", decimals: 0 },
  /**
   * `Pente locale`, % — **downhill negative**, 1 decimal. Percent matches the `flèche / portée`
   * read-out and an x axis in metres; degrees were rejected because a degree figure invites
   * reading the chart's *drawn* angle, which the vertical exaggeration has already distorted.
   */
  localSlope: { unit: "%", decimals: 1 },
  /** `Couverture`, pas — « 260 / 260 », and the denominator is `grid.length`, not `SWEEP_STEPS`. */
  coverage: { unit: "pas", decimals: 0 },
} as const satisfies Record<string, QuantityRow>;

/** Every grandeur § 3's table gives a row. The keys are the spec's symbols where it has one. */
export type QuantityId = keyof typeof QUANTITIES;

/** Newtons per unit of the selected force unit — the whole of « forces convert, never re-label ». */
const N_PER_UNIT: Record<ForceUnit, number> = {
  /** 1 daN = 10 N. The selector's default, and the URL's unit. */
  daN: 10,
  /** 1 kN = 1000 N. */
  kN: 1000,
  /** 1 kgf = `KGF` N, its strict definition. */
  kgf: KGF,
};

/** Newtons per MN — the `EA` carve-out's only conversion. 1 MN = 10⁶ N. */
const N_PER_MN = 1e6;

/** Is this row a force, i.e. does the global selector move it? `EA` is **not**: it is always MN. */
function followsSelector(id: QuantityId): boolean {
  const { unit } = QUANTITIES[id];
  return unit === "force" || unit === "force/m";
}

/**
 * The unit a value renders in, ready to sit beside the number. Empty for the dimensionless rows,
 * so `« 8,80 »` carries no trailing space.
 *
 * @param unit the global force selector. Ignored by every row that does not follow it — that is
 *   the point of a **global** selector with **one declared** carve-out.
 */
export function unitLabel(id: QuantityId, unit: ForceUnit = "daN"): string {
  const kind = QUANTITIES[id].unit;
  if (kind === "force") return unit;
  if (kind === "force/m") return `${unit}/m`;
  return kind;
}

/**
 * The row's decimals **in the unit it is about to render in**.
 *
 * Force units derive from the daN column rather than carrying rows of their own: `kN` = daN
 * decimals **+ 2** (1 kN = 100 daN) and `kgf` = daN decimals (1 kgf ≈ 0,98 daN). So `MBF` reads
 * 9074 daN / 90,74 kN and a tension reads 253,5 daN / 2,535 kN — **the resolution never
 * coarsens on a switch**, which is the arithmetic half of the physics-neutrality claim.
 */
export function displayDecimals(id: QuantityId, unit: ForceUnit = "daN"): number {
  const { decimals } = QUANTITIES[id];
  if (!followsSelector(id)) return decimals;
  return unit === "kN" ? decimals + 2 : decimals;
}

/**
 * Canonical → display. Identity for every row the selector does not move, a scale factor for the
 * forces, and N → MN for `EA`.
 *
 * @param value the value in the row's canonical unit (metres, mm, kg, kg/m, **N**, percent).
 */
export function toDisplay(id: QuantityId, value: number, unit: ForceUnit = "daN"): number {
  const kind = QUANTITIES[id].unit;
  if (kind === "MN") return value / N_PER_MN;
  if (kind === "force" || kind === "force/m") return value / N_PER_UNIT[unit];
  return value;
}

/**
 * Display → canonical, the exact inverse of {@link toDisplay}.
 *
 * This is the *read* direction of a unit switch, and a unit switch **writes nothing**: state
 * stays canonical and daN → X → daN is the identity. The function exists for the one path that
 * does write — a user typing into a field while the selector is on kN — and for the round-trip
 * the test asserts.
 */
export function fromDisplay(id: QuantityId, shown: number, unit: ForceUnit = "daN"): number {
  const kind = QUANTITIES[id].unit;
  if (kind === "MN") return shown * N_PER_MN;
  if (kind === "force" || kind === "force/m") return shown * N_PER_UNIT[unit];
  return shown;
}

/**
 * Round half **away from zero**, so −82,5 and 82,5 both round outward and « 83 kg » commits the
 * way the user read it. `Math.round` alone rounds half *up*, which is asymmetric on the signed
 * rows (`h`, `Réserve de tension`, `Pente locale`).
 *
 * The `toPrecision(15)` step removes binary representation noise before the comparison — without
 * it `1.005 * 100` is `100.49999999999999` and a value the user sees as exactly half rounds the
 * wrong way. Negative zero is normalised to `0`: « −0,0 m » is not a reading.
 */
function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  const magnitude = Math.round(scaled) / factor;
  if (magnitude === 0) return 0;
  return value < 0 ? -magnitude : magnitude;
}

/**
 * **§ 8's prefill rule, and the reason this module is state and not formatting**: the value a
 * prefill writes is the *displayed* one, never the underlying float. 201,84 enters state,
 * 201,8412773 never does — so serialisation is verbatim and there is no rounding decision left
 * at the URL boundary.
 *
 * Rounds in the **display** unit and returns the result in the **canonical** one, which is what
 * « the displayed value » means while the selector is on kN or kgf. Returns canonical **newtons**
 * for every force, including `EA`, whose 6,90 MN comes back as 6 900 000 N.
 */
export function roundToDisplay(id: QuantityId, value: number, unit: ForceUnit = "daN"): number {
  const shown = roundHalfAwayFromZero(toDisplay(id, value, unit), displayDecimals(id, unit));
  const canonical = fromDisplay(id, shown, unit);
  // The result sits on a display grid by construction, so the last bits of the conversion are
  // noise: `253,5 kgf → N` is 2485.9857749999996, and this value goes into **state** and then,
  // ÷10, into the URL. Clean it here rather than at serialisation — § 8, *round earlier*.
  return canonical === 0 ? 0 : Number(canonical.toPrecision(15));
}

/**
 * The number as the user reads it — fixed decimals, padded, French comma, **no unit**. The form
 * of a field's value: « 6,00 », never « 6 ».
 *
 * The sign is a plain hyphen-minus rather than a typographic « − », because a formatted value is
 * written back into an `<input type="text" inputMode="decimal">` and has to be re-typeable on
 * the keypad the field was chosen for. Thousands are **not** grouped, for the same reason and
 * because § 5's cell budget measures « 12345 daN » ungrouped.
 *
 * @param value the value in the row's canonical unit. Must be finite — a NaN here means an
 *   engine `Result` was unwrapped without checking, which is a defect upstream, not a display
 *   state: § 6's « — » has one legal source and it is not this function.
 */
export function formatValue(id: QuantityId, value: number, unit: ForceUnit = "daN"): string {
  const decimals = displayDecimals(id, unit);
  const shown = roundHalfAwayFromZero(toDisplay(id, value, unit), decimals);
  const digits = Math.abs(shown).toFixed(decimals).replace(".", DECIMAL_MARK);
  return shown < 0 ? `-${digits}` : digits;
}

/**
 * {@link formatValue} with the row's unit appended — « 151,64 m », « 9074 daN », « 6,90 MN »,
 * « 4,00 % », and « 8,80 » for the dimensionless rows, which take no suffix and no space.
 *
 * This is the form the first-run regression lock freezes, and the form every read-out renders.
 */
export function formatQuantity(id: QuantityId, value: number, unit: ForceUnit = "daN"): string {
  const label = unitLabel(id, unit);
  const shown = formatValue(id, value, unit);
  return label === "" ? shown : `${shown} ${label}`;
}

/**
 * « à x 74,8 m » — where along the span an extremum or the rider sits. The flèche à vide, the
 * read-out cell's garde and the Rail's « passager à x » all name a position this way.
 */
export function formatAtX(x: number): string {
  return `à x ${formatQuantity("extremumX", x)}`;
}

/**
 * Do two canonical values read the same? **The stale-Override badge's comparison**, which § 3
 * requires to run at the field's display precision and never on floats: a freshly prefilled
 * override holds 9074 daN against a formula value of 9073,98, and float equality would badge
 * every override on every load — a badge that always fires is a badge nobody reads, and this one
 * exists to catch a 12 mm breaking force reported on a 16 mm rope.
 *
 * Compares the rendered strings rather than the rounded numbers, so « what the user sees » is
 * literally what decides — no float can slip between the two.
 */
export function equalAtDisplayPrecision(
  id: QuantityId,
  a: number,
  b: number,
  unit: ForceUnit = "daN",
): boolean {
  return formatValue(id, a, unit) === formatValue(id, b, unit);
}
