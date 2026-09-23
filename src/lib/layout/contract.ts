/**
 * § 5's layout contract — « v1 build spec » § 5 (*The layout contract — every band height is a
 * function of width*, *The three pixel budgets*, *Two breakpoints, stated as what fails*).
 *
 * > **Invariant: no chart dimension may read the window height.** Every band height is a function
 * > of the chart column's inner width.
 *
 * That invariant is what fixes narrow *and* desktop with one rule, and it is what makes the
 * Skeleton correct at 390 px **for free**: the Skeleton renders these same numbers through CSS
 * container-query units, so there is no second layout to keep in sync and no measurement to take
 * before the first paint. A flex ratio was rejected because `flex-[3]`/`flex-1` makes vertical
 * exaggeration a function of window height — literally how the prototype's ×5,02 happened.
 *
 * The numbers live in TypeScript rather than in a stylesheet because two consumers need them:
 * `@/components/app/shell.tsx` turns them into CSS custom properties, and the Chart Block's scales
 * consume them as numbers. Ticket A8 extends this module with `SharedX`, the VE policy and the
 * ×1 floor; it does not re-declare a constant that is already here.
 */

/** Both charts, both sides. One gutter, so the two x axes cannot be misaligned by construction. */
export const GUTTER = 24;

/** The profile's non-plot rows, px: the VE badge, the handle lane, the x-axis labels. */
export const PROFILE_CHROME = { badge: 28, handleLane: 24, xLabels: 24 } as const;

/** 28 + 24 + 24 = 76 px of profile that is not plot. */
export const PROFILE_CHROME_HEIGHT: number =
  PROFILE_CHROME.badge + PROFILE_CHROME.handleLane + PROFILE_CHROME.xLabels;

/** The target plot aspect — inner height ÷ inner width. */
export const PROFILE_ASPECT = 0.42;

/**
 * The guard on {@link PROFILE_ASPECT}: an aspect outside it is a layout bug, not a taste.
 *
 * **It guards the *rule*, and the rule now has a ceiling** — voir {@link PROFILE_PLOT_MAX}. Up to
 * § 5's reference chart column the obtained aspect *is* 0,42, inside the band by construction; past
 * it the plot is frozen and the obtained aspect falls **below** the band's floor, deliberately. That
 * is the one direction the band's floor was minted against but the ×1 floor already refuses
 * absolutely: a shallower aspect can only lower VE, never inflate it, and VE never compresses — it
 * clamps at ×1 and **says so in the badge**. The dangerous half of this band is its ceiling, and a
 * cap cannot reach it.
 */
export const PLOT_ASPECT_BAND = { min: 0.35, max: 0.5 } as const;

/**
 * The clearance strip's outer height: `clamp(0,16 × W_inner, 96, 200)`. The 96 px floor sits 24 px
 * above the policy floor of 72 px **deliberately, because 96 px is a touch lane** — 66 px of drawn
 * curve, and the whole SVG is the hit surface, over twice the 44/48 px minimum.
 */
export const STRIP = { factor: 0.16, min: 96, max: 200 } as const;

/** One touch-height row: the layer toggles, « ×1 vraie échelle » and the typed `x`. */
export const VIEW_STRIP = 44;

/** One read-out cell row. How many the row wraps to is {@link cellRows}'s. */
export const CELL_ROW = 52;

/**
 * **One read-out cell's flex basis, px** — the narrowest box a value fits in: a nine-character value
 * (« 12345 daN ») at `font-mono text-lg` plus its `px-3`, i.e. one fifth of {@link CELL_WRAP_PX}'s
 * own five-cell arithmetic, `9 × 18 × 0,62 + 24 ≈ 124,4`. The cells **grow** from it to fill their
 * line and wrap to a new one when the next would not fit: a flex row, not a fixed column count
 * (2026-09-23).
 *
 * **124 and not 125**: eight units are then **992 px**, the chart column of a 1280 px laptop, so the
 * row stays single there and the block keeps the height it had. The 0,4 px is inside the 0,62 em
 * guard itself — the faces a bare `monospace` resolves to measure 0,60, which is 121,2.
 */
export const CELL_BASIS_PX = 124;

/**
 * Each read-out cell's width in {@link CELL_BASIS_PX} units, in the row's own order — `shell.tsx`'s
 * `READ_OUT_CELLS` — so {@link cellRows} can lay the row out without a DOM. « Garde min. ligne » is
 * **two**: its relabelled form « Garde min. ligne (à x 74,3 m) » needs ≈ 200 px of label.
 */
export const READ_OUT_SPANS = [2, 1, 1, 1, 1, 1, 1] as const;

/**
 * The **live** « Garde min » cell of the Pinned Safety Header — § 5's `76 + 44 = 120`. It is one
 * touch height rather than {@link CELL_ROW}, because in the pinned header the cell *is* the row and
 * the row is the app's tightest budget. The policy that spends it is `./collapse.ts`.
 */
export const PINNED_CELL = 44;

