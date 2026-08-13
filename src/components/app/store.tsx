/**
 * The store — « v1 build spec » § 7 (*The Session is read synchronously in a lazy initialiser*,
 * *Rewrite-on-load is a client mount effect building a plain object*).
 *
 * **React context over one reducer-backed state object, created inside the client-only subtree.**
 * No external store library and no hand-rolled `useSyncExternalStore`: selective subscription buys
 * nothing here — the expensive thing is the Sweep plus the clearance reducer (p95 1,30 ms at 240
 * steps), it depends on nearly every field, and both charts re-render on nearly every change
 * anyway. The real performance mechanism is the memo on the solve inputs behind the `useSweep`
 * seam, not subscription granularity. Second reason, and it is this file's shape: an external store
 * is a second place the Session read could escape the client-only subtree and start running on the
 * server.
 *
 * All of the *decisions* live in `@/lib/app/state.ts`, as a pure function of the raw query string
 * and the Session. This file supplies those two values and holds the wire.
 *
 * **The write side is not called here.** `usePersist` takes the state as an argument rather than the
 * context precisely so it can sit wherever the state it publishes is fully known — and A11 made that
 * `App`'s `Live`, because both writes **suspend together under « Saisie en cours »** and that flag
 * is derived from the Rail's form state, one level below this provider.
 */

import type { Dispatch, ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import { createContext, use, useEffect, useReducer } from "react";

import type { AppAction, AppState } from "@/lib/app/state.ts";

import { appReducer, initialAppState } from "@/lib/app/state.ts";
import { readSession } from "@/lib/session/session.ts";

import { browserStorage } from "./use-persist.ts";

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);

/**
 * The lazy initialiser, run at the client-only subtree's **first render** and never on the server.
 *
 * Measured: under `ssr: false` a lazy initialiser produces zero server-side calls, because the
 * subtree sits inside `ClientOnly`, whose `useHydrated()` is false on the server *and* on the first
 * client render. The « post-mount read » constraint existed to avoid a hydration mismatch, and with
 * no server HTML for the subtree there is no mismatch to avoid — so **there is no « frame before it
 * lands » to design**. An effect would cost one extra paint plus one extra Sweep on a scenario the
 * user did not ask for: the first-run defaults flashing over a returning user's own line.
 *
 * **Stated cost:** reading `localStorage` during render is a side effect in render, and it breaks
 * the moment someone re-enables SSR for this route. It is the same one-line edit as re-adding the
 * effect, guarded by the same `ssr: false`, and the guard is written down here.
 */
function mount(): AppState {
  const storage = browserStorage();
  return {
    ...initialAppState({
      query: window.location.search,
      session: storage === null ? null : readSession(storage),
    }),
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, mount);

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>
        <RewriteOnLoad rewrite={state.link.rewrite} />
        {children}
      </DispatchContext>
    </StateContext>
  );
}

/**
 * § 7's rewrite-on-load: **one mount-time effect building a plain object**, and four measurements
 * force every clause of it.
 *
 * 1. `Route.useSearch()` is raw ∪ validated at runtime while typed validated-only, so a
 *    spread-built rewrite is a no-op that leaves `junk=zz` in the address bar **and** reports it as
 *    dropped — the worst of both. The object comes from `salvageSearch`, never from a spread.
 * 2. Unknown keys never vanish on their own under the default `search.strict`; this is the **only**
 *    thing that cleans the address bar.
 * 3. A plain-object `search` still replaces the whole bag: `applyNext` ends in
 *    `functionalUpdate(dest.search, currentSearch)`, which returns a non-function updater verbatim,
 *    so the incoming bag never enters. **Never `search: (prev) => …`.**
 * 4. A mount-effect `navigate({ replace: true })` does not fight hydration — URL rewritten, console
 *    clean, no hydration warning, `history.length` unchanged.
 *
 * `beforeLoad` was rejected, and it is where a load-time redirect would normally belong: under
 * `ssr: false` it runs on the client during hydration anyway, so it gains nothing — and it cannot
 * hand the dropped-key report to React state.
 */
function RewriteOnLoad({ rewrite }: { rewrite: AppState["link"]["rewrite"] }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (rewrite === null) return;
    void navigate({ replace: true, search: rewrite, to: "/" });
    // Load-time, once. The URL is read once at load and is write-only afterwards, so re-running
    // this on a later render would be the app arguing with its own address bar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** The state. Throws outside the provider, which can only happen outside the client-only subtree. */
export function useAppState(): AppState {
  const state = use(StateContext);
  if (state === null) throw new Error("useAppState hors de <AppStoreProvider>");
  return state;
}

/** The dispatcher. Separate context so a dispatch-only consumer does not re-render on state. */
export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = use(DispatchContext);
  if (dispatch === null) throw new Error("useAppDispatch hors de <AppStoreProvider>");
  return dispatch;
}
