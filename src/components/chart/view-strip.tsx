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
 *   it is **disabled whenever the ×1 clamp is already in force** — *except* where amendment F's
 *   plot cap is what cut the cable out of that ×1 frame, where it reads « voir tout le câble » and
 *   shows the whole cable instead (the user's **decision 4**; voir `peekMode` in
 *   `@/lib/layout/contract.ts`).
 * - **Toggle under `@media (pointer: coarse)`, hold-to-peek on fine pointers**: press-and-hold on a
 *   coarse pointer collides with text selection, the context menu and scroll initiation. The query
 *   is § 5's own, the same one that widens the rider's hit radius, and it is read **at the event**
 *   rather than at render — a render-time media read is the `useMediaQuery` branch § 5 forbids.
 *   **Keyboard gets toggle semantics in both modes**, since a held gesture has no keyboard
 *   equivalent.
 * - **Below B1 the labels abbreviate rather than wrap** — 44 px out of `MIN_RAIL` is the tightest
 *   budget in the app — and each keeps its full string as `aria-label` and `title`.
 * - **The row's controls are 32 px of visual inside a 44 px hit target**, and a press here never
 *   moves the caret. Both are § 5 read literally rather than widened; voir `CONTROL` and
 *   `keepCaret` below, and amendment H.
 */

import { useEffect, useState } from "react";

import type { PeekMode } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { formatValue } from "@/lib/format/quantity.ts";
import { keepCaret } from "@/lib/layout/collapse.ts";
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

/**
 * § 5 states « the row is 44 px tall, **so** every control in it is a legal touch target ». That is
 * an inference, and the shipped controls did not support it: `h-8` is 32 px on **every** pointer
 * type (the app's one `@media (pointer: coarse)` rule is the rider's stroke width, nothing here).
 * The visual stays 32 px — growing it to 44 leaves the row no padding — and the **hit box** is what
 * reaches 44, through the same trick § 5 already uses for the rider's transparent stroke: an empty
 * `::after` bled 6 px past each edge, which the 44 px row absorbs exactly. It overlays the button's
 * own content, which costs a button nothing; the `x` field is *not* done this way, because an
 * overlay there would swallow the click that places the caret.
 */
const CONTROL =
  "border-border text-foreground relative flex h-8 items-center rounded-md border px-2 whitespace-nowrap after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']";

/**
 * § 5's peek query, read at the event and never at render. A pointer handler only ever runs on the
 * client, so there is no `defaultMatches` frame to paint and nothing for the layout to branch on.
 */
function coarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** How long § 3's clamp note stays up, ms. Long enough to read one line, short enough to be a note. */
const CLAMP_NOTE_MS = 4000;

/**
 * The peek control's two labels, per mode — § 5's « ×1 vraie échelle », and the **decision 4** hold
 * that puts a box-clipped cable back inside the frame. The label names *what pressing it does*, so
 * the mode that no longer shows ×1 no longer says ×1; the disabled control keeps § 5's own words,
 * because that is the row the spec's table describes.
 */
const PEEK_LABEL: Record<PeekMode, { full: string; short: string }> = {
  off: { full: "×1 vraie échelle", short: "×1" },
  "true-scale": { full: "×1 vraie échelle", short: "×1" },
  fit: { full: "voir tout le câble", short: "tout" },
};

export function ViewStrip({
  layers,
  onLayers,
  peek,
  peeking,
  onPeek,
  onPositionFocus,
  xD,
  L,
  onX,
}: {
  layers: LayerToggles;
  onLayers: (layers: LayerToggles) => void;
  /**
   * What a hold shows. `"off"` where the ×1 clamp is already in force and there is nothing to reveal
   * — the control is then **disabled, not hidden** — and `"fit"` where amendment F's cap is what cut
   * the cable out of a ×1 frame, which is the one case the user's **decision 4** hands back to it.
   */
  peek: PeekMode;
  peeking: boolean;
  onPeek: (peeking: boolean) => void;
  /**
   * § 5's `pinned + x`: while this row's own `x` holds the caret, the Pinned Safety Header keeps the
   * row. Focusing it is **not** a collapse trigger — the field is inside the Chart Block, so it
   * would be collapsing itself away — it only refuses to let a collapse the Rail caused take the
   * row out from under the caret.
   */
  onPositionFocus: (focused: boolean) => void;
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
        onMouseDown={keepCaret}
        title="ligne à vide"
        type="button"
      >
        <Label full="ligne à vide" short="à vide" />
      </button>

      <button
        aria-pressed={layers.chordAB}
        className={cn(CONTROL, layers.chordAB && "bg-accent")}
        onClick={() => onLayers({ ...layers, chordAB: !layers.chordAB })}
        onMouseDown={keepCaret}
        title="corde A–B"
        type="button"
      >
        <Label full="corde A–B" short="corde" />
      </button>

      <button
        aria-label={PEEK_LABEL[peek].full}
        aria-pressed={peeking}
        // `min-w-11` is § 5's own abbreviation arithmetic, restored: the row budgets
        // `59 + 48 + 44 + 128 + 24 = 303`, and the **44** in it is this control abbreviated to
        // « ×1 ». It shipped at 29,8 px, so the width was a spec figure missed while the height was
        // a spec inference unmet. The 14,2 px come out of the row's 53,6 px of `ml-auto` slack.
        className={cn(
          CONTROL,
          "ml-auto min-w-11 justify-center",
          peeking && "bg-accent",
          peek === "off" && "opacity-50",
        )}
        disabled={peek === "off"}
        // Hold on a fine pointer; a plain toggle under `(pointer: coarse)`, where a held gesture
        // has no room — and the same toggle from the keyboard, in both modes.
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onPeek(!peeking);
          }
        }}
        // Guarded like `onPointerUp` beside it, and for the same reason. This exists to end a
        // **hold** whose pointer was taken away mid-gesture, which is a fine-pointer story: the
        // coarse branch takes no capture. But a touch pointer gets *implicit* capture, so this fired
        // on every tap — `pointerdown` toggled the peek on and `lostpointercapture` forced it back
        // off before the frame, and § 5's « toggle under `(pointer: coarse)` » could never stick.
        onLostPointerCapture={() => {
          if (!coarsePointer()) onPeek(false);
        }}
        onMouseDown={keepCaret}
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
        title={PEEK_LABEL[peek].full}
        type="button"
      >
        <Label full={PEEK_LABEL[peek].full} short={PEEK_LABEL[peek].short} />
      </button>

      <PositionField L={L} onFocusChange={onPositionFocus} onX={onX} xD={xD} />
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
function PositionField({
  xD,
  L,
  onX,
  onFocusChange,
}: {
  xD: number;
  L: number;
  onX: (metres: number) => void;
  onFocusChange: (focused: boolean) => void;
}) {
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
    <label
      // `self-stretch` is this control's half of the 44 px hit target: the label is transparent, so
      // filling the row's height costs nothing visually — the field keeps its 32 px box — and
      // activating a label focuses the control it labels. **Not** the `::after` the buttons use: an
      // overlay here would swallow the click that places the caret inside the field.
      className="relative ml-3 flex items-center gap-1 self-stretch whitespace-nowrap"
      // **Before the blur, not after the focus.** Coming from the Rail's own « Position du
      // passager » the block is in `pinned + x`; a tap here fires this, then the Rail field's
      // `blur`, then this field's `focus` — and without the first the state would fall back to
      // `pinned` in between, unmounting the strip out from under the tap on its way to it.
      onPointerDown={() => onFocusChange(true)}
    >
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
        onBlur={(event) => {
          onFocusChange(false);
          commit(event.target.value);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => onFocusChange(true)}
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
