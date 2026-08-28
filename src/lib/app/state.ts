/**
 * The app's one state object and its reducer — « v1 build spec » § 7 (*The Session*, *The app
 * shell*: *Rewrite-on-load*, *The dropped-keys report*, *The Session is read synchronously in a
 * lazy initialiser*) and § 8 (*Les surfaces du lien*), as
 * [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) leaves the refusal.
 *
 * **This module is the mount order, written as a pure function.** § 8 settles it and says it has
 * no race:
 *
 * 1. the store's lazy initialiser reads the Session — or § 9's shipped defaults;
 * 2. **any recognised scenario key wins wholesale**, never a merge;
 * 3. the mount effect diffs the raw keys and produces both the « clé ignorée » strip and the
 *    rewrite.
 *
 * Steps 1–3 are all decided here, from two parameters — the **raw query string** and the Session —
 * because that is what makes them a `node` unit test with no router and no DOM in the room
 * (amendment A). `@/components/app/store.tsx` supplies the two values and owns nothing else.
 *
 * Rules this module exists to keep:
 *
 * - **Never a merge.** A recognised key means the URL supplies the *whole* Scenario; the Session
 *   still supplies what a link never carries — the retained inactive Material Spec, the retained
 *   manual geometry and the two layer toggles. A merge would yield the recipient's rope on the
 *   sender's span, a third scenario nobody authored. The cached Trace is the one extra a link **can**
 *   speak for, because `tr` *is* a profile: voir {@link linkTrace}.
 * - **The rewrite is content, never order.** `?h=-40&L=250` with nothing dropped is left exactly
 *   as typed: firing a `replace` for cosmetics would rewrite a URL the user is mid-way through
 *   editing. A bare `/` is never rewritten at all — bare `/` *means* « restore the Session », so a
 *   rewrite would make `/` destroy itself.
 * - **The report is read from the raw query string**, which is the only transport § 7 leaves
 *   standing: the validated search stringifies back into the URL, a module-scope side channel in
 *   `validateSearch` leaks across requests, and `{ key: undefined }` or `search.strict` 307s the
 *   evidence away on the server before any client code runs.
 * - **App code never reads the raw bag.** `Route.useSearch()` is raw ∪ validated at runtime while
 *   typed validated-only, so everything below is derived from `salvageSearch`'s output — one
 *   derived Scenario built from the validated keys, which is what makes « clé ignorée » an
 *   app-level guarantee rather than a router one.
 */

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type {
  LayerToggles,
  RetainedManualGeometry,
  RetainedMaterial,
  Session,
} from "@/lib/session/session.ts";
import type { Trace } from "@/lib/terrain/trace.ts";
import type { DroppedKey, LinkRefusal, SearchKey, ValidatedSearch } from "@/lib/url/schema.ts";

import {
  FIRST_RUN_RETAINED_TEXTILE,
  FIRST_RUN_SCENARIO,
  firstRunDefaults,
} from "@/lib/scenario/first-run.ts";
import { clampX, scenarioFromSearch } from "@/lib/scenario/from-search.ts";
import { spanOfGeometry } from "@/lib/scenario/geometry.ts";
import { DEFAULT_LAYERS } from "@/lib/session/session.ts";
import { decodeP1 } from "@/lib/url/p1.ts";
import {
  completeFromDefaults,
  hasScenarioKey,
  parseLinkSearch,
  salvageSearch,
} from "@/lib/url/schema.ts";

/**
 * What the link did on arrival — the evidence the « clé ignorée » strip renders (A11) and the one
 * navigation the shell fires. Everything here is decided **once**, at first render, and never
 * again: the strip is shown once at load and the URL is read once, then write-only.
 */
export type LinkArrival = {
  /**
   * Amendment E's whole-link refusal, or `null`. When it is set the screen is suppressed rather
   * than merged with, so nothing else in this object is meaningful.
   */
  readonly refused: LinkRefusal | null;
  /** Each dropped key with its reason — « ignoré » alone cannot distinguish a typo from a fault. */
  readonly dropped: readonly DroppedKey[];
  /** The keys completed from § 9's defaults, in canonical order. The strip names their values. */
  readonly completed: readonly SearchKey[];
  /** § 7's one elected clamp fired: `x` arrived outside `[0, L]` and the note says so. */
  readonly xClamped: boolean;
  /**
   * The bag to `navigate({ to: "/", search: <this>, replace: true })` — a **plain object**, never
   * a function and never a spread of `useSearch()`, because `applyNext` hands a non-function
   * updater to the location verbatim and the incoming bag never enters. `null` when the address
   * bar already holds exactly the state the app holds.
   */
  readonly rewrite: ValidatedSearch | null;
};

