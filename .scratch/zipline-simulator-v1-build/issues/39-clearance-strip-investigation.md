# 39 — « Garde au sol » : la courbe et l'échelle du bandeau, à instruire

**What to build:** An investigation, then whatever fix it justifies, of the clearance strip
(`src/components/chart/strip.tsx`). Reported symptom: **the drawn curve looks surprising and the
vertical scale looks wrong**. This ticket does the first half of the work — it separates what is
already measured from what is still open — and leaves the remedy to be decided on the evidence.

**Blocked by:** — *(item 5 below overlaps [ticket 37](./37-engine-correctness-fixes.md) item 1; if 37
lands first, re-take the figures here before deciding anything)*

**Status:** open — items 1, 2, 3, 4 and 6 **landed 2026-08-17** on the user's decisions of the same
day (voir ## Comments); **item 5 is the only thing left**, and it is blocked on
[37](./37-engine-correctness-fixes.md). Do not re-measure it here until 37 lands.

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 5 (*The spine*, *The rider moves three
ways*, *Clearance failure — four coordinated signals*) · touches tickets
[09](./09-terrain-and-clearance.md), [23](./23-chart-block.md) and [30](./30-chart-fidelity-and-drag-evidence.md).

**Source:** user report of 2026-08-15, plus a numeric pass over the first-run scenario made while
opening this ticket. Everything called *measured* below was computed from `FIRST_RUN_SCENARIO`
(`L = 150`, `h = −18`, ancrages 12 / 12 m, flèche cible 6 m, acier 12 mm IWRC, `m_p = 120`,
`h_rider = 2,1`) through `buildScene`.

## What the curve actually is — measured, and **not** a defect

The first-run traverse gives a **W**: the garde falls to its minimum at mid-span, rises to a local
maximum near each anchor, then **drops again in the last few metres**.

| `x_D` (m) | garde (m) |
| --- | --- |
| 0,005 | 3,9025 |
| 8,575 | **5,1773** *(max côté A)* |
| 74,12 | **2,4399** *(`h_min`)* |
| 138,85 | **5,2746** *(max côté B)* |
| 149,995 | 3,9032 |

The two end values are not noise: a dense 4000-point scan of the **unloaded** line gives a minimum
clearance of **3,900000 m at x = 74,783**, which is exactly what the traverse converges to at both
ends. The mechanism is ordinary statics — a point load raises `H`, which tightens and lifts the whole
line except at its own kink, so a rider near an anchor buys clearance at mid-span; as it reaches the
anchor the load transfers to the anchor and the line returns to its 6 m unloaded sag.

**So the shape is physical.** What makes it *read* as wrong is worth stating, because it is a drawing
question and this ticket's own subject: the sweep grid puts **10 geometrically refined steps within
~1,3 m of each end** (`sweep.ts`, `grid.length` 260 = 240 + 2 × 10), so the final descent is drawn as
a near-vertical hook at each edge of the strip. Confirm the reading against a second scenario before
concluding — a single scenario is not a shape.

**Open question 1:** does the same W appear on an imported profile and on a textile line, or is it a
manual-ground artefact of the straight two-point terrain?

## 1 · The zero line sits on the strip's bottom edge in every healthy design

`strip.tsx:91-95`. `lo = Math.min(0, ...values)`, so with no violation `lo` is **exactly 0** and
`y(0) = bottom = height − 10` — the baseline is the frame's bottom edge, and its « 0 » label is 2 px
above it (`strip.tsx:137-139`). The whole drawn band (66 px at the 96 px floor) is spent on the
positive side.

The consequence is the one the file's own docblock calls the deciding argument for the Chart Block's
shape — « **a zero crossing is categorical** »: until the first violation there is no *crossing* to
see, only a curve resting on a rule that reads as an axis. The instant one step goes negative the
baseline lifts and **the entire curve jumps**, which is a scale change presented as a data change.

## 2 · The vertical scale is auto-fit, unpadded, undisclosed and unstable

`strip.tsx:89-95` and `:143-154`.

- **No margin.** `hi` maps to `top` and `lo` to `bottom`, so the extreme value is drawn on the exact
  top pixel. The profile spends ±12 % (`Z_MARGIN`) for this reason; the strip spends none.
- **The ticks are the data's own extremes** — `hi`, `(hi + lo) / 2`, `lo` — not round values. On the
  first-run scenario they print « 5,29 / 2,64 / 0,00 » and they change on **every keystroke** in the
  Rail, so the axis is never twice the same.
- **They carry no unit.** `formatValue("clearance", 5.2858)` is `"5,29"`; « (m) » lives in the caption
  alone.
- **Nothing discloses the factor.** The profile has a VE badge precisely because an auto-fit vertical
  scale on a safety drawing must name itself. The strip auto-fits with no badge and no fixed
  reference, which is the most likely source of « the scale seems wrong »: two scenarios whose gardes
  differ by a factor of four draw the same picture.

**Open question 2:** should the strip's y axis be *quantised* (round ticks, a padded domain that
snaps outward) rather than free? Weigh it against the strip's second job — it **is** the scrub track,
so its height is a touch budget before it is an axis.

