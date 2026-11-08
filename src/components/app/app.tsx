/**
 * The live app — everything below `ssr: false`, which is everything the user actually operates.
 *
 * A7 delivered the **shell**: the store, the mount order, the rewrite, and the same layout the
 * Skeleton paints. A8 filled the two charts and the View Strip, A9 and A10 the Rail's two halves,
 * and A11 the error surfaces — which is the stage that gives this file its shape.
 *
 * **Seven things are computed here, once, and handed down**, because more than one consumer reads
 * each of them and two copies could disagree: the unloaded line (`useUnloaded`), the scene's
 * expensive half (`useScene`), the rider-free read-outs (`useDeduced`), the Scenario without `x_D`
 * (`useTraverse`), the Rail's field state (`useRailForm`), the traverse aggregate (`useResults`)
 * and the error surfaces over the rest (`useErrorSurfaces`). The last one is the reason the others
 * moved: « the banner slot holds exactly one occupant » and « the cause sentence is written once
 * and echoed » are invariants about the *screen*, so the screen needs one place that decides them.
 */

import { useState } from "react";

import type { ViewportFit } from "@/lib/layout/collapse.ts";

import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { RailHeaderControls, RailInputs } from "@/components/rail/inputs.tsx";
import { RailOutputs } from "@/components/rail/outputs.tsx";
import { buildDiagnostic } from "@/lib/app/diagnostic.ts";
import { linkStrip } from "@/lib/app/link-strip.ts";
import { siteOrigin } from "@/lib/app/site.ts";
import { compactRequired, fitsWholeBlock } from "@/lib/layout/collapse.ts";
import { NAV_BAR } from "@/lib/layout/contract.ts";

import { Banner } from "./banner.tsx";
import { LinkStripNotice } from "./link-strip.tsx";
import { RailHeader, Shell } from "./shell.tsx";
import { AppStoreProvider, useAppState } from "./store.tsx";
import { useCollapse } from "./use-collapse.ts";
import { useDeduced } from "./use-deduced.ts";
import { useErrorSurfaces } from "./use-error-surfaces.ts";
import { usePersist } from "./use-persist.ts";
import { useRailForm } from "./use-rail-form.ts";
import { useScene } from "./use-scene.ts";
import { useTraverse } from "./use-traverse.ts";
import { useUnloaded } from "./use-unloaded.ts";
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
  const state = useAppState();
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
  const unloaded = useUnloaded();
  const scene = useScene(unloaded);
  const deduced = useDeduced(unloaded);
  /**
   * § 8's « clé ignorée » strip. **Computed once**: the arrival is fixed at first render, the strip
   * is shown once at load, and the unit is the one the app opened on — a value re-formatted later
   * would stop describing the link and start describing the current screen.
   */
  const [strip] = useState(() => linkStrip(state.link, state.scenario.unit));
  const traverse = useTraverse();
  const rail = useRailForm(deduced, traverse);
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
  /**
   * **The gates are applied here and nowhere else.** `useScene` derives the picture from the store,
   * which holds numbers, while a committed-invalid « −5 » lives in the form, which holds text — so
   * the raw derivation goes in and only what survives § 7's three gates comes out. That is what
   * makes « typé −5 » and « arrivé dans un lien » one state instead of two.
   */
  const { cause, clearance, frame, occupant, results, saisie, solved } = useErrorSurfaces({
    deduced,
    focused: rail.focused,
    frame: scene.frame,
    report: rail.report,
    solved: scene.solved,
    traverse,
  });

  // § 7's write side. **Both writes suspend together under « Saisie en cours »**, so the address bar
  // keeps the last complete Scenario rather than publishing a half-typed one — which is the same
  // condition that disables « Copier le lien » two lines below.
  usePersist({ state, page, suspended: saisie !== null });

  /**
   * « Calcul impossible »'s one action. The **evidence** goes to the clipboard rather than to the
   * screen: no residual, no `SolveNote`, no dev panel — a residual read-out would document a number
   * nobody has ever seen, and §5.3's tolerance is L-scaled beyond 1000 m, so it could not be read
   * without printing its own tolerance beside it. Both are in here instead.
   */
  function copyDiagnostic() {
    const payload = buildDiagnostic({
      scenario: state.scenario,
      trace: state.trace,
      deduced,
      at: new Date().toISOString(),
      build: import.meta.env.MODE,
      origin: siteOrigin(),
      page,
    });
    if (payload !== null) void navigator.clipboard.writeText(payload).catch(() => undefined);
  }

  return (
    <Shell
      chartRef={ref}
      collapse={collapse.state}
      onRailFocus={collapse.onRailFocus}
      onRailScroll={collapse.onRailScroll}
      tight={collapse.tight}
      strip={<LinkStripNotice bandRef={chrome.ref} strip={strip} />}
      rail={
        <>
          <RailHeader>
            {/* « Copier le lien » is disabled under « Saisie en cours », on the same condition that
                suspends both writes: the button and the address bar have to agree about what the
                app is currently able to publish. */}
            <RailHeaderControls incomplete={saisie !== null} page={page} />
          </RailHeader>
          <RailInputs cause={cause} deduced={deduced} rail={rail} />
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
    />
  );
}
