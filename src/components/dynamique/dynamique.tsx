/**
 * The live Page Dynamique (#92) — at `/dynamique`, in the terrain register: what the passager
 * lives. A coupe with the loaded line and the passager's loaded trajectory, the curve of speed and
 * acceleration under it on the same x scale, the two Points d'arrêt — sans vent, then avec le vent
 * saisi — and the vitesse d'arrivée, every value an « estimation ». No Verdict: it stays on
 * Statique, Avancé and Terrain.
 *
 * **One Scenario, one writer**, as on every app Page: everything is computed once by `usePage` from
 * the store Avancé reads, and published through the same `usePersist`. The rides are the one thing
 * this Page adds, read off the same solved traverse the coupe draws — `readDynamics`, never a second
 * sweep.
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
import { banner, solveGateReport } from "@/lib/app/banner.ts";
import { INCOMPLETE } from "@/lib/dynamique/copy.ts";
import { dynamiqueOutputs } from "@/lib/dynamique/outputs.ts";
import { readDynamics } from "@/lib/scenario/dynamics.ts";

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
  const { state, strip, rail, surfaces, copyDiagnostic } = usePage({ page, register: "terrain" });
  const { cause, clearance, frame, refusal, saisie, solved } = surfaces;
  // The Verdict, and the request for a marge exigée that asks for one, are not this Page's: only
  // what stops the computation reaches the banner here.
  const occupant = useMemo(
    () =>
      banner({
        report: solveGateReport(rail.report),
        refusal,
        saisie,
        verdict: null,
        register: "terrain",
      }),
    [rail.report, refusal, saisie],
  );
  const { material, rider, wind, dynamics, geometry } = state.scenario;

  // `solved` is what the gates leave: a Solve breach or a refusal is « Aucun résultat », and there
  // is no ride to read. The imported profil sets `ρ` only while it is the line's ground.
  const profile = geometry.source === "trace" ? state.trace : null;
  const reading = useMemo(
    () =>
      solved === null
        ? null
        : readDynamics({ material, rider, wind, dynamics }, solved, solved, profile),
    [solved, material, rider, wind, dynamics, profile],
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
  // A solved but incomplete traverse has no ride, and says why where the curve would be.
  const said = cause ?? (solved !== null && model === null ? INCOMPLETE : null);

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
