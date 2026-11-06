#pragma once
// ============================================================
//  config.h - TODOS os parametros ajustaveis do projeto.
//  Este arquivo nao depende do Arduino (pode ser usado nos testes no PC).
// ============================================================
#include <stdint.h>

// ---------- Pinagem (ESP32 DevKit V1, 30 pinos) ----------
// Nenhum destes e pino de boot (strapping: 0, 2, 5, 12, 15) e todos aceitam saida.
constexpr uint8_t PIN_ARRIVAL   = 32;  // FC-51 de chegada   (OUT)
constexpr uint8_t PIN_OBSTACLE  = 33;  // FC-51 de passagem  (OUT)
constexpr uint8_t PIN_SERVO     = 18;  // SG90 - sinal PWM
constexpr uint8_t PIN_LED_GREEN = 16;  // LED verde (via 220 ohm)
constexpr uint8_t PIN_LED_RED   = 17;  // LED vermelho (via 220 ohm)
constexpr uint8_t PIN_LIMIT     = 26;  // Fim de curso (NO -> GPIO, COM -> GND)

// ---------- Polaridade dos sensores ----------
// FC-51: saida em nivel BAIXO quando ha obstaculo (LED do modulo acende).
constexpr bool ARRIVAL_ACTIVE_LOW  = true;
constexpr bool OBSTACLE_ACTIVE_LOW = true;
// Fim de curso com pull-up interno: contato NO fecha para GND ao ser pressionado.
constexpr bool LIMIT_ACTIVE_LOW    = true;

// ---------- Filtros dos sensores (milissegundos) ----------
// "on" = tempo que a leitura bruta precisa ficar ativa para ser aceita.
// "off" = tempo que precisa ficar inativa para ser aceita.
struct FilterTimes { uint16_t onMs; uint16_t offMs; };
constexpr FilterTimes FILTER_ARRIVAL  = {60, 150};   // chegada: rejeita ruido, aceita carrinho rapido
constexpr FilterTimes FILTER_OBSTACLE = {20, 300};   // passagem: detecta rapido, so libera apos 300 ms estavel
constexpr FilterTimes FILTER_LIMIT    = {30, 30};    // fim de curso: elimina repique mecanico

// ---------- Estacionamento (simulado) ----------
constexpr uint16_t PARKING_CAPACITY = 5;   // total de vagas

// ---------- Parametros da cancela (calibrar no hardware real!) ----------
struct GateConfig {
  float    angleClosed      = 0.0f;     // graus com o palito horizontal (FECHADA)
  float    angleOpen        = 90.0f;    // graus com o palito vertical (ABERTA)
  uint32_t travelOpenMs     = 1000;     // tempo estimado para ir de fechada ate aberta
  uint32_t travelCloseMs    = 1500;     // tempo estimado para ir de aberta ate fechada (mais lento = mais seguro)
  uint32_t closeDelayMs     = 3000;     // espera com passagem livre antes de fechar sozinha
  uint32_t limitConfirmMs   = 1500;     // apos o servo chegar ao angulo fechado, tempo maximo ate o fim de curso acionar
  uint32_t openStuckMs      = 600;      // fim de curso ainda acionado com cancela ABERTA por este tempo => FALHA
  uint32_t limitLostMs      = 400;      // fim de curso liberado com cancela FECHADA por este tempo => FALHA
  uint16_t capacity         = PARKING_CAPACITY;  // vagas do estacionamento
  uint32_t authWaitMs       = 8000;     // com autorizacao pendente, tempo minimo de passagem livre antes de fechar
};

// ---------- Wi-Fi (Access Point) ----------
#define AP_SSID     "Cancela-ESP32"
#define AP_PASSWORD "cancela123"   // minimo 8 caracteres
constexpr uint8_t  AP_CHANNEL      = 6;
constexpr uint8_t  AP_MAX_CLIENTS  = 4;
constexpr uint32_t AP_WATCHDOG_MS  = 5000;  // intervalo de verificacao do Access Point

// ---------- Servo SG90 ----------
constexpr uint16_t SERVO_US_MIN = 500;    // pulso para 0 graus
constexpr uint16_t SERVO_US_MAX = 2400;   // pulso para 180 graus (reduza se o servo "zumbir" no fim)

// ---------- Simulacao de falha (somente ensaios) ----------
// Habilitada apenas no ambiente PlatformIO "faultsim" (-D ENABLE_FAULT_SIM=1).
#ifndef ENABLE_FAULT_SIM
#define ENABLE_FAULT_SIM 0
#endif
