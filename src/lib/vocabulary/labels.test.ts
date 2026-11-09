import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";

import { LAYER_LABEL } from "@/lib/chart/copy.ts";
import { dynamiqueLabelTable } from "@/lib/dynamique/copy.ts";
import { peekBadgeLabel, veBadgeLabel } from "@/lib/layout/contract.ts";
import { CELL_LABEL } from "@/lib/rail/cells.ts";
import { RESULT_HELP, TIGHTNESS_HELP } from "@/lib/rail/help.ts";
import { SOLE_CARRIER_LABEL } from "@/lib/rail/results.ts";
import { statiqueLabelTable } from "@/lib/statique/copy.ts";
import { terrainLabelTable } from "@/lib/terrain-page/copy.ts";

import type { LabelId, Register } from "./labels.ts";

import { exactTermsIn, heading, isHiddenTerm, label, LABELS, proscribedIn } from "./labels.ts";

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

describe("#85 — the prétension and the horizontal `H` are two quantities", () => {
  test("the prétension keeps #61's two words, and `H` is « tension horizontale » on Avancé alone", () => {
    expect(label("pretension", "exact")).toBe("prétension");
    expect(label("horizontalTension", "exact")).toBe("tension horizontale");
    expect("hiddenOnTerrain" in LABELS.horizontalTension).toBe(true);
    // GLOSSARY « Tension de pose »: a simplified Page never names `H` with the terrain word.
    expect(label("horizontalTension", "exact")).not.toBe(label("pretension", "terrain"));
  });

  test("the tensioning side is named after the Mise en tension, in both registers", () => {
    expect(label("tensioningSide", "terrain")).toBe(label("tensioningSide", "exact"));
    expect(label("tensioningSide", "exact")).toContain(label("tensioningDevice", "exact"));
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

describe("exactTermsIn — the words a terrain Page may not print (#91)", () => {
  test("catches a renamed quantity's exact wording and a hidden one, plural and capitals included", () => {
    expect(exactTermsIn("Prétension de la ligne")).toEqual(["prétension"]);
    expect(exactTermsIn("Flèche à vide : 6,00 m")).toEqual(["flèche à vide"]);
    expect(exactTermsIn("Choisir un régime de sécurité")).toEqual(["régime de sécurité"]);
    expect(exactTermsIn("Deux terminaisons")).toEqual(["terminaison"]);
    expect(exactTermsIn("FS 3,05")).toEqual(["FS"]);
  });

  test("leaves the terrain words, and a longer word that merely contains one, alone", () => {
    expect(exactTermsIn("Tension de pose, flèche, flèche chargée, garde au sol")).toEqual([]);
    expect(exactTermsIn("Marge exigée")).toEqual([]);
    expect(exactTermsIn("dégradé, reconstruction")).toEqual([]);
  });

  test("isHiddenTerm reads the table's « masqué » flag", () => {
    expect(isHiddenTerm("startMultiplier")).toBe(true);
    expect(isHiddenTerm("termination")).toBe(true);
    expect(isHiddenTerm("pretension")).toBe(false);
    expect(isHiddenTerm("sag")).toBe(false);
  });
});

const SRC = join(import.meta.dirname, "..", "..");

/** The app's own source: no test, no fixture, no generated route tree, no shadcn component. */
function appSources(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "ui" || entry.name === "__fixtures__" ? [] : appSources(path);
    }
    const printed = /\.tsx?$/.test(entry.name) && !/\.(test|bench)\.ts$/.test(entry.name);
    return printed && entry.name !== "routeTree.gen.ts" ? [path] : [];
  });
}

/** The string and template literals of a source, comments skipped — `${}` holes are scanned too. */
function literalsOf(source: string): string[] {
  const found: string[] = [];
  let at = 0;
  while (at < source.length) {
    const char = source[at];
    const next = source[at + 1];
    if (char === "/" && next === "/") {
      while (at < source.length && source[at] !== "\n") at++;
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", at + 2);
      at = end < 0 ? source.length : end + 2;
    } else if (char === '"' || char === "'") {
      // Never past the line: a JSX text's apostrophe opens no string.
      let text = "";
      let end = at + 1;
      while (end < source.length && source[end] !== char && source[end] !== "\n") {
        text += source[end] === "\\" ? source[++end] : source[end];
        end++;
      }
      found.push(text);
      at = end + 1;
    } else if (char === "`") {
      let text = "";
      let end = at + 1;
      while (end < source.length && source[end] !== "`") {
        if (source[end] === "\\") {
          text += source[++end];
          end++;
        } else if (source[end] === "$" && source[end + 1] === "{") {
          found.push(text);
          text = "";
          const start = (end += 2);
          for (let depth = 1; end < source.length && depth > 0; end++) {
            depth += source[end] === "{" ? 1 : source[end] === "}" ? -1 : 0;
          }
          found.push(...literalsOf(source.slice(start, end - 1)));
        } else text += source[end++];
      }
      found.push(text);
      at = end + 1;
    } else at++;
  }
  return found;
}

/**
 * The text between two JSX tags, comments and `{}` holes left out. Every `>` opens a candidate and
 * the next `<` closes it — an arrow's `=>` opens none — so no punctuation of French prose (« ; »,
 * « = ») hides a text from the scan.
 */
function jsxTextOf(source: string): string[] {
  const bare = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{`[\s\S]*?`\}/g, "");
  const found: string[] = [];
  for (let open = bare.indexOf(">"); open >= 0; open = bare.indexOf(">", open + 1)) {
    if (bare[open - 1] === "=") continue;
    let text = "";
    let depth = 0;
    let at = open + 1;
    for (; at < bare.length && depth >= 0; at++) {
      const char = bare[at];
      if (char === "<" && depth === 0) break;
      if (char === "{") depth++;
      else if (char === "}") depth--;
      else if (depth === 0) text += char;
    }
    const prose = text.replace(/\s+/g, " ").trim();
    // An arrow after a generic's `>` (`useState<T>(() => …`) runs into code, never into prose.
    const code = prose.includes("=>");
    if (at < bare.length && depth === 0 && !code && /\p{L}/u.test(prose)) found.push(prose);
  }
  return found;
}

