import { describe, expect, test } from "vitest";

import { scenarioFromSearch } from "@/lib/scenario/from-search.ts";

import type { DecodeOnlyFixture } from "./canonical-links.ts";

import {
  canonicalLink,
  completeFromDefaults,
  parseLinkSearch,
  scenarioToSearch,
  validateSearch,
} from "../schema.ts";
import { BRANCHES, CANONICAL_LINKS, DECODE_ONLY_LINKS } from "./canonical-links.ts";

type Encodable = Extract<DecodeOnlyFixture, { canonical: string }>;

function hasEncoding(fixture: DecodeOnlyFixture): fixture is Encodable {
  return fixture.canonical !== null;
}

/** A link as the app reads it: the router's parse, the validator, completion, then the draft. */
function decode(link: string) {
  const completion = completeFromDefaults(validateSearch(parseLinkSearch(link.slice(2))));
  return { completion, scenario: scenarioFromSearch(completion.search) };
}

describe("golden canonical links", () => {
  test("every encoding branch has a pinned link", () => {
    const covered = new Set([...CANONICAL_LINKS, ...DECODE_ONLY_LINKS].flatMap((f) => f.covers));
    expect(BRANCHES.filter((branch) => !covered.has(branch))).toEqual([]);
  });

  test("no two fixtures share a name or a link", () => {
    const all = [...CANONICAL_LINKS, ...DECODE_ONLY_LINKS];
    expect(new Set(all.map((f) => f.name)).size).toBe(all.length);
    const links = CANONICAL_LINKS.map((f) => f.link);
    expect(new Set(links).size).toBe(links.length);
  });

  describe.each(CANONICAL_LINKS.map((f) => [f.name, f] as const))("%s", (_name, fixture) => {
    test("encodes to the pinned string", () => {
      expect(canonicalLink(scenarioToSearch(fixture.scenario))).toBe(fixture.link);
    });

    test("decodes back to the scenario, completing nothing", () => {
      const { completion, scenario } = decode(fixture.link);
      expect(scenario).toEqual(fixture.scenario);
      expect(completion.completed).toEqual([]);
    });
  });

  describe.each(DECODE_ONLY_LINKS.map((f) => [f.name, f] as const))("%s", (_name, fixture) => {
    test("decodes to the scenario", () => {
      expect(decode(fixture.link).scenario).toEqual(fixture.scenario);
    });
  });

  describe.each(DECODE_ONLY_LINKS.filter(hasEncoding).map((f) => [f.name, f] as const))(
    "%s, re-encoded",
    (_name, fixture) => {
      test("the decoded scenario encodes to the canonical link", () => {
        expect(canonicalLink(scenarioToSearch(fixture.scenario))).toBe(fixture.canonical);
      });
    },
  );

  describe.each(
    DECODE_ONLY_LINKS.filter((f) => f.canonical === null).map((f) => [f.name, f] as const),
  )("%s, blanks", (_name, fixture) => {
    test("the link is canonical as written", () => {
      expect(canonicalLink(decode(fixture.link).completion.search)).toBe(fixture.link);
    });
  });
});
