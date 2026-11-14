/**
 * The lines under the vue de dessus (#93, #94, #96), in one order for the two frames that write
 * them: the live map (`./top-map.tsx`) and the frame that stands in for it when its module cannot
 * arrive (`./deferred-top-map.tsx`, #128). It holds no MapLibre, so the second never pulls the map's
 * chunk into the Page's.
 */

import type { ReactNode } from "react";

import type { Positions } from "@/lib/scenario/types.ts";

import { InfoTip } from "@/components/rail/controls.tsx";
import { anchorReading, BANANE_HELP, MAP_COPY } from "@/lib/map/copy.ts";

/**
 * @param positions the anchors as drawn — a dragged one where the pointer holds it.
 * @param wind the Vent's line (`windReading`, or why the gates withhold it); `null` hides it, as
 *   under the Vue 3D.
 * @param profile the Vent's profile in words (`profileCaption`), under a map that has no pad for
 *   it (#120); absent or `null` where there is none to say.
 * @param gesture what the next click does or what a release is loading; absent where no gesture is
 *   offered.
 * @param unavailable « fond de carte indisponible » is said; `unoriented` adds why the plain drawing
 *   cannot say where north is.
 * @param banane the Banane is on screen, so its note says it is a shape, not a distance.
 * @param vue3d the Vue 3D's own line, last.
 */
export function MapCaption({
  positions,
  wind,
  profile,
  gesture,
  unavailable,
  unoriented,
  banane,
  vue3d,
}: {
  positions: Positions;
  wind: string | null;
  profile?: string | null;
  gesture?: string | null;
  unavailable: boolean;
  unoriented: string | null;
  banane: boolean;
  vue3d?: ReactNode;
}) {
  return (
    <>
      {(["A", "B"] as const).map((anchor) => (
        <span className="font-mono" key={anchor}>
          {anchorReading(anchor, positions)}
        </span>
      ))}
      {wind !== null && <span>{wind}</span>}
      {profile != null && <span>{profile}</span>}
      {gesture !== undefined && <span>{gesture}</span>}
      {unavailable && <span>{[MAP_COPY.unavailable, unoriented].filter(Boolean).join(" · ")}</span>}
      {/* A `title` reached the mouse alone; the `ⓘ` reaches keyboard and touch too (#122). */}
      {banane && (
        <span className="flex items-center gap-1">
          {MAP_COPY.bananeNote}
          <InfoTip label={MAP_COPY.bananeNote} text={BANANE_HELP} />
        </span>
      )}
      {vue3d}
    </>
  );
}
