# Usar e testar o painel com a ESP32

## Acesso pelo celular

1. Mantenha a ESP32 alimentada pelo USB ou pela alimentação prevista na montagem.
2. No celular, abra as configurações de Wi-Fi e conecte em **Cancela-ESP32**.
3. Digite a senha **cancela123**. Se aparecer “sem internet”, escolha permanecer nessa rede.
4. No navegador, abra **http://192.168.4.1** e entre na página **Cancela**.

O painel está gravado na placa. O celular não precisa do Node.js nem do servidor
do computador. `localhost` no celular aponta para o próprio celular, não para o PC.
A rede da ESP32 permite acessar a cancela e não fornece internet.

## Acesso em localhost no computador

O computador também precisa estar conectado ao Wi-Fi **Cancela-ESP32**.
Em `frontend`, execute `npm run dev:esp` e abra **http://localhost:5173**.
O Vite encaminha `/api` para a ESP32 em `192.168.4.1`.

Com um único adaptador Wi-Fi, trocar para a rede da cancela desconecta o PC da
rede anterior. Se o PC estiver na UNISINOS e a ESP32 em sua própria rede, o painel
local mostra “Conexão com o ESP32 perdida” e bloqueia os comandos. Isso não impede
que um celular conectado à cancela a controle diretamente.

## Teste de integração pelo navegador

Pré-requisitos: firmware `bench` gravado (servo solto, sem haste), sensores D32 e
D33 livres, PC conectado à cancela, Microsoft Edge instalado e `npm run dev:esp`
em execução. O teste movimenta o servo e usa as APIs reais, sem simulador.

Em outro terminal, dentro de `frontend`:

```
npm run test:esp
```

O roteiro usa Playwright com o Edge instalado. Ele verifica:

- Estado ao vivo pela API real em localhost.
- Botões Manual/Automático, abrir e fechar, com resposta da placa e atualização da tela.
- Ajuste de ocupação, bloqueio de entrada quando lotado e autorizações de entrada/saída.
- Contagem de vagas mantida até a passagem física pelo D33.
- Eventos, métricas, bloqueio dos comandos sem conexão e recuperação ao reconectar.
- Interface servida pela placa em uma tela de celular simulada, incluindo comandos e sincronização entre clientes.
- Carregamento dos arquivos gzip com um único cabeçalho `Content-Encoding`.

O roteiro fecha o servo ao encerrar os comandos e restaura modo e ocupação originais.
Se o modo original for automático, uma nova detecção no D32 pode iniciar outra abertura.
Relatórios JSON e capturas ficam em `frontend/test-results/esp-<data>/` (ignorados
pelo Git). A simulação de tela móvel não substitui conectar e testar o celular físico.
