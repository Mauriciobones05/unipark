# Arquitetura

## Diagrama de blocos

```mermaid
flowchart LR
  subgraph HW[Hardware]
    S1[FC-51 chegada GPIO32] --> SM
    S2[FC-51 passagem GPIO33] --> SM
    FC[Fim de curso GPIO26] --> SM
    SD[ServoDriver LEDC GPIO18] --> SV[SG90 + palito]
    LD[LEDs GPIO16/17]
  end
  subgraph FW[Firmware ESP32]
    SM[SensorManager + DebounceFilter] --> GC[GateController<br/>maquina de estados]
    GC --> SD
    GC --> LD
    WS[WebServerManager<br/>API REST + LittleFS]
    WS <-->|mutex| GC
  end
  AP((Access Point<br/>192.168.4.1)) --- WS
  PH[Celular / PC<br/>HTML + CSS + JS] <-->|HTTP| AP
```

## Módulos

| Arquivo | Responsabilidade |
|---|---|
| `include/config.h` | Pinos, filtros, tempos, SSID/senha. **Único lugar a editar para calibrar** |
| `DebounceFilter.h` | Filtro de tempo assimétrico (liga/desliga). Sem Arduino |
| `SensorManager` | Lê pinos, aplica filtros, entrega `GateInputs` |
| `GateController` | Máquina de estados, comandos, métricas, log de eventos. **Sem Arduino** |
| `ServoDriver` | PWM 50 Hz via LEDC (sem biblioteca externa) |
| `WebServerManager` | AP, rotas HTTP, JSON, arquivos do LittleFS |
| `main.cpp` | `loop()`: sensores → estados → saídas; sem `delay` na lógica |
| `data/` | Frontend (HTML/CSS/JS puro), gravado no LittleFS |

## Concorrência

- `loop()` roda no núcleo 1 a cada ~1 ms: lê sensores, atualiza a máquina, escreve servo/LEDs.
- O servidor HTTP roda em **tarefa própria no núcleo 0**. Um cliente lento ou desconectado a meio de uma requisição **não atrasa** o servo nem as verificações de segurança.
- `GateController` e `SensorManager` são protegidos por um mutex (`Sync.h`). Os handlers HTTP só chamam `requestOpen/Close/Mode/ResetFault`, que passam pelas regras de segurança; nenhum handler escreve no servo.

## Servo sem bloqueio

A máquina mantém um ângulo comandado que avança com `grau/ms = |open − closed| / tempo_de_percurso` a cada ciclo. Isso gera uma rampa suave (menos corrente de pico, menos solavanco) e permite reverter no meio do caminho. **O ângulo é o comandado, não o medido**: o SG90 não tem realimentação para o ESP32.

## Comunicação Wi-Fi

O ESP32 cria o Access Point `Cancela-ESP32` (senha `cancela123`, canal 6, IP `192.168.4.1`). O celular conecta direto, sem roteador nem internet. (Alguns celulares avisam "sem internet": mantenha a conexão.)

- O frontend consulta `GET /api/status` a cada 500 ms (*polling*). Escolhido por ser o mais simples e robusto: se a rede cai, a próxima consulta recupera sozinha, e não há conexão persistente para tratar.
- Se não houver resposta por 2,5 s o painel mostra "Sem conexão", escurece os dados e desativa os botões, para não exibir valores antigos como atuais.
- Desconexão de **cliente HTTP** ≠ queda do **Access Point**: ver `maquina_estados.md`.

## API REST

| Método e rota | Função | Respostas |
|---|---|---|
| `GET /api/status` | Estado completo (JSON) | 200 |
| `GET /api/metrics` | Contadores e medições T01/T02/T05 | 200 |
| `POST /api/open` | Pede abertura | 200 / 409 |
| `POST /api/close` | Pede fechamento | 200 / 409 |
| `POST /api/mode` (`mode=auto\|manual`) | Muda modo | 200 / 400 |
| `POST /api/reset-fault` | Pede recuperação | 200 / 409 |
| `POST /api/sim/limit` (`masked=0\|1`) | **Só no ambiente `faultsim`**: mascara o fim de curso | 200 / 400 |

Resposta de comandos: `{"ok":true|false,"message":"..."}`. Rotas inexistentes: 404 em JSON. Um erro 500 só ocorreria por falha interna; o firmware não possui caminho que o gere deliberadamente.

Exemplo de `GET /api/status`:

```json
{"state":"ABERTA","mode":"AUTOMATICO","stateAgeMs":2310,"uptimeMs":48000,
 "fault":{"code":"NENHUMA","message":""},
 "sensors":{"arrival":false,"obstacle":false,"limit":false},
 "servo":{"angle":90.0,"enabled":true},"leds":{"green":true,"red":false},
 "wifi":{"ssid":"Cancela-ESP32","stations":1,"apUp":true},
 "faultSim":{"enabled":false,"limitMasked":false},
 "events":[{"t":45690,"msg":"Aberta (estimado por tempo)"}]}
```

## Filtragem (Desafio 1)

`DebounceFilter` só muda o valor depois que a leitura bruta ficou estável por um tempo: chegada 60 ms liga / 150 ms desliga; passagem 20 ms liga / 300 ms desliga (detecta rápido, libera devagar); fim de curso 30 ms. Além disso o valor **bruto** do sensor de passagem também bloqueia o fechamento (sem esperar o filtro).
