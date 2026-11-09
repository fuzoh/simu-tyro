/**
 * Where the rider's two-line annotation (« garde au sol » / « écart à vide ») goes around the
 * handle. Pure and in SVG user units, so a `node` test reaches it; the chart only draws the answer.
 *
 * The annotation is a small box beside the handle. The loaded line runs through the handle, so on a
 * V's bottom the rising branch crosses the box that sits on the same side: the rule picks the
 * quadrant (right or left of the handle, above or below it) whose box the drawn line, its
 * parallel Brin porteur strokes and the ground do not touch, inside the plot. The preferred order is
 * the historical one — right and above — and a quadrant only loses on a real collision.
 */

/** A polyline in SVG user units: `xs` increasing. */
export type PixelLine = { readonly xs: ArrayLike<number>; readonly ys: ArrayLike<number> };

export type TipPlacement = { readonly left: boolean; readonly below: boolean };

/** Distance from the handle's centre to the text, px. */
const GAP = 14;
/** Line pitch, px, and the text's ascent above and descent below a baseline. */
const PITCH = 13;
const ASCENT = 10;
const DESCENT = 3;
/** Clearance kept between a stroke and the text, px. */
const MARGIN = 4;
/** Sampling step along x when testing a box against a line, px. */
const STEP = 2;
/** A quadrant that leaves the plot never beats one that merely touches a line. */
const OUT_OF_PLOT = 1e6;

function yAt(line: PixelLine, at: number): number {
  const { xs, ys } = line;
  const last = xs.length - 1;
  if (last < 0) return Number.NaN;
  if (at <= xs[0]) return ys[0];
  if (at >= xs[last]) return ys[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= at) lo = mid;
    else hi = mid;
  }
  return ys[lo] + ((at - xs[lo]) / (xs[hi] - xs[lo])) * (ys[hi] - ys[lo]);
}

/**
 * The vertical extent of the box, for a handle at `y` and `lines` lines. `first` is the first
 * baseline, the same number the JSX draws at.
 */
export function tipRows(
  y: number,
  lines: number,
  below: boolean,
): { first: number; top: number; bottom: number } {
  const first = below ? y + 20 : y - 8 - PITCH * (lines - 1);
  return { first, top: first - ASCENT, bottom: first + PITCH * (lines - 1) + DESCENT };
}

export function placeTip({
  x,
  y,
  width,
  plot,
  lines,
  tipWidth,
  cable,
  offsets = [0],
  ground = null,
  others = [],
}: {
  /** The handle's centre. */
  x: number;
  y: number;
  /** The SVG's width. */
  width: number;
  plot: { top: number; height: number };
  /** How many text lines the annotation has. */
  lines: number;
  /** The text's rough width. */
  tipWidth: number;
  /** The loaded line, drawn once per `offsets` entry shifted down by that many px. */
  cable: PixelLine | null;
  offsets?: readonly number[];
  /** The ground's outline: the box must stay above it. */
  ground?: PixelLine | null;
  /** Other drawn lines — the unloaded line, the A–B chord — that the text must not cross either. */
  others?: readonly PixelLine[];
}): TipPlacement {
  const plotBottom = plot.top + plot.height;
  const order: TipPlacement[] = [
    { left: false, below: false },
    { left: false, below: true },
    { left: true, below: false },
    { left: true, below: true },
  ];
  let best = order[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of order) {
    const { top, bottom } = tipRows(y, lines, candidate.below);
    const from = candidate.left ? x - GAP - tipWidth : x + GAP;
    const to = candidate.left ? x - GAP : x + GAP + tipWidth;
    let score = 0;
    if (from < 0 || to > width || top < plot.top || bottom > plotBottom) score += OUT_OF_PLOT;
    for (let at = from; at <= to; at += STEP) {
      if (cable !== null) {
        const base = yAt(cable, at);
        for (const offset of offsets) {
          const stroke = base + offset;
          if (stroke >= top - MARGIN && stroke <= bottom + MARGIN) score += 1;
        }
      }
      for (const other of others) {
        const stroke = yAt(other, at);
        if (stroke >= top - MARGIN && stroke <= bottom + MARGIN) score += 1;
      }
      if (ground !== null && bottom + MARGIN > yAt(ground, at)) score += 1;
    }
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
