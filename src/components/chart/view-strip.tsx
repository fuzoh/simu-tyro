/**
 * The View Strip — « v1 build spec » § 5 (*The View Strip, and its one abbreviation rule*, *The
 * peek control, not a selector*, *Position reads as `x_D` in metres*). One 44 px touch-height row:
 * four layer toggles, « ×1 vraie échelle », and the typed `x` with its `%` secondary.
 *
 * ```
 * [╌ ligne à vide] [⁄ corde A–B] [⋯ trajectoire] [↕ distances]   [ ×1 vraie échelle ]   x [ 74,8 ] m · 50 %
 * ```
 *
 * Why these controls are *here* and not in the Rail: **at 390 px the Rail is not co-visible with the
 * chart** — the block collapses precisely when the Rail comes into view — so a rail-only `x` puts
 * the app's only precision input path out of sight of the thing it moves.
 *
 * - **Every control is a toggle, and says so** (2026-09-23). A pressed toggle is **filled**, a
 *   released one is an outline in muted ink: the registry's pressed state is `bg-muted`, which is
 *   also its *hover*, so « what is drawn right now » could not be read off the row. Each layer
 *   toggle carries a **swatch of its own stroke** — dash, chord, dots, dimension — so the row doubles
 *   as the profile's legend.
 * - **The user-facing VE selector is dead.** Forcing ×20 at 1500 m throws the cable out of the top
 *   of the frame and collapses the terrain into a triangle: a manual selector is a loaded gun
 *   pointed at the chart's legibility. What ships is a **toggle** « ×1 vraie échelle » — a press
 *   switches the drawing to true scale, the next press switches it back — and it is **disabled
 *   whenever the ×1 clamp is already in force** — *except* where amendment F's plot cap is what cut
 *   the cable out of that ×1 frame, where it reads « voir tout le câble » and shows the whole cable
 *   instead (the user's **decision 4**; voir `peekMode` in `@/lib/layout/contract.ts`). § 5 had it
 *   as a hold-to-peek on fine pointers; the user asked for a plain toggle on 2026-09-23, so the
 *   drawing now stays at ×1 until it is switched back, on every pointer and from the keyboard alike.
 * - **The labels shorten as the chart column narrows, rather than wrap**: full from 768 px, short
 *   from B1, and the swatch alone below it — 44 px out of `MIN_RAIL` is the tightest budget in the
 *   app. Each control keeps its full string as `aria-label` and `title`.
 * - **The row's controls are 28 px of visual inside a 44 px hit target**, and a press here never
 *   moves the caret. Both are § 5 read literally rather than widened; voir `.touch-44` in
 *   `src/styles.css`, `keepCaret` below, and amendment H.
 */

import { useState } from "react";

import type { ClampEvent } from "@/components/rail/controls.tsx";
import type { PeekMode } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { ClampNote } from "@/components/rail/controls.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import { LAYER_LABEL, PEEK_LABEL } from "@/lib/chart/copy.ts";
import { formatValue } from "@/lib/format/quantity.ts";
import { keepCaret } from "@/lib/layout/collapse.ts";
import { riderPositionEntry } from "@/lib/rail/fields.ts";
import { cn } from "@/lib/utils.ts";

/**
 * One control's label at the three widths of chart column: **full** from 768 px, **short** from B1,
 * and — for a layer toggle, whose swatch already names it — **nothing** below B1.
 *
 * **624 is `CELL_WRAP_PX`**, and it is B1 by *intent*, not by coincidence of literals: the strip
 * abbreviates « at the same B1 threshold — no new breakpoint » (§ 5), which is the same constant the
 * banner's budget steps at. A Tailwind arbitrary container query cannot read the TypeScript
 * constant, so the literal is duplicated here and in `shell.tsx`; `contract.ts`'s `CELL_WRAP_PX` is
 * the source of truth and both move with it. **768 is this row's own**, the width its full labels
 * need — voir the budget on {@link ViewStrip}.
 */
function Abbr({
  full,
  short,
  narrow,
}: {
  full: string;
  short: string;
  /** What shows below B1: the short form, or nothing when a swatch carries the name. */
  narrow: "short" | "none";
}) {
  return (
    <>
      <span className="@max-[768px]:hidden">{full}</span>
      <span className={cn("@min-[768px]:hidden", narrow === "none" && "@max-[624px]:hidden")}>
        {short}
      </span>
    </>
  );
}

