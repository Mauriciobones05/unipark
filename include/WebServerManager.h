#pragma once
// Access Point Wi-Fi + servidor HTTP (API REST + arquivos do LittleFS).
// Roda em uma tarefa propria (nucleo 0): um cliente lento NUNCA atrasa o loop() da cancela.
#include <Arduino.h>
#include "GateController.h"
#include "SensorManager.h"

class WebServerManager {
 public:
  WebServerManager(GateController& gate, SensorManager& sensors) : gate_(gate), sensors_(sensors) {}
  bool begin();   // sobe AP, monta LittleFS, registra rotas e cria a tarefa
 private:
  friend void webTask(void*);
  bool startAccessPoint();
  void registerRoutes();
  void loopOnce();
  void sendStatus();
  void sendMetrics();
  void sendResult(const CmdResult& r);
  void sendJson(int code, const String& body);
  void serveFile(const String& path);

  GateController& gate_;
  SensorManager&  sensors_;
  uint32_t lastApCheck_ = 0;
  int      lastStations_ = 0;
};
