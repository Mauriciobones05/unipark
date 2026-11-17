"""Gera docs/Documentacao_Tecnica_UniPark.pdf (HTML + SVG impresso pelo Microsoft Edge, sem dependencias).

Uso: python tools/gerar_documentacao.py
Preencha EQUIPE e, depois de medir, RESULTADOS. O que nao foi medido aparece como "nao medido".
"""
import subprocess
import sys
import tempfile
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "Documentacao_Tecnica_UniPark.pdf"
LOGO = (ROOT / "frontend" / "public" / "unipark-logo.png").as_uri()
EDGE = [Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")]

EQUIPE = []  # ex.: ["Nome Completo 1", "Nome Completo 2"]
DATA = "Novembro de 2026"
RESULTADOS = {}  # ex.: {"T01": "máx. 212 ms em 20 medições (atendeu)"}; vazio = "não medido"

AZUL, AZUL2, CINZA = "#033E9C", "#0081EF", "#64748B"
VERDE, VERM, AMBAR = "#16A34A", "#DC2626", "#D97706"


# ------------------------------------------------------------------ SVG helpers
def svg(w, h, body):
    return (f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Calibri, sans-serif">'
            '<defs>'
            + "".join(f'<marker id="a{n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
                      f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>'
                      for n, c in (("b", AZUL2), ("r", VERM), ("g", VERDE), ("o", AMBAR)))
            + f'</defs>{body}</svg>')


def box(x, y, w, h, label, sub="", fill="#fff", stroke="#B6C4DA", color=AZUL, size=14):
    t = f'<text x="{x + w / 2}" y="{y + h / 2 + (-2 if sub else 5)}" text-anchor="middle" font-size="{size}" font-weight="700" fill="{color}">{escape(label)}</text>'
    if sub:
        t += f'<text x="{x + w / 2}" y="{y + h / 2 + 15}" text-anchor="middle" font-size="{size - 3}" fill="{CINZA if fill in ("#fff", "#E8F2FE") else "#DCE8FA"}">{escape(sub)}</text>'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>{t}'


def line(x1, y1, x2, y2, c="b", dash=False, both=False, w=2):
    col = {"b": AZUL2, "r": VERM, "g": VERDE, "o": AMBAR, "k": "#334155"}[c]
    mk = "" if c == "k" else f' marker-end="url(#a{c})"' + (f' marker-start="url(#a{c})"' if both else "")
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{w}"'
            f'{" stroke-dasharray=\"6 4\"" if dash else ""}{mk}/>')


def txt(x, y, s, size=12, color=CINZA, anchor="middle", bold=False):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" fill="{color}"'
            f'{" font-weight=\"700\"" if bold else ""}>{escape(s)}</text>')


def gnd(x, y):
    return (f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y + 8}" stroke="#334155" stroke-width="2"/>'
            f'<line x1="{x - 10}" y1="{y + 8}" x2="{x + 10}" y2="{y + 8}" stroke="#334155" stroke-width="2"/>'
            f'<line x1="{x - 6}" y1="{y + 13}" x2="{x + 6}" y2="{y + 13}" stroke="#334155" stroke-width="2"/>'
            f'<line x1="{x - 2}" y1="{y + 18}" x2="{x + 2}" y2="{y + 18}" stroke="#334155" stroke-width="2"/>')


def flag(x, y, label, direction="left"):
    """Rotulo de rede (3V3, 5V externo) com pequeno traco."""
    x2 = x - 22 if direction == "left" else x + 22
    anchor = "end" if direction == "left" else "start"
    return line(x, y, x2, y, "k") + txt(x2 + (-4 if direction == "left" else 4), y + 4, label, 12, "#B45309", anchor, True)


