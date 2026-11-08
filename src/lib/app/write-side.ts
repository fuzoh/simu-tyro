/**
 * **The two debounced writes, armed and performed** — « v1 build spec » § 7 (*The write side*:
 * « `replace: true` always, ≈400 ms debounce »; *The Session*: « Write side: **debounced ≈1 s** »).
 *
 * `./persist.ts` decides *which* writes happen and *in which order*; this module owns *when*, and
 * performs them through three injected effects. It holds no React and reads no `window`, so the
 * timing is a `node` test under fake timers, and `@/components/app/use-persist.ts` is left with
 * what only React can do: re-arm on change, disarm on cleanup, and skip the Scenario it opened on.
 *
 * - **The debounce is a trailing timer per change**, so a burst of keystrokes writes once. The
 *   returned disarm clears it, which is what makes « the last state wins » true without a queue.
 * - **Both writes suspend together** under « Saisie en cours »: neither timer is armed, whatever the
 *   draft — an oversize one included, since its Session write rides on the address-bar timer.
 * - **The address-bar timer reads the state when it fires**, through `read`, because an oversize
 *   draft stores the whole Session with it, and a layer toggle does not re-arm that timer.
 */

import type { SessionStorage } from "@/lib/session/session.ts";
import type { ValidatedSearch } from "@/lib/url/schema.ts";

import { writeSession } from "@/lib/session/session.ts";

import type { Write } from "./persist.ts";
import type { AppState } from "./state.ts";

import {
  addressBarWrites,
  SESSION_WRITE_DEBOUNCE_MS,
  sessionWrites,
  URL_WRITE_DEBOUNCE_MS,
} from "./persist.ts";

/** The write side's three contacts with the browser, injected so nothing here touches `window`. */
export type WriteEffects = {
  /** `siteOrigin()` — read at write time, since the link budget is on the whole href. */
  readonly origin: () => string;
  /** `browserStorage()` — `null` where the origin refuses `localStorage` outright. */
  readonly storage: () => SessionStorage | null;
  /** A `replace: true` navigation to `/` with exactly this search. */
  readonly navigate: (search: ValidatedSearch) => void;
};

/**
 * Performs `writes` in the order given. Unavailable storage skips the Session write and nothing
 * else: the address bar is still written.
 */
export function perform(writes: readonly Write[], effects: WriteEffects): void {
  for (const write of writes) {
    if (write.to === "address-bar") {
      effects.navigate(write.search);
      continue;
    }
    const storage = effects.storage();
    // The outcome matters — « sans-tracé » is § 7's quota rule, and the app has to *say so*. A11
    // owns that line; what the write side guarantees is that the write happens at all.
    if (storage !== null) writeSession(storage, write.session);
  }
}

/** Disarms a pending write; `undefined` when nothing was armed. */
export type Disarm = (() => void) | undefined;

/**
 * Arms the ≈400 ms address-bar write — and, for an oversize draft, the Session write ahead of it.
 *
 * @param read the state at the moment the timer fires.
 */
export function armAddressBarWrite({
  read,
  suspended,
  effects,
}: {
  read: () => AppState;
  suspended: boolean;
  effects: WriteEffects;
}): Disarm {
  if (suspended) return undefined;
  const timer = setTimeout(() => {
    // Built inside the timer, so a burst of keystrokes serialises once rather than once per frame.
    perform(addressBarWrites(read(), effects.origin()), effects);
  }, URL_WRITE_DEBOUNCE_MS);
  return () => clearTimeout(timer);
}

/** Arms the ≈1 s Session write of `state`. */
export function armSessionWrite({
  state,
  suspended,
  effects,
}: {
  state: AppState;
  suspended: boolean;
  effects: WriteEffects;
}): Disarm {
  if (suspended) return undefined;
  const timer = setTimeout(() => perform(sessionWrites(state), effects), SESSION_WRITE_DEBOUNCE_MS);
  return () => clearTimeout(timer);
}