/**
 * B1 — « the read-out row can no longer fit five values », in **chart-column** width, not viewport:
 * the 288 px rail means the chart column is never the viewport, so this is a container query. The
 * *value* binds and not the label.
 *
 * **624, and no longer § 5's 600** — amendment L, 2026-08-16
 * (`../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md`). The app ships **no mono face**:
 * `--font-mono` is `ui-monospace, monospace`, so the advance is the platform's and this constant
 * budgets for the widest one a bare `monospace` keyword realistically resolves to — **0,62 em**
 * (Liberation Mono, DejaVu Sans Mono, Menlo, Courier New) — rather than the 0,6 em § 5 derived with
 * a bundled face in mind. Five nine-character cells (« 12345 daN ») at `font-mono text-lg`, each
 * with its `px-3`:
 *
 * > `(9 × 18 × 0,62 + 24) × 5 ≈ 622 px`
 *
 * so the threshold sits **above** its own requirement. That is the whole edit: § 5's 600 sat five
 * pixels **under** its own ≈605 px estimate, and a wider guard (0,65 em → 650) was rejected because
 * it spends two rows of header on laptop widths that fit today, for a face the keyword does not
 * resolve to. Changing the header cells' type, or the mono stack, changes this constant **and**
 * `contract.test.ts`, in the same commit.
 *
 * **The read-out row no longer wraps on it.** Since 2026-09-23 there are seven cells, and they wrap
 * by {@link cellRows}'s flex rule instead. B1 still carries everything else it named: the View
 * Strip's abbreviations, the banner's budget and the five-cell arithmetic above, which is what
 * {@link CELL_BASIS_PX} is one fifth of.
 */
export const CELL_WRAP_PX = 624;

/** B2 — « an aspect-legal profile cannot coexist with the rail », in **viewport** width. */
export const RAIL_REFLOW_PX = 768;

/** The Rail Header's height, and the height of the app bar `__root.tsx` therefore cannot afford. */
export const RAIL_HEADER = 44;

/** The floor the resting rail must clear. Measured slack at 390×664 is 124 px, which is not this. */
export const MIN_RAIL = 120;

/**
 * § 5's second height threshold — « `compact` fires when `--kb > 0` **or available height < 420 px** ».
 * It is the only place in the app where a *viewport* height is read at all, and what it decides is a
 * **state**, never a band: below it the banner and « Garde min » share one 44 px row so the form
 * keeps `664 − 336 − 44 = 284 px`. The policy that spends it is `./collapse.ts`.
 */
export const COMPACT_HEIGHT_PX = 420;

/** `w-72`, and it is **288 px, not 280** — every narrow-screen symptom is downstream of it. */
export const RAIL_WIDTH = 288;

/**
 * § 5's **reference desktop** — the viewport budget C is written for, and now also the width at
 * which the plot stops growing (**amendment F**, `../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md`).
 * It is a width and never a height: what budget C contributes here is its *column*, not its 900 px.
 */
export const REFERENCE_DESKTOP_PX = 1440;

/** Budget C's own chart column: `1440 − 288 = 1152`, `W_inner` **1104**. */
export const REFERENCE_COLUMN_PX: number = REFERENCE_DESKTOP_PX - RAIL_WIDTH;

/**
 * **The plot height's ceiling — amendment F, 2026-08-14.** `0,42 × 1104 = 463,68 px`, the value § 5's
 * aspect rule reaches at {@link REFERENCE_COLUMN_PX}.
 *
 * § 5 asserts two things that collide above its own reference desktop: « every band height is a
 * function of the chart column's inner width » — so the plot grows linearly, without bound — and
 * budget C's *whole* block at 1440 × 900. Past 1440 px of viewport the block therefore outgrows any
 * viewport height, and the measured consequence was that **five ordinary 16:9 desktops opened with no
 * chart at all**: 1280 × 720, 1366 × 768, 1512 × 850, 1600 × 900 and 1920 × 1080 all pinned to an
 * 88 px header beside 632–992 px of empty chart column, 1920 × 1080 missing by **1,3 px** (ticket 28,
 * item 1).
 *
 * The cap is the smallest edit that answers it: **nothing at or below the reference moves** — budget A
 * (`W_inner` 342), budget B (432) and budget C (1104) are byte-identical, letterbox margins included —
 * and only wider columns stop growing. Above it the block is bounded for the first time: its only
 * remaining growth is the strip, which § 5 had already bounded at 200 px, so the whole block plateaus
 * at `44 + 76 + 463,68 + 200 + 44 + 52 = 879,68 px` at any width. **What it costs**: the obtained
 * aspect falls with the width past the reference, and with it VE — down to the ×1 floor on a wide
 * enough screen, which is a **disclosed** badge state and never a silent compression. Voir
 * {@link plotAspect} and {@link PLOT_ASPECT_BAND}.
 */
export const PROFILE_PLOT_MAX: number = PROFILE_ASPECT * innerWidth(REFERENCE_COLUMN_PX);

/**
 * The banner slot's height by line count: 44 px at one line … 76 px at three, which is the 390 px
 * case. **Both consumers spend it as a function of the width** — {@link bannerBudget} for (c), and
 * `BannerSlot`'s two container queries for the rendered slot — so the Skeleton reserves the row
 * *this width* can produce rather than one line of it, which is what § 7's « rank 1's first real
 * occupant lands with **no reflow on hydration** » asks for. It draws nothing in it either way:
 * reserving height is layout, painting a band is a statement, and an empty verdict-coloured band
 * reads as « rien à signaler ».
 */
export const BANNER = { oneLine: 44, twoLines: 60, threeLines: 76 } as const;

/**
 * **The banner slot's height as a function of width, like every other band** — § 5's budget table
 * read down its own column: 76 px at a 390 px column, 60 px at 480, 44 px at 1152. The two
 * thresholds are constants this module already has: B1, and the column width B2 itself produces
 * (`768 − 288`). No new breakpoint, and no line-counting.
 *
 * It exists because {@link chartBlockHeight} needs a *budget* for the slot and the two ways of
 * getting one are both worse. Measuring the rendered occupant would make the collapse a function of
 * the banner's text, which changes on every keystroke. Reserving the three-line height everywhere —
 * which is right for the pinned header's `scroll-margin-top`, where an under-shoot puts the target
 * under the header — is **wrong here, and in the expensive direction**: at 1152 px of column § 5's
 * own table says the banner is one line, so a 76 px term over-states the block by 32 px and collapses
 * a desktop window that would have fitted. **The two defaults differ because the two failures do.**
 */
