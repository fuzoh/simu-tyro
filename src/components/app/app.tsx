/**
 * The live app — everything below `ssr: false`, which is everything the user actually operates.
 *
 * A7 delivered the **shell**: the store, the mount order, the rewrite, and the same layout the
 * Skeleton paints. A8 filled the two charts and the View Strip, A9 and A10 the Rail's two halves,
 * and A11 the error surfaces — which is the stage that gives this file its shape.
 *
 * **Five things are computed here, once, and handed down**, because more than one consumer reads
 * each of them and two copies could disagree: the scene's expensive half (`useScene`), the
 * rider-free chain (`useDeduced`), the Rail's field state (`useRailForm`), the traverse aggregate
 * (`useResults`) and the error surfaces over all four (`useErrorSurfaces`). The last one is the
 * reason the other four moved: « the banner slot holds exactly one occupant » and « the cause
 * sentence is written once and echoed » are invariants about the *screen*, so the screen needs one
 * place that decides them.
 */

import { useState } from "react";

import { ChartBlock } from "@/components/chart/chart-block.tsx";
import { useChartWidth } from "@/components/chart/use-chart-width.ts";
import { RailHeaderControls, RailInputs } from "@/components/rail/inputs.tsx";
import { RailOutputs } from "@/components/rail/outputs.tsx";
import { buildDiagnostic } from "@/lib/app/diagnostic.ts";
import { linkStrip } from "@/lib/app/link-strip.ts";

import { Banner } from "./banner.tsx";
import { LinkStripNotice } from "./link-strip.tsx";
import { RailHeader, Shell } from "./shell.tsx";
import { AppStoreProvider, useAppState } from "./store.tsx";
import { useDeduced } from "./use-deduced.ts";
import { useErrorSurfaces } from "./use-error-surfaces.ts";
import { useKeyboardInset } from "./use-keyboard-inset.ts";
import { usePersist } from "./use-persist.ts";
import { useRailForm } from "./use-rail-form.ts";
import { useScene } from "./use-scene.ts";

export function App() {
  useKeyboardInset();

  return (
    <AppStoreProvider>
      <Live />
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
 * **One `deduceValues`, two readers**, for the same reason one rung down: both halves of the Rail
 * print the rider-free chain, and neither the sweep nor this one may run twice per keystroke.
 */
function Live() {
  const state = useAppState();
  const { ref, width } = useChartWidth();
  const scene = useScene();
  const deduced = useDeduced();
  /**
   * § 8's « clé ignorée » strip. **Computed once**: the arrival is fixed at first render, the strip
   * is shown once at load, and the unit is the one the app opened on — a value re-formatted later
   * would stop describing the link and start describing the current screen.
   */
  const [strip] = useState(() => linkStrip(state.link, state.scenario.unit));
  const rail = useRailForm(deduced);
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
  });

  // § 7's write side. **Both writes suspend together under « Saisie en cours »**, so the address bar
  // keeps the last complete Scenario rather than publishing a half-typed one — which is the same
  // condition that disables « Copier le lien » two lines below.
  usePersist({ state, suspended: saisie !== null });

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
      origin: window.location.origin,
    });
    if (payload !== null) void navigator.clipboard.writeText(payload).catch(() => undefined);
  }

  return (
    <Shell
      chartRef={ref}
      strip={<LinkStripNotice strip={strip} />}
      rail={
        <>
          <RailHeader>
            {/* « Copier le lien » is disabled under « Saisie en cours », on the same condition that
                suspends both writes: the button and the address bar have to agree about what the
                app is currently able to publish. */}
            <RailHeaderControls incomplete={saisie !== null} />
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
          solved={solved}
          width={width}
        />
      }
    />
  );
}
