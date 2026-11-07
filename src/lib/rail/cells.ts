/**
 * The read-out cells under the charts, as data — « v1 build spec » § 5's five plus « Garde
 * passager » and « Écart à vide » (2026-09-23), « à la position du passager ».
 *
 * The cells are keyed by {@link CellId}, never by their French label: the shell's layout table and
 * the help table are records over the same id, so a renamed label cannot leave a lookup behind.
 */

import type { SceneRider } from "@/lib/chart/scene.ts";
import type { ForceUnit } from "@/lib/scenario/types.ts";

import { formatAtX, formatQuantity } from "@/lib/format/quantity.ts";

import { GATE_CONSEQUENCE } from "./gates.ts";
import { clearanceBreached } from "./results.ts";

/** The cells in row order — the same order at every width. */
export const CELL_IDS = [
  "clearance",
  "TA",
  "TB",
  "slope",
  "sag",
  "underRider",
  "belowUnloaded",
] as const;

export type CellId = (typeof CELL_IDS)[number];

/**
 * Each cell's label with no rider placed — the Skeleton's and the pre-measurement frame's.
 *
 * **« Garde min. ligne » and no longer « Garde min »** — ticket 41,
 * [amendment M](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md). The cell prints
 * `rider.worst.hClear`, §11's minimum **over the whole line** at the current rider position, and
 * the row's « à la position du passager » was being read as *under* the passenger. `ligne` is also
 * what separates it from the Rail's « Garde min (traversée) »: `ligne` reduces over `x`,
 * `traversée` over `x_P`. Its longest form, « Garde min. ligne (à x 74,3 m) », was measured on one
 * 16 px line in the 44 px `pinned` row at 390 px.
 */
export const CELL_LABEL: Record<CellId, string> = {
  clearance: "Garde min. ligne",
  TA: "T anc. A",
  TB: "T anc. B",
  slope: "Pente",
  sag: "Flèche",
  underRider: "Garde passager",
  belowUnloaded: "Écart à vide",
};

/**
 * One cell's content. `note` marks a clause standing where a number would — set apart
 * typographically, because a sentence in `text-lg` mono would read as a value.
 */
export type Cell = {
  readonly label: string;
  readonly value: string;
  readonly note: boolean;
  /** Under « Garde min. admise » — the one cell that carries its own threshold (2026-09-23). */
  readonly breach: boolean;
};

/**
 * Every cell for a placed rider.
 *
 * @param clearance `false` under a Clearance Gate breach: the two garde cells then say why, rather
 *   than print a number computed from the refused anchor height, and rather than « — », which is
 *   `Indéterminé`'s glyph and not this state.
 */
export function readOutCells(
  rider: SceneRider,
  {
    clearance,
    hClearMin,
    unit,
  }: { readonly clearance: boolean; readonly hClearMin: number; readonly unit: ForceUnit },
): Record<CellId, Cell> {
  const refused: Omit<Cell, "label"> = {
    value: GATE_CONSEQUENCE.clearance,
    note: true,
    breach: false,
  };
  const cell = (id: CellId, value: string): Cell => ({
    label: CELL_LABEL[id],
    value,
    note: false,
    breach: false,
  });
  return {
    // `worst.hClear` is the minimum over the whole line at this rider position — the strip's curve
    // — and **not** the garde under the passenger, which is `underRider`.
    clearance: clearance
      ? {
          label: rider.relabel
            ? `${CELL_LABEL.clearance} (${formatAtX(rider.worst.atX)})`
            : CELL_LABEL.clearance,
          value: formatQuantity("clearance", rider.worst.hClear),
          note: false,
          breach: clearanceBreached(rider.worst.hClear, hClearMin),
        }
      : { label: CELL_LABEL.clearance, ...refused },
    TA: cell("TA", formatQuantity("Tstatic", rider.step.TA, unit)),
    TB: cell("TB", formatQuantity("Tstatic", rider.step.TB, unit)),
    slope: cell("slope", formatQuantity("localSlope", Math.tan(rider.step.theta) * 100)),
    sag: cell("sag", formatQuantity("loadedSag", rider.sagAtRider)),
    // Judged by nothing, so never red; refused with the garde because it reads the same anchor
    // heights and envelope.
    underRider: clearance
      ? cell("underRider", formatQuantity("clearance", rider.underRider))
      : { label: CELL_LABEL.underRider, ...refused },
    // The cable alone — no ground, no envelope — so no gate touches it.
    belowUnloaded: cell("belowUnloaded", formatQuantity("unloadedGap", rider.belowUnloaded)),
  };
}
