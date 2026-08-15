/**
 * The Pinned Safety Header's state, at the app root — « v1 build spec » § 5 (*The Chart Block
 * collapses to a Pinned Safety Header*), ticket A12.1.
 *
 * Every decision is `@/lib/layout/collapse.ts`'s; this hook owns only what nothing else in the app
 * already knows — **where the Rail's scroller sits**, **which kind of control holds the caret** and
 * **whether « Afficher le profil » is currently asked for**.
 *
 * Three properties worth stating, because each is a thing a later change is likely to break:
 *
 * - **Focus is read from the DOM, not copied from `useRailForm`.** The two are not the same
 *   question: the form tracks *which numeric field is being edited*, which is what « Saisie en
 *   cours » is about and why it never sees the pickers or the radios; the collapse asks *is the
 *   caret in a Rail field at all*, and the régime picker is a Rail field. One `focusin` on the Rail
 *   scroller answers it for every control at once, with no per-field wiring to keep in sync.
 * - **Nothing is stored.** No Scenario field, no Session key, no URL key: § 5 makes the state
 *   derived from scroll, focus and available height, so a stored value would fight its own inputs.
 * - **The reveal is revoked during render, not in an effect.** Adjusting state while rendering when
 *   an input moves is React's own documented pattern for exactly this, and it costs no extra frame:
 *   the state returned below is already the post-revocation one.
 */

import { useState } from "react";

import type { CollapseFocus, CollapseState } from "@/lib/layout/collapse.ts";

import {
  collapseState,
  heightConstrained,
  railFocus,
  revealGrantable,
  revealSurvives,
  revealSurvivesScroll,
} from "@/lib/layout/collapse.ts";

export type Collapse = {
  /** Which of § 5's states the block is in. The shell applies it; nobody branches on it in JS. */
  readonly state: CollapseState;
  /**
   * Is the reduction **forced by the height** — (c) or the keyboard — rather than asked for by
   * scroll or focus? The shell publishes it as `data-fit`, and it is what makes the collapse cost
   * something above B2, where (a) and (b) deliberately cost nothing. Landscape is that case.
   */
  readonly tight: boolean;
  /** The Rail scroller's own handler — trigger (a). */
  readonly onRailScroll: (atTop: boolean) => void;
  /** The Rail's `focusin` / `focusout`, with `null` for « focus left the Rail » — trigger (b). */
  readonly onRailFocus: (target: HTMLElement | null) => void;
  /** The View Strip's `x`, which must never collapse itself away. */
  readonly onPositionFocus: (focused: boolean) => void;
  /**
   * **May « Afficher le profil » be granted here at all?** `false` under either height constraint,
   * where the request is only *held* — the chevron publishes it as `aria-disabled` rather than
   * offering a press that changes nothing. Voir `revealGrantable`.
   */
  readonly revealGrantable: boolean;
  /** « Afficher le profil ». It restores the whole block **when constraints allow**. */
  readonly reveal: () => void;
};

export function useCollapse({
  fits = true,
  compact = false,
}: {
  /**
   * § 5's (c): can the whole block coexist with a usable Rail? `fitsWholeBlock` measures it from
   * the chart column's width and the viewport; unmeasured, the block is taken to fit, which is
   * what every desktop budget says.
   */
  fits?: boolean;
  /** § 5's fourth row: the soft keyboard is up, or there is less than 420 px of height left. */
  compact?: boolean;
} = {}): Collapse {
  const [railAtTop, setRailAtTop] = useState(true);
  const [rail, setRail] = useState<CollapseFocus>("none");
  const [revealed, setRevealed] = useState(false);
  const [positionFocused, setPositionFocused] = useState(false);

  /**
   * **A Rail focus outranks the strip's own**, and that order is a guard rather than a preference:
   * `positionFocused` is set on the strip field's `pointerdown` — which fires *before* the Rail
   * field's `blur`, and is the only thing that stops the strip being unmounted out from under the
   * tap that was travelling to it. Left to outrank the Rail, a `pointerdown` whose focus never
   * landed would then mask trigger (b) for good; this way any Rail field taking focus heals it.
   */
  const focus = rail !== "none" ? rail : positionFocused ? "view-strip-position" : "none";

  // Revoke the reveal on the **move** into a Rail field, never on every render: holding the caret
  // in one field must not re-revoke something the user asked for since.
  const [caret, setCaret] = useState(focus);
  const survives = caret === focus || revealSurvives(focus);
  if (caret !== focus) {
    setCaret(focus);
    if (!survives) setRevealed(false);
  }

  return {
    state: collapseState({ railAtTop, focus, revealed: revealed && survives, fits, compact }),
    tight: heightConstrained({ fits, compact }),
    revealGrantable: revealGrantable({ fits, compact }),
    onRailScroll(atTop: boolean) {
      setRailAtTop(atTop);
      if (!revealSurvivesScroll(atTop)) setRevealed(false);
    },
    onRailFocus(target: HTMLElement | null) {
      setRail(railFocus(target));
    },
    onPositionFocus(focusedNow: boolean) {
      setPositionFocused(focusedNow);
    },
    reveal() {
      setRevealed(true);
    },
  };
}
