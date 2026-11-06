// Testes de LOGICA no PC (sem hardware): maquina de estados e filtro.
// Executar:  pio test -e native      (requer gcc/g++ no PATH)
// Estes testes validam o codigo, NAO substituem os testes fisicos de docs/testes.md.
#include <unity.h>
#include "GateController.h"
#include "DebounceFilter.h"
#include "../../src/GateController.cpp"   // logica pura: compilada junto com o teste

static GateConfig fastCfg(uint16_t cap = 5) {
  GateConfig c; c.capacity = cap; c.authWaitMs = 0;
  c.travelOpenMs = 100; c.travelCloseMs = 150; c.closeDelayMs = 300;
  c.limitConfirmMs = 200; c.openStuckMs = 60; c.limitLostMs = 40;
  return c;
}

struct Sim {
  GateController g;
  explicit Sim(uint16_t cap = 5) : g(fastCfg(cap)) {}
  GateInputs in;
  uint32_t t = 1000;
  void init(bool limit) {
    in.now = t; in.limit = limit; in.limitChangedAt = t; in.obstacleChangedAt = t;
    g.begin(in);
  }
  void run(uint32_t ms) { for (uint32_t i = 0; i < ms; i++) { t++; in.now = t; g.update(in); } }
  void obstacle(bool v) { in.obstacle = in.obstacleRaw = v; in.obstacleChangedAt = t; }
  void limit(bool v) { in.limit = v; in.limitChangedAt = t; }
  void pass() { obstacle(true); run(30); obstacle(false); run(5); }   // veiculo cruza o sensor de passagem
  void car(bool v) { in.arrivalRawSince = t; run(v ? 60 : 0); in.arrival = v; run(v ? 1 : 0); }   // 60 ms = filtro de chegada
  GateState st() { return g.state(); }
};

static Sim* mk(bool limit = true, uint16_t cap = 5) { Sim* s = new Sim(cap); s->init(limit); s->run(5); return s; }
static Sim* openGate(uint16_t cap = 5) { Sim* s = mk(true, cap); s->car(true); s->limit(false); s->run(105); s->car(false); return s; }   // fim de curso solta ao abrir

void setUp() {}
void tearDown() {}

void test_boot_com_fim_de_curso_fica_fechada() {
  Sim* s = mk(true);
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  TEST_ASSERT_TRUE(s->g.ledRed());
  delete s;
}

void test_boot_sem_fim_de_curso_tenta_uma_vez_e_falha() {
  Sim* s = mk(false);
  TEST_ASSERT_EQUAL(GateState::FECHANDO, s->st());
  s->run(150 + 200 + 20);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  TEST_ASSERT_EQUAL(FaultCode::FIM_CURSO_TIMEOUT, s->g.fault());
  delete s;
}

void test_boot_com_obstaculo_nao_gera_pwm() {
  Sim s; s.in.obstacle = s.in.obstacleRaw = true; s.init(false); s.run(500);
  TEST_ASSERT_EQUAL(GateState::INICIALIZANDO, s.st());
  TEST_ASSERT_FALSE(s.g.servoEnabled());
}

void test_chegada_abre_e_mede_tempo_de_resposta() {
  Sim* s = mk();
  s->car(true);
  TEST_ASSERT_EQUAL(GateState::ABRINDO, s->st());
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().respTotal);
  TEST_ASSERT_TRUE(s->g.metrics().respMs[0] <= 500);
  s->run(110);
  TEST_ASSERT_EQUAL(GateState::ABERTA, s->st());
  TEST_ASSERT_TRUE(s->g.ledGreen());
  delete s;
}

void test_fecha_sozinha_apos_atraso_e_confirma_no_fim_de_curso() {
  Sim* s = openGate();
  s->run(250);
  TEST_ASSERT_EQUAL(GateState::ABERTA, s->st());      // ainda dentro do atraso
  s->run(100);
  TEST_ASSERT_EQUAL(GateState::FECHANDO, s->st());
  s->run(60); s->limit(true); s->run(5);
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().closeCycles);
  delete s;
}

void test_obstaculo_impede_fechamento_automatico_e_por_comando() {
  Sim* s = openGate();
  s->obstacle(true);
  s->run(2000);
  TEST_ASSERT_EQUAL(GateState::ABERTA, s->st());
  for (int i = 0; i < 20; i++) {
    CmdResult r = s->g.requestClose();
    TEST_ASSERT_FALSE(r.ok); TEST_ASSERT_EQUAL(409, r.http);
  }
  TEST_ASSERT_EQUAL_UINT32(20, s->g.metrics().closeBlockedByObstacle);
  TEST_ASSERT_EQUAL_UINT32(0, s->g.metrics().closeStartedWithObstacle);
  delete s;
}

void test_obstaculo_durante_fechamento_reabre() {
  Sim* s = openGate();
  s->run(330);
  TEST_ASSERT_EQUAL(GateState::FECHANDO, s->st());
  s->obstacle(true); s->run(2);
  TEST_ASSERT_EQUAL(GateState::ABRINDO, s->st());
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().reversals);
  delete s;
}

