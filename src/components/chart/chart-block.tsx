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
 * - **The collapse is not branched here.** § 5's Pinned Safety Header is the *same* tree with bands
 *   dropped in CSS below B2 (`data-collapse` on the shell, the `pinned` variant in `styles.css`), so
 *   this file contributes exactly two things to it: the chevron that asks for the profile back, and
 *   the View Strip's own focus, which is what stops the strip collapsing itself away.
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
  RevealProfile,
  StripBand,
  ViewStripSlot,
} from "@/components/app/shell.tsx";
import { useAppDispatch, useAppState } from "@/components/app/store.tsx";
import { clampToSpan, placeRider, snapToStep } from "@/lib/chart/scene.ts";
import { formatQuantity, formatValue, roundToDisplay } from "@/lib/format/quantity.ts";
import {
  CELL_WRAP_PX,
  createSharedX,
  createZScale,
  exaggeration,
  innerWidth,
  peekBadgeLabel,
  plotAspect,
  PROFILE_CHROME,
  profileOuterHeight,
  profilePlotHeight,
  stripOuterHeight,
  veBadgeLabel,
} from "@/lib/layout/contract.ts";
import { GATE_CONSEQUENCE } from "@/lib/rail/gates.ts";
import { applyField } from "@/lib/rail/values.ts";
import { snapStation } from "@/lib/terrain/trace.ts";
import { cn } from "@/lib/utils.ts";

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
  onPositionFocus,
  onReveal,
  revealGrantable = true,
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
  /**
   * The View Strip's `x` taking or losing the caret — § 5's `pinned + x`. It is **not** a collapse
   * trigger: the field lives inside the block, so collapsing on it would be the field collapsing
   * itself away. It holds the strip open through a collapse the Rail caused.
   */
  onPositionFocus: (focused: boolean) => void;
  /** « Afficher le profil » — the pinned header's one control. */
  onReveal: () => void;
  /**
   * May the policy **grant** that request here? `false` under § 5's two height constraints, where
   * the chevron would otherwise be a press that changes nothing — voir `revealGrantable` in
   * `@/lib/layout/collapse.ts` and `RevealProfile`. It is a derived boolean like `inert`, not a
   * viewport: no dimension in this file comes from it.
   */
  revealGrantable?: boolean;
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

  // **The two empty-band paths end the transient too**, and for the same reason the `"off"` band
  // does below: they return *before* `ve` exists, so the reset keyed on the mode cannot run, and the
  // View Strip — the control and its `aria-pressed` — is not rendered at all. A flag that outlives a
  // window in which its own control does not exist comes back armed with nothing to have pressed it:
  // measured at 2560 × 1440 on `?L=200&h=-40&za=12&zb=12&fl=6`, `Space`, then `L` = 0 (« Portée
  // invalide — aucun tracé possible »), then `L` = 200 → « ×0,7 — sous la vraie échelle · câble
  // entier », `aria-pressed="true"`, `activeElement` still the `L` field. Below true scale, unbidden,
  // which is the direction § 5 calls worse than exaggeration « because it reads safe ».
  if (peeking && (width === null || frame === null)) setPeeking(false);
  // Not measured yet: the bands keep their heights and hold their labels, which is the Skeleton's
  // own content. Nothing about the scenario is being said here.
  if (width === null) {
    return <EmptyBands banner={banner} onReveal={onReveal} revealGrantable={revealGrantable} />;
  }
  // § 8's *exception géométrique*, and **only** it: no shared x domain, so both plots are empty
  // frames with no axis ticks, they carry the cause line, and pointer input is inert. The read-out
  // row carries the **cause**, not the plots' line: something was attempted and was blocked, so
  // five bare labels would render the « nothing attempted » state of a state that is not it.
  if (frame === null) {
    return (
      <EmptyBands
        banner={banner}
        cause={NO_SPAN_LINE}
        cells={cause ?? null}
        onReveal={onReveal}
        revealGrantable={revealGrantable}
      />
    );
  }

  const wInner = innerWidth(width);
  const plotHeight = profilePlotHeight(wInner);
  const x = createSharedX({ width, L: frame.L, extent: frame.extent });
  // Without a solved half there is no cable to fit, so the auto-fit sees the frame's own extent —
  // the drawn ground and the two towers. Same policy, one term shorter.
  const zExtent = scene === null ? frame.zExtent : scene.zExtent;
  const ve = exaggeration({
    // **The obtained aspect, not the target.** They are the same number up to § 5's reference chart
    // column and diverge above it, where amendment F freezes the plot's height: feeding 0,42 into a
    // capped box would build a z scale taller than the box it draws in, so the cable would leave the
    // frame while the badge went on claiming an auto-fit. `plotAspect` is the same `min` the band's
    // own height is, so the drawing and the badge cannot disagree.
    plotAspect: plotAspect(wInner),
    xSpan: x.domain[1] - x.domain[0],
    zDataSpan: zExtent.max - zExtent.min,
  });
  // The peek is **never persisted** — no Session key, no URL key, gone on reload — but it is *not*
  // only a hold: § 5 gives the control **toggle** semantics from the keyboard in **both** pointer
  // modes and under `(pointer: coarse)`, so on those paths the drawing stands until the next press.
  // What it shows is `ve.peek`: ×1 out of an auto-fit — § 5's own peek, and why the control is
  // disabled when the clamp already holds the drawing at ×1 — or, where amendment F's cap is what cut
  // the cable out of a ×1 frame, the auto-fit that fits the whole cable back into it (the user's
  // **decision 4**). Nothing else in the app draws below ×1, and the badge names it in every case.
  //
  // **A hold is only in force while the mode still has something to show, and it *ends* there.** A
  // resize or a new scenario can take the mode to `"off"` under a held control — which also disables
  // it, so the release event may never arrive. Two things are owed at that moment, and they are not
  // the same thing:
  //
  // 1. **The badge must not lie during the off window.** `held` is derived rather than read, so a
  //    standing flag cannot print « sous la vraie échelle » over a ×1 drawing.
  // 2. **The flag must not survive the off window.** Masking alone left the toggle paths — the
  //    keyboard, in *both* pointer modes, and a coarse-pointer tap — latched *through* `"off"` and
  //    re-arming on the way back: measured at 2560 × 1440 on `?L=200&h=-40&za=12&zb=12&fl=6`, `Space`
  //    then a width excursion to 2000 and back restored « ×0,7 — sous la vraie échelle » with nothing
  //    focused and nobody pressing. An unbidden *compression* in a clearance tool is the direction
  //    § 5 calls worse than exaggeration, « because it reads safe ». `onLostPointerCapture` covers
  //    the fine-pointer hold and only it, so the release the toggle paths never send is this one.
  //
  // Adjusted during render — React's own « state derived from new props » path — rather than in an
  // effect: no extra commit, and the re-render lands before anything is painted. **This reset is one
  // of two**; the other stands above the empty-band returns, which never reach `ve` at all.
  if (peeking && ve.peek === "off") setPeeking(false);
  const held = peeking && ve.peek !== "off";
  const drawnVe = held ? (ve.peek === "fit" ? ve.autofit : 1) : ve.ve;
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
   *
   * **A scrub is a prefill, so it writes the *displayed* value** — § 8's *round earlier*. The rule
   * names the tightness switch and « Recalculer » as the inputs that are not typed; a drag is the
   * third, and it was writing the underlying float: the field read « 44,3 » while the URL carried
   * `x=44.28985507246377`, so two links to the same visible position differed. `roundToDisplay` is
   * the same primitive every other prefill uses, and it goes **after** the snap so that what state
   * holds is what the strip prints. At 1500 m the correction is under 0,05 m — a twenty-fourth of a
   * pixel — so the snap keeps its whole purpose.
   *
   * The **typed** path is untouched and must stay that way: a typed position is exact, and
   * `PositionField` says so.
   */
  function scrub(metres: number) {
    if (scene === null) {
      moveRider(roundToDisplay("x_D", metres));
      return;
    }
    const snapped = snapToStep(scene.traverse, clampToSpan(metres, scene.L));
    if (snapped !== null) moveRider(roundToDisplay("x_D", snapped));
  }

  /**
   * § 4's two Station handles. **The snap is the pointer path's whole rule** — `snapStation` takes
   * the file's own nearest sample and clamps to the trace, so a drag cannot reach « Station hors du
   * tracé » while a typed station still blocks. The metres arrive in the span frame, so `s_A` is what
   * turns them into a station: at `x = 0` the pointer is on anchor A, whatever the file numbers it.
   *
   * `applyField` is the write, rather than a geometry patch built here, because it is the one path
   * that brings `x_D`'s clamp along with a new span — « no route into a new span can forget it ».
   */
  function dragStation(anchor: "A" | "B", metres: number) {
    const { geometry } = state.scenario;
    if (inert || geometry.source !== "trace" || state.trace === null) return;
    const next = applyField(
      state.scenario,
      anchor === "A" ? "sa" : "sb",
      snapStation(state.trace, geometry.sa + metres),
    );
    // Two keys rather than the whole draft: the store's shallow merge is what keeps `sceneInputs`
    // stable for everything this drag does not touch.
    dispatch({
      type: "scénario/modifié",
      patch: { geometry: next.geometry, rider: next.rider },
    });
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
  /**
   * Does § 7's cause line **occupy** the row? With no solved half nothing was attempted, so the five
   * cells are replaced by the one line — which means their labels go with their values. Where a
   * traverse *did* solve (`solved !== null`) the row keeps its labels and reads « — » per cell:
   * `Indéterminé`'s glyph, a different state, and not this one.
   */
  const replaced = rider === null && solved === null && cause !== undefined && cause !== null;
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
            // clamp uses — and never « ×1,0 », which would read as a measurement of a rule. The
            // `"fit"` peek is the one drawing below true scale, and `peekBadgeLabel` is where it says
            // so rather than borrowing the ×1 row's words.
            label: held ? peekBadgeLabel(ve) : veBadgeLabel(ve),
            emphasised: held || ve.state !== "auto",
          }}
          bandHeight={profileOuterHeight(wInner)}
          clearance={clearance}
          frame={frame}
          layers={state.layers}
          onScrub={scrub}
          // Manual mode passes nothing, and that **is** § 5's « bracket, non-interactive »: with no
          // trace to snap to there is no station to place, and the same two rectangles stay inert.
          onStation={
            state.scenario.geometry.source === "trace" && state.trace !== null
              ? dragStation
              : undefined
          }
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
          onPositionFocus={onPositionFocus}
          onX={moveRider}
          peek={ve.peek}
          peeking={held}
          xD={rider === null ? clampToSpan(riderInput.xD, frame.L) : rider.step.xD}
        />
      </ViewStripSlot>
      <ReadOutCells scope={{ full: "à la position du passager", short: "à la position" }}>
        {READ_OUT_CELLS.map((cell) => (
          <ReadOutCell
            className={cn(cell.narrow, cell.pinned)}
            key={cell.label}
            // No label under the cause line: the row is **replaced** by it, and the box stays only
            // to hold the row's height — voir `ReadOutCell`'s own `label`.
            label={replaced ? undefined : values === null ? cell.label : values[cell.label].label}
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
            which reads as a rendering fault. The five boxes above are label-less while it stands, so
            the line *replaces* the cells instead of painting over them (ticket 31, **D2**). */}
        {replaced && (
          <p className="text-muted-foreground compact:hidden absolute inset-0 flex items-center px-3 text-xs">
            {cause}
          </p>
        )}
        <RevealProfile grantable={revealGrantable} onClick={onReveal} />
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
  onReveal,
  revealGrantable = true,
}: {
  banner?: ReactNode;
  cause?: string;
  /**
   * The pinned header's chevron. It is here too, because both of these states can be reached
   * *while* the block is pinned — a link with an invalid span arrives on a phone — and a collapse
   * with no way back is a collapse the user cannot undo.
   */
  onReveal: () => void;
  /** Whether that way back can be *granted* — the same flag, for the same reason. */
  revealGrantable?: boolean;
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
          <ReadOutCell
            className={cn(cell.narrow, cell.pinned)}
            key={cell.label}
            // The pre-measurement frame keeps its five labels — nothing was attempted, and that *is*
            // the Skeleton's own content. Under the geometric exception the cause line occupies the
            // row instead, so the labels go with it (ticket 31, **D2**).
            label={cells === null ? cell.label : undefined}
          />
        ))}
        {cells !== null && (
          <p className="text-muted-foreground compact:hidden absolute inset-0 flex items-center px-3 text-xs">
            {cells}
          </p>
        )}
        <RevealProfile grantable={revealGrantable} onClick={onReveal} />
      </ReadOutCells>
    </>
  );
}
