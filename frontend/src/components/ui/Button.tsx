import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-sm hover:brightness-110 active:brightness-95',
  secondary: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-brand-50 dark:hover:bg-brand-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  warning: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
  ghost: 'text-[var(--text-muted)] hover:bg-brand-50 hover:text-[var(--text)] dark:hover:bg-brand-800',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({ variant = 'primary', icon, block, className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition',
        'disabled:pointer-events-none disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
        block && 'w-full',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
