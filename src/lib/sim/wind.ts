/**
 * The wind seen from the line — decision of #6 (*Effets du vent*) and the research « Modèles de
 * vitesse du passager » (#8), whose rule is that wind enters `F_drag = ½·ρ·C_dA·(v ± v_wind)²`
 * (`docs/simulation-theory.md` §12.2) as a **vector projected on the tangent**, never as a whole
 * collinear `±`. This module does the projection and nothing else: the drag is the ride's
 * (`./dynamics.ts`, #89), and the line's lateral deflection has no source yet.
 *
 * Both angles are geographic, in degrees clockwise from north: the wind's is the azimuth it comes
 * **from** (0° a north wind, 270° a west wind), the line's is the bearing of the travel A → B. The
 * engine takes the bearing as a number and never a Position, so it stays free of the earth: the
 * caller reads the bearing off the Positions, and without one there is no wind to project.
 */

/** Metres per second in one kilometre per hour: 1 000 m / 3 600 s, exactly. */
const MS_PER_KMH = 1 / 3.6;

/** The wind as velocity components in the frame of the line, m/s. */
export type WindComponents = {
  /** Along A → B: positive blows toward B, so a tail wind. */
  readonly along: number;
  /** Across the line, positive toward the left of the travel, so a wind from the right. */
  readonly across: number;
};

/** km/h → m/s. */
export function kmhToMs(kmh: number): number {
  return kmh * MS_PER_KMH;
}

/** m/s → km/h. */
export function msToKmh(ms: number): number {
  return ms / MS_PER_KMH;
}

/**
 * The cardinal directions are exact on purpose: `Math.cos(Math.PI / 2)` is 6e-17, and a wind from
 * the side must have no component along the line, not a rounding residue.
 */
const CARDINAL: Readonly<Record<number, readonly [cos: number, sin: number]>> = {
  0: [1, 0],
  90: [0, 1],
  180: [-1, 0],
  270: [0, -1],
};

/**
 * Project a wind onto the line.
 *
 * The wind comes from `from − bearing` degrees clockwise of the head-on direction, as the rider
 * sees it: 0° head wind, 90° from the right, 180° tail wind, 270° from the left.
 *
 * @param speed wind speed, m/s (≥ 0).
 * @param from the azimuth the wind comes from, degrees clockwise from north.
 * @param bearing the bearing of the travel A → B, degrees clockwise from north. Both angles are
 *   read modulo 360°, any finite value.
 */
export function windComponents(speed: number, from: number, bearing: number): WindComponents {
  const degrees = (((from - bearing) % 360) + 360) % 360;
  const [cos, sin] = CARDINAL[degrees] ?? [
    Math.cos((degrees * Math.PI) / 180),
    Math.sin((degrees * Math.PI) / 180),
  ];
  // `+ 0` turns the `-0` that `-speed * 0` produces into `0`.
  return { along: -speed * cos + 0, across: speed * sin + 0 };
}
