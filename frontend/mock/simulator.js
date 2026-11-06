// Simulador do ESP32 para desenvolver o painel SEM hardware.
// Reproduz a API REST e a maquina de estados de src/GateController.cpp (mesmos tempos e regras).
// ATENCAO: e uma copia em JavaScript, nao o firmware. Se mudar a logica em C++, atualize aqui tambem.

const CFG = {
  angleClosed: 0, angleOpen: 90, travelOpenMs: 1000, travelCloseMs: 1500, closeDelayMs: 3000,
  limitConfirmMs: 1500, openStuckMs: 600, limitLostMs: 400, capacity: 5, authWaitMs: 8000,
  filter: { arrival: [60, 150], obstacle: [20, 300], limit: [30, 30] },
};

class Filter {
  constructor([on, off], now) { this.on = on; this.off = off; this.raw = this.stable = false; this.rawAt = this.changedAt = now; }
  update(raw, now) {
    if (raw !== this.raw) { this.raw = raw; this.rawAt = now; }
    if (raw !== this.stable && now - this.rawAt >= (raw ? this.on : this.off)) { this.stable = raw; this.changedAt = now; }
  }
}

export function createSimulator() {
  const t0 = Date.now();
  const now = () => Date.now() - t0;

  // ---- sensores virtuais (o que a pessoa "faz" no mundo fisico) ----
  const world = { arrival: false, obstacle: false, limitMasked: false };
  const filters = { arrival: new Filter(CFG.filter.arrival, 0), obstacle: new Filter(CFG.filter.obstacle, 0), limit: new Filter(CFG.filter.limit, 0) };
  filters.limit.raw = filters.limit.stable = true; // comeca fechada, fim de curso acionado

  // ---- controlador ----
  const g = {
    state: 'INICIALIZANDO', mode: 'AUTOMATICO', fault: 'NENHUMA', since: 0, angle: CFG.angleClosed,
    servoEnabled: false, limitWaiting: false, limitWaitSince: 0, closeStartedAt: 0,
    auth: 'NENHUMA', occupied: 0, prevObstacle: false, arrivalHandled: false, last: 0,
    events: [], resp: [], respTotal: 0,
    m: { openCycles: 0, closeCycles: 0, closeBlockedByObstacle: 0, reversals: 0, closeStartedWithObstacle: 0, faults: 0, lastFaultDetectMs: 0, rejectedCommands: 0, entries: 0, exits: 0, deniedFull: 0 },
  };
  const FAULT_MSG = {
    NENHUMA: '',
    FIM_CURSO_TIMEOUT: 'Fim de curso nao confirmou o fechamento no tempo maximo',
    FIM_CURSO_PRESO: 'Fim de curso continua acionado com a cancela aberta',
    FIM_CURSO_PERDIDO: 'Fim de curso foi liberado com a cancela fechada',
  };
  const F = filters;
  const blocked = () => F.obstacle.stable || F.obstacle.raw;
  const log = msg => { g.events.push({ t: now(), msg: msg.slice(0, 59) }); if (g.events.length > 12) g.events.shift(); };

  function setState(s, why) {
    if ((s === 'FECHADA' || s === 'FALHA') && g.auth !== 'NENHUMA') { g.auth = 'NENHUMA'; log('Autorizacao expirou sem passagem'); }
    g.state = s; g.since = now(); log(why);
  }
  function enterFault(code) { g.fault = code; g.m.faults++; setState('FALHA', FAULT_MSG[code]); }
  function startOpening(why) { g.servoEnabled = true; g.m.openCycles++; setState('ABRINDO', why); }
  function startClosing(why) {
    if (blocked()) { g.m.closeStartedWithObstacle++; return; }
    g.servoEnabled = true; g.limitWaiting = false; g.closeStartedAt = now(); setState('FECHANDO', why);
  }
  function move(target, rate, dt) {
    const step = rate * dt, diff = target - g.angle;
    g.angle = Math.abs(diff) <= step ? target : g.angle + Math.sign(diff) * step;
  }
  function completePassage() {
    if (g.auth === 'ENTRADA') { if (g.occupied < CFG.capacity) g.occupied++; g.m.entries++; log('Entrada concluida: vaga ocupada'); }
    else { if (g.occupied > 0) g.occupied--; g.m.exits++; log('Saida concluida: vaga liberada'); }
    g.auth = 'NENHUMA';
  }

  function update() {
    const n = now(), dt = n - g.last; g.last = n;
    // fisica simulada: o fim de curso fecha quando o palito esta no angulo fechado
    const limitRaw = !world.limitMasked && g.angle <= CFG.angleClosed + 0.5;
    F.arrival.update(world.arrival, n); F.obstacle.update(world.obstacle, n); F.limit.update(limitRaw, n);
    const arrival = F.arrival.stable, limit = F.limit.stable;

    if (!arrival) g.arrivalHandled = false; else if (g.state !== 'FECHADA') g.arrivalHandled = true;
    if (g.auth !== 'NENHUMA' && g.prevObstacle && !F.obstacle.stable && ['ABRINDO', 'ABERTA', 'FECHANDO'].includes(g.state)) completePassage();
    g.prevObstacle = F.obstacle.stable;

    const range = CFG.angleOpen - CFG.angleClosed;
    switch (g.state) {
      case 'INICIALIZANDO':
        if (limit) { g.servoEnabled = true; setState('FECHADA', 'Fim de curso acionado: cancela fechada'); }
        break;
      case 'FECHADA':
        if (!limit && n - F.limit.changedAt >= CFG.limitLostMs) enterFault('FIM_CURSO_PERDIDO');
        else if (g.mode === 'AUTOMATICO' && arrival && !g.arrivalHandled) {
          g.arrivalHandled = true;
          if (g.occupied >= CFG.capacity) { g.m.deniedFull++; log('Lotado: entrada negada'); }
          else {
            g.resp[g.respTotal++ % 20] = n - F.arrival.rawAt;
            g.auth = 'ENTRADA'; startOpening('Veiculo detectado: abrindo');
          }
        }
        break;
      case 'ABRINDO':
        move(CFG.angleOpen, range / CFG.travelOpenMs, dt);
        if (g.angle === CFG.angleOpen) setState('ABERTA', 'Aberta (estimado por tempo)');
        break;
      case 'ABERTA':
        if (limit && n - F.limit.changedAt >= CFG.openStuckMs && n - g.since >= CFG.openStuckMs) enterFault('FIM_CURSO_PRESO');
        else if (g.mode === 'AUTOMATICO' && !blocked()) {
          const base = Math.max(g.since, F.obstacle.changedAt);
          const wait = g.auth !== 'NENHUMA' ? Math.max(CFG.closeDelayMs, CFG.authWaitMs) : CFG.closeDelayMs;
          if (n - base >= wait) startClosing('Passagem livre: fechando');
        }
        break;
      case 'FECHANDO':
        if (blocked()) { g.m.reversals++; startOpening('Obstaculo durante fechamento: reabrindo'); break; }
        move(CFG.angleClosed, range / CFG.travelCloseMs, dt);
        if (limit) { g.m.closeCycles++; setState('FECHADA', 'Fechada (fim de curso confirmou)'); }
        else if (g.angle === CFG.angleClosed) {
          if (!g.limitWaiting) { g.limitWaiting = true; g.limitWaitSince = n; }
          else if (n - g.limitWaitSince >= CFG.limitConfirmMs) { g.m.lastFaultDetectMs = n - g.closeStartedAt; enterFault('FIM_CURSO_TIMEOUT'); }
        }
        break;
      default: break;
    }
  }

  // ---- comandos ----
  const R = (ok, http, message) => ({ ok, http, body: { ok, message } });
  const reject = (http, msg) => { g.m.rejectedCommands++; return R(false, http, msg); };

  function release(a) {
    const entry = a === 'ENTRADA';
    let why = null;
    if (g.state === 'FALHA') why = 'Em FALHA: recupere a falha antes';
    else if (g.state === 'INICIALIZANDO') why = 'Sistema inicializando';
    else if (entry && g.occupied >= CFG.capacity) why = 'Estacionamento lotado: sem vagas';
    else if (!entry && g.occupied === 0) why = 'Estacionamento vazio: nenhuma saida a liberar';
    else if (g.auth !== 'NENHUMA') why = 'Ja existe uma passagem autorizada aguardando o veiculo';
    if (why) return reject(409, why);
    g.auth = a;
    const ev = entry ? 'Operador liberou ENTRADA' : 'Operador liberou SAIDA';
    if (g.state === 'FECHADA' || g.state === 'FECHANDO') startOpening(ev); else log(ev);
    return R(true, 200, entry ? 'Entrada liberada: aguardando o veiculo' : 'Saida liberada: aguardando o veiculo');
  }

  const commands = {
    open() {
      if (g.state === 'FECHADA') { startOpening('Comando: abrir'); return R(true, 200, 'Abrindo'); }
      if (g.state === 'FECHANDO') { g.m.reversals++; startOpening('Comando: abrir (reverte fechamento)'); return R(true, 200, 'Fechamento revertido: abrindo'); }
      if (g.state === 'FALHA') return reject(409, 'Em FALHA: recupere a falha antes de abrir');
      if (g.state === 'INICIALIZANDO') return reject(409, 'Sistema inicializando');
      return reject(409, 'Cancela ja esta aberta ou abrindo');
    },
    close() {
      if (g.state === 'ABERTA') {
        if (blocked()) { g.m.closeBlockedByObstacle++; g.m.rejectedCommands++; log('Fechar recusado: obstaculo na passagem'); return R(false, 409, 'Obstaculo detectado: fechamento bloqueado'); }
        startClosing('Comando: fechar'); return R(true, 200, 'Fechando');
      }
      if (g.state === 'ABRINDO') return reject(409, 'Aguarde a abertura terminar');
      if (g.state === 'FALHA') return reject(409, 'Em FALHA: fechamento bloqueado ate recuperar');
      if (g.state === 'INICIALIZANDO') return reject(409, 'Sistema inicializando');
      return reject(409, 'Cancela ja esta fechada ou fechando');
    },
    'release-entry': () => release('ENTRADA'),
    'release-exit': () => release('SAIDA'),
    mode(args) {
      if (args.mode !== 'auto' && args.mode !== 'manual') return R(false, 400, "Parametro 'mode' deve ser 'auto' ou 'manual'");
      const m = args.mode === 'auto' ? 'AUTOMATICO' : 'MANUAL';
      if (m === g.mode) return R(true, 200, 'Modo ja ativo');
      g.mode = m; log(m === 'AUTOMATICO' ? 'Modo AUTOMATICO ativado' : 'Modo MANUAL ativado');
      return R(true, 200, 'Modo alterado');
    },
    'reset-fault'() {
      if (g.state !== 'FALHA') return reject(409, 'Nao ha falha ativa');
      if (blocked()) return reject(409, 'Remova o obstaculo da passagem antes de recuperar');
      g.fault = 'NENHUMA';
      if (F.limit.stable) { g.angle = CFG.angleClosed; setState('FECHADA', 'Recuperado: fim de curso acionado'); return R(true, 200, 'Falha recuperada: cancela fechada'); }
      g.angle = CFG.angleOpen; startClosing('Recuperacao: tentativa unica de fechamento');
      return R(true, 200, 'Recuperacao iniciada: uma tentativa de fechamento');
    },
    'parking/occupied'(args) {
      const v = String(args.value ?? '');
      if (!/^\d{1,4}$/.test(v)) return R(false, 400, "Parametro 'value' deve ser um numero inteiro >= 0");
      if (+v > CFG.capacity) return R(false, 400, 'Ocupacao acima da capacidade');
      g.occupied = +v; log('Operador ajustou a ocupacao'); return R(true, 200, 'Ocupacao ajustada');
    },
    // ---- controles do "mundo" (existem so no simulador) ----
    'sim/car'() { world.arrival = true; setTimeout(() => { world.arrival = false; }, 1500); return R(true, 200, 'Carro chegou ao sensor de chegada'); },
    'sim/pass'() { world.obstacle = true; setTimeout(() => { world.obstacle = false; }, 1200); return R(true, 200, 'Carro cruzando a passagem'); },
    'sim/obstacle'(args) { world.obstacle = args.on === '1'; return R(true, 200, world.obstacle ? 'Obstaculo colocado' : 'Obstaculo removido'); },
    'sim/limit'(args) { world.limitMasked = args.masked === '1'; log(world.limitMasked ? 'SIM: fim de curso mascarado' : 'SIM: fim de curso normal'); return R(true, 200, 'Simulacao atualizada'); },
    'sim/reset'() { return R(true, 200, 'Reinicie o servidor (npm run dev) para zerar o simulador'); },
  };

  function status() {
    const free = CFG.capacity - g.occupied;
    return {
      state: g.state, mode: g.mode, stateAgeMs: now() - g.since, uptimeMs: now(),
      fault: { code: g.fault, message: FAULT_MSG[g.fault] },
      sensors: { arrival: F.arrival.stable, obstacle: F.obstacle.stable, limit: F.limit.stable },
      servo: { angle: +g.angle.toFixed(1), enabled: g.servoEnabled },
      leds: ledState(),
      parking: { capacity: CFG.capacity, occupied: g.occupied, free, auth: g.auth, entries: g.m.entries, exits: g.m.exits, deniedFull: g.m.deniedFull },
      wifi: { ssid: 'Cancela-ESP32', stations: 1, apUp: true },
      faultSim: { enabled: true, limitMasked: world.limitMasked },
      simulator: true,
      sim: { car: world.arrival, obstacle: world.obstacle },
      events: [...g.events].reverse(),
    };
  }
  function ledState() {
    const t = now();
    const red = { FECHADA: true, INICIALIZANDO: true, ABRINDO: true, FECHANDO: Math.floor(t / 500) % 2 === 0, FALHA: Math.floor(t / 150) % 2 === 0, ABERTA: false }[g.state];
    return { green: g.state === 'ABERTA' && g.fault === 'NENHUMA', red };
  }
  function metrics() {
    const n = Math.min(g.respTotal, 20), vals = [];
    for (let i = 0; i < n; i++) vals.push(g.resp[(g.respTotal - n + i) % 20]);
    return {
      ...g.m, response: {
        total: g.respTotal, samples: n, minMs: n ? Math.min(...vals) : 0, maxMs: n ? Math.max(...vals) : 0,
        avgMs: n ? Math.round(vals.reduce((a, b) => a + b, 0) / n) : 0, lastMs: vals,
      },
    };
  }

  g.last = now();
  setInterval(update, 5);

  // Retorna { http, body } para uma chamada da API.
  return function handle(method, path, args) {
    if (method === 'GET' && path === 'status') return { http: 200, body: status() };
    if (method === 'GET' && path === 'metrics') return { http: 200, body: metrics() };
    const c = method === 'POST' ? commands[path] : undefined;
    if (!c) return { http: 404, body: { ok: false, message: 'Rota inexistente ou metodo nao permitido' } };
    const r = c(args);
    return { http: r.http, body: r.body };
  };
}
