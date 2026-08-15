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
  RAIL_REFLOW_PX,
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
 * `compact` rule are the two constraints, and this is the one thing the *width* scoping cannot
 * cover: (a) and (b) are narrow-screen behaviour — above B2 the Rail sits beside the block and a
 * focused field must cost the chart nothing — while a block that does not fit does not fit at any
 * width. **Landscape is exactly that case and needs no rule of its own**: an 844 × 390 phone is
 * above B2, so only this makes the Pinned Safety Header appear there.
 *
 * The shell publishes it as `data-fit`, and `src/styles.css` gates the same bands on it that
 * `max-md:` gates on B2 — voir the `pinned` variant.
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

/** Everything the two height constraints read. **Four measurements, no branch on any of them.** */
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
   * The shell's own bands **above the two columns**, px — today that is § 8's « clés ignorées »
   * strip and nothing else, `0` when it is absent or dismissed. § 5's spine lists it as
   * « (conditionnel) bandeau « clés ignorées », pleine largeur, rejetable ·· 0 | 60 », i.e. a
   * conditional row *outside* the block's five bands, so it is measured rather than budgeted:
   * its height is its own text's, at the shell's width.
   *
   * Absent from this type, the term was simply unspent, and {@link fitsWholeBlock} then reported
   * « roomy » for a column too short to hold the block — measured at 1440 × 900 on `/?L=250`
   * (ticket 31, **D3**): strip 85 px, column 815 px against a block of 857, and the read-out cells
   * row landed at `y 889` with `bottom 941`, so « Garde min 1,31 m » was cut by the shell's
   * `overflow-hidden` with nothing to scroll to reach it.
   */
  readonly chromeHeight?: number;
};

/**
 * What is left of the viewport once the soft keyboard has taken its share.
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
}: Pick<ViewportFit, "keyboardInset" | "viewportHeight">): number {
  return Math.max(0, viewportHeight - keyboardInset);
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
 * - **`MIN_RAIL` is only owed where the Rail is *under* the block.** Below B2 the two share one
 *   column and the Rail's floor comes straight out of the same height — budget A's « bloc 540 ·
 *   reste : rail en flux 124 » clears it by 4 px, which is why the app has no title bar. Above B2
 *   the Rail is a full-height column *beside* the block and owes it nothing, so the block's own
 *   height is the whole test. **That comparison is not a layout branch**: the tree, the bands and
 *   every band height are identical either way — it names which of § 5's two budget shapes is in
 *   force, on the same {@link RAIL_REFLOW_PX} the shell's one `md:` uses.
 * - **{@link ViewportFit.chromeHeight} is owed on the *other* arm of that same branch, and for the
 *   mirror-image reason.** Above B2 the block lives in a height-bounded `overflow-hidden` column,
 *   so every pixel the « clés ignorées » strip takes above it is a pixel the block's last band is
 *   clipped by — ticket 31's **D3**, « Garde min » cut out of the viewport. Below B2 the strip is
 *   spent out of the **Rail**, which is the residual scroller there, and § 5's spine says so in as
 *   many words: « avec le bandeau des clés ignorées le rail descend à 64 px — tolérable seulement
 *   parce que ce bandeau est rejetable et que le bloc se replie au premier défilement ». Nothing is
 *   clipped in that shape, so subtracting it there would pin a viewport the spec explicitly
 *   tolerates — which is why the term sits on one arm and not in {@link availableHeight}.
 *
 * Unmeasured is « it fits »: before the observer reports there is no width to derive a height from,
 * and the Skeleton opens whole.
 */
export function fitsWholeBlock({
  viewportWidth,
  viewportHeight,
  keyboardInset,
  columnWidth,
  chromeHeight = 0,
}: ViewportFit): boolean {
  if (columnWidth === null) return true;
  const railBelow = viewportWidth < RAIL_REFLOW_PX;
  const available = availableHeight({ viewportHeight, keyboardInset });
  return chartBlockHeight(columnWidth) <= available - (railBelow ? MIN_RAIL : chromeHeight);
}

/**
 * § 5's `compact` rule, verbatim: « fires when `--kb > 0` **or** available height < 420 px ».
 *
 * **The `--kb` half is what makes the keyboard case work**, and it has no threshold of its own on
 * purpose — any inset at all means a keyboard is covering the Rail, and the ~336 px the budgets
 * assume is a platform-typical figure rather than a device measurement. The 420 px half is what
 * catches the posture the app says nothing about: landscape leaves ~330 px, and ~150 px with the
 * keyboard up.
 */
export function compactRequired({
  viewportHeight,
  keyboardInset,
}: Pick<ViewportFit, "keyboardInset" | "viewportHeight">): boolean {
  return (
    keyboardInset > 0 || availableHeight({ viewportHeight, keyboardInset }) < COMPACT_HEIGHT_PX
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
 * arithmetic ({@link fitsWholeBlock}), and § 5's wide-and-short-desktop question is open.
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
