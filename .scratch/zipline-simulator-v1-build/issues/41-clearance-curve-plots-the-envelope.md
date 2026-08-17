# 41 — « Garde au sol » : la courbe trace l'enveloppe, l'axe annonce le passager

**What to build:** decide **what quantity the strip's curve is**, then draw that one. Four symptoms
were reported against the curve — an inverted head and tail, a position line that is not under the
passenger, a vertical scale that cannot reach the passenger's own clearance, and flat stretches
where the passenger is visibly moving. They are **one cause**, measured below, and it is not the
engine's arithmetic.

**Blocked by:** — *(independent of [37](./37-engine-correctness-fixes.md): item 1 there moves `h_min`
by ~18 mm, and nothing in this ticket is smaller than 0,44 m. Overlaps
[39](./39-clearance-strip-investigation.md), whose item 5 stays 37's.)*

**Status:** closed — **shape B+ landed 2026-08-17** on the user's four decisions of the same day
(voir ## Comments). Shape A is **refuted on measured grounds**, not merely costed: on an imported
profile one shared linear axis leaves the crossing 0,2 px tall. `src/lib/sim/**` untouched.

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 5 (*La bande de garde au sol*,
*Clearance failure — four coordinated signals*, *les trois canaux de portée*) ·
[docs/simulation-theory.md](../../../docs/simulation-theory.md) § 11 · touches tickets
[09](./09-terrain-and-clearance.md), [23](./23-chart-block.md) and
[39](./39-clearance-strip-investigation.md).

**Source:** user report of 2026-08-17, plus a numeric pass through `buildSceneBase` at commit
`56049ab`. Every figure below is **measured** on two manual scenarios, both `L` 150 m, `h` −18 m,
flèche cible 6 m, acier 12 mm IWRC, `m_p` 120 kg, `h_rider` 2,1 m, 260 sweep steps:

- **A** — first-run, ancrages **12 / 12 m**.
- **B** — the reported line, ancrages **12 / 20 m** (« ancrage d'arrivée à 20 m »).

## The cause, in one line

`strip.tsx:57` plots `scene.clearance.perStep[i]` against `step.xD`. `perStep[i]` is § 11's **inner
minimum over the whole line** for the rider at that step — `min over x of h_clear(x; x_P)` — while
the axis it is drawn on, and the caption above it, both read **« selon la position du passager »**.
The curve is a function *of* the passenger's position; **its value is not the passenger's garde**.

The engine is not wrong. `clearance.ts`'s own docblock states the choice and its reason — « The inner
minimum runs over the whole line, not under the rider … terrain may rise where the cable is not
lowest » — and the aggregate `h_min` the verdict judges **requires** that minimum. What is at issue
is that the *curve*, the *dimension line* and the *y axis* inherited a criterion's reducer as if it
were a per-position read-out. All four reported symptoms fall out of it, and none of them survives
the substitution.

Reference quantity below, « garde sous le passager » = `z_D − z_ground(x_D) − h_rider`, computed
from the same solved steps.

## 1 · The head and the tail are inverted — measured

| Scenario | segment | courbe tracée | garde sous le passager |
| --- | --- | --- | --- |
| **A** | `x_D` 0 → 9,78 | 3,902 → 5,186 m — **monte de 1,284** | 9,897 → 6,720 m — **descend de 3,177** |
| **A** | `x_D` 140,75 → 150 | 5,286 → 3,903 m — **descend de 1,383** | 6,901 → 9,897 m — **monte de 2,996** |
| **B** | `x_D` 0 → 3,84 | 7,223 → 7,667 m — **monte de 0,444** | 9,897 → 8,410 m — **descend de 1,487** |
| **B** | `x_D` 132,51 → 150 | 8,923 → 7,224 m — **descend de 1,699** | 12,619 → 17,896 m — **monte de 5,277** |

The mechanism is the one [39](./39-clearance-strip-investigation.md) already measured and closed as
physical: a rider near an anchor raises `H`, which lifts mid-span, so **the worst point on the line**
gains clearance exactly while **the rider** loses it. 39's conclusion is correct *for the quantity it
measured*. The symptom is that the reader is not looking at that quantity — they are watching a
passenger descend toward the ground on the profile above while the curve beneath it climbs.

Counted over the whole traverse: **48 / 259** consecutive step pairs on **A** and **31 / 259** on
**B** move the two quantities in opposite directions.

## 2 · The dimension line is not under the passenger, and cannot be

`profile.tsx:263-266` draws the clearance dimension at `rider.worst.atX` — the x of that inner
minimum, `perStepX`. It is under the passenger only when the two coincide.

| | steps where `\|atX − x_D\| > max(1 m, 1 % de la portée)` | worst |
| --- | --- | --- |
| **A** | **134 / 260** | 75,70 m at `x_D` 149,99 |
| **B** | **158 / 260** | 101,93 m at `x_D` 148,84 |

So on **B** the read-out cell relabels itself — « Garde min (à x 49 m) » — over **61 %** of the
traverse. § 5's three scope channels do fire here, which is why the *number* is defensible; the
*drawing* is not, because the dashed line is the only thing on screen that says where the number is
taken and it sits up to 100 m from the marker the user is dragging. Note the divergence is **not**
symmetric: it is small mid-span (0,76 m at `x_D` 30,7 on **A**) and grows toward both ends, which
matches the report's « from the middle of the graph » exactly.

## 3 · The y scale cannot reach the passenger's clearance

`clearanceDomain` is fed `perStep` alone, so the domain is quantised over a quantity that is
**bounded above by the unloaded line's own minimum**:

| | plotted max | domain (`step` / `top` / ticks) | garde sous le passager, max |
| --- | --- | --- | --- |
| **A** | 5,286 m | 2 / **6** / « 6 m · 3 » | **9,897 m** at `x_D` 0 |
| **B** | 8,923 m | 5 / **10** / « 10 m · 5 » | **17,896 m** at `x_D` 149,99 |

**B** is the reported case verbatim: ancrage d'arrivée at 20 m, top tick « **10 m** », and a
passenger who arrives with **17,90 m** under their feet (20 − `h_rider` 2,1). The axis is not
mis-scaled for what it draws; it is drawing something whose ceiling is the mid-span envelope, so it
can never show the anchor's own height and the two halves of the picture disagree by a factor of two.

## 4 · The flat stretches are real, and they are the same cause

The longest stretch where the plotted curve moves less than 0,10 m:

| | stretch | courbe | garde sous le passager |
| --- | --- | --- | --- |
| **A** | `x_D` 65,6 → 82,6 (17,0 m) | 2,531 → 2,526 — **5 mm** | 2,476 → 2,470 — 6 mm *(the rider **is** the worst point here)* |
| **B** | `x_D` 123,0 → 139,5 (16,5 m) | 8,824 → 8,835 — **12 mm** | 11,031 → 14,094 — **+3,063 m** |

**A**'s plateau is honest — mid-span, where the two quantities coincide. **B**'s is the defect: 16,5 m
of traverse drawn as a flat line while the passenger climbs three metres away from the ground.

## What this is *not*

- **Not [39](./39-clearance-strip-investigation.md)'s W.** 39 measured the W and closed it as
  physical; it is. This ticket does not re-open that reading — it asks whether that curve is the one
  the strip should carry.
- **Not [37](./37-engine-correctness-fixes.md)'s sampling noise.** That is ±18,5 mm on `h_min` and
  ≤ 87 mm per step. The gaps here are 0,44 m to 5,28 m — two orders up.
- **Not `evaluateClearance`.** § 11's `h_min = min over x_P of min over x` is the criterion, it is
  implemented as written, and its § 15 fixtures stand. Nothing below proposes changing the aggregate
  the verdict judges.
- **Not the violating bands.** `violatingBands` answers « où le passager ne doit-il pas aller ? » over
  `perStep`, which is the right reducer for that question — `scene.ts:496` argues it, and it is
  unaffected.

## The decision this ticket owes

The strip has one x axis (rider position) and two candidate y quantities. Three shapes, with their
costs — **to be decided before anything is drawn**:

| | Shape | Cost |
| --- | --- | --- |
| **A** | **Two curves**: garde sous le passager (the one that tracks the marker) plus the envelope minimum (the one the verdict judges), zero crossing and deficit fill driven by the **envelope**, since that is what fails. | Two strokes in a 96 px strip that is also the scrub track; needs a legend the layout has no room for; the y domain grows to the anchor-height scale, which compresses the crossing this chart exists to show. |
| **B** | **Keep the envelope curve, fix what it claims**: rename the caption and the axis to name the *envelope* scope, and tie the dimension line to the curve — draw both `x_D` and `atX` with a connector so the reader sees the number leave the passenger. | Cheapest, changes no quantity, keeps § 5's four coordinated signals intact. Does not remove the head/tail inversion — it explains it. The scale still tops out below the passenger's own clearance. |
| **C** | **Switch the curve to garde sous le passager**, keep the aggregate `h_min` in the Rail. | Rejected in `clearance.ts`'s docblock on measured grounds — « it reads positive while that same rider position is in violation a few metres away » — and it would put a curve that never crosses zero above a verdict that says « Câble au sol ». Not recommended without a second signal for the envelope. |

Recommendation to grill, not to assume: **B is the honest minimum and A is the complete answer**; the
question is whether the strip's 96 px floor can carry two strokes, and that is a § 5 layout decision,
not a drawing preference. Whatever is chosen, the report's own framing — « the graph rises while the
passenger gets closer to the floor » — is the acceptance test.

## Gate

- [x] The chosen shape is decided **against the four measured symptoms above**, and the ones it does
      not remove are written down as accepted, with the reason. — **B+**, voir « The decision » and
      « What each symptom became ». Symptoms 1, 3 and 4 are **accepted as physical** and re-labelled;
      2 is **fixed by drawing**.
- [x] The strip's caption, the y axis and the profile's dimension line all name the **same** scope,
      and § 5's three scope channels still distinguish *traversée* from *position*. — caption, `aria`
      and the cell all say « de la ligne » / « ligne »; the Rail keeps « (traversée) » and the row
      keeps « à la position du passager ». `ligne` reduces over `x`, `traversée` over `x_P`.
      **Precisely:** the y *ticks* stay bare grid numbers (« 6 m » · « 3 » · « 0 ») — ticket 39 put the
      unit on the top tick and nothing else there — so the axis is named by the caption directly above
      it and by the `aria-label`, which is the same disclosure route the unit has always taken. Neither
      dimension line carries text; the drawing names its scope by *where it stands*, and the cell's
      « (à x 46,9 m) » supplies the number's own position.
- [x] On scenario **B** the picture and the marker agree: the reader can tell, without reading a
      cell, whether the passenger is gaining or losing clearance while dragging. — the passenger's
      dimension goes **63,3 px → 169,1 px** from mid-span to the tail while the curve moves 12 mm.
- [x] `clearanceDomain`'s input is whatever the curve becomes — a domain fed one quantity and drawn
      under another is this ticket's own defect repeated. — the curve **did not change quantity**, so
      the coupling is untouched; the ticks measured « 6 m · 3 · 0 » on **A** and « 10 m · 5 · 0 » on
      **B** in every capture, and `contract.test.ts` now pins what admitting the second quantity
      would have cost.
- [x] `src/lib/sim/**` is untouched: § 11's reducer, its § 15 fixtures and the aggregate `h_min` the
      verdict judges are not this ticket's. — nothing under `src/lib/sim/` is in the diff.
- [x] Browser evidence per [ticket 30](./30-chart-fidelity-and-drag-evidence.md)'s method, on **A**
      and on **B**, at 390 px and at the reference column, head / mid / tail. — **seventeen
      captures**, voir « The browser evidence ».
- [x] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass. — clean; **40 files /
      1346 cases**, 1,09 s (1341 at ticket 39's writing; the five are this ticket's).

## Comments

### Shape A is refuted, not costed — measured 2026-08-17

The ticket costed A as « two strokes in a 96 px strip … compresses the crossing ». It is worse than
that, and the reason is that **the two quantities are not the same order of magnitude**. The envelope
minimum is set by whatever is highest under the line; the garde under the passenger is set by
whatever is under the passenger. On real relief those are different features by a factor of a
hundred.

The envelope curve's own drawn height, envelope-fed domain against a domain that also admits the
under-rider extreme — same strip, same width, both from `clearanceDomain`:

| Scenario | column | envelope-only | shared axis | the crossing loses |
| --- | --- | --- | --- | --- |
| **B** — 12 / 20 | 390 | 14,9 px | 7,5 px | 50 % |
| violating — 12 / 6 | 390 | 42,5 px | 14,2 px | **67 %** |
| violating — 12 / 4 | 390 | 54,2 px | 14,5 px | 73 % |
| `example-profile-trace1.csv`, 12 / 2 | 1152 | 60,8 px | **0,2 px** | **100 %** |
| `example-profile-trace2.csv`, 2 / 2 | 1152 | 42,8 px | 0,6 px | 99 % |
| `example-profile-trace3.csv`, 12 / 2 | 1152 | 64,3 px | 0,5 px | 99 % |

`trace1` at ancrages 12 / 2 is the case that decides it: **260 / 260** rider positions violate, the
envelope minimum runs −0,364…−0,115 m against a ridge, and the passenger flies a valley at **+62,6 m**.
The ladder then reads `top` 100 where the envelope needed 0,2, and the curve whose zero crossing is
« the only presentation where the violation is impossible to miss » (§ 5) is a flat line on the floor
of the strip. **A is out.**

The same three scenarios also retire the ticket's own hesitation about C. « It reads positive while
that same rider position is in violation a few metres away » is not an edge case on imported terrain,
it is the **normal** case:

| Scenario | steps violating the envelope | of those, under-rider reads **positive** | worst |
| --- | --- | --- | --- |
| `trace1`, 12 / 2 | 260 / 260 | **246** | +62,60 m under the passenger at `x_D` 109,18 |
| `trace2`, 12 / 2 | 260 / 260 | **251** | +19,27 m at `x_D` 156,68 |
| `trace3`, 12 / 2 | 260 / 260 | **250** | +54,06 m at `x_D` 81,38 |
| `trace3`, 2 / 2 | 260 / 260 | 225 | +48,40 m at `x_D` 81,79 |
| manual 12 / 4 | 182 / 260 | 36 | +9,90 m at `x_D` 0 |

So the strip's curve had no honest alternative, and the question was never *which quantity the strip
draws* — it was **where the second quantity lives**. It was already on screen and undimensioned: the
profile draws the rider rect from `z_D` down to the feet over filled terrain, so the reader was
computing the garde by eye off that picture and reading the answer off a curve that does not carry it.

One structural fact worth recording, because it is what makes two dimension lines safe: `underRider`
is `h_clear` evaluated at `x = x_D`, i.e. **one candidate in the inner minimum**, so
`underRider ≥ worst.hClear` by construction and the two can never cross. The shipped scan violates
that ordering by up to **99,3 mm** (12/20, at `x_D` 40,01; 88,5 mm on the first-run line at `x_D`
65,01) because its 60 uniform samples in `s` never land on the trolley kink, which is the loaded
catenary's own low point. That is [37](./37-engine-correctness-fixes.md) item 1 seen from the chart,
and it is the **same defect at the same place** [39](./39-clearance-strip-investigation.md) item 5
found from the other side — 39 compared 60 samples against 600 and got 87 mm at `x_D` 65,01, this
compares 60 samples against the exact `z_D` and gets 88,5 mm at the same step. Worth ≈0,5 px at the
reference column, and **not this ticket's**. It is visible on the
opening screen: « Garde min. ligne » prints **2,48 m** where the passenger's own garde is **2,42 m**,
so the printed number is 65 mm optimistic against the quantity beside it.

### The decision — user, 2026-08-17

Four questions, all answered with the recommended option.

| | Decision |
| --- | --- |
| Shape | **B+** — the strip keeps the envelope and its caption, axis and `aria` say so; the profile gains a second clearance dimension at `x_D`. The under-rider quantity gets a home where it is metrically true and the 96 px strip pays nothing. |
| Scope wording | **Strip and cell renamed together.** « Garde min. ligne », because the cell prints the identical quantity and the row's « à la position du passager » was being read as *under* the passenger rather than *for* that position. |
| When to draw | **Only when they diverge** — `rider.relabel`, the existing `max(1 m, 1 % de la portée)` bit. One threshold, so the drawing and the label fire together and no new constant appears. |
| Read-out | **None.** The dimension line carries it; no printed number. § 5 fixes five cells and killed in-plot read-outs for occlusion, and a sixth cell re-opens B1 and the pinned row. |

**One deviation from the approved sketch, on measured grounds:** the leader between the two dimension
lines is **not drawn**. Both dimensions' tops sit on *one* curve — the cable offset down by `h_rider`,
since `worst.hClear` is `z_cable(atX) − z_ground − h_rider` and `underRider` is the same three terms
at `x_D` — so any straight connector between them is a **chord of the cable**. Measured in the
browser with the rider at an anchor and the governing point mid-span: the leader closed to **7,63 px**
of the `stroke-2` cable at `x` px 321 and ran 7,6…26 px below it for its whole length; the plot scales
by 143,6/463,7 at 390 px, so that is ≈**2,4 px** there. A dotted line shadowing the subject is worse
than no line. The two channels that survive — two dimensions standing at two `x`s, and the cell's own
« (à x 46,9 m) » — are what say the number is not under the passenger.

### What each symptom became

| # | Symptom | Outcome |
| --- | --- | --- |
| **1** | head and tail inverted | **Accepted as physical**, and now labelled. The curve is the line's minimum; a rider near an anchor raises `H`, which lifts mid-span. The passenger's own garde is what the reader was after and it is drawn at `x_D` — 9,90 m at both ends of **A**, 17,21 m at the tail of **B**. `strip.tsx`'s docblock states the three honest consequences so the next reader does not re-open it. |
| **2** | dimension line not under the passenger | **Fixed by drawing.** The governing dimension still sits wherever the minimum is — that is § 5's own rule and it is correct — and a second dimension now stands under the marker whenever the two are further apart than `max(1 m, 1 % de la portée)`. |
| **3** | y axis cannot reach the passenger's clearance | **Accepted, and correct by scope.** The axis is the envelope's, the caption says so, and the passenger's 17,90 m is drawn on the profile's z scale where it fits. Admitting it to the strip's axis is what the table above refutes. |
| **4** | flat stretches while the passenger climbs | **Accepted as physical**, and legible: at `x_D` 120 on **B** the curve is on its plateau while the passenger's dimension reads 10,60 m against the printed 8,76 m. |

Not touched: `src/lib/sim/**`, the § 15 fixtures, the aggregate `h_min`, `violatingBands`,
`clearanceDomain` itself, § 5's five read-out cells, amendment G's 16 px fields, § 5's 44 px touch
budget and the five sizes [40](./40-ui-coherence-and-shadcn-density.md) settled. No `Status:` line on
any other ticket.

**This one owes an amendment letter, and it is [M](../AMENDMENTS.md).** The first draft of this
comment claimed it did not, by [39](./39-clearance-strip-investigation.md)'s reasoning — « § 5 never
prescribed the strip's y domain, so there is nothing to supersede ». That reasoning is right about the
*quantity* and irrelevant to what actually changed: § 5 fixes **the two caption strings verbatim**
(« Garde au sol (m) selon la position du passager — glisser pour déplacer » / « Garde au sol (m) —
glisser »), the cell's label in both budget diagrams, in the `pinned` and `compact` rows and in the
three-column wrap sketch, and « Always on: … **the clearance dimension line** », singular. Three
superseded groups, and `AMENDMENTS.md`'s own rule is « a build decision that amends the spec gets a
letter here ». The letter carries the decision and its measurements; this ticket links to it and does
not restate it.

### What shipped

| File | Change |
| --- | --- |
| `src/lib/chart/scene.ts` | `SceneRider.underRider` — `z_D − z_ground(x_D) − h_rider`, computed in `placeRider` from the engine's `zGroundAt`. The pure seam owns the quantity so a `node` case can pin it and the profile does no arithmetic. Module docblock gains « Two clearances, and only one of them is a criterion ». |
| `src/components/chart/profile.tsx` | The second dimension line at `x_D`, gated on `relabel`, `stroke-muted-foreground/60` dotted `1 3` against the governing line's `2 2`. Drawn from the drawn ground **up by the value**, exactly as its sibling is, so the drawn length *is* the number. |
| `src/components/chart/strip.tsx` | Caption « Garde min. de la ligne (m) selon la position du passager — glisser pour déplacer » (narrow: « Garde min. de la ligne (m) — glisser »), `aria-label` to match, and a docblock that states what the curve is, which three consequences are honest, and why the second quantity may not join it. |
| `src/components/app/shell.tsx` · `chart-block.tsx` | `READ_OUT_CELLS[0].label` → « Garde min. ligne », relabel → « Garde min. ligne (à x 49 m) ». The label is also the record key and the React key. |
| `src/lib/chart/scene.test.ts` | Four cases: the anchor identity `z_anchor − h_rider`, the 65 mm gap on the shipped screen, the scan residual bounded and one-sided over both traverses, and `relabel` firing where the two diverge. |
| `src/lib/layout/contract.test.ts` | One case pinning what admitting the second quantity to the domain would cost — 15 m of domain against 30 on **B**, 0,6 against 150 on `trace1` 12 / 2. |
| `AMENDMENTS.md` | **Letter M**, and the front matter's count. |
| `docs/conventions/ui.md` § Charts · `src/lib/rail/results.ts` · `src/lib/scenario/first-run.ts` and its test | The house-rule recording, plus the three prose sites that quoted the old label **as a rendered string**. Prose that names « the Garde min cell » as a layout occupant — `collapse.ts`, `shell.tsx`, `contract.ts`, `styles.css`, `app.tsx`, `use-viewport.ts` — is left alone, and the browser measurements inside it (« Garde min 1,31 m » clipped, ticket 31's **D2** overlap) are **records of what was measured then** and are not rewritten. |

### The browser evidence

`agent-browser`, own session, dev server on `:3000`, bare `/` so no salvage banner arises. At
390 × 664 **the Chart Block pins the moment a Rail field takes the caret** — § 5's own behaviour, « the
user types a position and watches Garde min move » — so « Afficher le profil » is pressed again before
every narrow capture; a naïve one measures the strip at 0 × 0. Reference column **1152 px**, strip
**176,63 px** there and **96 px** at 390.

Lengths are the drawn dimension lines, in SVG user units. « garde ligne » is the governing dimension
at `perStepX`; « garde passager » is the new one at `x_D`.

| Capture | State | garde ligne | garde passager | Cell |
| --- | --- | --- | --- | --- |
| `41-a-1152-0` | **A** 12/12, `x_D` 0 | 48,6 px @ px 571,3 (`x` 74,3 m) | **123,4 px** @ px 74,2 | « Garde min. ligne (à x 74,3 m) » · 3,90 m |
| `41-a-1152-75` | **A**, `x_D` 75 | 30,9 px @ px 570,2 | **absent** | « Garde min. ligne » · 2,48 m |
| `41-a-1152-150` | **A**, `x_D` 150 | 48,6 px @ px 571,3 | 123,4 px @ px 1077,8 | « … (à x 74,3 m) » · 3,90 m |
| `41-b-1152-0` | **B** 12/20, `x_D` 0 | 71,1 px @ px 403,9 (`x` 49,3 m) | 97,4 px @ px 74,2 | « … (à x 49,3 m) » · 7,22 m |
| `41-b-1152-75` | **B**, `x_D` 75 | 63,3 px | **absent** | « Garde min. ligne » · 6,44 m |
| `41-b-1152-148` | **B**, `x_D` 148,8 | 76,2 px @ px 388,1 (`x` 46,9 m) | **169,1 px** @ px 1069,8 | « … (à x 46,9 m) » · 7,75 m |
| `41-b-1152-open-120` | **B**, `x_D` 120 | 86,2 px @ px 423 (`x` 52,1 m) | 104,3 px @ px 877,1 | « … (à x 52,1 m) » · 8,76 m |
| `41-a-390v-{0,75,150}` | **A** at 390 | 15,1 · 9,6 · 15,1 px | 38,2 · **absent** · 38,2 px | ticks « 6 m » · « 0 », mid dropped |
| `41-b-390v-{0,75,148,120}` | **B** at 390 | 22 · 19,6 · 23,6 · 26,7 px | 30,2 · **absent** · 52,4 · 32,3 px | ticks « 10 m » · « 0 » |
| `41-pinned-390` | pinned header, 390 | — | — | « Garde min. ligne (à x 74,3 m) » on **one 16 px line**, row 44 px, value bottom = row bottom |
| `41-compact-390x400` | `compact`, 390 × 400 | — | — | idem — one line, **not clipped** |
| `41-gate-breach-1152` | Clearance Gate refused, `za` −2 | **0** | **0** | « Garde min. ligne » · « garde au sol indisponible »; strip **0 paths**, axes « 4 m » · « 2 » · « 0 » |

Three things those numbers settle:

- **The two dimensions are one z scale.** px per metre is identical for both in every state — 12,46 on
  **A** at 1152 (123,4/9,90 against 48,6/3,90), 9,84 on **B** (97,4/9,90 against 71,1/7,22), 3,86 and
  3,05 at 390. Neither line re-derives a garde from pixels.
- **The strip's domain never moved.** « 6 m · 3 · 0 » on **A** and « 10 m · 5 · 0 » on **B** in every
  capture, mid tick dropped at 390 — the curve's quantity is unchanged, so ticket 39's grid stands.
- **The gate takes both lines and neither axis.** Under a Clearance Gate breach the profile draws zero
  dimension lines, the strip draws zero paths, and it keeps its reference domain and its scrub track.

**Accepted, and small:** at `x_D` exactly 0 or `L` the passenger's dimension is drawn **along the
anchor tower** (`stroke-foreground/70 stroke-2`) and is invisible under it, because there the garde
under the passenger *is* the tower's height less `h_rider` and the tower already draws it. It is legible
everywhere else `relabel` fires — 61 % of **B**'s traverse — voir `41-b-1152-open-120`.

### What the two-axis review caught, and what it changed

Reviewed against fixed point `56049ab` on both axes. Seven findings were acted on; they are recorded
because four of them were **claims that contradicted the code beside them**, which in a codebase whose
docblocks are the contract is the same class of defect as a wrong number.

| | Finding | Fix |
| --- | --- | --- |
| **1** | **The amendment letter was owed and the ticket denied it.** Voir « This one owes an amendment letter » above — the Spec axis found § 5 fixing both caption strings verbatim at spec ~2298. | Letter **M** written, `AMENDMENTS.md` front matter recounted to thirteen, ticket and README corrected. |
| **2** | A `scene.test.ts` comment still said the profile « draws both **plus a leader** » — shipped in the same diff as the decision *not* to draw one. Both axes found it independently. | Comment corrected. |
| **3** | `profile.tsx` claimed « a negative `underRider` **forces** a negative `worst.hClear` ». True in exact arithmetic; the shipped scan's 99 mm residual leaves a sub-decimetre window where it does not, so the absolute was false. | Claim split into the construction-level truth and the scan's window, with the residual's drawn size (≤1,2 px) and why colouring it would mint a fifth signal § 5 did not. |
| **4** | `worst.atX` was asserted at `toBeCloseTo(…, 1)` — ±0,05 m on a **position of a scanned extremum**, whose documented bar (`testing.md`) is absolute at **2× the sample spacing**, ≈5,05 m. Asserted ~100× tighter than the grid can support. | Bar computed from `span.L0 / CLEARANCE.samplesPerStep`. The two `[MEASURED]` differences moved to the recorded-precision tier in the same pass. |
| **5** | The residual case asserted `worstResidual > 0`, i.e. **pinned ticket 37's defect as present** — 37's own fix would have broken a case whose comment only mentioned tightening the bound. Both axes found it. | The `> 0` is gone; the invariant `worst.hClear ≤ underRider` is asserted at the scan's error, so 37's fix only makes it safer, and the current 99,3 / 88,5 mm are recorded in the comment rather than asserted. A first attempt made the bound two-sided and **failed at 5,995 m** — that is the *legitimate* gap at an anchor, so the case now asserts the excess one-sided and the gap's presence separately. |
| **6** | Two prose sites still quoted the old label as a rendered string (`first-run.ts`, its test), and `results.ts`'s scope-discipline docblock quoted « Garde min (à x 101 m) » as the strip's. | All three updated; the layout prose that names « the Garde min cell » as an occupant, and the browser measurements embedded in it, deliberately left as records. |
| **7** | *Duplicated Code*: the two dimension lines each re-derived `groundAt(ground, X)` and `z.y(… + value)`. | One local `dimension(atX, hClear)` helper, so « from the drawn ground, up by the value » cannot drift between them. Re-measured in the browser after the extraction: **byte-identical** geometry at all four states of **B** (71,1 / 63,3 / 76,2 / 86,2 px governing, 97,4 / — / 169,1 / 104,3 px passenger). |

One finding was **declined**: the reviewer read `contract.test.ts`'s new case as *Speculative
Generality*, « asserts a rejected design, not behaviour ». Half of it is production behaviour — the
ladder on real envelope magnitudes — and the counterfactual half is the point: it is the one place the
cost of feeding `clearanceDomain` the wrong quantity is executable rather than prose, which is the
defect this ticket opened. It is framed as such in its own docblock.

**Also found and out of scope:** the README's « The seven amendments » table lists **A–G** while
`AMENDMENTS.md` documents **A–M**. That drift predates this ticket by five letters and belongs to
whoever wrote H–L, not here.

### The measurement, reproducible

Both scenarios were built through `buildSceneBase(sceneInputs(scenario, null))` with the
`FIRST_RUN_SCENARIO` object patched only at `anchors`, and compared per solved step:

```
plotted     = clearance.perStep[i]                                  // what strip.tsx draws
atX         = clearance.perStepX[i]                                 // what profile.tsx dimensions
underRider  = step.zD − zGroundAt(terrain, step.xD) − hRider        // the reference quantity
```

Sanity checks that pin the frame: `underRider` at `x_D` 0 is **9,897 m** on both scenarios
(`zA` 12 − `h_rider` 2,1), and at `x_D` 150 it is **9,897 m** on **A** and **17,896 m** on **B**
(`zB` 12 resp. 20, minus 2,1). The plotted curve reads **3,903** resp. **7,224 m** at those same two
ends — the unloaded line's own minimum, exactly as [39](./39-clearance-strip-investigation.md)
measured.

**Amended while implementing:** those three figures are **the sweep's first and last steps**, not the
anchors. The 260-step grid puts its end steps at `x_D` 0,005 and 149,995 — ten geometrically refined
steps within ~1,3 m of each end (`sweep.ts`) — so `z_D` is a few millimetres off the anchor top and the
figures land 3 mm under the identity the parenthesis claims. Read through `placeRider` at exactly
`x_D` 0 and `x_D` `L`, which is what the app draws when the field says « 0,0 », the identity is exact:
**9,900 m** on both ends of **A** and **17,900 m** at **B**'s arrival anchor. `scene.test.ts` pins the
exact form; the 9,897 / 17,896 figures above stand as what the *sweep* records.
