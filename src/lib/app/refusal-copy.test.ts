/**
 * § 8's four reason lines, one per refusal cause. Table-driven, because the table *is* the spec:
 * a missing row is a refusal page that says nothing about why.
 */

import { describe, expect, it } from "vitest";

import type { LinkRefusal } from "@/lib/url/schema.ts";

import { REFUSAL_KINDS, salvageSearch } from "@/lib/url/schema.ts";

import { REFUSAL_ACTION, REFUSAL_TITLE, refusalReasonLine } from "./refusal-copy.ts";

const marker = (kind: LinkRefusal["kind"], received: unknown): LinkRefusal => ({
  kind,
  message: "peu importe — la copie française est la ligne de motif, pas ce champ",
  received,
});

describe("§ 8 — the refusal page's copy", () => {
  it("names the link, and never the app or the network", () => {
    expect(REFUSAL_TITLE).toBe("Ce lien ne peut pas être ouvert.");
    for (const kind of REFUSAL_KINDS) {
      const line = refusalReasonLine(marker(kind, 3));
      expect(line).not.toMatch(/erreur de chargement|échec|réseau|serveur/i);
    }
  });

  it("labels the action by its effect, and offers no second one", () => {
    expect(REFUSAL_ACTION).toBe("Ouvrir l'application sans ce lien");
    expect(REFUSAL_ACTION).not.toMatch(/vide|malgré tout/i);
  });

  it("quotes the version that arrived", () => {
    expect(refusalReasonLine(marker("version-inconnue", 3))).toBe(
      "Version de schéma inconnue (v = 3).",
    );
  });

  it("prints a non-primitive `v` as its JSON rather than as « [object Object] »", () => {
    expect(refusalReasonLine(marker("version-inconnue", { a: 1 }))).toBe(
      'Version de schéma inconnue (v = {"a":1}).',
    );
    expect(refusalReasonLine(marker("version-inconnue", undefined))).toBe(
      "Version de schéma inconnue (v = absente).",
    );
  });

  it("has one line per cause, and the three that quote nothing quote nothing", () => {
    expect(refusalReasonLine(marker("tracé-illisible", "p1.zzz"))).toBe("Profil illisible.");
    expect(refusalReasonLine(marker("tracé-hors-budget", "p1.zzz"))).toBe(
      "Profil trop volumineux pour cette adresse.",
    );
    expect(refusalReasonLine(marker("deux-directeurs", ["fl", "lo"]))).toBe(
      "Flèche à vide, prétension, longueur non tendue et rapport V : deux valeurs de tension dans le même lien.",
    );
  });

  it("renders every marker the validator can actually produce", () => {
    // The kinds are not hypothetical: each of these three links makes one, and each must find a
    // line. A fourth kind added without a row would fail to compile, which is the point of keying
    // the table on `RefusalKind`.
    const refusals = [{ v: 3 }, { tr: "p1.!!!" }, { fl: 6, lo: 151 }].map(
      (raw) => salvageSearch(raw).search.refused,
    );
    for (const refusal of refusals) {
      expect(refusal).toBeDefined();
      expect(refusalReasonLine(refusal as LinkRefusal)).toMatch(/\.$/);
    }
  });
});
