"""Gera docs/UniPark_Apresentacao.pptx (requer: pip install python-pptx==1.0.2).

Uso: python tools/gerar_apresentacao.py
- Transicoes entre slides (fade na capa/fim, push no resto).
- Animacoes por clique (fade) nos diagramas e listas.
- Slides de caderno de campo, decisoes e uso de IA so aparecem se as listas abaixo forem preenchidas.
"""
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml import parse_xml
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "frontend" / "public" / "unipark-logo.png"
OUT = ROOT / "docs" / "UniPark_Apresentacao.pptx"

AZUL = RGBColor(0x03, 0x3E, 0x9C)
AZUL2 = RGBColor(0x00, 0x81, 0xEF)
AZUL_ESC = RGBColor(0x02, 0x24, 0x5C)
CLARO = RGBColor(0xE8, 0xF2, 0xFE)
FUNDO = RGBColor(0xF4, 0xF7, 0xFB)
TEXTO = RGBColor(0x1F, 0x29, 0x37)
CINZA = RGBColor(0x64, 0x6E, 0x7E)
BORDA = RGBColor(0xD5, 0xDE, 0xEA)
BRANCO = RGBColor(0xFF, 0xFF, 0xFF)
VERDE = RGBColor(0x16, 0xA3, 0x4A)
VERMELHO = RGBColor(0xDC, 0x26, 0x26)
AMBAR = RGBColor(0xD9, 0x77, 0x06)
AMBAR_CL = RGBColor(0xFE, 0xF3, 0xE0)
VERM_CL = RGBColor(0xFD, 0xEC, 0xEC)
VERDE_CL = RGBColor(0xE6, 0xF6, 0xEC)

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
total_slides = 0
PAGES = []  # (caixa de texto, numero) preenchidos no fim com "n / total"


# ----------------------------------------------------------------- primitivas
def _shadow(shape):
    sp_pr = shape._element.spPr
    sp_pr.append(parse_xml(
        f'<a:effectLst xmlns:a="{A_NS}"><a:outerShdw blurRad="88900" dist="25400" dir="5400000" '
        'algn="t" rotWithShape="0"><a:srgbClr val="1E3A5F"><a:alpha val="16000"/></a:srgbClr>'
        '</a:outerShdw></a:effectLst>'))


def rect(slide, x, y, w, h, fill, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE, shadow=False, radius=0.12):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    if shadow:
        _shadow(s)
    else:
        s.shadow.inherit = False
    return s


def _run(p, txt, size, color, bold=False, italic=False):
    r = p.add_run()
    r.text = txt
    r.font.size, r.font.bold, r.font.italic = Pt(size), bold, italic
    r.font.color.rgb, r.font.name = color, "Calibri"
    return r


