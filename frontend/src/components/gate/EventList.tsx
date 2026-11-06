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
    <ol className="divide-y divide-[var(--border)]">
      {list.map((e, i) => (
        <li key={`${e.t}-${i}`} className="flex items-start gap-3 px-1 py-2.5">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', toneOf(e.msg))} aria-hidden />
          <span className="flex-1 text-sm">{e.msg}</span>
          <time className="shrink-0 font-mono text-xs text-[var(--text-muted)]" title={e.at ? 'Horário no navegador' : 'Tempo desde que a placa ligou'}>{e.at ? new Date(e.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : fmtUptime(e.t)}</time>
        </li>
      ))}
    </ol>
  );
}
