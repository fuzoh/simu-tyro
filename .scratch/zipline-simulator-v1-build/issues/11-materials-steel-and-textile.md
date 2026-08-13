# E8 · `materials/steel.ts` and `materials/textile.ts`

Stage: E8
Status: done
Blocked by: 03
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 3, § 11

## Delivers

`src/lib/sim/materials/steel.ts` — §13.1's EN 12385-4 K-factors taking `(d, R₀, construction)` to
`MBF` / `EA` / `μ` — and `src/lib/sim/materials/textile.ts` — §13.2's `EA = k·MBL` from
`(classe, MBL, μ, k)`.

## Gate

| Case | Value |
| --- | --- |
| steel: `d` 12 mm, `R₀` 1770, 6×19 âme métallique | `MBF` **9074 daN**, `EA` **6,90 MN**, `μ` **0,5465 kg/m** |
| steel, un-rounded | the formula value **9073,98 daN** — the Override badge's input |
| textile | `EA = k·MBL` at `k` 22 |
| structural | steel and textile share **no** helper |

`[MEASURED]` bar: `1e-3` relative.

## Notes

- **The A/B separation lives here and nowhere else** — two files, **no shared base module**. A
  `materials/index.ts` barrel is the specific "tidying" that undoes it. The catenary itself is
  material-blind and is not duplicated.
- **Steel derives from geometry; textile transcribes from a datasheet.** That asymmetry is the whole
  design. Override is **steel-only**, per value, and survives a `d` change with a **stale badge** —
  never cleared, never silently kept.
- **`E_app = 115 GPa` and `C = 0.4165` are pinned in prose, never fields.** They only ever appear as
  a product, and two knobs for one number is two ways to be wrong.
- **Range-valued factors give point values, never bands.** `[5.53 ; 8.41] MN` is the union of two
  handbook ranges, not a confidence interval.
- **A zip line never enters §13.2's attested `k` band** — 0,6 % MBL standing, 6,3 % loaded, against a
  table measured at 10–30 %. So `k` is a plain field whose out-of-band warning is **ambient state,
  not an alarm**, and it fires always.
- Polyester ships `k` **blank and required** — nobody published it.
- **Built before `parameterise.ts`** (ticket 12 here), because `resolveL0`'s failure re-emits the
  §5.4 bound in the driving quantity — « Prétension maximale atteignable : 9 074 daN » — and 9 074
  daN is this module's output. Built after, it would be tested against a hand-typed strength.
- **Zero shipped product presets.** Every product row in `docs/references/` is compromised.

## Comments

**Built.** `src/lib/sim/materials/steel.ts` (`STEEL` constants, `steelFormula(d, R₀, construction)`,
`resolveSteelValues(spec)`, `deriveSteel(spec)`), `src/lib/sim/materials/textile.ts` (`TEXTILE`
constants, `deriveTextile(spec)`), their two colocated tests, and two new `[MEASURED]` fixture rows
in `__fixtures__/theory-15.ts` — `STEEL_12MM_IWRC_1770` and `TEXTILE_STIFFNESS`, with `SteelCase` /
`TextileCase` types that hoist `construction` and `ropeClass` out of the numeric `in` block exactly
the way `ClearanceCase` hoists `contact`. No barrel, no shared helper, no import between the two
files; `g = 9,81` is declared twice on purpose and the tests read the directory listing and both
files' import specifiers so the day someone adds `materials/index.ts` a case goes red. Gates green:
`typecheck`, `lint-type-aware`, `test` (314 passing).

Judgement calls, all where the spec was silent about *where* a stated value lives:

- **Three steel functions, not one.** `steelFormula` is override-blind (the stale badge's input,
  and the ticket's stated `(d, R₀, construction)` signature), `resolveSteelValues` applies the
  per-value overrides for the « Valeurs déduites » read-outs, `deriveSteel` reduces to § 2's
  `{ w, EA, strength }`. Collapsing the middle one would make the UI re-implement override
  precedence — one rule in two places.
- **§13.2's per-class `k` defaults (22 / 1,5 / `null`) and the 10–30 % MBL attested band live in
  `textile.ts`.** They are §13.2 data with a stated consumer, and a second copy in the form layer
  could drift; `polyester: null` keeps « nobody published it » expressible.
- **9073,98 daN is recorded as a `[MEASURED]` row, not re-derived.** Exact arithmetic on the spec's
  own factors gives `0,356·144·1770 = 90 737,28 N = 9073,728 daN`, 0,25 daN below ticket 14's
  recorded 9073,98 — 0,03 of the `1e-3` bar, so the case passes as written and the ticket's number
  stays the assertion. Both roundings display as 9074 daN, so the badge property is unaffected.
- **§13.1's attested 6 mm 6×19 examples are deliberately not asserted** (12,9 / 14,4 / 21,0 kN):
  §13.1 records that they and the `K`-factors disagree (`K·36·1770` is 21,0 kN, not 12,9), and `K`
  is what the spec ships. A test file says so, so nobody ports them later as missing coverage.
- **`d`'s [6, 26] mm warning band is *not* here** — it is `[CONVENTION]`, tier one, and belongs to
  the form validators (ticket 24).
