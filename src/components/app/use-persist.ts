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
 *   a correctness one — **except across a Page switch**: each Page mounts its own store, which reads
 *   the URL first, so a link pressed inside the debounce would carry the Scenario from before the
 *   last edit. The hook therefore registers a flush in {@link PendingWrites}, and the links that
 *   leave the Page (`PageLink`) perform it before navigating.
 */

import { useNavigate } from "@tanstack/react-router";
import { createContext, use, useEffect, useEffectEvent, useRef } from "react";

import type { AppState } from "@/lib/app/state.ts";
import type { Pending, WriteEffects } from "@/lib/app/write-side.ts";
import type { SessionStorage } from "@/lib/session/session.ts";
import type { ValidatedSearch } from "@/lib/url/schema.ts";

import { siteOrigin } from "@/lib/app/site.ts";
import { armAddressBarWrite, armSessionWrite, writtenSearch } from "@/lib/app/write-side.ts";

/**
 * Performs the live Page's pending writes now. Returns the search the address bar was just given —
 * the one a link leaving the Page must carry — or `null` when the address bar already holds it.
 */
export type FlushWrites = () => ValidatedSearch | null;

/** One frame's slot for the live Page's {@link FlushWrites}. */
export type PendingWritesSlot = {
  /** Fills the slot; the returned function empties it, unless a newer Page has filled it since. */
  readonly register: (flush: FlushWrites) => () => void;
  /** The registered flush, run — `null` when no Page is registered or nothing was pending. */
  readonly flush: FlushWrites;
};

export function pendingWritesSlot(): PendingWritesSlot {
  let registered: FlushWrites | null = null;
  return {
    register(flush) {
      registered = flush;
      return () => {
        if (registered === flush) registered = null;
      };
    },
    flush: () => registered?.() ?? null,
  };
}

/**
 * Where the live Page registers its {@link FlushWrites}: one slot per frame, provided by
 * `PageFrame`, which also renders the links that leave the Page.
 */
export const PendingWrites = createContext<PendingWritesSlot | null>(null);

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
  page,
  suspended = false,
}: {
  state: AppState;
  /** The current Page's router path — the address bar is written onto it, and budgeted with it. */
  page: string;
  /**
   * « Saisie en cours » — a required field is empty and holds focus. Both writes stop, together,
   * for as long as it lasts. A11 wires it; until then the app is never in that state.
   */
  suspended?: boolean;
}) {
  const navigate = useNavigate();
  const slot = use(PendingWrites);
  const { scenario } = state;
  const addressBar = useRef<Pending | undefined>(undefined);
  const session = useRef<Pending | undefined>(undefined);

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
    const pending = armAddressBarWrite({
      read,
      suspended,
      effects: browserEffects(navigate, page),
    });
    addressBar.current = pending;
    return () => pending?.cancel();
  }, [scenario, suspended, navigate, page]);

  useEffect(() => {
    const pending = armSessionWrite({ state, suspended, effects: browserEffects(navigate, page) });
    session.current = pending;
    return () => pending?.cancel();
  }, [state, suspended, navigate, page]);

  // A cancelled or performed write flushes to nothing, so the slot only ever performs what is still
  // due — and nothing at all under « Saisie en cours », where no write is armed.
  useEffect(
    () =>
      slot?.register(() =>
        writtenSearch([
          ...(session.current?.flush() ?? []),
          ...(addressBar.current?.flush() ?? []),
        ]),
      ),
    [slot],
  );
}

/** The write side's four effects, against the real browser and router. */
function browserEffects(navigate: ReturnType<typeof useNavigate>, page: string): WriteEffects {
  return {
    origin: siteOrigin,
    page: () => page,
    storage: browserStorage,
    // `replace: true`, never `push` — see the header. The search is a **plain object**, never a
    // function and never a spread of `useSearch()`: `applyNext` hands a non-function updater to the
    // location verbatim, so this bag replaces the whole search. `to: "."` stays on the current Page.
    navigate: (search) => void navigate({ replace: true, search, to: "." }),
  };
}
