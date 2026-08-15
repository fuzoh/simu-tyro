# 28 — Keep safety controls usable under constrained height

**What to build:** Complete narrow-screen behavior when whole Chart Block cannot coexist with usable Rail. Short viewports and landscape open in pinned mode; soft keyboard produces compact single-row safety view and leaves focused controls reachable. Existing Handle Lane and chart interactions receive final touch-target behavior without branching React tree by viewport.

**Blocked by:** 27 — Pin safety information while navigating the Rail.

**Status:** done

> `claimed` → `done`, 2026-08-15 (delegator), bookkeeping only. The ticket was left `claimed` while its
> verification belonged to another agent and two § 5 answers were owed; both arrived — the reviewers ran, the
> browser pass ran, and the user settled amendment F and the zoom gate on 2026-08-14. All nine boxes now tick
> against evidence recorded below, and typecheck, type-aware lint and the unit suite are green, which is what
> `docs/agents/issue-tracker.md` asks of `done`. Nothing here is re-opened: the app-wide items this ticket
> touched but does not own — the `pinned + x` latch scope (27 · 4 / 35 · 2) and § 10.1's disabled-régime
> reason — stay open on their own tickets.

- [x] Chart Block pins whenever its width-derived height exceeds available height minus minimum Rail height. — *holds against the rule as amended on 2026-08-14 ([amendment F](../AMENDMENTS.md)): the width-derived height is the **capped** plot's, and the Rail's floor is owed where the Rail is under the block, the shell's chrome where it is beside it. The literal every-width reading is struck — voir the last comment.*
- [x] Soft-keyboard inset or available height below 420 px produces compact 44 px safety row.
- [x] Rail receives keyboard-safe bottom space, and field focus scrolls target to center without smooth-animation races.
- [x] Landscape reaches pinned state through same fit rule; no orientation-specific prompt or branch exists.
- [x] Narrow Rail stays in flow and pushes rather than covers Chart Block.
- [x] Anchor handles remain entirely below plot with 44 × 48 px targets; rider and scrub targets reach 44 px for coarse pointers.
- [x] Profile and scrub surfaces allow vertical panning while retaining horizontal dragging.
- [x] Layout uses CSS media/container queries and derived state only; no `useMediaQuery` branch or chart height based on window height appears.
- [x] Arithmetic and state-policy cases are node-unit tested; typecheck and type-aware lint pass.

## Comments

**Shape of the thing.** Ticket 27 left (c) as a seam — `CollapseInputs.fits`, defaulted to `true` — and
this ticket fills it without touching the policy's shape: **two pure predicates over one viewport
reading**, `fitsWholeBlock` and `compactRequired` in `src/lib/layout/collapse.ts`, whose booleans reach
the same `collapseState`. `compact` is § 5's fourth `CollapseState` rather than a modifier of the other
three, exactly as ticket 27 predicted. The app reads a viewport in **one** place —
`src/components/app/use-viewport.ts`, which is `use-keyboard-inset.ts` renamed because it now reports
the numbers it was already measuring for `--kb` — and **nothing below `app.tsx` knows a viewport
exists**: no band is sized from one, no component branches on one.

Four decisions worth flagging, each because the alternative was measurably wrong:

1. **`MIN_RAIL` is only owed where the Rail is *under* the block.** § 5's own landscape arithmetic is
   the proof: it compares « the Chart Block at 844 px of width » against « landscape `svh` ~330 px »
   with no `MIN_RAIL` term, because above B2 the Rail is a full-height column *beside* the block and
   owes it no height. Subtracting `MIN_RAIL` everywhere puts the desktop threshold at 977 px, i.e. the
   reference desktop opens collapsed. **That comparison is not a layout branch** — the tree and every
   band height are identical either way, on the same `RAIL_REFLOW_PX` the shell's one `md:` uses.
2. **The banner term in the block's height is width-derived, like every other band** —
   `bannerBudget()`, § 5's budget table read down its own column (76 at a 390 px column, 60 at 480,
   44 at 1152), from the two thresholds `contract.ts` already had (`CELL_WRAP_PX`, and
   `RAIL_REFLOW_PX − RAIL_WIDTH`). The three-line reserve `pinnedHeaderHeight` uses is right *there*
   and wrong here, and it was **caught in the browser, not by argument**: with 76 px everywhere the
   block reads 889 at 1152 px of column, so a 1440 × 880 window — whose rendered block is 856 —
   opened as the Pinned Safety Header. **Two defaults, because the two failures run in opposite
   directions**: an under-reserve puts a jump target under the header; an over-estimate deletes the
   picture on a window that would have fitted.
3. **`data-fit="tight"` is a second attribute, and it is what makes landscape work.** Ticket 27 scoped
   every variant to `max-md:` for a good reason — above B2 a focused Rail field must cost the chart
   nothing. But **a block that does not fit does not fit at any width**: at 844 × 390 the bands sum to
   593 px inside an `overflow-hidden` shell 390 px tall, so under `max-md:`-only scoping the View
   Strip and « Garde min » are clipped out of the viewport, which is the one thing § 5 calls
   non-negotiable. So each variant now has **two arms** — the media arm for triggers (a) and (b), a
   `[data-fit="tight"]` arm for the two height *constraints* — and the call sites lost their
   `max-md:` prefix because the condition moved into the variant. Same one tree, same CSS-only reflow.
4. **`pinned + x` outranks `compact`, and only it does.** § 5 argues `pinned + x` *from* the keyboard
   being open — « the user types a position and watches « Garde min » move with the keyboard open » —
   so letting the single row win there would unmount the field being typed into, which is the failure
   `pinned + x` exists to prevent. Measured at 390 × 400: `compact` at rest, `pinned-x` with
   `#rail-xD` focused, block 132 px, strip back at 44 px.

**One more ordering fix, found in the browser.** § 5's `scrollIntoView({ block: 'center' })` runs on
the Rail's own `focusin` — the one element that sees every field focus — and the state update it
shares that event with is now `flushSync`ed. Without the flush the scroll is computed against the
*pre-collapse* layout, where the Rail is 336 px rather than 756: measured, the field landed at y 257
with the Rail's centre at 466. With it, `scrollTop 503` and the field at y 512 against a centre of
466 — the 60 px offset is half of `scroll-margin-top: 120px`, which is § 7's reserve composing with
the centring exactly as intended. `behavior` is left at `auto` and the options object is now
**shared** with § 7's jump primitive (`CENTRE_IN_RAIL`), so the app has one scroll behaviour: a smooth
scroll would race the keyboard animation.

**Files.** New: `src/components/app/use-viewport.ts` (replaces `use-keyboard-inset.ts`, deleted).
Changed: `src/lib/layout/contract.ts` (`COMPACT_HEIGHT_PX`, `bannerBudget`, `chartBlockHeight`,
`ANCHOR_TARGET`, `anchorTarget`), `src/lib/layout/collapse.ts` (the `compact` state, `ViewportFit`,
`availableHeight`, `fitsWholeBlock`, `compactRequired`, `heightConstrained`, `CENTRE_IN_RAIL`,
`centresOnFocus`, `pinnedHeaderHeight("compact")`), `src/components/app/use-collapse.ts` (`compact`
input, `tight` output), `src/components/app/app.tsx` (the one viewport reading → two booleans),
`src/components/app/shell.tsx` (`data-fit`, `pb-[var(--kb,0px)]`, the focus centring, the compact
row, the un-prefixed variants), `src/components/app/banner.tsx` (one line in `compact`, the shared
scroll options), `src/components/chart/chart-block.tsx` (§ 7's echo line is hidden in the compact
row), `src/components/chart/profile.tsx` (the two anchor targets), `src/styles.css` (the three
two-armed variants, the `tight` arm of the `scroll-margin-top` rule). Tests:
`src/lib/layout/collapse.test.ts`, `src/lib/layout/contract.test.ts`.

### Covered by node unit tests — 66 + 83 cases in the two layout files

- **(c), as § 5's own postures** (`collapse.test.ts`): 390 × 664 fits with the rail's 124 px clearing
  `MIN_RAIL` by 4 px; 390 × 844 fits; 390 × 664 under a 336 px keyboard does not; **landscape
  844 × 390 does not**; 768 × 1024 and 1440 × 900 fit; a squashed 1440 × 500 does not; unmeasured
  fits. Plus the B2 boundary of the `MIN_RAIL` term, the one-pixel-either-side threshold, and the
  two-platform identity `available(664, kb 336) === available(328, kb 0)`.
- **The `compact` rule**: `--kb > 0` at any height, 419 against 420, landscape's 330, and the portrait
  keyboard where both halves fire. `--kb` has **no threshold** and that is asserted (`kb 1` at
  `height 2000`).
- **The state table**, four new rows on top of ticket 27's twelve: the keyboard row, its survival of
  (a) + (b), the reveal never beating it, and `pinned + x` winning over it from **either** position
  field. `heightConstrained` is asserted as the thing `data-fit` publishes, and a constrained block is
  never `whole` for any focus.
- **`pinnedHeaderHeight("compact") === 44`**, banner *in* the row rather than above it, at every
  banner height.
- **The centring options**: `block: "center"`, `behavior` absent, no `"smooth"` anywhere in the
  object; `centresOnFocus` over the four focuses.
- **The block's height** (`contract.test.ts`): the five bands at each of § 5's three budgets, the
  banner term per budget, the 32 px the width-derived term replaces, and budget A's 4 px of headroom
  over `MIN_RAIL`.
- **The anchor targets**: 44 × 48 with the 48 *derived* from `handleLane + xLabels`, `y` exactly at the
  plot's bottom edge at both ends of the domain, centred on the anchor, and § 5's « 44 px covers the
  first and last 12 % » ratio.
- **The two mechanisms the layout may not use, asserted over the app's own source** — this is how item
  8 gets a CI check at all, and both regressions it guards were *measured* defects in the prototype:
  no `useMediaQuery(` call anywhere; `matchMedia(` in exactly one file (the peek control, read at the
  event); a window height read in exactly one file (`use-viewport.ts`); **no `vh`/`dvh`/`svh` unit and
  no window-height identifier anywhere under `src/components/chart/` or in the two layout modules**;
  and no `(orientation:`, `screen.orientation` or rotation event in `src/` **or `src/styles.css`**.

### Browser evidence — `agent-browser`, this pass

Not ticket 29's evidence (no budget was *recorded* as a re-check), but every layout item above was
driven rather than reasoned. `HeadlessChrome/151`, `agent-browser 0.34.0`, session `t28`, dev server at
`http://localhost:3000/` (`200` before starting). Viewports set with `set viewport` and confirmed by
`innerWidth/innerHeight` at every step; every number is `getBoundingClientRect()` or
`getComputedStyle()` read back.

| Viewport | `data-collapse` · `data-fit` | block | `--pinned-clearance` | rail |
| --- | --- | --- | --- | --- |
| 390 × 844 | `whole` · `roomy` | 508 | `0px` | y 508, h 336 |
| 390 × 664 | `whole` · `roomy` | 508 | `0px` | y 508, **h 156** |
| 390 × 400 | **`compact`** · `tight` | **44** | `44px` | y 44, h 356 |
| 844 × 390 (paysage) | **`compact`** · `tight` | **44** | `44px` | beside, 288 × 390 |
| 926 × 428 (paysage) | **`pinned`** · `tight` | 88 | `120px` | beside |
| 1440 × 900 | `whole` · `roomy` | **856** | `0px` | beside, h 900 |
| 1440 × 860 | `whole` · `roomy` | 857 | `0px` | beside |
| 1440 × 840 | `pinned` · `tight` | 88 | `120px` | beside |
| 768 × 1024 | `whole` · `roomy` | 545 | `0px` | beside |

`chartBlockHeight(1152)` computes **856,3** against a rendered **856** — the fit rule's left-hand side
is the real block to the pixel, which is what makes the 857/860 boundary above meaningful.

- **The compact row, measured at 390 × 400**: the column's inner box is `flex-row`, **44 px** tall;
  banner slot 245 × 44 with the cells row 145 × 44 beside it; profile, strip and View Strip all
  `display: none`; the live cell reads « Garde min 2,48 m »; the chevron is **44 × 44** at the row's
  end. With `L = −5`: « ⛔ 1 erreur bloquante — aucun résultat  [ voir la première ]  Garde min  ⌄ »
  in one 44 px line, and pressing the jump focused `#rail-L` with `scroll-margin-top: 44px` — the
  *compact* header's own height — landing the field at y 230 under a 44 px header, its inline
  message « une longueur strictement positive est requise » on screen. Pressing « Afficher le
  profil » there kept `compact` and left the caret on the chevron: **(c) outranks the reveal**, and
  ticket 27's visibility check is what makes the held request keep its footing.
- **In flow, pushing not covering**: at 390 × 664 the Rail's top is **508** and the block's bottom is
  **508**; at 390 × 400 they are both 44. No overlay at any narrow height.
- **Keyboard-safe bottom space**: the Rail's computed `padding-bottom` follows `--kb` — `0px` with no
  keyboard, **`336px`** with `--kb` set to a platform-typical inset, on the same element and with
  nothing above it moving.
- **Anchor targets**: both **44 × 48**, `y 215,64` — which is exactly the scrub rect's bottom
  (`y 72 + h 143,64`), i.e. the plot's own bottom edge — and `pointer-events: none`, so a probe in the
  lane resolves to the profile SVG and nothing shadows the scrub.
- **Touch and drag**: computed `touch-action: pan-y` on **both** SVGs (profile 220 px, strip 96 px, so
  both scrub surfaces are far above 44 px), and a horizontal pointer drag across the plot moved the
  rider **75,0 → 125,5 m** with the block staying `whole` — a drag on the chart is not a collapse
  trigger.
- **Ticket 27's legs, re-driven, all unchanged**: `focus #rail-L` → `pinned`; `focus #rail-xD` →
  `pinned-x` with the strip at 44 px and clearance `164px`; at 1440 × 900 a scrolled/focused Rail
  still derives to `pinned` and **costs nothing** (block 856, `scroll-margin-top: 0px`).
- **The coarse-pointer rule is in the shipped stylesheet** — `@media (pointer: coarse) { .chart-grab
  { stroke-width: 22px } }`, read out of `document.styleSheets` — and the fine-pointer value measures
  `14px` (36 px of hit). The media query itself cannot be *matched* here (below).

### Not observable on this host — stated, not inferred

Unchanged from ticket 27's list, and none of it is claimed as verified:

- **A real soft keyboard.** `--kb` reads `0px` throughout; `visualViewport` never shrinks. The rule
  that consumes it is unit-tested, the row it produces is measured through the 420 px half, and the
  consumer of `--kb` is measured by setting the property — but « an iOS keyboard raises `--kb` » is
  ticket 35's and the device's.
- **`(pointer: coarse)` and real touch.** `navigator.maxTouchPoints` is 0 and the query is `false`
  even under `set device`, and the CLI has no touch primitive — so the 44 px rider radius and
  *vertical* panning were verified as CSS (`stroke-width: 22px` in the sheet, `touch-action: pan-y`
  computed) and as horizontal dragging, never as a gesture.
- **iOS's `interactive-widget` policy.** Present and correct in the markup; only Safari can honour it.

### Gates

```
$ bunx oxfmt --write <the twelve touched paths>
Finished in 127ms on 12 files using 32 threads.

$ bun run typecheck            # tsc --noEmit
tsc=0                          (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
lint=0                         (no output)

$ bun run test                 # vitest run
 Test Files  39 passed (39)
      Tests  1267 passed (1267)      (was 1219)

$ bunx vitest run src/lib/layout/
 Test Files  2 passed (2)
      Tests  149 passed (149)

$ bun run build                # sanity: the three two-armed variants compile
✓ built in 221ms / 148ms
```

The built stylesheet was read back to confirm the variants emit **both** arms, e.g.
`@media (width<768px){.pinned\:hidden:where([data-collapse=pinned] *,…)}` beside
`.pinned\:hidden:where([data-fit=tight] *)`.

### Judgement calls, and what is left undone

- **The desktop now collapses below 857 px of viewport height at 1440 px wide**, and the reveal cannot
  grant the profile back there, because (c) outranks it. That is § 5's own rule — the block's height
  is a function of its width, and at 1152 px of column it *needs* 857 px — and the alternative is what
  the code did before this ticket: clip the View Strip and the five cells inside an `overflow-hidden`
  column. **It is the one consequence of this ticket a reviewer should look at deliberately**, because
  § 5 never wrote down a wide-and-short *desktop*; it wrote down landscape, and this is the same
  arithmetic reaching a laptop window.
- **`compact` truncates the banner's sentence** (measured: 76 px of a 324 px string at 390 px) while
  keeping its affordance at full width — `[ voir la première ]` was 109 px and pressed fine. § 5 says
  « bandeau sur **une ligne** », and one line at 390 px is what that costs. § 7's *echo* of the cause
  into the read-out row is `compact:hidden`: at 133 px of cells it wrapped to three lines over the one
  live cell's label, and the banner slot already carries the state § 7's precedence chose.
- **The Station handles are still not draggable.** Ticket 23 left « the Station handles become
  draggable with A9's geometry fields » standing, and building that is not this ticket. What ships here
  is the **reserved geometry**: two `pointer-events: none` targets, 44 × 48, `data-anchor="A" | "B"`,
  entirely below the plot — measurable now, and something for a drag to attach to later. § 5's
  manual-mode bracket is non-interactive anyway.
- **The View Strip's four controls are `h-8` = 32 px inside its 44 px row.** § 5's « the row is 44 px
  tall, so every control in it is a legal touch target » is a claim about the row; the controls are
  below the coarse-pointer minimum. This ticket's acceptance names the anchors, the rider and the scrub
  surfaces, so widening them is not in scope — but it is a real coarse-pointer gap and belongs with
  ticket 35's other coarse-pointer findings.
- **The `compact` state is reachable with `data-fit="roomy"` only in principle** — a viewport tall
  enough to fit the whole block *and* a keyboard up. The policy makes `compact` imply `tight`
  (`heightConstrained` is `!fits || compact`), so the CSS cannot disagree with the state; there is no
  such viewport to test on this host.

---