/**
 * A code token, which the word list must not read: a reducer action (« tracé/importé »), a kind
 * (« refuse-usage-interdit »), a path, or one of the two ids that are also words — the `usage` field
 * and the `textile` family. A capital letter or a space makes it prose.
 */
const CODE_TOKEN =
  /^(?:textile|usage|(?:\.{1,2}\/)?\p{Ll}[\p{Ll}\p{N}]*(?:[-/_.][\p{Ll}\p{N}]+)+)$/u;

/**
 * What a source prints: every literal and every JSX text, whatever its length — « Validé » alone is
 * a label. `key=value` is the diagnostic payload's own syntax, not a sentence.
 */
function copyOf(file: string, source: string): string[] {
  const texts = [...literalsOf(source), ...(file.endsWith(".tsx") ? jsxTextOf(source) : [])];
  return texts.filter((text) => !CODE_TOKEN.test(text) && !/\w=\w/.test(text));
}

describe("everything the app prints", () => {
  const files = appSources();
  // The word list is the one place the proscribed words are written down on purpose.
  const printing = files.filter(
    (file) => relative(SRC, file) !== join("lib", "vocabulary", "labels.ts"),
  );

  test("scans the whole app, routes and components included", () => {
    const names = files.map((file) => relative(SRC, file));
    expect(names).toContain(join("routes", "__root.tsx"));
    expect(names).toContain(join("components", "rail", "inputs.tsx"));
    expect(names).toContain(join("lib", "rail", "help.ts"));
    expect(names).not.toContain(join("lib", "vocabulary", "labels.test.ts"));
    // A JSX text that a « ; » runs through: what a scan that cut on punctuation would lose.
    const docsIndex = join(SRC, "routes", "docs.index.tsx");
    expect(copyOf(docsIndex, readFileSync(docsIndex, "utf8"))).toContain(
      "Les « § » des infobulles du simulateur renvoient à la première page. Les autres sont les rapports dont elle a été consolidée ; ils sont servis tels qu'ils figurent dans le dépôt.",
    );
  });

  test("the scanner reads literals, template chunks and JSX text — and no comment, no identifier", () => {
    const source = [
      "// Usage conforme",
      "/* Tracé validé */",
      'const a = "Ligne conforme";',
      "const b = `Montage ${x ? 'textile rigide' : 'ok'} fini`;",
      'const kind = "refuse-usage-interdit";',
      "const c = <p>Ouvrir le tracé</p>;",
    ].join("\n");
    expect(copyOf("sample.tsx", source)).toEqual([
      "Ligne conforme",
      "Montage ",
      "textile rigide",
      "ok",
      " fini",
      "Ouvrir le tracé",
    ]);
  });

  test("a French « ; » or a one-word label hides nothing from the scan", () => {
    const prose = copyOf("sample.tsx", "const p = <p>Un montage validé ; ok</p>;");
    expect(prose.flatMap(proscribedIn)).toEqual(["montage", "validé"]);
    expect(copyOf("sample.ts", 'const a = "Validé";').flatMap(proscribedIn)).toEqual(["validé"]);
    expect(copyOf("sample.tsx", "const a = <p>Total = 3 ; fin</p>;")).toEqual(["Total = 3 ; fin"]);
  });

  test("the accepted blind spots: the ids `textile` and `usage`, and a `key=value` payload", () => {
    // Both words are ids in ninety literals (`family === "textile"`, `name="usage"`), and a scan
    // that read them would flag every comparison. A visible label that is exactly one of them, or
    // prose holding « a=b », therefore passes unseen: the review of a new label catches it.
    expect(copyOf("sample.ts", 'const fam = { ac: "acier", tx: "textile" };')).toEqual(["acier"]);
    expect(copyOf("sample.ts", 'const a = "usage";')).toEqual([]);
    expect(copyOf("sample.ts", 'const a = "un montage a=b";')).toEqual([]);
  });

  test("none of it uses a word the interface never says", () => {
    const offences = printing.flatMap((file) =>
      copyOf(file, readFileSync(file, "utf8")).flatMap((text) =>
        proscribedIn(text).map(
          (word) => `${relative(SRC, file)}: « ${text.slice(0, 60)} » ${word}`,
        ),
      ),
    );
    expect(offences).toEqual([]);
  });
});

