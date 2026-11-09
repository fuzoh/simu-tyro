/**
 * The live app — everything below `ssr: false`, which is everything the user actually operates.
 *
 * A7 delivered the **shell**: the store, the mount order, the rewrite, and the same layout the
 * Skeleton paints. A8 filled the two charts and the View Strip, A9 and A10 the Rail's two halves,
 * and A11 the error surfaces — which is the stage that gives this file its shape.
 *
 * **Six things are computed once, in `usePage`, and handed down** — the same hook Statique computes
 * its screen from — because more than one consumer reads each of them and two copies could
 * disagree: the unloaded line (`useUnloaded`), the scene's expensive half (`useScene`), the
 * rider-free read-outs (`useDeduced`), the Scenario without `x_D` (`useTraverse`), the Rail's field
 * state (`useRailForm`), and the error surfaces with the traverse aggregate they gate
 * (`useErrorSurfaces`). The last one is the reason the others moved: « the banner slot holds
 * exactly one occupant » and « the cause sentence is written once and echoed » are invariants about
 * the *screen*, so the screen needs one place that decides them.
 */

import type { ViewportFit } from "@/lib/layout/collapse.ts";

import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { TopMap } from "@/components/map/top-map.tsx";
import { RailHeaderControls, RailInputs } from "@/components/rail/inputs.tsx";
import { RailOutputs } from "@/components/rail/outputs.tsx";
import { TopViewFrame } from "@/components/statique/top-view.tsx";
import { compactRequired, fitsWholeBlock } from "@/lib/layout/collapse.ts";
import { NAV_BAR, threeColumns } from "@/lib/layout/contract.ts";

import { Banner } from "./banner.tsx";
import { LinkStripNotice } from "./link-strip.tsx";
import { RailHeader, Shell } from "./shell.tsx";
import { AppStoreProvider } from "./store.tsx";
import { useCollapse } from "./use-collapse.ts";
import { usePage } from "./use-page.ts";
import { useBandHeight, useViewport } from "./use-viewport.ts";

/** @param page the router path of the Page the app is rendered on — every link it writes opens it. */
export function App({ page }: { page: string }) {
  return (
    <AppStoreProvider>
      <Live page={page} />
    </AppStoreProvider>
  );
}

/**
 * Inside the provider, because the Chart Block reads the store. The width comes from the app's
 * **single** `ResizeObserver`, seeded `null` — until it reports, the block renders the same empty
 * bands the Skeleton does, which is why the first client frame cannot draw a 900 px chart in a
 * 390 px box.
 *
 * **One sweep, two readers.** The scene's expensive half is computed here, at the `useSweep` seam,
 * and handed to both consumers: the charts draw it and the Rail's output half reports it. A memo
 * inside each would run the sweep and the §11 reducer twice per parameter change. `x_D` is not one
 * of its inputs, so a scrub still re-runs nothing but `placeRider`, inside the Chart Block.
 *
 * **One unloaded line, two readers**, for the same reason one rung down: the scene sweeps it and
 * both halves of the Rail print it, and neither the sweep nor the `L₀` bisection may run twice per
 * keystroke.
 */
