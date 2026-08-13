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

/** The guard on {@link PROFILE_ASPECT}: an aspect outside it is a layout bug, not a taste. */
export const PLOT_ASPECT_BAND = { min: 0.35, max: 0.5 } as const;

/**
 * The clearance strip's outer height: `clamp(0,16 × W_inner, 96, 200)`. The 96 px floor sits 24 px
 * above the policy floor of 72 px **deliberately, because 96 px is a touch lane** — 66 px of drawn
 * curve, and the whole SVG is the hit surface, over twice the 44/48 px minimum.
 */
export const STRIP = { factor: 0.16, min: 96, max: 200 } as const;

/** One touch-height row: the layer toggles, « ×1 vraie échelle » and the typed `x`. */
export const VIEW_STRIP = 44;

/** One read-out cell row. Two rows below {@link CELL_WRAP_PX}, one above. */
export const CELL_ROW = 52;

/**
 * B1 — « the read-out row can no longer fit five values », in **chart-column** width, not viewport:
 * the 288 px rail means the chart column is never the viewport, so this is a container query. The
 * *value* binds and not the label — `font-mono text-lg` needs ≈605 px for five cells.
 */
export const CELL_WRAP_PX = 600;

/** B2 — « an aspect-legal profile cannot coexist with the rail », in **viewport** width. */
export const RAIL_REFLOW_PX = 768;

/** The Rail Header's height, and the height of the app bar `__root.tsx` therefore cannot afford. */
export const RAIL_HEADER = 44;

/** The floor the resting rail must clear. Measured slack at 390×664 is 124 px, which is not this. */
export const MIN_RAIL = 120;

/** `w-72`, and it is **288 px, not 280** — every narrow-screen symptom is downstream of it. */
export const RAIL_WIDTH = 288;

/**
 * The banner slot's height by line count: 44 px at one line … 76 px at three, which is the 390 px
 * case. The Skeleton reserves the **one-line** height and draws nothing in it — reserving height is
 * layout, painting a band is a statement, and an empty verdict-coloured band reads as « rien à
 * signaler ».
 */
export const BANNER = { oneLine: 44, twoLines: 60, threeLines: 76 } as const;

/** The chart column's inner width — the one input every band height is a function of. */
export function innerWidth(columnWidth: number): number {
  return columnWidth - 2 * GUTTER;
}

/** The profile's **plot** height: `0,42 × W_inner`. */
export function profilePlotHeight(wInner: number): number {
  return PROFILE_ASPECT * wInner;
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

/** How many rows the five read-out cells take at this chart-column width — B1. */
export function cellRows(columnWidth: number): 1 | 2 {
  return columnWidth >= CELL_WRAP_PX ? 1 : 2;
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
  /** The clamp is in force and the sag leaves the frame — « · câble hors cadre », peek disabled. */
  | "true-scale-clipped";

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
  /** « ×1 vraie échelle » is **disabled whenever the clamp is already in force**. */
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
 * of error as exaggerating it and worse — it reads safe.**
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

  return {
    ve,
    autofit,
    clamped,
    zVisibleSpan,
    state: clipped ? "true-scale-clipped" : clamped ? "true-scale" : "auto",
    peekEnabled: !clamped,
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
