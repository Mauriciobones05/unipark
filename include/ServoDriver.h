#pragma once
// Servo SG90 acionado direto pelo periferico LEDC (50 Hz). Sem biblioteca externa.
#include <Arduino.h>
#include "config.h"

class ServoDriver {
 public:
  void begin(uint8_t pin, uint8_t channel = 0);
  void write(float degrees);   // gera PWM (liga o servo se estiver desligado)
  void release();              // para o PWM (servo sem torque)
  bool active() const { return active_; }
 private:
  uint8_t pin_ = 0, ch_ = 0;
  bool active_ = false;
  uint32_t lastDuty_ = 0;
};
