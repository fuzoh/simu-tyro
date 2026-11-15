/**
 * The Vue 3D's pure half (#95): when the switch is off and why, what each Fond drapes, and where the
 * engine's lines and the Fils à plomb stand on the earth — and what follows an anchor dragged there
 * (#97) — and how the three views project the same `(x, y, z)` (#118).
 *
 * The line is the trial's (#68): Positions as the geo.admin export spells them, a three-sample profil
 * with the export's altitudes under A (1 453,7 m) and B (1 438,7 m), Anchor Heights 1,5 and 1 m.
 * Every expected altitude below is that arithmetic, shown where it is used.
 */

import { describe, expect, test } from "vitest";

import type { ChartScene, SceneBase, SpaceLine } from "@/lib/chart/scene.ts";
import type { Position, Scenario } from "@/lib/scenario/types.ts";
import type { LayerToggles } from "@/lib/session/session.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { buildScene, buildSceneFrame, MEMBER_GAP_PX, placeRider } from "@/lib/chart/scene.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { lineBearing, placeSpan } from "@/lib/scenario/geometry.ts";
import { DEFAULT_LAYERS } from "@/lib/session/session.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";

import type { EarthPoint, Vue3dScene } from "./vue-3d.ts";

import { mapStyle, wmtsTiles } from "./style.ts";
import { planTraces, spanTraces } from "./traces.ts";
import {
  CAMERA_REACH,
  DRAPED,
  earthFrame,
  onlyLoadedMoved,
  planFrame,
  vue3dFollowing,
  vue3dLayers,
  vue3dPlacement,
  vue3dScene,
} from "./vue-3d.ts";

/** No Mesure and no anchor to cross: the vue de dessus's style with nothing of #98 or #107. */
const NO_MEASURE = { points: [], preview: null, anchors: { A: null, B: null }, reperes: true };

const PROFIL: Trace = {
  d: Float64Array.from([0, 243, 435.2]),
  z: Float64Array.from([1453.7, 1368.1, 1438.7]),
  dev: null,
  origin: { kind: "geoadmin" },
  ends: TRIAL_ENDS,
};

const ANCHORS = { zA: 1.5, zB: 1 };

/** The trial line on its profil, the passager mid-span. */
function trial(patch: Partial<Scenario> = {}): Scenario {
  const scenario = firstRunDefaults();
  return {
    ...scenario,
    geometry: { source: "trace", trace: "p1.essai" },
    anchors: ANCHORS,
    positions: TRIAL_ENDS,
    rider: { ...scenario.rider, xD: 435.2 / 2 },
    ...patch,
  };
}

function solved(scenario: Scenario): ChartScene {
  const scene = buildScene({ scenario, trace: PROFIL });
  if (scene === null) throw new Error("the trial line solves");
  return scene;
}

function placed(scene: ChartScene) {
  const at = vue3dPlacement(TRIAL_ENDS, scene, PROFIL);
  if (!at.ok) throw new Error(`the trial line stands on the earth, not « ${at.block} »`);
  return at.placement;
}

describe("the switch to the Vue 3D", () => {
  const frame = buildSceneFrame(
    placeSpan({ geometry: trial().geometry, anchors: ANCHORS }, PROFIL),
  );

  test("is off without both Positions", () => {
    expect(vue3dPlacement({ A: null, B: null }, frame, PROFIL)).toEqual({
      ok: false,
      block: "positions",
    });
    expect(vue3dPlacement({ A: TRIAL_ENDS.A, B: null }, frame, PROFIL)).toEqual({
      ok: false,
      block: "positions",
    });
  });

  test("is off without a profil: manual geometry has no altitude to stand on", () => {
    const manual = buildSceneFrame(
      placeSpan({ geometry: { source: "manual", L: 435.2, h: -15.5 }, anchors: ANCHORS }, null),
    );
    expect(vue3dPlacement(TRIAL_ENDS, manual, null)).toEqual({ ok: false, block: "profil" });
    expect(vue3dPlacement(TRIAL_ENDS, null, null)).toEqual({ ok: false, block: "profil" });
  });

  test("is off where the profil does not run between the Positions: its altitudes are another line's", () => {
    // B typed some 1,3 km north of the profil's own end, with no profil loaded between them.
    const typed = { A: TRIAL_ENDS.A, B: { lat: 46.858, lon: TRIAL_ENDS.B.lon } };
    expect(vue3dPlacement(typed, frame, PROFIL)).toEqual({ ok: false, block: "profil" });
    // A file with no coordinates, and Positions typed beside it.
    const { ends: _, ...unplaced } = PROFIL;
    expect(vue3dPlacement(TRIAL_ENDS, frame, unplaced)).toEqual({ ok: false, block: "profil" });
  });

  test("is on with both Positions over a profil", () => {
    expect(vue3dPlacement(TRIAL_ENDS, frame, PROFIL)).toMatchObject({ ok: true });
  });
});

