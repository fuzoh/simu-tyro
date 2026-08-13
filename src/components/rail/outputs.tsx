/**
 * The Rail's **output half** — « v1 build spec » § 6 (`Résultats`, the criteria × ends grid, the
 * two provenance idioms, « Ce que cet outil ne calcule pas ») and § 9 (« Résultats sans régime »).
 *
 * Three of the Rail's five sections, in order and in one scrolling column. **There is no results
 * panel and there is no right-hand column**: a third column steals the width the chart design was
 * bought for, and a region under the five read-out cells pushes those cells — which *are* the
 * scrub read-out — below the fold.
 *
 * Presentation only. Every string here is decided in `@/lib/rail/results.ts`,
 * `@/lib/rail/provenance.ts` or `@/lib/terrain/provenance.ts`, which is where the `node` suite
 * reaches them (amendment A). What lives in this file is the affordance and the type scale.
 *
 * - **No accordion in `Résultats`.** `flèche / portée` is a *validity* read-out, not a nicety, and
 *   what sits behind a click is read by nobody. The only disclosure triangle in the output half is
 *   the aggregate's, whose always-visible line already carries the count.
 * - **Absent, never dashed.** A row that cannot be reported is not in the list at all — « — » is
 *   spent on `Indéterminé`, *tenté et indisponible*, and a « consistency » pass that dashes empty
 *   cells undoes three tickets' worth of effort at once.
 * - **The banner is A11's slot, not this file's.** {@link Results.banner} carries the sentence and
 *   the state; the verdict *row* at the top of `Résultats` is the block's own headline.
 */

import type { Deduced } from "@/lib/rail/deduced.ts";
import type { AggregateEntry } from "@/lib/rail/provenance.ts";
import type { ResultGridRow, ResultRow, Results } from "@/lib/rail/results.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { DisclosureLine } from "@/lib/terrain/provenance.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { jumpToField } from "@/components/app/banner.tsx";
import { RailSection } from "@/components/app/shell.tsx";
import { useAppState } from "@/components/app/store.tsx";
import {
  LOAD_COMBINATION_FORMULA,
  NOT_COMPUTED_LINES,
  provenanceAggregate,
} from "@/lib/rail/provenance.ts";
import { terrainDisclosure } from "@/lib/terrain/provenance.ts";
import { cn } from "@/lib/utils.ts";

import { Chip } from "./controls.tsx";

/**
 * The Rail's three output sections. `deduced` is the shared rider-free chain and `results` the
 * shared traverse aggregate — **both come from the app root**, because the input half reads the
 * first and the banner reads the second, and neither may run twice per keystroke.
 */
export function RailOutputs({
  cause,
  deduced,
  results,
}: {
  /** § 7's cause sentence, echoed into this block when it is suppressed. A11's, written once. */
  cause: string | null;
  deduced: Deduced;
  results: Results | null;
}) {
  const { scenario, trace } = useAppState();

  return (
    <>
      <ResultsSection cause={cause} results={results} />
      <ProvenanceSection deduced={deduced} scenario={scenario} trace={trace} />
      <NotComputedSection />
    </>
  );
}

/**
 * `Résultats` — four headline rows then nine detail rows, all in one block.
 *
 * `null` is « Aucun résultat »: the block keeps its heading and renders **nothing** under it. The
 * cause sentence echoed into each suppressed region is A11's, and it is a sentence precisely
 * because a row of dashes would read as `Indéterminé` on a line that was never computed.
 */
