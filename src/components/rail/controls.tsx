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

import { cn } from "@/lib/utils.ts";

/** One labelled row of the Rail: control on the right, messages under the pair. */
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
   * Label above the control rather than beside it. A `<fieldset>` carries a UA
   * `min-inline-size: min-content` and cannot shrink, so a multi-option {@link Choice} beside a
   * wrapping label overlaps it at the Rail's 288 px.
   */
  stacked?: boolean;
}) {
  return (
    <div className="py-1">
      <div className={cn("gap-2", stacked ? "flex flex-col" : "flex items-center")}>
        {/* The label **wraps**, never truncates: at 288 px « Hauteur d'ancrage A » and its B twin
            would clip to the same string, and a control the user cannot tell apart is worse than
            a row two lines tall. */}
        <label
          className="text-muted-foreground min-w-0 flex-1 text-xs leading-tight"
          htmlFor={htmlFor}
          title={label}
        >
          {label}
        </label>
        {chip}
        <div
          className={cn(
            "flex items-center gap-1",
            outlined && "ring-destructive rounded-sm ring-1",
          )}
        >
          {control}
          {hint !== undefined && (
            <span className="text-muted-foreground w-8 shrink-0 text-[11px]">{hint}</span>
          )}
        </div>
      </div>
      {message !== undefined && (
        <p
          className={cn(
            "mt-0.5 text-[11px]",
            message.blocking ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message.text}
        </p>
      )}
      {warning !== undefined && warning !== null && (
        <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">⚠ {warning}</p>
      )}
      {note}
    </div>
  );
}

/** § 3's elected widget. The value is a **string** throughout: the parse is a commit, not a read. */
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
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "border-border h-7 w-20 rounded-md border bg-transparent px-2 text-right font-mono text-xs",
        invalid && "border-destructive",
      )}
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
    <select
      className="border-border h-7 max-w-40 rounded-md border bg-transparent px-1 text-xs"
      id={id}
      onChange={(event) => onChange(event.target.value as T)}
      value={value}
    >
      {value === "" && <option value="">— choisir —</option>}
      {options.map((option) => (
        <option disabled={option.disabled} key={option.value} value={option.value}>
          {option.disabled === true ? `${option.label} — indisponible` : option.label}
        </option>
      ))}
    </select>
  );
}

/** Why an option cannot be chosen — one per row, in the row's own full-width note slot. */
export function DisabledReason({ reason }: { reason: string }) {
  return <p className="text-muted-foreground mt-0.5 text-[10px]">ℹ {reason}</p>;
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
    <fieldset className="flex flex-col gap-0.5">
      {options.map((option) => (
        <label
          className={cn(
            "flex items-center gap-1.5 text-xs",
            option.disabled === true && "text-muted-foreground",
          )}
          key={option.value}
        >
          <input
            checked={value === option.value}
            disabled={option.disabled}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span>
            {option.label}
            {option.disabled === true && " — indisponible"}
          </span>
        </label>
      ))}
      {options
        .filter((option) => option.disabled === true && option.reason)
        .map((option) => (
          <p className="text-muted-foreground pl-5 text-[10px]" key={`${option.value}-reason`}>
            ℹ {option.reason}
          </p>
        ))}
    </fieldset>
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
    <div className="border-border flex overflow-hidden rounded-md border">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            "flex-1 px-2 py-1 text-xs",
            value === option.value ? "bg-accent font-medium" : "text-muted-foreground",
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
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
      <summary
        className={cn(
          "cursor-pointer list-none rounded px-1 text-[10px] whitespace-nowrap",
          tone === "warning"
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "bg-muted text-muted-foreground",
        )}
        id={id}
      >
        {tone === "warning" ? "⚠ " : ""}
        {label}
      </summary>
      <p className="bg-popover border-border absolute right-0 z-10 mt-1 w-64 rounded-md border p-2 text-[11px] whitespace-pre-line shadow-md">
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
    <div className="py-0.5">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs" title={label}>
          {label}
        </span>
        {chip}
        {value !== null && <span className="font-mono text-xs">{value}</span>}
        {children}
      </div>
      {warning !== undefined && warning !== null && (
        <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">⚠ {warning}</p>
      )}
    </div>
  );
}

/** A Fix Action. **Its label describes the effect of pressing it** — invariant 2's other half. */
export function FixButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="border-border hover:bg-accent rounded-md border px-2 py-0.5 text-[11px]"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
