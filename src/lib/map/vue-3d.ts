/**
 * The Vue 3D's pure half (#95): when it can stand, what it drapes, and where every vertex it draws
 * stands on the earth. The renderer (`@/components/map/vue-3d-renderer.ts`, CesiumJS) is loaded
 * only when the 3D is chosen; nothing here imports it, so this module rides in the Page's own chunk
 * and a `node` test reaches all of it.
 *
 * Rules this module exists to keep:
 *
 * - **The lines are the engine's, never redrawn.** The Ligne à vide is the solve's own sampled
 *   catenary (`SceneBase.unloadedCable`), the loaded line the exact solve at the Scenario's passager
 *   (`placeRider`) — no parabola, no resampling. Each vertex `(x, z)` of the engine's frame becomes
 *   one point: `x / L` of the way from Position A to Position B, at anchor A's altitude plus `z`.
 * - **Anchor A's altitude is the profil's.** The profil's altitude under A plus A's Anchor Height;
 *   B then lands on the profil's altitude under B plus B's Anchor Height through the engine's own
 *   dénivelé. swisstopo's terrain answers within 0,2 m of the profil at the trial's anchors
 *   (prototype #63: 1 415,9 / 1 442,5 m against the CSV's 1 415,7 / 1 442,6 m), so profil altitudes
 *   are drawn as the relief's heights, with no datum shift.
 * - **The Ligne à vide wears the Banane** (#96): its vertices keep their altitude and are pushed
 *   sideways by the drawn bow (`./banane.ts`); the loaded line and the Fils à plomb stay straight —
 *   the bow is the unloaded line's, and says nothing of the line under a passager.
 * - **No profil, no Vue 3D.** Manual geometry has a span and a dénivelé but no altitude to stand
 *   them on; placing them on the relief would be a rule nobody decided, so the switch says why it
 *   is off instead, as it does without the two Positions. A profil that does not run between the
 *   two Positions (`profilRunsBetween`) is no profil here: its altitudes are another line's.
 * - **A dragged anchor takes its Fil à plomb and the Ligne A–B with it, and nothing else** (#97).
 *   The engine's lines belong to the last release; until the next one has its profil they are not
 *   drawn, rather than drawn between ends they were not solved for.
 * - **The coupe's layers are the Vue 3D's** (#111): the View Strip's « ligne à vide », « corde A–B »
 *   and « trajectoire » show or hide the Ligne à vide, the Ligne A–B and the Trajectoire here too,
 *   with no picker of the Vue 3D's own; the loaded line is always drawn, as on the coupe. The layers
 *   are no part of the scene (`vue3dLayers`): a toggle shows or hides what is drawn, and redraws
 *   nothing. The Ligne A–B and the Fils à plomb need no solve, so they stand under « Aucun
 *   résultat » as well.
 */

import type { Polyline, SceneBase, SceneFrame, SceneRider } from "@/lib/chart/scene.ts";
import type { Positions } from "@/lib/scenario/types.ts";
import type { LayerToggles } from "@/lib/session/session.ts";
import type { Trace, TraceEnds } from "@/lib/terrain/trace.ts";

import { profilRunsBetween } from "@/lib/terrain/trace.ts";

import type { Fond } from "./display.ts";
import type { Anchor } from "./gesture.ts";
import type { WmtsLayer } from "./style.ts";

import { bananePoint } from "./banane.ts";
import { RASTER_FONDS } from "./style.ts";

/**
 * swisstopo's terrain in quantized-mesh, its `layer.json` here — no Cesium ion token. The layer
 * names its own dated tile set (`20250101/` on 2026-11-08), so the Vue 3D follows swisstopo's
 * update rather than pinning one.
 */
export const TERRAIN_URL = "https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/";

/**
 * The carte claire draped on the relief. It is vector tiles, and the Vue 3D drapes raster: swisstopo
 * serves no raster light base map — its WMTS GetCapabilities for EPSG:3857, read on 2026-11-08, has
 * only the light base map's relief shading (`ch.swisstopo.leichte-basiskarte_reliefschattierung`).
 * Its raster equivalent is the grey national map, swisstopo's light raster background, attributed
 * « swisstopo » in geo.admin's `layersConfig`.
 */
const CARTE_CLAIRE_RASTER = {
  id: "ch.swisstopo.pixelkarte-grau",
  format: "jpeg",
  maxzoom: 19,
  attribution: "© swisstopo",
} as const satisfies WmtsLayer;

