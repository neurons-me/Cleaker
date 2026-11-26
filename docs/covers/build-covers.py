# Builds the Statuses and The Model card covers from QR.me's own output for https://cleaker.me
# Run from the repo root: python3 docs/covers/build-covers.py docs/covers/qrme.json docs/index.html
# (qrme.json: the code path and the .me wordmark, read from the rendered GUI.QRme). Colours: .GUI theme variables.
import json, math, re, sys
Q = json.load(open(sys.argv[1])); INDEX = sys.argv[2]
V = lambda n, f: f"var(--mui-palette-{n}, {f})"
P = "color-mix(in srgb, var(--mui-palette-primary-main, #90caf9) 72%, var(--mui-palette-text-primary, #e8eded))"
PAPER = V("background-paper", "#111a1f")
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

def defs(id_):
    wm = "".join(f'<rect x="{round(x+45.62,2)}" y="{round(y+57.1,2)}" width="{w}" height="{h}"/>' for x, y, w, h in Q["wm"])
    # 124x124 code (as QR.me draws it), the .me wordmark centred on a paper halo, then the ring 8 units out
    return (f'<defs><clipPath id="{id_}c"><rect width="124" height="124" rx="12"/></clipPath>'
            f'<g id="{id_}"><rect width="124" height="124" rx="12" fill="{PAPER}"/>'
            f'<g clip-path="url(#{id_}c)"><path d="{Q["d"]}" fill="currentColor"/></g>'
            f'<rect x="42.6" y="54.1" width="38.8" height="15.8" rx="2" fill="{PAPER}"/><g fill="currentColor">{wm}</g></g></defs>')

def qr(id_, cx, cy, size, col, op="1", ring="solid"):
    s = size / 140; x, y = cx - size / 2, cy - size / 2
    dash = ' stroke-dasharray="14 10"' if ring == "dashed" else ""
    return (f'<g transform="translate({round(x,2)} {round(y,2)}) scale({round(s,4)})" style="color:{col}" opacity="{op}">'
            f'<rect x="1.5" y="1.5" width="137" height="137" rx="22" fill="none" stroke="currentColor" stroke-width="3"{dash}/>'
            f'<use href="#{id_}" x="8" y="8"/></g>')

def statuses():
    id_ = "ckq-st"
    S = [("idle", P, ".6"), ("checking", V("warning-main", "#d8b56a"), "1"), ("confirmed", P, "1"),
         ("error", V("error-main", "#e07a7a"), "1"), ("off", V("text-disabled", "#808080"), ".8")]
    cx, cy, R, F = 200, 125, 88, 66
    pos = [(cx + R * math.cos(math.radians(-90 + 72 * i)), cy + R * math.sin(math.radians(-90 + 72 * i))) for i in range(5)]
    out = [defs(id_)]
    out += [f'<path d="M{cx} {cy} L{round(x,1)} {round(y,1)}" stroke="{P}" stroke-width="2.5" opacity=".22"/>' for x, y in pos]
    for (name, col, op), (x, y) in zip(S, pos):
        out.append(qr(id_, x, y, F, col, op, "dashed" if name == "off" else "solid"))
        ex, ey = round(x + F / 2 - 4, 1), round(y - F / 2 + 4, 1)
        if name == "confirmed":
            out.append(f'<circle cx="{ex}" cy="{ey}" r="7.5" fill="{V("success-main", "#63c7b2")}" stroke="{PAPER}" stroke-width="3"/>')
        if name == "error":
            out.append(f'<circle cx="{ex}" cy="{ey}" r="8.5" fill="{PAPER}"/><path d="M{ex-4.5} {ey-4.5} L{ex+4.5} {ey+4.5} M{ex+4.5} {ey-4.5} L{ex-4.5} {ey+4.5}" stroke="{col}" stroke-width="3.2" stroke-linecap="round"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="6" fill="{P}" opacity=".7"/>')
    xs = [p[0] for p in pos]; ys = [p[1] for p in pos]
    vb = f"{round(min(xs)-F/2-14)} {round(min(ys)-F/2-22)} {round(max(xs)-min(xs)+F+28)} {round(max(ys)-min(ys)+F+26)}"
    return (f'<svg class="card-media" viewBox="{vb}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Five QR.me codes in a ring, one per status: idle, checking (warning), confirmed (green dot), error (red, a cross), off (grey, dashed)" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

def model():
    id_ = "ckq-mo"; T = "currentColor"; F = 70; qx, qy = 40, 74
    out = [defs(id_), qr(id_, qx, qy, F, P)]
    ay = qy
    out.append(f'<path d="M82 {ay} H124" stroke="{T}" stroke-width="3.5" stroke-linecap="round" opacity=".5"/><path d="M117 {ay-7} L126 {ay} L117 {ay+7}" fill="none" stroke="{T}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>')
    out.append(f'<text x="103" y="{ay-11}" text-anchor="middle" font-family="{MONO}" font-size="12" font-weight="700" fill="{T}" opacity=".8">cleaker</text>')
    rx, ry = 142, ay; kids = [(180, ry - 38), (186, ry), (180, ry + 38)]
    out += [f'<path d="M{rx} {ry} C {rx+18} {ry} {kx-20} {ky} {kx} {ky}" fill="none" stroke="{P}" stroke-width="3" opacity=".55"/>' for kx, ky in kids]
    for kx, ky in kids:
        for dy in (-10, 10):
            out.append(f'<path d="M{kx} {ky} L{kx+24} {ky+dy}" stroke="{P}" stroke-width="2.5" opacity=".35"/><circle cx="{kx+24}" cy="{ky+dy}" r="4" fill="{P}" opacity=".5"/>')
        out.append(f'<circle cx="{kx}" cy="{ky}" r="6.5" fill="{PAPER}" stroke="{P}" stroke-width="3.5"/>')
    out.append(f'<circle cx="{rx}" cy="{ry}" r="10" fill="{P}"/>')
    out.append(f'<text x="172" y="{ry+64}" text-anchor="middle" font-family="{MONO}" font-size="12" fill="{T}" opacity=".6">me://cleaker.me</text>')
    return ('<svg class="card-media" viewBox="0 22 230 124" preserveAspectRatio="xMidYMax meet" role="img" aria-label="QR.me for .me (syntax), an arrow labelled cleaker (protocol), and the namespace tree me://cleaker.me" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

s = open(INDEX).read()
for href, build in (("docs/en/The-Model.html", model), ("docs/en/Statuses.html", statuses)):
    i = s.index(f'href="https://neurons-me.github.io/Cleaker/{href}"'); j = s.index('<svg class="card-media"', i); e = s.index("</svg>", j) + 6
    assert e < s.index('<div class="card-title">', i)
    s = s[:j] + build() + s[e:]
open(INDEX, "w").write(s); print("ok")
