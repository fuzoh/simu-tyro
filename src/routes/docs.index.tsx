/** `/docs` — the list of pages, for a reader who arrives without a `§` in hand. */

import { createFileRoute, Link } from "@tanstack/react-router";

import { DOC_GROUPS, docPagesIn, GUIDE_SLUG } from "@/lib/docs/pages.ts";

export const Route = createFileRoute("/docs/")({
  component: DocsIndex,
  head: () => ({ meta: [{ title: "Documentation — Scoutech" }] }),
});

function DocsIndex() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-heading text-lg font-semibold tracking-tight">
        Comprendre le simulateur, sa référence et ses sources
      </h1>
      <p className="text-muted-foreground text-xs">
        Pour découvrir le modèle, commencez par le{" "}
        <Link
          className="underline underline-offset-2"
          params={{ slug: GUIDE_SLUG }}
          to="/docs/$slug"
        >
          guide pas à pas
        </Link>
        . Les « § » des infobulles du simulateur renvoient à la référence technique ; les rapports
        d'origine sont servis tels qu'ils figurent dans le dépôt.
      </p>
      {DOC_GROUPS.map((group) => (
        <section className="flex flex-col gap-2" key={group.id}>
          <h2 className="font-heading text-sm font-semibold">{group.title}</h2>
          <p className="text-muted-foreground text-xs">{group.summary}</p>
          <ul className="flex flex-col gap-3">
            {docPagesIn(group.id).map((page) => (
              <li className="border-border flex flex-col gap-1 border p-3" key={page.slug}>
                <Link
                  className="font-medium underline-offset-2 hover:underline"
                  params={{ slug: page.slug }}
                  to="/docs/$slug"
                >
                  {page.title}
                </Link>
                <p className="text-muted-foreground text-xs">{page.summary}</p>
                <p className="text-muted-foreground text-xs">
                  <code className="font-mono">{page.path}</code>
                  {page.lang === "en" ? " · en anglais" : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
