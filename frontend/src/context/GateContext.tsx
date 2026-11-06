import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, postCommand } from '@/api/client';
import type { Metrics, Status } from '@/api/types';
import { useToast } from './ToastContext';

const POLL_MS = 500;           // consulta de /api/status
const LOST_AFTER_MS = 2500;    // sem resposta válida por este tempo => "conexão perdida"
const METRICS_EVERY = 6;       // /api/metrics a cada N consultas
const HISTORY_MAX = 40;

export interface OccupancyPoint { t: number; occupied: number }

interface GateApi {
  status: Status | null;
  metrics: Metrics | null;
  /** true quando o ESP32 parou de responder: os dados exibidos estão desatualizados */
  lost: boolean;
  /** true enquanto um comando está em andamento (evita cliques repetidos) */
  busy: boolean;
  history: OccupancyPoint[];
  send: (cmd: string, form?: Record<string, string>) => Promise<boolean>;
}

const Ctx = createContext<GateApi | null>(null);

export function GateProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<OccupancyPoint[]>([]);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let tick = 0;
    let lastOk = 0;
    const loop = async () => {
      try {
        const r = await api<Status>('/api/status');
        if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
        lastOk = Date.now();
        if (!alive) return;
        const s = r.body;
        setStatus(s);
        setLost(false);
        setHistory(h => (h.length && h[h.length - 1].occupied === s.parking.occupied
          ? h
          : [...h, { t: Date.now(), occupied: s.parking.occupied }].slice(-HISTORY_MAX)));
        if (tick++ % METRICS_EVERY === 0) {
          const m = await api<Metrics>('/api/metrics');
          if (alive && m.ok && m.body) setMetrics(m.body);
        }
      } catch {
        if (alive && Date.now() - lastOk > LOST_AFTER_MS) setLost(true);
      }
      if (alive) timer = setTimeout(loop, POLL_MS);
    };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // Um comando por vez. O ESP32 decide (200/400/409); aqui só traduzimos a resposta.
  const send = useCallback(async (cmd: string, form?: Record<string, string>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      const r = await postCommand(cmd, form);
      const text = r.body?.message ?? 'HTTP ' + r.status;
      if (r.ok) { toast.push('success', text); return true; }
      if (r.status === 409) toast.push('error', 'Comando recusado: ' + text);
      else if (r.status === 400) toast.push('error', 'Requisição inválida: ' + text);
      else toast.push('error', `Erro ${r.status}: ${text}`);
      return false;
    } catch {
      toast.push('error', 'Sem resposta do ESP32. Comando não confirmado.');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [toast]);

  const value = useMemo(() => ({ status, metrics, lost, busy, history, send }), [status, metrics, lost, busy, history, send]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGate(): GateApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGate fora do GateProvider');
  return v;
}
