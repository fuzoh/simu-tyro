/**
 * The refusal page's French copy — « v1 build spec » § 8 (*La page de refus — HTTP 200 après une
 * frame de Skeleton*), as [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)
 * leaves it: the mechanism changed from a throw to a rendered marker, **the copy did not**.
 *
 * Two constraints the wording carries, and they are the reason this is a table and not four
 * strings inlined in a component:
 *
 * - **It names the link, never the app or the network.** No « erreur de chargement », no
 *   « échec » — nothing failed to load, the status line says 200, and the copy has to agree with
 *   it. That agreement is *why* amendment E kept the 200 and dropped the throw.
 * - **The action is labelled by its effect** (§ 8's invariant 2): « Ouvrir l'application sans ce
 *   lien », never « Ouvrir l'application vide » — the app is not empty, it opens on the first-run
 *   scenario, and promising emptiness would be the one wrong thing to say about the screen that
 *   follows. And **no « ouvrir malgré tout »**: the whole-or-nothing rule forbids offering a
 *   partial read, and `L`/`h` are derived from the terrain, so a trace-less application of an
 *   imported link would fabricate geometry the sender never entered.
 */

import type { LinkRefusal, RefusalKind } from "@/lib/url/schema.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { AVANCE_SETTING, lowerFirst } from "@/lib/rail/fields.ts";
import { REFUSAL_KINDS } from "@/lib/url/schema.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

/** The heading, one sentence, about the **link**. */
export const REFUSAL_TITLE = "Ce lien ne peut pas être ouvert.";

/** The one action, labelled by its effect. There is no second one. */
export const REFUSAL_ACTION = "Ouvrir l'application sans ce lien";

/**
 * § 8's reason lines, one per cause. `version-inconnue` is the only one that quotes what arrived —
 * the others have nothing quotable: an undecodable payload is not something to print at a rigger.
 */
const REASON: Record<RefusalKind, (received: unknown, register: Register) => string> = {
  "version-inconnue": (received) => `Version de schéma inconnue (v = ${format(received)}).`,
  "tracé-illisible": () => "Profil illisible.",
  "tracé-hors-budget": () => "Profil trop volumineux pour cette adresse.",
  "deux-directeurs": (_, register) =>
    `${twoDrivers(register)} : deux valeurs de tension dans le même lien.`,
};

/**
 * The five tension quantities a link may not carry two of, as the Page names them. A simplified
 * Page names the three it shows, and the two only Avancé names (`hiddenOnTerrain`) as one setting
 * of Avancé rather than print the word the Page must not show.
 */
function twoDrivers(register: Register): string {
  if (register === "exact") {
    return `${heading("sag", register)}, ${label("pretension", register)}, ${label("horizontalTension", register)}, ${label("unstretchedLength", register)} et ${label("vRatio", register)}`;
  }
  return `${heading("sag", register)}, ${label("pretension", register)}, ${label("unstretchedLength", register)} et ${lowerFirst(AVANCE_SETTING)}`;
}

/**
 * What arrived, as one printable token. `received` is `unknown` because it comes from `JSON.parse`
 * — a hand-authored `?v={"a":1}` is a possible link — and a raw `[object Object]` in a French
 * sentence is worse than nothing, so anything that is not a primitive is spelled as its JSON.
 */
function format(received: unknown): string {
  if (typeof received === "string") return received;
  if (typeof received === "number" || typeof received === "boolean") return String(received);
  if (received === null || received === undefined) return "absente";
  try {
    return JSON.stringify(received) ?? "absente";
  } catch {
    return "absente";
  }
}

/**
 * The one reason line this refusal renders, under {@link REFUSAL_TITLE} and above
 * {@link REFUSAL_ACTION}.
 *
 * @param refusal amendment E's marker, off `Route.useSearch().refused`.
 * @param register the Page's vocabulary: a refused link is read on the Page it was opened on.
 */
export function refusalReasonLine(refusal: LinkRefusal, register: Register = "exact"): string {
  return REASON[refusal.kind](refusal.received, register);
}

/**
 * Everything the refusal prints in a register, for a Page's label table: the title, the action and
 * one reason line per cause — the one that quotes what arrived is reached with a version.
 */
export function refusalLabelTable(register: Register): readonly string[] {
  return [
    REFUSAL_TITLE,
    REFUSAL_ACTION,
    ...REFUSAL_KINDS.map((kind) => refusalReasonLine({ kind, message: "", received: 3 }, register)),
  ];
}
