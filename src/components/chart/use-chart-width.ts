/**
 * The app's **single** `ResizeObserver` — « v1 build spec » § 5 (*The spine*: « The Chart Block
 * element itself carries `container-type: inline-size` **and** the app's single `ResizeObserver` »).
 *
 * Two things it deliberately does not do:
 *
 * - **It reports `inlineSize` only.** Every band height is a function of the chart column's inner
 *   *width*; a hook that also published a height would be the mechanism § 5 spent its whole layout
 *   contract removing — `flex-[3]`/`flex-1` is *literally* how vertical exaggeration became a
 *   function of window height, and how the desktop shipped at ×5,02.
 * - **Its seed is `null`, not `{ width: 900 }`.** The prototype's seed drew a 900 px chart inside a
 *   390 px box on the first client frame. `null` means « not measured yet », which is the Skeleton's
 *   cue, and it is also what makes the Skeleton dimensionally correct at 390 px for free.
 */

import { useCallback, useState } from "react";

/** A ref callback for the Chart Block element, and its inline size — `null` until first measured. */
export function useChartWidth(): {
  ref: (node: HTMLElement | null) => void;
  width: number | null;
} {
  const [width, setWidth] = useState<number | null>(null);

  // A cleanup-returning ref callback (React 19) rather than an effect: the observer's lifetime is
  // the element's, and there is no second thing to keep in sync.
  const ref = useCallback((node: HTMLElement | null) => {
    if (node === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const inline = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width;
      setWidth((previous) => (previous === inline ? previous : inline));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