/** What each Fond de carte drapes in the Vue 3D: itself where it is raster, its equivalent where not. */
export const DRAPED = {
  "carte-claire": CARTE_CLAIRE_RASTER,
  orthophoto: RASTER_FONDS.orthophoto,
  "carte-nationale": RASTER_FONDS["carte-nationale"],
} as const satisfies Record<Fond, WmtsLayer>;

/** The attribution the Vue 3D shows for a Fond: its draped imagery's — the terrain is swisstopo's. */
export function drapedAttribution(fond: Fond): string {
  return DRAPED[fond].attribution;
}

/**
 * How far the Fil à plomb's dashed vertical rises above its foot, m: past the camera's reach
 * ({@link CAMERA_REACH}), so it leaves the top of the view at every zoom. A drawing length, not a
 * measurement.
 */
export const FIL_RISE = 100_000;

/**
 * The farthest the camera stands back, m: the height a zoom out stops at, and the farthest the Vue
 * latérale stands from the line — the Fils à plomb outreach it.
 */
export const CAMERA_REACH = 20_000;

/** Why the switch to the Vue 3D is off: no two Positions, or no profil to stand the line on. */
export type Vue3dBlock = "positions" | "profil";

/** What stands the engine's line on the earth: both Positions, and the profil under the span. */
export type Vue3dPlacement = {
  readonly ends: TraceEnds;
  /** The coupe's input half: portée, dénivelé, Anchor Heights. */
  readonly frame: SceneFrame;
  /** The profil's altitude under each anchor. */
  readonly bases: NonNullable<SceneFrame["bases"]>;
};

/**
 * Can the Vue 3D stand? It needs both anchors on the earth and the altitude under them of a profil
 * that runs between them.
 *
 * @param frame the coupe's input half — `null` for the *exception géométrique*, which has no profil
 *   either.
 * @param profil the profil the coupe stands on, `null` for manual geometry.
 * @returns where the line stands, or why the switch is off.
 */
export function vue3dPlacement(
  positions: Positions,
  frame: SceneFrame | null,
  profil: Trace | null,
):
  | { readonly ok: true; readonly placement: Vue3dPlacement }
  | { readonly ok: false; readonly block: Vue3dBlock } {
  const { A, B } = positions;
  if (A === null || B === null) return { ok: false, block: "positions" };
  if (frame === null || frame.bases === null || !profilRunsBetween({ A, B }, profil)) {
    return { ok: false, block: "profil" };
  }
  return { ok: true, placement: { ends: { A, B }, frame, bases: frame.bases } };
}

/** A point of the Vue 3D: WGS84 degrees, and an altitude in metres, the profil's own. */
export type EarthPoint = { readonly lon: number; readonly lat: number; readonly altitude: number };

/** One anchor on its Fil à plomb. */
export type FilAPlomb = {
  /** The mark on the ground, at the anchor's foot: the profil's altitude under the anchor. */
  readonly foot: EarthPoint;
  /** The anchor itself, its Anchor Height above the foot. */
  readonly anchor: EarthPoint;
  /** Where the dashed vertical stops, {@link FIL_RISE} above the foot. */
  readonly top: EarthPoint;
};

/**
 * Which of the View Strip's layers the Vue 3D shows. « distances », the passager's tip, has no
 * counterpart here; the loaded line and the Fils à plomb are always drawn.
 */
export type Vue3dLayers = {
  /** « ligne à vide ». */
  readonly unloaded: boolean;
  /** « corde A–B ». */
  readonly ligneAB: boolean;
  /** « trajectoire ». */
  readonly trajectory: boolean;
};

/**
 * The layers of a Vue 3D with no View Strip beside it — the Page Terrain's, whose coupe, and the
 * strip with it, hides while the 3D is shown: the view draws what it drew before the layers came to
 * it (#95, #96), the Ligne à vide with its Banane and the loaded line.
 */
const NO_VIEW_STRIP_LAYERS: Vue3dLayers = {
  unloaded: true,
  ligneAB: false,
  trajectory: false,
};

/**
 * The layers the Vue 3D shows: the View Strip's toggles where the strip stands beside it; with
 * none beside it, toggles the reader cannot reach decide nothing ({@link NO_VIEW_STRIP_LAYERS}).
 */
