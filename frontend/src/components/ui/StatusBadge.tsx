import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE: Record<Tone, { box: string; dot: string }> = {
  success: { box: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  warning: { box: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  danger: { box: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300', dot: 'bg-rose-500' },
  info: { box: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-800/60 dark:text-brand-200', dot: 'bg-brand-500' },
  neutral: { box: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300', dot: 'bg-slate-400' },
};

interface Props { tone: Tone; children: ReactNode; pulse?: boolean; className?: string }

export function StatusBadge({ tone, children, pulse, className }: Props) {
  const t = TONE[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', t.box, className)}>
      <span className={cn('size-2 rounded-full', t.dot, pulse && 'animate-pulse-ring')} aria-hidden />
      {children}
    </span>
  );
}
