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

import {
  BANNER,
  CELL_ROW,
  GUTTER,
  PROFILE_ASPECT,
  PROFILE_CHROME,
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
 * is not**, and the value is what binds: `font-mono text-lg` needs ≈605 px for five cells.
 */
export const READ_OUT_CELLS = [
  { label: "Garde min", narrow: "@max-[600px]:order-4 @max-[600px]:col-span-2" },
  { label: "T anc. A", narrow: "@max-[600px]:order-1" },
  { label: "T anc. B", narrow: "@max-[600px]:order-2" },
  { label: "Pente", narrow: "@max-[600px]:order-3" },
  { label: "Flèche", narrow: "@max-[600px]:order-5" },
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
  "--profile-plot": `calc(${PROFILE_ASPECT} * var(--w-inner))`,
  // The whole profile band, because § 5's profile is **one SVG** spanning all four of its rows —
  // the Handle Lane is inside it, which is what keeps the handles on the shared x scale. The
  // Skeleton draws the four rows separately; both add up to this, from these same three constants.
  "--profile-band": `calc(var(--profile-badge) + var(--profile-plot) + var(--handle-lane) + var(--x-labels))`,
  "--strip": `clamp(${STRIP.min}px, calc(${STRIP.factor} * var(--w-inner)), ${STRIP.max}px)`,
  "--view-strip": `${VIEW_STRIP}px`,
  "--cell-row": `${CELL_ROW}px`,
  "--banner": `${BANNER.oneLine}px`,
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
 * **Which of the two absorbs the residual flips at B2, and that is § 5's budget A, not styling.**
 * In a row the Rail is the fixed 288 px (`md:w-72 md:flex-none`) and the chart column takes the
 * rest of the *width* (`md:flex-1`). In a column the Chart Block keeps its **budgeted height**
 * (`flex-none`, so the band stack measures itself) and the **Rail** is the residual scroller
 * (`flex-1 min-h-0 overflow-y-auto`) — budget A reads « bloc 540 · reste : rail en flux 124 », and
 * `MIN_RAIL = 120` is a floor on the Rail, never on the block. The other way round the Rail's ~60
 * form rows would eat the column and clip the View Strip and the read-out cells out of the
 * viewport, inside an `overflow-hidden` shell with nothing to scroll to reach them — and § 5 keeps
 * « Garde min » and all five cells legible at every width. When the block genuinely does not fit
 * (`blockHeight > availableHeight − MIN_RAIL`) it is the **collapse** that answers, not a squeeze:
 * that is A12's, and it is the (c) trigger of the Pinned Safety Header.
 */
export function Shell({
  busy = false,
  rail,
  chart,
  chartRef,
  strip,
}: {
  /** The Skeleton sets it. No `aria-live` region and no spinner — see {@link Skeleton}. */
  busy?: boolean;
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
      style={LAYOUT_VARS}
    >
      {strip}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="border-border order-last flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto md:order-first md:w-72 md:flex-none md:border-r">
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
          <div className="flex flex-col">{chart}</div>
        </div>
      </div>
    </div>
  );
}

/** The Rail Header — the app's name plus the controls `__root.tsx` has no app bar for. */
export function RailHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-[var(--rail-header)] shrink-0 items-center gap-2 px-4">
      <span className="font-heading text-sm font-semibold tracking-tight">{APP_NAME}</span>
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
    <section className="border-border border-t px-4 py-3">
      <h2 className="font-heading text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs font-semibold tracking-wide uppercase">
        {title}
        {aside !== undefined && aside !== null && (
          <span className="text-muted-foreground/70 text-[10px] normal-case">{aside}</span>
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
 */
export function BannerSlot({ children }: { children?: ReactNode }) {
  return <div className="min-h-[var(--banner)] shrink-0 px-[var(--gutter)]">{children}</div>;
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
  if (children !== undefined) {
    return <div className="h-[var(--profile-band)] shrink-0">{children}</div>;
  }
  return (
    <div className="shrink-0">
      <div className="h-[var(--profile-badge)]">{badge}</div>
      <div className="border-border mx-[var(--gutter)] h-[var(--profile-plot)] rounded-sm border">
        {plot}
      </div>
      <div className="h-[var(--handle-lane)]">{handles}</div>
      <div className="h-[var(--x-labels)]">{axis}</div>
    </div>
  );
}

/** The clearance strip — `clamp(0,16 × W_inner, 96, 200)`, and **the scrub track itself**. */
export function StripBand({ children }: { children?: ReactNode }) {
  if (children !== undefined) return <div className="h-[var(--strip)] shrink-0">{children}</div>;
  return (
    <div className="border-border mx-[var(--gutter)] h-[var(--strip)] shrink-0 rounded-sm border" />
  );
}

/** The View Strip: one touch-height row for the toggles, « ×1 vraie échelle » and the typed `x`. */
export function ViewStripSlot({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-[var(--view-strip)] shrink-0 items-center gap-3 px-[var(--gutter)] text-[11px]">
      {children}
    </div>
  );
}

/**
 * The read-out row. Five cells in one row above B1, three columns in two rows below it —
 * `@max-[600px]` is the container query on the chart column, not on the viewport, because the
 * 288 px rail means the chart column is never the viewport.
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
    <div className="relative grid shrink-0 grid-cols-5 @max-[600px]:grid-cols-3">
      {children}
      {/*
       * § 5's own scope label, « à la position du passager ». It is **inside** the row and costs it
       * no height, because at narrow the row ends up directly against the Rail's `Résultats` (« sur
       * toute la traversée ») and the two genuinely differ from the first paint — measured, 2,49 m
       * here against 2,44 m there. A row of its own would have broken the desktop budget, which
       * sums to the viewport exactly.
       */}
      {scope !== undefined && (
        <span className="text-muted-foreground/70 absolute top-0 right-3 text-[10px]">
          {/* Abbreviated below B1 for the same reason the View Strip's labels are: at 130 px of
              cell the full string would run over the neighbouring cell's own label. */}
          <span className="@max-[600px]:hidden">{scope.full}</span>
          <span className="@min-[600px]:hidden">{scope.short}</span>
        </span>
      )}
    </div>
  );
}

/** One read-out cell. The Skeleton passes a label and no value — never a « — ». */
export function ReadOutCell({
  label,
  className,
  children,
}: {
  label: string;
  /** The cell's narrow-width placement — {@link READ_OUT_CELLS} carries it. */
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex h-[var(--cell-row)] flex-col justify-center px-3", className)}>
      <span className="text-muted-foreground text-[11px]">{label}</span>
      {children}
    </div>
  );
}
