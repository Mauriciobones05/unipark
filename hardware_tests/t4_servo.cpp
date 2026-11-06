// T4 - Servo: vai entre angleClosed e angleOpen (GateConfig) a cada 2 s, sem delay() no movimento.
// Use para CALIBRAR os angulos: altere os valores abaixo ate o palito ficar horizontal/vertical sem forcar.
// ATENCAO: servo com fonte externa de 5 V e GND comum com o ESP32.
#include <Arduino.h>
#include "ServoDriver.h"
static ServoDriver servo;
static const float ANG_A = GateConfig().angleClosed;
static const float ANG_B = GateConfig().angleOpen;
void setup() { Serial.begin(115200); servo.begin(PIN_SERVO); Serial.printf("Servo: %.0f <-> %.0f graus\n", ANG_A, ANG_B); }
void loop() {
  static uint32_t t0 = 0; static bool toB = false;
  if (millis() - t0 >= 2000 || t0 == 0) {
    t0 = millis(); toB = !toB;
    servo.write(toB ? ANG_B : ANG_A);
    Serial.printf("[%lu ms] servo -> %.0f graus\n", t0, toB ? ANG_B : ANG_A);
  }
}
