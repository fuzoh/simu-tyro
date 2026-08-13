# A2 · Quantity formatting — the display-precision table

Stage: A2
Status: done
Blocked by: 15
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 3 (*Précision d'affichage par grandeur*), § 8, § 11

## Delivers

**One** implementation of the per-quantity display-precision table — suggested path
`src/lib/format/quantity.ts`. The path is free; the **singleness** is not.

Also here: the global force unit selector's conversion (daN default / kN / kgf), `KGF = 9.80665`,
`G = 9.81` fixed and unexposed, and the declared **`EA`-in-MN carve-out**.

## Gate

Table-driven cases per row, including the decimal-mark column. Two that are not formatting:

- the stale-Override badge does **not** fire on an untouched 9074 daN override against a 9073,98
  formula value;
- unit-switch identity — **« le changement d'unité n'écrit jamais dans l'état ; daN→X→daN est
  l'identité »**.

## Notes

- **This is load-bearing state, not cosmetics.** A prefill writes the **displayed** value into state,
  never the underlying float: 201,84 enters, 201,8412773 never does. Built after the URL codec it
  would be written twice, and the badge would fire **on every load for every override**.
- **Three consumers, two of which are not readers**: the prefill rule, the stale-Override badge
  comparison *at display precision*, and the first-run regression lock.
- **`L₀` carries 2 decimals**, and this is a measured sensitivity decision rather than a mechanical
  derivation: 1 decimal (151,6 against 151,644 m) shifts flèche by 0,21 m, `H` by 3,5 % and garde by
  0,20 m — **8 % of the shipped margin** — where 2 decimals cost 0,02 m. Every row states a
  **minimum** with its reason.
- Its failure is **silent and in the wrong direction**: a missing or too-coarse row produces a badge
  on every load, training the user to ignore the badge that exists to catch a 12 mm breaking force on
  a 16 mm rope.
- **Forces convert, never re-label** — that is what kills the 10× input-error class, and it is why the
  control is provably physics-neutral. In the URL forces are **daN always**.
- **The `EA`-in-MN carve-out is declared, with its reason**: `EA` renders « 6,90 MN » under every
  setting, because the strict-global rule's argument is *eyeball comparability* (437 daN read against
  90,7 kN) and `EA` is never compared to a tension by eye. In the URL, `ea` is daN like every other
  force.
- **`pente locale` is percent, 1 decimal, downhill negative** — fixed during spec assembly, not in a
  ticket, and the one display convention the spec decided rather than carried.
- Régime-dependent rows are **absent on the first screen**, not dashed.
- **`MBF` obeys the global force unit strictly.** A kN carve-out would put 90,7 kN beside 437 daN and
  invite a 100× misread.

## Comments

**Done.** `src/lib/format/quantity.ts` ships § 3's table as **one** `QUANTITIES` object — 33 rows,
both halves of the spec's table (inputs/deduced *and* results/read-out cells) in its order, each row
carrying its *Minimum justifié par* reason so a decimals change cannot land without its argument.
Around it, the five functions the three consumers need: `displayDecimals` (the daN column, `kN` = +2,
`kgf` unchanged), `toDisplay` / `fromDisplay` (the selector's conversion, `PER_DAN` and the MN
carve-out), **`roundToDisplay`** (§ 8's prefill rule — the *state* function: rounds in the display
unit, returns canonical), `formatValue` / `formatQuantity` (padded fixed decimals, French comma, unit
suffix) and **`equalAtDisplayPrecision`** (the stale-Override badge, comparing *rendered strings* so
no float can slip between them). `G = 9.81` and `KGF = 9.80665` live here, unexposed as fields.

