/**
 * The anchors' gestures on the vue de dessus (#93), run as the map runs them: each event steps the
 * machine, its actions go to the app's reducer, and the profil it asks for is fetched with an
 * **injected, counted `fetch`** — the trial line's recorded answers (#103), or a network that is not
 * there. No map, no DOM: the gesture is the pure part, and it is where « nothing is asked for
 * during a drag » lives — for the markers of the vue de dessus and the anchors of the Vue 3D (#97)
 * alike.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { AppState } from "@/lib/app/state.ts";
import type { Position } from "@/lib/scenario/types.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";

import { sessionOf } from "@/lib/app/persist.ts";
import { appReducer, initialAppState } from "@/lib/app/state.ts";
import { buildScene } from "@/lib/chart/scene.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { deriveResults } from "@/lib/rail/results.ts";
import { replayTrial, TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { parseProfileCsv } from "@/lib/terrain/csv.ts";
import { loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";
import { traceExtent } from "@/lib/terrain/trace.ts";
import { encodeP1 } from "@/lib/url/p1.ts";

import type { MapEvent, MapGesture } from "./gesture.ts";

import { clickTarget, drawnPositions, IDLE, stepGesture } from "./gesture.ts";
import { lineData } from "./style.ts";
import { vue3dFollowing, vue3dPlacement, vue3dScene } from "./vue-3d.ts";

/** The map as `TopMap` wires it: the gesture, the app's state, and every URL the network was asked. */
type Rig = { gesture: MapGesture; state: AppState; asked: string[] };

/**
 * One event, carried through: step the machine against the Scenario's Positions, hand its actions
 * to the reducer, and — when it asks for a profil — fetch it and send the outcome back.
 */
async function send(rig: Rig, event: MapEvent, fetch: Fetch): Promise<Rig> {
  const step = stepGesture(rig.gesture, rig.state.scenario.positions, event);
  const state = step.actions.reduce(appReducer, rig.state);
  const next = { gesture: step.gesture, state, asked: rig.asked };
  if (step.load === null) return next;
  const outcome = await loadGeoadminProfile(step.load, fetch);
  return send(next, { type: "profile", outcome }, fetch);
}

/** A `fetch` that writes down each URL before handing it to `inner`. */
function counted(asked: string[], inner: Fetch): Fetch {
  return (url) => {
    asked.push(url);
    return inner(url);
  };
}

const OFFLINE: Fetch = async () => {
  throw new TypeError("Failed to fetch");
};

/** The trial's anchor heights and a régime, so that there is a Verdict to read. */
function blankMap(): Rig {
  const state = appReducer(initialAppState({ query: "", session: null }), {
    type: "scénario/modifié",
    patch: { anchors: { zA: 1.5, zB: 1 }, regime: "en15567" },
  });
  return { gesture: IDLE, state, asked: [] };
}

function verdictOf({ scenario, trace }: AppState) {
  return deriveResults({
    scenario,
    base: buildScene({ scenario, trace }),
    report: evaluateGates({ scenario }),
  })?.verdict;
}

/**
 * A service that answers any line with a level profil of 200 points at 1 450 m over its LV95 chord,
 * REFRAME down so the Positions go through the approximate formulas.
 */
const anywhere: Fetch = async (url) => {
  const asked = new URL(url);
  if (asked.hostname === "geodesy.geo.admin.ch") return new Response("down", { status: 503 });
  const geom = JSON.parse(asked.searchParams.get("geom") ?? "") as {
    coordinates: [[number, number], [number, number]];
  };
  const [[e0, n0], [e1, n1]] = geom.coordinates;
  const length = Math.hypot(e1 - e0, n1 - n0);
  const samples = Array.from({ length: 200 }, (_, i) => ({
    dist: Math.round(((i * length) / 199) * 10) / 10,
    alts: { COMB: 1450 },
    easting: e0 + ((e1 - e0) * i) / 199,
    northing: n0 + ((n1 - n0) * i) / 199,
  }));
  return new Response(JSON.stringify(samples), { status: 200 });
};

