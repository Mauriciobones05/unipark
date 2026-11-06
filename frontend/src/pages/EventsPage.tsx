import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EventList } from '@/components/gate/EventList';
import { Loading } from './Loading';

export function EventsPage() {
  const { status: s, lost, eventLog } = useGate();
  if (!s) return <Loading lost={lost} />;
  return (
    <>
      <PageHeader title="Eventos" subtitle="Histórico salvo neste navegador (a placa guarda só os últimos 12). Continua após recarregar a página ou reiniciar o ESP32." />
      <Card><EventList events={eventLog} /></Card>
    </>
  );
}