def diagrama_blocos():
    b = []
    b.append(txt(110, 24, "ENTRADAS", 12, CINZA, "middle", True))
    b.append(txt(450, 24, "ESP32 (DUAL-CORE)", 12, CINZA, "middle", True))
    b.append(txt(790, 24, "SAÍDAS", 12, CINZA, "middle", True))
    for i, (a, s) in enumerate([("FC-51 chegada", "GPIO 32"), ("FC-51 passagem", "GPIO 33"),
                                 ("Fim de curso", "GPIO 26 · pull-up")]):
        y = 50 + i * 100
        b.append(box(20, y, 180, 70, a, s))
        b.append(line(200, y + 35, 290, y + 35))
    b.append('<rect x="290" y="40" width="320" height="310" rx="10" fill="#fff" stroke="#033E9C" stroke-width="2"/>')
    b.append(f'<rect x="290" y="40" width="320" height="34" rx="10" fill="{AZUL}"/><rect x="290" y="60" width="320" height="14" fill="{AZUL}"/>')
    b.append(txt(450, 62, "Núcleo 1 · loop() de segurança", 14, "#fff", "middle", True))
    for i, (a, s) in enumerate([("SensorManager", "debounce: 60 ms / 150 ms / 20 ms / 300 ms"),
                                 ("GateController", "máquina de estados + autorização"),
                                 ("ServoDriver", "PWM 50 Hz (LEDC) + LEDs")]):
        y = 88 + i * 64
        b.append(box(310, y, 280, 50, a, s, "#E8F2FE", "#B6C4DA", AZUL, 14))
        if i < 2:
            b.append(line(450, y + 50, 450, y + 64))
    b.append(box(310, 282, 280, 56, "Núcleo 0 · WebServerManager", "API REST + LittleFS (mutex com o controlador)", AZUL2,
                 AZUL2, "#fff", 14))
    for i, (a, s) in enumerate([("Servo SG90 + palito", "GPIO 18 · 5 V externo"), ("LEDs verde/vermelho", "GPIO 16 / 17"),
                                 ("Access Point Wi-Fi", "Cancela-ESP32 · 192.168.4.1")]):
        y = 50 + i * 100
        b.append(box(700, y, 180, 70, a, s))
    b.append(line(610, 85, 700, 85))
    b.append(line(610, 185, 700, 185))
    b.append(line(610, 285, 700, 285, "b", both=True))
    b.append(line(790, 320, 790, 345, "b", both=True))
    b.append(box(700, 345, 180, 50, "Celular / PC", "painel React (HTTP)", "#fff"))
    b.append(txt(450, 410, "Servidor web isolado no núcleo 0: um cliente lento não atrasa sensores nem servo.", 12, CINZA))
    return svg(900, 415, "".join(b))


