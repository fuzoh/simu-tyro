/**
 * The View Strip — « v1 build spec » § 5 (*The View Strip, and its one abbreviation rule*, *The
 * peek control, not a selector*, *Position reads as `x_D` in metres*). One 44 px touch-height row:
 * two layer toggles, « ×1 vraie échelle », and the typed `x` with its `%` secondary.
 *
 * ```
 * [✓ ligne à vide]  [✓ corde A–B]          [ ×1 vraie échelle ]     x [ 74,8 ] m · 50 %
 * ```
 *
 * Why these four controls are *here* and not in the Rail: **at 390 px the Rail is not co-visible
 * with the chart** — the block collapses precisely when the Rail comes into view — so a rail-only
 * `x` puts the app's only precision input path out of sight of the thing it moves.
 *
 * - **The user-facing VE selector is dead.** Forcing ×20 at 1500 m throws the cable out of the top
 *   of the frame and collapses the terrain into a triangle: a manual selector is a loaded gun
 *   pointed at the chart's legibility. What ships is a **hold-to-peek** « ×1 vraie échelle », and
 *   it is **disabled whenever the ×1 clamp is already in force**.
 * - **Toggle under `@media (pointer: coarse)`, hold-to-peek on fine pointers**: press-and-hold on a
 *   coarse pointer collides with text selection, the context menu and scroll initiation. The query
 *   is § 5's own, the same one that widens the rider's hit radius, and it is read **at the event**
 *   rather than at render — a render-time media read is the `useMediaQuery` branch § 5 forbids.
 *   **Keyboard gets toggle semantics in both modes**, since a held gesture has no keyboard
 *   equivalent.
 * - **Below B1 the labels abbreviate rather than wrap** — 44 px out of `MIN_RAIL` is the tightest
 *   budget in the app — and each keeps its full string as `aria-label` and `title`.
 */

import { useEffect, useState } from "react";

import type { LayerToggles } from "@/lib/session/session.ts";

import { formatValue } from "@/lib/format/quantity.ts";
import { cn } from "@/lib/utils.ts";

/** One control's two labels: the full string, and what it reads below 600 px of chart column. */
function Label({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className="@max-[600px]:hidden">{full}</span>
      <span className="@min-[600px]:hidden">{short}</span>
    </>
  );
}

const CONTROL =
  "border-border text-foreground flex h-8 items-center rounded-md border px-2 whitespace-nowrap";

/**
 * § 5's peek query, read at the event and never at render. A pointer handler only ever runs on the
 * client, so there is no `defaultMatches` frame to paint and nothing for the layout to branch on.
 */
function coarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** How long § 3's clamp note stays up, ms. Long enough to read one line, short enough to be a note. */
const CLAMP_NOTE_MS = 4000;

export function ViewStrip({
  layers,
  onLayers,
  peekEnabled,
  peeking,
  onPeek,
  xD,
  L,
  onX,
}: {
  layers: LayerToggles;
  onLayers: (layers: LayerToggles) => void;
  /** False when the ×1 clamp is already in force — the control is then **disabled, not hidden**. */
  peekEnabled: boolean;
  peeking: boolean;
  onPeek: (peeking: boolean) => void;
  /** The drawn position, m — already clamped into `[0, L]` by the scene. */
  xD: number;
  L: number;
  onX: (metres: number) => void;
}) {
  return (
    <>
      <button
        aria-pressed={layers.unloadedLine}
        className={cn(CONTROL, layers.unloadedLine && "bg-accent")}
        onClick={() => onLayers({ ...layers, unloadedLine: !layers.unloadedLine })}
        title="ligne à vide"
        type="button"
      >
        <Label full="ligne à vide" short="à vide" />
      </button>

      <button
        aria-pressed={layers.chordAB}
        className={cn(CONTROL, layers.chordAB && "bg-accent")}
        onClick={() => onLayers({ ...layers, chordAB: !layers.chordAB })}
        title="corde A–B"
        type="button"
      >
        <Label full="corde A–B" short="corde" />
      </button>

      <button
        aria-label="×1 vraie échelle"
        aria-pressed={peeking}
        className={cn(CONTROL, "ml-auto", peeking && "bg-accent", !peekEnabled && "opacity-50")}
        disabled={!peekEnabled}
        // Hold on a fine pointer; a plain toggle under `(pointer: coarse)`, where a held gesture
        // has no room — and the same toggle from the keyboard, in both modes.
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onPeek(!peeking);
          }
        }}
        onLostPointerCapture={() => onPeek(false)}
        onPointerDown={(event) => {
          if (coarsePointer()) onPeek(!peeking);
          else {
            event.currentTarget.setPointerCapture(event.pointerId);
            onPeek(true);
          }
        }}
        onPointerUp={() => {
          if (!coarsePointer()) onPeek(false);
        }}
        title="×1 vraie échelle"
        type="button"
      >
        <Label full="×1 vraie échelle" short="×1" />
      </button>

      <PositionField L={L} onX={onX} xD={xD} />
    </>
  );
}