def text(slide, x, y, w, h, content, size=18, color=TEXTO, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, fill=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    if fill is not None:
        box.fill.solid()
        box.fill.fore_color.rgb = fill
    for i, line in enumerate(content if isinstance(content, list) else [content]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        _run(p, line, size, color, bold)
    return box


def bullets(slide, x, y, w, h, items, size=19, gap=10, color=TEXTO):
    """Cada item e um paragrafo (permite animar bullet a bullet)."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        _run(p, "▪  ", size, AZUL2, True)
        _run(p, it, size, color)
    return box


def node(slide, x, y, w, h, label, sub=None, fill=BRANCO, color=AZUL, line=BORDA, size=15,
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, shadow=True, sub_color=None):
    s = rect(slide, x, y, w, h, fill, line, shape, shadow)
    tf = s.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Inches(0.08)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, label, size, color, True)
    if sub:
        for ln in sub.split("\n"):
            p2 = tf.add_paragraph()
            p2.alignment = PP_ALIGN.CENTER
            _run(p2, ln, max(size - 3, 9), sub_color or (CLARO if fill in (AZUL, CINZA, AZUL2, AZUL_ESC, VERMELHO) else CINZA))
    return s


def card(slide, x, y, w, h, title, body=None, accent=AZUL2, fill=BRANCO, size=15, title_color=None):
    """Cartao com faixa de cor a esquerda; devolve grupo (anima como um bloco)."""
    c = rect(slide, x, y, w, h, fill, BORDA, shadow=True, radius=0.06)
    tf = c.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left, tf.margin_right = Inches(0.28), Inches(0.15)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    _run(p, title, size + 1, title_color or accent, True)
    for ln in (body or []):
        pp = tf.add_paragraph()
        pp.alignment = PP_ALIGN.LEFT
        _run(pp, ln, size - 2, TEXTO)
    bar = rect(slide, x, y + 0.08, 0.09, h - 0.16, accent, shape=MSO_SHAPE.RECTANGLE)
    return slide.shapes.add_group_shape([c, bar])


def pill(slide, x, y, w, h, label, fill=CLARO, color=AZUL, size=13):
    s = rect(slide, x, y, w, h, fill, radius=0.5)
    tf = s.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Inches(0.05)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, label, size, color, True)
    return s


def circle(slide, x, y, d, label, fill=AZUL, color=BRANCO, size=18):
    s = rect(slide, x, y, d, d, fill, shape=MSO_SHAPE.OVAL, shadow=True)
    tf = s.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    _run(p, label, size, color, True)
    return s


def arrow(slide, x1, y1, x2, y2, color=AZUL2, width=2.25, both=False, dash=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    c.line.color.rgb = color
    c.line.width = Pt(width)
    ln = c.line._get_or_add_ln()
    if dash:
        etree.SubElement(ln, f"{{{A_NS}}}prstDash", {"val": "dash"})
    if both:
        etree.SubElement(ln, f"{{{A_NS}}}headEnd", {"type": "triangle", "w": "med", "len": "med"})
    etree.SubElement(ln, f"{{{A_NS}}}tailEnd", {"type": "triangle", "w": "med", "len": "med"})
    return c


def label(slide, x, y, w, content, color=CINZA, size=12, align=PP_ALIGN.CENTER, bold=False, fill=None):
    lines = content if isinstance(content, list) else [content]
    return text(slide, x, y, w, 0.3 * len(lines) + 0.05, lines, size=size, color=color, align=align,
                bold=bold, fill=fill)


def table(slide, x, y, w, rows, col_w, size=14, row_h=0.45, status_col=None):
    shp = slide.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w),
                                 Inches(row_h * len(rows)))
    tb = shp.table
    for ci, cw in enumerate(col_w):
        tb.columns[ci].width = Inches(cw)
    for ri in range(len(rows)):
        tb.rows[ri].height = Inches(row_h)
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = tb.cell(ri, ci)
            cell.text = val
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.margin_left = Inches(0.12)
            for r in cell.text_frame.paragraphs[0].runs:
                r.font.size, r.font.name = Pt(size), "Calibri"
                r.font.bold = ri == 0 or ci == 0
                r.font.color.rgb = BRANCO if ri == 0 else TEXTO
                if ri > 0 and ci == status_col:
                    r.font.color.rgb = AMBAR
                    r.font.bold = True
            cell.fill.solid()
            cell.fill.fore_color.rgb = AZUL if ri == 0 else (BRANCO if ri % 2 else CLARO)
    return shp


def group(slide, shapes):
    return slide.shapes.add_group_shape(list(shapes))


# ------------------------------------------------------------ slide + efeitos
def slide(title):
    global total_slides
    total_slides += 1
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = FUNDO
    rect(s, 0, 0, 13.333, 1.0, BRANCO, shape=MSO_SHAPE.RECTANGLE, shadow=True)
    rect(s, 0, 0, 0.2, 1.0, AZUL, shape=MSO_SHAPE.RECTANGLE)
    rect(s, 0.2, 0, 0.07, 1.0, AZUL2, shape=MSO_SHAPE.RECTANGLE)
    text(s, 0.65, 0.12, 9.8, 0.76, title, size=30, color=AZUL, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    s.shapes.add_picture(str(LOGO), Inches(10.95), Inches(0.2), height=Inches(0.6))
    rect(s, 0.65, 7.0, 12.03, 0.012, BORDA, shape=MSO_SHAPE.RECTANGLE)
    text(s, 0.65, 7.05, 8, 0.3, "UniPark  ·  Cancela Inteligente com ESP32  ·  Sistemas Embarcados",
         size=11, color=CINZA)
    PAGES.append((text(s, 11.6, 7.05, 1.08, 0.3, "", size=11, color=CINZA, align=PP_ALIGN.RIGHT), total_slides))
    return s


def notes(s, content):
    s.notes_slide.notes_text_frame.text = content


def transition(s, kind):
    inner = {"fade": '<p:fade/>', "push": '<p:push dir="l"/>'}[kind]
    s._element.append(parse_xml(f'<p:transition xmlns:p="{P_NS}" spd="med">{inner}</p:transition>'))


class _Ids:
    def __init__(self):
        self.n = 2

    def next(self):
        self.n += 1
        return self.n


# AUTO = True: o conteudo de cada slide aparece sozinho, em sequencia, sem cliques.
# AUTO = False: um clique por grupo (revela aos poucos enquanto fala).
AUTO = True
STEP_MS = 0  # pausa extra entre grupos no modo AUTO (cada grupo ja espera o anterior terminar)


def animate(s, clicks):
    """clicks: lista de cliques; cada clique = lista de alvos.
    Alvo = shape, ou (shape, indice_do_paragrafo) para animar um bullet. Efeito: fade."""
    ids = _Ids()
    bld = {}
    pars = []
    for ci, click in enumerate(clicks):
        effects = []
        for k, tgt in enumerate(click):
            shp, para = (tgt if isinstance(tgt, tuple) else (tgt, None))
            spid = shp.shape_id
            if para is None:
                spt = f'<p:spTgt spid="{spid}"/>'
            else:
                spt = f'<p:spTgt spid="{spid}"><p:txEl><p:pRg st="{para}" end="{para}"/></p:txEl></p:spTgt>'
            if shp.shape_type is not None and shp.has_text_frame and shp.shape_type != 6:
                bld[spid] = "p" if para is not None else "s"
            node_type = ("afterEffect" if AUTO else "clickEffect") if k == 0 else "withEffect"
            delay = 0 if k == 0 else 120 * k
            effects.append(
                f'<p:par><p:cTn id="{ids.next()}" presetID="10" presetClass="entr" presetSubtype="0" '
                f'fill="hold" grpId="0" nodeType="{node_type}"><p:stCondLst><p:cond delay="{delay}"/>'
                f'</p:stCondLst><p:childTnLst>'
                f'<p:set><p:cBhvr><p:cTn id="{ids.next()}" dur="1" fill="hold"><p:stCondLst>'
                f'<p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl>{spt}</p:tgtEl><p:attrNameLst>'
                f'<p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to>'
                f'<p:strVal val="visible"/></p:to></p:set>'
                f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{ids.next()}" dur="300"/>'
                f'<p:tgtEl>{spt}</p:tgtEl></p:cBhvr></p:animEffect>'
                f'</p:childTnLst></p:cTn></p:par>')
        if AUTO:
            pars.append(
                f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="{ci * STEP_MS}"/>'
                f'</p:stCondLst><p:childTnLst>{"".join(effects)}</p:childTnLst></p:cTn></p:par>')
        else:
            pars.append(
                f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
                f'</p:stCondLst><p:childTnLst><p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst>'
                f'<p:cond delay="0"/></p:stCondLst><p:childTnLst>{"".join(effects)}</p:childTnLst></p:cTn></p:par>'
                f'</p:childTnLst></p:cTn></p:par>')
    if AUTO:
        pars = [f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
                f'<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
                f'{"".join(pars)}</p:childTnLst></p:cTn></p:par>']
    bld_xml = "".join(
        f'<p:bldP spid="{sid}" grpId="0" build="p"/>' if kind == "p" else f'<p:bldP spid="{sid}" grpId="0" animBg="1"/>'
        for sid, kind in bld.items())
    xml = (
        f'<p:timing xmlns:p="{P_NS}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" '
        f'nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" '
        f'nodeType="mainSeq"><p:childTnLst>{"".join(pars)}</p:childTnLst></p:cTn><p:prevCondLst>'
        f'<p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst>'
        f'<p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
        f'</p:childTnLst></p:cTn></p:par></p:tnLst>'
        f'{"<p:bldLst>" + bld_xml + "</p:bldLst>" if bld_xml else ""}</p:timing>')
    s._element.append(parse_xml(xml))


def finish(s, kind="push"):
    """Transicao tem de vir antes do timing no XML do slide."""
    timing = s._element.find(f"{{{P_NS}}}timing")
    transition(s, kind)
    if timing is not None:
        s._element.remove(timing)
        s._element.append(timing)


# ----------------------------------------------------------- dados opcionais
EQUIPE = ""  # ex.: "Fulano, Ciclano e Beltrano · 20/11/2026" (aparece na capa se preenchido)
DECISOES = [  # (titulo, problema[], teste[], resultado[], decisao[]): um slide cada. Fonte: relatório de 12/11/2026
    ("Decisão 1: fim de curso na bancada",
     ["LED vermelho piscando: falhas do fim de curso.", "Hipótese: chave sem ligação mecânica com o servo."],
     ["Consulta à API: a chave era lida corretamente.", "Testes guiados de recuperação, abertura e fechamento."],
     ["A chave só mudava quando pressionada à mão.", "O servo estava solto na bancada."],
     ["Criado o ambiente bench: posição estimada por tempo.", "esp32dev mantido para a montagem com haste."]),
    ("Decisão 2: painel servido pelo ESP32",
     ["O painel não carregava no acesso direto ao ESP32."],
     ["Verificação das respostas HTTP dos arquivos gzip."],
     ["Cabeçalho Content-Encoding: gzip duplicado.", "Após a correção, 8/8 cenários de integração passaram."],
     ["Duplicação removida do servidor HTTP e gravada na placa."]),
]
_V = []  # campo vazio: nao aparece no slide
SEMANAS = [  # dict(titulo, objetivo[], avancos[], problema[], evidencia[], conclusao[], contrib[]). Fonte: git e relatorio de 12/11
    dict(titulo="Caderno de campo · semana de 06/11", objetivo=_V,
         avancos=["Estrutura do projeto criada", "Painel web (React) estruturado e refinado"], problema=_V,
         evidencia=["Histórico do git: 4 commits em 06/11"], conclusao=_V, contrib=_V),
    dict(titulo="Caderno de campo · semana de 12/11",
         objetivo=["Integrar o circuito físico ao projeto e testar com o ESP32 real"],
         avancos=["Bancada montada em protoboard", "Firmware e painel gravados na placa", "Ambiente bench criado"],
         problema=["Fim de curso sem ligação mecânica com o servo", "Painel não carregava: gzip duplicado"],
         evidencia=["27/27 testes de lógica", "5 ciclos na placa sem falhas", "8/8 cenários de integração"],
         conclusao=["Fixar haste e fim de curso", "Calibrar e medir alimentação", "Testar em celular físico"], contrib=_V),
    dict(titulo="Caderno de campo · semana de 13/11", objetivo=_V,
         avancos=["Firmware adaptado para o ESP32", "Documentação técnica, esquema elétrico e apresentação"],
         problema=_V, evidencia=["Histórico do git: commit de 13/11"], conclusao=_V, contrib=_V),
]
IA_LINHAS = [  # [["Area", "Ferramenta", "Como verificamos"], ...] (sem cabecalho)
    ["Apresentação e documentação técnica (PDF)", "Kiro", "Conferidas com o README, docs/ e o relatório de 12/11"],
    ["Correção de README e testes.md", "Kiro", "Contagem de testes conferida no código (27 casos)"],
]

# =========================================================== 1. CAPA
total_slides += 1
s = prs.slides.add_slide(BLANK)
s.background.fill.solid()
s.background.fill.fore_color.rgb = AZUL_ESC
rect(s, 8.2, -1.2, 7.5, 7.5, AZUL, shape=MSO_SHAPE.OVAL)
rect(s, 9.6, 3.6, 5.6, 5.6, RGBColor(0x03, 0x4E, 0xC2), shape=MSO_SHAPE.OVAL)
rect(s, 0, 0, 0.35, 7.5, AZUL2, shape=MSO_SHAPE.RECTANGLE)
logo_card = rect(s, 0.9, 1.0, 5.4, 1.75, BRANCO, shadow=True, radius=0.1)
s.shapes.add_picture(str(LOGO), Inches(1.1), Inches(1.15), width=Inches(5.0))
text(s, 0.9, 3.25, 9.5, 1.0, "Cancela Inteligente com ESP32", size=46, color=BRANCO, bold=True)
text(s, 0.9, 4.3, 8.5, 1.0,
     "Controle de entrada e saída de um estacionamento, com painel web servido pelo próprio ESP32",
     size=20, color=CLARO)
tags = [pill(s, 0.9 + i * 1.75, 5.5, 1.55, 0.42, t, fill=AZUL, color=BRANCO, size=13)
        for i, t in enumerate(["ESP32", "FC-51 ×2", "Servo SG90", "React + Vite"])]
text(s, 0.9, 6.45, 11, 0.4, "Sistemas Embarcados  ·  UNISINOS" + (f"  ·  {EQUIPE}" if EQUIPE else ""),
     size=14, color=CLARO)
notes(s, "Apresentar o grupo e o projeto em uma frase.")
finish(s, "fade")

# =========================================================== 2. OBJETIVO
s = slide("Agenda")
t = table(s, 0.65, 1.5, 12.03, [
    ["Bloco", "O que veremos"],
    ["1. O projeto", "Objetivo, requisitos e arquitetura"],
    ["2. Montagem", "Componentes, alimentação e dimensionamento elétrico"],
    ["3. Funcionamento", "Máquina de estados, estacionamento e painel web"],
    ["4. Operação e falhas", "Ciclo normal e tratamento de falhas"],
    ["5. Validação", "Testes, critérios mensuráveis e demonstração"],
    ["6. Fechamento", "Desafios, limitações e próximos passos"],
], [3.8, 8.23], size=18, row_h=0.7)
animate(s, [[t]])
finish(s)

# =========================================================== OBJETIVO
s = slide("Objetivo e visão geral")
b = bullets(s, 0.65, 1.5, 6.9, 5.2, [
    "Simular a entrada e a saída de veículos em um estacionamento de 5 vagas",
    "Carrinho Hot Wheels detectado por sensor infravermelho",
    "ESP32 abre a cancela (servo SG90 + palito) e confere se a passagem está livre",
    "Fecha confirmando a posição por um fim de curso",
    "Painel web React servido pelo próprio ESP32, via Wi-Fi, sem internet",
], size=20, gap=14)
c1 = card(s, 8.1, 1.55, 4.6, 1.4, "Decisão local", ["Sensores e estados não dependem do Wi-Fi"], AZUL2, size=17)
c2 = card(s, 8.1, 3.25, 4.6, 1.4, "Segurança primeiro", ["Obstáculo vence qualquer comando"], VERMELHO, size=17)
c3 = card(s, 8.1, 4.95, 4.6, 1.4, "Sem internet", ["Access Point próprio: 192.168.4.1"], VERDE, size=17)
animate(s, [[(b, i)] for i in range(5)] + [[c1], [c2], [c3]])
notes(s, "Enfatizar: o ESP32 decide sozinho; o Wi-Fi só monitora e envia pedidos.")
finish(s)

# =========================================================== 3. COMPONENTES
s = slide("Requisitos do projeto e onde são atendidos")
t = table(s, 0.65, 1.3, 12.03, [
    ["Requisito mínimo", "Como atendemos", "Slide"],
    ["ESP32 como elemento central", "GateController decide no próprio ESP32", "7"],
    ["Sensor e atuador relevantes", "FC-51 ×2 e fim de curso; servo SG90", "5"],
    ["Wi-Fi com finalidade definida", "Access Point + API REST: monitorar e comandar", "10"],
    ["Decisão pelo estado físico medido", "Obstáculo impede fechar; fechando, reabre", "8"],
    ["Estados, transições e comandos inválidos", "6 estados; 409 (estado) e 400 (parâmetro)", "8"],
    ["Alimentação, níveis e cargas", "Fonte 5 V para o servo, 3,3 V nos sensores, GND comum", "6"],
    ["Perda de comunicação + outra falha", "Wi-Fi (T04) e fim de curso (T05), com recuperação", "12"],
    ["≥ 3 critérios mensuráveis", "T01 a T06, com limites definidos", "13"],
], [4.4, 6.5, 1.13], size=15, row_h=0.52)
animate(s, [[t]])
finish(s)

# =========================================================== COMPONENTES
s = slide("Componentes e alimentação")
t = table(s, 0.65, 1.5, 6.3, [
    ["Função", "GPIO"],
    ["Sensor de chegada (FC-51)", "32"],
    ["Sensor de passagem (FC-51)", "33"],
    ["Servo SG90 (PWM)", "18"],
    ["LED verde", "16"],
    ["LED vermelho", "17"],
    ["Fim de curso (NO, pull-up)", "26"],
], [5.0, 1.3], size=15, row_h=0.55)
# diagrama de alimentacao
text(s, 7.5, 1.45, 5.2, 0.4, "Alimentação e níveis lógicos", size=17, color=AZUL, bold=True)
usb = node(s, 7.5, 1.95, 1.45, 0.85, "USB 5 V", size=14)
esp = node(s, 9.45, 1.95, 1.45, 0.85, "ESP32", fill=AZUL, color=BRANCO, size=15, line=None)
sen = node(s, 11.4, 1.95, 1.3, 0.85, "FC-51", "3,3 V", size=14)
a1 = arrow(s, 8.95, 2.38, 9.45, 2.38)
a2 = arrow(s, 10.9, 2.38, 11.4, 2.38)
fon = node(s, 7.5, 3.45, 2.2, 0.95, "Fonte 5 V ≥ 1 A", "+ cap. 470–1000 µF", size=14)
srv = node(s, 10.5, 3.45, 2.2, 0.95, "Servo SG90", "palito da cancela", size=14)
a3 = arrow(s, 9.7, 3.92, 10.5, 3.92)
gnd = node(s, 7.5, 4.85, 5.2, 0.5, "GND comum entre ESP32, sensores e fonte", fill=AZUL_ESC, color=BRANCO,
           size=13, line=None, shadow=False)
warn = card(s, 7.5, 5.6, 5.2, 0.95, "Atenção", ["FC-51 em 3,3 V, nunca 5 V (protege o GPIO)"], AMBAR,
            fill=AMBAR_CL, size=14)
animate(s, [[t], [usb, a1, esp, a2, sen], [fon, a3, srv], [gnd], [warn]])
notes(s, "Justificar fonte externa do servo: pico de corrente derruba o ESP32 (reinício) se vier da USB.")
finish(s)

# =========================================================== 4. ARQUITETURA
s = slide("Dimensionamento e decisões elétricas")
E = [
    ("USB alimenta o ESP32", ["Os dois FC-51 (≈ 20 mA cada)", "saem do pino 3V3 da placa."], AZUL2),
    ("Servo em 5 V externo ≥ 1 A", ["Pico do SG90 ≈ 0,7 A travado.", "USB de 500 mA não aguenta junto com Wi-Fi."], AZUL2),
    ("GND comum + capacitor", ["Sem GND comum o PWM não tem referência.", "470–1000 µF no servo contra quedas."], AZUL2),
    ("Níveis de sinal", ["FC-51 em 3,3 V: a saída nunca passa de 3,3 V.", "Em 5 V a saída danificaria o GPIO."], VERMELHO),
    ("LEDs com 220 Ω", ["Um resistor por LED: ≈ 6 mA a 3,3 V.", "Nada de servo em GPIO ou 3V3."], AZUL2),
    ("Fim de curso NO + pull-up", ["Fio rompido lê “não acionado”:", "vira FALHA, não falsa confirmação."], VERDE),
]
ec = []
for i, (tt_, body_, acc_) in enumerate(E):
    ec.append(card(s, 0.65 + (i % 3) * 4.07, 1.35 + (i // 3) * 2.5, 3.9, 2.3, tt_, body_, acc_, size=16))
warn = card(s, 0.65, 6.4, 12.03, 0.5, "GPIOs de boot (0, 2, 5, 12, 15) e de flash (6–11) evitados no projeto.",
            None, AZUL2, size=13)
animate(s, [[c] for c in ec] + [[warn]])
notes(s, "Cada decisão elétrica tem uma razão: corrente do servo, nível lógico dos sensores e falha segura do fim de curso.")
finish(s)

# =========================================================== ARQUITETURA
s = slide("Arquitetura do sistema")
text(s, 0.65, 1.2, 2.9, 0.35, "ENTRADAS", size=13, color=CINZA, bold=True, align=PP_ALIGN.CENTER)
text(s, 4.55, 1.2, 4.2, 0.35, "ESP32 (DUAL-CORE)", size=13, color=CINZA, bold=True, align=PP_ALIGN.CENTER)
text(s, 9.75, 1.2, 2.95, 0.35, "SAÍDAS", size=13, color=CINZA, bold=True, align=PP_ALIGN.CENTER)
ins = [node(s, 0.65, 1.7 + i * 1.5, 2.9, 1.1, t1, t2, size=15)
       for i, (t1, t2) in enumerate([("FC-51 chegada", "GPIO 32"), ("FC-51 passagem", "GPIO 33"),
                                      ("Fim de curso", "GPIO 26 · pull-up")])]
in_arrows = [arrow(s, 3.55, 2.25 + i * 1.5, 4.55, 2.25 + i * 1.5) for i in range(3)]
cont = rect(s, 4.55, 1.6, 4.2, 4.85, BRANCO, AZUL, shadow=True, radius=0.04)
cont.line.width = Pt(2)
hdr = node(s, 4.55, 1.6, 4.2, 0.45, "Núcleo 1 · loop de segurança", fill=AZUL, color=BRANCO, size=14,
           line=None, shadow=False, shape=MSO_SHAPE.RECTANGLE)
sm = node(s, 4.85, 2.2, 3.6, 0.7, "SensorManager", "filtros anti-ruído (60 ms)", fill=CLARO, size=14, shadow=False)
gc = node(s, 4.85, 3.15, 3.6, 0.7, "GateController", "máquina de estados", fill=CLARO, size=14, shadow=False)
sd = node(s, 4.85, 4.1, 3.6, 0.7, "ServoDriver", "PWM LEDC · LEDs", fill=CLARO, size=14, shadow=False)
d1 = arrow(s, 6.65, 2.92, 6.65, 3.13, width=1.75)
d2 = arrow(s, 6.65, 3.87, 6.65, 4.08, width=1.75)
web = node(s, 4.85, 5.1, 3.6, 1.0, "Núcleo 0 · WebServerManager", "API REST + LittleFS", fill=AZUL2,
           color=BRANCO, size=14, line=None, shadow=False)
core = group(s, [cont, hdr, sm, gc, sd, d1, d2, web])
outs = [node(s, 9.75, 1.7, 2.95, 1.1, "Servo SG90 + palito", "GPIO 18 · 5 V externo", size=15),
        node(s, 9.75, 3.2, 2.95, 1.1, "LEDs verde/vermelho", "GPIO 16 / 17", size=15),
        node(s, 9.75, 4.7, 2.95, 1.1, "Painel UniPark", "celular via Wi-Fi (AP)", size=15)]
o1 = arrow(s, 8.75, 2.25, 9.75, 2.25)
o2 = arrow(s, 8.75, 3.75, 9.75, 3.75)
o3 = arrow(s, 8.75, 5.25, 9.75, 5.25, both=True)
foot = text(s, 0.65, 6.55, 12, 0.4,
            "Um cliente Wi-Fi lento só atrasa a tarefa web (núcleo 0): sensores e servo continuam no núcleo 1.",
            size=14, color=CINZA)
animate(s, [[ins[0], in_arrows[0], ins[1], in_arrows[1], ins[2], in_arrows[2]], [core],
            [outs[0], o1, outs[1], o2, outs[2], o3], [foot]])
notes(s, "A concorrência é o ponto técnico forte: HTTP e controle em núcleos diferentes.")
finish(s)

# =========================================================== 5. MAQUINA DE ESTADOS
s = slide("Máquina de estados")
W, H = 2.3, 1.0
n_init = node(s, 0.5, 1.9, W, H, "INICIALIZANDO", fill=CINZA, color=BRANCO, line=None, size=15)
n_fech = node(s, 3.5, 1.9, W, H, "FECHADA", "LED vermelho fixo", size=17)
n_abri = node(s, 6.6, 1.9, W, H, "ABRINDO", "servo → ângulo aberto", size=17)
n_aber = node(s, 9.7, 1.9, W, H, "ABERTA", "LED verde aceso", size=17, fill=VERDE_CL, line=VERDE, color=VERDE)
n_fcha = node(s, 6.6, 4.4, W, H, "FECHANDO", "LED vermelho pisca", size=17)
n_fal = node(s, 3.5, 4.4, W, H, "FALHA", "LED pisca rápido", size=17, fill=VERMELHO, color=BRANCO, line=None,
             sub_color=BRANCO)
t1 = [arrow(s, 2.8, 2.4, 3.5, 2.4), label(s, 2.15, 1.45, 2.0, "fim de curso acionado", size=11)]
t2 = [arrow(s, 5.8, 2.4, 6.6, 2.4), label(s, 5.0, 1.45, 2.4, "chegada / abrir", size=11)]
t3 = [arrow(s, 8.9, 2.4, 9.7, 2.4), label(s, 8.1, 1.45, 2.4, "tempo (estimado)", size=11)]
t4 = [arrow(s, 10.85, 2.9, 8.9, 4.7), label(s, 10.2, 3.55, 2.6, ["passagem livre 3 s", "(modo auto)"], size=11)]
t5 = [arrow(s, 7.1, 4.4, 5.3, 2.9), label(s, 4.45, 3.35, 1.55, ["fim de curso", "confirma"], size=11,
                                          color=VERDE, bold=True)]
t6 = [arrow(s, 7.75, 4.4, 7.75, 2.9, color=AMBAR),
      label(s, 7.85, 3.15, 1.6, ["obstáculo", "→ reabre"], size=11, color=AMBAR, bold=True)]
t7 = [arrow(s, 6.6, 4.9, 5.8, 4.9, color=VERMELHO),
      label(s, 4.9, 5.5, 3.6, "sem confirmação em ≈ 3 s", size=11, color=VERMELHO, bold=True)]
t8 = [arrow(s, 4.2, 4.4, 4.2, 2.9, color=VERDE, dash=True),
      label(s, 2.3, 3.4, 1.8, ["reset-fault", "(recuperação)"], size=11, color=VERDE, bold=True,
            align=PP_ALIGN.RIGHT)]
r1 = card(s, 0.65, 6.0, 3.9, 0.8, "Obstáculo vence qualquer comando", None, AMBAR, size=13)
r2 = card(s, 4.72, 6.0, 3.9, 0.8, "Inválido para o estado: 409 · parâmetro: 400", None, AZUL2, size=13)
r3 = card(s, 8.79, 6.0, 3.9, 0.8, "Sai de FALHA só com reset-fault", None, VERMELHO, size=13)
animate(s, [[n_init, *t1, n_fech], [*t2, n_abri, *t3, n_aber], [n_fcha, *t4, *t5, *t6],
            [n_fal, *t7, *t8], [r1, r2, r3]])
notes(s, "Percorrer o ciclo normal (verde) e depois os desvios: obstáculo (âmbar) e falha (vermelho). "
         "Diagrama completo em docs/maquina_estados.md.")
finish(s)

# =========================================================== 6. ESTACIONAMENTO
s = slide("Estacionamento: vagas, entrada e saída")
xs = [0.65, 3.15, 5.65, 8.15, 10.65]
f1 = node(s, xs[0], 1.6, 2.0, 1.1, "Carro chega", "sensor de chegada", size=15)
f2 = node(s, xs[1], 1.6, 2.0, 1.1, "Vaga livre?", fill=CLARO, size=15, shape=MSO_SHAPE.DIAMOND, shadow=False)
f3 = node(s, xs[2], 1.6, 2.0, 1.1, "Cancela abre", "autorização de ENTRADA", size=15)
f4 = node(s, xs[3], 1.6, 2.0, 1.1, "Carro cruza", "sensor de passagem", size=15)
f5 = node(s, xs[4], 1.6, 2.0, 1.1, "Vagas livres −1", "contagem só aqui", size=15, fill=VERDE_CL, line=VERDE,
          color=VERDE)
fa = [arrow(s, 2.65, 2.15, 3.15, 2.15), arrow(s, 5.15, 2.15, 5.65, 2.15), arrow(s, 7.65, 2.15, 8.15, 2.15),
      arrow(s, 10.15, 2.15, 10.65, 2.15)]
fl_sim = label(s, 4.95, 1.75, 0.8, "sim", size=12, color=VERDE, bold=True)
lot = node(s, xs[1], 3.55, 2.0, 1.0, "Lotado", "não abre · evento registrado", fill=VERM_CL, line=VERMELHO,
           color=VERMELHO, size=15)
exp = node(s, xs[3], 3.55, 2.0, 1.0, "Não cruzou", "autorização expira, nada é contado", fill=AMBAR_CL, line=AMBAR,
           color=AMBAR, size=15)
la = arrow(s, 4.15, 2.7, 4.15, 3.55, color=VERMELHO)
ll = label(s, 4.25, 2.95, 0.8, "não", size=12, color=VERMELHO, bold=True)
ea = arrow(s, 9.15, 2.7, 9.15, 3.55, color=AMBAR, dash=True)
el = label(s, 9.25, 2.95, 1.6, "sem passagem", size=12, color=AMBAR, bold=True, align=PP_ALIGN.LEFT)
cap = text(s, 0.65, 3.55, 2.3, 1.0, ["Fluxo de ENTRADA", "(modo automático)"], size=14, color=AZUL,
           bold=True, anchor=MSO_ANCHOR.MIDDLE)
k1 = card(s, 0.65, 4.95, 3.9, 1.75, "Operador pelo painel",
          ["LIBERAR ENTRADA (exige vaga)", "LIBERAR SAÍDA (exige veículo dentro)", "AJUSTAR OCUPAÇÃO"],
          AZUL2, size=15)
k2 = card(s, 4.72, 4.95, 3.9, 1.75, "Regras de contagem",
          ["5 vagas (PARKING_CAPACITY)", "Só 1 autorização pendente", "Reinício volta a 0 ocupadas"],
          VERDE, size=15)
k3 = card(s, 8.79, 4.95, 3.9, 1.75, "Limitação", ["Um sensor de passagem não",
                                                  "distingue direção nem se é carro.", "A direção vem da autorização."],
          AMBAR, fill=AMBAR_CL, size=15)
animate(s, [[cap, f1, fa[0], f2], [fl_sim, fa[1], f3], [fa[2], f4, fa[3], f5], [la, ll, lot], [ea, el, exp],
            [k1], [k2], [k3]])
notes(s, "Destacar: a vaga só é contada quando o carro cruza o sensor de passagem, não no comando.")
finish(s)

# =========================================================== 7. PAINEL
s = slide("Painel web UniPark")
p1 = node(s, 0.65, 1.7, 3.1, 1.3, "Celular / PC", "navegador", size=17)
p2 = node(s, 5.1, 1.7, 3.1, 1.3, "Wi-Fi do ESP32", "rede Cancela-ESP32 · 192.168.4.1", size=17, fill=CLARO,
          shadow=False)
p3 = node(s, 9.55, 1.7, 3.1, 1.3, "ESP32", "LittleFS (≈ 84 KB gz) + API REST", size=17, fill=AZUL, color=BRANCO,
          line=None)
pa = [arrow(s, 3.75, 2.35, 5.1, 2.35, both=True), arrow(s, 8.2, 2.35, 9.55, 2.35, both=True)]
text(s, 0.65, 3.45, 6, 0.4, "PÁGINAS", size=13, color=CINZA, bold=True)
chips = [pill(s, 0.65 + i * 2.43, 3.9, 2.25, 0.5, t, size=14)
         for i, t in enumerate(["Painel", "Estacionamento", "Cancela", "Eventos", "Desempenho"])]
text(s, 0.65, 4.7, 6, 0.4, "TECNOLOGIA", size=13, color=CINZA, bold=True)
tech = [pill(s, 0.65 + i * 2.43, 5.15, 2.25, 0.5, t, fill=BRANCO, color=AZUL, size=14)
        for i, t in enumerate(["React 19", "TypeScript", "Tailwind 4", "Vite 8"])]
for tp in tech:
    tp.line.color.rgb = AZUL2
    tp.line.width = Pt(1.25)
sim = card(s, 0.65, 5.95, 12.03, 0.85, "Simulador do ESP32 (npm run dev)",
           ["Mesma API, sem hardware. Cópia em JS da lógica: não prova o firmware e nunca entra no build gravado."],
           AMBAR, fill=AMBAR_CL, size=15)
animate(s, [[p1, pa[0], p2, pa[1], p3], chips, tech, [sim]])
notes(s, "Se possível, demonstrar o painel ao vivo ou o simulador (carro chega → cruza a passagem → vagas 5→4). "
         "Botões do painel só pedem; a máquina de estados decide (200/400/409).")
finish(s)

# =========================================================== 8. OPERACAO NORMAL
s = slide("Operação normal: ciclo completo")
steps = [("Carro chega", "sensor estável por 60 ms"), ("Abre", "ABRINDO → ABERTA, LED verde"),
         ("Passagem", "cruza o sensor, vaga −1"), ("Livre 3 s", "sem obstáculo no feixe"),
         ("Fecha", "fim de curso confirma")]
rect(s, 1.3, 2.43, 10.7, 0.06, BORDA, shape=MSO_SHAPE.RECTANGLE)
cols = []
for i, (t1, t2) in enumerate(steps):
    cx = 0.65 + i * 2.445
    c = circle(s, cx + 0.65, 1.95, 0.95, str(i + 1), fill=AZUL if i < 4 else VERDE, size=26)
    k = card(s, cx, 3.25, 2.25, 1.4, t1, [t2], AZUL2 if i < 4 else VERDE, size=16)
    cols.append([c, k])
m1 = card(s, 0.65, 5.2, 5.9, 1.5, "Modo automático", ["Tudo acima acontece sozinho,", "sem comando do painel."], AZUL2,
          size=16)
m2 = card(s, 6.78, 5.2, 5.9, 1.5, "Modo manual", ["Não abre na chegada nem fecha sozinha.",
                                                   "Mantém todas as proteções."], AMBAR, fill=AMBAR_CL, size=16)
animate(s, cols + [[m1, m2]])
notes(s, "Demonstração ao vivo (2 min): conectar o celular, aproximar o carrinho, passar, fechar.")
finish(s)

# =========================================================== 9. FALHAS
s = slide("Falhas tratadas")
h1 = node(s, 0.65, 1.3, 5.85, 0.6, "Falha 1 · perda de comunicação Wi-Fi", fill=AZUL, color=BRANCO, size=17,
          line=None)
a_1 = node(s, 0.9, 2.2, 5.35, 0.95, "Celular desconecta", "o laço de sensores e estados não depende do HTTP", size=15)
a_2 = node(s, 0.9, 3.55, 5.35, 0.95, "Cancela segue sozinha", "abre, protege e fecha; nenhum comando é guardado",
           size=15, fill=VERDE_CL, line=VERDE, color=VERDE)
a_3 = node(s, 0.9, 4.9, 5.35, 0.95, "Reconecta", "o painel volta a atualizar sozinho (AP checado a cada 5 s)", size=15)
aa = [arrow(s, 3.575, 3.15, 3.575, 3.55), arrow(s, 3.575, 4.5, 3.575, 4.9)]
h2 = node(s, 6.83, 1.3, 5.85, 0.6, "Falha 2 · fim de curso não confirma", fill=VERMELHO, color=BRANCO, size=17,
          line=None)
b_1 = node(s, 7.08, 2.2, 5.35, 0.8, "Servo fecha, chave não aciona", "FIM_CURSO_TIMEOUT em ≈ 3000 ms", size=15)
b_2 = node(s, 7.08, 3.4, 5.35, 0.8, "FALHA", "abrir/fechar recusados (409) · LED pisca rápido", size=15,
           fill=VERM_CL, line=VERMELHO, color=VERMELHO)
b_3 = node(s, 7.08, 4.6, 5.35, 0.8, "Corrigir a causa + reset-fault", "uma única tentativa de recuperação", size=15)
b_4 = node(s, 7.08, 5.8, 5.35, 0.65, "FECHADA", fill=VERDE_CL, line=VERDE, color=VERDE, size=15)
bb = [arrow(s, 9.755, 3.0, 9.755, 3.4), arrow(s, 9.755, 4.2, 9.755, 4.6), arrow(s, 9.755, 5.4, 9.755, 5.8)]
animate(s, [[h1], [a_1], [aa[0], a_2], [aa[1], a_3], [h2], [b_1], [bb[0], b_2], [bb[1], b_3], [bb[2], b_4]])
notes(s, "Para demonstrar a falha 2 use o ambiente faultsim (POST /api/sim/limit?masked=1), sem danificar nada. "
         "Também detectados: FIM_CURSO_PRESO e FIM_CURSO_PERDIDO.")
finish(s)

# =========================================================== 10. TESTES
s = slide("Testes e critérios mensuráveis")
kp = [card(s, 0.65, 1.3, 3.9, 1.15, "27 / 27", ["testes de lógica no PC"], VERDE, size=22, title_color=VERDE),
      card(s, 4.72, 1.3, 3.9, 1.15, "5 ciclos", ["automáticos na placa, sem falhas"], VERDE, size=22, title_color=VERDE),
      card(s, 8.79, 1.3, 3.9, 1.15, "8 / 8", ["cenários de integração com a API real"], VERDE, size=22, title_color=VERDE)]
tt = table(s, 0.65, 2.75, 12.03, [
    ["ID", "Critério", "Como medimos"],
    ["T01", "Abertura iniciada ≤ 500 ms após a detecção (20 medições)", "Tempo medido pelo firmware (painel)"],
    ["T02", "20/20 tentativas de fechar com obstáculo bloqueadas", "Contadores do firmware"],
    ["T03", "≥ 19/20 comandos Wi-Fi válidos em ≤ 1 s", "Script t03_comunicacao.ps1"],
    ["T04", "Proteções locais continuam sem cliente Wi-Fi", "Celular desconectado"],
    ["T05", "Falha do fim de curso detectada no timeout (≈ 3000 ms)", "lastFaultDetectMs (painel)"],
    ["T06", "Recuperação volta a operação segura (FECHADA)", "POST /api/reset-fault"],
], [0.9, 6.7, 4.43], size=15, row_h=0.56)
animate(s, [[kp[0]], [kp[1]], [kp[2]], [tt]])
finish(s)

# =========================================================== 11. DESAFIOS
s = slide("Como testamos: exemplo do T02")
FT = [
    ("Requisito", ["Não fechar sobre um objeto na passagem."], AZUL2),
    ("Condições", ["Modo automático, cancela ABERTA,", "objeto no feixe do sensor de passagem."], AZUL2),
    ("Procedimento", ["20 tentativas de FECHAR CANCELA com o objeto", "no feixe; anotar se a resposta foi 409."], AZUL2),
    ("Critério de aceitação", ["20/20 bloqueadas e", "closeStartedWithObstacle = 0."], VERDE),
]
fc = []
for i, (tt_, body_, acc_) in enumerate(FT):
    fc.append(card(s, 0.65 + (i % 2) * 6.13, 1.4 + (i // 2) * 2.7, 5.9, 2.4, tt_, body_, acc_, size=18))
animate(s, [[fc[0], fc[1]], [fc[2]], [fc[3]]])
finish(s)

s = slide("Demonstração")
D1 = card(s, 0.65, 1.4, 3.9, 5.1, "1. Operação completa",
          ["Conectar o celular à Cancela-ESP32", "Carrinho chega: a cancela abre", "Cruza a passagem: vagas 5 → 4",
           "Fecha e o fim de curso confirma"], AZUL2, size=18)
D2 = card(s, 4.72, 1.4, 3.9, 5.1, "2. Resposta a falha",
          ["T04: desconectar o celular; a cancela segue sozinha", "T05: fim de curso sem confirmar",
           "FALHA em ≈ 3 s; comandos recusados (409)", "RECUPERAR FALHA → FECHADA"], VERMELHO, size=18)
D3 = card(s, 8.79, 1.4, 3.9, 5.1, "3. Medição quantitativa",
          ["T01: tempo de resposta (painel, Desempenho)", "Critério: ≤ 500 ms em 20 medições",
           "T05: tempo até FALHA ≈ 3000 ms"], VERDE, size=18)
animate(s, [[D1], [D2], [D3]])
notes(s, "Para a falha 2, usar o ambiente faultsim (POST /api/sim/limit?masked=1): não danifica nada.")
finish(s)

s = slide("Desafios técnicos e limitações")
d1_h = node(s, 0.65, 1.3, 5.85, 0.6, "Desafio 1 · calibrar os sensores", fill=AZUL, color=BRANCO, size=17, line=None)
d1_b = bullets(s, 0.75, 2.05, 5.7, 2.3, [
    "FC-51 sofre com luz ambiente, cor e brilho do carrinho",
    "Ajuste do potenciômetro e do filtro de debounce",
], size=17, gap=8)
d2_h = node(s, 6.83, 1.3, 5.85, 0.6, "Desafio 2 · segurança do movimento", fill=AZUL, color=BRANCO, size=17,
            line=None)
d2_b = bullets(s, 6.93, 2.05, 5.7, 2.3, [
    "Obstáculo, timeout de posição e validação do fim de curso",
    "Alimentação do servo: fonte externa + capacitor",
], size=17, gap=8)
text(s, 0.65, 4.4, 6, 0.4, "LIMITAÇÕES CONHECIDAS", size=13, color=CINZA, bold=True)
l1 = card(s, 0.65, 4.85, 3.9, 1.85, "Abertura estimada", ["Só um fim de curso (fechada):", "a abertura é por tempo."],
          AMBAR, fill=AMBAR_CL, size=15)
l2 = card(s, 4.72, 4.85, 3.9, 1.85, "Sem autenticação", ["Segurança depende da senha", "do Wi-Fi (WPA2). Uso didático."],
          AMBAR, fill=AMBAR_CL, size=15)
l3 = card(s, 8.79, 4.85, 3.9, 1.85, "Sem persistência", ["Contagem de vagas e log", "zeram ao reiniciar o ESP32."],
          AMBAR, fill=AMBAR_CL, size=15)
animate(s, [[d1_h, d1_b], [d2_h, d2_b], [l1], [l2], [l3]])
finish(s)

# =========================================================== 12. CONCLUSAO
def decisao(titulo, problema, teste, resultado, dec):
    s_ = slide(titulo)
    cols_ = [("Problema / hipótese", problema, AZUL2), ("Teste", teste, AZUL2), ("Resultado", resultado, AMBAR),
             ("Decisão", dec, VERDE)]
    cs_, ar_ = [], []
    for i, (t_, b_, a_) in enumerate(cols_):
        cs_.append(card(s_, 0.65 + i * 3.08, 1.5, 2.8, 4.2, t_, b_, a_, size=16))
        if i < 3:
            ar_.append(arrow(s_, 3.45 + i * 3.08, 3.6, 3.73 + i * 3.08, 3.6))
    animate(s_, [[cs_[0]], [ar_[0], cs_[1]], [ar_[1], cs_[2]], [ar_[2], cs_[3]]])
    finish(s_)


def semana(d):
    s_ = slide(d["titulo"])
    campos = [("Objetivo da semana", d["objetivo"], AZUL2), ("Avanços", d["avancos"], VERDE),
              ("Problema ou decisão técnica", d["problema"], AMBAR), ("Teste e evidência", d["evidencia"], AZUL2),
              ("Conclusão e próximo passo", d["conclusao"], AZUL2),
              ("Contribuições individuais", d["contrib"], AZUL2)]
    campos = [c for c in campos if c[1]]  # campos sem conteudo nao aparecem
    n_ = len(campos)
    cols_n = min(n_, 3)
    rows_n = -(-n_ // cols_n)
    w_ = (12.03 - 0.17 * (cols_n - 1)) / cols_n
    h_ = 2.5 if rows_n > 1 else 4.2
    cs_ = []
    for i, (t_, b_, a_) in enumerate(campos):
        cs_.append(card(s_, 0.65 + (i % cols_n) * (w_ + 0.17), 1.3 + (i // cols_n) * 2.65, w_, h_, t_, b_, a_, size=16))
    animate(s_, [[c] for c in cs_])
    finish(s_)


for d_ in DECISOES:
    decisao(*d_)
for d_ in SEMANAS:
    semana(d_)
if IA_LINHAS:
    s = slide("Uso de inteligência artificial")
    t = table(s, 0.65, 1.5, 12.03, [["Área", "Ferramenta de IA", "Como verificamos"]] + IA_LINHAS,
              [3.6, 3.0, 5.43], size=16, row_h=0.6)
    animate(s, [[t]])
    finish(s)

s = slide("Conclusão e melhorias")
text(s, 0.65, 1.25, 6, 0.4, "ENTREGUE", size=13, color=CINZA, bold=True)
c_a = card(s, 0.65, 1.7, 5.85, 0.95, "ESP32 decide localmente", ["Wi-Fi só monitora e envia pedidos."], VERDE, size=15)
c_b = card(s, 0.65, 2.85, 5.85, 0.95, "Protótipo montado e testado na bancada", ["Sensores, servo e LEDs respondem; painel na placa real."],
           VERDE, size=15)
c_c = card(s, 0.65, 4.0, 5.85, 0.95, "27/27 testes de lógica passam", ["Executados no PC (pio test -e native)."],
           VERDE, size=15)
c_d = card(s, 0.65, 5.15, 5.85, 0.95, "7 programas de teste de hardware", ["Um para cada sensor, atuador e o Wi-Fi."],
           VERDE, size=15)
text(s, 6.83, 1.25, 6, 0.4, "PRÓXIMOS PASSOS", size=13, color=CINZA, bold=True)
m_a = card(s, 6.83, 1.7, 5.85, 0.95, "Haste e fim de curso", ["Fixar para confirmar a posição fechada (esp32dev)."], AZUL2, size=15)
m_b = card(s, 6.83, 2.85, 5.85, 0.95, "Calibração e medições", ["Ângulos, tempos, alimentação e GND comum."],
           AZUL2, size=15)
m_c = card(s, 6.83, 4.0, 5.85, 0.95, "Sensor de passagem direcional", ["Dois feixes para saber entrada ou saída."],
           AZUL2, size=15)
m_d = card(s, 6.83, 5.15, 5.85, 0.95, "Persistência e autenticação", ["Contagem de vagas após reiniciar; senha nos comandos."], AZUL2, size=15)
thanks = node(s, 0.65, 6.3, 12.03, 0.6, "Obrigado!  Perguntas?", fill=AZUL, color=BRANCO, size=20, line=None)
animate(s, [[c_a, c_b, c_c, c_d], [m_a, m_b, m_c, m_d], [thanks]])
finish(s, "fade")

for box_, n_ in PAGES:
    box_.text_frame.paragraphs[0].runs[0].text = f"{n_} / {total_slides}"

prs.save(OUT)
print("Gerado:", OUT, f"({total_slides} slides)")






