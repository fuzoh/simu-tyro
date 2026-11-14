/**
 * The tables and the comparative report of the experiment (#134), built from solved rows —
 * `docs/simulation-theory.md` §18.6 (what gates a conclusion) and §18.7 (the two conventions,
 * kept in two tables). Everything here is text: no physics, no solve.
 *
 * Rules this module exists to keep:
 *
 * - **The report is generated, never edited.** Every figure it prints is read off the rows; the
 *   prose around the figures states what the experiment is and is not, and does not depend on
 *   them.
 * - **The matrix is read off the rows too.** Lines, geometries, load states, winds, variants and
 *   probe sizes are the ones the rows carry — never a list, an identifier or a count repeated
 *   here. A matrix adjusted in `cases.ts` is tabulated as it was run; a group that holds no row
 *   prints « — », which is not a failure.
 * - **Controls first, and they gate.** If one control fails, the report prints the diagnostic
 *   and stops before any comparison: no conclusion on the physics (§18.6).
 * - **A failed row is listed as a failure** and leaves no difference behind it. It does not stop
 *   the report: the comparison goes on without it, and says how many rows it leaves out.
 * - **No percentage of nothing.** A cell carries a relative difference only where `run.ts` gave
 *   one; a difference under the numerical floor is printed as such, not as a small number — in
 *   the CSV tables it is left empty and flagged.
 * - **A coefficient is printed as it was written**, never rounded to a column's decimals.
 * - **Probes are called probes** — « sonde de sensibilité » — wherever a coefficient is shown.
 * - **The report is French** (the dossier it is archived in is), with decimal commas; the CSV
 *   files are data, with decimal points.
 */

import type { LiftLaw } from "./aero.ts";
import type {
  GeometryCase,
  LineCase,
  LoadState,
  ModelId,
  Sourced,
  Variant,
  WindCase,
} from "./cases.ts";
import type { ControlFamily, ControlRow, MatrixHealth } from "./controls.ts";
import type { Difference, DifferenceKey, Outputs, Row } from "./run.ts";

import {
  AIR_DENSITY,
  coefficientSources,
  distinct,
  french,
  isReference,
  largestProbes,
  list,
  scenarioSources,
} from "./cases.ts";
import { CLOSED_FORM_BAR, matrixHealth } from "./controls.ts";
import { differenceOf, lengthShift, reactionShift, TOLERANCES } from "./run.ts";
import { closureTolerance, SPATIAL } from "./solve.ts";

/** Everything one run of the matrix produced. */
export type Experiment = {
  readonly fixed: readonly Row[];
  readonly pose: readonly Row[];
  readonly controls: readonly ControlRow[];
};

/** A difference from the reference: one of the scalar outputs, or a reaction's vector shift. */
type Metric = DifferenceKey | "reactionA" | "reactionB";

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** A number the French way: decimal comma, a true minus sign, « — » for no value. */
export function fr(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  const text = Math.abs(value).toFixed(digits);
  // A value that rounds to zero carries no sign.
  return (value < 0 && Number(text) !== 0 ? "−" : "") + text.replace(".", ",");
}

/** {@link fr} with an explicit `+` on a positive value. */
export function signed(value: number, digits: number): string {
  const text = fr(value, digits);
  return value > 0 && Number(Math.abs(value).toFixed(digits)) !== 0 ? `+${text}` : text;
}

/** A small or large magnitude as `1,6×10⁻⁹`; an exact zero as `0`. */
export function scientific(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const [mantissa, exponent] = value.toExponential(1).split("e");
  const power = String(Number(exponent))
    .split("")
    .map((digit) => SUPERSCRIPT[digit])
    .join("");
  return `${mantissa.replace(".", ",").replace("-", "−")}×10${power}`;
}

/**
 * One cell of a difference table.
 *
 * @param digits decimals of the absolute difference; one too small to show at that many is
 *   printed in scientific notation rather than as a zero.
 * @param norm the difference is a norm, never negative: printed without a sign.
 * @param unit printed after the absolute difference where the cell stands in a sentence.
 */
export function differenceCell(
  difference: Difference | null,
  digits: number,
  norm = false,
  unit = "",
): string {
  if (difference === null) return "échec";
  if (!difference.resolved) return "< plancher";
  const show = norm ? fr : signed;
  const vanishes = Number(Math.abs(difference.absolute).toFixed(digits)) === 0;
  const absolute =
    (vanishes ? scientific(difference.absolute) : show(difference.absolute, digits)) +
    (unit === "" ? "" : ` ${unit}`);
  if (difference.relative === null) return absolute;
  const percent = 100 * difference.relative;
  return `${absolute} (${Math.abs(percent) < 0.05 ? "< 0,1" : show(percent, 1)} %)`;
}

