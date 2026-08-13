/**
 * The terrain-provenance disclosure block — « v1 build spec » § 6 (*La qualité du terrain est
 * toujours divulguée — en mode manuel aussi*), with its trigger conditions from § 4 (*Résolution*,
 * *Rectitude*, *Échecs de parsing*'s km hint).
 *
 * Rules this module exists to keep:
 *
 * - **The block is always present — in manual mode too.** Manual ground is a straight line between
 *   the two anchor bases: a real terrain model with real consequences for `garde min`. Rendering
 *   the block on import only would let its **absence** read silently as « aucun souci de terrain »
 *   in the exact mode where the terrain is a two-point idealisation.
 * - **The point count and the max spacing show whether or not a warning fires.** A clean import
 *   earns its disclosure as much as a coarse one; otherwise the absence of a warning is ambiguous.
 * - **Straightness has three states, and the third is a warning about the absence of a check.**
 *   « we could not check » and « we checked and it is bad » must not read alike — hence ℹ against
 *   ⚠ — and the unverifiable state is exactly where the denser-terrain escape hatch lands, since a
 *   hand-authored two-column CSV carries no coordinates.
 * - **The coarse-terrain copy states a limitation, not a remedy.** The 200-point cap is **per
 *   export**, so an operator told only « résolution grossière » re-exports and gets the same 200
 *   rows. Spacing is `length/199`, which crosses 5 m at ≈995 m of span — coarse terrain is the
 *   *normal* state on the upper half of the 50–2000 m range, and that frequency claim is
 *   **arithmetic, not observed**.
 * - **The km hint belongs here, not to the parse failures.** That file *was* accepted and the hint
 *   qualifies terrain now in use — a blocking failure has no scenario to disclose.
 * - **The copy is the spec's, verbatim.** Only the numbers are computed, and they carry the app's
 *   one decimal mark.
 */

import { DECIMAL_MARK } from "@/lib/format/quantity.ts";

import type { Trace } from "./trace.ts";

import { maxSpacing, traceExtent } from "./trace.ts";

/**
 * The glyph tier a line renders with — `plain` carries none. The renderer owns the glyph, so the
 * strings below stay comparable in a `node` test.
 */
export type DisclosureTier = "plain" | "ok" | "warn" | "info";

/** One line of the block: a headline, and the continuation the spec's copy wraps beneath it. */
export type DisclosureLine = {
  readonly tier: DisclosureTier;
  readonly text: string;
  readonly detail?: string;
};

/** The two terrain sources — one concept, and the simulation never distinguishes them. */
export type TerrainSource =
  | { readonly kind: "manual" }
  | { readonly kind: "trace"; readonly trace: Trace };

/** § 4's warning threshold on the measured max spacing, m. Crossed at a span of ≈995 m. */
export const COARSE_SPACING_M = 5;

/**
 * § 4's km-vs-m hint fires under this total distance, m. Reachable **only** for hand-authored
 * files: the sub-20 m duplicate-`Distance` rule rejects any geoportal trace short enough to
 * trigger it as `distance-dupliquée` first. Kept for exactly that case.
 */
export const KM_HINT_EXTENT_M = 5;

/**
 * A trace counts as straight while its max lateral deviation stays under **0,5 % of its own
 * extent**, with an absolute floor so a short trace is not warned about millimetres. Chosen, not
 * measured: § 4 fixes the two ends of the scale — the repo's real traces deviate by 7–9 mm over
 * 183–224 m (4×10⁻⁵ of the extent) and its worked bend is 34 m over 220 m (0,15) — and leaves the
 * cut between them free. At 0,5 % the bend inflates `L` by 5×10⁻⁵, which is below the file's own
 * 0,1 m grain, so nothing that passes this check moves a read-out.
 */
export const STRAIGHTNESS_RELATIVE = 0.005;

/** The absolute floor of the same rule, m. */
export const STRAIGHTNESS_FLOOR_M = 0.1;

/**
 * The block, as data. One entry per rendered line, in § 6's order: identity first, then the
 * resolution warning, then straightness, then the km hint.
 *
 * @param source manual ground, or the active Trace. An inactive cached Trace is not a source —
 *   the block describes the terrain *this run* uses.
 */
export function terrainDisclosure(source: TerrainSource): readonly DisclosureLine[] {
  if (source.kind === "manual") {
    return [
      {
        tier: "info",
        text: "Terrain — ligne droite entre les pieds d'ancrage (aucun profil importé)",
        detail:
          "Sur un sol plan, garde ≈ lerp(hauteurs d'ancrage) − flèche chargée − enveloppe " +
          "passager : le dénivelé ne gagne aucune garde. Mesuré, à L, flèche et hauteurs " +
          "constantes : garde min 2,46 / 2,44 / 2,37 / 2,25 m pour h = 0 / −18 / −40 / −60 m. " +
          "Une traversée de gorge modélisée à la main lit donc un échec qui n'existe pas — " +
          "mesuré −62,8 m sur une ligne de 1109 m. Importez un profil pour le relief réel.",
      },
    ];
  }

  const { trace } = source;
  const spacing = maxSpacing(trace);
  const extent = traceExtent(trace);
  const lines: DisclosureLine[] = [
    {
      tier: "plain",
      text: `Profil importé · ${trace.d.length} points · pas max ${fr(spacing, 1)} m`,
    },
  ];

  if (spacing > COARSE_SPACING_M) {
    lines.push({
      tier: "warn",
      text:
        "Résolution du terrain grossière (pas > 5 m) — un relief entre deux points de mesure " +
        "n'est pas vu par le calcul de garde au sol.",
      detail:
        "L'export du géoportail est limité à 200 points quelle que soit la longueur : " +
        "ré-exporter ne changera rien. Un profil plus dense doit venir d'une autre source.",
    });
  }

  lines.push(straightnessLine(trace.dev, extent));

  if (extent < KM_HINT_EXTENT_M) {
    lines.push({ tier: "warn", text: "Distances peut-être en km plutôt qu'en mètres ?" });
  }

  return lines;
}

/** § 4's three states, and the third is not the second in a quieter voice. */
function straightnessLine(dev: number | null, extent: number): DisclosureLine {
  if (dev === null) {
    return { tier: "info", text: "Rectitude non vérifiable (coordonnées absentes)." };
  }
  if (isStraight(dev, extent)) {
    return { tier: "ok", text: `Tracé rectiligne (écart max ${fr(dev, 2)} m)` };
  }
  return {
    tier: "warn",
    text: `Tracé non rectiligne (écart max ${fr(dev, 2)} m sur ${fr(extent, 1)} m).`,
    detail: "La portée L est mesurée le long du tracé, pas en ligne droite — elle est surestimée.",
  };
}

/**
 * The straightness verdict itself, so the badge and the copy cannot disagree.
 *
 * @param dev max lateral deviation from the A→B chord, m.
 * @param extent the trace's own horizontal extent, m.
 */
export function isStraight(dev: number, extent: number): boolean {
  return dev <= Math.max(STRAIGHTNESS_FLOOR_M, STRAIGHTNESS_RELATIVE * extent);
}

/**
 * A copy number, at the app's decimal mark. These are § 6 **prose** figures — a spacing and a
 * deviation — and § 3's display-precision table has no row for either, so this is not a bypass of
 * `quantity.ts`: it borrows that module's one decimal mark and nothing else.
 */
function fr(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", DECIMAL_MARK);
}
