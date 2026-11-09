/**
 * The profil geo.admin (#103), with no network in the room: every case hands the loader its own
 * `fetch`. The trial line replays the answers recorded on 2026-11-08, **by URL** — a request the
 * recording does not hold is a failed fetch — so these cases also pin what the loader asks for.
 *
 * The expected figures are the ticket's and the export's (`docs/mesures dynamometre/
 * trace-geoadmin-2026-11-08.csv`): 200 points, 435,2 m, 1453,7 m under A, 1438,7 m under B.
 */

import { describe, expect, test } from "vitest";

import type { Fetch } from "./geoadmin.ts";

import { replayTrial, TRIAL_ENDS, TRIAL_EXCHANGES } from "./__fixtures__/geoadmin-2026-11-08.ts";
import { geoadminNotice, loadGeoadminProfile } from "./geoadmin.ts";
import { maxSpacing, traceExtent } from "./trace.ts";

const [REFRAME_A, REFRAME_B, PROFILE] = TRIAL_EXCHANGES;

/** The profile answer, whatever the request: what a REFRAME outage leaves to be asked. */
function profileFor(body: string, status = 200): Fetch {
  return async (url) =>
    url.startsWith("https://api3.geo.admin.ch/")
      ? new Response(body, { status })
      : new Response("Service Unavailable", { status: 503 });
}

describe("the trial line, replayed", () => {
  test("200 points over 435,2 m, from 1453,7 m under A to 1438,7 m under B", async () => {
    const outcome = await loadGeoadminProfile(TRIAL_ENDS, replayTrial());
    if (!outcome.ok) throw new Error(`the trial line must load, got ${outcome.failure}`);
    const { trace } = outcome;

    expect(trace.d.length).toBe(200);
    expect(Math.abs(traceExtent(trace) - 435.2)).toBeLessThanOrEqual(0.5);
    expect(trace.z[0]).toBe(1453.7);
    expect(trace.z[199]).toBe(1438.7);
  });

  test("the profil is a geo.admin one, standing on the two Positions it was asked between", async () => {
    const outcome = await loadGeoadminProfile(TRIAL_ENDS, replayTrial());
    if (!outcome.ok) throw new Error("the trial line must load");

    expect(outcome.trace.origin).toEqual({ kind: "geoadmin" });
    expect(outcome.trace.ends).toEqual(TRIAL_ENDS);
    // A straight line asked for, so a straight profil: the service samples the chord itself.
    expect(outcome.trace.dev).toBeLessThan(0.01);
    // A fixed 200 points and not a fixed pitch, as the export: 435,2 m over 199 gaps.
    expect(maxSpacing(outcome.trace)).toBeCloseTo(2.2, 1);
  });

  test("asks REFRAME once per anchor, then the profile in LV95 at 200 points", async () => {
    const seen: string[] = [];
    await loadGeoadminProfile(TRIAL_ENDS, replayTrial(seen));

    expect([...seen].sort()).toEqual([REFRAME_A.url, REFRAME_B.url, PROFILE.url].sort());
    const asked = new URL(PROFILE.url).searchParams;
    expect(asked.get("sr")).toBe("2056");
    expect(asked.get("nb_points")).toBe("200");
  });
});

describe("REFRAME down — swisstopo's approximate formulas stand in", () => {
  test("the profil still loads, asked between points within a metre of REFRAME's", async () => {
    const seen: string[] = [];
    const fetch: Fetch = async (url) => {
      seen.push(url);
      return profileFor(PROFILE.body)(url);
    };
    const outcome = await loadGeoadminProfile(TRIAL_ENDS, fetch);
    expect(outcome.ok).toBe(true);

    const profileUrl = seen.find((url) => url.startsWith("https://api3.geo.admin.ch/"));
    const geom = JSON.parse(new URL(profileUrl ?? "").searchParams.get("geom") ?? "null") as {
      coordinates: [number, number][];
    };
    // REFRAME's answers for A and B, as recorded: the published precision of the formulas is ≈1 m.
    const exact = [REFRAME_A, REFRAME_B].map((exchange) => {
      const { easting, northing } = JSON.parse(exchange.body) as Record<string, string>;
      return [Number(easting), Number(northing)];
    });
    geom.coordinates.forEach(([E, N], i) => {
      expect(Math.hypot(E - exact[i][0], N - exact[i][1])).toBeLessThan(1);
    });
  });
});

describe("degraded — an ambient message, never a throw", () => {
  const cases: readonly { name: string; fetch: Fetch }[] = [
    {
      name: "no network at all",
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    },
    {
      name: "a fetch that throws before it returns a promise",
      fetch: () => {
        throw new TypeError("Failed to fetch");
      },
    },
    { name: "an HTTP error from the profile service", fetch: profileFor("Bad Gateway", 502) },
    {
      name: "the service's own 400",
      fetch: profileFor(
        '{"error":{"code":400,"message":"Invalid LineString"},"success":false}',
        400,
      ),
    },
    { name: "a body that is not JSON", fetch: profileFor("<html>maintenance</html>") },
    { name: "a body that is not a profile", fetch: profileFor('{"easting": 1}') },
    {
      name: "a sample with no altitude",
      fetch: profileFor('[{"alts":{},"dist":0,"easting":1,"northing":2}]'),
    },
    {
      // What the service answers for a line of 10 m: `dist` to 0,1 m over 200 points repeats.
      name: "repeated distances",
      fetch: profileFor(
        JSON.stringify(
          [0, 0.1, 0.1, 0.2].map((dist) => ({
            alts: { COMB: 1453.7 },
            dist,
            easting: 2530313.64,
            northing: 1188453.12 + dist,
          })),
        ),
      ),
    },
  ];

  test.each(cases)("$name: « profil geo.admin indisponible »", async ({ fetch }) => {
    await expect(loadGeoadminProfile(TRIAL_ENDS, fetch)).resolves.toEqual({
      ok: false,
      failure: "indisponible",
    });
  });

  test("an empty answer is outside swisstopo's coverage, and says what to do instead", async () => {
    // Paris, 2026-11-08: REFRAME still answers, `profile.json` answers `[]` with HTTP 203.
    const paris = { A: { lat: 48.85, lon: 2.35 }, B: { lat: 48.86, lon: 2.36 } };
    const outcome = await loadGeoadminProfile(paris, profileFor("[]", 203));
    expect(outcome).toEqual({ ok: false, failure: "hors-couverture" });
  });

  test("each failure reads as the ticket's copy", () => {
    expect(geoadminNotice("indisponible")).toBe("profil geo.admin indisponible");
    expect(geoadminNotice("hors-couverture")).toBe(
      "hors couverture swisstopo, importer un CSV ou saisir la géométrie",
    );
  });
});
