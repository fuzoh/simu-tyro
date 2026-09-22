/**
 * Where this build of the app *lives* — the one place that turns Vite's `base` into something a
 * shared link can be built on.
 *
 * Everything else in the app writes URLs through the router, which applies `basepath` for us:
 * `navigate({ to: "/" })` in `store.tsx`, `use-persist.ts` and `inputs.tsx` all land on
 * `/scoutech/…` under a GitHub Pages project site without knowing it. **« Copier le lien » is the
 * exception**, and it has to be: `copyLink` builds an absolute href by hand, because § 7's link
 * budget is measured on the *whole* URL and the router will not hand one over pre-measured.
 *
 * So the mount prefix is a parameter of `copyLink`, never a `window` read inside it — see the
 * header of `persist.ts` — and this is what the two call sites pass.
 */

/**
 * `https://fuzoh.github.io/scoutech` on the project site, `https://example.org` on a custom domain
 * or in dev. No trailing slash: `canonicalLink` already opens with one, and a doubled `//`
 * is a different path to every static host that has an opinion.
 *
 * Browser-only — it reads `window.location`. `import.meta.env.BASE_URL` is Vite's echo of `base`
 * in `vite.config.ts`, the same value `src/router.tsx` feeds the router's `basepath`, so there is
 * no second place to change when the app moves.
 */
export function siteOrigin(): string {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/+$/, "");
}
