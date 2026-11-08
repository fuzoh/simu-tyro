/**
 * The Material Spec presets — a **fill action** on the textile rope, never a Scenario field: the
 * Scenario carries the values a preset wrote, so a link stays reproducible without the app knowing
 * which preset (if any) produced them.
 *
 * The one preset is the Courant Bandit 11 mm, from the 2026-11-08 datasheet report (issue #78).
 * Provenance is therefore **derived, not stored**: a field cites the datasheet while it still holds
 * the preset's value at display precision, and a field moved off it reads « valeur utilisateur » —
 * but only once the spec is recognisably the preset's, so a rope typed by hand carries no chip.
 */

import type { QuantityId } from "@/lib/format/quantity.ts";
import type { ScenarioDraft, TextileDraft } from "@/lib/scenario/types.ts";

import { equalAtDisplayPrecision } from "@/lib/format/quantity.ts";
import { TEXTILE } from "@/lib/sim";

/** The textile fields a preset fills. */
export type PresetFieldId = "cls" | "MBL" | "muTextile" | "dTextile" | "k";

export type PresetId = "courant-bandit-11";

/** One field's provenance line: the chip and the popover behind it. */
export type PresetProvenance = {
  readonly label: string;
  readonly detail: string;
  readonly tone: "warning" | "neutral";
};

type PresetSpec = {
  readonly ropeClass: TextileDraft["ropeClass"];
  readonly MBL: number;
  readonly mu: number;
  readonly d: number;
  readonly k: number;
};

export type MaterialPreset = {
  readonly id: PresetId;
  readonly label: string;
  /** Canonical units: `MBL` in N, `mu` in kg/m, `d` in mm. */
  readonly spec: PresetSpec;
  readonly provenance: Readonly<Record<PresetFieldId, PresetProvenance>>;
};

const SHEET = "fiche technique Courant du 12/09/2022";
const SHEET_CHIP = "fiche Courant 12/09/2022";

const sheet = (detail: string): PresetProvenance => ({
  label: SHEET_CHIP,
  detail: `${detail} — ${SHEET} (rapport #78).`,
  tone: "neutral",
});

export const PRESET_LABEL = "Préréglage";

export const MATERIAL_PRESETS: readonly MaterialPreset[] = [
  {
    id: "courant-bandit-11",
    label: "Courant Bandit 11 mm",
    spec: {
      ropeClass: "pa-en1891a",
      MBL: 3100 * 10,
      mu: 73 / 1000,
      d: 11,
      // EA = (100 kg × g) / 0,025 ≈ 39 kN over MBL 31 kN, rounded to the field's two decimals.
      k: 1.27,
    },
    provenance: {
      cls: sheet("[DATASHEET] Polyamide EN 1891 type A"),
      MBL: sheet(
        "[DATASHEET] 3100 daN, confirmé par les fiches datées ; la page produit affiche 3000 daN",
      ),
      muTextile: sheet("[DATASHEET] 73 g/m, confirmé en 2020, 2022 et 2024"),
      dTextile: sheet("[DATASHEET] 11 mm"),
      k: {
        label: "non confirmé",
        detail: `[DATASHEET] arithmétique (allongement 2,5 % de 50 à 150 kg, ${SHEET}) : pas une donnée Courant. EA ≈ (100 kg × g) / 0,025 ≈ 39 kN, soit k = EA / MBL ≈ 1,27.\nLa page produit dit 3,5 % (EA ≈ 28 kN).\n§13.2 · docs/simulation-theory.md`,
        tone: "warning",
      },
    },
  },
];

/** The preset's fill: its values written into a textile spec, the terminations left as given. */
export function applyMaterialPreset(scenario: ScenarioDraft, id: PresetId): ScenarioDraft {
  const preset = MATERIAL_PRESETS.find((candidate) => candidate.id === id);
  if (preset === undefined || scenario.material.family !== "textile") return scenario;
  return { ...scenario, material: { family: "textile", ...preset.spec } };
}

const VALUE_CHIP: PresetProvenance = {
  label: "valeur utilisateur",
  detail: "Valeur modifiée depuis le préréglage.",
  tone: "neutral",
};

/** One numeric preset field described once: its quantity, what the spec holds, what the preset ships. */
const PRESET_NUMERICS = [
  {
    id: "MBL",
    quantity: "MBL",
    held: (m: TextileDraft) => m.MBL,
    shipped: (s: PresetSpec) => s.MBL,
  },
  {
    id: "muTextile",
    quantity: "mu",
    held: (m: TextileDraft) => m.mu,
    shipped: (s: PresetSpec) => s.mu,
  },
  {
    id: "dTextile",
    quantity: "d",
    held: (m: TextileDraft) => m.d ?? null,
    shipped: (s: PresetSpec) => s.d,
  },
  { id: "k", quantity: "k", held: (m: TextileDraft) => m.k, shipped: (s: PresetSpec) => s.k },
] as const satisfies readonly {
  id: PresetFieldId;
  quantity: QuantityId;
  held: (material: TextileDraft) => number | null;
  shipped: (spec: PresetSpec) => number;
}[];

function matches(
  material: TextileDraft,
  spec: PresetSpec,
  field: (typeof PRESET_NUMERICS)[number],
): boolean {
  const value = field.held(material);
  return value !== null && equalAtDisplayPrecision(field.quantity, value, field.shipped(spec));
}

/**
 * Recognition without a stored id: the spec is read as the preset's fill while class and `k` both
 * still hold its values (a deduced 1,27 on a polyamide A is no coincidence), or while three of the
 * five class-and-numbers do. Either way, editing one or two fields keeps the chips on the rest;
 * a lone coincidence — an 11 mm diameter, a 3100 daN MBL — recognises nothing.
 */
const RECOGNISED_AT = 3;

/**
 * The provenance each textile field currently shows. A field absent from the result carries no
 * chip: either the spec is not a preset's, the field is blank, or a class switch reset `k`.
 */
export function presetProvenance(
  material: TextileDraft,
): Partial<Record<PresetFieldId, PresetProvenance>> {
  for (const preset of MATERIAL_PRESETS) {
    const held = PRESET_NUMERICS.filter((field) => matches(material, preset.spec, field));
    const sameClass = material.ropeClass === preset.spec.ropeClass;
    const holdsK = held.some((field) => field.id === "k");
    if (!(sameClass && holdsK) && held.length + (sameClass ? 1 : 0) < RECOGNISED_AT) continue;
    const out: Partial<Record<PresetFieldId, PresetProvenance>> = {};
    out.cls = sameClass ? preset.provenance.cls : VALUE_CHIP;
    for (const field of PRESET_NUMERICS) {
      if (held.includes(field)) out[field.id] = preset.provenance[field.id];
      else if (field.held(material) === null) continue;
      // A class switch resets `k` to the class's shipped default, which is not the user's value.
      else if (
        field.id === "k" &&
        !sameClass &&
        material.k === TEXTILE.kDefault[material.ropeClass]
      )
        continue;
      else out[field.id] = VALUE_CHIP;
    }
    return out;
  }
  return {};
}
