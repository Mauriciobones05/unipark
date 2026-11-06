import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; text: string }
interface ToastApi { push: (kind: Kind, text: string) => void }

const Ctx = createContext<ToastApi | null>(null);

const STYLE: Record<Kind, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100',
  info: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100',
};
const ICON = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++seq.current;
    setToasts(t => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
  }, [dismiss]);
  const api = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6 lg:left-auto" aria-live="polite">
        {toasts.map(t => {
          const Icon = ICON[t.kind];
          return (
            <div key={t.id} role="status" className={cn('pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg', STYLE[t.kind])}>
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1">{t.text}</span>
              <button type="button" aria-label="Fechar aviso" onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast fora do ToastProvider');
  return v;
}
