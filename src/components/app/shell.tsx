/**
 * The app's layout — « v1 build spec » § 5 (*The layout contract*, *Two breakpoints, stated as
 * what fails*) and § 7 (*The Skeleton*, *`__root.tsx` carries the document and nothing visible*).
 *
 * **One layout, two occupants.** The Skeleton and the live app render the *same* tree: same flex
 * column, same container query, same gutter, same band heights. That is not tidiness — § 7 makes
 * it the reason « the Skeleton is correct at 390 px for free », and a second layout is a second
 * thing to keep in sync at the exact moment nobody is looking (the first frame).
 *
 * Two invariants hold this file together, both § 5's:
 *
 * - **No band height reads the window height.** Every one of them is a function of the chart
 *   column's inner width, expressed here as CSS custom properties over container-query units, so
 *   the server can paint them with nothing measured. A flex ratio was rejected because
 *   `flex-[3]`/`flex-1` makes vertical exaggeration a function of window height.
 * - **No `useMediaQuery` branch anywhere.** It returns `defaultMatches` on the server and on first
 *   mount, so a JS-branched tree paints the desktop layout and re-measures — a visible 900→390
 *   chart jump on every narrow first load. B1 is a container query, B2 a media query, both CSS.
 *
 * The numbers all come from `@/lib/layout/contract.ts`; none of them is typed twice.
 */

import type { CSSProperties, ReactNode } from "react";

import { flushSync } from "react-dom";

import type { CollapseState } from "@/lib/layout/collapse.ts";

import { Button } from "@/components/ui/button.tsx";
import {
  CENTRE_IN_RAIL,
  centresOnFocus,
  keepCaret,
  pinnedHeaderHeight,
  PROFILE_BAND_ID,
  PROFILE_BAND_LABEL,
  railFocus,
  REVEAL_LABEL,
} from "@/lib/layout/collapse.ts";
import {
  BANNER,
  CELL_ROW,
  GUTTER,
  PINNED_CELL,
  PROFILE_ASPECT,
  PROFILE_CHROME,
  PROFILE_PLOT_MAX,
  RAIL_HEADER,
  STRIP,
  VIEW_STRIP,
} from "@/lib/layout/contract.ts";
import { cn } from "@/lib/utils.ts";

/** The Rail Header's static text. `__root.tsx` carries no app bar — this is the app's only name. */
export const APP_NAME = "Scoutech";

/** § 9's five Rail sections, in order. The Skeleton reproduces the headings and nothing under them. */
export const RAIL_SECTIONS = [
  "Paramètres",
  "Valeurs déduites",
  "Résultats",
  "Provenance",
  "Ce que cet outil ne calcule pas",
] as const;

/**
 * § 5's five read-out cells. **All five at every width, no subset and no horizontal scroll** — a
 * subset would delete the printed number that justified drawing a sub-pixel rider envelope at
 * 1500 m in the first place, and horizontal scroll would hide « Garde min » behind a gesture that
 * competes with the scrub.
 *
 * Below B1 they wrap to three columns in § 5's order — `T anc. A · T anc. B · Pente` over
 * `Garde min` (two columns) `· Flèche` — which is why each row carries its own narrow-width
 * placement rather than falling out of source order. **Wrapping a label is benign; clipping a value
 * is not**, and the value is what binds: `font-mono text-lg` needs ≈622 px for five cells.
 *
 * **`624` is `CELL_WRAP_PX`, and it is written out because a Tailwind arbitrary container query
 * cannot read a TypeScript constant.** `@/lib/layout/contract.ts` is the source of truth; every
 * `@max-[624px]` / `@min-[624px]` in this file and in `view-strip.tsx` is that constant spelled by
 * hand, and `contract.test.ts` builds its expected class strings from it so the two cannot drift.
 * It moved 600 → 624 with [amendment
 * L](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md): the app ships **no mono face**,
 * so the five cells are budgeted at the 0,62 em advance a bare `monospace` keyword realistically
 * resolves to — `(9 × 18 × 0,62 + 24) × 5 ≈ 622` — instead of the 0,60 em § 5 assumed, and 600 was
 * already five pixels under its own derivation.
 */
