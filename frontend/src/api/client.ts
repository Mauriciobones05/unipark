import type { ApiResult, CommandBody } from './types';

/** Tempo máximo de espera por resposta: o ESP32 pode sumir a qualquer momento. */
export const TIMEOUT_MS = 1500;

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(path, { ...init, signal: ctl.signal, cache: 'no-store' });
    let body: T | null = null;
    try { body = (await r.json()) as T; } catch { /* resposta sem JSON */ }
    return { status: r.status, ok: r.ok, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Comando POST. `form` vai como application/x-www-form-urlencoded (o que o WebServer do ESP32 lê). */
export function postCommand(cmd: string, form?: Record<string, string>): Promise<ApiResult<CommandBody>> {
  return api<CommandBody>('/api/' + cmd, form
    ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() }
    : { method: 'POST' });
}
