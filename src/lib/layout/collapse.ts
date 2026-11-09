/**
 * **The Chart Block's collapse policy** — « v1 build spec » § 5 (*The Chart Block collapses to a
 * Pinned Safety Header*) and § 7 (*Fix Actions, lien de saut, et le repli en écran étroit*).
 *
 * The block is whole while the Rail sits at `scrollTop === 0`; it collapses to the **Pinned Safety
 * Header** — the banner slot plus one live « Garde min » — when **(a)** the Rail scrolls, **(b)** a
 * Rail field takes focus, or **(c)** it cannot fit. This module is the whole of that decision, as a
 * pure function of four inputs, so that the components below it hold **no policy at all**.
 *
 * Four rules it exists to keep:
 *
 * - **Nothing here is persisted.** § 5: « the state is derived from scroll position, focus and
 *   available height, so a stored value would fight all three of its own inputs ». There is no
 *   Scenario field, no Session key and no URL key — `./collapse.test.ts` asserts the last two
 *   against the real codecs rather than trusting the sentence.
 * - **`pinned + x` exists because the View Strip lives *inside* the Chart Block.** Without it,
 *   focusing the rider-position field would collapse away the very field being typed into. So the
 *   position field keeps the strip whichever of the two it is — the Rail's own « Position du
 *   passager », which *is* a collapse trigger, and the strip's `x`, which is not.
 * - **(c) outranks the reveal, and the reveal outranks (a) and (b).** « Afficher le profil » is a
 *   request about the picture, and § 5's own reversal — « scrolling the Rail back to top or tapping
 *   the header ». It cannot answer *cannot fit*, which is why it restores the whole block only
 *   **when constraints allow**.
 * - **The state is derived in TypeScript and *applied* in CSS.** `data-collapse` on the shell and
 *   the `pinned` custom variant in `src/styles.css` gate every band below B2, so the same derived
 *   value costs the desktop nothing and there is no `useMediaQuery` branch anywhere — voir
 *   `@/components/app/shell.tsx`.
 *
 * **(c)'s *arithmetic* is ticket 28's** — {@link fitsWholeBlock} and {@link compactRequired} below,
 * `blockHeight > availableHeight − MIN_RAIL` and the `compact` row under `--kb`. They are the only
 * two functions in this file that read a viewport, they read it to decide a **state** and never a
 * band, and their results reach {@link collapseState} as two booleans exactly as ticket 27 left the
 * seam.
 */

import type { FieldId } from "@/lib/rail/fields.ts";

import {
  BANNER,
  chartBlockHeight,
  COMPACT_HEIGHT_PX,
  MIN_RAIL,
  PINNED_CELL,
  THREE_COLUMN_PX,
  VIEW_STRIP,
} from "./contract.ts";

/** § 5's state table, all four rows. */
export type CollapseState =
  /** Tout le bloc. */
  | "whole"
  /** Créneau bandeau + une cellule vive « Garde min ». */
  | "pinned"
  /** Idem, plus la View Strip, tant que le champ `x` a le focus. */
  | "pinned-x"
  /** Une seule rangée de 44 px : bandeau sur une ligne, « Garde min » en ligne. */
  | "compact";

/** Where the caret is, in the only three places that change the block's shape. */
export type CollapseFocus =
  /** Neither the Rail nor the View Strip holds it. */
  | "none"
  /** A Rail field other than « Position du passager » — trigger (b). */
  | "rail-field"
  /** The Rail's own « Position du passager » — trigger (b), **and** it keeps the View Strip. */
  | "rail-rider-position"
  /**
   * The View Strip's own `x`. **Never a trigger** — it lives inside the Chart Block, so collapsing
   * on it would be the field collapsing itself away — but it holds the strip open through one, so
   * that moving the caret from the Rail's position field to this one does not drop the strip.
   */
  | "view-strip-position";

/** Everything the policy reads. There is no fifth input, and none of these is a width. */
export type CollapseInputs = {
  /** Is the Rail's scroller at `scrollTop === 0`? Trigger (a) is its negation. */
  readonly railAtTop: boolean;
  /** Trigger (b), and the `pinned + x` discriminator. */
  readonly focus: CollapseFocus;
  /** Has « Afficher le profil » been asked for and not yet revoked? Voir {@link revealSurvives}. */
  readonly revealed: boolean;
  /**
   * (c). Can the whole block coexist with a usable Rail — `blockHeight ≤ availableHeight − MIN_RAIL`?
   * {@link fitsWholeBlock} computes it.
   */
  readonly fits: boolean;
  /**
   * § 5's fourth row: is the soft keyboard up, or is there less than {@link COMPACT_HEIGHT_PX} of
   * height left? {@link compactRequired} computes it. Like (c) it is a **constraint** and not a
   * trigger — it survives « Afficher le profil », because a reveal cannot make room.
   */
  readonly compact: boolean;
};

