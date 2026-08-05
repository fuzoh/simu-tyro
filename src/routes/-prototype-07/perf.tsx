/** THROWAWAY — prototype instrumentation. Answers ticket 07 question 6 with numbers. */
import { useState } from "react";

import type { Scenario } from "./scenarios.ts";
import type { Model } from "./use-model.ts";

import { fmt } from "./chart-kit.ts";
import { evaluateClearance, sweep } from "./solver.ts";

function pct(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

export function PerfChip({
  model,
  frame,
  scenario,
  step,
}: {
  model: Model;
  frame: { p50: number; p95: number; n: number };
  scenario: Scenario;
  /** Lets the chip drive the rider itself, one index per animation frame. */
  step?: (index: number) => void;
}) {
  const [bench, setBench] = useState<string | null>(null);
  const [autoDrag, setAutoDrag] = useState<string | null>(null);

  const runAutoDrag = () => {
    if (!step) return;
    const deltas: number[] = [];
    const n = model.steps.length;
    let i = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      step(Math.floor((i / 120) * (n - 1)));
      i++;
      if (i <= 120) requestAnimationFrame(tick);
      else {
        setAutoDrag(
          `auto-drag: frame p50 ${fmt.ms(pct(deltas.slice(1), 0.5))} / p95 ${fmt.ms(pct(deltas.slice(1), 0.95))} (vsync ≈ 16,7)`,
        );
      }
    };
    requestAnimationFrame(tick);
  };

  const run = () => {
    const lines: string[] = [];
    for (const n of [100, 240, 500]) {
      const sweeps: number[] = [];
      const clears: number[] = [];
      for (let i = 0; i < 40; i++) {
        const sw = sweep(scenario.span, scenario.P, n);
        sweeps.push(sw.ms);
        const t0 = performance.now();
        evaluateClearance(
          scenario.span,
          scenario.P,
          sw.steps,
          scenario.terrain,
          scenario.hRider,
          60,
        );
        clears.push(performance.now() - t0);
      }
      lines.push(
        `n=${n}: sweep p50 ${fmt.ms(pct(sweeps, 0.5))} / p95 ${fmt.ms(pct(sweeps, 0.95))} · garde p95 ${fmt.ms(pct(clears, 0.95))} · total p95 ${fmt.ms(pct(sweeps, 0.95) + pct(clears, 0.95))}`,
      );
    }
    setBench(lines.join(" | "));
  };
  return (
    <div className="pointer-events-auto fixed bottom-2 left-2 z-50 rounded-md border border-stone-300 bg-white/95 px-2 py-1 font-mono text-[10px] leading-tight text-stone-600 shadow">
      <div>
        sweep {fmt.ms(model.timings.sweepMs)} · garde {fmt.ms(model.timings.clearanceMs)} ·{" "}
        {model.steps.length} pas · couverture {fmt.pct(model.timings.coverage)}
      </div>
      <div>
        frame p50 {fmt.ms(frame.p50)} / p95 {fmt.ms(frame.p95)} (n={frame.n}) —{" "}
        <button className="underline" onClick={run} type="button">
          bench ×40
        </button>
        {step && (
          <>
            {" · "}
            <button className="underline" onClick={runAutoDrag} type="button">
              auto-drag
            </button>
          </>
        )}
      </div>
      {bench && <div className="text-stone-900">{bench}</div>}
      {autoDrag && <div className="text-stone-900">{autoDrag}</div>}
    </div>
  );
}