/** A point 0,001° from B in both directions — about 110 m north and 76 m east. */
const ASIDE: Position = { lat: 46.847166, lon: 6.521783 };

/** Two clicks on a blank map, on the trial's two ends, with the recorded network. */
async function twoClicks(): Promise<Rig> {
  const rig = blankMap();
  const fetch = counted(rig.asked, replayTrial());
  const placedA = await send(rig, { type: "click", at: TRIAL_ENDS.A }, fetch);
  return send(placedA, { type: "click", at: TRIAL_ENDS.B }, fetch);
}

describe("two clicks on a blank map", () => {
  test("the first places A, and nothing is asked of the network for one anchor", async () => {
    const rig = blankMap();
    expect(clickTarget(rig.gesture, rig.state.scenario.positions)).toBe("A");

    const placed = await send(
      rig,
      { type: "click", at: TRIAL_ENDS.A },
      counted(rig.asked, OFFLINE),
    );
    expect(placed.state.scenario.positions).toEqual({ A: TRIAL_ENDS.A, B: null });
    expect(placed.asked).toEqual([]);
    expect(clickTarget(placed.gesture, placed.state.scenario.positions)).toBe("B");
  });

  test("the second places B, loads the profil geo.admin between them and gives a Verdict", async () => {
    const { state, asked, gesture } = await twoClicks();

    // Two REFRAME calls and one profile: the profil, asked for once.
    expect(asked).toHaveLength(3);
    expect(gesture).toEqual(IDLE);
    expect(state.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(state.scenario.positions).toEqual(TRIAL_ENDS);
    expect(state.scenario.geometry).toEqual({
      source: "trace",
      trace: encodeP1(state.trace ?? { d: new Float64Array(), z: new Float64Array(), dev: 0 }),
    });
    // The anchors stand on its two ends at the heights they had: the span is its whole extent,
    // the recorded 435,2 m.
    expect(Math.abs(traceExtent(state.trace ?? { d: Float64Array.of(0) }) - 435.2)).toBeLessThan(
      0.5,
    );
    expect(state.scenario.anchors).toEqual({ zA: 1.5, zB: 1 });
    expect(verdictOf(state)).toEqual(expect.objectContaining({ state: expect.any(String) }));
  });

  test("with both anchors known, a click does nothing", async () => {
    const rig = await twoClicks();
    expect(clickTarget(rig.gesture, rig.state.scenario.positions)).toBeNull();
    const clicked = await send(rig, { type: "click", at: ASIDE }, counted(rig.asked, OFFLINE));
    expect(clicked.state).toBe(rig.state);
    expect(clicked.asked).toHaveLength(3);
  });

  test("a click that cannot get its profil leaves B unplaced and says why", async () => {
    const rig = blankMap();
    const fetch = counted(rig.asked, OFFLINE);
    const placedA = await send(rig, { type: "click", at: TRIAL_ENDS.A }, fetch);
    const clicked = await send(placedA, { type: "click", at: TRIAL_ENDS.B }, fetch);

    expect(clicked.state).toBe(placedA.state);
    expect(clicked.gesture).toEqual({ kind: "idle", armed: null, notice: "indisponible" });
    expect(drawnPositions(clicked.gesture, clicked.state.scenario.positions)).toEqual({
      A: TRIAL_ENDS.A,
      B: null,
    });
  });
});

describe("dragging B — recomputed at the release, and only there", () => {
  test("no call and no change of the line while the pointer moves; one profil at the release", async () => {
    const loaded = await twoClicks();
    const fetch = counted(loaded.asked, replayTrial());
    const verdict = verdictOf(loaded.state);

    let rig = await send(loaded, { type: "drag-start", anchor: "B", at: TRIAL_ENDS.B }, fetch);
    for (let i = 1; i <= 20; i++) {
      const at = { lat: TRIAL_ENDS.B.lat + i * 1e-4, lon: TRIAL_ENDS.B.lon + i * 1e-4 };
      rig = await send(rig, { type: "drag-move", at }, fetch);

      // The drawing follows the pointer…
      expect(drawnPositions(rig.gesture, rig.state.scenario.positions).B).toEqual(at);
      // …and nothing else does: no request, the very same state, the same Verdict.
      expect(rig.asked).toHaveLength(3);
      expect(rig.state).toBe(loaded.state);
    }
    expect(verdictOf(rig.state)).toEqual(verdict);

    // Dropped back where the recording has it, so the replay can answer the new line.
    const released = await send(rig, { type: "drag-end", at: TRIAL_ENDS.B }, fetch);
    expect(released.asked).toHaveLength(6);
    expect(released.gesture).toEqual(IDLE);
    expect(released.state.trace).not.toBe(loaded.state.trace);
    expect(released.state.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(released.state.scenario.positions).toEqual(TRIAL_ENDS);
    expect(verdictOf(released.state)).toEqual(verdict);
  });

  test("dropped elsewhere, the new line ends where B was let go", async () => {
    const loaded = await twoClicks();
    const fetch = counted(loaded.asked, anywhere);

    const grabbed = await send(
      loaded,
      { type: "drag-start", anchor: "B", at: TRIAL_ENDS.B },
      fetch,
    );
    const moved = await send(grabbed, { type: "drag-move", at: ASIDE }, fetch);
    expect(moved.asked).toHaveLength(3);
    const released = await send(moved, { type: "drag-end", at: ASIDE }, fetch);

    expect(released.state.scenario.positions).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });
    expect(released.state.trace?.ends).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });
    // The line moved by ≈ 110 m north and 76 m east of B: its span is no longer the trial's.
    expect(
      Math.abs(traceExtent(released.state.trace ?? { d: Float64Array.of(0) }) - 435.2),
    ).toBeGreaterThan(10);
    expect(verdictOf(released.state)).toEqual(
      expect.objectContaining({ state: expect.any(String) }),
    );
  });

  test("released offline: the line, its profil and its Verdict stay as they were", async () => {
    const loaded = await twoClicks();
    const fetch = counted(loaded.asked, OFFLINE);
    const grabbed = await send(
      loaded,
      { type: "drag-start", anchor: "B", at: TRIAL_ENDS.B },
      fetch,
    );
    const moved = await send(grabbed, { type: "drag-move", at: ASIDE }, fetch);
    const released = await send(moved, { type: "drag-end", at: ASIDE }, fetch);

    // The release did ask — that is the only moment it may — and got nothing.
    expect(released.asked.length).toBeGreaterThan(3);
    expect(released.state).toBe(loaded.state);
    expect(released.gesture).toEqual({ kind: "idle", armed: null, notice: "indisponible" });
    // B is drawn back on its own end.
    expect(drawnPositions(released.gesture, released.state.scenario.positions)).toEqual(TRIAL_ENDS);
  });

  test("while its profil is on its way, the new line is drawn there and the map takes no gesture", async () => {
    const loaded = await twoClicks();
    const grabbed = stepGesture(loaded.gesture, loaded.state.scenario.positions, {
      type: "drag-start",
      anchor: "B",
      at: TRIAL_ENDS.B,
    });
    const released = stepGesture(grabbed.gesture, TRIAL_ENDS, { type: "drag-end", at: ASIDE });
    expect(released.load).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });
    expect(released.actions).toEqual([]);
    expect(drawnPositions(released.gesture, TRIAL_ENDS)).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });

    for (const event of [
      { type: "click", at: ASIDE },
      { type: "arm", anchor: "A" },
      { type: "drag-start", anchor: "A", at: TRIAL_ENDS.A },
    ] as const) {
      const step = stepGesture(released.gesture, TRIAL_ENDS, event);
      expect(step.gesture).toBe(released.gesture);
      expect(step.load).toBeNull();
    }
  });
});