export const READ_OUT_CELLS = [
  {
    /**
     * **« Garde min. ligne » and no longer « Garde min »** — ticket 41,
     * [amendment M](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md), which supersedes the
     * label § 5 fixed in its two budget diagrams, its `pinned` and `compact` rows and its
     * three-column wrap sketch. The cell prints `rider.worst.hClear`, which is §11's minimum **over
     * the whole line** at the current rider position, and the row's own « à la position du passager »
     * was being read as *under* the passenger rather than *for* that position. `ligne` is the scope
     * the strip's caption and the profile's governing dimension line now name too, and it is what
     * separates this cell from the Rail's « Garde min (traversée) » — `ligne` reduces over `x`,
     * `traversée` over `x_P`.
     *
     * The label is also the record key and the React key. **Measured, because this row is the app's
     * tightest budget:** the longest form « Garde min. ligne (à x 74,3 m) » renders on **one 16 px
     * line** in the 44 px `pinned` row at 390 px with the value's box bottom flush to the row's, and
     * the same in `compact` at 390 × 400 — so the rename spends none of § 5's height. Prose elsewhere
     * that discusses « the Garde min cell » as a layout occupant means this one.
     */
    label: "Garde min. ligne",
    narrow: "@max-[624px]:order-4 @max-[624px]:col-span-2",
    /**
     * The Pinned Safety Header's **one live cell**: it *is* the row there, at one touch height
     * rather than {@link CELL_ROW}. It is the garde and not one of the other four because
     * unmissability survives the collapse through the two **non-positional** signals — the banner
     * and this printed number, the two that do not need the plot.
     */
    pinned: "pinned:h-[var(--pinned-cell)] pinned:flex-1",
  },
  { label: "T anc. A", narrow: "@max-[624px]:order-1", pinned: "pinned:hidden" },
  { label: "T anc. B", narrow: "@max-[624px]:order-2", pinned: "pinned:hidden" },
  { label: "Pente", narrow: "@max-[624px]:order-3", pinned: "pinned:hidden" },
  { label: "Flèche", narrow: "@max-[624px]:order-5", pinned: "pinned:hidden" },
] as const;

/** § 7's one `<noscript>` line: under `ssr: false` the app is a Skeleton forever without JS. */
export const NOSCRIPT_LINE = "Ce simulateur nécessite JavaScript pour fonctionner.";

/**
 * The layout contract as CSS custom properties. `100cqi` is the **chart column's** inline size —
 * the column is the query container, so `--w-inner` is exactly § 5's `W_inner = col − 48`, and
 * every band below is a function of it and of nothing else.
 */
const LAYOUT_VARS = {
  "--gutter": `${GUTTER}px`,
  "--w-inner": `calc(100cqi - ${2 * GUTTER}px)`,
  "--profile-badge": `${PROFILE_CHROME.badge}px`,
  "--handle-lane": `${PROFILE_CHROME.handleLane}px`,
  "--x-labels": `${PROFILE_CHROME.xLabels}px`,
  // § 5's aspect rule under **amendment F**'s ceiling, as one `min()` rather than a JS branch: the
  // plot is `0,42 × W_inner` up to § 5's reference chart column (1152 px, `W_inner` 1104) and frozen
  // at the 463,68 px it reaches there past it. Both terms come from `contract.ts`, so the rendered
  // band and `chartBlockHeight()`'s own term are the same arithmetic — and the whole rule stays a
  // function of the container's inline size, so the Skeleton is still correct before any measurement.
  // Without it the plot grew linearly for ever and five ordinary 16:9 desktops opened with no chart.
  "--profile-plot": `min(calc(${PROFILE_ASPECT} * var(--w-inner)), ${PROFILE_PLOT_MAX}px)`,
  // The whole profile band, because § 5's profile is **one SVG** spanning all four of its rows —
  // the Handle Lane is inside it, which is what keeps the handles on the shared x scale. The
  // Skeleton draws the four rows separately; both add up to this, from these same three constants.
  "--profile-band": `calc(var(--profile-badge) + var(--profile-plot) + var(--handle-lane) + var(--x-labels))`,
  "--strip": `clamp(${STRIP.min}px, calc(${STRIP.factor} * var(--w-inner)), ${STRIP.max}px)`,
  "--view-strip": `${VIEW_STRIP}px`,
  "--cell-row": `${CELL_ROW}px`,
  "--pinned-cell": `${PINNED_CELL}px`,
  // § 5's banner row, **all three of it**, because the créneau is a band like every other one: a
  // function of the chart column's width and not of its own text. `--banner` carries the ≥ 624 px
  // row and {@link BannerSlot}'s two container queries re-point it at the other two, on the same
  // two thresholds `bannerBudget()` uses — so the rendered slot *is* the term (c) budgets for, and
  // § 7's « the first real occupant lands with no reflow on hydration » holds at 390 px, where the
  // Skeleton reserves what a three-line summary will need rather than one line of it.
  "--banner": `${BANNER.oneLine}px`,
  "--banner-two-lines": `${BANNER.twoLines}px`,
  "--banner-three-lines": `${BANNER.threeLines}px`,
  "--rail-header": `${RAIL_HEADER}px`,
} as CSSProperties;
// `--kb`, the iOS soft-keyboard inset, is deliberately **not** here: the `visualViewport` fallback
// writes it on `documentElement`, and an inline `--kb: 0px` on this element would shadow it for the
// whole subtree. Consumers read `var(--kb, 0px)`, so the fallback needs no threshold constant —
// the value is simply absent until a keyboard is up.

