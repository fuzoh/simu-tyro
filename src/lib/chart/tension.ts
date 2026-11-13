/**
 * Avancé's tension graph (#119) — the **internal tension** along the line, at the passager's current
 * position: the ligne à vide and the ligne chargée, against the distance from A. Pure, so a `node`
 * test reaches every number the graph draws; `src/components/chart/tension.tsx` only places them.
 *
 * Rules this module exists to keep:
 *
 * - **Position scope, never Traverse scope.** The loaded curve is the line with the passager where
 *   the Scenario's `x_D` puts it — the same exact §6.1-case-2 solve as the coupe's cable and the
 *   « T anc. A / B » cells ({@link solveRider}) — and not the worst tension over the traverse,
 *   which is the Résultats' and the Verdict's. Nothing here reads the Sweep's steps.
 * - **The physics is the engine's.** `sampleTension` evaluates §2's `T(s) = √(H² + V(s)²)` with
 *   §6.1's piecewise `V(s)`, both sides of the node included; this file never writes `V₀ + w·s`.
 * - **One line, never the sum.** With two Brins porteurs the solved half is one member under `P / 2`
 *   (`SceneBase.P`, the normal 50/50 share), so every value here is **per line** and
 *   {@link TensionProfile.perLine} says so to the copy. Nothing multiplies by the member count.
 * - **The axis starts at zero.** Along one line the tension moves by a few percent of itself; a
 *   baseline fitted to the data would draw that as a cliff, which is the misleading curve the brief
 *   rules out. Ticks step on the strip's 1-2-5 ladder, in the unit the user chose.
 */

import type { HoverLine } from "@/lib/chart/hover.ts";
import type { SceneBase } from "@/lib/chart/scene.ts";
import type { SharedX } from "@/lib/layout/contract.ts";
import type { ForceUnit } from "@/lib/scenario/types.ts";

import { polylineAt, solveRider } from "@/lib/chart/scene.ts";
import { DECIMAL_MARK, formatQuantity, fromDisplay, toDisplay } from "@/lib/format/quantity.ts";
import { niceStep } from "@/lib/layout/contract.ts";
import { sampleTension } from "@/lib/sim";
import { label } from "@/lib/vocabulary/labels.ts";

import { TENSION_COPY } from "./copy.ts";

/**
 * Samples per curve, uniform in the material coordinate, plus the node's two. A drawing
 * resolution like `CABLE_SAMPLES`: the curves are smooth but for the node, which is sampled exactly.
 */
export const TENSION_SAMPLES = 240;

/** One curve: `x` in m from A, increasing (repeated once at a node), `T` in N. */
export type TensionCurve = { readonly xs: Float64Array; readonly Ts: Float64Array };

/** Everything the graph says, before any pixel. */
export type TensionProfile = {
  /** Portée, m — the curves run `[0, L]`; the hover reads nothing outside it. */
  readonly L: number;
  /** The unloaded line's tension, which no passager position moves. */
  readonly unloaded: TensionCurve;
  /**
   * The loaded line's at the passager's position, or `null` when the exact solve refuses there —
   * then the graph draws the unloaded curve alone and says the loaded one is unavailable.
   */
  readonly loaded: TensionCurve | null;
  /** The passager: where it hangs, and the tension on the A side and the B side of the node, N. */
  readonly rider: { readonly xD: number; readonly sideA: number; readonly sideB: number } | null;
  /** Two Brins porteurs: each value is one line's, under the normal 50/50 share — never the sum. */
  readonly perLine: boolean;
};

/**
 * The two curves at the passager's position.
 *
 * @param base the solved half, as the gates leave it — the caller keeps `null` for itself.
 * @param requestedXD the Scenario's `x_D`, clamped into `[0, L]` like the coupe's.
 */
export function tensionProfile(base: SceneBase, requestedXD: number): TensionProfile {
  const unloaded = curveOf(sampleTension(base.unloaded, TENSION_SAMPLES));
  const resolved = solveRider(base, requestedXD);
  const loaded = resolved === null ? null : curveOf(sampleTension(resolved.state, TENSION_SAMPLES));
  return {
    L: base.L,
    unloaded,
    loaded,
    rider: loaded === null || resolved === null ? null : riderOn(loaded, resolved.step.xD),
    perLine: base.members.length > 1,
  };
}

/** `sampleTension`'s interleaved pairs, split. */
function curveOf(interleaved: Float64Array): TensionCurve {
  const count = interleaved.length / 2;
  const xs = new Float64Array(count);
  const Ts = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    xs[i] = interleaved[2 * i];
    Ts[i] = interleaved[2 * i + 1];
  }
  return { xs, Ts };
}

/**
 * The node's two pairs, read off the sampled curve: the one place its `x` repeats. Falls back to
 * the curve's value at `x_D` on both sides should no `x` repeat — a node that `sampleTension` did
 * not emit is a node it was not given.
 */
function riderOn(curve: TensionCurve, xD: number): NonNullable<TensionProfile["rider"]> {
  const { xs, Ts } = curve;
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] === xs[i - 1]) return { xD: xs[i], sideA: Ts[i - 1], sideB: Ts[i] };
  }
  const T = polylineAt({ xs, zs: Ts }, xD);
  return { xD, sideA: T, sideB: T };
}

/** A curve's tension at `x`: the A side before the node, the B side from it on. */
export function curveAt(curve: TensionCurve, x: number): number {
  return polylineAt({ xs: curve.xs, zs: curve.Ts }, x);
}