## Independent browser verification — second pass, 2026-08-14

**Not the implementer.** This ticket carried `Status: done` but neither review nor browser
verification ever ran (both agents died on API errors), so this pass re-drove all nine acceptance
items and measured every number itself. **Read-only on `src/**` throughout** — no source file was
touched and nothing below was fixed.

**Environment.** `HeadlessChrome/151.0.0.0` (`Mozilla/5.0 (X11; Linux x86_64) … Safari/537.36`),
`agent-browser 0.34.0`, session `scoutech-t28`, dev server already up at `http://localhost:3000/`
(`curl -s -o /dev/null -w '%{http_code}'` → **200**). Every viewport was set with
`agent-browser set viewport` — or CDP `Emulation.setDeviceMetricsOverride` where labelled — and then
**read back** from `innerWidth` / `innerHeight` before any number was recorded; all geometry is
`getBoundingClientRect()` or `getComputedStyle()`.

**One host limit ticket 27 recorded is wrong, and this pass has the counter-evidence.**
`agent-browser set device <phone>` does leave `navigator.maxTouchPoints` at 0 and
`matchMedia('(pointer: coarse)')` false — but a raw CDP call on the page target,
`Emulation.setTouchEmulationEnabled { enabled: true, maxTouchPoints: 5 }`, **flips it**:

```
baseline   {"coarse":false,"anyC":false,"touch":0,"vp":[390,844],"sw":"14px"}
touchOnly  {"coarse":true, "anyC":true, "touch":5,"vp":[390,844],"sw":"22px"}
```

So `@media (pointer: coarse)` is matchable here and `Input.dispatchTouchEvent` gives real touch
sequences — item 6's 44 px below is a **measured hit target**, not stylesheet text. Two caveats: the
override lives on the CDP *session* and reverts the instant the websocket closes (a measurement taken
after disconnect silently reads the fine-pointer value again), and `(hover: hover)` stays `false`, so
this is coarse-pointer emulation, not a device.

### Item 1 — the fit rule, measured at six widths, and a deviation that is a spec question

The `whole` / `pinned` boundary was bisected by driving `innerHeight` at fixed widths. `predicted`
is `chartBlockHeight(col)` with `bannerBudget`, plus `MIN_RAIL` only where the Rail is *below*.

| viewport width | chart column | last `pinned` h | first `whole` h | rendered block | predicted threshold |
| --- | --- | --- | --- | --- | --- |
| 390 | 390 | 659 | **660** | 507,63 | 540,00 + 120 = **660** |
| 767 | 767 | 753 | **754** | 633,00 | 633,02 + 120 ⇒ **754** |
| 768 | 480 | 561 | **562** | 545,44 | 561,44 + 0 ⇒ **562** |
| 844 | 556 | 593 | **594** | 577,36 | 593,36 + 0 ⇒ **594** |
| 1024 | 736 | 615 | **616** | 615,03 | 615,04 + 0 ⇒ **616** |
| 1440 | 1152 | 856 | **857** | 856,30 | 856,32 + 0 ⇒ **857** |

**The implementation is exact to the pixel** — six widths, six thresholds, no drift. What it is exact
*about* is not the acceptance item as written: **above B2 the `MIN_RAIL` term is dropped**. At
1440 × 900, `available − MIN_RAIL` is 780 against a block of 856,3, so the literal rule pins; measured,
the block is **whole** with a 43,7 px letterbox — § 5's budget C exactly. Both readings cannot hold,
so **the box is unticked and the question is left open** rather than decided here. ~~The narrow arm is
over-reserved by design and the table shows it: at 390 px the rule uses `bannerBudget` 76 while the
banner renders 44, so the app pins ~32 px early (at 390 × 630 the rendered 508 + 122 of Rail would
have cleared `MIN_RAIL`).~~ **Stale — the gap was the rendered slot's, and ticket 29's défaut 1 closed
it.** The `rendered block` column above is pre-correctif; the `predicted threshold` column always
spent `bannerBudget`, so **no threshold in this table moves**. Re-measured first-hand below: the
narrow arm is now exact to 0,375 px.

**The desktop consequence, measured.** Reducing height at 1440 px flips at **857 → 856**
(`whole`/`roomy`, block 856,3 → `pinned`/`tight`, block 88, `--pinned-clearance` 120px, profile
`display: none`). The band of ordinary desktop viewports below the curve is wide:

| viewport | state · fit | block | empty chart column | chevron |
| --- | --- | --- | --- | --- |
| 1280 × 800 | `roomy` — picture intact | 763,50 | 36,5 | hidden |
| 1280 × 720 | **`pinned` · `tight`** | 88 | **632** | visible |
| 1366 × 768 | **`pinned` · `tight`** | 88 | **680** | visible |
| 1512 × 850 | **`pinned` · `tight`** | 88 | **762** | visible |
| 1600 × 900 | **`pinned` · `tight`** | 88 | **812** | visible |
| 1920 × 1080 | **`pinned` · `tight`** | 88 | **992** | visible |
| 1920 × 1085 | `roomy` | 1081,27 | 3,7 | hidden |
| 2560 × 1440 | `roomy` | 1350,08 | 89,9 | hidden |

Every 16:9 desktop there opens **with no chart at all** beside hundreds of pixels of blank column,
and 1920 × 1080 misses by **1,3 px**. Pressing « Afficher le profil » is a no-op (state stays
`pinned`, block stays 88, the caret stays on the chevron): (c) outranks the reveal. Screenshots taken
at 1366 × 768 and 1440 × 840, both blank to the right of the Rail.

**Left open deliberately — a § 5 decision, not a build choice.** § 5 asserts both « the block's height
is a function of its width » (0,42 × `W_inner`, which grows with width) and budget C's whole block at
1440 × 900, and it never wrote down a wide-and-short *desktop*. Three ways out, each with a cost:
(i) keep today's rule — 16:9 desktops ship without a picture; (ii) restore the literal `MIN_RAIL`
term everywhere — the spec's own reference desktop opens collapsed; (iii) scope (c) to below B2 —
above B2 the block clips inside the `overflow-hidden` column, which is what this ticket was fixing.
A fourth, capping the plot's height at wide widths, edits the aspect rule itself.

### Item 2 — the compact row, both halves

The `available < 420` half: rendered row measured at exactly **44 px** at 390 × 419, 390 × 400,
390 × 330, 390 × 300, 320 × 400, 844 × 390 and 1024 × 400. At 320 × 400 the row is the banner slot
175,2 × 44 beside the live cell 144,8 × 44, with `profil`, the clearance band and the View Strip all
`display: none`.

The keyboard half — **no real soft keyboard exists on this host** — was driven through the app's own
measurement seam: a JS getter override of `visualViewport.height` (844 → 508) plus a synthetic
`resize` event on `visualViewport`, which is what `use-viewport.ts` listens to. Method, stated:
**JS property override + synthetic event. Not a keyboard, not a viewport resize, not a CDP metric.**

```
--kb 336px · compact · tight · block 44 · aside padding-bottom 336px · aside box y 44 h 800
```

`pinned + x` still outranks it: with `#rail-xD` focused under the same simulated inset, state
`pinned-x`, block **132**, strip back at 44, `--pinned-clearance` **164px**.

### Item 3 — keyboard-safe space and the centring

`aside` computed `padding-bottom` **0px** with no inset and **336px** under the simulated one, same
element, nothing above it moving. `scroll-behavior` is **`auto`** on both the Rail and
`documentElement` — no smooth scroll to race.

Centring at 390 × 844, `focus #rail-mp` from `whole`: `scrollTop` **503**, field y **512**, Rail box
y 88 h **756** with centre 466, `scroll-margin-top` **120px**. The scroll was therefore computed
against the *post*-collapse 756 px Rail — the `flushSync` ordering holds — and the 60 px offset is
half the 120 px reserve. Under the simulated 336 px inset the same focus lands the field at
y 452–480 against a visible bottom of 508: **fully above the simulated keyboard**, with
`scroll-margin-top` now 44px.

### Item 4 — landscape, and the absence of an orientation branch

`844 × 390` → **`compact` · `tight`**, block 44, Rail *beside* at 288 × 390. `926 × 428` →
`pinned` · `tight`, block 88. `1024 × 400` → `compact`. A rotation round-trip
(390 × 844 → 844 × 390 → 390 × 844 → 844 × 390) returns identical states each time.

The orientation half was driven **at the fit boundary** with CDP
`Emulation.setDeviceMetricsOverride { screenOrientation }`, identical dimensions both ways:

| dims | `screen.orientation` | state · fit · block |
| --- | --- | --- |
| 844 × 594 | `landscape-primary` 90° | `whole` · `roomy` · 577,36 |
| 844 × 594 | **`portrait-primary` 0°** | `whole` · `roomy` · 577,36 |
| 844 × 593 | `landscape-primary` 90° | `pinned` · `tight` · 88 |
| 844 × 593 | **`portrait-primary` 0°** | `pinned` · `tight` · 88 |

Identical either side of the threshold. And over **99 479 characters** of loaded CSS read out of
`document.styleSheets`: **zero `(orientation…)` rules**, plus no rotate-prompt string anywhere in
`document.body.innerText`. Limitation: Chrome derives `(orientation: landscape)` from the viewport
aspect rather than from the overridden `screen.orientation`, so the media query itself stayed `true`
in both rows — what carries the item is the absence of any such rule in the sheet, not the query's
value.

### Item 5 — in flow, pushing

Rail top equals block bottom at every narrow height driven: 390 × 664 (508 / 507,63), 390 × 659
(88 / 88), 390 × 419 (44 / 44). `aside` computes `position: static`, `z-index: auto`, `order: 9999`,
`overflow-y: auto`. Hit-tested at 390 × 419: `elementFromPoint(195, 20)` is inside the chart column;
`(195, 50)`, `(195, 60)` and `(195, 400)` are all inside the Rail. The only `fixed` / `sticky`
elements in the document are the four TanStack Devtools nodes (`go*` classes) — **nothing in the app
is positioned out of flow.**

### Item 6 — the anchor lane and the coarse-pointer targets

Anchors at 390 × 844: **44 × 48** each, `y 215,64`, x 17,55 (A) and 328,45 (B). The profile SVG spans
y 44 → 263,63 with 48 px of chrome below the plot, so the plot's bottom edge *is* 215,64 and the two
targets occupy the lane plus the label band — **entirely below the plot**. Both are
`pointer-events: none`: reserved geometry, not hit targets (the drag is still ticket 23's), so a probe
at their centre resolves to the profile SVG. **The lane is inert, verified**: a real touch tap at A's
centre (40, 240), at B's (350, 240), and a vertical touch drag from A all left `x` at « 75,1 ».

Rider grab, measured by sweeping `elementFromPoint` outward from the marker's centre until it stops
returning `.chart-grab` — **a hit-target measurement, not a style read**:

| pointer | `stroke-width` | reach ±x | hit ⌀ horizontal | hit ⌀ vertical |
| --- | --- | --- | --- | --- |
| fine (host default) | 14px | +18 / −17 | **36 px** | 35 px |
| **coarse** (CDP touch emulation) | **22px** | +22 / −21 | **44 px** | 43 px |

Scrub surface: the clearance band SVG is **390 × 96**, far above 44. **The View Strip is the gap, now
measured under a matched `(pointer: coarse)`**: the row is 44 px, but « à vide » is 49,3 × **32**,
« corde » 48 × **32**, « ×1 » **29,8 × 32** and the `x` input 64 × **32**. « ×1 » is under the minimum
in *both* dimensions. Item 6 names anchors, rider and scrub, so this does not fail it — but it is a
real coarse-pointer gap and it now has numbers for ticket 35.

### Item 7 — horizontal dragging, and what « vertical panning » actually does here

`touch-action: pan-y` computed on **both** SVGs. Horizontal dragging verified with **real touch
events** (`Input.dispatchTouchEvent` under touch emulation): a drag across the profile moved `x`
75,0 → **108,5** with « Garde min » following 2,48 → 3,40 m and the state staying `whole`; a drag on
the clearance strip moved `x` 75,1 → **41,3**. Both surfaces scrub under real touch.

Two things the ticket's own evidence does not say, both measured here:

- **Nothing vertically pans.** Through a full vertical touch drag on the profile,
  `documentElement.scrollTop`, `body.scrollTop` and the Rail's `scrollTop` all stayed **0** — the
  shell is `h-dvh overflow-hidden` and the Rail is a *sibling* scroller, so `pan-y` has no scroll
  container to hand the gesture to. The CSS permits panning; there is no observable pan.
- **The gesture start repositions the rider.** `touchStart` at the plot's centre moved `x`
  41,3 → **75,1** before any movement, and a fine-pointer `mouse down` / `up` 105 px to the right of
  the marker moved `x` 75,1 → **125,5**, the marker jumping 195 px → 300 px. § 5's table gives
  « pointer down anywhere » to the **strip** and « drag the rider marker » to the profile, so a
  vertical scroll attempt on the profile costs the user their position. Predates this ticket (A8's
  surface); reported, not fixed.

### Item 8 — CSS and derived state only

The shell's inline custom properties are container-query derived, read back at 390 × 844:
`--w-inner: calc(100cqi - 48px)`, `--profile-plot: calc(0.42 * var(--w-inner))`,
`--strip: clamp(96px, calc(0.16 * var(--w-inner)), 200px)`, `--view-strip: 44px`,
`--cell-row: 52px`. **No band reads a window height**, and it shows: the rendered block is **507,63**
at `h` 664, 700 and 844, and **856,30** at `h` 857, 858, 880 and 900 — identical across heights at a
fixed width. The reflow is CSS: `#profil`, the clearance band and the View Strip stay in the DOM with
`display: none` under `pinned` / `compact`, same nodes, same tree. The only viewport units in the
app's own CSS are `100dvh` on the shell root; the `100svh` in the loaded sheets belongs to the
injected Devtools styles.

### Item 9 — gates, re-run on the current tree

```
$ bun run typecheck          # tsc --noEmit
exit=0   (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0   (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1267 passed (1267)
 Duration  1.39s
```

No `oxfmt` run: this pass touched no source file, and this ticket file is in `ignorePatterns`.

### What is outstanding, and why the status is back to `claimed`

1. **The `MIN_RAIL` scoping above B2 — item 1, unticked.** A measured deviation from the item's own
   wording with a large user-visible consequence on 16:9 desktops, and every way of resolving it
   re-opens a § 5 rule. **Named, not decided**: it belongs on a map.
2. **The chevron is a silent no-op under `tight`** (measured at 1440 × 840 and 1366 × 768): enabled,
   focusable, no `aria-expanded`, no `disabled`, no feedback of any kind while the request is merely
   held. Whatever (1) decides, this affordance needs an answer.
3. Recorded for their owners, not failures of this ticket: the View Strip's 32 px controls (ticket 35,
   now with coarse-pointer numbers) and the profile's pointer-down-anywhere scrub against § 5's
   « drag the rider marker » (A8 / ticket 30).

Items 2 through 9 hold on measured evidence and their boxes stand.

---

## Fix step on the verification findings — 2026-08-14

**Role: fix agent, not implementer and not verifier.** Input was the independent browser pass above,
as five findings (one blocking, four minor). Each was re-checked against the code and **re-driven in
the browser first-hand** before anything was touched. **One was fixed. Four are left alone on
purpose**, three of them because closing them requires a § 5 decision or belongs to another ticket's
scope — and a build ticket does not get to take a spec decision. *(Finding 3 stopped being one of the
four the same day: ticket 29's défaut-1 correctif landed after this step and closed it outright —
voir the addendum at the end of this file.)*

**Environment.** `HeadlessChrome/151.0.0.0` (`Mozilla/5.0 (X11; Linux x86_64) … Safari/537.36`),
`agent-browser 0.34.0`, session `scoutech-fix28`, dev server already up at `http://localhost:3000/`
(`curl -s -o /dev/null -w '%{http_code}'` → **200**). Viewports set with `agent-browser set viewport`
and read back from `innerWidth`/`innerHeight`; geometry is `getBoundingClientRect()` /
`getComputedStyle()`; event orderings are a **capture-phase log on `document`**.

### Reproduced, all five — the numbers, first-hand

| # | Finding | Re-driven here | Verdict |
| --- | --- | --- | --- |
| 1 | 16:9 desktops open with no chart | 1366 × 768 → `pinned`·`tight`, block **88**, `#profil` `display: none`, **680 px** of empty chart column, `--pinned-clearance` `120px`, chevron 44 × 44 visible; 1280 × 720 → **632** empty; 1920 × 1080 → **992** empty; 1920 × **1085** → `roomy`, block 1081,27; 1440 × 900 → `roomy`, block 856,30; 390 × 630 → `pinned`·`tight` | **real**, not fixed — § 5 decision |
| 2 | the chevron is a silent no-op under `tight` | 1366 × 768: attributes were exactly `aria-label`, `class`, `title`, `type`; `click` left `pinned`/`tight`/88 with the caret on the button and nothing on screen changed | **real**, **fixed** |
| 3 | narrow fit rule over-reserves the banner by 32 px | 390 × 630 pins while the rendered block is 507,63 — 630 − 507,63 = **122,37 px** of Rail, which clears `MIN_RAIL` by 2,37 | ~~**real**, deliberate — not fixed~~ **closed by ticket 29's défaut 1**, voir l'addendum du 2026-08-14 |
| 4 | pointer-down anywhere on the profile repositions the rider | 390 × 844, marker centre `(195; 149,5)` at `x = 75,0`: `mouse move 300 120 ; down ; up` → `x` **125,5**, marker at `(299,8; 164,1)` — one click 105 px away from the marker | **real**, A8's surface — not fixed |
| 5 | the View Strip's controls are 32 px inside a 44 px row | source-confirmed: `h-8` at `src/components/chart/view-strip.tsx:46` (the three control shells) and `:218` (the `x` input) | **real**, ticket 35's — not fixed |

### Fixed: finding 2 — the chevron now publishes that the request cannot be granted

