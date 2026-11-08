/**
 * The Page Dynamique's layout (#92), and its Skeleton — **one tree, two occupants**: the Skeleton
 * renders this same frame with labels and empty bands, so the first live frame lands in the space it
 * reserved. The columns are Statique's (`ColumnsFrame`): the fields on the left, and on the right the
 * results, the coupe and the curve, in a column that is the layout contract's query container.
 *
 * The Skeleton's two chart frames are the live ones' bands: the profile band over the shared
 * proportions and the strip band under it, both functions of the column's width.
 */

import type { ReactNode } from "react";

import { BannerSlot, NOSCRIPT_LINE, ProfileBand, StripBand } from "@/components/app/shell.tsx";
import { GroupHeading } from "@/components/rail/controls.tsx";
import { ColumnsFrame, Region } from "@/components/statique/frame.tsx";
import { DYNAMIQUE_GROUPS, SECTION } from "@/lib/dynamique/copy.ts";

import { DynamiqueOutputSkeleton } from "./outputs.tsx";

export function DynamiqueFrame({
  busy = false,
  strip,
  fields,
  outputs,
  section,
  sectionRef,
}: {
  /** The Skeleton sets it: `aria-busy`, and no `aria-live` region, no spinner. */
  busy?: boolean;
  /** § 8's « clé ignorée » strip, full width above both columns. */
  strip?: ReactNode;
  fields: ReactNode;
  outputs: ReactNode;
  /** The two frames, or the Skeleton's bands. */
  section: ReactNode;
  /** The charts' one `ResizeObserver`, on their query container. */
  sectionRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <ColumnsFrame busy={busy} fields={fields} strip={strip}>
      <Region title={SECTION.outputs}>
        <div className="px-3">{outputs}</div>
      </Region>
      <Region title={SECTION.section}>
        {/* No horizontal padding: the gutter lives inside the two SVGs. */}
        <div className="@container min-w-0" ref={sectionRef}>
          {section}
        </div>
      </Region>
    </ColumnsFrame>
  );
}

/**
 * The Skeleton of `/dynamique` — **containers, not controls**: the groups' headings, both rides'
 * tiles' labels over their empty value and note lines, and the two frames' empty bands. No value, no
 * control, never a « — ».
 */
export function DynamiqueSkeleton() {
  return (
    <DynamiqueFrame
      busy
      fields={
        <div className="flex flex-col gap-3 px-3 py-3">
          {Object.values(DYNAMIQUE_GROUPS).map((title) => (
            <GroupHeading key={title} title={title} />
          ))}
          <noscript className="text-xs">{NOSCRIPT_LINE}</noscript>
        </div>
      }
      outputs={<DynamiqueOutputSkeleton />}
      section={
        <>
          <BannerSlot />
          <ProfileBand />
          <StripBand />
        </>
      }
    />
  );
}
