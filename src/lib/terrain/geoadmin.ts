/**
 * The **profil geo.admin** (#103): the third way a Trace enters, fetched between the two Positions
 * rather than read from a file. Two swisstopo services, called from the browser with the platform's
 * own `fetch` — research « Swisstopo et geo.admin » (#11) and prototype #63:
 *
 * 1. REFRAME `wgs84tolv95`, once per anchor, because `profile.json` refuses WGS84. When it fails the
 *    Positions go through swisstopo's approximate formulas instead (`./lv95.ts`), 4 cm away on the
 *    trial line.
 * 2. `profile.json` on the two LV95 points, `sr=2056`, **200 points** — the sampling the geo.admin
 *    export uses, so a profil fetched here and the CSV of the same line agree.
 *
 * Rules this module exists to keep:
 *
 * - **`fetch` is a parameter.** Every call is a function of its inputs, so a recorded response
 *   replays in a `node` test with no network in the room.
 * - **Never a throw, never a Blocking Error.** The profil is a connected function on top of an app
 *   that computes offline: a network fault, an HTTP error or a body this module cannot read is the
 *   one ambient « profil geo.admin indisponible », and the caller leaves the current terrain as it
 *   is. An empty answer is the API saying the line is outside swisstopo's coverage, which has its
 *   own message because its remedy differs.
 * - **The samples are the service's own**, held as received like a CSV's: no resampling, and the
 *   same strictly increasing `Distance` a file is held to. The service writes `dist` to 0,1 m, so a
 *   line under about 20 m comes back with repeated distances, and that is a profil this app cannot
 *   hold.
 */

import * as v from "valibot";

import type { Position } from "@/lib/scenario/types.ts";

import type { Lv95 } from "./lv95.ts";
import type { Trace, TraceEnds } from "./trace.ts";

import { maxLateralDeviation } from "./csv.ts";
import { lv95FromWgs84 } from "./lv95.ts";

/** What this module needs of `fetch`: the platform's own in the app, a replay in a test. */
export type Fetch = (url: string) => Promise<Response>;

/** Why there is no profil. Each has its own message because each has its own remedy. */
export type GeoadminFailure = "indisponible" | "hors-couverture";

/** A loaded profil, or why there is none. The current terrain is the caller's to keep. */
export type GeoadminOutcome =
  | { readonly ok: true; readonly trace: Trace }
  | { readonly ok: false; readonly failure: GeoadminFailure };

/** REFRAME's WGS84 → LV95 endpoint — observed on 2026-11-08 with CORS `*` (#63). */
const REFRAME_URL = "https://geodesy.geo.admin.ch/reframe/wgs84tolv95";

/** The documented elevation-profile service. */
const PROFILE_URL = "https://api3.geo.admin.ch/rest/services/profile.json";

/** The geo.admin export's own sampling, which is also the service's default. */
const PROFILE_POINTS = 200;

/** LV95, the one of the service's two frames that REFRAME answers in. */
const LV95_EPSG = 2056;

const FINITE = v.pipe(v.number(), v.finite());

/** REFRAME answers its coordinates as strings: `{"easting": "2530313.64…", …}`. */
const REFRAME_COORDINATE = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.nonEmpty(), v.transform(Number))]),
  v.finite(),
);

const REFRAME_BODY = v.object({ easting: REFRAME_COORDINATE, northing: REFRAME_COORDINATE });

/**
 * The documented JSON answer. `COMB` is the first of the three altitude keys; on every line probed
 * on 2026-11-08 the three agree, and the export's `Altitude` column is that same value.
 */
const PROFILE_BODY = v.array(
  v.object({
    dist: FINITE,
    alts: v.object({ COMB: FINITE }),
    easting: FINITE,
    northing: FINITE,
  }),
);

const UNAVAILABLE: GeoadminOutcome = { ok: false, failure: "indisponible" };

/**
 * The profil geo.admin between two Positions, A first: the anchors stand on its two ends.
 *
 * @param ends anchor A's and anchor B's Positions, WGS84.
 * @param fetch the platform's `fetch`, or a replay.
 * @returns a Trace whose origin is `geoadmin` and whose ends are `ends`, or why there is none.
 *   Never rejects.
 */
export async function loadGeoadminProfile(ends: TraceEnds, fetch: Fetch): Promise<GeoadminOutcome> {
  let a: Lv95;
  let b: Lv95;
  try {
    [a, b] = await Promise.all([reframe(ends.A, fetch), reframe(ends.B, fetch)]);
  } catch {
    a = lv95FromWgs84(ends.A);
    b = lv95FromWgs84(ends.B);
  }

  let body: unknown;
  try {
    const response = await fetch(profileUrl(a, b));
    if (!response.ok) return UNAVAILABLE;
    body = await response.json();
  } catch {
    return UNAVAILABLE;
  }

  const parsed = v.safeParse(PROFILE_BODY, body);
  if (!parsed.success) return UNAVAILABLE;
  // Outside swisstopo's coverage the service answers an empty list (HTTP 203), not an error.
  if (parsed.output.length === 0) return { ok: false, failure: "hors-couverture" };
  return traceOf(parsed.output, ends);
}

/** The ambient line a failure reads as — the ticket's copy, verbatim. */
export function geoadminNotice(failure: GeoadminFailure): string {
  switch (failure) {
    case "indisponible":
      return "profil geo.admin indisponible";
    case "hors-couverture":
      return "hors couverture swisstopo, importer un CSV ou saisir la géométrie";
  }
}

/** One Position in LV95 by REFRAME. Rejects on anything but a readable answer. */
async function reframe({ lat, lon }: Position, fetch: Fetch): Promise<Lv95> {
  const url = new URL(REFRAME_URL);
  url.searchParams.set("easting", String(lon));
  url.searchParams.set("northing", String(lat));
  url.searchParams.set("format", "json");
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`REFRAME ${response.status}`);
  const { easting, northing } = v.parse(REFRAME_BODY, await response.json());
  return { E: easting, N: northing };
}

function profileUrl(a: Lv95, b: Lv95): string {
  const url = new URL(PROFILE_URL);
  const geom = {
    type: "LineString",
    coordinates: [
      [a.E, a.N],
      [b.E, b.N],
    ],
  };
  url.searchParams.set("geom", JSON.stringify(geom));
  url.searchParams.set("sr", String(LV95_EPSG));
  url.searchParams.set("nb_points", String(PROFILE_POINTS));
  return url.toString();
}

function traceOf(samples: v.InferOutput<typeof PROFILE_BODY>, ends: TraceEnds): GeoadminOutcome {
  const count = samples.length;
  if (count < 2) return UNAVAILABLE;
  const d = new Float64Array(count);
  const z = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    d[i] = samples[i].dist;
    z[i] = samples[i].alts.COMB;
    if (i > 0 && !(d[i] > d[i - 1])) return UNAVAILABLE;
  }
  const dev = maxLateralDeviation(
    samples.map((sample) => sample.easting),
    samples.map((sample) => sample.northing),
  );
  return {
    ok: true,
    trace: {
      d,
      z,
      dev,
      origin: { kind: "geoadmin" },
      ends: { A: { ...ends.A }, B: { ...ends.B } },
    },
  };
}
