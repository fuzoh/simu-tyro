/**
 * The Chart Block's fixed words — the View Strip's controls and the empty plots' line. They live
 * here rather than in the components so a Page's label table reaches them from a `node` test: the
 * Chart Block prints them on Statique as on Avancé.
 */

import type { PeekMode } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { READ_OUT_SCOPE } from "@/lib/rail/cells.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

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
  fit: { full: label("seeWholeLine", "terrain"), short: "tout" },
};

/** Each layer toggle's two labels. `full` is also its `aria-label` and `title`. */
export const LAYER_LABEL: Record<keyof LayerToggles, { full: string; short: string }> = {
  unloadedLine: { full: label("unloadedLine", "exact"), short: "à vide" },
  chordAB: { full: label("anchorLine", "exact"), short: "A–B" },
  trajectory: { full: label("trajectory", "exact"), short: "trajet" },
  riderTip: { full: "distances", short: "dist." },
};

/**
 * What the coupe's and the vue de dessus's hover says beside the distance and the garde au sol, whose
 * words are `label("distance")` and `label("groundClearance")`. A manual line has no altitude of its
 * own, so its heights are counted from A's foot and the hover says so once, on a line of its own.
 * « chargée » because GLOSSARY's bare « ligne » is the Span. The hover prints these and the two
 * labels in the `terrain` register everywhere: they are `same()` in both registers, so the register
 * only matters here through `label()`.
 */
export const COUPE_HOVER = {
  ground: { absolute: "altitude du sol", fromFoot: "hauteur du sol" },
  line: { absolute: "altitude de la ligne chargée", fromFoot: "hauteur de la ligne chargée" },
  lineGap: "écart ligne – sol",
  fromFoot: "hauteurs depuis le pied de A",
  /** A position inside a Zone d'ancrage (#106): the garde is read there, and judged nowhere. */
  anchorZone: `${label("anchorZone", "terrain")} : garde non jugée`,
} as const;

/**
 * Avancé's tension graph (#119). Its scope is the read-out row's — « à la position du passager » —
 * stated on the heading, because the « T max » of the Résultats is the traverse's and the two must
 * not be read for one another. With two Brins porteurs every value is one line's under the normal
 * 50/50 share, and the graph says so on its axis, in a note and in its hover: **never the sum**.
 */
export const TENSION_COPY = {
  title: `${heading("internalTension", "exact")} le long de la ligne`,
  scope: READ_OUT_SCOPE,
  /** The y axis's name, with the unit the force selector chose. */
  yAxis: (unit: string, perLine: boolean) =>
    `${label("internalTension", "exact")}${perLine ? " par ligne" : ""} (${unit})`,
  xAxis: `${label("distance", "exact")} depuis A (m)`,
  unloaded: label("unloadedLine", "exact"),
  loaded: label("loadedLine", "exact"),
  /** The legend's entry when the exact solve at the passager's position refuses. */
  loadedUnavailable: `${label("loadedLine", "exact")} indisponible à cette position`,
  passenger: label("passenger", "exact"),
  sideA: `${label("loadedLine", "exact")}, côté A`,
  sideB: `${label("loadedLine", "exact")}, côté B`,
  perLineShort: "par ligne, partage 50/50",
  perLineNote: `Deux ${label("carryingLines", "exact")} : tension d'une seule ligne, le passager étant partagé 50/50 entre les deux (P / 2 par ligne) — jamais la somme des deux lignes. Ce partage n'est pas confirmé par l'essai.`,
} as const;