/**
 * `x [ 74,8 ] m · 50 %` — **metres from A**, because it is the only unit that matches the chart's x
 * axis and how a line is actually paced out; the percentage rides along in smaller type because
 * « 748 m » is hard to place at a glance on a 1500 m span. **`s_D` never appears**: it drifts 0,5–2 %
 * from `x_D`, and showing it only invites « pourquoi ces deux nombres diffèrent ? ».
 *
 * A typed position is **exact** — no snapping, no rewrite — so the field reads back what was typed.
 * It is `type="text" inputMode="decimal"` with `enterKeyHint="done"`, and Enter commits and blurs:
 * on iOS there is otherwise no way to dismiss the keyboard.
 *
 * **The clamp is not silent.** `x_D` clamps on all three paths — typed input, a geometry change
 * that shortens the span under a stale viewpoint, and a link arrival — and § 3 answers every one of
 * them with the same transient inline note, never a blocking error: `x` selects a *view*, and
 * refusing to draw a valid span because the viewpoint is stale is worse than moving the viewpoint.
 *
 * **The note here covers this field's own path**, because a clamp speaks where it was asked for:
 * the Scenario is clamped on the way in — by `applyField`, by the reducer's terrain actions and by
 * `scenarioFromSearch` — so a note keyed on « state holds a position outside the span » could only
 * ever fire where nothing moved. The other two paths are announced by the Rail's own
 * « Position du passager », which is where the geometry that shortened the span was typed.
 */
function PositionField({ xD, L, onX }: { xD: number; L: number; onX: (metres: number) => void }) {
  const shown = formatValue("x_D", xD);
  const [draft, setDraft] = useState<string | null>(null);
  // A nonce rather than a boolean: a second clamp while the first note is up restarts its timer.
  const [clamped, setClamped] = useState(0);

  // Transient — it is a note about a move that just happened, not a state of the field.
  useEffect(() => {
    if (clamped === 0) return;
    const timer = setTimeout(() => setClamped(0), CLAMP_NOTE_MS);
    return () => clearTimeout(timer);
  }, [clamped]);

  function commit(raw: string) {
    setDraft(null);
    const parsed = Number(raw.trim().replace(",", "."));
    // An unreadable entry is not a clamp: the field reverts to the last value and says nothing.
    if (!Number.isFinite(parsed)) return;
    if (parsed < 0 || parsed > L) setClamped((nonce) => nonce + 1);
    onX(parsed);
  }

  return (
    <label className="relative ml-3 flex items-center gap-1 whitespace-nowrap">
      {/* Mounted at all times so the live region can speak; absolute so the View Strip keeps its
          44 px, the tightest budget in the app. */}
      <span
        aria-live="polite"
        className="text-muted-foreground bg-background pointer-events-none absolute -top-5 right-0 rounded px-1"
        role="status"
      >
        {clamped === 0 ? "" : `position ramenée à la portée : 0 – ${formatValue("x_D", L)} m`}
      </span>
      <span className="text-muted-foreground">x</span>
      <input
        className="border-border h-8 w-16 rounded-md border bg-transparent px-2 text-right font-mono"
        enterKeyHint="done"
        inputMode="decimal"
        onBlur={(event) => commit(event.target.value)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          commit(event.currentTarget.value);
          event.currentTarget.blur();
        }}
        type="text"
        value={draft ?? shown}
      />
      <span className="text-muted-foreground">m</span>
      <span className="text-muted-foreground/70">· {L > 0 ? Math.round((xD / L) * 100) : 0} %</span>
    </label>
  );
}
