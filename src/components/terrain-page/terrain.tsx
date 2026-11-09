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

import { useLocation, useNavigate } from "@tanstack/react-router";
import { use, useMemo } from "react";

import type { NavigationPath } from "@/lib/app/pages.ts";
import type { FieldId } from "@/lib/rail/fields.ts";

import { Banner } from "@/components/app/banner.tsx";
import { LinkStripNotice } from "@/components/app/link-strip.tsx";
import { AppStoreProvider } from "@/components/app/store.tsx";
import { useReadingPage } from "@/components/app/use-page.ts";
import { PendingWrites } from "@/components/app/use-persist.ts";
import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { TopMap } from "@/components/map/top-map.tsx";
import { gatedRides } from "@/lib/app/surfaces.ts";
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
  const { state, deduced, strip, traverse, surfaces, copyDiagnostic } = useReadingPage({
    page,
    register: "terrain",
  });
  const { cause, clearance, frame, occupant, results, rideCause, solved, windCause } = surfaces;
  const { scenario, trace } = state;

  // The ride Dynamique reads, off the same gated traverse: none under a cause.
  const reading = useMemo(
    () => gatedRides({ solved, rideCause }, traverse, trace),
    [solved, rideCause, traverse, trace],
  );
  const view = useMemo(
    () => terrainView({ scenario, deduced, results, cause, rideCause, reading }),
    [scenario, deduced, results, cause, rideCause, reading],
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
          solved={solved}
          windCause={windCause}
        />
      }
    />
  );
}

/**
 * A press that opens `to` on the same Scenario — Statique, where the banner's « voir la première »
 * and « Choisir une marge exigée » take the reader since this Page shows no field, or Avancé for a
 * ride constant. The Page's pending Session write goes first, as a navigation bar link sends it.
 *
 * @param to an entry of the bar, as `PageLink`'s is: the raw search is written verbatim, and only
 *   the validated bag carries the refusal marker the app Pages' schema types as required.
 */
function useOpenPage(to: NavigationPath): () => void {
  const navigate = useNavigate();
  const search = useLocation({ select: (location) => location.search });
  const pending = use(PendingWrites);
  return () => {
    pending?.flush();
    void navigate({ search, to });
  };
}
