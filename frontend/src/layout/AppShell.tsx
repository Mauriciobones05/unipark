import type { ReactNode } from 'react';
import { AlertTriangle, CarFront, Moon, Sun, WifiOff } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import { useTheme } from '@/context/ThemeContext';
import { NAV } from './nav';
import { cn } from '@/lib/cn';
import { fmtDuration } from '@/lib/format';

function Brand({ compact }: { compact?: boolean }) {
  // A logo tem texto azul-escuro: sobre fundo escuro ela fica numa "pastilha" clara.
  return (
    <a href="#/" className="flex items-center rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5" aria-label="UniPark - ir para o painel">
      <img src="/unipark-logo.png" alt="UniPark" className={compact ? 'h-8 w-auto' : 'h-11 w-auto'} width={720} height={229} />
    </a>
  );
}

export function AppShell({ route, children }: { route: string; children: ReactNode }) {
  const { status, lost } = useGate();
  const { theme, toggle } = useTheme();
  const items = NAV;
  const fault = status && status.fault.code !== 'NENHUMA';
  const full = status && status.parking.free === 0;

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <div className="px-5 pb-4 pt-6"><Brand /></div>
        <nav className="flex-1 px-3" aria-label="Navegação principal">
          <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Menu</p>
          <div className="space-y-0.5">
            {items.map(({ to, label, icon: Icon }) => {
              const active = route === to;
              return (
                <a
                  key={to}
                  href={'#' + to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-md border-l-2 px-3 text-sm transition',
                    active
                      ? 'border-brand-600 bg-[var(--surface-muted)] font-semibold text-[var(--text)] dark:border-brand-300'
                      : 'border-transparent font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  {label}
                </a>
              );
            })}
          </div>
        </nav>
        <div className="space-y-1 border-t border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text)]">{status?.wifi.ssid ?? 'Cancela-ESP32'}</p>
          <p>{status ? `Ligado há ${fmtDuration(status.uptimeMs)}` : 'Aguardando a placa…'}</p>
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur lg:px-8">
        <div className="lg:hidden"><Brand compact /></div>
        <div className="hidden items-center gap-2 text-sm text-[var(--text-muted)] lg:flex">
          <CarFront className="size-4" aria-hidden /> Controle de acesso do estacionamento
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      {/* Avisos globais */}
      <div className="space-y-2 px-4 pt-4 lg:px-8">
        {lost && (
          <div role="alert" className="flex items-start gap-3 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white">
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            Conexão com o ESP32 perdida. Os valores exibidos estão desatualizados e os comandos foram desativados. A cancela continua operando localmente.
          </div>
        )}
        {fault && status && (
          <div role="alert" className="flex items-start gap-3 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Falha: {status.fault.message} ({status.fault.code}). Corrija a causa física e use “Recuperar falha” na página Cancela.</span>
          </div>
        )}
        {full && !lost && (
          <div role="status" className="flex items-center gap-3 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            <CarFront className="size-4 shrink-0" aria-hidden /> Estacionamento lotado: novas entradas serão barradas.
          </div>
        )}
      </div>

      <main key={route} className="animate-fade-up px-4 pb-28 pt-6 lg:px-8 lg:pb-10">
        <div className={cn('mx-auto max-w-6xl', lost && 'opacity-60')}>{children}</div>
      </main>

      {/* Navegação inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-[var(--border)] bg-[var(--surface)] lg:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} aria-label="Navegação principal">
        {items.map(({ to, label, icon: Icon }) => {
          const active = route === to;
          return (
            <a
              key={to}
              href={'#' + to}
              aria-current={active ? 'page' : undefined}
              className={cn('flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-medium', active ? 'border-brand-600 text-[var(--text)] dark:border-brand-300' : 'border-transparent text-[var(--text-muted)]')}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              {label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
