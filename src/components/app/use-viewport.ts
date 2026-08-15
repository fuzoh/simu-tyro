/**
 * **The one place in the app that reads a viewport** — « v1 build spec » § 5 (*The Chart Block
 * collapses to a Pinned Safety Header*, *Keyboard, four pieces*) and § 7 (*`__root.tsx` carries the
 * document and nothing visible*), ticket A12.2.
 *
 * `useViewport` does two things, and they are the same measurement read twice
 * ({@link useBandHeight}, below, is the third height § 5's two constraints spend — the shell's own
 * band above the two columns, which is a box and not a viewport):
 *
 * 1. It writes § 5's `--kb` — `layoutHeight − visual viewport height − offsetTop`, **taken only at
 *    scale 1**, voir {@link keyboardInsetOf} — onto `documentElement`, which is the iOS fallback that
 *    ships beside `__root.tsx`'s `interactive-widget=resizes-content`. The Rail's bottom padding
 *    reads it as `var(--kb, 0px)`.
 * 2. It **returns** the same numbers, because § 5's two height *constraints* are decided in
 *    TypeScript: `@/lib/layout/collapse.ts`'s `fitsWholeBlock` (condition (c)) and
 *    `compactRequired` (the 44 px row). Both take these and hand back a boolean.
 *
 * Four properties, each of which a later change is likely to break:
 *
 * - **It reports a height and a width, and no component may size anything from either.** § 5's
 *   invariant — « no chart dimension may read the window height » — holds because the only consumers
 *   are two predicates whose output is a *state*. A band fed from here is the mechanism both
 *   measured defects came from: `flex-[3]`/`flex-1` is how the prototype's ×5,02 happened.
 *   `src/lib/layout/contract.test.ts` enforces the invariant against these files' own source.
 * - **`resize` *and* `scroll` on the visual viewport, plus the `offsetTop` term.** Older iOS Safari
 *   ignores `interactive-widget` and *pans* the visual viewport instead of resizing the layout
 *   viewport: the pan fires `scroll`, not `resize`, and it is `offsetTop` that carries it. Listening
 *   to `resize` alone with no `offsetTop` term overstates the inset and then never updates during
 *   the pan.
 * - **`window`'s own `resize` too**, which is what a rotation and a desktop window drag deliver —
 *   and rotation is precisely the case § 5 refuses to special-case. **A rotation is a resize and
 *   nothing more**: there is no listener for the rotation event and no posture query anywhere in the
 *   app, so landscape reaches the Pinned Safety Header through condition (c) like every other short
 *   viewport — voir `contract.test.ts`, which asserts the absence over these files.
 * - **The first value is read during render, not in an effect.** A `useEffect`-seeded viewport paints
 *   one frame at a guessed size and then re-measures, which is the *same* defect `useMediaQuery`'s
 *   `defaultMatches` produces and the reason § 5 forbids it. Reading `window` in render is legal
 *   here for exactly the reason the Session read is: this subtree is `ssr: false` and client-only.
 *
 * Stated plainly, both § 5's: the ~336 px soft keyboard the budgets assume is **platform-typical,
 * not measured**, and the `interactive-widget` / `visualViewport` pair is **untested** — no iOS
 * device was available. This is written to be harmless where the meta tag works: the layout height
 * tracks the resized content, `offsetTop` stays 0, and the inset stays 0.
 */

import { useCallback, useEffect, useState } from "react";

/** The property the layout reads as `var(--kb, 0px)`. */
const KEYBOARD_INSET = "--kb";

/** What the collapse's two height constraints read, and the whole of what this hook knows. */
export type Viewport = {
  /** The window's inline size, px. */
  readonly width: number;
  /** The window's block size, px, **before** the keyboard inset is subtracted. */
  readonly height: number;
  /** § 5's `--kb`. **0 wherever `interactive-widget=resizes-content` is honoured**, and no
   * threshold constant is needed because there is no keyboard-up flag to invent — and **0 whenever
   * the page is zoomed**, because a pinch shrinks the visual viewport the same way a keyboard does
   * and § 5's formula cannot tell them apart ({@link keyboardInsetOf}). */
  readonly keyboardInset: number;
};

/**
 * The four numbers § 5's `--kb` is a function of — **the pure seam**, so the arithmetic and its one
 * gate are `node`-testable without a `window` (amendment A's own move: the seam becomes a parameter
 * rather than the test growing a DOM).
 */
export type VisualViewportReading = {
  /** `window.innerHeight` — § 5's `layoutHeight`. */
  readonly layoutHeight: number;
  /** The visual viewport's block size, px. */
  readonly visualHeight: number;
  /** How far the visual viewport has been panned down the layout viewport, px. */
  readonly offsetTop: number;
  /** The visual viewport's scale. **1 on an unzoomed page**, whatever the device pixel ratio. */
  readonly scale: number;
};

