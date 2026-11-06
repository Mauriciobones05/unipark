'use strict';
// Atualizacao por fetch periodico (simples e robusto: se a rede cai, a proxima tentativa funciona sozinha).
const POLL_MS = 500;          // intervalo de consulta do /api/status
const TIMEOUT_MS = 1500;      // tempo maximo de espera por resposta
const LOST_AFTER_MS = 2500;   // sem resposta valida por este tempo => "conexao perdida"
const METRICS_EVERY = 6;      // /api/metrics a cada N consultas de status

const $ = id => document.getElementById(id);
const STATE_TXT = { INICIALIZANDO:'Inicializando', FECHADA:'Fechada', ABRINDO:'Abrindo', ABERTA:'Aberta', FECHANDO:'Fechando', FALHA:'FALHA' };
const MODE_TXT = { AUTOMATICO:'Automático', MANUAL:'Manual' };

let lastOk = 0, tick = 0, busy = false, last = null;

async function api(path, opts = {}) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(path, { ...opts, signal: ctl.signal, cache: 'no-store' });
    let body = null;
    try { body = await r.json(); } catch (_) { /* resposta sem JSON */ }
    return { status: r.status, ok: r.ok, body };
  } finally { clearTimeout(to); }
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
}
function fmtClock(ms) { return (ms / 1000).toFixed(1) + ' s'; }
function setTag(el, active, onTxt, offTxt) {
  el.textContent = active ? onTxt : offTxt;
  el.className = 'tag ' + (active ? 'on' : 'ok');
}
function say(text, isErr) { const m = $('msg'); m.textContent = text; m.className = 'msg ' + (isErr ? 'err' : 'okk'); }

function setLost(lost) {
  document.body.classList.toggle('lost', lost);
  $('lostBanner').hidden = !lost;
  const c = $('conn');
  c.textContent = lost ? 'Sem conexão' : 'Conectado';
  c.className = 'pill ' + (lost ? 'pill-off' : 'pill-on');
  if (lost) document.querySelectorAll('button').forEach(b => b.disabled = true);
}

// Habilita so o que a maquina de estados aceitaria (o ESP32 continua sendo a autoridade).
function updateButtons(s) {
  const st = s.state;
  $('bOpen').disabled  = busy || !(st === 'FECHADA' || st === 'FECHANDO');
  $('bClose').disabled = busy || !(st === 'ABERTA' && !s.sensors.obstacle);
  $('bAuto').disabled   = busy || s.mode === 'AUTOMATICO';
  $('bManual').disabled = busy || s.mode === 'MANUAL';
  $('bReset').disabled  = busy || st !== 'FALHA' || s.sensors.obstacle;
}

function render(s) {
  last = s;
  const st = $('state');
  st.textContent = STATE_TXT[s.state] || s.state;
  st.className = 'state s-' + s.state;
  $('mode').textContent = MODE_TXT[s.mode] || s.mode;
  $('age').textContent = fmtMs(s.stateAgeMs);
  $('angle').textContent = s.servo.enabled ? s.servo.angle.toFixed(0) + '°' : 'sem PWM';
  $('ledG').className = 'led' + (s.leds.green ? ' g' : '');
  $('ledR').className = 'led' + (s.leds.red ? ' r' : '');
  setTag($('sArrival'), s.sensors.arrival, 'Veículo detectado', 'Livre');
  setTag($('sObstacle'), s.sensors.obstacle, 'Obstáculo detectado', 'Livre');
  const lim = $('sLimit');
  lim.textContent = s.sensors.limit ? 'Acionado' : 'Não acionado';
  lim.className = 'tag ' + (s.sensors.limit ? 'ok' : '');
  $('wifi').textContent = `${s.wifi.ssid} · ${s.wifi.stations} cliente(s)` + (s.wifi.apUp ? '' : ' · AP CAIU');
  const fb = $('faultBanner');
  fb.hidden = s.fault.code === 'NENHUMA';
  fb.textContent = `FALHA: ${s.fault.message} (${s.fault.code}). Corrija a causa física e use "Recuperar falha".`;
  $('events').innerHTML = s.events.map(e => `<li><time>${fmtClock(e.t)}</time>${esc(e.msg)}</li>`).join('');
  updateButtons(s);
}
function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }

function renderMetrics(m) {
  const r = m.response;
  $('mResp').textContent = r.samples ? `média ${r.avgMs} · mín ${r.minMs} · máx ${r.maxMs} ms (n=${r.total})` : 'sem medições';
  $('mList').textContent = r.lastMs.length ? r.lastMs.join(', ') : '--';
  $('mBlock').textContent = m.closeBlockedByObstacle;
  $('mRev').textContent = m.reversals;
  $('mBad').textContent = m.closeStartedWithObstacle;
  $('mFault').textContent = `${m.faults} / ${m.faults ? m.lastFaultDetectMs + ' ms' : '--'}`;
}

async function poll() {
  try {
    const r = await api('/api/status');
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    lastOk = Date.now();
    setLost(false);
    render(r.body);
    if (tick++ % METRICS_EVERY === 0) {
      const m = await api('/api/metrics');
      if (m.ok && m.body) renderMetrics(m.body);
    }
  } catch (_) {
    if (Date.now() - lastOk > LOST_AFTER_MS) setLost(true);
  }
  setTimeout(poll, POLL_MS);
}

// Envio de comandos: um por vez; botoes ficam travados ate a resposta.
async function send(btn) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  const cmd = btn.dataset.cmd;
  let url = '/api/' + cmd, opts = { method: 'POST' };
  if (cmd === 'mode') {
    opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    opts.body = 'mode=' + encodeURIComponent(btn.dataset.arg);
  }
  try {
    const r = await api(url, opts);
    const msg = (r.body && r.body.message) || ('HTTP ' + r.status);
    if (r.ok) say(msg, false);
    else if (r.status === 409) say('Comando recusado: ' + msg, true);
    else if (r.status === 400) say('Requisição inválida: ' + msg, true);
    else say(`Erro ${r.status}: ${msg}`, true);
  } catch (_) {
    say('Sem resposta do ESP32. Comando não confirmado.', true);
  } finally {
    busy = false;
    if (last && Date.now() - lastOk <= LOST_AFTER_MS) updateButtons(last);
  }
}

document.querySelectorAll('button[data-cmd]').forEach(b => b.addEventListener('click', () => send(b)));
document.querySelectorAll('button').forEach(b => b.disabled = true);
poll();