export function bannerBudget(columnWidth: number): number {
  if (columnWidth >= CELL_WRAP_PX) return BANNER.oneLine;
  return columnWidth >= RAIL_REFLOW_PX - RAIL_WIDTH ? BANNER.twoLines : BANNER.threeLines;
}

/** The chart column's inner width — the one input every band height is a function of. */
export function innerWidth(columnWidth: number): number {
  return columnWidth - 2 * GUTTER;
}

/**
 * The profile's **plot** height: `min(0,42 × W_inner, 463,68)` — § 5's aspect rule under
 * **amendment F**'s ceiling, voir {@link PROFILE_PLOT_MAX}. Below § 5's reference column the `min`
 * is transparent, so all three budgets are the rule's own untouched arithmetic.
 *
 * `min` rather than a branch on the *viewport*, because the invariant is unchanged: this reads a
 * width, and the shell spends the same `min()` in CSS over container-query units — one rule, two
 * consumers, no measurement before the first paint.
 */
export function profilePlotHeight(wInner: number): number {
  return Math.min(PROFILE_ASPECT * wInner, PROFILE_PLOT_MAX);
}

/**
 * The plot's **obtained** aspect — plot height ÷ `W_inner`, which is {@link PROFILE_ASPECT} up to
 * § 5's reference column and falls below it past the cap.
 *
 * It exists because **VE reads the obtained aspect and not the target**: `VE = plot aspect ×
 * (x span / z span)`, so a chart that fed {@link exaggeration} the flat 0,42 while drawing a capped
 * plot would build a z scale taller than its own box and push the cable out of the frame with the
 * badge claiming otherwise. One function, so the drawing and the badge cannot disagree.
 *
 * @param wInner the chart column's inner width, px. A non-positive width has no aspect of its own;
 *   the target is returned so callers never divide by zero. Nothing renders there — the Skeleton
 *   holds until the observer reports.
 */
export function plotAspect(wInner: number): number {
  return wInner > 0 ? profilePlotHeight(wInner) / wInner : PROFILE_ASPECT;
}

/** The profile band's outer height: the plot plus its 76 px of chrome. */
export function profileOuterHeight(wInner: number): number {
  return PROFILE_CHROME_HEIGHT + profilePlotHeight(wInner);
}

/** The clearance strip's outer height: `clamp(0,16 × W_inner, 96, 200)`. */
export function stripOuterHeight(wInner: number): number {
  const raw = STRIP.factor * wInner;
  return raw < STRIP.min ? STRIP.min : raw > STRIP.max ? STRIP.max : raw;
}

/**
 * How many lines the read-out cells wrap to at this chart-column width — the **flex line-breaking
 * rule**, run in arithmetic: a cell joins the current line while the line's bases still fit the
 * column, and starts the next one otherwise. The row spans the whole column, so the column *is* the
 * flex container's width.
 *
 * With {@link READ_OUT_SPANS} at {@link CELL_BASIS_PX}: **one line from 992 px, two from 496,
 * three from 372** (four below it) — a 1280 px laptop and § 5's reference column (1152) keep their
 * single row; budgets A and B gain a third line.
 */
export function cellRows(columnWidth: number): number {
  let rows = 1;
  let used = 0;
  for (const span of READ_OUT_SPANS) {
    const basis = span * CELL_BASIS_PX;
    if (used > 0 && used + basis > columnWidth) {
      rows += 1;
      used = 0;
    }
    used += basis;
  }
  return rows;
}

/**
 * **The whole Chart Block's height, from the chart column's width alone** — the five bands of § 5's
 * budget table, summed: `bandeau + profil + bande de garde + View Strip + cellules`.
 *
 * This is the **left-hand side of collapse condition (c)**, `blockHeight > availableHeight − MIN_RAIL`
 * (`./collapse.ts`), and it is the one place where a height and a viewport meet. **The invariant
 * survives it**: nothing here reads a window height, the result sizes no band — every band is
 * already `var(--w-inner)`-derived in CSS — and what (c) does with the number is pick a *state*.
 * The three budgets it reproduces are the spec's own: 540 at a 390 px column, 561 at 480, 857 at
 * 1152.
 *
 * **It is monotone in the width and, since amendment F, bounded**: both of its width-derived terms
 * have a ceiling now — the plot at {@link PROFILE_PLOT_MAX} and the strip at `STRIP.max` — so the
 * block plateaus at **879,68 px** and stops being able to outgrow every desktop. Below the reference
 * column nothing about it moved.
 *
 * @param columnWidth the chart column's inline size, px — the same number `SharedX` is built from.
 * @param bannerHeight the banner slot's height, px. Defaults to {@link bannerBudget}, which is § 5's
 *   own table row for this width — the tallest occupant that width can produce, so (c) cannot claim
 *   the block fits and then let a blocking summary push the Rail below `MIN_RAIL`.
 */
export function chartBlockHeight(
  columnWidth: number,
  bannerHeight: number = bannerBudget(columnWidth),
): number {
  const wInner = innerWidth(columnWidth);
  return (
    bannerHeight +
    profileOuterHeight(wInner) +
    stripOuterHeight(wInner) +
    VIEW_STRIP +
    cellRows(columnWidth) * CELL_ROW
  );
}