export function vue3dLayers(
  { unloadedLine, chordAB, trajectory }: LayerToggles,
  { viewStrip }: { readonly viewStrip: boolean } = { viewStrip: true },
): Vue3dLayers {
  if (!viewStrip) return NO_VIEW_STRIP_LAYERS;
  return { unloaded: unloadedLine, ligneAB: chordAB, trajectory };
}

/** Everything the Vue 3D draws over the relief. */
export type Vue3dScene = {
  readonly ends: TraceEnds;
  readonly fils: { readonly A: FilAPlomb; readonly B: FilAPlomb };
  /** The Ligne A–B, straight from anchor to anchor: it needs no solve. */
  readonly ligneAB: readonly [EarthPoint, EarthPoint];
  /**
   * The Ligne à vide — `null` under « Aucun résultat », when the line did not solve, or where the
   * passager could not be placed: the coupe draws its solved half only with the passager.
   */
  readonly unloaded: readonly EarthPoint[] | null;
  /**
   * The loaded line at the Scenario's passager, through the passager's own node — `null` under
   * « Aucun résultat », or where the exact solve at that position refused.
   */
  readonly loaded: readonly EarthPoint[] | null;
  /**
   * The Trajectoire — the passager's node over the whole traverse, one polyline per run as the
   * coupe splits it (`SceneBase.trajectory`) — or `null` under « Aucun résultat » or with no
   * passager placed, as the Ligne à vide. Straight like the loaded line it hangs from: the Banane is
   * the Ligne à vide's.
   */
  readonly trajectory: readonly (readonly EarthPoint[])[] | null;
  /**
   * One shift per Brin porteur, px, down positive — the coupe's (`SceneBase.members`): two members
   * are one solve drawn twice, told apart on screen and nowhere else (#4).
   */
  readonly membersPx: readonly number[];
};

/**
 * The scene, from what the coupe already computed.
 *
 * @param solved the solved half, or `null` under « Aucun résultat ».
 * @param rider the passager placed at the Scenario's `x_D`, or `null` — then no engine line stands.
 * @param across the wind's cross component, m/s: the Ligne à vide's bow, nil without it.
 */
export function vue3dScene({
  placement: { ends, frame, bases },
  solved,
  rider,
  across,
}: {
  placement: Vue3dPlacement;
  solved: SceneBase | null;
  rider: SceneRider | null;
  across: number;
}): Vue3dScene {
  const { L, h, anchors } = frame;
  const topA = bases.zBaseA + anchors.zA;
  const onEarth = earthFrame({ ends, L, topA });
  const onBanane = earthFrame({ ends, L, topA, across });
  const fil = (x: number, top: number, height: number) =>
    filAPlomb(onEarth(x, top - height), height);
  const fils = { A: fil(0, 0, anchors.zA), B: fil(L, h, anchors.zB) };
  return {
    ends,
    fils,
    ligneAB: [fils.A.anchor, fils.B.anchor],
    // As on the coupe, the solved half stands only with the passager placed: no Ligne à vide nor
    // Trajectoire under a loaded line the exact solve at x_D refused.
    ...(solved === null || rider === null
      ? { unloaded: null, loaded: null, trajectory: null }
      : {
          unloaded: alongLine(onBanane, solved.unloadedCable),
          loaded: alongLine(onEarth, throughNode(rider.cable, rider.step.xD, rider.step.zD)),
          trajectory: solved.trajectory.map((run) => alongLine(onEarth, run)),
        }),
    membersPx: solved?.members.map((member) => member.offsetPx) ?? [0],
  };
}

/**
 * Does `after` differ from `before` by the loaded line alone — the passager moved along the same
 * line, as a drag on the coupe moves it (#130)? Then the renderer moves that line and leaves every
 * other one drawn; anything else — a new solve, a Vent, a Position, a passager placed or no longer
 * placed — draws the scene anew.
 *
 * Compared by value, not by identity: the Page builds the scene anew on every move of the passager,
 * its unchanged parts equal but not the same objects. Exact equality, as the same inputs give the
 * same numbers.
 */
export function onlyLoadedMoved(before: Vue3dScene, after: Vue3dScene): boolean {
  return (
    before.loaded !== null &&
    after.loaded !== null &&
    samePoint(before.ends.A, after.ends.A) &&
    samePoint(before.ends.B, after.ends.B) &&
    (["A", "B"] as const).every((name) =>
      (["foot", "anchor", "top"] as const).every((point) =>
        samePoint(before.fils[name][point], after.fils[name][point]),
      ),
    ) &&
    samePoints(before.ligneAB, after.ligneAB) &&
    sameLines(
      before.unloaded === null ? null : [before.unloaded],
      after.unloaded === null ? null : [after.unloaded],
    ) &&
    sameLines(before.trajectory, after.trajectory) &&
    before.membersPx.length === after.membersPx.length &&
    before.membersPx.every((offset, i) => offset === after.membersPx[i])
  );
}

