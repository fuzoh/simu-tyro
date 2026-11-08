/**
 * The ride's constants on the Page Avancé (#104) — §12.2's `C_dA`, `F₀` and `k_v` on a corde, `μ` on
 * a câble, and `ρ` — and the words that qualify them in the exact register: where `ρ` is read
 * from when it is not typed, §12.1's quasi-static avertissement, and the câble's unconfirmed law.
 *
 * The rides themselves are `@/lib/scenario/dynamics.ts`'s; this module only words what they report.
 */

import type { AirDensitySource, DynamicsReading } from "@/lib/scenario/dynamics.ts";

import {
  DECIMAL_MARK,
  equalAtDisplayPrecision,
  formatAtX,
  formatValue,
} from "@/lib/format/quantity.ts";
import { DYNAMICS } from "@/lib/sim";
import { label } from "@/lib/vocabulary/labels.ts";

import type { ChipLabel } from "./provenance.ts";

/** The Rail group the five constants stand in. */
export const DYNAMICS_HEADING = `Dynamique du ${label("passenger", "exact")}`;

/**
 * The câble's trolley law, as an **ambient** line: it is said on every câble, so an ⚠ there would
 * fire always and mean nothing.
 */
export const STEEL_TROLLEY_NOTE =
  "Loi à μ constant sur câble, non confirmée (§12.2) : aucune source ouverte ne sépare le câble de la corde.";

/**
 * The câble's `μ` is an Unconfirmed Default (§12.2, `[CONVENTION]`): « non confirmé » as shipped,
 * « valeur utilisateur » once typed over — a typed `μ` is no better sourced, only the user's own.
 */
export function trolleyMuChip(
  mu: number,
): Extract<ChipLabel, "non confirmé" | "valeur utilisateur"> {
  return equalAtDisplayPrecision("trolleyMu", mu, DYNAMICS.steel.mu)
    ? "non confirmé"
    : "valeur utilisateur";
}

/** Where the `ρ` of the rides comes from, under its field. */
const AIR_DENSITY_SOURCE: Readonly<Record<AirDensitySource, string>> = {
  typed: "Valeur saisie : vider le champ revient à la valeur lue.",
  profile: "Lue : atmosphère type à l'altitude moyenne du profil importé (§12.2).",
  "sea-level": "Lue : niveau de la mer, sans profil importé (§12.2).",
};

/** The air density the rides use: the field's idle text when nothing is typed, and its source. */
export function airDensityShown(rho: DynamicsReading["rho"]): {
  readonly idle: string | undefined;
  readonly note: string;
} {
  return {
    idle: rho.source === "typed" ? undefined : formatValue("rho", rho.value),
    note: AIR_DENSITY_SOURCE[rho.source],
  };
}

/** §12.1's check, as the row that reads it. */
export const QUASI_STATIC_LABEL = "Rapport v/c maximal";

/**
 * §12.1's check over the two rides: the largest `v/c` and where it is reached, and its
 * Avertissement — without its glyph — above the 0,2 threshold. `null` where there is no ride: an
 * unsolved line or an incomplete traverse.
 */
export function quasiStaticRow(
  reading: Pick<DynamicsReading, "quasiStatic"> | null,
): { readonly value: string; readonly warning: string | null } | null {
  if (reading === null) return null;
  const { ratio, atX, exceeded } = reading.quasiStatic;
  const shown = (value: number) => value.toFixed(2).replace(".", DECIMAL_MARK);
  return {
    value: `${shown(ratio)} ${formatAtX(atX)}`,
    warning: exceeded
      ? `au-dessus de ${shown(DYNAMICS.quasiStaticLimit)} (§12.1) : la trajectoire figée décrit mal ` +
        "la traversée, et les sorties de la dynamique ne sont plus quasi statiques."
      : null,
  };
}
