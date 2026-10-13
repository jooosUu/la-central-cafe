"""Genera ae/lacentral_logo.jsx: construye el logo animado en After Effects
con capas de forma (sin depender de fuentes instaladas)."""
import json, sys
from pathlib import Path
import fitz
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

ROOT = Path(__file__).resolve().parent.parent
AI = ROOT / 'la central - logo oficial _Carpeta' / 'la central - logo oficial .ai'
FONTS = ROOT / 'motion' / 'fonts'
OUT = ROOT / 'ae' / 'lacentral_logo.jsx'

# PDF (500x500) -> comp 1080x1080
K, CX, CY = 2.2, 261.5, 249.0
def M(x, y): return ((x - CX) * K + 540, (y - CY) * K + 540)


def contours_from_segments(segs):
    """segs: lista de ('l',A,B) | ('c',A,c1,c2,B) en coords comp. -> contornos AE."""
    out, cur, last = [], None, None
    def close():
        if cur and len(cur['v']) > 1:
            # si el último punto coincide con el primero, se fusiona
            v0, vl = cur['v'][0], cur['v'][-1]
            if abs(v0[0] - vl[0]) < .05 and abs(v0[1] - vl[1]) < .05:
                cur['i'][0] = cur['i'][-1]
                for k in 'vio': cur[k].pop()
            out.append(cur)
    for s in segs:
        A = s[1]
        if last is None or abs(last[0] - A[0]) > .05 or abs(last[1] - A[1]) > .05:
            close()
            cur = {'v': [A], 'i': [(0, 0)], 'o': [(0, 0)]}
        B = s[-1]
        if s[0] == 'c':
            c1, c2 = s[2], s[3]
            cur['o'][-1] = (c1[0] - A[0], c1[1] - A[1])
            cur['v'].append(B); cur['i'].append((c2[0] - B[0], c2[1] - B[1])); cur['o'].append((0, 0))
        else:
            cur['v'].append(B); cur['i'].append((0, 0)); cur['o'].append((0, 0))
        last = B
    close()
    return out


def pdf_shapes():
    page = fitz.open(AI)[0]
    res = []
    for dr in page.get_drawings():
        segs = []
        for it in dr['items']:
            if it[0] == 'l': segs.append(('l', M(*it[1]), M(*it[2])))
            elif it[0] == 'c': segs.append(('c', *[M(*p) for p in it[1:5]]))
            else: raise ValueError(it[0])
        res.append(contours_from_segments(segs))
    return res  # [vapor centro, vapor der, vapor izq, taza]


class SegPen(BasePen):
    def __init__(self, gs, ox, oy, size):
        super().__init__(gs); self.segs = []; self.p0 = None; self.start = None
        self.T = lambda p: M(ox + p[0] * size / 1000, oy - p[1] * size / 1000)
    def _moveTo(self, p): self.p0 = self.start = p
    def _lineTo(self, p): self.segs.append(('l', self.T(self.p0), self.T(p))); self.p0 = p
    def _curveToOne(self, a, b, c):
        self.segs.append(('c', self.T(self.p0), self.T(a), self.T(b), self.T(c))); self.p0 = c
    def _qCurveToOne(self, q, p):
        p0 = self.p0
        c1 = (p0[0] + 2 / 3 * (q[0] - p0[0]), p0[1] + 2 / 3 * (q[1] - p0[1]))
        c2 = (p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1]))
        self._curveToOne(c1, c2, p)
    def _closePath(self):
        if self.p0 != self.start: self._lineTo(self.start)


def glyph(font, ch, ox, oy, size):
    f = TTFont(FONTS / font)
    gs = f.getGlyphSet()
    name = f.getBestCmap()[ord(ch)]
    pen = SegPen(gs, ox, oy, size)
    gs[name].draw(pen)
    return contours_from_segments(pen.segs)


def bbox(cs):
    xs = [v[0] for c in cs for v in c['v']]; ys = [v[1] for c in cs for v in c['v']]
    return min(xs), min(ys), max(xs), max(ys)


def layer(name, contours, pivot=None):
    x0, y0, x1, y1 = bbox(contours)
    px, py = pivot or ((x0 + x1) / 2, y1)  # por defecto: centro-abajo
    r = lambda p: [round(p[0] - px, 3), round(p[1] - py, 3)]
    rt = lambda p: [round(p[0], 3), round(p[1], 3)]
    return {'name': name, 'pos': [round(px, 2), round(py, 2)],
            'paths': [{'v': [r(v) for v in c['v']], 'i': [rt(t) for t in c['i']], 'o': [rt(t) for t in c['o']]} for c in contours]}


