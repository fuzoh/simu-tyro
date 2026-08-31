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

import { useId } from "react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { cn } from "@/lib/utils.ts";

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
  chip?: ReactNode;
  control: ReactNode;
  /** § 7's field message: neutral when `kind` is empty, ⛔ otherwise. */
  message?: { text: string; blocking: boolean };
  /** § 3's non-blocking warning. It never withholds a number. */
  warning?: string | null;
  /** A transient note — `x_D`'s clamp is the one place a clamp speaks. */
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
        <FieldLabel
          className="text-muted-foreground min-w-0 flex-1 leading-tight"
          htmlFor={htmlFor}
          title={label}
        >
          {label}
        </FieldLabel>
        <div
          className={cn("flex shrink-0 items-center gap-1", outlined && "ring-destructive ring-1")}
        >
          {control}
          {hint !== undefined && (
            <span className="text-muted-foreground w-8 shrink-0 text-xs">{hint}</span>
          )}
        </div>
      </Field>
      {message !== undefined &&
        // ⛔ is a `FieldError` — `role="alert"`, so a blocking state announces itself. The empty
        // state is **not** an error and must not: « Saisie en cours » is ordinary typing, and
        // announcing it would make every cleared field feel like a fault.
        (message.blocking ? (
          <FieldError errors={[{ message: message.text }]} />
        ) : (
          <p className="text-muted-foreground text-xs">{message.text}</p>
        ))}
      {warning !== undefined && warning !== null && (
        <p className="text-warning text-xs">⚠ {warning}</p>
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
  onChange,
  onFocus,
  onBlur,
}: {
  id: string;
  value: string;
  invalid?: boolean;
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
      {value === "" && <NativeSelectOption value="">— choisir —</NativeSelectOption>}
      {options.map((option) => (
        <NativeSelectOption disabled={option.disabled} key={option.value} value={option.value}>
          {option.disabled === true ? `${option.label} — indisponible` : option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** Why an option cannot be chosen — one per row, in the row's own full-width note slot. */
export function DisabledReason({ reason }: { reason: string }) {
  return <p className="text-muted-foreground text-xs">ℹ {reason}</p>;
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
    <RadioGroup
      className="gap-1"
      name={name}
      onValueChange={(next: unknown) => onChange(next as T)}
      value={value}
    >
      {options.map((option) => (
        <Label
          className={cn("gap-1", option.disabled === true && "text-muted-foreground")}
          key={option.value}
        >
          <RadioGroupItem disabled={option.disabled} value={option.value} />
          <span>
            {option.label}
            {option.disabled === true && " — indisponible"}
          </span>
        </Label>
      ))}
      {options
        .filter((option) => option.disabled === true && option.reason)
        .map((option) => (
          <p className="text-muted-foreground pl-5 text-xs" key={`${option.value}-reason`}>
            ℹ {option.reason}
          </p>
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
      {options.map((option) => (
        <ToggleGroupItem className="flex-1" key={option.value} value={option.value}>
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
    <details className="relative shrink-0">
      {/* `Badge` renders **as the `<summary>`**, which is the one composition that keeps the
          disclosure working: `Badge` is a `useRender` span with no semantics of its own, where
          `Button` *enforces* button semantics and would put `role="button"` on the summary. */}
      <Badge
        className={cn(
          "cursor-pointer list-none",
          tone === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
        )}
        id={id}
        render={
          <summary>
            {tone === "warning" ? "⚠ " : ""}
            {label}
          </summary>
        }
        variant="secondary"
      />
      <p className="bg-popover border-border absolute right-0 z-10 mt-1 w-64 border px-3 py-2 text-xs whitespace-pre-line shadow-md">
        {detail}
      </p>
    </details>
  );
}

/** One `Valeurs déduites` row: read-only, and never editable — except a steel override. */
export function ReadOut({
  label,
  value,
  chip,
  warning,
  children,
}: {
  label: string;
  /** `null` renders nothing at all: « — » is spent on `Indéterminé` and may not be reused. */
  value: string | null;
  chip?: ReactNode;
  /**
   * § 6's **Avertissement** tier: ⚠ **in line on the row it qualifies**, never a paragraph block
   * and never a promotion to the banner. The ambient tier does not come through here — it is plain
   * status text with no glyph, because it fires always and an alarm that always fires is mute.
   */
  warning?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs" title={label}>
          {label}
        </span>
        {chip}
        {/* A computed quantity: mono, and right-aligned because the label beside it is `flex-1`. */}
        {value !== null && <span className="text-right font-mono text-xs">{value}</span>}
        {children}
      </div>
      {warning !== undefined && warning !== null && (
        <p className="text-warning text-xs">⚠ {warning}</p>
      )}
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