**One derived boolean, one new pure predicate, no policy change.** `revealGrantable({ fits, compact })`
in `src/lib/layout/collapse.ts` is the negation of `heightConstrained` given a *name*, because the
chevron has to publish it: under either height constraint no press can produce `whole`, so an enabled,
focusable, silent control is a dead affordance for sighted and AT users alike. It reaches
`RevealProfile` as `grantable` through `useCollapse` → `app.tsx` → `ChartBlock` (and `EmptyBands`),
and renders as **`aria-disabled="true"`, `aria-expanded="false"`, `aria-controls="profil"`, a muted
glyph and `cursor: not-allowed`**.

Four things it deliberately does **not** do:

1. **It does not hide the control.** § 5 names « tapping the header (chevron, `aria-label` « Afficher
   le profil ») » as the reversal; withdrawing that affordance is a spec decision, and it is also the
   *other* branch of finding 1's question. Exposing already-derived state is not.
2. **It does not stop the press latching.** `revealed` is still set, so the held request is granted
   the moment the constraint lifts — ticket 27's and this ticket's own design, unit-tested, unchanged.
3. **It invents no French string.** § 5's label is the label; copy for a state the spec never wrote
   down would be new UI text, i.e. a spec decision.
4. **It is not `disabled`.** A `disabled` button leaves an AT user with a control that vanished from
   the tab order instead of one that explains itself; measured, the chevron is still focusable and
   still 44 × 44 under `tight`.

**Measured after the fix** (same session, states read back):

| Viewport | state · fit | block | chevron |
| --- | --- | --- | --- |
| 1366 × 768 | `pinned` · `tight` | 88 | `aria-disabled="true"`, `cursor: not-allowed`, colour `oklab(… / 0.5)`, **44 × 44**, focusable |
| 390 × 630 | `pinned` · `tight` | 88 | idem |
| 844 × 390 (paysage) | `compact` · `tight` | 44 | idem |
| 390 × 844, rail focused (`#rail-L`) | `pinned` · **`roomy`** | 88 | **no** `aria-disabled`, `cursor: pointer`, full-contrast colour |
| 390 × 844, at rest | `whole` · `roomy` | 507,63 | `checkVisibility() false` — unchanged |

- **The press under `tight` is still held, and now announced**: at 1366 × 768, `chevron.focus()` →
  caret on the button with `aria-disabled="true"`; `key Enter` → state `pinned`·`tight`, block 88,
  `#profil` `display: none`, caret **retained** on the chevron. The state that was silent is now in
  the accessibility tree and in two visual channels.
- **The grant path is untouched, and its event log was re-driven**: from `pinned` by *scroll*
  (`aside.scrollTop = 200`, `roomy`), `chevron.focus()` then `key Enter` logs
  `keydown: BUTTON « Afficher le profil » · click: BUTTON · focusout: BUTTON · focusin: DIV#profil`,
  ending `whole` at block 507,63 with `keyup` on the band — ticket 27's hand-over, intact.
- **One node case added** (`collapse.test.ts`, « la révélation n'est accordable que hors contrainte de
  hauteur »): over all four `(fits, compact)` combinations, `revealGrantable` equals
  `!heightConstrained` **and** equals whether `collapseState` with `revealed: true` under a scrolled
  Rail reads `whole` — so the flag is asserted against the policy it claims to describe, not against
  its own definition. `src/lib/layout/` is **150 cases** (was 149); the suite is **1268** (was 1267).

**Files changed by this step.** `src/lib/layout/collapse.ts` (`revealGrantable`),
`src/lib/layout/collapse.test.ts` (one case), `src/components/app/use-collapse.ts`
(`Collapse.revealGrantable`), `src/components/app/shell.tsx` (`RevealProfile`'s `grantable` prop and
the three aria attributes), `src/components/app/app.tsx` (one prop), `src/components/chart/chart-block.tsx`
(the prop through `ChartBlock` and `EmptyBands`). No stylesheet change, no variant change, no change to
`fitsWholeBlock`, `compactRequired`, `bannerBudget` or `chartBlockHeight`. Nothing under
`src/routes/-prototype-07/` was touched.

### Not fixed, and why each is somebody else's call

1. **Finding 1 — the wide-and-short desktop. Item 1 stays unticked and the code is unchanged.**
   Confirmed to the pixel again here, and the reason it is not fixed is the reason the verification
   pass gave: **every way out re-opens § 5**, and this is a build ticket. The options, restated so the
   decision is a choice and not a rediscovery: **(i)** keep today's rule — every 16:9 desktop ships
   with no picture, and 1920 × 1080 misses fitting by 1,3 px; **(ii)** restore the literal
   `blockHeight > available − MIN_RAIL` at every width — § 5's own reference desktop (1440 × 900,
   budget C, a 43 px letterbox) then opens collapsed, contradicting the budget table; **(iii)** scope
   condition (c) to below B2 — above B2 the block clips inside the `overflow-hidden` column, which is
   the defect this ticket was built to remove (844 × 390: bands sum to 593 px in a 390 px shell);
   **(iv)** cap the plot height at wide widths — which edits § 5's aspect rule, the one rule that
   covers 390 px and 1440 px at once. **Belongs on a map, not in this file.**
2. ~~**Finding 3 — the 32 px banner over-reserve.**~~ **Superseded — not « not fixed », *fixed
   elsewhere*.** What this step wrote here (that narrowing the gap means measuring the banner's real
   heights at the three budgets, i.e. ticket 29's re-check, and then re-deciding which default (c)
   spends) turned out to be one option too many: the re-check found the *rendered slot* was the
   wrong half, and fixing that half closed the gap with **no § 5 decision and no change to
   `bannerBudget`**. Voir the addendum at the end of this file.
3. **Finding 4 — pointer-down anywhere on the profile.** Reproduced first-hand (above). § 5's rider
   table gives « pointer down anywhere » to the **strip** and « drag the rider marker » to the
   **profile**, while `profile.tsx` puts the `drag` handlers on the full-plot `<rect>` as well as on
   the marker's grab circle. Which of the two readings is right is a § 5 interpretation with a real
   cost either way — restricting it shrinks the reposition target from the whole plot to a 36/44 px
   circle — and it is **A8's surface, owned by ticket 30**, not this ticket's acceptance (item 7 asks
   for horizontal dragging retained and `pan-y` permitted; both hold). Left exactly as it was.
4. **Finding 5 — the View Strip's 32 px controls.** Confirmed in the source. This ticket's item 6
   names the anchors, the rider and the scrub surfaces; § 5's « the row is 44 px tall, so every
   control in it is a legal touch target » is the claim that needs restating or the sizing that needs
   changing, and **ticket 35 owns it** with the coarse-pointer numbers the pass above measured.

### Gates, re-run on the tree this step leaves behind

```
$ bunx oxfmt --write src/lib/layout/collapse.ts src/lib/layout/collapse.test.ts \
    src/components/app/use-collapse.ts src/components/app/shell.tsx \
    src/components/app/app.tsx src/components/chart/chart-block.tsx
Finished in 267ms on 6 files using 32 threads.

$ bun run typecheck          # tsc --noEmit
exit=0   (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0   (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1268 passed (1268)      (was 1267)
 Duration  1.46s

$ bunx vitest run src/lib/layout/
 Test Files  2 passed (2)
      Tests  150 passed (150)

$ bun run build              # sanity
✓ built in 212ms
```

### Also done in this step, outside this file

**Ticket 27's item 4 was unticked and marked `partiel`**, with a note under its own ## Comments: the
keyboard path from `pinned` by scroll holds and a second press from a settled `pinned` holds, while
the **first pointer press taken directly from `pinned + x`** never reaches the button's handler
(re-measured here: `pointerdown: SPAN · mousedown: SPAN · focusout: INPUT#rail-xD · focusin: BUTTON ·
mouseup: SELECT#rail-cst · click: DIV`, state stays `pinned`) — a **fine**-pointer defect, not a
coarse-pointer unknown. Widening the `pointerdown` latch past § 5's « tant que le champ `x` a le
focus » is an **open spec decision owned by ticket 35**; the underlying defect was **not** fixed.
27's `Status:` line was left as it was.

### Status stays `claimed`

Item 1 is genuinely not satisfied — the app deviates from the item's own wording above B2, and closing
that deviation is a § 5 decision this step is not allowed to take. Items 2 through 9 hold on the
measured evidence above and in the verification pass, and item 4's chevron affordance is now honest
about the state it is in rather than silent. **The one thing still owed before this ticket can be
`done` is the § 5 answer to finding 1.**

---

## Addendum — finding 3 is closed, and every narrow *rendered* number above is pre-correctif — 2026-08-14

**Struck, not judged.** Finding 3 (« the narrow fit rule over-reserves the banner by 32 px ») was
recorded twice above as **real, deliberate — not fixed**, with the narrowing deferred to « § 5's own
re-checks owed in the real build, i.e. ticket 29's ». That deferral was answered the same day and it
did **not** come back as a spec decision: ticket 29's **défaut 1** found the mismatch was entirely on
the *rendered* side — a flat `min-height: var(--banner)` with `--banner: 44px` — and closed it by
re-pointing `--banner` under two disjoint container queries at `bannerBudget`'s own two steps
(`@max-[480px]` → `--banner-three-lines`, `@min-[480px]:@max-[600px]` → `--banner-two-lines`, both
built from `BANNER`, no third breakpoint). **`bannerBudget`, `chartBlockHeight` and (c) were not
touched.** So there is nothing left here to decide, nothing owed to a map, and the « not a silent
close » caveat is satisfied by ticket 29's own measurements rather than by a judgement call.

**Re-driven first-hand on the current tree**, because the strike is a claim about pixels:
`HeadlessChrome/151.0.0.0` (UA `Mozilla/5.0 (X11; Linux x86_64) … Safari/537.36`), `agent-browser
0.34.0`, session `fix28b`, dev server `200`, viewports read back from `innerWidth`/`innerHeight`, every
height a `getBoundingClientRect()` on the block element and on `aside`.

| viewport | column | state · fit | rendered block | Rail | recorded above (pre-correctif) |
| --- | --- | --- | --- | --- | --- |
| 390 × 664 | 390 | `whole` · `roomy` | **539,625** | **124,375** | 507,63 / 156,37 |
| 390 × 700 | 390 | `whole` · `roomy` | **539,625** | 160,375 | 507,63 |
| 390 × 844 | 390 | `whole` · `roomy` | **539,625** | 304,375 | 507,63 |
| 390 × 660 | 390 | `whole` · `roomy` | **539,625** | **120,375** | first `whole` h — unchanged |
| 390 × 659 | 390 | `pinned` · `tight` | **120** (pinned header) | 539 | last `pinned` h — unchanged; header was 88 |
| 390 × 630 | 390 | `pinned` · `tight` | **120** | 510 | `pinned` — unchanged; header was 88 |
| 390 × 419 | 390 | `compact` · `tight` | **44** | 375 | 44 — unchanged |
| 844 × 594 | 556 | `whole` · `roomy` | **593,359** | — | 577,36 |
| 844 × 593 | 556 | `pinned` · `tight` | **104** | — | 88 |
| 1366 × 768 | 1078 | `pinned` · `tight` | **88** | — | 88 — unchanged |
| 1440 × 900 | 1152 | `whole` · `roomy` | **856,297** | — | 856,30 — unchanged |

Three things this table settles:

1. **The « pins ~32 px early » gap is gone, and the narrow arm is now exact to 0,375 px.** At 390 × 660
   the Rail rests at **120,375**, i.e. it clears `MIN_RAIL` by 0,375 — so the last `pinned` height, 659,
   is *correct* rather than early: there the whole block would need 539,625 and leave 119,375, below
   `MIN_RAIL`. Finding 3's own evidence (« 630 − 507,63 = 122,37 px of Rail, which clears `MIN_RAIL` by
   2,37 ») no longer reproduces: at 390 × 630 the block that would render is 539,625 and the Rail left
   is **90,375**, so pinning there is the rule working. Budget A also now sums as § 5 prints it —
   539,625 + 124,375 = **664,000** against « bloc 540 · rail 124 ».
2. **No threshold in item 1's six-width table moves**, and none of items 2–9 changes state anywhere:
   the `predicted threshold` column always spent `bannerBudget`, and the rendered side is what came to
   meet it. The 659/660 and 593/594 boundaries are identical to the ones recorded above, and
   1440 × 900 / 1366 × 768 are untouched because their columns are already ≥ 600 px.
3. **Every *rendered* height recorded above at a chart column narrower than 600 px is pre-correctif**
   — 507,63, the 88 px pinned header at 390, 132 px for `pinned + x` at 390 × 400, 577,36 at a 556 px
   column. They are left as they were written, because they were true of the tree they were measured
   on; read them with the width's banner row substituted for the 44–56 px the slot used to render
   (+32 below a 480 px column, +16 below 600). Ticket 35 recorded the same shift independently on its
   own tree (« `whole` block **539,6** (was 507,6), `pinned` **120** (was 88), `pinned-x` **164** (was
   132) », with `--pinned-clearance` equal to the rendered header at every state), and item 8's
   invariant survives it intact: **539,625 at h 664, 700 and 844 — identical across heights at a fixed
   width**, which is the thing that item was ever about.

**No code changed in this addendum, and no test was added.** The seam is already guarded in `node`, by
the two cases that own the two halves: `contract.test.ts` « the banner term the collapse assumes is
this budget's own row » (`bannerBudget(column)` per budget, and `chartBlockHeight`'s default) and
ticket 29's « the banner slot reserves § 5's row for its width, at `bannerBudget`'s own two
thresholds » (the three rows come from `BANNER`, the two container queries are
`RAIL_REFLOW_PX − RAIL_WIDTH` and `CELL_WRAP_PX`, and `bannerBudget` steps at exactly those). A flat
`--banner` or an invented third breakpoint fails the second; the pixels themselves are a browser
measurement, which is amendment B's accepted coverage.

**`contract.ts`'s `bannerBudget` doc was left as it stands, deliberately.** Its « a 76 px term
over-states the block by 32 px and collapses a desktop window that would have fitted » is scoped, in
the same sentence, to **« at 1152 px of column »** — it argues against the *rejected* alternative of a
three-line term at every width, not about the narrow arm, and `contract.test.ts` asserts exactly that
counterfactual (`chartBlockHeight(1152, BANNER.threeLines) − chartBlockHeight(1152) === 32`). It was
never a claim that the *rendered* narrow block sits 32 px below the budget, so nothing in it went
stale when the rendered slot was fixed.

**Status is unchanged: `claimed`.** Finding 3 leaving the outstanding list changes nothing about item 1
— **the one thing still owed before this ticket can be `done` is the § 5 answer to finding 1.**

---

## Le zoom n'est plus lu comme un clavier — décision du 2026-08-14, prise par l'utilisateur