/** Nothing arrived, nothing was dropped, nothing is rewritten — a bare `/`. */
const NO_LINK: LinkArrival = {
  refused: null,
  dropped: [],
  completed: [],
  xClamped: false,
  rewrite: null,
};

/**
 * The whole of the app's state: § 7's Session content, plus what this page load learned from the
 * link. One object behind one reducer — § 7 rejected an external store and a hand-rolled
 * `useSyncExternalStore` on two grounds, and both still hold: selective subscription buys nothing
 * when the expensive thing (the Sweep plus the clearance reducer, p95 1,30 ms) depends on nearly
 * every field and both charts re-render on nearly every change anyway; and an external store is a
 * second place the Session read could escape the client-only subtree and start running on the
 * server.
 */
export type AppState = {
  /** The **active** configuration, possibly with a textile spec the user has yet to complete. */
  readonly scenario: ScenarioDraft;
  /** The other family's spec, kept so a flip back restores what was built. */
  readonly retainedMaterial: RetainedMaterial | null;
  /** The manual span an import displaced, restored by « Retirer le tracé ». */
  readonly retainedManual: RetainedManualGeometry | null;
  /**
   * The cached profile — cached even while inactive, and **the decoded arriving `tr` when a link
   * carried one**: `geometry.source === "trace"` with no Trace beside it is a screen with stations,
   * no span and no ground — voir {@link linkTrace}.
   */
  readonly trace: Trace | null;
  /** § 5's two toggles: Session-only, never in the URL. */
  readonly layers: LayerToggles;
  /** What this page load's link did. Fixed at first render. */
  readonly link: LinkArrival;
};

/**
 * The actions the app can justify. A7 fixed the **shape** — one reducer over one object — and A9
 * added the five that touch more than one property of it: everything else the Rail does is a
 * `scénario/modifié` patch built by `@/lib/rail/values.ts`, which is a pure function and is tested
 * as one.
 */
export type AppAction =
  /** A link applied after first render. Replaces, never merges. */
  | { readonly type: "scénario/remplacé"; readonly scenario: ScenarioDraft }
  /** One field, or a coherent group of them. */
  | { readonly type: "scénario/modifié"; readonly patch: Partial<ScenarioDraft> }
  /** § 5's two toggles — Session-only display preferences. */
  | { readonly type: "calques/basculés"; readonly layers: LayerToggles }
  /**
   * § 9's « Réinitialiser le scénario ». It returns the **active configuration** to the shipped
   * defaults, **terrain source included**, while the cached Trace, the retained inactive Material
   * Spec and the display preferences survive intact.
   */
  | { readonly type: "scénario/réinitialisé" }
  /**
   * § 3's family selector. **Both Material Specs are retained**: the selector chooses which is
   * active and the inactive one — overrides and terminations included — is kept, so flipping back
   * restores what you built. Retention is Session state, never a URL guarantee.
   */
  | { readonly type: "matériau/famille"; readonly family: "steel" | "textile" }
  /**
   * § 4's import. **Anchor A goes to the first station and B to the last** — the trace *is* the
   * intended span — and the displaced manual `L`/`h` are retained for « Retirer le tracé ».
   */
  | { readonly type: "tracé/importé"; readonly trace: Trace; readonly tr: string }
  /** « Retirer le tracé »: the stations go, **the Trace stays cached**, manual `L`/`h` come back. */
  | { readonly type: "tracé/retiré" }
  /** « Réutiliser ce tracé » — the fourth state's re-add path, placing A and B as an import does. */
  | { readonly type: "tracé/réutilisé"; readonly tr: string };

