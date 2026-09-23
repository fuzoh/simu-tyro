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
 * - **Relative links stay relative to the repository**, which the browser cannot follow — they are
 *   rendered as plain text with the path, so a reader is told where to look rather than 404'd.
 */

import type { ComponentProps } from "react";

import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

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

/** External links open in a new tab; repository-relative ones are shown as their path. */
function Anchor({ node: _node, href, children, ...rest }: AnchorProps) {
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
  return (
    <span title={href}>
      {children} <code className="doc-path">({href})</code>
    </span>
  );
}

export function DocMarkdown({ source }: { source: string }) {
  return (
    <Markdown
      components={{
        a: Anchor,
        h1: heading("h1"),
        h2: heading("h2"),
        h3: heading("h3"),
        h4: heading("h4"),
        h5: heading("h5"),
        h6: heading("h6"),
      }}
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
    >
      {source}
    </Markdown>
  );
}
