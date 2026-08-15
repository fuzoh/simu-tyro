/**
 * The banner slot's one occupant, rendered — « v1 build spec » § 7 (*Le bandeau : un occupant,
 * quatre rangs*, *Le résumé bloquant nomme la pire grille franchie*, *Fix Actions, lien de saut*),
 * with rank 2 as [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) leaves it.
 *
 * **Presentation only.** Which of the four ranks occupies the slot is `@/lib/app/banner.ts`'s pure
 * reducer, and every sentence in here was decided in `@/lib/rail/gates.ts`, `@/lib/rail/results.ts`
 * or `@/lib/app/refusals.ts` — this file is the two visual classes, the three affordances and the
 * jump primitive.
 *
 * - **Ranks 1 and 2 share one visual class**, because a refusal and a blocking error stop the same
 *   things. Rank 3 is **neutral** — mid-edit is not a fault — and rank 4b is neutral *without* the
 *   verdict's chrome, because colouring the absence of a judgement would be a judgement.
 * - **The slot carries the count and the jump link and nothing else** at rank 1. The actionable
 *   message and its Fix Action live inline on the culpable field, so the two never disagree and the
 *   banner cannot become a second place to fix things.
 * - **The jump link is a `<button>`, never an `<a href="#…">`**: the URL is write-only after load,
 *   and a hash would put a fragment into an address bar the app rewrites.
 * - **`[ Choisir un régime ]` focuses the picker without opening it** — opening a popup from a
 *   remote button covers the context the user has just travelled to.
 */

import type { BannerOccupant } from "@/lib/app/banner.ts";
import type { FieldId } from "@/lib/rail/fields.ts";
import type { VerdictState } from "@/lib/sim";

import { CHOOSE_REGIME_LABEL, JUMP_LABEL } from "@/lib/app/banner.ts";
import { DIAGNOSTIC_ACTION } from "@/lib/app/refusals.ts";
import { CENTRE_IN_RAIL } from "@/lib/layout/collapse.ts";
import { cn } from "@/lib/utils.ts";

/**
 * § 7's one jump primitive, serving the banner's jump link, `[ Choisir un régime ]` and every Fix
 * Action that focuses rather than sets: scroll the target's rail section into view, then move DOM
 * focus to the control. `scroll-margin-top` on the control reserves the pinned header's height, so
 * the target never lands underneath it — the rule is `[id^="rail-"]` in `src/styles.css`, scoped to
 * B2 and fed by the shell's `--pinned-clearance`.
 *
 * The Rail's sections are not collapsible in v1 — the narrow-screen reflow keeps all five in flow,
 * as one scroller — so « force-open it if collapsed » has nothing to open and the primitive stays
 * one call. **The two mechanisms compose with no special case**: this scroll happens inside the
 * Rail's own scroller and this focus lands on a Rail field, so pressing the link fires the Pinned
 * Safety Header's triggers (a) and (b) itself and produces exactly the layout the message needs.
 */
export function jumpToField(field: FieldId): void {
  const target = document.getElementById(`rail-${field}`);
  if (target === null) return;
  // The **same** options object the Rail's own focus centring uses — one scroll behaviour in the
  // app, `behavior` left at `auto` because a smooth scroll races the soft keyboard's animation.
  target.scrollIntoView(CENTRE_IN_RAIL);
  target.focus();
}

/** The verdict's five states, as the two tints the rest of the app already uses for them. */
const VERDICT_TONE: Record<VerdictState, string> = {
  "dans-les-limites": "text-foreground",
  "marge-faible": "text-amber-600 dark:text-amber-400",
  "hors-limites": "text-destructive",
  "refuse-usage-interdit": "text-destructive",
  // *Attempted and unavailable* is not a failure of the line: it reads plainly, like the coverage
  // figure it quotes.
  indetermine: "text-muted-foreground",
};

export function Banner({
  occupant,
  onDiagnostic,
}: {
  /** The single occupant, from the reducer. `null` leaves the band **reserved and unpainted**. */
  occupant: BannerOccupant | null;
  /**
   * `[ Copier le diagnostic ]`, on « Calcul impossible » alone. It is `async` because the clipboard
   * is, and it is the app's — the payload is built where the Scenario is.
   */
  onDiagnostic: () => void;
}) {
  // **Nothing to say, nothing drawn**: no border, no fill, no text. Reserving height is layout;
  // painting a band is a statement, and an empty verdict-coloured band reads « rien à signaler ».
  if (occupant === null) return null;

  const blocking = occupant.rank === 1 || occupant.rank === 2;

  return (
    <div
      className={cn(
        // `compact:` is § 5's fourth row — « bandeau sur **une ligne** » — and it is the only thing
        // the collapse asks of this file: no wrap, no vertical padding, and the sentence truncated
        // rather than allowed to grow the 44 px row the form is owed. The occupant, its rank and its
        // affordance are unchanged: a blocking summary keeps `[ voir la première ]` under a keyboard.
        "compact:flex-nowrap compact:py-0 flex h-full flex-wrap items-center gap-x-3 gap-y-1 py-1 text-xs",
        blocking && "text-destructive",
        occupant.rank === 3 && "text-muted-foreground",
        occupant.rank === 4 && occupant.kind === "verdict" && VERDICT_TONE[occupant.state],
        occupant.rank === 4 && occupant.kind === "no-regime" && "text-muted-foreground",
      )}
      // Blocking states announce themselves; a verdict and a mid-edit mark are read, not alerted.
      role={blocking ? "alert" : undefined}
    >
      <span className="compact:truncate min-w-0 flex-1">{occupant.text}</span>

      {occupant.rank === 1 && (
        <BannerButton
          label={JUMP_LABEL}
          onClick={() => {
            jumpToField(occupant.target);
          }}
        />
      )}
      {occupant.rank === 2 && occupant.refusal.diagnostic && (
        <BannerButton label={DIAGNOSTIC_ACTION} onClick={onDiagnostic} />
      )}
      {occupant.rank === 4 && occupant.kind === "no-regime" && (
        <BannerButton
          label={CHOOSE_REGIME_LABEL}
          onClick={() => {
            jumpToField("regime");
          }}
        />
      )}
    </div>
  );
}

/** The slot's one affordance shape. A `<button>` in every case — the URL is write-only. */
function BannerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="border-border hover:bg-accent shrink-0 rounded-md border px-2 py-0.5 text-[11px]"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
