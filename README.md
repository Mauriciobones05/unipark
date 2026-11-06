# Cancela Inteligente com ESP32

Cancela automática para simular a entrada de veículos em um estacionamento. Um carrinho Hot Wheels é
detectado por um sensor infravermelho, o ESP32 abre a cancela (servo SG90 + palito), confere se a passagem está
livre e fecha confirmando a posição por um fim de curso. O painel web é servido **pelo próprio ESP32**, via Wi-Fi, sem internet.

> **Status honesto do projeto**
> ✅ Compilado com PlatformIO (firmware, `faultsim`, 7 testes de hardware e imagem LittleFS).
> ✅ 17 testes de lógica executados no PC (`pio test -e native`), todos passaram.
> ❌ **Nunca gravado em um ESP32 real nem testado com hardware.** Todos os valores de calibração (ângulos, tempos, filtros) são pontos de partida. Os resultados T01–T06 devem ser **medidos por você** (`docs/testes.md`).

## Sumário da documentação

| Documento | Conteúdo |
|---|---|
| `docs/componentes.md` | Materiais, pinagem, decisões elétricas, limitações dos sensores |
| `docs/montagem.md` | Tutorial de montagem na protoboard (iniciante) |
| `docs/arquitetura.md` | Blocos, API REST, Wi-Fi, concorrência |
| `docs/maquina_estados.md` | Estados, transições, falhas, recuperação |
| `docs/testes.md` | Testes de hardware, T01–T06, desafios técnicos |
| `docs/planilha_resultados.csv` | Planilha-modelo para os resultados reais |

## Requisitos da disciplina

| # | Requisito | Onde está |
|---|---|---|
| 1 | ESP32 como controlador | `src/main.cpp` |
| 2 | Sensor e atuador | FC-51 ×2, fim de curso, servo SG90 |
| 3 | Wi-Fi para monitorar/comandar | AP + API REST + painel |
| 4 | Decisões locais pelo estado físico medido | `GateController` (independe do Wi-Fi) |
| 5 | Estados, transições, comandos inválidos | `docs/maquina_estados.md` (409/400) |
| 6 | Alimentação, níveis, acionamento | `docs/componentes.md` |
| 7 | Perda de comunicação + outra falha física | Wi-Fi (T04) e fim de curso (T05) |
| 8 | ≥ 3 critérios mensuráveis | T01–T06 (`docs/testes.md`) |
| 9 | Dois desafios técnicos | `docs/testes.md` §4 |
| 10 | Operação física completa | Ciclo chegada → abre → livre → fecha |
| 11 | Testes e evidências | `docs/`, `tools/`, planilha |
| 12 | Apresentação | Roteiro abaixo |

## Estrutura

```
Cancela_Inteligente_ESP32/
├── platformio.ini           ambientes: esp32dev (principal), faultsim, hw_*, native
├── include/                 config.h (TUDO que se calibra), headers
├── src/                     main, GateController, SensorManager, ServoDriver, WebServerManager
├── data/                    index.html, style.css, script.js  → LittleFS
├── hardware_tests/          7 programas de teste (um por ambiente hw_*)
├── test/test_logica/        testes de lógica no PC (Unity)
├── tools/                   t03_comunicacao.ps1, metricas.ps1
└── docs/
```

## Pinagem resumida

| Função | GPIO |
|---|---|
| Sensor de chegada (OUT) | 32 |
| Sensor de passagem/obstáculo (OUT) | 33 |
| Servo (PWM) | 18 |
| LED verde | 16 |
| LED vermelho | 17 |
| Fim de curso (NO, pull-up interno) | 26 |

Alimentação: ESP32 e sensores (3,3 V) pela USB; servo em **5 V externo ≥ 1 A**, GND comum, capacitor 470–1000 µF. Detalhes em `docs/componentes.md`. **Alimente os FC-51 com 3,3 V, nunca 5 V.**

## Instalação