/** The chevron's accessible name — § 5 states it, and it is the only control the collapse adds. */
export const REVEAL_LABEL = "Afficher le profil";

/**
 * **Where the reveal hands focus over**, and the reason it is named here rather than in the shell:
 * the chevron is only rendered *in* the pinned header, so the state change it asks for removes the
 * element the caret is standing on. Measured before this existed: `document.activeElement` fell to
 * `<body>` and the next `Tab` restarted at the top of the document.
 *
 * The band the button's own label names is the landing place — « Afficher le profil » asks for the
 * profile, so the caret follows it, and the next `Tab` continues *into* what was just revealed
 * rather than past it. It is `tabIndex={-1}`: a programmatic target, never a tab stop, because the
 * band is a picture and not a control. Voir `RevealProfile` in `@/components/app/shell.tsx`.
 */
export const PROFILE_BAND_ID = "profil";

/**
 * What that landing announces. The band is a `role="group"` rather than a bare `<div>` for exactly
 * this: an unnamed generic is focusable but silent, and a reveal nobody hears is a reveal a screen
 * reader user has to go hunting for.
 */
export const PROFILE_BAND_LABEL = "Profil";

/**
 * **Is the reduction forced by the height rather than asked for by scroll or focus?** (c) and the
 * `compact` rule are the two constraints. Since #110 both are scoped to B2 by their own predicates
 * ({@link heightBindsBlock}) — from three columns the middle column scrolls under the vue de dessus,
 * so three columns at 1440 × 500 open whole and scroll, where they used to pin — and this flag can
 * only be set below B2, where the triggers' own arm already applies.
 *
 * The shell publishes it as `data-fit`, and `src/styles.css` gates the same bands on it that its
 * `width < 1024px` arm gates on B2 — voir the `pinned` variant. The width scoping lives in the
 * predicates rather than in that CSS, so the stylesheet applies whatever state it is handed.
 */
export function heightConstrained({ fits, compact }: Pick<CollapseInputs, "compact" | "fits">) {
  return !fits || compact;
}

/** Which of § 5's states the block is in. **The one place the triggers and the constraints meet.** */
export function collapseState({
  railAtTop,
  focus,
  revealed,
  fits,
  compact,
}: CollapseInputs): CollapseState {
  const triggered = !railAtTop || focus === "rail-field" || focus === "rail-rider-position";
  // (c) and `compact` are not triggers like the other two: they are **constraints**, so they
  // survive the reveal — « restores the whole block *when constraints allow* ».
  if (!heightConstrained({ fits, compact }) && (revealed || !triggered)) return "whole";
  // **`pinned + x` outranks `compact`, and that ordering is the reason `pinned + x` exists.** The
  // keyboard is up in precisely the state § 5 argues it from — « the user types a position and
  // watches « Garde min » move with the keyboard open » — so letting the single row win here would
  // unmount the field being typed into, which is the failure `pinned + x` was minted against.
  if (focus === "rail-rider-position" || focus === "view-strip-position") return "pinned-x";
  return compact ? "compact" : "pinned";
}

/** Everything the two height constraints read: four measurements, and B2 the one branch on them. */
export type ViewportFit = {
  /** The window's inline size, px — B2's own input, and the only width in this module. */
  readonly viewportWidth: number;
  /** The window's block size, px, **before** the soft keyboard is subtracted. */
  readonly viewportHeight: number;
  /** `--kb`, px — the soft-keyboard inset the shell publishes, and **0 with no keyboard up**. */
  readonly keyboardInset: number;
  /** The chart column's inline size, or `null` before the single `ResizeObserver`'s first report. */
  readonly columnWidth: number | null;
  /**
   * The navigation bar above the shell, px — `NAV_BAR` on every app Page (ADR-0002), `0` for a
   * shell that stands alone. It is never dismissed, so below B2 `MIN_RAIL` is owed under it like
   * under anything else. § 8's « clés ignorées » strip is **not** a term: below B2 it is spent out
   * of the Rail, which § 5's spine tolerates (« tolérable seulement parce que ce bandeau est
   * rejetable »), and above B2 nothing is fitted to the window any more (#110).
   */
  readonly navigationHeight?: number;
};

