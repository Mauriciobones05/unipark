import { DoorOpen, DoorClosed, Bot, Hand, LifeBuoy } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import type { Status } from '@/api/types';
import { Button } from '@/components/ui/Button';

/** Controles diretos da cancela. Mesmo em modo manual, todas as proteções do firmware continuam valendo. */
export function GateControls({ status }: { status: Status }) {
  const { send, busy, lost } = useGate();
  const { state, mode, sensors } = status;
  const off = busy || lost;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" icon={<DoorOpen className="size-4" />} disabled={off || !(state === 'FECHADA' || state === 'FECHANDO')} onClick={() => send('open')}>
          Abrir (sem contar vaga)
        </Button>
        <Button variant="secondary" icon={<DoorClosed className="size-4" />} disabled={off || !(state === 'ABERTA' && !sensors.obstacle)} onClick={() => send('close')}>
          Fechar cancela
        </Button>
      </div>

      <div role="group" aria-label="Modo de operação" className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-muted)] p-1">
        <button
          type="button"
          aria-pressed={mode === 'AUTOMATICO'}
          disabled={off}
          onClick={() => mode !== 'AUTOMATICO' && send('mode', { mode: 'auto' })}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition aria-pressed:bg-[var(--surface)] aria-pressed:text-brand-700 aria-pressed:shadow dark:aria-pressed:text-brand-200"
        >
          <Bot className="size-4" aria-hidden /> Automático
        </button>
        <button
          type="button"
          aria-pressed={mode === 'MANUAL'}
          disabled={off}
          onClick={() => mode !== 'MANUAL' && send('mode', { mode: 'manual' })}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition aria-pressed:bg-[var(--surface)] aria-pressed:text-brand-700 aria-pressed:shadow dark:aria-pressed:text-brand-200"
        >
          <Hand className="size-4" aria-hidden /> Manual
        </button>
      </div>

      {state === 'FALHA' && (
        <Button variant="warning" block icon={<LifeBuoy className="size-4" />} disabled={off || sensors.obstacle} onClick={() => send('reset-fault')}>
          Reconhecer / recuperar falha
        </Button>
      )}
      <p className="text-xs text-[var(--text-muted)]">Os botões só fazem pedidos: a cancela decide pelas regras de segurança (obstáculo, fim de curso, falha).</p>
    </div>
  );
}
