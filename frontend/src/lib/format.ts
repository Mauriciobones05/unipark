import type { GateState, Auth } from '@/api/types';

export const STATE_LABEL: Record<GateState, string> = {
  INICIALIZANDO: 'Inicializando',
  FECHADA: 'Fechada',
  ABRINDO: 'Abrindo',
  ABERTA: 'Aberta',
  FECHANDO: 'Fechando',
  FALHA: 'Falha',
};

export const AUTH_LABEL: Record<Auth, string> = { NENHUMA: 'Nenhuma', ENTRADA: 'Entrada', SAIDA: 'Saída' };

export function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

/** Instante do evento em relação ao boot do ESP32 (a placa não tem relógio de parede). */
export function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