/**
 * § 5's keyboard piece 2, `layoutHeight − visualViewport.height − offsetTop`, **gated on scale**.
 *
 * **The formula is § 5's, verbatim and unchanged. The gate is the fix for a measured defect**: the
 * visual viewport shrinks under a *pinch* exactly as it does under a keyboard, so the subtraction
 * alone cannot tell the two apart, and `compactRequired` — which fires on any inset at all, with no
 * threshold, on purpose — then reads a zoom as a keyboard. Measured twice independently at
 * 1440 × 900 via CDP `Emulation.setPageScaleFactor`: **scale 1,5 → `--kb` 300 px** and **scale 1,02 →
 * `--kb` 17,6 px**, both collapsing the shell to `data-collapse="compact"` / `data-fit="tight"` with
 * `#profil` at `display: none` and 300 px of Rail padding. The viewport meta permits zoom (no
 * `maximum-scale`, no `user-scalable=no`), so on a phone **pinch-zooming the chart deleted the
 * chart** — the one gesture whose whole intent is « show me more of this picture ».
 *
 * **Decision of 2026-08-14, by the repo owner** (voir ticket 28's comments): the *measurement* is
 * gated, not the arithmetic and not the rule downstream of it. Scale-correcting the subtraction was
 * rejected because it diverges from § 5's verbatim formula, and giving `compactRequired` a floor was
 * rejected because § 5 states « no threshold » in as many words.
 *
 * **The accepted cost, recorded rather than hidden**: a real keyboard opened while the page is
 * *already* zoomed reads a **0** inset — the Rail loses its bottom padding and the compact row does
 * not fire for that keyboard. Under `interactive-widget=resizes-content` the layout viewport shrank
 * anyway and nothing is owed, so what pays for it is the older-iOS fallback, in exchange for every
 * pinch on every platform no longer deleting the picture.
 *
 * **« Already zoomed » *was* the ordinary iOS focus path, and the trigger is now gone — decision of
 * 2026-08-14, by the repo owner.** WebKit zooms a user-scalable page *in* on focus of a text field
 * whose computed font size is below 16 px, and does not zoom back out on blur; the viewport meta is
 * **zoomable on purpose** (`src/routes/__root.tsx`: `width=device-width, initial-scale=1,
 * interactive-widget=resizes-content`, **no `maximum-scale`, no `user-scalable=no`**) and every Rail
 * numeric field computed **12 px**. So on the very build this fallback exists for — an older iOS
 * Safari that ignores `interactive-widget` — the **first tap into a Rail field** made `scale ≠ 1`, the
 * gate returned 0, and § 5's keyboard piece 2 was gone for the rest of the session: no Rail
 * `pb-[var(--kb,0px)]`, no `scroll-pb`, no `compact` row.
 *
 * **The elected answer was 16 px on the Rail's numeric fields**, `text-base` in
 * `src/components/rail/controls.tsx`'s `NumericInput` — it removes the trigger and leaves pinch-zoom
 * available, where `maximum-scale=1` would have taken zoom away from whoever needs it to read a chart.
 * **The gate itself does not move**: it still answers the pinch defect, which is a real gesture on
 * every platform. The WebKit behaviour is **named, not measured** — no iOS device was available, as
 * above.
 *
 * **What is left of the cost, measured on this host after the change** (390 × 844 and 1440 × 900 agree
 * — computed font size does not read the viewport): the Rail's fifteen numeric fields read **16 px**,
 * and **10 of 26** Rail form controls are still at 12 px — **six `select`** (`rail-regime`, `rail-r0`,
 * `rail-cst`, `rail-ta`, `rail-tb` and the material-class picker) and **four `radio`** (`usage` ×2,
 * `family` ×2). Ticket 28 carries the same count.
 *
 * **Whether those ten still trigger the zoom is *named, not measured*, exactly like the WebKit rule
 * above — it is not a carve-out this file may assert.** A `radio` is not a text entry, so it is the
 * safer of the two; but the mitigation WebKit's behaviour is universally documented against is
 * `font-size ≥ 16px` on **`input, select, textarea`**, so a 12 px `<select>` may well zoom on focus.
 * If it does, the trigger is **shrunk, not removed** — and the first control § 7's own banner pushes a
 * first-run user towards (« Choisissez un régime de sécurité pour obtenir un verdict ») is
 * `rail-regime`, a 12 px `<select>`. **Extending 16 px to `Picker` and `Choice` is the obvious answer
 * and it is not taken here**: decision 5 names « Rail numeric fields », a `select`'s box is
 * `max-w-40`/`max-w-44` rather than `w-20` so it would move the Rail's own widths, and electing it
 * would be a policy nobody has decided.
 *
 * Plus **one text field outside the Rail**, the View Strip's « x » (11 px,
 * `src/components/chart/view-strip.tsx`), which decision 5 does not cover: it is not a Rail field, so
 * a tap straight into it can still zoom the page and re-open this cost. That is recorded, not fixed.
 */
