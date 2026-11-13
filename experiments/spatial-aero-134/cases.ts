/**
 * The comparison matrix of the experiment (#134) — `docs/simulation-theory.md` §18.4 (the
 * coefficients and their provenance classes) and §18.7 (the two installation conventions). Every
 * input of the matrix is in this file, with where it comes from: **change a value here and
 * `bun experiments/spatial-aero-134/matrix.ts` replays everything**.
 *
 * Rules this module exists to keep:
 *
 * - **A finite, documented, adjustable matrix.** Two lines × two geometries × two load states ×
 *   the winds × the coefficient variants; nothing is sampled at random and nothing is hidden in
 *   the runner.
 * - **No product property is invented.** The steel line derives from §13.1's formulas through
 *   the engine; the textile line is the Courant Bandit 11 mm of the dated sheet the app's preset
 *   already cites, its stiffness named as arithmetic on that sheet and not as a Courant figure.
 * - **No aerodynamic coefficient here is a product measurement.** `C_D⊥ = 1,2` is a published
 *   order of magnitude that does not transfer; every non-zero `C_L` and `C_t` is a **sonde de
 *   sensibilité** — never a realistic interval, never a conservative bound, never a default.
 * - **The rider's load is one prescribed vector**, the same in every model: its weight. The
 *   experiment gives it no wind area, so nothing here depends on #127's ellipsoid.
 * - **The first variant is the reference** every other is compared with: normal drag alone.
 */

import type { DerivedMaterial, Terrain, WindComponents } from "@/lib/sim";

import { deriveSteel, deriveTextile, DYNAMICS, windComponents } from "@/lib/sim";

import type { AeroCoefficients, LiftLaw } from "./aero.ts";

/** Where a value of the matrix comes from — the brief's three classes, and the inputs' own. */
export type Provenance =
  /** Read off an instrument. */
  | "mesurée"
  /** Published for another body or another flow: an order of magnitude, not this product's. */
  | "publiée non transférable"
  /** Chosen to explore the response. Neither a realistic interval nor a bound. */
  | "sonde de sensibilité"
  /** A dated manufacturer sheet. */
  | "fiche produit"
  /** Computed from the reference's formulas (`docs/simulation-theory.md` §13). */
  | "dérivée de la référence"
  /** A convention of the repository, with no normative source. */
  | "convention"
  /** An input of the illustrated installation: a scenario, not a recommendation. */
  | "scénario";

/** A value with its class and its source, as the report prints it. */
export type Sourced = {
  readonly name: string;
  readonly value: string;
  readonly provenance: Provenance;
  readonly source: string;
};

/** One line of the matrix: what the solver consumes, the diameter the wind sees, the pose. */
export type LineCase = {
  readonly id: string;
  readonly label: string;
  readonly family: "steel" | "textile";
  /** `w` N/m, `EA` N, `strength` N — the engine's derived material. */
  readonly material: DerivedMaterial;
  /** The declared aerodynamic diameter, m. */
  readonly d: number;
  /**
   * The tension de pose, N: the total tension at the tensioning anchor A on the unloaded line.
   * Without wind it fixes the `L₀` of the main comparison; under the wind it is the target of the
   * separate comparison (§18.7).
   */
  readonly poseTension: number;
  /**
   * How many identical Brins porteurs share the rider. The matrix computes **one** of them: it
   * carries its own weight and its own wind whole, and `1/n` of the rider's weight (§8.1).
   */
  readonly carryingMembers: 1 | 2;
  readonly inputs: readonly Sourced[];
};

/** The steel line: the app's shipped first-run cable, derived by the engine from §13.1. */
const STEEL_LINE: LineCase = {
  id: "acier-12",
  label: "Câble acier 12 mm, 6×19 âme métallique, 1770",
  family: "steel",
  material: deriveSteel({ family: "steel", d: 12, R0: 1770, construction: "iwrc" }),
  d: 0.012,
  poseTension: 2634,
  carryingMembers: 1,
  inputs: [
    {
      name: "diamètre nominal",
      value: "12 mm",
      provenance: "scénario",
      source: "ligne de premier lancement de l'application (`src/lib/scenario/first-run.ts`)",
    },
    {
      name: "masse linéique",
      value: "μ = W·d²/100 = 0,3795 × 144 / 100 = 0,54648 kg/m",
      provenance: "dérivée de la référence",
      source: "§13.1, facteur de masse nominale EN 12385-4 `[STD-ATTESTED]`, milieu de plage",
    },
    {
      name: "raideur axiale",
      value: "EA = E_app·C·d² = 115 GPa × 0,4165 × 144 mm² = 6,897 MN",
      provenance: "dérivée de la référence",
      source: "§13.1, module apparent et facteur de section, milieux de plage",
    },
    {
      name: "tension de pose",
      value: "2 634 N à l'ancrage A, à vide",
      provenance: "scénario",
      source: "ligne de premier lancement (`tp=263.4` daN)",
    },
    {
      name: "brins porteurs",
      value: "1 ; le câble porte tout le poids du passager",
      provenance: "scénario",
      source: "ligne de premier lancement",
    },
  ],
};