/**
 * What is left of the viewport for the shell once the navigation bar and the soft keyboard have
 * taken their share.
 *
 * **The two platforms meet here and the arithmetic is the same on both.** Where
 * `interactive-widget=resizes-content` is honoured the layout viewport itself shrank, so
 * `viewportHeight` is already the answer and `keyboardInset` is 0; on older iOS Safari, which
 * ignores the tag, `viewportHeight` still reads the whole screen and the inset is the whole
 * correction. Neither needs a feature test, which is why there is none.
 */
export function availableHeight({
  viewportHeight,
  keyboardInset,
  navigationHeight = 0,
}: Pick<ViewportFit, "keyboardInset" | "navigationHeight" | "viewportHeight">): number {
  return Math.max(0, viewportHeight - navigationHeight - keyboardInset);
}

/**
 * **Does the window's height bind the Chart Block at this width?** Only where the Rail stands
 * *under* it — below {@link THREE_COLUMN_PX}, the one column whose residual scroller is the Rail.
 *
 * From B2 up it does not, and that is #110's « la hauteur de la coupe ne change pas quand seule la
 * hauteur de la fenêtre change »: the Rail is two full-height columns *beside* the block, the
 * middle column scrolls (#104), and the vue de dessus stands **above** the block, so the block was
 * never going to be whole in the window and pinning it would only take the profile away from a
 * column that can scroll to it. Before #110 three columns at 1440 × 500 pinned, and the measured
 * reason — a block clipped by an `overflow-hidden` column, ticket 31's D3 — went with #104's scroll.
 * **What it costs**: a short desktop window, or a landscape tablet with its keyboard up, scrolls the
 * middle column to reach « Garde min » rather than getting the Pinned Safety Header.
 */
export function heightBindsBlock(viewportWidth: number): boolean {
  return viewportWidth < THREE_COLUMN_PX;
}

/**
 * **(c), the fit rule** — « the Chart Block pins whenever its width-derived height exceeds the
 * available height minus the minimum Rail height ».
 *
 * Two things about the shape of it:
 *
 * - **The block's height comes from the *width*** ({@link chartBlockHeight}), never from the
 *   viewport. § 5's invariant is intact: the viewport is one side of a comparison whose output is a
 *   state, and no band is sized from it. A block sized to the height available is *literally* how
 *   the prototype's ×5,02 happened.
 * - **It is only asked where the Rail is *under* the block** ({@link heightBindsBlock}). Below B2
 *   the two share one column and the Rail's floor comes straight out of the same height — budget
 *   A's « bloc 540 · reste : rail en flux 124 » clears it by 4 px, which is why the app has no title
 *   bar. Above B2 the block always fits, because nothing there is fitted to the window (#110).
 *   **That comparison is not a layout branch**: the tree, the bands and every band height are
 *   identical either way — it names which of § 5's two budget shapes is in force, on the same
 *   {@link THREE_COLUMN_PX} the shell's `min-[1024px]:` classes use.
 *
 * Unmeasured is « it fits »: before the observer reports there is no width to derive a height from,
 * and the Skeleton opens whole.
 */
export function fitsWholeBlock({
  viewportWidth,
  viewportHeight,
  keyboardInset,
  columnWidth,
  navigationHeight = 0,
}: ViewportFit): boolean {
  if (columnWidth === null || !heightBindsBlock(viewportWidth)) return true;
  const available = availableHeight({ viewportHeight, keyboardInset, navigationHeight });
  return chartBlockHeight(columnWidth) <= available - MIN_RAIL;
}

/**
 * § 5's `compact` rule, verbatim: « fires when `--kb > 0` **or** available height < 420 px ».
 *
 * **The `--kb` half is what makes the keyboard case work**, and it has no threshold of its own on
 * purpose — any inset at all means a keyboard is covering the Rail, and the ~336 px the budgets
 * assume is a platform-typical figure rather than a device measurement. The 420 px half is what
 * catches the posture the app says nothing about: landscape leaves ~330 px, and ~150 px with the
 * keyboard up.
 *
 * **Below B2 only**, like (c) — {@link heightBindsBlock}: from three columns the field being typed
 * into is beside the block, never under it, so a keyboard there costs the chart nothing (#110).
 */