/**
 * The pressed state, **filled**: a toggle that is on is the one dark box in the row. The registry's
 * `aria-pressed:bg-muted` is the same tint as its `hover:bg-muted`, so on and hovered-off read alike,
 * and the user's ask was precisely to see what is displayed. Kept at these call sites rather than
 * re-tuned in `ui/toggle.tsx`, because the Rail's segmented `ToggleGroup` is a radio choice, not a
 * layer switch, and keeps the registry's look.
 */
const PRESSED =
  "text-muted-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground/85";

/** The layer toggles, in the row's order: § 5's two, then the two of 2026-09-23. */
const LAYERS = [
  "unloadedLine",
  "chordAB",
  "trajectory",
  "riderTip",
] as const satisfies readonly (keyof LayerToggles)[];

/**
 * A layer's swatch — **its own stroke, drawn small**: the dash of « ligne à vide », the straight dash
 * of « corde A–B », the dots of « trajectoire », and a dimension line for « distances ». `currentColor`,
 * so it inverts with the pressed fill.
 */
function Swatch({ layer }: { layer: keyof LayerToggles }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      viewBox="0 0 16 16"
    >
      {layer === "unloadedLine" && <path d="M1 4 Q8 16 15 4" strokeDasharray="3 2" />}
      {layer === "chordAB" && <path d="M1 3 L15 13" strokeDasharray="2.5 2" />}
      {layer === "trajectory" && (
        <path d="M1 3 Q8 17 15 5" strokeDasharray="0 3" strokeLinecap="round" strokeWidth={1.75} />
      )}
      {layer === "riderTip" && <path d="M8 3 V13 M5 3 H11 M5 13 H11" />}
    </svg>
  );
}

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
 * **The width budget, re-derived for four layers** (2026-09-23). § 5 abbreviates below B1 and
 * sums the abbreviated row against the 342 px of inner width a 390 px viewport leaves:
 *
 * ```
 * 59 + 48 + 44 + 128 + 24       = 303   2 labelled toggles, 32 px box, 11 px label   (shipped)
 * 67 + 55 + 44 + 153 + 20       = 339   2 labelled toggles, 28 px box, 12 px label   (migrated)
 * 4 × 28 + 12 + 44 + 153 + 16   = 337   4 swatch-only toggles, 28 × 28              (below B1)
 * ```
 *
 * Four labelled toggles cannot fit there — « à vide · corde · trajet · dist. » alone is ≈ 300 px —
 * so **below B1 a layer toggle is its swatch**, a 28 px square (`px-0 w-7`), named by its
 * `aria-label` and `title`. From B1 the short labels come back beside the swatch — ≈ 300 + 44 + 153
 * + 16 ≈ 513 against 576 — and from **768 px of column** the full ones, ≈ 400 + 110 + 153 + 16 ≈ 680
 * against 720. That 768 is this row's own threshold and nothing else's. **Measured** (Chromium,
 * 2026-09-23), the space left between the toggle group and « ×1 » beyond the row's `gap-2`: 9 px
 * at a 390 px column, 65 at 624, 26 at 768.
 *
 * - **the `x` field, 153.** Its input is **locked at 16 px** (§ 7.1 / amendment G decision 5: iOS
 *   Safari auto-zooms below it), and « 1500,0 » at 16 px against amendment L's 0,62 em advance is
 *   `6 × 16 × 0,62 + 20 + 2 ≈ 82`, so the box is `w-21` (84).
 * - **the gaps.** The layer toggles are one `ToggleGroup` at § 6's in-row `gap-1`, and the row itself
 *   is `gap-2`.
 *
 * « ×1 » keeps its `min-w-11`: that 44 is § 5's own figure for the abbreviated peek control, and its
 * content (≈ 35 px at 12 px) does not reach it. § 5's character-count arithmetic over-states — the
 * shipped row computed 327 that way and **measured 288,33** (ticket 29).
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
   * What the toggle shows. `"off"` where the ×1 clamp is already in force and there is nothing to reveal
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
  /** Absent on the Page Terrain (#101): the position is read there, never typed. */
  onX?: (metres: number) => void;
}) {
  return (
    <>
      {/* The layer toggles are a genuine multi-select segmented control, so they are one
          `ToggleGroup` rather than separate `aria-pressed` buttons that happen to sit side by side —
          `multiple`, because the layers are independent. `gap-1` is § 6's in-row gap over the
          registry's `spacing={2}`, decided at the call site as ticket 40 asks rather than re-tuned a
          third time in `ui/`. */}
      <ToggleGroup
        className="gap-1"
        multiple
        onValueChange={(pressed) =>
          onLayers({
            unloadedLine: pressed.includes("unloadedLine"),
            chordAB: pressed.includes("chordAB"),
            trajectory: pressed.includes("trajectory"),
            riderTip: pressed.includes("riderTip"),
          })
        }
        value={LAYERS.filter((layer) => layers[layer])}
      >
        {LAYERS.map((layer) => (
          <ToggleGroupItem
            aria-label={LAYER_LABEL[layer].full}
            // Below B1 the swatch *is* the control: a 28 px square, the row's one height both ways.
            className={cn("touch-44 @max-[624px]:w-7 @max-[624px]:px-0", PRESSED)}
            key={layer}
            onMouseDown={keepCaret}
            size="sm"
            title={LAYER_LABEL[layer].full}
            value={layer}
            variant="outline"
          >
            <Swatch layer={layer} />
            <Abbr full={LAYER_LABEL[layer].full} narrow="none" short={LAYER_LABEL[layer].short} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Toggle
        aria-label={PEEK_LABEL[peek].full}
        // `min-w-11` is § 5's own abbreviation arithmetic: the **44** in the row's width budget is
        // this control abbreviated to « ×1 ». It shipped at 29,8 px, so the width was a spec figure
        // missed while the height was a spec inference unmet. `size="sm"` does not reach it either
        // (≈ 35 px at 12 px of « ×1 » plus `px-2.5`), so the floor stays.
        className={cn("touch-44 ml-auto min-w-11", PRESSED)}
        disabled={peek === "off"}
        onMouseDown={keepCaret}
        // A plain toggle on every pointer and from the keyboard — the user's call of 2026-09-23,
        // replacing § 5's hold-to-peek. The flag lives in the Chart Block, which also ends it
        // whenever the mode goes `"off"` under it.
        onPressedChange={(pressed) => onPeek(pressed)}
        pressed={peeking}
        size="sm"
        title={PEEK_LABEL[peek].full}
        variant="outline"
      >
        <Abbr full={PEEK_LABEL[peek].full} narrow="short" short={PEEK_LABEL[peek].short} />
      </Toggle>

      {onX === undefined ? (
        <PositionReading L={L} xD={xD} />
      ) : (
        <PositionField L={L} onFocusChange={onPositionFocus} onX={onX} xD={xD} />
      )}
    </>
  );
}

/** The position as {@link PositionField} prints it, with no field: `x 74,8 m · 50 %`. */
function PositionReading({ xD, L }: { xD: number; L: number }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className="text-muted-foreground">x</span>
      <span className="font-mono text-base">{formatValue("x_D", xD)}</span>
      <span className="text-muted-foreground">m</span>
      <Share L={L} xD={xD} />
    </span>
  );
}

/** The position's share of the span, the secondary both forms of it carry. */
function Share({ xD, L }: { xD: number; L: number }) {
  // The unit and the separator are prose and stay sans; the percentage is a computed quantity
  // and is mono, like every other number the engine produced.
  return (
    <span className="text-muted-foreground/70">
      · <span className="font-mono">{L > 0 ? Math.round((xD / L) * 100) : 0}</span> %
    </span>
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
 * `searchToScenario` — so a note keyed on « state holds a position outside the span » could only
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
  const [clamped, setClamped] = useState<ClampEvent>({ L: 0, nonce: 0 });

  function commit(raw: string) {
    setDraft(null);
    const entry = riderPositionEntry(raw, L);
    // An unreadable entry is not a clamp: the field reverts to the last value and says nothing.
    if (entry === null) return;
    if (entry.clamped) setClamped((previous) => ({ L, nonce: previous.nonce + 1 }));
    onX(entry.xD);
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
      <ClampNote
        className="text-muted-foreground bg-background pointer-events-none absolute -top-5 right-0 px-2.5"
        event={clamped}
      />
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
      <Share L={L} xD={xD} />
    </Label>
  );
}
