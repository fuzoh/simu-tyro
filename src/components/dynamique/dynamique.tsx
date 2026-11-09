/**
 * The live Page Dynamique (#92) — at `/dynamique`, in the terrain register: what the passager
 * lives. A coupe with the loaded line and the passager's loaded trajectory, the curve of speed and
 * acceleration under it on the same x scale, the two Points d'arrêt — sans vent, then avec le vent
 * saisi — and the vitesse d'arrivée, every value an « estimation ». No Verdict: it stays on
 * Statique, Avancé and Terrain.
 *
 * **One Scenario, one writer**, as on every app Page: everything is computed once by `usePage` from
 * the store Avancé reads, and published through the same `usePersist`. The rides are the one thing
 * this Page adds, read off the same solved traverse the coupe draws — `gatedRides`, never a second
 * sweep, and none while the Wind or Ride Gate withholds them.
 */

import { useMemo } from "react";

import type { DynamiqueSolved } from "@/lib/dynamique/scene.ts";
import type { FieldId } from "@/lib/rail/fields.ts";

import { jumpOrAvance } from "@/components/app/avance-notice.tsx";
import { Banner } from "@/components/app/banner.tsx";
import { LinkStripNotice } from "@/components/app/link-strip.tsx";
import { AppStoreProvider } from "@/components/app/store.tsx";
import { usePage } from "@/components/app/use-page.ts";
import { useViewport } from "@/components/app/use-viewport.ts";
import { DynamiqueCharts } from "@/components/chart/dynamique.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { banner, pageReport } from "@/lib/app/banner.ts";
import { gatedRides } from "@/lib/app/surfaces.ts";
import { DYNAMIQUE_GATES, INCOMPLETE } from "@/lib/dynamique/copy.ts";
import { dynamiqueOutputs } from "@/lib/dynamique/outputs.ts";

import { DynamiqueFields, shownOnDynamique } from "./fields.tsx";
import { DynamiqueFrame } from "./frame.tsx";
import { DynamiqueOutputTiles } from "./outputs.tsx";

/** @param page the router path of the Page — every link it writes opens it. */
export function Dynamique({ page }: { page: string }) {
  return (
    <AppStoreProvider>
      <Live page={page} />
    </AppStoreProvider>
  );
}

function Live({ page }: { page: string }) {
  const { ref, width } = useChartWidth();
  // Read for its side effect alone: it writes `--kb`, the iOS keyboard inset the frame pads by.
  useViewport();
  const { state, strip, traverse, rail, surfaces, copyDiagnostic } = usePage({
    page,
    register: "terrain",
  });
  const { cause, clearance, frame, refusal, rideCause, saisie, solved } = surfaces;
  // The Verdict, and the request for a marge exigée that asks for one, are not this Page's: only
  // what stops the computation or the rides reaches the banner here.
  const occupant = useMemo(
    () =>
      banner({
        report: pageReport(rail.report, DYNAMIQUE_GATES),
        refusal,
        saisie,
        verdict: null,
        register: "terrain",
      }),
    [rail.report, refusal, saisie],
  );
  const { material } = state.scenario;

  // What the gates leave: no ride under « Aucun résultat » or while a ride value is refused.
  const reading = useMemo(
    () => gatedRides({ solved, rideCause }, traverse, state.trace),
    [solved, rideCause, traverse, state.trace],
  );
  const model = useMemo(
    () => (reading === null ? null : dynamiqueOutputs(reading, material.family)),
    [reading, material.family],
  );
  const dynamicSolved: DynamiqueSolved | null =
    solved === null
      ? null
      : {
          base: solved,
          rides: reading === null || model === null ? null : { reading, outputs: model },
        };
  // A ride withheld by the gates, or a solved but incomplete traverse, says why where the curve
  // and the tiles would be.
  const said = cause ?? rideCause ?? (solved !== null && model === null ? INCOMPLETE : null);

  const jump = (field: FieldId) => jumpOrAvance(field, shownOnDynamique(field));

  return (
    <DynamiqueFrame
      fields={<DynamiqueFields rail={rail} />}
      outputs={
        model === null ? (
          <p className="text-muted-foreground text-xs">{said}</p>
        ) : (
          <DynamiqueOutputTiles model={model} />
        )
      }
      section={
        <DynamiqueCharts
          banner={<Banner occupant={occupant} onDiagnostic={copyDiagnostic} onJump={jump} />}
          cause={said}
          clearance={clearance}
          frame={frame}
          solved={dynamicSolved}
          width={width}
        />
      }
      sectionRef={ref}
      strip={<LinkStripNotice strip={strip} />}
    />
  );
}