def esquema_eletrico():
    b = []
    # ESP32
    b.append(f'<rect x="330" y="90" width="240" height="400" rx="10" fill="#fff" stroke="{AZUL}" stroke-width="2.4"/>')
    b.append(txt(450, 140, "ESP32 DevKit V1", 17, AZUL, "middle", True))
    b.append(txt(450, 160, "alimentado pela USB (5 V)", 12, CINZA))
    pins_l = [("D32", 220), ("D33", 300), ("D26", 380)]
    pins_r = [("D18", 220), ("D16", 320), ("D17", 400)]
    for n, y in pins_l:
        b.append(txt(342, y + 4, n, 13, AZUL, "start", True))
    for n, y in pins_r:
        b.append(txt(558, y + 4, n, 13, AZUL, "end", True))
    # 3V3 e GND do ESP32
    b.append(line(400, 90, 400, 62, "k") + txt(400, 54, "3V3", 12, "#B45309", "middle", True))
    b.append(txt(400, 108, "3V3", 12, AZUL, "middle", True))
    b.append(line(450, 490, 450, 510, "k") + gnd(450, 510) + txt(450, 482, "GND", 12, AZUL, "middle", True))
    # sensores esquerda
    for nome, y0, pino, py in (("FC-51 chegada", 190, "D32", 220), ("FC-51 passagem", 270, "D33", 300)):
        b.append(box(70, y0, 170, 60, nome, "VCC · OUT · GND", "#E8F2FE"))
        b.append(line(240, py, 330, py, "k", w=2.4) + txt(285, py - 6, "OUT", 11, CINZA))
        b.append(line(70, y0 + 14, 48, y0 + 14, "k") + txt(44, y0 + 18, "3V3", 12, "#B45309", "end", True))
        b.append(line(70, y0 + 46, 48, y0 + 46, "k") + gnd(48, y0 + 46))
    b.append(box(70, 350, 170, 60, "Fim de curso", "COM · NO", "#E8F2FE"))
    b.append(line(240, 380, 330, 380, "k", w=2.4) + txt(285, 374, "NO", 11, CINZA))
    b.append(line(70, 364, 48, 364, "k") + gnd(48, 364))
    b.append(txt(48, 354, "COM", 11, CINZA, "end"))
    b.append(txt(285, 398, "pull-up interno", 10, CINZA))
    # LEDs
    for nome, cor, y, pn in (("LED verde", VERDE, 320, "D16"), ("LED vermelho", VERM, 400, "D17")):
        b.append(line(570, y, 612, y, "k", w=2.4))
        b.append(f'<rect x="612" y="{y - 11}" width="54" height="22" fill="#fff" stroke="#334155" stroke-width="1.6"/>')
        b.append(txt(639, y + 4, "220 Ω", 11, "#334155"))
        b.append(line(666, y, 700, y, "k", w=2.4))
        b.append(f'<circle cx="716" cy="{y}" r="16" fill="{cor}" opacity="0.9"/>')
        b.append(txt(716, y + 4, "LED", 10, "#fff", "middle", True))
        b.append(line(732, y, 760, y, "k", w=2.4) + gnd(760, y))
        b.append(txt(716, y - 24, nome, 11, CINZA))
    # servo
    b.append(box(640, 170, 220, 100, "Servo SG90", "sinal · V+ · GND", "#E8F2FE"))
    b.append(line(570, 220, 640, 220, "k", w=2.4) + txt(605, 214, "PWM", 11, CINZA))
    b.append(line(830, 170, 830, 140, "k") + txt(830, 132, "+5 V externo (≥ 1 A)", 12, "#B45309", "middle", True))
    b.append(line(830, 270, 830, 290, "k") + gnd(830, 290))
    b.append(txt(830, 282, "GND comum", 11, CINZA, "end"))
    # capacitor
    b.append(line(700, 170, 700, 150, "k"))
    b.append(f'<line x1="680" y1="150" x2="720" y2="150" stroke="#334155" stroke-width="2.4"/>')
    b.append(f'<path d="M680,140 Q700,130 720,140" fill="none" stroke="#334155" stroke-width="2.4"/>')
    b.append(line(700, 140, 700, 132, "k") + txt(700, 124, "+5 V", 11, "#B45309", "middle", True))
    b.append(txt(690, 148, "470–1000 µF", 11, CINZA, "end"))
    b.append(txt(450, 548, "Todos os GND (ESP32, sensores, LEDs, fim de curso e fonte do servo) ligados ao mesmo trilho.", 12, CINZA))
    b.append(txt(450, 566, "Rótulos 3V3 e +5 V indicam a mesma rede de alimentação. Valores: docs/componentes.md.", 12, CINZA))
    return svg(900, 580, "".join(b))