s_mid, s_right, s_left, cup = pdf_shapes()
L = {'steam': [layer('Vapor 1', s_left), layer('Vapor 2', s_mid), layer('Vapor 3', s_right)]}
cx0, cy0, cx1, cy1 = bbox(cup)
L['cup'] = layer('Taza', cup, pivot=(M(237.6, 0)[0], cy1))

base = 393.5
cafe = []
for ch, x in [('c', 128.1), ('a', 185.9), ('f', 255.1)]:
    cafe.append(layer('café - ' + ch, glyph('Utendo-ExtraBold.ttf', ch, x, base, 107.56)))
e = glyph('Utendo-ExtraBold.ttf', 'é', 300.0, base, 107.56)
acc_y = min(bbox([c])[3] for c in e)          # el contorno que termina más arriba es la tilde
acc = [c for c in e if bbox([c])[3] == acc_y]
body = [c for c in e if bbox([c])[3] != acc_y]
cafe.append(layer('café - e', body))
L['cafe'] = cafe
ax0, ay0, ax1, ay1 = bbox(acc)
L['accent'] = layer('café - tilde', acc, pivot=((ax0 + ax1) / 2, ay1))
L['lacentral'] = [layer('la central - ' + ch, glyph('Utendo-Medium.ttf', ch, x, 331.3, 22.04))
                  for ch, x in [('l', 139.6), ('a', 146.5), ('c', 169.0), ('e', 182.6), ('n', 197.8),
                                ('t', 212.1), ('r', 222.2), ('a', 231.3), ('l', 247.0)]]
rg = glyph('Geist-VariableFont_wght.ttf', '®', 364.7, base, 25.76)
gx0, gy0, gx1, gy1 = bbox(rg)
L['reg'] = layer('®', rg, pivot=((gx0 + gx1) / 2, (gy0 + gy1) / 2))


# ---------- palabras de la intro (coords de comp, centradas en 540,540) ----------
def word_layer(text, font='Utendo-ExtraBold.ttf', max_w=900, max_size=230):
    f = TTFont(FONTS / font); gs = f.getGlyphSet(); cmap = f.getBestCmap(); hm = f['hmtx']
    adv = sum(hm[cmap[ord(c)]][0] for c in text)
    size = min(max_size, max_w / adv * 1000)
    sc = size / 1000
    x = 540 - adv * sc / 2
    base = 540 + 0.36 * size            # centra ópticamente la altura x
    segs_all = []
    for c in text:
        g = cmap[ord(c)]
        pen = SegPen(gs, 0, 0, 1)
        pen.T = (lambda ox: (lambda p: (ox + p[0] * sc, base - p[1] * sc)))(x)
        gs[g].draw(pen)
        segs_all += contours_from_segments(pen.segs)
        x += hm[g][0] * sc
    lay = layer(text, segs_all, pivot=(540, base))
    lay['size'] = size
    return lay

L['words'] = [word_layer(w) for w in ['pan de ajo', 'chorizo', 'chimichurri']]

# ---------- íconos en anillo del menú (.ai página 6) ----------
pg = fitz.open(AI)[5]
drs = [d for d in pg.get_drawings() if d['rect'].y1 < 140 and d['rect'].x0 > 400]
rings = sorted([d for d in drs if d['rect'].width > 50], key=lambda d: d['rect'].x0)
rest = [d for d in drs if d not in rings]
ICON = 96.0                                   # px de diámetro final
icons = []
for i, r in enumerate(rings):
    cx, cy = (r['rect'].x0 + r['rect'].x1) / 2, (r['rect'].y0 + r['rect'].y1) / 2
    k = ICON / r['rect'].width
    tx = 515 + (i - 1.5) * (ICON + 18)   # eje óptico del logo (sin el ®)
    T = lambda p: ((p.x - cx) * k + tx, (p.y - cy) * k)
    group = [r] + [d for d in rest if abs((d['rect'].x0 + d['rect'].x1) / 2 - cx) < 20]
    segs = []
    for d in group:
        for it in d['items']:
            if it[0] == 'l': segs.append(('l', T(it[1]), T(it[2])))
            elif it[0] == 'c': segs.append(('c', *[T(q) for q in it[1:5]]))
    cs = contours_from_segments(segs)
    icons.append(layer(['Ícono corazón', 'Ícono fuego', 'Ícono rápido', 'Ícono café'][i], cs, pivot=(tx, 0)))
L['icons'] = icons

js = (ROOT / 'tools' / 'ae_template.jsx').read_text(encoding='utf-8')
js = js.replace('/*__DATA__*/null', json.dumps(L, separators=(',', ':')))
js = js.replace('__AEP__', str(ROOT / 'ae' / 'lacentral_logo.aep').replace('\\', '/'))
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(js, encoding='utf-8-sig')
print('ok', OUT, len(js))
