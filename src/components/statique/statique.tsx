/**
 * The live Page Statique (#91) — the simplified Page at `/`, in the terrain register: the fields a
 * rigger sets on site, the tension de pose, the flèche, the garde au sol and the Verdict, the coupe
 * and the vue de dessus.
 *
 * **One Scenario, one writer.** Everything is computed once by `usePage` from the store Avancé
 * reads — the same URL Scenario, the same Session — and published through the same `usePersist`,
 * so `/?…` and `/avance?…` show one line, and switching Page keeps the search. Nothing here
 * derives a second copy of a number Avancé prints.
 */

import { useMemo } from "react";

import type { FieldId } from "@/lib/rail/fields.ts";

import { jumpOrAvance } from "@/components/app/avance-notice.tsx";
import { Banner } from "@/components/app/banner.tsx";
import { LinkStripNotice } from "@/components/app/link-strip.tsx";
import { AppStoreProvider } from "@/components/app/store.tsx";
import { usePage } from "@/components/app/use-page.ts";
import { useViewport } from "@/components/app/use-viewport.ts";
import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { TopMap } from "@/components/map/deferred-top-map.tsx";
import { banner, pageReport } from "@/lib/app/banner.ts";
import { shownOnStatique, STATIQUE_GATES } from "@/lib/statique/fields.ts";
import { statiqueOutputs } from "@/lib/statique/outputs.ts";

import { StatiqueFields } from "./fields.tsx";
import { StatiqueFrame } from "./frame.tsx";
import { StatiqueOutputTiles } from "./outputs.tsx";

/** @param page the router path of the Page — every link it writes opens it. */
export function Statique({ page }: { page: string }) {
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
  // Read for its side effect alone: it writes `--kb`, the iOS keyboard inset the frame pads by.
  useViewport();
  const { state, deduced, strip, rail, surfaces, copyDiagnostic } = usePage({
    page,
    register: "terrain",
  });
  const { cause, clearance, frame, refusal, results, saisie, solved, windCause, windCulprits } =
    surfaces;
  const model = statiqueOutputs({ scenario: state.scenario, deduced, results, cause });
  // No ride is printed here: a Ride Gate breach does not take the slot from the Verdict.
  const occupant = useMemo(
    () =>
      banner({
        report: pageReport(rail.report, STATIQUE_GATES),
        refusal,
        saisie,
        verdict: results?.banner ?? null,
        register: "terrain",
      }),
    [rail.report, refusal, saisie, results],
  );

  const jump = (field: FieldId) => jumpOrAvance(field, shownOnStatique(field, state.scenario));

  return (
    <StatiqueFrame
      fields={<StatiqueFields cause={cause} deduced={deduced} rail={rail} results={results} />}
      outputs={<StatiqueOutputTiles model={model} />}
      section={
        <ChartBlock
          banner={<Banner occupant={occupant} onDiagnostic={copyDiagnostic} onJump={jump} />}
          cause={cause}
          clearance={clearance}
          frame={frame}
          // « Saisie en cours » freezes the picture and makes the scrub inert, as on Avancé.
          inert={saisie !== null}
          onPositionFocus={ignore}
          onReveal={ignore}
          register="terrain"
          solved={solved}
          width={width}
        />
      }
      sectionRef={ref}
      strip={<LinkStripNotice strip={strip} />}
      topView={
        <TopMap frame={frame} solved={solved} windCause={windCause} windCulprits={windCulprits} />
      }
    />
  );
}