export function keyboardInsetOf({
  layoutHeight,
  visualHeight,
  offsetTop,
  scale,
}: VisualViewportReading): number {
  // The named condition, so the zero below reads as deliberate: at any scale but 1 the difference
  // below is the *zoom*, not a keyboard, and there is no way to tell which from these numbers.
  const zoomed = scale !== 1;
  if (zoomed) return 0;
  return Math.max(0, layoutHeight - visualHeight - offsetTop);
}

/** One measurement, taken twice: once for `--kb`, once for the fit rule. */
function measure(): Viewport {
  const visual = window.visualViewport;
  const height = window.innerHeight;
  return {
    width: window.innerWidth,
    height,
    keyboardInset:
      visual === null || visual === undefined
        ? 0
        : keyboardInsetOf({
            layoutHeight: height,
            visualHeight: visual.height,
            offsetTop: visual.offsetTop,
            scale: visual.scale,
          }),
  };
}

function same(a: Viewport, b: Viewport): boolean {
  return a.width === b.width && a.height === b.height && a.keyboardInset === b.keyboardInset;
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(measure);

  useEffect(() => {
    const apply = () => {
      const next = measure();
      // Written on `documentElement` rather than on the shell, so the shell's own inline custom
      // properties cannot shadow it for its whole subtree.
      document.documentElement.style.setProperty(KEYBOARD_INSET, `${next.keyboardInset}px`);
      setViewport((previous) => (same(previous, next) ? previous : next));
    };

    apply();
    window.addEventListener("resize", apply);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", apply);
    visual?.addEventListener("scroll", apply);
    return () => {
      window.removeEventListener("resize", apply);
      visual?.removeEventListener("resize", apply);
      visual?.removeEventListener("scroll", apply);
      document.documentElement.style.removeProperty(KEYBOARD_INSET);
    };
  }, []);

  return viewport;
}

/**
 * **The height of one shell band above the two columns** — § 5's `ViewportFit.chromeHeight`, and
 * today that is § 8's « clés ignorées » strip alone.
 *
 * It lives beside {@link useViewport} because the two are the *same* input to the *same* two
 * predicates: `fitsWholeBlock` compares the block against what is left of the screen, and a band the
 * shell paints above the columns is as much a subtraction from that as the soft keyboard is. Ticket
 * 31's **D3** is what a missing term costs — `data-fit="roomy"` over a column 42 px too short, and
 * « Garde min » clipped by the shell's `overflow-hidden`.
 *
 * Three things about the shape of it:
 *
 * - **It measures, because the strip's height is its own text's.** Every *band* height in this app is
 *   a function of the chart column's width (§ 5's invariant) and none of them is measured; the strip
 *   is not a band of the block at all — § 5's spine lists it as a conditional row *outside* the five,
 *   « 0 | 60 » — and its 1–3 wrapped lines have no width-derived row to look up. **The invariant is
 *   untouched**: nothing is *sized* from this number, it is one side of a comparison whose output is
 *   a state.
 * - **`0` when the band is not there**, which is the same value as « no band », so a link with every
 *   key present and a strip the user dismissed give the identical answer — and § 5's own reason for
 *   tolerating the strip's cost (« rejetable ») then actually pays off: dismissing it restores the
 *   whole block on the next frame.
 * - **A `ResizeObserver` and not a one-off `getBoundingClientRect`**, because the height changes
 *   without a React render underneath it: the sentences re-wrap on every window resize, and the shell
 *   is one `overflow-hidden` box that would keep reserving a stale figure.
 */
export function useBandHeight(): {
  ref: (node: HTMLElement | null) => void;
  height: number;
} {
  const [height, setHeight] = useState(0);

  // A cleanup-returning ref callback (React 19), so the band leaving the tree — dismissed, or a
  // second render with nothing to report — puts the term back to 0 rather than freezing it.
  const ref = useCallback((node: HTMLElement | null) => {
    if (node === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const block =
        entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
      setHeight((previous) => (previous === block ? previous : block));
    });
    // The **border** box: the strip carries a `border-b`, and a term short by its width is a term
    // that under-states the band by exactly the pixel a clipped row needs.
    observer.observe(node, { box: "border-box" });
    return () => {
      observer.disconnect();
      setHeight(0);
    };
  }, []);

  return { ref, height };
}
