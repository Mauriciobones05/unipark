# Caderno de campo

Registro semanal exigido pelo enunciado (seção 3). Cada semana vira **um slide** na apresentação final, com atividades fora de aula incluídas.
Os campos abaixo já trazem o que o repositório e o relatório de 12/11 comprovam. Os campos marcados com **(completar)** só a equipe sabe.
Distinguir sempre hipótese de causa comprovada, e registrar apenas o que foi observado.

Para gerar os slides, preencher a lista `SEMANAS` em `tools/gerar_apresentacao.py` (formato no comentário) e rodar o script.

---

## Semana de 06/11/2026

- **Objetivo da semana:** (completar)
- **Avanços:** estrutura do projeto criada (commit "projeto cancela inteligente gb"); painel web React estruturado e refinado (3 commits de front-end).
- **Problema ou decisão técnica:** (completar)
- **Teste e evidência:** histórico do git de 06/11. (completar com fotos, logs ou medições, se houver)
- **Conclusão e próximo passo:** (completar)
- **Contribuições individuais:** (completar, uma linha por integrante)

## Semana de 12/11/2026 (montagem e integração do protótipo)

- **Objetivo da semana:** integrar o circuito físico ao projeto para detectar chegada e passagem de um veículo, movimentar o servo como cancela e disponibilizar monitoramento e comandos pelo painel web.
- **Avanços:** montagem de bancada em protoboard (ESP32, dois FC-51, servo, LEDs e fim de curso); firmware gravado na ESP32 e painel no LittleFS; driver CP210x instalado e placa reconhecida na COM3; painel apontado para a API real (`npm run dev:esp`); ambiente `bench` criado.
- **Problema ou decisão técnica:** ver `docs/decisoes_de_engenharia.md` (decisões 1 e 2).
- **Teste e evidência:** 27/27 testes de lógica no PC; 5 ciclos automáticos na placa sem falhas; 8/8 cenários de integração pelo navegador, com 15 comandos HTTP respondendo 200 (`Relatorio_UniPark_12-11-2026.pdf`, `frontend/tests/esp.integration.mjs`); captura do painel durante o teste de abertura.
- **Conclusão e próximo passo:** sensores, servo e LEDs responderam. Pendências: fixar haste e fim de curso e voltar ao `esp32dev`; calibrar ângulos e tempos; conferir alimentação e GND comum e registrar medidas elétricas; validar o acesso em um celular físico.
- **Contribuições individuais:** (completar, uma linha por integrante)

## Semana de 13/11/2026

- **Objetivo da semana:** (completar)
- **Avanços:** firmware adaptado para funcionar com o ESP32 (commit "adaptacao para funcionar com esp32"); documentação técnica em PDF, esquema elétrico e apresentação preparados.
- **Problema ou decisão técnica:** (completar)
- **Teste e evidência:** (completar)
- **Conclusão e próximo passo:** (completar)
- **Contribuições individuais:** (completar, uma linha por integrante)

---

## Modelo para novas semanas

```
## Semana de __/__/2026

- Objetivo da semana: o que a equipe pretendia implementar ou verificar.
- Avanços: o que foi montado, programado ou integrado e o que passou a funcionar.
- Problema ou decisão técnica: dificuldade investigada ou escolha justificada.
- Teste e evidência: foto, medição, log, gráfico ou resultado de ensaio.
- Conclusão e próximo passo: alteração feita, aprendizado e pendências.
- Contribuições individuais: participação de cada integrante.
```
