/**
 * **The write side** — « v1 build spec » § 7 (*The write side*, *The Session — `localStorage`*,
 * *Oversize refuses at « Copier le lien »*) and § 9 (*« Réinitialiser le scénario » versus
 * « Effacer la session »*).
 *
 * The read side is `./state.ts`: the URL is read **once**, at load, and is **write-only**
 * afterwards. This module is the other half of that sentence — what the app publishes after the
 * load-time seed, and what « Copier le lien » puts on the clipboard.
 *
 * Everything here is pure, and that is what makes it a `node` test with no router, no clipboard and
 * no `localStorage` in the room (amendment A). This module decides **which writes happen, in which
 * order**; `./write-side.ts` owns the two timers and performs those writes, and
 * `@/components/app/use-persist.ts` only arms and disarms them.
 *
 * Rules this module exists to keep:
 *
 * - **`replace: true` always, ≈400 ms debounce, and « Copier le lien » does not go through the
 *   address bar.** That is what dissolves the debounce dilemma: once the copy button builds its own
 *   link from state, debounce grain is a performance question rather than a correctness one.
 * - **Only a *complete* Scenario is publishable.** A textile draft with § 9's blanks is a state the
 *   app holds and renders, and one the URL and the Session cannot represent — `Session.scenario` is
 *   a `Scenario`, not a draft. So both writes are suspended until the blanks are filled, exactly as
 *   they are under « Saisie en cours », and the address bar keeps the last complete Scenario.
 * - **Oversize refuses rather than degrades.** A terrain-less link of an imported scenario is not a
 *   weaker link, it is a **different scenario** — the whole-or-nothing rule, applied on the write
 *   side. The budget is the **whole URL**, so the origin is a parameter here rather than a
 *   `window` read. Both link writers pass {@link publishable}; the address bar answers oversize
 *   with a bare `/` (the Session carries the Trace) where the copy button refuses.
 * - **A bare `/` is never ahead of the Session.** It *means* « restore the Session », so the
 *   oversize address-bar write stores the Session first, in the same tick ({@link addressBarWrites}).
 * - **The Session is strictly larger than the link**: it carries the retained inactive Material
 *   Spec, the retained manual geometry, the cached Trace and the two layer toggles, none of which a
 *   link may ever hold. The Session is *your session*; the URL is *this line*.
 */

import type { Scenario, ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Session } from "@/lib/session/session.ts";
import type { Trace } from "@/lib/terrain/trace.ts";
import type { ValidatedSearch } from "@/lib/url/schema.ts";

import { fitsLinkBudget } from "@/lib/url/p1.ts";
import { scenarioToSearch } from "@/lib/url/scenario.ts";
import { canonicalLink } from "@/lib/url/schema.ts";

import type { AppState } from "./state.ts";

/**
 * § 7's URL debounce. The address bar must always hold exactly the state the app holds, and this is
 * the grain at which « always » is honoured — chosen when copying still went through the address
 * bar, and kept because a `replace` per keystroke is the one thing that makes a router feel slow.
 */
export const URL_WRITE_DEBOUNCE_MS = 400;

/** § 7's Session debounce — the slower of the two, because nothing reads it until the next load. */
export const SESSION_WRITE_DEBOUNCE_MS = 1000;

/**
 * The draft as a {@link Scenario}, or `null` while § 9's textile blanks stand.
 *
 * The engine's own gate is the Solve Gate; this is the *serialisation* gate, and it is the same
 * question asked by the two consumers that cannot hold a blank: `scenarioToSearch` would emit
 * `mbl=0` for an absent rope — a fabricated datasheet in somebody's clipboard — and `Session`
 * declares a complete `Scenario` by type.
 */
export function completeScenario(draft: ScenarioDraft): Scenario | null {
  const { material } = draft;
  if (material.family === "steel") return { ...draft, material };
  const { MBL, mu, k } = material;
  if (MBL === null || mu === null || k === null) return null;
  const { d } = material;
  return {
    ...draft,
    material: {
      family: "textile",
      ropeClass: material.ropeClass,
      MBL,
      mu,
      k,
      ...(d === undefined ? {} : { d }),
    },
  };
}

/** The canonical bag the app publishes, or `null` when there is nothing publishable yet. */
export function publishedSearch(draft: ScenarioDraft): ValidatedSearch | null {
  const scenario = completeScenario(draft);
  return scenario === null ? null : scenarioToSearch(scenario);
}

/** Why a draft has no link: § 9's blanks, or a Trace the whole-URL budget cannot carry. */
export type Unpublishable = "incomplete" | "oversize";

/**
 * The one gate both link writers pass — « Copier le lien » and the address bar — and the only
 * caller of {@link fitsLinkBudget}. The budget is on the **whole** href, origin, base path and Page
 * included, so `origin` is the one `siteOrigin()` returns and `page` the Page's router path: both
 * writers land on the Page the user is on, and must agree about what fits there.
 */
export function publishable(
  draft: ScenarioDraft,
  origin: string,
  page: string,
):
  | { readonly ok: true; readonly href: string; readonly search: ValidatedSearch }
  | { readonly ok: false; readonly reason: Unpublishable } {
  const search = publishedSearch(draft);
  if (search === null) return { ok: false, reason: "incomplete" };
  const href = `${origin}${canonicalLink(search, page)}`;
  if (!fitsLinkBudget(href)) return { ok: false, reason: "oversize" };
  return { ok: true, href, search };
}

