/**
 * The Page Terrain's layout (#101), and its Skeleton — **one tree, two occupants**, as on every app
 * Page: the Skeleton renders this same frame with labels and empty bands, so the first live frame
 * lands in the space it reserved.
 *
 * Read on a phone during the installation, so the five tiles stay **in view at the bottom** of the
 * viewport, and the visualisation above them is the one scroller: the vue de dessus, then the coupe
 * edge to edge in a column that is its query container, so every band is the same function of its
 * width as on Statique.
 */

import type { ReactNode } from "react";

import { LAYOUT_VARS, NOSCRIPT_LINE } from "@/components/app/shell.tsx";
import { CoupeBands } from "@/components/statique/frame.tsx";
import { MapOverCoupe, TopViewFrame } from "@/components/statique/top-view.tsx";
import { SECTION } from "@/lib/terrain-page/copy.ts";

import { TerrainTilesSkeleton } from "./tiles.tsx";

export function TerrainFrame({
  busy = false,
  strip,
  visualisation,
  tiles,
}: {
  /** The Skeleton sets it: `aria-busy`, and no `aria-live` region, no spinner. */
  busy?: boolean;
  /** § 8's « clé ignorée » strip, full width above the visualisation. */
  strip?: ReactNode;
  visualisation: ReactNode;
  tiles: ReactNode;
}) {
  return (
    <div
      aria-busy={busy || undefined}
      className="bg-background text-foreground flex h-full flex-col overflow-hidden"
      style={LAYOUT_VARS}
    >
      {strip}
      <div className="border-border mx-auto flex min-h-0 w-full max-w-[1728px] flex-1 flex-col min-[1730px]:border-x">
        <section aria-label={SECTION.visualisation} className="min-h-0 flex-1 overflow-y-auto py-3">
          {visualisation}
        </section>
        <section
          aria-label={SECTION.tiles}
          className="border-border @container shrink-0 border-t px-3 py-2"
        >
          {tiles}
        </section>
      </div>
    </div>
  );
}

/** The coupe's box: the Chart Block's query container, and its one `ResizeObserver`. */
export function CoupeBox({
  ref,
  children,
}: {
  ref?: (node: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <div className="@container min-w-0" ref={ref}>
      {children}
    </div>
  );
}

/**
 * The Skeleton of `/terrain` — **containers, not controls**: the vue de dessus's frame — its control
 * row, the map's box and its caption's lines, all empty — the coupe's empty bands with the terrain
 * cells' labels, and the five tiles' labels and scopes over their empty lines. No value, no
 * control, never a « — ».
 */
export function TerrainSkeleton() {
  return (
    <TerrainFrame
      busy
      tiles={<TerrainTilesSkeleton />}
      visualisation={
        <>
          <MapOverCoupe
            coupe={
              <CoupeBox>
                <CoupeBands />
              </CoupeBox>
            }
            map={<TopViewFrame />}
          />
          <noscript className="px-3 text-xs">{NOSCRIPT_LINE}</noscript>
        </>
      }
    />
  );
}
