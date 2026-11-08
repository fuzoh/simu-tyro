import { describe, expect, test } from "vitest";

import type { LabelId, Register } from "./labels.ts";

import { heading, label, LABELS, proscribedIn } from "./labels.ts";

const REGISTERS = ["terrain", "exact"] as const satisfies readonly Register[];
const IDS = Object.keys(LABELS) as LabelId[];

describe("the two registers", () => {
  test("every entry prints something in both", () => {
    for (const id of IDS) {
      for (const register of REGISTERS) {
        expect(label(id, register).trim(), `${id} / ${register}`).not.toBe("");
      }
    }
  });

  test("no entry says a word the interface never says, in either register", () => {
    const offences = IDS.flatMap((id) =>
      REGISTERS.flatMap((register) =>
        proscribedIn(label(id, register)).map((word) => `${id} / ${register}: ${word}`),
      ),
    );
    expect(offences).toEqual([]);
  });

  test("the guard itself catches each proscribed word, accents and capitals included", () => {
    expect(proscribedIn("Usage")).toEqual(["usage"]);
    expect(proscribedIn("Tracé importé")).toEqual(["tracé"]);
    expect(proscribedIn("Station A")).toEqual(["station"]);
    expect(proscribedIn("Ligne conforme")).toEqual(["conforme"]);
    expect(proscribedIn("Prétension cible")).toEqual(["prétension cible"]);
    expect(proscribedIn("Tension cible")).toEqual(["tension cible"]);
    expect(proscribedIn("Coefficient dynamique")).toEqual(["coeff"]);
    expect(proscribedIn("un pourcentage")).toEqual(["pourcentage"]);
    expect(proscribedIn("Charge du passager")).toEqual(["charge du passager"]);
    expect(proscribedIn("des personnes")).toEqual(["personne"]);
    expect(proscribedIn("Aucune attestation")).toEqual([]);
  });
});

describe("#61's table, row by row", () => {
  // [id, terrain, exact] — the table's two columns, spelled as the resolution comment spells them.
  const TABLE: readonly (readonly [LabelId, string, string])[] = [
    ["line", "ligne", "ligne"],
    ["carryingLines", "Brins porteurs", "Brins porteurs"],
    ["upperLine", "ligne du haut", "ligne du haut"],
    ["lowerLine", "ligne du bas", "ligne du bas"],
    ["rope", "corde", "corde"],
    ["cable", "câble", "câble"],
    ["anchorLine", "ligne A–B", "ligne A–B"],
    ["pretension", "tension de pose", "prétension"],
    ["unstretchedLength", "longueur à vide", "longueur non tendue"],
    ["sag", "flèche", "flèche à vide"],
    ["loadedSag", "flèche chargée", "flèche chargée"],
    ["profile", "profil", "profil"],
    ["distance", "distance", "distance"],
    ["groundClearance", "garde au sol", "garde au sol"],
    ["requiredClearance", "garde exigée", "garde exigée"],
    ["lineClearance", "garde min. ligne", "garde min. ligne"],
    ["riderEnvelope", "gabarit du passager", "gabarit du passager"],
    ["regime", "marge exigée", "régime de sécurité"],
    ["safetyFactor", "facteur de sécurité", "FS"],
    ["startMultiplier", "majoration au départ", "majoration au départ"],
    ["vRatio", "rapport V", "rapport V"],
    ["anchor", "ancrage", "ancrage"],
    ["termination", "terminaison", "terminaison"],
    ["efficiency", "rendement", "rendement"],
    ["constructionFibreCore", "6×19", "6×19"],
    ["constructionIwrc", "6×19 métallique", "6×19 métallique"],
    ["permanentInstallation", "installation permanente", "installation permanente"],
    ["temporaryInstallation", "installation temporaire", "installation temporaire"],
    ["passenger", "passager", "passager"],
    ["elevationDifference", "dénivelé", "dénivelé"],
    ["dans-les-limites", "Dans les limites", "Dans les limites"],
    ["marge-faible", "Marge faible", "Marge faible"],
    ["hors-limites", "Hors limites", "Hors limites"],
    ["refuse-usage-interdit", "Interdit", "Interdit"],
    ["indetermine", "Indéterminé", "Indéterminé"],
  ];

  test.each(TABLE)("%s: terrain « %s », exact « %s »", (id, terrain, exact) => {
    expect(label(id, "terrain")).toBe(terrain);
    expect(label(id, "exact")).toBe(exact);
  });

  test("the words never renamed are one string in both registers", () => {
    for (const id of ["page", "carryingLines", "tensioningDevice", "verdict", "span"] as const) {
      expect(label(id, "terrain")).toBe(label(id, "exact"));
    }
    expect(label("carryingLines", "terrain")).toBe("Brins porteurs");
    expect(label("tensioningDevice", "exact")).toBe("Mise en tension");
    expect(label("verdict", "exact")).toBe("Verdict");
    expect(label("span", "exact")).toBe("portée");
  });

  test("what #61 marks « masqué » is flagged, and a quantity a Page shows is not", () => {
    const hidden = IDS.filter((id) => "hiddenOnTerrain" in LABELS[id]);
    for (const shown of [
      "pretension",
      "regime",
      "safetyFactor",
      "sag",
      "passenger",
      "span",
    ] as const) {
      expect(hidden).not.toContain(shown);
    }
    for (const masked of [
      "vRatio",
      "termination",
      "efficiency",
      "startMultiplier",
      "grade",
    ] as const) {
      expect(hidden).toContain(masked);
    }
  });
});

describe("heading", () => {
  test("capitalises the first letter and leaves symbols and digits alone", () => {
    expect(heading("pretension", "exact")).toBe("Prétension");
    expect(heading("pretension", "terrain")).toBe("Tension de pose");
    expect(heading("safetyFactor", "exact")).toBe("FS");
    expect(heading("constructionFibreCore", "exact")).toBe("6×19");
    expect(heading("refuse-usage-interdit", "exact")).toBe("Interdit");
  });
});
