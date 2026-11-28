import React from "react";

// Etched botanical linework (leaves and small jasmine flowers on curved stems), drawn in code with a seeded generator so the
// server and the browser always agree. Pale blue strokes only: it reads like an engraving on the deep blue hero. Decorative.

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

type Pt = { x: number; y: number; a: number };

function stemPoints(x0: number, y0: number, len: number, angle: number, curl: number, n: number): Pt[] {
  const pts: Pt[] = [];
  let x = x0;
  let y = y0;
  let a = angle;
  const step = len / n;
  for (let i = 0; i <= n; i++) {
    pts.push({ x, y, a });
    a += curl * (1 - i / n) * 0.06;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
  }
  return pts;
}

function leafPath(l: number, w: number): string {
  return `M0 0 C ${l * 0.3} ${-w} ${l * 0.72} ${-w} ${l} 0 C ${l * 0.72} ${w} ${l * 0.3} ${w} 0 0 Z`;
}

function Flower({ x, y, r, rot }: { x: number; y: number; r: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((d) => (
        <ellipse key={d} cx={0} cy={-r * 0.62} rx={r * 0.3} ry={r * 0.62} transform={`rotate(${d})`} />
      ))}
      <circle r={r * 0.16} fill="currentColor" stroke="none" opacity="0.7" />
    </g>
  );
}

function Branch({ seed, x0, y0, len, angle, curl, leafScale }: { seed: number; x0: number; y0: number; len: number; angle: number; curl: number; leafScale: number }) {
  const r = rng(seed);
  const pts = stemPoints(x0, y0, len, angle, curl, 26);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const leaves: React.ReactNode[] = [];
  pts.forEach((p, i) => {
    if (i < 3 || i % 2 === 1) return;
    const t = 1 - i / pts.length;
    const l = (46 + r() * 22) * leafScale * (0.35 + t * 0.9);
    const w = l * (0.26 + r() * 0.08);
    [-1, 1].forEach((side) => {
      const rot = ((p.a + side * (0.7 + r() * 0.35)) * 180) / Math.PI;
      leaves.push(
        <g key={`${i}-${side}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
          <path d={leafPath(l, w)} fill="rgba(170,196,255,0.05)" />
          <path d={`M0 0 L${l * 0.96} 0`} />
          {[0.28, 0.5, 0.72].map((k) => (
            <path key={k} d={`M${l * k} 0 L${l * (k + 0.16)} ${-w * 0.78} M${l * k} 0 L${l * (k + 0.16)} ${w * 0.78}`} opacity="0.7" />
          ))}
        </g>,
      );
    });
  });
  const flowers = [6, 12, 19, 24].map((i, k) => {
    const p = pts[i];
    if (!p) return null;
    return <Flower key={k} x={p.x + (r() - 0.5) * 18} y={p.y + (r() - 0.5) * 18} r={(14 + r() * 8) * leafScale} rot={r() * 72} />;
  });
  return (
    <g>
      <path d={d} />
      {leaves}
      {flowers}
    </g>
  );
}

/** Left or right edge cluster. `flip` mirrors it for the right side. */
export function Botanical({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 900"
      preserveAspectRatio="xMinYMax meet"
      className={`gv-sway pointer-events-none absolute bottom-0 ${flip ? "right-0 -scale-x-100" : "left-0"} text-[#BFD0FF] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity="0.5">
        <Branch seed={11} x0={40} y0={900} len={820} angle={-1.28} curl={1.1} leafScale={1.1} />
        <Branch seed={23} x0={120} y0={900} len={640} angle={-0.98} curl={-1.2} leafScale={0.95} />
        <Branch seed={37} x0={10} y0={900} len={520} angle={-1.52} curl={1.6} leafScale={0.8} />
        <Branch seed={51} x0={210} y0={900} len={380} angle={-0.7} curl={-0.8} leafScale={0.7} />
      </g>
    </svg>
  );
}
