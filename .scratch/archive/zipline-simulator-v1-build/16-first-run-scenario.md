# A1 · `FIRST_RUN_SCENARIO` and its formatted-string lock

Stage: A1
Status: done
Blocked by: 14, 15
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 9, § 11

## Delivers

`src/lib/scenario/first-run.ts` — **one** constant object serving the opening state, the reset
target *and* the link-completion values — plus `first-run.test.ts` beside it.

Shipped line: **150,0 m · −18,0 m · hauteurs 12,0 / 12,0 m · flèche à vide cible 6,0 m** ⇒
L₀ 151,644 m · H 253,5 daN · T max statique 817,1 daN · enveloppe DAF 927,9 daN · **garde min 2,44 m
à x 74,1** · couverture 260/260 · FS effectif 8,80 (A) / 9,06 (B).

## Gate

Eleven **formatted strings**, not floats:

```
« 151,64 m » · « 253,5 daN » · « 6,00 m » · « 4,00 % » · « 2,90 % » · « 817,1 daN »
· « 927,9 daN » · « 7,48 m » · « 2,44 m » · « 8,80 » · « 9,06 »
```

Plus three structural assertions no string carries: **`contact === "none"`**, **`coverage === 1` over
`grid.length === 260`**, and **zero steps in violation**.

## Notes

- **The lock only closes once ticket 17 (A2) exists** — every one of those strings runs through the
  display-precision table. Ship the constant here; land the assertions with A2. § 10 P2 says A2
  precedes A1's *test*, which is why this ticket is not finished by the object alone.
- **`1e-3` relative on `L₀` is ±0,15 m, and 0,15 m of `L₀` moves garde by ≈0,15 m** — a tolerance that
  would let the opening screen drift by **6 % of its safety margin** and stay green. That is the whole
  reason the lock asserts what the user reads.
- **One object, not three copies**: « Réinitialiser le scénario » and a link that omits keys must land
  on exactly the values a fresh visit does.
- **The 12 / 12 m platforms are forced by arithmetic, not taste.** Every intuitively realistic pair
  (A 12, B 6) opens in « Câble au sol » — −1,04 m at 150/−18, −1,53 m at 200/−25. The defence rests on
  § 6's terrain-provenance copy actually saying that **dénivelé buys no clearance**; if that sentence
  gets trimmed, these defaults become misleading.
- **Flèche ships as the active tightness segment** because it is the only mode whose value is exact at
  display precision: a direct-`L₀` default at one decimal costs 0,21 m of flèche and 0,20 m of garde,
  **8 % of the shipped margin**.
- **The shipped line is allowed to read « Hors limites » under ACCT 10:1** (8,80 against k = 10). The
  app opens **verdict-less**, so nothing fails on first contact; up-sizing to 14 mm does not fix it
  (10,79, still « Marge faible »), and choosing hardware so a `[CONVENTION]` passes would turn the
  shipped Material Spec into an implicit safety recommendation.
- **No worked example, no named scenario, no bundled trace.** The first-run scenario *is* the worked
  example.
- The lock also freezes the **French decimal comma**, every row of the precision table, and the
  shipped rider position `x_D = 75,0 m` — 0,9 m from the traverse minimum, therefore inside the
  `max(1 m, 1 % of span)` rule, so the clearance cell reads plainly « Garde min » on first paint
  instead of relabelling itself.
- One collision the lock **settles rather than hides**: it freezes « 817,1 daN » at 1 decimal while
  the rail's `T max statique` detail row and the strip's `T_A` cell print « 817 daN » at 0. **The
  frozen strings govern** — anyone preferring 0 decimals changes the lock in the same commit. The
  Rail's *headline* `T max` is the DAF-amplified **928 daN**, never 817, because `FS effectif` divides
  by it.

## Comments

**Done.** `src/lib/scenario/first-run.ts` ships `FIRST_RUN_SCENARIO` — one deeply-readonly constant
carrying § 9's field table verbatim (150,0 / −18,0 · hauteurs 12,0 / 12,0 · segment `Flèche` à 6,0 m ·
acier 12 / 1770 / 6×19 âme métallique **sans surcharge** · cosse / cosse à η 0,90 · 120 kg / 2,1 m /
DAF 1,2 · `x_D` 75,0 · daN · `PERMANENTE` · `regime: null`) — plus `firstRunDefaults()`, a
`structuredClone` so the store, « Réinitialiser le scénario » and link completion cannot rewrite each
other's values through a shared nested object. It holds **inputs only**: the opening state is
computed from them, never stored beside them.

