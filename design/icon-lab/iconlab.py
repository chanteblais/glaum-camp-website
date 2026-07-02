#!/usr/bin/env python3
"""Icon lab pass 1 — emits QA SVGs (for qlmanage visual review) and the gallery HTML.

All icons: 64x64 viewBox, single-color via currentColor (+ literal purple accent
in direction C). Directions:
  A "etched"  — fine engraved line, stroke currentColor
  B "inlay"   — flat deco facets, fill currentColor with tonal opacities
  C "sigil"   — solid emblem in a keyline medallion, one purple accent
"""
import os, subprocess, pathlib

PURPLE = "#D239F8"
GOLD = "#C8A848"
INK = "#1A0A24"

A = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"'

icons = {}

# ---------------- DIRECTION A: etched line ----------------

icons["a-lantern"] = f'''
<g {A}>
  <circle cx="32" cy="8.5" r="3.2"/>
  <path d="M32 11.7 V15"/>
  <path d="M20.5 23 Q32 13.5 43.5 23 Z"/>
  <path d="M22 23 L20.5 43"/>
  <path d="M42 23 L43.5 43"/>
  <path d="M27.5 25.5 V39"/>
  <path d="M36.5 25.5 V39"/>
  <path d="M32 39 C28.4 34.8 29.4 31 32 27.5 C34.6 31 35.6 34.8 32 39 Z"/>
  <path d="M20.5 43 H43.5 L45.5 48.5 H18.5 Z"/>
</g>'''

icons["a-tent"] = f'''
<g {A}>
  <circle cx="32" cy="10" r="2"/>
  <path d="M32 14 L9 51 H55 Z"/>
  <path d="M32 14 L21 51"/>
  <path d="M32 14 L43 51"/>
  <path d="M27.5 51 L32 37 L36.5 51"/>
</g>'''

icons["a-chalice"] = f'''
<g {A}>
  <path d="M32 22.5 C29 18 30 13 32 8.5 C34 13 35 18 32 22.5 Z"/>
  <path d="M25 21.5 C23.5 18.5 24.5 16 26.5 13.5 C27.5 16.5 27 19.5 25 21.5 Z"/>
  <path d="M39 21.5 C40.5 18.5 39.5 16 37.5 13.5 C36.5 16.5 37 19.5 39 21.5 Z"/>
  <path d="M17.5 27 H46.5 C46.5 36.5 40.5 42 32 42 C23.5 42 17.5 36.5 17.5 27 Z"/>
  <path d="M32 42 V46.5"/>
  <path d="M23.5 52.5 C23.5 48.5 27 46.5 32 46.5 C37 46.5 40.5 48.5 40.5 52.5 Z"/>
</g>'''

HAND_OUTLINE = (
    "M18.1 34 V22 A2.4 2.4 0 0 1 22.9 22 V30 "
    "L23.6 30 V16 A2.4 2.4 0 0 1 28.4 16 V29 "
    "L29.1 29 V13 A2.4 2.4 0 0 1 33.9 13 V29 "
    "L34.6 29 V16 A2.4 2.4 0 0 1 39.4 16 V32 "
    "C40.5 30.5 43.5 26.8 45.8 25.6 C48 24.4 49.8 26.2 48.8 28.5 "
    "C47.6 31.2 43.5 34.8 41.8 38.2 "
    "C40.8 40.6 41.2 44.3 38 47.5 C35 50.5 28.6 51.4 24.6 49.3 "
    "C20.3 47 18.1 42 18.1 36.5 Z"
)

icons["a-hand"] = f'''
<g {A}>
  <path d="{HAND_OUTLINE}"/>
  <path d="M24.5 41 Q30.5 45.5 36.5 40.5"/>
</g>'''

icons["a-temple"] = f'''
<g {A}>
  <path d="M13.5 25 L32 12.5 L50.5 25 Z"/>
  <circle cx="32" cy="20.5" r="2.2"/>
  <path d="M16.5 29 H47.5"/>
  <path d="M20.5 33 V44"/><path d="M28.2 33 V44"/><path d="M35.8 33 V44"/><path d="M43.5 33 V44"/>
  <path d="M16.5 47 H47.5"/>
  <path d="M14 51 H50"/>
</g>'''

