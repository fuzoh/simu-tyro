# A10 · The Rail's output half — `Résultats`, verdict, provenance

Stage: A10
Status: done
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

## Comments

**Built.** Two pure modules under `src/lib/rail/`, one component, and the `useSweep` seam lifted to
the app root:

| File | Carries |
| --- | --- |
| `src/lib/rail/results.ts` | § 6's **thirteen reported values** (four headline, nine detail) as data, the **criteria × ends grid** with the suspended-load numerator written out, the **five verdict sentences**, « Résultats sans régime » and its prompt, and the banner occupant A11 will place |
| `src/lib/rail/provenance.ts` | the **aggregate** and its membership rule, the two chip levels and the popover copy (now shared with the input half), the **three-tier warning ladder** as a table plus the rungs the Rail's rows carry, the five « Ce que cet outil ne calcule pas » lines and §8.3's popover formula |
| `src/components/rail/outputs.tsx` | `Résultats` · `Provenance` · `Ce que cet outil ne calcule pas`, rendered — presentation only, every string decided in `@/lib/rail/` |
| `src/components/app/use-scene-base.ts` | § 2's `useSweep` seam, at the app root |
| edited: `app.tsx` · `chart-block.tsx` · `shell.tsx` · `controls.tsx` · `inputs.tsx` · `sim/index.ts` · `docs/conventions/ui.md` | the wiring, `RailSection`'s scope aside, `ReadOut`'s warning slot, the ladder on the rows it qualifies, and one new barrel export |

**The gate holds, asserted directly**: with `Régime de sécurité` at « — choisir — » the row list is
exactly `Tmax · clearance · TmaxA · TmaxB · Tstatic · amplification · loadedSag · coverage`, the
grid is `[]`, and a scan over every value **and every qualifier** finds no « — ». Confirmed by
driving the real app: the opening screen reads « sur toute la traversée · aucun régime choisi »,
« T max 927,9 daN — ancrage A, passager à x 74,4 m », « Garde min 2,44 m — passager à x 73,8 m »,
the one-line prompt, and the aggregate at **4** with no régime pinned. Choosing WorkSafe QLD grows
the block to thirteen rows plus a three-row grid; choosing ACCT reads « Hors limites — ACCT /
parcours acrobatique — 10:1, critère tension totale (ancrage A) » and pins the régime first in the
aggregate. Suite **1050 → 1101**.

Three results worth naming:

- **The whole of § 6's canonical sketch reproduces from the app's own chain, as frozen strings** —
  « 8,80 · exigé 3,0 » · 927,9 · 2,44 m · **+1794 daN** · 2722 daN ×2 · 927,9 / 901,5 · 817,1 ·
  +110,8 · 7,48 m · 260 / 260 pas — and the suspended-load cell scores **12,29** against total
  tension's 8,80, so total tension governs. The réserve and the two-criterion pair are § 6's own
  figures, arrived at here independently.
- **The Rail's `T max` and the strip's `T_A` are visibly different numbers on the first frame** —
  927,9 daN traverse-amplified against 817,1 daN position-static — so § 6's scope finding
  demonstrates itself, with both scope labels present.
- **`Indéterminé`'s glyph never leaks.** The one place the code could have emitted « — » was the
  rider-position clause of an aggregate whose step is missing; it returns `null` and the clause is
  dropped instead.

Judgement calls, all where the spec is silent or loose:

- **`amplifiedTension` is now exported from the engine barrel**, whose comment had withheld it
  because « `EndEnvelope.Tdaf` already carries that number ». It does not in the state that ships:
  § 9 prints `T max` **with no régime**, where `evaluateVerdict` is by contract not called. The app
  has exactly one caller, it uses the formula in **both** states rather than switching between two
  code paths, and `results.test.ts` asserts it agrees with `evaluateVerdict`'s own envelope on the
  shipped line. The barrel's comment records that.
- **The `useSweep` seam moved from the Chart Block to `app.tsx`.** A8's memo was per-consumer; A10
  reads the same traverse, and two memos would run the sweep and the §11 reducer twice per
  keystroke. `x_D` stays out of it, so a drag still re-runs `placeRider` alone, inside the chart.
- **An invalid `DAF` removes the amplified rows along with the banner.** § 7 removes the banner and
  the grid alone on a Verdict Gate breach, but `daf=-1` — a value a link can carry — makes
  `T_vide + DAF·(T − T_vide)` read *below* the standing tension, optimistic in the one direction
  that kills. « T max statique », the garde and the couverture, which need no `DAF`, stay.
- **`Marge faible` names the régime**, against § 6's own sample copy (« Marge faible — FS effectif
  3,05 pour k = 3,0 ») and with its grammar *rule*, which says the régime is named **always** and is
  the stricter of the two: « Marge faible — EN 15567-1 : FS effectif 3,05 pour k = 3,0 ». `Refusé`
  and `Indéterminé` name none — neither sentence is a claim about a régime's limits.
- **A régime divisor renders at one decimal** — « k = 3,0 », « exigé 3,0 », « FS ≥ 5,0 » — the form
  § 6 prints in a sentence. § 3's precision table has no row for it: its `k` is the textile relative
  stiffness, a different grandeur sharing a letter.
