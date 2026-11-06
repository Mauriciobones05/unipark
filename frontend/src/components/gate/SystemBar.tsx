import { Clock, Gauge, Radio, Wifi } from 'lucide-react';
import type { Metrics, Status } from '@/api/types';
import { fmtDuration } from '@/lib/format';

interface Props { status: Status; metrics: Metrics | null; lost: boolean }

/** Barra de saúde do sistema (padrão do rodapé do dashboard do portal-rodovias). */
export function SystemBar({ status, metrics, lost }: Props) {
  const items = [
    { icon: Clock, label: 'Ligado há', value: fmtDuration(status.uptimeMs) },
    { icon: Wifi, label: 'Rede', value: `${status.wifi.ssid} · ${status.wifi.apUp ? 'ativa' : 'reiniciando'}` },
    { icon: Radio, label: 'Clientes', value: String(status.wifi.stations) },
    { icon: Gauge, label: 'Resposta média', value: metrics?.response.samples ? `${metrics.response.avgMs} ms` : '—' },
  ];
  return (
    <section aria-label="Saúde do sistema" className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-sm">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="size-4 text-[var(--text-muted)]" strokeWidth={1.75} aria-hidden />
          <span className="text-[var(--text-muted)]">{label}:</span>
          <span className="font-medium tabular-nums">{value}</span>
        </div>
      ))}
      <span className="ml-auto flex items-center gap-1.5 text-xs font-medium">
        <span className={lost ? 'size-2 rounded-full bg-rose-500' : 'size-2 rounded-full bg-emerald-500'} aria-hidden />
        {lost ? 'Sem conexão com a placa' : 'Ao vivo'}
      </span>
    </section>
  );
}
