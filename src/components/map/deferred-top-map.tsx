/**
 * The vue de dessus as the Pages mount it (#128): `./top-map.tsx` once its module is here, and until
 * then the empty frame the Skeleton paints — the same box, so the map lands in the space it held and
 * nothing under it moves. The Page around it is live meanwhile: its fields, tiles, Verdict and coupe
 * never waited for MapLibre. The module is asked for by the route (`./load-top-map.ts`); this only
 * reads it.
 *
 * **On the Page Terrain the coupe is this file's, not the map's.** It stands under the frame at one
 * place in the tree whether the map is on its way or here, so the map's arrival swaps the frame and
 * leaves the coupe as it was — its focus, its peek, its strip. The live map only says, before the
 * paint, whether its Vue 3D stands alone (`readOnly.onShows3d`), and the coupe hides while it does.
 *
 * **A module that cannot arrive is the map's failure, not the Page's.** Offline before it came, the
 * frame shows what the map's own no-WebGL fallback draws without MapLibre: the plain drawing of the
 * ligne A–B and its Banane, the anchors, the Vent's line, « fond de carte indisponible » and the
 * Banane's note — the same caption (`./map-caption.tsx`). What needs the map's module is not there:
 * no rose, no « 3D » (its renderer is fetched from the map's chunk), no Mesure, no anchor placed.
 * The Page stays usable, and the next Page that shows the map asks for it again.
 *
 * **A Vent that varies along the line is never captioned as one speed** (#120). No pad stands
 * here, so once the physics reads the Vent's profile the caption carries its readings under the
 * Vent's line, as under the live map without a pad — by the live map's own rule (`windControls`).
 */

import type { ComponentProps, ReactNode } from "react";

import { useEffect, useState } from "react";

import { useAppState } from "@/components/app/store.tsx";
import { MapOverCoupe, plainDrawing, TopViewFrame } from "@/components/statique/top-view.tsx";
import { bananeAcross } from "@/lib/map/banane.ts";
import { profileCaption, windReading } from "@/lib/map/copy.ts";
import { profilePreview, windControls } from "@/lib/map/wind-rose.ts";
import { windBearing } from "@/lib/rail/gates.ts";

import type { TopMap as LiveTopMap } from "./top-map.tsx";

import { loadedTopMap, loadTopMap } from "./load-top-map.ts";
import { MapCaption } from "./map-caption.tsx";

/**
 * `./top-map.tsx`'s props, but for `readOnly`: the Page Terrain hands its `coupe` here, where it
 * stays mounted across the map's arrival.
 */
type TopMapProps = Omit<ComponentProps<typeof LiveTopMap>, "readOnly"> & {
  readOnly?: { readonly coupe: ReactNode };
};

type Module = NonNullable<ReturnType<typeof loadedTopMap>>;

/** The map's module, `null` while it is on its way, `"failed"` when it could not arrive. */
function useTopMapModule(): Module | null | "failed" {
  const [module, setModule] = useState<Module | null | "failed">(loadedTopMap);
  useEffect(() => {
    if (module !== null) return;
    let current = true;
    loadTopMap().then(
      (arrived) => {
        if (current) setModule(arrived);
      },
      () => {
        if (current) setModule("failed");
      },
    );
    return () => {
      current = false;
    };
  }, [module]);
  return module;
}

/** The vue de dessus, with `./top-map.tsx`'s props: see the file's docblock. */
export function TopMap({ readOnly, ...props }: TopMapProps) {
  const module = useTopMapModule();
  // The live map's word on its Vue 3D; neither the frame nor the fallback has one.
  const [shows3d, setShows3d] = useState(false);
  const live = module !== null && module !== "failed";
  const map = live ? (
    <module.TopMap
      {...props}
      readOnly={readOnly === undefined ? undefined : { onShows3d: setShows3d }}
    />
  ) : module === null ? (
    <TopViewFrame />
  ) : (
    <Unavailable
      frame={props.frame}
      windCause={props.windCause}
      windCulprits={props.windCulprits}
    />
  );
  return readOnly === undefined ? (
    map
  ) : (
    <MapOverCoupe coupe={live && shows3d ? null : readOnly.coupe} map={map} />
  );
}

/** The map's own no-WebGL fallback, drawn without MapLibre: the line, its anchors, its Banane. */
function Unavailable({
  frame,
  windCause,
  windCulprits,
}: Pick<TopMapProps, "frame" | "windCause" | "windCulprits">) {
  const { scenario } = useAppState();
  const { positions } = scenario;
  // A withheld Vent is drawn as none, as the live map draws it.
  const wind = windCause === null ? scenario.wind : { ...scenario.wind, speedKmh: 0 };
  const bearing = windBearing({ positions });
  const across = bananeAcross(wind, bearing);
  const plain = plainDrawing(positions, across);
  // A frame that writes nothing and measures nothing: of the Vent's controls it has the profile's
  // readings alone, where the live map's rule reads the profile out.
  const controls = windControls({
    culprits: windCulprits,
    placed: bearing !== null,
    locked: true,
    measuring: false,
  });
  const preview = controls.preview ? profilePreview(scenario.wind, frame?.L ?? null) : null;
  return (
    <TopViewFrame
      caption={
        <MapCaption
          banane={across !== 0 && positions.A !== null && positions.B !== null}
          positions={positions}
          profile={preview === null ? null : profileCaption(preview)}
          unavailable
          unoriented={plain.unoriented}
          // No rose stands here, so the line offers no handle.
          wind={windCause ?? windReading(wind, bearing, false)}
        />
      }
      figure={plain.figure}
    />
  );
}