def diagrama_estados():
    b = []
    nodes = {"INIC": (10, 70, "INICIALIZANDO", "#64748B", "#fff"), "FECH": (240, 70, "FECHADA", "#fff", AZUL),
             "ABRI": (470, 70, "ABRINDO", "#fff", AZUL), "ABER": (700, 70, "ABERTA", "#E6F6EC", VERDE),
             "FCHA": (470, 300, "FECHANDO", "#fff", AZUL), "FALH": (240, 300, "FALHA", VERM, "#fff")}
    for k, (x, y, lab, fill, col) in nodes.items():
        b.append(box(x, y, 150, 64, lab, "", fill, "#B6C4DA" if fill == "#fff" else fill, col, 15))
    # ciclo normal (linha superior)
    b.append(line(160, 102, 240, 102))
    b.append(txt(200, 82, "fim de curso", 11, CINZA) + txt(200, 94, "acionado", 11, CINZA))
    b.append(line(390, 102, 470, 102) + txt(430, 94, "chegada", 11, CINZA))
    b.append(line(620, 102, 700, 102) + txt(660, 94, "tempo", 11, CINZA))
    # abertura -> fechando
    b.append(line(775, 134, 620, 310, "b") + txt(702, 240, "passagem livre 3 s", 11, CINZA, "start"))
    b.append(txt(702, 253, "(modo automático)", 11, CINZA, "start"))
    # fechando -> fechada (confirmado)
    b.append(line(485, 300, 385, 134, "g") + txt(456, 262, "fim de curso", 11, VERDE, "start", True))
    b.append(txt(456, 275, "confirma", 11, VERDE, "start", True))
    # obstaculo reabre
    b.append(line(570, 300, 570, 134, "o") + txt(580, 210, "obstáculo", 11, AMBAR, "start", True))
    b.append(txt(580, 223, "→ reabre", 11, AMBAR, "start", True))
    # falhas
    b.append(line(470, 332, 390, 332, "r") + txt(430, 384, "não confirma no prazo", 11, VERM, "middle", True))
    b.append(line(270, 300, 270, 134, "g", dash=True) + txt(262, 215, "reset-fault", 11, VERDE, "end", True))
    b.append(txt(262, 228, "(recuperação)", 11, VERDE, "end", True))
    b.append(line(335, 134, 335, 300, "r", dash=True) + txt(343, 200, "fim de curso solto", 11, VERM, "start"))
    b.append(txt(343, 213, "(FIM_CURSO_PERDIDO)", 10, VERM, "start"))
    b.append(txt(450, 412, "Também: ABERTA → FALHA se o fim de curso ficar acionado (FIM_CURSO_PRESO).", 11, CINZA))
    return svg(900, 425, "".join(b))


# ------------------------------------------------------------------ conteudo
def tabela(cab, linhas, larguras=None, cls=""):
    th = "".join(f"<th>{escape(c)}</th>" for c in cab)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>" for l in linhas)
    cg = "".join(f'<col style="width:{w}">' for w in larguras) if larguras else ""
    return f'<table class="{cls}"><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def resultado(tid):
    r = RESULTADOS.get(tid)
    return escape(r) if r else '<span class="nm">não medido</span>'


equipe_html = ("".join(f"<li>{escape(n)}</li>" for n in EQUIPE) if EQUIPE
               else "<li class='pend'>Nome completo: ______________________________</li>"
                    "<li class='pend'>Nome completo: ______________________________</li>")

RF = [
    ["RF01", "Detectar a chegada de um veículo (FC-51, GPIO 32) e, em modo automático, abrir se houver vaga.", "T01"],
    ["RF02", "Impedir o fechamento com objeto na passagem (GPIO 33) e reabrir se ele surgir durante o fechamento.", "T02"],
    ["RF03", "Confirmar a posição fechada pelo fim de curso e entrar em FALHA se não confirmar no prazo.", "T05"],
    ["RF04", "Contar a vaga só quando o veículo cruza o sensor de passagem; negar entrada se lotado.", "Testes de lógica"],
    ["RF05", "Monitorar e comandar pelo painel web via Wi-Fi (abrir, fechar, modo, liberar entrada/saída, ajustar ocupação).", "T03"],
    ["RF06", "Recusar comandos incompatíveis com o estado (409) e parâmetros inválidos (400).", "Testes de lógica"],
    ["RF07", "Manter sensores, decisões e proteções sem cliente Wi-Fi conectado.", "T04"],
    ["RF08", "Recuperar de FALHA por <code>reset-fault</code>, com uma única tentativa automática.", "T06"],
    ["RNF01", "Início da abertura ≤ 500 ms após detecção válida (20 medições).", "T01"],
    ["RNF02", "≥ 19 de 20 comandos Wi-Fi válidos respondidos em ≤ 1 s.", "T03"],
    ["RNF03", "Falha do fim de curso detectada em ≈ 3000 ms (<code>travelCloseMs + limitConfirmMs</code>).", "T05"],
    ["RNF04", "Painel servido pelo próprio ESP32 (≈ 84 KB gz), sem internet.", "Integração no navegador"],
    ["RNF05", "Servo alimentado por fonte externa de 5 V ≥ 1 A, com GND comum e capacitor.", "Inspeção da montagem"],
]

