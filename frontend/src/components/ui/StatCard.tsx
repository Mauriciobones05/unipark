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

interface Props {
  title: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  /** gradiente do quadro do ícone */
  accent?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
  delay?: number;
}

const ACCENT = {
  brand: 'from-brand-700 to-brand-500',
  emerald: 'from-emerald-600 to-emerald-400',
  amber: 'from-amber-500 to-amber-300',
  rose: 'from-rose-600 to-rose-400',
  slate: 'from-slate-600 to-slate-400',
};

export function StatCard({ title, value, hint, icon: Icon, accent = 'brand', delay = 0 }: Props) {
  return (
    <div
      className="animate-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</p>
          <p className="mt-1.5 text-3xl font-bold leading-none tabular-nums">{value}</p>
          {hint && <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{hint}</p>}
        </div>
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md', ACCENT[accent])}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
