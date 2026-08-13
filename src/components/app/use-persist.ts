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
 * Every decision below is § 7's, and each one is load-bearing:
 *
 * - **`replace: true`, never `push`.** Back is not undo — history restores search params but
 *   neither the retained inactive Material Spec nor the retained manual geometry, so a pushed entry
 *   would land the user in a state subtly different from the one they left, silently.
 * - **The Scenario the app opened on is never written.** A bare `/` *means* « restore the Session »,
 *   so rewriting it into a full bag on load would make `/` destroy itself — and the one load-time
 *   navigation that *is* legitimate belongs to `RewriteOnLoad`, which fires only when something was
 *   dropped or completed. The guard is an identity check on that Scenario rather than a
 *   mount-once flag, because the client entry hydrates under `<StrictMode>`.
 * - **Both writes suspend together** under « Saisie en cours » (A11 owns the flag): the address bar
 *   keeps the last complete Scenario rather than publishing a half-typed one, and a browser crash
 *   mid-edit loses the *edit* rather than the line.
 * - **The debounce is a trailing timer per change**, so a burst of keystrokes writes once. The
 *   cleanup clears it, which is what makes « the last state wins » true without a queue.
 * - **Nothing here reads the address bar**, and « Copier le lien » does not go through it either
 *   (`@/lib/app/persist.ts`). That is why the debounce grain is a performance question rather than
 *   a correctness one.
 */

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { AppState } from "@/lib/app/state.ts";
import type { SessionStorage } from "@/lib/session/session.ts";

import {
  publishedSearch,
  SESSION_WRITE_DEBOUNCE_MS,
  sessionOf,
  URL_WRITE_DEBOUNCE_MS,
} from "@/lib/app/persist.ts";
import { writeSession } from "@/lib/session/session.ts";

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

  useEffect(() => {
    if (seed.current === null) seed.current = scenario;
    if (seed.current === scenario) return;
    if (suspended) return;
    const timer = setTimeout(() => {
      // Built inside the timer, so a burst of keystrokes serialises once rather than once per
      // frame. A draft with § 9's textile blanks is not publishable and holds the address bar at
      // the last complete Scenario, which is the same rule « Saisie en cours » applies.
      const search = publishedSearch(scenario);
      if (search === null) return;
      // A **plain object**, never a function and never a spread of `useSearch()`: `applyNext` hands
      // a non-function updater to the location verbatim, so this bag replaces the whole search.
      void navigate({ replace: true, search, to: "/" });
    }, URL_WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [scenario, suspended, navigate]);

  useEffect(() => {
    if (suspended) return;
    const timer = setTimeout(() => {
      const storage = browserStorage();
      const session = sessionOf(state);
      if (storage === null || session === null) return;
      // The outcome matters — « sans-tracé » is § 7's quota rule, and the app has to *say so*. A11
      // owns that line; what this hook guarantees is that the write happens at all.
      writeSession(storage, session);
    }, SESSION_WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, suspended]);
}