**The lock is landed in its first stage, as § 10 P2 requires.** `first-run.test.ts` (24 cases)
reproduces § 9's measured table *from the constant*, through the whole chain — `deriveSteel` →
`resolveL0` → `solveSpan` → `sweep(…, 240)` → `evaluateClearance(…, 60)` → `evaluateVerdict` — and
asserts all eleven quantities plus the three structural ones. Measured green: `L₀` 151,6444 · `H`
253,52 daN · flèche 6,0000 m · 4,0000 % · 2,9024 % MBF · `T_A` statique 817,13 daN · enveloppe DAF
927,88 daN · flèche chargée 7,4831 m · garde 2,4399 m à `x` 74,117 (rider node 73,802) · FS 8,8011 /
9,0585 · `contact: "none"` · couverture 1 sur 260 · 0 pas en violation. The eleven are asserted **as
numbers at the `[MEASURED]` tier for now**; the test's header names ticket 17 (A2) as the change that
turns them into the eleven frozen strings. The `x_D`-within-`max(1 m, 1 % de la portée)` case and the
three structural assertions are already final.

Judgement calls, where the spec was silent:

- **`Scenario` needed a home, and it is `src/lib/scenario/types.ts`** — § 9 writes
  `FIRST_RUN_SCENARIO: Scenario` but no section declares the type. Declared there rather than inside
  `first-run.ts`, mirroring `src/lib/sim/types.ts`, so A5 and A6 import a type from a types module
  and not from a constant. It re-uses the engine's `TightnessSpec`, `MaterialSpec`, `TerminationId`
  and `RegimeId` rather than re-declaring them, and models § 7's absences as state: `regime: null`
  **is** « — choisir — », a steel spec with no `overrides` **is** « non surchargée ».
- **The retained inactive textile spec is a second export, `FIRST_RUN_RETAINED_TEXTILE`, not a field
  of the Scenario** — the two have different lifetimes: reset returns the *active* configuration to
  the defaults while « la Material Spec inactive conservée » survives, and by § 7's governing rule
  the retained alternate is the Session's anyway. Its `MBL` / `μ` are `null`, i.e. « vides et
  requis », never zero — hence the small `TextileDraft` type, since the engine's `TextileSpec` takes
  numbers and a blank field is not a number.
- **The Scenario → engine derivation stayed in the test.** § 9 fixes that module's surface at two
  exports, and the app's own derivation belongs to the store (A7–A9). Follow-up for whoever builds
  it: the store's chain and this lock's must not drift — re-point the lock at the store's derivation
  once one exists.
- **« Tension permanente » is scored on the greater unloaded *anchor* tension** (`max(T_A, T_B)/MBF`
  = 2,90 %), which is what `verdict.ts`'s §9.2 creep cap already reads; `H/MBF` would print 2,79 %
  and contradict the frozen string.
- **`FS effectif` is read through `evaluateVerdict` with `regime: "acct10"`** — § 9's own worked
  entry — although the shipped screen has no régime: `EndEnvelope.FS` is régime-**independent**
  (`η·MBF/T_DAF`), so the choice cannot move « 8,80 » / « 9,06 ».
- **The lock imports no §15 fixture.** `theory-15.ts` sits behind the engine's barrel and
  `index.test.ts` fails deep imports from outside `src/lib/sim/` — which matches § 11's ruling that
  this is a regression lock, not a physics fixture: its expectations are § 9's own table, quoted
  locally to the decimals § 9 records.

Gates green: `bun run typecheck`, `bun run lint-type-aware`, `bun run test` (15 files, 447 cases).

**Spec-drift correction (§ 3, « Canonical storage is newtons »).** `first-run.test.ts`'s private
`daN()` helper is **deleted** — the engine's newtons now go straight into `formatQuantity`
(`derived.strength`/`.EA`/`.w`, `vide.H`, `ends.A.Tstatic`/`.Tdaf`) and the eleven frozen strings are
unchanged — and the « every force here and in the URL is daN » claims in `scenario/types.ts` and on
`FIRST_RUN_SCENARIO.unit` are rewritten: forces in state are newtons, only the URL serialises daN,
`unit` is display-only.
