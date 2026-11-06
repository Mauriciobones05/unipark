#pragma once
// Mutex que protege o GateController/SensorManager.
// loop() (nucleo 1) e a tarefa do servidor web (nucleo 0) acessam os mesmos objetos.
#include <Arduino.h>

extern SemaphoreHandle_t gGateMutex;

struct GateLock {
  GateLock()  { xSemaphoreTake(gGateMutex, portMAX_DELAY); }
  ~GateLock() { xSemaphoreGive(gGateMutex); }
};
