import { Radar, ShieldAlert, ToggleRight, Wifi } from 'lucide-react';
import type { Status } from '@/api/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function SensorList({ status }: { status: Status }) {
  const { sensors, wifi } = status;
  const rows = [
    { icon: Radar, name: 'Sensor de chegada', pin: 'GPIO 32', badge: <StatusBadge tone={sensors.arrival ? 'warning' : 'success'}>{sensors.arrival ? 'Veículo detectado' : 'Livre'}</StatusBadge> },
    { icon: ShieldAlert, name: 'Sensor de passagem', pin: 'GPIO 33', badge: <StatusBadge tone={sensors.obstacle ? 'warning' : 'success'}>{sensors.obstacle ? 'Obstáculo' : 'Livre'}</StatusBadge> },
    { icon: ToggleRight, name: 'Fim de curso', pin: 'GPIO 26', badge: <StatusBadge tone={sensors.limit ? 'info' : 'neutral'}>{sensors.limit ? 'Acionado' : 'Não acionado'}</StatusBadge> },
    { icon: Wifi, name: wifi.ssid, pin: `${wifi.stations} cliente(s)`, badge: <StatusBadge tone={wifi.apUp ? 'success' : 'danger'}>{wifi.apUp ? 'Rede ativa' : 'AP caiu'}</StatusBadge> },
  ];
  return (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map(({ icon: Icon, name, pin, badge }) => (
        <li key={name} className="flex items-center gap-3 py-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-brand-600 dark:text-brand-300"><Icon className="size-4" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-[var(--text-muted)]">{pin}</p>
          </div>
          {badge}
        </li>
      ))}
    </ul>
  );
}
