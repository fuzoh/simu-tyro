/**
 * The Vent's **profile along the line** (#120) — `docs/simulation-theory.md` §8.4, *Prescribed wind
 * profile along the line*: how the speed of the entered wind varies between the anchors. A scenario
 * the user prescribes, **never a valley forecast**: two typed parameters, one fixed shape, no
 * coefficient and no safety factor.
 *
 * Rules this module exists to keep:
 *
 * - **The speed is scaled, never a force.** `U(ξ) = V·[(1 − α) + α·φ(ξ)]` is a wind speed; what it
 *   does to a line or a rider is its reader's own law, applied to the local `U`.
 * - **Evaluated locally, or not at all.** There is no mean speed here and no span-wide multiplier,
 *   so a reader cannot take one by mistake: {@link windAt} answers for one `x`.
 * - **One field for every reader.** It depends on the horizontal abscissa `x` of §2 alone — not on
 *   the height, the lateral position, the material coordinate or the deflected shape — so the line
 *   being posed, the line under wind and the rider read the same wind at the same `x`.
 * - **Outside the span is the reader's case.** `x ∉ [0, L]` is outside the profile's domain and
 *   raises: nothing here clamps, and the fractional power is never extrapolated. A reader that can
 *   leave the span says what it reads there, explicitly.
 * - **C¹ and no more.** `φ'` is zero at mid-span and at both anchors over the whole width domain,
 *   and `φ''` is unbounded at mid-span for widths 10–24 %: a solver must not assume it bounded.
 * - **The exact cases are exact.** A uniform profile returns the entered speed bit for bit, the
 *   anchors and mid-span are evaluated without a trigonometric residue, and no wind is `0`, never
 *   `-0`.
 */

import type { WindComponents } from "./wind.ts";

import { windComponents } from "./wind.ts";

/**
 * The profile's two parameters, **in percent** as §8.4 states them: their closed domains, and what
 * the app ships — a uniform wind, with the width a first attenuation would be read at.
 */
export const WIND_PROFILE = {
  /** Largeur à mi-atténuation, % of the horizontal span. */
  width: { min: 10, max: 90, shipped: 50 },
  /** Atténuation aux ancrages, % of the speed at mid-span. */
  attenuation: { min: 0, max: 100, shipped: 0 },
} as const;

/** §8.4's two parameters, in percent. */
export type WindProfile = {
  /**
   * Largeur à mi-atténuation `w`, % of the horizontal span: the distance between the two points
   * where the speed is halfway between the speed at mid-span and the speed at the anchors.
   */
  readonly width: number;
  /**
   * Atténuation aux ancrages `a`, %: how far the speed at both anchors sits below the speed at
   * mid-span. `0` is a uniform wind, `100` a wind that is nil at the anchors.
   */
  readonly attenuation: number;
};

/** The wind as a field along the line: what a spatial reader (#127) is given. */
export type WindField = {
  /** The entered speed, which is the speed at mid-span, m/s (≥ 0). */
  readonly speed: number;
  /** The azimuth the wind comes from, degrees clockwise from north — the same along the line. */
  readonly from: number;
  readonly profile: WindProfile;
};

function requireWithin(
  caller: string,
  name: string,
  value: number,
  { min, max }: { readonly min: number; readonly max: number },
): void {
  // Written so that `NaN` fails too.
  if (!(value >= min && value <= max)) {
    throw new RangeError(`${caller}: ${name} must lie in [${min}, ${max}], got ${value}`);
  }
}

/**
 * §8.4's `φ(ξ) = cos²((π/2)·h(χ^p))`, with `χ = |2ξ − 1|`, `h(t) = sin²(π·t/2)` and
 * `p = ln 2 / ln(1/λ)`: `1` at mid-span, `0` at both anchors, `1/2` where `χ = λ`.
 *
 * @param xi `ξ = x/L`, the share of the horizontal span from A.
 * @param width `w`, % of the span.
 * @throws RangeError when `ξ ∉ [0, 1]` or `w ∉ [10, 90]` — a caller bug: the Wind Gate refuses a
 *   width outside its domain before anything evaluates it, and a reader handles `x` outside the
 *   span itself.
 */
export function windProfileShape(xi: number, width: number): number {
  requireWithin("windProfileShape", "xi", xi, { min: 0, max: 1 });
  requireWithin("windProfileShape", "width", width, WIND_PROFILE.width);
  const chi = Math.abs(2 * xi - 1);
  // `cos(π/2)` is 6e-17 and not zero: the two ends of `χ` are stated, not computed.
  if (chi === 0) return 1;
  if (chi === 1) return 0;
  const p = Math.LN2 / Math.log(100 / width);
  const h = Math.sin((Math.PI / 2) * chi ** p) ** 2;
  return Math.cos((Math.PI / 2) * h) ** 2;
}

/**
 * §8.4's `U(ξ) = V·[(1 − α) + α·φ(ξ)]`: the wind speed at one share of the span, **in the unit
 * `speed` is given in** — km/h for a reading, m/s for the physics.
 *
 * @param speed `V`, the entered speed, which is the speed at mid-span (≥ 0).
 * @param xi `ξ = x/L`, the share of the horizontal span from A.
 * @throws RangeError when `speed` is negative or not finite, `a ∉ [0, 100]`, `w ∉ [10, 90]` or
 *   `ξ ∉ [0, 1]` — caller bugs, as {@link windProfileShape}'s. The width is checked even where a
 *   nil attenuation leaves it without effect: out of its domain it is refused, not ignored.
 */
export function windProfileSpeed(
  speed: number,
  { width, attenuation }: WindProfile,
  xi: number,
): number {
  if (!(speed >= 0 && Number.isFinite(speed))) {
    throw new RangeError(`windProfileSpeed: speed must be finite and ≥ 0, got ${speed}`);
  }
  requireWithin("windProfileSpeed", "attenuation", attenuation, WIND_PROFILE.attenuation);
  const shape = windProfileShape(xi, width);
  // `(1 − α) + α·φ`, written as `1 − α·(1 − φ)` so that the exact cases need no branch: `α = 0`
  // and `φ = 1` both give `V·1`, and `φ = 0` gives `V·(1 − α)`.
  return speed * (1 - (attenuation / 100) * (1 - shape));
}

/**
 * The wind at one point of the line, projected on it: the local speed of §8.4's profile, from the
 * field's one direction. **The entry every spatial reader takes** — at its own `x`, for each
 * evaluation, never once for the span.
 *
 * @param x the horizontal abscissa from A, m — §2's `x`, not an arc length.
 * @param L the horizontal span, m (> 0).
 * @param bearing the bearing of the travel A → B, degrees clockwise from north.
 * @throws RangeError when `L` is not finite and positive, or `x ∉ [0, L]`: the profile has no
 *   value outside the span, and a reader that can leave it decides what it reads there.
 */
export function windAt(field: WindField, x: number, L: number, bearing: number): WindComponents {
  if (!(L > 0 && Number.isFinite(L))) {
    throw new RangeError(`windAt: L must be finite and > 0, got ${L}`);
  }
  requireWithin("windAt", "x", x, { min: 0, max: L });
  return windComponents(windProfileSpeed(field.speed, field.profile, x / L), field.from, bearing);
}
