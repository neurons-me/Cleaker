# Builds the Ax2 and Ax3 diagrams of The Algebra of .me and writes them into docs/en/The-Algebra-of-Me.md between
# <!-- diagram:axN --> ... <!-- /diagram:axN --> markers (inserted after the axiom's example the first time).
# Run from the repo root: python3 docs/covers/build-diagrams.py docs/en/The-Algebra-of-Me.md
# Colours are the .GUI theme variables, so the diagrams follow the theme and light / dark like the card covers.
import re, sys
DOC = sys.argv[1]
P = "color-mix(in srgb, var(--mui-palette-primary-main, #90caf9) 72%, var(--mui-palette-text-primary, #e8eded))"
PAPER = "var(--mui-palette-background-paper, #111a1f)"
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
T = "currentColor"

def text(x, y, t, size=14, w=400, op=".85", anchor="start"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{MONO}" font-size="{size}" font-weight="{w}" fill="{T}" opacity="{op}">{t}</text>'

def curve(x1, y1, x2, y2, w, op):
    mx = x1 + (x2 - x1) / 2
    return f'<path d="M{x1} {y1} C {mx} {y1} {mx} {y2} {x2} {y2}" fill="none" stroke="{P}" stroke-width="{w}" opacity="{op}"/>'

def ax2():
    # cleaker mounts the .me on the axis (the dashed namespace slot); the tree grows from that .me
    rx, ry = 96, 130
    o = []
    kids = [(270, 58, "keys", [("namespace", 0)]), (270, 130, "wallet", [("balance", 0)]), (270, 202, "contacts", [("friends", -16), ("groups", 16)])]
    for kx, ky, _, _ in kids:
        o.append(curve(rx + 46, ry, kx, ky, 3.5, ".6"))
    for kx, ky, name, leaves in kids:
        lx = kx + 16 + len(name) * 8.4 + 14
        for leaf, dy in leaves:
            o.append(curve(lx, ky, lx + 30, ky + dy, 2.5, ".4"))
            o.append(f'<circle cx="{lx+34}" cy="{ky+dy}" r="5" fill="{P}" opacity=".6"/>')
            o.append(text(lx + 46, ky + dy + 5, leaf, 13, 400, ".7"))
        o.append(f'<circle cx="{kx}" cy="{ky}" r="8" fill="{PAPER}" stroke="{P}" stroke-width="3.5"/>')
        o.append(text(kx + 16, ky + 5, name, 14, 700, ".9"))
    o.append(f'<circle cx="{rx}" cy="{ry}" r="48" fill="{PAPER}" stroke="{P}" stroke-width="2.5" stroke-dasharray="6 6" opacity=".8"/>')
    o.append(f'<circle cx="{rx}" cy="{ry}" r="32" fill="{P}"/>')
    o.append(f'<text x="{rx}" y="{ry+6}" text-anchor="middle" font-family="{MONO}" font-size="17" font-weight="700" fill="{PAPER}">.me</text>')
    o.append(text(rx, ry - 62, "cleaker", 14, 700, ".8", "middle"))
    o.append(text(rx, ry + 74, "jabellae.cleaker.me", 13, 400, ".7", "middle"))
    svg = ('<svg viewBox="0 30 600 220" role="img" aria-label="cleaker mounts the .me in its namespace (a dashed ring, jabellae.cleaker.me); '
           'the tree grows from the .me: keys (namespace), wallet (balance), contacts (friends, groups)" xmlns="http://www.w3.org/2000/svg">' + "".join(o) + "</svg>")
    cap = ('cleaker mounts the <code>.me</code> in its namespace (the dashed ring) and the tree grows from it. '
           '<code>jabellae.cleaker.me/contacts.friends</code> and <code>cleaker.me/@jabellae/contacts/friends</code> are the same path.')
    return svg, cap

def ax3():
    # four audiences: a ∪ b, a ∩ b, A \ x, {self}; shaded = who opens
    o = ["<defs>"]
    # each panel is 150 wide; circles r 34
    def clip(id_, cx, cy, r): return f'<clipPath id="{id_}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>'
    o += [clip("ck-ax3-a2", 238, 88, 34)]
    o.append("</defs>")
    shade = f'fill="{P}" fill-opacity=".42"'
    ring = f'fill="none" stroke="{T}" stroke-width="2" opacity=".7"'
    # 1. union
    o += [f'<circle cx="38" cy="88" r="34" {shade}/>', f'<circle cx="82" cy="88" r="34" {shade}/>',
          f'<circle cx="38" cy="88" r="34" {ring}/>', f'<circle cx="82" cy="88" r="34" {ring}/>',
          text(26, 93, "a", 13, 700, ".9", "middle"), text(94, 93, "b", 13, 700, ".9", "middle"),
          text(60, 150, "me(a) ∪ me(b)", 13, 700, ".9", "middle"), text(60, 170, "any one opens", 12, 400, ".65", "middle")]
    # 2. intersection: only the lens
    o += [f'<circle cx="282" cy="88" r="34" {shade} clip-path="url(#ck-ax3-a2)"/>',
          f'<circle cx="238" cy="88" r="34" {ring}/>', f'<circle cx="282" cy="88" r="34" {ring}/>',
          text(226, 93, "a", 13, 700, ".9", "middle"), text(294, 93, "b", 13, 700, ".9", "middle"),
          text(260, 150, "me(a) ∩ me(b)", 13, 700, ".9", "middle"), text(260, 170, "only both together", 12, 400, ".65", "middle")]
    # 3. minus: a, b in; x drawn dashed, not shaded
    o += [f'<circle cx="430" cy="74" r="28" {shade}/>', f'<circle cx="474" cy="74" r="28" {shade}/>',
          f'<circle cx="430" cy="74" r="28" {ring}/>', f'<circle cx="474" cy="74" r="28" {ring}/>',
          f'<circle cx="452" cy="112" r="28" fill="none" stroke="{T}" stroke-width="2" stroke-dasharray="5 5" opacity=".45"/>',
          text(420, 74, "a", 13, 700, ".9", "middle"), text(484, 74, "b", 13, 700, ".9", "middle"), text(452, 126, "x", 13, 700, ".45", "middle"),
          text(452, 160, "A \\ x", 13, 700, ".9", "middle"), text(452, 178, "all but x, at sealing", 12, 400, ".65", "middle")]
    # 4. {self}: one circle with a lock
    o += [f'<circle cx="620" cy="88" r="34" {shade}/>', f'<circle cx="620" cy="88" r="34" {ring}/>',
          f'<g fill="none" stroke="{T}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".85">'
          f'<rect x="609" y="86" width="22" height="17" rx="3"/><path d="M613 86 V80 a7 7 0 0 1 14 0 V86"/></g>',
          text(620, 150, "{self} = _()", 13, 700, ".9", "middle"), text(620, 170, "only the owner", 12, 400, ".65", "middle")]
    svg = ('<svg viewBox="-8 40 700 150" role="img" aria-label="Four audiences, shaded where the value opens: me(a) union me(b), any one opens; '
           'me(a) intersection me(b), only both together; A minus x, all but x, resolved at sealing; {self}, a secret scope, only the owner" xmlns="http://www.w3.org/2000/svg">'
           + "".join(o) + "</svg>")
    cap = 'Shaded: who opens the value. <code>∪</code> wraps the key once per member; <code>∩</code> splits it into shares that are all needed; <code>\\</code> leaves a member out when sealing; <code>{self}</code> is a secret scope, <code>_()</code>.'
    return svg, cap

def block(name, svg, cap, maxw):
    return (f'<!-- diagram:{name} -->\n<div class="doc-svg" data-max="{maxw}" markdown="0">{svg}<figcaption>{cap}</figcaption></div>\n<!-- /diagram:{name} -->')

s = open(DOC).read()
anchors = {
    "ax2": "`me://jabellae.cleaker.me:read/contacts.friends` is the same path as `cleaker.me/@jabellae/contacts/friends`.\n",
    "ax3": "{self}          a secret scope _()             the owner opens, a guest gets nothing\n```\n",
}
for name, (svg, cap), maxw in (("ax2", ax2(), "600px"), ("ax3", ax3(), "700px")):
    new = block(name, svg, cap, maxw)
    pat = re.compile(rf"<!-- diagram:{name} -->.*?<!-- /diagram:{name} -->", re.S)
    if pat.search(s):
        s = pat.sub(lambda m: new, s)
    else:
        a = anchors[name]
        assert s.count(a) == 1, name
        s = s.replace(a, a + "\n" + new + "\n")
open(DOC, "w").write(s)
print("ok")