## 3 · The tick labels are drawn into the plot

`strip.tsx:145-153`. `x = x.gutter − 6 = 18` with **the default `text-anchor: start`**, so « 5,29 » at
9 px runs from x = 18 to ≈42 px while the plot begins at `GUTTER` = 24. The labels overlay the first
metres of the curve. The profile sets `textAnchor` explicitly at each of its own ticks
(`profile.tsx:351-362`); this one does not.

Note the gutter is 24 px and a two-decimal label needs ≈24 px, so **right-aligning inside the gutter
does not fit either** — deciding this is deciding what the strip's left margin is for.

## 4 · The axes move when the curve is removed

`strip.tsx:86-95`. Under « Aucun résultat », or when the Clearance Gate refuses (`clearance === false`),
`points` is `[]` ⇒ `hi = 0`, `lo = 0`, `span = 1` ⇒ `y(0) = bottom`, and every tick is dropped by the
8 px filter at `:144`. The strip's own rule is « **It never stops being a pointer surface** … the strip
keeps its axes and stays a scrub track ». It keeps the *track*; it does not keep the *axes*.

## 5 · The curve carries the § 11 scan's sampling error, and it is visible

Re-running `evaluateClearance` on the same traverse at **600** samples per step instead of the shipped
60:

| | value |
| --- | --- |
| max per-step difference | **87 mm**, at `x_D` = 65,01 |
| `h_min` shipped | 2,439942 m |
| `h_min` at 600 samples | 2,421425 m |
| **error** | **+18,5 mm, non-conservative** |

That is [ticket 37](./37-engine-correctness-fixes.md) item 1 seen from the chart rather than from the
engine. Two consequences belong to *this* ticket:

- The curve is not smooth at the millimetre the read-out prints two decimals of.
- **`perStepX` is quantised to `L₀ / 60` = 2,527 m**, so the profile's clearance dimension line hops in
  ~2,5 m increments while scrubbing (measured: `atX` = 74,29 → 71,78 → 69,27 → 61,72 … on consecutive
  steps). Ticket 09 documents the *magnitude* trade; it does not document that the **position** is
  drawn on the scan grid.

**Do not fix the engine here** — 37 owns that. Re-take these numbers after it lands and decide whether
the strip still needs anything.

## 6 · A gap's x is fabricated from an arc-length fraction

`strip.tsx:50`. A failed step has no `x_D`, so the hole is placed at `(grid[i] / L0) * L`. That maps a
**material** fraction onto a **horizontal** one; on the first-run line `L₀ = 151,644` against
`L = 150`, so a mid-span hole is placed up to ≈1,1 m off, and more on a slack line. Visible only under
`Indéterminé` (`coverage < 1`), which is why it is last — but the honest options are to interpolate
between the two *solved* neighbours' `x_D`, or to state that a hole's x is nominal.

## Gate

- [x] The W shape is reproduced on **at least one imported profile and one textile line**, and either
      recorded as physical with the reason, or reopened as a defect with the failing case. —
      **recorded as physical, and narrower than the ticket assumed**: voir « Item 0 ».
- [x] Items 1–4 are each decided: fixed, or closed with the reason written down. A closed judgement
      call is a result. — **all four fixed**, voir « Items 1–4 ».
- [x] The strip's vertical scale, whatever it becomes, is **stated somewhere the user can read** —
      badge, unit on the ticks, or a fixed domain — and the choice names what it costs. — **the
      topmost tick carries « m » on a quantised grid**; no badge. Cost named in « Item 2 ».
- [ ] Item 5 is re-measured after [37](./37-engine-correctness-fixes.md) and the dimension line's
      quantisation is either removed or documented in ticket 09's terms. — **blocked on 37**, and
      deliberately not written up early: documenting a magnitude 37 is about to change is how stale
      docs are made. The chart-side evidence that it is *visible* is now recorded — voir « Item 5 ».
- [x] Browser evidence follows [ticket 30](./30-chart-fidelity-and-drag-evidence.md)'s method: the
      strip at 390 and at the reference column, healthy and violating, with the zero line's position
      called out in each. — **five captures**, voir « The browser evidence ».
- [x] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass. — clean; **40 files /
      1341 cases**, 1,10 s (was 1268 at ticket 30's writing; the growth is other tickets' cases plus
      the six added here).

## Comments

### The decisions this was built on — user, 2026-08-17

Fourteen questions over four rounds; every one answered with the recommended option. The ones that
changed code:

