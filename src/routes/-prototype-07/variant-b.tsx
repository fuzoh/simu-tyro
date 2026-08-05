/**
 * THROWAWAY — Variant B: "tableau de bord".
 * Thesis: the chart is a picture, the numbers are the instrument. Chart on top, a fixed
 * tabular read-out strip below it, and a wide slider aligned to the plot width. The marker
 * is NOT draggable. Carries the manual vertical-exaggeration control so we can judge
 * whether a user-facing VE selector earns its place in v1.
 */
import { useState } from "react";

import type { Model } from "./use-model.ts";

import { fmt, forceVe, makePlot } from "./chart-kit.ts";
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

export const NAME = "Tableau de bord + curseur sous le graphe";

const VE_CHOICES = [0, 2, 5, 10, 20] as const;

export function VariantB({ model }: { model: Model }) {
  const { ref, width, height } = useSize<HTMLDivElement>();
  const [index, setIndex] = useState(Math.floor(model.steps.length / 2));
  const [dragging, setDragging] = useState(false);
  const [veChoice, setVeChoice] = useState<number>(0);
  const [layers, setLayers] = useState({ unloaded: true, chord: true, danger: true });
  const frame = useFrameMeter(dragging);

  const base = makePlot(width, height, model.scenario.span.L, model.zLo, model.zHi);
  const plot = veChoice === 0 ? base : forceVe(base, veChoice);
  const rider = model.riderAt(index);
  const danger = rider.clearUnder < 0;
  const failing = model.clearance.hMin < 0;

  const cells: Array<[string, string, boolean?]> = [
    ["Garde sous passager", fmt.m(rider.clearUnder, 2), danger],
    ["Garde min traversée", fmt.m(model.clearance.hMin, 2), failing],
    ["T max ancrage", fmt.daN(rider.Tmax)],
    ["H (horizontale)", fmt.daN(rider.step.H)],
    ["Pente locale", fmt.deg(rider.step.theta)],
    ["Flèche au passager", fmt.m(rider.sagAtRider, 2)],
  ];

  return (
    <div className="flex h-svh w-full flex-col bg-stone-50">
      {failing && (
        <div className="flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
          Garde au sol insuffisante — la ligne touche l&apos;enveloppe du passager sur{" "}
          {fmt.m(Math.abs(model.clearance.hMin), 2)} au point x = {fmt.m(model.clearance.atX, 0)}
        </div>
      )}

      <div ref={ref} className="min-h-0 flex-1 bg-white">
        <svg width={width} height={height} className="select-none">
          <Defs />
          <XAxis plot={plot} xMax={model.scenario.span.L} />
          {layers.danger && (
            <DangerZones
              scenario={model.scenario}
              plot={plot}
              steps={model.steps}
              perStep={model.clearance.perStep}
            />
          )}
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
          <VeBadge plot={plot} extra={veChoice === 0 ? "auto-ajustée" : "manuelle"} />
        </svg>
      </div>

      {/* slider aligned with the plot area */}
      <div className="border-t border-stone-200 bg-white px-4 py-3">
        <div style={{ marginLeft: plot.pad.left, marginRight: plot.pad.right }}>
          <input
            type="range"
            min={0}
            max={model.steps.length - 1}
            value={index}
            className="w-full accent-sky-700"
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
          <div className="flex justify-between font-mono text-[11px] text-stone-500">
            <span>0 m</span>
            <span className="font-semibold text-stone-900">
              x = {fmt.m(rider.step.xD, 1)} · {fmt.pct(rider.step.xD / model.scenario.span.L)} · s_D
              = {fmt.m(rider.step.sD, 1)}
            </span>
            <span>{fmt.m(model.scenario.span.L, 0)}</span>
          </div>
        </div>
      </div>

      {/* instrument strip */}
      <div className="grid grid-cols-6 border-t border-stone-200 bg-stone-100">
        {cells.map(([label, value, bad]) => (
          <div key={label} className="border-r border-stone-200 px-3 py-2 last:border-r-0">
            <div className="text-[10px] tracking-wide text-stone-500 uppercase">{label}</div>
            <div
              className={`font-mono text-lg leading-tight ${bad ? "text-red-600" : "text-stone-900"}`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 border-t border-stone-200 bg-white px-4 py-2 pb-14 text-xs">
        <span className="text-stone-500">Éch. verticale</span>
        <div className="flex overflow-hidden rounded border border-stone-300">
          {VE_CHOICES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVeChoice(v)}
              className={`px-2 py-1 font-mono ${
                veChoice === v ? "bg-stone-900 text-white" : "bg-white text-stone-600"
              }`}
            >
              {v === 0 ? "auto" : `×${v}`}
            </button>
          ))}
        </div>
        <span className="ml-4 text-stone-500">Calques</span>
        {(
          [
            ["unloaded", "ligne à vide"],
            ["chord", "corde"],
            ["danger", "zones en défaut"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1 text-stone-600">
            <input
              type="checkbox"
              checked={layers[k]}
              onChange={(e) => setLayers((l) => ({ ...l, [k]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>

      <PerfChip model={model} frame={frame.stats} scenario={model.scenario} step={setIndex} />
    </div>
  );
}
