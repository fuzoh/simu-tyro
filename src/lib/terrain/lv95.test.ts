import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { formatLv95, inLv95Domain, lv95FromWgs84 } from "./lv95.ts";

// The geo.admin export of the 2026-11-08 trace carries both systems on every row, so the
// approximate conversion is checked against swisstopo's own LV95 columns, never against itself.
const CSV = readFileSync(
  new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
  "utf8",
);
const ROWS = CSV.trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split(";").map(Number))
  .map(([, , easting, northing, longitude, latitude]) => ({
    easting,
    northing,
    longitude,
    latitude,
  }));

describe("lv95FromWgs84 against the geo.admin export", () => {
  test("anchor A reads 2 530 314 / 1 188 453 within 2 m", () => {
    const [first] = ROWS;
    const { E, N } = lv95FromWgs84({ lat: first.latitude, lon: first.longitude });
    expect(Math.abs(E - 2530314)).toBeLessThanOrEqual(2);
    expect(Math.abs(N - 1188453)).toBeLessThanOrEqual(2);
  });

  test("every row of the 435 m trace is within 2 m of its own LV95 columns", () => {
    for (const row of ROWS) {
      const { E, N } = lv95FromWgs84({ lat: row.latitude, lon: row.longitude });
      expect(Math.hypot(E - row.easting, N - row.northing)).toBeLessThanOrEqual(2);
    }
  });
});

describe("inLv95Domain", () => {
  test("the trace is inside; the equator and an impossible latitude are not", () => {
    expect(inLv95Domain({ lat: ROWS[0].latitude, lon: ROWS[0].longitude })).toBe(true);
    expect(inLv95Domain({ lat: 0, lon: 6.5 })).toBe(false);
    expect(inLv95Domain({ lat: 999, lon: 6.5 })).toBe(false);
    expect(inLv95Domain({ lat: 46.8, lon: 200 })).toBe(false);
  });
});

describe("formatLv95", () => {
  test("whole metres, grouped by thousands with a narrow no-break space", () => {
    expect(formatLv95({ E: 2530313.62, N: 1188453.14 })).toBe(
      "E 2\u202f530\u202f314 · N 1\u202f188\u202f453",
    );
  });
});
