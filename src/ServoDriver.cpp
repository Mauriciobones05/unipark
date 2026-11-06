#include "ServoDriver.h"

static constexpr uint8_t  SERVO_RES_BITS = 16;
static constexpr uint32_t SERVO_FREQ_HZ  = 50;   // periodo de 20 ms

void ServoDriver::begin(uint8_t pin, uint8_t channel) {
  pin_ = pin; ch_ = channel;
  pinMode(pin_, OUTPUT);
  digitalWrite(pin_, LOW);          // sem pulso ate o primeiro write()
  ledcSetup(ch_, SERVO_FREQ_HZ, SERVO_RES_BITS);
}

void ServoDriver::write(float degrees) {
  if (degrees < 0) degrees = 0;
  if (degrees > 180) degrees = 180;
  float us = SERVO_US_MIN + (SERVO_US_MAX - SERVO_US_MIN) * (degrees / 180.0f);
  uint32_t duty = (uint32_t)(us / 20000.0f * ((1UL << SERVO_RES_BITS) - 1));
  if (!active_) { ledcAttachPin(pin_, ch_); active_ = true; lastDuty_ = 0; }
  if (duty != lastDuty_) { ledcWrite(ch_, duty); lastDuty_ = duty; }
}

void ServoDriver::release() {
  if (!active_) return;
  ledcDetachPin(pin_);
  pinMode(pin_, OUTPUT);
  digitalWrite(pin_, LOW);
  active_ = false;
}
