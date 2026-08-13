/**
 * The Chart Block — « v1 build spec » § 5, assembled: the banner slot, the profile, the clearance
 * strip, the View Strip and the five read-out cells, over **one** `SharedX` and **one** measured
 * width.
 *
 * What this file owns, and why each one is here rather than in a chart:
 *
 * - **One scale object for both SVGs.** Two independently padded scales is the defect § 5 opens on:
 *   the axes coincide only at mid-span and diverge to 8 px at each end — 34 m at a 1500 m span,
 *   precisely at the anchors, which is where the drag handles go.
 * - **Two memos, split at `x_D`.** The scenario's half — material, `L₀`, the unloaded solve, the
 *   sweep, §11 — is keyed on `sceneInputs`, which **omits `x_D`**; the rider's exact solve is keyed
 *   on `x_D` alone. That is the seam § 7 called « the memo on the solve inputs behind `useSweep` »,
 *   and the reason a context store rather than subscription granularity is enough. Keying the whole
 *   derivation on the Scenario would miss it: a drag dispatches a new Scenario on every
 *   `pointermove`, so a 1 px move landing back on the same step would re-run the sweep.
 *   The first half **arrives as a prop**: A10's output half reports the same traverse, so the memo
 *   sits once at the app root (`useSceneBase`) rather than once per consumer. Only the rider's half
 *   is this file's, which is exactly the half a drag frame recomputes.
 * - **The `null` width renders the empty bands**, i.e. the Skeleton's own content, because the
 *   observer's seed is « not measured yet » rather than a guessed 900 px.
 * - **Pointer input snaps, typed input is exact.** Both paths land on the same one action, and the
 *   snap happens here — the scene has one rider path and no idea which device moved it.
 */

import type { ReactNode } from "react";

import { useMemo, useState } from "react";

import type { ChartScene, SceneBase, SceneFrame } from "@/lib/chart/scene.ts";

import {
  BannerSlot,
  ProfileBand,
  READ_OUT_CELLS,
  ReadOutCell,
  ReadOutCells,
  StripBand,
  ViewStripSlot,
} from "@/components/app/shell.tsx";
import { useAppDispatch, useAppState } from "@/components/app/store.tsx";
import { clampToSpan, placeRider, snapToStep } from "@/lib/chart/scene.ts";
import { formatQuantity, formatValue } from "@/lib/format/quantity.ts";
import {
  CELL_WRAP_PX,
  createSharedX,
  createZScale,
  exaggeration,
  innerWidth,
  PROFILE_ASPECT,
  PROFILE_CHROME,
  profileOuterHeight,
  profilePlotHeight,
  stripOuterHeight,
  veBadgeLabel,
} from "@/lib/layout/contract.ts";
import { GATE_CONSEQUENCE } from "@/lib/rail/gates.ts";

import { Profile } from "./profile.tsx";
import { ClearanceStrip } from "./strip.tsx";
import { ViewStrip } from "./view-strip.tsx";

/**
 * § 8's own line for *l'exception géométrique*, centred in **both** empty plots — the one state
 * where there is no shared x domain, so nothing can be drawn against it and nothing can be pointed
 * at. Every other failure keeps its frame.
 */
const NO_SPAN_LINE = "Portée invalide — aucun tracé possible.";

/**
 * `Indéterminé`'s one legal glyph — *tenté, indisponible*. It is **not** the empty state and it is
 * **not** « Aucun résultat »: a later « consistency » sweep that dashes empty cells would undo
 * three decisions at once.
 */
const UNAVAILABLE = "—";

/**
 * One read-out cell's content. `note` is the one cell a Clearance Gate breach replaces with a
 * clause instead of a number — set apart typographically, because a sentence in `text-lg` mono
 * would read as a value.
 */
type ReadOutValue = { readonly label: string; readonly value: string; readonly note: boolean };

