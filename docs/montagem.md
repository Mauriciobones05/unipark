# Tutorial de montagem na protoboard

Para iniciantes. **Regra de ouro: monte e confira tudo com o ESP32 DESLIGADO (USB e fonte desconectadas). Só energize depois do capítulo 14.**

Este guia não indica "furo X, linha Y": isso depende do modelo da sua protoboard e do tamanho do ESP32. Use as regras de leitura do capítulo 2 para escolher os furos.

## 0. Materiais e ferramentas

Itens de `componentes.md` + capacitor 470–1000 µF, fita adesiva/cola quente, multímetro (muito recomendado), alicate ou pinça.

## 1. Identificando os pinos do ESP32 DevKit V1

- A placa tem os nomes impressos ao lado dos pinos (ex.: `D32`, `D33`, `D26`, `D18`, `D16`/`RX2`, `D17`/`TX2`, `3V3`, `GND`, `VIN`). **`D32` = GPIO 32.**
- Há 15 pinos de cada lado. Confira os nomes impressos na SUA placa; algumas variantes mudam a ordem.
- Conector USB fica numa ponta; deixe-o voltado para fora da protoboard para acessar o cabo.
- `3V3` = saída de 3,3 V. `VIN` = 5 V vindo da USB (**não use VIN para o servo**).
- Pinos que **não** devem ser usados neste projeto: `D0, D2, D5, D12, D15` (boot) e `D6–D11` (flash).

## 2. Como funciona a protoboard

- **Trilhos (rails):** colunas longas nas bordas, marcadas com `+` e `−`. Todos os furos de um trilho estão ligados entre si. Em muitas protoboards inteiras o trilho é **interrompido no meio**: verifique com o multímetro (modo continuidade).
- **Linhas de contato:** nos furos do meio, cada coluna de 5 furos (a–e ou f–j) está ligada entre si. O vão central **separa** os dois lados. Por isso o ESP32 é encaixado sobre o vão, deixando furos livres de cada lado.
- Se o ESP32 largo ocupar quase todos os furos, use **2 protoboards** ou jumpers dos pinos a outra região.

Conselho: padronize cores dos fios: **vermelho = 3,3 V, preto = GND, azul/branco = sinais, laranja = 5 V do servo**.

## 3. Distribuindo 3,3 V e GND

1. Encaixe o ESP32 na protoboard, sem ligar nada.
2. Trilho A (superior): `+` = **3,3 V**. Trilho B (inferior): `−` = **GND**.
3. Jumper preto: pino `GND` do ESP32 → trilho GND.
4. Jumper vermelho: pino `3V3` do ESP32 → trilho 3,3 V.
5. Se o trilho for dividido, ligue as duas metades com jumper.
6. **O trilho 3,3 V nunca recebe os 5 V da fonte do servo.** O 5 V do servo vai em outra região (capítulo 7).

## 4. Primeiro sensor infravermelho (chegada)

| Pino do FC-51 | Liga em | Tensão | Função |
|---|---|---|---|
| VCC | trilho 3,3 V | 3,3 V | Alimentação |
| GND | trilho GND | 0 V | Retorno |
| OUT | `D32` (GPIO 32) | 0–3,3 V | Sinal digital (LOW = detectou) |

Cuidados: **nunca ligar VCC em 5 V** (a saída iria a 5 V e queimaria o GPIO). Cada FC-51 tem um LED que acende ao detectar: ajuda no teste. Ajuste o potenciômetro (parafuso azul) com chave pequena.

## 5. Segundo sensor (passagem / obstáculo)

| Pino | Liga em | Tensão | Função |
|---|---|---|---|
| VCC | trilho 3,3 V | 3,3 V | Alimentação |
| GND | trilho GND | 0 V | Retorno |
| OUT | `D33` (GPIO 33) | 0–3,3 V | LOW = obstáculo |

## 6. Servo motor SG90

Fios do servo (cores usuais; confira o seu): marrom/preto = GND, vermelho = +5 V, laranja/amarelo = sinal.

