// T5 - Fim de curso (GPIO 26, pull-up interno): contato NO ligado entre GPIO 26 e GND.
#include <Arduino.h>
#include "config.h"
void setup() { Serial.begin(115200); pinMode(PIN_LIMIT, INPUT_PULLUP); }
void loop() {
  static int last = -1;
  int v = digitalRead(PIN_LIMIT);
  if (v != last) { last = v; Serial.printf("[%lu ms] fim de curso: %s (nivel %d)\n", millis(), (v == LOW) == LIMIT_ACTIVE_LOW ? "ACIONADO" : "solto", v); }
  delay(2);   // repique mecanico aparece como varias linhas: e normal (o firmware filtra)
}
