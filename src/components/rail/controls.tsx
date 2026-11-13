/**
 * The Rail's input controls — « v1 build spec » § 3 (*Numeric input — the widget is a correctness
 * question*, *The §10.4 use-class gate*, *Tightness Spec*, *Override*, *Passager*) and § 7 (*Deux
 * états par champ*, *Fix Actions*).
 *
 * Presentation only: every string these render is decided in `@/lib/rail/`, which is where the
 * `node` tests reach it. What lives here is the affordance and the two typographic classes § 7
 * splits the field states into.
 *
 * - **Every numeric field is `<input type="text" inputMode="decimal">`.** `type="number"` is
 *   rejected: its acceptance of `,` is browser- and locale-dependent and the failure is **silent**
 *   — the element reports an empty value, so a rigger who types « 6,5 » loses the field with no
 *   message. Losing the free min/max is no loss; § 3 owns the ranges and a link *requires*
 *   out-of-range values to be representable.
 * - **Two typographic classes, never one.** The empty state is neutral, lowercase and iconless; the
 *   committed-invalid state is ⛔ and blocking. Calling both « erreur » would make ordinary typing
 *   feel like a fault, which is the whole point of the split.
 * - **A prohibition is a disabled option with its reason shown**, never a hidden one: « if a
 *   defensible number exists, let the user compute and let the Verdict judge; if no number exists,
 *   disable the option and show the reason ». Hiding it leaves a user who came to compare families
 *   with no explanation.
 * - **A chip plus a popover, not a warning paragraph per field.** With the rider group, the safety
 *   régime and several material coefficients all unconfirmed, always-visible paragraphs turn the
 *   input half into warning text users learn to scroll past — which defeats the rule they
 *   implement.
 */

import type { ChangeEvent, ReactNode } from "react";