**Le défaut, mesuré deux fois indépendamment.** `src/components/app/use-viewport.ts` computes § 5's
keyboard piece 2 verbatim — `keyboardInset = innerHeight − visualViewport.height − offsetTop` — and
`compactRequired` fires on **any** inset at all, with no threshold, which is § 5's own wording and is
asserted as a unit case (« le seuil `--kb` n'en est pas un » — kb 1 at height 2000). But
`visualViewport.height` **also shrinks with `scale`**, so a *pinch* is arithmetically
indistinguishable from a keyboard. The viewport meta permits zoom (no `maximum-scale`, no
`user-scalable=no`), so on a phone **pinch-zooming the chart deleted the chart** — the one gesture
whose entire intent is « montre-moi mieux cette image ».

**La décision, prise par l'utilisateur le 2026-08-14 : la *mesure* est fermée à l'échelle** —
`keyboardInsetOf` returns **0 whenever `visualViewport.scale !== 1`**. § 5's formula is left verbatim
below the gate, and the gate is a named condition (`const zoomed = scale !== 1`) with the reason in
prose, so the zero reads as deliberate.

Les deux options écartées, pour mémoire :

- **Corriger l'arithmétique par l'échelle** (`innerHeight − visualHeight × scale …`) — écarté : cela
  divergerait de la formule que § 5 écrit mot pour mot, dans le seul endroit de l'app qui lit un
  viewport.
- **Donner un plancher à `compactRequired`** — écarté : § 5 dit « no threshold » en autant de mots
  (« `compact` fires when `--kb > 0` »), et un plancher casse le cas unitaire déjà asserté (kb 1 à
  2000 px de hauteur).

**Le coût accepté, consigné plutôt que caché : un vrai clavier ouvert sur une page *déjà* zoomée lit
un encart de 0.** The Rail then loses its `--kb` bottom padding and the compact row does not fire for
that keyboard. Where `interactive-widget=resizes-content` is honoured the layout viewport shrank
anyway and nothing is owed — it is the **older-iOS fallback** that pays for it, in exchange for every
pinch on every platform no longer deleting the picture. Reproduced deliberately in the browser (table
below, last row) and asserted as a unit case, so nobody re-discovers it as a bug.

**Et « déjà zoomée » n'est pas une combinaison rare dans *cette* app : c'est le chemin de focus iOS
ordinaire — correction du 2026-08-14, le coût est requalifié, la porte ne bouge pas.** Deux faits du
dépôt, mesurés sur cet hôte, dont aucun n'exigeait un appareil :

- **Tous les champs du Rail calculent 12 px** — `text-xs`, `src/components/rail/controls.tsx:132 ·
  :175` ; mesuré à 390 × 844, **26 `input`/`select` sur 27 sous 16 px** (`text:12px`, `select-one:12px`,
  `radio:12px`, un `text:11px`), la seule exception étant l'`input[type=file]` à 16 px.
- **Le meta viewport autorise le zoom** — `src/routes/__root.tsx:34`,
  `width=device-width, initial-scale=1, interactive-widget=resizes-content`, **sans `maximum-scale` ni
  `user-scalable=no`** (relu dans la page : `visualViewport.scale` 1 au repos).

WebKit zoome *en avant* une page zoomable au focus d'un champ dont la taille de police calculée est
sous 16 px, et **ne dézoome pas au blur**. Donc sur la build même pour laquelle le repli existe — un
iOS Safari ancien, qui ignore `interactive-widget` — c'est **la première frappe dans un champ du
Rail** qui met `scale ≠ 1` : la porte rend 0 et **la pièce 2 de § 5 disparaît pour le reste de la
session** (plus de `pb-[var(--kb,0px)]`, plus de `scroll-pb`, plus de ligne `compact`). Le
comportement WebKit lui-même est **nommé, pas mesuré** — aucun appareil iOS disponible, comme le dit
déjà `use-viewport.ts`. Ce que la table ci-dessous reproduit (dernière ligne) est donc bien le chemin
*par défaut* de la seule plateforme concernée, et non un cas de coin.

**Ce n'est pas une troisième décision.** La porte reste telle qu'elle a été décidée ; ce qui refermerait
l'interaction est **une question § 5 rendue à l'utilisateur**, à trois réponses candidates : 16 px
(`text-base`) sur les champs numériques, `maximum-scale=1` (qui retirerait du même coup le défaut de
pincement auquel la porte répond), ou l'accepter explicitement. Elle est consignée à côté de l'autre
question d'ordonnancement clavier restée ouverte, dans
[ticket 35](./35-narrow-keyboard-browser-pass.md) — et elle s'ajoute donc à ce qui reste dû avant que
ce ticket puisse passer `done`.

**Ce qui a changé dans le code.** `src/components/app/use-viewport.ts` only: a new exported pure
function `keyboardInsetOf(reading: VisualViewportReading)` over four numbers
(`layoutHeight` · `visualHeight` · `offsetTop` · `scale`), which `measure()` now calls with the three
property reads plus `visualViewport.scale`. **The seam became a parameter rather than the test growing
a DOM** — amendment A's own move, the same one the dropped-keys reporter and `readSession` made. No
change to `fitsWholeBlock`, `compactRequired`, `availableHeight`, `collapseState`, `contract.ts`, any
stylesheet or any component; `src/lib/layout/collapse.ts` is untouched, so its ban on the identifier
`visualViewport` (asserted by `contract.test.ts`) still holds and « one file reads a window height »
still names exactly `use-viewport.ts`.

**Douze cas `node` neufs**, `src/components/app/use-viewport.test.ts` (new file, colocated, one test
file per source file): the formula unchanged at scale 1 (no keyboard · § 5's 336 px keyboard over
390 × 664 · the panned-Safari `offsetTop` term · the `max(0, …)` clamp · a 1 px inset still counting),
a 48-combination sweep asserting the gate is **transparent at scale 1** (equal to
`max(0, layoutHeight − visualHeight − offsetTop)`), both measured zooms returning 0 while their
ungated subtraction is asserted to be the measured 300 px / 17,6 px, zoom-out (×0,8, ×0,98) and a
large pinch returning 0, the accepted cost returning 0, and two cases carrying the gate **into
`compactRequired`**: kb 1 at height 2000 still ⇒ `compact` (§ 5's asserted case, through the new seam),
and a ×1,5 pinch at the same height ⇒ **not** compact where the ungated formula would have said 500 px.
Suite: **1300 tests / 40 files** (was 1288 / 39).

### Mesuré, avant/après, à chaque échelle

`HeadlessChrome/151.0.0.0` (`Mozilla/5.0 (X11; Linux x86_64) … Safari/537.36`), `agent-browser 0.34.0`,
session `zoomgate` (closed at the end; the shared dev server was reused, never killed — `curl -s -o
/dev/null -w '%{http_code}'` → **200** before and after). Viewports set with `agent-browser set
viewport` and **read back from `innerWidth`/`innerHeight`**; scale set over CDP
`Emulation.setPageScaleFactor` on the **page** target, read back from `visualViewport.scale`; every row
waited for the client mount (`--kb` present) before it was recorded, because the Skeleton opens
`whole` and would otherwise flatter the result. « formule § 5 » is
`innerHeight − visualViewport.height − offsetTop` evaluated in the page, i.e. **exactly what `--kb`
used to be**.

| viewport | échelle lue | formule § 5 | `--kb` **après** | `data-collapse` / `data-fit` | `#profil` | `aside` `padding-bottom` | avant (mesuré deux fois) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 × 900 | 1 | 0 | **0px** | `whole` · `roomy` | `block` | 0px | idem — inchangé |
| 1440 × 900 | 1,0199999809265137 | **17,65** | **0px** | `whole` · `roomy` | `block` | 0px | `--kb` 17,6px · `compact` · `tight` · `none` · 17,6px |
| 1440 × 900 | 1,5 | **300** | **0px** | `whole` · `roomy` | `block` | 0px | `--kb` 300px · `compact` · `tight` · `none` · 300px |
| 390 × 844 | 1 | 0 | **0px** | `whole` · `roomy` | `block` | 0px | idem — inchangé |
| 390 × 844 | 1,5 | **281,33** | **0px** | `whole` · `roomy` | `block` | 0px | le pincement supprimait le graphe |
| 390 × 844 | 2 | **422** | **0px** | `whole` · `roomy` | `block` | 0px | idem |
| 1366 × 768 | 1 | 0 | 0px | `pinned` · `tight` | `none` | 0px | inchangé — c'est le défaut 1, pas celui-ci |
| 1366 × 768 | 1,5 | **256** | **0px** | **`pinned`** · `tight` | `none` | 0px | `compact` · 44 px — le zoom dégradait `pinned` en `compact` |
| 1440 × 900 · clavier simulé 336 px, échelle 1 | 1 | 336 | **336px** | `compact` · `tight` | `none` | **336px** | idem — la fonctionnalité gardée est intacte |
| 390 × 844 · clavier simulé 336 px, échelle 1 | 1 | 336 | **336px** | `compact` · `tight` | `none` | **336px** | idem |
| 1440 × 900 · clavier simulé 336 px **et** ×1,5 | 1,5 | 336 | **0px** | `whole` · `roomy` | `block` | 0px | **le coût accepté**, reproduit exprès |

Quatre choses que cette table règle :

1. **La porte est bien la porte, et non un événement manquant.** A capture log on `visualViewport`
   recorded the `resize` CDP's scale change fires (`['resize', 1.0199999809265137, 882.35]`, then
   `['resize', 1, 900]`, then `['resize', 1.5, 562.67]` at 390 × 844), so `measure()` **did** re-run at
   every scale and returned 0 by the gate. `--kb` is written on `documentElement` on each run, so the
   `0px` in the table is a fresh computation, not a stale mount value.
2. **La fonctionnalité gardée n'est pas désactivée.** Le clavier logiciel n'existe pas dans ce Chrome
   (limite d'hôte déjà mesurée : pas de clavier réel, `navigator.maxTouchPoints` 0), donc il est
   **simulé et la méthode est étiquetée** : `visualViewport.height` overridden to `innerHeight − 336`
   via an instance getter, then the very `resize` event a real keyboard fires, dispatched on
   `visualViewport`. At scale 1 that path still produces the whole feature — `--kb 336px`, `compact` /
   `tight`, `#profil` `display: none`, `aside` `padding-bottom: 336px` — at both 1440 × 900 and
   390 × 844.
3. **La *même* arithmétique, seule l'échelle diffère.** Les lignes « clavier simulé, échelle 1 » et
   « clavier simulé **et** ×1,5 » ont la même formule § 5 (336) et deux résultats opposés : c'est la
   démonstration que le seul changement de comportement est la porte, sans toucher à la formule ni à
   la règle en aval.
4. **`scale` vaut exactement 1 au repos** (lu à 1440 × 900, 1366 × 768 et 390 × 844, avant et après
   chaque pincement), ce qui est ce qui rend l'égalité stricte tenable ; et à ×1,02 il vaut
   1,0199999809265137, donc un pincement même minuscule est bien du côté « zoomé » de la porte.

Non mesuré, et laissé tel quel : **le pincement *plus* le panoramique** (`offsetTop > 0` sous zoom).
Headless Chrome ne panoramique pas le visual viewport depuis un événement synthétisé — limite d'hôte
déjà consignée — et la porte est en amont du terme `offsetTop` de toute façon : à toute échelle ≠ 1 le
retour est 0 quel que soit `offsetTop`, ce qu'un cas unitaire asserte (`offsetTop` 336 sous ×1,5).

**Portes exécutées :** `bunx oxfmt --write src/components/app/use-viewport.ts
src/components/app/use-viewport.test.ts` → « Finished in 86ms on 2 files using 32 threads » ;
`bun run typecheck` (`tsc --noEmit`) → aucune sortie, exit 0 ; `bun run lint-type-aware`
(`oxlint --type-aware --type-check`) → aucune sortie, exit 0 ; `bun run test` (`vitest run`) →
**40 fichiers / 1300 tests, tous verts**.

**Le statut de ce ticket est inchangé (`claimed`)**, et cette décision n'en ferme aucun item : le
défaut 1 — le bureau large et court, l'item 1 non coché — est une décision distincte, prise le même
jour et laissée à son propre agent. Rien de `src/routes/-prototype-07/**` ni de
`src/routes/prototype.profile-view.tsx` n'a été touché.

---

## Le tracé plafonne à la colonne de référence — décision du 2026-08-14, prise par l'utilisateur

**C'est la réponse à la question ouverte de l'item 1**, et elle **amende § 5** : la décision est
consignée comme [amendement **F**](../AMENDMENTS.md), à côté de A–E, avec ses options écartées et
leurs coûts mesurés. Ce commentaire porte l'arithmétique et les mesures ; l'amendement porte la
décision.

**Le défaut, tel que ce ticket l'avait laissé.** § 5 affirme deux choses qui se contredisent
au-dessus de son propre bureau de référence : « every band height is a function of the chart column's
inner width » — donc `0,42 × W_inner`, croissance linéaire sans borne — et le bloc **entier** du
budget C à 1440 × 900, qui ne laisse que 43 px de boîtage. Passé 1440 px de large, le bloc dépasse
donc n'importe quelle hauteur de fenêtre : cinq bureaux 16:9 ordinaires s'ouvraient **sans aucun
graphe**, dont 1920 × 1080 à **1,3 px près**.

**La décision : `plot = min(0,42 × W_inner, 463,68 px)`** — figé à la valeur que la règle atteint à la
colonne de référence de § 5 (colonne **1152**, `W_inner` **1104**), c'est-à-dire le 463,672 que le
ticket 29 a mesuré à l'identique à 1440 × {700, 800, 900, 1000, 1200}. Un `min()` CSS dans les
propriétés personnalisées de la coquille et un `Math.min` dans `contract.ts`, tous deux depuis la
**même** constante : ni `useMediaQuery`, ni hauteur de fenêtre dans une bande.

### L'arithmétique des trois budgets, avant et après — la condition que la décision devait respecter

`bloc = bandeau + (76 + tracé) + garde + 44 + cellules`, `W_inner = colonne − 48`.

| | colonne | `W_inner` | tracé **avant** | tracé **après** | garde | bandeau | cellules | **bloc avant** | **bloc après** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **A · 390 × 664** | 390 | 342 | 143,64 | **143,64** | 96 (plancher) | 76 | 104 | **539,64** | **539,64** |
| **B · 768 × 1024** | 480 | 432 | 181,44 | **181,44** | 96 (plancher) | 60 | 104 | **561,44** | **561,44** |
| **C · 1440 × 900** | 1152 | 1104 | 463,68 | **463,68** | 176,64 | 44 | 52 | **856,32** | **856,32** |

Les trois sont **inchangés au bit près** — le `min` est transparent à 342, 432 et 1104, et le budget C
est *exactement* sur le plafond, ce qui est tout ce que « rien au niveau de la référence ou en dessous
ne bouge » veut dire. Le boîtage du budget C reste **43,68** px et celui du budget B **462,56**.
Sous B2 la colonne la plus large que la disposition puisse produire est 767 px (tracé 302 px), donc
l'arc étroit **ne peut pas atteindre le plafond**, par construction.

### L'arc large, mesuré dans le navigateur, avant / après

`HeadlessChrome/151.0.0.0`, `agent-browser 0.34.0`, session `capF` (fermée à la fin ; le serveur de
dév partagé a été réutilisé, jamais tué — `curl -s -o /dev/null -w '%{http_code}'` → **200** avant et
après). Chaque viewport posé avec `agent-browser set viewport` puis **relu** depuis
`innerWidth`/`innerHeight` ; géométrie en `getBoundingClientRect()`, `--profile-plot` et `--strip`
relus à travers un `div` jetable dimensionné par la variable — la méthode du ticket 29.

| viewport | colonne | bloc avant | bloc après | `data-collapse` / `data-fit` | `#profil` | reste | badge VE |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 × 664 | 390 | 539,625 | **539,625** | `whole` · `roomy` | `block` | rail 124,375 | ×1,9 |
| 768 × 1024 | 480 | 561,438 | **561,438** | `whole` · `roomy` | `block` | 462,563 | ×1,9 |
| **1440 × 900** | 1152 | 856,297 | **856,297** | `whole` · `roomy` | `block` | **43,703** | ×1,9 |
| 844 × 390 paysage | 556 | 44 | **44** | `compact` · `tight` | `none` | — | — |
| 1280 × 720 | 992 | 763,52 | 763,52 | `pinned` · `tight` | `none` | **632 vides** | — |
| 1366 × 768 | 1078 | 813,40 | 813,40 | `pinned` · `tight` | `none` | **680 vides** | — |
| 1512 × 850 | 1224 | 898,08 | 867,84 | `pinned` · `tight` | `none` | **762 vides** | — |
| **1600 × 900** | 1312 | 946,88 | **879,672** | **`whole`** · `roomy` | `block` | 20,328 | ×1,6 |
| **1920 × 1080** | 1632 | 1081,28 | **879,672** | **`whole`** · `roomy` | `block` | 200,328 | ×1,3 |
| 2560 × 1440 | 2272 | 1350,08 | **879,672** | `whole` · `roomy` | `block` | 560,328 | ×1 — vraie échelle |
| **3440 × 1440** | 3152 | 1719,68 | **879,672** | **`whole`** · `roomy` | `block` | 560,328 | ×1 · câble hors cadre |

Les colonnes « avant » sont celles de la passe navigateur de ce ticket là où elle avait pris la ligne,
et l'arithmétique pré-amendement ailleurs ; les 632 px de colonne vide à 1280 × 720 se reproduisent au
pixel, donc les deux sessions concordent. Captures prises à 1920 × 1080 et 2560 × 1440 : le graphe est
là, entier, câble dans le cadre, les cinq cellules lisibles — là où c'était **une colonne blanche**.

**Le bloc est borné pour la première fois.** Ses deux termes dérivés de la largeur ont maintenant un
plafond — le tracé à 463,68 et la bande de garde au 200 de § 5 — donc le bloc plafonne à
`44 + 76 + 463,68 + 200 + 44 + 52` = **879,68 px** à toute largeur. Mesuré identique à 1600, 1920,
2560 et 3440 px de viewport.

### Trois bureaux courts restent épinglés, et **aucun plafond ne peut les sauver**

Ce n'est pas une question laissée ouverte, c'est une impossibilité arithmétique tant que le budget C
tient :

- **1280 × 720** (colonne 992, `W_inner` 944) et **1366 × 768** (1078 / 1030) sont **plus étroits que
  la référence**, donc leur tracé est déjà sous le plafond : 396,48 et 432,60 px, blocs 763,52 et
  813,40, soit 43,52 et 45,40 px de trop. Les faire tenir demanderait un plafond ≤ 352,96 px à
  `W_inner` 944 — qui abaisserait aussi le 463,68 du budget C, puisqu'un plafond est un `min` avec une
  constante.
- **1512 × 850** demande un bloc ≤ 850 à une colonne **plus large** que celle du budget C : il faudrait
  que le bloc *décroisse* avec la largeur. Même en figeant *aussi* la bande de garde — la borne la plus
  serrée disponible — il reste les **856,32** px du budget C, encore 6,32 px de trop.

Donc : **conserver le budget C est exactement ce qui interdit ces trois lignes**, et un viewport plus
court que son propre bloc est ce à quoi l'en-tête de sécurité épinglé sert. C'est le régime attendu,
pas le défaut.

### L'asymétrie `MIN_RAIL` reste, et c'est la même décision qui la tranche

`fitsWholeBlock` retire `MIN_RAIL` **sous** B2 et le `chromeHeight` de la coquille **au-dessus** —
l'écart que la passe navigateur de ce ticket avait signalé contre le libellé littéral de l'item 1. Le
plafond n'en retire rien :

- **Sous B2, le plafond ne mord jamais** (colonne ≤ 767), donc cet arc est décidé par exactement le
  terme qu'il était : sans lui, 390 × 560 annoncerait « ça tient » avec **20,36 px** de rail contre un
  plancher de 120, et les 124 px du budget A qui refusent une barre de titre à `__root.tsx` ne
  voudraient plus rien dire.
- **Au-dessus de B2, l'ajouter est l'option (ii) écartée** : 856,32 contre `900 − 120 = 780`
  **replierait le bureau de référence de la spec**, et 1600 × 900 — la ligne que le plafond vient de
  sauver — repartirait en `pinned`.
- Ce que le plafond *a* changé, c'est la taille du désaccord : le bloc borné à 879,68, les deux
  lectures coïncident sur tout viewport d'au moins 999,68 px de haut, **1920 × 1080 compris**. Elles ne
  divergent plus que là où le budget C vit. Deux cas `node` l'assertent.

**Ce que ça coûte, consigné plutôt que caché.** L'aspect obtenu **descend** avec la largeur passé la
référence (0,42 à 1104, 0,3668 à 1264, 0,2927 à 1584, 0,2085 à 2224) et sort du plancher 0,35 de la
Plot Aspect Band au-delà d'une colonne de 1372,8 px. La bande garde désormais la **règle**, pas la
valeur plafonnée — et la direction est ce qui rend ça acceptable : un plafond ne peut que *baisser*
l'aspect, donc baisser VE, et la moitié dangereuse de la bande est son plafond (la sur-exagération que
le ×5,5 publié borne). VE ne comprime **jamais** : elle bute sur le plancher ×1, qui est un **état de
badge annoncé** — « ×1 — vraie échelle » à 2560 px, « · câble hors cadre » à 3440 px, mesurés
ci-dessus — pendant que le « Garde min » imprimé continue de porter le nombre.

**Ce qui a changé dans le code.** `src/lib/layout/contract.ts` : trois constantes
(`REFERENCE_DESKTOP_PX`, `REFERENCE_COLUMN_PX`, `PROFILE_PLOT_MAX`), un `Math.min` dans
`profilePlotHeight`, et une nouvelle fonction pure `plotAspect(wInner)` — l'aspect **obtenu**.
`src/components/app/shell.tsx` : `--profile-plot` devient
`min(calc(0,42 × var(--w-inner)), 463.68px)`, les deux termes interpolés depuis les mêmes constantes.
`src/components/chart/chart-block.tsx` : `exaggeration()` reçoit `plotAspect(wInner)` au lieu de la
cible 0,42 — **nécessaire, pas cosmétique** : une échelle z construite pour 0,42 dans une boîte
plafonnée pousse le câble hors du cadre pendant que le badge annonce un auto-fit.
`src/lib/layout/collapse.ts` **n'a pas changé** : (c) est la même comparaison, avec un terme gauche
désormais borné.

**Vingt-deux cas `node` neufs** — `contract.test.ts` (nouveau bloc « amendment F » : le plafond *est*
la colonne de référence, les trois budgets identiques à la règle non plafonnée, le plafond
inatteignable sous B2, les sept lignes larges avec leur contre-factuel non plafonné, le plateau à
879,68 avec balayage de 100 à 4000 px, l'aspect obtenu et le franchissement du plancher de bande à
1324,8, et ce que le plafond coûte au badge) et `collapse.test.ts` (huit viewports larges dans la
table de (c), plus l'asymétrie `MIN_RAIL` et sa contre-épreuve à 390 × 560). **Aucune chaîne de classe
Tailwind lue dans un `.tsx`** : deux relecteurs ont déjà signalé ce motif comme un test de composant
déguisé. Suite : **40 fichiers / 1322 tests** (était 40 / 1300).

**Portes exécutées :** `bunx oxfmt --write` sur les cinq fichiers touchés → « Finished in 151ms on 4
files » puis « 72ms on 1 files » ; `bun run typecheck` (`tsc --noEmit`) → aucune sortie, exit 0 ;
`bun run lint-type-aware` (`oxlint --type-aware --type-check`) → aucune sortie, exit 0 ;
`bun run test` (`vitest run`) → **40 fichiers / 1322 tests, tous verts**.

**Statut du ticket : inchangé (`claimed`)** — l'item 1 est coché, tous les items le sont désormais,
mais la revue et la passe de vérification de ce ticket appartiennent à d'autres. Rien de
`src/routes/-prototype-07/**` ni de `src/routes/prototype.profile-view.tsx` n'a été touché.

---

## Correction des deux registres de coût, sur constats de revue — 2026-08-14, agent de correction

Deux constats bloquants, **tous deux réels**, tous deux vérifiés contre le code avant toute
modification. Ni l'un ni l'autre ne touche une des deux décisions : ce sont les **registres de coût**
de ces décisions qui étaient faux ou incomplets — exactement ce que « consigner les coûts pour que
personne ne réouvre à l'aveugle » demandait. **Aucune troisième décision n'a été prise** ; les deux
questions § 5 que ces coûts soulèvent sont nommées et rendues.

### Constat 1 · le coût de la porte de zoom était décrit comme un cas de coin — **confirmé**

Vérifié sur l'arbre : `src/components/rail/controls.tsx:132` (`text-xs` sur le champ numérique, et
aussi `:175`) et `src/routes/__root.tsx:34`
(`width=device-width, initial-scale=1, interactive-widget=resizes-content`, sans `maximum-scale` ni
`user-scalable=no`). **Mesuré dans la page** à 390 × 844, session `fixF` : **26 `input`/`select` sur 27
sous 16 px** (`text:12px`, `select-one:12px`, `radio:12px`, un `text:11px`), seule exception
l'`input[type=file]` à 16 px ; `visualViewport.scale` 1 au repos. WebKit zoome en avant au focus d'un
champ sous 16 px sur une page zoomable et ne dézoome pas au blur — donc sur l'iOS Safari ancien *pour
lequel le repli `--kb` existe*, c'est la **première frappe dans un champ du Rail** qui met `scale ≠ 1`,
et la pièce 2 de § 5 disparaît pour le reste de la session. Le comportement WebKit lui-même est
**nommé, pas mesuré** (aucun appareil iOS).

**Corrigé là où le coût est consigné, sans toucher la porte** : le paragraphe « le coût accepté »
ci-dessus, et la docstring de `keyboardInsetOf` dans `src/components/app/use-viewport.ts`. La question
§ 5 (α 16 px / β `maximum-scale=1` / γ accepter explicitement) est déposée dans
[ticket 35](./35-narrow-keyboard-browser-pass.md), à côté de la question d'ordonnancement
focus-puis-clavier déjà ouverte.

### Constat 2 · l'amendement F ne consignait pas que la coupe devient atteignable *par la boîte* — **confirmé, et reproduit**

Vérifié dans `src/lib/layout/contract.ts` (`exaggeration` :
`clipped = clamped ∧ zVisibleSpan < zDataSpan`) puis **reproduit dans le navigateur** (session `fixF`,
serveur de dev partagé réutilisé et laissé tournant — `curl -s -o /dev/null -w '%{http_code}'` →
**200** ; viewports posés puis **relus** depuis `innerWidth`/`innerHeight`, géométrie par
`getBoundingClientRect()`) : à **2560 × 1440**, `?L=200&h=-40&za=12&zb=12&fl=6`, colonne 2272,
`W_inner` 2224, bloc **879,672**, `whole` · `roomy` → badge « **Éch. verticale ×1 — vraie échelle ·
câble hors cadre** », « Garde min (traversée) » **1,83 m**, « Garde min » du View Strip **1,89 m**,
**aucun contact au sol et aucune bannière de verdict**, capture montrant le pylône A et le haut du
câble coupés par le cadre. Balayage de largeur : coupe **absente** à 2290 × 1440 (`W_inner` 1954,
aspect 0,2373), **présente** à 2300 × 1440 (`W_inner` 1964, aspect 0,2361). Forme close du seuil :
`plotAspect < 1 / (1,24 k)`, soit `W_inner > 574,96 k` — **2125,1** pour la ligne `k` 3,696 de § 5,
donc `W_inner` 2224 coupe, ce que `contract.test.ts` assertait déjà. **À distinguer du franchissement
du plancher de bande** (colonne 1372,8, coût 1) : franchir le plancher aplatit le dessin, il ne le
coupe pas.

**Corrigé dans [AMENDMENTS.md § F](../AMENDMENTS.md)** : § 5 *The ×1 floor is its own disclosed badge
state* ajouté à la liste « Amends » (son « reachable from the data, not from the box » et son « never
cut without the banner » ne tiennent plus au-dessus de la colonne de référence), coût 2 étendu avec la
forme close, la mesure ci-dessus et la mitigation nommée pour ce qu'elle est — **3ᵉ ligne du badge +
« Garde min » imprimée**, pas une bannière de sol ; la colonne « badge VE » de la table est annotée
comme scénario de premier lancement uniquement, et le « Lands on » du ticket 30 précisé. Une ligne
miroir dans [ticket 30](./30-chart-fidelity-and-drag-evidence.md), item 2. La suffisance de cette
divulgation sur écran large — et le « peek », désactivé justement quand le clamp tient — est **une
question § 5 laissée ouverte, pas tranchée ici** : ce serait une troisième décision.

**Mise à jour du 2026-08-14 : cette question est tranchée — décision 4 du propriétaire.** Le « peek »
est réactivé pour la coupe **due au cap** uniquement (`clipCause: "box"`), reste désactivé pour la
coupe due à la **donnée** et pour la rangée 2 du badge, et le maintien dessine le câble entier à
l'auto-fit en le disant dans le badge. Ni le cap, ni le budget C, ni les quatre rangs du bandeau ne
sont touchés. Mesures et options rejetées :
[AMENDMENTS.md § F, coût 2 « ADDRESSED »](../AMENDMENTS.md).

### Fichiers touchés

- `src/components/app/use-viewport.ts` — **commentaire seul** (paragraphe du coût accepté) : la porte,
  la formule et le seam sont inchangés, aucun changement de comportement.
- `src/lib/layout/contract.test.ts` — **commentaire seul** (pointeur vers l'amendement F et forme close
  du seuil, à l'assertion `true-scale-clipped`). Aucune assertion modifiée, aucun cas ajouté.
- `.scratch/zipline-simulator-v1-build/AMENDMENTS.md` — § F : « Amends », coût 2, note sous la table,
  « Lands on ».
- Tickets **28** (celui-ci), **30** (item 2), **35** (2ᵉ question § 5 ouverte).
- Rien d'autre : `src/lib/layout/collapse.ts`, `src/lib/layout/contract.ts`, les feuilles de style et
  tous les composants sont **inchangés** ; `src/routes/-prototype-07/**` et
  `src/routes/prototype.profile-view.tsx` **non touchés** ; aucun commit.

### Portes exécutées, sortie réelle

```
$ bunx oxfmt --write src/components/app/use-viewport.ts src/lib/layout/contract.test.ts
Finished in 80ms on 2 files using 32 threads.

$ bun run typecheck            # tsc --noEmit
(aucune sortie, exit 0)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
(aucune sortie, exit 0)

$ bun run test                 # vitest run
 Test Files  40 (40 verts)
      Tests  1322 (1322 verts)
   Duration  1.16s
```

Les Markdown touchés sont dans `ignorePatterns` de `.oxfmtrc.json` : pas de `oxfmt` sur eux.
**Statut du ticket : inchangé (`claimed`)** — et il reste désormais dû **deux** réponses § 5 : le
défaut 1 d'origine, et la question 16 px / `maximum-scale` ci-dessus.

---

## Vérification navigateur indépendante des deux décisions du 2026-08-14 — session `capverify`

Passe de vérification, **lecture seule sur `src/**`** : rien sous `src/` n'a été touché, aucune ligne
`Status:` n'a bougé, `src/routes/-prototype-07/**` et `src/routes/prototype.profile-view.tsx` non
touchés. Ce commentaire porte la **porte de zoom** et la **règle (c) plafonnée** ; les trois budgets
sont dans [le ticket 29](./29-responsive-layout-browser-evidence.md).

**Environnement.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`, `devicePixelRatio 1`. `agent-browser`,
session **`capverify`** (fermée à la fin, `--session` seulement — le serveur de dév partagé a été
réutilisé, jamais tué, jamais `close --all` ; `curl -s -o /dev/null -w '%{http_code}'
http://localhost:3000/` → **200** avant et après). Chaque viewport posé avec `agent-browser set
viewport` puis **relu depuis `innerWidth`/`innerHeight`** avant qu'un chiffre soit consigné ;
géométrie en `getBoundingClientRect()` ; `--profile-plot` et `--strip` relus à travers un `div`
jetable dimensionné par la variable (la méthode du ticket 29). Lien mesuré : le `FULL` du ticket 29,
HTTP **200**.

**Un piège de méthode, consigné parce qu'il fausse la lecture du `compact`.** Le `measure.js` du
ticket 29 **somme les hauteurs des cinq enfants** de la pile. En `compact` la pile est
`flex-direction: row` — mesuré — donc le créneau bandeau (411,188 × 44 à 844 × 390) est **à côté** de
la cellule vive (144,813 × 44), et la somme vaut 88 pendant que la **boîte de la pile** vaut 44. Tous
les « bloc » ci-dessous sont la hauteur de la **pile elle-même**, pas la somme des enfants ; c'est ce
qui réconcilie le « bloc 44 » de l'item 2 et le 88 qu'une somme naïve renvoie.

### Décision 2 — la règle (c) sous le plafond : l'arc large

| viewport | colonne | `W_inner` | `--profile-plot` | bloc (pile) | `data-collapse` · `data-fit` | `#profil` | boîtage | graphe visible ? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1280 × 720 | 992 | 944 | **396,469** | **88** | `pinned` · `tight` | `none` | 632 vides | **non** |
| 1366 × 768 | 1078 | 1030 | **432,594** | **88** | `pinned` · `tight` | `none` | 680 vides | **non** |
| 1512 × 850 | 1224 | 1176 | **463,672** | **88** | `pinned` · `tight` | `none` | 762 vides | **non** |
| **1600 × 900** | 1312 | 1264 | **463,672** | **879,672** | **`whole`** · `roomy` | `block` | **20,328** | **oui** |
| **1920 × 1080** | 1632 | 1584 | **463,672** | **879,672** | **`whole`** · `roomy` | `block` | 200,328 | **oui** |
| **2560 × 1440** | 2272 | 2224 | **463,672** | **879,672** | **`whole`** · `roomy` | `block` | 560,328 | **oui** |
| 3440 × 1440 | 3152 | 3104 | **463,672** | **879,672** | `whole` · `roomy` | `block` | 560,328 | oui |

« Graphe visible » n'est pas déduit de `display` : à 1600, 1920, 2560 et 3440 le `svg` du profil
mesure 1312 / 1632 / 2272 / 3152 × **539,672** et porte **deux** `path` tracés (le terrain
`fill-muted stroke-border` et le câble `fill-none stroke-2 stroke-foreground`, largeurs 1149,09 /
1440 / 2021,82 / 2821,82) ; capture à 1920 × 1080 : câble entier, cinq cellules lisibles
(« Garde min 2,48 m · T anc. A 817,1 daN · T anc. B 793,5 daN · Pente −19,4 % · Flèche 7,48 m »).
Aux trois lignes `pinned` le `svg` mesure **0 × 0**. **Le plateau 879,671875 est identique aux quatre
largeurs** ≥ 1600 : le bloc est borné, mesuré.

**Les trois bureaux courts sont limités par leur *hauteur*, pas par leur colonne** — contre-épreuve
qui manquait, et qui ferme « aucun plafond ne peut les sauver » par la mesure plutôt que par
l'arithmétique seule :

| viewport | colonne | bloc | état | graphe |
| --- | --- | --- | --- | --- |
| **1280 × 900** | 992 | **763,500** | `whole` · `roomy` | `block`, boîtage 136,500 |
| **1366 × 900** | 1078 | **813,391** | `whole` · `roomy` | `block`, boîtage 86,609 |
| **1512 × 900** | 1224 | **867,828** | `whole` · `roomy` | `block`, boîtage 32,172 |

Les mêmes colonnes qui s'ouvrent `pinned` à 720 / 768 / 850 px de haut s'ouvrent **`whole` avec le
graphe entier** à 900 px. Ce sont bien 43,5 / 45,4 / 17,8 px de *hauteur* qui manquent, et non une
colonne trop large.

### Décision 2 — pas de rognage, à aucune des deux largeurs qui l'avaient produit

| viewport | pile | `flex-direction` de la pile | colonne `clientHeight` / `scrollHeight` | `overflow-y` | débordement |
| --- | --- | --- | --- | --- | --- |
| **844 × 390** paysage | **44** (`compact` · `tight`) | **`row`** | 390 / 390 | `hidden` | **0** |
| **926 × 428** paysage | **88** (`pinned` · `tight`) | `column` | 428 / 428 | `hidden` | **0** |

À 844 × 390 les deux bandes vives sont côte à côte dans **une** rangée de 44 px (bandeau 411,188 × 44
à `x 288`, cellule 144,813 × 44 à `x 699,188`, `y 0` toutes deux), les trois autres à `0 × 0`. Les
bandes **ne somment donc pas** au-delà de la hauteur de colonne : le rognage de l'option écartée
« borner (c) sous B2 » (593 px dans 390) n'est pas revenu. `--pinned-clearance` **44px** à 844 × 390 et
**120px** à 926 × 428, comme la table d'état de § 5. Débordement nul aussi aux onze autres viewports
mesurés : `scrollHeight − clientHeight` = **0** partout.

### Décision 2 — l'aspect obtenu, et le plancher de la Plot Aspect Band franchi à la largeur annoncée

| viewport | `W_inner` | aspect obtenu | dans [0,35 – 0,50] ? |
| --- | --- | --- | --- |
| 390 × 664 | 342 | 0,419956 | oui |
| 768 × 1024 | 432 | 0,419994 | oui |
| 844 × 390 | 508 | 0,419999 | oui |
| 926 × 428 | 590 | 0,419995 | oui |
| 1280 × 720 | 944 | 0,419988 | oui |
| 1366 × 768 | 1030 | 0,419994 | oui |
| **1440 × 900** | 1104 | **0,419993** | oui |
| 1512 × 850 | 1176 | 0,394279 | oui |
| 1600 × 900 | 1264 | 0,366829 | oui |
| **1660 × 900** | **1324** | **0,3502** | **oui** |
| **1661 × 900** | **1325** | **0,3499** | **non** |
| 1920 × 1080 | 1584 | 0,292722 | **non** |
| **2560 × 1440** | 2224 | **0,208486** | **non** |
| 3440 × 1440 | 3104 | 0,149379 | **non** |

**Le franchissement est encadré au pixel** : dernier viewport dans la bande **1660 × 900**
(`W_inner` 1324), premier dehors **1661 × 900** (`W_inner` 1325) — l'amendement F annonçait
`463,68 / 0,35` = **1324,8** de `W_inner`, « un viewport ~1661 px ». Mesuré : exactement là. Les trois
valeurs que le coût 1 de l'amendement cite se reproduisent au chiffre près : **0,3668** à 1264,
**0,2927** à 1584, **0,2085** à 2224.

**Donc « l'aspect reste dans [0,35 ; 0,50] à toute largeur » est faux au-dessus d'une colonne de
1372 px — et c'est le coût 1 déjà consigné, pas une régression cachée.** La direction est celle que
l'amendement invoque : le plafond ne peut que *baisser* l'aspect, et la moitié dangereuse de la bande
est son **plafond**, jamais franchi (max mesuré **0,419999**). VE ne comprime jamais : **×1,9** à
1440 × 900 (aspect 0,419993) et **×1 — vraie échelle** à 2560 × 1440 (aspect 0,208486), le plancher
annoncé. À 3440 × 1440 le badge lit **« Éch. verticale ×1 — vraie échelle · câble hors cadre »** et les
deux `path` sortent bien du cadre (câble `top 21,66` contre un `svg` à `top 44`) : la ligne 3 du badge
dit ce qu'elle doit dire, et la coupe atteignable par la boîte du coût 2 est reproduite.

### Décision 1 — la porte de zoom, `Emulation.setPageScaleFactor` sur la cible page

Échelle posée par CDP sur le **websocket de la cible page** (`agent-browser get cdp-url` →
`/json/list` → `page.webSocketDebuggerUrl`), puis **relue depuis `visualViewport.scale`**. « formule
§ 5 » = `max(0, innerHeight − visualViewport.height − offsetTop)` évaluée dans la page, c'est-à-dire
exactement ce que `--kb` valait avant la porte. Chaque ligne prise après le montage client.

| viewport | échelle relue | `visualViewport.height` | formule § 5 | `--kb` | `data-collapse` · `data-fit` | `#profil` | `aside` `padding-bottom` / `scroll-padding-bottom` | bloc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 × 900 | 1 | 900 | 0 | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 856,297 |
| 1440 × 900 | **1,0199999809265137** | 882,35 | **17,65** | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 856,297 |
| 1440 × 900 | **1,5** | 600 | **300** | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 856,297 |
| 1440 × 900 | **2** | 450 | **450** | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 856,297 |
| 390 × 844 | 1 | 844 | 0 | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 539,625 |
| 390 × 844 | **1,0199999809265137** | 827,45 | **16,55** | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 539,625 |
| 390 × 844 | **1,5** | 562,67 | **281,33** | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 539,625 |
| 390 × 844 | **2** | 422 | **422** | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 539,625 |
| 1366 × 768 | 1 | 768 | 0 | 0px | `pinned` · `tight` | `none` | 0px / 0px | 88 |
| 1366 × 768 | **1,5** | 512 | **256** | **0px** | **`pinned`** · `tight` | `none` | 0px / 0px | **88** |

**Rien ne bouge sous le zoom** : à 1440 × 900 et 390 × 844 les quatre sorties observables
(`data-collapse`, `data-fit`, `#profil`, `padding-bottom`) et le bloc sont **identiques à l'échelle 1**
aux trois échelles, pendant que la formule § 5 monte à 450 et 422 px. Et le `pinned` de 1366 × 768 ne
**dégrade plus** en `compact` : c'est la ligne où l'ancien comportement était le plus visible.

**La porte est la porte, pas un événement manquant.** Journal de capture posé sur `visualViewport`
avant le balayage à 390 × 844 :
`[["resize",1.0199999809265137,827.45],["resize",1.5,562.67],["resize",2,422]]` — `measure()` a donc
bien re-tourné à **chaque** changement d'échelle et a rendu 0 **par la porte**. `--kb` est réécrit sur
`documentElement` à chaque passage, donc les `0px` sont des calculs frais.

### Décision 1 — à l'échelle 1 le clavier produit toujours la rangée `compact`

**Méthode, étiquetée : aucun clavier logiciel n'existe sur cet hôte** (`navigator.maxTouchPoints` 0,
`(pointer: coarse)` faux sans émulation CDP). Simulé par un **getter de propriété propre** sur
l'instance `visualViewport` rendant `innerHeight − 336`, puis **l'événement `resize` qu'un vrai
clavier émet**, dispatché sur `visualViewport` — le seam que `use-viewport.ts` écoute. Ce n'est pas un
clavier, pas un redimensionnement de viewport, pas une métrique CDP. Override retiré après chaque
ligne (`delete vv.height` + `resize`).

| viewport | échelle | `visualViewport.height` | formule § 5 | `--kb` | `data-collapse` · `data-fit` | `#profil` | `aside` `padding-bottom` / `scroll-padding-bottom` | pile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 × 900 · clavier simulé 336 | **1** | 564 | 336 | **336px** | **`compact`** · `tight` | **`none`** | **336px / 336px** | **44** |
| 390 × 844 · clavier simulé 336 | **1** | 508 | 336 | **336px** | **`compact`** · `tight` | **`none`** | **336px / 336px** | **44** |
| 1440 × 900 · clavier simulé 336 **et** ×1,5 | **1,5** | 564 | 336 | **0px** | `whole` · `roomy` | `block` | 0px / 0px | 856,297 |

Les deux premières lignes sont la fonctionnalité gardée, intacte : `--kb 336px`, rangée unique de
44 px, profil masqué, Rail rembourré **et** `scroll-padding-bottom` au même encart. La troisième est
**le coût accepté, reproduit exprès** : même formule § 5 (336) que la ligne au-dessus, résultat
opposé, parce que la seule variable qui change est l'échelle. Un vrai clavier ouvert sur une page déjà
zoomée lit bien un encart de 0 — consigné, pas caché.

### Non observable sur cet hôte — dit, pas déduit

- **Pointeur grossier / tactile réel** : `navigator.maxTouchPoints` 0 et `(pointer: coarse)` faux hors
  émulation CDP. Aucun geste de pincement réel : l'échelle vient de CDP.
- **Clavier logiciel réel** : inexistant, d'où la simulation étiquetée ci-dessus.
- **Pincement *plus* panoramique** (`offsetTop > 0` sous zoom) : `offsetTop` a lu **0** à toutes les
  échelles ; Chrome headless ne panoramique pas le visual viewport depuis un événement synthétisé. La
  porte est de toute façon en amont du terme `offsetTop`.
- **`interactive-widget=resizes-content`** : présent dans le DOM, honoré par Safari seul.
- **Aucune image comparée à une référence** : les captures prouvent la présence du graphe, pas un
  diff pixel.

### Portes exécutées, sortie réelle

```
$ bun run typecheck            # tsc --noEmit
exit=0                         (aucune sortie)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (aucune sortie)

$ bun run test                 # vitest run
 Test Files  40 (40 verts)
      Tests  1322 (1322 verts)
   Duration  1.14s
```

Aucun `oxfmt` : cette passe n'a touché que deux Markdown de tickets, et les Markdown sont dans
`ignorePatterns` de `.oxfmtrc.json`. **Aucune ligne `Status:` n'a été modifiée.**

---

## Les champs numériques du Rail passent à 16 px — décision 5 du 2026-08-14, prise par l'utilisateur

**Ce que la décision ferme.** La porte de zoom (`keyboardInsetOf` rend **0** dès que
`visualViewport.scale !== 1`) avait un coût accepté qui s'est révélé être le **chemin par défaut sur
iOS**, consigné plus haut dans ce ticket et dans la docstring de `use-viewport.ts` : les champs
numériques du Rail calculaient **12 px** (`text-xs`, `src/components/rail/controls.tsx`,
`NumericInput`, qui leur donne `inputMode="decimal"`) et le meta viewport autorise le zoom **à
dessein** (`src/routes/__root.tsx` : `width=device-width, initial-scale=1,
interactive-widget=resizes-content`, ni `maximum-scale` ni `user-scalable=no`). WebKit zoome *en
avant* une page zoomable au focus d'un champ texte sous 16 px et ne dézoome pas au blur : **la
première frappe dans n'importe quel champ** mettait donc `scale ≠ 1`, la porte rendait 0, et **la
pièce 2 de § 5 disparaissait pour le reste de la session** — sur la seule plateforme pour laquelle le
repli `--kb` existe.

**La résolution retenue : une taille de police calculée de 16 px sur les champs numériques du Rail**
(iOS ne zoome que sous 16 px), ce qui **retire le déclencheur en laissant le pinch-zoom à
l'utilisateur**. *Rejeté :* `maximum-scale=1` — retire le zoom à qui en a besoin pour lire un graphe,
donc une régression d'accessibilité — et *accepter le coût*. **Le meta viewport n'est pas touché**, et
la porte de zoom **ne bouge pas** : elle répond au pincement, qui est un vrai geste sur toutes les
plateformes.

**Ce qui a changé dans le code, et c'est une ligne.** `src/components/rail/controls.tsx` :
`NumericInput` va de `text-xs` à **`text-base`**, l'échelle de type du dépôt (Tailwind v4, thème en
variables CSS dans `src/styles.css` — aucun style inline, aucune valeur arbitraire, aucun nouveau
token ; `text-base` est d'ailleurs le nom que la docstring de `use-viewport.ts` donnait déjà à ce
candidat). **Un seul point d'édition suffit** : les quinze champs numériques du Rail passent tous par
`NumericRow` → `NumericInput` (`src/components/rail/inputs.tsx`).
`src/components/app/use-viewport.ts` : le paragraphe « le coût accepté » est **requalifié** — le
déclencheur est retiré, ce qui reste du coût est mesuré ci-dessous — sans toucher ni la fonction ni sa
porte.

