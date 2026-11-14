/**
 * Links **between** documentation pages. The markdown links to other files by their repository
 * path — `../simulation-theory.md#s-10-4`, `2-statique.md#s-2-4` — so the files read the same on
 * GitHub and in an editor; this module turns such a link, written in the page at `fromPath`, into
 * the served page it names, so `@/components/docs/markdown.tsx` can route it.
 *
 * Pure and DOM-free — `links.test.ts` resolves every link the served pages carry.
 */

import type { DocSlug } from "./pages.ts";

import { DOC_PAGES } from "./pages.ts";

/** A served page and, when the link carried one, the fragment it points at (without `#`). */
export type DocTarget = { slug: DocSlug; hash: string | undefined };

/** A link with a scheme (`https:`, `mailto:`) or protocol-relative — never a repository path. */
const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/**
 * The repository path a relative `href` names from the file at `fromPath`, with its fragment, or
 * `null` for an external link or a bare fragment. Percent-escapes are decoded — the reports' file
 * names carry spaces, which markdown writes `%20`.
 */
export function resolveRepoHref(
  href: string,
  fromPath: string,
): { path: string; hash: string | undefined } | null {
  if (href === "" || href.startsWith("#") || EXTERNAL.test(href)) return null;
  const hashAt = href.indexOf("#");
  const rawPath = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? undefined : href.slice(hashAt + 1) || undefined;

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  // `/x` is the repository root; anything else is relative to the linking file's directory.
  const base = decoded.startsWith("/") ? [] : fromPath.split("/").slice(0, -1);
  const parts = [...base];
  for (const part of decoded.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return { path: parts.join("/"), hash };
}

/**
 * The served page a link in the file at `fromPath` names, or `null` when it names no served page
 * (an external URL, a fragment, a file the app does not serve).
 */
export function resolveDocHref(href: string, fromPath: string): DocTarget | null {
  const resolved = resolveRepoHref(href, fromPath);
  if (resolved === null) return null;
  const page = DOC_PAGES.find((candidate) => candidate.path === resolved.path);
  return page === undefined ? null : { slug: page.slug, hash: resolved.hash };
}