describe("what each Fond de carte drapes", () => {
  test("a raster Fond drapes the very tiles the vue de dessus shows", () => {
    for (const fond of ["orthophoto", "carte-nationale"] as const) {
      const style = mapStyle({
        display: { fond, pentes: false, view: "3d", reperes: true },
        vector: null,
        positions: TRIAL_ENDS,
        traces: null,
        measure: NO_MEASURE,
      });
      const source = style.sources.fond;
      expect(source?.type === "raster" ? source.tiles : null).toEqual([wmtsTiles(DRAPED[fond])]);
    }
  });

  test("the carte claire, vector tiles, drapes swisstopo's grey national map", () => {
    expect(wmtsTiles(DRAPED["carte-claire"])).toBe(
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
    );
  });
});

describe("the line on the earth", () => {
  const scene = solved(trial());
  const drawn = vue3dScene({
    placement: placed(scene),
    solved: scene,
    rider: scene.rider,
  });
  const { loaded, unloaded } = drawn;
  if (loaded === null || unloaded === null) throw new Error("both lines are drawn");

  // A: 1 453,7 + 1,5 = 1 455,2 m. B: 1 438,7 + 1 = 1 439,7 m.
  test.each([
    ["Ligne à vide", unloaded],
    ["loaded line", loaded],
  ] as const)(
    "the %s ends on both anchors: Position + profil altitude + Anchor Height",
    (_, line) => {
      const first = line[0];
      const last = line.at(-1);
      expect(first?.lon).toBe(TRIAL_ENDS.A.lon);
      expect(first?.lat).toBe(TRIAL_ENDS.A.lat);
      expect(first?.altitude).toBeCloseTo(1455.2, 5);
      expect(last?.lon).toBeCloseTo(TRIAL_ENDS.B.lon, 9);
      expect(last?.lat).toBeCloseTo(TRIAL_ENDS.B.lat, 9);
      expect(last?.altitude).toBeCloseTo(1439.7, 5);
    },
  );

  test("the loaded line's low point is the passager's node, at the abscissa the engine solved", () => {
    // A level span — both feet at 1 440 m, both anchors 1,5 m up — loaded mid-span is symmetric, so
    // its low point is the trolley's kink, half-way from A to B.
    const level: Trace = { ...PROFIL, z: Float64Array.from([1440, 1400, 1440]) };
    const scenario = trial({ anchors: { zA: 1.5, zB: 1.5 } });
    const symmetric = buildScene({ scenario, trace: level });
    if (symmetric === null) throw new Error("the level line solves");
    const { xD, zD } = symmetric.rider.step;
    // The exact solve holds `x_D` to §5.3's 1e-6 m.
    expect(xD).toBeCloseTo(217.6, 5);

    const line = vue3dScene({
      placement: placed(symmetric),
      solved: symmetric,
      rider: symmetric.rider,
    }).loaded;
    const lowest = line?.reduce((low, point) => (point.altitude < low.altitude ? point : low));
    // Half-way from A to B: (6,525035 + 6,520783) / 2 and (46,843556 + 46,846166) / 2.
    expect(lowest?.lon).toBeCloseTo(6.522909, 8);
    expect(lowest?.lat).toBeCloseTo(46.844861, 8);
    // 1 440 + 1,5 = 1 441,5 m at A, and the node `z_D` metres under it.
    expect(lowest?.altitude).toBe(1441.5 + zD);
  });

  test("the loaded line is the scene's own, through the passager's node: no vertex of its own", () => {
    // Mid-span on a sloping span the kink falls between two of §4.1's evenly spaced samples: the
    // scene carries the node among its vertices, and the Vue 3D draws those vertices and no other.
    expect(loaded).toHaveLength(scene.rider.cable.xs.length);
    expect(loaded.map((point) => point.altitude)).toContain(1455.2 + scene.rider.step.zD);
    expect(unloaded).toHaveLength(scene.unloadedCable.xs.length);
  });

  test("without wind every vertex stands on the straight ligne A–B in plan", () => {
    // `y ≡ 0` (§19.16): `x / L` of the way from A to B in degrees, nothing to its side.
    const t = (x: number) => x / scene.L;
    for (const [line, cable] of [
      [unloaded, scene.unloadedCable],
      [loaded, scene.rider.cable],
    ] as const) {
      line.forEach((point, i) => {
        const at = t(cable.xs[i] ?? Number.NaN);
        expect(point.lon).toBe(TRIAL_ENDS.A.lon + at * (TRIAL_ENDS.B.lon - TRIAL_ENDS.A.lon));
        expect(point.lat).toBe(TRIAL_ENDS.A.lat + at * (TRIAL_ENDS.B.lat - TRIAL_ENDS.A.lat));
      });
    }
  });

  test("two Brins porteurs are two members the coupe's gap apart, one is one", () => {
    expect(drawn.membersPx).toEqual([0]);
    const two = solved(trial({ carryingLines: 2 }));
    const { membersPx } = vue3dScene({
      placement: placed(two),
      solved: two,
      rider: two.rider,
    });
    expect(membersPx).toHaveLength(2);
    expect((membersPx[1] ?? 0) - (membersPx[0] ?? 0)).toBe(MEMBER_GAP_PX);
  });

  test("with no solve, the Fils à plomb stand and no line is drawn", () => {
    const {
      fils,
      loaded: none,
      unloaded: neither,
    } = vue3dScene({
      placement: placed(scene),
      solved: null,
      rider: null,
    });
    expect([none, neither]).toEqual([null, null]);
    expect(fils.A.anchor.altitude).toBeCloseTo(1455.2, 9);
  });
});

