# 39 — « Garde au sol » : la courbe et l'échelle du bandeau, à instruire

**What to build:** An investigation, then whatever fix it justifies, of the clearance strip
(`src/components/chart/strip.tsx`). Reported symptom: **the drawn curve looks surprising and the
vertical scale looks wrong**. This ticket does the first half of the work — it separates what is
already measured from what is still open — and leaves the remedy to be decided on the evidence.

**Blocked by:** — *(item 5 below overlaps [ticket 37](./37-engine-correctness-fixes.md) item 1; if 37
lands first, re-take the figures here before deciding anything)*

**Status:** open

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

- [ ] The W shape is reproduced on **at least one imported profile and one textile line**, and either
      recorded as physical with the reason, or reopened as a defect with the failing case.
- [ ] Items 1–4 are each decided: fixed, or closed with the reason written down. A closed judgement
      call is a result.
- [ ] The strip's vertical scale, whatever it becomes, is **stated somewhere the user can read** —
      badge, unit on the ticks, or a fixed domain — and the choice names what it costs.
- [ ] Item 5 is re-measured after [37](./37-engine-correctness-fixes.md) and the dimension line's
      quantisation is either removed or documented in ticket 09's terms.
- [ ] Browser evidence follows [ticket 30](./30-chart-fidelity-and-drag-evidence.md)'s method: the
      strip at 390 and at the reference column, healthy and violating, with the zero line's position
      called out in each.
- [ ] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass.

## Comments