/**
 * § 5's anchor target — « each with a **44 × 48 px** hit target spanning the lane plus the label
 * band ». The 48 is **derived**, {@link PROFILE_CHROME}'s `handleLane + xLabels`: the target *is*
 * those two rows, so it cannot drift from them, and 44 is the coarse-pointer minimum the rider's
 * grab circle already meets.
 */
export const ANCHOR_TARGET = {
  width: 44,
  height: PROFILE_CHROME.handleLane + PROFILE_CHROME.xLabels,
} as const;

/** An anchor's hit target in the Handle Lane, in the profile SVG's own user coordinates. */
export type AnchorTarget = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * One anchor's target, placed. **Entirely below the plot area**, which is the whole point: the
 * anchors are pinned at the domain edges, so at 390 px a 44 px target covers the first and last
 * 12 % of the span and the rider glyph overlaps it whenever `x_D` comes within ~46 m of an anchor.
 * You cannot size your way out of two targets that are always at `x = 0` and `x = L` — putting them
 * in their own lane makes confusing one with the rider geometrically impossible.
 *
 * @param centreX the anchor's x in SVG user units — `SharedX.x(0)` or `SharedX.x(L)`.
 * @param laneTop the Handle Lane's top edge, i.e. the **bottom of the plot area**.
 */
export function anchorTarget(centreX: number, laneTop: number): AnchorTarget {
  return {
    x: centreX - ANCHOR_TARGET.width / 2,
    y: laneTop,
    width: ANCHOR_TARGET.width,
    height: ANCHOR_TARGET.height,
  };
}

// ─── § 5 — One shared x scale object, one `GUTTER`, one inverse ────────────────────────────────

/** The span margin each side of the x domain: `[d_A − 0,05 L, d_B + 0,05 L]`, i.e. `1,1 L` wide. */
export const X_MARGIN = 0.05;

/**
 * **One** x scale object, built once per (chart-column inline size, `L`, terrain source), consumed
 * by **both** SVGs — « v1 build spec » § 5 (*One shared x scale object, one `GUTTER`, one
 * inverse*) and § 4 (*Domaine x partagé*).
 *
 * It exists to retire three measured defects, all of which came from there being **two** scales:
 *
 * | Defect | In the prototype | Cost |
 * | --- | --- | --- |
 * | two independently padded scales | profil `{left 16, right 16}` against strip `{left 24, right 24}` | the axes coincide only at mid-span and diverge to 8 px at each end — **34 m at a 1500 m span**, precisely at the anchors, which is where the drag handles go |
 * | a hand-typed inverse per call site | `(clientX − rect.left − pad.left) / pxPerM` | silently assumes `domain[0] === 0`, so it is wrong by `0,05 L` = **75 m at 1500 m** under the real domain |
 * | a `{900, 420}` observer seed | a 900 px chart drawn in a 390 px box on the first client frame | the seed is `null`, so the Skeleton holds until the first measurement |
 *
 * So: **the inverse is a method on the object, never a formula to retype**, and `gutter` is
 * {@link GUTTER} on both sides of both charts.
 */
export type SharedX = {
  /** The chart column's inline size — the single `ResizeObserver`'s `inlineSize`, in px. */
  readonly width: number;
  /** {@link GUTTER}, left **and** right, identical in both charts. */
  readonly gutter: typeof GUTTER;
  /** `[−0,05 L, 1,05 L]`, in metres from anchor A, clamped to the trace extent. */
  readonly domain: readonly [number, number];
  /** Pixels per metre — `(width − 2·gutter) / (domain span)`. */
  readonly pxPerM: number;
  /** Affine, `domain → [gutter, width − gutter]`, in the SVG's own user coordinates. */
  x(metres: number): number;
  /** **The** inverse, one implementation: a client x and the SVG's `rect.left` back to metres. */
  toMetres(clientX: number, rectLeft: number): number;
};

/**
 * § 4's shared x domain: **`[d_A − 0,05 L, d_B + 0,05 L]`, clamped to the trace extent** — so a
 * whole-trace import makes the domain exactly the trace.
 *
 * It is a function of `(L, terrain source)` alone and **not of the box**, which is why the drawn
 * ground polyline can be built from it before any width is measured. The margin is not decoration:
 * with a domain of exactly `[0, L]`, dragging anchor A inward rescales the chart under the cursor
 * *and* makes the terrain you just excluded vanish. The clearance curve stays undefined outside
 * `[0, L]`, which marks the span's boundaries for free.
 *
 * @param L the span, m. Must be finite and positive: `L ≤ 0` is § 4's degenerate placement, which
 *   the form blocks with « L doit être > 0 » and `[ Inverser A et B ]`, so reaching the scale with
 *   it is a caller bug of `sampleCable`'s class rather than a state to render.
 * @param extent the terrain's own horizontal extent in the **span frame** (metres from anchor A),
 *   or `null` in manual mode, where the ground is the straight line between the two anchor bases.
 * @throws RangeError when `L` is not finite and positive.
 */
export function xDomain(
  L: number,
  extent: { min: number; max: number } | null = null,
): [number, number] {
  if (!Number.isFinite(L) || L <= 0) {
    throw new RangeError(`xDomain: L must be finite and > 0, got ${L}`);
  }
  const margin = X_MARGIN * L;
  const lo = extent === null ? -margin : Math.max(-margin, extent.min);
  const hi = extent === null ? L + margin : Math.min(L + margin, extent.max);
  // A trace clamped to nothing would collapse the domain; the span itself is always drawable.
  return hi > lo ? [lo, hi] : [-margin, L + margin];
}

