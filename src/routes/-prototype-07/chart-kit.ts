/**
 * THROWAWAY — prototype chart primitives (wayfinder ticket 07).
 * Ticket 02 fixed the renderer: hand-rolled SVG + one affine scale per axis. `d3-shape`
 * is deliberately NOT installed for the prototype — its line generator is a thin wrapper
 * over the same string building, so this measures the same cost without a new dependency.
 */

export type Scale = { (v: number): number; m: number; b: number; pxPerM: number };

export function affine(d0: number, d1: number, r0: number, r1: number): Scale {
  const m = (r1 - r0) / (d1 - d0 || 1);
  const b = r0 - m * d0;
  const f = ((v: number) => m * v + b) as Scale;
  f.m = m;
  f.b = b;
  f.pxPerM = Math.abs(m);
  return f;
}

export type Plot = {
  width: number;
  height: number;
  pad: { top: number; right: number; bottom: number; left: number };
  x: Scale;
  z: Scale;
  /** Vertical exaggeration actually in force — ticket 02 requires disclosing it. */
  ve: number;
  zDomain: [number, number];
};

export function makePlot(
  width: number,
  height: number,
  xMax: number,
  zLo: number,
  zHi: number,
  pad = { top: 28, right: 16, bottom: 24, left: 16 },
): Plot {
  const span = Math.max(zHi - zLo, 1e-6);
  const margin = span * 0.12;
  const zDomain: [number, number] = [zLo - margin, zHi + margin];
  const x = affine(0, xMax, pad.left, width - pad.right);
  const z = affine(zDomain[0], zDomain[1], height - pad.bottom, pad.top);
  return { width, height, pad, x, z, ve: z.pxPerM / (x.pxPerM || 1), zDomain };
}

/** Override the auto-fit vertical scale with a user-chosen exaggeration. */
export function forceVe(plot: Plot, ve: number): Plot {
  const heightPx = plot.height - plot.pad.top - plot.pad.bottom;
  const spanM = heightPx / (ve * (plot.x.pxPerM || 1));
  const centre = (plot.zDomain[0] + plot.zDomain[1]) / 2;
  const zDomain: [number, number] = [centre - spanM / 2, centre + spanM / 2];
  const z = affine(zDomain[0], zDomain[1], plot.height - plot.pad.bottom, plot.pad.top);
  return { ...plot, z, zDomain, ve: z.pxPerM / (plot.x.pxPerM || 1) };
}

/** Polyline from a flat [x,z,x,z,…] buffer. */
export function linePath(pts: Float64Array, p: Plot): string {
  const n = pts.length / 2;
  let s = "";
  for (let i = 0; i < n; i++) {
    s += `${i === 0 ? "M" : "L"}${p.x(pts[2 * i]).toFixed(2)} ${p.z(pts[2 * i + 1]).toFixed(2)}`;
  }
  return s;
}

/** Terrain as a filled area down to the bottom of the plot. */
export function terrainPath(xs: Float64Array, zs: Float64Array, p: Plot): string {
  const bottom = p.height - p.pad.bottom + 40;
  let s = `M${p.x(xs[0]).toFixed(2)} ${bottom}`;
  for (let i = 0; i < xs.length; i++) {
    s += `L${p.x(xs[i]).toFixed(2)} ${p.z(zs[i]).toFixed(2)}`;
  }
  s += `L${p.x(xs[xs.length - 1]).toFixed(2)} ${bottom}Z`;
  return s;
}

/** Nice round tick step for an axis of `span` metres. */
export function ticks(lo: number, hi: number, target = 6): number[] {
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

export const fmt = {
  m: (v: number, d = 1) => `${v.toFixed(d).replace(".", ",")} m`,
  daN: (v: number) => `${(v / 10).toFixed(0).replace(".", ",")} daN`,
  deg: (v: number) => `${((v * 180) / Math.PI).toFixed(1).replace(".", ",")}°`,
  pct: (v: number) => `${(v * 100).toFixed(0)} %`,
  ms: (v: number) => `${v.toFixed(2).replace(".", ",")} ms`,
  num: (v: number, d = 1) => v.toFixed(d).replace(".", ","),
};