/** A GitHub-flavoured table. A `|` inside a cell is escaped. */
export function table(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string =>
    `| ${cells.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
}

/** The reference row of every base case of one comparison. */
function referencesOf(rows: readonly Row[]): Map<string, Row> {
  const references = new Map<string, Row>();
  for (const row of rows) {
    if (isReference(row.variant)) references.set(row.base.id, row);
  }
  return references;
}

/** The axes of a comparison as its rows carry them, each in order of first appearance. */
type Axes = {
  readonly lines: readonly LineCase[];
  readonly geometries: readonly GeometryCase[];
  readonly loads: readonly LoadState[];
  readonly winds: readonly WindCase[];
  readonly variants: readonly Variant[];
};

function axesOf(rows: readonly Row[]): Axes {
  const axis = <T extends { readonly id: string }>(pick: (row: Row) => T): T[] => {
    const found = new Map<string, T>();
    for (const row of rows) {
      const item = pick(row);
      if (!found.has(item.id)) found.set(item.id, item);
    }
    return [...found.values()];
  };
  return {
    lines: axis(({ base }) => base.line),
    geometries: axis(({ base }) => base.geometry),
    loads: axis(({ base }) => base.load),
    winds: axis(({ base }) => base.wind),
    variants: axis(({ variant }) => variant),
  };
}

/** The lift laws a comparison runs alone, in order of first appearance. */
const lawsOf = ({ variants }: Axes): LiftLaw[] =>
  distinct(
    variants.filter(({ model }) => model === "normale+portance").map(({ aero }) => aero.liftLaw),
  );

/** The wind speeds of a comparison that blow, m/s. */
const speedsOf = ({ winds }: Axes): number[] =>
  distinct(winds.map(({ speed }) => speed).filter((speed) => speed > 0));

/** The unloaded state of a comparison, or its first when every state carries a rider. */
const unloadedOf = ({ loads }: Axes): LoadState | undefined =>
  loads.find(({ rider }) => !rider) ?? loads[0];

function measure(row: Row, reference: Row | undefined, metric: Metric): Difference | null {
  return metric === "reactionA" || metric === "reactionB"
    ? reactionShift(row, reference, metric)
    : differenceOf(row, reference, metric);
}

/**
 * The difference of greatest magnitude among the rows kept, with the row it was found on.
 * `null` when no kept row has a difference — every one failed, or none was kept.
 */
export function extreme(
  rows: readonly Row[],
  metric: Metric,
  keep: (row: Row) => boolean,
): { readonly difference: Difference; readonly row: Row } | null {
  const references = referencesOf(rows);
  let best: { difference: Difference; row: Row } | null = null;
  for (const row of rows) {
    if (isReference(row.variant) || !keep(row)) continue;
    const difference = measure(row, references.get(row.base.id), metric);
    if (difference === null) continue;
    if (best === null || Math.abs(difference.absolute) > Math.abs(best.difference.absolute)) {
      best = { difference, row };
    }
  }
  return best;
}

/** A family of variants the tables pool: one probe size, both signs of the lift together. */
type Probe = { readonly label: string; readonly keep: (variant: Variant) => boolean };

const LAW_LABEL: Readonly<Record<LiftLaw, string>> = {
  binormal: "binormale",
  "yaw-odd": "impaire en lacet",
};

/** The probes of a comparison, read off its variants — by what each variant is, never by rank. */
type Probes = {
  /** Every probe size: each lift law at each magnitude, each axial drag, the largest crossing. */
  readonly sizes: readonly Probe[];
  /** The largest probe of each added force, alone — what the direction tables show. */
  readonly largest: readonly Probe[];
  /** The greatest and the smallest `|C_L|` run alone. */
  readonly lift: { readonly top: number; readonly low: number };
  /** The greatest and the smallest `C_t` run alone. */
  readonly axial: { readonly top: number; readonly low: number };
};

function probesOf(variants: readonly Variant[]): Probes {
  const of = (model: ModelId): Variant[] => variants.filter((variant) => variant.model === model);
  const lifted = of("normale+portance");
  const dragged = of("normale+axiale");
  const crossed = of("normale+portance+axiale");
  const laws = distinct(lifted.map(({ aero }) => aero.liftLaw));
  const magnitudes = distinct(lifted.map(({ aero }) => Math.abs(aero.lift)));
  const drags = distinct(dragged.map(({ aero }) => aero.axial));
  const lift = { top: Math.max(...magnitudes), low: Math.min(...magnitudes) };
  const axial = { top: Math.max(...drags), low: Math.min(...drags) };

  const liftProbe = (law: LiftLaw, magnitude: number): Probe => ({
    label: `portance ${LAW_LABEL[law]}, C_L = ±${french(magnitude)}`,
    keep: ({ model, aero }) =>
      model === "normale+portance" && aero.liftLaw === law && Math.abs(aero.lift) === magnitude,
  });
  const axialProbe = (drag: number): Probe => ({
    label: `traînée axiale, C_t = ${french(drag)}`,
    keep: ({ model, aero }) => model === "normale+axiale" && aero.axial === drag,
  });
  // The crossing's own largest pair, read off the crossed variants.
  const crossing = {
    lift: Math.max(...crossed.map(({ aero }) => Math.abs(aero.lift))),
    axial: Math.max(...crossed.map(({ aero }) => aero.axial)),
    laws: distinct(crossed.map(({ aero }) => LAW_LABEL[aero.liftLaw])),
  };
  const crossProbe: Probe = {
    label: `portance ${list(crossing.laws)} ±${french(crossing.lift)} et axiale ${french(crossing.axial)}`,
    keep: ({ model, aero }) =>
      model === "normale+portance+axiale" &&
      Math.abs(aero.lift) === crossing.lift &&
      aero.axial === crossing.axial,
  };
  return {
    sizes: [
      ...laws.flatMap((law) => magnitudes.map((magnitude) => liftProbe(law, magnitude))),
      ...drags.map(axialProbe),
      ...(crossed.length > 0 ? [crossProbe] : []),
    ],
    largest: [
      ...laws.map((law) => liftProbe(law, lift.top)),
      ...(drags.length > 0 ? [axialProbe(axial.top)] : []),
    ],
    lift,
    axial,
  };
}

const describe = (row: Row): string =>
  `${row.base.geometry.id}, ${row.base.load.id}, ${row.base.wind.id}, ${row.variant.id}`;

const provenanceTable = (rows: readonly Sourced[]): string =>
  table(
    ["Grandeur", "Valeur", "Provenance", "Source"],
    rows.map(({ name, value, provenance, source }) => [name, value, provenance, source]),
  );

/** § Entrées: every input with its class and its source. */
function inputsSection({ fixed, pose }: Experiment): string {
  const axes = axesOf([...fixed, ...pose]);
  const installation = scenarioSources(axes);
  const coefficients = coefficientSources(axes.variants);
  const lines = axes.lines
    .map(
      (line) => `### ${line.label}

Identifiant \`${line.id}\`. Ce que le solveur consomme : \`w = ${fr(line.material.w, 4)} N/m\`, \`EA = ${fr(line.material.EA / 1000, 2)} kN\`, \`d = ${fr(1000 * line.d, 0)} mm\`.

${provenanceTable(line.inputs)}`,
    )
    .join("\n\n");

  const of = (model: ModelId): Variant[] =>
    axes.variants.filter((variant) => variant.model === model);
  const lawsIn = (model: ModelId): LiftLaw[] => distinct(of(model).map(({ aero }) => aero.liftLaw));
  const ids = (variants: readonly Variant[]): string =>
    variants.map(({ id }) => `\`${id}\``).join(", ");
  // The identifiers are listed, law by law: their format is `cases.ts`'s and is not described here.
  const idsByLaw = (model: ModelId): string =>
    lawsIn(model)
      .map(
        (law) =>
          `loi ${LAW_LABEL[law]} : ${ids(of(model).filter(({ aero }) => aero.liftLaw === law))}`,
      )
      .join(" ; ");
  const crossedLaws = lawsIn("normale+portance+axiale");
  const variants = table(
    ["Modèle", "Variantes", "Identifiants"],
    [
      ["1. traînée normale seule — la référence", String(of("normale").length), ids(of("normale"))],
      [
        "2. normale + portance, les deux signes de chaque sonde",
        String(of("normale+portance").length),
        idsByLaw("normale+portance"),
      ],
      [
        "3. normale + traînée axiale",
        String(of("normale+axiale").length),
        ids(of("normale+axiale")),
      ],
      [
        "4. normale + portance + axiale, chaque sonde de portance croisée avec chaque sonde axiale",
        String(of("normale+portance+axiale").length),
        idsByLaw("normale+portance+axiale"),
      ],
    ],
  );
  const uncrossed = lawsIn("normale+portance")
    .filter((law) => !crossedLaws.includes(law))
    .map(
      (law) =>
        `La loi ${LAW_LABEL[law]} n'est pas recroisée avec la traînée axiale : c'est une sonde d'orientation, et la matrice reste finie.`,
    );
  const bases = new Set(fixed.map(({ base }) => base.id)).size;
  const measured = [
    ...axes.lines.flatMap(({ inputs }) => inputs),
    ...installation,
    ...coefficients,
  ].some(({ provenance }) => provenance === "mesurée");

  return `## 3. Entrées et provenance

Toutes les entrées sont dans \`experiments/spatial-aero-134/cases.ts\` ; en changer une et relancer la commande rejoue tout. Les classes de provenance sont celles du brief — mesurée, publiée non transférable, sonde de sensibilité — plus celles des entrées qui ne sont pas des coefficients.${measured ? "" : " **Aucune entrée de cette matrice n'est classée « mesurée »** : une valeur empruntée à un essai fait sur une autre installation est un scénario, et une valeur calculée à partir d'une fiche n'est pas une donnée de la fiche."}

${lines}

### Installation

${provenanceTable(installation)}

### Coefficients aérodynamiques

${provenanceTable(coefficients)}

**Une sonde de sensibilité n'est ni un intervalle réaliste, ni une borne prudente, ni une valeur par défaut.** Un résultat obtenu avec une sonde dit comment l'équilibre répond *si* le coefficient avait cette valeur, et rien sur le fait qu'il l'ait.

### Matrice

${table(
  ["Axe", "Valeurs"],
  [
    ["Lignes", axes.lines.map(({ id }) => `\`${id}\``).join(", ")],
    ["Géométries", axes.geometries.map(({ id, label }) => `\`${id}\` (${label})`).join(", ")],
    ["États de charge", axes.loads.map(({ id, label }) => `\`${id}\` (${label})`).join(", ")],
    ["Vents", axes.winds.map(({ id }) => `\`${id}\``).join(", ")],
  ],
)}

