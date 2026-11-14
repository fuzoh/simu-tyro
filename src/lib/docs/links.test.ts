/**
 * The documentation's links, all of them (#125): a link between two pages resolves to a served
 * page and to a heading that exists there; a repository path that is not served names a file that
 * exists; the guide's sommaire reaches every sub-chapter; and **every slug and section anchor that
 * was served before the guide existed still is** — a bookmark, a shared `/docs/modele#s-10-4` or a
 * tooltip `§` must not start landing on nothing because the documentation was reorganised.
 */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { proscribedIn } from "@/lib/vocabulary/labels.ts";

import type { DocSlug } from "./pages.ts";

import { resolveDocHref, resolveRepoHref } from "./links.ts";
import {
  DOC_PAGES,
  docPage,
  docPagesIn,
  GUIDE_SLUG,
  MENU_DOC_PAGES,
  THEORY_SLUG,
} from "./pages.ts";
import { headingSection, sectionAnchor } from "./refs.ts";

const ROOT = new URL("../../../", import.meta.url);

function read(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

/** Markdown lines outside fenced code blocks — a `#` comment in a code sample is no heading. */
function proseLines(source: string): string[] {
  let fenced = false;
  return source.split("\n").filter((line) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced;
  });
}

/** The ids `@/components/docs/markdown.tsx` gives a page's headings: `s-N-M` from their number. */
function anchorsOf(source: string): string[] {
  return proseLines(source).flatMap((line) => {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const section = heading === null ? null : headingSection(heading[1]);
    return section === null ? [] : [sectionAnchor(section)];
  });
}

