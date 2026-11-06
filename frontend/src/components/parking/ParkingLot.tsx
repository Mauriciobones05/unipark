import { Car } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props { capacity: number; occupied: number; pending?: 'ENTRADA' | 'SAIDA' | 'NENHUMA' }

/** Mapa das vagas. As primeiras `occupied` aparecem ocupadas (a placa só conta, não sabe qual vaga). */
export function ParkingLot({ capacity, occupied, pending = 'NENHUMA' }: Props) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(84px, 1fr))` }}
      role="list"
      aria-label={`${occupied} de ${capacity} vagas ocupadas`}
    >
      {Array.from({ length: capacity }, (_, i) => {
        const busy = i < occupied;
        const next = pending === 'ENTRADA' && i === occupied;       // vaga que seria ocupada
        const leaving = pending === 'SAIDA' && i === occupied - 1;  // vaga que seria liberada
        return (
          <div
            key={i}
            role="listitem"
            className={cn(
              'relative grid h-28 place-items-center rounded-xl border-2 border-dashed transition-colors',
              busy ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-800/60 dark:text-brand-100'
                : 'border-emerald-400/70 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
              (next || leaving) && 'ring-2 ring-amber-400',
            )}
          >
            <span className="absolute left-2 top-1.5 text-[11px] font-bold opacity-70">V{String(i + 1).padStart(2, '0')}</span>
            {busy ? <Car className="size-9" aria-hidden /> : <span className="text-xs font-semibold uppercase tracking-wide">Livre</span>}
            {(next || leaving) && <span className="absolute bottom-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">{next ? 'reservada' : 'saindo'}</span>}
          </div>
        );
      })}
    </div>
  );
}
