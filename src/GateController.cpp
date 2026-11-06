#include "GateController.h"
#include "DebounceFilter.h"
#include <string.h>
#include <math.h>

// ---------------------------------------------------------------- nomes
const char* stateName(GateState s) {
  switch (s) {
    case GateState::INICIALIZANDO: return "INICIALIZANDO";
    case GateState::FECHADA:       return "FECHADA";
    case GateState::ABRINDO:       return "ABRINDO";
    case GateState::ABERTA:        return "ABERTA";
    case GateState::FECHANDO:      return "FECHANDO";
    case GateState::FALHA:         return "FALHA";
  }
  return "?";
}
const char* modeName(GateMode m) { return m == GateMode::AUTOMATICO ? "AUTOMATICO" : "MANUAL"; }
const char* faultName(FaultCode f) {
  switch (f) {
    case FaultCode::NENHUMA:           return "NENHUMA";
    case FaultCode::FIM_CURSO_TIMEOUT: return "FIM_CURSO_TIMEOUT";
    case FaultCode::FIM_CURSO_PRESO:   return "FIM_CURSO_PRESO";
    case FaultCode::FIM_CURSO_PERDIDO: return "FIM_CURSO_PERDIDO";
  }
  return "?";
}
const char* faultMessage(FaultCode f) {
  switch (f) {
    case FaultCode::NENHUMA:           return "";
    case FaultCode::FIM_CURSO_TIMEOUT: return "Fim de curso nao confirmou o fechamento no tempo maximo";
    case FaultCode::FIM_CURSO_PRESO:   return "Fim de curso continua acionado com a cancela aberta";
    case FaultCode::FIM_CURSO_PERDIDO: return "Fim de curso foi liberado com a cancela fechada";
  }
  return "";
}

// ---------------------------------------------------------------- eventos
void GateController::logEvent(const char* msg) {
  GateEvent& e = events_[evHead_];
  e.t = in_.now;
  strncpy(e.msg, msg, sizeof(e.msg) - 1);
  e.msg[sizeof(e.msg) - 1] = 0;
  evHead_ = (evHead_ + 1) % EVENT_LOG_SIZE;
  if (evCount_ < EVENT_LOG_SIZE) evCount_++;
  if (sink_) sink_(e.t, e.msg);
}

void GateController::recordResponse(uint32_t ms) {
  metrics_.respMs[metrics_.respTotal % RESP_LOG_SIZE] = ms;
  metrics_.respTotal++;
}

// ---------------------------------------------------------------- transicoes
void GateController::setState(GateState s, const char* why) {
  state_ = s;
  stateSince_ = in_.now;
  logEvent(why);
}

void GateController::enterFault(FaultCode f) {
  fault_ = f;
  metrics_.faults++;
  // Servo permanece no ultimo angulo comandado: nenhum movimento automatico novo.
  setState(GateState::FALHA, faultMessage(f));
}

void GateController::startOpening(const char* why) {
  servoEnabled_ = true;
  metrics_.openCycles++;
  setState(GateState::ABRINDO, why);
}

void GateController::startClosing(const char* why) {
  // Ultima barreira: nunca iniciar fechamento com obstaculo.
  if (obstacleBlocked()) {
    metrics_.closeStartedWithObstacle++;   // nao deve ocorrer; contador existe para auditoria
    return;
  }
  servoEnabled_ = true;
  limitWaiting_ = false;
  closeStartedAt_ = in_.now;
  setState(GateState::FECHANDO, why);
}

void GateController::moveToward(float target, float degPerMs, uint32_t dt) {
  float step = degPerMs * (float)dt;
  float diff = target - angle_;
  if (fabsf(diff) <= step) angle_ = target;
  else angle_ += (diff > 0 ? step : -step);
}

// ---------------------------------------------------------------- ciclo
void GateController::begin(const GateInputs& in) {
  in_ = in;
  lastUpdate_ = in.now;
  stateSince_ = in.now;
  state_ = GateState::INICIALIZANDO;
  angle_ = cfg_.angleClosed;
  servoEnabled_ = false;                 // sem PWM ate sabermos que e seguro mover
  logEvent("Sistema iniciado");
}