/**
 * The textbook WGS84 radii, written out here as the oracle the projector is held to: metres per
 * degree north (the meridian's `M = a(1 − e²)/(1 − e² sin²φ)^{3/2}`) and east (the prime vertical's
 * `N cos φ`, `N = a/(1 − e² sin²φ)^{1/2}`) at latitude `φ`.
 */
function metresPerDegree(lat: number): { north: number; east: number } {
  const a = 6_378_137;
  const f = 1 / 298.257_223_563;
  const e2 = f * (2 - f);
  const phi = (lat * Math.PI) / 180;
  const w = 1 - e2 * Math.sin(phi) ** 2;
  return {
    north: ((a * (1 - e2)) / w ** 1.5) * (Math.PI / 180),
    east: (a / Math.sqrt(w)) * Math.cos(phi) * (Math.PI / 180),
  };
}

describe("the one projector: §19.2's (x, y, z) on the earth (#118)", () => {
  const A: Position = { lat: 46.95, lon: 7.44 };
  /** B some 600 m from A at a bearing of 90°, 0° and about 30°, by its degrees. */
  const lines = {
    east: { A, B: { lat: A.lat, lon: A.lon + 0.008 } },
    north: { A, B: { lat: A.lat + 0.0054, lon: A.lon } },
    thirty: { A, B: { lat: A.lat + 0.0047, lon: A.lon + 0.004 } },
  } as const;
  const L = 600;
  const topA = 1_000;

  /** The offset of `to` from `from`, m east and north, by the hand radii at the line's mid-latitude. */
  function metres(ends: { A: Position; B: Position }, from: Position, to: Position) {
    const per = metresPerDegree((ends.A.lat + ends.B.lat) / 2);
    return { east: (to.lon - from.lon) * per.east, north: (to.lat - from.lat) * per.north };
  }

  test.each(Object.entries(lines))(
    "%s: y metres to the left of A → B, square to it, z above anchor A",
    (_, ends) => {
      const onEarth = earthFrame({ ends, L, topA });
      const middle = onEarth(L / 2, 0, -5);
      const left = onEarth(L / 2, 10, -5);
      const ab = metres(ends, ends.A, ends.B);
      const d = Math.hypot(ab.east, ab.north);
      // The left of (east, north) is (−north, east): 10 m of it, to the millimetre's thousandth.
      const off = metres(ends, middle, left);
      expect(off.east).toBeCloseTo((-10 * ab.north) / d, 6);
      expect(off.north).toBeCloseTo((10 * ab.east) / d, 6);
      expect(left.altitude).toBe(topA - 5);
      expect(middle.altitude).toBe(topA - 5);
    },
  );

  test("due east, the left of the travel is due north; due north, it is due west", () => {
    const east = earthFrame({ ends: lines.east, L, topA });
    const north = earthFrame({ ends: lines.north, L, topA });
    expect(east(L / 2, 10, 0).lat).toBeGreaterThan(east(L / 2, 0, 0).lat);
    expect(east(L / 2, 10, 0).lon).toBeCloseTo(east(L / 2, 0, 0).lon, 12);
    expect(north(L / 2, 10, 0).lon).toBeLessThan(north(L / 2, 0, 0).lon);
    expect(north(L / 2, 10, 0).lat).toBeCloseTo(north(L / 2, 0, 0).lat, 12);
  });

  test("with y nil a point is x / L of the way from A to B, in degrees, exactly", () => {
    const onEarth = earthFrame({ ends: lines.thirty, L, topA });
    const { A: from, B: to } = lines.thirty;
    for (const x of [0, 150, 300, L]) {
      expect(onEarth(x, 0, 0).lon).toBe(from.lon + (x / L) * (to.lon - from.lon));
      expect(onEarth(x, 0, 0).lat).toBe(from.lat + (x / L) * (to.lat - from.lat));
    }
  });

  test("mirror: y and −y stand either side of A–B, the same distance off, at one altitude", () => {
    const onEarth = earthFrame({ ends: lines.thirty, L, topA });
    const plus = onEarth(200, 7, -3);
    const minus = onEarth(200, -7, -3);
    const on = onEarth(200, 0, -3);
    expect((plus.lon + minus.lon) / 2).toBeCloseTo(on.lon, 12);
    expect((plus.lat + minus.lat) / 2).toBeCloseTo(on.lat, 12);
    expect(plus.altitude).toBe(minus.altitude);
  });

  test("the vue de dessus's projector is the Vue 3D's, altitude aside", () => {
    const ends = lines.thirty;
    const onEarth = earthFrame({ ends, L, topA });
    const onPlan = planFrame({ ends, L });
    for (const [x, y] of [
      [0, 0],
      [123, 4.5],
      [480, -2],
    ] as const) {
      const { lon, lat } = onEarth(x, y, 12);
      expect(onPlan(x, y)).toEqual({ lon, lat });
    }
  });
});

