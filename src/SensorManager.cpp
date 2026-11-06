#include "SensorManager.h"

void SensorManager::begin() {
  // FC-51 tem saida ativa (comparador LM393), nao precisa de pull-up.
  pinMode(PIN_ARRIVAL, INPUT);
  pinMode(PIN_OBSTACLE, INPUT);
  pinMode(PIN_LIMIT, INPUT_PULLUP);   // fim de curso: NO entre GPIO e GND
  uint32_t now = millis();
  arrival_.begin(FILTER_ARRIVAL, readActive(PIN_ARRIVAL, ARRIVAL_ACTIVE_LOW), now);
  obstacle_.begin(FILTER_OBSTACLE, readActive(PIN_OBSTACLE, OBSTACLE_ACTIVE_LOW), now);
  limit_.begin(FILTER_LIMIT, readActive(PIN_LIMIT, LIMIT_ACTIVE_LOW), now);
}

void SensorManager::update(uint32_t now) {
  arrival_.update(readActive(PIN_ARRIVAL, ARRIVAL_ACTIVE_LOW), now);
  obstacle_.update(readActive(PIN_OBSTACLE, OBSTACLE_ACTIVE_LOW), now);
  bool lim = readActive(PIN_LIMIT, LIMIT_ACTIVE_LOW);
#if ENABLE_FAULT_SIM
  if (limitMasked_) lim = false;
#endif
  limit_.update(lim, now);
}

GateInputs SensorManager::inputs(uint32_t now) const {
  GateInputs in;
  in.now = now;
  in.arrival = arrival_.active();
  in.arrivalRawSince = arrival_.rawChangedAt();
  in.obstacle = obstacle_.active();
  in.obstacleRaw = obstacle_.rawActive();
  in.obstacleChangedAt = obstacle_.changedAt();
  in.limit = limit_.active();
  in.limitChangedAt = limit_.changedAt();
  return in;
}
