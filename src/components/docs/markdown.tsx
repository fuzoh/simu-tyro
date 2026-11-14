/**
 * Markdown → React for the documentation pages, and nothing else.
 *
 * - **Headings get stable ids from their section number** — `## 10.4 Use-class gate` renders as
 *   `<h3 id="s-10-4">` — because that number is what a tooltip's `§10.4` links to
 *   (`@/lib/docs/refs.ts`). A slug of the title would move the day a title is reworded; the
 *   number is the contract. Headings without a number get no id, and no link targets them.
 * - **The document's `#` becomes the page's `<h1>`**: the route does not print a second title.
 * - **Math is KaTeX.** The reports write `$…$` / `$$…$$`; the theory file writes formulas in code
 *   spans, which pass through untouched.
 * - **A relative link to a served page is routed**: `../simulation-theory.md#s-10-4`, written in
 *   `docs/guide/`, becomes a router link to `/docs/modele#s-10-4` (`@/lib/docs/links.ts`), so the
 *   file reads the same on GitHub and `basepath` is applied in the app.
 * - **Other relative links stay relative to the repository**, which the browser cannot follow — they
 *   are rendered as plain text with the path, so a reader is told where to look rather than 404'd.
 */

import type { ComponentProps } from "react";
import type { Components } from "react-markdown";

import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { resolveDocHref } from "@/lib/docs/links.ts";
import { headingSection, sectionAnchor } from "@/lib/docs/refs.ts";

import "katex/dist/katex.min.css";

/** The text a heading's children spell, for the id — react-markdown hands us hast nodes. */
function textOf(node: { children?: unknown[]; value?: string } | undefined): string {
  if (node === undefined) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? [])
    .map((child) => textOf(child as { children?: unknown[]; value?: string }))
    .join("");
}

type HeadingProps = ComponentProps<"h1"> & { node?: { children?: unknown[] } };

function heading(Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  return function Heading({ node, children, ...rest }: HeadingProps) {
    const section = headingSection(textOf(node));
    const id = section === null ? undefined : sectionAnchor(section);
    return (
      <Tag id={id} {...rest}>
        {id === undefined ? (
          children
        ) : (
          // The section number is itself the link to its own anchor, so a reader can copy it.
          <a className="doc-anchor" href={`#${id}`}>
            {children}
          </a>
        )}
      </Tag>
    );
  };
}

type AnchorProps = ComponentProps<"a"> & { node?: unknown };

/**
 * External links open in a new tab; links to a served page are routed; other repository-relative
 * ones are shown as their path. `from` is the repository path of the page being rendered.
 */
function anchor(from: string) {
  return function Anchor({ node: _node, href, children, ...rest }: AnchorProps) {
    if (href === undefined) return <a {...rest}>{children}</a>;
    if (href.startsWith("#")) {
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      );
    }
    if (/^https?:\/\//.test(href)) {
      return (
        <a href={href} rel="noreferrer" target="_blank" {...rest}>
          {children}
        </a>
      );
    }
    const target = resolveDocHref(href, from);
    if (target !== null) {
      return (
        <Link hash={target.hash} params={{ slug: target.slug }} to="/docs/$slug">
          {children}
        </Link>
      );
    }
    return (
      <span title={href}>
        {children} <code className="doc-path">({href})</code>
      </span>
    );
  };
}

/**
 * @param source the markdown.
 * @param path the repository path of that markdown, which its relative links are written from.
 */
export function DocMarkdown({ source, path }: { source: string; path: string }) {
  // One set of component types per page: a fresh `anchor(path)` on every render would be a new
  // component type each time, and React would remount every link of the page.
  const components = useMemo<Components>(
    () => ({
      a: anchor(path),
      h1: heading("h1"),
      h2: heading("h2"),
      h3: heading("h3"),
      h4: heading("h4"),
      h5: heading("h5"),
      h6: heading("h6"),
    }),
    [path],
  );
  return (
    <Markdown
      components={components}
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
    >
      {source}
    </Markdown>
  );
}
