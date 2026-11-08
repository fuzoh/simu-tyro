/**
 * The Page Statique's layout (#91), and its Skeleton — **one tree, two occupants**, as the Avancé
 * shell is: the Skeleton renders this same frame with labels and empty bands, so the first live
 * frame lands in the space it reserved.
 *
 * Its own layout, not the Rail's. Below `md` it is **one scroller**: the outputs, the coupe and the
 * vue de dessus first — what a rigger on site came to read — then the fields. From `md` the fields
 * are a column on the left and the rest a column on the right, each its own scroller. The coupe is
 * the Chart Block itself, in a column that is its query container and carries the layout contract's
 * custom properties, so every band is the same function of its width as on Avancé. There is no
 * collapse here: the block is never squeezed beside a keyboard, it scrolls with the Page.
 */

import type { ReactNode } from "react";

import {
  BannerSlot,
  LAYOUT_VARS,
  NOSCRIPT_LINE,
  ProfileBand,
  READ_OUT_CELLS,
  ReadOutCell,
  ReadOutCells,
  StripBand,
  ViewStripSlot,
} from "@/components/app/shell.tsx";
import { GroupHeading } from "@/components/rail/controls.tsx";
import { cellLabel, cellsOf } from "@/lib/rail/cells.ts";
import { OUTPUT_LABEL, SECTION, STATIQUE_GROUPS } from "@/lib/statique/copy.ts";
import { scopeOf, STATIQUE_OUTPUT_IDS } from "@/lib/statique/outputs.ts";

import { OutputGrid, TileFrame } from "./outputs.tsx";
import { TopViewFrame } from "./top-view.tsx";

export function StatiqueFrame({
  busy = false,
  strip,
  fields,
  outputs,
  section,
  sectionRef,
  topView,
}: {
  /** The Skeleton sets it: `aria-busy`, and no `aria-live` region, no spinner. */
  busy?: boolean;
  /** § 8's « clé ignorée » strip, full width above both columns. */
  strip?: ReactNode;
  fields: ReactNode;
  outputs: ReactNode;
  /** The Chart Block, or the Skeleton's bands. */
  section: ReactNode;
  /** The Chart Block's one `ResizeObserver`, on its query container. */
  sectionRef?: (node: HTMLElement | null) => void;
  topView: ReactNode;
}) {
  return (
    <ColumnsFrame busy={busy} fields={fields} strip={strip}>
      <Region title={SECTION.outputs}>
        <div className="px-3">{outputs}</div>
      </Region>
      <Region title={SECTION.section}>
        {/* No horizontal padding: the gutter lives inside the two SVGs, as on Avancé. */}
        <div className="@container min-w-0" ref={sectionRef}>
          {section}
        </div>
      </Region>
      <Region title={SECTION.topView}>
        <div className="px-3">{topView}</div>
      </Region>
    </ColumnsFrame>
  );
}

/**
 * The layout the simplified Pages share: the fields in a column on the left, the Page's regions in
 * a column on the right, one scroller below `md`. The right column is the query container the layout
 * contract's bands are functions of, so every Page standing a chart in it draws the same bands.
 */
export function ColumnsFrame({
  busy = false,
  strip,
  fields,
  children,
}: {
  busy?: boolean;
  strip?: ReactNode;
  fields: ReactNode;
  /** The right column's {@link Region}s. */
  children: ReactNode;
}) {
  return (
    <div
      aria-busy={busy || undefined}
      className="bg-background text-foreground flex h-full flex-col overflow-hidden"
      style={LAYOUT_VARS}
    >
      {strip}
      {/* `pb-[var(--kb,0px)]`: the iOS keyboard inset, so the last field scrolls clear of it — the
          same self-neutralising padding the Rail carries, on whichever box scrolls at this width. */}
      <div className="border-border mx-auto flex min-h-0 w-full max-w-[1728px] flex-1 scroll-pb-[var(--kb,0px)] flex-col overflow-y-auto pb-[var(--kb,0px)] min-[1730px]:border-x md:flex-row md:overflow-hidden md:pb-0">
        <aside
          aria-label={SECTION.fields}
          className="border-border order-last w-full min-w-0 shrink-0 border-t md:order-first md:w-80 md:scroll-pb-[var(--kb,0px)] md:overflow-y-auto md:border-t-0 md:border-r md:pb-[var(--kb,0px)]"
        >
          {fields}
        </aside>
        <div className="@container flex min-w-0 shrink-0 flex-col md:min-h-0 md:flex-1 md:shrink md:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/** One of the right column's regions: a heading, then its occupant. */
export function Region({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border flex flex-col gap-2 border-b py-3 last:border-b-0">
      <h2 className="font-heading text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The Skeleton of `/` — and the shell's, since `/` is Statique: the build's shell prerender paints
 * it into `index.html` and `404.html` (ADR-0002). **Containers, not controls**: the groups'
 * headings, the tiles' labels and scopes over their empty value and note lines, the Chart Block's
 * empty bands with the terrain cells' labels, and the vue de dessus's frame — its control row, the
 * map's box and its caption's five lines, all empty — no value, no control, never a « — ».
 */
export function StatiqueSkeleton() {
  return (
    <StatiqueFrame
      busy
      fields={
        <div className="flex flex-col gap-3 px-3 py-3">
          {Object.values(STATIQUE_GROUPS).map((title) => (
            <GroupHeading key={title} title={title} />
          ))}
          <noscript className="text-xs">{NOSCRIPT_LINE}</noscript>
        </div>
      }
      outputs={
        <OutputGrid>
          {STATIQUE_OUTPUT_IDS.map((id) => (
            <TileFrame key={id} label={OUTPUT_LABEL[id]} scope={scopeOf(id)} />
          ))}
          <TileFrame label={OUTPUT_LABEL.verdict} wide />
        </OutputGrid>
      }
      section={<CoupeBands />}
      topView={<TopViewFrame />}
    />
  );
}

/**
 * The coupe as a terrain Page's Skeleton reserves it — Statique's and Terrain's: the Chart Block's
 * empty bands, with the terrain cells' labels.
 */
export function CoupeBands() {
  return (
    <>
      <BannerSlot />
      <ProfileBand />
      <StripBand />
      <ViewStripSlot />
      <ReadOutCells>
        {cellsOf("terrain").map((id) => (
          <ReadOutCell
            className={READ_OUT_CELLS[id].basis}
            key={id}
            label={cellLabel(id, "terrain")}
          />
        ))}
      </ReadOutCells>
    </>
  );
}