/** A pixel point, and a path through them. */
export type PxPoint = readonly [number, number];

/** One y tick: where it reads, where its 9 px label's baseline sits, and the label. */
export type TensionTick = { readonly y: number; readonly baseline: number; readonly text: string };

/** What the SVG draws, in its own user units. */
export type TensionScene = {
  readonly height: number;
  /** The plot's top and bottom edges — bottom is zero tension. */
  readonly plot: { readonly top: number; readonly bottom: number };
  readonly unloaded: readonly PxPoint[];
  readonly loaded: readonly PxPoint[] | null;
  /** The passager's rule and the node's two dots. */
  readonly rider: { readonly x: number; readonly sideA: number; readonly sideB: number } | null;
  /** Zero first, then up the ladder. The unit is the axis's name's, above the plot. */
  readonly ticks: readonly TensionTick[];
  /** The two anchors' columns. */
  readonly anchors: readonly [number, number];
};

/** The caption row above the plot, px. */
export const TENSION_TOP = 22;
/** Under the plot: the x ticks' row and the x axis's name, px. */
export const TENSION_BOTTOM = 40;
/** A 9 px label's baseline below the pixel it reads, so the glyphs are centred on it. */
const TICK_CENTRED = 3;
/** The zero label's baseline above the zero line, so the line passes under the glyph. */
const ZERO_ABOVE = 2;
/** Steps the ladder aims for between zero and the top. */
const TENSION_STEPS = 5;

/**
 * The y axis: `[0, top]` with `top` a whole number of 1-2-5 steps **in the display unit**, so
 * « 200 daN » and « 2 kN » are both round. Returned in N, with each tick's label.
 */
export function tensionAxis(
  maxTension: number,
  unit: ForceUnit,
): { readonly top: number; readonly ticks: readonly { value: number; text: string }[] } {
  const shownMax = toDisplay("Tstatic", maxTension, unit);
  const step = niceStep(shownMax > 0 ? shownMax / TENSION_STEPS : 1);
  const steps = Math.max(1, Math.ceil(shownMax / step - 1e-9));
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const ticks = Array.from({ length: steps + 1 }, (_, i) => {
    const shown = i * step;
    const digits = shown.toFixed(decimals).replace(".", DECIMAL_MARK);
    return { value: fromDisplay("Tstatic", shown, unit), text: digits };
  });
  return { top: fromDisplay("Tstatic", steps * step, unit), ticks };
}

/**
 * Every pixel of the graph.
 *
 * @param x the coupe's own `SharedX`, so the graph's columns stand under the coupe's.
 * @param height {@link tensionChartHeight} at this width.
 */
export function tensionScene(
  profile: TensionProfile,
  x: SharedX,
  height: number,
  unit: ForceUnit,
): TensionScene {
  const top = TENSION_TOP;
  const bottom = height - TENSION_BOTTOM;
  let max = 0;
  for (const curve of [profile.unloaded, profile.loaded]) {
    if (curve !== null) for (const T of curve.Ts) if (T > max) max = T;
  }
  const axis = tensionAxis(max, unit);
  const y = (T: number) => bottom - (T / axis.top) * (bottom - top);
  const path = (curve: TensionCurve) =>
    Array.from(curve.xs, (metres, i): PxPoint => [x.x(metres), y(curve.Ts[i])]);

  return {
    height,
    plot: { top, bottom },
    unloaded: path(profile.unloaded),
    loaded: profile.loaded === null ? null : path(profile.loaded),
    rider:
      profile.rider === null
        ? null
        : {
            x: x.x(profile.rider.xD),
            sideA: y(profile.rider.sideA),
            sideB: y(profile.rider.sideB),
          },
    ticks: axis.ticks.map((tick, i) => {
      const at = y(tick.value);
      return {
        y: at,
        baseline: i === 0 ? at - ZERO_ABOVE : at + TICK_CENTRED,
        text: tick.text,
      };
    }),
    anchors: [x.x(0), x.x(profile.L)],
  };
}

/**
 * What the hover reads at `metres`: the distance, the unloaded line's tension and the loaded
 * line's — both sides of the node when the pointer is on the passager. `null` off the span, where
 * there is no line to read.
 *
 * @param reach how close to the passager, m, still counts as on it — the coupe's pick radius.
 */
export function tensionLines(
  profile: TensionProfile,
  metres: number,
  unit: ForceUnit,
  reach: number,
): readonly HoverLine[] | null {
  if (!(metres >= 0 && metres <= profile.L)) return null;
  const force = (T: number) => formatQuantity("Tstatic", T, unit);
  const lines: HoverLine[] = [
    { label: label("distance", "exact"), value: formatQuantity("extremumX", metres) },
    { label: label("unloadedLine", "exact"), value: force(curveAt(profile.unloaded, metres)) },
  ];
  const { loaded, rider } = profile;
  if (loaded !== null && rider !== null && Math.abs(metres - rider.xD) <= reach) {
    lines.push(
      { label: TENSION_COPY.sideA, value: force(rider.sideA) },
      { label: TENSION_COPY.sideB, value: force(rider.sideB) },
    );
  } else if (loaded !== null) {
    lines.push({ label: label("loadedLine", "exact"), value: force(curveAt(loaded, metres)) });
  }
  if (profile.perLine) lines.push({ label: TENSION_COPY.perLineShort, value: "" });
  return lines;
}
