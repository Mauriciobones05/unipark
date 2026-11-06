// Testes de LOGICA no PC (sem hardware): maquina de estados e filtro.
// Executar:  pio test -e native      (requer gcc/g++ no PATH)
// Estes testes validam o codigo, NAO substituem os testes fisicos de docs/testes.md.
#include <unity.h>
#include "GateController.h"
#include "DebounceFilter.h"
#include "../../src/GateController.cpp"   // logica pura: compilada junto com o teste

static GateConfig fastCfg() {
  GateConfig c;
  c.travelOpenMs = 100; c.travelCloseMs = 150; c.closeDelayMs = 300;
  c.limitConfirmMs = 200; c.openStuckMs = 60; c.limitLostMs = 40;
  return c;
}

struct Sim {
  GateController g{fastCfg()};
  GateInputs in;
  uint32_t t = 1000;
  void init(bool limit) {
    in.now = t; in.limit = limit; in.limitChangedAt = t; in.obstacleChangedAt = t;
    g.begin(in);
  }
  void run(uint32_t ms) { for (uint32_t i = 0; i < ms; i++) { t++; in.now = t; g.update(in); } }
  void obstacle(bool v) { in.obstacle = in.obstacleRaw = v; in.obstacleChangedAt = t; }
  void limit(bool v) { in.limit = v; in.limitChangedAt = t; }
  void car(bool v) { in.arrivalRawSince = t; run(v ? 60 : 0); in.arrival = v; run(v ? 1 : 0); }   // 60 ms = filtro de chegada
  GateState st() { return g.state(); }
};

static Sim* mk(bool limit = true) { Sim* s = new Sim(); s->init(limit); s->run(5); return s; }
static Sim* openGate() { Sim* s = mk(); s->car(true); s->limit(false); s->run(105); s->car(false); return s; }   // fim de curso solta ao abrir

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
  return UNITY_END();
}