PINAGEM = [
    ["FC-51 chegada", "OUT", "32", "3,3 V", "Detecta o carrinho"],
    ["FC-51 passagem", "OUT", "33", "3,3 V", "Detecta obstáculo/passagem"],
    ["Fim de curso", "NO (COM → GND)", "26", "pull-up interno", "Confirma a posição fechada"],
    ["Servo SG90", "Sinal", "18", "3,3 V (PWM 50 Hz)", "Move a cancela"],
    ["Servo SG90", "V+ / GND", "—", "5 V externo / GND comum", "Potência"],
    ["LED verde", "ânodo via 220 Ω", "16", "3,3 V", "Cancela ABERTA"],
    ["LED vermelho", "ânodo via 220 Ω", "17", "3,3 V", "Fechando, bloqueio ou falha"],
]

DIMENS = [
    "USB alimenta o ESP32; os dois FC-51 (≈ 20 mA cada) saem do pino 3V3.",
    "Servo em 5 V externo ≥ 1 A: o pico do SG90 chega a ≈ 0,7 A travado, mais que a USB de 500 mA suporta junto com o Wi-Fi.",
    "GND comum entre fonte do servo, ESP32 e sensores: sem ele o PWM não tem referência.",
    "Capacitor de 470–1000 µF em paralelo com a alimentação do servo, perto dele (polaridade respeitada).",
    "FC-51 alimentados em 3,3 V: a saída nunca passa de 3,3 V; em 5 V a saída danificaria o GPIO.",
    "LEDs com resistor de 220 Ω individual: ≈ 6 mA a 3,3 V.",
    "Fim de curso NO com pull-up interno: fio rompido lê “não acionado” e gera FALHA, nunca falsa confirmação.",
    "GPIOs de boot (0, 2, 5, 12, 15) e de flash (6–11) evitados.",
]

COMANDOS = [
    ["INICIALIZANDO", "409", "409", "409", "200"],
    ["FECHADA", "<b>200</b>", "409", "409", "200"],
    ["ABRINDO", "409", "409", "409", "200"],
    ["ABERTA", "409", "<b>200</b> sem obstáculo", "409", "200"],
    ["FECHANDO", "<b>200</b> (reverte)", "409", "409", "200"],
    ["FALHA", "409", "409", "<b>200</b> sem obstáculo", "200"],
]

API = [
    ["GET", "/api/status", "Estado completo (JSON)", "200"],
    ["GET", "/api/metrics", "Contadores e medições T01/T02/T05", "200"],
    ["POST", "/api/open · /api/close", "Pede abertura / fechamento", "200 / 409"],
    ["POST", "/api/mode (auto|manual)", "Muda o modo", "200 / 400"],
    ["POST", "/api/reset-fault", "Pede recuperação", "200 / 409"],
    ["POST", "/api/release-entry · /api/release-exit", "Operador libera uma entrada / saída", "200 / 409"],
    ["POST", "/api/parking/occupied (value=N)", "Ajusta a ocupação", "200 / 400"],
]

TESTES = [
    ["T01", "Abertura iniciada ≤ 500 ms após detecção válida (20 medições)",
     "Modo automático; carrinho no sensor de chegada; ler <code>response.lastMs</code> no painel."],
    ["T02", "20/20 tentativas de fechar com obstáculo bloqueadas",
     "Cancela ABERTA, objeto no feixe; clicar FECHAR 20 vezes; conferir <code>closeBlockedByObstacle</code> = 20 e <code>closeStartedWithObstacle</code> = 0."],
    ["T03", "≥ 19/20 comandos Wi-Fi válidos em ≤ 1 s",
     "<code>tools/t03_comunicacao.ps1</code> envia 20 comandos e grava o CSV."],
    ["T04", "Proteções locais continuam sem cliente Wi-Fi",
     "Desconectar o celular; carrinho abre a cancela; objeto na passagem impede o fechamento."],
    ["T05", "Falha do fim de curso detectada em ≈ 3000 ms",
     "Ambiente <code>faultsim</code> mascara o fim de curso; ler <code>lastFaultDetectMs</code>."],
    ["T06", "Recuperação volta a operação segura (FECHADA)",
     "Restaurar a condição e usar <code>reset-fault</code>."],
]

