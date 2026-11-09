/**
 * The Page Statique's outputs, rendered (#91) — four tiles and the Verdict, from
 * `@/lib/statique/outputs.ts`'s view model. **Presentation only**: every value, qualifier and
 * reason was decided there, off the same models Avancé prints from.
 *
 * Values are `font-mono text-base` — the Rail's headline size, the second of the app's three — and
 * every label, qualifier and reason is `text-xs`, ranked below by colour. A tile with nothing to
 * print says why in a sentence, never with « — », which is `Indéterminé`'s glyph.
 */

import type { ReactNode } from "react";

import { createContext, use } from "react";

import type { StatiqueOutput, StatiqueOutputs, StatiqueVerdict } from "@/lib/statique/outputs.ts";

import { TONE_CLASS } from "@/components/app/banner.tsx";
import { HelpText } from "@/components/docs/help-text.tsx";
import { VERDICT_TONE } from "@/lib/app/tone.ts";
import { OUTPUT_LABEL } from "@/lib/statique/copy.ts";
import { cn } from "@/lib/utils.ts";

export function StatiqueOutputTiles({ model }: { model: StatiqueOutputs }) {
  return (
    <OutputGrid block>
      {model.outputs.map((output) => (
        <OutputTile key={output.id} output={output} />
      ))}
      <VerdictTile verdict={model.verdict} />
    </OutputGrid>
  );
}

/**
 * How a grid lays its tiles out, read by its {@link TileFrame}s so a `wide` tile spans what its
 * grid has: a `row` becomes one row of five once its column is wide enough, a `block` keeps two
 * columns at every width.
 */
const GridLayout = createContext<"row" | "block">("row");

/**
 * The grid both occupants share — the live tiles and the Skeleton's labels — so the first frame
 * reserves the layout the outputs land in. Two columns on a phone, the Verdict across both; then
 * one of two shapes:
 *
 * - **a row** (Terrain's) — one row of five once its column is 56 rem wide;
 * - **a block** (`block`, Statique's, #109) — two columns at every width, the Verdict across both
 *   on the third row, and from `THREE_COLUMN_PX` of viewport each tile capped at
 *   `STATIQUE_TILE_MAX_PX` (`@/lib/layout/contract.ts`), so the block stands beside the vue de
 *   dessus. Below 1024 it is the row's own phone shape: Statique's column, `md:w-80` short of the
 *   viewport, is 703 px at the most there, and a row of five needs 896.
 */
export function OutputGrid({
  block = false,
  children,
}: {
  /** Statique's 2 × 3 block. */
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <GridLayout value={block ? "block" : "row"}>
      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          block ? "min-[1024px]:grid-cols-[repeat(2,minmax(0,180px))]" : "@min-[56rem]:grid-cols-5",
        )}
      >
        {children}
      </div>
    </GridLayout>
  );
}

/**
 * One tile's frame: the label, the scope over a traverse aggregate, then a value line and a note
 * line that are laid out whether or not they hold anything — so the Skeleton's tile, which has
 * neither, is as tall as a live one with both, and the grid does not move when the outputs land.
 * The lines are flex items, so each takes its own occupant's line height and no inherited strut.
 */
export function TileFrame({
  label,
  scope = null,
  wide = false,
  value,
  note,
  children,
}: {
  label: string;
  /** « sur toute la traversée », under the label it scopes. */
  scope?: string | null;
  /** The Verdict: across both columns on a phone, where it is the headline, and in a block. */
  wide?: boolean;
  /** The value line, `text-base` tall when empty. */
  value?: ReactNode;
  /** The qualifier or the reason under it, `text-xs` tall when empty. */
  note?: ReactNode;
  /** Below both lines: an Avertissement, which no Skeleton can foresee. */
  children?: ReactNode;
}) {
  const layout = use(GridLayout);
  return (
    <div
      className={cn(
        "border-border flex min-w-0 flex-col gap-1 border px-3 py-2",
        wide && "col-span-2",
        wide && layout === "row" && "@min-[56rem]:col-span-1",
      )}
    >
      <span className="text-muted-foreground text-xs">{label}</span>
      {scope !== null && <span className="text-muted-foreground text-xs">{scope}</span>}
      {/* `min-h-6` and `min-h-4` are `text-base`'s and `text-xs`'s line heights. */}
      <div className="flex min-h-6 flex-col">{value}</div>
      <div className="flex min-h-4 flex-col">{note}</div>
      {children}
    </div>
  );
}

function OutputTile({ output }: { output: StatiqueOutput }) {
  return (
    <TileFrame
      label={output.label}
      note={
        output.qualifier !== null && (
          <span className="text-muted-foreground text-xs">{output.qualifier}</span>
        )
      }
      scope={output.scope}
      value={
        output.value === null ? (
          <span className="text-muted-foreground text-xs">{output.absent}</span>
        ) : (
          <span className={cn("font-mono text-base", output.breach && "text-destructive")}>
            {output.value}
          </span>
        )
      }
    >
      {output.warning !== null && (
        <p className="text-warning text-xs">
          ⚠ <HelpText text={output.warning} />
        </p>
      )}
    </TileFrame>
  );
}

/**
 * The Verdict, coloured by its state. **No button for the marge exigée**: the banner above the
 * coupe carries « Choisir une marge exigée », and a second identical button is the warning wall the
 * Rail refused too.
 */
function VerdictTile({ verdict }: { verdict: StatiqueVerdict }) {
  if (verdict.kind !== "state") {
    return (
      <TileFrame
        label={OUTPUT_LABEL.verdict}
        // The absence of a judgement is not coloured: colouring it would be a judgement.
        value={<span className="text-muted-foreground text-xs">{verdict.text}</span>}
        wide
      />
    );
  }
  const tone = TONE_CLASS[VERDICT_TONE[verdict.state]];
  return (
    <TileFrame
      label={OUTPUT_LABEL.verdict}
      note={
        verdict.reason !== null && <span className={cn("text-xs", tone)}>{verdict.reason}</span>
      }
      value={<span className={cn("text-base font-semibold", tone)}>{verdict.label}</span>}
      wide
    />
  );
}