describe("the three views read one set of coordinates (#118)", () => {
  const scene = solved(trial());
  // Hand-set lines in §19.2's frame, standing in for the engine's: the views draw what they are
  // given, so known coordinates are known pictures.
  const line = (xs: number[], ys: number[], zs: number[]): SpaceLine => ({
    xs: Float64Array.from(xs),
    ys: Float64Array.from(ys),
    zs: Float64Array.from(zs),
  });
  const unloadedCable = line(
    [0, 100, 217.6, 300, 435.2],
    [0, 3, 4, 2.5, 0],
    [0, -6, -9, -11, -15.5],
  );
  const cable = line([0, 150, 150, 435.2], [0, 6, 6, 0], [0, -20, -20, -15.5]);
  const runs = [line([20, 40, 60], [1, 2, 3], [-5, -9, -12]), line([90, 110], [5, 6], [-18, -19])];
  const hand: SceneBase = { ...scene, unloadedCable, trajectory: runs };
  const rider = { ...scene.rider, cable };
  const shown = vue3dScene({ placement: placed(scene), solved: hand, rider });
  const topA = 1455.2;
  const onEarth = earthFrame({ ends: TRIAL_ENDS, L: scene.L, topA });

  test("the Vue 3D places every vertex the scene holds, in its order, and no other", () => {
    const expected = (l: SpaceLine) =>
      Array.from(l.xs, (x, i) => onEarth(x, l.ys[i] ?? 0, l.zs[i] ?? 0));
    expect(shown.unloaded).toEqual(expected(unloadedCable));
    expect(shown.loaded).toEqual(expected(cable));
    expect(shown.trajectory).toEqual(runs.map(expected));
  });

  test("the coupe's (x, z) is the Vue 3D's altitude above anchor A at that vertex", () => {
    shown.unloaded?.forEach((point, i) => {
      expect(point.altitude - topA).toBeCloseTo(unloadedCable.zs[i] ?? Number.NaN, 9);
    });
  });

  test("the vue de dessus's (x, y) is the Vue 3D's point seen from above", () => {
    const all = { unloaded: true, trajectory: true };
    const traces = spanTraces({ solved: hand, rider, layers: all });
    if (traces === null) throw new Error("the line solved");
    const plan = planTraces(traces, TRIAL_ENDS);
    const fromAbove = (points: readonly { lon: number; lat: number }[] | null) =>
      points?.map(({ lon, lat }) => ({ lon, lat })) ?? null;
    expect(plan.unloaded).toEqual(fromAbove(shown.unloaded));
    expect(plan.loaded).toEqual(fromAbove(shown.loaded));
    expect(plan.trajectory).toEqual((shown.trajectory ?? []).map(fromAbove));
  });

  test("a trajectory split at a hole stays split: no edge joins two runs", () => {
    const [first, second] = shown.trajectory ?? [];
    expect(first).toHaveLength(3);
    expect(second).toHaveLength(2);
    // The last vertex before the hole and the first after it belong to two polylines.
    expect(first?.at(-1)).toEqual(onEarth(60, 3, -12));
    expect(second?.[0]).toEqual(onEarth(90, 5, -18));
  });

  test("no loaded line at the chosen position: it alone goes, the rest stands", () => {
    const partial = vue3dScene({ placement: placed(scene), solved: hand, rider: null });
    expect(partial.loaded).toBeNull();
    expect(partial.unloaded).toEqual(shown.unloaded);
    expect(partial.trajectory).toEqual(shown.trajectory);
    expect(partial.ligneAB).toEqual(shown.ligneAB);
    expect(partial.fils).toEqual(shown.fils);
  });

  test("the Ligne A–B is the anchors' segment whatever the lines: no calculation moves it", () => {
    const calm = vue3dScene({ placement: placed(scene), solved: scene, rider: scene.rider });
    expect(shown.ligneAB).toEqual(calm.ligneAB);
  });
});