/** The textile line: the Courant Bandit 11 mm of the dated sheet behind the app's preset. */
const TEXTILE_LINE: LineCase = {
  id: "corde-bandit-11",
  label: "Corde Courant Bandit 11 mm, polyamide EN 1891 type A",
  family: "textile",
  material: deriveTextile({
    family: "textile",
    ropeClass: "pa-en1891a",
    MBL: 31000,
    mu: 0.073,
    k: 1.27,
    d: 11,
  }),
  d: 0.011,
  poseTension: 1400,
  carryingMembers: 2,
  inputs: [
    {
      name: "diamètre",
      value: "11 mm",
      provenance: "fiche produit",
      source: "fiche technique Courant du 12/09/2022 (préréglage `src/lib/rail/presets.ts`, #78)",
    },
    {
      name: "masse linéique",
      value: "73 g/m",
      provenance: "fiche produit",
      source: "fiche technique Courant du 12/09/2022, confirmée en 2020, 2022 et 2024",
    },
    {
      name: "charge de rupture",
      value: "3 100 daN",
      provenance: "fiche produit",
      source: "fiches datées ; la page produit affiche 3 000 daN",
    },
    {
      name: "raideur axiale",
      value: "EA = k·MBL = 1,27 × 31 000 N = 39,37 kN",
      provenance: "fiche produit",
      source:
        "arithmétique sur l'allongement de la fiche (2,5 % de 50 à 150 kg), pas une donnée Courant ; la page produit dit 3,5 % (§13.2)",
    },
    {
      name: "tension de pose",
      value: "1 400 N à l'ancrage A, à vide",
      provenance: "mesurée",
      source:
        "essai du 2026-11-01 sur cette corde, pose 1,52 → 1,40 kN (`docs/mesures dynamometre/README.md`) ; relevée sur 435 m, transposée ici à 150 m comme scénario",
    },
    {
      name: "brins porteurs",
      value: "2 ; le brin calculé porte la moitié du poids du passager",
      provenance: "convention",
      source:
        "§8.1, partage 50/50 `[CONVENTION]`, non validé ; montage à deux cordes de l'essai du 2026-11-01",
    },
  ],
};

export const LINES: readonly LineCase[] = [STEEL_LINE, TEXTILE_LINE];

/** The anchors: A at the origin, B at `(L, 0, h)`. */
export type GeometryCase = {
  readonly id: string;
  readonly label: string;
  /** Horizontal span, m. */
  readonly L: number;
  /** B's height relative to A, m. */
  readonly h: number;
};

/** The first-run span, level and with the first-run drop. Illustrated installations. */
export const GEOMETRIES: readonly GeometryCase[] = [
  { id: "niveau", label: "ancrages de niveau, 150 m", L: 150, h: 0 },
  { id: "incline", label: "ancrages inclinés, 150 m, B 18 m plus bas", L: 150, h: -18 },
];

/**
 * The prescribed ground and the gabarit: a straight ground line between the two anchor bases,
 * extruded sideways (Q16), and the app's 2,1 m envelope subtracted in full.
 *
 * Each anchor stands 20 m above its base. The first-run line takes 12 m, which the loaded textile
 * member does not clear; 20 m is a scenario chosen so that the gabarit stays above the ground in
 * every case of the matrix. A straight ground shifts every garde by the same amount, so the
 * differences between two models do not depend on that choice.
 */
export const GROUND = {
  /** Height of each anchor above its base, m. */
  anchorHeight: 20,
  /** The rider's whole vertical envelope, m — `[CONVENTION]`, §6.3. */
  gabarit: 2.1,
} as const;

/** The straight ground between the two anchor bases, as the engine's own terrain type. */
export function groundOf(geometry: GeometryCase): Extract<Terrain, { kind: "profile" }> {
  return {
    kind: "profile",
    xs: Float64Array.of(0, geometry.L),
    zs: Float64Array.of(-GROUND.anchorHeight, geometry.h - GROUND.anchorHeight),
  };
}

/**
 * The static rider: 120 kg held at the trolley, at the middle of the unstretched line. Its load
 * is its weight and nothing else, identical in every model; a line with two Brins porteurs
 * carries half of it on the member computed.
 */
export const RIDER = {
  /** kg — the first-run default, an unconfirmed design mass (§8.1). */
  mass: 120,
  /** The trolley's material coordinate as a share of `L₀`. */
  fraction: 0.5,
} as const;