icons["a-mallet"] = f'''
<g {A}>
  <g transform="rotate(45 32 32)">
    <rect x="22" y="8" width="20" height="12" rx="2.5"/>
    <path d="M32 20 V51"/>
  </g>
  <g transform="rotate(-45 32 32)">
    <path d="M30.4 15.5 V42.5 L32 50.5 L33.6 42.5 V15.5 Z"/>
    <path d="M27.5 12 H36.5"/>
  </g>
</g>'''

# ---------------- DIRECTION B: deco inlay ----------------

icons["b-lantern"] = f'''
<g fill="currentColor">
  <path fill-rule="evenodd" d="M27.4 8.1 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0 M29.9 8.1 a2.1 2.1 0 1 1 4.2 0 a2.1 2.1 0 1 1 -4.2 0"/>
  <rect x="30.8" y="12.6" width="2.4" height="3.4"/>
  <path d="M20.5 22.5 Q32 13 43.5 22.5 Z" fill-opacity=".8"/>
  <rect x="18.5" y="24" width="27" height="2.2" rx="1.1"/>
  <path d="M21.5 28 L20.3 41.5 H25.8 L26.4 28 Z" fill-opacity=".6"/>
  <path d="M42.5 28 L43.7 41.5 H38.2 L37.6 28 Z" fill-opacity=".6"/>
  <path d="M32 39.5 C28.8 35.5 29.6 31.8 32 28 C34.4 31.8 35.2 35.5 32 39.5 Z"/>
  <path d="M19.5 43.5 H44.5 L46.5 49.5 H17.5 Z" fill-opacity=".9"/>
</g>'''

icons["b-tent"] = f'''
<g fill="currentColor">
  <path d="M29.6 8 Q32 5.3 34.4 8 L33.5 13.2 H30.5 Z" fill-opacity=".9"/>
  <path d="M31 15 L8 51 H13.5 Z" fill-opacity=".5"/>
  <path d="M31.4 15.5 L16.5 51 H21.5 Z" fill-opacity=".72"/>
  <path d="M31.7 16 L24 51 H29 Z"/>
  <path d="M32.3 16 L40 51 H35 Z"/>
  <path d="M32.6 15.5 L47.5 51 H42.5 Z" fill-opacity=".72"/>
  <path d="M33 15 L56 51 H50.5 Z" fill-opacity=".5"/>
  <rect x="7" y="53.5" width="50" height="2.5" rx="1.25" fill-opacity=".85"/>
</g>'''

icons["b-chalice"] = f'''
<g fill="currentColor">
  <path d="M32 23 C29 18.5 30 13.5 32 9 C34 13.5 35 18.5 32 23 Z"/>
  <path d="M25.2 22 C23.7 19 24.6 16.4 26.6 14 C27.6 17 27.1 19.9 25.2 22 Z" fill-opacity=".7"/>
  <path d="M38.8 22 C40.3 19 39.4 16.4 37.4 14 C36.4 17 36.9 19.9 38.8 22 Z" fill-opacity=".7"/>
  <path d="M17.5 26.5 H26 V40.2 C21 38.3 17.9 33 17.5 26.5 Z" fill-opacity=".7"/>
  <path d="M28 26.5 H36 V41.8 C34.7 42 33.4 42 32 42 C30.6 42 29.3 42 28 41.8 Z"/>
  <path d="M46.5 26.5 H38 V40.2 C43 38.3 46.1 33 46.5 26.5 Z" fill-opacity=".7"/>
  <rect x="30.3" y="43.5" width="3.4" height="4.5"/>
  <path d="M23.5 53 C23.5 49.5 27 47.5 32 47.5 C37 47.5 40.5 49.5 40.5 53 Z" fill-opacity=".85"/>
</g>'''

icons["b-hand"] = f'''
<path fill="currentColor" fill-rule="evenodd" d="{HAND_OUTLINE} M24 41 Q30.5 46.4 37 40.7 Q30.5 44 24 41 Z"/>'''

