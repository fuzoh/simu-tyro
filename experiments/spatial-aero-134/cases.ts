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
 *   the runner. **Nothing downstream repeats a value of this file**: the runner, the controls and
 *   the report read the axes off the cases and the variants, so an adjusted matrix is reported
 *   as what it is.
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

import type { AeroCoefficients, LiftLaw, Vec3 } from "./aero.ts";

/** Where a value of the matrix comes from — the brief's three classes, and the inputs' own. */
export type Provenance =
  /**
   * Read off an instrument, on the installation computed. No input of the present matrix is: a
   * figure measured on another installation enters as a « scénario », its measurement as source.
   */
  | "mesurée"
  /** Published for another body or another flow: an order of magnitude, not this product's. */
  | "publiée non transférable"
  /** Chosen to explore the response. Neither a realistic interval nor a bound. */
  | "sonde de sensibilité"
  /** A dated manufacturer sheet. */
  | "fiche produit"
  /** Arithmetic on a sheet's figure that the manufacturer does not state: not product data. */
  | "dérivée de la fiche, non confirmée"
  /** Computed from the reference's formulas (`docs/simulation-theory.md` §13). */
  | "dérivée de la référence"
  /** A convention of the repository, with no normative source. */
  | "convention"
  /** An input of the illustrated installation: a scenario, not a recommendation. */
  | "scénario";

/** A number as the French report prints it, as written: a decimal comma, a true minus sign. */
export const french = (value: number): string => String(value).replace(".", ",").replace("-", "−");