`quantity.test.ts` — 105 cases. One case per row plus a coverage assertion that `ROWS` **is**
`Object.keys(QUANTITIES)`, since the table's failure mode is a *missing* row; a decimal-mark case per
row (comma present exactly when the fraction is, fraction length = the row's decimals, never a `.`);
the two formatting rules (« 6,00 » never « 6 »; 82,5 kg commits as « 83 kg »); half-away-from-zero on
the signed rows and no « −0,0 »; the selector (9074 daN / 90,74 kN / 9253 kgf, `w` as daN/m ⁄ kN/m ⁄
kgf/m, 120 kg → 120,04 kgf); the `EA`-in-MN carve-out under all three settings against `MBF`'s strict
obedience; **the unit-switch identity** (round-trip to float precision, twenty toggles bit-identical,
a `kN` prefill landing on the same state as a daN one, and a per-row proof that the display grid
never coarsens); and **the badge** — 9074 against 9073,98 does not fire, the same taken from
`steelFormula` rather than a quoted number, and it *does* fire once `d` moves to 16 mm.

**A1's lock is now closed** (§ 10 P2's « A2 precedes A1's *test* »): `first-run.test.ts`'s eleven
interim numeric assertions are **string equalities** through this module, `OPENING_STATE` and its
`measuredOffBy` bar deleted — no tolerance appears in that file any more. `MBF` / `EA` / `w` are
frozen as strings too (« 9074 daN » · « 6,90 MN » · « 0,536 daN/m »), because the first two are the
badge's inputs. Mutation-checked: dropping `L₀` to 1 decimal reds **both** files, which is the
coupling the ticket describes.

Judgement calls, where the spec was silent:

- ~~**Canonical units are § 7's URL units, not SI**~~ — **withdrawn, see the correction below.**
  The percent rows do take a percentage (`4`), not a ratio.
- **The sign is an ASCII hyphen-minus, not « − »**, and thousands are **not grouped**. A formatted
  value is written back into an `<input type="text" inputMode="decimal">` and has to be re-typeable
  on the keypad that widget was chosen for; § 5's cell budget also measures « 12345 daN » ungrouped.
  The spec's own « 16 129 daN » badge line is the one datum the other way, and it is prose.
- **Rounding is half away from zero**, with a `toPrecision(15)` de-noising step. `Math.round` rounds
  half *up*, which is asymmetric on the three signed rows (`h`, `Réserve de tension`, `Pente
  locale`), and 1.005 × 100 is 100,49999999999999 in binary — a value the user reads as exactly half
  would round the wrong way. `roundToDisplay` also normalises its result through `toPrecision(15)`,
  because `90,74 kN → daN` is 9074.000000000002 and that number goes into state and then verbatim
  into the URL — § 8's « round earlier », applied to the conversion as well as to the value.
- **`Prétension cible` `H_target` carries the deduced `Prétension H à vide` read-out too.** § 3 gives
  the grandeur one row, unlike flèche, which it rows twice; one row, documented, rather than a second
  that could drift.
- **`ForceUnit` is imported from `src/lib/scenario/types.ts`** rather than re-declared — ticket 16
  already declares it, and a second copy of a three-member union is a second place the selector can
  disagree with the URL's `u`.
- **Non-finite input is out of contract, and there is no guard.** § 6 gives « — » exactly one legal
  source and it is not this function; a NaN here means an engine `Result` was unwrapped unchecked.

Gates green: `bun run typecheck`, `bun run lint-type-aware`, `bun run test` (16 files, 552 cases).

**Spec-drift correction (§ 3, « SI internally, always. Canonical storage is **newtons** »).** The
judgement call above was not a silence: § 3 fixes canonical storage, and the Scenario already held
the engine's newtons (`TightnessSpec.H_target`, `MaterialSpec.MBL`/`overrides`), so the daN claim was
false wherever it met state. `quantity.ts` now takes and returns **newtons** for every `force`,
`force/m` and the `MN` carve-out — `PER_DAN` → `N_PER_UNIT` `{ daN: 10, kN: 1000, kgf: KGF }`,
`DAN_PER_MN` → `N_PER_MN = 1e6` — while `displayDecimals` is untouched, since the table is keyed on
the *display* unit (daN column, `kN` = +2, `kgf` unchanged). `quantity.test.ts`'s force cases feed
newtons (9074 daN → 90 740 N) and **every asserted string is unchanged**; `src/lib/url/schema.ts`'s
`daN()` is now the only N → daN conversion in the codebase. Gates green: `bun run typecheck`,
`bun run lint-type-aware`, `bun run test` (22 files, 762 cases).
