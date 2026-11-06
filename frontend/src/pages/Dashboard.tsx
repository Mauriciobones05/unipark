import { Activity, ArrowLeftRight, CarFront, ParkingCircle, SquareParking, Zap } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { AnimatedNumber, StatCard } from '@/components/ui/StatCard';
import { GateVisual } from '@/components/gate/GateVisual';
import { GateStateBadge } from '@/components/gate/GateStateBadge';
import { SensorList } from '@/components/gate/SensorList';
import { EventList } from '@/components/gate/EventList';
import { ParkingLot } from '@/components/parking/ParkingLot';
import { OccupancyChart } from '@/components/parking/OccupancyChart';
import { ParkingControls } from '@/components/parking/ParkingControls';
import { SystemBar } from '@/components/gate/SystemBar';
import { STATE_LABEL, fmtDuration } from '@/lib/format';
import { Loading } from './Loading';

export function Dashboard() {
  const { status: s, lost, history, metrics } = useGate();
  if (!s) return <Loading lost={lost} />;
  const { parking } = s;
  const pct = Math.round((parking.occupied / parking.capacity) * 100);
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date());

  return (
    <>
      <PageHeader title="Painel" subtitle={today.charAt(0).toUpperCase() + today.slice(1)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Vagas livres" icon={ParkingCircle} accent={parking.free === 0 ? 'rose' : 'emerald'} value={<AnimatedNumber value={parking.free} />} hint={`de ${parking.capacity} vagas`} />
        <StatCard title="Ocupação" icon={CarFront} accent="brand" value={`${pct}%`} hint={`${parking.occupied} veículo(s) dentro`} trend={history.map(p => p.occupied)} delay={60} />
        <StatCard title="Cancela" icon={Zap} accent={s.state === 'FALHA' ? 'rose' : s.state === 'ABERTA' ? 'emerald' : 'amber'} value={STATE_LABEL[s.state]} hint={`há ${fmtDuration(s.stateAgeMs)}`} delay={120} />
        <StatCard title="Entradas / Saídas" icon={ArrowLeftRight} accent="slate" value={`${parking.entries} / ${parking.exits}`} hint={`${parking.deniedFull} barrado(s) por lotação`} delay={180} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cancela ao vivo" icon={<Activity className="size-4" />} action={<GateStateBadge state={s.state} />} subtitle={`Ângulo do servo: ${s.servo.enabled ? Math.round(s.servo.angle) + '°' : 'sem PWM'}`} />
          <div className="mx-auto max-w-xl text-brand-900 dark:text-brand-100"><GateVisual status={s} dim={lost} /></div>
        </Card>

        <Card>
          <CardHeader title="Ações rápidas" icon={<Zap className="size-4" />} />
          <ParkingControls status={s} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Vagas" icon={<SquareParking className="size-4" />} subtitle={`${parking.occupied} de ${parking.capacity} ocupadas`} />
          <ParkingLot capacity={parking.capacity} occupied={parking.occupied} pending={parking.auth} />
        </Card>

        <Card>
          <CardHeader title="Sensores e rede" />
          <SensorList status={s} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Ocupação na sessão" subtitle="Degraus a cada entrada, saída ou ajuste" />
          <div className="text-brand-900 dark:text-brand-100"><OccupancyChart points={history} capacity={parking.capacity} /></div>
        </Card>

        <Card>
          <CardHeader title="Últimos eventos" />
          <EventList events={s.events} limit={6} />
        </Card>
      </div>

      <SystemBar status={s} metrics={metrics} lost={lost} />
    </>
  );
}