**Aucun cas `node` neuf, et c'est la règle qui le dit.** Le changement est **un token de type sur un
composant de présentation** : il n'ouvre ni fonction pure, ni constante calculée, donc il n'y a pas de
couture à couvrir. `docs/conventions/testing.md` place les pixels chez `agent-browser` (amendement B),
et une assertion qui lirait la chaîne de classes d'un `.tsx` serait un test de composant déguisé —
interdit par l'amendement A. Les 1322 cas existants sont verts, inchangés.

**Environnement.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64)
AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36` —, `agent-browser
0.34.0`, session `fields16` (fermée à la fin ; **le serveur de dev partagé a été réutilisé, jamais
tué** — `curl -s -o /dev/null -w '%{http_code}'` → **200** avant et après). Chaque viewport posé par
`agent-browser set viewport` puis **relu** depuis `innerWidth`/`innerHeight` avant tout relevé ; toute
géométrie par `getBoundingClientRect()`, après le montage client (attente sur « les quinze
`input[inputmode=decimal]` du Rail sont là **et** il n'y a qu'un seul `aside` », le squelette et l'app
coexistant brièvement). Scénario : le **premier lancement**, `localStorage` vidé — un relevé pris
après une visite `?L=1500…` lisait des sections plus hautes (1088 / 357), la Session persistée et non
la police.

**Deux pièges de méthode, consignés parce qu'ils font lire un `pinned` pour un `whole`.** Le
déclencheur (a) est le défilement du Rail : après un `scrollIntoView` de la pièce 3, **et après un
simple rechargement** (le navigateur restaure le `scrollTop` de l'`aside`), l'état reste `pinned`
alors que rien de géométrique n'a bougé. Les lignes au repos ci-dessous sont prises après
`aside.scrollTop = 0`. Et le déclencheur (b) est le focus : un champ encore focalisé suffit à lire
`pinned` · `roomy`.

### Le rayon d'action, mesuré avant / après

| relevé | 390 × 664 avant | 390 × 664 après | 1440 × 900 avant | 1440 × 900 après |
| --- | --- | --- | --- | --- |
| état · ajustement | `whole` · `roomy` | **`whole` · `roomy`** | `whole` · `roomy` | **`whole` · `roomy`** |
| bloc rendu (pile de bandes) | 539,625 | **539,625** | 856,297 | **856,297** |
| Rail au repos | 124,375 | **124,375** | 900 (colonne pleine) | **900** |
| somme bloc + Rail | 664,000 | **664,000** | — | — |
| colonne graphe | 390 | 390 | 1152 | 1152 |
| § 1 `Paramètres` | 1034,5 | **1034,5** | 1053,5 | **1053,5** |
| § 2 `Valeurs déduites` | 322 | **322** | 322 | **322** |
| § 3 `Résultats` | 333 | **333** | 402,328 | **402,328** |
| § 4 `Provenance` | 222 | **222** | 288 | **288** |
| § 5 `Ce que cet outil ne calcule pas` | 164 | **164** | 230 | **230** |
| somme des cinq sections | 2075,5 | **2075,5** | 2295,828 | **2295,828** |
| `aside.scrollHeight` | 2120 | **2120** | 2340 | **2340** |
| police des champs numériques | 12px | **16px** | 12px | **16px** |
| hauteur d'un champ numérique | 28 | **28** | 28 | **28** |
| largeur d'un champ numérique | 80 | **80** | 80 | **80** |

**Aucun nombre de mise en page ne bouge — pas un pixel, pas un demi-pixel.** La raison est
arithmétique et vaut mieux que la coïncidence : `h-7` est une **hauteur de boîte de bordure de
28 px**, donc 26 px de boîte de contenu, et l'interligne de `text-base` fait **24 px** — le texte
grandit *dans* la boîte, la boîte ne suit pas. Le libellé de la ligne reste `text-xs` et c'est lui qui
décide du retour à la ligne, donc la hauteur de rangée est celle d'avant. **Aucun budget n'est cassé,
donc rien n'a été compensé** (consigne 3) :

- **Budget A tient et somme comme § 5 l'imprime** : 539,625 + 124,375 = **664,000**, et le Rail au
  repos fait **124,375**, soit `MIN_RAIL` (120) **franchi de 4,375 px** — identique à l'avant.
- **Budget C est identique chiffre pour chiffre** : bloc **856,297** dans 900, letterbox 43,703.
- **Aucun seuil de la règle (c) ne bouge**, contre-épreuve à quatre hauteurs sur l'arm étroit :
  390 × 660 `whole` (Rail **120,375**, premier `whole`), 390 × 659 `pinned` (en-tête **120**, Rail
  539), 390 × 630 `pinned` (120 / 510), 390 × 419 `compact` (**44** / 375). Ce sont les mêmes lignes
  que la table `fix28b` plus haut.
- **Aucun débordement vertical, et aucun horizontal sur le Rail** : `aside.scrollWidth` =
  `clientWidth` = **390**. **Sur les champs eux-mêmes cette ligne disait trop** — voir la correction
  datée juste dessous : `scrollWidth > clientWidth` était **zéro sur cette URL-là**
  (`?L=1500&h=-120.5&za=45&zb=12`, valeurs affichées « 1500,0 », « −120,5 », « 0,5465 » : 78 px de
  contenu pour 78 px disponibles, **déjà à la limite** — 6 caractères), pas zéro en général. Une URL
  dont la valeur la plus large fait 6 caractères ne peut pas répondre pour 7.

#### Correction — le balayage de largeur était trop court, 2026-08-14

**À 16 px un champ de 80 px avec `px-2` coupait les valeurs à 7 caractères, et la ligne ci-dessus a
rapporté le contraire.** Le mono avance **9,6 px** par glyphe à 16 px contre 7,2 à 12 px : la capacité
est tombée de ~8 caractères à ~6 (62 px de boîte de contenu). Mesuré à 1440 × 900,
`HeadlessChrome/151.0.0.0`, session `fixdec-7cbe9071d13d` :

| champ · URL | valeur | `scrollWidth` / `clientWidth` à 16 px `px-2` | forcé à 12 px dans la même image |
| --- | --- | --- | --- |
| `#rail-L0` · `?L=1500&h=-120.5&za=45&zb=12&lo=1512.75` | « 1512,75 » | **83 / 78 — coupé** (capture : « 1512,7▍ », la 2ᵉ décimale tranchée) | 78 / 78 — tient |
| `#rail-H_target` · `?…&te=12345` | « 12345,0 » | **83 / 78 — coupé** | 78 / 78 — tient |

