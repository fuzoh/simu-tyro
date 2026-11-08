/**
 * `refs.ts`'s two promises: a help paragraph splits into segments that reassemble to the input,
 * and every `§` the real help copy carries names a heading that exists in
 * `docs/simulation-theory.md` — so no tooltip link lands on nothing.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  CELL_HELP,
  DEDUCED_HELP,
  FIELD_HELP,
  GRID_HELP,
  QUASI_STATIC_HELP,
  RESULT_HELP,
  TENSION_LIMIT_HELP,
  TIGHTNESS_HELP,
} from "@/lib/rail/help.ts";
import {
  LOAD_COMBINATION_FORMULA,
  NOT_COMPUTED_LINES,
  PROVENANCE_COPY,
} from "@/lib/rail/provenance.ts";

import { headingSection, referencedSections, sectionAnchor, splitHelp } from "./refs.ts";

describe("splitHelp", () => {
  test("keeps the text verbatim around the references", () => {
    const text = "Classe d'usage (§10.4). Voir aussi § 8 et §13.1, EN 12385-4.";
    const segments = splitHelp(text);
    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segments.filter((segment) => segment.kind === "ref")).toEqual([
      { kind: "ref", text: "§10.4", section: "10.4" },
      { kind: "ref", text: "§ 8", section: "8" },
      { kind: "ref", text: "§13.1", section: "13.1" },
    ]);
  });

  test("a paragraph with no reference is one text segment", () => {
    expect(splitHelp("Portée horizontale L.")).toEqual([
      { kind: "text", text: "Portée horizontale L." },
    ]);
  });

  test("a clause of a standard — three levels deep — stays text", () => {
    const text =
      "120 kg attribué à EN 15567-1 §4.1.2 mais introuvable.\n§8.1 · docs/simulation-theory.md";
    expect(referencedSections(text)).toEqual(["8.1"]);
    expect(
      splitHelp(text)
        .map((segment) => segment.text)
        .join(""),
    ).toBe(text);
  });

  test("a trailing period after the number is not part of the section", () => {
    expect(referencedSections("la borne §5.4 refuse.")).toEqual(["5.4"]);
    expect(referencedSections("depuis §13.1. Ensuite")).toEqual(["13.1"]);
  });
});

describe("sectionAnchor / headingSection", () => {
  test("agree on the id a heading gets and the id a reference targets", () => {
    expect(sectionAnchor("10.4")).toBe("s-10-4");
    expect(headingSection("10.4 Use-class gate (C9 resolved)")).toBe("10.4");
    expect(headingSection("10. Safety framework (regulatory — not tunable)")).toBe("10");
    expect(headingSection("F1 — Irvine forward evaluation")).toBeNull();
    expect(headingSection("Z7 — Thermal change of state (§9.1)")).toBeNull();
  });
});

describe("the help and provenance copy against docs/simulation-theory.md", () => {
  const theory = readFileSync(
    new URL("../../../docs/simulation-theory.md", import.meta.url),
    "utf8",
  );
  const headings = new Set(
    theory
      .split("\n")
      .filter((line) => /^#{1,4}\s/.test(line))
      .map((line) => headingSection(line.replace(/^#+\s*/, "")))
      .filter((section): section is string => section !== null),
  );

  const paragraphs: string[] = [
    ...Object.values(FIELD_HELP),
    TIGHTNESS_HELP,
    TENSION_LIMIT_HELP,
    QUASI_STATIC_HELP,
    ...Object.values(DEDUCED_HELP),
    ...Object.values(RESULT_HELP),
    ...Object.values(GRID_HELP),
    ...Object.values(CELL_HELP),
    ...Object.values(PROVENANCE_COPY),
    ...NOT_COMPUTED_LINES,
    LOAD_COMBINATION_FORMULA,
  ];

  test("every § a tooltip cites is a heading of the theory file", () => {
    const missing = new Set<string>();
    for (const paragraph of paragraphs) {
      for (const section of referencedSections(paragraph)) {
        if (!headings.has(section)) missing.add(section);
      }
    }
    expect([...missing]).toEqual([]);
  });

  test("the help copy does reference the theory file — the link is not vacuous", () => {
    const cited = new Set(paragraphs.flatMap((paragraph) => referencedSections(paragraph)));
    expect(cited.size).toBeGreaterThan(5);
  });
});
