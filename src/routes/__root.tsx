/**
 * The document, and nothing visible — « v1 build spec » § 7 (*`__root.tsx` carries the document and
 * nothing visible*) and `docs/conventions/routing.md`.
 *
 * **No header, no app bar, no root `component`, no print stylesheet.** It *can* be document-only
 * because the ten controls that had no address now have three homes — the Rail Header, the View
 * Strip and `Paramètres › Géométrie`. This is not chrome deferred, it is chrome placed elsewhere,
 * and the arithmetic is why: at 390×664 the whole stack leaves **124 px**, which *is* the Rail's
 * resting height against `MIN_RAIL = 120`, so a 44 px title bar would be spent straight out of the
 * form.
 *
 * `shellComponent` stays **server-rendered** — document, head, CSS, scripts — while
 * `src/routes/index.tsx` sets `ssr: false`. That split is the whole SSR policy, and it goes on the
 * route: `defaultSsr` in `src/router.tsx` is a measured **silent no-op**.
 */

import charonMonoLatin from "@fontsource/iosevka-charon-mono/files/iosevka-charon-mono-latin-400-normal.woff2?url";
import charonLatin from "@fontsource/iosevka-charon/files/iosevka-charon-latin-400-normal.woff2?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { buttonVariants } from "@/components/ui/button.tsx";

import appCss from "../styles.css?url";

/**
 * The two faces the prerendered Skeleton paints with — Iosevka Charon for the body and headings,
 * Iosevka Charon Mono for the read-out values. Only the regular weight: 500 and 700 are discovered
 * from the stylesheet like any other. Without a preload the browser only discovers them after parsing `appCss`, one
 * round-trip late, and `font-display: swap` shows that round-trip as a reflow. Only the `latin`
 * subset: the others are fetched on demand by `unicode-range`, which is what they are for. The
 * `?url` resolves to the very asset the `@font-face` rules point at, so the preload is not a second
 * download. `crossOrigin` is required — fonts are always fetched in CORS mode, and a preload
 * without it is discarded and fetched again.
 */
const fontPreloads = [charonLatin, charonMonoLatin].map((href) => ({
  as: "font",
  crossOrigin: "anonymous" as const,
  href,
  rel: "preload",
  type: "font/woff2",
}));

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        // `interactive-widget=resizes-content` is § 5's narrow-screen keyboard policy: the shell is
        // fixed-height with internal scrollers, so the soft keyboard must resize the content rather
        // than pan a visual viewport over it. The `visualViewport` fallback that pairs with it lives
        // in `@/components/app/use-keyboard-inset.ts`.
        content: "width=device-width, initial-scale=1, interactive-widget=resizes-content",
        name: "viewport",
      },
      { title: "Scoutech — simulateur de tyrolienne" },
    ],
    links: [...fontPreloads, { href: appCss, rel: "stylesheet" }],
  }),
  /**
   * **An unknown path 404s. It does not redirect to `/`.** The asymmetry with the index route's
   * error handling is deliberate: for an unmatched path there is no child match to render into, so
   * replacing the Outlet's content is correct — and a redirect would silently turn a mistyped or
   * chat-client-truncated link into a working app on somebody else's default scenario,
   * indistinguishable from a successful share.
   */
  notFoundComponent: () => (
    <main className="mx-auto flex max-w-md flex-col items-start gap-3 p-6 pt-16">
      {/* `text-lg`, like every other heading in the app: `docs/conventions/ui.md` § *Three type
          sizes* has no « except on the error screens » clause, because that clause is how eight
          sizes came back the first time. */}
      <h1 className="font-heading text-lg font-semibold tracking-tight">Page introuvable.</h1>
      {/* A `<Link>` wearing `buttonVariants`, deliberately **not** a `<Button render={<Link/>}>`:
          Base UI's button puts `role="button"` on the rendered element once `nativeButton` is
          false, and this control navigates — it is a link and must announce itself as one. The
          `size: "sm"` is the app's one 28 px control height; the variants' default is 32. */}
      <Link className={buttonVariants({ size: "sm" })} to="/">
        Ouvrir le simulateur
      </Link>
    </main>
  ),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // `lang="fr"` is **load-bearing, not cosmetic**: the decimal comma is a correctness question in
    // a tool whose output is a safety margin.
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {/* Unguarded on purpose: `devtools-vite` reads `removeDevtoolsOnBuild ?? true`, so the block
            is stripped at build and a guard here would be dead code pretending to be caution. */}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