import { Info, OctagonX, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { TipTone } from "@/lib/app/tip.ts";

import { HelpText } from "@/components/docs/help-text.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { tipName, tipText } from "@/lib/app/tip.ts";
import { formatValue } from "@/lib/format/quantity.ts";
import { PICKER_COPY } from "@/lib/rail/fields.ts";
import { cn } from "@/lib/utils.ts";

/**
 * A field group's heading — the live groups' and the Skeletons', so a Skeleton reserves the height
 * the first live frame lands in.
 */
export function GroupHeading({ title, tip }: { title: string; tip?: string | null }) {
  if (tip === undefined || tip === null) {
    return <h3 className="text-foreground/70 text-xs font-semibold">{title}</h3>;
  }
  // A note about the whole group — or the whole column — behind an `ⓘ` on its heading (#122).
  return (
    <div className="flex items-center gap-1">
      <h3 className="text-foreground/70 text-xs font-semibold">{title}</h3>
      <Tip label={title} text={tip} />
    </div>
  );
}

/**
 * One labelled row of the Rail: control on the right, messages under the pair.
 *
 * The label + control pair is `ui/field.tsx`'s `Field`, re-tuned to this app's rhythm when it was
 * added (`Field` `gap-1`) and passed `orientation="horizontal"` here — vertical only for
 * {@link stacked}. **The messages sit outside the `Field`**, not inside it: a horizontal `Field` is
 * one flex row, so a message declared as its child would land *beside* the control rather than
 * under the pair. `FieldDescription` is likewise not used for them — its `last:mt-0` /
 * `nth-last-2:-mt-1` rules assume a Field-internal stack and misfire in this wrapper's
 * `flex-col gap-1`.
 */
export function Row({
  label,
  htmlFor,
  hint,
  help,
  notes = [],
  chip,
  control,
  message,
  warning,
  note,
  outlined = false,
  stacked = false,
}: {
  label: string;
  htmlFor?: string;
  /** The unit, or a short qualifier — never a sentence. */
  hint?: string;
  /** What the value is and how it is computed — `@/lib/rail/help.ts`'s copy, as an {@link InfoTip}. */
  help?: string;
  /**
   * What the row used to print under itself (#122) — the field's meaning, an ambient note, why an
   * option is disabled — joined to `help` in the one `ⓘ` beside the label.
   */
  notes?: readonly (string | null | undefined)[];
  chip?: ReactNode;
  control: ReactNode;
  /**
   * § 7's field message. ⛔ is a `⛔` icon beside the label, the message behind it; the empty state
   * — « Saisie en cours »'s field — stays in the open under the pair: it is the line that says the
   * results on screen are not this text's.
   */
  message?: { text: string; blocking: boolean };
  /** § 3's non-blocking warning, behind a `⚠` beside the label. It never withholds a number. */
  warning?: string | null;
  /**
   * Under the pair, in the open: the row's commands — Fix Actions, « Passer en mouflage » — and a
   * transient note (`x_D`'s clamp is the one place a clamp speaks).
   */
  note?: ReactNode;
  /** A second culprit of the same check: **error outline only**, no second copy of the message. */
  outlined?: boolean;
  /**
   * Label above the control rather than beside it — `Field`'s `vertical` orientation.
   *
   * It arrived as a workaround: {@link Choice} was a `<fieldset>`, and a `<fieldset>` carries a UA
   * `min-inline-size: min-content` it cannot shrink below, so a multi-option choice beside a
   * wrapping label overlapped it at the Rail's 288 px. `Choice` is a `RadioGroup` — a plain `<div>`
   * — since ticket 40, so **the constraint is gone and the layout is kept**: three option labels
   * beside a wrapping row label is still two columns too many at 288 px. The UA rule itself stays
   * worth remembering, because it is why {@link Group} is not `FieldSet`.
   */
  stacked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 py-1">
      {/* The chip gets a right-aligned line of its own, **never a slot inside the Field row** —
          the same shape `DerivedRow` gives it. Inline it sat between a `flex-1` label (basis 0)
          and a `shrink-0` control, so at the 288 px Rail a 108 px « ⚠ non confirmé » left the
          label ~16 px of box and « Masse » painted straight under the chip. */}
      {chip !== undefined && chip !== null && (
        <div className="flex items-start justify-end gap-1">{chip}</div>
      )}
      <Field orientation={stacked ? "vertical" : "horizontal"}>
        {/* The label **wraps**, never truncates: at 288 px « Hauteur d'ancrage A » and its B twin
            would clip to the same string, and a control the user cannot tell apart is worse than
            a row two lines tall. */}
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <FieldLabel
            className="text-muted-foreground min-w-0 leading-tight"
            htmlFor={htmlFor}
            title={label}
          >
            {label}
          </FieldLabel>
          <RowTips
            error={message?.blocking === true ? message.text : null}
            label={label}
            notes={[help, ...notes]}
            warning={warning}
          />
        </span>
        <div
          className={cn("flex shrink-0 items-center gap-1", outlined && "ring-destructive ring-1")}
        >
          {control}
          {hint !== undefined && (
            <span className="text-muted-foreground w-8 shrink-0 text-xs">{hint}</span>
          )}
        </div>
      </Field>
      {/* ⛔ is the icon's: its alert region announces a blocking state. The empty state is **not**
          an error and must not: « Saisie en cours » is ordinary typing, and announcing it would
          make every cleared field feel like a fault. */}
      {message !== undefined && !message.blocking && (
        <p className="text-muted-foreground text-xs">{message.text}</p>
      )}
      {note}
    </div>
  );
}

/**
 * § 3's elected widget. The value is a **string** throughout: the parse is a commit, not a read.
 *
 * **`text-base` — 16 px — is load-bearing, not a type-scale preference. Decision of 2026-08-14, by
 * the repo owner** (voir ticket 28's comments): WebKit zooms a user-scalable page *in* on focus of a
 * text field whose computed font size is **below** 16 px, and does not zoom back out on blur. These
 * fields used `text-xs` (12 px), and the viewport meta permits zoom on purpose
 * (`src/routes/__root.tsx`, no `maximum-scale`, no `user-scalable=no`), so on an older iOS Safari the
 * **first tap into any Rail field** put `visualViewport.scale ≠ 1` — which is exactly what
 * `keyboardInsetOf` (`src/components/app/use-viewport.ts`) reads as « this is a pinch, not a
 * keyboard ». § 5's keyboard piece 2 was therefore inactive for the rest of the session, on the one
 * platform the `--kb` fallback exists for. 16 px removes the *trigger* and leaves pinch-zoom to the
 * user; `maximum-scale=1` was rejected because it takes zoom away from whoever needs it to read a
 * chart.
 *
 * **The box does not grow with the text**: `h-7` is 28 px of border box, and `text-base`'s 24 px line
 * height still fits inside its 26 px content box, so no Rail row and no layout budget moves — measured
 * at 390 × 664 and 1440 × 900 (ticket 28's dated note).
 *
 * **The box is `w-24`, and the 4 px extra over amendment G's 80 px is a measured repair, not a
 * drift. Ticket 40, 2026-08-16.** The gutter used to be 4 px, and that gutter was the *width* half
 * of the 16 px decision: 16 px mono advances 9,6 px per glyph against 12 px's 7,2, so `w-20` over
 * the registry's 10 px gutter leaves **58 px of content box — six characters**. Any span ≥ 1000 m
 * under the `L₀` driver spends **seven** (« 1512,75 », « 2000,00 »), and § 5's published set has
 * three such lines: measured `scrollWidth` **87** against `clientWidth` **78**, the second decimal
 * of `L₀` sliced in half. That decimal is the one § 3's *Display precision per quantity* exists to
 * protect (« 1 déc. = 0,21 m de flèche, 0,20 m de garde, 8 % de la marge »), against a promise that
 * « the field shows exactly what state holds » — and it clipped **silently**, with no `aria-invalid`
 * and no ⛔, because `L₀`'s tier-one rule is `{ kind: "positive" }` with no upper bound
 * (`src/lib/rail/fields.ts`).
 *
 * Two repairs existed and **both were measured at the 288 px Rail** rather than argued:
 * re-instating `px-1` costs nothing but carves an exception out of § 6's padding rule, which
 * [ticket 40](../../../.scratch/zipline-simulator-v1-build/issues/40-ui-coherence-and-shadcn-density.md)'s
 * Gate greps out of `src/` outright; `w-24` keeps the rhythm and costs **2 px of total Rail height**
 * — one label (`h_rider`) wraps to a second line, 546 px of rows becoming 548. **The rhythm was
 * kept and the 2 px spent.** 96 px over a 10 px gutter is 74 px of content, 7,7 characters, so the
 * seven-character case fits with a glyph to spare. Amendment G decision 5's lock is the **16 px
 * type and the 28 px height**, both unchanged; the 80 px width it records was never the locked
 * term.
 *
 * The View Strip's « x » field is `w-21`, not this, and the difference is deliberate: it renders
 * `x_D` at one decimal — « 2000,0 », six characters — and § 5's 44 px row has 17 px of measured
 * slack, which 96 px would spend for capacity that quantity never needs.
 */
export function NumericInput({
  id,
  value,
  invalid = false,
  disabled = false,
  onChange,
  onFocus,
  onBlur,
}: {
  id: string;
  value: string;
  invalid?: boolean;
  /** Visible but not typed into: the row says why, as every disabled choice does (§ 10.1). */
  disabled?: boolean;
  onChange: (raw: string) => void;
  onFocus: () => void;
  onBlur: (raw: string) => void;
}) {
  return (
    // `text-base` is passed **at the call site and wins**: `ui/input.tsx`'s base is `text-xs`, and
    // the `md:text-xs` duplicate `base-lyra` ships — which tailwind-merge scores in a different
    // conflict group and would have re-imposed 12 px at ≥768 px — was removed when the component
    // was added. `aria-invalid` alone paints the invalid border; the registry owns that rule.
    <Input
      aria-invalid={invalid || undefined}
      className="w-24 text-right font-mono text-base"
      disabled={disabled}
      // Enter commits and blurs: on iOS there is otherwise no way to dismiss the keypad.
      enterKeyHint="done"
      id={id}
      inputMode="decimal"
      onBlur={(event: ChangeEvent<HTMLInputElement>) => onBlur(event.target.value)}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      onFocus={onFocus}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.currentTarget.blur();
      }}
      type="text"
      value={value}
    />
  );
}

