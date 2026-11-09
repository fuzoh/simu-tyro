/**
 * The colour a value is drawn in, named by what it says — a design token's role, never a literal
 * (`docs/conventions/ui.md`, *Severity is a token*). The pure modules decide the tone; the
 * components hold the one table from tone to class (`TONE_CLASS` in `@/components/app/banner.tsx`).
 */

import type { VerdictState } from "@/lib/sim";

export type Tone = "plain" | "warning" | "destructive" | "muted";

/** The Verdict's five states, in the tones every Page draws them in. */
export const VERDICT_TONE: Readonly<Record<VerdictState, Tone>> = {
  "dans-les-limites": "plain",
  "marge-faible": "warning",
  "hors-limites": "destructive",
  "refuse-usage-interdit": "destructive",
  // *Attempted and unavailable* is not a failure of the line: it reads plainly, like the coverage
  // figure it quotes.
  indetermine: "muted",
};