Soit ${bases} cas de base, chacun sous ${axes.variants.length} variantes de coefficients : ${fixed.length} lignes dans la comparaison principale, ${pose.length} dans la comparaison séparée.

${variants}${uncrossed.length === 0 ? "" : `\n\n${uncrossed.join(" ")}`}`;
}

function healthRows(label: string, health: MatrixHealth, closureBar: number): string[][] {
  const { worst } = health;
  const failed = health.rows - health.statuses.ok;
  return [
    [`${label} — lignes`, String(health.rows), "", ""],
    [`${label} — en échec`, String(failed), "0", failed === 0 ? "oui" : "**non**"],
    ...(
      [
        ["fermeture aux ancrages", worst.closure, closureBar, "m"],
        ["bilan des forces", worst.force, TOLERANCES.force, "N"],
        [
          "bilan des moments, par mètre de ligne A–B",
          worst.momentPerMetre,
          TOLERANCES.momentPerMetre,
          "N·m/m",
        ],
        ["saut au passager", worst.jump, TOLERANCES.force, "N"],
        ["continuité au passager", worst.continuity, TOLERANCES.continuity, "m"],
        ["raffinement, longueurs", worst.refinementLength, TOLERANCES.refinement.length, "m"],
        ["raffinement, forces", worst.refinementForce, TOLERANCES.refinement.force, "N"],
      ] as const
    ).map(([name, found, bar, unit]) => [
      `${label} — pire ${name}`,
      `${scientific(found)} ${unit}`,
      `${scientific(bar)} ${unit}`,
      found <= bar ? "oui" : "**non**",
    ]),
  ];
}

const failedRows = (rows: readonly Row[]): string[][] =>
  rows
    .filter((row) => row.status !== "ok")
    .map((row) => [row.convention, describe(row), row.base.line.id, row.status, row.detail]);

/**
 * What the smallest garde of the two comparisons says: the gabarit clear of the prescribed
 * ground in every row, or how many rows reach it — a contact is said, never implied away.
 */
function clearanceStatement(rows: readonly Row[]): string {
  const gardes = rows.flatMap(({ outputs }) => (outputs === null ? [] : [outputs.clearance]));
  if (gardes.length === 0) return "Aucune ligne n'a d'équilibre : aucune garde n'est lue.";
  const smallest = `Plus petite garde de toute la matrice : ${fr(Math.min(...gardes), 2)} m`;
  const touching = gardes.filter((garde) => !(garde > 0)).length;
  if (touching === 0) {
    return `${smallest} — le gabarit reste au-dessus du sol prescrit dans tous les cas, donc aucune garde lue ici n'est un contact.`;
  }
  return `${smallest} — **le gabarit atteint ou traverse le sol prescrit dans ${touching} ligne${touching > 1 ? "s" : ""} sur ${gardes.length}**. Une garde nulle ou négative est un contact avec le sol du scénario, que l'équilibre calculé ignore : les écarts de ces lignes sont ceux d'une ligne qui traverserait ce sol, pas ceux d'une installation.`;
}

/** § Contrôles: the bars, the controls, the health of both comparisons. */
function controlsSection({ fixed, pose, controls }: Experiment): string {
  const families = [...new Set(controls.map(({ family }) => family))];
  const summary = families.map((family: ControlFamily) => {
    const rows = controls.filter((control) => control.family === family);
    const passed = rows.filter(({ pass }) => pass).length;
    const tightest = Math.max(
      ...rows.map(({ expected, found, bar }) => Math.abs(found - expected) / bar),
    );
    const consumed = !Number.isFinite(tightest)
      ? "—"
      : tightest === 0
        ? "0 %"
        : tightest < 0.001
          ? `${scientific(100 * tightest)} %`
          : `${fr(100 * tightest, 1)} %`;
    return [
      family,
      family === "§15 sans vent" ? "fixtures publiées Z1 à Z5 de §15" : rows[0].source,
      String(rows.length),
      String(passed),
      consumed,
      passed === rows.length ? "oui" : "**non**",
    ];
  });
  const failures = controls
    .filter(({ pass }) => !pass)
    .map(({ family, subject, quantity, unit, expected, found, bar }) => [
      family,
      subject,
      quantity,
      `${scientific(expected)} ${unit}`,
      `${scientific(found)} ${unit}`,
      `${scientific(bar)} ${unit}`,
    ]);
  const failed = [...failedRows(fixed), ...failedRows(pose)];
  const { refinement, floor, percent } = TOLERANCES;
  // §5.3's bar depends on the span beyond 1000 m: the tightest of the geometries run is shown.
  const closureBar = Math.min(
    ...axesOf([...fixed, ...pose]).geometries.map(({ L }) => closureTolerance(L)),
  );

  return `## 4. Contrôles — avant toute lecture d'un écart

Les tolérances sont celles de \`docs/simulation-theory.md\` §18.6, **fixées à partir des contrôles seuls, avant de calculer la moindre différence entre deux modèles aérodynamiques**. Chaque ligne des deux comparaisons est résolue deux fois, à ${SPATIAL.steps} puis ${2 * SPATIAL.steps} pas ; la plus fine est rapportée.

${table(
  ["Vérification", "Tolérance", "Justification"],
  [
    ["fermeture aux ancrages", `${scientific(closureBar)} m`, "§5.3, celle du moteur"],
    [
      "bilan global des forces",
      `${scientific(TOLERANCES.force)} N`,
      "charges ré-intégrées par Simpson, seconde quadrature de ce que RK4 a intégré ; trois ordres sous le plancher des forces",
    ],
    [
      "bilan global des moments en A",
      `${scientific(TOLERANCES.momentPerMetre)} N·m par mètre de ligne A–B`,
      "la tolérance de force fois son bras de levier",
    ],
    ["saut de force au passager", `${scientific(TOLERANCES.force)} N`, "comme le bilan des forces"],
    ["continuité au passager", `${scientific(TOLERANCES.continuity)} m`, "le nœud est partagé"],
    [
      `raffinement, de ${SPATIAL.steps} à ${2 * SPATIAL.steps} pas`,
      `${scientific(refinement.length)} m ; ${scientific(refinement.force)} N`,
      "RK4 est d'ordre 4 : l'écart vaut 15/16 de l'erreur du maillage grossier ; pris sur chaque longueur et chaque force rapportée, les deux réactions comme vecteurs",
    ],
    [
      "retour aux références sans vent",
      `${scientific(TOLERANCES.reference)} relatif`,
      "palier « scalaires résolus » de `docs/conventions/testing.md`",
    ],
    ["formes closes sans poids", `${scientific(CLOSED_FORM_BAR)} relatif`, "elles sont exactes"],
    [
      "plancher de lecture d'un écart",
      `${scientific(floor.length)} m ; ${scientific(floor.force)} N`,
      "dix fois la tolérance de raffinement",
    ],
    [
      "référence minimale pour un pourcentage",
      `${fr(percent.length, 1)} m ; ${fr(percent.force, 0)} N`,
      "en dessous, le pourcentage serait un rapport à presque rien",
    ],
  ],
)}

### Contrôles du prototype

Chaque valeur attendue vient d'ailleurs que du prototype : fixtures publiées de §15, moteur plan, forme close, symétrie. Un contrôle auquel la matrice ne donne aucun cas, ou dont la ligne n'a pas d'équilibre, est en échec — jamais omis. Le détail, grandeur par grandeur, est dans \`results/controls.csv\`.

${table(["Contrôle", "Valeur attendue tirée de", "Grandeurs", "Passées", "Plus grande part de la tolérance consommée", "Passe"], summary)}
${
  failures.length === 0
    ? ""
    : `
**Grandeurs en échec :**

${table(["Contrôle", "Cas", "Grandeur", "Attendu", "Obtenu", "Tolérance"], failures)}
`
}
### État des deux matrices

${table(
  ["Vérification", "Obtenu", "Tolérance", "Passe"],
  [
    ...healthRows("L₀ fixe", matrixHealth(fixed), closureBar),
    ...healthRows("Tension de pose", matrixHealth(pose), closureBar),
  ],
)}

${clearanceStatement([...fixed, ...pose])}

${
  failed.length === 0
    ? "Aucun cas en échec : toutes les lignes des deux comparaisons ont un équilibre vérifié."
    : `**Cas en échec** — ils restent dans les tableaux comme échecs numériques, ne sont pas des impossibilités physiques, et ne donnent aucun écart. Les enveloppes ci-dessous les excluent, donc peuvent sous-estimer un maximum.

${table(["Convention", "Cas", "Ligne", "Statut", "Détail"], failed)}`
}`;
}

