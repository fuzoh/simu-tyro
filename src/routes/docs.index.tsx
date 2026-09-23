/** `/docs` — the list of pages, for a reader who arrives without a `§` in hand. */

import { createFileRoute, Link } from "@tanstack/react-router";

import { DOC_PAGES } from "@/lib/docs/pages.ts";

export const Route = createFileRoute("/docs/")({
  component: DocsIndex,
  head: () => ({ meta: [{ title: "Documentation — Scoutech" }] }),
});

function DocsIndex() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-heading text-lg font-semibold tracking-tight">
        Modèle mathématique, normes et rapports de référence
      </h1>
      <p className="text-muted-foreground text-xs">
        Les « § » des infobulles du simulateur renvoient à la première page. Les autres sont les
        rapports dont elle a été consolidée ; ils sont servis tels qu'ils figurent dans le dépôt.
      </p>
      <ul className="flex flex-col gap-3">
        {DOC_PAGES.map((page) => (
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
    </div>
  );
}