/** Every inline link target of a page, as written. */
function linksOf(source: string): string[] {
  const text = proseLines(source)
    .join("\n")
    .replace(/`[^`\n]*`/g, "");
  return [...text.matchAll(/\]\((<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) =>
    match[1].replace(/^<|>$/g, ""),
  );
}

const SOURCES = new Map(DOC_PAGES.map((page) => [page.slug, read(page.path)] as const));
const ANCHORS = new Map(
  DOC_PAGES.map((page) => [page.slug, new Set(anchorsOf(SOURCES.get(page.slug) ?? ""))] as const),
);

describe("resolveRepoHref / resolveDocHref", () => {
  test("a link up from the guide reaches the reference, with its section", () => {
    expect(resolveDocHref("../simulation-theory.md#s-10-4", "docs/guide/3-securite.md")).toEqual({
      slug: "modele",
      hash: "s-10-4",
    });
  });

  test("a sibling link stays in the guide's directory", () => {
    expect(resolveDocHref("2-statique.md#s-2-4", "docs/guide/1-ligne.md")).toEqual({
      slug: "statique",
      hash: "s-2-4",
    });
    expect(resolveDocHref("./README.md", "docs/guide/1-ligne.md")).toEqual({
      slug: "guide",
      hash: undefined,
    });
  });

  test("percent-escapes are decoded — the reports' file names carry spaces", () => {
    expect(
      resolveDocHref("../references/tyrolienne%20sur%20cable.md", "docs/guide/5-limites.md"),
    ).toEqual({ slug: "cable", hash: undefined });
  });

  test("a root-relative path starts at the repository root", () => {
    expect(resolveRepoHref("/docs/simulation-theory.md#s-2", "docs/guide/1-ligne.md")).toEqual({
      path: "docs/simulation-theory.md",
      hash: "s-2",
    });
  });

  test("an external link, a bare fragment or an escape past the root is not a repository path", () => {
    expect(resolveRepoHref("https://example.org/a.md", "docs/guide/1-ligne.md")).toBeNull();
    expect(resolveRepoHref("mailto:a@b.c", "docs/guide/1-ligne.md")).toBeNull();
    expect(resolveRepoHref("#s-1-2", "docs/guide/1-ligne.md")).toBeNull();
    expect(resolveRepoHref("../../../x.md", "docs/guide/1-ligne.md")).toBeNull();
  });

  test("a file the app does not serve is a repository path but no page", () => {
    expect(resolveRepoHref("../references/research-one.md", "docs/guide/5-limites.md")).toEqual({
      path: "docs/references/research-one.md",
      hash: undefined,
    });
    expect(resolveDocHref("../references/research-one.md", "docs/guide/5-limites.md")).toBeNull();
  });
});

describe("every served page", () => {
  test("has a unique slug and a file on disk", () => {
    expect(new Set(DOC_PAGES.map((page) => page.slug)).size).toBe(DOC_PAGES.length);
    const missing = DOC_PAGES.filter((page) => !existsSync(new URL(page.path, ROOT)));
    expect(missing.map((page) => page.path)).toEqual([]);
  });

  test("has unique heading ids — two sections with one number would share a link", () => {
    const duplicated = DOC_PAGES.filter((page) => {
      const ids = anchorsOf(SOURCES.get(page.slug) ?? "");
      return ids.length !== new Set(ids).size;
    });
    expect(duplicated.map((page) => page.path)).toEqual([]);
  });
});

describe("links between pages land on something", () => {
  // The guide and the reference are ours to keep sound; the reports are served verbatim.
  const checked = DOC_PAGES.filter((page) => page.group !== "rapport");

  test("a link to a served page names an existing heading of it", () => {
    const broken: string[] = [];
    for (const page of checked) {
      for (const href of linksOf(SOURCES.get(page.slug) ?? "")) {
        const target = resolveDocHref(href, page.path);
        if (target === null || target.hash === undefined) continue;
        if (!ANCHORS.get(target.slug)?.has(target.hash)) broken.push(`${page.path} → ${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("a link within a page names one of its own headings", () => {
    const broken: string[] = [];
    for (const page of checked) {
      for (const href of linksOf(SOURCES.get(page.slug) ?? "")) {
        if (!href.startsWith("#")) continue;
        if (!ANCHORS.get(page.slug)?.has(href.slice(1))) broken.push(`${page.path} → ${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("a repository path the app does not serve names a file that exists", () => {
    const missing: string[] = [];
    for (const page of checked) {
      for (const href of linksOf(SOURCES.get(page.slug) ?? "")) {
        const resolved = resolveRepoHref(href, page.path);
        if (resolved === null || resolveDocHref(href, page.path) !== null) continue;
        if (!existsSync(new URL(resolved.path, ROOT))) missing.push(`${page.path} → ${href}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("the guide", () => {
  const chapters = docPagesIn("guide").filter((page) => page.slug !== GUIDE_SLUG);
  const sommaire = SOURCES.get(GUIDE_SLUG) ?? "";

  test("is five numbered chapters, each opening on its number", () => {
    expect(chapters.map((page) => page.slug)).toEqual([
      "ligne",
      "statique",
      "securite",
      "dynamique",
      "limites",
    ]);
    expect(chapters.map((page) => anchorsOf(SOURCES.get(page.slug) ?? "")[0])).toEqual(
      chapters.map((_, index) => `s-${index + 1}`),
    );
  });

  test("numbers its sub-chapters N.1, N.2, … in order, with no gap", () => {
    chapters.forEach((page, index) => {
      const subs = anchorsOf(SOURCES.get(page.slug) ?? "").slice(1);
      expect(subs.length).toBeGreaterThan(3);
      expect(subs).toEqual(subs.map((_, i) => `s-${index + 1}-${i + 1}`));
    });
  });

  test("has a sommaire that links every chapter and every sub-chapter", () => {
    const linked = new Set(
      linksOf(sommaire).flatMap((href) => {
        const target = resolveDocHref(href, "docs/guide/README.md");
        return target === null ? [] : [`${target.slug}#${target.hash ?? ""}`];
      }),
    );
    const wanted = chapters.flatMap((page) => [
      `${page.slug}#`,
      ...[...(ANCHORS.get(page.slug) ?? [])].slice(1).map((id) => `${page.slug}#${id}`),
    ]);
    expect(wanted.filter((target) => !linked.has(target))).toEqual([]);
  });

  test("speaks the interface's vocabulary — no word the interface refuses to print", () => {
    // GLOSSARY.md's _Avoid_ lists, as `@/lib/vocabulary/labels.ts` enforces them on screen: the
    // guide explains the interface, so it names things the way the interface does.
    const offences = docPagesIn("guide").flatMap((page) =>
      (SOURCES.get(page.slug) ?? "")
        .split("\n")
        .flatMap((line, index) =>
          proscribedIn(line).map((word) => `${page.path}:${index + 1} « ${word} »`),
        ),
    );
    expect(offences).toEqual([]);
  });

  test("is listed first, and its sommaire is in the « ⋯ » menu", () => {
    expect(DOC_PAGES[0]?.slug).toBe(GUIDE_SLUG);
    expect(MENU_DOC_PAGES.map((page) => page.slug)).toContain(GUIDE_SLUG);
  });
});

/**
 * What was served before #125, frozen: the five slugs, their files, and every section anchor they
 * carried. A reorganisation that renames a slug or renumbers a heading fails here, not in a
 * reader's address bar.
 */
describe("the pages and anchors served before the guide still are", () => {
  const LEGACY: Record<string, { path: string; anchors: readonly string[] }> = {
    modele: {
      path: "docs/simulation-theory.md",
      anchors: [
        "s-0",
        "s-0-1",
        "s-0-2",
        "s-1",
        "s-2",
        "s-2-1",
        "s-3",
        "s-3-1",
        "s-4",
        "s-4-1",
        "s-4-2",
        "s-4-3",
        "s-5",
        "s-5-1",
        "s-5-2",
        "s-5-3",
        "s-5-4",
        "s-6",
        "s-6-1",
        "s-6-2",
        "s-6-3",
        "s-7",
        "s-8",
        "s-8-1",
        "s-8-2",
        "s-8-3",
        "s-8-4",
        "s-9",
        "s-9-1",
        "s-9-2",
        "s-10",
        "s-10-1",
        "s-10-2",
        "s-10-3",
        "s-10-4",
        "s-11",
        "s-12",
        "s-12-1",
        "s-12-2",
        "s-12-3",
        "s-13",
        "s-13-1",
        "s-13-2",
        "s-13-3",
        "s-14",
        "s-15",
        "s-16",
        "s-17",
      ],
    },
    algorithme: {
      path: "docs/references/algo simulation tyrolienne.md",
      anchors: ["s-1", "s-2", "s-3", "s-4", "s-5", "s-6", "s-7", "s-8", "s-9", "s-10"],
    },
    simulation: {
      path: "docs/references/simulation tyrolienne.md",
      anchors: [
        "s-1",
        "s-1-1",
        "s-1-2",
        "s-1-3",
        "s-2",
        "s-2-1",
        "s-2-2",
        "s-3",
        "s-4",
        "s-4-1",
        "s-4-2",
        "s-4-3",
        "s-5",
        "s-6",
        "s-6-1",
        "s-6-2",
        "s-6-3",
        "s-7",
      ],
    },
    cable: {
      path: "docs/references/tyrolienne sur cable.md",
      anchors: ["s-1", "s-2", "s-3", "s-4", "s-5", "s-6", "s-7"],
    },
    corde: {
      path: "docs/references/tyrolienne sur corde.md",
      anchors: ["s-1", "s-2", "s-3", "s-4", "s-5", "s-6"],
    },
  };

  test.each(Object.entries(LEGACY))("/docs/%s still serves the same file", (slug, legacy) => {
    expect(docPage(slug)?.path).toBe(legacy.path);
  });

  test.each(Object.entries(LEGACY))("/docs/%s keeps every section anchor", (slug, legacy) => {
    const anchors = ANCHORS.get(slug as DocSlug) ?? new Set<string>();
    expect(legacy.anchors.filter((id) => !anchors.has(id))).toEqual([]);
  });

  test("the tooltips' § still target the reference", () => {
    expect(THEORY_SLUG).toBe("modele");
  });

  test("every page the « ⋯ » menu listed is still in it", () => {
    const menu = MENU_DOC_PAGES.map((page) => page.slug);
    for (const slug of Object.keys(LEGACY)) expect(menu).toContain(slug);
  });
});