/**
 * Build the shared scale.
 *
 * @param width the chart column's inline size, px. The plot is `width − 2·GUTTER` wide, which is
 *   § 5's `W_inner` and therefore the same number the band heights are computed from.
 * @param L the span, m — voir {@link xDomain}.
 * @param extent the terrain's horizontal extent in the span frame, or `null` in manual mode.
 * @throws RangeError when `L` is not finite and positive.
 */
export function createSharedX({
  width,
  L,
  extent = null,
}: {
  width: number;
  L: number;
  extent?: { min: number; max: number } | null;
}): SharedX {
  const domain = xDomain(L, extent);

  // The plot floors at 1 px so the scale stays finite and invertible at a column narrower than its
  // own gutters. B2 has already restored a full-width track at 390 px, so this is a guard on the
  // arithmetic, not a layout anyone reaches.
  const plot = Math.max(1, width - 2 * GUTTER);
  const pxPerM = plot / (domain[1] - domain[0]);

  return {
    width,
    gutter: GUTTER,
    domain,
    pxPerM,
    x(metres: number): number {
      return GUTTER + (metres - domain[0]) * pxPerM;
    },
    toMetres(clientX: number, rectLeft: number): number {
      return domain[0] + (clientX - rectLeft - GUTTER) / pxPerM;
    },
  };
}

// ─── § 5 — Vertical exaggeration: the aspect identity, the band, and the ×1 floor ──────────────

/**
 * The plot's vertical margin, **each side** of the drawn z extent — so the z **domain** is the data
 * span × `1 + 2·Z_MARGIN`. This is the factor § 5's `k` table was computed with: `k` = 11,089 for
 * z1 is `1,1 × 100 / (1,24 × 8,0)`.
 */
export const Z_MARGIN = 0.12;

/** The **published** vertical-exaggeration range: the ×1 floor, and the band ceiling's ×5,54. */
export const VE_BAND = { min: 1, max: 5.5 } as const;

/**
 * The strip's policy band — the guard on {@link STRIP}, whose own floor sits 24 px above it because
 * 96 px is a touch lane. Written down because **what broke here was a rule with no guard**.
 */
export const STRIP_POLICY_BAND = { min: 72, max: 200 } as const;

/** Which of § 5's three badge rows is in force. The badge is chart furniture, not a footnote. */
export type VeBadgeState =
  /** Auto-fit ordinaire — « Éch. verticale ×4,7 », and the peek control is active. */
  | "auto"
  /** The ×1 clamp is in force and everything still fits — peek **disabled, already in force**. */
  | "true-scale"
  /**
   * The clamp is in force and the sag leaves the frame — « · câble hors cadre ». The peek is disabled
   * where the **data** put the cable out of frame and **enabled** where the cap did, which is one bit
   * this three-row state cannot carry: voir {@link ClipCause} and {@link peekMode}.
   */
  | "true-scale-clipped";

/**
 * **What cut the picture** — `null` when nothing is cut. § 5's third badge row says it is « reachable
 * **from the data, not from the box** »; under **amendment F**'s cap that stopped being true, so the
 * two are told apart rather than merged (amendment F, cost 2, and the user's **decision 4** of
 * 2026-08-14).
 *
 * - `"data"` — the line is slack enough to leave the frame at § 5's own {@link PROFILE_ASPECT}. This
 *   is § 5's « mou profond » row, and § 5's self-limiting argument still holds for it: every such
 *   case inside the admissible envelope is already a ground-contact case.
 * - `"box"` — the same line would have been **whole** at {@link PROFILE_ASPECT} and is cut only
 *   because the cap froze the plot at {@link PROFILE_PLOT_MAX}. Measured on a healthy line with
 *   metres to spare, at a ~2295 px viewport and up.
 */
export type ClipCause = "box" | "data" | null;

/**
 * What holding « ×1 vraie échelle » may show — voir {@link peekMode}.
 *
 * - `"true-scale"` — § 5's own peek: the resting drawing is exaggerated, the hold shows ×1.
 * - `"fit"` — the mirror case the user's **decision 4** re-enables: the resting drawing *is* ×1 and
 *   the cap has cut the cable out of it, so the hold shows the whole cable at the auto-fit scale.
 * - `"off"` — the control is disabled, because there is nothing it could show that is not already
 *   on screen.
 */
export type PeekMode = "off" | "true-scale" | "fit";

/**
 * The clamp state the peek policy is a function of, and nothing else about the drawing —
 * {@link peekMode}'s whole input.
 */
export type ClampState = {
  /** Is the ×1 floor holding the drawing up? */
  readonly clamped: boolean;
  /** What cut the picture, if anything did. */
  readonly clipCause: ClipCause;
};