- **Forces obey the precision table, not the sketch**: « 927,9 daN » and « 817,1 daN » where § 6
  sketches 928 and 817. The first-run lock already settled that collision in favour of the frozen
  strings, and A9 took the same call.
- **The grid renders as one block per criterion** rather than as a table: at 288 px a two-column
  grid holding a « une seule cellule, pas par extrémité » row has no honest column header. Each row
  states its divisor, its formula and its cells, and the governing cell is marked.
- **The aggregate's « edited » chip compares against the shipped value at display precision**, like
  the stale-Override badge, so a link carrying 120 kg reads « non confirmé » rather than « valeur
  utilisateur ». Membership is unaffected either way, which is § 6's actual rule.
- **Termination membership is read off the catalogue's tags** (`tag !== "[STD-ATTESTED]"`) rather
  than from a list of three ids, so § 6's « manchon à coin, serre-câbles étrier et **toutes** les
  textiles » cannot drift from the table it was derived from.
- **The ambient rung renders through the row's plain note slot**, never the warning slot: the ⚠
  lives in the renderer, and that tier is defined by *not* having one.
- **The terrain rung is not in `warningLadder`'s output** — `terrainDisclosure` already emits it
  inside the block it belongs to. `WARNING_LADDER` records all six rungs with their tier **and their
  owner**, so the ladder is readable in one place and nothing is said twice.
- **`Tension permanente`'s suffix follows the family** (« % MBF » / « % MBL »), per § 6's §1 note;
  A9 had hard-coded MBF.

Left standing for the tickets that own them: the banner slot itself (A11 — `Results.banner` and
`NO_REGIME_BANNER` are exported ready for it), the « Aucun résultat » cause line echoed into the
`Résultats` block (A11 — `deriveResults` returns `null` there and the section renders nothing), the
scrub-track gaps and the « — » cells under `Indéterminé` (A8 · A11), and the narrow-screen reflow of
the grid (A12 · A13).

Gates green: `typecheck`, `lint-type-aware`, `test` (**1101**, was 1050).

**Fix round.** Five findings from the review and the browser pass, all in the output half's own
seams; no spec decision moved.

- **The headline « exigé `k` » now comes from the criterion the printed `FS` belongs to.**
  `EndEnvelope.FS` is `η·MBF/T_DAF` — *total tension*, régime-independent — while `verdict.governing`
  is whichever cell scores worst. Under WorkSafe QLD at `d` 6 mm the suspended-load cell governs
  while total tension passes, so the row read « 3,15 · exigé 5,0 »: a passing margin beside a
  divisor from another basis, the reconciliation failure § 6 spends a page preventing on `T max`.
  `requiredDivisor` takes the total-tension cell for the headline end, falling back to `REGIMES`.
  The banner still names the governing cell — the two answer different questions.
- **Same change keeps the row whole under `Refusé` and `Indéterminé`**, where `governing` is `null`
  *by contract* but a régime is very much chosen; the qualifier used to vanish, leaving a bare
  safety factor to which the reader supplies their own `k`. « Refusé … · FS effectif 7,82 ·
  exigé 10,0 ».
- **« Résultats sans régime » is keyed on `scenario.regime`, not on the verdict.** A Verdict Gate
  breach (`?reg=secours10&fam=ac`, `?reg=acct10&daf=-1`) rendered « aucun régime choisi » and the
  prompt beside a picker holding a régime — and, 100 px below, an aggregate pinning it first. § 6's
  sixth situation is « rien n'a été tenté »; a breach is not that. The **grid** stays keyed on the
  verdict, since that is exactly what the breach suppresses.
- **« T max statique » is picked by the static ordering.** At `daf=-1` the amplified ordering
  inverts, so the one tension row that survives the breach reported 793,5 daN « ancrage B » where
  the static envelope is 817,1 at A. `Envelope` now carries `staticHeadline` beside `headline`, and
  the amplification row hangs off the same end as the row it decomposes.
- **One `deduceValues` and one `deriveResults` per parameter change.** Both Rail halves called
  `deduceValues`, so a scrub ran two unloaded solves plus a 2400-sample sag scan **per frame**; it
  is lifted to `use-deduced.ts` beside `useSceneBase` and passed to both, keyed on the four
  rider-free sub-objects. `deriveResults` is memoised on the Scenario **field by field minus
  `rider.xD`** — everything it reports is a traverse aggregate, and gates read no `x_D`.
- **The grid's governing cell is named, not merely weighted**: « ← gouvernante » plus
  `aria-current`, because colour already carries the *state* and a 11 px mono value one notch bolder
  is not a distinction a reader can be asked to make. Re-measured at 288 px: no overflow, 812,5 px.

Declined, with the line that settles each:

- **Naming the governing criterion in a *passing* banner.** § 6's state table fixes that copy
  verbatim — « Dans les limites — EN 15567-1 (k = 3,0) » — and « le bandeau nomme la cellule
  gouvernante » is the argument against *stacking a verdict per axis*, not a demand that the
  passing sentence grow a clause. `Hors limites` names it because that is the sentence § 6 writes.
- **Both plots empty under « Aucun résultat ».** Ticket 23 deferred the inert strip deliberately and
  the browser pass says so itself: owner is A8 · A11.

Gates green again: `typecheck`, `lint-type-aware`, `test` (**1105**, was 1101).