| Fio do servo | Liga em | Tensão | Função |
|---|---|---|---|
| Sinal | `D18` (GPIO 18) | 3,3 V (PWM) | Posição |
| Vermelho | **+5 V da fonte externa** | 5 V | Potência |
| Marrom/preto | GND comum | 0 V | Retorno |

Cuidados: **jamais** ligar o vermelho no `3V3`, `VIN` sem análise, ou em um GPIO. O conector tem 3 pinos: confirme a ordem antes de encaixar (inverter queima o servo).

## 7. Fonte externa do servo (5 V)

1. Use fonte/carregador 5 V com pelo menos 1 A, com cabo cortado e **polaridade conferida no multímetro** (ou use módulo de alimentação de protoboard em 5 V).
2. Escolha uma região de trilhos separada (ou os trilhos de uma 2ª protoboard) para o **+5 V**.
3. Fio vermelho do servo → +5 V da fonte. Capacitor em paralelo: perna longa (+) no +5 V, perna com faixa (−) no GND, **perto do servo**.
4. Verifique com o multímetro que a fonte mede ≈ 5 V *antes* de ligar o servo.

## 8. GND compartilhado

Ligue o **GND da fonte do servo** ao **trilho GND do ESP32** com um jumper preto. Sem isso o servo não "entende" o sinal PWM e se comporta de forma errática. Só o GND é compartilhado: os 5 V e os 3,3 V **nunca** se encontram.

## 9. LED vermelho (passagem bloqueada / falha)

Cadeia: `D17 (GPIO 17)` → resistor 220 Ω → ânodo (perna longa) → cátodo (perna curta, lado chanfrado) → GND.

| Peça | Liga em |
|---|---|
| Resistor 220 Ω, perna 1 | `D17` |
| Resistor, perna 2 | ânodo do LED (perna longa) |
| Cátodo do LED | trilho GND |

## 10. LED verde (cancela aberta)

Igual ao anterior, usando `D16` (GPIO 16). Um resistor para cada LED. Se o LED não acender, vire-o (polaridade).

## 11. Fim de curso

Microinterruptor com 3 terminais: **COM**, **NO** (normalmente aberto), **NC** (normalmente fechado), geralmente marcados no corpo.

| Terminal | Liga em | Função |
|---|---|---|
| COM | trilho GND | Comum |
| NO | `D26` (GPIO 26) | Fecha para GND ao ser pressionado |
| NC | **sem ligação** | Não usado |

Não precisa de resistor externo: o firmware ativa o pull-up interno. Quando apertado, o GPIO lê LOW (= cancela fechada).

Instalação mecânica: fixe a chave de modo que o **palito horizontal (fechado)** pressione a alavanca dela, sem forçar demais. Ao levantar o palito, a chave tem que soltar. Use fita dupla-face ou cola quente. Se usar fios longos, torça os fios para reduzir ruído.

## 12. Prendendo o palito no servo

1. Escolha o braço (horn) de **uma haste**, na parte do kit do SG90.
2. Com o servo **já em um ângulo conhecido** (rode o teste `hw_servo` (teste 4 de `testes.md`)), encaixe o braço de modo que o palito fique **horizontal** quando o código manda `angleClosed`.
3. Fixe o palito ao braço com fita ou cola quente fraca, usando o mínimo de massa. Palito leve = menos corrente e menos risco.
4. Parafuse o braço ao eixo do servo (parafuso pequeno do kit).
5. O palito não deve tocar a bancada, os fios nem o carrinho.

### Calibração dos ângulos

Os ângulos 0° e 90° são só ponto de partida. No `config.h` (`GateConfig`) ajuste `angleClosed` e `angleOpen`:
1. Comece pelo meio: ponha `angleClosed = 20` e `angleOpen = 80`, grave `hw_servo`.
2. Mude de 5 em 5°, regravando. Verifique que o palito **não** raspa na bancada e que o servo **não** fica "zumbindo" (zumbido = está forçando contra um obstáculo).
3. Escolha `angleClosed` que deixe o palito pressionando suavemente o fim de curso e `angleOpen` quase vertical.
4. Servo aquecendo ou zumbindo = pare e reduza o ângulo.

