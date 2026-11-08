/**
 * The Chart Block's fixed words — the View Strip's controls and the empty plots' line. They live
 * here rather than in the components so a Page's label table reaches them from a `node` test: the
 * Chart Block prints them on Statique as on Avancé.
 */

import type { PeekMode } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { label } from "@/lib/vocabulary/labels.ts";

/**
 * § 8's own line for *l'exception géométrique*, centred in **both** empty plots — the one state
 * where there is no shared x domain, so nothing can be drawn against it and nothing can be pointed
 * at. Every other failure keeps its frame.
 */
export const NO_SPAN_LINE = "Portée invalide — aucun dessin possible.";

/**
 * The peek control's two labels, per mode — § 5's « ×1 vraie échelle », and the **decision 4**
 * toggle that puts a box-clipped cable back inside the frame. The label names *what pressing it does*, so
 * the mode that no longer shows ×1 no longer says ×1; the disabled control keeps § 5's own words,
 * because that is the row the spec's table describes.
 */
export const PEEK_LABEL: Record<PeekMode, { full: string; short: string }> = {
  off: { full: "×1 vraie échelle", short: "×1" },
  "true-scale": { full: "×1 vraie échelle", short: "×1" },
  fit: { full: "voir tout le câble", short: "tout" },
};

/** Each layer toggle's two labels. `full` is also its `aria-label` and `title`. */
export const LAYER_LABEL: Record<keyof LayerToggles, { full: string; short: string }> = {
  unloadedLine: { full: label("unloadedLine", "exact"), short: "à vide" },
  chordAB: { full: label("anchorLine", "exact"), short: "A–B" },
  trajectory: { full: label("trajectory", "exact"), short: "trajet" },
  riderTip: { full: "distances", short: "dist." },
};