describe("under a cross wind the views draw the computed lines (#118, §19.11)", () => {
  const bearing = lineBearing(TRIAL_ENDS) ?? Number.NaN;
  /** The trial line under 60 km/h from `fromDeg`, the passager mid-span. */
  const windy = (fromDeg: number) =>
    solved(
      trial({ wind: { ...firstRunDefaults().wind, speedKmh: 60, directionDeg: fromDeg % 360 } }),
    );
  // From the right of A → B the wind blows the line to its left, `y > 0`; from the left, `y < 0`.
  const right = windy(bearing + 90);
  const left = windy(bearing + 270);
  const drawn = (scene: ChartScene) =>
    vue3dScene({ placement: placed(scene), solved: scene, rider: scene.rider });

  test("the Ligne à vide and the loaded line both leave A–B, to the lee side", () => {
    const greatest = (l: SpaceLine) => l.ys.reduce((m, y) => (Math.abs(y) > Math.abs(m) ? y : m));
    expect(greatest(right.unloadedCable)).toBeGreaterThan(0.01);
    expect(greatest(right.rider.cable)).toBeGreaterThan(0.01);
    expect(right.rider.yD).toBeGreaterThan(0.01);
    expect(greatest(left.unloadedCable)).toBeLessThan(-0.01);
  });

  test("the Vue 3D's vertices are the scene's own, projected", () => {
    const shown = drawn(right);
    const onEarth = earthFrame({ ends: TRIAL_ENDS, L: right.L, topA: 1455.2 });
    const cable = right.unloadedCable;
    expect(shown.unloaded).toEqual(
      Array.from(cable.xs, (x, i) => onEarth(x, cable.ys[i] ?? 0, cable.zs[i] ?? 0)),
    );
  });

  test("mirror: the wind from the other side mirrors every line about A–B", () => {
    // Same tensions, `y` reversed (§19.17): each pair of vertices stands either side of A–B, and
    // their midpoint is the vertex with `y` nil.
    const [r, l] = [drawn(right), drawn(left)];
    const onEarth = earthFrame({ ends: TRIAL_ENDS, L: right.L, topA: 1455.2 });
    const cable = right.unloadedCable;
    r.unloaded?.forEach((point, i) => {
      const twin = l.unloaded?.[i];
      const on = onEarth(cable.xs[i] ?? 0, 0, cable.zs[i] ?? 0);
      expect(((twin?.lon ?? 0) + point.lon) / 2).toBeCloseTo(on.lon, 8);
      expect(((twin?.lat ?? 0) + point.lat) / 2).toBeCloseTo(on.lat, 8);
      expect(twin?.altitude).toBeCloseTo(point.altitude, 6);
    });
  });

  test("the loaded line holds its trolley node; the Trajectoire is the nodes, not a line shape", () => {
    const { step, yD, cable } = right.rider;
    // The node is a vertex of the loaded line, `(x_D, y_D, z_D)`.
    const at = Array.from(cable.xs).findIndex(
      (x, i) => x === step.xD && cable.ys[i] === yD && cable.zs[i] === step.zD,
    );
    expect(at).toBeGreaterThan(0);
    // It is a vertex of the Trajectoire too — the slot's own `r_D` — and the loaded line's other
    // vertices are not: mid-way to A the line hangs higher than the trolley's locus there.
    const run = right.trajectory[0];
    if (run === undefined) throw new Error("the windy traverse has a Trajectoire");
    const onRun = Array.from(run.xs).findIndex((x) => x === step.xD);
    expect(onRun).toBeGreaterThanOrEqual(0);
    expect(run.ys[onRun]).toBe(yD);
    expect(run.zs[onRun]).toBe(step.zD);
    const quarter = Math.floor(at / 2);
    const xq = cable.xs[quarter] ?? Number.NaN;
    const nearest = Array.from(run.xs).reduce(
      (best, x, i) => (Math.abs(x - xq) < Math.abs((run.xs[best] ?? 0) - xq) ? i : best),
      0,
    );
    expect(cable.zs[quarter]).toBeGreaterThan((run.zs[nearest] ?? 0) + 0.1);
  });
});