/** § Charges distribuées: the three forces in N/m and as a share of the self-weight. */
function loadsSection(fixed: readonly Row[]): string {
  const axes = axesOf(fixed);
  // One case is shown: the last geometry of the matrix, unloaded.
  const geometry = axes.geometries.at(-1);
  const load = unloadedOf(axes);
  const reference = axes.variants.find(isReference);
  // The positive sign of each lift law at its largest probe, then the largest axial drag.
  const shown = largestProbes(axes.variants).filter(({ aero }) => aero.lift >= 0);
  const at = (line: LineCase, wind: WindCase, variant: Variant | undefined): Row | undefined =>
    fixed.find(
      ({ base, variant: candidate }) =>
        base.line.id === line.id &&
        base.geometry.id === geometry?.id &&
        base.load.id === load?.id &&
        base.wind.id === wind.id &&
        candidate.id === variant?.id,
    );
  const level = (row: Row | undefined, pick: (outputs: Outputs) => number, w: number): string => {
    if (row === undefined) return "—";
    if (row.outputs === null) return "échec";
    const value = pick(row.outputs);
    return `${fr(value, 3)} (${fr((100 * value) / w, 1)} %)`;
  };
  const tables = axes.lines
    .map((line) => {
      const { w } = line.material;
      const rows = axes.winds
        .filter(({ speed }) => speed > 0)
        .map((wind) => [
          wind.label,
          level(at(line, wind, reference), ({ normalMean }) => normalMean, w),
          ...shown.map((variant) =>
            level(
              at(line, wind, variant),
              variant.model === "normale+axiale"
                ? ({ axialMean }) => axialMean
                : ({ liftMean }) => liftMean,
              w,
            ),
          ),
        ]);
      return `### ${line.label}

Poids propre \`w = ${fr(w, 3)} N/m\`.

${table(
  [
    "Vent",
    `|f_n|, C_D⊥ = ${french(reference?.aero.normal ?? Number.NaN)}`,
    ...shown.map(({ model, aero }) =>
      model === "normale+axiale"
        ? `|f_a|, sonde C_t = ${french(aero.axial)}`
        : `|f_L| ${LAW_LABEL[aero.liftLaw]}, sonde C_L = ${french(aero.lift)}`,
    ),
  ],
  rows,
)}`;
    })
    .join("\n\n");
  return `## 5. Charges distribuées

Moyenne du module de chaque force sur la longueur tendue, en N/m, et entre parenthèses en part du poids propre de la ligne. Cas montré : ${geometry?.label ?? "—"}, ${load?.label ?? "—"}, à \`L₀\` fixe ; les maxima aux nœuds et les autres cas sont dans \`results/fixed-l0.csv\`. Chaque force est proportionnelle à son coefficient : une sonde cinq fois plus petite donne une charge cinq fois plus petite.

${tables}

La traînée normale est nulle quand le vent est parallèle à la ligne, et c'est là que la traînée axiale est la plus grande : près d'un vent parallèle, le rapport d'une force ajoutée à la traînée normale n'a pas de borne, alors que sa valeur absolue reste celle de la sonde.`;
}

/** The reference's own results, one row per base case. */
function referenceTable(rows: readonly Row[]): string {
  const references = rows.filter((row) => isReference(row.variant));
  return table(
    [
      "Ligne",
      "Géométrie",
      "Charge",
      "Vent",
      "L₀ (m)",
      "T_A (N)",
      "T_max (N)",
      "Flèche (m)",
      "Déport latéral (m)",
      "Écart maximal à A–B (m)",
      "Garde (m)",
    ],
    references.map((row) => {
      const out = row.outputs;
      const value = (pick: number | undefined, digits: number): string =>
        pick === undefined ? row.status : fr(pick, digits);
      return [
        row.base.line.id,
        row.base.geometry.id,
        row.base.load.id,
        row.base.wind.id,
        fr(row.L0, 4),
        value(out?.TA, 1),
        value(out?.Tmax, 1),
        value(out?.sag, 3),
        value(out?.sway, 3),
        value(out?.combined, 3),
        value(out?.clearance, 3),
      ];
    }),
  );
}

const DIFFERENCE_COLUMNS: readonly {
  readonly metric: Metric;
  readonly header: string;
  readonly digits: number;
}[] = [
  { metric: "Tmax", header: "ΔT_max (N)", digits: 1 },
  { metric: "sag", header: "Δflèche (m)", digits: 3 },
  { metric: "sway", header: "Δdéport latéral (m)", digits: 3 },
  { metric: "combined", header: "Δécart maximal à A–B (m)", digits: 3 },
  { metric: "clearance", header: "Δgarde (m)", digits: 3 },
  { metric: "reactionA", header: "‖ΔR_A‖ (N)", digits: 1 },
  { metric: "reactionB", header: "‖ΔR_B‖ (N)", digits: 1 },
];

/**
 * `garde + flèche` when every solved row gives the same sum — a ground parallel to A–B under one
 * gabarit, where the garde is that constant less the flèche and its difference between two
 * models is the flèche's with the opposite sign. `null` as soon as one row differs by more than
 * the numerical floor: the garde then says something the flèche does not.
 */
export function clearanceOffset(rows: readonly Row[]): number | null {
  let offset: number | null = null;
  for (const { outputs } of rows) {
    if (outputs === null) continue;
    const sum = outputs.clearance + outputs.sag;
    offset ??= sum;
    if (!(Math.abs(sum - offset) <= TOLERANCES.floor.length)) return null;
  }
  return offset;
}

/**
 * The difference a table prints for one metric. Where the garde only mirrors the flèche
 * ({@link clearanceOffset}) it loses its percentage: that share would be of a garde the
 * scenario's anchor height sets, and would move with it.
 */
const shownAs = (
  difference: Difference | null,
  metric: Metric,
  mirrored: boolean,
): Difference | null =>
  difference !== null && metric === "clearance" && mirrored
    ? { ...difference, relative: null }
    : difference;

/**
 * One cell of a pooled table. A group that holds no row prints « — »: there is nothing to
 * read, which is not a failure. « échec » is a group whose rows are there and gave no difference.
 */
function cellOf(
  rows: readonly Row[],
  metric: Metric,
  digits: number,
  keep: (row: Row) => boolean,
  mirrored: boolean,
): string {
  if (!rows.some((row) => !isReference(row.variant) && keep(row))) return "—";
  return differenceCell(
    shownAs(extreme(rows, metric, keep)?.difference ?? null, metric, mirrored),
    digits,
    metric === "reactionA" || metric === "reactionB",
  );
}