function ResultsSection({ cause, results }: { cause: string | null; results: Results | null }) {
  return (
    <RailSection
      aside={
        results === null ? null : (
          <>
            {results.scope}
            {results.aside !== null && ` · ${results.aside}`}
          </>
        )
      }
      title="Résultats"
    >
      {/* § 7's second echo — one sentence spanning the block, never a row of dashes: « — » is spent
          on `Indéterminé`, *tenté et indisponible*, and reusing it for *nothing attempted* collides
          with the distinction § 6 bought five verdict states to preserve. */}
      {results === null && cause !== null && (
        <p className="text-muted-foreground mt-2 text-[11px]">{cause}</p>
      )}
      {results !== null && (
        <div className="mt-2">
          <div className="border-border flex flex-col gap-1 border-b pb-2">
            {results.rows
              .filter((row) => row.rank === "headline")
              .map((row) => (
                <HeadlineRow key={row.id} row={row} />
              ))}
          </div>

          {results.prompt !== null && (
            <p className="text-muted-foreground mt-2 text-[11px]">
              {results.prompt.before}
              {/* The emphasised phrase is the affordance: it focuses the picker, and there is no
                  second button — `[ Choisir un régime ]` already lives in the banner. */}
              <button
                className="text-foreground font-medium underline underline-offset-2"
                // The **one** jump primitive, shared with the banner's own `[ Choisir un régime ]`.
                onClick={() => {
                  jumpToField("regime");
                }}
                type="button"
              >
                {results.prompt.emphasis}
              </button>
              {results.prompt.after}
            </p>
          )}

          <div className="mt-2">
            {results.rows
              .filter((row) => row.rank === "detail")
              .map((row) => (
                <DetailRow key={row.id} row={row} />
              ))}
          </div>

          {results.grid.length > 0 && (
            <div className="mt-3">
              <h3 className="text-foreground/70 text-[11px] font-semibold">
                Critères × extrémités
              </h3>
              {results.grid.map((row) => (
                <GridRow key={row.id} row={row} />
              ))}
            </div>
          )}
        </div>
      )}
    </RailSection>
  );
}

/** One of the four headline values: a larger body, at the top of the same block. */
function HeadlineRow({ row }: { row: ResultRow }) {
  return (
    <div>
      <span className="text-muted-foreground text-[11px]">{row.label}</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-base">{row.value}</span>
        {row.qualifier !== null && (
          <span className="text-muted-foreground text-[11px]">{row.qualifier}</span>
        )}
      </div>
    </div>
  );
}

/** One detail row. « ↳ majoration dynamique » is a decomposition of the row above it. */
function DetailRow({ row }: { row: ResultRow }) {
  return (
    <div className={cn("flex items-baseline gap-2 py-0.5", row.indent && "pl-3")}>
      <span className="text-muted-foreground min-w-0 flex-1 text-xs" title={row.label}>
        {row.label}
      </span>
      <span className="font-mono text-xs">{row.value}</span>
      {row.qualifier !== null && (
        <span className="text-muted-foreground shrink-0 text-[10px]">{row.qualifier}</span>
      )}
    </div>
  );
}

/**
 * One criterion of the grid. **Some cells are legitimately empty** — the suspended-load criterion
 * is not per end at all — and the row states its numerator, because « FS ≥ 5 sur charge suspendue »
 * read as `MBF / P` scores 77 and can never bind.
 */
