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

import { Banner } from "@/components/app/banner.tsx";
import { LinkStripNotice } from "@/components/app/link-strip.tsx";
import { AppStoreProvider } from "@/components/app/store.tsx";
import { useReadingPage } from "@/components/app/use-page.ts";
import { PendingWrites } from "@/components/app/use-persist.ts";
import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { TopMap } from "@/components/map/top-map.tsx";
import { readDynamics } from "@/lib/scenario/dynamics.ts";
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
  const { state, deduced, strip, surfaces, copyDiagnostic } = useReadingPage({
    page,
    register: "terrain",
  });
  const { cause, clearance, frame, occupant, results, solved } = surfaces;
  const { scenario, trace } = state;
  const { material, rider, wind, dynamics, geometry } = scenario;

  // The ride Dynamique reads, off the same gated traverse: none under a cause. The imported profil
  // sets `ρ` only while it is the line's ground.
  const profile = geometry.source === "trace" ? trace : null;
  const reading = useMemo(
    () =>
      solved === null
        ? null
        : readDynamics({ material, rider, wind, dynamics }, solved, solved, profile),
    [solved, material, rider, wind, dynamics, profile],
  );
  const view = useMemo(
    () => terrainView({ scenario, deduced, results, cause, reading }),
    [scenario, deduced, results, cause, reading],
  );
  const toStatique = useOpenPage("/");

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
                  // The fields its actions point to are Statique's: a jump lands there.
                  banner={
                    <Banner occupant={occupant} onDiagnostic={copyDiagnostic} onJump={toStatique} />
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
        />
      }
    />
  );
}

/**
 * A press that opens `to` on the same Scenario — Statique, where the banner's « voir la première »
 * and « Choisir une marge exigée » take the reader, since this Page shows no field. The Page's
 * pending Session write goes first, as a navigation bar link sends it.
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
