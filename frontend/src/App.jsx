import { useCallback, useEffect, useRef, useState } from 'react';
import { api, post } from './api.js';

const POLL_MS = 500;          // intervalo de consulta de /api/status
const LOST_AFTER_MS = 2500;   // sem resposta valida por este tempo => "conexao perdida"
const METRICS_EVERY = 6;      // /api/metrics a cada N consultas

const STATE_TXT = { INICIALIZANDO: 'Inicializando', FECHADA: 'Fechada', ABRINDO: 'Abrindo', ABERTA: 'Aberta', FECHANDO: 'Fechando', FALHA: 'FALHA' };
const MODE_TXT = { AUTOMATICO: 'Automático', MANUAL: 'Manual' };

const fmtMs = ms => { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`; };

// Consulta periodica. "lost" so vira true se passar LOST_AFTER_MS sem resposta valida.
function usePolling() {
  const [status, setStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let alive = true, timer, tick = 0, lastOk = 0;
    const loop = async () => {
      try {
        const r = await api('/api/status');
        if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
        lastOk = Date.now();
        if (!alive) return;
        setStatus(r.body); setLost(false);
        if (tick++ % METRICS_EVERY === 0) {
          const m = await api('/api/metrics');
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

  return { status, metrics, lost };
}

function Row({ label, children }) {
  return <div className="row"><span>{label}</span><b>{children}</b></div>;
}

function Tag({ active, on, off }) {
  return <b className={'tag ' + (active ? 'on' : 'ok')}>{active ? on : off}</b>;
}

function Metrics({ m }) {
  if (!m) return <p className="hint">Carregando…</p>;
  const r = m.response;
  return (
    <>
      <Row label="Resposta detecção → abertura">
        {r.samples ? `média ${r.avgMs} · mín ${r.minMs} · máx ${r.maxMs} ms (n=${r.total})` : 'sem medições'}
      </Row>
      <Row label="Últimas medições (ms)">{r.lastMs.length ? r.lastMs.join(', ') : '--'}</Row>
      <Row label="Fechamentos bloqueados por obstáculo">{m.closeBlockedByObstacle}</Row>
      <Row label="Reaberturas por obstáculo">{m.reversals}</Row>
      <Row label="Fechamentos iniciados com obstáculo">{m.closeStartedWithObstacle}</Row>
      <Row label="Falhas / tempo de detecção (T05)">{m.faults} / {m.faults ? m.lastFaultDetectMs + ' ms' : '--'}</Row>
    </>
  );
}

export default function App() {
  const { status: s, metrics, lost } = usePolling();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);       // { text, err }
  const busyRef = useRef(false);

  // Um comando por vez: evita cliques repetidos acidentais.
  const send = useCallback(async (cmd, form) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const r = await post(cmd, form);
      const text = (r.body && r.body.message) || 'HTTP ' + r.status;
      if (r.ok) setMsg({ text, err: false });
      else if (r.status === 409) setMsg({ text: 'Comando recusado: ' + text, err: true });
      else if (r.status === 400) setMsg({ text: 'Requisição inválida: ' + text, err: true });
      else setMsg({ text: `Erro ${r.status}: ${text}`, err: true });
    } catch {
      setMsg({ text: 'Sem resposta do ESP32. Comando não confirmado.', err: true });
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }, []);

  if (!s) {
    return (
      <>
        <header><h1>Cancela Inteligente</h1><span className="pill pill-off">{lost ? 'Sem conexão' : 'Conectando...'}</span></header>
        {lost && <div className="banner banner-error">Não foi possível falar com o ESP32. Confira a rede Cancela-ESP32.</div>}
      </>
    );
  }

  // Habilita so o que a maquina de estados aceitaria (o ESP32 continua sendo a autoridade).
  const st = s.state, off = busy || lost;
  const canOpen = !off && (st === 'FECHADA' || st === 'FECHANDO');
  const canClose = !off && st === 'ABERTA' && !s.sensors.obstacle;
  const canReset = !off && st === 'FALHA' && !s.sensors.obstacle;

  return (
    <div className={lost ? 'lost' : ''}>
      <header>
        <h1>Cancela Inteligente</h1>
        <span className={'pill ' + (lost ? 'pill-off' : 'pill-on')}>{lost ? 'Sem conexão' : 'Conectado'}</span>
      </header>

      {lost && <div className="banner banner-error">Conexão com o ESP32 perdida. Os valores abaixo estão desatualizados e os comandos foram desativados.</div>}
      {s.fault.code !== 'NENHUMA' && (
        <div className="banner banner-error">
          FALHA: {s.fault.message} ({s.fault.code}). Corrija a causa física e use "Recuperar falha".
        </div>
      )}

      <main>
        <section className="card">
          <h2>Cancela</h2>
          <div className={'state s-' + st}>{STATE_TXT[st] || st}</div>
          <Row label="Modo">{MODE_TXT[s.mode] || s.mode}</Row>
          <Row label="Há quanto tempo neste estado">{fmtMs(s.stateAgeMs)}</Row>
          <Row label="Ângulo do servo">{s.servo.enabled ? s.servo.angle.toFixed(0) + '°' : 'sem PWM'}</Row>
          <Row label="LEDs">
            <span className={'led' + (s.leds.green ? ' g' : '')} /> verde <span className={'led' + (s.leds.red ? ' r' : '')} /> vermelho
          </Row>
        </section>

        <section className="card">
          <h2>Sensores</h2>
          <Row label="Chegada (GPIO 32)"><Tag active={s.sensors.arrival} on="Veículo detectado" off="Livre" /></Row>
          <Row label="Passagem (GPIO 33)"><Tag active={s.sensors.obstacle} on="Obstáculo detectado" off="Livre" /></Row>
          <Row label="Fim de curso (GPIO 26)">
            <b className={'tag ' + (s.sensors.limit ? 'ok' : '')}>{s.sensors.limit ? 'Acionado' : 'Não acionado'}</b>
          </Row>
          <Row label="Wi-Fi">{s.wifi.ssid} · {s.wifi.stations} cliente(s){s.wifi.apUp ? '' : ' · AP CAIU'}</Row>
        </section>

        <section className="card">
          <h2>Controles</h2>
          <div className="btns">
            <button disabled={!canOpen} onClick={() => send('open')}>ABRIR CANCELA</button>
            <button disabled={!canClose} onClick={() => send('close')}>FECHAR CANCELA</button>
            <button disabled={off || s.mode === 'AUTOMATICO'} onClick={() => send('mode', { mode: 'auto' })}>ATIVAR MODO AUTOMÁTICO</button>
            <button disabled={off || s.mode === 'MANUAL'} onClick={() => send('mode', { mode: 'manual' })}>ATIVAR MODO MANUAL</button>
            <button className="warn" disabled={!canReset} onClick={() => send('reset-fault')}>RECONHECER / RECUPERAR FALHA</button>
          </div>
          <p className={'msg ' + (msg ? (msg.err ? 'err' : 'okk') : '')} role="status" aria-live="polite">{msg ? msg.text : ''}</p>
          <p className="hint">Os botões apenas fazem pedidos: a cancela decide pelas regras de segurança (obstáculo, fim de curso, falha).</p>
        </section>

        <section className="card">
          <h2>Medições (T01 / T02)</h2>
          <Metrics m={metrics} />
        </section>

        <section className="card wide">
          <h2>Eventos</h2>
          <ul className="events">
            {s.events.map((e, i) => <li key={e.t + '-' + i}><time>{(e.t / 1000).toFixed(1)} s</time>{e.msg}</li>)}
          </ul>
        </section>
      </main>
    </div>
  );
}
