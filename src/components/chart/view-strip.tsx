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
 * - **The row's controls are 28 px of visual inside a 44 px hit target**, and a press here never
 *   moves the caret. Both are § 5 read literally rather than widened; voir `.touch-44` in
 *   `src/styles.css`, `keepCaret` below, and amendment H.
 */

import { useEffect, useState } from "react";

import type { PeekMode } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { formatValue } from "@/lib/format/quantity.ts";
import { keepCaret } from "@/lib/layout/collapse.ts";
import { cn } from "@/lib/utils.ts";

/**
 * One control's two labels: the full string, and what it reads below B1 of chart column.
 *
 * **624 is `CELL_WRAP_PX`**, and it is B1 by *intent*, not by coincidence of literals: the strip
 * abbreviates « at the same B1 threshold — no new breakpoint » (§ 5), which is the same constant the
 * read-out cells wrap at. It moved 600 → 624 with [amendment
 * L](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) — the app ships no mono face, so
 * the five header cells are budgeted at a 0,62 em advance instead of 0,60. A Tailwind arbitrary
 * container query cannot read the TypeScript constant, so the literal is duplicated here and in
 * `shell.tsx`; `contract.ts`'s `CELL_WRAP_PX` is the source of truth and both move with it.
 */
function Abbr({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className="@max-[624px]:hidden">{full}</span>
      <span className="@min-[624px]:hidden">{short}</span>
    </>
  );
}

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

/** The two layer toggles' values, in § 5's order. A `LayerToggles` key, so the map below is total. */
const LAYERS = ["unloadedLine", "chordAB"] as const satisfies readonly (keyof LayerToggles)[];

