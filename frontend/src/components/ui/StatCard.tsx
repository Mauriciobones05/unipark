import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Número que "rola" até o novo valor (curto, para não atrasar a leitura). */
export function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 450);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

/** Minigráfico de linha (últimos 12 pontos), no padrão dos KPIs do portal-rodovias. */
function Sparkline({ data }: { data: number[] }) {
  const pts = data.slice(-12);
  if (pts.length < 2) return null;
  const W = 96, H = 28, min = Math.min(...pts), range = Math.max(...pts) - min || 1;
  const line = pts.map((v, i) => `${(i / (pts.length - 1)) * W},${H - 2 - ((v - min) / range) * (H - 4)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible text-brand-500" aria-hidden>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="currentColor" opacity="0.12" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  title: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  /** cor da faixa superior e do ícone */
  accent?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
  /** série para o minigráfico (opcional) */
  trend?: number[];
  delay?: number;
}

const BAR = { brand: 'bg-brand-600', emerald: 'bg-emerald-600', amber: 'bg-amber-500', rose: 'bg-rose-600', slate: 'bg-slate-500' };
const CHIP = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-800/60 dark:text-brand-200',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function StatCard({ title, value, hint, icon: Icon, accent = 'brand', trend, delay = 0 }: Props) {
  return (
    <div
      className="animate-fade-up relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', BAR[accent])} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="truncate text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <p className="text-3xl font-bold leading-none tabular-nums">{value}</p>
          {hint && <p className="truncate text-xs text-[var(--text-muted)]">{hint}</p>}
        </div>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', CHIP[accent])}>
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      {trend && <div className="mt-3"><Sparkline data={trend} /></div>}
    </div>
  );
}
