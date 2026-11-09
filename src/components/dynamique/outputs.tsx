/**
 * The Page Dynamique's outputs, rendered (#92) — the two rides as two groups of three tiles, from
 * `@/lib/dynamique/outputs.ts`'s view model. **Presentation only**: every value was decided there,
 * off the engine's rides. Each value carries « estimation » on the line under it, and no tile has a
 * Verdict: judging the line is Statique's, Avancé's and Terrain's.
 */

import type { ReactNode } from "react";

import type { DynamiqueOutputs, RideOutput } from "@/lib/dynamique/outputs.ts";

import { GroupHeading } from "@/components/rail/controls.tsx";
import { TileFrame } from "@/components/statique/outputs.tsx";
import { OUTPUT_LABEL, RIDE_LABEL } from "@/lib/dynamique/copy.ts";
import { RIDE_IDS } from "@/lib/dynamique/outputs.ts";

/**
 * One ride's grid, shared by the live tiles and the Skeleton's labels so the first frame reserves
 * the layout the outputs land in.
 */
export function RideGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 @min-[32rem]:grid-cols-3">{children}</div>;
}

/** The note every tile carries. */
function Estimate({ ride }: { ride: RideOutput }) {
  return <span className="text-muted-foreground text-xs">{ride.estimate}</span>;
}

export function DynamiqueOutputTiles({ model }: { model: DynamiqueOutputs }) {
  return (
    <div className="flex flex-col gap-3">
      {model.rides.map((ride) => (
        <section className="flex flex-col gap-1" key={ride.id}>
          <GroupHeading title={ride.label} />
          {ride.notice !== null && <p className="text-muted-foreground text-xs">{ride.notice}</p>}
          <RideGrid>
            <StopTile ride={ride} />
            <ArrivalTile ride={ride} />
            <TileFrame
              label={ride.durationLabel}
              note={<Estimate ride={ride} />}
              value={<span className="font-mono text-base">{ride.duration}</span>}
            />
          </RideGrid>
        </section>
      ))}
      {model.coincideNote !== null && (
        <p className="text-muted-foreground text-xs">{model.coincideNote}</p>
      )}
      {model.warnings.map((warning) => (
        <p className="text-warning text-xs" key={warning}>
          ⚠ {warning}
        </p>
      ))}
      <p className="text-muted-foreground text-xs">{model.constants}</p>
    </div>
  );
}

function StopTile({ ride }: { ride: RideOutput }) {
  return (
    <TileFrame
      label={OUTPUT_LABEL.stop}
      note={<Estimate ride={ride} />}
      // An abscissa is a number; « arrive au bout » is the engine saying there is none.
      value={
        <span className={ride.stopX === null ? "text-base" : "font-mono text-base"}>
          {ride.stop}
        </span>
      }
    />
  );
}

function ArrivalTile({ ride }: { ride: RideOutput }) {
  return (
    <TileFrame
      label={OUTPUT_LABEL.arrival}
      note={<Estimate ride={ride} />}
      value={
        ride.arrival === null ? (
          <span className="text-base">{ride.noArrival}</span>
        ) : (
          <span className="font-mono text-base">
            {ride.arrival.kmh} · {ride.arrival.ms}
          </span>
        )
      }
    />
  );
}

/** The Skeleton's occupant: both rides' headings and the tiles' labels, no value, no « estimation ». */
export function DynamiqueOutputSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {RIDE_IDS.map((id) => (
        <section className="flex flex-col gap-1" key={id}>
          <GroupHeading title={RIDE_LABEL[id]} />
          <RideGrid>
            <TileFrame label={OUTPUT_LABEL.stop} />
            <TileFrame label={OUTPUT_LABEL.arrival} />
            <TileFrame label={OUTPUT_LABEL.duration} />
          </RideGrid>
        </section>
      ))}
      {/* The provenance line's height, so the coupe does not move when it lands. */}
      <p className="min-h-4 text-xs" />
    </div>
  );
}
