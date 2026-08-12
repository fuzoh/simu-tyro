# E8 · `materials/steel.ts` and `materials/textile.ts`

Stage: E8
Status: open
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