icons["b-temple"] = f'''
<g fill="currentColor">
  <path fill-rule="evenodd" d="M13.5 25.5 L32 12 L50.5 25.5 Z M29.9 20.6 a2.1 2.1 0 1 0 4.2 0 a2.1 2.1 0 1 0 -4.2 0" fill-opacity=".85"/>
  <rect x="16" y="27.5" width="32" height="3" rx="1"/>
  <rect x="18.2" y="32.5" width="4.6" height="12" fill-opacity=".75"/>
  <rect x="25.9" y="32.5" width="4.6" height="12"/>
  <rect x="33.5" y="32.5" width="4.6" height="12"/>
  <rect x="41.2" y="32.5" width="4.6" height="12" fill-opacity=".75"/>
  <rect x="16" y="46.5" width="32" height="2.6" rx="1" fill-opacity=".9"/>
  <rect x="13" y="50.6" width="38" height="2.8" rx="1.2" fill-opacity=".75"/>
</g>'''

icons["b-mallet"] = f'''
<g fill="currentColor">
  <g transform="rotate(45 32 32)">
    <path d="M25.5 8.5 H38.5 A2.5 2.5 0 0 1 41 11 V13.9 H23 V11 A2.5 2.5 0 0 1 25.5 8.5 Z" fill-opacity=".7"/>
    <path d="M23 15 H41 V17.5 A2.5 2.5 0 0 1 38.5 20 H25.5 A2.5 2.5 0 0 1 23 17.5 Z"/>
    <rect x="30.6" y="21.5" width="2.8" height="29" rx="1.4" fill-opacity=".9"/>
  </g>
  <g transform="rotate(-45 32 32)">
    <rect x="27.5" y="11.5" width="9" height="2.8" rx="1.4" fill-opacity=".8"/>
    <path d="M30.7 15.8 V43 L32 51 L33.3 43 V15.8 Z" fill-opacity=".8"/>
  </g>
</g>'''

# ---------------- DIRECTION C: sigil medallion ----------------

def sparkle(cx, cy, r, fill=PURPLE):
    return (f'<path d="M{cx} {cy-r} Q{cx+r*0.18} {cy-r*0.18} {cx+r} {cy} '
            f'Q{cx+r*0.18} {cy+r*0.18} {cx} {cy+r} '
            f'Q{cx-r*0.18} {cy+r*0.18} {cx-r} {cy} '
            f'Q{cx-r*0.18} {cy-r*0.18} {cx} {cy-r} Z" fill="{fill}"/>')

RING = '<circle cx="32" cy="32" r="27.5" fill="none" stroke="currentColor" stroke-width="1.5"/>'
EMBED = '<g transform="translate(32 32) scale(0.68) translate(-32 -32)">'

icons["c-lantern"] = f'''
{RING}
{EMBED}
  <g fill="currentColor">
    <path fill-rule="evenodd" d="M27.4 7.1 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0 M29.9 7.1 a2.1 2.1 0 1 1 4.2 0 a2.1 2.1 0 1 1 -4.2 0"/>
    <rect x="30.8" y="11.6" width="2.4" height="3.6"/>
    <path d="M20.5 22 Q32 12.5 43.5 22 L44 24.5 H20 Z"/>
    <path fill-rule="evenodd" d="M21.5 26.5 L20 43.5 H44 L42.5 26.5 Z M26.6 29.5 L25.9 40.5 H38.1 L37.4 29.5 Z"/>
    <path d="M19.5 45.5 H44.5 L46.5 51.5 H17.5 Z"/>
  </g>
  <path d="M32 39.8 C29.2 36.2 29.9 32.6 32 29.4 C34.1 32.6 34.8 36.2 32 39.8 Z" fill="{PURPLE}"/>
{'</g>'}'''

icons["c-tent"] = f'''
{RING}
{EMBED}
  <g fill="currentColor">
    <path d="M30.2 10.5 Q32 8.3 33.8 10.5 L33.1 14.6 H30.9 Z"/>
    <path fill-rule="evenodd" d="M32 16 L8.5 53 H55.5 Z M32 33 L26 53 H38 Z"/>
  </g>
  {sparkle(32, 25, 4.2)}
{'</g>'}'''

