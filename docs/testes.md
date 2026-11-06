# Testes e validação

## Situação real (leia primeiro)

| Item | Situação |
|---|---|
| Firmware principal e 7 programas de teste de hardware **compilam** (PlatformIO, espressif32 6.9.0) | ✅ executado |
| Imagem LittleFS (`buildfs`) gerada | ✅ executado |
| 17 testes de lógica no PC (`pio test -e native`) | ✅ executado, 17/17 passaram. Validam a máquina de estados com sensores simulados |
| Gravação no ESP32 e qualquer teste com hardware | ❌ **NÃO executado** (sem hardware disponível ao desenvolver) |
| Resultados T01 a T06 | ⬜ **A medir por você**; as tabelas abaixo estão vazias de propósito |

## 1. Testes individuais de hardware

Cada um é um ambiente PlatformIO que compila só o seu arquivo de `hardware_tests/` (não conflita com o firmware principal).
Grave e abra o monitor serial no mesmo comando:

```
pio run -e <ambiente> -t upload ; pio device monitor
```

| # | Ambiente | Arquivo | O que verificar |
|---|---|---|---|
| 1 | `hw_leds` | `t1_leds.cpp` | Verde e vermelho alternam a cada 500 ms |
| 2 | `hw_arrival` | `t2_sensor_chegada.cpp` | Serial mostra VEICULO/livre; LED verde espelha o sensor |
| 3 | `hw_obstacle` | `t3_sensor_obstaculo.cpp` | Serial mostra OBSTACULO/livre; LED vermelho espelha |
| 4 | `hw_servo` | `t4_servo.cpp` | Servo alterna entre `angleClosed` e `angleOpen` a cada 2 s. **Use para calibrar** |
| 5 | `hw_limit` | `t5_fim_de_curso.cpp` | Pressionar a chave imprime ACIONADO. Várias linhas = repique (normal) |
| 6 | `hw_wifi` | `t6_wifi_ap.cpp` | Rede `Cancela-ESP32` aparece; serial conta clientes |
| 7 | `hw_http` | `t7_http.cpp` | `http://192.168.4.1/` mostra "ola do ESP32" |

Ordem sugerida: 1 → 5 → 2 → 3 → 6 → 7 → 4 (servo por último, já com a fonte externa e o palito sem tocar na bancada).

## 2. Testes de lógica no PC

```
pio test -e native
```

Exige `gcc/g++` no PATH (no Windows: instale MSYS2/MinGW-w64). Cobre: boot, abertura, fechamento automático,
obstáculo (20 recusas), reversão, timeout, FALHA, bloqueios, recuperação, modo manual, falhas do fim de curso e o filtro.

## 3. Critérios de desempenho

**Critérios previstos / Testes implementados / Executados / Medidos** — preencha a última coluna após os ensaios.

| ID | Critério previsto | Mecanismo implementado | Implementado | Executado | Resultado medido |
|---|---|---|---|---|---|
| T01 | Abertura iniciada ≤ 500 ms após detecção válida (20 medições) | Firmware mede `agora − início da leitura bruta` a cada abertura automática; guarda as 20 últimas (`/api/metrics`, painel) | ✅ | ⬜ | _preencher_ |
| T02 | 20/20 tentativas de fechar com obstáculo bloqueadas | Contadores `closeBlockedByObstacle`, `reversals`, `closeStartedWithObstacle` (deve ser 0) | ✅ | ⬜ | _preencher_ |
| T03 | ≥ 19/20 comandos válidos em ≤ 1 s | `tools/t03_comunicacao.ps1` (mede no cliente, gera CSV) | ✅ | ⬜ | _preencher_ |
| T04 | Proteções locais continuam sem cliente | Laço de segurança independente do HTTP | ✅ | ⬜ | _preencher_ |
| T05 | Falha de posicionamento detectada no timeout | `FIM_CURSO_TIMEOUT`; `lastFaultDetectMs` (padrão ≈ 3000 ms) | ✅ | ⬜ | _preencher_ |
| T06 | Recuperação volta a operação segura | `POST /api/reset-fault` | ✅ | ⬜ | _preencher_ |

### T01 — Tempo de resposta

1. Reinicie o ESP32 (zera as medições), modo automático, cancela FECHADA.
2. Aproxime o carrinho do sensor de chegada; espere a cancela abrir e fechar.
3. Repita 20 vezes. Leia no painel (cartão "Medições") ou com `tools\metricas.ps1` o campo `response.lastMs`.
4. Critério: todos ≤ 500 ms. O valor inclui o filtro de 60 ms, portanto o mínimo esperado é ≈ 60 ms.

Observação: o T01 mede até o **início do comando** de abertura, não até o palito se mover fisicamente.

### T02 — Segurança contra obstáculos