void GateController::update(const GateInputs& in) {
  uint32_t dt = in.now - lastUpdate_;
  lastUpdate_ = in.now;
  in_ = in;
  const float openRate  = fabsf(cfg_.angleOpen - cfg_.angleClosed) / (float)cfg_.travelOpenMs;
  const float closeRate = fabsf(cfg_.angleOpen - cfg_.angleClosed) / (float)cfg_.travelCloseMs;

  switch (state_) {
    case GateState::INICIALIZANDO:
      if (in_.limit) {
        angle_ = cfg_.angleClosed; servoEnabled_ = true;
        setState(GateState::FECHADA, "Fim de curso acionado: cancela fechada");
      } else if (!obstacleBlocked()) {
        // Posicao desconhecida: assume aberta e faz UMA tentativa de fechamento lento.
        angle_ = cfg_.angleOpen;
        startClosing("Fim de curso livre no boot: fechando (tentativa unica)");
      }
      break;  // com obstaculo: aguarda, sem gerar PWM

    case GateState::FECHADA:
      if (!in_.limit && elapsedMs(in_.now, in_.limitChangedAt) >= cfg_.limitLostMs) {
        enterFault(FaultCode::FIM_CURSO_PERDIDO);
      } else if (mode_ == GateMode::AUTOMATICO && in_.arrival) {
        recordResponse(elapsedMs(in_.now, in_.arrivalRawSince));   // T01
        startOpening("Veiculo detectado: abrindo");
      }
      break;

    case GateState::ABRINDO:
      moveToward(cfg_.angleOpen, openRate, dt);
      if (angle_ == cfg_.angleOpen) setState(GateState::ABERTA, "Aberta (estimado por tempo)");
      break;

    case GateState::ABERTA:
      if (in_.limit && elapsedMs(in_.now, in_.limitChangedAt) >= cfg_.openStuckMs &&
          elapsedMs(in_.now, stateSince_) >= cfg_.openStuckMs) {
        enterFault(FaultCode::FIM_CURSO_PRESO);
      } else if (mode_ == GateMode::AUTOMATICO && !obstacleBlocked()) {
        // Passagem livre ha closeDelayMs: contagem recomeca a cada obstaculo.
        uint32_t base = (int32_t)(in_.obstacleChangedAt - stateSince_) > 0 ? in_.obstacleChangedAt : stateSince_;
        if (elapsedMs(in_.now, base) >= cfg_.closeDelayMs) startClosing("Passagem livre: fechando");
      }
      break;

    case GateState::FECHANDO:
      if (obstacleBlocked()) {                       // seguranca tem prioridade maxima
        metrics_.reversals++;
        startOpening("Obstaculo durante fechamento: reabrindo");
        break;
      }
      moveToward(cfg_.angleClosed, closeRate, dt);
      if (in_.limit) {
        metrics_.closeCycles++;
        setState(GateState::FECHADA, "Fechada (fim de curso confirmou)");
      } else if (angle_ == cfg_.angleClosed) {
        if (!limitWaiting_) { limitWaiting_ = true; limitWaitSince_ = in_.now; }
        else if (elapsedMs(in_.now, limitWaitSince_) >= cfg_.limitConfirmMs) {
          metrics_.lastFaultDetectMs = elapsedMs(in_.now, closeStartedAt_);
          enterFault(FaultCode::FIM_CURSO_TIMEOUT);
        }
      }
      break;

    case GateState::FALHA:
      break;  // so sai por requestResetFault()
  }
}

// ---------------------------------------------------------------- comandos
CmdResult GateController::requestOpen() {
  switch (state_) {
    case GateState::FECHADA:
      startOpening("Comando: abrir");
      return {true, 200, "Abrindo"};
    case GateState::FECHANDO:
      metrics_.reversals++;
      startOpening("Comando: abrir (reverte fechamento)");
      return {true, 200, "Fechamento revertido: abrindo"};
    case GateState::FALHA:
      metrics_.rejectedCommands++;
      return {false, 409, "Em FALHA: recupere a falha antes de abrir"};
    case GateState::INICIALIZANDO:
      metrics_.rejectedCommands++;
      return {false, 409, "Sistema inicializando"};
    default:
      metrics_.rejectedCommands++;
      return {false, 409, "Cancela ja esta aberta ou abrindo"};
  }
}