void test_obstaculo_raw_bloqueia_antes_do_filtro() {
  Sim* s = openGate();
  s->in.obstacleRaw = true; s->run(1);   // filtrado ainda livre
  CmdResult r = s->g.requestClose();
  TEST_ASSERT_EQUAL(409, r.http);
  delete s;
}

void test_timeout_do_fim_de_curso_gera_falha_e_bloqueia_comandos() {
  Sim* s = openGate();
  s->run(330);
  TEST_ASSERT_EQUAL(GateState::FECHANDO, s->st());
  s->run(150 + 200 + 20);                // fim de curso nunca aciona
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  TEST_ASSERT_EQUAL(FaultCode::FIM_CURSO_TIMEOUT, s->g.fault());
  TEST_ASSERT_TRUE(s->g.metrics().lastFaultDetectMs <= 150 + 200 + 5);
  TEST_ASSERT_EQUAL(409, s->g.requestClose().http);
  TEST_ASSERT_EQUAL(409, s->g.requestOpen().http);
  s->run(5000);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());   // nenhum movimento automatico
  delete s;
}

void test_recuperacao_com_fim_de_curso_acionado() {
  Sim* s = openGate();
  s->run(330 + 150 + 220);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  s->limit(true); s->run(5);
  CmdResult r = s->g.requestResetFault();
  TEST_ASSERT_TRUE(r.ok);
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  TEST_ASSERT_EQUAL(FaultCode::NENHUMA, s->g.fault());
  delete s;
}

void test_recuperacao_sem_fim_de_curso_faz_tentativa_unica() {
  Sim* s = openGate();
  s->run(330 + 150 + 220);
  TEST_ASSERT_TRUE(s->g.requestResetFault().ok);
  TEST_ASSERT_EQUAL(GateState::FECHANDO, s->st());
  s->run(150 + 200 + 20);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());   // falhou de novo: sem repeticao
  delete s;
}

void test_recuperacao_recusada_com_obstaculo_ou_sem_falha() {
  Sim* s = mk();
  TEST_ASSERT_EQUAL(409, s->g.requestResetFault().http);
  delete s;
  s = openGate(); s->run(330 + 150 + 220);
  s->obstacle(true); s->run(1);
  TEST_ASSERT_EQUAL(409, s->g.requestResetFault().http);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  delete s;
}

void test_modo_manual_nao_abre_sozinho_mas_aceita_comandos() {
  Sim* s = mk();
  s->g.requestMode(GateMode::MANUAL);
  s->car(true); s->run(200);
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  TEST_ASSERT_TRUE(s->g.requestOpen().ok);
  s->limit(false); s->run(110);
  TEST_ASSERT_EQUAL(GateState::ABERTA, s->st());
  s->run(2000);
  TEST_ASSERT_EQUAL(GateState::ABERTA, s->st());  // nao fecha sozinha
  TEST_ASSERT_TRUE(s->g.requestClose().ok);
  delete s;
}

void test_comandos_incompativeis_sao_recusados() {
  Sim* s = mk();
  TEST_ASSERT_EQUAL(409, s->g.requestClose().http);   // ja fechada
  s->g.requestOpen();
  TEST_ASSERT_EQUAL(409, s->g.requestClose().http);   // abrindo
  TEST_ASSERT_EQUAL(409, s->g.requestOpen().http);    // ja abrindo
  delete s;
}

void test_fim_de_curso_preso_com_cancela_aberta_gera_falha() {
  Sim* s = openGate();
  s->limit(true);                         // chave "colada" mesmo com a cancela aberta
  s->run(100);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  TEST_ASSERT_EQUAL(FaultCode::FIM_CURSO_PRESO, s->g.fault());
  delete s;
}

void test_fim_de_curso_perdido_com_cancela_fechada_gera_falha() {
  Sim* s = mk();
  s->limit(false); s->run(100);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  TEST_ASSERT_EQUAL(FaultCode::FIM_CURSO_PERDIDO, s->g.fault());
  delete s;
}

void test_filtro_rejeita_pulso_curto_e_aceita_estavel() {
  DebounceFilter f; f.begin(FilterTimes{60, 150}, false, 0);
  f.update(true, 10); f.update(true, 40); f.update(false, 45);   // pulso de 35 ms
  f.update(false, 300);
  TEST_ASSERT_FALSE(f.active());
  f.update(true, 400); f.update(true, 470);                      // 70 ms estavel
  TEST_ASSERT_TRUE(f.active());
  f.update(false, 480); f.update(false, 600);                    // 120 ms < 150
  TEST_ASSERT_TRUE(f.active());
  f.update(false, 640);                                          // 160 ms
  TEST_ASSERT_FALSE(f.active());
}

void test_entrada_automatica_conta_vaga_na_passagem() {
  Sim* s = openGate();
  TEST_ASSERT_EQUAL(Auth::ENTRADA, s->g.auth());
  TEST_ASSERT_EQUAL_UINT16(0, s->g.occupied());     // ainda nao passou
  s->pass();
  TEST_ASSERT_EQUAL_UINT16(1, s->g.occupied());
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().entries);
  TEST_ASSERT_EQUAL(Auth::NENHUMA, s->g.auth());
  s->pass();                                        // outro objeto sem autorizacao: nao conta
  TEST_ASSERT_EQUAL_UINT16(1, s->g.occupied());
  delete s;
}

