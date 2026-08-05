/**
 * THROWAWAY — Variant D: the composite decided in the ticket-07 grill.
 * C's spine (left rail + profile + clearance strip) with B's fixed read-out strip,
 * scrubbing on the clearance strip, a draggable marker, an exact-solve numeric field,
 * worst-for-this-position clearance, the ×1 true-scale peek, and the two-kind verdict.
 */
import { useRef, useState } from "react";

import type { RiderView } from "./use-model.ts";
import { affine, fmt, forceVe, linePath, makePlot, ticks } from "./chart-kit.ts";
import {
  Anchors,
  ChordLine,
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
import { useFrameMeter, useModel, useSize } from "./use-model.ts";

type Model = ReturnType<typeof useModel>;

export const NAME = "Composite décidé (C + bandeau de B)";

/** Danger bands over the x range where the traverse violates clearance. */
function dangerBands(model: Model) {
  const bands: Array<[number, number]> = [];
  let start: number | null = null;
  for (let i = 0; i < model.steps.length; i++) {
    // bands are over RIDER positions that violate, not over the x of the worst point
    const bad = model.clearance.perStep[i] < 0;
    if (bad && start === null) start = model.steps[i].xD;
    if (!bad && start !== null) {
      bands.push([start, model.steps[i].xD]);
      start = null;
    }
  }
  if (start !== null) bands.push([start, model.scenario.span.L]);
  return bands;
}

/** The clearance dimension line, drawn where the minimum actually is. */
function WorstClearanceDim({
  rider,
  plot,
  spanL,
}: {
  rider: RiderView;
  plot: ReturnType<typeof makePlot>;
  spanL: number;
}) {
  const x = plot.x(rider.clearWorstX);
  const zCable = plot.z(rider.clearWorstCableZ);
  const zGround = plot.z(rider.clearWorstGroundZ);
  const bad = rider.clearWorst < 0;
  const offRider = Math.abs(rider.clearWorstX - rider.step.xD) > Math.max(1, 0.01 * spanL);
  return (
    <g>
      <line
        x1={x}
        y1={zCable}
        x2={x}
        y2={zGround}
        stroke={bad ? "#dc2626" : "#059669"}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <line x1={x - 5} y1={zGround} x2={x + 5} y2={zGround} stroke={bad ? "#dc2626" : "#059669"} />
      <text
        x={x + 7}
        y={(zCable + zGround) / 2}
        className={`text-[11px] font-semibold ${bad ? "fill-red-600" : "fill-emerald-700"}`}
      >
        {fmt.m(rider.clearWorst, 2)}
        {offRider ? ` (x ${fmt.m(rider.clearWorstX, 0)})` : ""}
      </text>
    </g>
  );
}

/** Scrub track: x is rider position, y is the worst clearance for that position. */
function ClearanceStrip({
  model,
  rider,
  width,
  height,
  onScrub,
  onScrubStart,
  onScrubEnd,
}: {
  model: Model;
  rider: RiderView;
  width: number;
  height: number;
  onScrub: (x: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}) {
  const pad = { top: 16, right: 24, bottom: 18, left: 24 };
  const [scrubbing, setScrubbing] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const L = model.scenario.span.L;
  const values = model.clearance.perStep;
  let lo = 0;
  let hi = 1;
  for (const v of values) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const x = affine(0, L, pad.left, width - pad.right);
  const y = affine(lo - 0.4, hi + 0.4, height - pad.bottom, pad.top);
  const pts = new Float64Array(model.steps.length * 2);
  model.steps.forEach((s, i) => {
    pts[2 * i] = s.xD;
    pts[2 * i + 1] = values[i];
  });
  const zero = y(0);
  const toX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub((clientX - rect.left - pad.left) / (x.pxPerM || 1));
  };
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="touch-none cursor-ew-resize select-none"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setScrubbing(true);
        onScrubStart();
        toX(e.clientX);
      }}
      onPointerMove={(e) => scrubbing && toX(e.clientX)}
      onPointerUp={() => {
        setScrubbing(false);
        onScrubEnd();
      }}
    >
      <rect x={0} y={0} width={width} height={height} fill="#fafaf9" />
      <rect
        x={pad.left}
        y={zero}
        width={width - pad.left - pad.right}
        height={Math.max(height - pad.bottom - zero, 0)}
        fill="#fee2e2"
      />
      {ticks(lo, hi, 3).map((t) => (
        <text key={t} x={6} y={y(t) + 3} className="fill-stone-400 text-[9px]">
          {fmt.num(t, 0)}
        </text>
      ))}
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={zero}
        y2={zero}
        stroke="#dc2626"
        strokeWidth={1}
      />
      <path
        d={linePath(pts, { width, height, pad, x, z: y, ve: 1, zDomain: [lo, hi] })}
        fill="none"
        stroke="#0f766e"
        strokeWidth={2}
      />
      <line
        x1={x(rider.step.xD)}
        x2={x(rider.step.xD)}
        y1={pad.top}
        y2={height - pad.bottom}
        stroke="#0c4a6e"
        strokeWidth={1.5}
      />
      <circle cx={x(rider.step.xD)} cy={y(rider.clearWorst)} r={4} fill="#0c4a6e" />
      <text x={pad.left} y={11} className="fill-stone-500 text-[10px]">
        Garde minimale h_clear (m) selon la position du passager — glisser pour déplacer
      </text>
    </svg>
  );
}

