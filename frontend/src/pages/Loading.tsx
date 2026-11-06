import { WifiOff } from 'lucide-react';

/** Estado inicial: ainda sem nenhuma resposta do ESP32 (ou ele não responde). */
export function Loading({ lost }: { lost: boolean }) {
  if (lost) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div className="max-w-sm space-y-3">
          <WifiOff className="mx-auto size-10 text-rose-500" aria-hidden />
          <h1 className="text-lg font-semibold">Sem resposta do ESP32</h1>
          <p className="text-sm text-[var(--text-muted)]">Confira se o celular/PC está na rede <b>Cancela-ESP32</b> e se a placa está ligada. A tela volta sozinha quando a placa responder.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Carregando">
      {[0, 1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]" />)}
    </div>
  );
}