Para cada tentativa (20):
1. Cancela ABERTA, coloque um objeto (dedo/borracha) no feixe do sensor de passagem.
2. Clique **FECHAR CANCELA**: deve vir mensagem de recusa (409) e a cancela continuar aberta.
3. Registre sucesso se continuou aberta. No fim confira `closeBlockedByObstacle = 20` e `closeStartedWithObstacle = 0`.
4. Variação complementar: com a cancela FECHANDO, coloque o obstáculo e confira a reabertura (`reversals`).

### T03 — Comunicação Wi-Fi

Conectado à rede do ESP32: `powershell -ExecutionPolicy Bypass -File tools\t03_comunicacao.ps1`. O script envia 20 comandos `POST /api/mode` (válidos, sem mover o servo), imprime tempos e grava `tools\t03_resultado.csv`.

### T04 / Falha 1 — Perda de comunicação Wi-Fi

1. Ligue o sistema; conecte o celular; confira o painel.
2. Desconecte o celular (desligue o Wi-Fi do telefone).
3. Aproxime o carrinho: a cancela deve abrir sozinha (modo automático). Cubra o sensor de passagem: ela não deve fechar.
4. Tire o obstáculo: deve fechar após `closeDelayMs`.
5. Reconecte e abra `http://192.168.4.1`: o painel volta a atualizar e a lista de eventos mostra o que ocorreu.
6. Anote tudo na planilha. *(O estado da conexão é "cliente desconectado". A queda do próprio Access Point só pode ser simulada reiniciando o ESP32.)*

### T05 / Falha 2 — Ausência de confirmação do fim de curso

Escolha **um** método (sem danificar nada):

- **A (recomendado, sem riscos):** grave o ambiente `faultsim` (`pio run -e faultsim -t upload`). Com a cancela ABERTA, execute `POST /api/sim/limit?masked=1` (no PowerShell: `Invoke-RestMethod -Method Post "http://192.168.4.1/api/sim/limit?masked=1"`). Esta rota **só existe nesse ambiente** e não aparece na interface.
- **B (físico):** desconecte um dos fios do fim de curso (com o sistema desligado), religue e ensaie.

Procedimento:
1. Garanta cancela ABERTA, sem obstáculo.
2. Peça o fechamento (botão ou aguarde o automático) e cronometre.
3. Em ≈ `travelCloseMs + limitConfirmMs` (3000 ms padrão) o estado deve ir a FALHA; o LED vermelho pisca rápido e o painel mostra a mensagem. Leia `lastFaultDetectMs` em `/api/metrics`.
4. Tente **FECHAR** e **ABRIR**: devem ser recusados (409).
5. Restaure a condição normal (`masked=0` ou reconecte o fio; no método B o fim de curso precisa estar pressionado ou livre conforme o caso).
6. Clique **RECUPERAR FALHA**. Resultado esperado: com o fim de curso acionado vai a FECHADA; sem ele, uma única tentativa (e FALHA de novo se não confirmar).

### T06 — Recuperação

Após o passo 6 acima, confirme: estado FECHADA, LED vermelho fixo, nova abertura/fechamento normais.

## 4. Desafios técnicos (modelo de registro)

### Desafio 1 — Calibração e confiabilidade dos sensores

| Teste | Posição/distância do carrinho | Repetições | Detectou | Falsos positivos | Observações |
|---|---|---|---|---|---|
| 1 | Centro do feixe, 2 cm | 10 | _preencher_ | | |
| 2 | Centro, 5 cm | 10 | | | |
| 3 | Centro, 8 cm | 10 | | | |
| 4 | Deslocado para a lateral | 10 | | | |
| 5 | Carrinho em movimento (lento/rápido) | 10 | | | |
| 6 | Com luz forte/janela | 10 | | | |

Registrar: problema observado → teste → resultado → decisão (ex.: ajuste do potenciômetro, `FILTER_ARRIVAL`, posição do sensor).

### Desafio 2 — Segurança da movimentação

| Item | Procedimento | Resultado | Decisão técnica |
|---|---|---|---|
| Obstáculo | Ver T02 | _preencher_ | |
| Timeout de posicionamento | Ver T05 | _preencher_ | |
| Validação do fim de curso | Pressionar com a cancela aberta (→ `FIM_CURSO_PRESO`) e soltar com ela fechada (→ `FIM_CURSO_PERDIDO`) | _preencher_ | |
| Alimentação do servo | Medir a tensão do servo (multímetro) durante o movimento, com e sem capacitor; observar reinícios do ESP32 | _preencher_ | |

## 5. O que os testes NÃO provam

- A abertura completa do palito (sem sensor de fim de curso aberto).
- Funcionamento sob luz solar, carrinhos escuros/espelhados, vibração.
- Segurança elétrica da sua montagem: confira com o multímetro antes de energizar (ver `montagem.md`).

A planilha-modelo é `docs/planilha_resultados.csv`.
