/**
 * **The two debounced writes, armed and performed** — « v1 build spec » § 7 (*The write side*:
 * « `replace: true` always, ≈400 ms debounce »; *The Session*: « Write side: **debounced ≈1 s** »).
 *
 * `./persist.ts` decides *which* writes happen and *in which order*; this module owns *when*, and
 * performs them through three injected effects. It holds no React and reads no `window`, so the
 * timing is a `node` test under fake timers, and `@/components/app/use-persist.ts` is left with
 * what only React can do: re-arm on change, cancel on cleanup, flush when a link leaves the Page,
 * and skip the Scenario it opened on.
 *
 * - **The debounce is a trailing timer per change**, so a burst of keystrokes writes once. The
 *   returned {@link Pending}'s `cancel` clears it, which is what makes « the last state wins » true
 *   without a queue.
 * - **A Page leaving flushes rather than cancels.** The next Page reads the URL before anything
 *   else, so a write still inside its debounce when a link is pressed would hand that Page the
 *   Scenario from before the last edit; `flush` performs it now, once, and says what it wrote.
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
  /** The current Page's router path — the address bar is written onto it, so it is budgeted too. */
  readonly page: () => string;
  /** `browserStorage()` — `null` where the origin refuses `localStorage` outright. */
  readonly storage: () => SessionStorage | null;
  /** A `replace: true` navigation onto the current Page with exactly this search. */
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

/** The search the address bar was given among `writes` — `null` when it was left alone. */
export function writtenSearch(writes: readonly Write[]): ValidatedSearch | null {
  const write = writes.find((candidate) => candidate.to === "address-bar");
  return write?.to === "address-bar" ? write.search : null;
}

/** A write armed and not yet performed; the arms return `undefined` when nothing was armed. */
export type Pending = {
  /** Drops it: a newer state re-arms it, or the Page is gone. */
  readonly cancel: () => void;
  /**
   * Performs it now rather than when its debounce ends — once. Returns the writes it performed:
   * none once it has run, been flushed or been cancelled.
   */
  readonly flush: () => readonly Write[];
};

/** A trailing timer that performs `writes()` once, when it fires or when it is flushed. */
function armed(delay: number, writes: () => readonly Write[], effects: WriteEffects): Pending {
  let settled = false;
  const run = (): readonly Write[] => {
    if (settled) return [];
    settled = true;
    clearTimeout(timer);
    // Built when it runs, so a burst of keystrokes serialises once rather than once per frame.
    const performed = writes();
    perform(performed, effects);
    return performed;
  };
  const timer = setTimeout(run, delay);
  return {
    cancel: () => {
      settled = true;
      clearTimeout(timer);
    },
    flush: run,
  };
}

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
}): Pending | undefined {
  if (suspended) return undefined;
  return armed(
    URL_WRITE_DEBOUNCE_MS,
    () => addressBarWrites(read(), effects.origin(), effects.page()),
    effects,
  );
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
}): Pending | undefined {
  if (suspended) return undefined;
  return armed(SESSION_WRITE_DEBOUNCE_MS, () => sessionWrites(state), effects);
}