/**
 * The shell: a fixed-height box with internal scrollers, never a document scroll. **A document
 * scroll was rejected** because the Chart Block's collapse trigger would then have to read
 * `window.scrollY` *and* survive iOS's document-scroll-under-keyboard behaviour, where a fixed
 * shell plus `interactive-widget=resizes-content` gives the same result with one known scroller.
 *
 * B2 lives on the one `md:` here — below 768 px of viewport the row becomes a column and the Rail
 * goes `order-last`, in flow, pushing rather than covering. No bottom sheet: Base UI 1.6.0 ships a
 * Drawer, and it was declined on **occlusion** — a portalled fixed popup covers the bottom of the
 * viewport at every snap point, which is exactly where the read-out cells and the strip's zero
 * crossing live.
 *
 * **`data-collapse` and `data-fit` are the whole of A12's mechanism on this side.** The state is
 * derived in `@/lib/layout/collapse.ts` and applied by the `pinned`, `pinned-without-x` and
 * `compact` custom variants in `src/styles.css` — so the Pinned Safety Header is CSS over the
 * finished tree rather than a second tree, the Skeleton renders the same one, and no `useMediaQuery`
 * branch appears. The two attributes carry the two halves of § 5's argument: **`data-collapse` is
 * *which* state, and the variants apply it below B2 for triggers (a) and (b), because above B2 the
 * Rail is beside the block and a focused field must cost the chart nothing; `data-fit` is *whether
 * the height forced it*, and that arm applies at every width, because a block that does not fit does
 * not fit at any width.** Both sit on the **shell** rather than on the chart column because
 * `--pinned-clearance` has to reach the Rail's controls: § 7's jump primitive reserves the header's
 * height there, and the Rail is the chart column's sibling.
 *
 * **Which of the two absorbs the residual flips at B2, and that is § 5's budget A, not styling.**
 * In a row the Rail is the fixed 288 px (`md:w-72 md:flex-none`) and the chart column takes the
 * rest of the *width* (`md:flex-1`). In a column the Chart Block keeps its **budgeted height**
 * (`flex-none`, so the band stack measures itself) and the **Rail** is the residual scroller
 * (`flex-1 min-h-0 overflow-y-auto`) — budget A reads « bloc 540 · reste : rail en flux 124 », and
 * `MIN_RAIL = 120` is a floor on the Rail, never on the block. The other way round the Rail's ~60
 * form rows would eat the column and clip the View Strip and the read-out cells out of the
 * viewport, inside an `overflow-hidden` shell with nothing to scroll to reach them — and § 5 keeps
 * « Garde min » and all five cells legible at every width. When the block genuinely does not fit
 * (`blockHeight > availableHeight − MIN_RAIL`, and `MIN_RAIL` only where the Rail is *under* it) it
 * is the **collapse** that answers, not a squeeze — condition (c), `fitsWholeBlock` in
 * `@/lib/layout/collapse.ts`, arriving here as `tight`.
 */
