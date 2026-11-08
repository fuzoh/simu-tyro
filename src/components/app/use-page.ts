/**
 * What every app Page computes from the one store, once, at its root — ADR-0002's « one Scenario »
 * seen from the screen. Avancé lays it out in the Rail, Statique in its own frame; neither derives
 * a second copy, and **both publish through the same writer**, `usePersist`, so the address bar and
 * the Session have one author whichever Page the edit came from.
 *
 * The hooks it composes are the ones `app.tsx` documents — one unloaded line, one sweep, one gate
 * report, one set of error surfaces — and the Page's vocabulary (#61) is threaded through the ones
 * that write sentences.
 */

import { useState } from "react";

import type { LinkStrip } from "@/lib/app/link-strip.ts";
import type { AppState } from "@/lib/app/state.ts";
import type { ErrorSurfaces } from "@/lib/app/surfaces.ts";
import type { Deduced } from "@/lib/rail/deduced.ts";
import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { Unloaded } from "@/lib/scenario/unloaded.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { buildDiagnostic } from "@/lib/app/diagnostic.ts";
import { linkStrip } from "@/lib/app/link-strip.ts";
import { siteOrigin } from "@/lib/app/site.ts";

import type { RailFormState } from "./use-rail-form.ts";
import type { Scene } from "./use-scene.ts";

import { useAppState } from "./store.tsx";
import { useDeduced } from "./use-deduced.ts";
import { useErrorSurfaces } from "./use-error-surfaces.ts";
import { usePersist } from "./use-persist.ts";
import { useRailForm } from "./use-rail-form.ts";
import { useScene } from "./use-scene.ts";
import { useTraverse } from "./use-traverse.ts";
import { useUnloaded } from "./use-unloaded.ts";

export type PageModel = {
  readonly state: AppState;
  readonly unloaded: Unloaded;
  readonly scene: Scene;
  readonly deduced: Deduced;
  /** § 8's « clé ignorée » strip, fixed at first render. */
  readonly strip: LinkStrip | null;
  readonly traverse: TraverseScenario;
  /** The fields' text, focus and gate report — one form whichever Page renders the fields. */
  readonly rail: RailFormState;
  readonly surfaces: ErrorSurfaces;
  /** « Calcul impossible »'s one action: the evidence, to the clipboard. */
  readonly copyDiagnostic: () => void;
};

/**
 * @param page the router path of the Page — every link it writes opens it.
 * @param register the Page's vocabulary.
 */
export function usePage({ page, register }: { page: string; register: Register }): PageModel {
  const state = useAppState();
  const unloaded = useUnloaded();
  const scene = useScene(unloaded);
  const deduced = useDeduced(unloaded);
  /**
   * **Computed once**: the arrival is fixed at first render, the strip is shown once at load, and
   * the unit is the one the app opened on — a value re-formatted later would stop describing the
   * link and start describing the current screen.
   */
  const [strip] = useState(() => linkStrip(state.link, state.scenario.unit, register));
  const traverse = useTraverse();
  const rail = useRailForm(deduced, traverse, register);
  /**
   * **The gates are applied here and nowhere else.** The scene is derived from the store, which
   * holds numbers, while a committed-invalid « −5 » lives in the form, which holds text — so the
   * raw derivation goes in and only what survives § 7's three gates comes out.
   */
  const surfaces = useErrorSurfaces({
    deduced,
    focused: rail.focused,
    frame: scene.frame,
    register,
    report: rail.report,
    solved: scene.solved,
    traverse,
  });

  // § 7's write side. **Both writes suspend together under « Saisie en cours »**, so the address bar
  // keeps the last complete Scenario rather than publishing a half-typed one.
  usePersist({ state, page, suspended: surfaces.saisie !== null });

  /**
   * The **evidence** goes to the clipboard rather than to the screen: a residual read-out would
   * document a number nobody has ever seen, and §5.3's tolerance is L-scaled beyond 1000 m.
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

  return {
    state,
    unloaded,
    scene,
    deduced,
    strip,
    traverse,
    rail,
    surfaces,
    copyDiagnostic,
  };
}
