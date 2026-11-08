/**
 * **Mise en tension** — the device that tensions the line, and the one number it adds: the tension
 * limit the prétension is read against (#86).
 *
 * The device is **descriptive**: nothing here feeds a solve, a sweep or a verdict, so a Scenario
 * with and without an exceeded limit produces the same results to the digit. The limit is the
 * **charge d'utilisation** Petzl publishes, never the slip threshold (that one is in kN, for new
 * gear and new rope, and Petzl itself says it is no way to absorb a fall) — so a warning here is
 * never presented as a fuse.
 *
 * - **A Maestro is a rope device.** On a câble it is kept as it arrived (ADR-0001) and warned, with
 *   a Fix Action; the limit is empty there, since no rope diameter was typed.
 * - **Empty means silent.** The mouflage, a diameter outside the published ranges and a blank
 *   diameter all have no limit and raise nothing: no figure was published for them.
 */

import type { ForceUnit, ScenarioDraft, TensioningDevice } from "@/lib/scenario/types.ts";

import { formatQuantity, KGF } from "@/lib/format/quantity.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import type { DeducedSolve } from "./deduced.ts";

import { TENSIONING_DEVICE_LABEL } from "./fields.ts";

/** One published limit: its value, the rope diameters it holds for, and where it comes from. */
export type TensionLimit = {
  /** Charge d'utilisation, **kg** — as Petzl prints it, read as kgf against a tension. */
  readonly kg: number;
  /** Rope diameter band the figure holds for, mm, bounds included. `from === to` is one diameter. */
  readonly diameter: { readonly from: number; readonly to: number };
  /** The provenance label every value carries. */
  readonly source: string;
};

const PETZL = "notice Petzl, rapport #64";

/**
 * Petzl's working loads by device and rope diameter. The MAESTRO S is listed « 10 to 11.5 mm » on
 * the product page, but the notice (p. 2) gives 150 kg at 10 mm and 250 kg at 10,5 to 11,5 mm: the
 * notice governs, and nothing is published between 10 and 10,5 mm.
 */
const LIMITS: Readonly<Record<Exclude<TensioningDevice, "pulley">, readonly TensionLimit[]>> = {
  "maestro-s": [
    { kg: 150, diameter: { from: 10, to: 10 }, source: PETZL },
    { kg: 250, diameter: { from: 10.5, to: 11.5 }, source: PETZL },
  ],
  "maestro-l": [{ kg: 280, diameter: { from: 12.5, to: 13 }, source: PETZL }],
};

/**
 * The tension limit of a device on a rope of `diameter` mm, or `null` when none is published.
 *
 * @param diameter the **rope diameter as typed**; `null` or `undefined` is a blank field.
 */
export function tensionLimit(
  device: TensioningDevice,
  diameter: number | null | undefined,
): TensionLimit | null {
  if (device === "pulley" || diameter === null || diameter === undefined) return null;
  return (
    LIMITS[device].find(
      (entry) => diameter >= entry.diameter.from && diameter <= entry.diameter.to,
    ) ?? null
  );
}

/**
 * The limite de tension as Avancé prints it: the force Petzl's kilograms are read as, in the
 * selected unit, beside the prétension it is compared with — and, for its provenance chip, the
 * figure as published and where — or `null` where none is published.
 */
export function limitReading(
  scenario: Pick<ScenarioDraft, "material" | "tensioningDevice">,
  unit: ForceUnit,
): { readonly value: string; readonly provenance: string } | null {
  const { material, tensioningDevice } = scenario;
  const limit = tensionLimit(
    tensioningDevice,
    material.family === "textile" ? material.d : undefined,
  );
  if (limit === null) return null;
  return {
    value: formatQuantity("T_target", limit.kg * KGF, unit),
    provenance:
      `Charge d'utilisation publiée : ${limit.kg} kg pour une corde de ` +
      `${diameterBand(limit.diameter)} — ${limit.source}.`,
  };
}

/**
 * The unloaded tension of a solved line at the anchor carrying the Mise en tension, per member —
 * the prétension. The one place the side picks an anchor, so the field's prefill and the
 * `Valeurs déduites` row cannot read different ends.
 */
export function pretensionOf(
  solve: Pick<DeducedSolve, "Tvide">,
  { tensioningSide }: Pick<ScenarioDraft, "tensioningSide">,
): number {
  return tensioningSide === "A" ? solve.Tvide.TA : solve.Tvide.TB;
}

/**
 * The tension de pose the Scenario **asks for**, N per member: the target when the prétension
 * drives, otherwise the read-out of the solved line. `null` where there is neither — an unsolved
 * line that is not driven by it.
 */
export function demandedPretension(
  scenario: Pick<ScenarioDraft, "tightness" | "tensioningSide">,
  solve: Pick<DeducedSolve, "Tvide"> | null,
): number | null {
  if (scenario.tightness.mode === "anchor") return scenario.tightness.T_target;
  return solve === null ? null : pretensionOf(solve, scenario);
}

/** « 10 mm » or « 10,5 à 11,5 mm ». */
function diameterBand({ from, to }: TensionLimit["diameter"]): string {
  const mark = (value: number) => `${value}`.replace(".", ",");
  return from === to ? `${mark(from)} mm` : `${mark(from)} à ${mark(to)} mm`;
}

/**
 * § 6's Avertissement for a prétension over the device's limit, without its glyph — or `null`
 * when the Scenario has no limit, no demanded tension, or stays under it.
 *
 * The copy names the figure and its provenance, so the number is checkable where it is read.
 */
export function overLimitWarning(
  scenario: Pick<ScenarioDraft, "material" | "tensioningDevice">,
  demanded: number | null,
): string | null {
  const { material, tensioningDevice } = scenario;
  const limit = tensionLimit(
    tensioningDevice,
    material.family === "textile" ? material.d : undefined,
  );
  if (limit === null || demanded === null || demanded <= limit.kg * KGF) return null;
  return (
    "la tension demandée dépasse la charge d'utilisation du dispositif " +
    `(${TENSIONING_DEVICE_LABEL[tensioningDevice]}, ${limit.kg} kg pour une corde de ` +
    `${diameterBand(limit.diameter)} — ${limit.source}). Ce n'est pas le seuil de glissement, ` +
    "et le glissement n'est pas un fusible."
  );
}

/** The Fix Action's label — it describes the effect of pressing it. */
export const PASS_TO_PULLEY = `Passer au ${label("pulleySystem", "exact")}`;

/** Why a Maestro is unavailable on a câble — the picker's one reason. */
export const MAESTRO_ROPE_ONLY = "Les Maestro S et L ne se posent que sur une corde.";

/**
 * The Avertissement for a Maestro held on a câble, without its glyph, or `null`. No Blocking Error:
 * the device crosses none of the three gates, so it has no effect on any result.
 */
export function deviceOnCableWarning(
  scenario: Pick<ScenarioDraft, "material" | "tensioningDevice">,
): string | null {
  if (scenario.tensioningDevice === "pulley" || scenario.material.family === "textile") return null;
  return (
    "ce dispositif ne se pose que sur une corde : sur un câble, il est conservé tel quel " +
    "et n'a aucun effet sur les résultats."
  );
}
