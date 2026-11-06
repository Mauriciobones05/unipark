#include "WebServerManager.h"
#include "Sync.h"
#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>

static WebServer server(80);

// ---------------------------------------------------------------- utilitarios
void WebServerManager::sendJson(int code, const String& body) {
  server.sendHeader("Cache-Control", "no-store");
  server.send(code, "application/json; charset=utf-8", body);
}

void WebServerManager::sendResult(const CmdResult& r) {
  String b = "{\"ok\":";
  b += r.ok ? "true" : "false";
  b += ",\"message\":\"";
  b += r.msg;
  b += "\"}";
  sendJson(r.http, b);
}

static const char* mimeOf(const String& p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".css"))  return "text/css; charset=utf-8";
  if (p.endsWith(".js"))   return "application/javascript; charset=utf-8";
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".ico"))  return "image/x-icon";
  if (p.endsWith(".png"))  return "image/png";
  if (p.endsWith(".svg"))  return "image/svg+xml";
  return "text/plain";
}

void WebServerManager::serveFile(const String& path) {
  // O build do React gera app.js.gz / index.css.gz (menores na flash e no Wi-Fi).
  bool gz = LittleFS.exists(path + ".gz");
  if (!gz && !LittleFS.exists(path)) {
    if (path == "/index.html") {
      server.send(200, "text/html; charset=utf-8",
                  "<h1>Cancela ESP32</h1><p>Interface nao encontrada no LittleFS.</p>"
                  "<p>Execute: <code>pio run -t uploadfs</code></p>");
    } else {
      server.send(404, "text/plain", "Arquivo nao encontrado");
    }
    return;
  }
  File f = LittleFS.open(gz ? path + ".gz" : path, "r");
  server.sendHeader("Cache-Control", "no-cache");
  if (gz) server.sendHeader("Content-Encoding", "gzip");
  server.streamFile(f, mimeOf(path));
  f.close();
}

// ---------------------------------------------------------------- JSON
void WebServerManager::sendStatus() {
  GateStatus s;
  bool maskedSim = false;
  {
    GateLock lock;
    s = gate_.status();
#if ENABLE_FAULT_SIM
    maskedSim = sensors_.limitMasked();
#endif
  }
  String b;
  b.reserve(1800);
  b += "{\"state\":\"";  b += stateName(s.state);
  b += "\",\"mode\":\""; b += modeName(s.mode);
  b += "\",\"stateAgeMs\":"; b += s.stateAgeMs;
  b += ",\"uptimeMs\":"; b += millis();
  b += ",\"fault\":{\"code\":\""; b += faultName(s.fault);
  b += "\",\"message\":\""; b += faultMessage(s.fault); b += "\"}";
  b += ",\"sensors\":{\"arrival\":"; b += s.arrival ? "true" : "false";
  b += ",\"obstacle\":"; b += s.obstacle ? "true" : "false";
  b += ",\"limit\":"; b += s.limit ? "true" : "false"; b += "}";
  b += ",\"servo\":{\"angle\":"; b += String(s.servoAngle, 1);
  b += ",\"enabled\":"; b += s.servoEnabled ? "true" : "false"; b += "}";
  b += ",\"leds\":{\"green\":"; b += s.ledGreen ? "true" : "false";
  b += ",\"red\":"; b += s.ledRed ? "true" : "false"; b += "}";
  b += ",\"parking\":{\"capacity\":"; b += s.capacity;
  b += ",\"occupied\":"; b += s.occupied;
  b += ",\"free\":"; b += (s.capacity - s.occupied);
  b += ",\"auth\":\""; b += authName(s.auth);
  b += "\",\"entries\":"; b += s.metrics.entries;
  b += ",\"exits\":"; b += s.metrics.exits;
  b += ",\"deniedFull\":"; b += s.metrics.deniedFull; b += "}";
  b += ",\"wifi\":{\"ssid\":\"" AP_SSID "\",\"stations\":"; b += WiFi.softAPgetStationNum();
  b += ",\"apUp\":"; b += (WiFi.getMode() & WIFI_AP) ? "true" : "false"; b += "}";
  b += ",\"faultSim\":{\"enabled\":"; b += ENABLE_FAULT_SIM ? "true" : "false";
  b += ",\"limitMasked\":"; b += maskedSim ? "true" : "false"; b += "}";
  b += ",\"events\":[";
  for (int i = s.eventCount - 1; i >= 0; i--) {     // do mais novo para o mais antigo
    b += "{\"t\":"; b += s.events[i].t; b += ",\"msg\":\""; b += s.events[i].msg; b += "\"}";
    if (i > 0) b += ",";
  }
  b += "]}";
  sendJson(200, b);
}