void test_lotado_nega_entrada_e_mantem_fechada() {
  Sim* s = openGate(1);
  s->pass();                                        // 1/1
  s->run(400); s->limit(true); s->run(400);         // fecha
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  s->car(true); s->run(100);
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().deniedFull);
  s->run(1000);                                     // mesmo carro parado: nao repete a negativa
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().deniedFull);
  TEST_ASSERT_EQUAL(409, s->g.requestReleaseEntry().http);
  delete s;
}

void test_operador_libera_saida_e_decrementa() {
  Sim* s = mk(); s->g.requestMode(GateMode::MANUAL);
  TEST_ASSERT_EQUAL(409, s->g.requestReleaseExit().http);   // vazio
  TEST_ASSERT_TRUE(s->g.requestSetOccupied(2).ok);
  TEST_ASSERT_EQUAL(400, s->g.requestSetOccupied(6).http);
  TEST_ASSERT_TRUE(s->g.requestReleaseExit().ok);
  s->limit(false); s->run(110);
  TEST_ASSERT_EQUAL(GateState::ABERTA, s->st());
  TEST_ASSERT_EQUAL(409, s->g.requestReleaseExit().http);   // ja ha autorizacao
  s->pass();
  TEST_ASSERT_EQUAL_UINT16(1, s->g.occupied());
  TEST_ASSERT_EQUAL_UINT32(1, s->g.metrics().exits);
  delete s;
}

void test_operador_libera_entrada_em_modo_manual() {
  Sim* s = mk(); s->g.requestMode(GateMode::MANUAL);
  TEST_ASSERT_TRUE(s->g.requestReleaseEntry().ok);
  s->limit(false); s->run(110);
  s->pass();
  TEST_ASSERT_EQUAL_UINT16(1, s->g.occupied());
  delete s;
}

void test_autorizacao_expira_se_ninguem_passa() {
  Sim* s = mk(); s->g.requestMode(GateMode::MANUAL);
  s->g.requestReleaseEntry(); s->limit(false); s->run(110);
  TEST_ASSERT_TRUE(s->g.requestClose().ok);         // operador desiste
  s->run(160); s->limit(true); s->run(5);
  TEST_ASSERT_EQUAL(GateState::FECHADA, s->st());
  TEST_ASSERT_EQUAL(Auth::NENHUMA, s->g.auth());
  TEST_ASSERT_EQUAL_UINT16(0, s->g.occupied());
  delete s;
}

void test_liberar_em_falha_e_recusado() {
  Sim* s = mk(false);                               // boot sem fim de curso
  s->run(500);
  TEST_ASSERT_EQUAL(GateState::FALHA, s->st());
  TEST_ASSERT_EQUAL(409, s->g.requestReleaseEntry().http);
  delete s;
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_boot_com_fim_de_curso_fica_fechada);
  RUN_TEST(test_boot_sem_fim_de_curso_tenta_uma_vez_e_falha);
  RUN_TEST(test_boot_com_obstaculo_nao_gera_pwm);
  RUN_TEST(test_chegada_abre_e_mede_tempo_de_resposta);
  RUN_TEST(test_fecha_sozinha_apos_atraso_e_confirma_no_fim_de_curso);
  RUN_TEST(test_obstaculo_impede_fechamento_automatico_e_por_comando);
  RUN_TEST(test_obstaculo_durante_fechamento_reabre);
  RUN_TEST(test_obstaculo_raw_bloqueia_antes_do_filtro);
  RUN_TEST(test_timeout_do_fim_de_curso_gera_falha_e_bloqueia_comandos);
  RUN_TEST(test_recuperacao_com_fim_de_curso_acionado);
  RUN_TEST(test_recuperacao_sem_fim_de_curso_faz_tentativa_unica);
  RUN_TEST(test_recuperacao_recusada_com_obstaculo_ou_sem_falha);
  RUN_TEST(test_modo_manual_nao_abre_sozinho_mas_aceita_comandos);
  RUN_TEST(test_comandos_incompativeis_sao_recusados);
  RUN_TEST(test_fim_de_curso_preso_com_cancela_aberta_gera_falha);
  RUN_TEST(test_fim_de_curso_perdido_com_cancela_fechada_gera_falha);
  RUN_TEST(test_filtro_rejeita_pulso_curto_e_aceita_estavel);
  RUN_TEST(test_entrada_automatica_conta_vaga_na_passagem);
  RUN_TEST(test_lotado_nega_entrada_e_mantem_fechada);
  RUN_TEST(test_operador_libera_saida_e_decrementa);
  RUN_TEST(test_operador_libera_entrada_em_modo_manual);
  RUN_TEST(test_autorizacao_expira_se_ninguem_passa);
  RUN_TEST(test_liberar_em_falha_e_recusado);
  return UNITY_END();
}
