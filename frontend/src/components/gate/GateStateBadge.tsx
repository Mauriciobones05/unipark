import type { GateState } from '@/api/types';
import { STATE_LABEL } from '@/lib/format';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';

export const STATE_TONE: Record<GateState, Tone> = {
  INICIALIZANDO: 'neutral',
  FECHADA: 'danger',
  ABRINDO: 'warning',
  ABERTA: 'success',
  FECHANDO: 'warning',
  FALHA: 'danger',
};

export function GateStateBadge({ state }: { state: GateState }) {
  return (
    <StatusBadge tone={STATE_TONE[state]} pulse={state === 'FALHA'}>
      {STATE_LABEL[state]}
    </StatusBadge>
  );
}
