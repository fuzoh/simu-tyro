/**
 * The navigation bar and the frame every app Page stands in — ADR-0002. Rendered by the pathless
 * layout route `src/routes/_app.tsx`, never by `__root.tsx`, which stays the document.
 */

import type { CSSProperties, ReactNode } from "react";

import { Link, useLocation } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button.tsx";
import { NAVIGATION } from "@/lib/app/pages.ts";
import { NAV_BAR } from "@/lib/layout/contract.ts";
import { cn } from "@/lib/utils.ts";

/**
 * One viewport tall, the navigation bar on top and the Page under it. The Page's own shell fills
 * what is left, so the bar's height is paid out of every Page — voir `NAV_BAR`.
 */
export function PageFrame({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <div
      className="bg-background text-foreground flex h-dvh flex-col"
      style={{ "--nav-bar": `${NAV_BAR}px` } as CSSProperties}
    >
      {live ? <LiveNavigation /> : <SkeletonNavigation />}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * The bar as the server paints it: the Page names as text, no link, in the box a `size="sm"` link
 * occupies. A link there would be present and wrong — the prerendered HTML carries no search, so a
 * press before hydration would drop the shared Scenario and land on the Session instead.
 */
function SkeletonNavigation() {
  return (
    <NavigationBar>
      {NAVIGATION.map((entry) => (
        <span
          className="inline-flex h-7 items-center border border-transparent px-2.5 text-xs font-medium"
          key={entry.path}
        >
          {entry.label}
        </span>
      ))}
    </NavigationBar>
  );
}

/**
 * Every link carries the **raw** search of the current location, not the validated bag: the
 * validator's synthesised `refused` marker is stripped by `keepRefusalOutOfTheAddressBar` only on
 * the app Pages' branch, and `/docs` is not on it. A plain object, so the router writes it verbatim.
 */
function LiveNavigation() {
  const search = useLocation({ select: (location) => location.search });
  return (
    <NavigationBar>
      {NAVIGATION.map((entry) => (
        <Link
          activeOptions={{ includeSearch: false }}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "touch-44 data-[status=active]:bg-muted",
          )}
          key={entry.path}
          search={search}
          to={entry.path}
        >
          {entry.label}
        </Link>
      ))}
    </NavigationBar>
  );
}

function NavigationBar({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label="Pages"
      className="border-border flex h-[var(--nav-bar)] shrink-0 items-center gap-1 border-b px-3"
    >
      {children}
    </nav>
  );
}