void WebServerManager::sendMetrics() {
  GateMetrics m;
  { GateLock lock; m = gate_.metrics(); }
  uint32_t n = m.respTotal < RESP_LOG_SIZE ? m.respTotal : RESP_LOG_SIZE;
  uint32_t mn = 0, mx = 0, sum = 0;
  for (uint32_t i = 0; i < n; i++) {
    uint32_t v = m.respMs[i];
    if (i == 0 || v < mn) mn = v;
    if (v > mx) mx = v;
    sum += v;
  }
  String b;
  b.reserve(600);
  b += "{\"openCycles\":"; b += m.openCycles;
  b += ",\"closeCycles\":"; b += m.closeCycles;
  b += ",\"closeBlockedByObstacle\":"; b += m.closeBlockedByObstacle;
  b += ",\"reversals\":"; b += m.reversals;
  b += ",\"closeStartedWithObstacle\":"; b += m.closeStartedWithObstacle;
  b += ",\"faults\":"; b += m.faults;
  b += ",\"lastFaultDetectMs\":"; b += m.lastFaultDetectMs;
  b += ",\"rejectedCommands\":"; b += m.rejectedCommands;
  b += ",\"response\":{\"total\":"; b += m.respTotal;
  b += ",\"samples\":"; b += n;
  b += ",\"minMs\":"; b += mn;
  b += ",\"maxMs\":"; b += mx;
  b += ",\"avgMs\":"; b += (n ? sum / n : 0);
  b += ",\"lastMs\":[";
  for (uint32_t i = 0; i < n; i++) {                // ordem cronologica
    uint32_t idx = (m.respTotal - n + i) % RESP_LOG_SIZE;
    b += m.respMs[idx];
    if (i + 1 < n) b += ",";
  }
  b += "]}}";
  sendJson(200, b);
}

// ---------------------------------------------------------------- rotas
void WebServerManager::registerRoutes() {
  server.on("/", HTTP_GET, [this] { serveFile("/index.html"); });
  server.on("/api/status", HTTP_GET, [this] { sendStatus(); });
  server.on("/api/metrics", HTTP_GET, [this] { sendMetrics(); });

  // Todos os comandos apenas PEDEM algo a maquina de estados; ela decide.
  server.on("/api/open", HTTP_POST, [this] {
    CmdResult r; { GateLock l; r = gate_.requestOpen(); } sendResult(r);
  });
  server.on("/api/close", HTTP_POST, [this] {
    CmdResult r; { GateLock l; r = gate_.requestClose(); } sendResult(r);
  });
  server.on("/api/reset-fault", HTTP_POST, [this] {
    CmdResult r; { GateLock l; r = gate_.requestResetFault(); } sendResult(r);
  });
  server.on("/api/release-entry", HTTP_POST, [this] {
    CmdResult r; { GateLock l; r = gate_.requestReleaseEntry(); } sendResult(r);
  });
  server.on("/api/release-exit", HTTP_POST, [this] {
    CmdResult r; { GateLock l; r = gate_.requestReleaseExit(); } sendResult(r);
  });
  server.on("/api/parking/occupied", HTTP_POST, [this] {
    String v = server.arg("value");
    bool digits = v.length() > 0 && v.length() <= 4;
    for (unsigned i = 0; i < v.length(); i++) if (!isDigit(v[i])) digits = false;
    if (!digits) { sendResult({false, 400, "Parametro 'value' deve ser um numero inteiro >= 0"}); return; }
    CmdResult r; { GateLock l; r = gate_.requestSetOccupied((uint16_t)v.toInt()); } sendResult(r);
  });
  server.on("/api/mode", HTTP_POST, [this] {
    String m = server.arg("mode");   // aceita query string ou corpo form-urlencoded
    if (m != "auto" && m != "manual") {
      sendResult({false, 400, "Parametro 'mode' deve ser 'auto' ou 'manual'"});
      return;
    }
    CmdResult r;
    { GateLock l; r = gate_.requestMode(m == "auto" ? GateMode::AUTOMATICO : GateMode::MANUAL); }
    sendResult(r);
  });

#if ENABLE_FAULT_SIM
  // Somente no ambiente "faultsim": mascara o fim de curso para ensaiar a falha de posicionamento.
  server.on("/api/sim/limit", HTTP_POST, [this] {
    String v = server.arg("masked");
    if (v != "0" && v != "1") { sendResult({false, 400, "Parametro 'masked' deve ser 0 ou 1"}); return; }
    { GateLock l; sensors_.setLimitMasked(v == "1"); gate_.logEvent(v == "1" ? "SIM: fim de curso mascarado" : "SIM: fim de curso normal"); }
    sendResult({true, 200, "Simulacao atualizada"});
  });
#endif

  server.onNotFound([this] {
    String uri = server.uri();
    if (uri.startsWith("/api/")) { sendResult({false, 404, "Rota inexistente ou metodo nao permitido"}); return; }
    serveFile(uri);
  });
}

