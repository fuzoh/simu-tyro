/**
 * THROWAWAY — Variant C: "profil + courbe de garde".
 * Thesis: the failure the tool exists to reveal deserves its own chart. A second strip below
 * the profile plots h_clear against rider position, so a violation is a curve crossing zero
 * rather than a subtlety in a distorted profile. Slider lives in the left parameter rail with
 * a numeric field for precise positioning; the read-out is a tooltip that follows the rider.
 */
import { useState } from "react";

import type { Model } from "./use-model.ts";

import { affine, fmt, linePath, makePlot, ticks } from "./chart-kit.ts";
import {
  Anchors,
  ChordLine,
  ClearanceDim,
  Defs,
  LoadedCable,
  RiderGlyph,
  TerrainLayer,
  UnloadedCable,
  VeBadge,
  XAxis,
  XAxisLabels,
} from "./marks.tsx";
import { PerfChip } from "./perf.tsx";
import { useFrameMeter, useSize } from "./use-model.ts";

export const NAME = "Profil + courbe de garde, curseur au panneau";

function ClearanceStrip({
  model,
  index,
  width,
  height,
}: {
  model: Model;
  index: number;
  width: number;
  height: number;
}) {
  const pad = { top: 14, right: 16, bottom: 20, left: 16 };
  const L = model.scenario.span.L;
  const values = Array.from(model.clearance.perStep);
  const lo = Math.min(0, ...values) - 0.5;
  const hi = Math.max(1, ...values) + 0.5;
  const x = affine(0, L, pad.left, width - pad.right);
  const y = affine(lo, hi, height - pad.bottom, pad.top);
  const pts = new Float64Array(model.steps.length * 2);
  model.steps.forEach((s, i) => {
    pts[2 * i] = s.xD;
    pts[2 * i + 1] = values[i];
  });
  const path = linePath(pts, {
    width,
    height,
    pad,
    x,
    z: y,
    ve: 1,
    zDomain: [lo, hi],
  });
  const zero = y(0);
  const cur = model.steps[index];
  return (
    <svg width={width} height={height} className="select-none">
      <rect x={0} y={0} width={width} height={height} fill="#fafaf9" />
      {/* below-zero band */}
      <rect
        x={pad.left}
        y={zero}
        width={width - pad.left - pad.right}
        height={Math.max(height - pad.bottom - zero, 0)}
        fill="#fee2e2"
      />
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={zero}
        y2={zero}
        stroke="#dc2626"
        strokeWidth={1}
      />
      {ticks(lo, hi, 3).map((t) => (
        <text key={t} x={4} y={y(t) + 3} className="fill-stone-400 text-[9px]">
          {fmt.num(t, 0)}
        </text>
      ))}
      <path d={path} fill="none" stroke="#0f766e" strokeWidth={2} />
      <line
        x1={x(cur.xD)}
        x2={x(cur.xD)}
        y1={pad.top}
        y2={height - pad.bottom}
        stroke="#0c4a6e"
        strokeWidth={1.5}
      />
      <circle cx={x(cur.xD)} cy={y(values[index])} r={4} fill="#0c4a6e" />
      <text x={pad.left} y={11} className="fill-stone-500 text-[10px]">
        Garde minimale h_clear (m) selon la position du passager
      </text>
    </svg>
  );
}

