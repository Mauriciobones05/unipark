// T7 - HTTP: AP + servidor que responde "ola" em http://192.168.4.1/ e JSON em /ping.
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "config.h"
static WebServer server(80);
void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_AP);
  IPAddress ip(192, 168, 4, 1);
  WiFi.softAPConfig(ip, ip, IPAddress(255, 255, 255, 0));
  WiFi.softAP(AP_SSID, AP_PASSWORD, AP_CHANNEL, 0, AP_MAX_CLIENTS);
  server.on("/", [] { server.send(200, "text/plain; charset=utf-8", "ola do ESP32"); });
  server.on("/ping", [] { server.send(200, "application/json", String("{\"uptimeMs\":") + millis() + "}"); });
  server.begin();
  Serial.println("Acesse http://192.168.4.1/ e /ping");
}
void loop() { server.handleClient(); }