icons["c-chalice"] = f'''
{RING}
{EMBED}
  <g fill="currentColor">
    <path d="M17.5 27 H46.5 C46.5 37 40.5 42.5 32 42.5 C23.5 42.5 17.5 37 17.5 27 Z"/>
    <rect x="30.3" y="43.5" width="3.4" height="4.5"/>
    <path d="M23.5 53.5 C23.5 50 27 48 32 48 C37 48 40.5 50 40.5 53.5 Z"/>
  </g>
  <g fill="{PURPLE}">
    <path d="M32 23.5 C29 19 30 14 32 9.5 C34 14 35 19 32 23.5 Z"/>
    <path d="M25.2 22.5 C23.7 19.5 24.6 16.9 26.6 14.5 C27.6 17.5 27.1 20.4 25.2 22.5 Z"/>
    <path d="M38.8 22.5 C40.3 19.5 39.4 16.9 37.4 14.5 C36.4 17.5 36.9 20.4 38.8 22.5 Z"/>
  </g>
{'</g>'}'''

icons["c-hand"] = f'''
{RING}
{EMBED}
  <path fill="currentColor" d="{HAND_OUTLINE}"/>
  {sparkle(30, 41, 4.5, INK)}
{'</g>'}'''

icons["c-temple"] = f'''
{RING}
{EMBED}
  <g fill="currentColor">
    <path d="M13.5 25.5 L32 12 L50.5 25.5 Z"/>
    <rect x="16" y="27.5" width="32" height="3" rx="1"/>
    <rect x="18.2" y="32.5" width="4.6" height="12"/>
    <rect x="25.9" y="32.5" width="4.6" height="12"/>
    <rect x="33.5" y="32.5" width="4.6" height="12"/>
    <rect x="41.2" y="32.5" width="4.6" height="12"/>
    <rect x="16" y="46.5" width="32" height="2.6" rx="1"/>
    <rect x="13" y="50.6" width="38" height="2.8" rx="1.2"/>
  </g>
  <circle cx="32" cy="20.8" r="2.4" fill="{PURPLE}"/>
{'</g>'}'''

icons["c-mallet"] = f'''
{RING}
{EMBED}
  <g fill="currentColor">
    <g transform="rotate(45 32 32)">
      <rect x="23" y="8.5" width="18" height="11.5" rx="2.5"/>
      <rect x="30.6" y="21.5" width="2.8" height="29" rx="1.4"/>
    </g>
    <g transform="rotate(-45 32 32)">
      <rect x="27.5" y="11.5" width="9" height="2.8" rx="1.4"/>
      <path d="M30.7 15.8 V43 L32 51 L33.3 43 V15.8 Z"/>
    </g>
  </g>
  {sparkle(32, 32, 5, PURPLE)}
{'</g>'}'''


def svg(name, inner, color=GOLD, bg=None):
    bgrect = f'<rect width="64" height="64" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
            f'width="256" height="256" color="{color}">{bgrect}{inner}\n</svg>')

HERE = pathlib.Path(__file__).parent
QA = HERE / "qa"
QA.mkdir(exist_ok=True)

for name, inner in icons.items():
    (QA / f"{name}.svg").write_text(svg(name, inner, bg=INK))

# one comparison sheet: rows = subjects, cols = directions (tall > wide avoids qlmanage clipping)
SUBJECTS = ["lantern", "tent", "chalice", "hand", "temple", "mallet"]
cells = []
for r, s in enumerate(SUBJECTS):
    for c, d in enumerate("abc"):
        cells.append(f'<g transform="translate({10 + c*80} {10 + r*80})">{icons[f"{d}-{s}"]}</g>')
sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 490" width="250" height="490" color="{GOLD}">'
         f'<rect width="250" height="490" fill="{INK}"/>' + "".join(cells) + '</svg>')
(QA / "sheet-all.svg").write_text(sheet)

print("wrote", len(icons), "icons + comparison sheet to", QA)

