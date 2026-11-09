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
import type { CellId } from "@/lib/rail/cells.ts";

import { InfoTip } from "@/components/rail/controls.tsx";
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
  AVANCE_PLOT_MAX,
  BANNER,
  CELL_BASIS_PX,
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
import { SECTION } from "@/lib/statique/copy.ts";
import { cn } from "@/lib/utils.ts";

/** The Rail Header's static text — the navigation bar names Pages, not the app. */
export const APP_NAME = "Scoutech";

/**
 * § 9's five Rail sections, in order, split by the column that holds them from B2 up — `Paramètres`
 * on the left, the four that report on the right. Stacked, the Rail reads them as one run in this
 * order. The Skeleton reproduces the headings and nothing under them.
 */
export const LEFT_SECTIONS = ["Paramètres"] as const;
export const RIGHT_SECTIONS = [
  "Valeurs déduites",
  "Résultats",
  "Provenance",
  "Ce que cet outil ne calcule pas",
] as const;

/**
 * The read-out cells — § 5's five, plus « Garde au sol » and « Écart à vide » (2026-09-23). **All
 * of them at every width, no subset and no horizontal scroll** — a subset would delete the printed
 * number that justified drawing a sub-pixel rider envelope at 1500 m in the first place, and
 * horizontal scroll would hide « Garde min » behind a gesture that competes with the scrub.
 *
 * **They wrap as a flex row**, not a fixed grid: each cell starts from `--cell-basis` (two of them
 * for « Garde min. ligne »), grows to fill its line, and moves to the next line when it would not
 * fit — one line from a 992 px column, two from 496, three from 372. The order is the same at every
 * width. **Wrapping a label is benign; clipping a value is not**, and the value is what the basis is
 * sized for — voir `CELL_BASIS_PX`. `basis` is spelled by hand because a Tailwind arbitrary value
 * cannot read a TypeScript constant; `READ_OUT_SPANS` in `@/lib/layout/contract.ts` is its
 * arithmetic twin, and `cellRows()` lays the same row out without a DOM.
 */
export const READ_OUT_CELLS: Record<CellId, { readonly basis: string; readonly pinned: string }> = {
  clearance: {
    basis: "basis-[calc(2*var(--cell-basis))]",
    /**
     * The Pinned Safety Header's **one live cell**: it *is* the row there, at one touch height
     * rather than {@link CELL_ROW}. It is the garde and not one of the other four because
     * unmissability survives the collapse through the two **non-positional** signals — the banner
     * and this printed number, the two that do not need the plot.
     */
    pinned: "pinned:h-[var(--pinned-cell)] pinned:flex-1",
  },
  TA: { basis: "basis-[var(--cell-basis)]", pinned: "pinned:hidden" },
  TB: { basis: "basis-[var(--cell-basis)]", pinned: "pinned:hidden" },
  slope: { basis: "basis-[var(--cell-basis)]", pinned: "pinned:hidden" },
  sag: { basis: "basis-[var(--cell-basis)]", pinned: "pinned:hidden" },
  /** The garde **under the passenger's feet** at `x_D` — `SceneRider.underRider`, ticket 41's. */
  underRider: { basis: "basis-[var(--cell-basis)]", pinned: "pinned:hidden" },
  /** The load's drop below the unloaded line at `x_D` — `SceneRider.belowUnloaded`. */
  belowUnloaded: { basis: "basis-[var(--cell-basis)]", pinned: "pinned:hidden" },
};

/** § 7's one `<noscript>` line: under `ssr: false` the app is a Skeleton forever without JS. */
export const NOSCRIPT_LINE = "Ce simulateur nécessite JavaScript pour fonctionner.";

/**
 * § 5's aspect rule as CSS, under a Page's plot ceiling: `min(0,42 × W_inner, ceiling)` —
 * amendment F's {@link PROFILE_PLOT_MAX}, or Avancé's raised {@link AVANCE_PLOT_MAX} (#110). One
 * function, so the band the CSS reserves and the `profilePlotHeight()` the SVG is drawn at cannot
 * spell two ceilings. The ceiling is printed to 0,1 µm, so `0,42 × 1960`'s float noise
 * (823,1999…) is not spelled into the stylesheet.
 */
function profilePlotRule(ceiling: number): string {
  return `min(calc(${PROFILE_ASPECT} * var(--w-inner)), ${Number(ceiling.toFixed(4))}px)`;
}

/**
 * The layout contract as CSS custom properties. `100cqi` is the **Chart Block's** inline size —
 * its box is the query container (on Avancé the middle column's, under its 1984 px letterbox), so
 * `--w-inner` is exactly § 5's `W_inner = col − 24`, and every band below is a function of it and
 * of nothing else. Exported for the other Pages that
 * stand the Chart Block in a column of their own — Statique — so its bands read the same contract.
 */