REGISTRADO = [
    ["Testes de lógica no computador", "27 de 27 aprovados", "Estados, contagem de vagas, falhas e comportamento de bancada."],
    ["Ciclos automáticos na placa", "5 ciclos registrados, sem falhas", "Aberturas e fechamentos pelo fluxo dos sensores (ambiente bench)."],
    ["Integração pelo navegador", "8 de 8 aprovados", "Interface, API real, reconexão e tela móvel simulada; 15 comandos HTTP com 200."],
]

CSS = """
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Calibri, sans-serif; color: #1F2937; font-size: 10.5pt; line-height: 1.45; }
h1 { color: #033E9C; font-size: 17pt; border-bottom: 3px solid #0081EF; padding-bottom: 4px; margin: 22px 0 10px; }
h1, h2 { break-after: avoid; page-break-after: avoid; }
h2 { color: #033E9C; font-size: 12.5pt; margin: 16px 0 6px; }
p { margin: 5px 0; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9.5pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #033E9C; color: #fff; text-align: left; padding: 5px 7px; }
td { border-bottom: 1px solid #D5DEEA; padding: 5px 7px; vertical-align: top; }
tbody tr:nth-child(even) td { background: #F1F6FD; }
code { background: #EEF2F7; padding: 0 3px; border-radius: 3px; font-size: 9pt; }
figure { margin: 10px 0; page-break-inside: avoid; text-align: center; }
figure svg { width: 100%; height: auto; }
figcaption { font-size: 9pt; color: #64748B; margin-top: 2px; }
.capa { page-break-after: always; text-align: left; padding-top: 30mm; }
.capa img { width: 90mm; margin-bottom: 18mm; }
.capa h1 { font-size: 26pt; border: 0; margin: 0 0 6px; }
.capa .sub { font-size: 13pt; color: #475569; margin-bottom: 22mm; }
.capa ul { list-style: none; padding: 0; font-size: 12pt; }
.capa li { margin: 6px 0; }
.pend { color: #94A3B8; }
.nm { color: #B45309; font-weight: 600; }
.break { page-break-before: always; }
ul.tight { margin: 4px 0 8px 18px; padding: 0; }
.nota { background: #FEF3E0; border-left: 4px solid #D97706; padding: 6px 10px; margin: 8px 0; font-size: 9.5pt; }
"""


def html():
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<section class="capa">
  <img src="{LOGO}" alt="UniPark">
  <h1>Cancela Inteligente com ESP32</h1>
  <div class="sub">Documentação técnica · Sistemas Embarcados, Atividade Grau B · UNISINOS</div>
  <p><b>Integrantes</b></p><ul>{equipe_html}</ul>
  <p style="margin-top:14mm;color:#64748B">{escape(DATA)}</p>
</section>

<h1>1. Especificação</h1>
<h2>1.1 Objetivo e aplicação</h2>
<p>Cancela automática que simula a entrada e a saída de veículos em um estacionamento de 5 vagas. Um carrinho Hot Wheels é
detectado por um sensor infravermelho; o ESP32 abre a cancela (servo SG90 e palito), confere se a passagem está livre e fecha
confirmando a posição por um fim de curso. O painel web UniPark (React) é servido pelo próprio ESP32 por um Access Point Wi-Fi,
sem internet, e serve para monitorar e comandar.</p>
<h2>1.2 Operação completa</h2>
<ul class="tight">
<li>O carrinho é detectado pelo sensor de chegada (estável por 60 ms); em modo automático e com vaga livre, a cancela abre e o LED verde acende.</li>
<li>Enquanto o sensor de passagem estiver ocupado, a cancela permanece aberta. A vaga só é contada quando o veículo cruza esse sensor.</li>
<li>Com a passagem livre por ≈ 3 s, a cancela fecha; o fim de curso confirma a posição fechada.</li>
<li>Obstáculo durante o fechamento reabre a cancela; sem confirmação do fim de curso no prazo, o sistema entra em FALHA e exige recuperação.</li>
</ul>
<h2>1.3 Requisitos funcionais e não funcionais</h2>
{tabela(["ID", "Requisito", "Teste associado"], RF, ["9%", "71%", "20%"])}
<p class="nota">Os identificadores foram derivados da documentação do projeto; conferir a numeração com a proposta aprovada, se ela usar outra.</p>

