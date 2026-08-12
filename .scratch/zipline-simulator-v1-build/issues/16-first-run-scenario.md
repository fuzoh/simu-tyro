# A1 · `FIRST_RUN_SCENARIO` and its formatted-string lock

Stage: A1
Status: open
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
