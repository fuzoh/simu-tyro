# E10 · `verdict.ts` — §10 regimes and the criteria × ends grid

Stage: E10
Status: done
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

## Comments

**Built.** `src/lib/sim/verdict.ts` — `evaluateVerdict(v)` over the §10 framework, with `REGIMES`
(the five entries as ordered criterion lists), `TERMINATIONS` (§10.2/§10.3, the grips prohibition
carried as data), the `VERDICT` thresholds, and `isRegimeAvailable`, `isFamilyAllowed`,
`allowableTension`, `amplifiedTension` as named exports — plus its colocated `verdict.test.ts`
(50 cases) and one new `[MEASURED]` row, `UPSIZING_MARGIN`, in `__fixtures__/theory-15.ts`.
The three gates are green: `typecheck`, `lint-type-aware`, `test` (402 cases over 13 files).

Every gate row reproduces from the engine's own chain (one unloaded `solveSpan` plus
`sweep(…, 240)`), asserted at the `[MEASURED]` tier floored at each row's recorded last digit:
`FS effectif` 8,7988 / 9,0560 · `T adm` 2722,2 daN · réserve +1794,0 daN at `k` 3 and
**−111,5 daN** at `k` 10 (the one row where the 5 N floor actually binds) · `T_DAF` 928,15 /
901,79 from `T_vide` 263,46 / 253,81 and `T_chargé` 817,37 / 793,79 · suspended load **12,286**
against 8,80, so total tension governs · textile 11,935 / 7,629 · taut-line flèche/portée 0,146 %
at 200 m and 0,721 % at 1000 m, **both** warnings raised. Mutating `amplifiedTension` to return
the static maximum turns 12 cases red, so the DAF envelope is load-bearing in the suite rather
than merely present.

Judgement calls, where the spec was silent:

- **`VerdictInput` gains two fields beyond § 2's block**, on the `SpanInput.strength` precedent:
  `family` (required — §10.4 is a *family × usage* rule and `strength` is `MBF` or `MBL` without
  saying which; inferring the family from a termination id would make a use-class refusal depend
  on a hardware pick) and `sagRatio` (optional — § 6's two taut-line warnings are scored here,
  beside the `DAF` figure the second one qualifies; omitted they simply do not fire, so § 2's own
  call shape still type-checks).
- **The banner's governing cell is worst-state-first, then lowest `FS`.** § 6 states the tie-break
  only for the all-clear case (« 12,29 contre 8,80 ⇒ la tension totale gouverne »); ranking on
  `FS` alone would let WorkSafe name a *clearing* total-tension cell while the suspended-load cell
  fails, contradicting its own « Hors limites — critère charge suspendue » banner. Both orders are
  asserted: the shipped line, and a synthetic slack line where the two disagree.
- **« Régime indisponible » returns a refusal, not a throw.** § 7 routes it to a blocking form
  error with `[ Choisir un autre régime ]`, so it normally never reaches the engine; reached
  anyway (a link arriving with `reg=secours10` on a steel line), a refusal can be neither misread
  as a green nor crash the Rail. Same treatment for §10.4's family gate, likewise a blocking Solve
  Gate error upstream.
- **Refusals outrank `Indéterminé`, and both keep the grid.** A prohibition does not become
  unknown because one step failed; and § 6 keeps the converged margins on screen, so `cells` stays
  populated in both states while `governing` is `null` — that null **is** the suppression.
- **§9.2's 30 % standing-tension warning fires on textile only** (it is a creep and service-life
  bound on family B), and an empty traverse returns `NaN` envelopes with `atStepIndex: -1`,
  reusing `evaluateClearance`'s own flag for « the traverse never happened ».
- **Two untracked scratch artefacts were deleted**, `.probe.ts` and `src/lib/sim/__scratch.test.ts`
  left behind by earlier stages: both failed `lint-type-aware` (an unused variable, and a test
  with no assertion), and neither is a deliverable of any ticket.
