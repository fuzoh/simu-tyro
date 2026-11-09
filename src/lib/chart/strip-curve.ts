/**
 * Which stroke of the clearance strip draws which point of its curve. Pure, so a `node` test
 * reaches it; `components/chart/strip.tsx` samples the curve and draws the answer.
 *
 * The curve is two strokes over one point set, and d3's `line().defined()` draws a segment only
 * between two **consecutive** defined points. So wherever a point leaves one stroke for the other,
 * some point must belong to both, or the curve breaks there:
 *
 * - **At a zero crossing**, a point is inserted on the zero line and belongs to both — the
 *   `foreground` stroke where the passager is above the ground, the `destructive` one and its red
 *   fill where they are in it.
 * - **At a Zone d'ancrage's edge** (#106) the judged and unjudged halves meet. Inside a zone nothing
 *   is judged, so the curve is `foreground` whatever its sign and no red starts there. A negative
 *   curve on both sides of the edge has no crossing to share, so its first (or last) judged point is
 *   **also** given to the `foreground` stroke: that stroke reaches it from the zone, the red one
 *   leaves from it, and no red is drawn on the zone's side of it.
 */

/**
 * One point of the curve: a rider position, the garde **under the rider** there (`y`), the line's
 * envelope minimum at that same step (`envelope`), and whether that position is judged at all —
 * `false` inside a Zone d'ancrage (#106) — or a hole where a step failed.
 */
export type StripSample = {
  readonly x: number;
  readonly y: number | null;
  readonly envelope: number | null;
  readonly judged: boolean;
  /** A judged point at a zone's edge, which the `foreground` stroke reaches as well. */
  readonly bridge?: boolean;
};

/** Does the `foreground` stroke draw this point? Above the ground, or anywhere in a zone. */
export function onPlainStroke(point: StripSample): boolean {
  return point.y !== null && (point.y >= 0 || !point.judged || point.bridge === true);
}

/** Do the `destructive` stroke and the red fill draw it? In the ground, at a judged position. */
export function onDeficitStroke(point: StripSample): boolean {
  return point.y !== null && point.y <= 0 && point.judged;
}

/**
 * The curve with a point inserted at every zero crossing of `y`, so the red and the `foreground`
 * strokes meet exactly on the zero line instead of stopping one sample short of it. A hole on
 * either side is not a crossing. A crossing is judged when its negative side is, so the red
 * starts on the zero line even when the positive side lies in a zone — and never when the side
 * in the ground is a zone's.
 */
function withZeroCrossings(points: readonly StripSample[]): StripSample[] {
  const out: StripSample[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const previous = points[i - 1];
    if (
      previous !== undefined &&
      previous.y !== null &&
      point.y !== null &&
      previous.y < 0 !== point.y < 0 &&
      previous.y !== 0 &&
      point.y !== 0
    ) {
      const t = previous.y / (previous.y - point.y);
      const negative = previous.y < 0 ? previous : point;
      out.push({
        x: previous.x + t * (point.x - previous.x),
        y: 0,
        envelope: null,
        judged: negative.judged,
      });
    }
    out.push(point);
  }
  return out;
}

/** Only on the red stroke: a point the `foreground` one cannot reach. */
function redOnly(point: StripSample): boolean {
  return onDeficitStroke(point) && !onPlainStroke(point);
}

/** Only on the `foreground` stroke. */
function plainOnly(point: StripSample): boolean {
  return onPlainStroke(point) && !onDeficitStroke(point);
}

/**
 * The strip's curve, ready to draw: the zero crossings inserted, and every judged point that would
 * otherwise leave a one-sample gap at a zone's edge bridged onto the `foreground` stroke.
 *
 * @param points the sampled curve, in increasing `x`, holes included.
 */
export function stripCurve(points: readonly StripSample[]): StripSample[] {
  const out = withZeroCrossings(points);
  for (let i = 1; i < out.length; i++) {
    const previous = out[i - 1];
    const point = out[i];
    // The judged side of the pair is the one bridged, so no red is ever drawn into the zone.
    if (plainOnly(previous) && redOnly(point)) out[i] = { ...point, bridge: true };
    else if (redOnly(previous) && plainOnly(point)) out[i - 1] = { ...previous, bridge: true };
  }
  return out;
}
