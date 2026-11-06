import { CarFront, History, SquareParking, Wrench } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedNumber } from '@/components/ui/StatCard';
import { ParkingLot } from '@/components/parking/ParkingLot';
import { OccupancyChart } from '@/components/parking/OccupancyChart';
import { ParkingControls } from '@/components/parking/ParkingControls';
import { AUTH_LABEL } from '@/lib/format';
import { Loading } from './Loading';

export function ParkingPage() {
  const { status: s, lost, history } = useGate();
  if (!s) return <Loading lost={lost} />;
  const { parking } = s;
  const full = parking.free === 0;

  return (
    <>
      <PageHeader title="Estacionamento" subtitle="Vagas, autorizações de passagem e contagem de entradas e saídas." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Vagas livres</p>
          <p className={'mt-2 text-7xl font-extrabold tabular-nums ' + (full ? 'text-rose-600' : 'text-brand-700 dark:text-brand-300')}>
            <AnimatedNumber value={parking.free} />
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">de {parking.capacity} vagas</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {full ? <StatusBadge tone="danger" pulse>Lotado</StatusBadge> : <StatusBadge tone="success">Há vagas</StatusBadge>}
            <StatusBadge tone={parking.auth === 'NENHUMA' ? 'neutral' : 'warning'}>Passagem: {AUTH_LABEL[parking.auth]}</StatusBadge>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Mapa de vagas" icon={<SquareParking className="size-4" />} subtitle="A placa conta veículos; não identifica qual vaga está em uso." />
          <ParkingLot capacity={parking.capacity} occupied={parking.occupied} pending={parking.auth} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Comandos do operador" icon={<Wrench className="size-4" />} subtitle="A vaga só é contada quando o veículo cruza o sensor de passagem." />
          <ParkingControls status={s} />
        </Card>

        <Card>
          <CardHeader title="Contadores" icon={<CarFront className="size-4" />} />
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[['Entradas', parking.entries], ['Saídas', parking.exits], ['Barrados', parking.deniedFull]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[var(--surface-muted)] p-3">
                <dd className="text-2xl font-bold tabular-nums">{v}</dd>
                <dt className="text-xs text-[var(--text-muted)]">{k}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Os contadores e a ocupação ficam na memória da placa: zeram ao reiniciar o ESP32.</p>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Ocupação na sessão" icon={<History className="size-4" />} subtitle="Histórico guardado apenas neste navegador" />
          <div className="text-brand-900 dark:text-brand-100"><OccupancyChart points={history} capacity={parking.capacity} /></div>
        </Card>
      </div>
    </>
  );
}
