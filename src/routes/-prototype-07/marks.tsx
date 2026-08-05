/**
 * THROWAWAY — SVG marks shared by all three ticket-07 variants.
 * Deliberately only the *marks* are shared: layout, affordances and read-out placement are
 * what the variants disagree about.
 */
import type { Plot } from "./chart-kit.ts";
import type { Scenario } from "./scenarios.ts";
import type { RiderView } from "./use-model.ts";

import { fmt, linePath, terrainPath, ticks } from "./chart-kit.ts";

export function Defs() {
  return (
    <defs>
      <pattern
        id="dirt"
        width="6"
        height="6"
        patternTransform="rotate(45)"
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke="#a8a29e" strokeWidth="1.5" />
      </pattern>
      <pattern
        id="danger"
        width="8"
        height="8"
        patternTransform="rotate(45)"
        patternUnits="userSpaceOnUse"
      >
        <rect width="8" height="8" fill="#fee2e2" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#dc2626" strokeWidth="3" />
      </pattern>
    </defs>
  );
}

export function TerrainLayer({ scenario, plot }: { scenario: Scenario; plot: Plot }) {
  const t = scenario.terrain;
  if (t.kind !== "profile") return null;
  return (
    <g>
      <path d={terrainPath(t.xs, t.zs, plot)} fill="#f5f5f4" />
      <path d={terrainPath(t.xs, t.zs, plot)} fill="url(#dirt)" opacity={0.45} />
      <path d={terrainPath(t.xs, t.zs, plot)} fill="none" stroke="#78716c" strokeWidth={1.5} />
    </g>
  );
}

