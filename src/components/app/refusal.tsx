/**
 * The refusal surface — « v1 build spec » § 8 (*La page de refus — HTTP 200 après une frame de
 * Skeleton*), as [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) rebuilt
 * its mechanism.
 *
 * **It is an ordinary component, not an `errorComponent`.** § 8 elected `ssr: false` partly because
 * the refusal arrived at **200**, and § 7's copy (« nothing failed to load and the status line
 * agrees ») rests on that. On the pinned tree a thrown `validateSearch` now answers **500** — so
 * amendment E dropped the throw and kept the status: `validateSearch` salvages the refusal into
 * `search.refused`, and each app Page renders this when the marker is set. Nothing fails, no
 * match errors, the status stays 200. The route may still declare an `errorComponent`; no refusal
 * reaches it.
 *
 * **It keeps the Page's frame, and it suppresses rather than merges.** On the root it would replace
 * the shell and leave no way back into the app; beside the Rail's five sections it would be a
 * partial read of a link that refused whole. So the frame stands — the Shell and its header on
 * Avancé, the columns without their fields on the three simplified Pages (`register="terrain"`) —
 * the content does not. The one action is a `<Link to="." search={{}} replace>` onto the same
 * Page: there is no `/refuse` route and there is nothing to go back *from*.
 */

import { Link } from "@tanstack/react-router";

import type { LinkRefusal } from "@/lib/url/schema.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { ColumnsFrame } from "@/components/statique/frame.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
import { REFUSAL_ACTION, REFUSAL_TITLE, refusalReasonLine } from "@/lib/app/refusal-copy.ts";

import { RailHeader, Shell } from "./shell.tsx";

/**
 * @param register the Page's vocabulary, and with it its frame: a simplified Page refuses in its own
 *   columns, in its own words, and Avancé in the Shell with the exact terms (#102).
 */
export function LinkRefusalSurface({
  refusal,
  register = "exact",
}: {
  refusal: LinkRefusal;
  register?: Register;
}) {
  const notice = <RefusalNotice refusal={refusal} register={register} />;
  if (register === "terrain") {
    return (
      <ColumnsFrame>
        <div className="px-3">{notice}</div>
      </ColumnsFrame>
    );
  }
  return <Shell left={<RailHeader />} chart={notice} />;
}

function RefusalNotice({ refusal, register }: { refusal: LinkRefusal; register: Register }) {
  return (
    <div className="flex flex-col items-start gap-3 py-16" role="alert">
      {/* `text-lg`, the largest the app has: three DOM sizes, and **the error screens are not
          an exception** (`docs/conventions/ui.md` § *Three type sizes*). */}
      <h1 className="font-heading text-lg font-semibold tracking-tight">{REFUSAL_TITLE}</h1>
      <p className="text-muted-foreground text-xs">{refusalReasonLine(refusal, register)}</p>
      {/* Labelled by its **effect**: the app is not empty, it opens on the first-run scenario.
          And there is no « ouvrir malgré tout » — the whole-or-nothing rule forbids a partial
          read, and `L`/`h` are derived from the terrain, so a trace-less application of an
          imported link would fabricate geometry the sender never entered.

          **It stays a `<Link>` wearing `buttonVariants`, and is not wrapped in `<Button>`.**
          Base UI's button applies `role="button"` to whatever the `render` prop gives it as
          soon as `nativeButton={false}` (`internals/use-button/useButton.js`), and leaving that
          flag true logs a development error for a non-`<button>` element. Either way the anchor
          stops announcing itself as a link, which this control *is*: it navigates. What the
          ticket actually asked for — the app's one 28 px height instead of the variants'
          32 px default — is `size: "sm"`, and it costs no semantics. */}
      <Link className={buttonVariants({ size: "sm" })} replace search={{}} to=".">
        {REFUSAL_ACTION}
      </Link>
    </div>
  );
}
