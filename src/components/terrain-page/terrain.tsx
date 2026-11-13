/**
 * The live Page Terrain (#101) — at `/terrain`, in the terrain register, read on a phone during the
 * installation: the visualisation — « 2D », the vue de dessus over the coupe, or « 3D », the Vue 3D
 * — and the five tiles under it.
 *
 * **Read-only.** Everything is computed once by `useReadingPage` from the store every Page reads —
 * the same URL Scenario, the same Session — but with no form, and nothing here writes the Scenario:
 * no field, no anchor to place or drag, no handle on the rose, no passager to scrub. The Mesure and
 * the display choices (2D or 3D, the coupe's layers) are the map's and the Session's. The line is
 * set on Statique, one press away in the navigation bar.
 */

import { useMemo } from "react";

import type { FieldId } from "@/lib/rail/fields.ts";

import { Banner } from "@/components/app/banner.tsx";
import { LinkStripNotice } from "@/components/app/link-strip.tsx";
import { useOpenPage } from "@/components/app/navigation-bar.tsx";
import { AppStoreProvider } from "@/components/app/store.tsx";
import { useReadingPage } from "@/components/app/use-page.ts";
import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { TopMap } from "@/components/map/deferred-top-map.tsx";
import { gateOf } from "@/lib/rail/fields.ts";
import { STATIQUE_GATES } from "@/lib/statique/fields.ts";
import { terrainView } from "@/lib/terrain-page/view.ts";

import { CoupeBox, TerrainFrame } from "./frame.tsx";
import { TerrainTiles } from "./tiles.tsx";

/** @param page the router path of the Page — every link it writes opens it. */
export function Terrain({ page }: { page: string }) {
  return (
    <AppStoreProvider>
      <Live page={page} />
    </AppStoreProvider>
  );
}

/** The Chart Block's collapse hooks: this Page has no collapse, the block scrolls with it. */
function ignore() {}

function Live({ page }: { page: string }) {
  const { ref, width } = useChartWidth();
  const {
    state,
    deduced,
    strip,
    rides: reading,
    surfaces,
    copyDiagnostic,
  } = useReadingPage({
    page,
    register: "terrain",
  });
  const { cause, clearance, frame, occupant, results, rideCause, solved, windCause, windNotice } =
    surfaces;
  const { scenario } = state;

  const view = useMemo(
    () => terrainView({ scenario, deduced, results, cause, rideCause, windNotice, reading }),
    [scenario, deduced, results, cause, rideCause, windNotice, reading],
  );
  const toStatique = useOpenPage("/");
  const toAvance = useOpenPage("/avance");
  // A breach Statique counts is reached there, on its field or through its notice; a ride constant
  // is set on Avancé alone.
  const jump = (field: FieldId) => {
    const gate = gateOf(field, scenario.geometry.source);
    (STATIQUE_GATES.some((counted) => counted === gate) ? toStatique : toAvance)();
  };

  return (
    <TerrainFrame
      strip={<LinkStripNotice strip={strip} />}
      tiles={<TerrainTiles view={view} />}
      visualisation={
        <TopMap
          frame={frame}
          readOnly={{
            coupe: (
              <CoupeBox ref={ref}>
                <ChartBlock
                  // The fields its actions point to are set on another Page: a jump lands there.
                  banner={
                    <Banner occupant={occupant} onDiagnostic={copyDiagnostic} onJump={jump} />
                  }
                  cause={cause}
                  clearance={clearance}
                  frame={frame}
                  onPositionFocus={ignore}
                  onReveal={ignore}
                  readOnly
                  register="terrain"
                  solved={solved}
                  width={width}
                />
              </CoupeBox>
            ),
          }}
          rides={reading}
          solved={solved}
          windCause={windCause}
        />
      }
    />
  );
}