/** One reducer over one object. Pure, exhaustive, and no branch reads anything but its arguments. */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "scénario/remplacé":
      return { ...state, scenario: action.scenario };
    case "scénario/modifié":
      return { ...state, scenario: { ...state.scenario, ...action.patch } };
    case "calques/basculés":
      return { ...state, layers: action.layers };

    case "scénario/réinitialisé":
      return {
        ...state,
        // « l'unité de force et les bascules de calques » survive: they are display preferences,
        // and a control that promised a return to the shipped *numbers* may not move them.
        scenario: { ...firstRunDefaults(), unit: state.scenario.unit },
        retainedManual: null,
      };

    case "matériau/famille": {
      const active = state.scenario.material;
      if (active.family === action.family) return state;
      // The retained pair if it is the family asked for, otherwise § 9's shipped starting point for
      // that family — which for textile is « classe HMPE, `k` 22, `MBL` et `μ` vides et requis ».
      const next: RetainedMaterial =
        state.retainedMaterial?.spec.family === action.family
          ? state.retainedMaterial
          : shippedRetained(action.family);
      return {
        ...state,
        // **Terminations travel with the family.** § 3: « the inactive one — overrides *and
        // terminations* included — is retained », and the whitelist is scoped by family, so a
        // steel termination left on a rope is a value the picker cannot even show back.
        scenario: {
          ...state.scenario,
          material: next.spec,
          terminations: { A: { ...next.terminations.A }, B: { ...next.terminations.B } },
        },
        retainedMaterial: { spec: active, terminations: state.scenario.terminations },
      };
    }

    case "tracé/importé":
    case "tracé/réutilisé": {
      const trace = action.type === "tracé/importé" ? action.trace : state.trace;
      if (trace === null) return state;
      const { geometry } = state.scenario;
      return {
        ...state,
        trace,
        // Manual `L`/`h` stay in state untouched and are restored exactly on removal: discarding a
        // user's parallel input is worth a blocking error, let alone a silent loss.
        retainedManual:
          geometry.source === "manual" ? { L: geometry.L, h: geometry.h } : state.retainedManual,
        scenario: withViewpoint(state.scenario, {
          source: "trace",
          trace: action.tr,
          sa: trace.d[0],
          sb: trace.d[trace.d.length - 1],
        }),
      };
    }

    case "tracé/retiré": {
      if (state.scenario.geometry.source !== "trace") return state;
      const manual = state.retainedManual ?? {
        L: FIRST_RUN_SCENARIO.geometry.L,
        h: FIRST_RUN_SCENARIO.geometry.h,
      };
      // **Removal discards the stations, not the Trace**: the profile stays cached in the Session,
      // and the file-identity line's fourth state is what can put it back.
      return {
        ...state,
        scenario: withViewpoint(state.scenario, { source: "manual", ...manual }),
      };
    }
  }
}

/**
 * § 9's shipped starting point for one family — **spec and terminations together**, because a
 * family that arrives without its own hardware arrives with the other family's.
 */
function shippedRetained(family: "steel" | "textile"): RetainedMaterial {
  if (family === "textile") return FIRST_RUN_RETAINED_TEXTILE;
  const shipped = firstRunDefaults();
  return { spec: shipped.material, terminations: shipped.terminations };
}

/**
 * A terrain source change, with `x_D` brought along. **The clamp is on every path** (§ 3), and the
 * three trace actions are paths: a 183,4 m import removed back onto a 150,0 m manual span would
 * otherwise leave the viewpoint 33 m past anchor B, drawn at B by the scene while state and the
 * URL both published a position the span does not contain.
 */
function withViewpoint(
  scenario: ScenarioDraft,
  geometry: ScenarioDraft["geometry"],
): ScenarioDraft {
  const L = spanOfGeometry(geometry);
  return {
    ...scenario,
    geometry,
    rider: { ...scenario.rider, xD: clampX(scenario.rider.xD, L) },
  };
}

/** What `initialAppState` needs, and it needs no more: no `window`, no router, no storage object. */
export type MountInput = {
  /** The raw query string as it arrived, leading `?` optional. `""` is a bare `/`. */
  readonly query: string;
  /** What `readSession(localStorage)` returned — `null` for « no session ». */
  readonly session: Session | null;
};

/**
 * § 8's mount order, as one pure function.
 *
 * @returns the state the store opens on, and the one navigation the shell may fire.
 */