1. Instale o **VS Code** (https://code.visualstudio.com).
2. Extensões → procure **PlatformIO IDE** → Instalar → reinicie o VS Code (a primeira instalação baixa ferramentas; leva alguns minutos).
3. Driver USB: se a placa não aparecer em *Gerenciador de Dispositivos → Portas*, instale o driver CP210x ou CH340 conforme o chip da sua placa.
4. **File → Open Folder…** e escolha `Cancela_Inteligente_ESP32`. O PlatformIO baixa a plataforma `espressif32@6.9.0` na primeira vez (precisa de internet **apenas nessa etapa**).

## Compilar, gravar e usar

Pela barra inferior do VS Code (✓ Build, → Upload, 🔌 Serial Monitor) ou no terminal do PlatformIO (`pio` ou `python -m platformio`):

| Ação | Comando |
|---|---|
| Compilar | `pio run -e esp32dev` |
| Gravar o firmware | `pio run -e esp32dev -t upload` |
| **Gravar o frontend (LittleFS)** | `pio run -e esp32dev -t uploadfs` |
| Monitor serial (115200) | `pio device monitor` |
| Firmware com simulação de falha | `pio run -e faultsim -t upload` |
| Testes de lógica (PC) | `pio test -e native` |

⚠️ **O frontend fica no sistema de arquivos, separado do firmware.** Grave **os dois** (`upload` e `uploadfs`). Sem o `uploadfs` a página mostra um aviso pedindo o comando. Se houver mais de uma porta, acrescente `--upload-port COMx`.
Se o upload travar em "Connecting…", segure o botão **BOOT** da placa até começar a gravar.

### Conectar e acessar

1. No celular, Wi-Fi → rede **Cancela-ESP32**, senha **cancela123**.
2. Se o celular avisar "sem internet", mantenha a conexão (dados móveis desligados ajuda).
3. Abra o navegador em **http://192.168.4.1**.

## Calibração (`include/config.h`)

| Parâmetro | Padrão | Para quê |
|---|---|---|
| `angleClosed` / `angleOpen` | 0° / 90° | Posição do palito (calibrar, ver `docs/montagem.md` §12) |
| `travelOpenMs` / `travelCloseMs` | 1000 / 1500 ms | Duração estimada dos movimentos |
| `closeDelayMs` | 3000 ms | Espera antes do fechamento automático |
| `limitConfirmMs` | 1500 ms | Prazo do fim de curso depois que o servo chega |
| `FILTER_*` | ver arquivo | Filtros dos sensores |
| `AP_SSID` / `AP_PASSWORD` | Cancela-ESP32 / cancela123 | Rede Wi-Fi |

Depois de qualquer mudança, recompile e grave de novo (`upload`; `uploadfs` só se mudar `data/`).

## Como testar sensores e servo

Siga `docs/testes.md` §1: `pio run -e hw_leds -t upload` (e `hw_arrival`, `hw_obstacle`, `hw_servo`, `hw_limit`, `hw_wifi`, `hw_http`). Para voltar ao projeto, grave `esp32dev` e rode `uploadfs`.

## Funcionamento resumido

1. **Boot:** servo sem PWM; fim de curso acionado → FECHADA. Se solto, uma tentativa de fechamento; falhou → FALHA.
2. **Chegada** (60 ms estável) em modo automático → ABRINDO → ABERTA (estimada por tempo) → LED verde.
3. **Passagem livre** por 3 s → FECHANDO. Obstáculo a qualquer momento → reabre.
4. **Fim de curso** confirma → FECHADA. Não confirmou no prazo → FALHA.
5. Botões do painel só **pedem**; a máquina de estados decide (200/400/409).

## Roteiro de apresentação (≈ 10 min)

1. (1 min) Objetivo e componentes; mostrar a montagem.
2. (1 min) Diagrama de blocos e a pinagem; justificar fonte externa e GND comum.
3. (2 min) Operação normal: conectar o celular, carrinho aciona a abertura, passagem, fechamento.
4. (1 min) Obstáculo: colocar o dedo no feixe, clicar em FECHAR (recusado) e fechar com ele durante o movimento (reabre).
5. (1 min) Perda de Wi-Fi: desconectar o celular, mostrar que a cancela segue funcionando; reconectar.
6. (2 min) Falha do fim de curso (ambiente `faultsim` ou fio desligado): FALHA, bloqueio de comandos, recuperação.
7. (1 min) Resultados **medidos** T01–T06 e desafios técnicos (planilha preenchida).
8. (1 min) Limitações e melhorias.
Dica: tenha `config.h` aberto; o professor pode pedir mudar tempos, ângulos ou o SSID.

## Modelo de registro semanal (caderno de campo)

```
Semana __ / Data: __/__/____            Integrantes presentes: ______________
Objetivo da semana: ______________________________________________
O que foi feito: ________________________________________________
Medições (valores reais, unidade, condição): _____________________
Problemas encontrados: ___________________________________________
Hipótese -> teste -> resultado -> decisão: _______________________
Alterações em código/montagem (arquivo, valor antes -> depois): ___
Evidências (fotos, prints, CSV): _________________________________
Próximos passos / responsável / prazo: ___________________________
```

## Problemas comuns

| Problema | Solução |
|---|---|
| Página diz "Interface nao encontrada" | Rode `pio run -e esp32dev -t uploadfs` |
| Rede Wi-Fi não aparece | Veja o monitor serial; reinicie a placa; troque `AP_CHANNEL` |
| Celular não abre 192.168.4.1 | Desligue dados móveis; use `http://` (não https); esqueça e reconecte a rede |
| Upload falha ("Connecting…") | Segure BOOT; cabo de dados; porta correta |
| Servo treme ou o ESP32 reinicia | Fonte 5 V ≥ 1 A, GND comum, capacitor |
| Sempre em FALHA | Fim de curso não aciona (fio, NO/NC, posição) — teste `hw_limit` |
| Cancela reabre sozinha | Sensor de passagem pegando o próprio palito ou a bancada: reposicionar/ajustar potenciômetro |
| Chegada não detecta | Aproximar, ajustar potenciômetro, reduzir `FILTER_ARRIVAL.onMs` |

## Limitações conhecidas

- **Abertura nunca é confirmada fisicamente**, só estimada por tempo (um único fim de curso, na posição fechada).
- Um fim de curso não diferencia causas (fio solto, chave desalinhada, servo sem energia): todas viram `FIM_CURSO_TIMEOUT`.
- FC-51 sofre com luz ambiente, cor e brilho do carrinho; em 3,3 V o alcance é menor.
- Sem autenticação nos comandos; segurança do acesso depende da senha do Wi-Fi (WPA2). Uso didático.
- AP aceita até 4 clientes. Não há persistência de log após reinício.
- O firmware nunca foi gravado/testado em hardware pelo autor deste código; calibre e meça.
- Placas com outro módulo (ex.: ESP32-WROVER) podem exigir outros pinos para GPIO 16/17.

## Dependências

Nenhuma biblioteca externa. Usa apenas Arduino-ESP32 2.0.16 (via `espressif32@6.9.0`): `WiFi`, `WebServer`, `LittleFS`. O servo usa o LEDC (`ledcSetup`/`ledcAttachPin`, API do core 2.x; **não** atualize para o core 3.x sem adaptar `ServoDriver.cpp`).