/** The force the rider puts on the computed member, N: `(0, 0, −m·g/n)`, with the engine's `g`. */
export function riderForce(line: LineCase): readonly [number, number, number] {
  return [0, 0, (-RIDER.mass * DYNAMICS.g) / line.carryingMembers];
}

export const LOAD_STATES = [
  { id: "vide", label: "à vide", rider: false },
  { id: "passager", label: "passager statique de 120 kg au milieu", rider: true },
] as const;

export type LoadState = (typeof LOAD_STATES)[number];

/** Air density, kg/m³ — §12.2's sea-level value, the engine's without an altitude. */
export const AIR_DENSITY = DYNAMICS.rhoSeaLevel;

/** One prescribed wind: uniform, horizontal, the same along the whole line. */
export type WindCase = {
  readonly id: string;
  readonly label: string;
  /** m/s. */
  readonly speed: number;
  /**
   * Degrees clockwise from the head-on direction, as `windComponents` reads `from − bearing`:
   * 0° a head wind (blowing from B to A), 90° from the right of the travel A → B, 180° a tail wind.
   */
  readonly from: number;
  /** The velocity the air has in the line's frame, m/s. */
  readonly components: WindComponents;
};

const wind = (id: string, label: string, speed: number, from: number): WindCase => ({
  id,
  label,
  speed,
  from,
  // The engine's own projection, on a line whose bearing is taken as north.
  components: windComponents(speed, from, 0),
});

/** The two speeds the archived notes already illustrate with; neither is a design wind. */
export const WIND_SPEEDS = [10, 20] as const;

/**
 * No wind, then four directions at each speed: across, oblique, and almost parallel from each
 * end — the axial drag pulls toward A in a head wind and toward B in a tail wind, and on an
 * inclined line the two are not mirror images.
 */
export const WINDS: readonly WindCase[] = [
  wind("calme", "sans vent", 0, 0),
  ...WIND_SPEEDS.flatMap((speed) => [
    wind(`travers-${speed}`, `${speed} m/s de travers (90°)`, speed, 90),
    wind(`oblique-${speed}`, `${speed} m/s oblique de face (45°)`, speed, 45),
    wind(`quasi-face-${speed}`, `${speed} m/s presque de face (5°)`, speed, 5),
    wind(`quasi-dos-${speed}`, `${speed} m/s presque de dos (175°)`, speed, 175),
  ]),
];

/**
 * §18.4's coefficients. `C_D⊥` is one value for every model; the lift and the axial drag are
 * probes, zero included.
 */
export const COEFFICIENTS = {
  /**
   * `C_D⊥ = 1,2` — the order of magnitude published for a smooth cylinder below its critical
   * Reynolds number and for other stranded constructions, and the convention #127 adopted
   * (Q35). **Publiée non transférable**: no 6×19 and no dry textile rope was measured.
   */
  normal: 1.2,
  /** `|C_L|` probes — **sondes de sensibilité**, run with both signs. */
  liftMagnitudes: [0.05, 0.2, 0.5],
  /** The two orientation hypotheses of §18.3. */
  liftLaws: ["binormal", "yaw-odd"],
  /** `C_t` probes, on the diameter — **sondes de sensibilité**. */
  axial: [0.02, 0.1],
} as const satisfies {
  normal: number;
  liftMagnitudes: readonly number[];
  liftLaws: readonly LiftLaw[];
  axial: readonly number[];
};

/** The four models the brief compares. */
export type ModelId = "normale" | "normale+portance" | "normale+axiale" | "normale+portance+axiale";

/** One column of the coefficient matrix. */
export type Variant = {
  readonly id: string;
  readonly model: ModelId;
  readonly aero: AeroCoefficients;
};

/** A number as the French report prints it: a decimal comma, a true minus sign. */
const french = (value: number): string => String(value).replace(".", ",").replace("-", "−");

const signed = (value: number): string => `${value > 0 ? "+" : "-"}${Math.abs(value)}`;

/**
 * The coefficient matrix, reference first:
 *
 * 1. normal drag alone;
 * 2. normal + lift — both laws, three magnitudes, both signs;
 * 3. normal + axial drag — two magnitudes;
 * 4. normal + lift + axial — the binormal law crossed with the axial probes. The yaw-odd law is
 *    not crossed again: it is an orientation probe, and the matrix stays finite.
 */
