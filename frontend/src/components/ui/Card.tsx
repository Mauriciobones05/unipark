import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm', className)}
      {...rest}
    />
  );
}

interface CardHeaderProps { title: string; icon?: ReactNode; action?: ReactNode; subtitle?: string }

export function CardHeader({ title, icon, action, subtitle }: CardHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon && <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-brand-200">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
