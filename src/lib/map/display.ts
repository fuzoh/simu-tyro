/**
 * What the vue de dessus shows under the ligne A–B (#93): one of three Fonds de carte, and the
 * Couche pentes over it or not — and whether the Vue 3D stands in for it (#95). A **display
 * preference**: the Session keeps it, a link never does, and no number the app prints depends on it.
 */

/** The three Fonds de carte, in the order the selector lists them. */
export const FONDS = ["carte-claire", "orthophoto", "carte-nationale"] as const;

export type Fond = (typeof FONDS)[number];

/** The vue de dessus, or the Vue 3D in its place. */
export const MAP_VIEWS = ["2d", "3d"] as const;

export type MapView = (typeof MAP_VIEWS)[number];

export type MapDisplay = {
  readonly fond: Fond;
  /** The Couche pentes, over whichever Fond is shown — draped on the relief in the Vue 3D. */
  readonly pentes: boolean;
  /** The view chosen, which is the one shown whenever the Vue 3D can stand. */
  readonly view: MapView;
};

/** The carte claire, the ticket's default, no Couche pentes, and the vue de dessus. */
export const DEFAULT_MAP_DISPLAY: MapDisplay = { fond: "carte-claire", pentes: false, view: "2d" };