/**
 * A picker. Options that exist but cannot be chosen stay **visible and disabled**.
 *
 * The *reason* is rendered by the caller, into {@link Row}'s full-width `note` slot rather than
 * beside the select: a 224 px paragraph inside the control cell of a 288 px rail leaves the label
 * column 23 px, and « Terminaison A » then paints straight over the reason it is meant to sit
 * beside. It is also **one reason per row** there, not one per disabled option — § 3 disables the
 * option and shows the rule, and the rule is the same sentence twice.
 */
export function Picker<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T | "";
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    // **`native-select`, never `select`.** Base UI's `select` is a popup and would replace the OS
    // picker on mobile — a behaviour change nobody decided. This one styles the native element.
    <NativeSelect
      className="max-w-40"
      id={id}
      onChange={(event) => onChange(event.target.value as T)}
      size="sm"
      value={value}
    >
      {value === "" && <NativeSelectOption value="">{PICKER_COPY.empty}</NativeSelectOption>}
      {options.map((option) => (
        <NativeSelectOption disabled={option.disabled} key={option.value} value={option.value}>
          {option.disabled === true ? `${option.label} — ${PICKER_COPY.unavailable}` : option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** A two-or-three-way choice rendered in full, because the options are the teaching. */
export function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean; reason?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    // `RadioGroup` ships `gap-2`, which is § 6's *between rows* gap; these are options **inside** one
    // row, so the call site says `gap-1`. Decided here rather than by a third re-tune of `ui/`.
    //
    // It also renders a `<div role="radiogroup">`, which retires the `<fieldset>` this control used
    // to be — and with it the UA `min-inline-size: min-content` that {@link Row.stacked} exists to
    // work around. `stacked` stays because label-above is still the right shape at 288 px.
    //
    // `relative`: Base UI renders each option's visually-hidden `<input>` as a `position: absolute`
    // sibling of the item. With no positioned ancestor its containing block is `<body>`, so inside a
    // scrolled Rail it is laid out at its in-flow y (≈ 1300) and stretches the *document* past
    // `100dvh` — a wheel over the nav bar then scrolls the window. The group is its own containing block.
    <RadioGroup
      className="relative gap-1"
      name={name}
      onValueChange={(next: unknown) => onChange(next as T)}
      value={value}
    >
      {options.map((option) => (
        <span className="flex items-center gap-1" key={option.value}>
          <Label className={cn("gap-1", option.disabled === true && "text-muted-foreground")}>
            <RadioGroupItem disabled={option.disabled} value={option.value} />
            <span>
              {option.label}
              {option.disabled === true && ` — ${PICKER_COPY.unavailable}`}
            </span>
          </Label>
          {/* Why it cannot be chosen, behind an `ⓘ` beside the option it explains (#122) —
              outside the `Label`, so the radio's name stays its own words. */}
          {option.disabled === true && option.reason !== undefined && option.reason !== "" && (
            <Tip label={option.label} text={option.reason} />
          )}
        </span>
      ))}
    </RadioGroup>
  );
}

/** The Tightness Spec's segmented control — it picks the **driver**, not a display. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    // `spacing={0}` is what makes a `ToggleGroup` *segmented*: the registry's own
    // `data-[spacing=0]` rules collapse the shared borders and square every corner. **A driver has
    // no empty state**, so pressing the pressed segment is ignored rather than clearing the group —
    // Base UI reports the deselect as an empty array, and there is no « aucun » tightness driver.
    <ToggleGroup
      className="w-full"
      onValueChange={(next: string[]) => {
        const [picked] = next;
        if (picked !== undefined) onChange(picked as T);
      }}
      size="sm"
      spacing={0}
      value={[value]}
      variant="outline"
    >
      {/* Content-sized, not equal: five driver labels fit the rail only if « H » gives its share
          to « Prétension » (#85). */}
      {options.map((option) => (
        <ToggleGroupItem className="flex-auto" key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * A provenance chip. **Editing an Unconfirmed Default flips the chip to « valeur utilisateur » but
 * never removes it from the aggregate list**: « no normative value exists » stays true whatever the
 * user types, and a user-supplied 100 kg is no more standards-backed than the shipped 120 kg.
 *
 * **The popover opens on hover, not on click** — decision of 2026-09-23, replacing the `<details>`
 * disclosure. Keyboard users get the same on focus: the badge is in the tab order and the popover
 * is shown under `group-focus-within`, so nothing is hover-only. Since ticket 41's simplification
 * the « non confirmé » chips live in the `Provenance` section, and a field row carries one only for
 * a preset's deduced `k` and for the câble's trolley `μ` (#104), which feeds no Verdict and so is
 * in no aggregate.
 */
export function Chip({
  label,
  detail,
  tone = "warning",
}: {
  label: string;
  /** The popover's content: the provenance and the § reference, never a second warning. */
  detail: string;
  tone?: "warning" | "neutral";
}) {
  const id = useId();
  return (
    <span className="group relative inline-block shrink-0">
      <Badge
        aria-describedby={id}
        className={cn(
          "cursor-help",
          tone === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
        )}
        tabIndex={0}
        variant="secondary"
      >
        {tone === "warning" ? "⚠ " : ""}
        {label}
      </Badge>
      <p
        className="bg-popover border-border absolute right-0 z-10 mt-1 hidden w-64 border px-3 py-2 text-xs whitespace-pre-line shadow-md group-focus-within:block group-hover:block"
        id={id}
        role="tooltip"
      >
        {/* The popover stays open while hovered — it is inside the `group` — so the § links are
            reachable by pointer, and by keyboard under `group-focus-within`. */}
        <HelpText text={detail} />
      </p>
    </span>
  );
}

/**
 * An infobulle (#122): an icon in the open, and behind it what the Page no longer prints — an
 * explanation (`ⓘ`), an Avertissement (`⚠`) or a blocking field error (`⛔`). The icon's colour is
 * its tone's, so a warning or an error is seen without opening anything; the words are one hover,
 * one keyboard focus or one tap away.
 *
 * **A popover, not a tooltip** — the change of 2026-09-23 that came with the `/docs` pages. A
 * tooltip is non-interactive by contract: it closes as the pointer leaves the trigger, so a link
 * inside it can be seen but never reached. Base UI's popover opens on hover *and* on click
 * (`openOnHover`), stays open while the pointer is over it, and is a **button** in the tab order,
 * so touch users reach the same text and the same links. **Keyboard focus opens it too** (#122):
 * Base UI's popover has no focus trigger, so a `:focus-visible` focus — the keyboard's, never a
 * click's, which would open it only for the click to toggle it shut — opens it here, without moving
 * the focus, and Tab goes on into the bubble's links before leaving it. The content is `text-xs`
 * like every other annotation; it is wider than the registry's `w-72` because a formula and its §
 * reference do not fit three lines.
 *
 * **A blocking error still announces itself.** The message used to be a `FieldError`
 * (`role="alert"`); the icon carries a visually hidden copy of it in an alert region, so a screen
 * reader hears the refusal the moment it lands, as before.
 */
export function Tip({
  tone = "help",
  label,
  text,
  children,
}: {
  tone?: TipTone;
  /** What the bubble is about — the row's label — for the icon's accessible name. */
  label: string;
  /** The bubble's words, with every `§` a link into the documentation (`HelpText`). */
  text?: string;
  /** Richer content than one string — a list, a formula. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const Icon = TIP_ICON[tone];
  return (
    <Popover onOpenChange={(next: boolean) => setOpen(next)} open={open}>
      <PopoverTrigger
        aria-label={tipName(tone, label)}
        className={cn(
          "focus-visible:ring-ring/50 inline-flex shrink-0 cursor-help items-center rounded-none focus-visible:ring-[3px] focus-visible:outline-none",
          TIP_CLASS[tone],
        )}
        closeDelay={150}
        delay={200}
        onFocus={(event) => {
          if (focusVisible(event.currentTarget)) setOpen(true);
        }}
        openOnHover
        type="button"
      >
        <Icon aria-hidden="true" className="size-3" />
      </PopoverTrigger>
      {tone === "error" && text !== undefined && (
        <span className="sr-only" role="alert">
          {text}
        </span>
      )}
      <PopoverContent
        className="w-auto max-w-sm text-left leading-snug whitespace-pre-line"
        // The focus stays on the icon: a bubble opened by Tab must not take the caret from a
        // reader who is only passing through.
        initialFocus={false}
        side="bottom"
      >
        {/* One box: the registry's popup is a flex column, which would set every segment of a
            sentence — a `§` link, the words around it — on a line of its own. */}
        <div>
          {text !== undefined && <HelpText text={text} />}
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const TIP_ICON = { help: Info, warning: TriangleAlert, error: OctagonX } as const;

const TIP_CLASS: Readonly<Record<TipTone, string>> = {
  help: "text-muted-foreground hover:text-foreground",
  warning: "text-warning",
  error: "text-destructive",
};

/** A keyboard focus, as the browser itself judges it; a browser without the selector says no. */
function focusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return false;
  }
}

/**
 * The explanation beside a label — an `ⓘ` that opens `@/lib/rail/help.ts`'s copy (decision of
 * 2026-09-23): what the value is and how it is computed, in French, as long as it needs to be.
 * {@link Tip} in its `help` tone.
 */
export function InfoTip({ label, text }: { label: string; text: string }) {
  return <Tip label={label} text={text} />;
}

/**
 * A row's infobulles, in the label's line: its explanation and notes as one `ⓘ`, then a `⚠` for its
 * Avertissement and a `⛔` for its blocking error. Nothing is drawn for what is absent.
 */
export function RowTips({
  label,
  notes = [],
  warning,
  error,
  children,
}: {
  label: string;
  /** The help, the meaning, an ambient note, a disabled option's reason — one bubble, in order. */
  notes?: readonly (string | null | undefined)[];
  warning?: string | null;
  error?: string | null;
  /** Further icons after these — a region's several warnings. */
  children?: ReactNode;
}) {
  const help = tipText(notes);
  return (
    <>
      {help !== null && <Tip label={label} text={help} />}
      {warning !== undefined && warning !== null && (
        <Tip label={label} text={warning} tone="warning" />
      )}
      {error !== undefined && error !== null && <Tip label={label} text={error} tone="error" />}
      {children}
    </>
  );
}

/** One `Valeurs déduites` row: read-only, and never editable — except a steel override. */
export function ReadOut({
  label,
  value,
  help,
  notes = [],
  chip,
  warning,
  children,
}: {
  label: string;
  /** `@/lib/rail/help.ts`'s copy for this row, as an {@link InfoTip}. */
  help?: string;
  /** What the row used to print under itself (#122), joined to `help` in the one `ⓘ`. */
  notes?: readonly (string | null | undefined)[];
  /** `null` renders nothing at all: « — » is spent on `Indéterminé` and may not be reused. */
  value: string | null;
  chip?: ReactNode;
  /**
   * § 6's **Avertissement** tier: ⚠ **in line on the row it qualifies** — the icon beside the
   * label since #122, its sentence behind it — never a paragraph block and never a promotion to
   * the banner. The ambient tier does not come through here — it is plain
   * status text with no glyph, because it fires always and an alarm that always fires is mute.
   */
  warning?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-1">
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="text-muted-foreground min-w-0 truncate text-xs" title={label}>
            {label}
          </span>
          <RowTips label={label} notes={[help, ...notes]} warning={warning} />
        </span>
        {chip}
        {/* A computed quantity: mono, and right-aligned because the label beside it is `flex-1`. */}
        {value !== null && <span className="text-right font-mono text-xs">{value}</span>}
        {children}
      </div>
    </div>
  );
}

/** A Fix Action. **Its label describes the effect of pressing it** — invariant 2's other half. */
export function FixButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} size="sm" type="button" variant="outline">
      {label}
    </Button>
  );
}

/** How long § 3's clamp note stays up, ms: one line's reading time, short enough to be a note. */
const CLAMP_NOTE_MS = 4000;

/**
 * One clamp that **happened**: the span it landed on, and a nonce so a second clamp against the
 * same span restarts the timer rather than passing unnoticed. `nonce: 0` is « none yet ».
 */
export type ClampEvent = { readonly L: number; readonly nonce: number };

/**
 * `x_D`'s clamp **is not silent**, and this is the one place a clamp speaks, for the Rail's field
 * and the View Strip's alike.
 *
 * It renders an **event**, never a state: `x_D` is clamped on the way into the Scenario, so a note
 * conditioned on « the Scenario holds a position outside the span » would be a note that can only
 * fire where no clamp happened. The caller compares what was asked for against what landed and
 * raises {@link ClampEvent}; this component only decides how long it stays up.
 */
export function ClampNote({ event, className }: { event: ClampEvent; className?: string }) {
  // The note is derived: the latest event shows until its nonce is marked expired. The effect
  // only owns the timer — it never sets state synchronously, so no cascading render.
  const [expiredNonce, setExpiredNonce] = useState(0);
  const shown = event.nonce !== 0 && event.nonce !== expiredNonce ? event : null;

  useEffect(() => {
    if (event.nonce === 0) return;
    // Transient — it is a note about a move that just happened, not a state of the field.
    const timer = setTimeout(() => setExpiredNonce(event.nonce), CLAMP_NOTE_MS);
    return () => clearTimeout(timer);
  }, [event]);

  return (
    <span aria-live="polite" className={className} role="status">
      {shown === null ? (
        ""
      ) : (
        <>
          position ramenée à la portée :{" "}
          <span className="font-mono">0 – {formatValue("x_D", shown.L)}</span> m
        </>
      )}
    </span>
  );
}