export function VariantC({ model }: { model: Model }) {
  const main = useSize<HTMLDivElement>();
  const strip = useSize<HTMLDivElement>();
  const [index, setIndex] = useState(Math.floor(model.steps.length / 2));
  const [dragging, setDragging] = useState(false);
  const [layers, setLayers] = useState({ unloaded: false, chord: true });
  const frame = useFrameMeter(dragging);

  const plot = makePlot(main.width, main.height, model.scenario.span.L, model.zLo, model.zHi);
  const rider = model.riderAt(index);
  const danger = rider.clearUnder < 0;
  const pctPos = rider.step.xD / model.scenario.span.L;

  return (
    <div className="flex h-svh w-full bg-white">
      {/* parameter rail */}
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-stone-200 bg-stone-50 p-4 text-sm">
        <h2 className="mb-1 font-semibold">Paramètres</h2>
        <p className="mb-4 text-[11px] leading-snug text-stone-500">{model.scenario.note}</p>

        <div className="mb-4 rounded border border-stone-200 bg-white p-3">
          <div className="mb-1 text-[11px] tracking-wide text-stone-500 uppercase">
            Position du passager
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Number(rider.step.xD.toFixed(1))}
              step={1}
              min={0}
              max={model.scenario.span.L}
              className="w-24 rounded border border-stone-300 px-2 py-1 font-mono text-sm"
              onChange={(e) => {
                const target = Number(e.target.value);
                let best = 0;
                let bestD = Infinity;
                model.steps.forEach((s, i) => {
                  const d = Math.abs(s.xD - target);
                  if (d < bestD) {
                    bestD = d;
                    best = i;
                  }
                });
                setIndex(best);
              }}
            />
            <span className="text-xs text-stone-500">m depuis A</span>
          </div>
          <input
            type="range"
            min={0}
            max={model.steps.length - 1}
            value={index}
            className="mt-3 w-full accent-teal-700"
            onPointerDown={() => {
              setDragging(true);
              frame.reset();
            }}
            onPointerUp={() => {
              setDragging(false);
              frame.compute();
            }}
            onChange={(e) => setIndex(Number(e.target.value))}
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-stone-500">
            <span>A</span>
            <span>{fmt.pct(pctPos)}</span>
            <span>B</span>
          </div>
        </div>

        <h3 className="mb-1 text-[11px] tracking-wide text-stone-500 uppercase">
          Valeurs déduites
        </h3>
        <dl className="mb-4 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-stone-500">L₀</dt>
          <dd className="text-right font-mono">{fmt.m(model.scenario.span.L0, 2)}</dd>
          <dt className="text-stone-500">H à vide</dt>
          <dd className="text-right font-mono">
            {model.unloaded ? fmt.daN(model.unloaded.H) : "—"}
          </dd>
          <dt className="text-stone-500">T max à vide</dt>
          <dd className="text-right font-mono">
            {model.unloaded ? fmt.daN(model.unloaded.Tmax) : "—"}
          </dd>
          <dt className="text-stone-500">T max chargé</dt>
          <dd className="text-right font-mono">{fmt.daN(rider.Tmax)}</dd>
          <dt className="text-stone-500">Garde min</dt>
          <dd className={`text-right font-mono ${model.clearance.hMin < 0 ? "text-red-600" : ""}`}>
            {fmt.m(model.clearance.hMin, 2)}
          </dd>
          <dt className="text-stone-500">Contact</dt>
          <dd className="text-right font-mono">{model.clearance.contact}</dd>
        </dl>

        <h3 className="mb-1 text-[11px] tracking-wide text-stone-500 uppercase">Calques</h3>
        {(
          [
            ["unloaded", "ligne à vide"],
            ["chord", "corde A–B"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={layers[k]}
              onChange={(e) => setLayers((l) => ({ ...l, [k]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </aside>

      {/* charts */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={main.ref} className="relative min-h-0 flex-[3]">
          <svg width={main.width} height={main.height} className="select-none">
            <Defs />
            <XAxis plot={plot} xMax={model.scenario.span.L} />
            <TerrainLayer scenario={model.scenario} plot={plot} />
            {layers.chord && <ChordLine scenario={model.scenario} plot={plot} />}
            {layers.unloaded && <UnloadedCable pts={model.unloadedPts} plot={plot} />}
            <LoadedCable pts={rider.pts} plot={plot} danger={danger} />
            <Anchors scenario={model.scenario} plot={plot} />
            <ClearanceDim
              rider={rider}
              plot={plot}
              hRider={model.scenario.hRider}
              showLabel={false}
            />
            <RiderGlyph rider={rider} plot={plot} hRider={model.scenario.hRider} danger={danger} />
            <XAxisLabels plot={plot} xMax={model.scenario.span.L} />
            <VeBadge plot={plot} />
          </svg>
          {/* tooltip following the rider */}
          <div
            className={`pointer-events-none absolute w-40 -translate-x-1/2 rounded border bg-white/95 p-2 font-mono text-[11px] shadow ${
              danger ? "border-red-500" : "border-stone-300"
            }`}
            style={{
              left: plot.x(rider.step.xD),
              top: Math.max(plot.z(rider.step.zD) - 96, 4),
            }}
          >
            <div className={danger ? "font-bold text-red-600" : "font-bold text-stone-900"}>
              garde {fmt.m(rider.clearUnder, 2)}
            </div>
            <div className="text-stone-600">T {fmt.daN(rider.Tmax)}</div>
            <div className="text-stone-600">pente {fmt.deg(rider.step.theta)}</div>
            <div className="text-stone-600">x {fmt.m(rider.step.xD, 1)}</div>
          </div>
        </div>
        <div ref={strip.ref} className="mb-14 min-h-0 flex-1 border-t border-stone-200">
          <ClearanceStrip model={model} index={index} width={strip.width} height={strip.height} />
        </div>
      </div>

      <PerfChip model={model} frame={frame.stats} scenario={model.scenario} step={setIndex} />
    </div>
  );
}