export function XAxis({ plot, xMax }: { plot: Plot; xMax: number }) {
  return (
    <g>
      {ticks(0, xMax).map((t) => (
        <line
          key={t}
          x1={plot.x(t)}
          x2={plot.x(t)}
          y1={plot.pad.top}
          y2={plot.height - plot.pad.bottom}
          stroke="#e7e5e4"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

/** Drawn last, so the terrain fill cannot swallow the axis. */
export function XAxisLabels({ plot, xMax }: { plot: Plot; xMax: number }) {
  const y = plot.height - plot.pad.bottom + 14;
  return (
    <g>
      <rect
        x={0}
        y={plot.height - plot.pad.bottom}
        width={plot.width}
        height={plot.pad.bottom}
        fill="#ffffff"
      />
      {ticks(0, xMax).map((t) => (
        <text
          key={t}
          x={plot.x(t)}
          y={y}
          textAnchor="middle"
          className="fill-stone-500 text-[10px]"
        >
          {t}
        </text>
      ))}
    </g>
  );
}

export function Anchors({ scenario, plot }: { scenario: Scenario; plot: Plot }) {
  const { L, h } = scenario.span;
  const t = scenario.terrain;
  const baseA = t.kind === "profile" ? t.zs[0] : t.z;
  const baseB = t.kind === "profile" ? t.zs[t.zs.length - 1] : t.z;
  return (
    <g>
      <line
        x1={plot.x(0)}
        x2={plot.x(0)}
        y1={plot.z(0)}
        y2={plot.z(baseA)}
        stroke="#44403c"
        strokeWidth={3}
      />
      <line
        x1={plot.x(L)}
        x2={plot.x(L)}
        y1={plot.z(h)}
        y2={plot.z(baseB)}
        stroke="#44403c"
        strokeWidth={3}
      />
      {[
        { x: 0, z: 0, label: "A" },
        { x: L, z: h, label: "B" },
      ].map((a) => (
        <g key={a.label}>
          <circle cx={plot.x(a.x)} cy={plot.z(a.z)} r={4} fill="#44403c" />
          <text
            x={plot.x(a.x) + (a.label === "A" ? 8 : -8)}
            y={plot.z(a.z) - 8}
            textAnchor={a.label === "A" ? "start" : "end"}
            className="fill-stone-700 text-[11px] font-semibold"
          >
            {a.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export function ChordLine({ scenario, plot }: { scenario: Scenario; plot: Plot }) {
  const { L, h } = scenario.span;
  return (
    <line
      x1={plot.x(0)}
      y1={plot.z(0)}
      x2={plot.x(L)}
      y2={plot.z(h)}
      stroke="#d6d3d1"
      strokeWidth={1}
      strokeDasharray="2 4"
    />
  );
}

export function UnloadedCable({ pts, plot }: { pts: Float64Array; plot: Plot }) {
  if (!pts.length) return null;
  return (
    <path
      d={linePath(pts, plot)}
      fill="none"
      stroke="#a8a29e"
      strokeWidth={1.5}
      strokeDasharray="5 4"
    />
  );
}

export function LoadedCable({
  pts,
  plot,
  danger,
}: {
  pts: Float64Array;
  plot: Plot;
  danger: boolean;
}) {
  return (
    <path
      d={linePath(pts, plot)}
      fill="none"
      stroke={danger ? "#dc2626" : "#0369a1"}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  );
}

/** Rider glyph: lanyard drop + body envelope, hung below the cable node. */
export function RiderGlyph({
  rider,
  plot,
  hRider,
  danger,
  grabbable,
}: {
  rider: RiderView;
  plot: Plot;
  hRider: number;
  danger: boolean;
  grabbable?: boolean;
}) {
  const x = plot.x(rider.step.xD);
  const zTop = plot.z(rider.step.zD);
  const zFeet = plot.z(rider.step.zD - hRider);
  const color = danger ? "#dc2626" : "#0c4a6e";
  return (
    <g style={grabbable ? { cursor: "grab" } : undefined}>
      <line x1={x} y1={zTop} x2={x} y2={zFeet} stroke={color} strokeWidth={2} />
      <line x1={x - 7} y1={zFeet} x2={x + 7} y2={zFeet} stroke={color} strokeWidth={2} />
      <circle cx={x} cy={zTop} r={grabbable ? 8 : 6} fill="#fff" stroke={color} strokeWidth={3} />
      {grabbable && <circle cx={x} cy={zTop} r={18} fill="transparent" />}
    </g>
  );
}

/** The clearance measurement under the rider, drawn as a dimension line. */
export function ClearanceDim({
  rider,
  plot,
  hRider,
  showLabel = true,
}: {
  rider: RiderView;
  plot: Plot;
  hRider: number;
  showLabel?: boolean;
}) {
  const x = plot.x(rider.step.xD);
  const zFeet = plot.z(rider.step.zD - hRider);
  const zGround = plot.z(rider.groundZ);
  const bad = rider.clearUnder < 0;
  return (
    <g>
      <line
        x1={x}
        y1={zFeet}
        x2={x}
        y2={zGround}
        stroke={bad ? "#dc2626" : "#059669"}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      {showLabel && (
        <text
          x={x + 6}
          y={(zFeet + zGround) / 2}
          className={`text-[11px] font-semibold ${bad ? "fill-red-600" : "fill-emerald-700"}`}
        >
          {fmt.m(rider.clearUnder, 2)}
        </text>
      )}
    </g>
  );
}

/** Where the rider envelope crosses into the ground, for the whole traverse. */
export function DangerZones({
  scenario,
  plot,
  steps,
  perStep,
}: {
  scenario: Scenario;
  plot: Plot;
  steps: { xD: number }[];
  perStep: Float64Array;
}) {
  const bands: Array<[number, number]> = [];
  let start: number | null = null;
  for (let i = 0; i < steps.length; i++) {
    const bad = perStep[i] < 0;
    if (bad && start === null) start = steps[i].xD;
    if (!bad && start !== null) {
      bands.push([start, steps[i].xD]);
      start = null;
    }
  }
  if (start !== null) bands.push([start, steps[steps.length - 1].xD]);
  if (!bands.length) return null;
  void scenario;
  const stripY = plot.pad.top;
  return (
    <g>
      {bands.map(([x0, x1], i) => (
        <g key={i}>
          <rect
            x={plot.x(x0)}
            y={plot.pad.top}
            width={Math.max(plot.x(x1) - plot.x(x0), 2)}
            height={plot.height - plot.pad.bottom - plot.pad.top}
            fill="#dc2626"
            opacity={0.08}
          />
          <rect
            x={plot.x(x0)}
            y={stripY}
            width={Math.max(plot.x(x1) - plot.x(x0), 2)}
            height={10}
            fill="url(#danger)"
          />
        </g>
      ))}
      <text
        x={plot.x(bands[0][0]) + 4}
        y={stripY + 22}
        className="fill-red-700 text-[10px] font-semibold"
      >
        zone en défaut de garde
      </text>
    </g>
  );
}

/** Ticket 02's mandatory disclosure. */
export function VeBadge({ plot, extra }: { plot: Plot; extra?: string }) {
  return (
    <g>
      <rect
        x={plot.pad.left}
        y={6}
        width={extra ? 190 : 130}
        height={18}
        rx={9}
        fill="#fef3c7"
        stroke="#f59e0b"
      />
      <text x={plot.pad.left + 8} y={19} className="fill-amber-900 text-[11px] font-semibold">
        Éch. verticale ×{fmt.num(plot.ve, plot.ve < 10 ? 1 : 0)}
        {extra ? ` · ${extra}` : ""}
      </text>
    </g>
  );
}
