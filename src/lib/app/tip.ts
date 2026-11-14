/**
 * What an infobulle says and how it is named (#122) — the pure half of `Tip` in
 * `src/components/rail/controls.tsx`.
 *
 * The four Pages keep their labels, values, units and controls in the open; every explanation,
 * note, warning and field error moves behind an icon that opens on hover, keyboard focus and touch.
 * **Nothing is deleted on the way**: a row's several notes become one infobulle, in their order, and
 * a warning or an error keeps its own icon in its own colour, so its presence is still read without
 * opening it. The Verdict and « Saisie en cours » stay in the open (the brief's two exceptions).
 */

import type { DisclosureLine, DisclosureTier } from "@/lib/terrain/provenance.ts";

import { SWISSTOPO_ATTRIBUTION } from "@/lib/terrain/provenance.ts";

/**
 * The three kinds of infobulle. **Help** is the explanation (`ⓘ`, muted); **warning** is § 6's
 * Avertissement (`⚠`, the `warning` token); **error** is § 7's blocking field error (`⛔`, the
 * `destructive` token).
 */
export type TipTone = "help" | "warning" | "error";

/** What a screen reader hears before the subject — the icon itself says nothing. */
const TIP_PREFIX: Readonly<Record<TipTone, string>> = {
  help: "Explication",
  warning: "Avertissement",
  error: "Erreur bloquante",
};

/** The trigger's accessible name: « Avertissement : Prétension ». */
export function tipName(tone: TipTone, subject: string): string {
  return `${TIP_PREFIX[tone]} : ${subject}`;
}

/**
 * One infobulle out of several texts — a row's help, its meaning, its ambient note and the reason an
 * option is disabled — in the order given, one paragraph each. Blank and absent parts drop out.
 *
 * @returns `null` when nothing is left, so the caller draws no icon over an empty bubble.
 */
export function tipText(parts: readonly (string | null | undefined)[]): string | null {
  const kept = parts.filter((part): part is string => part !== null && part !== undefined);
  const said = kept.map((part) => part.trim()).filter((part) => part !== "");
  return said.length === 0 ? null : said.join("\n\n");
}

/**
 * Why a bubble last closed, as far as a focus landing on its icon cares: **`restored`** when the
 * close hands the focus back to the icon — Escape, or a close button inside the bubble — and
 * **`other`** for every other close (the pointer leaving, a press outside, the focus moving on).
 */
export type TipClose = "restored" | "other";

/** The Base UI close reasons after which the popover returns the focus to its trigger. */
const RESTORING_REASONS: ReadonlySet<string> = new Set(["escape-key", "close-press"]);

/** Base UI's `onOpenChange(false)` reason, read as a {@link TipClose}. */
export function tipClose(reason: string): TipClose {
  return RESTORING_REASONS.has(reason) ? "restored" : "other";
}

/**
 * Whether a focus on the icon opens its bubble. Only the keyboard's focus does (`:focus-visible`;
 * a click's would open it only for the click to toggle it shut), and **never the focus the popover
 * itself hands back on closing**: Escape from a link inside the bubble returns the focus to the
 * icon while the keyboard is the last input, and reopening there would make the first Escape do
 * nothing visible.
 *
 * @param lastClose why the bubble last closed, if that close has not yet been answered by a focus
 *   or a blur on the icon.
 */
export function opensOnFocus(focusVisible: boolean, lastClose: TipClose | null): boolean {
  return focusVisible && lastClose !== "restored";
}

/** A terrain disclosure, split between what stays in the open and what the ⚠ icons open. */
export type DisclosureTips = {
  /** The source and its sampling, the straightness that passed: what the terrain *is*. */
  readonly shown: readonly {
    readonly text: string;
    readonly tip: string | null;
    /**
     * The line's glyph tier, carried so « we checked and it is fine » (`ok`, ✓) and « we could not
     * check » (`info`, ℹ) never read alike (`@/lib/terrain/provenance.ts`).
     */
    readonly tier: Exclude<DisclosureTier, "warn">;
  }[];
  /** Each warning's whole text — the statement and its detail — behind its own ⚠. */
  readonly warnings: readonly string[];
};

/**
 * The terrain disclosure for the infobulles: a line that states the terrain keeps its statement in
 * the open and its detail behind `ⓘ`; a warning goes whole behind a ⚠ of its own. The swisstopo
 * attribution is a source, and its terms ask for it beside the data — it stays in the open.
 */
export function disclosureTips(lines: readonly DisclosureLine[]): DisclosureTips {
  const shown: DisclosureTips["shown"][number][] = [];
  const warnings: string[] = [];
  for (const line of lines) {
    if (line.tier === "warn") {
      warnings.push(tipText([line.text, line.detail]) ?? line.text);
      continue;
    }
    const attributed = line.detail === SWISSTOPO_ATTRIBUTION;
    shown.push({
      text: attributed ? `${line.text} · ${SWISSTOPO_ATTRIBUTION}` : line.text,
      tip: attributed ? null : tipText([line.detail]),
      tier: line.tier,
    });
  }
  return { shown, warnings };
}