/**
 * The greatest rise above A–B among the rows kept — a result of the rows, not a difference. The
 * cell keeps the words of the others: « — » is a group that holds no row, « échec » one whose
 * rows are there and none of which passed its checks. Rows that passed and do not leave the
 * floor print « aucune », which is neither.
 */
function riseCell(rows: readonly Row[], keep: (row: Row) => boolean): string {
  const kept = rows.filter(keep);
  if (kept.length === 0) return "—";
  const rises = kept.flatMap(({ status, outputs }) =>
    status === "ok" && outputs !== null ? [outputs.rise] : [],
  );
  if (rises.length === 0) return "échec";
  const rise = Math.max(...rises);
  return rise >= TOLERANCES.floor.length ? fr(rise, 3) : "aucune";
}

/** The response by probe size: per line, probe, speed and load state, pooled over the rest. */
function amplitudeTables(rows: readonly Row[]): string {
  const axes = axesOf(rows);
  const { sizes } = probesOf(axes.variants);
  const mirrored = clearanceOffset(rows) !== null;
  return axes.lines
    .map((line) => {
      const body: string[][] = [];
      for (const probe of sizes) {
        for (const speed of speedsOf(axes)) {
          for (const load of axes.loads) {
            const keep = (row: Row): boolean =>
              row.base.line.id === line.id &&
              row.base.wind.speed === speed &&
              row.base.load.id === load.id &&
              probe.keep(row.variant);
            body.push([
              probe.label,
              `${french(speed)} m/s`,
              load.id,
              ...DIFFERENCE_COLUMNS.map(({ metric, digits }) =>
                cellOf(rows, metric, digits, keep, mirrored),
              ),
              riseCell(rows, keep),
            ]);
          }
        }
      }
      return `#### ${line.label}

${table(["Sonde", "Vent", "Charge", ...DIFFERENCE_COLUMNS.map(({ header }) => header), "Remontée max. (m)"], body)}`;
    })
    .join("\n\n");
}

/** The response wind by wind, at the largest probe of each force. */
function directionTables(rows: readonly Row[]): string {
  const axes = axesOf(rows);
  const { largest } = probesOf(axes.variants);
  const mirrored = clearanceOffset(rows) !== null;
  const columns = DIFFERENCE_COLUMNS.filter(({ metric }) =>
    ["Tmax", "sag", "sway", "clearance"].includes(metric),
  );
  return axes.lines
    .map((line) => {
      const body: string[][] = [];
      for (const wind of axes.winds.filter(({ speed }) => speed > 0)) {
        for (const probe of largest) {
          const keep = (row: Row): boolean =>
            row.base.line.id === line.id && row.base.wind.id === wind.id && probe.keep(row.variant);
          body.push([
            wind.label,
            probe.label,
            ...columns.map(({ metric, digits }) => cellOf(rows, metric, digits, keep, mirrored)),
          ]);
        }
      }
      return `#### ${line.label}

${table(["Vent", "Sonde", ...columns.map(({ header }) => header)], body)}`;
    })
    .join("\n\n");
}

/** How a cell of the pooled tables reads — and, on a ground parallel to A–B, what the garde adds. */
function readingOf(rows: readonly Row[]): string {
  const offset = clearanceOffset(rows);
  const garde =
    offset === null
      ? ""
      : ` Dans toutes les lignes résolues ici, la garde vaut ${french(Number(offset.toFixed(3)))} m moins la flèche — le sol prescrit est parallèle à A–B : \`Δgarde = −Δflèche\`, et la colonne de la garde répète celle de la flèche au signe près. Son pourcentage n'est pas imprimé : il serait la part d'une garde que fixe la hauteur d'ancrage du scénario, et changerait avec elle ; il reste dans les fichiers CSV.`;
  return `Chaque cellule est l'écart au modèle de référence — traînée normale seule, même cas, même convention — **de plus grande valeur absolue** parmi les cas regroupés, avec son signe ; le pourcentage est celui de ce même cas, et n'est donné que si la référence est assez loin de zéro. « < plancher » : aucun écart du groupe ne dépasse le plancher numérique ; « — » : le groupe ne contient aucune ligne. Le déport latéral de référence est nul ou presque par vent presque parallèle : son écart est alors donné en mètres seuls. Les écarts de réaction sont la norme de la différence des vecteurs : une réaction qui tourne sans grandir s'y voit. « Remontée max. » n'est pas un écart : c'est la plus grande hauteur atteinte **au-dessus** de la ligne A–B dans le groupe — la flèche, elle, ne descend pas sous zéro, et une ligne soulevée au-dessus de A–B a une flèche nulle ; « aucune » : aucune ligne du groupe ne remonte au-dessus de la ligne A–B, au plancher numérique près.${garde}`;
}

/** § Comparaison principale. */
function fixedSection(fixed: readonly Row[]): string {
  const axes = axesOf(fixed);
  const lengths = table(
    ["Ligne", "Géométrie", "Tension de pose sans vent (N)", "L₀ (m)"],
    axes.lines.flatMap((line) =>
      axes.geometries.map((geometry) => {
        const row = fixed.find(
          (candidate) =>
            candidate.base.line.id === line.id && candidate.base.geometry.id === geometry.id,
        );
        return [line.id, geometry.id, fr(line.poseTension, 0), fr(row?.L0 ?? Number.NaN, 6)];
      }),
    ),
  );
  return `## 6. Comparaison principale — longueur non tendue identique

**Même installation, mêmes ancrages, mêmes autres entrées : seule la force ajoutée change d'une colonne à l'autre.** Pour chaque ligne et chaque géométrie, \`L₀\` est résolue une fois, par le moteur, sans vent, depuis la tension de pose à l'ancrage A ; elle est ensuite la même pour tous les vents, tous les états de charge et toutes les variantes. Aucune longueur n'est recalculée.

${lengths}

### Résultats de référence — traînée normale seule

${referenceTable(fixed)}

Le déport latéral est signé : positif vers la gauche du sens A → B, donc sous un vent venant de la droite. L'écart maximal à A–B combine, à chaque abscisse, le décalage vertical et le décalage latéral, puis prend le maximum. La garde est verticale, sur le profil extrudé latéralement, gabarit entier retranché : ce n'est pas une garde au sol réel hors de l'axe.

### Écarts par taille de sonde

${readingOf(fixed)} Regroupés ici : toutes les géométries, toutes les directions de vent et les deux signes de portance.

${amplitudeTables(fixed)}

### Écarts vent par vent, aux plus grandes sondes

Regroupés ici : toutes les géométries, tous les états de charge et les deux signes de portance.

${directionTables(fixed)}

Le détail, ligne par ligne, avec chaque composante des réactions, est dans \`results/fixed-l0.csv\` ; les coordonnées d'une sélection de lignes dans \`results/shapes.csv\`.`;
}

