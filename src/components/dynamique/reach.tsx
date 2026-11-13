/**
 * The proposal of a height for B, rendered (#121) — from `@/lib/dynamique/reach.ts`'s view model.
 * **Presentation only**: the height, the candidate's figures, the assumptions and the refusal were
 * all decided there. Nothing here is a control: the proposal is read, and applies nothing.
 *
 * The proposed height is the one headline; under it each of the candidate's rides is three tiles —
 * the farthest point, what is left to B, the Point d'arrêt — so the three are never read as one.
 */

import type { ReachOutputs, ReachProposalOutput, ReachRideOutput } from "@/lib/dynamique/reach.ts";

import { RowTips, Tip } from "@/components/rail/controls.tsx";
import { TileFrame } from "@/components/statique/outputs.tsx";
import { ESTIMATE, REACH_COPY, SECTION } from "@/lib/dynamique/copy.ts";
import { cn } from "@/lib/utils.ts";

import { RideGrid } from "./outputs.tsx";

/**
 * @param stale the search behind `model` was posed on the Scenario before this one, and the one
 *   for this Scenario is still running: the answer is dimmed until it lands.
 */
export function ReachProposal({ model, stale = false }: { model: ReachOutputs; stale?: boolean }) {
  return (
    <div aria-busy={stale} className={cn("flex flex-col gap-2", stale && "opacity-50")}>
      {/* The target is the region title's `ⓘ` (#122); what the Scenario does now is a reading. */}
      <p className="text-muted-foreground text-xs">{model.current}</p>
      {model.refusal !== null && <p className="text-xs">{model.refusal}</p>}
      {model.proposal !== null && <Proposal proposal={model.proposal} />}
    </div>
  );
}

function Proposal({ proposal }: { proposal: ReachProposalOutput }) {
  const { headline } = proposal;
  return (
    <>
      <TileFrame
        label={REACH_COPY.height}
        note={<span className="text-muted-foreground text-xs">{proposal.note}</span>}
        value={
          <span className="text-base">
            {headline.action}
            {headline.amount !== null && <span className="font-mono"> {headline.amount}</span>}
          </span>
        }
      />
      {proposal.rides.map((ride) => (
        <section className="flex flex-col gap-1" key={ride.id}>
          <h3 className="text-foreground/70 text-xs font-semibold">{ride.label}</h3>
          <RideTiles ride={ride} />
        </section>
      ))}
    </>
  );
}

/**
 * The proposal's notes beside its region's title (#122): the target and the assumptions as one
 * `ⓘ`, each warning a ⚠ of its own. Dimmed with the answer while it is the Scenario before's.
 */
export function ReachTips({ model, stale = false }: { model: ReachOutputs; stale?: boolean }) {
  const { proposal } = model;
  return (
    <span className={cn("inline-flex items-center gap-1", stale && "opacity-50")}>
      <RowTips label={SECTION.proposal} notes={[model.target, ...(proposal?.assumptions ?? [])]}>
        {proposal?.warnings.map((warning) => (
          <Tip key={warning} label={SECTION.proposal} text={warning} tone="warning" />
        ))}
      </RowTips>
    </span>
  );
}

/** A value that is a position or a distance is a number; « arrive au bout » is a sentence. */
function valueClass(numeric: boolean): string {
  return numeric ? "font-mono text-base" : "text-base";
}

function RideTiles({ ride }: { ride: ReachRideOutput }) {
  const estimate = <span className="text-muted-foreground text-xs">{ESTIMATE}</span>;
  return (
    <RideGrid>
      <TileFrame
        label={REACH_COPY.farthest}
        note={
          <span className="text-muted-foreground text-xs">
            {ride.share === null ? ESTIMATE : `${ride.share} · ${ESTIMATE}`}
          </span>
        }
        value={<span className={valueClass(!ride.reachesB)}>{ride.farthest}</span>}
      />
      <TileFrame
        label={REACH_COPY.remaining}
        note={estimate}
        value={<span className={valueClass(!ride.reachesB)}>{ride.remaining}</span>}
      />
      <TileFrame
        label={REACH_COPY.stop}
        note={estimate}
        value={<span className={valueClass(ride.stopsShort)}>{ride.stop}</span>}
      />
    </RideGrid>
  );
}