function GridRow({ row }: { row: ResultGridRow }) {
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-xs">{row.label}</span>
        {row.note !== null && <span className="text-muted-foreground text-[11px]">{row.note}</span>}
      </div>
      {row.formula !== "" && <p className="text-muted-foreground text-[10px]">{row.formula}</p>}
      {row.detail !== null && <p className="text-muted-foreground text-[10px]">{row.detail}</p>}
      {row.cells.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-3">
          {row.cells.map((cell) => (
            <div
              // § 6: « Le bandeau nomme la cellule gouvernante ». The grid must name it too, and
              // **not by weight and colour alone** — the banner's sentence is 300 px away, the
              // colour already carries the *state*, and a 11 px mono value one notch bolder than
              // its neighbour is not a distinction a reader can be asked to make.
              aria-current={cell.governing ? "true" : undefined}
              className={cn(
                "flex items-baseline gap-1.5",
                cell.governing && "font-medium",
                cell.state === "hors-limites" && "text-destructive",
                cell.state === "marge-faible" && "text-amber-600 dark:text-amber-400",
              )}
              key={cell.end ?? "unique"}
            >
              <span className="text-muted-foreground text-[10px]">
                {cell.end === null ? "une seule cellule" : `ancrage ${cell.end}`}
              </span>
              {cell.Tadm !== null && <span className="font-mono text-[11px]">{cell.Tadm}</span>}
              <span className="font-mono text-xs">FS {cell.FS}</span>
              {cell.governing && <span className="text-[10px]">← gouvernante</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * `Provenance` — the terrain disclosure **above** the aggregate, and both are always present.
 *
 * Two idioms, because coefficients and input data answer two different questions. The terrain block
 * is present **in manual mode too**: manual ground is a straight line between the anchor bases, and
 * an absent block would read silently as « aucun souci de terrain » in the one mode where the
 * terrain is a two-point idealisation.
 */
function ProvenanceSection({
  scenario,
  trace,
  deduced,
}: {
  scenario: ScenarioDraft;
  /** The **cached** profile is not a source: the block describes the terrain *this run* uses. */
  trace: Trace | null;
  deduced: Deduced;
}) {
  const source =
    scenario.geometry.source === "trace" && trace !== null
      ? ({ kind: "trace", trace } as const)
      : ({ kind: "manual" } as const);
  const aggregate = provenanceAggregate(scenario, deduced);

  return (
    <RailSection title="Provenance">
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          {terrainDisclosure(source).map((line) => (
            <TerrainLine key={line.text} line={line} />
          ))}
        </div>

        <details>
          <summary className="cursor-pointer list-none text-[11px] text-amber-700 dark:text-amber-300">
            ⚠ {aggregate.summary}
            <span className="text-muted-foreground ml-1">▾</span>
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {aggregate.entries.map((entry) => (
              <AggregateRow entry={entry} key={entry.id} />
            ))}
          </ul>
        </details>
      </div>
    </RailSection>
  );
}

/** One disclosure line. The glyph is the renderer's, so the copy stays comparable in `node`. */
function TerrainLine({ line }: { line: DisclosureLine }) {
  const glyph = { plain: "", ok: "✓ ", warn: "⚠ ", info: "ℹ " }[line.tier];
  return (
    <div
      className={cn(
        "text-[11px]",
        line.tier === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      <span>
        {glyph}
        {line.text}
      </span>
      {line.detail !== undefined && <p className="text-muted-foreground pl-3">{line.detail}</p>}
    </div>
  );
}

/**
 * One aggregate line. **The régime is pinned first and visually separated**: it is not one input
 * among six — it multiplies into every margin of the grid.
 */
function AggregateRow({ entry }: { entry: AggregateEntry }) {
  return (
    <li
      className={cn("flex items-center gap-2", entry.pinned && "border-border mb-1 border-b pb-1")}
    >
      <span className="text-muted-foreground min-w-0 flex-1 text-[11px]">{entry.label}</span>
      {entry.value !== null && <span className="font-mono text-[11px]">{entry.value}</span>}
      <Chip
        detail={entry.detail}
        label={entry.chip}
        tone={entry.chip === "non confirmé" ? "warning" : "neutral"}
      />
    </li>
  );
}

/**
 * The standing block, **below everything living**: five static lines that never change, and the
 * only place a user learns that a passing verdict says nothing about wind.
 */
function NotComputedSection() {
  return (
    <RailSection title="Ce que cet outil ne calcule pas">
      <ul className="text-muted-foreground mt-2 flex flex-col gap-1 text-[11px]">
        {NOT_COMPUTED_LINES.map((line, index) => (
          <li className="flex items-start gap-1" key={line}>
            <span>·</span>
            <span>{line}</span>
            {/* §8.3 asks that the load combination be exposed and labelled — prose on the
                surface, formula in the popover. Printed in the open, someone applies those γ
                factors by hand and believes the result. */}
            {index === 0 && (
              <Chip detail={LOAD_COMBINATION_FORMULA} label="la formule" tone="neutral" />
            )}
          </li>
        ))}
      </ul>
    </RailSection>
  );
}