describe("the Fils à plomb", () => {
  const scene = solved(trial());
  const { fils } = vue3dScene({
    placement: placed(scene),
    solved: scene,
    rider: scene.rider,
  });

  test.each([
    ["A", TRIAL_ENDS.A, 1453.7, 1.5],
    ["B", TRIAL_ENDS.B, 1438.7, 1],
  ] as const)(
    "%s: a mark on the profil's ground, the anchor its Anchor Height above",
    (anchor, at, ground, height) => {
      const { foot, anchor: top, top: sky } = fils[anchor];
      for (const point of [foot, top, sky]) {
        expect(point.lon).toBeCloseTo(at.lon, 9);
        expect(point.lat).toBeCloseTo(at.lat, 9);
      }
      expect(foot.altitude).toBeCloseTo(ground, 9);
      expect(top.altitude - foot.altitude).toBeCloseTo(height, 9);
    },
  );

  test("the vertical rises past every place the camera may stand, so it leaves the view", () => {
    for (const anchor of ["A", "B"] as const) {
      expect(fils[anchor].top.altitude - fils[anchor].foot.altitude).toBeGreaterThan(CAMERA_REACH);
    }
  });
});

describe("an anchor dragged in the Vue 3D (#97)", () => {
  const scene = solved(trial());
  const shown = vue3dScene({
    placement: placed(scene),
    solved: scene,
    rider: scene.rider,
  });
  /** Where the pointer meets the relief: 0,001° north and east of B, on ground at 1 500 m. */
  const FOOT = { lat: 46.847166, lon: 6.521783, altitude: 1500 };

  test("B's Fil à plomb stands on the relief under the pointer, B its 1 m above; A stays", () => {
    const { fils } = vue3dFollowing(shown, "B", FOOT);
    expect(fils.A).toEqual(shown.fils.A);
    expect(fils.B.foot).toEqual(FOOT);
    expect(fils.B.anchor.lat).toBe(FOOT.lat);
    expect(fils.B.anchor.lon).toBe(FOOT.lon);
    // 1 500 + 1 m.
    expect(fils.B.anchor.altitude).toBeCloseTo(1501, 9);
    expect(fils.B.top.altitude - fils.B.foot.altitude).toBeGreaterThan(CAMERA_REACH);
  });

  test("A keeps its 1,5 m the same way", () => {
    expect(vue3dFollowing(shown, "A", FOOT).fils.A.anchor.altitude).toBeCloseTo(1501.5, 9);
  });

  test("the line that follows is the Ligne A–B, straight from anchor to anchor", () => {
    const { ligneAB, fils } = vue3dFollowing(shown, "B", FOOT);
    // A where the scene stands it, 1 453,7 + 1,5 m; B on the pointer's ground.
    expect(ligneAB).toEqual([shown.fils.A.anchor, fils.B.anchor]);
    expect(ligneAB[0].altitude).toBeCloseTo(1455.2, 9);
  });
});

