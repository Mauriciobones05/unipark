// Cancela Inteligente ESP32 - loop principal.
// Nenhum delay() bloqueante: sensores -> maquina de estados -> saidas, a cada ciclo.
#include <Arduino.h>
#include "config.h"
#include "SensorManager.h"
#include "GateController.h"
#include "ServoDriver.h"
#include "WebServerManager.h"
#include "Sync.h"

SemaphoreHandle_t gGateMutex;

static SensorManager sensors;
static GateController gate{GateConfig()};
static ServoDriver servo;
static WebServerManager web(gate, sensors);

static void logToSerial(uint32_t t, const char* msg) { Serial.printf("[%8lu ms] %s\n", (unsigned long)t, msg); }

void setup() {
  Serial.begin(115200);
  gGateMutex = xSemaphoreCreateMutex();

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, HIGH);      // bloqueado ate prova em contrario
  servo.begin(PIN_SERVO);                // sem pulso ate a maquina de estados autorizar
  sensors.begin();

  gate.setLogSink(logToSerial);
  gate.begin(sensors.inputs(millis()));
  if (!web.begin()) Serial.println("[erro] tarefa web nao iniciou");
}

void loop() {
  bool servoOn, green, red;
  float angle;
  {
    GateLock lock;
    uint32_t now = millis();
    sensors.update(now);
    gate.update(sensors.inputs(now));
    servoOn = gate.servoEnabled(); angle = gate.servoAngle();
    green = gate.ledGreen(); red = gate.ledRed();
  }
  if (servoOn) servo.write(angle);
  digitalWrite(PIN_LED_GREEN, green);
  digitalWrite(PIN_LED_RED, red);
  delay(1);   // apenas cede CPU (1 ms); a logica nao depende de delay()
}