# ---------------- deliverables: svg files + gallery html ----------------
import sys
if len(sys.argv) > 1:
    OUT = pathlib.Path(sys.argv[1])
    (OUT / "pass-1").mkdir(parents=True, exist_ok=True)
    for name, inner in icons.items():
        (OUT / "pass-1" / f"{name}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{inner}\n</svg>')

    LABELS = {"lantern": "Lantern", "tent": "Pitched Tent", "chalice": "Flaming Chalice",
              "hand": "Raised Hand", "temple": "Temple", "mallet": "Mallet &amp; Stake"}
    DIRS = [
        ("a", "Direction A — Etched Line",
         "Fine engraved linework, like the registry pages. Quiet and ceremonial; best at 40&nbsp;px and up — dividers, section marks, empty states, print."),
        ("b", "Direction B — Gilded Inlay",
         "Flat art-deco facets cut by ink seams (grown from your tent — the strongest of the ChatGPT set). Boldest at small sizes; the working pick for group icons and commitment rows."),
        ("c", "Direction C — Sigil Medallion",
         "Solid emblem in a keyline ring with one accent. Speaks the badge/medal language; suited to distinctions, seals, and award moments."),
    ]

    def cell(d, s, px):
        return (f'<figure><svg viewBox="0 0 64 64" width="{px}" height="{px}">{icons[f"{d}-{s}"]}</svg>'
                f'<figcaption>{LABELS[s]}</figcaption></figure>')

    rows = []
    for d, title, blurb in DIRS:
        figs = "".join(cell(d, s, 64) for s in SUBJECTS)
        small = "".join(f'<svg viewBox="0 0 64 64" width="24" height="24">{icons[f"{d}-{s}"]}</svg>' for s in SUBJECTS)
        rows.append(f'<section><h2>{title}</h2><p>{blurb}</p><div class="row">{figs}</div>'
                    f'<div class="tiny">{small}<span>at 24 px</span></div></section>')

    retint = "".join(f'<svg viewBox="0 0 64 64" width="44" height="44">{icons[f"b-{s}"]}</svg>' for s in SUBJECTS)
    html = f"""<!doctype html><meta charset="utf-8"><title>Glåüm Icon Lab — Pass 1</title>
<style>
  body {{ background:{INK}; color:{GOLD}; font-family:'Libre Baskerville', Georgia, serif; margin:0; padding:48px 40px 80px; }}
  h1 {{ font-weight:normal; letter-spacing:.06em; }} h2 {{ font-weight:normal; margin:0 0 4px; }}
  p {{ color:#F3EDE6; opacity:.75; max-width:60em; font-size:14px; line-height:1.6; margin:0 0 18px; }}
  section {{ margin:44px 0; padding-top:28px; border-top:1px solid rgba(200,168,72,.25); }}
  .row {{ display:flex; gap:36px; flex-wrap:wrap; align-items:flex-end; }}
  figure {{ margin:0; text-align:center; color:{GOLD}; }}
  figcaption {{ font-size:11px; opacity:.6; margin-top:10px; letter-spacing:.05em; }}
  .tiny {{ margin-top:22px; display:flex; gap:14px; align-items:center; color:{GOLD}; }}
  .tiny span {{ font-size:11px; opacity:.5; margin-left:8px; }}
  .swatch {{ display:inline-flex; gap:18px; padding:16px 20px; border-radius:10px; margin-right:14px; }}
</style>
<h1>Glåüm Icon Lab · Pass 1</h1>
<p>Six subjects from the current library, redrawn in three directions. Every icon is a single-colour SVG
(<code>currentColor</code>) — it inherits whatever colour the page gives it, so the same file works for any
future community palette. Direction C carries one fixed accent (Glåüm purple) that can become a parameter.</p>
{"".join(rows)}
<section><h2>Retint proof</h2><p>The same Direction B files, recoloured only by CSS <code>color</code> — no new artwork.</p>
<div class="swatch" style="background:#14231C;color:#8FBFA8">{retint}</div>
<div class="swatch" style="background:#1A0A24;color:#F3EDE6">{retint}</div>
<div class="swatch" style="background:#241408;color:#D98E4A">{retint}</div>
</section>
"""
    (OUT / "pass-1.html").write_text(html)
    print("wrote gallery + svgs to", OUT)
