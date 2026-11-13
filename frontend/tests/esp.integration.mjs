// Integração real: navegador -> interface -> API -> ESP32. Movimenta o servo.
// PC no Wi-Fi Cancela-ESP32, firmware bench e npm run dev:esp em execução.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const localUrl = process.env.UNIPARK_BASE_URL || 'http://localhost:5173';
const espUrl = process.env.UNIPARK_ESP_URL || 'http://192.168.4.1';
const output = resolve('test-results', `esp-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(output, { recursive: true });
const report = { localUrl, espUrl, startedAt: new Date().toISOString(), tests: [], commands: [], pageErrors: [], assetFailures: [] };
let browser, desktop, phone, page, mobilePage, original;

async function until(check, label, timeout = 10000) {
  const end = Date.now() + timeout;
  let lastError;
  while (Date.now() < end) {
    try { const result = await check(); if (result) return result; } catch (error) { lastError = error; }
    await delay(250);
  }
  throw new Error(`Timeout: ${label}${lastError ? ` (${lastError.message})` : ''}`);
}

async function status(context) {
  const response = await context.request.get('/api/status', { timeout: 3000 });
  assert.equal(response.status(), 200, 'API de status deve responder 200');
  return response.json();
}

async function state(context, predicate, label, timeout) {
  return until(async () => { const value = await status(context); return predicate(value) && value; }, label, timeout);
}

async function test(name, run) {
  const started = Date.now();
  try {
    await run();
    report.tests.push({ name, passed: true, durationMs: Date.now() - started });
    console.log(`OK ${name}`);
  } catch (error) {
    report.tests.push({ name, passed: false, durationMs: Date.now() - started, error: error.message });
    throw error;
  }
}

function observe(p) {
  p.setDefaultTimeout(10000);
  p.on('pageerror', error => report.pageErrors.push({ url: p.url(), error: error.message }));
  p.on('requestfailed', request => {
    if (['script', 'stylesheet'].includes(request.resourceType())) {
      report.assetFailures.push({ url: request.url(), error: request.failure()?.errorText });
    }
  });
}

async function nav(p, name) {
  await p.getByRole('link', { name, exact: true }).click();
  await p.getByRole('heading', { name, exact: true }).waitFor();
}

async function command(p, buttonName, path) {
  const responsePromise = p.waitForResponse(r => new URL(r.url()).pathname === `/api/${path}` && r.request().method() === 'POST');
  await p.getByRole('button', { name: buttonName, exact: true }).click();
  const response = await responsePromise;
  const body = await response.json();
  report.commands.push({ source: new URL(p.url()).origin, path, payload: response.request().postData(), status: response.status(), body });
  assert.equal(response.status(), 200, `${path}: HTTP ${response.status()}`);
  assert.equal(body.ok, true, `${path}: ${body.message}`);
  return body;
}

async function mode(p, context, value) {
  const label = value === 'MANUAL' ? 'Manual' : 'Automático';
  const control = p.getByRole('button', { name: label, exact: true });
  await control.waitFor();
  await until(() => control.isEnabled(), `botão ${label} habilitado`);
  if ((await status(context)).mode !== value) await command(p, label, 'mode');
  await state(context, s => s.mode === value, `modo ${value}`);
  await until(async () => (await control.getAttribute('aria-pressed')) === 'true', `modo ${value} refletido na tela`);
}

async function close(p, context) {
  await command(p, 'Fechar cancela', 'close');
  await state(context, s => s.state === 'FECHADA' && s.servo.angle === 0 && s.parking.auth === 'NENHUMA', 'fechamento confirmado pela API');
  await p.getByText('Fechada', { exact: true }).first().waitFor();
}

async function occupancy(p, context, value) {
  await p.getByRole('spinbutton').fill(String(value));
  await command(p, 'Ajustar', 'parking/occupied');
  await state(context, s => s.parking.occupied === value, `ocupação ${value}`);
}

try {
  browser = await chromium.launch({ channel: process.env.UNIPARK_BROWSER || 'msedge', headless: true });
  desktop = await browser.newContext({ baseURL: localUrl, viewport: { width: 1440, height: 1000 } });
  page = await desktop.newPage(); observe(page);
  await test('Localhost usa a ESP32 real e recebe estado ao vivo', async () => {
    await page.goto('/#/cancela', { waitUntil: 'domcontentloaded' });
    original = await status(desktop);
    assert.equal(original.benchMode, true, 'Este roteiro movimenta o servo e exige firmware de bancada');
    assert.notEqual(original.simulator, true, 'O simulador não deve estar ativo');
    assert.equal(original.fault.code, 'NENHUMA');
    assert.equal(original.sensors.arrival, false, 'Deixe o sensor D32 livre durante os comandos');
    assert.equal(original.sensors.obstacle, false, 'Deixe o sensor D33 livre durante os comandos');
    await page.getByRole('heading', { name: 'Cancela', exact: true }).waitFor();
    await page.getByText(/Modo de bancada: teste do servo sem haste/).waitFor();
    await state(desktop, s => s.state === 'FECHADA', 'posição inicial fechada', 12000);
  });
  await test('Interface altera para manual, abre e fecha o servo', async () => {
    await mode(page, desktop, 'MANUAL');
    await command(page, 'Abrir (sem contar vaga)', 'open');
    await state(desktop, s => s.state === 'ABERTA' && s.servo.angle === 90 && s.leds.green, 'abertura e LED verde');
    await page.getByText('Aberta', { exact: true }).first().waitFor();
    await page.screenshot({ path: resolve(output, 'desktop-aberta.png'), fullPage: true });
    await close(page, desktop);
  });
  await test('Ajustar ocupação atualiza a placa e bloqueia entrada quando lotado', async () => {
    await nav(page, 'Estacionamento');
    await occupancy(page, desktop, original.parking.capacity);
    await until(async () => !(await page.getByRole('button', { name: 'Liberar entrada', exact: true }).isEnabled()), 'entrada desabilitada ao lotar');
    await occupancy(page, desktop, 2);
    await until(() => page.getByRole('button', { name: 'Liberar saída', exact: true }).isEnabled(), 'saída habilitada com veículos dentro');
  });
  for (const [label, path, auth] of [['Liberar entrada', 'release-entry', 'ENTRADA'], ['Liberar saída', 'release-exit', 'SAIDA']]) {
    await test(`${label} envia autorização real sem contar vaga antes da passagem`, async () => {
      await nav(page, 'Estacionamento');
      await command(page, label, path);
      const s = await state(desktop, s => s.state === 'ABERTA' && s.parking.auth === auth, `autorização ${auth}`);
      assert.equal(s.parking.occupied, 2, 'Vaga só deve mudar com a passagem pelo sensor');
      await until(async () => !(await page.getByRole('button', { name: 'Liberar entrada', exact: true }).isEnabled()), 'entrada bloqueada com autorização pendente');
      await nav(page, 'Cancela');
      await close(page, desktop);
    });
  }
  await test('Eventos e desempenho exibem respostas da placa', async () => {
    await nav(page, 'Eventos');
    await page.getByText('Operador liberou SAIDA', { exact: true }).first().waitFor();
    await nav(page, 'Desempenho');
    const metrics = await desktop.request.get('/api/metrics');
    assert.equal(metrics.status(), 200);
    const value = await metrics.json();
    assert.ok(value.openCycles >= 3 && value.closeCycles >= 3);
    assert.equal(value.closeStartedWithObstacle, 0);
    await nav(page, 'Cancela');
  });
  await test('Perda de conexão desabilita comandos e reconexão restaura controles', async () => {
    const open = page.getByRole('button', { name: 'Abrir (sem contar vaga)', exact: true });
    await until(() => open.isEnabled(), 'abrir habilitado antes da desconexão');
    await desktop.setOffline(true);
    await page.getByText(/Conexão com o ESP32 perdida/).waitFor();
    assert.equal(await open.isEnabled(), false);
    await page.screenshot({ path: resolve(output, 'desktop-sem-conexao.png'), fullPage: true });
    await desktop.setOffline(false);
    await until(() => open.isEnabled(), 'abrir reabilitado após reconectar');
    assert.equal(await page.getByText(/Conexão com o ESP32 perdida/).count(), 0);
  });
  await test('Painel servido pela ESP32 funciona em tela de celular e sincroniza com localhost', async () => {
    phone = await browser.newContext({ baseURL: espUrl, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobilePage = await phone.newPage(); observe(mobilePage);
    for (const asset of ['/app.js', '/index.css']) {
      const response = await phone.request.get(asset);
      assert.equal(response.status(), 200);
      const encodings = response.headersArray().filter(header => header.name.toLowerCase() === 'content-encoding');
      assert.equal(encodings.length, 1, `${asset}: Content-Encoding deve aparecer uma única vez`);
      assert.equal(encodings[0].value, 'gzip');
      assert.ok((await response.body()).length > 0, `${asset}: navegador deve conseguir descompactar`);
    }
    await mobilePage.goto('/#/cancela', { waitUntil: 'domcontentloaded' });
    await mobilePage.getByRole('heading', { name: 'Cancela', exact: true }).waitFor();
    assert.equal((await status(phone)).benchMode, true);
    assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Layout deve caber na tela de celular');
    await mode(mobilePage, phone, 'AUTOMATICO');
    await until(async () => (await page.getByRole('button', { name: 'Automático', exact: true }).getAttribute('aria-pressed')) === 'true', 'localhost sincroniza alteração feita no celular');
    await mode(mobilePage, phone, 'MANUAL');
    await command(mobilePage, 'Abrir (sem contar vaga)', 'open');
    await state(phone, s => s.state === 'ABERTA' && s.servo.angle === 90, 'abertura pelo painel móvel');
    await mobilePage.getByText('Aberta', { exact: true }).first().waitFor();
    await mobilePage.screenshot({ path: resolve(output, 'celular-aberta.png'), fullPage: true });
    await close(mobilePage, phone);
    await phone.close(); phone = null;
  });
  assert.deepEqual(report.pageErrors, [], 'Não deve haver erros JavaScript no navegador');
  assert.deepEqual(report.assetFailures, [], 'Scripts e estilos devem carregar sem erros de rede ou compressão');
} catch (error) {
  report.error = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
  if (page) await page.screenshot({ path: resolve(output, 'falha.png'), fullPage: true }).catch(() => {});
  if (mobilePage && !mobilePage.isClosed()) await mobilePage.screenshot({ path: resolve(output, 'celular-falha.png'), fullPage: true }).catch(() => {});
} finally {
  if (desktop) await desktop.setOffline(false).catch(() => {});
  if (phone) await phone.close().catch(() => {});
  if (original?.benchMode && page && desktop) {
    try {
      await nav(page, 'Cancela');
      await mode(page, desktop, 'MANUAL');
      const current = await status(desktop);
      if (current.state === 'ABERTA' && !current.sensors.obstacle) await close(page, desktop);
      await state(desktop, s => s.state === 'FECHADA', 'fechamento ao encerrar');
      await nav(page, 'Estacionamento');
      await occupancy(page, desktop, original.parking.occupied);
      await nav(page, 'Cancela');
      await mode(page, desktop, original.mode);
      report.finalStatus = await status(desktop);
      await page.screenshot({ path: resolve(output, 'desktop-final.png'), fullPage: true });
      report.cleanup = `Modo e ocupação originais restaurados após o fechamento de teste. Estado final: ${report.finalStatus.state}. Em automático, uma nova detecção pode iniciar outra abertura.`;
    } catch (error) {
      report.cleanupError = error.message;
      process.exitCode = 1;
    }
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close();
  console.log(`Relatório: ${resolve(output, 'report.json')}`);
  console.log(`${report.tests.filter(t => t.passed).length}/${report.tests.length} testes passaram.`);
}
