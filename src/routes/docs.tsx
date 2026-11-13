/**
 * The documentation layout — the one piece of chrome the simulator itself refuses to carry.
 *
 * The app Pages (`src/routes/_app.*.tsx`) stay `ssr: false`; these pages are prose and are
 * **server-rendered and prerendered** (`vite.config.ts` › `pages`), so a shared `/docs/modele#s-10-4`
 * lands on the text with a 200 and no client work. They declare no `validateSearch`: the URL
 * carries nothing here but the path and a hash.
 */

import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button.tsx";
import { DOC_GROUPS, docPagesIn } from "@/lib/docs/pages.ts";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border bg-background/95 sticky top-0 z-10 flex h-[44px] shrink-0 items-center gap-2 border-b px-3 backdrop-blur">
        <Link className="font-heading text-lg font-semibold tracking-tight" to="/docs">
          Documentation
        </Link>
        <span className="text-muted-foreground text-xs">Scoutech</span>
        {/* A link wearing `buttonVariants`, never `<Button render>` — it navigates. */}
        <Link className={`${buttonVariants({ size: "sm", variant: "outline" })} ml-auto`} to="/">
          Ouvrir le simulateur
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-3 py-4">
        <nav aria-label="Pages de documentation" className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-[56px] flex flex-col gap-3">
            {DOC_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="text-muted-foreground text-xs font-medium">{group.title}</p>
                <ul className="flex flex-col gap-1">
                  {docPagesIn(group.id).map((page) => (
                    <li key={page.slug}>
                      <Link
                        activeProps={{ className: "text-foreground font-medium" }}
                        className="text-muted-foreground hover:text-foreground block py-1 text-xs leading-snug"
                        params={{ slug: page.slug }}
                        to="/docs/$slug"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
