/**
 * **The two debounced writes** — « v1 build spec » § 7 (*The write side*: « `replace: true`
 * always, ≈400 ms debounce »; *The Session*: « Write side: **debounced ≈1 s** »).
 *
 * § 7's read side is a single event: the URL is read **once**, at load, by `@/lib/app/state.ts`.
 * From then on the address bar is **write-only**, and this hook is what writes it. Without it
 * « the address bar must always hold exactly the state the app holds » is false after the first
 * keystroke, `readSession` can never return anything, and the store's synchronous lazy initialiser
 * has nothing to initialise from.
 *
 * Which writes happen and in which order is `@/lib/app/persist.ts`'s decision; the timers, the
 * suspension and the performing are `@/lib/app/write-side.ts`'s. This hook only arms them on change
 * and disarms them on cleanup. What stays here is React's:
 *
 * - **`replace: true`, never `push`.** Back is not undo — history restores search params but
 *   neither the retained inactive Material Spec nor the retained manual geometry, so a pushed entry
 *   would land the user in a state subtly different from the one they left, silently.
 * - **The Scenario the app opened on is never written.** A bare `/` *means* « restore the Session »,
 *   so rewriting it into a full bag on load would make `/` destroy itself — and the one load-time
 *   navigation that *is* legitimate belongs to `RewriteOnLoad`, which fires only when something was
 *   dropped or completed. The guard is an identity check on that Scenario rather than a
 *   mount-once flag, because the client entry hydrates under `<StrictMode>`.
 * - **The address-bar timer re-arms on a Scenario change only**, the Session timer on any state
 *   change. The address-bar write reads the state when it fires (`useEffectEvent`), because an
 *   oversize draft stores the Session with it.
 * - **Nothing here reads the address bar**, and « Copier le lien » does not go through it either
 *   (`@/lib/app/persist.ts`). That is why the debounce grain is a performance question rather than
 *   a correctness one.
 */

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useRef } from "react";

import type { AppState } from "@/lib/app/state.ts";
import type { WriteEffects } from "@/lib/app/write-side.ts";
import type { SessionStorage } from "@/lib/session/session.ts";

import { siteOrigin } from "@/lib/app/site.ts";
import { armAddressBarWrite, armSessionWrite } from "@/lib/app/write-side.ts";

/**
 * `localStorage`, or `null` where the origin refuses it outright — Safari private mode and a
 * cookie-blocked origin throw on the *property access*, before `readSession`'s own guards.
 */
export function browserStorage(): SessionStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function usePersist({
  state,
  suspended = false,
}: {
  state: AppState;
  /**
   * « Saisie en cours » — a required field is empty and holds focus. Both writes stop, together,
   * for as long as it lasts. A11 wires it; until then the app is never in that state.
   */
  suspended?: boolean;
}) {
  const navigate = useNavigate();
  const { scenario } = state;

  // The load-time seed is `RewriteOnLoad`'s, and a bare `/` is never rewritten: this hook publishes
  // **changes**, so it never writes the Scenario it was mounted with. The guard remembers that
  // Scenario **by identity** rather than counting renders, because the client entry hydrates under
  // `<StrictMode>`: a mount-once flag is flipped by the first invocation and lets the second one
  // rewrite a bare `/` into a full bag — measured, not reasoned. Every dispatch produces a new
  // object, so identity is exactly « still the state we opened on ».
  const seed = useRef<AppState["scenario"] | null>(null);

  // The state when the address-bar timer fires, without re-arming it on every non-Scenario change.
  const read = useEffectEvent(() => state);

  useEffect(() => {
    if (seed.current === null) seed.current = scenario;
    if (seed.current === scenario) return;
    return armAddressBarWrite({ read, suspended, effects: browserEffects(navigate) });
  }, [scenario, suspended, navigate]);

  useEffect(
    () => armSessionWrite({ state, suspended, effects: browserEffects(navigate) }),
    [state, suspended, navigate],
  );
}

/** The write side's three effects, against the real browser and router. */
function browserEffects(navigate: ReturnType<typeof useNavigate>): WriteEffects {
  return {
    origin: siteOrigin,
    storage: browserStorage,
    // `replace: true`, never `push` — see the header. The search is a **plain object**, never a
    // function and never a spread of `useSearch()`: `applyNext` hands a non-function updater to the
    // location verbatim, so this bag replaces the whole search.
    navigate: (search) => void navigate({ replace: true, search, to: "/" }),
  };
}
