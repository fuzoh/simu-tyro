# A2 · Quantity formatting — the display-precision table

Stage: A2
Status: open
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
