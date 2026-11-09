/**
 * The navigation bar and the frame every app Page stands in — ADR-0002. Rendered by the pathless
 * layout route `src/routes/_app.tsx`, never by `__root.tsx`, which stays the document.
 */

import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";
import { use, useState } from "react";

import type { NavigationPath } from "@/lib/app/pages.ts";

import { buttonVariants } from "@/components/ui/button.tsx";
import { NAVIGATION } from "@/lib/app/pages.ts";
import { NAV_BAR } from "@/lib/layout/contract.ts";
import { cn } from "@/lib/utils.ts";

import { PendingWrites, pendingWritesSlot } from "./use-persist.ts";

/**
 * One viewport tall, the navigation bar on top and the Page under it. The Page's own shell fills
 * what is left, so the bar's height is paid out of every Page — voir `NAV_BAR`.
 */
export function PageFrame({ live, children }: { live: boolean; children: ReactNode }) {
  // The live Page's pending writes, which a link leaving it flushes — `usePersist` fills the slot.
  const [pending] = useState(pendingWritesSlot);
  return (
    <PendingWrites value={pending}>
      <div
        className="bg-background text-foreground flex h-dvh flex-col"
        style={{ "--nav-bar": `${NAV_BAR}px` } as CSSProperties}
      >
        {live ? <LiveNavigation /> : <SkeletonNavigation />}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </PendingWrites>
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
          <EntryLabel entry={entry} />
        </span>
      ))}
    </NavigationBar>
  );
}

/**
 * `/` is active on `/` alone: every path is under it, so a fuzzy match would light Statique on
 * every Page. The others keep the fuzzy match, which lights « Documentation » on its pages.
 */
function LiveNavigation() {
  return (
    <NavigationBar>
      {NAVIGATION.map((entry) => (
        <PageLink
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "touch-44 data-[status=active]:bg-muted",
          )}
          exact={entry.path === "/"}
          key={entry.path}
          // The name the icon stands for, on hover.
          title={entry.path === "/docs" ? entry.label : undefined}
          to={entry.path}
        >
          <EntryLabel entry={entry} />
        </PageLink>
      ))}
    </NavigationBar>
  );
}

/**
 * An entry's name. Five do not fit a 390 px phone, so below `sm` the one entry that is not an app
 * Page — the documentation — gives way to its icon, its name kept for assistive technology and the
 * link's `title`. The bar paints it so before hydration too, so nothing reflows.
 */
function EntryLabel({ entry }: { entry: (typeof NAVIGATION)[number] }) {
  if (entry.path !== "/docs") return entry.label;
  return (
    <>
      <BookOpenIcon aria-hidden className="size-4 sm:hidden" />
      <span className="max-sm:sr-only">{entry.label}</span>
    </>
  );
}

/**
 * A link to another entry of the bar, carrying the Scenario with it — the bar's own links, and any
 * a Page offers to another Page.
 *
 * It carries the **raw** search of the current location, not the validated bag: the validator's
 * synthesised `refused` marker is stripped by `keepRefusalOutOfTheAddressBar` only on the app
 * Pages' branch, and `/docs` is not on it. A plain object, so the router writes it verbatim.
 *
 * **Pressed, it first flushes the Page's pending writes** (`usePersist`). The address bar trails
 * the store by ≈400 ms, and the next Page reads the URL before the Session: inside that window the
 * location still holds the Scenario from before the last edit. When the flush wrote the address
 * bar, the link was built from the search it replaced, so a plain click navigates with the new one;
 * a modified click is the browser's, and opens the `href` as rendered.
 */
export function PageLink({
  to,
  exact = false,
  id,
  className,
  title,
  children,
}: {
  to: NavigationPath;
  /** Active on its own path alone, never on the paths under it. */
  exact?: boolean;
  id?: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const search = useLocation({ select: (location) => location.search });
  const open = useOpenPage(to);

  return (
    <Link
      activeOptions={{ exact, includeSearch: false }}
      className={className}
      id={id}
      onClick={open}
      search={search}
      title={title}
      to={to}
    >
      {children}
    </Link>
  );
}

/**
 * The press behind {@link PageLink}, for a control that is not a link — a banner action that opens
 * another Page. Same flush, same navigation, so the two cannot disagree on which search is carried.
 *
 * @param to an entry of the bar, as `PageLink`'s is.
 * @returns a handler: given the click's event it leaves a modified click, and a click that flushed
 *   nothing, to the link; with none it always navigates.
 */
export function useOpenPage(to: NavigationPath): (event?: MouseEvent<HTMLAnchorElement>) => void {
  const search = useLocation({ select: (location) => location.search });
  const pending = use(PendingWrites);
  const navigate = useNavigate();

  return (event) => {
    const flushed = pending?.flush() ?? null;
    if (event !== undefined) {
      if (flushed === null || !isPlainClick(event)) return;
      event.preventDefault();
    }
    // The browser history coalesces the navigations of one tick into a single entry, which would
    // swallow the flush's replace. Queued after it, the push leaves the Page's own entry holding
    // the edit, so Back returns to the Scenario that was left.
    queueMicrotask(() => void navigate({ search: flushed ?? search, to }));
  };
}

/** A click the router would handle itself: the main button, no modifier opening another tab. */
function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
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