// ---------------------------------------------------------------- Wi-Fi
bool WebServerManager::startAccessPoint() {
  WiFi.mode(WIFI_AP);
  IPAddress ip(192, 168, 4, 1), mask(255, 255, 255, 0);
  WiFi.softAPConfig(ip, ip, mask);
  return WiFi.softAP(AP_SSID, AP_PASSWORD, AP_CHANNEL, 0, AP_MAX_CLIENTS);
}

// Chamado periodicamente: o AP caiu? (diferente de um cliente ter desconectado)
void WebServerManager::loopOnce() {
  server.handleClient();
  uint32_t now = millis();
  if (now - lastApCheck_ >= AP_WATCHDOG_MS) {
    lastApCheck_ = now;
    bool apUp = (WiFi.getMode() & WIFI_AP) && WiFi.softAPIP() == IPAddress(192, 168, 4, 1);
    if (!apUp) {
      bool ok = startAccessPoint();
      GateLock l;
      gate_.logEvent(ok ? "Wi-Fi: Access Point reiniciado" : "Wi-Fi: falha ao reiniciar AP");
    }
    int st = WiFi.softAPgetStationNum();
    if (st != lastStations_) {
      GateLock l;
      gate_.logEvent(st > lastStations_ ? "Wi-Fi: cliente conectado" : "Wi-Fi: cliente desconectado");
      lastStations_ = st;
    }
  }
}

void webTask(void* p) {
  auto* self = static_cast<WebServerManager*>(p);
  for (;;) {
    self->loopOnce();
    vTaskDelay(pdMS_TO_TICKS(2));
  }
}

bool WebServerManager::begin() {
  bool fsOk = LittleFS.begin(false);
  bool apOk = startAccessPoint();
  Serial.printf("[wifi] AP '%s' %s  IP=%s\n", AP_SSID, apOk ? "ativo" : "FALHOU", WiFi.softAPIP().toString().c_str());
  Serial.printf("[fs] LittleFS %s\n", fsOk ? "montado" : "NAO montado (rode: pio run -t uploadfs)");
  {
    GateLock l;
    gate_.logEvent(apOk ? "Wi-Fi: Access Point ativo" : "Wi-Fi: AP falhou ao iniciar");
    if (!fsOk) gate_.logEvent("LittleFS ausente: envie a interface");
  }
  registerRoutes();
  server.begin();
  lastApCheck_ = millis();
  return xTaskCreatePinnedToCore(webTask, "web", 8192, this, 1, nullptr, 0) == pdPASS;
}