describe("dragging B in the Vue 3D (#97) — the same machine, the same release", () => {
  /** The Vue 3D the Page draws for a state: the coupe's line on its two Positions. */
  function vue3dOf({ scenario, trace }: AppState) {
    const scene = buildScene({ scenario, trace });
    const at = vue3dPlacement(scenario.positions, scene);
    if (scene === null || !at.ok) throw new Error("the line stands in the Vue 3D");
    return vue3dScene({ placement: at.placement, solved: scene, rider: scene.rider, across: 0 });
  }

  test("only B, its Fil à plomb and the Ligne A–B follow the relief; nothing is asked until the release", async () => {
    const loaded = await twoClicks();
    const shown = vue3dOf(loaded.state);
    const fetch = counted(loaded.asked, anywhere);

    // The Vue 3D starts the gesture at the anchor's first move, its foot on the relief it draws.
    let rig = loaded;
    for (let i = 0; i < 20; i++) {
      const foot = {
        lat: TRIAL_ENDS.B.lat + i * 5e-5,
        lon: TRIAL_ENDS.B.lon + i * 5e-5,
        altitude: 1438.7 + i,
      };
      const at = { lat: foot.lat, lon: foot.lon };
      const event: MapEvent =
        i === 0 ? { type: "drag-start", anchor: "B", at } : { type: "drag-move", at };
      rig = await send(rig, event, fetch);

      expect(drawnPositions(rig.gesture, rig.state.scenario.positions).B).toEqual(at);
      // The scene is the last release's, untouched: the Vue 3D redraws B over it, and only B.
      expect(vue3dOf(rig.state)).toEqual(shown);
      const following = vue3dFollowing(shown, "B", foot);
      expect(following.fils.B.anchor.altitude).toBeCloseTo(foot.altitude + 1, 9);
      expect(following.ligneAB).toEqual([shown.fils.A.anchor, following.fils.B.anchor]);
      expect(rig.asked).toHaveLength(3);
      expect(rig.state).toBe(loaded.state);
    }
  });

  test("released, B's Position moves, a new profil and a new Verdict come, the heights are kept", async () => {
    const loaded = await twoClicks();
    const verdict = verdictOf(loaded.state);
    const fetch = counted(loaded.asked, anywhere);
    const grabbed = await send(loaded, { type: "drag-start", anchor: "B", at: ASIDE }, fetch);
    // The release comes once the relief under B was sampled at its finest — no call of the app's.
    const released = await send(grabbed, { type: "drag-end", at: ASIDE }, fetch);

    // Two REFRAME calls and one profile, at the release alone.
    expect(released.asked).toHaveLength(6);
    expect(released.gesture).toEqual(IDLE);
    expect(released.state.scenario.positions).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });
    expect(released.state.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(released.state.scenario.anchors).toEqual({ zA: 1.5, zB: 1 });
    expect(verdictOf(released.state)).toEqual(
      expect.objectContaining({ state: expect.any(String) }),
    );
    expect(verdictOf(released.state)).not.toEqual(verdict);
    expect(sessionOf(released.state)?.scenario.positions).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });

    // The Vue 3D stands on the new profil: both feet on its 1 450 m, each anchor its height above.
    const { ends, fils } = vue3dOf(released.state);
    expect(ends).toEqual({ A: TRIAL_ENDS.A, B: ASIDE });
    expect(fils.A.anchor.altitude).toBeCloseTo(1451.5, 6);
    expect(fils.B.foot.altitude).toBeCloseTo(1450, 6);
    expect(fils.B.anchor.altitude).toBeCloseTo(1451, 6);
  });
});

