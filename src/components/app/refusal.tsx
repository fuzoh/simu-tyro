/**
 * The refusal surface — « v1 build spec » § 8 (*La page de refus — HTTP 200 après une frame de
 * Skeleton*), as [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) rebuilt
 * its mechanism.
 *
 * **It is an ordinary component, not an `errorComponent`.** § 8 elected `ssr: false` partly because
 * the refusal arrived at **200**, and § 7's copy (« nothing failed to load and the status line
 * agrees ») rests on that. On the pinned tree a thrown `validateSearch` now answers **500** — so
 * amendment E dropped the throw and kept the status: `validateSearch` salvages the refusal into
 * `search.refused`, and the index route renders this when the marker is set. Nothing fails, no
 * match errors, the status stays 200. The route may still declare an `errorComponent`; no refusal
 * reaches it.
 *
 * **It renders inside the Shell, and it suppresses rather than merges.** On the root it would
 * replace the shell and leave no way back into the app; beside the Rail's five sections it would be
 * a partial read of a link that refused whole. So the shell and its header stand, the five sections
 * do not, and the one action is a `<Link to="/" search={{}} replace>` onto the same route — there
 * is no `/refuse` route and there is nothing to go back *from*.
 */

import { Link } from "@tanstack/react-router";

import type { LinkRefusal } from "@/lib/url/schema.ts";

import { buttonVariants } from "@/components/ui/button.tsx";
import { REFUSAL_ACTION, REFUSAL_TITLE, refusalReasonLine } from "@/lib/app/refusal-copy.ts";

import { RailHeader, Shell } from "./shell.tsx";

export function LinkRefusalSurface({ refusal }: { refusal: LinkRefusal }) {
  return (
    <Shell
      rail={<RailHeader />}
      chart={
        <div className="flex flex-col items-start gap-4 py-16" role="alert">
          <h1 className="font-heading text-xl font-semibold tracking-tight">{REFUSAL_TITLE}</h1>
          <p className="text-muted-foreground text-sm">{refusalReasonLine(refusal)}</p>
          {/* Labelled by its **effect**: the app is not empty, it opens on the first-run scenario.
              And there is no « ouvrir malgré tout » — the whole-or-nothing rule forbids a partial
              read, and `L`/`h` are derived from the terrain, so a trace-less application of an
              imported link would fabricate geometry the sender never entered. */}
          <Link className={buttonVariants()} replace search={{}} to="/">
            {REFUSAL_ACTION}
          </Link>
        </div>
      }
    />
  );
}