## 13. Posicionando os sensores para o Hot Wheels

- **Chegada (GPIO 32):** na lateral da pista, antes da cancela, apontando para o lado por onde o carrinho passa, a 2–6 cm.
- **Passagem (GPIO 33):** logo abaixo do palito, a 2–6 cm do ponto onde o palito desce, olhando para a região em que o carrinho (ou um dedo) fica quando a cancela poderia atingi-lo.
- Evite apontar para superfícies brilhantes, paredes próximas ou luz do sol.
- Os dois sensores não devem "se ver": ângulo de 90° entre eles ou uma barreira de papel.
- Teste com o programa 2 e 3 e ajuste o potenciômetro até detectar o carrinho com estabilidade e não detectar a bancada.

## 14. Teste das ligações antes de energizar

Com o multímetro em **continuidade** (bipe), ESP32 e fonte desligados:

- [ ] `3V3` ↔ `GND`: **não deve** apitar (curto).
- [ ] +5 V da fonte ↔ trilho 3,3 V: **não deve** apitar.
- [ ] GND da fonte ↔ GND do ESP32: **deve** apitar.
- [ ] Cada sinal (D32, D33, D18, D26, D16, D17) ↔ GND e ↔ 3V3: **não deve** apitar (exceto D26 com a chave apertada ↔ GND).
- [ ] FC-51: VCC no 3,3 V (nunca 5 V). Servo: vermelho no +5 V, marrom no GND, laranja em D18. Capacitor com a polaridade certa. LEDs na direção correta.

Energização:
1. Conecte só a USB e rode `hw_leds`.
2. Meça com o multímetro: o OUT de cada FC-51 deve variar entre ≈ 0 V e ≈ 3,3 V, **nunca mais**.
3. Só depois ligue a fonte de 5 V do servo e rode `hw_servo`.

## 15. Possíveis erros de montagem

| Sintoma | Causa provável | Solução |
|---|---|---|
| ESP32 não aparece na USB | Cabo só de carga | Usar cabo com dados |
| Servo treme/reinicia o ESP32 | Alimentação fraca, sem GND comum, sem capacitor | Fonte ≥ 1 A, GND comum, capacitor |
| Servo não se mexe | Sinal na GPIO errada; fonte desligada; vermelho sem 5 V | Conferir cap. 6–8 |
| LED não acende | Invertido ou sem resistor | Virar o LED; conferir o resistor |
| Sensor sempre "detectando" | Potenciômetro muito sensível; superfície clara | Girar o potenciômetro; reposicionar |
| Sensor nunca detecta | Alimentação em 3,3 V reduz alcance; carrinho escuro | Aproximar; ajustar potenciômetro |
| Fim de curso nunca "aciona" | NO/NC trocados; fio solto | Testar com `hw_limit` |
| FALHA logo ao ligar | Fim de curso não pressionado ao ligar | Normal; coloque o palito no fim de curso e use Recuperar |

## Esquema elétrico textual

```
USB (PC) ──► ESP32 DevKit V1
               3V3 ───┬──► FC-51 chegada  VCC
                      └──► FC-51 passagem VCC
               GND ───┬──► FC-51 x2 GND, LED cátodos, COM do fim de curso
                      └──► GND da fonte 5 V (GND comum)
               D32 ◄── FC-51 chegada  OUT
               D33 ◄── FC-51 passagem OUT
               D26 ◄── NO do fim de curso (COM → GND)   [pull-up interno]
               D18 ──► Sinal do SG90
               D16 ──► 220 Ω ──► LED verde ──► GND
               D17 ──► 220 Ω ──► LED vermelho ──► GND

Fonte 5 V ──(+)──► Fio vermelho do SG90 ──┐
                                           ├─ capacitor 470–1000 µF
          ──(−)──► Fio marrom do SG90 ─────┘  (− no GND comum)
```
