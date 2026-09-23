/**
 * `/docs/<slug>` — one markdown file, rendered. An unknown slug is a **404**, not a redirect,
 * for the same reason `__root.tsx` gives: a mistyped link must not silently become another page.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";

import { DocMarkdown } from "@/components/docs/markdown.tsx";
import { docPage } from "@/lib/docs/pages.ts";
import { docSource } from "@/lib/docs/sources.ts";

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    const page = docPage(params.slug);
    if (page === null) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? "Documentation"} — Scoutech` }],
  }),
  component: DocPageRoute,
});

/**
 * The markdown is read **here and not in the loader**: the router plugin code-splits a route's
 * `component` and leaves its `loader` in the critical chunk, so a `docSource` call in the loader
 * ships 150 kB of prose with the simulator. In the component it ships with this page alone.
 */
function DocPageRoute() {
  const page = Route.useLoaderData();
  const source = docSource(page.slug);
  return (
    <article className="doc" lang={page.lang}>
      <p className="text-muted-foreground mb-3 text-xs">
        <code className="font-mono">{page.path}</code>
        {page.lang === "en" ? " · document en anglais" : ""}
      </p>
      <DocMarkdown source={source} />
    </article>
  );
}