<h1>2. Diagrama de blocos</h1>
<figure>{diagrama_blocos()}<figcaption>Figura 1 — Blocos de hardware, firmware e comunicação.</figcaption></figure>
<table><thead><tr><th>Módulo</th><th>Responsabilidade</th></tr></thead><tbody>
<tr><td><code>SensorManager</code></td><td>Lê os pinos e aplica filtros de tempo (debounce) assimétricos.</td></tr>
<tr><td><code>GateController</code></td><td>Máquina de estados, comandos, autorização de entrada/saída, métricas e log. Sem dependência do Arduino (testada no PC).</td></tr>
<tr><td><code>ServoDriver</code></td><td>PWM de 50 Hz pelo LEDC, com rampa de ângulo; o ângulo é comandado, não medido.</td></tr>
<tr><td><code>WebServerManager</code></td><td>Access Point, rotas HTTP/JSON e arquivos do LittleFS; roda no núcleo 0.</td></tr>
</tbody></table>

<h1>3. Componentes, esquema elétrico e alimentação</h1>
<h2>3.1 Pinagem</h2>
{tabela(["Componente", "Pino", "GPIO", "Nível / tensão", "Função"], PINAGEM)}
<h2>3.2 Esquema elétrico</h2>
<figure>{esquema_eletrico()}<figcaption>Figura 2 — Esquema elétrico com alimentação e pinagem.</figcaption></figure>
<h2>3.3 Dimensionamento e justificativas</h2>
<ul class="tight">{"".join(f"<li>{escape(d)}</li>" for d in DIMENS)}</ul>
<p class="nota">Valores de projeto. O relatório de 12/11/2026 informa que não foram registrados ensaios de tensão ou corrente da montagem.</p>

<h1>4. Diagrama de estados</h1>
<figure>{diagrama_estados()}<figcaption>Figura 3 — Estados e transições da cancela.</figcaption></figure>
<p>Em FECHANDO, o obstáculo (filtrado ou bruto) reabre imediatamente e vence qualquer comando. Em FALHA, a cancela não faz movimento
automático; só <code>reset-fault</code> sai desse estado. Na inicialização, nenhum PWM é gerado até a posição ser conhecida.</p>
<h2>4.1 Resposta a comandos por estado</h2>
{tabela(["Estado", "open", "close", "reset-fault", "mode"], COMANDOS)}
<p>Parâmetro de <code>mode</code> diferente de <code>auto</code>/<code>manual</code> retorna <b>400</b>. Comandos incompatíveis com o estado retornam <b>409</b>.</p>
<h2>4.2 Falhas detectadas</h2>
{tabela(["Código", "Condição"], [
    ["<code>FIM_CURSO_TIMEOUT</code>", "Servo chegou ao ângulo fechado e o fim de curso não acionou em <code>limitConfirmMs</code> (total ≈ 3000 ms)."],
    ["<code>FIM_CURSO_PRESO</code>", "Fim de curso continua acionado com a cancela ABERTA por <code>openStuckMs</code>."],
    ["<code>FIM_CURSO_PERDIDO</code>", "Fim de curso solta com a cancela FECHADA por <code>limitLostMs</code>."]])}