| | Decision |
| --- | --- |
| Sequencing | Items 1–4 and 6 land now; **item 5 stays a gate box blocked on 37**. None of the drawing answers move if `h_min` shifts 18 mm. |
| The domain | **Quantised, with a permanently reserved negative band** — not auto-fit-plus-a-badge, and not a fixed absolute domain. |
| The ladder | `step` from the 1-2-5 decade ladder sized on `max(hi, −lo) / 3`; `top = ceil(hi / step) × step`; **floor `−step`**, not `−top / 4`, so a canyon line does not spend a quarter of its strip on impossible clearance. |
| Ticks | Grid multiples — `top`, `top / 2`, and the floor **only under violation**. Narrow drops the mid tick and keeps the floor. |
| Disclosure | **Unit on the topmost tick alone** (« 6 m »). No VE-style badge: there is no distortion factor to name once the axis reads in round metres. |
| Formatting | A local chrome formatter, **not** `formatValue("clearance", …)`, which is pinned at two decimals and would print « 6,00 ». It lives in `contract.ts` beside the domain so one fixture pins both. |
| Item 3 | **Right-aligned inside the gutter** (`textAnchor="end"`, `x = GUTTER − 4`). Round labels are ≤ 20 px, so the 24 px gutter now fits what two decimals could not. |
| Item 4 | A **constant reference domain** when there is no curve — `top = 4`, `step = 2`, floor `−2` — rather than freezing the last one in a ref (state in a pure component, and it lies after a scenario change). |
| Item 6 | **Interpolate a hole's `x` between its two solved neighbours**, arc fraction only where a run of holes reaches an end of the grid. |
| The band | **Left blank.** Pre-tinting the danger side spends § 5's alarm before anything enters it. |
| Zero | Promoted `stroke-border` → **`stroke-foreground`** at hairline. It is the one line whose crossing is the point; `border` is the token for gridlines that mean nothing. |
| Recording | Docblocks + one line in `docs/conventions/ui.md` § Charts. **No amendment letter**: the spec never prescribed the strip's y domain (§ 5 fixes its heights, `pan-y` and « same x scale » and stops), so there is nothing to supersede. |

One collision, resolved in favour of the general rule: item 4's domain was specified as showing
« 4 m / 2 / 0 / −2 », while the floor-tick rule says *only under violation*. The rule won — the
reference domain reserves the band and leaves it unlabelled.

### Item 0 · the W is physical, and **narrower than this ticket assumed**

Measured through `buildScene` on five scenarios. Reversal counting is over consecutive sweep steps,
so it also measures item 5's noise; the shape claims below use the flank maxima, not the reversals.

| Scenario | ends (m) | flank max (m) | `h_min` (m) @ `x` | W? |
| --- | --- | --- | --- | --- |
| first-run — manual straight ground, acier 12 mm | 3,9025 / 3,9032 | 5,1861 @ 9,78 · 5,2858 @ 140,75 | **2,4399** @ 74,12 | **oui** |
| same span, **textile** HMPE (`MBL` 100 kN, `μ` 0,113) | 3,9122 / 3,9171 | 6,9023 @ 3,46 · 7,0724 @ 147,29 | **1,3003** @ 73,99 | **oui** |
| imported `example-profile-trace1.csv`, 183,4 m | 8,6004 / 8,6022 | *= the A end* · 9,0080 @ 154,78 | 6,8136 @ 21,20 | **non** |
| imported `example-profile-trace2.csv`, 224,0 m | 9,9000 / 9,9000 | flat | 9,7832 @ 222,80 | **non** |
| imported `example-profile-trace3.csv`, 188,4 m | 9,6633 / 9,6651 | *= the A end* · 9,7488 @ 155,77 | 8,4921 @ 7,60 | **non** |

So the mechanism the ticket describes is real and **not** material-specific — the textile line shows
the same W with a *larger* amplitude (ends 3,91 against a 7,07 flank maximum, minimum 1,30). But the
W is a property of **straight two-point terrain with equal anchor heights**, not of the traverse: on
all three imported profiles the garde has a **single interior minimum**, no A-side hump at all (the
A-side maximum *is* the A end), and the minimum sits at `x` 21,2 / 222,8 / 7,6 m rather than
mid-span, because real relief and not the unloaded sag is what sets it.

**Closed as physical**, with that qualification. Nothing was changed on account of it; the near-vertical
hook at each edge is the sweep grid's ten geometrically refined steps within ~1,3 m of each end, and
that grid belongs to `sweep.ts`, not to the strip.

### Items 1–4 · what shipped

`clearanceDomain()` and `clearanceTickLabel()` in `src/lib/layout/contract.ts` — the same pure seam
`exaggeration()` lives at, which is what makes the empty case testable at all — plus six cases in
`contract.test.ts`. `strip.tsx` keeps the pixel mapping, since only it knows its own height.

