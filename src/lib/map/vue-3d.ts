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
 *   is off instead, as it does without the two Positions.
 */

import type { Polyline, SceneBase, SceneFrame, SceneRider } from "@/lib/chart/scene.ts";
import type { Position, Positions } from "@/lib/scenario/types.ts";

import type { Fond } from "./display.ts";
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

/** The farthest the camera may stand from what it looks at, m — the Fils à plomb outreach it. */
export const CAMERA_REACH = 20_000;

/** Why the switch to the Vue 3D is off: no two Positions, or no profil to stand the line on. */
export type Vue3dBlock = "positions" | "profil";

/** The two Positions, both known. */
export type Ends = { readonly A: Position; readonly B: Position };

/** What stands the engine's line on the earth: both Positions, and the profil under the span. */
export type Vue3dPlacement = {
  readonly ends: Ends;
  /** The coupe's input half: portée, dénivelé, Anchor Heights. */
  readonly frame: SceneFrame;
  /** The profil's altitude under each anchor. */
  readonly bases: NonNullable<SceneFrame["bases"]>;
};

/**
 * Can the Vue 3D stand? It needs both anchors on the earth and the profil's altitude under them.
 *
 * @param frame the coupe's input half — `null` for the *exception géométrique*, which has no profil
 *   either.
 * @returns where the line stands, or why the switch is off.
 */
export function vue3dPlacement(
  positions: Positions,
  frame: SceneFrame | null,
):
  | { readonly ok: true; readonly placement: Vue3dPlacement }
  | { readonly ok: false; readonly block: Vue3dBlock } {
  const { A, B } = positions;
  if (A === null || B === null) return { ok: false, block: "positions" };
  if (frame === null || frame.bases === null) return { ok: false, block: "profil" };
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

/** Everything the Vue 3D draws over the relief. */
export type Vue3dScene = {
  readonly ends: Ends;
  readonly fils: { readonly A: FilAPlomb; readonly B: FilAPlomb };
  /** The Ligne à vide — `null` under « Aucun résultat », when the line did not solve. */
  readonly unloaded: readonly EarthPoint[] | null;
  /**
   * The loaded line at the Scenario's passager, through the passager's own node — `null` under
   * « Aucun résultat », or where the exact solve at that position refused.
   */
  readonly loaded: readonly EarthPoint[] | null;
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
 * @param rider the passager placed at the Scenario's `x_D`, or `null`.
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
  const fil = (x: number, top: number, height: number): FilAPlomb => {
    const foot = onEarth(x, top - height);
    return { foot, anchor: onEarth(x, top), top: { ...foot, altitude: foot.altitude + FIL_RISE } };
  };
  return {
    ends,
    fils: { A: fil(0, 0, anchors.zA), B: fil(L, h, anchors.zB) },
    unloaded: solved === null ? null : alongLine(onBanane, solved.unloadedCable),
    loaded:
      solved === null || rider === null
        ? null
        : alongLine(onEarth, throughNode(rider.cable, rider.step.xD, rider.step.zD)),
    membersPx: solved?.members.map((member) => member.offsetPx) ?? [0],
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
  ends: Ends;
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