Le chiffre coupé est celui que § 3 *Display precision per quantity* existe pour protéger — `L₀` porte
**2 décimales** parce que « 1 déc. = 0,21 m de flèche, **0,20 m de garde, 8 % de la marge** » — contre
une promesse du même § 3 : « the field shows exactly what state holds … nothing is rounded behind the
user's back ». Toute portée ≥ 1000 m sous le pilote `L₀` produit un `L₀` à 7 caractères, et le jeu publié
de § 5 en contient trois (1000 m deux fois, 1500 m une fois) ; toute prétension ≥ 10 000 daN fait de même
pour `H_target`.

**Corrigé par le *gouttière*, pas par la boîte** : `px-2` → **`px-1`** dans `NumericInput`
(`src/components/rail/controls.tsx`). 4 px de chaque côté donnent **70 px** de boîte de contenu, la boîte
de bordure reste **80 × 28**, donc la colonne de libellé ne bouge pas et **toute la table « avant /
après » ci-dessus se reproduit chiffre pour chiffre** — re-mesurée sur une Session vierge
(`localStorage.clear()`) après le changement :

| relevé | 390 × 664 | 1440 × 900 |
| --- | --- | --- |
| état · ajustement | `whole` · `roomy` | `whole` · `roomy` |
| bloc | **539,625** | **856,296875** |
| Rail au repos · somme | **124,375** · **664,000** | **900** |
| colonne graphe | **390** | **1152** |
| § 1 / § 2 / § 3 / § 4 / § 5 | **1034,5 / 322 / 333 / 222 / 164** | **1053,5 / 322 / 402,328 / 288 / 230** |
| somme des cinq · `aside.scrollHeight` | **2075,5** · **2120** | **2295,828** · **2340** |
| champ numérique : police · boîte · gouttière | **16px** · **80 × 28** · 4 px | **16px** · **80 × 28** · 4 px |
| `scrollWidth > clientWidth` | **zéro sur 15** | **zéro sur 15** |

Balayage refait **sur des valeurs à 7 caractères**, quatre URL, zéro champ coupé (78 / 78 partout) :
`?L=1500&h=-120.5&za=45&zb=12&lo=1512.75` (« 1512,75 »), `?L=1000&…&lo=1008.25` (« 1008,25 »),
`?L=1500&…&te=12345` (« 12345,0 »), `?L=1500&h=-1200.5&za=45&zb=12` (« -1200,5 »).

**Résidu, consigné et non corrigé** : **8 caractères coupent encore** — « 12345,67 » tapé dans `#rail-L0`
lit **85 / 78**.

> **Correction datée du 2026-08-15 — la seconde moitié de cette phrase était fausse.** Elle disait qu'il
> fallait « sortir des plages § 3 pour en atteindre un (un lien édité à la main, que le champ signale alors
> aussi ⛔) ». La règle tier-one de `L₀` est `{ kind: "positive" }`, **sans borne haute**
> (`src/lib/rail/fields.ts`) : « 12345,67 » se saisit normalement, **s'engage** dans l'état et dans le lien
> (`&lo=12345.67`), et se fait couper **en silence** — aucun `aria-invalid`, aucun ⛔. Ce qui l'écarte en
> pratique, c'est la portée physique (un `L₀` à 8 caractères demande une portée proche de 10 km), pas une
> borne § 3. La phrase est en revanche **vraie de `H_target`**, dont la plage dure déclenche bien le ⛔
> (« 123456,0 », 85 / 78, ⛔ affiché) — c'est de là qu'elle vient. Relevé par la passe `closeverify`
> (:1933) ; personne ne l'avait reprise. Le reste du paragraphe tient.

