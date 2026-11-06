"""Gera logos do UniPark com fundo transparente a partir de ../../unipark.png (fundo branco).
Uso: python scripts/prepare_logo.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

SRC = Path(__file__).resolve().parents[3] / "unipark.png"
OUT = Path(__file__).resolve().parents[1] / "public"
img = Image.open(SRC).convert("RGB")
a = np.asarray(img).astype(np.float32)
print("cor escura  (U):", img.getpixel((700, 450)), " cor clara (P):", img.getpixel((1100, 450)))

# 1) fundo = regiao quase branca CONECTADA as bordas (o branco interno do carro/U permanece)
from scipy import ndimage
white = a.min(axis=2) >= 232
lab, _ = ndimage.label(white)
bg = lab == lab[0, 0]

# 2) borda suavizada: perto do fundo, alpha vem da "quantidade de tinta" e a cor e recuperada
ring = Image.fromarray((bg * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(5))
ring = (np.asarray(ring) > 0) & ~bg
alpha = np.where(bg, 0.0, 1.0)
mn = a.min(axis=2)
edge_a = np.clip((255 - mn) / 245.0, 0.02, 1.0)
alpha = np.where(ring, edge_a, alpha)
rgb = a.copy()
safe = np.maximum(alpha, 0.02)[..., None]
rgb = np.where(ring[..., None], np.clip((a - 255 * (1 - safe)) / safe, 0, 255), a)
out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
full = Image.fromarray(out, "RGBA")

def save(im, name, width):
    bbox = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bbox)
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    p = OUT / name
    # paleta reduzida: o logo tem poucas cores (menor no flash do ESP32)
    q = im.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(p, optimize=True)
    print(name, im.size, p.stat().st_size // 1024, "KB")
    return im

save(full, "unipark-logo.png", 720)
mark = full.crop((70, 170, 650, 705))          # simbolo (U + carro + pista), sem o texto
save(mark, "unipark-mark.png", 240)
fav = full.crop((140, 180, 575, 695))          # so o quadrado arredondado, para favicon
fav = save(fav, "favicon.png", 96)
