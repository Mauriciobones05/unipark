import type { GateEvent } from '@/api/types';
import { fmtUptime } from '@/lib/format';
import { cn } from '@/lib/cn';

function toneOf(msg: string): string {
  const m = msg.toLowerCase();
  if (/falha|lotado|recusado|obstaculo|fim de curso foi|continua acionado/.test(m)) return 'bg-rose-500';
  if (/expirou|reabrindo|sim:|ajustou/.test(m)) return 'bg-amber-500';
  if (/concluida|fechada|aberta|ativ|conectado|recuperado|liberou/.test(m)) return 'bg-emerald-500';
  return 'bg-brand-400';
}

/** Linha do tempo de eventos (mais novo primeiro). `t` = tempo desde o boot da placa. */
export function EventList({ events, limit }: { events: GateEvent[]; limit?: number }) {
  const list = limit ? events.slice(0, limit) : events;
  if (!list.length) return <p className="py-6 text-center text-sm text-[var(--text-muted)]">Nenhum evento registrado.</p>;
  return (
    <ol className="relative space-y-0.5">
      {list.map((e, i) => (
        <li key={`${e.t}-${i}`} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-muted)]">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', toneOf(e.msg))} aria-hidden />
          <span className="flex-1 text-sm">{e.msg}</span>
          <time className="shrink-0 font-mono text-xs text-[var(--text-muted)]" title="Tempo desde que a placa ligou">{fmtUptime(e.t)}</time>
        </li>
      ))}
    </ol>
  );
}