Élargir la boîte réglerait les 8 caractères, au prix de 16 px pris à la
colonne de libellé — donc des retours à la ligne, donc des hauteurs de rangée, donc les budgets A et C
que cette table verrouille. **Une rangée, pas deux.**

### Ce qui reste du coût, mesuré à 390 × 844

Le déclencheur est retiré **là où la décision le nomme**, et le reste est consigné plutôt que corrigé :

- **Les quinze champs numériques du Rail lisent 16 px.** Les champs du Rail encore sous 16 px sont
  **10 sur 26** — **six `select`** (`rail-regime`, `rail-r0`, `rail-cst`, `rail-ta`, `rail-tb` et le
  sélecteur de classe de matériau) et **quatre `radio`** (`usage` ×2, `family` ×2), tous à 12 px. Le
  `input[type=file]` était déjà à 16 px. Le compte « 26 champs sous 16 px sur 27 » consigné plus haut
  dans ce ticket descend donc à **10 sur 26**.

  **Correction du 2026-08-14 : cette liste était accompagnée d'une exemption affirmée comme un fait, et
  elle ne l'est pas.** Le ticket disait « ce sont précisément les contrôles pour lesquels WebKit **ne**
  zoome pas : un `select` ouvre un sélecteur natif ». Le `radio` est le plus solide des deux — ce n'est
  pas une saisie de texte — mais **la mitigation contre laquelle ce comportement WebKit est
  universellement documentée porte sur `input, select, textarea`**, donc un `select` à 12 px peut zoomer
  au focus. **Nommé, pas mesuré**, exactement au même titre que la règle WebKit elle-même : aucun
  appareil iOS ici. Si un `select` zoome, le déclencheur est **réduit, pas supprimé** — et le premier
  contrôle vers lequel la bannière § 7 pousse un utilisateur au premier lancement (« Choisissez un régime
  de sécurité pour obtenir un verdict ») est `rail-regime`, un `select` à 12 px. **Étendre les 16 px à
  `Picker`/`Choice` n'est pas fait ici** : la décision 5 nomme les *champs numériques* du Rail, la boîte
  d'un `select` est `max-w-40`/`max-w-44` et non `w-20` — elle bougerait donc des largeurs du Rail — et
  l'élire serait une politique que personne n'a tranchée. `use-viewport.ts` porte la même correction.
- **Un champ texte reste sous 16 px, et il est hors Rail** : le « x » de la View Strip, **11 px**
  (`src/components/chart/view-strip.tsx`, `type="text" inputMode="decimal"`, valeur relevée
  « 75,0 »). **La décision 5 porte sur les champs du Rail** : une frappe directement dans celui-là
  peut donc encore mettre `scale ≠ 1` et rouvrir le coût pour la session. **Consigné, pas corrigé** —
  l'étendre serait une politique que personne n'a décidée.
- **Le comportement WebKit lui-même reste nommé, pas mesuré** : aucun appareil iOS sur cet hôte, comme
  `use-viewport.ts` le disait déjà, et cet hôte ne fournit ni `maxTouchPoints` ni `(pointer: coarse)`
  sans émulation CDP. Ce qui est mesuré ici, c'est la **taille de police calculée** — la condition
  exacte que la règle WebKit lit — et le fait qu'aucun budget ne la paie.

### Portes exécutées, sortie réelle

```
$ bunx oxfmt --write src/components/rail/controls.tsx src/components/app/use-viewport.ts
Finished in 127ms on 2 files using 32 threads.

$ bun run typecheck            # tsc --noEmit
exit=0                         (aucune sortie)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (aucune sortie)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1322 passed (1322)
   Duration  1.19s
```

**Aucune ligne `Status:` n'a été modifiée** — le ticket reste `claimed`. Cette note ferme la troisième
des réponses § 5 qui lui étaient dues (celle qui était renvoyée à
[ticket 35](./35-narrow-keyboard-browser-pass.md) à côté de la question d'ordonnancement clavier) ;
les deux autres — le plafond de l'aspect et le contrôle « peek » — sont les décisions 3 et 4, hors du
périmètre de cette note. **Le miroir dans ticket 35 manquait et il est posé — 2026-08-14** : « Mise à
jour — décision 5 du propriétaire », qui marque (α) comme choisie et livrée et les chiffres 12 px /
26-sur-27 comme antérieurs au changement.

## Reprise sur constats de revue des décisions 3, 4 et 5 — 2026-08-14, agent de correction

Six constats reçus, **six réels**, aucun écarté. Trois portent du code, trois de la trace. Tout tient
dans les décisions 3, 4 et 5 : aucune sixième décision n'a été prise, et la seule qui se présentait est
**nommée et laissée** (étendre les 16 px aux `select` — voir le point 4 ci-dessous).

1. **Le drapeau `peeking` se ré-armait après un passage par la bande « off »** — `chart-block.tsx`.
   `const held = peeking && ve.peek !== "off"` ne faisait que *masquer* un drapeau resté debout : la
   bascule clavier (§ 5, dans **les deux** modes de pointeur) et la bascule au pointeur grossier
   survivaient à l'excursion et **rendaient le dessin sous-échelle** de l'autre côté, sans que personne
   n'appuie. Mesuré à 2560 × 1440 sur `?L=200&h=-40&za=12&zb=12&fl=6`, session `fixdec-7cbe9071d13d` :
   `Space`, `set viewport 2000 1440` (désactivé, `aria-pressed="false"`), retour à 2560 → badge
   « ×0,7 — sous la vraie échelle · câble entier », `aria-pressed="true"`, `activeElement !== button`.
   **Corrigé** : le drapeau est remis à `false` **pendant le rendu** quand le mode passe à `"off"` — le
   chemin React « ajuster l'état sur de nouvelles props », sans effet et sans commit supplémentaire. La
   bascule § 5 (`Space`, `Space`) et la tenue au pointeur fin (`mouse down` / `mouse up`) restent
   intactes, vérifiées les deux. Table de trajets dans
   [AMENDMENTS.md § F, coût 2](../AMENDMENTS.md).
2. **`px-2` → `px-1` sur `NumericInput`**, parce qu'à 16 px un `L₀` à 2 décimales était **coupé** :
   voir « Correction — le balayage de largeur était trop court » plus haut, avec la table de re-mesure
   (budgets A et C reproduits chiffre pour chiffre sur Session vierge) et le résidu à 8 caractères.
3. **« a transient, never persisted, never the resting scale » était faux d'un tiers** — le contrôle est
   une **bascule** au clavier dans les deux modes et sous `(pointer: coarse)`, donc le dessin `"fit"`
   **reste** jusqu'à l'appui suivant. Reformulé là où la phrase vivait : `AMENDMENTS.md` § F coût 2,
   `src/lib/layout/contract.ts` (`exaggeration`, `peekBadgeLabel`) et
   `src/components/chart/chart-block.tsx`. Ce qui est **inconditionnel** : jamais persisté — aucune clé
   Session, aucune clé URL, un rechargement revient toujours à `max(autofit, 1)` — et **toujours annoncé
   par le badge**.
4. **L'exemption « WebKit ne zoome pas les `select` » est affirmée, pas mesurée**, et le compte était
   faux : ce sont **six `select` + quatre `radio`**, pas « neuf `select` et un groupe `radio` ».
   Rétrogradée au même statut que le reste des affirmations WebKit dans `use-viewport.ts` et ici.
   **Étendre les 16 px à `Picker`/`Choice` serait une sixième décision : nommée, non prise.**
5. **Le miroir de la décision 5 dans ticket 35 est posé** (ci-dessus).
6. **Le coût 3 de l'amendement F porte enfin la décision 3** : « SETTLED BY THE USER, 2026-08-14 —
   NO CODE CHANGE », budget C intacte, les deux options rejetées nommées comme rejetées et non comme
   inexplorées.

### Fichiers touchés

- `src/components/chart/chart-block.tsx` — la remise à zéro du drapeau pendant le rendu, plus les
  commentaires. **Seul changement de comportement de cette reprise côté graphe.**
- `src/components/rail/controls.tsx` — `px-2` → `px-1` sur `NumericInput`, plus la docstring.
- `src/lib/layout/contract.ts` et `src/components/app/use-viewport.ts` — **commentaires seuls**.
- `.scratch/zipline-simulator-v1-build/AMENDMENTS.md` (§ F, coûts 2 et 3), tickets **28** (celui-ci),
  **30** (item 2) et **35** (2ᵉ question § 5).
- Rien d'autre : `src/lib/layout/collapse.ts`, `src/components/chart/view-strip.tsx`, `src/styles.css`
  et les tests sont **inchangés** ; `src/routes/-prototype-07/**` et
  `src/routes/prototype.profile-view.tsx` **non touchés** ; ticket 36 hors périmètre ; aucun commit.

### Portes exécutées, sortie réelle

```
$ bunx oxfmt --write src/components/chart/chart-block.tsx src/lib/layout/contract.ts \
    src/components/rail/controls.tsx src/components/app/use-viewport.ts
Finished in 134ms on 4 files using 32 threads.

$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (aucune sortie)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (aucune sortie)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.13s
exit=0
```

**Aucun cas Vitest ajouté.** La remise à zéro vit dans le composant, pas dans un helper pur — un suite
`node` n'a ni DOM ni layout (amendement A) — donc la preuve du trajet est **navigateur**, et elle est
dans la table de coût 2 d'`AMENDMENTS.md`. Aucune ligne `Status:` modifiée.

---

## Re-measurement addendum — decision 5's accepted cost, collected — 2026-08-15

**Role: re-measurement agent, not the implementer of decision 5 and not its reviewer.** **Read-only on
`src/**` throughout** — nothing under `src/` was touched, `src/routes/-prototype-07/**` and
`src/routes/prototype.profile-view.tsx` were not opened, ticket 36 is out of scope, and no `Status:`
line moved. Every table above is **left as written** and superseded by pointer here: dated evidence is
amendment B's own rule, and the old numbers were true of the tree they were taken on.

**Why.** Decision 5's *accepted cost* is stated in this file as real work owed: « larger field text
**moves rail heights that tickets 27, 28 and 29 measured** ». The note that landed the decision
re-measured **two** viewports — 390 × 664 and 1440 × 900 — and did so as the implementer. This leg
re-takes the whole exposed surface, independently, at every viewport each figure was originally taken
at.

### The list, stated before anything was measured

Everything in tickets 27, 28 and 29 that could move because the Rail's fields grew:

1. **The five Rail section heights** and their sum, plus `aside.scrollHeight` — the direct consumer.
2. **The Rail's resting height** at 390 × 664 (124,375) and 390 × 844.
3. **Budget A's band sum** (539,625 + 124,375 = 664,000) and its **120 px resting-Rail floor**.
4. **Budgets B and C** — 561,4375 / 462,5625 in 1024, and 856,297 / 43,703 in 900.
5. **The pinned and compact row heights** — 120, 164, 44 — at every viewport this ticket names.
6. **`--pinned-clearance` against the *rendered* header**, in all four collapse states.
7. **The focus-centring numbers** — `scrollTop`, the field's landing `y`, the Rail's box and centre —
   at 390 × 844 with and without a simulated keyboard. **The one item on this list that reads the
   Rail's own scroll content**, so the one most exposed.
8. **The View Strip's label widths against the 342 px inner width** (ticket 29's item 5) and the
   strip's 44 px row.
9. **Condition (c)'s thresholds on the narrow arm** — 390 × {660, 659, 630, 419}.
10. **The Rail's keyboard-safe bottom space** (`padding-bottom` / `scroll-padding-bottom` under `--kb`).
11. **Decision 5's own residuals**: computed font sizes, the field's border box, its gutter, the
    seven-character sweep and the eight-character clip.

Stated first so the coverage is auditable. Every one of them is answered below.

### Environment

`HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)
HeadlessChrome/151.0.0.0 Safari/537.36`, `devicePixelRatio 1`. `agent-browser 0.34.0`, session
**`remeas5`**, closed at the end with `--session` only — **the shared dev server was reused, never
killed, never `close --all`**; `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → **200**
before and after. Every viewport was set with `agent-browser set viewport` and then **read back from
`innerWidth`/`innerHeight`** before any number was recorded; all geometry is `getBoundingClientRect()`
/ `getComputedStyle()`, read through `eval --stdin`. Link: ticket 29's `FULL` (first-run scenario,
**200**), with `localStorage.clear()` first — a Session persisted from a `?L=1500…` visit reads taller
sections, and that is the Session, not the font. `B1` (`L=-5`) and `?…&daf=-1` where a culprit was
needed, both **200**.

**Two method traps, re-stated because they still bite.** Trigger (a) is the Rail's scroll and trigger
(b) is focus: a reload restores `aside.scrollTop`, and a still-focused field is enough to read `pinned`
on a layout where nothing geometric moved. Every resting row below was taken after
`aside.scrollTop = 0` **and** `document.activeElement.blur()`.

### The counterfactual — decision 5's contribution, isolated in one frame

Decision 5 is exactly two computed properties on `input[inputmode="decimal"]` inside the Rail. Both were
**reverted in the page** by a throwaway stylesheet (`font-size: 12px; line-height: 16px; padding: 0 8px`
— `text-xs`'s own metrics and `px-2`'s own gutter), measured, then removed and measured again, all in
one `eval`:

| relevé | 16 px · `px-1` (livré) | 12 px · `px-2` (contre-factuel) | après retrait |
| --- | --- | --- | --- |
| **390 × 664** cinq sections | 1034,5 / 322 / 333 / 222 / 164 | **identiques** | identiques |
| somme · `aside.scrollHeight` | **2075,5 · 2120** | **2075,5 · 2120** | 2075,5 · 2120 |
| bloc · rail au repos | **539,625 · 124,375** | **539,625 · 124,375** | idem |
| décalage `#rail-L` / `#rail-mp` | **235 / 926,5** | **235 / 926,5** | idem |
| **768 × 1024** somme · bloc | **2295,828 · 561,4375** | **2295,828 · 561,4375** | idem |
| **1440 × 900** cinq sections | 1053,5 / 322 / 402,328 / 288 / 230 | **identiques** | identiques |
| somme · `scrollHeight` · bloc | **2295,828 · 2340 · 856,297** | **2295,828 · 2340 · 856,297** | idem |
| boîte du champ · champs coupés | 80,00 × 28,00 · **0** | 80,00 × 28,00 · **0** | idem |

**Not one layout number moves**, and the arithmetic says why rather than leaving it to coincidence:
`h-7` is a **28 px border box**, i.e. 26 px of content box, and `text-base`'s line height is **24 px** —
the text grows *inside* the box. The row's label stays `text-xs`, and it is the label that decides
wrapping, so the row height is the one it always was. **So decision 5's accepted cost, re-priced against
the tree: zero pixels of layout.** What it did move is the two things it was chosen for — the computed
font size, and (through the width correction) the gutter.

### 1–2 · The Rail's sections, its scroll extent and its resting height

| relevé | 390 × 664 | 390 × 844 | 768 × 1024 | 1440 × 900 |
| --- | --- | --- | --- | --- |
| § 1 `Paramètres` | **1034,5** | **1034,5** | **1053,5** | **1053,5** |
| § 2 `Valeurs déduites` | **322** | **322** | **322** | **322** |
| § 3 `Résultats` | **333** | **333** | **402,328** | **402,328** |
| § 4 `Provenance` | **222** | **222** | **288** | **288** |
| § 5 `Ce que cet outil ne calcule pas` | **164** | **164** | **230** | **230** |
| somme des cinq | **2075,5** | **2075,5** | **2295,828** | **2295,828** |
| `aside.scrollHeight` | **2120** | **2120** | **2340** | **2340** |
| `aside.scrollWidth` / `clientWidth` | **390 / 390** | **390 / 390** | **287 / 287** | **287 / 287** |
| rail au repos (hauteur de boîte) | **124,375** | **304,375** | 1024 (colonne pleine) | 900 (colonne pleine) |

**The 390 × 664 and 1440 × 900 columns reproduce decision 5's own note digit for digit.** The 390 × 844
and 768 × 1024 columns are **new coverage** — that note never took them — and they land on the same two
section profiles, which is the property the sections have: they are a function of the Rail's *width*,
and the Rail is 390 below B2 and 288 above it. **No horizontal overflow on the Rail at any of the four**,
which is the thing a 33 % wider glyph could have produced.

### 3–4 · The three budgets

| bande | A · 390 × 664 | budget A | B · 768 × 1024 | budget B | C · 1440 × 900 | budget C |
| --- | --- | --- | --- | --- | --- | --- |
| colonne graphique | 390 | 390 | 480 | 480 | 1152 | 1152 |
| `W_inner` | 342 | 342 | 432 | 432 | 1104 | 1104 |
| créneau bandeau | **76** | 76 | **60** | 60 | **44** | 44 |
| profil | **219,625** | 220 | **257,4375** | 257 | **539,6719** | 540 |
| bande de garde | **96** (plancher) | 96 | **96** (plancher) | 96 | **176,625** | 177 |
| View Strip | **44** | 44 | **44** | 44 | **44** | 44 |
| cellules | **104** (2 rangées) | 104 | **104** | 104 | **52** (1 rangée) | 52 |
| **bloc** | **539,625** | 540 | **561,4375** | 561 | **856,2969** | 857 |
| reste | rail **124,375** | 124 | boîtage **462,5625** | 463 | boîtage **43,7031** | 43 |
| **total** | **664,000** | 664 | **1024,000** | 1024 | **900,000** | 900 |

`whole` · `roomy` · `--pinned-clearance: 0px` · `--kb: 0px` at all three. **Budget A's resting Rail is
124,375, clearing `MIN_RAIL = 120` by 4,375 px** — § 5's own 4 px, and the arithmetic the no-app-bar
decision in `__root.tsx` rests on. **Budget C is identical digit for digit** to what amendment F's cost 3
calls untouchable. **Budget B is new coverage for decision 5** — the note that landed it never measured
768 × 1024.

