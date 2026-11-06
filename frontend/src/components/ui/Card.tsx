import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6', className)}
      {...rest}
    />
  );
}

interface CardHeaderProps { title: string; icon?: ReactNode; action?: ReactNode; subtitle?: string }

export function CardHeader({ title, icon, action, subtitle }: CardHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        {icon && <span className="mt-0.5 text-[var(--text-muted)]" aria-hidden>{icon}</span>}
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