export function Shell({
  busy = false,
  collapse = "whole",
  onRailFocus,
  onRailScroll,
  rail,
  chart,
  chartRef,
  strip,
  tight = false,
}: {
  /** The Skeleton sets it. No `aria-live` region and no spinner — see {@link Skeleton}. */
  busy?: boolean;
  /**
   * § 5's collapse state, from `@/lib/layout/collapse.ts`. **The Skeleton passes nothing** and gets
   * `whole`: the Rail is at top, nothing is focused, and the first frame has no scroller to read.
   */
  collapse?: CollapseState;
  /**
   * Trigger (a). The Rail is its **own** scroller — § 5 rejected a document scroll precisely so
   * that this reads one known element rather than `window.scrollY` under an iOS keyboard.
   */
  onRailScroll?: (atTop: boolean) => void;
  /**
   * Trigger (b), as **one `focusin` on the whole Rail** rather than seventeen per-field handlers:
   * `null` means focus left the Rail entirely. A move *within* the Rail passes no `null`, which is
   * what keeps the block from flashing whole for one frame between a blur and the next focus.
   */
  onRailFocus?: (target: HTMLElement | null) => void;
  /**
   * **Is the reduction forced by the height rather than asked for?** § 5's (c) and its `compact`
   * row, as one flag, published as `data-fit` — `src/styles.css` gates the same bands on it that
   * `max-md:` gates on B2, because a block that does not fit does not fit at any width. **This is
   * the whole of the landscape case**: an 844 × 390 phone is *above* B2, so without it the profile
   * would stand at full height inside an `overflow-hidden` shell 390 px tall and clip the View
   * Strip and « Garde min » out of the viewport. The Skeleton passes nothing.
   */
  tight?: boolean;
  rail: ReactNode;
  chart: ReactNode;
  /**
   * § 8's « clé ignorée » strip — **full width, above rail and charts**, and never the banner slot:
   * it is about the link and not the line. The Skeleton passes nothing, which is correct: it is
   * computed client-side on first mount from the raw query, so there is nothing to reserve for.
   */
  strip?: ReactNode;
  /**
   * § 5 puts the app's **single** `ResizeObserver` on the Chart Block element itself, beside its
   * `container-type: inline-size` — no extra wrapper, because inline-size containment does not
   * change the box's own inline size and the observer still reports the same content box. The
   * Skeleton passes nothing: there is nothing to measure before hydration.
   */
  chartRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <div
      aria-busy={busy || undefined}
      className="bg-background text-foreground flex h-dvh flex-col overflow-hidden"
      data-collapse={collapse}
      data-fit={tight ? "tight" : "roomy"}
      // The clearance § 7's jump primitive reserves, in the shell's own inline properties so it
      // inherits into the Rail. It is `0px` while the block is whole, and the rule that reads it is
      // scoped to B2 — above it there is no pinned header to clear.
      style={
        {
          ...LAYOUT_VARS,
          "--pinned-clearance": `${pinnedHeaderHeight(collapse)}px`,
        } as CSSProperties
      }
    >
      {strip}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* The Rail is not becoming interactive: `focusin`, `focusout` and `scroll` are **observed**
            here, on the one element that is both the collapse's scroller and the ancestor of every
            field it watches. None of the three adds an affordance, a role or a keyboard contract —
            which is what the rule is about — and the alternative is seventeen per-field handlers
            plus a second copy of the Rail's focus. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <aside
          // `pb-[var(--kb,0px)]` is § 5's keyboard-safe bottom space, and it is **unconditional**
          // and self-neutralising: where `interactive-widget=resizes-content` is honoured the layout
          // viewport already shrank, `--kb` is absent and the fallback resolves to `0px`; on older
          // iOS Safari, which ignores the tag, the shell still spans the whole screen and this is
          // what lets the last field scroll clear of the keyboard covering it. It is padding on the
          // scroller's content rather than a height on the box, so nothing above it moves.
          //
          // **`scroll-pb-[var(--kb,0px)]` is the same inset spent a second time, on the scroller's
          // *optimal viewing region*** — the box `scrollIntoView({ block: 'center' })` centres in.
          // Without it the padding alone is a trap: the Rail's box still spans the whole screen, so
          // piece 3 centres the focused field in a box whose lower `--kb` pixels the keyboard is
          // covering. Measured at 390 × 664 with a 336 px inset (ticket 35, defect 1), `#rail-mp`
          // focused: **y 361,5 – 389,5 against a visible bottom of 328**, i.e. 61,5 px behind the
          // keyboard; with the scroll padding the same focus lands the field at **y 193,5 – 221,5**.
          // Nothing else changes: it is `0px` with no keyboard up, it leaves piece 2's padding and
          // piece 3's `{ block: 'center' }` / `behavior: auto` exactly as § 5 writes them, and § 7's
          // jump primitive — the same {@link CENTRE_IN_RAIL} object — inherits the correction.
          className="border-border order-last flex min-h-0 w-full min-w-0 flex-1 scroll-pb-[var(--kb,0px)] flex-col overflow-y-auto pb-[var(--kb,0px)] md:order-first md:w-72 md:flex-none md:border-r"
          // React's `onBlur` is `focusout`, so it bubbles and `relatedTarget` is where focus is
          // *going*. Reporting `null` only when that lands outside the Rail is what makes a move
          // from one field to the next a single continuous focus rather than a gap.
          onBlur={
            onRailFocus === undefined
              ? undefined
              : (event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) onRailFocus(null);
                }
          }
          onFocus={
            onRailFocus === undefined
              ? undefined
              : (event) => {
                  const target = event.target;
                  // **The collapse is committed before the scroll is computed.** Trigger (b) is this
                  // same focus, so the block is about to lose four bands and the Rail is about to
                  // grow by ~420 px; a scroll measured against the pre-collapse layout centres the
                  // field in a box that no longer exists. A handler's own update lands *after* it
                  // returns, so `flushSync` is what puts the reflow first — the same ordering
                  // `RevealProfile` needs, one trigger earlier.
                  flushSync(() => onRailFocus(target));
                  // § 5's keyboard piece 3, on the **one** element that sees every field focus:
                  // « `scrollIntoView({ block: 'center' })` on field focus, inside the Rail's own
                  // scroller ». `behavior` is left at `auto` on purpose — **a smooth scroll races
                  // the keyboard animation**, and the two then interpolate against each other, so
                  // the field lands wherever the race ends. Fields only: tabbing onto « Copier le
                  // lien » must not move the form out from under the press.
                  if (centresOnFocus(railFocus(target))) target.scrollIntoView(CENTRE_IN_RAIL);
                }
          }
          onScroll={
            onRailScroll === undefined
              ? undefined
              : (event) => onRailScroll(event.currentTarget.scrollTop === 0)
          }
        >
          {rail}
        </aside>
        {/* No horizontal padding here: `GUTTER` lives **inside** the two SVGs, as the x scale's own
            range `[gutter, width − gutter]`, so that one object aligns both charts. Padding the
            column instead would inset the SVGs *and* the scale, spending 48 px a side — and it
            would inset the read-out cells, which § 5 spans across the **full column width**
            because aligning them to the plot would imply a correspondence that does not exist. */}
        <div
          className="@container min-w-0 flex-none overflow-hidden md:min-h-0 md:flex-1"
          ref={chartRef}
        >
          {/* § 5's `compact` row, and the **one** place the band stack stops being a stack: under a
              soft keyboard, or below 420 px of available height, the banner slot and the live
              « Garde min » share a single 44 px line — `664 − 336 − 44 = 284 px` of usable form.
              Every other band is already gone by then, dropped by the same `pinned` variant, so this
              turns two survivors into one row rather than hiding anything. */}
          <div className="compact:h-[var(--pinned-cell)] compact:flex-row compact:items-center flex flex-col">
            {chart}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Rail Header — the app's name plus the controls `__root.tsx` has no app bar for. */
export function RailHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-[var(--rail-header)] shrink-0 items-center gap-2 px-3">
      {/* The app's name ranks by **weight and typeface**, not by size: `text-lg` is the header
          cells' and nothing else's, and a fourth size for one word is how the eight came back. */}
      <span className="font-heading text-xs font-semibold tracking-tight">{APP_NAME}</span>
      {children}
    </header>
  );
}