describe("the coupe's layers in the Vue 3D (#111)", () => {
  const scene = solved(trial());
  const drawn = () => vue3dScene({ placement: placed(scene), solved: scene, rider: scene.rider });
  const ALL: LayerToggles = { unloadedLine: true, chordAB: true, riderTip: true, trajectory: true };

  test("follow the View Strip's defaults: Ligne à vide off, Ligne A–B on, Trajectoire off", () => {
    expect(vue3dLayers(DEFAULT_LAYERS)).toEqual({
      unloaded: false,
      ligneAB: true,
      trajectory: false,
    });
  });

  test.each([
    ["unloadedLine", "unloaded"],
    ["chordAB", "ligneAB"],
    ["trajectory", "trajectory"],
  ] as const)(
    "the View Strip's %s shows or hides the Vue 3D's %s, and only it",
    (toggle, layer) => {
      const off = vue3dLayers({ ...ALL, [toggle]: false });
      expect(off[layer]).toBe(false);
      expect(Object.values(off).filter((shown) => !shown)).toHaveLength(1);
      expect(vue3dLayers(ALL)[layer]).toBe(true);
    },
  );

  test("« distances » has no counterpart in the Vue 3D", () => {
    expect(vue3dLayers({ ...ALL, riderTip: false })).toEqual(vue3dLayers(ALL));
  });

  test("with no View Strip beside it — the Page Terrain — the toggles decide nothing", () => {
    const none = { viewStrip: false } as const;
    const NONE: LayerToggles = {
      unloadedLine: false,
      chordAB: false,
      riderTip: false,
      trajectory: false,
    };
    // #95 and #96: the Ligne à vide, even where the strip's defaults hide it; the
    // Ligne A–B only under a drag, which Terrain never starts; no Trajectoire.
    for (const toggles of [DEFAULT_LAYERS, ALL, NONE]) {
      const shown = vue3dLayers(toggles, none);
      expect(shown.unloaded).toBe(true);
      expect(shown.ligneAB).toBe(false);
      expect(shown.trajectory).toBe(false);
    }
    // With the strip beside it, the same defaults hide the Ligne à vide.
    expect(vue3dLayers(DEFAULT_LAYERS, { viewStrip: true }).unloaded).toBe(false);
  });

  test("the Ligne A–B stands from anchor to anchor without a solve", () => {
    const { ligneAB } = vue3dScene({
      placement: placed(scene),
      solved: null,
      rider: null,
    });
    // A: 1 453,7 + 1,5 = 1 455,2 m. B: 1 438,7 + 1 = 1 439,7 m.
    expect(ligneAB[0].lon).toBe(TRIAL_ENDS.A.lon);
    expect(ligneAB[0].lat).toBe(TRIAL_ENDS.A.lat);
    expect(ligneAB[0].altitude).toBeCloseTo(1455.2, 9);
    expect(ligneAB[1].lon).toBeCloseTo(TRIAL_ENDS.B.lon, 9);
    expect(ligneAB[1].lat).toBeCloseTo(TRIAL_ENDS.B.lat, 9);
    expect(ligneAB[1].altitude).toBeCloseTo(1439.7, 9);
  });

  test("with no solve there is no Trajectoire", () => {
    const none = vue3dScene({
      placement: placed(scene),
      solved: null,
      rider: null,
    });
    expect(none.trajectory).toBeNull();
  });

  test("with no loaded line at x_D, the loaded line alone goes: each trace on its own (§19.11)", () => {
    // Where the chosen position has no loaded line, the Ligne à vide and the Trajectoire are still
    // the line's, and the Ligne A–B needs no solve at all.
    const unplaced = vue3dScene({
      placement: placed(scene),
      solved: scene,
      rider: null,
    });
    expect(unplaced.loaded).toBeNull();
    expect(unplaced.unloaded).toEqual(drawn().unloaded);
    expect(unplaced.trajectory).toEqual(drawn().trajectory);
    expect(unplaced.ligneAB[0].altitude).toBeCloseTo(1455.2, 9);
  });

  test("the loaded line touches the Trajectoire at the passager's node, wherever the passager is", () => {
    const [run] = drawn().trajectory ?? [];
    const engine = scene.trajectory[0];
    if (run === undefined || engine === undefined)
      throw new Error("the trial line has a Trajectoire");
    // The coupe's own run, one vertex per solved step.
    expect(run).toHaveLength(engine.xs.length);
    for (const index of [10, Math.floor(run.length / 2), run.length - 10]) {
      const at = run[index];
      const xD = engine.xs[index];
      if (at === undefined || xD === undefined) throw new Error("a vertex of the run");
      // The passager stood at that step: the loaded line, solved again exactly, passes through it.
      const there = vue3dScene({
        placement: placed(scene),
        solved: scene,
        rider: placeRider(scene, xD),
      }).loaded;
      const node = there?.reduce((near, point) =>
        Math.hypot(point.lon - at.lon, point.lat - at.lat) <
        Math.hypot(near.lon - at.lon, near.lat - at.lat)
          ? point
          : near,
      );
      // §5.3's 1e-6 m: the sweep's step against the exact solve at its abscissa — 1e-9° is 0,1 mm.
      expect(node?.lon).toBeCloseTo(at.lon, 9);
      expect(node?.lat).toBeCloseTo(at.lat, 9);
      expect(node?.altitude).toBeCloseTo(at.altitude, 5);
    }
  });
});