export function ChartBlock({
  banner,
  cause,
  clearance = true,
  frame,
  inert = false,
  solved,
  width,
}: {
  /**
   * § 7's banner slot, rendered by the app root — the slot's **one** occupant, or nothing. It
   * arrives as a node rather than as the occupant because `[ Copier le diagnostic ]` is built where
   * the Scenario, the derived material and the canonical link all are, and none of those is the
   * chart's business.
   */
  banner?: ReactNode;
  /**
   * § 7's cause sentence, echoed here into the five read-out cells as **one line spanning the
   * row** — never « — » per cell, which is `Indéterminé`'s glyph, and never empty frames, which
   * read as a rendering fault.
   */
  cause?: string | null;
  /**
   * May the garde au sol be shown? A Clearance Gate breach removes **the garde and its curve
   * alone** — the cable, the unloaded line, both tensions and the slope all stand, which is the
   * whole reason § 7's three gates are three. The strip keeps its axes and stays a scrub track:
   * `x` maps to rider position whether or not clearance data exists.
   */
  clearance?: boolean;
  /**
   * The input half — terrain, both anchors, the span markers, the 5 % margin. `null` **only** for
   * § 8's *exception géométrique*, and that is the one case that collapses both plots.
   */
  frame: SceneFrame | null;
  /** « Saisie en cours »: the picture **freezes** and the scrub track goes inert, pointer and typed
   * `x` alike. The Sweep on screen is stale by definition, so scrubbing would generate new stale
   * numbers rather than read the ones already there. */
  inert?: boolean;
  /** The expensive half — sweep plus the §11 pass — from the app's one `useSweep` seam. */
  solved: SceneBase | null;
  width: number | null;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [peeking, setPeeking] = useState(false);

  const { rider: riderInput } = state.scenario;

  // The cheap half — one exact §6.1-case-2 solve plus a one-step clearance reduction, ~40 µs —
  // keyed on `x_D` alone. This is the only thing a drag frame recomputes.
  const scene = useMemo<ChartScene | null>(() => {
    if (solved === null) return null;
    const rider = placeRider(solved, riderInput.xD);
    return rider === null ? null : { ...solved, rider };
  }, [solved, riderInput.xD]);

  // Not measured yet: the bands keep their heights and hold their labels, which is the Skeleton's
  // own content. Nothing about the scenario is being said here.
  if (width === null) return <EmptyBands banner={banner} />;
  // § 8's *exception géométrique*, and **only** it: no shared x domain, so both plots are empty
  // frames with no axis ticks, they carry the cause line, and pointer input is inert. The read-out
  // row carries the **cause**, not the plots' line: something was attempted and was blocked, so
  // five bare labels would render the « nothing attempted » state of a state that is not it.
  if (frame === null) {
    return <EmptyBands banner={banner} cause={NO_SPAN_LINE} cells={cause ?? null} />;
  }

  const wInner = innerWidth(width);
  const plotHeight = profilePlotHeight(wInner);
  const x = createSharedX({ width, L: frame.L, extent: frame.extent });
  // Without a solved half there is no cable to fit, so the auto-fit sees the frame's own extent —
  // the drawn ground and the two towers. Same policy, one term shorter.
  const zExtent = scene === null ? frame.zExtent : scene.zExtent;
  const ve = exaggeration({
    plotAspect: PROFILE_ASPECT,
    xSpan: x.domain[1] - x.domain[0],
    zDataSpan: zExtent.max - zExtent.min,
  });
  // The peek is a **transient** and is never persisted; ×1 is what it shows, which is also why the
  // control is disabled when the clamp already holds the drawing at ×1.
  const drawnVe = peeking ? 1 : ve.ve;
  const z = createZScale({
    plotTop: PROFILE_CHROME.badge,
    plotHeight,
    centre: (zExtent.min + zExtent.max) / 2,
    pxPerMx: x.pxPerM,
    ve: drawnVe,
  });

  const wide = width >= CELL_WRAP_PX;
  const unit = state.scenario.unit;

  /**
   * Pointer input **snaps to the sweep steps**: at 1500 m one pixel is 1,2 m. With no traverse to
   * snap to the track is still a track — § 8 only ever takes the pointer path away for the
   * geometric exception — so the position lands exactly where it was pointed at.
   */
  function scrub(metres: number) {
    if (scene === null) {
      moveRider(metres);
      return;
    }
    const snapped = snapToStep(scene.traverse, clampToSpan(metres, scene.L));
    if (snapped !== null) moveRider(snapped);
  }

  /** A typed position is exact, clamped into `[0, L]` because `x_D` selects a view. */
  function moveRider(metres: number) {
    if (frame === null || inert) return;
    dispatch({
      type: "scénario/modifié",
      patch: { rider: { ...riderInput, xD: clampToSpan(metres, frame.L) } },
    });
  }

  const rider = scene?.rider ?? null;
  const values: Record<string, ReadOutValue> | null =
    rider === null
      ? null
      : {
          "Garde min": clearance
            ? {
                label: rider.relabel
                  ? `Garde min (à x ${formatValue("extremumX", rider.worst.atX)} m)`
                  : "Garde min",
                value: formatQuantity("clearance", rider.worst.hClear),
                note: false,
              }
            : // The one cell a Clearance Gate breach takes: it says **why** rather than printing a
              // number computed from the refused anchor height, and rather than « — », which is
              // `Indéterminé`'s glyph — *tenté, indisponible* — and not this state.
              { label: "Garde min", value: GATE_CONSEQUENCE.clearance, note: true },
          "T anc. A": {
            label: "T anc. A",
            value: formatQuantity("Tstatic", rider.step.TA, unit),
            note: false,
          },
          "T anc. B": {
            label: "T anc. B",
            value: formatQuantity("Tstatic", rider.step.TB, unit),
            note: false,
          },
          Pente: {
            label: "Pente",
            value: formatQuantity("localSlope", Math.tan(rider.step.theta) * 100),
            note: false,
          },
          Flèche: {
            label: "Flèche",
            value: formatQuantity("loadedSag", rider.sagAtRider),
            note: false,
          },
        };

  return (
    <>
      <BannerSlot>{banner}</BannerSlot>
      <ProfileBand>
        <Profile
          badge={{
            // The badge describes **what is drawn**, so a peek says so in the same words the ×1
            // clamp uses — and never « ×1,0 », which would read as a measurement of a rule.
            label: peeking ? "Éch. verticale ×1 — vraie échelle" : veBadgeLabel(ve),
            emphasised: peeking || ve.state !== "auto",
          }}
          bandHeight={profileOuterHeight(wInner)}
          clearance={clearance}
          frame={frame}
          layers={state.layers}
          onScrub={scrub}
          plot={{ top: PROFILE_CHROME.badge, height: plotHeight }}
          scene={scene}
          wide={wide}
          x={x}
          z={z}
        />
      </ProfileBand>
      <StripBand>
        <ClearanceStrip
          clearance={clearance}
          frame={frame}
          height={stripOuterHeight(wInner)}
          onScrub={scrub}
          scene={scene}
          wide={wide}
          x={x}
        />
      </StripBand>
      <ViewStripSlot>
        <ViewStrip
          L={frame.L}
          layers={state.layers}
          onLayers={(layers) => dispatch({ type: "calques/basculés", layers })}
          onPeek={setPeeking}
          onX={moveRider}
          peekEnabled={ve.peekEnabled}
          peeking={peeking}
          xD={rider === null ? clampToSpan(riderInput.xD, frame.L) : rider.step.xD}
        />
      </ViewStripSlot>
      <ReadOutCells scope={{ full: "à la position du passager", short: "à la position" }}>
        {READ_OUT_CELLS.map((cell) => (
          <ReadOutCell
            className={cell.narrow}
            key={cell.label}
            label={values === null ? cell.label : values[cell.label].label}
          >
            {values !== null &&
              (values[cell.label].note ? (
                <span className="text-muted-foreground text-xs">{values[cell.label].value}</span>
              ) : (
                <span className="font-mono text-lg">{values[cell.label].value}</span>
              ))}
            {/* **The one place « — » is legal**: the traverse solved, the rider sits in one of
                `Indéterminé`'s gaps, and the exact §6.1-case-2 solve a typed `x` gets — which may
                succeed where the swept step failed — failed too. *Attempted and unavailable*,
                exactly what the glyph was minted for. With no solved half nothing was attempted,
                and the cause line replaces the row instead. */}
            {values === null && solved !== null && (
              <span className="text-muted-foreground font-mono text-lg">{UNAVAILABLE}</span>
            )}
          </ReadOutCell>
        ))}
        {/* § 7's first echo. **One line spanning the row**, keeping the row's height so nothing
            jumps — not « — » per cell, which is `Indéterminé`'s glyph, and not an empty frame,
            which reads as a rendering fault. */}
        {values === null && solved === null && cause !== undefined && cause !== null && (
          <p className="text-muted-foreground absolute inset-0 flex items-center px-3 text-xs">
            {cause}
          </p>
        )}
      </ReadOutCells>
    </>
  );
}

/**
 * The bands with their heights and their labels, and **no value and no « — »** — § 8's rule. Two
 * occupants: the pre-measurement frame, which says nothing, and § 8's geometric exception, which
 * says why both plots are empty.
 */
function EmptyBands({
  banner,
  cause,
  cells = null,
}: {
  banner?: ReactNode;
  cause?: string;
  /**
   * § 7's cause sentence for the read-out row. `null` for the pre-measurement frame, where nothing
   * was attempted and five bare labels are the correct rendering; a **sentence** under the
   * geometric exception, where something was attempted and blocked.
   */
  cells?: string | null;
}) {
  const line =
    cause === undefined ? undefined : (
      <p className="text-muted-foreground flex h-full items-center justify-center px-3 text-center text-xs">
        {cause}
      </p>
    );
  return (
    <>
      <BannerSlot>{banner}</BannerSlot>
      <ProfileBand plot={line} />
      {line === undefined ? (
        <StripBand />
      ) : (
        <StripBand>
          <div className="border-border mx-[var(--gutter)] h-full rounded-sm border">{line}</div>
        </StripBand>
      )}
      <ViewStripSlot />
      <ReadOutCells>
        {READ_OUT_CELLS.map((cell) => (
          <ReadOutCell className={cell.narrow} key={cell.label} label={cell.label} />
        ))}
        {cells !== null && (
          <p className="text-muted-foreground absolute inset-0 flex items-center px-3 text-xs">
            {cells}
          </p>
        )}
      </ReadOutCells>
    </>
  );
}