/** One of § 9's five Rail sections. The heading is the container; the rows are A9's and A10's. */
export function RailSection({
  title,
  aside,
  children,
}: {
  title: string;
  /**
   * § 6's scope label — « sur toute la traversée » — and § 9's « aucun régime choisi » beside it,
   * on the heading itself so the scope and the reduction are read in one glance. It is one of the
   * three redundant channels that keep the Rail's traverse aggregate from being confused with the
   * strip's position read-out; the Skeleton passes none.
   */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-border border-t px-3 py-3">
      <h2 className="font-heading text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs font-semibold tracking-wide uppercase">
        {title}
        {aside !== undefined && aside !== null && (
          <span className="text-muted-foreground/70 text-xs normal-case">{aside}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

/**
 * § 5's banner slot — **one occupant, four ranks** (A11 fills it). Height reserved, and when there
 * is nothing to say, **nothing is drawn**: no border, no fill, no text. Reserving height is layout;
 * painting a band is a statement, and an empty verdict-coloured band reads as « rien à signaler ».
 *
 * **The reserved height is § 5's budget row for this width — 76 px below a 480 px column, 60 px
 * below 624, 44 px above — and not the height of whatever text happens to be in it.** Measured
 * before this was so (ticket 29, défaut 1): a flat `min-height: 44px` rendered 44 / 44 / 56 px at
 * one, two and three lines, so budget A summed to 507 against 540 and budget B to 545 against 561,
 * and `bannerBudget()` — the term collapse condition (c) spends — over-stated the block by 16–20 px.
 * Three things come back with the band being a function of the width like every other one:
 *
 * - **§ 5's three budgets sum as printed**, which is the section's own title, and (c) compares the
 *   block against the same number the screen shows rather than against a taller guess.
 * - **§ 7's « rank 1's first real occupant lands with no reflow on hydration »**: the Skeleton
 *   reserves what a three-line blocking summary needs at 390 px, because that is the widest thing
 *   this width can produce — under a content-driven floor the band grew 44 → 56 on arrival.
 * - **The invariant holds for this band too** — « every band height is a function of the chart
 *   column's inner width ». A slot sized by its own text is a height that changes on a keystroke.
 *
 * It stays a `min-height`, so an occupant longer than its width's row still grows rather than
 * clipping, and the two thresholds are `CELL_WRAP_PX` (B1, 624) and `RAIL_REFLOW_PX − RAIL_WIDTH`
 * (the column B2 itself produces, 480) — `bannerBudget()`'s own two, **no new breakpoint**.
 */
export function BannerSlot({ children }: { children?: ReactNode }) {
  return (
    // In `compact` the slot is **one line inside the row** rather than a band above it: its reserved
    // height goes (`min-h-0`), it takes the row's own height and whatever width is left beside
    // « Garde min », and `overflow-hidden` is what keeps a three-line occupant from re-growing the
    // 44 px the form is owed. § 7's precedence is untouched — the same occupant, on one line.
    //
    // The two container queries re-point `--banner` rather than setting a second `min-height`, so
    // `compact:min-h-0` still wins the row it is owed at every width, and the ranges are disjoint —
    // `[480, 624)` and `< 480` — so which of them applies is never a question of cascade order.
    <div className="compact:min-h-0 compact:h-full compact:min-w-0 compact:flex-1 compact:overflow-hidden min-h-[var(--banner)] shrink-0 px-[var(--gutter)] @max-[480px]:[--banner:var(--banner-three-lines)] @min-[480px]:@max-[624px]:[--banner:var(--banner-two-lines)]">
      {children}
    </div>
  );
}

/**
 * The profile band: 28 px of badge lane, `0,42 × W_inner` of plot, 24 px of handle lane, 24 px of
 * x-axis labels. The **handle lane is reserved but empty** in manual mode, which is why it is a row
 * of its own rather than padding inside the plot.
 *
 * Two occupants, one height. The live chart is **one SVG** over the whole band — § 5's own spine
 * table, and what puts the Handle Lane on the shared x scale — while the Skeleton, which has no
 * scale and nothing to draw, renders the four rows as frames. `--profile-band` is the sum of the
 * same three constants, so the two cannot disagree about the band's height.
 *
 * **The Pinned Safety Header drops it whole** — `pinned:hidden`, which is B2 for triggers (a) and
 * (b) and *any* width for the two height constraints. It is the larger of the two positional
 * signals, and § 5 keeps the two *non-positional* ones instead: the banner and the printed
 * « Garde min ».
 *
 * It is also **the reveal's landing place** — {@link PROFILE_BAND_ID}, {@link RevealProfile} — which
 * is why both of its occupants carry the same four attributes: whichever is mounted, the chevron
 * has somewhere to put the caret it is about to take away with itself.
 */
export function ProfileBand({
  badge,
  plot,
  handles,
  axis,
  children,
}: {
  badge?: ReactNode;
  plot?: ReactNode;
  handles?: ReactNode;
  axis?: ReactNode;
  children?: ReactNode;
}) {
  // `tabIndex={-1}` adds **no** tab stop: the band is a picture, and this is the skip-link pattern —
  // focusable on purpose, reachable by `Tab` never.
  const landing = {
    "aria-label": PROFILE_BAND_LABEL,
    id: PROFILE_BAND_ID,
    role: "group",
    tabIndex: -1,
  } as const;
  if (children !== undefined) {
    return (
      <div className="pinned:hidden h-[var(--profile-band)] shrink-0" {...landing}>
        {children}
      </div>
    );
  }
  return (
    <div className="pinned:hidden shrink-0" {...landing}>
      <div className="h-[var(--profile-badge)]">{badge}</div>
      <div className="border-border mx-[var(--gutter)] h-[var(--profile-plot)] border">{plot}</div>
      <div className="h-[var(--handle-lane)]">{handles}</div>
      <div className="h-[var(--x-labels)]">{axis}</div>
    </div>
  );
}

/**
 * The clearance strip — `clamp(0,16 × W_inner, 96, 200)`, and **the scrub track itself**. Dropped
 * by the Pinned Safety Header with the profile: it is a picture of the traverse, and the pinned
 * header keeps the *number*.
 */
export function StripBand({ children }: { children?: ReactNode }) {
  if (children !== undefined) {
    return <div className="pinned:hidden h-[var(--strip)] shrink-0">{children}</div>;
  }
  return (
    <div className="border-border pinned:hidden mx-[var(--gutter)] h-[var(--strip)] shrink-0 border" />
  );
}

/**
 * The View Strip: one touch-height row for the toggles, « ×1 vraie échelle » and the typed `x`.
 *
 * **It survives `pinned + x` and only that** — `pinned-without-x:hidden`. The strip lives
 * *inside* the Chart Block, so a collapse that dropped it while the rider-position field held the
 * caret would collapse away the very field being typed into; with it, the user types a position and
 * watches « Garde min » move with the keyboard open.
 */
export function ViewStripSlot({ children }: { children?: ReactNode }) {
  return (
    // `gap-2` and not `gap-3`: the row is one row of controls, and § 5's abbreviated width budget
    // has 3 px of slack at 390 px once the `x` field is locked at 16 px — voir the re-derivation in
    // `view-strip.tsx`. `text-xs` is the body size the whole row inherits; the `x` field opts back
    // up to 16 px, because iOS Safari auto-zooms below it.
    <div className="pinned-without-x:hidden flex h-[var(--view-strip)] shrink-0 items-center gap-2 px-[var(--gutter)] text-xs">
      {children}
    </div>
  );
}

/**
 * The read-out row. Five cells in one row above B1, three columns in two rows below it —
 * `@max-[624px]` is the container query on the chart column, not on the viewport, because the
 * 288 px rail means the chart column is never the viewport.
 *
 * **In the Pinned Safety Header it stops being a grid**: four cells go, « Garde min » takes the row
 * at one touch height, and {@link RevealProfile} sits at its end. The five-cells-at-every-width rule
 * is a rule about *widths* — the collapse is a rule about height, and it keeps the one cell whose
 * absence § 5 calls non-negotiable.
 *
 * **In `compact` it stops taking the width too**: the row is shared with the banner slot, so
 * « Garde min » is sized by its content and the banner takes the rest.
 */
export function ReadOutCells({
  children,
  scope,
}: {
  children: ReactNode;
  /** § 5's scope label for the row, in its two widths. */
  scope?: { full: string; short: string };
}) {
  return (
    <div className="pinned:flex pinned:items-center compact:w-auto compact:h-full relative grid shrink-0 grid-cols-5 @max-[624px]:grid-cols-3">
      {children}
      {/*
       * § 5's own scope label, « à la position du passager ». It is **inside** the row and costs it
       * no height, because at narrow the row ends up directly against the Rail's `Résultats` (« sur
       * toute la traversée ») and the two genuinely differ from the first paint — measured, 2,49 m
       * here against 2,44 m there. A row of its own would have broken the desktop budget, which
       * sums to the viewport exactly.
       */}
      {scope !== undefined && (
        // Gone in the pinned header, where it would land on {@link RevealProfile} and where the
        // row is one cell: a scope label distinguishes five values from the Rail's traverse
        // aggregate, and there is only one value left to distinguish.
        <span className="text-muted-foreground/70 pinned:hidden absolute top-0 right-3 text-xs">
          {/* Abbreviated below B1 for the same reason the View Strip's labels are: at 130 px of
              cell the full string would run over the neighbouring cell's own label. */}
          <span className="@max-[624px]:hidden">{scope.full}</span>
          <span className="@min-[624px]:hidden">{scope.short}</span>
        </span>
      )}
    </div>
  );
}

/**
 * § 5's reversal — « tapping the header (chevron, `aria-label` « Afficher le profil ») ». It is
 * **rendered at every width and shown only in the pinned header**, so that there is one tree and
 * the Skeleton's is the same one.
 *
 * **The chevron rather than the whole header.** § 5 offers both, but the banner slot already
 * carries its own affordances — `[ voir la première ]`, `[ Copier le diagnostic ]`,
 * `[ Choisir un régime ]` — and a header that is itself a button cannot contain them.
 *
 * It does not force anything: it asks, and the policy grants it **when constraints allow**. Under
 * (c) the block still cannot fit, and the request survives until it can.
 *
 * **It hands its own focus over before it disappears.** The button exists only inside the pinned
 * header, so granting the request unmounts the caret's own footing: measured, `document.activeElement`
 * fell to `<body>` and the next `Tab` restarted at the top of the document. `flushSync` commits the
 * reveal *before* the DOM is read — a click handler's own update lands after it returns — and the
 * caret then moves to {@link ProfileBand}, the band the label named. **Only if the policy granted
 * it**: under (c) the request is merely held, the chevron is still on screen, and the focus that is
 * already on it is the right one, so the visibility check is the grant test rather than a guard.
 *
 * **And when the request cannot be granted, the chevron says so** — `revealGrantable` is `false`
 * under either height constraint, and it arrives here as `aria-disabled` plus a muted,
 * `cursor-not-allowed` glyph. Measured before this existed, at 1366 × 768 and 1440 × 840: the
 * button was enabled, focusable, carried no `aria-expanded` and no `aria-disabled`, and a press
 * left the state, the block's 88 px and the screen untouched with the caret still on it — a **dead
 * affordance**, for sighted and AT users alike. It is *not* removed from the tree, and the press
 * still latches: § 5 names « tapping the header » as the reversal, and the held request is granted
 * the moment the constraint lifts. `aria-expanded` is a constant `false` because the button is only
 * ever perceivable inside the pinned header — where the band it controls is, by construction,
 * hidden.
 */
export function RevealProfile({
  grantable = true,
  onClick,
}: {
  /**
   * May the policy grant the request at this viewport? `false` under § 5's two height
   * *constraints* — voir `revealGrantable` in `@/lib/layout/collapse.ts`. It is a derived boolean
   * and **not** a viewport: nothing here reads a height, and nothing below is sized from it.
   */
  grantable?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-controls={PROFILE_BAND_ID}
      // Not `disabled`: the request is still recorded, and a `disabled` button leaves the AT user
      // with a control that vanished from the tab order rather than one that explains itself.
      aria-disabled={grantable ? undefined : true}
      aria-expanded={false}
      aria-label={REVEAL_LABEL}
      // `order-last` because « Garde min » carries `order-4` below B1 and the row is a flex box
      // here.
      //
      // **`size="icon-sm"` plus `.touch-44`, not a 44 px box.** The glyph is 28 px like every other
      // control in the app, and the 44 px hit target the pinned row owes a coarse pointer comes from
      // the utility's `::after` — the same split the View Strip's own controls make, and the reason
      // the touch policy is one grep rather than a size variant per call site. The utility also
      // carries the `position: relative` this button needs on its own account: the « Aucun
      // résultat » cause line is absolutely positioned over the row, and a way back out of the
      // collapse may not sit under a sentence.
      className={cn(
        "pinned:flex touch-44 order-last mr-3 hidden shrink-0",
        // The unavailable state is *shown*, in the two channels a chevron has: the glyph's own
        // contrast and the cursor. No new French string — § 5's label is the label, and inventing
        // copy for a state the spec never wrote down is a spec decision, not a repair. `ghost`
        // carries the hover the available state wants, so the unavailable one has to take it back.
        grantable
          ? undefined
          : "text-muted-foreground/50 hover:text-muted-foreground/50 cursor-not-allowed hover:bg-transparent",
      )}
      onClick={() => {
        flushSync(onClick);
        const band = document.getElementById(PROFILE_BAND_ID);
        if (band !== null && band.checkVisibility()) band.focus({ preventScroll: true });
      }}
      // From `pinned + x` this button sits 44 px under a View Strip that exists only while the
      // Rail's `x` holds the caret — so `mousedown`'s own focus shift used to unmount the row above
      // it, move this button, and send the `click` to an ancestor. Voir `keepCaret`.
      onMouseDown={keepCaret}
      size="icon-sm"
      title={REVEAL_LABEL}
      variant="ghost"
    >
      <span aria-hidden="true">⌄</span>
    </Button>
  );
}

/** One read-out cell. The Skeleton passes a label and no value — never a « — ». */
export function ReadOutCell({
  label,
  className,
  children,
}: {
  /**
   * The cell's own label, or **nothing at all** while § 7's cause line occupies the row: « les cinq
   * cellules sont **remplacées par une seule ligne** qui occupe la rangée », and a label left
   * standing under that sentence is not replaced by it — measured at 1440 × 900 (ticket 31, **D2**),
   * « Garde min » at `x 300, y 907` under a cause box at `x 300, y 907`, 206 × 15 px of overlap
   * rendering « Àucdemrésultat ».
   *
   * The five boxes stay: they are what gives the row its height in each of its four shapes — 52 px
   * in one grid row, 104 px in two, {@link PINNED_CELL} pinned, the shared row in `compact` — and
   * « keeping the row's height, so nothing jumps » is the other half of the same sentence.
   */
  label?: string;
  /** The cell's narrow-width and pinned placements — {@link READ_OUT_CELLS} carries both. */
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex h-[var(--cell-row)] flex-col justify-center px-3", className)}>
      {label !== undefined && <span className="text-muted-foreground text-xs">{label}</span>}
      {children}
    </div>
  );
}