/**
 * **What the peek control may show, from the clamp state alone** — the user's **decision 4** of
 * 2026-08-14, which re-enables it « where the clamp cuts the cable ».
 *
 * § 5's rule was « **disabled whenever the ×1 clamp is already in force** » (badge rows 2 and 3),
 * and its reason is exact: the control *shows ×1*, so with the clamp holding the drawing at ×1 the
 * press changes nothing. That reason survives row 2 untouched — nothing is cut there, so there is
 * nothing to reveal — and it survives the **data**-reachable clip of row 3, where the cut is the
 * line's own truth and arrives with a ground-contact verdict.
 *
 * What it does **not** survive is amendment F's cost 2: with the plot frozen at
 * {@link PROFILE_PLOT_MAX} a perfectly healthy line is cut by the *box*, with no ground contact and
 * no verdict banner, and « the picture is never cut without the banner saying the line is on the
 * ground » no longer holds. There the hold has something to show — the whole cable — and the only
 * scale that can show it is the auto-fit the floor is refusing, since the x domain may not be
 * widened (§ 5) and the plot's height may not read the window (§ 5, amendment F). Hence `"fit"`, and
 * hence the peek is the **only** control whose meaning the cap changes.
 *
 * **It is a pure function of the clamp state, but not of {@link VeBadgeState} alone**: § 5's three
 * badge rows cannot tell a box clip from a data clip, and they are frozen — so the extra bit is
 * {@link ClipCause}, which {@link exaggeration} already has everything it needs to compute. No
 * signature is widened for it, and the badge keeps three rows.
 */
export function peekMode(clamp: ClampState): PeekMode {
  if (!clamp.clamped) return "true-scale";
  return clamp.clipCause === "box" ? "fit" : "off";
}

/** What the badge shows and what the peek control may do. Recomputed on every render. */
export type Exaggeration = {
  /** `max(autofit, 1)` — the factor the z scale is actually drawn at. */
  readonly ve: number;
  /** What the aspect identity asks for, before the floor. Below 1 it would **compress**. */
  readonly autofit: number;
  /** Is the ×1 floor holding the drawing up? */
  readonly clamped: boolean;
  /** Metres of z the plot can show at {@link ve}. Equal to the padded domain when unclamped. */
  readonly zVisibleSpan: number;
  /** § 5's three-row badge state. */
  readonly state: VeBadgeState;
  /** Whether the cut — when there is one — came from the box or from the data. */
  readonly clipCause: ClipCause;
  /** What a hold shows: {@link peekMode} of this same clamp state. */
  readonly peek: PeekMode;
  /**
   * The control's `disabled`, i.e. `peek !== "off"` — § 5's « **disabled whenever the ×1 clamp is
   * already in force** », **less the box-induced clip the user's decision 4 hands back** to it. Kept
   * beside {@link peek} because « can it be pressed » is what the browser evidence in tickets 29, 30
   * and 35 reads off the rendered button, and it is derived from the mode rather than decided twice.
   */
  readonly peekEnabled: boolean;
};

/**
 * > **`VE = plot aspect × (x-domain span / z-domain span)`**, where *plot aspect* is
 * > `plot inner height / plot inner width`.
 *
 * **Vertical exaggeration does not depend on pixel size at all** — only on the plot's aspect ratio
 * and the scenario's own flatness — which is what makes it a `node` unit test and what convicts the
 * prototype: `flex-[3]`/`flex-1` made the aspect a function of *window height*, and the desktop was
 * already out of budget at ×5,02.
 *
 * **VE never compresses.** The floor is `max(autofit, 1)`, and it is its own disclosed badge state
 * rather than a silent clamp, because **compressing the sag in a clearance tool is the same class
 * of error as exaggerating it and worse — it reads safe.** {@link ve} is what the chart rests at, and
 * it is never below 1; the one drawing below true scale the app can produce is the `"fit"` peek of
 * {@link peekMode}, which is **never persisted** — no Session key, no URL key, gone on reload — and
 * prints its own factor and « sous la vraie échelle » in the badge — voir {@link peekBadgeLabel}.
 * It is *held* on a fine pointer and **latched until the next press** from the keyboard and under
 * `(pointer: coarse)`, which is § 5's own toggle semantics; either way it is released the moment the
 * mode leaves `"fit"` (`src/components/chart/chart-block.tsx`).
 *
 * @param plotAspect plot inner height ÷ plot inner width; {@link PROFILE_ASPECT} by construction.
 * @param xSpan the shared domain's width, m — `1,1 L`, or the trace where it clamps.
 * @param zDataSpan the drawn z extent, m, **before** the ±12 % margin.
 */
export function exaggeration({
  plotAspect,
  xSpan,
  zDataSpan,
}: {
  plotAspect: number;
  xSpan: number;
  zDataSpan: number;
}): Exaggeration {
  // A perfectly flat line has no z extent of its own; the margin is a fraction of it, so the domain
  // would collapse. Auto-fit is unbounded above here and the ×1 floor cannot help, so the ceiling
  // is the band's own: a degenerate span is drawn at the flattest legal scale, never at ∞.
  const zDomainSpan = zDataSpan * (1 + 2 * Z_MARGIN);
  const autofit = zDomainSpan > 0 ? (plotAspect * xSpan) / zDomainSpan : VE_BAND.max;
  const ve = Math.max(autofit, VE_BAND.min);
  const clamped = autofit < VE_BAND.min;
  const zVisibleSpan = (plotAspect * xSpan) / ve;
  // Row 2 against row 3: the ±12 % margin absorbs a clamp down to `1/1,24`, so « tout tient dans le
  // cadre » is reachable and the clip is judged against the **data**, never against the padded
  // domain. Below that the belly of the cable leaves the frame downward, marked at the clip.
  const clipped = clamped && zVisibleSpan < zDataSpan;
  // **What cut it**, which is one comparison and not a new input: at ×1 the plot shows `plotAspect ×
  // xSpan` metres of z, so the clip condition is `plotAspect × xSpan < zDataSpan` — and the same line
  // measured against § 5's own target aspect says whether the *cap* is what put it out of frame. The
  // cap can only ever lower the aspect, so `"box"` is exactly « whole at 0,42, cut here ».
  const clipCause: ClipCause = !clipped
    ? null
    : PROFILE_ASPECT * xSpan < zDataSpan
      ? "data"
      : "box";
  const peek = peekMode({ clamped, clipCause });

  return {
    ve,
    autofit,
    clamped,
    zVisibleSpan,
    state: clipped ? "true-scale-clipped" : clamped ? "true-scale" : "auto",
    clipCause,
    peek,
    peekEnabled: peek !== "off",
  };
}