describe("a passager dragged along the coupe moves the loaded line alone (#130)", () => {
  const scene = solved(trial());
  const at = (xD: number, { line = scene } = {}) =>
    vue3dScene({ placement: placed(line), solved: line, rider: placeRider(line, xD) });

  test("another position along the same line: only the loaded line moved", () => {
    const before = at(100);
    const after = at(300);
    expect(after.loaded).not.toEqual(before.loaded);
    expect(onlyLoadedMoved(before, after)).toBe(true);
  });

  test("the same position, built anew: nothing but the loaded line could have moved", () => {
    expect(onlyLoadedMoved(at(100), at(100))).toBe(true);
  });

  test("a Vent moves the Ligne à vide: the line is drawn anew", () => {
    const windy = solved(
      trial({ wind: { ...firstRunDefaults().wind, speedKmh: 40, directionDeg: 40 } }),
    );
    expect(onlyLoadedMoved(at(100), at(300, { line: windy }))).toBe(false);
  });

  test("a heavier passager moves the Trajectoire: the line is drawn anew", () => {
    const heavier = solved(trial({ rider: { ...trial().rider, mp: 200 } }));
    expect(onlyLoadedMoved(at(100), at(100, { line: heavier }))).toBe(false);
  });

  test("an anchor raised moves its Fil à plomb and the Ligne A–B: the line is drawn anew", () => {
    const raised = solved(trial({ anchors: { ...ANCHORS, zB: 3 } }));
    expect(onlyLoadedMoved(at(100), at(100, { line: raised }))).toBe(false);
  });

  test("two Brins porteurs instead of one: the members are drawn anew", () => {
    const two = solved(trial({ carryingLines: 2 }));
    expect(onlyLoadedMoved(at(100), at(100, { line: two }))).toBe(false);
  });

  // One part of the scene changed at a time, the loaded line kept: each part `onlyLoadedMoved`
  // compares has to send the scene to be drawn anew on its own, or a change to it alone would
  // leave the old one drawn. A real change moves several parts together, as the cases above do.
  const nudged = (point: EarthPoint): EarthPoint => ({ ...point, lat: point.lat + 1e-6 });
  const base = at(100);
  const { A, B } = base.fils;
  const [first, ...rest] = base.trajectory ?? [];
  if (base.unloaded === null || first === undefined) {
    throw new Error("the trial line solves, its passager placed");
  }
  const [unloadedHead, ...unloadedRest] = base.unloaded;
  const [runHead, ...runRest] = first;
  if (unloadedHead === undefined || runHead === undefined) {
    throw new Error("the Ligne à vide and the Trajectoire have vertices");
  }
  test.each<[string, Vue3dScene]>([
    [
      "end A",
      { ...base, ends: { ...base.ends, A: { ...base.ends.A, lat: base.ends.A.lat + 1e-6 } } },
    ],
    [
      "end B",
      { ...base, ends: { ...base.ends, B: { ...base.ends.B, lon: base.ends.B.lon + 1e-6 } } },
    ],
    ...(["foot", "anchor", "top"] as const).flatMap((point): [string, Vue3dScene][] => [
      [
        `Fil à plomb A's ${point}`,
        { ...base, fils: { A: { ...A, [point]: nudged(A[point]) }, B } },
      ],
      [
        `Fil à plomb B's ${point}`,
        { ...base, fils: { A, B: { ...B, [point]: nudged(B[point]) } } },
      ],
    ]),
    ["the Ligne A–B", { ...base, ligneAB: [base.ligneAB[0], nudged(base.ligneAB[1])] }],
    ["the Ligne à vide", { ...base, unloaded: [nudged(unloadedHead), ...unloadedRest] }],
    ["the Ligne à vide gone", { ...base, unloaded: null }],
    ["the Trajectoire", { ...base, trajectory: [[nudged(runHead), ...runRest], ...rest] }],
    ["the Trajectoire gone", { ...base, trajectory: null }],
    // The same first member and one more: what an offset-by-offset comparison alone would miss.
    ["the members' count", { ...base, membersPx: [...base.membersPx, MEMBER_GAP_PX] }],
    ["a member's offset", { ...base, membersPx: [MEMBER_GAP_PX] }],
  ])("%s alone changed: the line is drawn anew", (_, changed) => {
    expect(onlyLoadedMoved(base, changed)).toBe(false);
    expect(onlyLoadedMoved(changed, base)).toBe(false);
  });

  test("a loaded line taken away or brought back, the rest kept: the line is drawn anew", () => {
    const noLoaded = { ...base, loaded: null };
    expect(onlyLoadedMoved(base, noLoaded)).toBe(false);
    expect(onlyLoadedMoved(noLoaded, base)).toBe(false);
  });

  test("a loaded line no longer drawn, or drawn again, sends the scene anew", () => {
    const unplaced = vue3dScene({
      placement: placed(scene),
      solved: scene,
      rider: null,
    });
    expect(onlyLoadedMoved(at(100), unplaced)).toBe(false);
    expect(onlyLoadedMoved(unplaced, at(100))).toBe(false);
    expect(onlyLoadedMoved(unplaced, unplaced)).toBe(false);
  });
});
