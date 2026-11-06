// T6 - Wi-Fi: cria o Access Point e mostra a quantidade de clientes conectados.
#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_AP);
  IPAddress ip(192, 168, 4, 1);
  WiFi.softAPConfig(ip, ip, IPAddress(255, 255, 255, 0));
  bool ok = WiFi.softAP(AP_SSID, AP_PASSWORD, AP_CHANNEL, 0, AP_MAX_CLIENTS);
  Serial.printf("AP '%s' %s, IP %s\n", AP_SSID, ok ? "ativo" : "FALHOU", WiFi.softAPIP().toString().c_str());
}
void loop() {
  static uint32_t t0 = 0; static int last = -1;
  int n = WiFi.softAPgetStationNum();
  if (n != last || millis() - t0 >= 5000) { t0 = millis(); last = n; Serial.printf("[%lu ms] clientes: %d\n", millis(), n); }
}