/** The profile's **second** hand-written affine scale: metres of altitude to SVG user units. */
export type ZScale = {
  /** Pixels per metre of z. Divided by {@link SharedX.pxPerM} this **is** the exaggeration. */
  readonly pxPerM: number;
  /** Affine, metres from anchor A's top → SVG y, downward. */
  y(metres: number): number;
};

/**
 * The z axis, built from the x axis and the exaggeration rather than from a domain of its own —
 * which is the identity read forwards: `pxPerM_z = VE × pxPerM_x`.
 *
 * The drawn z extent is **centred** in the plot, so the ×1 clamp spends its overflow symmetrically
 * and the belly of a clipped cable leaves the frame downward where the badge says it does.
 *
 * @param plotTop the plot area's top edge in SVG user units — the badge lane's height.
 * @param plotHeight `0,42 × W_inner`.
 * @param centre the midpoint of the drawn z extent, m.
 * @param pxPerMx {@link SharedX.pxPerM}, so that the two axes stay one identity apart.
 * @param ve the exaggeration actually in force, floor included.
 */
export function createZScale({
  plotTop,
  plotHeight,
  centre,
  pxPerMx,
  ve,
}: {
  plotTop: number;
  plotHeight: number;
  centre: number;
  pxPerMx: number;
  ve: number;
}): ZScale {
  const pxPerM = ve * pxPerMx;
  const middle = plotTop + plotHeight / 2;
  return {
    pxPerM,
    y(metres: number): number {
      return middle - (metres - centre) * pxPerM;
    },
  };
}

/**
 * The badge's text — « Éch. verticale ×4,7 », « … ×1 — vraie échelle », « … · câble hors cadre ».
 *
 * The clamped rows read « ×1 » and never « ×1,0 »: the floor is exact, and a decimal on it would
 * suggest a measurement where there is a rule.
 */
export function veBadgeLabel(exaggerationValue: Exaggeration): string {
  if (exaggerationValue.state === "auto") {
    return `Éch. verticale ×${exaggerationValue.ve.toFixed(1).replace(".", ",")}`;
  }
  const base = "Éch. verticale ×1 — vraie échelle";
  return exaggerationValue.state === "true-scale-clipped" ? `${base} · câble hors cadre` : base;
}

/**
 * The badge's text **while the peek is held** — the badge describes *what is drawn*, so the hold says
 * so in the same lane and the same words the resting rows use.
 *
 * Two modes, because {@link peekMode} has two:
 *
 * - `"true-scale"` — § 5's own peek, « Éch. verticale ×1 — vraie échelle » and never « ×1,0 ».
 * - `"fit"` — the user's **decision 4** hold, which draws the whole cable at {@link
 *   Exaggeration.autofit} and is therefore **below true scale**. That is the one drawing in the app
 *   that compresses, so the badge names both halves of it: the factor, « sous la vraie échelle », and
 *   « câble entier » where the resting row read « câble hors cadre ». It is reachable only under the
 *   control — **held** on a fine pointer, **latched until the next press** from the keyboard and on a
 *   coarse pointer — and the printed « Garde min » — § 5's non-positional signal — is unaffected by
 *   any of it.
 *
 * One decimal like the auto rows, and the factor cannot round to « ×0,0 » in this mode: `"fit"`
 * requires the same line to be whole at {@link PROFILE_ASPECT}, i.e. `k ≥ 1 / (1,24 × 0,42)` = 1,92,
 * and the cap holds `plotAspect` above 0,1 at any column a browser can produce.
 */
export function peekBadgeLabel(exaggerationValue: Exaggeration): string {
  if (exaggerationValue.peek !== "fit") return "Éch. verticale ×1 — vraie échelle";
  const factor = exaggerationValue.autofit.toFixed(1).replace(".", ",");
  return `Éch. verticale ×${factor} — sous la vraie échelle · câble entier`;
}

// ─── The clearance strip's vertical domain — quantised, with a reserved negative band ──────────

/**
 * How many `step`s the positive side aims to hold. The ladder picks `step` from `hi / 3`, so a
 * healthy strip carries three or four grid lines' worth of garde and never a prime-numbered axis.
 */
export const CLEARANCE_STEPS = 3;

/**
 * The reference domain drawn when there is **no curve at all** — « Aucun résultat », or a Clearance
 * Gate breach. `strip.tsx`'s own rule is « it never stops being a pointer surface »; before this
 * constant existed the empty case collapsed to `[0, 0]`, the zero line fell onto the frame's bottom
 * edge and every tick was dropped, so the strip kept the *track* and lost the *axes*.
 */
export const CLEARANCE_EMPTY = { step: 2, top: 4 } as const;

/** The strip's y domain and the ticks drawn on it — {@link clearanceDomain}. */
export type ClearanceDomain = {
  /** The tick grid's spacing, m — a 1-2-5 ladder value, never a data extreme. */
  readonly step: number;
  /** The domain's top, m: a whole number of {@link step}s at or above the worst garde. */
  readonly top: number;
  /** The domain's floor, m — negative. `−step` at rest, deeper only when a violation needs it. */
  readonly floor: number;
  /** The ticks to label, top → floor. Zero is drawn by the strip itself and is never in here. */
  readonly ticks: readonly number[];
  /** No finite value was given: this is {@link CLEARANCE_EMPTY}'s reference domain. */
  readonly empty: boolean;
};

