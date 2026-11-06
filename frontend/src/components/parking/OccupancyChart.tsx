import type { OccupancyPoint } from '@/context/GateContext';

interface Props { points: OccupancyPoint[]; capacity: number }

/** Gráfico em degraus da ocupação durante esta sessão do navegador (SVG puro, sem biblioteca de gráficos). */
export function OccupancyChart({ points, capacity }: Props) {
  const W = 560, H = 150, PAD = 22;
  if (points.length < 2) {
    return <p className="grid h-[150px] place-items-center text-sm text-[var(--text-muted)]">O histórico aparece quando a ocupação mudar.</p>;
  }
  const t0 = points[0].t;
  const t1 = Math.max(Date.now(), points[points.length - 1].t + 1);
  const x = (t: number) => PAD + ((t - t0) / (t1 - t0)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / Math.max(1, capacity)) * (H - PAD * 2);

  let d = `M ${x(points[0].t)} ${y(points[0].occupied)}`;
  for (let i = 1; i < points.length; i++) d += ` H ${x(points[i].t)} V ${y(points[i].occupied)}`;
  d += ` H ${x(t1)}`;
  const area = `${d} V ${y(0)} H ${x(t0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histórico de ocupação da sessão">
      <defs>
        <linearGradient id="occ" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0081ef" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0081ef" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {Array.from({ length: capacity + 1 }, (_, v) => (
        <g key={v}>
          <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="currentColor" opacity="0.1" />
          <text x={PAD - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.6">{v}</text>
        </g>
      ))}
      <path d={area} fill="url(#occ)" />
      <path d={d} fill="none" stroke="#033e9c" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
