/**
 * THROWAWAY — prototype self-check. `bun src/routes/-prototype-07/check.ts`
 * Asserts the prototype solver against docs/simulation-theory.md §15 (F1, Z1–Z5) before
 * the chart is allowed to draw with it. Not a Vitest suite; ticket 03 owns those.
 */
import { evaluateClearance, riderNode, sampleCable, solveSpan, sweep } from "./solver.ts";

let failed = 0;

function near(label: string, got: number, want: number, rel = 1e-3) {
  const err = Math.abs(got - want) / Math.max(Math.abs(want), 1e-9);
  const ok = err <= rel;
  if (!ok) failed++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${label.padEnd(28)} got ${got.toPrecision(6)}  want ${want.toPrecision(6)}  rel ${err.toExponential(2)}`,
  );
}

// --- F1: forward evaluation only (H, V0 given) ---
{
  const st = {
    H: 5000,
    V0: 1000,
    VB: 0,
    TA: 0,
    TB: 0,
    Tmax: 0,
    L0: 100,
    w: 5,
    EA: 1e7,
    P: 0,
    sP: 0,
    iterations: 0,
    residual: 0,
  };
  const pts = sampleCable(st, 1);
  near("F1 x(L0)", pts[2], 97.0329);
  near("F1 z(L0)", pts[3], 24.2392);
}

// --- Z1 ---
{
  const r = solveSpan({ L: 100, h: 0, L0: 100.5, w: 5, EA: 1e7 });
  if (!r.ok) throw new Error("Z1 did not converge");
  near("Z1 H", r.state.H, 1423.94);
  near("Z1 V0", r.state.V0, -251.25);
  near("Z1 VB", r.state.VB, 251.25);
  near("Z1 Tmax", r.state.Tmax, 1445.94);
  const pts = sampleCable(r.state, 2000);
  let zmin = 0;
  let xmin = 0;
  for (let i = 0; i <= 2000; i++) {
    if (pts[2 * i + 1] < zmin) {
      zmin = pts[2 * i + 1];
      xmin = pts[2 * i];
    }
  }
  near("Z1 z_min", zmin, -4.39987);
  near("Z1 x at z_min", xmin, 50.0, 2e-3);
}

// --- Z2 ---
{
  const r = solveSpan({ L: 100, h: 0, L0: 102, w: 10, EA: 1e7 });
  if (!r.ok) throw new Error("Z2 did not converge");
  near("Z2 H", r.state.H, 1442.11);
  near("Z2 V0", r.state.V0, -510);
  near("Z2 TA", r.state.TA, 1529.63);
  const pts = sampleCable(r.state, 2000);
  let zmin = 0;
  for (let i = 0; i <= 2000; i++) zmin = Math.min(zmin, pts[2 * i + 1]);
  near("Z2 z_min", zmin, -8.75376);
}

// --- Z3 (inclined) ---
{
  const r = solveSpan({ L: 120, h: -15, L0: 122, w: 5, EA: 1e7 });
  if (!r.ok) throw new Error("Z3 did not converge");
  near("Z3 H", r.state.H, 1286.38);
  near("Z3 V0", r.state.V0, -468.701);
  near("Z3 VB", r.state.VB, 141.299);
  near("Z3 TA", r.state.TA, 1369.11);
  near("Z3 TB", r.state.TB, 1294.12);
  const pts = sampleCable(r.state, 4000);
  let sag = 0;
  let sagX = 0;
  let zmin = 0;
  for (let i = 0; i <= 4000; i++) {
    const x = pts[2 * i];
    const z = pts[2 * i + 1];
    const chord = (-15 / 120) * x;
    if (chord - z > sag) {
      sag = chord - z;
      sagX = x;
    }
    zmin = Math.min(zmin, z);
  }
  near("Z3 sag below chord", sag, 7.0811);
  near("Z3 sag x", sagX, 59.7, 5e-3);
  near("Z3 z_min - h", zmin - -15, -1.5476, 5e-3);
}

// --- Z4 (mid-span point load, given x_D = 50 -> s_P = L0/2 by symmetry) ---
{
  const r = solveSpan({ L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7, P: 1177, sP: 50.25 });
  if (!r.ok) throw new Error("Z4 did not converge");
  near("Z4 H", r.state.H, 7898.16);
  near("Z4 V0", r.state.V0, -1091.0);
  near("Z4 VB", r.state.VB, 1091.0);
  near("Z4 TA", r.state.TA, 7973.16);
  const node = riderNode(r.state);
  near("Z4 x_D", node.xD, 50.0, 2e-3);
  near("Z4 z_D", node.zD, -5.31434);
}

// --- Z5 (rolling rider, s_D = 60.15) ---
{
  const r = solveSpan({ L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7, P: 1177, sP: 60.15 });
  if (!r.ok) throw new Error("Z5 did not converge");
  near("Z5 H", r.state.H, 7765.67);
  near("Z5 V0", r.state.V0, -973.369);
  const node = riderNode(r.state);
  near("Z5 x_D", node.xD, 59.9578);
  near("Z5 z_D", node.zD, -5.19064);
}

// --- sweep + clearance smoke test and timing ---
{
  const input = { L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7 };
  const sw = sweep(input, 1177, 240);
  console.log(
    `\nsweep: ${sw.steps.length} steps, coverage ${(sw.coverage * 100).toFixed(1)}%, ${sw.ms.toFixed(2)} ms`,
  );
  const cl = evaluateClearance(input, 1177, sw.steps, { kind: "flat", z: -8 }, 2.1, 60);
  console.log(
    `clearance: h_min ${cl.hMin.toFixed(3)} m at x ${cl.atX.toFixed(1)}, contact ${cl.contact}`,
  );

  // p95 of a 1000 m worst-ish case, the ticket-03 worker criterion
  const long = { L: 1000, h: -60, L0: 1006, w: 5.36, EA: 6.9e6 };
  const times: number[] = [];
  for (let i = 0; i < 30; i++) times.push(sweep(long, 1177, 240).ms);
  times.sort((a, b) => a - b);
  console.log(
    `1000 m sweep: p50 ${times[15].toFixed(2)} ms, p95 ${times[Math.floor(0.95 * 30)].toFixed(2)} ms  (criterion: 8 ms)`,
  );
  const iters = sweep(long, 1177, 240);
  console.log(`1000 m coverage ${(iters.coverage * 100).toFixed(1)}%`);
}

console.log(failed === 0 ? "\nALL FIXTURES PASS" : `\n${failed} FIXTURE ASSERTION(S) FAILED`);