export function compactRequired({
  viewportWidth,
  viewportHeight,
  keyboardInset,
  navigationHeight = 0,
}: Pick<
  ViewportFit,
  "keyboardInset" | "navigationHeight" | "viewportHeight" | "viewportWidth"
>): boolean {
  if (!heightBindsBlock(viewportWidth)) return false;
  return (
    keyboardInset > 0 ||
    availableHeight({ viewportHeight, keyboardInset, navigationHeight }) < COMPACT_HEIGHT_PX
  );
}

/** § 9's rider-position row, by the DOM id the Rail gives every field: `rail-<champ>`. */
export const RIDER_POSITION_ID = `rail-${"xD" satisfies FieldId}`;

/**
 * Which controls inside the Rail count as **a Rail field**. A `<button>` does not: § 5's trigger is
 * « a Rail field takes focus », and the Fix Actions, the copy button and the overflow menu are
 * *actions* — collapsing the picture because someone tabbed onto « Copier le lien » would answer a
 * question nobody asked.
 */
const FIELD_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

/**
 * Trigger (b), read from **the DOM's own focus** rather than from `useRailForm`'s `focused`.
 *
 * The two answer different questions and the difference is load-bearing: the form tracks *which
 * numeric field is being edited*, because that is what « Saisie en cours » is about, and it
 * deliberately does not see the pickers or the radios. The collapse asks *is the caret in a Rail
 * field at all*, and the régime picker, the family radios and the terminations are Rail fields —
 * every one of them is a jump target of § 7's culprit table.
 *
 * @param target the focused element, or `null` when focus left the Rail.
 */
export function railFocus(
  target: { readonly tagName: string; readonly id: string } | null,
): CollapseFocus {
  if (target === null || !FIELD_TAGS.has(target.tagName)) return "none";
  return target.id === RIDER_POSITION_ID ? "rail-rider-position" : "rail-field";
}

/**
 * **Can « Afficher le profil » be granted at all at this viewport?** The reveal outranks (a) and
 * (b) and is outranked by the two *constraints*, so under either of them the request is merely
 * **held** — pressing the chevron changes nothing anybody can see, at any width.
 *
 * It is the negation of {@link heightConstrained} and it exists as a name rather than as a `!` at
 * the call site because **the chevron has to publish it**: a control that is enabled, focusable and
 * silent is a dead affordance for sighted and AT users alike. `RevealProfile` in
 * `@/components/app/shell.tsx` renders it as `aria-disabled` plus the muted, `cursor-not-allowed`
 * chevron — **the request is still latched**, so it is granted the moment the constraint lifts.
 *
 * It says nothing about *whether* a viewport should reach that state: that is condition (c)'s own
 * arithmetic ({@link fitsWholeBlock}). § 5's wide-and-short-desktop question is answered by #110:
 * from three columns no viewport reaches it.
 */
export function revealGrantable(inputs: Pick<CollapseInputs, "compact" | "fits">): boolean {
  return !heightConstrained(inputs);
}

/**
 * Does « Afficher le profil » survive the caret landing here? Going back to editing the Rail
 * revokes it — otherwise the one reveal would leave the profile standing over a Rail that has
 * nowhere to go, for the rest of the session. The View Strip's own `x` revokes nothing: it is a
 * chart control, and the user asked to see the chart.
 */
export function revealSurvives(focus: CollapseFocus): boolean {
  return focus === "none" || focus === "view-strip-position";
}

/**
 * Does it survive this scroll? At the top the block is whole regardless, so the latch is **moot**
 * there — and dropping it is what makes the *next* scroll away pin again rather than leave the
 * block open forever on one press.
 */
export function revealSurvivesScroll(atTop: boolean): boolean {
  return !atTop;
}