### 5–6 · Condition (c)'s thresholds, the pinned and compact rows, and the clearance

| viewport | état · ajustement | pile (en-tête rendu) | rail | `--pinned-clearance` | débordement colonne |
| --- | --- | --- | --- | --- | --- |
| 390 × 660 | `whole` · `roomy` | **539,625** | **120,375** (premier `whole`) | `0px` | 0 |
| 390 × 659 | `pinned` · `tight` | **120** | 539 | **`120px`** | 0 |
| 390 × 630 | `pinned` · `tight` | **120** | 510 | **`120px`** | 0 |
| 390 × 419 | `compact` · `tight` | **44** | 375 | **`44px`** | 0 |
| 390 × 400 | `compact` · `tight` | **44** | 356 | `44px` | 0 |
| 320 × 400 | `compact` · `tight` | **44** | 356 | `44px` | 0 |
| 844 × 390 paysage | `compact` · `tight` | **44** | 390, à côté | `44px` | 0 |
| 1024 × 400 | `compact` · `tight` | **44** | 400, à côté | `44px` | 0 |
| 926 × 428 paysage | `pinned` · `tight` | **88** | 428, à côté | `120px` | 0 |
| 390 × 664, `focus #rail-h` | `pinned` · `roomy` | **120** | 544 @ y 120 | **`120px`** | 0 |
| 390 × 664, `focus #rail-xD` | `pinned-x` · `roomy` | **164** | 500 @ y 164 | **`164px`** | 0 |
| 390 × 400, `focus #rail-xD` | **`pinned-x`** · `tight` | **164** *(consigné 132)* | 236 @ y 164 | `164px` | 0 |
| 1440 × 700 | `pinned` · `tight` | **88** | 700 | `120px` | 0 |

**Every threshold on the narrow arm is where `fix28b` left it** — 660 / 659 / 630 / 419, with the rail at
120,375 on the last fitting height. **`--pinned-clearance` equals the rendered header exactly** at 390 px
in all three collapse states (120/120, 164/164, 44/44); above a 600 px column the safe-direction default
still reserves 120 for an 88 px header, which ticket 29 already judged correct by design. The
`pinned + x` row at 390 × 400 is the one figure in this file's *Item 2* that moved: **164, not 132** —
ticket 29's défaut-1 correctif (the créneau went 44 → 76 at a 390 px column), **not** decision 5.

**The compact row, measured at the flex level rather than by summing children** — in `compact` the stack
is `flex-direction: row`, so a naïve sum double-counts:

| viewport | direction de la pile | créneau bandeau | cellule vive | hauteur de la pile |
| --- | --- | --- | --- | --- |
| 390 × 419 · 390 × 400 | `row` | **245,2 × 44** | **144,8 × 44** | **44** |
| 320 × 400 | `row` | **175,2 × 44** | **144,8 × 44** | **44** |
| 844 × 390 | `row` | **411,2 × 44** | **144,8 × 44** | **44** |
| 1024 × 400 | `row` | **591,2 × 44** | **144,8 × 44** | **44** |

Identical to this ticket's own *Item 2*, including its 320 × 400 row (175,2 / 144,8).

### 7 · The focus centring — **superseded**, and the movement is not decision 5's

`#rail-mp` focused **from `whole`** at 390 × 844, so `flushSync` ordering applies:

| | consigné (item 3, 2026-08-14) | re-mesuré 2026-08-15 |
| --- | --- | --- |
| `aside.scrollTop` | 503 | **519** |
| haut du champ | 512 | **527,5** (bas 555,5) |
| boîte du Rail | y 88, h 756 | **y 120, h 724** |
| centre du Rail | 466 | **482** |
| `scroll-margin-top` | `120px` | **`120px`** |
| décalage centre-champ / centre-rail | 60 (moitié de la réserve) | **59,5** |

**The Rail's scroll content did not move: `#rail-mp` sits at offset 926,5 in it, on both the shipped and
the 12 px counterfactual tree — and 926,5 reconstructs *both* rows exactly** (`926,5 + 14 − 756/2 − 60 =
502,5 → 503`; `926,5 + 14 − 724/2 − 60 = 518,5 → 519`). So the delta is the **Rail's viewport height**,
which shrank by the 32 px ticket 29's défaut-1 correctif added to the pinned header. `#rail-DAF` (offset
998,5) and `#rail-L` (235) reconstruct the same way. **The `flushSync` ordering the item asserts still
holds** — the scroll is computed against the *post*-collapse 724 px Rail, not the pre-collapse 304,375 —
and `scroll-behavior` is `auto` on both the Rail and `documentElement`.

Under the **simulated** 336 px keyboard at 390 × 844 (method labelled below), same focus:

| | consigné | re-mesuré |
| --- | --- | --- |
| état | `compact` | **`compact`** · `tight` |
| champ | y **452–480** | y **283,5–311,5** |
| bas visible simulé | 508 | **508** |
| `scroll-margin-top` | `44px` | **`44px`** |
| `aside` `padding-bottom` / `scroll-padding-bottom` | 336px / — | **336px / 336px** |

**The item's claim holds and holds by more** — the field lands 196,5 px above the simulated keyboard
rather than 28. The shift is the `scroll-padding-bottom` that now matches the inset: the centring is
computed against the *visible* 44 → 508 band, not the whole 800 px Rail. Again not decision 5: the
counterfactual leaves it where it is.

### 8 · The View Strip against 342 px of inner width — unmoved, and it could not have moved

The strip lives in the **chart column**, not the Rail, so decision 5 has no reach into it. Re-measured
anyway, because ticket 29's item 5 is on the list:

| | à vide / ligne à vide | corde / corde A–B | ×1 / ×1 vraie échelle | `x … m · 50 %` | Σ | + 3 × 12 | **requis** | dispo | rangée | `scrollW − clientW` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abrégé, col **390** (`W_inner` **342**) | **49,27** | **48,00** | **29,77** | **125,30** | **252,33** | 36 | **288,33** | **342** | **44 px** | **0** |
| abrégé, col 480 | 49,27 | 48,00 | 29,77 | 125,30 | 252,33 | 36 | **288,33** | 432 | 44 px | 0 |
| complet, col 1152 | **77,36** | **71,38** | **98,88** | **125,30** | **372,91** | 36 | **408,91** | 1104 | 44 px | 0 |

**Byte-identical to ticket 29's evidence pass and its independent re-verification, to the hundredth.**
The abbreviated row fits 342 px with **53,67 px to spare**; the four control shells are still **32 px**
inside the 44 px row, which is this ticket's *finding 5* and ticket 35's, unchanged.

### 10–11 · Keyboard-safe space, and decision 5's own residuals

- **`aside` `padding-bottom`**: **`0px`** with no inset, **`336px`** under the simulated one, with
  `scroll-padding-bottom` at the same **336px** and `--kb: 336px`. Same element, nothing above it moving.
  **Method, labelled: no soft keyboard exists on this host.** Simulated by an own-property getter on the
  `visualViewport` instance returning `innerHeight − 336`, then the `resize` event a real keyboard fires,
  dispatched on `visualViewport` — the seam `use-viewport.ts` listens to. Not a keyboard, not a viewport
  resize, not a CDP metric. `visualViewport.scale` read **1** throughout, so the zoom gate is open.
- **The fifteen Rail numeric fields read `16px`**, border box **80,00 × 28,00**, gutter **4px / 4px**, at
  all four viewports. Fields still under 16 px inside the Rail: **10 of 26** — six `select`
  (`rail-regime`, `rail-r0`, `rail-cst`, `rail-ta`, `rail-tb`, the material-class picker) and four
  `radio`, all 12 px. Unchanged from the count this ticket already corrected, and the `select` exemption
  is still **named, not measured**.
- **Seven characters fit, at four URLs, zero fields clipped** — `scrollWidth / clientWidth` **78 / 78** on
  every numeric field: `?L=1500&h=-120.5&za=45&zb=12&lo=1512.75` (« 1512,75 »), `?L=1000&…&lo=1008.25`
  (« 1008,25 »), `?L=1500&…&te=12345` (« 12345,0 »), `?L=1500&h=-1200.5&za=45&zb=12` (« -1200,5 »). All
  **200**.
- **The eight-character residual reproduces**: « 12345,67 » typed into `#rail-L0` reads **85 / 78 —
  coupé**, and reaching one takes a value outside § 3's ranges. Recorded, still not fixed, exactly as the
  correction above left it.
- **The View Strip's `x` input is still `11px`** and it is **outside** the Rail — the only text input in
  the app under 16 px. Decision 5 names the Rail's numeric fields; this one is consigned, not corrected,
  and extending to it would be a policy nobody has taken.

### What no longer holds

**Nothing.** All nine acceptance items stand where the amendment-F note left them, on the measurements
above, and **no box is unticked by this leg**. Two number-sets in this file are **superseded rather than
falsified** — the focus-centring row of *Item 3* and the `pinned + x` block height of *Item 2* — and both
moved under ticket 29's défaut-1 correctif and the `scroll-padding-bottom`, which the counterfactual
separates from decision 5 in the same frame. This file's own *Addendum — finding 3 is closed* already
warned that every rendered height taken at a column narrower than 600 px is pre-correctif; this leg is
the substituted reading it asked for.

**`Status:` unchanged — `claimed`.** No acceptance item changed state, and re-measurement is not
adjudication: this ticket's review and verification belong to others.

### Not observable on this host — stated, not inferred

- **A real soft keyboard.** None; `--kb` reads `0px` at rest everywhere above, and the inset row is the
  labelled simulation.
- **Coarse pointer / real touch.** `navigator.maxTouchPoints` **0**, `matchMedia('(pointer: coarse)')`
  **false** without CDP touch emulation, which this leg did not enable. Every 44 px above is a CSS/layout
  fact under a **fine** pointer.
- **iOS's `interactive-widget` policy**, and **WebKit's own sub-16 px zoom rule** — the behaviour decision
  5 exists to defuse. Present in the markup, honoured by Safari alone; no iOS device here. What is
  measured is the **computed font size**, which is the exact condition that rule reads.
- **Wheel-driven Rail scroll.** Headless Chrome will not scroll the sub-scroller from a synthesised wheel
  event; `aside.scrollTop` was assigned directly, which fires the same `scroll` event the app observes.

### Gates, as this leg leaves them

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg touched no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.

---

## Independent verification — finding 2 (the clipped `L₀`) and finding 4 (the WebKit `select` carve-out) — 2026-08-15, session `closeverify`

**Role: verifier, read-only on `src/**` throughout**, and not the agent who wrote either fix. Nothing
under `src/` was written; `src/routes/-prototype-07/**` and `src/routes/prototype.profile-view.tsx`
were not touched; ticket 36 is out of scope; no `Status:` line moved; no commit.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`, `devicePixelRatio 1`, `agent-browser
0.34.0`, session **`closeverify`**, the **shared dev server reused and left running** — `curl` → **200**
before and after. Viewports set with `agent-browser set viewport` then **read back** from
`innerWidth`/`innerHeight`; all geometry from `getBoundingClientRect()` / `getComputedStyle()` and the
elements' own `scrollWidth` / `clientWidth`.

### Finding 2 — `#rail-L0` fits, and the counterfactual reproduces the defect it replaced

`?L=1500&h=-120.5&za=45&zb=12&lo=1512.75` at **1440 × 900** (read back), value « **1512,75** »:

| état du champ, dans une seule image | `scrollWidth` / `clientWidth` |
| --- | --- |
| **livré** — 16 px, `px-1`, boîte 80 × 28 | **78 / 78 — tient** |
| forcé à `padding: 0 8px` (le `px-2` d'avant) | **83 / 78 — coupé** |
| retiré, retour au livré | **78 / 78** |
| forcé à 12 px + `px-2` (l'arbre pré-décision 5) | 78 / 78 |

So the finding's own measurement (83 / 78) is reproducible on this tree, and the shipped gutter
(4 px each side, 70 px of content) is what removes it. `font-size` **16px**, `line-height` **24px**,
border box **80 × 28** — the box did not grow, which is why no budget below could move.

**The seven-character sweep, re-driven on all four URLs the fix recorded** — zero clipped fields of
fifteen on each, at 1440 × 900:

| lien | valeur la plus large | champs coupés / total |
| --- | --- | --- |
| `?L=1500&h=-120.5&za=45&zb=12&lo=1512.75` | « 1512,75 » | **0 / 15** |
| `?L=1000&h=-120.5&za=45&zb=12&lo=1008.25` | « 1008,25 » | **0 / 15** |
| `?L=1500&h=-120.5&za=45&zb=12&te=12345` | « 12345,0 » | **0 / 15** |
| `?L=1500&h=-1200.5&za=45&zb=12` | « -1200,5 » | **0 / 15** |

### The budgets the fix could have moved — re-measured, and not one of them did

Session cleared (`localStorage.clear()`) and ticket 29's `FULL` link opened; each resting row taken
after `aside.scrollTop = 0` **and** `document.activeElement.blur()`, with ticket 29's own `measure.js`.

| relevé | mesuré ici | consigné dans 28/29 | écart |
| --- | --- | --- | --- |
| **390 × 664** bandes | **[76 · 219,625 · 96 · 44 · 104]** | 76 · 219,625 · 96 · 44 · 104 | **0** |
| bloc | **539,625** | 539,625 | **0** |
| Rail au repos | **124,375** (plancher `MIN_RAIL` 120 franchi de **4,375**) | 124,375 | **0** |
| somme bloc + Rail | **664,000** | 664,000 | **0** |
| cinq sections | **1034,5 / 322 / 333 / 222 / 164** | idem | **0** |
| somme des cinq · `aside.scrollHeight` | **2075,5 · 2120** | 2075,5 · 2120 | **0** |
| `aside.scrollWidth` / `clientWidth` | **390 / 390** | 390 / 390 | **0** |
| `collapse` · `fit` · `--pinned-clearance` | `whole` · `roomy` · `0px` | idem | **0** |
| **1440 × 900** bloc | **856,296875** | 856,297 | **0** |
| letterbox | **43,703125** | 43,703 | **0** |
| bandes | **[44 · 539,671875 · 176,625 · 44 · 52]** | 44 · 539,6719 · 176,625 · 44 · 52 | **0** |
| cinq sections | **1053,5 / 322 / 402,328125 / 288 / 230** | idem | **0** |
| somme des cinq · `scrollHeight` | **2295,828125 · 2340** | 2295,828 · 2340 | **0** |
| `aside.scrollWidth` / `clientWidth` | **287 / 287** | 287 / 287 | **0** |
| champs numériques coupés | **0 / 15** aux deux | 0 / 15 | **0** |

**No movement, at either viewport, on any figure the fix could have touched** — including the ones the
fix agent reported itself. Budget C is digit-for-digit what amendment F's cost 3 calls untouchable.

### Finding 4 — the carve-out is downgraded, and the count is the measured one

Counted on the live tree at 1440 × 900 (a computed font size does not read a viewport):

| relevé | mesuré | consigné |
| --- | --- | --- |
| contrôles de formulaire du Rail | **26** | 26 |
| champs numériques à 16 px | **15 / 15** | 15 / 15 |
| contrôles sous 16 px | **10** | 10 |
| dont `select` à 12 px | **6** — `rail-regime`, `rail-r0`, `rail-cst`, `rail-ta`, `rail-tb` et le sélecteur de classe (sans `id`) | 6 |
| dont `radio` à 12 px | **4** | 4 |
| champ texte hors Rail | **1** — le « x » de la View Strip, **11 px**, valeur « 75,0 » | 1 · 11 px |

`use-viewport.ts` and this ticket now both say **six `select` + four `radio`**, both say the `select`
behaviour is **named, not measured**, and neither asserts the old « WebKit ne zoome pas les `select` »
exemption as fact. The « neuf `select` et un groupe `radio` » count is gone from the tree
(`rg` finds no remaining occurrence). 16 px was **not** extended to `Picker` / `Choice`.

### One defect found, and it is new — the eight-character residual note overclaims

The residual sentence added by the fix — « **8 caractères coupent encore** — « 12345,67 » tapé dans
`#rail-L0` lit **85 / 78** — et il faut sortir des plages § 3 pour en atteindre un (un lien édité à la
main, **que le champ signale alors aussi ⛔**) », mirrored verbatim in `NumericInput`'s docstring
(`src/components/rail/controls.tsx`) — is **right about the clip and wrong about the two clauses that
make it sound harmless**. Measured at 1440 × 900 on
`?L=1500&h=-120.5&za=45&zb=12&lo=1512.75`, typing « 12345,67 » straight into `#rail-L0` and pressing
`Enter`:

- `scrollWidth` **85** / `clientWidth` **78** — **the clip reproduces exactly**, so that half stands.
- The value **commits**: the URL becomes `…&lo=12345.67`, the field keeps « 12345,67 ».
- **No ⛔ anywhere on the page**, and **no `aria-invalid`** on the field or on any other. `L₀`'s
  tier-one rule is `{ kind: "positive" }` in `src/lib/rail/fields.ts` — **there is no upper bound to
  leave**, so « il faut sortir des plages § 3 » is not what reaching eight characters takes, and « le
  champ signale alors aussi ⛔ » does not happen for the very example the sentence cites.
- The neighbouring case **does** flag: `?…&te=123456` gives `#rail-H_target` « 123456,0 », **85 / 78**
  and a **⛔** on the page. So the sentence is true of `H_target` and false of `L₀`.

**Why it is worth a line rather than a shrug.** The exposure is small — an eight-character `L₀` needs a
span around 10 km, far outside anything this tool is for — but the *reason* the record gives for it
being small is not the true one, and this whole review round exists because a residual was recorded
with a measurement that did not hold. **Recommended correction, no code change**: state that an
eight-character `L₀` is reachable by ordinary typing, commits to state and to the link, is **silently
clipped and not flagged**, and that what keeps it out of practice is the physical range of spans, not a
§ 3 bound. Left for whoever owns the sentence — a verifier may not rewrite `src/**`.

### Gates, real output

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no other output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no other output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg wrote no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.
