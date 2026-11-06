import { useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Pencil } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import type { Status } from '@/api/types';
import { Button } from '@/components/ui/Button';

/** Comandos de operador. O ESP32 valida tudo; aqui só desabilitamos o que já sabemos que será recusado. */
export function ParkingControls({ status }: { status: Status }) {
  const { send, busy, lost } = useGate();
  const [value, setValue] = useState('');
  const { parking, state } = status;

  const off = busy || lost;
  const blockedState = state === 'FALHA' || state === 'INICIALIZANDO';
  const pending = parking.auth !== 'NENHUMA';
  const canEntry = !off && !blockedState && parking.free > 0 && !pending;
  const canExit = !off && !blockedState && parking.occupied > 0 && !pending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (value === '') return;
    if (await send('parking/occupied', { value })) setValue('');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button icon={<ArrowDownToLine className="size-4" />} disabled={!canEntry} onClick={() => send('release-entry')}>
          Liberar entrada
        </Button>
        <Button variant="secondary" icon={<ArrowUpFromLine className="size-4" />} disabled={!canExit} onClick={() => send('release-exit')}>
          Liberar saída
        </Button>
      </div>
      {pending && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Passagem de {parking.auth === 'ENTRADA' ? 'entrada' : 'saída'} autorizada: aguardando o veículo cruzar o sensor.
        </p>
      )}
      {parking.free === 0 && <p className="text-xs text-[var(--text-muted)]">Estacionamento lotado: liberar entrada está bloqueado.</p>}
      {parking.occupied === 0 && <p className="text-xs text-[var(--text-muted)]">Estacionamento vazio: liberar saída está bloqueado.</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-4">
        <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
          Ajustar ocupação (corrige a contagem)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={parking.capacity}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`0 a ${parking.capacity}`}
            className="h-11 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
          />
        </label>
        <Button variant="secondary" type="submit" icon={<Pencil className="size-4" />} disabled={off || value === ''}>Ajustar</Button>
      </form>
    </div>
  );
}
