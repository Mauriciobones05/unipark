#pragma once
// Leitura e filtragem dos 3 sensores digitais (chegada, passagem, fim de curso).
#include <Arduino.h>
#include "DebounceFilter.h"
#include "GateController.h"

class SensorManager {
 public:
  void begin();
  // Le os pinos e atualiza os filtros. Chamar a cada ciclo do loop().
  void update(uint32_t now);
  // Copia as leituras para a estrutura usada pela maquina de estados.
  GateInputs inputs(uint32_t now) const;

#if ENABLE_FAULT_SIM
  // Somente ensaios: faz o fim de curso "parecer" solto (simula falta de confirmacao).
  void setLimitMasked(bool m) { limitMasked_ = m; }
  bool limitMasked() const { return limitMasked_; }
#endif

 private:
  static bool readActive(uint8_t pin, bool activeLow) { return (digitalRead(pin) == LOW) == activeLow; }
  DebounceFilter arrival_, obstacle_, limit_;
#if ENABLE_FAULT_SIM
  bool limitMasked_ = false;
#endif
};