export const VARIANTS: readonly Variant[] = (() => {
  const { normal, liftMagnitudes, liftLaws, axial } = COEFFICIENTS;
  const lifts = liftMagnitudes.flatMap((magnitude) => [magnitude, -magnitude]);
  const law = (liftLaw: LiftLaw): string => (liftLaw === "binormal" ? "b" : "y");
  const variants: Variant[] = [
    { id: "N", model: "normale", aero: { normal, lift: 0, liftLaw: "binormal", axial: 0 } },
  ];
  for (const liftLaw of liftLaws) {
    for (const lift of lifts) {
      variants.push({
        id: `NL-${law(liftLaw)}${signed(lift)}`,
        model: "normale+portance",
        aero: { normal, lift, liftLaw, axial: 0 },
      });
    }
  }
  for (const Ct of axial) {
    variants.push({
      id: `NA-${Ct}`,
      model: "normale+axiale",
      aero: { normal, lift: 0, liftLaw: "binormal", axial: Ct },
    });
  }
  for (const lift of lifts) {
    for (const Ct of axial) {
      variants.push({
        id: `NLA-b${signed(lift)}-${Ct}`,
        model: "normale+portance+axiale",
        aero: { normal, lift, liftLaw: "binormal", axial: Ct },
      });
    }
  }
  return variants;
})();

/** The reference every variant is compared with: normal drag alone. */
export const REFERENCE_VARIANT = VARIANTS[0];

/** The coefficients' own provenance lines, for the report. */
export const COEFFICIENT_SOURCES: readonly Sourced[] = [
  {
    name: "C_D⊥",
    value: french(COEFFICIENTS.normal),
    provenance: "publiée non transférable",
    source:
      "ordre de grandeur du cylindre lisse sous-critique et d'autres câbles toronnés (`production-aerodynamics-followup.md` §4) ; convention adoptée par #127 (Q35), pas une mesure de 6×19 ni de corde sèche",
  },
  {
    name: "C_L",
    value: `0 ; ±${COEFFICIENTS.liftMagnitudes.map(french).join(" ; ±")}`,
    provenance: "sonde de sensibilité",
    source: "choisie pour explorer la réponse ; aucune mesure transférable (§18.4)",
  },
  {
    name: "C_t",
    value: `0 ; ${COEFFICIENTS.axial.map(french).join(" ; ")}`,
    provenance: "sonde de sensibilité",
    source: "choisie pour explorer la réponse ; aucune mesure exploitable (§18.4)",
  },
  {
    name: "ρ",
    value: `${french(AIR_DENSITY)} kg/m³`,
    provenance: "convention",
    source: "§12.2, densité au niveau de la mer, celle du moteur sans profil d'altitude",
  },
];

/** The installation every line of the matrix is put in, for the report. */
export const SCENARIO_SOURCES: readonly Sourced[] = [
  {
    name: "portée",
    value: `${GEOMETRIES[0].L} m`,
    provenance: "scénario",
    source: "ligne de premier lancement de l'application",
  },
  {
    name: "dénivelé",
    value: GEOMETRIES.map((geometry) => `${french(geometry.h)} m`).join(" ; "),
    provenance: "scénario",
    source: "ancrages de niveau, puis dénivelé de la ligne de premier lancement",
  },
  {
    name: "sol",
    value: `droit entre les pieds des ancrages, ${GROUND.anchorHeight} m sous chacun, extrudé latéralement`,
    provenance: "scénario",
    source:
      "choisi pour que le gabarit reste au-dessus du sol dans tous les cas ; extrusion Q16, pas un relevé hors axe",
  },
  {
    name: "gabarit",
    value: `${french(GROUND.gabarit)} m`,
    provenance: "convention",
    source: "§6.3, gabarit vertical entier de l'application, retranché en entier",
  },
  {
    name: "passager",
    value: `${RIDER.mass} kg, immobile, tenu au chariot au milieu de la longueur non tendue`,
    provenance: "scénario",
    source: "masse de premier lancement, non confirmée (§8.1) ; poids seul, aucune prise au vent",
  },
  {
    name: "vent",
    value: `uniforme et horizontal ; 0, ${WIND_SPEEDS.join(" et ")} m/s ; de 90°, 45°, 5° et 175°`,
    provenance: "scénario",
    source: "vitesses d'illustration des notes archivées, pas des vents de calcul",
  },
];

/** One base case: a line on a geometry in a load state under a wind. */
export type BaseCase = {
  readonly id: string;
  readonly line: LineCase;
  readonly geometry: GeometryCase;
  readonly load: LoadState;
  readonly wind: WindCase;
};

/** Every base case, in the order the tables print them. */
export function baseCases(): BaseCase[] {
  const cases: BaseCase[] = [];
  for (const line of LINES) {
    for (const geometry of GEOMETRIES) {
      for (const load of LOAD_STATES) {
        for (const wind of WINDS) {
          cases.push({
            id: [line.id, geometry.id, load.id, wind.id].join("|"),
            line,
            geometry,
            load,
            wind,
          });
        }
      }
    }
  }
  return cases;
}
