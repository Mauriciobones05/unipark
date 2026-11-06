#pragma once
// Filtro anti-ruido por tempo (debounce assimetrico). Sem dependencia do Arduino.
#include <stdint.h>
#include "config.h"

// Diferenca de tempo segura contra o estouro do millis() (uint32_t).
inline uint32_t elapsedMs(uint32_t now, uint32_t since) { return now - since; }

class DebounceFilter {
 public:
  void begin(FilterTimes t, bool initialRaw, uint32_t now) {
    times_ = t; raw_ = stable_ = initialRaw; rawChangedAt_ = changedAt_ = now;
  }
  // Chamar a cada ciclo com a leitura bruta ja convertida para "ativo = true".
  void update(bool raw, uint32_t now) {
    if (raw != raw_) { raw_ = raw; rawChangedAt_ = now; }
    uint16_t need = raw ? times_.onMs : times_.offMs;
    if (raw != stable_ && elapsedMs(now, rawChangedAt_) >= need) { stable_ = raw; changedAt_ = now; }
  }
  bool     active() const        { return stable_; }       // valor filtrado
  bool     rawActive() const     { return raw_; }          // valor bruto
  uint32_t changedAt() const     { return changedAt_; }    // instante da ultima mudanca do valor filtrado
  uint32_t rawChangedAt() const  { return rawChangedAt_; } // instante em que a leitura bruta assumiu o valor atual
 private:
  FilterTimes times_{0, 0};
  bool raw_ = false, stable_ = false;
  uint32_t rawChangedAt_ = 0, changedAt_ = 0;
};
