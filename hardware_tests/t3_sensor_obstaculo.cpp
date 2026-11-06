// T3 - Sensor de obstaculo/passagem (FC-51, GPIO 33): imprime quando muda.
#include <Arduino.h>
#include "config.h"
void setup() { Serial.begin(115200); pinMode(PIN_OBSTACLE, INPUT); pinMode(PIN_LED_RED, OUTPUT); }
void loop() {
  static int last = -1;
  int v = digitalRead(PIN_OBSTACLE);
  if (v != last) { last = v; Serial.printf("[%lu ms] passagem: %s (nivel %d)\n", millis(), (v == LOW) == OBSTACLE_ACTIVE_LOW ? "OBSTACULO" : "livre", v); }
  digitalWrite(PIN_LED_RED, (v == LOW) == OBSTACLE_ACTIVE_LOW);    // LED vermelho espelha o sensor
  delay(5);
}