/** § Comparaison séparée. */
function poseSection(pose: readonly Row[], fixed: readonly Row[]): string {
  const axes = axesOf(pose);
  const shown = largestProbes(axes.variants);
  const unloaded = unloadedOf(axes);
  const reference = axes.variants.find(isReference);
  const at = (
    line: LineCase,
    geometry: GeometryCase,
    wind: WindCase,
    variant: Variant | undefined,
  ): Row | undefined =>
    pose.find(
      (row) =>
        row.base.line.id === line.id &&
        row.base.geometry.id === geometry.id &&
        row.base.wind.id === wind.id &&
        row.base.load.id === unloaded?.id &&
        row.variant.id === variant?.id,
    );
  const body = axes.lines.flatMap((line) =>
    axes.geometries.flatMap((geometry) =>
      axes.winds
        .filter(({ speed }) => speed > 0)
        .map((wind) => {
          const calm = fixed.find(
            (row) => row.base.line.id === line.id && row.base.geometry.id === geometry.id,
          );
          const from = at(line, geometry, wind, reference);
          // A difference like any other, shown in millimetres: none behind a failed row, none
          // read under the floor.
          const shift = (variant: Variant): string => {
            const row = at(line, geometry, wind, variant);
            if (row === undefined || from === undefined) return "—";
            const found = lengthShift(row, from);
            return differenceCell(found && { ...found, absolute: 1000 * found.absolute }, 1);
          };
          return [
            line.id,
            geometry.id,
            wind.id,
            fr(calm?.L0 ?? Number.NaN, 4),
            fr(from?.L0 ?? Number.NaN, 4),
            ...shown.map(shift),
          ];
        }),
    ),
  );
  return `## 7. Comparaison séparée — tension de pose identique

**Ce tableau n'est pas la comparaison principale et ne s'y mélange pas.** La tension de pose de #127 se lit sur la ligne à vide sous le vent du scénario. Ici, pour chaque ligne, géométrie, vent **et modèle**, l'expérience résout la longueur \`L₀\` à laquelle la ligne à vide lit la même tension totale à l'ancrage A sous ce vent et ce modèle, **rapporte cette longueur**, puis résout la ligne à vide et la ligne chargée à cette longueur. Un modèle qui change la pose décrit une autre installation.

La longueur est cherchée sur la branche tendue, à partir de la longueur sans vent ; une racine trouvée est locale, rien n'affirme qu'elle est unique.

### Longueur de chaque modèle

\`L₀\` sans vent, \`L₀\` du modèle de référence sous le vent, puis écart de \`L₀\` à cette référence pour ${shown.length === 0 ? "aucune variante : la matrice n'a pas de sonde seule" : "la plus grande sonde de chaque force ajoutée, seule"}, en millimètres. « < plancher » : l'écart de longueur est sous le plancher numérique de ${scientific(TOLERANCES.floor.length)} m ; « échec » : la ligne à vide du modèle, ou celle de la référence, n'a pas passé ses vérifications et ne donne aucun écart. Les ${axes.variants.length} variantes sont dans \`results/pose-tension.csv\`.

${table(
  [
    "Ligne",
    "Géométrie",
    "Vent",
    "L₀ sans vent (m)",
    "L₀ référence (m)",
    ...shown.map(({ id }) => `ΔL₀ \`${id}\` (mm)`),
  ],
  body,
)}

### Écarts par taille de sonde, à tension de pose identique

${readingOf(pose)} Regroupés ici : toutes les géométries, toutes les directions de vent et les deux signes de portance. À vide, \`T_A\` est la tension de pose elle-même, identique par construction ; \`T_max\` et les réactions peuvent différer.

${amplitudeTables(pose)}`;
}

/**
 * The overall extremes, per line and per added force: the figures the reading rests on. Each of
 * the three models compared with the reference has its row, so that together they hold every
 * variant of the matrix; the last row is a part of the first two.
 */
function headline(rows: readonly Row[]): string {
  const axes = axesOf(rows);
  const { lift, axial } = probesOf(axes.variants);
  const mirrored = clearanceOffset(rows) !== null;
  const families: readonly Probe[] = [
    { label: "portance, toutes sondes", keep: ({ model }) => model === "normale+portance" },
    { label: "traînée axiale, toutes sondes", keep: ({ model }) => model === "normale+axiale" },
    {
      label: "portance et traînée axiale ensemble, toutes sondes",
      keep: ({ model }) => model === "normale+portance+axiale",
    },
    {
      label: `plus petites sondes (C_L = ±${french(lift.low)}, C_t = ${french(axial.low)})`,
      keep: ({ model, aero }) =>
        (model === "normale+portance" && Math.abs(aero.lift) === lift.low) ||
        (model === "normale+axiale" && aero.axial === axial.low),
    },
  ];
  const columns = DIFFERENCE_COLUMNS.filter(({ metric }) =>
    ["Tmax", "sag", "sway", "clearance"].includes(metric),
  );
  const body = axes.lines.flatMap((line) =>
    families.map((family) => {
      const keep = (row: Row): boolean => row.base.line.id === line.id && family.keep(row.variant);
      return [
        line.id,
        family.label,
        ...columns.map(({ metric, digits }) => {
          const found = extreme(rows, metric, keep);
          return found === null
            ? cellOf(rows, metric, digits, keep, mirrored)
            : `${differenceCell(shownAs(found.difference, metric, mirrored), digits)} — ${describe(found.row)}`;
        }),
        riseCell(rows, keep),
      ];
    }),
  );
  return table(
    ["Ligne", "Force ajoutée", ...columns.map(({ header }) => header), "Remontée max. (m)"],
    body,
  );
}

/**
 * What the lengths do under one added force, in words: the greatest of their differences. Under
 * §18.6's floor it is not a number to print — the tables say « < plancher » of it, and so does
 * this — and where no row gave a difference there is none to read.
 */
function lengthsStatement(differences: readonly (Difference | null)[]): string {
  let most: Difference | null = null;
  for (const found of differences) {
    if (found === null) continue;
    if (most === null || Math.abs(found.absolute) > Math.abs(most.absolute)) most = found;
  }
  if (most === null) return "longueurs : échec";
  if (!most.resolved) return "aucune longueur ne bouge au-dessus du plancher";
  const size = Math.abs(most.absolute);
  const length = Number(size.toFixed(3)) === 0 ? scientific(size) : fr(size, 3);
  return `aucune longueur ne bouge de plus de ${length} m`;
}

/** The headline figures as one sentence per line of the matrix — figures only, no adjective. */
function findings(rows: readonly Row[]): string {
  const axes = axesOf(rows);
  const { lift, axial } = probesOf(axes.variants);
  const mirrored = clearanceOffset(rows) !== null;
  return axes.lines
    .map((line) => {
      const among = (metric: Metric, keep: (variant: Variant) => boolean) =>
        shownAs(
          extreme(rows, metric, (row) => row.base.line.id === line.id && keep(row.variant))
            ?.difference ?? null,
          metric,
          mirrored,
        );
      const liftAt = (magnitude: number): string => {
        const keep = ({ model, aero }: Variant): boolean =>
          model === "normale+portance" && Math.abs(aero.lift) === magnitude;
        const cell = (metric: Metric, digits: number, unit: string): string =>
          differenceCell(among(metric, keep), digits, false, unit);
        return `\`T_max\` ${cell("Tmax", 1, "N")}, flèche ${cell("sag", 3, "m")}, garde ${cell("clearance", 3, "m")}`;
      };
      const dragged = ({ model }: Variant): boolean => model === "normale+axiale";
      const lengths = lengthsStatement(
        (["sag", "sway", "combined", "clearance"] as const).map((metric) => among(metric, dragged)),
      );
      return `- **${line.label}.** Portance, plus grande sonde (\`C_L = ±${french(lift.top)}\`) : ${liftAt(lift.top)}. Plus petite sonde (\`±${french(lift.low)}\`) : ${liftAt(lift.low)}. Traînée axiale (\`C_t\` jusqu'à ${french(axial.top)}) : \`T_max\` ${differenceCell(among("Tmax", dragged), 1, false, "N")} ; ${lengths}.`;
    })
    .join("\n");
}

