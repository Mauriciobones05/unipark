# Componentes, pinagem e decisões elétricas

## Lista de materiais

| Componente | Qtd | Observação |
|---|---|---|
| ESP32 DevKit V1 (30 pinos) | 1 | Alimentado pela USB |
| Protoboard | 1 ou 2 | Meia ou inteira; confira o modelo (ver `montagem.md`) |
| Sensor IR FC-51 | 2 | Alimentar com **3,3 V** |
| Servo SG90 180° | 1 | Fonte externa de 5 V |
| Microinterruptor (fim de curso) | 1 | Usar contatos **COM** e **NO** |
| LED vermelho / verde | 1 / 1 | |
| Resistor 220 Ω | 2 | Um por LED |
| Fonte 5 V (≥ 1 A) | 1 | Para o servo |
| Cabo USB de dados | 1 | |
| Hot Wheels + palito leve | 1 + 1 | Veículo e cancela |
| **Capacitor eletrolítico 470 µF a 1000 µF, ≥ 10 V** | 1 | *Adicional recomendado* (ver abaixo) |

O único acréscimo é o capacitor. Motivo: o SG90 consome picos de corrente (centenas de mA, ~0,7 A em
travamento) ao partir; sem capacitor a tensão do servo oscila e pode causar tremor ou reinício do ESP32 se o GND
for compartilhado de forma ruim. Ele fica **em paralelo com a alimentação do servo** (+ no 5 V, − no GND), o mais perto possível do servo.
Observe a polaridade (faixa branca = negativo).

## Pinagem

| Componente | Pino do componente | GPIO | Tensão | Função |
|---|---|---|---|---|
| FC-51 chegada | OUT | **32** | 3,3 V | Detecta o carrinho |
| FC-51 chegada | VCC / GND | 3V3 / GND | 3,3 V | Alimentação |
| FC-51 passagem | OUT | **33** | 3,3 V | Detecta obstáculo sob a cancela |
| FC-51 passagem | VCC / GND | 3V3 / GND | 3,3 V | Alimentação |
| Servo SG90 | Sinal (laranja/amarelo) | **18** | 3,3 V (sinal) | PWM 50 Hz |
| Servo SG90 | Vermelho | – | **5 V externo** | Potência |
| Servo SG90 | Marrom/preto | GND comum | 0 V | Retorno |
| LED verde | Ânodo (perna longa) via 220 Ω | **16** | 3,3 V | Cancela ABERTA |
| LED vermelho | Ânodo via 220 Ω | **17** | 3,3 V | Bloqueado / falha |
| Fim de curso | COM | GND | 0 V | Contato comum |
| Fim de curso | NO | **26** | 3,3 V (pull-up interno) | Fechada = contato fechado |

## Decisões elétricas (as 10 regras do enunciado)

1. **USB alimenta o ESP32.** Os dois FC-51 (~20 mA cada) saem do pino 3V3, dentro da capacidade do regulador da placa.
2. **Servo com 5 V externo ≥ 1 A.** A USB do computador (500 mA) não aguenta o pico do servo junto com o Wi-Fi.
3. **GND comum:** GND da fonte do servo, GND do ESP32 e GND dos sensores ligados no mesmo trilho. Sem isso o sinal PWM não tem referência.
4. **Servo nunca no 3V3 nem em GPIO.** O GPIO fornece só ~12 mA recomendados; o 3V3 não suporta o pico.
5. **Nada acima de 3,3 V entra no ESP32.** Os FC-51 alimentados em 3,3 V têm saída máxima de 3,3 V. **Se alimentar o FC-51 com 5 V, sua saída vai a 5 V e danifica o GPIO.**
6. **FC-51 em 3,3 V:** o módulo (comparador LM393) funciona de 3,3 a 5 V. Em 3,3 V o alcance é menor (tipicamente 2 a 15 cm, depende do potenciômetro). *Confirme com seu módulo e meça a saída com multímetro antes de ligar ao GPIO.*
7. **Um resistor por LED.** 220 Ω → ≈ 6 mA (verde/vermelho a 3,3 V). Compartilhar resistor altera o brilho e a corrente.
8. **Pull-up interno no GPIO 26.** O contato **NO** fecha para GND quando pressionado, então LOW = acionado. Escolhemos NO por fail-safe: fio rompido lê HIGH = "não acionado", o que gera falha em vez de falsa confirmação (com NC, fio rompido pareceria "acionado").
9. **Capacitor no servo** (ver acima).
10. **GPIOs de boot evitados.** Usamos 32, 33, 26, 18, 16, 17. Evitar 0, 2, 5, 12, 15 (strapping) e 6–11 (flash). GPIO 34–39 são só entrada e não têm pull-up. No DevKit V1 com ESP32-WROOM, GPIO 16/17 são livres (em módulos WROVER eles são usados pela PSRAM).

Sinal PWM do servo a 3,3 V: o SG90 normalmente aceita (limiar ≈ 2,5 V). Se o servo ficar tremendo sem motivo, é sinal de alimentação fraca, não de nível lógico.

## Limitações dos sensores

- **FC-51 é óptico:** superfícies pretas absorvem IR, brilhantes refletem de forma imprevisível; luz solar e lâmpadas incandescentes geram falsos positivos. Teste em condições de apresentação.
- Alcance e sensibilidade dependem do potenciômetro do módulo; o carrinho é pequeno e baixo.
- Um carrinho em movimento rápido pode passar entre amostras: o filtro de chegada exige 60 ms (ajustável em `config.h`).
- O sensor de passagem só vê objetos **no seu feixe**: um objeto fora da linha do feixe não é detectado.
- **Um único fim de curso** confirma só a posição *fechada*. A posição aberta é estimada por tempo.
