/**
 * The `§` references the help copy carries — « §10.4 », « §5.4 », « § 8 » — and where they point.
 *
 * **Every `§` in `@/lib/rail/help.ts` names a section of `docs/simulation-theory.md`**, the
 * consolidated theory file the engine is built against, which the app serves at `/docs/modele`.
 * This module turns such a reference into an anchor id and splits a help paragraph into text and
 * references, so a component can render the references as links without the copy leaving the
 * data module it lives in.
 *
 * Pure and DOM-free — `refs.test.ts` holds the parsing against the real help strings.
 */

/** A section number as the theory file writes it: `10`, `10.4`, `4.1`. */
export type SectionNumber = `${number}` | `${number}.${number}`;

/** One piece of a help paragraph: prose, or a `§` reference with the section it names. */
export type HelpSegment =
  | { kind: "text"; text: string }
  | { kind: "ref"; text: string; section: SectionNumber };

/**
 * `§10.4` → `s-10-4`. The dot is replaced rather than kept: a dotted id is legal HTML, but it is
 * also a CSS class selector waiting to happen, and the heading ids are what `Link hash` targets.
 */
export function sectionAnchor(section: string): string {
  return `s-${section.replaceAll(".", "-")}`;
}

/**
 * The section number a heading opens with, or `null`. `## 10. Safety framework` → `10`,
 * `### 10.4 Use-class gate (C9 resolved)` → `10.4`, `### F1 — Irvine forward…` → `null`.
 */
export function headingSection(text: string): string | null {
  const match = /^\s*(\d+(?:\.\d+)*)\.?(?:\s|$)/.exec(text);
  return match?.[1] ?? null;
}

/** `§10.4`, `§ 8`, `§13.1` — a section sign, optional thin space, digits with optional dotted subsections. */
const REF = /§\s?(\d+(?:\.\d+)*)/g;

/**
 * The theory file numbers two levels deep and no further. A deeper number — « EN 15567-1 §4.1.2 »
 * in the provenance copy — is a clause of a *standard*, not a section of the file, and is left as
 * text rather than linked to a heading that does not exist.
 */
function isTheorySection(section: string): section is SectionNumber {
  return section.split(".").length <= 2;
}

/**
 * Split a help paragraph on its `§` references. Text between references is kept verbatim, so
 * joining the segments' `text` back together reproduces the input exactly.
 */
export function splitHelp(text: string): HelpSegment[] {
  const segments: HelpSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(REF)) {
    const section = match[1];
    if (section === undefined || !isTheorySection(section)) continue;
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) });
    segments.push({ kind: "ref", text: match[0], section });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/** Every distinct section a help paragraph references, in order of first appearance. */
export function referencedSections(text: string): SectionNumber[] {
  const seen = new Set<SectionNumber>();
  for (const segment of splitHelp(text)) {
    if (segment.kind === "ref") seen.add(segment.section);
  }
  return [...seen];
}