/** § Lecture, and what stays open. */
function readingSection({ fixed }: Experiment): string {
  const axes = axesOf(fixed);
  const normal = axes.variants.find(isReference)?.aero.normal ?? Number.NaN;
  // What is said of the two orientation laws holds only where both were run.
  const laws = lawsOf(axes);
  const where =
    laws.length > 1
      ? "Les tableaux vent par vent de la section 6 montrent où chaque loi agit, et c'est une propriété des formules : la loi binormale est maximale par vent de travers, la loi impaire en lacet par vent oblique, et près d'un vent parallèle elle dépasse la loi binormale."
      : `Une seule des deux lois d'orientation de §18.3 est jouée ici — la loi ${list(laws.map((law) => LAW_LABEL[law]))} : les tableaux vent par vent de la section 6 montrent où elle agit, pas comment l'autre répondrait.`;
  const choice =
    laws.length > 1
      ? "les deux lois testées répondent différemment selon la direction du vent, et aucune mesure ne permet ici de choisir entre elles"
      : "une seule des deux lois de §18.3 est jouée ici, et aucune mesure ne permet de la préférer à l'autre";
  return `## 8. Lecture

### Les plus grands écarts de la comparaison principale

Écart de plus grande valeur absolue sur toute la matrice à \`L₀\` fixe, avec le cas et la variante où il se produit : pour la portance seule, pour la traînée axiale seule, puis pour les deux ensemble. L'entrée « plus petites sondes » ne retient que la plus petite sonde de chaque force, seule.

${headline(fixed)}

${findings(fixed)}

${where} Inverser le signe de \`C_L\` inverse le sens de l'écart, pas exactement sa taille.

Ce sont des réponses à des **sondes**, dans des **scénarios hypothétiques** : elles disent quels effets *peuvent* déplacer sensiblement un résultat si un coefficient avait la taille de la sonde. Elles ne sont pas une erreur garantie, ni une erreur probable, sur un produit réel. L'expérience ne fixe aucun seuil d'importance : un écart qui se compte en pourcents de la tension ou en décimètres de flèche ou de garde se lit sur les chiffres.

### Trois choses à ne pas confondre

- **Sensibilité numérique.** Les contrôles de la section 4 bornent l'erreur de calcul : tout écart imprimé ci-dessus dépasse un plancher de ${scientific(TOLERANCES.floor.length)} m et ${scientific(TOLERANCES.floor.force)} N, dix fois la tolérance de raffinement, que le doublement du nombre de pas respecte largement. Un écart imprimé est donc un effet de l'hypothèse aérodynamique, pas du pas d'intégration. C'est une propriété du prototype : « résolu » ne veut pas dire « important pour une installation », et ne dit rien de la justesse du modèle.
- **Données manquantes.** Aucun \`C_L\` et aucun \`C_t\` mesuré n'est transférable à un câble 6×19 ou à une corde textile sèche ; \`C_D⊥ = ${french(normal)}\` est lui-même un ordre de grandeur publié pour d'autres corps. Le côté vers lequel la portance pousse et sa dépendance à l'angle de lacet sont des hypothèses : ${choice}. Chaque écart de ce rapport est donc conditionnel.
- **Décision de production encore ouverte.** L'expérience ne justifie ni d'omettre la portance ou la traînée axiale au motif qu'elles seraient négligeables, ni d'adopter l'une de ces sondes comme coefficient. Le choix actuel de #127 — traînée normale seule — reste une convention de modélisation. Omettre les deux autres forces en le nommant comme un manque de donnée, garder des coefficients internes étiquetés non produit, ou attendre une mesure de la construction retenue : c'est une décision du mainteneur.

### Ce que l'expérience ne couvre pas

- Aucune mesure en soufflerie ni sur site ; aucun coefficient propre à un produit.
- Un vent uniforme et horizontal : le profil de §8.4 n'est pas exercé.
- Le passager n'a que son poids : aucune prise au vent, aucun ellipsoïde, aucune inertie de descente.
- Statique seulement : ni vibration, ni détachement tourbillonnaire, ni galop, ni rafale (#124).
- Une garde verticale sur un profil extrudé, pas une garde au sol réel hors de l'axe.
- Les seules installations illustrées de la section 3 : les écarts ne s'extrapolent pas à une autre portée, une autre tension de pose ou un autre vent sans rejouer la matrice.
- Le moteur de production, la traînée de descente (Q12), le Verdict et les facteurs de sécurité ne sont pas modifiés.`;
}

/** The whole report, in French. */
export function buildReport(experiment: Experiment): string {
  const passed = experiment.controls.every(({ pass }) => pass);
  const head = `# Portance et traînée axiale de la ligne — expérience numérique (#134)

> **Rapport généré** par \`bun experiments/spatial-aero-134/matrix.ts\`. Ne pas le modifier à la main : changer les entrées dans \`experiments/spatial-aero-134/cases.ts\` et relancer la commande.

## 1. Ce que ce rapport est

Une **expérience numérique isolée**, demandée par [#134](https://github.com/fuzoh/simu-tyro/issues/134), sous-issue de #127 : comparer, sur les mêmes cas statiques, la traînée normale seule à l'ajout d'une portance et d'une traînée axiale sur la ligne. Son contrat est \`docs/simulation-theory.md\` §18, écrit avant le code.

Ce n'est **pas** le moteur de production : rien sous \`src/\` ne lit le prototype, qui ne remplace aucun solveur. Les coefficients de portance et de traînée axiale sont des **sondes de sensibilité** : ni mesures de produit, ni intervalles réalistes, ni bornes prudentes. Aucun n'est adopté. Ce rapport n'établit ni l'omission définitive d'un effort, ni une validation expérimentale, ni une promesse de sécurité.

## 2. Rejouer

\`\`\`bash
bun experiments/spatial-aero-134/matrix.ts
\`\`\`

La commande résout les deux matrices, lance les contrôles, puis écrit ce rapport et, sous \`experiments/spatial-aero-134/results/\`, \`fixed-l0.csv\`, \`pose-tension.csv\`, \`controls.csv\`, \`inputs.csv\` et \`shapes.csv\`. \`--check\` compare ce qu'elle produirait aux fichiers présents, sans rien écrire. Le mode d'emploi est \`experiments/spatial-aero-134/README.md\`.

### Modèle, en bref

\`\`\`
dF/dS = −q₀            dr/dS = λ·t            λ = 1 + T/EA
q₀  = (0, 0, −w) + λ·(f_n + f_L + f_a)
f_n = ½·ρ·C_D⊥·d·|u_n|·u_n                    traînée normale
f_L = ½·ρ·C_L ·d·|u_n|·(t × u_n)              portance, loi « binormale »
f_L = ½·ρ·C_L ·d· u_t ·(t × u_n)              portance, loi « impaire en lacet »
f_a = ½·ρ·C_t ·d·|u_t|·u_t·t                  traînée axiale
\`\`\`

\`u\` est la vitesse de l'air par rapport à la ligne, \`u_t = u·t\`, \`u_n = u − u_t·t\`, \`ρ = ${fr(AIR_DENSITY, 3)} kg/m³\` ; les trois forces sont par mètre de ligne tendue, sur le diamètre déclaré \`d\`. Le passager est une force ponctuelle prescrite, son poids, identique dans tous les modèles. Directions, signes et méthode numérique : §18.2 à §18.5. Deux points de §18.3 à connaître avant de lire les tableaux :

- **Le signe de \`C_L\` est une hypothèse d'orientation**, pas une propriété connue : chaque amplitude est jouée avec les deux signes, sous ${lawsOf(axesOf(experiment.fixed)).length > 1 ? "deux lois" : "une seule des deux lois"} de dépendance à l'angle de lacet.
- **La traînée axiale suit l'air** : un vent de dos tire la ligne vers B. Les notes archivées du dossier écrivaient le signe opposé ; §18.3 explique la correction, à confirmer par le mainteneur.`;

  if (!passed) {
    return `${head}

${inputsSection(experiment)}

${controlsSection(experiment)}

## 5. Diagnostic — pas de conclusion sur la physique

**Au moins un contrôle du prototype échoue.** Conformément à §18.6, ce rapport s'arrête ici : les tableaux de comparaison ne sont pas imprimés, parce qu'un écart entre deux modèles ne pourrait pas être distingué d'une erreur du prototype. Les lignes résolues restent dans \`results/\` pour le diagnostic ; elles ne sont pas des résultats.
`;
  }
  // The controls gate the comparison; a failed row does not — it is excluded, and said to be.
  const failed = [...experiment.fixed, ...experiment.pose].filter(
    ({ status }) => status !== "ok",
  ).length;
  const verdict =
    failed === 0
      ? "**Tous les contrôles passent.**"
      : `**Tous les contrôles du prototype passent ; ${failed} ligne${failed > 1 ? "s" : ""} en échec, listée${failed > 1 ? "s" : ""} ci-dessus, ${failed > 1 ? "sont exclues" : "est exclue"} des écarts.**`;
  return `${head}

${inputsSection(experiment)}

${controlsSection(experiment)}

${verdict} Les écarts des sections suivantes sont lus entre deux lignes qui ont chacune passé leurs vérifications, et seulement au-dessus du plancher numérique.

${loadsSection(experiment.fixed)}

${fixedSection(experiment.fixed)}

${poseSection(experiment.pose, experiment.fixed)}

${readingSection(experiment)}
`;
}