CmdResult GateController::requestClose() {
  switch (state_) {
    case GateState::ABERTA:
      if (obstacleBlocked()) {
        metrics_.closeBlockedByObstacle++;
        metrics_.rejectedCommands++;
        logEvent("Fechar recusado: obstaculo na passagem");
        return {false, 409, "Obstaculo detectado: fechamento bloqueado"};
      }
      startClosing("Comando: fechar");
      return {true, 200, "Fechando"};
    case GateState::ABRINDO:
      metrics_.rejectedCommands++;
      return {false, 409, "Aguarde a abertura terminar"};
    case GateState::FALHA:
      metrics_.rejectedCommands++;
      return {false, 409, "Em FALHA: fechamento bloqueado ate recuperar"};
    case GateState::INICIALIZANDO:
      metrics_.rejectedCommands++;
      return {false, 409, "Sistema inicializando"};
    default:
      metrics_.rejectedCommands++;
      return {false, 409, "Cancela ja esta fechada ou fechando"};
  }
}

CmdResult GateController::requestMode(GateMode m) {
  if (m == mode_) return {true, 200, "Modo ja ativo"};
  mode_ = m;
  logEvent(m == GateMode::AUTOMATICO ? "Modo AUTOMATICO ativado" : "Modo MANUAL ativado");
  return {true, 200, "Modo alterado"};
}

CmdResult GateController::requestResetFault() {
  if (state_ != GateState::FALHA) {
    metrics_.rejectedCommands++;
    return {false, 409, "Nao ha falha ativa"};
  }
  if (obstacleBlocked()) {
    metrics_.rejectedCommands++;
    return {false, 409, "Remova o obstaculo da passagem antes de recuperar"};
  }
  fault_ = FaultCode::NENHUMA;
  if (in_.limit) {                                  // fim de curso confirma posicao fechada
    angle_ = cfg_.angleClosed; servoEnabled_ = true;
    setState(GateState::FECHADA, "Recuperado: fim de curso acionado");
    return {true, 200, "Falha recuperada: cancela fechada"};
  }
  // Rehoming: uma unica tentativa de fechamento lento a partir do angulo aberto.
  angle_ = cfg_.angleOpen;
  startClosing("Recuperacao: tentativa unica de fechamento");
  return {true, 200, "Recuperacao iniciada: uma tentativa de fechamento"};
}

// ---------------------------------------------------------------- saidas
bool GateController::ledGreen() const {
  return state_ == GateState::ABERTA && fault_ == FaultCode::NENHUMA;
}
bool GateController::ledRed() const {
  switch (state_) {
    case GateState::FECHADA: case GateState::INICIALIZANDO: case GateState::ABRINDO: return true;
    case GateState::FECHANDO: return ((in_.now / 500) & 1) == 0;   // pisca lento
    case GateState::FALHA:    return ((in_.now / 150) & 1) == 0;   // pisca rapido
    default: return false;
  }
}

GateStatus GateController::status() const {
  GateStatus s;
  s.state = state_; s.mode = mode_; s.fault = fault_;
  s.stateAgeMs = elapsedMs(in_.now, stateSince_);
  s.arrival = in_.arrival; s.obstacle = in_.obstacle; s.limit = in_.limit;
  s.servoAngle = angle_; s.servoEnabled = servoEnabled_;
  s.ledGreen = ledGreen(); s.ledRed = ledRed();
  s.metrics = metrics_;
  s.eventCount = evCount_;
  uint8_t start = (evHead_ + EVENT_LOG_SIZE - evCount_) % EVENT_LOG_SIZE;
  for (uint8_t i = 0; i < evCount_; i++) s.events[i] = events_[(start + i) % EVENT_LOG_SIZE];
  return s;
}