describe("« Placer A » / « Placer B »", () => {
  test("arms the next click for that anchor, which moves it and reloads the line", async () => {
    const loaded = await twoClicks();
    const fetch = counted(loaded.asked, OFFLINE);
    const armed = await send(loaded, { type: "arm", anchor: "A" }, fetch);
    expect(clickTarget(armed.gesture, armed.state.scenario.positions)).toBe("A");

    const clicked = stepGesture(armed.gesture, armed.state.scenario.positions, {
      type: "click",
      at: ASIDE,
    });
    expect(clicked.load).toEqual({ A: ASIDE, B: TRIAL_ENDS.B });
  });

  test("after a profil that could not be had, gives the hint back its place", () => {
    const failed: MapGesture = { kind: "idle", armed: null, notice: "indisponible" };
    expect(stepGesture(failed, TRIAL_ENDS, { type: "arm", anchor: "B" }).gesture).toEqual({
      kind: "idle",
      armed: "B",
      notice: null,
    });
  });

  test("pressed again, it disarms", () => {
    const armed = stepGesture(IDLE, TRIAL_ENDS, { type: "arm", anchor: "B" }).gesture;
    expect(stepGesture(armed, TRIAL_ENDS, { type: "arm", anchor: "B" }).gesture).toEqual(IDLE);
  });

  test("on a blank map, « Placer B » first puts B down alone", () => {
    const blank = { A: null, B: null };
    const armed = stepGesture(IDLE, blank, { type: "arm", anchor: "B" }).gesture;
    const step = stepGesture(armed, blank, { type: "click", at: TRIAL_ENDS.B });
    expect(step.actions).toEqual([
      { type: "scénario/modifié", patch: { positions: { A: null, B: TRIAL_ENDS.B } } },
    ]);
    expect(step.load).toBeNull();
    expect(clickTarget(step.gesture, { A: null, B: TRIAL_ENDS.B })).toBe("A");
  });
});