function Live({ page }: { page: string }) {
  const { ref, width } = useChartWidth();
  /**
   * The app's **one** viewport reading, and the `--kb` writer with it. It reports a height and a
   * width to two predicates whose output is a *state*; nothing here sizes anything from either, and
   * `src/lib/layout/contract.test.ts` holds that line against these files' own source.
   */
  const viewport = useViewport();
  /**
   * § 8's strip is the **one** thing the shell paints above the two columns, and above B2 its height
   * comes straight out of the chart column's — so (c) is measured with it, not without. Ticket 31's
   * **D3** is the term unspent: `data-fit="roomy"` at 1440 × 900 over a column 42 px too short, and
   * « Garde min » clipped by the shell's `overflow-hidden`. `0` while there is no strip, which is
   * also what dismissing it restores.
   */
  const chrome = useBandHeight();
  const { deduced, strip, rail, rides, surfaces, copyDiagnostic } = usePage({
    page,
    register: "exact",
  });
  /**
   * § 5's Pinned Safety Header. **It does not read `rail.focused`**, and that is deliberate: the
   * form's focus is *which numeric field is being edited* — « Saisie en cours »'s question, which
   * never sees the pickers — while the collapse's is *is the caret in a Rail field at all*. One
   * `focusin` on the Rail scroller answers the second for every control at once.
   *
   * **Its two height constraints are decided here and nowhere else**, from the app's one viewport
   * reading and the same measured column width the charts are drawn from: (c), « the whole block
   * cannot coexist with a usable Rail », and § 5's `compact` row under `--kb`. Both arrive as
   * booleans, so no component below this line knows a viewport exists — and no band is sized from
   * one, which is § 5's invariant.
   */
  const fit: ViewportFit = {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    keyboardInset: viewport.keyboardInset,
    columnWidth: width,
    chromeHeight: chrome.height,
    // Every app Page stands under the navigation bar, so the shell never has the whole viewport.
    navigationHeight: NAV_BAR,
  };
  const collapse = useCollapse({ fits: fitsWholeBlock(fit), compact: compactRequired(fit) });
  const { cause, clearance, frame, occupant, results, rideCause, saisie, solved, windCause } =
    surfaces;

  return (
    // `RailInputs` owns the Rail's field rows and hands back the two sections they live in, so the
    // shell can stand them in different columns without the rows losing their one context.
    <RailInputs cause={cause} deduced={deduced} dynamics={rides} rail={rail} rideCause={rideCause}>
      {(sections) => (
        <Shell
          chartRef={ref}
          collapse={collapse.state}
          onRailFocus={collapse.onRailFocus}
          onRailScroll={collapse.onRailScroll}
          tight={collapse.tight}
          strip={<LinkStripNotice bandRef={chrome.ref} strip={strip} />}
          left={
            <>
              <RailHeader>
                {/* « Copier le lien » is disabled under « Saisie en cours », on the same condition that
                    suspends both writes: the button and the address bar have to agree about what the
                    app is currently able to publish. */}
                <RailHeaderControls incomplete={saisie !== null} page={page} />
              </RailHeader>
              {sections.parameters}
            </>
          }
          right={
            <>
              {sections.deduced}
              <RailOutputs cause={cause} deduced={deduced} results={results} />
            </>
          }
          chart={
            <ChartBlock
              banner={<Banner occupant={occupant} onDiagnostic={copyDiagnostic} />}
              cause={cause}
              // A Clearance Gate breach removes **la garde au sol et la courbe de garde seules**: the
              // cable still draws and every tension row stands. A printed `Garde min` under a banner
              // reading « garde au sol indisponible » is one copy contradicting the screen.
              clearance={clearance}
              frame={frame}
              // **Scrubbing goes inert under « Saisie en cours »**, pointer and typed `x` alike: the
              // Sweep on screen is stale by definition, so scrubbing would let the user *generate* new
              // stale numbers rather than read the ones already there.
              inert={saisie !== null}
              onPositionFocus={collapse.onPositionFocus}
              onReveal={collapse.reveal}
              // Under either height constraint the reveal cannot be granted, so the chevron publishes
              // that instead of offering a press that changes nothing — voir `revealGrantable`.
              revealGrantable={collapse.revealGrantable}
              solved={solved}
              width={width}
            />
          }
          // Statique's vue de dessus, the very component: its gestures write the one Scenario both
          // Pages read, and nothing here is a view of Avancé's own (#12, #104). It starts only where
          // the middle column shows it — a map started in a `display: none` box holds a WebGL
          // context for nothing and has no size to fit its camera to; below B2 the box keeps the
          // Skeleton's empty frame.
          views={
            threeColumns(viewport.width) ? (
              <TopMap frame={frame} solved={solved} windCause={windCause} />
            ) : (
              <TopViewFrame />
            )
          }
        />
      )}
    </RailInputs>
  );
}
