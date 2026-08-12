# E10 · `verdict.ts` — §10 regimes and the criteria × ends grid

Stage: E10
Status: open
Blocked by: 08, 11
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 6, § 11

## Delivers

`src/lib/sim/verdict.ts` — §10's regimes as **rule sets**, `T_adm = η_t·MBF/k`, the §10.4
family × usage gate, the DAF envelope `T_DAF = T_vide + DAF·(T_chargé − T_vide)` per step, and the
five verdict states.

## Gate

| Case | Value |
| --- | --- |
| first-run line | `FS effectif` **8,80 (A) / 9,06 (B)**, `T adm` 2722 daN, réserve **−111 daN** |
| DAF envelope | `T_DAF` 927,9 / 901,5 daN from `T_vide` 263,4 / 253,7 and `T_chargé` 817,1 / 793,5 at `DAF` 1,2 |
| suspended-load cell | **one** cell, numerator `min(η_A, η_B)·MBF` over `DAF·(T_chargé − T_vide)` ⇒ **12,29**, against **8,80** on total tension — so **total tension governs** |
| the wrong readings, asserted too | bare `MBF/P` scores **77** and can never bind |
| §10.4 gate | `PERMANENTE` + textile is **rejected** |
| textile pair | `MBL` 100 kN ⇒ **11,94** « dans les limites »; 60 kN ⇒ **7,63** « hors limites », same line |
| coverage | `coverage < 1` **suppresses** the verdict (`Indéterminé`); it never qualifies it |
| taut-line double warning | at the minimum attainable flèche/portée (**0,15 % at 200 m**, **0,72 % at 1000 m**, both at the breaking-load bound) the `< 3 %` ⚠ fires **together with** the DAF-regime clause — assert **both**, so nobody removes one as a duplicate |

`[MEASURED]` bar: `1e-3` relative.

## Notes

- **A regime is a rule set, not a `k`.** WorkSafe's two criteria bite on different quantities and
  *which one binds* is information. There is **no free `k` anywhere** — §10 is not tunable, and a
  typed `k` is blending with extra steps.
- **The suspended-load criterion is one cell, not per end.** §10.1's row is `[REGULATOR]` quoted
  verbatim and says only « `FS ≥ 5` on suspended load ». `min()` because a line fails at its
  **weakest** termination, so one criterion cannot honestly report two margins. Dropping `η_t` to
  bare `MBF` was rejected — it would make this the only place in the app crediting an unterminated
  rope, an optimistic outlier in the direction that kills.
- **Total-tension `FS effectif` is per end**: `η_A · MBF / T_DAF,A`. The `min(η)` form belongs to the
  suspended-load cell **alone**.
- **`Refusé — usage interdit` survives an ample margin** — `FS effectif 8,0` against `k = 3` and still
  refused, on §10.2's grips prohibition. It is neither a limits failure nor a warning above a pass.
- **`Indéterminé` suppresses rather than degrades**, because the steps that fail to converge are the
  ill-conditioned ones: a verdict on the solved 87 % is biased optimistic *by construction*.
- **DAF touches the verdict only, never clearance.** `T_vide` is a **reporting** requirement —
  `solveSpan` already produces it, one solve, not a per-step one.
- The ACCT 5:1 / 10:1 conflict ships as **two adjacent picker entries**; one entry with a toggle
  would imply somebody knows which is right. The 2× proof test is an **uncomputable obligation**.
