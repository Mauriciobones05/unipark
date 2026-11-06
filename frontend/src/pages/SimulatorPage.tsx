import { Car, FlaskConical, OctagonAlert, ToggleLeft, ToggleRight, Waypoints } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GateVisual } from '@/components/gate/GateVisual';
import { GateStateBadge } from '@/components/gate/GateStateBadge';
import { Loading } from './Loading';

/** Só existe quando o painel roda contra o simulador (npm run dev). Nunca aparece no ESP32 real. */
export function SimulatorPage() {
  const { status: s, lost, send, busy } = useGate();
  if (!s) return <Loading lost={lost} />;
  const off = busy || lost;
  const obstacle = s.sim?.obstacle ?? false;

  return (
    <>
      <PageHeader title="Simulador" subtitle="Você está usando o simulador do ESP32: mexa nos sensores virtuais para testar o painel sem hardware." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cena" icon={<FlaskConical className="size-4" />} action={<GateStateBadge state={s.state} />} />
          <div className="mx-auto max-w-xl text-brand-900 dark:text-brand-100"><GateVisual status={s} /></div>
        </Card>
        <Card>
          <CardHeader title="Sensores virtuais" icon={<Waypoints className="size-4" />} />
          <div className="grid gap-3">
            <Button icon={<Car className="size-4" />} disabled={off} onClick={() => send('sim/car')}>Carro chega (sensor de chegada)</Button>
            <Button variant="secondary" icon={<Car className="size-4" />} disabled={off} onClick={() => send('sim/pass')}>Carro cruza a passagem</Button>
            <Button variant={obstacle ? 'warning' : 'secondary'} icon={<OctagonAlert className="size-4" />} disabled={off} onClick={() => send('sim/obstacle', { on: obstacle ? '0' : '1' })}>
              {obstacle ? 'Remover obstáculo' : 'Colocar obstáculo'}
            </Button>
            <Button variant="secondary" icon={<ToggleLeft className="size-4" />} disabled={off} onClick={() => send('sim/limit', { masked: '1' })}>Soltar fim de curso (simula falha)</Button>
            <Button variant="secondary" icon={<ToggleRight className="size-4" />} disabled={off} onClick={() => send('sim/limit', { masked: '0' })}>Restaurar fim de curso</Button>
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Roteiro: “Carro chega” → a cancela abre → “Carro cruza a passagem” → vagas −1 → fecha sozinha. O simulador replica a lógica do firmware, mas não prova que o firmware funciona.
          </p>
        </Card>
      </div>
    </>
  );
}
