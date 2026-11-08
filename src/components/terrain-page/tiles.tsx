/**
 * The Page Terrain's five tiles, rendered (#101) from `@/lib/terrain-page/view.ts`'s view model.
 * **Presentation only**: every value, tone and note was decided there. Statique's tile frame and
 * grid, so the two Pages' tiles read alike and the Skeleton's reserve the same heights.
 */

import type { TerrainTile, TerrainView } from "@/lib/terrain-page/view.ts";

import { TONE_CLASS } from "@/components/app/banner.tsx";
import { HelpText } from "@/components/docs/help-text.tsx";
import { OutputGrid, TileFrame } from "@/components/statique/outputs.tsx";
import { TILE_LABEL } from "@/lib/terrain-page/copy.ts";
import { TERRAIN_TILE_IDS, tileScope } from "@/lib/terrain-page/view.ts";
import { cn } from "@/lib/utils.ts";

/** A quantity is mono, as every number the engine produced; a sentence ranks below by size. */
const VALUE_CLASS: Readonly<Record<TerrainTile["kind"], string>> = {
  quantity: "font-mono text-base",
  word: "text-base font-semibold",
  absent: "text-xs",
};

export function TerrainTiles({ view }: { view: TerrainView }) {
  // A warned tension de pose spans the phone's two columns, so its Avertissement reads on a whole
  // row; the Verdict then shares the last row rather than standing alone on a fourth.
  const warned = view.tiles.some(({ id, warning }) => id === "pretension" && warning !== null);
  return (
    <OutputGrid>
      {view.tiles.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          wide={tile.id === "pretension" ? warned : tile.id === "verdict" && !warned}
        />
      ))}
    </OutputGrid>
  );
}

function Tile({ tile, wide }: { tile: TerrainTile; wide: boolean }) {
  return (
    <TileFrame
      label={tile.label}
      note={
        tile.notes.length > 0 && (
          <span className="text-muted-foreground text-xs">{tile.notes.join(" · ")}</span>
        )
      }
      scope={tile.scope}
      value={
        <span className={cn(VALUE_CLASS[tile.kind], TONE_CLASS[tile.tone])}>{tile.value}</span>
      }
      wide={wide}
    >
      {tile.warning !== null && (
        <p className="text-warning text-xs">
          ⚠ <HelpText text={tile.warning} />
        </p>
      )}
    </TileFrame>
  );
}

/** The Skeleton's tiles: each label and scope over its empty lines, the Verdict across the row. */
export function TerrainTilesSkeleton() {
  return (
    <OutputGrid>
      {TERRAIN_TILE_IDS.map((id) => (
        <TileFrame key={id} label={TILE_LABEL[id]} scope={tileScope(id)} wide={id === "verdict"} />
      ))}
    </OutputGrid>
  );
}
