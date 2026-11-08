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

import type { FieldId } from "@/lib/rail/fields.ts";

import { jumpOrAvance } from "@/components/app/avance-notice.tsx";
import { Banner } from "@/components/app/banner.tsx";
import { LinkStripNotice } from "@/components/app/link-strip.tsx";
import { AppStoreProvider } from "@/components/app/store.tsx";
import { usePage } from "@/components/app/use-page.ts";
import { useViewport } from "@/components/app/use-viewport.ts";
import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { shownOnStatique } from "@/lib/statique/fields.ts";
import { statiqueOutputs } from "@/lib/statique/outputs.ts";

import { StatiqueFields } from "./fields.tsx";
import { StatiqueFrame } from "./frame.tsx";
import { StatiqueOutputTiles } from "./outputs.tsx";
import { TopViewFigure } from "./top-view.tsx";

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
  const { cause, clearance, frame, occupant, results, saisie, solved } = surfaces;
  const model = statiqueOutputs({ scenario: state.scenario, deduced, results, cause });

  const jump = (field: FieldId) => jumpOrAvance(field, shownOnStatique(field, state.scenario));

  return (
    <StatiqueFrame
      fields={<StatiqueFields cause={cause} deduced={deduced} rail={rail} />}
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
      topView={<TopViewFigure positions={state.scenario.positions} />}
    />
  );
}
