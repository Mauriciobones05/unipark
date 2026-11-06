import type { ReactNode } from 'react';
import { Cpu, Gauge, Radar, SlidersHorizontal } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GateVisual } from '@/components/gate/GateVisual';
import { GateStateBadge } from '@/components/gate/GateStateBadge';
import { GateControls } from '@/components/gate/GateControls';
import { SensorList } from '@/components/gate/SensorList';
import { fmtDuration } from '@/lib/format';
import { Loading } from './Loading';

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2.5 text-sm last:border-0">
      <dt className="text-[var(--text-muted)]">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

export function GatePage() {
  const { status: s, lost } = useGate();
  if (!s) return <Loading lost={lost} />;

  return (
    <>
      <PageHeader title="Cancela" subtitle="Monitoramento do hardware e comandos diretos. A segurança do firmware tem prioridade sobre qualquer comando." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Estado da cancela" icon={<Gauge className="size-4" />} action={<GateStateBadge state={s.state} />} subtitle={`Neste estado há ${fmtDuration(s.stateAgeMs)}`} />
          <div className="mx-auto max-w-xl text-brand-900 dark:text-brand-100"><GateVisual status={s} dim={lost} /></div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">A abertura é estimada por tempo; só o fechamento é confirmado fisicamente pelo fim de curso.</p>
        </Card>

        <Card>
          <CardHeader title="Controles" icon={<SlidersHorizontal className="size-4" />} />
          <GateControls status={s} />
        </Card>

        <Card>
          <CardHeader title="Sensores e rede" icon={<Radar className="size-4" />} />
          <SensorList status={s} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Saídas e diagnóstico" icon={<Cpu className="size-4" />} />
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row k="Modo" v={s.mode === 'AUTOMATICO' ? 'Automático' : 'Manual'} />
              <Row k="Servo" v={s.servo.enabled ? `${s.servo.angle.toFixed(0)}° (comandado)` : 'Sem PWM'} />
              <Row k="LED verde" v={<StatusBadge tone={s.leds.green ? 'success' : 'neutral'}>{s.leds.green ? 'Aceso' : 'Apagado'}</StatusBadge>} />
              <Row k="LED vermelho" v={<StatusBadge tone={s.leds.red ? 'danger' : 'neutral'}>{s.leds.red ? 'Aceso' : 'Apagado'}</StatusBadge>} />
            </div>
            <div>
              <Row k="Falha ativa" v={s.fault.code === 'NENHUMA' ? <StatusBadge tone="success">Nenhuma</StatusBadge> : <StatusBadge tone="danger" pulse>{s.fault.code}</StatusBadge>} />
              <Row k="Tempo ligado" v={fmtDuration(s.uptimeMs)} />
              <Row k="Clientes Wi-Fi" v={s.wifi.stations} />
              <Row k="Simulação de falha" v={s.faultSim.enabled ? (s.faultSim.limitMasked ? 'Fim de curso mascarado' : 'Habilitada') : 'Desabilitada'} />
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