export function VariantD({ model }: { model: Model }) {
  const main = useSize<HTMLDivElement>();
  const strip = useSize<HTMLDivElement>();
  const [index, setIndex] = useState(Math.floor(model.steps.length / 2));
  const [exactX, setExactX] = useState<number | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [truScale, setTruScale] = useState(false);
  const [layers, setLayers] = useState({ unloaded: false, chord: true });
  const frame = useFrameMeter(dragging);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const base = makePlot(main.width, main.height, model.scenario.span.L, model.zLo, model.zHi);
  const plot = truScale ? forceVe(base, 1) : base;
  const gridRider = model.riderAt(index);
  const exactRider = exactX === null ? null : model.riderAtX(exactX);
  const rider = exactRider ?? gridRider;
  const bands = dangerBands(model);
  const inBand = bands.some(([a, b]) => rider.step.xD >= a && rider.step.xD <= b);
  const failing = model.clearance.hMin < 0;
  const hardFailure = model.clearance.contact === "cable";

  const snapTo = (xMetres: number) => {
    setExactX(null);
    setTyped(null);
    setIndex(model.nearestIndex(xMetres));
  };

  const worstOffRider =
    Math.abs(rider.clearWorstX - rider.step.xD) > Math.max(1, 0.01 * model.scenario.span.L);
  const cells: Array<[string, string, boolean?]> = [
    [
      worstOffRider ? `Garde min (à x ${fmt.m(rider.clearWorstX, 0)})` : "Garde min",
      fmt.m(rider.clearWorst, 2),
      rider.clearWorst < 0,
    ],
    ["T ancrage A", fmt.daN(rider.step.TA)],
    ["T ancrage B", fmt.daN(rider.step.TB)],
    ["Pente locale", fmt.deg(rider.step.theta)],
    ["Flèche au passager", fmt.m(rider.sagAtRider, 2)],
  ];

  return (
    <div className="flex h-svh w-full bg-white">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-stone-200 bg-stone-50 p-4 text-sm">
        <h2 className="mb-1 font-semibold">Paramètres</h2>
        <p className="mb-4 text-[11px] leading-snug text-stone-500">{model.scenario.note}</p>

        <div className="mb-4 rounded border border-stone-200 bg-white p-3">
          <div className="mb-1 text-[11px] tracking-wide text-stone-500 uppercase">
            Position du passager
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              value={typed ?? Number(rider.step.xD.toFixed(1))}
              step={0.1}
              min={0}
              max={model.scenario.span.L}
              className="w-24 rounded border border-stone-300 px-2 py-1 font-mono text-sm"
              onChange={(e) => {
                setTyped(e.target.value);
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setExactX(v);
              }}
            />
            <span className="text-xs text-stone-500">m depuis A</span>
            <span className="ml-auto font-mono text-[11px] text-stone-400">
              {fmt.pct(rider.step.xD / model.scenario.span.L)}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-snug text-stone-400">
            {rider.onGrid
              ? "Position sur un pas du balayage."
              : "Résolution exacte à la position saisie (§6.1 cas 2)."}
          </p>
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
          <dt className="text-stone-500">Garde min (traversée)</dt>
          <dd className={`text-right font-mono ${failing ? "text-red-600" : ""}`}>
            {fmt.m(model.clearance.hMin, 2)}
          </dd>
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
        <button
          type="button"
          className={`mt-3 w-full rounded border px-2 py-1 text-xs ${
            truScale ? "border-amber-500 bg-amber-100 text-amber-900" : "border-stone-300 bg-white"
          }`}
          onPointerDown={() => setTruScale(true)}
          onPointerUp={() => setTruScale(false)}
          onPointerLeave={() => setTruScale(false)}
        >
          ×1 vraie échelle (maintenir)
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {failing && (
          <div
            className={`px-4 py-2 text-sm text-white ${hardFailure ? "bg-red-700" : "bg-red-600"}`}
          >
            {hardFailure ? (
              <span>
                <b>Câble au sol</b> — le câble passe sous le terrain. Fait géométrique, x ={" "}
                {fmt.m(model.clearance.atX, 0)}.
              </span>
            ) : (
              <span>
                <b>Enveloppe passager traversée</b> — {fmt.m(model.clearance.hMin, 2)} à x ={" "}
                {fmt.m(model.clearance.atX, 0)}, avec h_passager ={" "}
                {fmt.m(model.scenario.hRider, 1)}{" "}
                <span className="rounded bg-white/25 px-1 text-[11px]">non confirmé</span>{" "}
                <button className="underline decoration-dotted" type="button">
                  modifier
                </button>
              </span>
            )}
          </div>
        )}

        <div ref={main.ref} className="min-h-0 flex-[3]">
          <svg
            ref={svgRef}
            width={main.width}
            height={main.height}
            className="touch-none select-none"
            role="slider"
            tabIndex={0}
            aria-label="Position du passager sur le profil"
            aria-valuemin={0}
            aria-valuemax={Math.round(model.scenario.span.L)}
            aria-valuenow={Math.round(rider.step.xD)}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDragging(true);
              frame.reset();
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) snapTo((e.clientX - rect.left - plot.pad.left) / (plot.x.pxPerM || 1));
            }}
            onPointerMove={(e) => {
              if (!dragging) return;
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) snapTo((e.clientX - rect.left - plot.pad.left) / (plot.x.pxPerM || 1));
            }}
            onPointerUp={() => {
              setDragging(false);
              frame.compute();
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                setExactX(null);
                setTyped(null);
                setIndex((i) => Math.max(0, i - 1));
              }
              if (e.key === "ArrowRight") {
                setExactX(null);
                setTyped(null);
                setIndex((i) => Math.min(model.steps.length - 1, i + 1));
              }
            }}
          >
            <Defs />
            <XAxis plot={plot} xMax={model.scenario.span.L} />
            {bands.map(([x0, x1], i) => (
              <rect
                key={i}
                x={plot.x(x0)}
                y={plot.pad.top}
                width={Math.max(plot.x(x1) - plot.x(x0), 2)}
                height={plot.height - plot.pad.bottom - plot.pad.top}
                fill="#dc2626"
                opacity={0.08}
              />
            ))}
            <TerrainLayer scenario={model.scenario} plot={plot} />
            {layers.chord && <ChordLine scenario={model.scenario} plot={plot} />}
            {layers.unloaded && <UnloadedCable pts={model.unloadedPts} plot={plot} />}
            <LoadedCable pts={rider.pts} plot={plot} danger={inBand} />
            <Anchors scenario={model.scenario} plot={plot} />
            <WorstClearanceDim rider={rider} plot={plot} spanL={model.scenario.span.L} />
            <RiderGlyph
              rider={rider}
              plot={plot}
              hRider={model.scenario.hRider}
              danger={inBand}
              grabbable
            />
            <XAxisLabels plot={plot} xMax={model.scenario.span.L} />
            <VeBadge plot={plot} extra={truScale ? "vraie échelle" : undefined} />
          </svg>
        </div>

        <div ref={strip.ref} className="min-h-0 flex-1 border-t border-stone-200">
          <ClearanceStrip
            model={model}
            rider={rider}
            width={strip.width}
            height={strip.height}
            onScrub={snapTo}
            onScrubStart={() => {
              setDragging(true);
              frame.reset();
            }}
            onScrubEnd={() => {
              setDragging(false);
              frame.compute();
            }}
          />
        </div>

        <div className="grid grid-cols-5 border-t border-stone-200 bg-stone-100 pb-14">
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
      </div>

      <PerfChip model={model} frame={frame.stats} scenario={model.scenario} step={setIndex} />
    </div>
  );
}
