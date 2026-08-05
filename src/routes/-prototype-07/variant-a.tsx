/**
 * THROWAWAY — Variant A: "chart plein cadre, on tire le passager".
 * Thesis: the profile IS the instrument. No slider at all — the rider marker is the drag
 * handle. Read-outs live in a HUD that overlays the chart, never following the marker.
 */
import { useCallback, useRef, useState } from "react";

import type { Model } from "./use-model.ts";

import { fmt, makePlot } from "./chart-kit.ts";
import {
  Anchors,
  ChordLine,
  ClearanceDim,
  DangerZones,
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

export const NAME = "Plein cadre, passager glissable";

export function VariantA({ model }: { model: Model }) {
  const { ref, width, height } = useSize<HTMLDivElement>();
  const [index, setIndex] = useState(Math.floor(model.steps.length / 2));
  const [dragging, setDragging] = useState(false);
  const [showUnloaded, setShowUnloaded] = useState(true);
  const frame = useFrameMeter(dragging);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const plot = makePlot(width, height, model.scenario.span.L, model.zLo, model.zHi, {
    top: 34,
    right: 24,
    bottom: 30,
    left: 24,
  });
  const rider = model.riderAt(index);
  const danger = rider.clearUnder < 0;

  const toIndex = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const xMetres = (clientX - rect.left - plot.pad.left) / (plot.x.pxPerM || 1);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < model.steps.length; i++) {
        const d = Math.abs(model.steps[i].xD - xMetres);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      setIndex(best);
    },
    [model.steps, plot.pad.left, plot.x.pxPerM],
  );

  return (
    <div className="relative h-svh w-full overflow-hidden bg-white">
      <div ref={ref} className="absolute inset-0">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="touch-none select-none"
          role="slider"
          tabIndex={0}
          aria-label="Position du passager sur le profil"
          aria-valuemin={0}
          aria-valuemax={model.steps.length - 1}
          aria-valuenow={index}
          aria-valuetext={`${rider.step.xD.toFixed(0)} m depuis A`}
          style={{ cursor: dragging ? "grabbing" : "default" }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setDragging(true);
            frame.reset();
            toIndex(e.clientX);
          }}
          onPointerMove={(e) => dragging && toIndex(e.clientX)}
          onPointerUp={() => {
            setDragging(false);
            frame.compute();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setIndex((i) => Math.min(model.steps.length - 1, i + 1));
          }}
        >
          <Defs />
          <XAxis plot={plot} xMax={model.scenario.span.L} />
          <DangerZones
            scenario={model.scenario}
            plot={plot}
            steps={model.steps}
            perStep={model.clearance.perStep}
          />
          <TerrainLayer scenario={model.scenario} plot={plot} />
          <ChordLine scenario={model.scenario} plot={plot} />
          {showUnloaded && <UnloadedCable pts={model.unloadedPts} plot={plot} />}
          <LoadedCable pts={rider.pts} plot={plot} danger={danger} />
          <Anchors scenario={model.scenario} plot={plot} />
          <ClearanceDim rider={rider} plot={plot} hRider={model.scenario.hRider} />
          <RiderGlyph
            rider={rider}
            plot={plot}
            hRider={model.scenario.hRider}
            danger={danger}
            grabbable
          />
          <XAxisLabels plot={plot} xMax={model.scenario.span.L} />
          <VeBadge plot={plot} />
        </svg>
      </div>

      {/* HUD — fixed corner, never follows the marker */}
      <div className="pointer-events-auto absolute top-4 right-4 w-64 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div
          className={`mb-2 rounded px-2 py-1 text-center text-xs font-bold ${
            model.clearance.hMin < 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {model.clearance.hMin < 0 ? "GARDE AU SOL INSUFFISANTE" : "GARDE AU SOL OK"}
        </div>
        <div className="text-[11px] tracking-wide text-stone-500 uppercase">
          Garde sous le passager
        </div>
        <div
          className={`font-mono text-3xl leading-none ${danger ? "text-red-600" : "text-stone-900"}`}
        >
          {fmt.m(rider.clearUnder, 2)}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-stone-500">Garde min (traversée)</dt>
          <dd className="text-right font-mono">{fmt.m(model.clearance.hMin, 2)}</dd>
          <dt className="text-stone-500">T ancrage A</dt>
          <dd className="text-right font-mono">{fmt.daN(rider.step.TA)}</dd>
          <dt className="text-stone-500">T ancrage B</dt>
          <dd className="text-right font-mono">{fmt.daN(rider.step.TB)}</dd>
          <dt className="text-stone-500">Pente locale</dt>
          <dd className="text-right font-mono">{fmt.deg(rider.step.theta)}</dd>
          <dt className="text-stone-500">Position x</dt>
          <dd className="text-right font-mono">{fmt.m(rider.step.xD, 1)}</dd>
          <dt className="text-stone-500">Flèche au passager</dt>
          <dd className="text-right font-mono">{fmt.m(rider.sagAtRider, 2)}</dd>
        </dl>
        <label className="mt-3 flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={showUnloaded}
            onChange={(e) => setShowUnloaded(e.target.checked)}
          />
          Ligne à vide
        </label>
        <p className="mt-2 text-[10px] leading-snug text-stone-400">
          Tirez le passager sur le profil. ← → pour le pas à pas.
        </p>
      </div>

      <PerfChip model={model} frame={frame.stats} scenario={model.scenario} step={setIndex} />
    </div>
  );
}
