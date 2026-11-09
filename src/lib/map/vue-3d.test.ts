/**
 * The Vue 3D's pure half (#95): when the switch is off and why, what each Fond drapes, and where the
 * engine's lines and the Fils à plomb stand on the earth — and what follows an anchor dragged there
 * (#97).
 *
 * The line is the trial's (#68): Positions as the geo.admin export spells them, a three-sample profil
 * with the export's altitudes under A (1 453,7 m) and B (1 438,7 m), Anchor Heights 1,5 and 1 m.
 * Every expected altitude below is that arithmetic, shown where it is used.
 */

import { describe, expect, test } from "vitest";

import type { ChartScene } from "@/lib/chart/scene.ts";
import type { Scenario } from "@/lib/scenario/types.ts";
import type { LayerToggles } from "@/lib/session/session.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { buildScene, buildSceneFrame, MEMBER_GAP_PX, placeRider } from "@/lib/chart/scene.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { placeSpan } from "@/lib/scenario/geometry.ts";
import { DEFAULT_LAYERS } from "@/lib/session/session.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";

import { mapStyle, wmtsTiles } from "./style.ts";
import {
  CAMERA_REACH,
  DRAPED,
  NO_VIEW_STRIP_LAYERS,
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
        across: 0,
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
    across: 0,
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
      across: 0,
    }).loaded;
    const lowest = line?.reduce((low, point) => (point.altitude < low.altitude ? point : low));
    // Half-way from A to B: (6,525035 + 6,520783) / 2 and (46,843556 + 46,846166) / 2.
    expect(lowest?.lon).toBeCloseTo(6.522909, 8);
    expect(lowest?.lat).toBeCloseTo(46.844861, 8);
    // 1 440 + 1,5 = 1 441,5 m at A, and the node `z_D` metres under it.
    expect(lowest?.altitude).toBe(1441.5 + zD);
  });

  test("the loaded line is the engine's sampled cable, drawn through the passager's node", () => {
    // Mid-span on a sloping span, the kink falls between two of the engine's evenly spaced samples.
    expect(loaded).toHaveLength(scene.rider.cable.xs.length + 1);
    expect(loaded.map((point) => point.altitude)).toContain(1455.2 + scene.rider.step.zD);
    expect(unloaded).toHaveLength(scene.unloadedCable.xs.length);
  });

  test("two Brins porteurs are two members the coupe's gap apart, one is one", () => {
    expect(drawn.membersPx).toEqual([0]);
    const two = solved(trial({ carryingLines: 2 }));
    const { membersPx } = vue3dScene({
      placement: placed(two),
      solved: two,
      rider: two.rider,
      across: 0,
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
      across: 0,
    });
    expect([none, neither]).toEqual([null, null]);
    expect(fils.A.anchor.altitude).toBeCloseTo(1455.2, 9);
  });
});

describe("the Banane on the Ligne à vide", () => {
  const scene = solved(trial());
  const windy = vue3dScene({
    placement: placed(scene),
    solved: scene,
    rider: scene.rider,
    across: 10,
  });
  const calm = vue3dScene({
    placement: placed(scene),
    solved: scene,
    rider: scene.rider,
    across: 0,
  });

  test("bows the Ligne à vide sideways at the profil's altitudes, anchors fixed", () => {
    const [bowed, straight] = [windy.unloaded, calm.unloaded];
    if (bowed === null || straight === null) throw new Error("both lines are drawn");
    expect(bowed).toHaveLength(straight.length);
    expect(bowed.map((point) => point.altitude)).toEqual(straight.map((point) => point.altitude));
    expect(bowed[0]).toEqual(straight[0]);
    const middle = Math.floor(bowed.length / 2);
    expect(bowed[middle]?.lat).not.toBeCloseTo(straight[middle]?.lat ?? 0, 6);
    expect(bowed.at(-1)?.lon).toBeCloseTo(straight.at(-1)?.lon ?? 0, 9);
    expect(bowed.at(-1)?.lat).toBeCloseTo(straight.at(-1)?.lat ?? 0, 9);
  });

  test("leaves the loaded line and the Fils à plomb straight", () => {
    expect(windy.loaded).toEqual(calm.loaded);
    expect(windy.fils).toEqual(calm.fils);
  });
});

describe("the Fils à plomb", () => {
  const scene = solved(trial());
  const { fils } = vue3dScene({
    placement: placed(scene),
    solved: scene,
    rider: scene.rider,
    across: 0,
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
    across: 10,
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

  test("the line that follows is the Ligne A–B, straight from anchor to anchor, without the Banane", () => {
    const { ligneAB, fils } = vue3dFollowing(shown, "B", FOOT);
    // A where the scene stands it, 1 453,7 + 1,5 m; B on the pointer's ground.
    expect(ligneAB).toEqual([shown.fils.A.anchor, fils.B.anchor]);
    expect(ligneAB[0].altitude).toBeCloseTo(1455.2, 9);
  });
});

describe("the coupe's layers in the Vue 3D (#111)", () => {
  const scene = solved(trial());
  const drawn = (across = 0) =>
    vue3dScene({ placement: placed(scene), solved: scene, rider: scene.rider, across });
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

  test("with no View Strip beside it — the Page Terrain — the Vue 3D keeps the lines it drew before", () => {
    // #95 and #96: the Ligne à vide with its Banane and the loaded line; the Ligne A–B only under a
    // drag, which Terrain never starts; no Trajectoire.
    expect(NO_VIEW_STRIP_LAYERS).toEqual({ unloaded: true, ligneAB: false, trajectory: false });
  });

  test("the Ligne A–B stands from anchor to anchor without a solve", () => {
    const { ligneAB } = vue3dScene({
      placement: placed(scene),
      solved: null,
      rider: null,
      across: 0,
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
      across: 0,
    });
    expect(none.trajectory).toBeNull();
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
        across: 0,
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

  test("the Banane bows the Ligne à vide, never the Trajectoire", () => {
    expect(drawn(10).trajectory).toEqual(drawn(0).trajectory);
  });
});
