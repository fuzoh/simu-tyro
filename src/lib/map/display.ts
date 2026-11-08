/**
 * What the vue de dessus shows under the ligne A–B (#93): one of three Fonds de carte, and the
 * Couche pentes over it or not. A **display preference**: the Session keeps it, a link never does,
 * and no number the app prints depends on it.
 */

/** The three Fonds de carte, in the order the selector lists them. */
export const FONDS = ["carte-claire", "orthophoto", "carte-nationale"] as const;

export type Fond = (typeof FONDS)[number];

export type MapDisplay = {
  readonly fond: Fond;
  /** The Couche pentes, over whichever Fond is shown. */
  readonly pentes: boolean;
};

/** The carte claire, the ticket's default, and no Couche pentes. */
export const DEFAULT_MAP_DISPLAY: MapDisplay = { fond: "carte-claire", pentes: false };
