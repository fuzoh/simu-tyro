/**
 * THROWAWAY — one hook that turns a scenario into everything the variants draw.
 * Mirrors ticket 03's `useSweep` seam shape (sync today, async-shaped later) but is not
 * that implementation.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Scenario } from "./scenarios.ts";
import type { ClearanceResult, SpanState, SweepStep } from "./solver.ts";

import {
  evaluateClearance,
  riderNode,
  sampleCable,
  solveAtX,
  solveSpan,
  sweep,
  zGroundAt,
} from "./solver.ts";

const CABLE_SAMPLES = 200;

export type RiderView = {
  step: SweepStep;
  /** Loaded cable for this rider position, sampled analytically. */
  pts: Float64Array;
  /** §11 clearance directly under the rider. */
  clearUnder: number;
  /** §11 worst clearance anywhere on the line, for this rider position. */
  clearWorst: number;
  /** Where that worst clearance sits, metres from A. */
  clearWorstX: number;
  /** Terrain height at the worst point. */
  clearWorstGroundZ: number;
  /** Cable height at the worst point. */
  clearWorstCableZ: number;
  /** True if the cable itself is below terrain somewhere, for this rider position. */
  cableInGround: boolean;
  groundZ: number;
  Tmax: number;
  /** Sag below the anchor chord at the rider. */
  sagAtRider: number;
  /** False when this view came from an exact solve rather than a sweep step. */
  onGrid: boolean;
};

export type Model = {
  scenario: Scenario;
  unloadedPts: Float64Array;
  unloaded: SpanState | null;
  steps: SweepStep[];
  clearance: ClearanceResult;
  zLo: number;
  zHi: number;
  timings: { sweepMs: number; clearanceMs: number; coverage: number; failures: number };
  riderAt: (index: number) => RiderView;
  /** §6.1 case 2 — exact solve at a requested x, for typed input. */
  riderAtX: (x: number) => RiderView | null;
  /** Nearest sweep-step index to a horizontal position. */
  nearestIndex: (x: number) => number;
};

export function useModel(scenario: Scenario): Model {
  return useMemo(() => {
    const { span, P, hRider, terrain } = scenario;
    const unloadedR = solveSpan(span);
    const unloaded = unloadedR.ok ? unloadedR.state : null;
    const unloadedPts = unloaded ? sampleCable(unloaded, CABLE_SAMPLES) : new Float64Array(0);

    const sw = sweep(span, P, 240);
    const t0 = performance.now();
    const clearance = evaluateClearance(span, P, sw.steps, terrain, hRider, 60);
    const clearanceMs = performance.now() - t0;

    // vertical extent: terrain, unloaded cable, deepest loaded cable, rider envelope
    let zLo = Math.min(0, span.h);
    let zHi = Math.max(0, span.h);
    if (terrain.kind === "profile") {
      for (const z of terrain.zs) {
        zLo = Math.min(zLo, z);
        zHi = Math.max(zHi, z);
      }
    } else zLo = Math.min(zLo, terrain.z);
    for (let i = 0; i <= CABLE_SAMPLES; i++) {
      if (unloadedPts.length) zLo = Math.min(zLo, unloadedPts[2 * i + 1]);
    }
    for (const s of sw.steps) zLo = Math.min(zLo, s.zD - hRider);

    const viewFromState = (state: SpanState, onGrid: boolean): RiderView => {
      const node = riderNode(state);
      const pts = sampleCable(state, CABLE_SAMPLES);
      let worst = Number.POSITIVE_INFINITY;
      let worstX = node.xD;
      let worstGround = 0;
      let worstCable = 0;
      let cableInGround = false;
      for (let k = 0; k <= CABLE_SAMPLES; k++) {
        const x = pts[2 * k];
        const z = pts[2 * k + 1];
        const g = zGroundAt(terrain, x);
        if (z - g < 0) cableInGround = true;
        const c = z - g - hRider;
        if (c < worst) {
          worst = c;
          worstX = x;
          worstGround = g;
          worstCable = z;
        }
      }
      const groundZ = zGroundAt(terrain, node.xD);
      const chordZ = (span.h / span.L) * node.xD;
      return {
        step: {
          sD: state.sP,
          xD: node.xD,
          zD: node.zD,
          H: state.H,
          V0: state.V0,
          TA: state.TA,
          TB: state.TB,
          theta: node.theta,
        },
        pts,
        clearUnder: node.zD - groundZ - hRider,
        clearWorst: worst,
        clearWorstX: worstX,
        clearWorstGroundZ: worstGround,
        clearWorstCableZ: worstCable,
        cableInGround,
        groundZ,
        Tmax: Math.max(state.TA, state.TB),
        sagAtRider: chordZ - node.zD,
        onGrid,
      };
    };

    const stateOfStep = (step: SweepStep): SpanState => ({
      H: step.H,
      V0: step.V0,
      VB: 0,
      TA: step.TA,
      TB: step.TB,
      Tmax: Math.max(step.TA, step.TB),
      L0: span.L0,
      w: span.w,
      EA: span.EA,
      P,
      sP: step.sD,
      iterations: 0,
      residual: 0,
    });

    const riderAt = (index: number): RiderView => {
      const i = Math.max(0, Math.min(sw.steps.length - 1, index));
      return viewFromState(stateOfStep(sw.steps[i]), true);
    };

    const riderAtX = (x: number): RiderView | null => {
      const r = solveAtX(span, P, Math.max(0.01, Math.min(span.L - 0.01, x)));
      return r.ok ? viewFromState(r.state, false) : null;
    };

    const nearestIndex = (x: number): number => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < sw.steps.length; i++) {
        const d = Math.abs(sw.steps[i].xD - x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    return {
      scenario,
      unloadedPts,
      unloaded,
      steps: sw.steps,
      clearance,
      zLo,
      zHi,
      timings: {
        sweepMs: sw.ms,
        clearanceMs,
        coverage: sw.coverage,
        failures: sw.failures,
      },
      riderAt,
      riderAtX,
      nearestIndex,
    };
  }, [scenario]);
}

/** Container size, for the SVG viewBox. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 900, height: 420 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

/** Commit-to-commit frame cost while the slider is being dragged. */
export function useFrameMeter(active: boolean) {
  const samples = useRef<number[]>([]);
  const last = useRef(0);
  const [stats, setStats] = useState({ p50: 0, p95: 0, n: 0 });
  useLayoutEffect(() => {
    if (!active) {
      last.current = 0;
      return;
    }
    const now = performance.now();
    if (last.current) {
      samples.current.push(now - last.current);
      if (samples.current.length > 180) samples.current.shift();
    }
    last.current = now;
  });
  const compute = useCallback(() => {
    const s = [...samples.current].sort((a, b) => a - b);
    if (!s.length) return;
    setStats({
      p50: s[Math.floor(s.length * 0.5)],
      p95: s[Math.floor(s.length * 0.95)],
      n: s.length,
    });
  }, []);
  const reset = useCallback(() => {
    samples.current = [];
    setStats({ p50: 0, p95: 0, n: 0 });
  }, []);
  return { stats, compute, reset };
}
