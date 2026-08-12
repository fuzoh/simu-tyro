# A10 · The Rail's output half — `Résultats`, verdict, provenance

Stage: A10
Status: open
Blocked by: 13, 24
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 6, § 9

## Delivers

The Rail's output half — `Résultats` → `Provenance` → `Ce que cet outil ne calcule pas` — carrying
**thirteen reported values, four of them headline**, the **criteria × ends verdict grid**, the **five
verdict states**, the provenance aggregate with its two chip levels and three-tier warning ladder,
and **« Résultats sans régime »**.

## Gate

« Résultats sans régime »: the four `k`-dependent rows **and** the criteria × ends grid are
**absent, not dashed**.

## Notes

- **There is no results panel.** The Rail is **one scrolling column with an input half and an output
  half**; a right-hand column would steal the width the chart design bought.
- **No accordion.** `flèche/portée` is a *validity* read-out, not a nicety.
- **Five verdict states, each mapping to a different user action**: `Dans les limites` ·
  `Marge faible` at `FS_eff < 1,1·k` · `Hors limites` · `Refusé — usage interdit` · `Indéterminé`.
  A **sixth situation is not a state**: with no regime chosen the banner is **absent** and replaced by
  a prompt — nothing was attempted, so it is not `Indéterminé`.
- **« — » belongs to `Indéterminé` alone.** Three separate tickets spent effort keeping that glyph
  unambiguous; a later "consistency" pass that dashes empty cells undoes all three.
- **Margin reads as `FS effectif` against the required `k`**, never percentage utilisation — that
  recruits the « 80 % is fine » heuristic into a tool sized on paywalled constants.
- **The grid's empty cells are legitimate**: `T adm` is per end because `η_t` is, while the
  suspended-load criterion is **one cell**. An implementer reading « FS ≥ 5 sur charge suspendue »
  alone will write `MBF/P` and get **77** — a criterion that can never bind. State the numerator.
- **The aggregate list pins the régime first.** Three of five regimes are unconfirmed, and a regime is
  not one input among six: it multiplies into every margin.
- **Two provenance idioms, two chip levels.** The chip covers exactly the three tags the binding rule
  groups; §0.2's seven live in the popover. **DAF is a fourth case** — well-attested *and* editable, so
  no chip. The warning ladder's ambient tier is the out-of-band `k`, which fires **always** and is
  therefore never an alarm.
- **The « ~5 m spacing » warning fires on the whole upper half of the span range** (crossed at ≈1000 m,
  and 200 points is a hard ceiling) — frequent but conditional, and it names a real blind spot.
- **The verdict grammar is the mechanism, not copy taste**: never « conforme » / « non conforme », and
  **always name the chosen régime inside the sentence**, so the claim is about the rule the user picked
  rather than about the law. This is ADR-0003, and it is what a later "simplification" would undo.
- **« Ce que cet outil ne calcule pas » is standing**, with §8.3's unapplied γ-factor load-combination
  formula in its popover — because printed on the surface, someone applies those factors by hand and
  believes the result.
- Terrain quality is disclosed **in manual mode too**, and the copy must actually say that **dénivelé
  buys no clearance** — the shipped 12 / 12 m defaults depend on that sentence existing.
