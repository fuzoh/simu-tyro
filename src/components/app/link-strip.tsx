/**
 * The « clé ignorée » strip — « v1 build spec » § 8 (*Les surfaces du lien*, *Le bandeau des clés
 * ignorées*). Every string it renders is decided in `@/lib/app/link-strip.ts`, where the `node`
 * suite reaches it (amendment A); what lives here is the affordance.
 *
 * - **Above rail and charts, full width, and *not* the banner slot.** It is about the **link** and
 *   not the line, and it may never be able to hide a verdict (invariant 4).
 * - **Manual dismissal only, no auto-hide, and the dismissal lasts for the page load and nothing
 *   longer** — component state. The strip is computed from the raw query **before** the rewrite
 *   fires, so a reload of the now-clean URL produces no strip at all: there is nothing left for a
 *   persisted dismissal to suppress, and a per-URL dismissal map would be Session surface nobody
 *   owns.
 * - **Shown once at load.** The arrival is fixed at first render, so nothing here re-renders it
 *   into existence later.
 */

import { useState } from "react";

import type { LinkStrip } from "@/lib/app/link-strip.ts";

/** The dismiss control. Labelled by its **effect**, like every other action in the app. */
const DISMISS_LABEL = "Masquer ce message";

export function LinkStripNotice({
  bandRef,
  strip,
}: {
  /**
   * The band's own height, measured — § 5's `ViewportFit.chromeHeight`. It is the **only** thing
   * outside this file that the strip's box tells anyone: the band sits above both columns, so above
   * B2 it comes straight out of the chart column's height, and collapse condition (c) has to spend
   * it or the block's last band is clipped (ticket 31, **D3**). Voir `useBandHeight`.
   *
   * Nothing here is *sized* from it, and there is no ref when nobody asks: the Skeleton renders no
   * strip at all.
   */
  bandRef?: (node: HTMLElement | null) => void;
  strip: LinkStrip | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (strip === null || dismissed) return null;

  return (
    <div
      className="border-border bg-muted/40 text-muted-foreground flex items-start gap-3 border-b px-4 py-2 text-[11px]"
      ref={bandRef}
      role="status"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {strip.ignored !== null && <p>{strip.ignored}</p>}
        {strip.completed !== null && <p>{strip.completed}</p>}
        {strip.rewritten !== null && <p>{strip.rewritten}</p>}
      </div>
      <button
        aria-label={DISMISS_LABEL}
        className="text-muted-foreground hover:text-foreground shrink-0 px-1"
        onClick={() => setDismissed(true)}
        title={DISMISS_LABEL}
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
