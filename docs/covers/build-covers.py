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

# 24-unit line icons (stroke, currentColor), drawn inside a badge on each branch
ICONS = {
    "keys": '<circle cx="8" cy="15" r="4"/><path d="M11 12 L20 3 M17 6 L19.5 8.5 M15 8 L17 10"/>',
    "wallet": '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 9.5 H17.5 A1.5 1.5 0 0 1 19 11 M16 13.5 H21"/>',
    "contacts": '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19 C3.5 15 6 13.5 9 13.5 C12 13.5 14.5 15 14.5 19"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 13.6 C18.5 13.4 20.5 15 20.5 18.5"/>',
}

def model():
    # cleaker mounts the .me into the namespace (the dashed slot) as the root of the tree; each branch is a path it can hold, shown as an icon
    # (keys, wallet, contacts).
    T = "currentColor"; rx, ry = 34, 80
    kids = [(122, 30, "keys"), (138, 80, "wallet"), (122, 130, "contacts")]
    curve = lambda x1, y1, x2, y2: f'<path d="M{x1} {y1} C {x1+(x2-x1)/2} {y1} {x1+(x2-x1)/2} {y2} {x2} {y2}" fill="none" stroke="{P}" stroke-width="3.5" opacity=".55"/>'
    out = [curve(rx, ry, kx, ky) for kx, ky, _ in kids]
    for kx, ky, name in kids:
        out.append(f'<circle cx="{kx}" cy="{ky}" r="19" fill="{PAPER}" stroke="{P}" stroke-width="3.5"/>'
                   f'<g transform="translate({kx-11} {ky-11}) scale(.917)" fill="none" stroke="{P}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>{name}</title>{ICONS[name]}</g>')
    # the namespace slot (dashed ring) with the .me mounted in it; "cleaker" names what does the mounting
    out.append(f'<circle cx="{rx}" cy="{ry}" r="31" fill="{PAPER}" stroke="{P}" stroke-width="2.5" stroke-dasharray="5 5" opacity=".75"/>')
    out.append(f'<circle cx="{rx}" cy="{ry}" r="21" fill="{P}"/>')
    out.append(f'<text x="{rx}" y="{ry+5}" text-anchor="middle" font-family="{MONO}" font-size="14" font-weight="700" fill="{PAPER}">.me</text>')
    out.append(f'<text x="{rx}" y="{ry-40}" text-anchor="middle" font-family="{MONO}" font-size="12" font-weight="700" fill="{T}" opacity=".75">cleaker</text>')
    return ('<svg class="card-media" viewBox="-8 0 184 160" preserveAspectRatio="xMidYMax meet" role="img" aria-label="cleaker(me): the .me as the root of its namespace tree, with branches for keys, wallet and contacts" xmlns="http://www.w3.org/2000/svg">'
            + "".join(out) + "</svg>")

s = open(INDEX).read()
for href, build in (("docs/en/The-Model.html", model), ("docs/en/Statuses.html", statuses)):
    i = s.index(f'href="https://neurons-me.github.io/Cleaker/{href}"'); j = s.index('<svg class="card-media"', i); e = s.index("</svg>", j) + 6
    assert e < s.index('<div class="card-title">', i)
    s = s[:j] + build() + s[e:]
open(INDEX, "w").write(s); print("ok")