/** A French enumeration: « a », « a et b », « a, b et c ». */
export const list = (items: readonly string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`;

/** The members of a list, each once, in order of first appearance. */
export const distinct = <T>(items: readonly T[]): T[] => [...new Set(items)];

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
      provenance: "dérivée de la fiche, non confirmée",
      source:
        "arithmétique sur l'allongement de la fiche (2,5 % de 50 à 150 kg), pas une donnée Courant ; la page produit dit 3,5 % (§13.2)",
    },
    {
      name: "tension de pose",
      value: "1 400 N à l'ancrage A, à vide",
      provenance: "scénario",
      source:
        "valeur empruntée à l'essai du 2026-11-01 sur cette corde, pose 1,52 → 1,40 kN (`docs/mesures dynamometre/README.md`) ; relevée sur 435 m et transposée ici à 150 m : pas une mesure de cette installation",
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
 * differences between two models do not depend on that choice — and, being parallel to A–B, it
 * makes every garde that height less the gabarit and the flèche: the report says where a garde
 * only mirrors a flèche, and whether the gabarit does clear the ground.
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
export function riderForce(line: LineCase): Vec3 {
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

/** One direction a wind is prescribed from, whatever its speed. */
export type WindDirection = {
  readonly id: string;
  /** How the report names it, e.g. « de travers »; the angle is printed beside it. */
  readonly name: string;
  /** Degrees clockwise from the head-on direction — {@link WindCase.from}. */
  readonly from: number;
};

/** One wind of the matrix: a speed from a direction, named and labelled from the two. */
export function windCase(speed: number, direction: WindDirection): WindCase {
  return {
    id: `${direction.id}-${speed}`,
    label: `${speed} m/s ${direction.name} (${french(direction.from)}°)`,
    speed,
    from: direction.from,
    // The engine's own projection, on a line whose bearing is taken as north.
    components: windComponents(speed, direction.from, 0),
  };
}

const CALM: WindCase = {
  id: "calme",
  label: "sans vent",
  speed: 0,
  from: 0,
  components: windComponents(0, 0, 0),
};

/** The two speeds the archived notes already illustrate with; neither is a design wind. */
export const WIND_SPEEDS = [10, 20] as const;

/**
 * Four directions: across, oblique, and almost parallel from each end — the axial drag pulls
 * toward A in a head wind and toward B in a tail wind, and on an inclined line the two are not
 * mirror images.
 */
export const WIND_DIRECTIONS: readonly WindDirection[] = [
  { id: "travers", name: "de travers", from: 90 },
  { id: "oblique", name: "oblique de face", from: 45 },
  { id: "quasi-face", name: "presque de face", from: 5 },
  { id: "quasi-dos", name: "presque de dos", from: 175 },
];

/**
 * No wind, then every direction at each speed. This list is what the matrix runs and what the
 * report reads: a wind added here by hand is solved and tabulated like the others.
 */
export const WINDS: readonly WindCase[] = [
  CALM,
  ...WIND_SPEEDS.flatMap((speed) => WIND_DIRECTIONS.map((direction) => windCase(speed, direction))),
];

/** §18.4's coefficients, as the matrix is built from them. */
export type Coefficients = {
  readonly normal: number;
  readonly liftMagnitudes: readonly number[];
  readonly liftLaws: readonly LiftLaw[];
  readonly axial: readonly number[];
};

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
  /** `|C_L|` probes — **sondes de sensibilité**, run with both signs. Zero is the reference. */
  liftMagnitudes: [0.05, 0.2, 0.5],
  /** The two orientation hypotheses of §18.3. The first is the one crossed with the axial drag. */
  liftLaws: ["binormal", "yaw-odd"],
  /** `C_t` probes, on the diameter — **sondes de sensibilité**. Zero is the reference. */
  axial: [0.02, 0.1],
} as const satisfies Coefficients;

/** The four models the brief compares. */
export type ModelId = "normale" | "normale+portance" | "normale+axiale" | "normale+portance+axiale";

/** One column of the coefficient matrix. */
export type Variant = {
  readonly id: string;
  readonly model: ModelId;
  readonly aero: AeroCoefficients;
};

/** The letter a lift law takes in a variant's identifier. */
const LIFT_LAW_CODE: Readonly<Record<LiftLaw, string>> = { binormal: "b", "yaw-odd": "y" };

/** A variant's identifier — the one place its format is written. Nothing else spells one out. */
function variantId(model: ModelId, { lift, liftLaw, axial }: AeroCoefficients): string {
  const probe = `${LIFT_LAW_CODE[liftLaw]}${lift > 0 ? "+" : "-"}${Math.abs(lift)}`;
  switch (model) {
    case "normale":
      return "N";
    case "normale+portance":
      return `NL-${probe}`;
    case "normale+axiale":
      return `NA-${axial}`;
    case "normale+portance+axiale":
      return `NLA-${probe}-${axial}`;
  }
}

/** Whether a variant is the reference every other is compared with: normal drag alone. */
export const isReference = (variant: Variant): boolean => variant.model === "normale";

/**
 * The coefficient matrix, reference first:
 *
 * 1. normal drag alone;
 * 2. normal + lift — every law, every magnitude, both signs;
 * 3. normal + axial drag — every magnitude;
 * 4. normal + lift + axial — the first law crossed with the axial probes. A second law is not
 *    crossed again: it is an orientation probe, and the matrix stays finite.
 *
 * @throws Error on probes the four models cannot be built from — an empty list, a probe that is
 *   not a positive number (zero is the reference, the signs are the matrix's), or one given
 *   twice. A broken matrix, not a result.
 */
export function variantsOf(coefficients: Coefficients): Variant[] {
  const { normal, liftMagnitudes, liftLaws, axial } = coefficients;
  for (const [name, probes] of [
    ["liftMagnitudes", liftMagnitudes],
    ["axial", axial],
  ] as const) {
    const sound = probes.length > 0 && probes.every((probe) => probe > 0 && Number.isFinite(probe));
    if (!sound || distinct(probes).length !== probes.length) {
      throw new Error(`COEFFICIENTS.${name}: at least one probe, each positive, none twice`);
    }
  }
  if (liftLaws.length === 0 || distinct(liftLaws).length !== liftLaws.length) {
    throw new Error("COEFFICIENTS.liftLaws: at least one law, none twice");
  }

  const lifts = liftMagnitudes.flatMap((magnitude) => [magnitude, -magnitude]);
  const variant = (model: ModelId, aero: AeroCoefficients): Variant => ({
    id: variantId(model, aero),
    model,
    aero,
  });
  const [crossed] = liftLaws;
  return [
    variant("normale", { normal, lift: 0, liftLaw: crossed, axial: 0 }),
    ...liftLaws.flatMap((liftLaw) =>
      lifts.map((lift) => variant("normale+portance", { normal, lift, liftLaw, axial: 0 })),
    ),
    ...axial.map((Ct) =>
      variant("normale+axiale", { normal, lift: 0, liftLaw: crossed, axial: Ct }),
    ),
    ...lifts.flatMap((lift) =>
      axial.map((Ct) =>
        variant("normale+portance+axiale", { normal, lift, liftLaw: crossed, axial: Ct }),
      ),
    ),
  ];
}

export const VARIANTS: readonly Variant[] = variantsOf(COEFFICIENTS);

/** The reference every variant is compared with: normal drag alone. */
export const REFERENCE_VARIANT = VARIANTS[0];

/**
 * The largest probe of each added force, taken alone: every lift law with both signs, then the
 * axial drag. What a table that cannot hold every variant shows.
 */
export function largestProbes(variants: readonly Variant[]): Variant[] {
  const lifted = variants.filter(({ model }) => model === "normale+portance");
  const dragged = variants.filter(({ model }) => model === "normale+axiale");
  const lift = Math.max(...lifted.map(({ aero }) => Math.abs(aero.lift)));
  const axial = Math.max(...dragged.map(({ aero }) => aero.axial));
  return [
    ...lifted.filter(({ aero }) => Math.abs(aero.lift) === lift),
    ...dragged.filter(({ aero }) => aero.axial === axial),
  ];
}

/**
 * The coefficients' own provenance lines, for the report — read off the variants that ran, each
 * value once and in the order it first appears, so that an adjusted matrix is stated as it was
 * run. The zero of a probe is the reference's.
 */
export function coefficientSources(variants: readonly Variant[]): Sourced[] {
  const values = (pick: (aero: AeroCoefficients) => number, sign = ""): string =>
    distinct(variants.map(({ aero }) => pick(aero)))
      .map((value) => (value === 0 ? "0" : `${sign}${french(value)}`))
      .join(" ; ");
  return [
    {
      name: "C_D⊥",
      value: values(({ normal }) => normal),
      provenance: "publiée non transférable",
      source:
        "ordre de grandeur du cylindre lisse sous-critique et d'autres câbles toronnés (`production-aerodynamics-followup.md` §4) ; convention adoptée par #127 (Q35), pas une mesure de 6×19 ni de corde sèche",
    },
    {
      name: "C_L",
      value: values(({ lift }) => Math.abs(lift), "±"),
      provenance: "sonde de sensibilité",
      source: "choisie pour explorer la réponse ; aucune mesure transférable (§18.4)",
    },
    {
      name: "C_t",
      value: values(({ axial }) => axial),
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
}

/**
 * The installation the lines were put in, for the report — the geometries, the load states and
 * the winds are the ones that ran; the ground, the gabarit and the rider are this file's, the
 * rider stated only where a load state carries one.
 */
export function scenarioSources(ran: {
  readonly geometries: readonly GeometryCase[];
  readonly loads: readonly LoadState[];
  readonly winds: readonly WindCase[];
}): Sourced[] {
  const { geometries, loads, winds } = ran;
  const directions = distinct(
    winds.filter(({ speed }) => speed > 0).map(({ from }) => `${french(from)}°`),
  );
  const rider: Sourced = {
    name: "passager",
    value: `${RIDER.mass} kg, immobile, tenu au chariot au milieu de la longueur non tendue`,
    provenance: "scénario",
    source: "masse de premier lancement, non confirmée (§8.1) ; poids seul, aucune prise au vent",
  };
  return [
    {
      name: "portée",
      value: `${list(distinct(geometries.map(({ L }) => french(L))))} m`,
      provenance: "scénario",
      source: "ligne de premier lancement de l'application",
    },
    {
      name: "dénivelé",
      value: distinct(geometries.map(({ h }) => `${french(h)} m`)).join(" ; "),
      provenance: "scénario",
      source: "ancrages de niveau, puis dénivelé de la ligne de premier lancement",
    },
    {
      name: "sol",
      value: `droit entre les pieds des ancrages, ${GROUND.anchorHeight} m sous chacun, extrudé latéralement`,
      provenance: "scénario",
      source:
        "hauteur de scénario, choisie pour dégager le gabarit : le rapport dit, à l'état des matrices, si elle y parvient ; extrusion Q16, pas un relevé hors axe",
    },
    {
      name: "gabarit",
      value: `${french(GROUND.gabarit)} m`,
      provenance: "convention",
      source: "§6.3, gabarit vertical entier de l'application, retranché en entier",
    },
    ...(loads.some((load) => load.rider) ? [rider] : []),
    {
      name: "vent",
      value: `uniforme et horizontal ; ${list(distinct(winds.map(({ speed }) => french(speed))))} m/s${
        directions.length === 0 ? "" : ` ; de ${list(directions)}`
      }`,
      provenance: "scénario",
      source: "vitesses d'illustration des notes archivées, pas des vents de calcul",
    },
  ];
}

/** One base case: a line on a geometry in a load state under a wind. */
export type BaseCase = {
  readonly id: string;
  readonly line: LineCase;
  readonly geometry: GeometryCase;
  readonly load: LoadState;
  readonly wind: WindCase;
};

/** One base case, named after its four axes — the one place its identifier is written. */
export function baseCase(
  line: LineCase,
  geometry: GeometryCase,
  load: LoadState,
  wind: WindCase,
): BaseCase {
  return { id: [line.id, geometry.id, load.id, wind.id].join("|"), line, geometry, load, wind };
}

/** Every base case, in the order the tables print them. */
export function baseCases(): BaseCase[] {
  return LINES.flatMap((line) =>
    GEOMETRIES.flatMap((geometry) =>
      LOAD_STATES.flatMap((load) => WINDS.map((wind) => baseCase(line, geometry, load, wind))),
    ),
  );
}
