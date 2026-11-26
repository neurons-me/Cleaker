# Builds the Cleaker, The Model, Statuses and The Algebra of Me card covers from QR.me's own output for https://cleaker.me
# Run from the repo root: python3 docs/covers/build-covers.py docs/covers/qrme.json docs/index.html
# (qrme.json: the code path and the .me wordmark, read from the rendered GUI.QRme). Colours: .GUI theme variables.
import json, math, re, sys
Q = json.load(open(sys.argv[1])); INDEX = sys.argv[2]
V = lambda n, f: f"var(--mui-palette-{n}, {f})"
P = "color-mix(in srgb, var(--mui-palette-primary-main, #90caf9) 72%, var(--mui-palette-text-primary, #e8eded))"
PAPER = V("background-paper", "#111a1f")
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

def fit(x0, y0, x1, y1, top=13, bottom=6, band=140):
    # viewBox that puts the content (x0..x1, y0..y1) TOP px below the top of the card's band and BOTTOM px above its
    # bottom, height-bound (the bands are 140px tall and wider than tall), centred horizontally.
    h = y1 - y0; k = h / (band - top - bottom); H = band * k; W = (x1 - x0) + 8 * k
    return f"{round(x0 - 4 * k, 1)} {round(y0 - top * k, 1)} {round(W, 1)} {round(H, 1)}"

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
    vb = fit(84, 4.7, 316, 228.5)  # content box, measured in the browser (frames, dot, cross)
    return (f'<svg class="card-media" viewBox="{vb}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Five QR.me codes in a ring, one per status: idle, checking (warning), confirmed (green dot), error (red, a cross), off (grey, dashed)" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

# 24-unit line icons (stroke, currentColor), drawn inside a badge on each branch
ICONS = {
    "keys": '<circle cx="8" cy="15" r="4"/><path d="M11 12 L20 3 M17 6 L19.5 8.5 M15 8 L17 10"/>',
    "wallet": '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 9.5 H17.5 A1.5 1.5 0 0 1 19 11 M16 13.5 H21"/>',
    "contacts": '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19 C3.5 15 6 13.5 9 13.5 C12 13.5 14.5 15 14.5 19"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 13.6 C18.5 13.4 20.5 15 20.5 18.5"/>',
}

def model():
    # cleaker mounts the .me into the namespace (the dashed slot) as the root of the tree. Four levels: the .me, the
    # branches it holds (icons: keys, wallet, contacts), their children, their leaves.
    T = "currentColor"; rx, ry = 32, 84
    curve = lambda x1, y1, x2, y2, w, op: f'<path d="M{x1} {y1} C {x1+(x2-x1)/2} {y1} {x1+(x2-x1)/2} {y2} {x2} {y2}" fill="none" stroke="{P}" stroke-width="{w}" opacity="{op}"/>'
    kids = [(104, 32, "keys"), (110, 84, "wallet"), (104, 136, "contacts")]
    out = [curve(rx, ry, kx, ky, 3.5, ".55") for kx, ky, _ in kids]
    for kx, ky, _ in kids:
        for dy in (-13, 13):
            nx, ny = kx + 46, ky + dy
            out.append(curve(kx, ky, nx, ny, 2.8, ".45"))
            for ly in (-6.5, 6.5):
                out.append(curve(nx, ny, nx + 30, ny + ly, 2, ".3") + f'<circle cx="{nx+30}" cy="{ny+ly}" r="3.4" fill="{P}" opacity=".5"/>')
            out.append(f'<circle cx="{nx}" cy="{ny}" r="5" fill="{PAPER}" stroke="{P}" stroke-width="3"/>')
    for kx, ky, name in kids:
        out.append(f'<circle cx="{kx}" cy="{ky}" r="16" fill="{PAPER}" stroke="{P}" stroke-width="3.2"/>'
                   f'<g transform="translate({kx-9.6} {ky-9.6}) scale(.8)" fill="none" stroke="{P}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><title>{name}</title>{ICONS[name]}</g>')
    out.append(f'<circle cx="{rx}" cy="{ry}" r="30" fill="{PAPER}" stroke="{P}" stroke-width="2.5" stroke-dasharray="5 5" opacity=".75"/>')
    out.append(f'<circle cx="{rx}" cy="{ry}" r="20.5" fill="{P}"/>')
    out.append(f'<text x="{rx}" y="{ry+5}" text-anchor="middle" font-family="{MONO}" font-size="14" font-weight="700" fill="{PAPER}">.me</text>')
    out.append(f'<text x="{rx}" y="{ry-39}" text-anchor="middle" font-family="{MONO}" font-size="12" font-weight="700" fill="{T}" opacity=".75">cleaker</text>')
    return (f'<svg class="card-media" viewBox="{fit(2, 9.1, 189.4, 158.9)}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="cleaker mounting a .me into its namespace: the .me as the root of a tree with keys, wallet and contacts branches, their children and leaves" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

def cleaker():
    # The home's QR.me for cleaker.me, turning: the code face, then the .me face, and back (scaleX flip, 7 s loop).
    # Without motion (prefers-reduced-motion) it stays on the code face.
    id_ = "ckq-cl"; cx, cy, F = 100, 80, 118
    s_ = F / 140; x, y = cx - F / 2, cy - F / 2
    wm = "".join(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}"/>' for x0, y0, w, h in Q["wm"])
    style = ('<style>.ck-turn{transform-box:fill-box;transform-origin:center;animation:ck-turn 7s ease-in-out infinite}'
             '.ck-front{animation:ck-front 7s step-end infinite}.ck-back{opacity:0;animation:ck-back 7s step-end infinite}'
             '@keyframes ck-turn{0%,38%{transform:scaleX(1)}44%{transform:scaleX(0)}50%,88%{transform:scaleX(1)}94%{transform:scaleX(0)}100%{transform:scaleX(1)}}'
             '@keyframes ck-front{0%{opacity:1}44%{opacity:0}94%{opacity:1}}@keyframes ck-back{0%{opacity:0}44%{opacity:1}94%{opacity:0}}'
             '@media (prefers-reduced-motion:reduce){.ck-turn,.ck-front,.ck-back{animation:none}.ck-back{opacity:0}}</style>')
    out = [style, defs(id_),
           f'<g class="ck-turn" style="color:{P}"><g transform="translate({round(x,2)} {round(y,2)}) scale({round(s_,4)})">'
           f'<rect x="1.5" y="1.5" width="137" height="137" rx="22" fill="none" stroke="currentColor" stroke-width="3"/>'
           f'<g class="ck-front"><use href="#{id_}" x="8" y="8"/></g>'
           f'<g class="ck-back"><rect x="8" y="8" width="124" height="124" rx="12" fill="{PAPER}"/>'
           f'<g transform="translate(70 70) scale(2.6) translate(-16.38 -4.9)" fill="currentColor">{wm}</g></g></g></g>',
           f'<text x="{cx}" y="{cy+F/2+22}" text-anchor="middle" font-family="{MONO}" font-size="13" font-weight="700" fill="currentColor" opacity=".7">cleaker.me</text>']
    return ('<svg class="card-media" viewBox="20 6 160 172" preserveAspectRatio="xMidYMax meet" role="img" aria-label="The QR.me of cleaker.me, turning between its code and its .me face" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

def algebra():
    # Three .me as sets, written in .me syntax: me(a), me(b), me(c). Each circle takes its own theme colour
    # (primary, warning, error) at low opacity, so the overlaps mix them; the intersections are named a∩b, a∩c,
    # b∩c and, at the centre, a∩b∩c, each label inside its own lens.
    # Placement as the other covers: about 13px from the top of the band and 6px from the bottom.
    T = "currentColor"; r = 46
    # primary / warning / error: the three palette colours that stay distinct across the themes (secondary and success
    # are the same teal in neurons.me; info equals primary there)
    sets = [("a", (86, 62), "primary-main", "#90caf9"), ("b", (134, 62), "warning-main", "#f4c95d"), ("c", (110, 104), "error-main", "#ff6b6b")]
    out = []
    for _, (x, y), var, fb in sets:
        col = f"var(--mui-palette-{var}, {fb})"
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{col}" fill-opacity=".2" stroke="color-mix(in srgb, {col} 75%, var(--mui-palette-text-primary, #e8eded))" stroke-width="3"/>')
    lab = lambda x, y, t, size, w, op: f'<text x="{x}" y="{y}" text-anchor="middle" font-family="{MONO}" font-size="{size}" font-weight="{w}" fill="{T}" opacity="{op}">{t}</text>'
    out += [lab(62, 52, "me(a)", 11.5, 700, ".9"), lab(158, 52, "me(b)", 11.5, 700, ".9"), lab(110, 136, "me(c)", 11.5, 700, ".9")]
    out += [lab(110, 46, "a∩b", 10, 400, ".8"), lab(83, 98, "a∩c", 10, 400, ".8"), lab(137, 98, "b∩c", 10, 400, ".8")]
    out.append(lab(110, 81, "∩", 15, 700, ".95"))
    return (f'<svg class="card-media" viewBox="{fit(40, 16, 180, 150)}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Three .me as sets, me(a), me(b) and me(c), each in its own colour, with their intersections a∩b, a∩c, b∩c and a∩b∩c at the centre" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

def flat():
    # The Flat Universe: one plane of cells, each occupied or not (0 / 1). Read left to right it is the doc's chain,
    # distinction -> information -> geometry -> landscape: scattered bits on the left, the same cells settling into hills
    # on the right. Flat: no hierarchy is drawn, it emerges from which cells are occupied.
    import math, random
    rnd = random.Random(7)
    cols, rows, cell, gap = 12, 9, 11, 4
    step = cell + gap
    out = []
    for c in range(cols):
        t = c / (cols - 1)
        # the landscape: a cell is in it when it lies below the hill line
        hill = rows * (0.4 + 0.24 * math.sin(c * 0.8) + 0.1 * math.sin(c * 2.1 + 1))
        for r in range(rows):
            in_land = (rows - r) <= hill
            bit = rnd.random() < 0.5
            # left: the bit decides; right: the landscape decides; in between, the bit gives way to the shape
            occupied = (in_land if rnd.random() < t ** 1.3 else bit)
            x, y = c * step, r * step
            if occupied:
                out.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="2.5" fill="{P}" opacity="{round(0.45 + 0.5 * t, 2)}"/>')
            else:
                out.append(f'<rect x="{x+0.75}" y="{y+0.75}" width="{cell-1.5}" height="{cell-1.5}" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".22"/>')
    w, h = cols * step - gap, rows * step - gap
    return (f'<svg class="card-media" viewBox="{fit(0, 0, w, h)}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="A flat plane of cells, each occupied or not: scattered on the left, settling into a landscape on the right" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

def notes():
    # Notes: a notebook page, ruled, with a margin line, and the notes on it in .me syntax and in words:
    # the page's own phrases (name before place, / before /?, N @ surface, me(a) ∩ me(b), the singularity is .me).
    W, H = 214, 128
    lines = [("name before place", "currentColor", ".75", 400),
             ("/  before  /?", P, "1", 700),
             ("cleaker.me @ surface", "currentColor", ".75", 400),
             ("me(a) ∩ me(b)", P, "1", 700),
             ("the singularity is .me", "currentColor", ".75", 400)]
    o = [f'<rect x="1.5" y="1.5" width="{W-3}" height="{H-3}" rx="10" fill="{PAPER}" stroke="currentColor" stroke-width="1.5" opacity=".9"/>',
         f'<path d="M30 6 V{H-6}" stroke="{P}" stroke-width="1.6" opacity=".55"/>']
    for k in range(6):
        y = 22 + k * 20
        o.append(f'<path d="M10 {y} H{W-10}" stroke="currentColor" stroke-width="1" opacity=".14"/>')
    for k, (t, col, op, w) in enumerate(lines):
        y = 18 + k * 20
        o.append(f'<text x="38" y="{y}" font-family="{MONO}" font-size="11.5" font-weight="{w}" fill="{col}" opacity="{op}">{t}</text>')
    # three ring holes on the margin
    o += [f'<circle cx="17" cy="{y}" r="3.6" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".35"/>' for y in (28, 64, 100)]
    return (f'<svg class="card-media" viewBox="{fit(0, 0, W, H)}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="A notebook page with notes: name before place, / before /?, cleaker.me @ surface, me(a) ∩ me(b), the singularity is .me" xmlns="http://www.w3.org/2000/svg">'
            + "".join(o) + "</svg>")

s = open(INDEX).read()
for href, build in (("docs/en/Cleaker.html", cleaker), ("docs/en/The-Model.html", model), ("docs/en/Statuses.html", statuses), ("docs/en/The-Algebra-of-Me.html", algebra), ("docs/en/The-Flat-Universe.html", flat), ("docs/en/Notes.html", notes)):
    i = s.index(f'href="https://neurons-me.github.io/Cleaker/{href}"'); j = s.index('<svg class="card-media"', i); e = s.index("</svg>", j) + 6
    assert e < s.index('<div class="card-title">', i)
    s = s[:j] + build() + s[e:]
open(INDEX, "w").write(s); print("ok")