describe("the exact register stays on Avancé", () => {
  // Every table the three simplified Pages consume.
  const consumed = [...terrainLabelTable(), ...statiqueLabelTable(), ...dynamiqueLabelTable()];

  test.each([
    "prétension",
    "régime de sécurité",
    "FS",
    "rapport V",
    "terminaison",
    "rendement",
    "majoration au départ",
    "tension horizontale",
    "η",
    "DAF",
  ])("« %s » is caught, and is in no table Terrain, Statique or Dynamique consumes", (term) => {
    expect(exactTermsIn(`une ${term} ici`)).toEqual([term]);
    expect(consumed.filter((copy) => exactTermsIn(copy).includes(term))).toEqual([]);
  });

  test("the symbols that have no wording of their own are caught inside a formula", () => {
    expect(exactTermsIn("Rendement η = 0,9")).toEqual(["rendement", "η"]);
    expect(exactTermsIn("T à vide + DAF · (T chargé − T à vide)")).toEqual(["DAF"]);
  });
});

describe("the glossary and the interface agree", () => {
  const ROOT = join(SRC, "..");
  const glossary = readFileSync(join(ROOT, "GLOSSARY.md"), "utf8").toLocaleLowerCase("fr");
  // The names the glossary defines: its bold terms, French ones inside an entry included.
  const names = [...glossary.matchAll(/\*\*([^*]+)\*\*/g)].map(([, name]) => name);
  // § 1 is the physics vocabulary the glossary says it does not repeat.
  const theory = readFileSync(join(ROOT, "docs", "simulation-theory.md"), "utf8");
  const start = theory.indexOf("## 1. ");
  const physics = theory.slice(start, theory.indexOf("\n## 2.", start)).toLocaleLowerCase("fr");

  const word = (wording: string) =>
    new RegExp(
      `(?<!\\p{L})${wording.toLocaleLowerCase("fr").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\p{L})`,
      "u",
    );
  /** A whole word of the glossary or of §1 — never the inside of a longer word. */
  const mentioned = (wording: string) =>
    word(wording).test(glossary) || word(wording).test(physics);
  /** A term the glossary defines: one of its bold names. */
  const named = (wording: string) => names.some((name) => word(wording).test(name));

  const wordings = [
    ...new Set(IDS.flatMap((id) => REGISTERS.map((register) => label(id, register)))),
  ];

  test.each(wordings)("« %s » is in the glossary or is physics from §1", (wording) => {
    expect(mentioned(wording)).toBe(true);
  });

  test("a wording inside a longer word is not a mention, and prose is not a name", () => {
    expect(mentioned("pent")).toBe(false);
    expect(named("pente")).toBe(false);
    expect(named("Couche pentes")).toBe(true);
    expect(named("passager")).toBe(true);
  });

  // The terms the interface prints outside the vocabulary table — the Avancé read-outs, the results'
  // rows, the coupe's toggles and badge, the Rail's controls — each read off the text that prints it.
  const outsideTable: readonly (readonly [term: string, printedIn: string])[] = [
    ["écart à vide", CELL_LABEL.belowUnloaded],
    ["cas défavorable", SOLE_CARRIER_LABEL],
    ["réserve de tension", RESULT_HELP.reserve],
    ["pilote de tension", TIGHTNESS_HELP],
    ["trajectoire", LAYER_LABEL.trajectory.full],
    ["trajet", LAYER_LABEL.trajectory.short],
    ["ligne hors cadre", veBadgeLabel({ state: "true-scale-clipped", ve: 1 })],
    ["ligne entière", peekBadgeLabel({ peek: "fit", autofit: 2 })],
  ];

  test.each(outsideTable)("« %s » is printed, and is a glossary name", (term, text) => {
    expect(text.toLocaleLowerCase("fr")).toContain(term);
    expect(named(term)).toBe(true);
  });
});