- **Item 1** — the zero line no longer rests on the frame's bottom edge in a healthy design. It sits
  at `−floor / (top − floor)` of the band: **25 %** on the first-run grid, and it does not move when
  a step first goes negative *on that grid*. What it still does — honestly — is move when the **grid**
  changes: healthy first-run is `step 2 / top 6` ⇒ zero at 25 %, while anchors 12/6 (`h_min` −1,04)
  is `step 1 / top 3` ⇒ **40 %**, because `hi` itself fell from 5,29 to ~3. The jump that is gone is
  the one *caused by crossing zero*; a jump caused by the scenario being a different size remains,
  and it is discrete, rare and legible.
- **Item 2** — the axis is no longer the data. `step` is a ladder value, `top` a whole number of
  steps, and four scenarios with gardes spread over 5,00…5,99 m all draw `step 2 / top 6`: the ticks
  no longer change on every keystroke. **Cost, named:** the reserved band spends a quarter of the
  drawn height — ~13 px of the 66 px available at § 5's 96 px floor — and a healthy curve never
  reaches the top tick. The strip is a categorical zero-crossing device with a printed « Garde min »
  beside it, so resolution is the cheaper thing to spend. Disclosure is the top tick's « m ».
- **Item 3** — `textAnchor="end"` at `x = 20`. Measured in the browser: the widest label's right edge
  is **20,4 px** against a plot that begins at 24. The old labels ran from 18 to ≈42 px.
- **Item 4** — « Aucun résultat » now draws `4 m / 2 / 0` over a reserved band with the zero line at
  33,3 % and **no paths at all**. Verified in the DOM, not inferred.

### Item 5 · the sampling noise is *drawn*, and that is this ticket's half of it

Not re-measured (37 owns the magnitude), but recorded because the browser evidence shows it: the
per-step curve reverses direction **55 times** on the first-run traverse and **79 times** on the
textile line, where the physical shape reverses twice, with a worst adjacent-step amplitude of
**43,1 mm** (steel) and **63,7 mm** (textile). The 1152 px violating capture shows it as a visible
ripple along the floor of the deficit fill. A read-out printing two decimals sits above a curve whose
own noise is four times its last digit. **The fix is 37's**; when it lands, re-take these two counts
here and then decide whether `perStepX`'s `L₀ / 60` quantisation of the dimension line still needs
ticket 09's paragraph.

### Item 6 · a hole's `x` is interpolated

`samples()` now fills a failed step's `x` from its two nearest **solved** neighbours' `x_D`, which is
monotone because `x_D` increases with `s`. The arc fraction `(s / L₀) × L` survives only where a run
of holes reaches an end of the grid and there is no neighbour on one side. On the first-run line the
old mapping misplaced a mid-span hole by up to ≈1,1 m (`L₀` 151,644 against `L` 150).

### The browser evidence

`agent-browser`, own session, dev server on `:3000`, salvage banner dismissed each time (it collapses
the Chart Block, which is why a naïve capture came back 0 × 0). Reference column measured **1152 px**
= `REFERENCE_DESKTOP_PX 1440 − RAIL_WIDTH 288`; strip **176,64 px** there, **96 px** at 390.

| Capture | State | Strip | Zero line | Ticks drawn |
| --- | --- | --- | --- | --- |
| `39-a-1152-healthy.png` | first-run | 176,64 px | `y` **129,98** = **25,0 %** of the band from the bottom | « 6 m » · « 3 » · « 0 » |
| `39-b-1152-violating.png` | `zb=6`, `h_min` −1,04 | 176,64 px | `y` **107,98** = **40,0 %** | « 3 m » · « 1,5 » · « 0 » · « −2 » |
| `39-c-390-healthy.png` | first-run | 96 px | `y` **69,50** = **25,0 %** | « 6 m » · « 0 » — mid tick dropped |
| `39-d-390-violating.png` | `zb=6` | 96 px | `y` **59,60** = **40,0 %** | « 3 m » · « 0 » · « −2 » — floor kept at narrow |
| `39-e-1152-no-curve.png` | textile, `MBL` blank ⇒ « Aucun résultat » | 176,64 px | `y` **117,76** = **33,3 %** | « 4 m » · « 2 » · « 0 », **zero paths** |

Every tick label's right edge measures ≤ 20,4 px against `GUTTER` 24. The deficit fill
(`fill-destructive/25`) is present in both violating captures and in neither other row. Screenshots
live in the run's scratch directory — this table is the evidence of record, per ticket 30's practice
of keeping the numbers in the ticket.

**Not touched:** `spec.md`, `AMENDMENTS.md`, `src/lib/sim/**`, the sweep grid, `sweep.ts`'s refined
end steps, and no `Status:` line on any other ticket.