/**
 * **`mousedown`'s default action is the focus shift — cancel it, and `pinned + x` survives its own
 * press.** Voir [amendment H](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
 *
 * The defect this answers: from `pinned + x` the Rail's « Position du passager » holds the caret and
 * the Chart Block keeps the View Strip *because of that focus*. Pressing anything the strip
 * renders — its two layer toggles, « ×1 », or the pinned header's own chevron 44 px below it — blurs
 * that field on `mousedown`, so the state falls to `pinned`, the row unmounts mid-gesture, the cells
 * row shifts up 44 px, and `mouseup` lands on a Rail control. The browser then dispatches `click` to
 * the common ancestor and **the handler never runs**. Measured on fine *and* coarse pointers, on all
 * four controls; a second press always worked, which is what made it read as « press twice ».
 *
 * Why this and not a latch: § 5's fourth state is scoped « **tant que le champ `x` a le focus** ».
 * Latching on `pointerdown` for the other controls would re-read that as « tant qu'un contrôle de la
 * rangée est pressé » — a spec widening — **and** would need a release rule (`pointerup` +
 * `pointercancel` + `lostpointercapture`), which is stuck-open on a platform where buttons take no
 * focus. Cancelling the focus shift needs no release: focus never leaves the `x` field, so § 5's
 * sentence stays true exactly as written and nothing collapses to recover from.
 *
 * **This is load-bearing and invisible.** Remove a call and every victim comes back, with no type
 * error and no failing test to catch it — amendment B puts the pixels in `agent-browser`, and a node
 * suite that asserted the handler's presence could only do it by matching source text, which the
 * `contract.test.ts` ruling declines. The guard is this docblock and the browser procedure.
 *
 * The cost, stated: these controls no longer take focus from a pointer press — Safari's own button
 * behaviour — so a pointer user keeps tabbing from wherever the caret already was. The keyboard path
 * is untouched, and the strip's `x` keeps its own `pointerdown` latch, which is the one control § 5
 * *does* scope and the one that must genuinely take the focus.
 */
export function keepCaret(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

/**
 * § 5's state table as arithmetic: `76 + 44 = 120` pinned, `+ 44 = 164` with the View Strip. It is
 * also what `--pinned-clearance` reserves for § 7's jump primitive, so the jumped-to control never
 * lands underneath the header.
 *
 * @param state which of the three states is in force.
 * @param bannerHeight the banner slot's height, px. Defaults to the **three-line** banner — the
 *   390 px case § 5's table is written for, and the largest of the three, because a reserve that
 *   under-shoots is exactly the failure `scroll-margin-top` exists to prevent.
 */
export function pinnedHeaderHeight(
  state: CollapseState,
  bannerHeight: number = BANNER.threeLines,
): number {
  if (state === "whole") return 0;
  // `compact` is **one row and the banner is in it**, so the banner term is not added but spent:
  // 44 px total, which is § 5's own fourth row and the tightest budget in the app.
  if (state === "compact") return PINNED_CELL;
  return bannerHeight + PINNED_CELL + (state === "pinned-x" ? VIEW_STRIP : 0);
}

/**
 * § 5's keyboard piece 3 — « `scrollIntoView({ block: 'center' })` on field focus, inside the Rail's
 * own scroller ».
 *
 * **`behavior` is absent, and that absence is the decision**: it defaults to `auto`, i.e. an
 * instant jump, and **a smooth scroll races the keyboard animation** — the viewport is being
 * resized under the animation, so the two interpolate against each other and the field lands
 * wherever the race ends. The same object serves § 7's jump primitive (`@/components/app/banner.tsx`),
 * so there is one scroll behaviour in the app rather than two that could drift apart.
 *
 * Centring rather than `nearest`: with the keyboard up the Rail's usable window is ~284 px, and
 * `nearest` puts the field one pixel inside the fold, under the caret's own suggestion strip.
 *
 * **« Centre » means the centre of what is *visible*, and that takes one more property than this
 * object.** The Rail is *padded* by `--kb` rather than shrunk by it — § 5's piece 2 — so the box
 * this centres in still spans the whole screen under the fallback inset, and its lower `--kb`
 * pixels are behind the keyboard. The Rail therefore spends the same inset as **`scroll-padding-bottom`**
 * too (voir the `aside` in `@/components/app/shell.tsx`), which is what the scroller's optimal
 * viewing region is made of: `block: 'center'` then centres inside the visible part, with no second
 * scroll mechanism and no threshold. **What is still open is the *ordering***: on a device the field
 * is focused *first* and the keyboard arrives second, and nothing re-runs the centring when the
 * inset appears — re-running it on an inset change would add a trigger § 5's piece 3 does not have,
 * so it is ticket 35's open § 5 decision rather than a repair.
 */
export const CENTRE_IN_RAIL: ScrollIntoViewOptions = { block: "center" };

/**
 * Which focuses the Rail centres on. **Fields only** — the same rule trigger (b) uses, and for the
 * same reason: a `<button>` is an action, and scrolling the form because someone tabbed onto
 * « Copier le lien » would move the page under a press that was aimed at something else.
 */
export function centresOnFocus(focus: CollapseFocus): boolean {
  return focus === "rail-field" || focus === "rail-rider-position";
}
