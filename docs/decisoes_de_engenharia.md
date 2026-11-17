# Decisões de engenharia

Formato exigido: **problema ou hipótese → teste → resultado → decisão.**
Fonte dos dois registros abaixo: `docs/Relatorio_UniPark_12-11-2026.pdf`, seções 4 e 7.

## Decisão 1: fim de curso na bancada

- **Problema / hipótese:** o LED vermelho piscava, indicando falha do fim de curso (`FIM_CURSO_TIMEOUT`, `FIM_CURSO_PERDIDO` ou `FIM_CURSO_PRESO`). Hipótese: a chave não tinha ligação mecânica com o servo.
- **Teste:** consulta à API para ver o estado da chave; testes guiados de recuperação, abertura e fechamento, com confirmação visual do servo e do LED verde.
- **Resultado:** a chave era lida corretamente, mas só mudava quando pressionada à mão. O servo estava solto na bancada, sem relação mecânica permanente com a posição.
- **Decisão:** criar o ambiente `bench`, em que as posições são estimadas pelo comando e pelo tempo de movimento, sem exigir o fim de curso. O sensor D33 continua bloqueando o fechamento e reabrindo se houver obstáculo. O ambiente `esp32dev` mantém a exigência do fim de curso para a montagem final com haste.

## Decisão 2: painel servido pelo ESP32

- **Problema / hipótese:** no acesso direto ao ESP32, o navegador não carregava a interface.
- **Teste:** verificação das respostas HTTP dos arquivos comprimidos (gzip) e do teste de integração pelo navegador.
- **Resultado:** o cabeçalho `Content-Encoding: gzip` estava duplicado, o que impedia o carregamento.
- **Decisão:** remover a duplicação no servidor HTTP e gravar a correção na placa. Depois disso, os 8 cenários de integração passaram, e o teste confere que há um único cabeçalho.

## Pendentes (precisam de medição)

- Alimentação do servo: comparar 20 ciclos abrir/fechar com e sem capacitor, medir a tensão do servo com multímetro e contar reinícios do ESP32. A fonte externa de 5 V ≥ 1 A com capacitor é decisão de projeto, ainda sem esse teste registrado.
- Detecção do carrinho: 6 condições × 10 repetições (2, 5 e 8 cm, lateral, em movimento, luz forte), registrando detecções e falsos positivos (`docs/testes.md`, desafio 1).