/**
 * One side effect of the write side: store a Session, or replace the address bar's search.
 *
 * `search` is the **whole** search, never a patch: the address bar holds exactly the state the app
 * holds, so the bag replaces whatever the location carried.
 */
export type Write =
  | { readonly to: "session"; readonly session: Session }
  | { readonly to: "address-bar"; readonly search: ValidatedSearch };

/**
 * What the ≈400 ms address-bar timer writes, **in order** — empty to leave the address bar alone.
 *
 * - A publishable draft writes its canonical search, and nothing else: the Session keeps its own
 *   ≈1 s timer.
 * - A draft with § 9's blanks writes nothing, which holds the address bar at the last complete
 *   Scenario — the same rule « Saisie en cours » applies.
 * - An oversize draft writes a **bare `/`**, not the last publishable search: a link always wins
 *   over the Session on load, so the last search would reopen the pre-import span on reload, while
 *   a bare `/` means « restore the Session », which holds the Trace. Writing the oversize search
 *   instead is what made a reload refuse the user's own import.
 *
 * And because a bare `/` *means* the Session, **the Session goes first** (#57). Left to its own
 * ≈1 s timer, a reload between the two writes read `/` and silently restored the Session from
 * *before* the edit. Written first, in the same tick, there is no moment where the address bar
 * reads `/` while storage holds an older Session; the ≈1 s write still runs, and overwrites it with
 * the same content.
 */
export function addressBarWrites(state: AppState, origin: string, page: string): readonly Write[] {
  const link = publishable(state.scenario, origin, page);
  if (link.ok) return [{ to: "address-bar", search: link.search }];
  if (link.reason === "incomplete") return [];
  const bare: Write = { to: "address-bar", search: {} };
  // Oversize implies complete — `publishable` refuses § 9's blanks first — so `session` is never
  // `null` here. The guard is for the type, and it keeps the address-bar write unconditional.
  const session = sessionOf(state);
  return session === null ? [bare] : [{ to: "session", session }, bare];
}

/** What the ≈1 s Session timer writes: the Session, or nothing while § 9's blanks stand. */
export function sessionWrites(state: AppState): readonly Write[] {
  const session = sessionOf(state);
  return session === null ? [] : [{ to: "session", session }];
}

/**
 * The Session the write side stores — every row of § 7's table, and `null` while the active draft
 * is not yet a Scenario.
 */
export function sessionOf(state: AppState): Session | null {
  const scenario = completeScenario(state.scenario);
  if (scenario === null) return null;
  return {
    scenario,
    retainedMaterial: state.retainedMaterial,
    retainedManual: state.retainedManual,
    trace: state.trace,
    retainedCsv: state.retainedCsv,
    layers: state.layers,
    map: state.map,
  };
}

/** What « Copier le lien » produced: the href to put on the clipboard, or the refusal to show. */
export type CopyLink =
  | { readonly ok: true; readonly href: string }
  | { readonly ok: false; readonly message: string };

/**
 * § 7's copy refusal while a required field is empty. The same condition suspends both writes, so
 * the button and the address bar agree about what the app is currently able to publish.
 */
export const COPY_INCOMPLETE = "Complétez les champs vides pour partager ce lien.";

/**
 * « Copier le lien », as a pure function of the state it copies.
 *
 * **It never reads the address bar**, which is what makes the pending debounced write irrelevant:
 * the link is built from the Scenario the app holds *now*, so a copy one frame after a keystroke
 * carries that keystroke.
 *
 * @param origin the site's origin and base path — the budget is on the **whole** URL, and the copy
 *   button puts an absolute one on the clipboard.
 * @param page the router path of the Page the button was pressed on — the link opens that Page.
 * @param trace the cached profile, read only to count its points in the refusal sentence.
 */
export function copyLink({
  scenario,
  trace,
  origin,
  page,
}: {
  scenario: ScenarioDraft;
  trace: Trace | null;
  origin: string;
  page: string;
}): CopyLink {
  const link = publishable(scenario, origin, page);
  if (link.ok) return { ok: true, href: link.href };
  if (link.reason === "incomplete") return { ok: false, message: COPY_INCOMPLETE };

  // Only a hand-authored CSV can get here — the geoportal export caps at 200 points, and the three
  // real traces cost 859–910 characters against a 2000 budget.
  const points = scenario.geometry.source === "trace" && trace !== null ? trace.d.length : null;
  return {
    ok: false,
    message:
      points === null
        ? "Lien trop volumineux pour être partagé."
        : `Profil trop volumineux pour un lien (${count(points)} points). Partagez le fichier CSV.`,
  };
}

/**
 * A count in French typography — « 4 812 », grouped with a **narrow no-break space**. The group
 * separator has to be unbreakable: a plain space lets « 4 812 points » wrap into « 4 » and
 * « 812 points », which reads as two numbers.
 */
function count(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += "\u202f";
    out += digits[i];
  }
  return value < 0 ? `-${out}` : out;
}
