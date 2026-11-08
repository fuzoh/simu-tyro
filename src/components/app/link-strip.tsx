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

import { Button } from "@/components/ui/button.tsx";
import { DISMISS_LABEL } from "@/lib/app/link-strip.ts";

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
      // A full-bleed bar, so `px-3` — `docs/conventions/ui.md` § *Rhythm*.
      className="border-border bg-muted/40 text-muted-foreground flex items-start gap-3 border-b px-3 py-2 text-xs"
      ref={bandRef}
      role="status"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {strip.ignored !== null && <p>{strip.ignored}</p>}
        {strip.completed !== null && <p>{strip.completed}</p>}
        {strip.rewritten !== null && <p>{strip.rewritten}</p>}
      </div>
      {/* The dismiss control is the registry's square icon button — 28 px visually, 44 px to a
          thumb through `.touch-44` applied here rather than baked into `ui/button.tsx`. */}
      <Button
        aria-label={DISMISS_LABEL}
        className="touch-44 text-muted-foreground hover:text-foreground shrink-0"
        onClick={() => setDismissed(true)}
        size="icon-sm"
        title={DISMISS_LABEL}
        variant="ghost"
      >
        ✕
      </Button>
    </div>
  );
}