function samePoint(
  a: { readonly lat: number; readonly lon: number; readonly altitude?: number },
  b: { readonly lat: number; readonly lon: number; readonly altitude?: number },
): boolean {
  return a.lat === b.lat && a.lon === b.lon && a.altitude === b.altitude;
}

function samePoints(a: readonly EarthPoint[], b: readonly EarthPoint[]): boolean {
  return a.length === b.length && a.every((point, i) => samePoint(point, b[i]!));
}

function sameLines(
  a: readonly (readonly EarthPoint[])[] | null,
  b: readonly (readonly EarthPoint[])[] | null,
): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((line, i) => samePoints(line, b[i]!));
}

/** What the Vue 3D draws while an anchor follows the pointer (#97). */
export type Vue3dFollowing = {
  readonly fils: { readonly A: FilAPlomb; readonly B: FilAPlomb };
  /** The Ligne A–B, straight from anchor to anchor. */
  readonly ligneAB: readonly [EarthPoint, EarthPoint];
};

/**
 * The scene with `anchor` moved: its Fil à plomb stands on `foot`, its Anchor Height kept; the
 * other anchor stays where the scene has it.
 *
 * @param foot the relief under the pointer, at the detail the view shows during the gesture and
 *   sampled at the finest after the release.
 */
export function vue3dFollowing(
  scene: Vue3dScene,
  anchor: Anchor,
  foot: EarthPoint,
): Vue3dFollowing {
  const held = scene.fils[anchor];
  const moved = filAPlomb(foot, held.anchor.altitude - held.foot.altitude);
  const fils = anchor === "A" ? { A: moved, B: scene.fils.B } : { A: scene.fils.A, B: moved };
  return { fils, ligneAB: [fils.A.anchor, fils.B.anchor] };
}

function filAPlomb(foot: EarthPoint, height: number): FilAPlomb {
  return {
    foot,
    anchor: { ...foot, altitude: foot.altitude + height },
    top: { ...foot, altitude: foot.altitude + FIL_RISE },
  };
}

/**
 * The engine's frame on the earth: `x` metres from A along the ligne A–B, `z` metres above anchor
 * A. Interpolated linearly in degrees: over a span of a few kilometres the error is millimetres.
 * With a cross wind the frame is the Banane's: each point pushed sideways by the drawn bow.
 */
export function earthFrame({
  ends,
  L,
  topA,
  across = 0,
}: {
  ends: TraceEnds;
  /** Portée, m: `x` runs from 0 at A to `L` at B. */
  L: number;
  /** Anchor A's altitude, m. */
  topA: number;
  /** The wind's cross component, m/s; the line is straight without it. */
  across?: number;
}): (x: number, z: number) => EarthPoint {
  return (x, z) => ({ ...bananePoint(ends, x / L, across), altitude: topA + z });
}

function alongLine(onEarth: (x: number, z: number) => EarthPoint, line: Polyline): EarthPoint[] {
  return Array.from(line.xs, (x, i) => onEarth(x, line.zs[i] ?? Number.NaN));
}

/**
 * The loaded line with the passager's node among its vertices. The engine samples the cable evenly
 * along its length, so the kink under the trolley — the loaded line's own low point — falls between
 * two vertices; the node is the engine's too (`z_D` at `x_D`), and drawing through it puts the low
 * point exactly where the engine computed it.
 */
function throughNode(line: Polyline, xD: number, zD: number): Polyline {
  const at = line.xs.findIndex((x) => x >= xD);
  if (at === -1) return line;
  if (line.xs[at] === xD) {
    const zs = Float64Array.from(line.zs);
    zs[at] = zD;
    return { xs: line.xs, zs };
  }
  const xs = new Float64Array(line.xs.length + 1);
  const zs = new Float64Array(line.zs.length + 1);
  xs.set(line.xs.subarray(0, at));
  zs.set(line.zs.subarray(0, at));
  xs[at] = xD;
  zs[at] = zD;
  xs.set(line.xs.subarray(at), at + 1);
  zs.set(line.zs.subarray(at), at + 1);
  return { xs, zs };
}