/** The 1-2-5 decade ladder, rounding **outward** — `1,76 → 2`, `6,1 → 10`, `0,04 → 0,05`. */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return CLEARANCE_EMPTY.step;
  const decade = 10 ** Math.floor(Math.log10(raw));
  const mantissa = raw / decade;
  const rounded = mantissa <= 1 ? 1 : mantissa <= 2 ? 2 : mantissa <= 5 ? 5 : 10;
  return rounded * decade;
}

/**
 * **The strip's y domain, quantised** — ticket 39, items 1, 2 and 4, and the user's decisions of
 * 2026-08-17.
 *
 * What this replaces was `lo = min(0, …values)`, `hi = max(0, …values)` mapped edge to edge, and it
 * failed in three ways that are one failure: **the axis was the data**. With no violation `lo` was
 * exactly 0, so the zero line *was* the frame's bottom edge and read as furniture rather than as the
 * threshold the whole chart exists to show; the instant one step went negative the baseline lifted
 * and the entire curve jumped, which is **a scale change presented as a data change**; and the ticks
 * were the extremes themselves, so they changed on every keystroke in the Rail and two scenarios
 * whose gardes differ by a factor of four drew the same picture.
 *
 * The rule instead:
 *
 * - **`step` comes off a 1-2-5 ladder**, sized so the positive side holds ~{@link CLEARANCE_STEPS}
 *   of them, and `top` is a whole number of steps at or above the worst garde. The axis therefore
 *   changes in **discrete jumps** a reader can notice, and its labels are round.
 * - **A negative band is always reserved**, `−step` deep, whether or not anything violates. That is
 *   what nails zero to a constant pixel *per grid* and removes the jump. It costs the positive side
 *   a quarter of the band — ~13 px at § 5's 96 px floor — and the strip is a categorical
 *   zero-crossing device with a printed « Garde min » beside it, so resolution is the cheaper thing
 *   to spend.
 * - **The floor extends downward in whole steps** when a violation is deeper than the reserved band.
 *   Zero moves *then* — rarely, and when it does the movement is itself the news.
 * - **The floor tick is labelled only when something violates.** § 5's clearance failure is four
 *   coordinated signals firing on a crossing; labelling the danger side before anything enters it
 *   spends the alarm early. This is the one place two of the day's decisions collided — the empty
 *   state was specified as « 4 m / 2 / 0 / −2 » — and the general rule won, so the reference domain
 *   draws « 4 m / 2 / 0 » over a reserved but unlabelled band.
 *
 * No `d3-scale` and no charting library (`docs/conventions/ui.md` § charts): the ladder is eleven
 * lines and the mapping to pixels stays in the strip, which is the only thing that knows its height.
 *
 * @param values the finite per-step gardes, m. Holes are dropped by the caller; a `null`-only
 *   traverse and « Aucun résultat » are the same input here — none.
 * @param wide chart column ≥ B1, the same threshold the caption shortens at. Narrow drops the mid
 *   tick and nothing else: a violation's floor is labelled at every width.
 */
export function clearanceDomain({
  values,
  wide,
}: {
  values: readonly number[];
  wide: boolean;
}): ClearanceDomain {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    const { step, top } = CLEARANCE_EMPTY;
    return {
      step,
      top,
      floor: -step,
      ticks: wide ? [top, top / 2] : [top],
      empty: true,
    };
  }

  const hi = Math.max(0, ...finite);
  const lo = Math.min(0, ...finite);
  // The ladder is sized on the whole excursion, not on `hi` alone: a line 40 m under the ground has
  // no positive side to scale from, and its grid should still be readable.
  const step = niceStep(Math.max(hi, -lo) / CLEARANCE_STEPS);
  const top = Math.max(step, Math.ceil(hi / step) * step);
  const floor = lo < -step ? -Math.ceil(-lo / step) * step : -step;

  const ticks = wide ? [top, top / 2] : [top];
  return {
    step,
    top,
    floor,
    // Labelled only under violation — voir the docblock's fourth rule.
    ticks: lo < 0 ? [...ticks, floor] : ticks,
    empty: false,
  };
}

/**
 * A tick's label — « 6 m » on the topmost, « 3 » and « −2 » below it.
 *
 * **Not `formatValue("clearance", …)`**, which is pinned at two decimals and would print « 6,00 »,
 * defeating the quantisation: `docs/conventions/typescript.md`'s display-precision contract governs
 * *values the user reads as data* — a prefill writes the displayed value into state and the
 * stale-Override badge compares at display precision — and an axis tick is neither. It is chrome,
 * so it gets a chrome formatter, and it lives here rather than in `strip.tsx` only so the ladder and
 * its labels are pinned by the same `node` fixture.
 *
 * The unit rides the **top tick alone**: that is what discloses the scale — the gate's « stated
 * somewhere the user can read » — and it is why no VE-style badge is needed here. There is no
 * distortion factor to name once the axis says « 6 m ».
 *
 * @param tick the tick's value, m.
 * @param withUnit true for the topmost tick only.
 */
export function clearanceTickLabel(tick: number, withUnit: boolean): string {
  const rounded = Math.round(tick * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed((rounded * 10) % 1 === 0 ? 1 : 2);
  return `${text.replace(".", ",").replace("-", "−")}${withUnit ? " m" : ""}`;
}