/** A CSV field: quoted when it holds the delimiter, a quote or a line break. */
function field(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** A CSV number: a decimal point, empty when there is none. Six significant figures by default. */
export const csvNumber = (value: number | null | undefined, figures = 6): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? ""
    : String(Number(value.toPrecision(figures)));

const csv = (header: readonly string[], rows: readonly (readonly string[])[]): string =>
  `${[header, ...rows].map((cells) => cells.map(field).join(",")).join("\n")}\n`;

const ROW_DIFFERENCES: readonly (readonly [Metric, string])[] = [
  ["Tmax", "Tmax_N"],
  ["sag", "fleche_m"],
  ["sway", "deport_m"],
  ["combined", "ecart_max_AB_m"],
  ["clearance", "garde_m"],
  ["reactionA", "RA_N"],
  ["reactionB", "RB_N"],
];

/**
 * One comparison as CSV: every row, its checks, and its differences from the reference.
 *
 * Each difference takes three columns: `ecart_*`, `ecart_relatif_*` and `ecart_resolu_*`. The
 * last says what the first two are — `oui` a difference above §18.6's floor, `non` one under it,
 * whose two numbers are **left empty** because they are numerical noise and not a difference
 * between two models, and empty where there is no difference to take: the reference itself, or
 * a row or a reference that failed.
 */
export function rowsCsv(rows: readonly Row[]): string {
  const references = referencesOf(rows);
  const header = [
    "convention",
    "cas",
    "ligne",
    "geometrie",
    "charge",
    "vent",
    "vitesse_m_s",
    "direction_deg",
    "modele",
    "variante",
    "C_D",
    "C_L",
    "loi_portance",
    "C_t",
    "L0_m",
    "statut",
    "detail",
    "TA_N",
    "TB_N",
    "Tmax_N",
    "HA_N",
    "RAx_N",
    "RAy_N",
    "RAz_N",
    "RBx_N",
    "RBy_N",
    "RBz_N",
    "fleche_m",
    "remontee_m",
    "deport_m",
    "ecart_max_AB_m",
    "garde_m",
    "fn_moyen_N_m",
    "fn_max_N_m",
    "fL_moyen_N_m",
    "fL_max_N_m",
    "fa_moyen_N_m",
    "fa_max_N_m",
    "fermeture_m",
    "bilan_forces_N",
    "bilan_moments_N_m",
    "saut_passager_N",
    "continuite_m",
    "raffinement_m",
    "raffinement_N",
    "iterations",
    ...ROW_DIFFERENCES.flatMap(([, name]) => {
      const quantity = name.replace(/_(N|m)$/, "");
      return [`ecart_${name}`, `ecart_relatif_${quantity}`, `ecart_resolu_${quantity}`];
    }),
  ];
  const body = rows.map((row) => {
    const { base, variant, outputs: out, residuals: res, refinement } = row;
    const reference = references.get(base.id);
    return [
      row.convention,
      base.id,
      base.line.id,
      base.geometry.id,
      base.load.id,
      base.wind.id,
      csvNumber(base.wind.speed),
      csvNumber(base.wind.from),
      variant.model,
      variant.id,
      csvNumber(variant.aero.normal),
      csvNumber(variant.aero.lift),
      variant.aero.lift === 0 ? "" : variant.aero.liftLaw,
      csvNumber(variant.aero.axial),
      csvNumber(row.L0, 9),
      row.status,
      row.detail,
      csvNumber(out?.TA),
      csvNumber(out?.TB),
      csvNumber(out?.Tmax),
      csvNumber(out?.HA),
      ...[0, 1, 2].map((k) => csvNumber(out?.reactionA[k])),
      ...[0, 1, 2].map((k) => csvNumber(out?.reactionB[k])),
      csvNumber(out?.sag),
      csvNumber(out?.rise),
      csvNumber(out?.sway),
      csvNumber(out?.combined),
      csvNumber(out?.clearance),
      csvNumber(out?.normalMean),
      csvNumber(out?.normalMax),
      csvNumber(out?.liftMean),
      csvNumber(out?.liftMax),
      csvNumber(out?.axialMean),
      csvNumber(out?.axialMax),
      csvNumber(res?.closure, 3),
      csvNumber(res?.force, 3),
      csvNumber(res?.moment, 3),
      csvNumber(res?.jump, 3),
      csvNumber(res?.continuity, 3),
      csvNumber(refinement?.length, 3),
      csvNumber(refinement?.force, 3),
      String(row.iterations),
      ...ROW_DIFFERENCES.flatMap(([metric]) => {
        const difference = isReference(variant) ? null : measure(row, reference, metric);
        if (difference === null) return ["", "", ""];
        // Under the floor a difference is not read: no number is written for it.
        if (!difference.resolved) return ["", "", "non"];
        return [csvNumber(difference.absolute), csvNumber(difference.relative, 4), "oui"];
      }),
    ];
  });
  return csv(header, body);
}

/** Every control, quantity by quantity. */
export function controlsCsv(controls: readonly ControlRow[]): string {
  return csv(
    ["controle", "cas", "grandeur", "unite", "attendu", "obtenu", "tolerance", "passe", "source"],
    controls.map(({ family, subject, quantity, unit, expected, found, bar, pass, source }) => [
      family,
      subject,
      quantity,
      unit,
      csvNumber(expected),
      csvNumber(found),
      csvNumber(bar),
      pass ? "oui" : "non",
      source,
    ]),
  );
}

/**
 * Every input of the matrix with its class and its source — the lines, the installation and the
 * coefficients the rows of both comparisons carry, as the report's own section states them.
 */
export function inputsCsv(rows: readonly Row[]): string {
  const axes = axesOf(rows);
  const entries = (subject: string, sourced: readonly Sourced[]): string[][] =>
    sourced.map(({ name, value, provenance, source }) => [
      subject,
      name,
      value,
      provenance,
      source,
    ]);
  return csv(
    ["objet", "grandeur", "valeur", "provenance", "source"],
    [
      ...axes.lines.flatMap((line) => entries(line.id, line.inputs)),
      ...entries("installation", scenarioSources(axes)),
      ...entries("coefficients", coefficientSources(axes.variants)),
    ],
  );
}
