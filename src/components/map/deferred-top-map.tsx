/**
 * The vue de dessus as the Pages mount it (#128): `./top-map.tsx` once its module is here, and until
 * then the empty frame the Skeleton paints — the same box, so the map lands in the space it held and
 * nothing under it moves. The Page around it is live meanwhile: its fields, tiles, Verdict and coupe
 * never waited for MapLibre. The module is asked for by the route (`./load-top-map.ts`); this only
 * reads it.
 *
 * **A module that cannot arrive is the map's failure, not the Page's.** Offline before it came, the
 * frame falls back to what a browser without WebGL gets from the map itself: the plain drawing of
 * the ligne A–B and « fond de carte indisponible ». The Page stays usable, and the next Page that
 * shows the map asks for it again.
 */

import type { ComponentProps } from "react";

import { useEffect, useState } from "react";

import { useAppState } from "@/components/app/store.tsx";
import { MapOverCoupe, plainDrawing, TopViewFrame } from "@/components/statique/top-view.tsx";
import { bananeAcross } from "@/lib/map/banane.ts";
import { anchorReading, MAP_COPY } from "@/lib/map/copy.ts";
import { windBearing } from "@/lib/rail/gates.ts";

import type { TopMap as LiveTopMap } from "./top-map.tsx";

import { loadedTopMap, loadTopMap } from "./load-top-map.ts";

type TopMapProps = ComponentProps<typeof LiveTopMap>;

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
export function TopMap(props: TopMapProps) {
  const module = useTopMapModule();
  if (module !== null && module !== "failed") return <module.TopMap {...props} />;
  const map = module === null ? <TopViewFrame /> : <Unavailable windCause={props.windCause} />;
  // The live map places the Page Terrain's coupe itself; until then the coupe stands under the
  // frame, where the Skeleton drew it.
  return props.readOnly === undefined ? (
    map
  ) : (
    <MapOverCoupe coupe={props.readOnly.coupe} map={map} />
  );
}

/** The map's own no-WebGL fallback, drawn without MapLibre: the line, its anchors, its Banane. */
function Unavailable({ windCause }: { windCause: string | null }) {
  const { scenario } = useAppState();
  const { positions } = scenario;
  const wind = windCause === null ? scenario.wind : { ...scenario.wind, speedKmh: 0 };
  const plain = plainDrawing(positions, bananeAcross(wind, windBearing({ positions })));
  return (
    <TopViewFrame
      caption={
        <>
          {(["A", "B"] as const).map((anchor) => (
            <span className="font-mono" key={anchor}>
              {anchorReading(anchor, positions)}
            </span>
          ))}
          <span>{[MAP_COPY.unavailable, plain.unoriented].filter(Boolean).join(" · ")}</span>
        </>
      }
      figure={plain.figure}
    />
  );
}
