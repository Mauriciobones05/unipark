// T2 - Sensor de chegada (FC-51, GPIO 32): imprime quando muda. Aproxime/afaste o carrinho.
#include <Arduino.h>
#include "config.h"
void setup() { Serial.begin(115200); pinMode(PIN_ARRIVAL, INPUT); pinMode(PIN_LED_GREEN, OUTPUT); }
void loop() {
  static int last = -1;
  int v = digitalRead(PIN_ARRIVAL);
  if (v != last) { last = v; Serial.printf("[%lu ms] chegada: %s (nivel %d)\n", millis(), (v == LOW) == ARRIVAL_ACTIVE_LOW ? "VEICULO" : "livre", v); }
  digitalWrite(PIN_LED_GREEN, (v == LOW) == ARRIVAL_ACTIVE_LOW);   // LED verde espelha o sensor
  delay(5);
}
