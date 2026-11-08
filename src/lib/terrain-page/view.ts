/**
 * The Page Terrain's view model (#101): the five tiles a rigger reads on site, during the
 * installation — the tension de pose to aim for, the flèche, the garde au sol, the vitesse
 * d'arrivée with the Vent entered, and the Verdict. **Read off the models the other Pages print
 * from**, never re-derived: Statique's outputs for four of them, which `@/lib/statique/outputs.ts`
 * reads off Avancé's own chain, and Dynamique's ride with the Vent for the fifth.
 *
 * Data shape — one {@link TerrainView}: five {@link TerrainTile}s in {@link TERRAIN_TILE_IDS}'
 * order, each a label, a value line that is a quantity, a word or why there is none, the
 * {@link Tone} it is drawn in and the lines under it. **Data only**: the Page reads the Scenario
 * and writes none of it, so the model carries no setter.
 */

import type { Tone } from "@/lib/app/tone.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type {
  StatiqueInput,
  StatiqueOutput,
  StatiqueOutputId,
  StatiqueVerdict,
} from "@/lib/statique/outputs.ts";

import { VERDICT_TONE } from "@/lib/app/tone.ts";
import { ESTIMATE, INCOMPLETE } from "@/lib/dynamique/copy.ts";
import { dynamiqueOutputs } from "@/lib/dynamique/outputs.ts";
import { scopeOf, statiqueOutputs } from "@/lib/statique/outputs.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import { ARRIVAL_SCOPE, NO_ARRIVAL, TILE_LABEL } from "./copy.ts";

/** The five tiles, in the order the Page prints them — and its Skeleton reserves them. */
export const TERRAIN_TILE_IDS = ["pretension", "sag", "clearance", "arrival", "verdict"] as const;

export type TerrainTileId = (typeof TERRAIN_TILE_IDS)[number];

export type TerrainTile = {
  readonly id: TerrainTileId;
  readonly label: string;
  /** What the value is read over, under the label — « sur toute la traversée », the Vent. */
  readonly scope: string | null;
  /** The value line. */
  readonly value: string;
  /** A number the engine produced, a word that answers in its place, or why there is none. */
  readonly kind: "quantity" | "word" | "absent";
  readonly tone: Tone;
  /** The lines under the value, read as one: where it is read, « estimation », the prohibition. */
  readonly notes: readonly string[];
  /** The limite de tension's Avertissement, without its glyph — the tension de pose's alone. */
  readonly warning: string | null;
};

export type TerrainView = { readonly tiles: readonly TerrainTile[] };

export type TerrainInput = StatiqueInput & {
  /** The two rides off the gated traverse; `null` under a cause and on an incomplete traverse. */
  readonly reading: DynamicsReading | null;
};

/** A tile's scope before there is a result to read it over — what the Skeleton reserves. */
export function tileScope(id: TerrainTileId): string | null {
  if (id === "clearance") return scopeOf("clearance");
  return id === "arrival" ? ARRIVAL_SCOPE : null;
}

export function terrainView(input: TerrainInput): TerrainView {
  const { outputs, verdict } = statiqueOutputs(input);
  const statique = (id: StatiqueOutputId & TerrainTileId) => {
    const found = outputs.find((output) => output.id === id);
    if (found === undefined) throw new Error(`Statique prints no ${id}`);
    return fromStatique(id, found);
  };
  return {
    tiles: [
      statique("pretension"),
      statique("sag"),
      statique("clearance"),
      arrivalTile(input.reading, input.scenario.material.family, input.cause),
      verdictTile(verdict),
    ],
  };
}

function fromStatique(id: TerrainTileId, output: StatiqueOutput): TerrainTile {
  const notes = output.qualifier === null ? [] : [output.qualifier];
  const tile = { id, label: TILE_LABEL[id], scope: output.scope, notes, warning: output.warning };
  if (output.value === null) {
    return { ...tile, value: output.absent ?? "", kind: "absent", tone: "muted" };
  }
  const tone: Tone = output.warning !== null ? "warning" : output.breach ? "destructive" : "plain";
  return { ...tile, value: output.value, kind: "quantity", tone };
}

/**
 * The ride with the Vent entered, as Dynamique prints it: its vitesse d'arrivée, or « n'arrive
 * pas » and where it stops instead — an estimation either way.
 */
function arrivalTile(
  reading: DynamicsReading | null,
  family: ScenarioDraft["material"]["family"],
  cause: string | null,
): TerrainTile {
  const tile = {
    id: "arrival",
    label: TILE_LABEL.arrival,
    scope: ARRIVAL_SCOPE,
    warning: null,
  } as const;
  if (reading === null || cause !== null) {
    return { ...tile, value: cause ?? INCOMPLETE, kind: "absent", tone: "muted", notes: [] };
  }
  const [, windy] = dynamiqueOutputs(reading, family).rides;
  if (windy.arrival !== null) {
    return {
      ...tile,
      value: windy.arrival.kmh,
      kind: "quantity",
      tone: "plain",
      notes: [windy.arrival.ms, ESTIMATE],
    };
  }
  const instead =
    windy.stopX === null ? windy.stop : `${label("stopPoint", "terrain")} ${windy.stop}`;
  return { ...tile, value: NO_ARRIVAL, kind: "word", tone: "plain", notes: [instead, ESTIMATE] };
}

/** The Verdict in its state's tone, the prohibition under an « Interdit »; neutral without one. */
function verdictTile(verdict: StatiqueVerdict): TerrainTile {
  const tile = { id: "verdict", label: TILE_LABEL.verdict, scope: null, warning: null } as const;
  if (verdict.kind !== "state") {
    return { ...tile, value: verdict.text, kind: "absent", tone: "muted", notes: [] };
  }
  return {
    ...tile,
    value: verdict.label,
    kind: "word",
    tone: VERDICT_TONE[verdict.state],
    notes: verdict.reason === null ? [] : [verdict.reason],
  };
}