/**
 * § 5 states « the row is 44 px tall, **so** every control in it is a legal touch target ». That is
 * an inference, and the shipped controls never supported it: the box was 32 px on **every** pointer
 * type (the app's one `@media (pointer: coarse)` rule is the rider's stroke width, nothing here).
 * The visual stays smaller than the row — growing it to 44 leaves the row no padding — and the
 * **hit box** is what reaches 44, through `.touch-44`, the one utility that carries § 5's own
 * transparent-stroke trick. The `x` field is *not* done that way: an overlay there would swallow
 * the click that places the caret, so its `<Label>` stretches instead.
 *
 * **The visual box is now 28 px, not 32** — `size="sm"`, the app's one control height — so the
 * overlay bleeds 8 px past each edge rather than 6. The **row is unchanged**: `VIEW_STRIP` is still
 * 44 and `.touch-44` still lands inside it exactly.
 *
 * **The width budget, re-derived.** § 5 abbreviates below B1 and sums the abbreviated row against
 * the 342 px of inner width a 390 px viewport leaves:
 *
 * ```
 * 59 + 48 + 44 + 128 + 24 = 303   32 px box ·  8 px inline · 11 px label · 64 px field  (shipped)
 * 67 + 55 + 44 + 153 + 20 = 339   28 px box · 10 px inline · 12 px label · 84 px field  (migrated)
 * ```
 *
 * Three of the five terms moved, and none of them silently:
 *
 * - **the two toggles, 59 → 67 and 48 → 55.** The registry's inline padding is 2 px wider a side,
 *   and 11 px → 12 px of label is +9 % on the glyphs — the two arbitrary sizes leave the DOM, and
 *   12 px is the one body size.
 * - **the `x` field, 128 → 153.** Its input is **locked at 16 px** (§ 7.1 / amendment G decision 5:
 *   iOS Safari auto-zooms below it), and a 64 px box sized for 11 px cannot hold « 1500,0 » at 16.
 *   At the 0,62 em advance amendment L budgets for an unbound `monospace`,
 *   `6 × 16 × 0,62 + 20 + 2 ≈ 82`, so the box is `w-21` (84). The rest of the group scales with the
 *   type, its three `gap-1`s do not.
 * - **the gaps, 24 → 20.** The toggle pair is one `ToggleGroup` at § 6's in-row `gap-1` (4 px, was
 *   12), and the row itself steps down to `gap-2`; the field's old `ml-3` goes — one spacing
 *   mechanism between two controls, not two.
 *
 * « ×1 » keeps its `min-w-11`: that 44 is § 5's own figure for the abbreviated peek control, and its
 * content (≈ 35 px at 12 px) does not reach it. 339 is inside 342 on § 5's own character-count
 * arithmetic, which over-states — the shipped row computed 327 that way and **measured 288,33**
 * (ticket 29) — so the real slack is wider than the 3 px printed here.
 */
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
      {/* The two layer toggles are a genuine multi-select segmented control, so they are one
          `ToggleGroup` rather than two `aria-pressed` buttons that happen to sit side by side —
          `multiple`, because the two layers are independent. `gap-1` is § 6's in-row gap over the
          registry's `spacing={2}`, decided at the call site as ticket 40 asks rather than re-tuned a
          third time in `ui/`. */}
      <ToggleGroup
        className="gap-1"
        multiple
        onValueChange={(pressed) =>
          onLayers({
            unloadedLine: pressed.includes("unloadedLine"),
            chordAB: pressed.includes("chordAB"),
          })
        }
        value={LAYERS.filter((layer) => layers[layer])}
      >
        <ToggleGroupItem
          className="touch-44"
          onMouseDown={keepCaret}
          size="sm"
          title="ligne à vide"
          value="unloadedLine"
          variant="outline"
        >
          <Abbr full="ligne à vide" short="à vide" />
        </ToggleGroupItem>

        <ToggleGroupItem
          className="touch-44"
          onMouseDown={keepCaret}
          size="sm"
          title="corde A–B"
          value="chordAB"
          variant="outline"
        >
          <Abbr full="corde A–B" short="corde" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Button
        aria-label={PEEK_LABEL[peek].full}
        aria-pressed={peeking}
        // **A `Button` and not a `Toggle`**: a `Toggle` owns `click` → `onPressedChange`, and this
        // control's whole point is that a fine pointer *holds* it — `pointerdown` / `pointerup`
        // with capture — while a coarse one toggles it. `aria-pressed` says what it is; the press
        // semantics stay § 5's.
        //
        // `min-w-11` is § 5's own abbreviation arithmetic: the **44** in the row's width budget is
        // this control abbreviated to « ×1 ». It shipped at 29,8 px, so the width was a spec figure
        // missed while the height was a spec inference unmet. `size="sm"` does not reach it either
        // (≈ 35 px at 12 px of « ×1 » plus `px-2.5`), so the floor stays.
        className={cn("touch-44 ml-auto min-w-11", peeking && "bg-muted")}
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
        size="sm"
        title={PEEK_LABEL[peek].full}
        variant="outline"
      >
        <Abbr full={PEEK_LABEL[peek].full} short={PEEK_LABEL[peek].short} />
      </Button>

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
    <Label
      // `self-stretch` is this control's half of the 44 px hit target: the label is transparent, so
      // filling the row's height costs nothing visually — the field keeps its 28 px box — and
      // activating a label focuses the control it labels. **Not** the `.touch-44` overlay the
      // buttons carry: an overlay here would swallow the click that places the caret inside the
      // field.
      //
      // `gap-1` over the registry's `gap-2` — § 6's in-row gap — and no `ml-3`: the row's own
      // `gap-2` already separates this group from « ×1 », and two spacing mechanisms between the
      // same two controls is the defect § 6 names.
      className="relative flex items-center gap-1 self-stretch whitespace-nowrap"
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
        className="text-muted-foreground bg-background pointer-events-none absolute -top-5 right-0 px-2.5"
        role="status"
      >
        {clamped === 0 ? "" : `position ramenée à la portée : 0 – ${formatValue("x_D", L)} m`}
      </span>
      <span className="text-muted-foreground">x</span>
      <Input
        // **16 px, locked** — § 7.1 and amendment G decision 5: below it iOS Safari auto-zooms the
        // viewport on focus. `ui/input.tsx` bases at `text-xs` and no longer carries the
        // `md:text-xs` duplicate, so this override wins at every width rather than at phone widths
        // only. `w-21` is what « 1500,0 » needs at 16 px against amendment L's 0,62 em advance —
        // voir the row's width budget above.
        className="w-21 text-right font-mono text-base"
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
      {/* The unit and the separator are prose and stay sans; the percentage is a computed quantity
          and is mono, like every other number the engine produced. */}
      <span className="text-muted-foreground/70">
        · <span className="font-mono">{L > 0 ? Math.round((xD / L) * 100) : 0}</span> %
      </span>
    </Label>
  );
}