test("a pointer's Position is kept at a typed one's grain, six decimals", () => {
  const step = stepGesture(
    IDLE,
    { A: null, B: null },
    {
      type: "click",
      at: { lat: 46.84355612345, lon: 6.52503487654 },
    },
  );
  expect(step.actions).toEqual([
    {
      type: "scénario/modifié",
      patch: { positions: { A: { lat: 46.843556, lon: 6.525035 }, B: null } },
    },
  ]);
});

describe("a CSV on the map (#93)", () => {
  const csv = readFileSync(
    new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
    "utf8",
  );
  const parsed = parseProfileCsv(csv, "trace-geoadmin-2026-11-08.csv");
  if (!parsed.ok) throw new Error("the trial CSV must import");
  const fromCsv = parsed.trace;

  function onCsv(): Rig {
    const { state, asked } = blankMap();
    return {
      gesture: IDLE,
      state: appReducer(state, { type: "tracé/importé", trace: fromCsv, tr: encodeP1(fromCsv) }),
      asked,
    };
  }

  test("is drawn between its two Positions", () => {
    const { gesture, state } = onCsv();
    const drawn = drawnPositions(gesture, state.scenario.positions);
    expect(drawn).toEqual(fromCsv.ends);
    expect(lineData(drawn)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [TRIAL_ENDS.A.lon, TRIAL_ENDS.A.lat],
              [TRIAL_ENDS.B.lon, TRIAL_ENDS.B.lat],
            ],
          },
        },
      ],
    });
  });

  test("after a drag the profil geo.admin is the active source, and the CSV stays in the Session", async () => {
    const rig = onCsv();
    const fetch = counted(rig.asked, replayTrial());
    const grabbed = await send(rig, { type: "drag-start", anchor: "B", at: TRIAL_ENDS.B }, fetch);
    const moved = await send(grabbed, { type: "drag-move", at: ASIDE }, fetch);
    const released = await send(moved, { type: "drag-end", at: TRIAL_ENDS.B }, fetch);

    expect(released.state.trace?.origin).toEqual({ kind: "geoadmin" });
    expect(released.state.retainedCsv).toBe(fromCsv);
    expect(sessionOf(released.state)?.retainedCsv).toBe(fromCsv);
  });
});
