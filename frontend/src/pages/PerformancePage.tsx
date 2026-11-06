import { Gauge, ShieldCheck, TimerReset } from 'lucide-react';
import { useGate } from '@/context/GateContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import type { Metrics } from '@/api/types';
import { Loading } from './Loading';

const LIMIT_MS = 500;

function ResponseChart({ values }: { values: number[] }) {
  const W = 560, H = 160, PAD = 28;
  if (!values.length) return <p className="grid h-[160px] place-items-center text-sm text-[var(--text-muted)]">Sem medições ainda: faça o carrinho passar pelo sensor de chegada.</p>;
  const max = Math.max(LIMIT_MS * 1.2, ...values);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const bw = Math.min(26, (W - PAD * 2) / values.length - 4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-brand-900 dark:text-brand-100" role="img" aria-label="Tempos de resposta medidos pela placa">
      <line x1={PAD} x2={W - PAD} y1={y(LIMIT_MS)} y2={y(LIMIT_MS)} stroke="#ef4444" strokeDasharray="5 4" />
      <text x={W - PAD} y={y(LIMIT_MS) - 4} textAnchor="end" fontSize="10" fill="#ef4444">limite {LIMIT_MS} ms</text>
      {values.map((v, i) => {
        const x = PAD + i * ((W - PAD * 2) / values.length) + 2;
        return (
          <g key={i}>
            <rect x={x} y={y(v)} width={bw} height={H - PAD - y(v)} rx="3" fill={v <= LIMIT_MS ? '#0081ef' : '#ef4444'} />
            <text x={x + bw / 2} y={H - PAD + 12} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

interface Criterion { id: string; name: string; target: string; measured: string; tone: Tone; verdict: string }

/** Veredito só a partir de contadores REAIS da placa; sem amostras suficientes aparece "em andamento". */
function criteria(m: Metrics): Criterion[] {
  const r = m.response;
  const t01Done = r.total >= 20;
  const t01Ok = r.samples > 0 && r.maxMs <= LIMIT_MS;
  const t02Total = m.closeBlockedByObstacle;
  const t02Bad = m.closeStartedWithObstacle;
  return [
    {
      id: 'T01', name: 'Tempo de resposta', target: `Abertura em até ${LIMIT_MS} ms (20 medições)`,
      measured: r.samples ? `${r.samples} amostra(s), máx ${r.maxMs} ms, média ${r.avgMs} ms` : 'sem medições',
      tone: !r.samples ? 'neutral' : !t01Ok ? 'danger' : t01Done ? 'success' : 'warning',
      verdict: !r.samples ? 'Aguardando' : !t01Ok ? 'Fora do limite' : t01Done ? 'Atendido' : `Em andamento (${r.total}/20)`,
    },
    {
      id: 'T02', name: 'Segurança contra obstáculos', target: '20 de 20 fechamentos bloqueados',
      measured: `${t02Total} bloqueio(s), ${m.reversals} reabertura(s), ${t02Bad} fechamento(s) iniciado(s) com obstáculo`,
      tone: t02Bad > 0 ? 'danger' : t02Total >= 20 ? 'success' : t02Total > 0 ? 'warning' : 'neutral',
      verdict: t02Bad > 0 ? 'Violação' : t02Total >= 20 ? 'Atendido' : t02Total > 0 ? `Em andamento (${t02Total}/20)` : 'Aguardando',
    },
    {
      id: 'T05', name: 'Falha de posicionamento', target: 'Detecção dentro do timeout (≈ 3000 ms)',
      measured: m.faults ? `${m.faults} falha(s); última detectada em ${m.lastFaultDetectMs} ms` : 'nenhuma falha ocorreu',
      tone: m.faults ? 'info' : 'neutral', verdict: m.faults ? 'Medido' : 'Aguardando',
    },
  ];
}

export function PerformancePage() {
  const { status: s, metrics: m, lost } = useGate();
  if (!s || !m) return <Loading lost={lost} />;
  const list = criteria(m);

  return (
    <>
      <PageHeader title="Desempenho" subtitle="Medições feitas pela própria placa. T03 (Wi-Fi) é medido no cliente com tools/t03_comunicacao.ps1." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="T01 · Detecção → início da abertura" icon={<TimerReset className="size-4" />} subtitle="Últimas 20 medições, em ms (inclui o filtro de 60 ms)" />
          <ResponseChart values={m.response.lastMs} />
        </Card>

        <Card>
          <CardHeader title="Ciclos" icon={<Gauge className="size-4" />} />
          <dl className="space-y-2 text-sm">
            {([['Aberturas', m.openCycles], ['Fechamentos confirmados', m.closeCycles], ['Comandos recusados', m.rejectedCommands], ['Falhas', m.faults]] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[var(--border)] pb-2 last:border-0"><dt className="text-[var(--text-muted)]">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Critérios de validação" icon={<ShieldCheck className="size-4" />} subtitle="Os contadores zeram ao reiniciar a placa" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr><th className="pb-2 pr-3">ID</th><th className="pb-2 pr-3">Critério</th><th className="pb-2 pr-3">Meta</th><th className="pb-2 pr-3">Medido</th><th className="pb-2">Situação</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {list.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 pr-3 font-mono font-semibold">{c.id}</td>
                    <td className="py-3 pr-3">{c.name}</td>
                    <td className="py-3 pr-3 text-[var(--text-muted)]">{c.target}</td>
                    <td className="py-3 pr-3">{c.measured}</td>
                    <td className="py-3"><StatusBadge tone={c.tone}>{c.verdict}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
