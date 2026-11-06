#pragma once
// ============================================================
//  GateController - maquina de estados da cancela.
//  Logica pura: recebe leituras (GateInputs) e produz saidas (angulo do servo,
//  LEDs). Nao chama funcoes do Arduino, por isso pode ser testada no PC.
//  NAO e thread-safe: quem chamar de varias tarefas deve usar o mutex (Sync.h).
// ============================================================
#include <stdint.h>
#include "config.h"

enum class GateState : uint8_t { INICIALIZANDO, FECHADA, ABRINDO, ABERTA, FECHANDO, FALHA };
enum class GateMode  : uint8_t { AUTOMATICO, MANUAL };
enum class FaultCode : uint8_t { NENHUMA, FIM_CURSO_TIMEOUT, FIM_CURSO_PRESO, FIM_CURSO_PERDIDO };

enum class Auth : uint8_t { NENHUMA, ENTRADA, SAIDA };   // passagem autorizada aguardando o veiculo

const char* authName(Auth a);
const char* stateName(GateState s);
const char* modeName(GateMode m);
const char* faultName(FaultCode f);
const char* faultMessage(FaultCode f);

// Leituras dos sensores em um instante (preenchidas pelo SensorManager).
struct GateInputs {
  uint32_t now = 0;
  bool     arrival = false;           // chegada: valor filtrado (true = veiculo)
  uint32_t arrivalRawSince = 0;       // instante em que a leitura bruta de chegada mudou (para medir T01)
  bool     obstacle = false;          // passagem: valor filtrado (true = obstaculo)
  bool     obstacleRaw = false;       // passagem: valor bruto (usado como protecao extra)
  uint32_t obstacleChangedAt = 0;     // ultima mudanca do valor filtrado de passagem
  bool     limit = false;             // fim de curso filtrado (true = acionado = fechada)
  uint32_t limitChangedAt = 0;        // ultima mudanca do fim de curso filtrado
};

// Resultado de um comando (traduzido em codigo HTTP pela camada web).
struct CmdResult {
  bool        ok;
  int         http;   // 200, 409...
  const char* msg;
};

struct GateEvent { uint32_t t; char msg[60]; };

constexpr uint8_t EVENT_LOG_SIZE = 12;
constexpr uint8_t RESP_LOG_SIZE  = 20;

struct GateMetrics {
  uint32_t openCycles = 0;           // aberturas iniciadas
  uint32_t closeCycles = 0;          // fechamentos confirmados pelo fim de curso
  uint32_t closeBlockedByObstacle = 0;  // comandos de fechar recusados por haver obstaculo (T02)
  uint32_t reversals = 0;            // fechamentos interrompidos e revertidos por obstaculo (T02)
  uint32_t closeStartedWithObstacle = 0; // DEVE ficar em 0: fechamento iniciado com obstaculo
  uint32_t faults = 0;               // total de falhas
  uint32_t lastFaultDetectMs = 0;    // T05: tempo entre inicio do fechamento e a falha por timeout
  uint32_t rejectedCommands = 0;     // comandos recusados (409)
  uint32_t entries = 0;              // entradas contadas
  uint32_t exits = 0;                // saidas contadas
  uint32_t deniedFull = 0;           // veiculos barrados por estacionamento lotado
  uint32_t respTotal = 0;            // quantas respostas T01 ja foram medidas
  uint32_t respMs[RESP_LOG_SIZE] = {0};  // T01: ultimas medicoes deteccao -> inicio da abertura (anel)
};

// Foto do estado atual (copiada sob o mutex e usada para montar o JSON).
struct GateStatus {
  GateState state; GateMode mode; FaultCode fault;
  uint32_t  stateAgeMs;
  bool      arrival, obstacle, limit;
  float     servoAngle; bool servoEnabled;
  bool      ledGreen, ledRed;
  Auth      auth;
  uint16_t  capacity, occupied;
  GateMetrics metrics;
  uint8_t   eventCount; GateEvent events[EVENT_LOG_SIZE];  // do mais antigo para o mais novo
};

class GateController {
 public:
  explicit GateController(const GateConfig& cfg = GateConfig()) : cfg_(cfg) {}

  // Chamar uma vez no setup, com as primeiras leituras.
  void begin(const GateInputs& in);
  // Chamar a cada ciclo do loop(). Nao bloqueia.
  void update(const GateInputs& in);

  // ---- Comandos externos. Todos passam pelas regras de seguranca. ----
  CmdResult requestOpen();
  CmdResult requestClose();
  CmdResult requestMode(GateMode m);
  CmdResult requestResetFault();
  CmdResult requestReleaseEntry();             // operador libera UMA entrada (exige vaga livre)
  CmdResult requestReleaseExit();              // operador libera UMA saida (exige veiculo dentro)
  CmdResult requestSetOccupied(uint16_t n);    // ajuste manual da ocupacao (0..capacidade)

  // ---- Saidas para o hardware ----
  bool  servoEnabled() const { return servoEnabled_; }  // false = nao gerar PWM
  float servoAngle() const   { return angle_; }
  bool  ledGreen() const;
  bool  ledRed() const;

  Auth      auth() const { return auth_; }
  uint16_t  occupied() const { return occupied_; }
  uint16_t  capacity() const { return cfg_.capacity; }
  GateState state() const { return state_; }
  GateMode  mode() const  { return mode_; }
  FaultCode fault() const { return fault_; }
  const GateMetrics& metrics() const { return metrics_; }
  GateStatus status() const;

  void logEvent(const char* msg);
  // Funcao opcional chamada a cada evento (ex.: imprimir na Serial).
  void setLogSink(void (*sink)(uint32_t, const char*)) { sink_ = sink; }

 private:
  void setState(GateState s, const char* why);
  void enterFault(FaultCode f);
  void startOpening(const char* why);
  void startClosing(const char* why);
  bool obstacleBlocked() const { return in_.obstacle || in_.obstacleRaw; }
  void moveToward(float target, float degPerMs, uint32_t dt);
  void recordResponse(uint32_t ms);
  CmdResult release(Auth a);
  void completePassage();

  GateConfig cfg_;
  GateInputs in_;
  GateState  state_ = GateState::INICIALIZANDO;
  GateMode   mode_  = GateMode::AUTOMATICO;
  FaultCode  fault_ = FaultCode::NENHUMA;
  uint32_t   stateSince_ = 0, lastUpdate_ = 0;
  float      angle_ = 0.0f;
  bool       servoEnabled_ = false;
  bool       limitWaiting_ = false;    // servo ja chegou no angulo fechado, aguardando fim de curso
  uint32_t   limitWaitSince_ = 0;
  uint32_t   closeStartedAt_ = 0;
  Auth       auth_ = Auth::NENHUMA;
  uint16_t   occupied_ = 0;
  bool       prevObstacle_ = false;
  bool       arrivalHandled_ = false;  // o veiculo que esta no sensor de chegada ja foi tratado
  GateMetrics metrics_;
  GateEvent  events_[EVENT_LOG_SIZE];
  uint8_t    evHead_ = 0, evCount_ = 0;
  void     (*sink_)(uint32_t, const char*) = nullptr;
};