export const LAYOUT_VARS = {
  "--gutter": `${GUTTER}px`,
  "--w-inner": `calc(100cqi - ${2 * GUTTER}px)`,
  "--profile-badge": `${PROFILE_CHROME.badge}px`,
  "--handle-lane": `${PROFILE_CHROME.handleLane}px`,
  "--x-labels": `${PROFILE_CHROME.xLabels}px`,
  // § 5's aspect rule under **amendment F**'s ceiling, as one `min()` rather than a JS branch: the
  // plot is `0,42 × W_inner` up to § 5's reference chart column (1152 px, `W_inner` 1128) and frozen
  // at the 473,76 px it reaches there past it. Both terms come from `contract.ts`, so the rendered
  // band and `chartBlockHeight()`'s own term are the same arithmetic — and the whole rule stays a
  // function of the container's inline size, so the Skeleton is still correct before any measurement.
  // Without it the plot grew linearly for ever and five ordinary 16:9 desktops opened with no chart.
  "--profile-plot": profilePlotRule(PROFILE_PLOT_MAX),
  // The whole profile band, because § 5's profile is **one SVG** spanning all four of its rows —
  // the Handle Lane is inside it, which is what keeps the handles on the shared x scale. The
  // Skeleton draws the four rows separately; both add up to this, from these same three constants.
  "--profile-band": `calc(var(--profile-badge) + var(--profile-plot) + var(--handle-lane) + var(--x-labels))`,
  "--strip": `clamp(${STRIP.min}px, calc(${STRIP.factor} * var(--w-inner)), ${STRIP.max}px)`,
  "--view-strip": `${VIEW_STRIP}px`,
  "--cell-row": `${CELL_ROW}px`,
  "--cell-basis": `${CELL_BASIS_PX}px`,
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

/**
 * Avancé's own: the same contract under its **raised plot ceiling** (#110). Its shell spans the whole
 * width, so its middle column widens with the window and the Chart Block with it up to
 * `AVANCE_BLOCK_MAX_PX`, where the plot reaches this ceiling; past it the block letterboxes, so the
 * plot stays at 0,42 and the Plot Aspect Band holds at every width. The Chart Block is told the same
 * ceiling (`plotMax`), so the drawn plot and this band agree. Exported for `shell.test.ts`, which
 * reads the rule it spells.
 */
export const AVANCE_LAYOUT_VARS = {
  ...LAYOUT_VARS,
  "--profile-plot": profilePlotRule(AVANCE_PLOT_MAX),
} as CSSProperties;
// `--kb`, the iOS soft-keyboard inset, is deliberately **not** here: the `visualViewport` fallback
// writes it on `documentElement`, and an inline `--kb: 0px` on this element would shadow it for the
// whole subtree. Consumers read `var(--kb, 0px)`, so the fallback needs no threshold constant —
// the value is simply absent until a keyboard is up.

/**
 * The shell: a fixed-height box with internal scrollers, never a document scroll — the height
 * `PageFrame` leaves under the navigation bar (`@/components/app/navigation-bar.tsx`). **A document
 * scroll was rejected** because the Chart Block's collapse trigger would then have to read
 * `window.scrollY` *and* survive iOS's document-scroll-under-keyboard behaviour, where a fixed
 * shell plus `interactive-widget=resizes-content` gives the same result with one known scroller.
 *
 * B2 is `THREE_COLUMN_PX`, spelled `three-columns:` below — from it the row is **three columns**: the
 * Rail's `Paramètres` on the left, the Chart Block in the middle, the Rail's reports on the right.
 * Under it the row becomes a column and both Rail halves go `order-last` inside one scroller, in
 * flow, pushing rather than covering. No bottom sheet: Base UI 1.6.0 ships a
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
 * the height forced it*, and since #110 the policy sets it below B2 only — from three columns the
 * middle column scrolls under the vue de dessus, and the window's height costs the block nothing.**
 * Both sit on the **shell** rather than on the chart column because
 * `--pinned-clearance` has to reach the Rail's controls: § 7's jump primitive reserves the header's
 * height there, and the Rail is the chart column's sibling.
 *
 * **Which of the two absorbs the residual flips at B2, and that is § 5's budget A, not styling.**
 * In a row the two Rail columns are the fixed 288 px each (`three-columns:w-72`) — the left one
 * 576 px from B3 (`wide-rail:w-144`, `WIDE_RAIL_PX`, #112), where `Paramètres` stands its groups on
 * two columns — and the chart column takes the rest of the *width* (`three-columns:flex-1`). **The scroller wrapper is
 * `display: contents` there**, so the two columns are the chart's own flex siblings and each scrolls
 * itself, while below B2 the same wrapper is the one Rail scroller the collapse reads. A focus or
 * blur inside either column still bubbles to it. In a column the Chart Block keeps its **budgeted height**
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
  left,
  right,
  chart,
  chartRef,
  strip,
  tight = false,
  views,
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
   * its `width < 1024px` arm gates on B2. The policy raises it below B2 only (#110): three columns
   * at 1440 × 500 keep the whole block and scroll the middle column to it. The Skeleton passes
   * nothing.
   */
  tight?: boolean;
  /** The left column: the Rail Header, then `Paramètres`. */
  left: ReactNode;
  /** The right column: the Rail's four reporting sections. Empty for a surface that has none. */
  right?: ReactNode;
  chart: ReactNode;
  /**
   * The middle column's views **above** the Chart Block, three columns only (#104, #110):
   * Statique's vue de dessus, never one of Avancé's own. Below B2 there is no middle column — the
   * block stands over the Rail — and the box is `display: none`. The Skeleton passes the empty
   * frame.
   */
  views?: ReactNode;
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
      className="bg-background text-foreground flex h-full flex-col overflow-hidden"
      data-collapse={collapse}
      data-fit={tight ? "tight" : "roomy"}
      // The clearance § 7's jump primitive reserves, in the shell's own inline properties so it
      // inherits into the Rail. It is `0px` while the block is whole, and the rule that reads it is
      // scoped to B2 — above it there is no pinned header to clear.
      style={
        {
          ...AVANCE_LAYOUT_VARS,
          "--pinned-clearance": `${pinnedHeaderHeight(collapse)}px`,
        } as CSSProperties
      }
    >
      {strip}
      {/* **No shell cap** (#110): the shell spans the window, and every pixel past the two side
          columns (288 px each, the left one 576 from B3, #112) goes to the middle one, so the vue
          de dessus widens with it, and the Chart Block up to `AVANCE_BLOCK_MAX_PX` (1984 px, the
          column at 2848), where it letterboxes. It was
          capped at 1728 px (`SHELL_MAX_PX`, the other Pages' cap) while the plot's ceiling was
          amendment F's; Avancé's is raised now (`AVANCE_PLOT_MAX`), and the block's own cap is what
          keeps it whole in a 1440 px window. */}
      <div className="three-columns:flex-row flex min-h-0 w-full flex-1 flex-col">
        {/* The Rail is not becoming interactive: `focusin`, `focusout` and `scroll` are **observed**
            here, on the one element that is both the collapse's scroller (below B2) and the ancestor
            of every field it watches. None of the three adds an affordance, a role or a keyboard
            contract — which is what the rule is about — and the alternative is seventeen per-field
            handlers plus a second copy of the Rail's focus. From B2 up this element is
            `display: contents` and each column scrolls itself; the collapse has no consumer there,
            so the missing `scroll` (it does not bubble) costs nothing. */}
        <div
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
          // jump primitive — the same {@link CENTRE_IN_RAIL} object — inherits the correction. The
          // two columns spend the same pair on their own scroller from B2 up.
          className="three-columns:contents order-last flex min-h-0 w-full min-w-0 flex-1 scroll-pb-[var(--kb,0px)] flex-col overflow-y-auto pb-[var(--kb,0px)]"
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
          <aside
            aria-label="Paramètres"
            className="border-border wide-rail:w-144 three-columns:order-first three-columns:min-h-0 three-columns:w-72 three-columns:scroll-pb-[var(--kb,0px)] three-columns:overflow-y-auto three-columns:border-r three-columns:pb-[var(--kb,0px)] flex w-full shrink-0 flex-col"
          >
            {left}
          </aside>
          {/* Below B2 this column continues the left one — same scroller, no rule between them but the
              first section's own — so the Rail reads as the one run it was. Its first section drops
              the top hairline from B2 up, where nothing stands above it to be separated from. */}
          {right !== undefined && (
            <aside
              aria-label="Valeurs déduites et résultats"
              className="border-border three-columns:order-last three-columns:min-h-0 three-columns:w-72 three-columns:scroll-pb-[var(--kb,0px)] three-columns:overflow-y-auto three-columns:border-l three-columns:pb-[var(--kb,0px)] three-columns:[&>section:first-child]:border-t-0 flex w-full shrink-0 flex-col"
            >
              {right}
            </aside>
          )}
        </div>
        {/* No horizontal padding here: `GUTTER` lives **inside** the two SVGs, as the x scale's own
            range `[gutter, width − gutter]`, so that one object aligns both charts. Padding the
            column instead would inset the SVGs *and* the scale, spending 24 px a side — and it
            would inset the read-out cells, which § 5 spans across the **full column width**
            because aligning them to the plot would imply a correspondence that does not exist.

            **From B2 up the column scrolls**, the views first and the block under them (#110), the
            way Statique's right column does: a block held still over a residual scroller would
            leave the map 116 px at 1024 × 768 (#104). The gutter is reserved so a scrollbar that
            comes and goes cannot move the width every band is a function of. It spends the `--kb`
            pair like the two side columns. */}
        <div className="three-columns:min-h-0 three-columns:flex-1 three-columns:scroll-pb-[var(--kb,0px)] three-columns:[scrollbar-gutter:stable] three-columns:overflow-y-auto three-columns:pb-[var(--kb,0px)] min-w-0 flex-none overflow-hidden">
          {/* The vue de dessus heads the column from B2 (#110), above the Chart Block, in the DOM
              too, so the focus order is the order on screen. Below B2 there is no middle column and
              the box is `display: none`, so the stacked shape — the block over the Rail — is the
              one it always was. Its hairline is under it, between it and the block. */}
          {views !== undefined && (
            <section
              aria-label={SECTION.topView}
              className="border-border three-columns:block hidden border-b px-3 py-3"
            >
              {views}
            </section>
          )}
          {/* § 5's `compact` row, and the **one** place the band stack stops being a stack: under a
              soft keyboard, or below 420 px of available height, the banner slot and the live
              « Garde min » share a single 44 px line — `664 − 336 − 44 = 284 px` of usable form.
              Every other band is already gone by then, dropped by the same `pinned` variant, so this
              turns two survivors into one row rather than hiding anything.

              **This box is the Chart Block's**: the query container every band's `100cqi` reads and
              the app's single `ResizeObserver`'s target, so the block's width, not the column's, is
              what its bands are a function of. `max-w-[1984px]` is `AVANCE_BLOCK_MAX_PX` (#110):
              past it the block **letterboxes**, centred (`mx-auto`) in the column with the surplus
              empty either side, so the plot keeps its 0,42 inside the Plot Aspect Band and the whole
              block stays 1239,2 px tall at most — whole in a 1440 px window. Below 2848 px of
              viewport (`AVANCE_BLOCK_VIEWPORT_PX`) the cap does not bind and the block is the
              column, as below B2. */}
          <div
            className="compact:h-[var(--pinned-cell)] compact:flex-row compact:items-center @container mx-auto flex w-full max-w-[1984px] flex-col"
            ref={chartRef}
          >
            {chart}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Rail Header — the app's name plus the Rail's own controls. */
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
 * clipping, and the two thresholds are `CELL_WRAP_PX` (B1, 624) and `BANNER_TWO_LINES_PX` (480) —
 * `bannerBudget()`'s own two, **no new breakpoint**.
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
 * The read-out row — a **wrapping flex row**, laid out by `--cell-basis` and each cell's own basis
 * class: one line from a 992 px chart column, two from 496, three from 372. The column is the
 * container, not the viewport, because the 288 px rail means the chart column is never the viewport.
 *
 * **In the Pinned Safety Header it stops wrapping**: the other cells go, « Garde min » takes the row
 * at one touch height, and {@link RevealProfile} sits at its end. The all-cells-at-every-width rule
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
  /** § 5's scope label for the row — « à la position du passager ». */
  scope?: string;
}) {
  return (
    <div className="pinned:flex-nowrap pinned:items-center compact:w-auto compact:h-full relative flex shrink-0 flex-wrap">
      {children}
      {/*
       * § 5's own scope label, « à la position du passager »: at narrow the row ends up directly
       * against the Rail's `Résultats` (« sur toute la traversée »), and the two are **different
       * reductions**, `ligne` over `x` at one `x_P` against `traversée` over `x_P`.
       *
       * **Screen-reader only since the row wraps** (2026-09-23). It used to sit over the row's
       * top-right corner, clear of the fifth cell's label by measurement; a flex row fills every
       * line to its end, so there is no corner left to clear at any width, and a row of its own
       * would cost the block another line. The scope still reads on screen in three places: the
       * View Strip's `x` directly above the row, the section header's « sur toute la traversée »
       * opposite it, and every cell's help text.
       */}
      {scope !== undefined && <span className="sr-only">{scope}</span>}
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
  help,
  className,
  children,
}: {
  /** `@/lib/rail/help.ts`'s copy for this cell — what the value is and how it is computed. */
  help?: string;
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
  /** The cell's flex basis and pinned placement — {@link READ_OUT_CELLS} carries both. */
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex h-[var(--cell-row)] grow flex-col justify-center px-3", className)}>
      {label !== undefined && (
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs">{label}</span>
          {help !== undefined && <InfoTip label={label} text={help} />}
        </span>
      )}
      {children}
    </div>
  );
}
