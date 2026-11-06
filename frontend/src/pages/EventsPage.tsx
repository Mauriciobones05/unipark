import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EventList } from '@/components/gate/EventList';
import { Loading } from './Loading';

export function EventsPage() {
  const { status: s, lost } = useGate();
  if (!s) return <Loading lost={lost} />;
  return (
    <>
      <PageHeader title="Eventos" subtitle="Últimos 12 eventos guardados pela placa. O horário é o tempo desde que o ESP32 ligou (mm:ss)." />
      <Card><EventList events={s.events} /></Card>
    </>
  );
}
