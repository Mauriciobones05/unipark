// Cliente da API REST do ESP32. Toda chamada tem timeout: o ESP32 pode sumir a qualquer momento.
export const TIMEOUT_MS = 1500;

export async function api(path, opts = {}) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(path, { ...opts, signal: ctl.signal, cache: 'no-store' });
    let body = null;
    try { body = await r.json(); } catch { /* resposta sem JSON */ }
    return { status: r.status, ok: r.ok, body };
  } finally {
    clearTimeout(to);
  }
}

export const post = (cmd, form) =>
  api('/api/' + cmd, form
    ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() }
    : { method: 'POST' });
