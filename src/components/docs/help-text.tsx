/**
 * A help paragraph with its `§` references turned into links to the theory page.
 *
 * The copy stays a string in `@/lib/rail/help.ts`; this is the one place that reads it as
 * structure. A reference links to `/docs/modele#s-10-4` through the router, so `basepath` is
 * applied and the docs page scrolls to the heading (`hashScrollIntoView` is the router's default).
 */

import { Link } from "@tanstack/react-router";

import { THEORY_SLUG } from "@/lib/docs/pages.ts";
import { sectionAnchor, splitHelp } from "@/lib/docs/refs.ts";

export function HelpText({ text }: { text: string }) {
  return (
    <>
      {splitHelp(text).map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <Link
            className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
            hash={sectionAnchor(segment.section)}
            key={index}
            params={{ slug: THEORY_SLUG }}
            title={`Documentation — section ${segment.section}`}
            to="/docs/$slug"
          >
            {segment.text}
          </Link>
        ),
      )}
    </>
  );
}
