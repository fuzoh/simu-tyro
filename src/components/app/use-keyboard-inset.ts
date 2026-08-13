/**
 * The `visualViewport` fallback that ships beside `__root.tsx`'s
 * `interactive-widget=resizes-content` — « v1 build spec » § 7 (*`__root.tsx` carries the document
 * and nothing visible*).
 *
 * It writes § 5's `layoutHeight − visualViewport.height − offsetTop` into `--kb`, which the layout
 * subtracts. **It needs no threshold constant** because the value is 0 when no keyboard is up, and
 * it is written to `documentElement` rather than to the shell so that the shell's own inline custom
 * properties cannot shadow it.
 *
 * **`resize` *and* `scroll`, and the `offsetTop` term, are both § 5's and both load-bearing on the
 * one platform this fallback exists for.** Older iOS Safari ignores `interactive-widget` and *pans*
 * the visual viewport instead of resizing the layout viewport: the pan fires `scroll`, not
 * `resize`, and it is `offsetTop` that carries it. Listening to `resize` alone with no `offsetTop`
 * term overstates the inset and then never updates during the pan — and `--kb` is what A12's
 * `compact` trigger reads.
 *
 * Two things stated plainly, both § 5's: the ~336 px soft-keyboard height the budgets assume is
 * **platform-typical, not measured**, and the `interactive-widget` / `visualViewport` pair is
 * **untested** — no iOS device was available. This is written to be harmless if the meta tag works:
 * where it does, `innerHeight` tracks the resized content, `offsetTop` stays 0, and the difference
 * stays 0.
 */

import { useEffect } from "react";

/** The property the layout reads as `var(--kb, 0px)`. */
const KEYBOARD_INSET = "--kb";

export function useKeyboardInset(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (viewport === null || viewport === undefined) return;

    const apply = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty(KEYBOARD_INSET, `${inset}px`);
    };

    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
      document.documentElement.style.removeProperty(KEYBOARD_INSET);
    };
  }, []);
}
