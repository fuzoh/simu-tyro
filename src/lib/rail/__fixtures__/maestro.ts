/**
 * The Petzl Maestro working loads, as issue #86 quotes them from the report of 2026-11-08
 * (issue #64). Plain data, no import from the table it checks.
 *
 * Provenance per figure, in `testing.md`'s tagging: `[DATASHEET]` — Petzl technical notice
 * D0003200K, p. 2, and the product pages. These are **charges d'utilisation** in kg, never the
 * slip threshold (8,5 to more than 11 kN, a different quantity published elsewhere).
 */

export type MaestroRow = {
  device: "maestro-s" | "maestro-l";
  /** Rope diameter typed, mm. */
  diameter: number;
  /** The published working load, kg; `null` where Petzl publishes nothing for that diameter. */
  kg: number | null;
  source: string;
};

const NOTICE = "[DATASHEET] Petzl notice D0003200K p. 2, issue #64";

export const MAESTRO_ROWS: readonly MaestroRow[] = [
  { device: "maestro-s", diameter: 10, kg: 150, source: NOTICE },
  { device: "maestro-s", diameter: 10.5, kg: 250, source: NOTICE },
  { device: "maestro-s", diameter: 11, kg: 250, source: NOTICE },
  { device: "maestro-s", diameter: 11.5, kg: 250, source: NOTICE },
  { device: "maestro-l", diameter: 12.5, kg: 280, source: NOTICE },
  { device: "maestro-l", diameter: 13, kg: 280, source: NOTICE },
  // Between the published bands, and outside them: nothing is published, so the limit is empty.
  { device: "maestro-s", diameter: 10.2, kg: null, source: "no published figure, issue #64" },
  { device: "maestro-s", diameter: 12, kg: null, source: "no published figure, issue #64" },
  { device: "maestro-l", diameter: 12, kg: null, source: "no published figure, issue #64" },
  { device: "maestro-l", diameter: 11, kg: null, source: "no published figure, issue #64" },
  { device: "maestro-l", diameter: 13.5, kg: null, source: "no published figure, issue #64" },
];
