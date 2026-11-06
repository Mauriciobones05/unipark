// T1 - LEDs: alterna verde e vermelho a cada 500 ms. Teste com: pio run -e hw_leds -t upload
#include <Arduino.h>
#include "config.h"
void setup() { Serial.begin(115200); pinMode(PIN_LED_GREEN, OUTPUT); pinMode(PIN_LED_RED, OUTPUT); }
void loop() {
  bool g = (millis() / 500) & 1;
  digitalWrite(PIN_LED_GREEN, g);
  digitalWrite(PIN_LED_RED, !g);
  static bool last = !g;
  if (g != last) { last = g; Serial.println(g ? "VERDE aceso" : "VERMELHO aceso"); }
}
