# A12 · Narrow-screen reflow

Stage: A12
Status: open
Blocked by: 26
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 5, § 11 ·
[Amendments](../AMENDMENTS.md) **B**

## Delivers

The reflow as **CSS over a finished tree** — `flex-col`, `order-last`, **one container query on the
chart column, no `useMediaQuery` branch anywhere** — plus the Handle Lane and touch targets.

**The five measurements moved out.** § 10 called them manual re-checks; amendment B hands them to
`agent-browser`, so they are scripted in
[A13 · The point-to-point pass](./29-agent-browser-point-to-point-pass.md) — including B2's 768 px
re-confirmation. This ticket builds the layout; ticket 29 measures it. Ticket 28's deletion gate reads
ticket 29's numbers.

## Gate

Two breakpoints, each **stated as what fails**:

- **B1** « the read-out row can no longer fit five values » — **600 px of container** (the *value*
  binds, not the label: ≈605 px for five cells) ⇒ wrap to 3 columns;
- **B2** « an aspect-legal profile cannot coexist with the rail » — **768 px of viewport** ⇒ the rail
  becomes an in-flow region and the Chart Block collapses to a **pinned safety header**.

Then the three pixel budgets, each summing to the viewport: **390×664 · 768×1024 · 1440×900**.

Everything on this page that is arithmetic over the chart column's inner width is a **`node` unit
test** — no DOM, because **no chart dimension may read the window height**. Everything that needs a
real layout engine is ticket 29's.

## Notes

- **`MIN_RAIL = 120` is not the measured 124 px of resting rail**, and the title bar it rejects is
  `RAIL_HEADER`'s **44 px**, not 48. The shell's slack is the measured **124 px**.
- **The rail is `w-72` = 288 px, not 280** — which leaves the chart column 101 px at a 390 px viewport
  and the plot **53 px** of x range under `GUTTER = 24`. Everything else is downstream of that one
  number.
- **Landscape always opens collapsed**, which is what lets § 5 refuse a rotate prompt without
  special-casing orientation anywhere. It is **derived, not tested**: it follows from collapse
  condition (c). If `MIN_RAIL` or the banner height moves enough for (c) to stop firing in landscape,
  the aspect-0,16 compression case the ×1 clamp exists to refuse becomes reachable **through the box**,
  not just through the data.
- **No bottom sheet.** Base UI 1.6.0 *does* ship a Drawer — it was declined on **occlusion**, not
  availability.
- **B2's stated mechanism no longer matches its evidence.** The 768 px threshold is retained, but the
  aspect 0,91–1,25 / VE ×3,1…×12,6 figures were measured under the **rejected** `flex-[3]`/`flex-1`
  sizing. Under the elected width-derived rule the aspect is 0,42 at every width by construction, so
  what breaks below 768 px is the plot's **width**. **Ticket 29 re-confirms the number** — this is the
  one place the spec asks for a figure back.
- The **letterbox margin is left deliberately empty**.
- **The ~336 px soft-keyboard height (~180 px landscape) is platform-typical, not measured.** The three
  pinned states degrade gracefully if it is wrong — `compact` fires on `--kb > 0` whatever the value —
  but « 284 px of usable form » is only as good as the estimate.
- **The `interactive-widget` / `visualViewport` pair is untested** — no iOS device was available. The
  fallback is written to be harmless if the tag works. **The narrow-screen keyboard is the one part of
  the layout nobody has seen.**