export function initialAppState(input: MountInput): AppState {
  const raw = parseLinkSearch(input.query);
  const { search, dropped } = salvageSearch(raw);
  const base = sessionState(input.session);

  // A refused link suppresses the screen rather than merging with it, and it is never rewritten:
  // completion is the one operation that would turn « refused whole » into a silent repair.
  if (search.refused !== undefined) {
    return { ...base, link: { ...NO_LINK, refused: search.refused } };
  }

  // Nothing recognised describes a scenario, so bare `/` semantics apply: the Session is restored
  // and nothing is completed. A **bare** `/` stops here with no rewrite, no strip and no
  // announcement — bare `/` *means* « restore the Session », and a notice for the defined normal
  // case is noise. `?junk=zz` is **not** bare: something was dropped, so the strip still names it
  // and the rewrite still fires — it is the only thing that cleans the address bar (§ 8), and the
  // bag it writes is the salvaged one (at most `v`), never the completed defaults, which would
  // turn a session restore into a shared scenario.
  if (!hasScenarioKey(search)) {
    return {
      ...base,
      link: { ...NO_LINK, dropped, rewrite: differs(raw, search) ? search : null },
    };
  }

  const { search: completedSearch, completed } = completeFromDefaults(search);
  const scenario = scenarioFromSearch(completedSearch);
  const xClamped = completedSearch.x !== undefined && completedSearch.x !== scenario.rider.xD;
  // The address bar must hold exactly the state the app holds, so the clamp travels with it.
  const canonical: ValidatedSearch = xClamped
    ? { ...completedSearch, x: scenario.rider.xD }
    : completedSearch;

  return {
    ...base,
    // Wholesale: the link's Scenario, and the Session's own extras — the retained alternate and the
    // layer toggles are things a link never carries.
    scenario,
    // The one Session extra a link *can* speak for: `tr` **is** a profile, so an arriving one is
    // decoded here rather than left to the Session to happen to have.
    trace:
      completedSearch.tr === undefined ? base.trace : linkTrace(completedSearch.tr, input.session),
    link: {
      refused: null,
      dropped,
      completed,
      xClamped,
      rewrite: differs(raw, canonical) ? canonical : null,
    },
  };
}

/**
 * The Trace an arriving `tr` names. **Without this the link is half-applied**: `scenarioFromSearch`
 * reads `tr` into `geometry.source === "trace"`, so a recipient with no Session of their own would
 * hold two stations, no profile to place them on and therefore no span at all — no `Portée`, no
 * `Dénivelé`, no ground and the identity line reading « (aucun tracé) ».
 *
 * **The Session's own copy wins when it is the same profile**, which is § 8's « The Session keeps
 * the filename, since that is the user's own session »: reloading a link you built from your own
 * import must go on reading « *nom.csv* », not « tracé reçu par lien ». The test is the payload the
 * Session stores beside its active imported geometry — the same string the address bar carries, held
 * verbatim, so this compares two spellings of one profile and never re-encodes one to find out.
 *
 * @param tr the validated `p1.` payload. `decodeP1` cannot fail on it: `salvageSearch` has already
 *   walked it structurally, and an undecodable or oversize one is a **refusal** that returns above.
 * @returns the Session's Trace when the payload is its own, otherwise the decoded profile with
 *   **no `fileName`** — which *is* § 4's third identity state, « tracé reçu par lien ».
 */
function linkTrace(tr: string, session: Session | null): Trace {
  const cached = session?.trace ?? null;
  const stored = session?.scenario.geometry;
  if (cached !== null && stored?.source === "trace" && stored.trace === tr) return cached;
  return { ...decodeP1(tr), fileName: null };
}

/** The Session, or § 9's shipped opening state. `firstRunDefaults()` is the one source of both. */
function sessionState(session: Session | null): Omit<AppState, "link"> {
  if (session !== null) {
    return {
      scenario: session.scenario,
      retainedMaterial: session.retainedMaterial,
      retainedManual: session.retainedManual,
      trace: session.trace,
      layers: session.layers,
    };
  }
  return {
    scenario: firstRunDefaults(),
    // § 9 ships the retained textile blank and required: classe HMPE, `k` 22, no rope.
    retainedMaterial: FIRST_RUN_RETAINED_TEXTILE,
    retainedManual: null,
    trace: null,
    layers: DEFAULT_LAYERS,
  };
}

/**
 * Does the canonical bag say something the address bar does not? **Content, never order**: § 7
 * fires the rewrite « only if something was dropped or completed », and « order alone never
 * triggers a navigation », so a hand-authored `?h=-40&L=250` is left exactly as typed.
 *
 * Comparing bags rather than counting dropped and completed keys catches the third case too: a key
 * that left because it is not part of the **active** configuration — a redundant `L` beside a `tr`
 * — which gets no strip line and would otherwise sit in the address bar contradicting the screen.
 */
function differs(raw: Record<string, unknown>, canonical: ValidatedSearch): boolean {
  const canonicalKeys = Object.keys(canonical);
  if (canonicalKeys.length !== Object.keys(raw).length) return true;
  for (const key of canonicalKeys) {
    if (!Object.is(raw[key], canonical[key as SearchKey])) return true;
  }
  return false;
}