<h1>5. Comunicação</h1>
<p>O ESP32 cria o Access Point <b>Cancela-ESP32</b> (IP 192.168.4.1, canal 6, até 4 clientes). O celular conecta direto, sem roteador nem
internet, e abre <code>http://192.168.4.1</code>. O painel consulta <code>/api/status</code> a cada 500 ms (polling): se a rede cai, a próxima
consulta recupera sozinha. Os botões do painel apenas <i>pedem</i>; a máquina de estados decide.</p>
{tabela(["Método", "Rota", "Função", "Respostas"], API, ["10%", "38%", "37%", "15%"])}
<h2>5.1 Perda de comunicação</h2>
<ul class="tight">
<li>O laço de sensores, estados e servo roda no núcleo 1 e não depende do HTTP: a cancela continua operando com o celular desconectado.</li>
<li>Nenhum comando pendente é guardado para executar na reconexão.</li>
<li>O painel mostra “Sem conexão” após 2,5 s sem resposta válida e desativa os botões; ao reconectar, volta sozinho.</li>
<li>A tarefa web verifica o Access Point a cada 5 s e o reinicia se ele cair.</li>
</ul>

<h1>6. Testes, resultados e limitações</h1>
<h2>6.1 Critérios de aceitação</h2>
{tabela(["ID", "Critério", "Procedimento", "Resultado medido"],
        [[i, c, p, resultado(i)] for i, c, p in TESTES], ["6%", "27%", "47%", "20%"])}
<p>Para cada teste a planilha <code>docs/planilha_resultados.csv</code> registra condição, valor, unidade, critério e conclusão. Os limites
devem ser iguais aos da proposta aprovada.</p>
<h2>6.2 Verificações já registradas</h2>
{tabela(["Verificação", "Resultado", "Alcance"], REGISTRADO)}
<p>Fonte: <code>docs/Relatorio_UniPark_12-11-2026.pdf</code>; evidências em <code>test/test_logica/test_gate.cpp</code> e
<code>frontend/tests/esp.integration.mjs</code>. Os testes de lógica não substituem os ensaios mecânicos e elétricos da montagem final.</p>
<h2>6.3 Limitações identificadas</h2>
<ul class="tight">
<li>A abertura é estimada por tempo: há um único fim de curso, na posição fechada.</li>
<li>O fim de curso não diferencia fio solto, chave desalinhada e servo sem energia.</li>
<li>O FC-51 sofre com luz ambiente, cor e brilho; com 3,3 V o alcance é menor. Um sensor de passagem não distingue direção nem se o objeto é um carro.</li>
<li>Sem autenticação nos comandos (a segurança é a senha do Wi-Fi) e sem persistência: reiniciar zera a ocupação.</li>
<li>Pendente: haste com fim de curso (ambiente <code>esp32dev</code>), medições elétricas, calibração e teste em celular físico.</li>
</ul>

<h1>7. Compilar, gravar e executar</h1>
<table><thead><tr><th>Ação</th><th>Comando</th></tr></thead><tbody>
<tr><td>Compilar o firmware</td><td><code>pio run -e esp32dev</code> (montagem final) ou <code>-e bench</code> (servo solto)</td></tr>
<tr><td>Gravar o firmware</td><td><code>pio run -e bench -t upload</code></td></tr>
<tr><td>Gravar o painel (LittleFS)</td><td><code>pio run -e bench -t uploadfs</code></td></tr>
<tr><td>Testes de lógica no PC</td><td><code>pio test -e native</code></td></tr>
<tr><td>Painel com simulador</td><td><code>cd frontend; npm install; npm run dev</code></td></tr>
<tr><td>Acessar</td><td>Rede <code>Cancela-ESP32</code> → <code>http://192.168.4.1</code></td></tr>
</tbody></table>
<p>Dependências do firmware: apenas Arduino-ESP32 2.0.16 (<code>espressif32@6.9.0</code>). Frontend: versões fixadas em
<code>frontend/package.json</code>. Detalhes no <code>README.md</code>.</p>
</body></html>"""


def main():
    edge = next((p for p in EDGE if p.exists()), None)
    if edge is None:
        sys.exit("Microsoft Edge nao encontrado")
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / "doc.html"
        f.write_text(html(), encoding="utf-8")
        subprocess.run([str(edge), "--headless", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={OUT}", f.as_uri()], check=True, timeout=120,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Gerado:", OUT)


if __name__ == "__main__":
    main()


