/**
 * WGS84 → LV95 by swisstopo's **approximate** formulas (« Näherungslösungen für die direkte
 * Transformation WGS84 → CH1903+/LV95 »), the reading printed beside a Position (#90). Published
 * precision is about 1 m inside Switzerland, which is why the Rail labels it « approchée »: the
 * exact conversion is REFRAME's, and arrives with the geo.admin profil (#103).
 *
 * Pure arithmetic on degrees, in the same module family as the Terrain it will sit beside; the
 * coefficients are swisstopo's, never fitted here.
 */

/** A point in the Swiss grid, metres: `E` east, `N` north. */
export type Lv95 = { readonly E: number; readonly N: number };

/**
 * Whether the approximate formulas mean anything here: a box around Switzerland, generous on
 * purpose — it only keeps the readout off a latitude of 0 or 999, not off a point near the border.
 */
export function inLv95Domain({
  lat,
  lon,
}: {
  readonly lat: number;
  readonly lon: number;
}): boolean {
  return lat >= 45 && lat <= 48.5 && lon >= 5 && lon <= 11.5;
}

/**
 * @param position WGS84 degrees. Outside Switzerland the polynomial still returns numbers, which
 *   mean nothing; the caller decides whether to show them ({@link inLv95Domain}).
 */
export function lv95FromWgs84({ lat, lon }: { readonly lat: number; readonly lon: number }): Lv95 {
  // Auxiliary quantities: the offset from Bern in units of 10 000″.
  const p = (lat * 3600 - 169028.66) / 10000;
  const l = (lon * 3600 - 26782.5) / 10000;
  return {
    E: 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p ** 2 - 44.54 * l ** 3,
    N:
      1200147.07 +
      308807.95 * p +
      3745.25 * l ** 2 +
      76.63 * p ** 2 -
      194.56 * l ** 2 * p +
      119.79 * p ** 3,
  };
}

/**
 * The reading printed beside a Position: whole metres, grouped by thousands as the Swiss grid is
 * written (« 2 530 314 »), with a narrow no-break space so a coordinate never splits across lines.
 */
export function formatLv95({ E, N }: Lv95): string {
  const whole = (metres: number) =>
    Math.round(metres)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `E ${whole(E)} · N ${whole(N)}`;
}
