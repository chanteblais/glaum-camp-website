#!/usr/bin/env python3
"""Icon lab pass 2 — 'Engraved ornament': hairline etching in the language of the
Salon emblem / badge art. Tapered filled slivers, 4-point sparkles, bead dots,
slender proportions. Single colour via currentColor."""
import pathlib, sys

GOLD = "#C8A848"
INK = "#1A0A24"

# hairline weights on a 64 grid
MAIN = 'stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"'
FINE = 'stroke="currentColor" stroke-width="0.8" fill="none" stroke-linecap="round" stroke-linejoin="round"'

def sparkle(cx, cy, r, vstretch=1.35):
    """4-point star, elongated vertically like the site art. Filled."""
    rv = r * vstretch
    return (f'<path d="M{cx} {cy-rv} Q{cx+r*0.16} {cy-r*0.16} {cx+r} {cy} '
            f'Q{cx+r*0.16} {cy+r*0.16} {cx} {cy+rv} '
            f'Q{cx-r*0.16} {cy+r*0.16} {cx-r} {cy} '
            f'Q{cx-r*0.16} {cy-r*0.16} {cx} {cy-rv} Z" fill="currentColor"/>')

def dot(cx, cy, r=0.7):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="currentColor"/>'

icons = {}

icons["p2-lantern"] = f'''
{sparkle(32, 5, 2.1)}
<g {MAIN}>
  <path d="M32 8.5 V11"/>
  <path d="M32 11 C26.2 13 23.6 16.4 23.6 20 H40.4 C40.4 16.4 37.8 13 32 11 Z"/>
  <path d="M22.3 20 H41.7"/>
  <path d="M24.6 22 C22.6 27 22.6 33 25.1 38.5"/>
  <path d="M39.4 22 C41.4 27 41.4 33 38.9 38.5"/>
  <path d="M25.1 38.5 H38.9"/>
  <path d="M26.8 40.5 C25.9 42.2 25.4 43.3 25.4 44.2 H38.6 C38.6 43.3 38.1 42.2 37.2 40.5"/>
</g>
<g {FINE}>
  <path d="M32 11 C30.2 14 29.3 17 29.3 20"/>
  <path d="M32 11 C33.8 14 34.7 17 34.7 20"/>
  <path d="M28.6 36.5 V28 C28.6 24.6 30.1 23.2 32 21.8 C33.9 23.2 35.4 24.6 35.4 28 V36.5 Z"/>
</g>
{dot(21.3, 20, 0.7)}{dot(42.7, 20, 0.7)}
<path d="M32 33.8 C30.4 31.7 30.9 29.7 32 27.8 C33.1 29.7 33.6 31.7 32 33.8 Z" fill="currentColor"/>
{dot(27.7, 47, 0.75)}{dot(32, 47.8, 0.75)}{dot(36.3, 47, 0.75)}
<path d="M32 50.2 L33.3 52.3 L32 54.4 L30.7 52.3 Z" {FINE}/>'''

icons["p2-chalice"] = f'''
<path fill-rule="evenodd" fill="currentColor" d="M32 22.5 C28.7 17.8 30.3 12.6 32 7.5 C33.7 12.6 35.3 17.8 32 22.5 Z M32 19.3 C30.9 16.9 31.4 14.6 32 12.3 C32.6 14.6 33.1 16.9 32 19.3 Z"/>
<path fill="currentColor" d="M26.3 20.5 C24.6 18 24.7 14.8 26 12 C27.2 14.9 27.4 18 26.3 20.5 Z"/>
<path fill="currentColor" d="M37.7 20.5 C39.4 18 39.3 14.8 38 12 C36.8 14.9 36.6 18 37.7 20.5 Z"/>
{sparkle(22.2, 9.5, 1.9)}{sparkle(41.8, 9.5, 1.9)}
{dot(23.5, 15.5, 0.6)}{dot(40.5, 15.5, 0.6)}
<g {MAIN}>
  <path d="M18 26.5 H46 C45.5 34.3 39.6 39.3 32 39.3 C24.4 39.3 18.5 34.3 18 26.5 Z"/>
  <path d="M32 39.3 V41.8"/>
  <path d="M32 45.8 V47.3"/>
  <path d="M24.2 51.3 C24.2 48.3 27.6 46.9 32 46.9 C36.4 46.9 39.8 48.3 39.8 51.3"/>
  <path d="M22.6 52.6 H41.4"/>
</g>
<g {FINE}>
  <path d="M20.3 29 H43.7"/>
  <circle cx="32" cy="43.8" r="1.7"/>
</g>
{dot(24.4, 31.8, 0.6)}{dot(27.6, 33.9, 0.6)}{dot(32, 34.7, 0.6)}{dot(36.4, 33.9, 0.6)}{dot(39.6, 31.8, 0.6)}
{dot(21.5, 52.6, 0.7)}{dot(42.5, 52.6, 0.7)}'''

icons["p2-tent"] = f'''
{sparkle(32, 4.8, 2.0)}
{sparkle(21.5, 14.5, 1.5)}{sparkle(43.5, 18, 1.2)}
{dot(38.5, 11, 0.6)}
<g {MAIN}>
  <path d="M32 9.5 C29.6 25 21.5 40.5 11.5 51"/>
  <path d="M32 9.5 C34.4 25 42.5 40.5 52.5 51"/>
  <path d="M11.5 51 H52.5"/>
  <path d="M29.1 51 V41 C29.1 37.6 30.3 36.1 32 34.9 C33.7 36.1 34.9 37.6 34.9 41 V51"/>
</g>
<g {FINE}>
  <path d="M32 9.5 C28.9 26 24.6 40 18.6 51"/>
  <path d="M32 9.5 C35.1 26 39.4 40 45.4 51"/>
  <path d="M32 9.5 C30.6 27 29.1 41 27.7 51"/>
  <path d="M32 9.5 C33.4 27 34.9 41 36.3 51"/>
  <path d="M29.1 44 C27.6 42.8 26.9 41.4 27 39.8"/>
  <path d="M34.9 44 C36.4 42.8 37.1 41.4 37 39.8"/>
</g>
{dot(9.3, 51, 0.75)}{dot(54.7, 51, 0.75)}'''

icons["p2-hand"] = f'''
{sparkle(31.5, 6.2, 2.1)}
{dot(24, 10.2, 0.6)}{dot(39, 10.2, 0.6)}
<g {MAIN}>
  <path d="M20.8 36 V25 A1.7 1.7 0 0 1 24.2 25 V31.5
           L24.9 31.5 V18 A1.7 1.7 0 0 1 28.3 18 V29.8
           L29 29.8 V15 A1.7 1.7 0 0 1 32.4 15 V29.8
           L33.1 29.8 V17.5 A1.7 1.7 0 0 1 36.5 17.5 V32
           C37.6 30.6 40.2 28 42 27.2 C43.8 26.4 45.1 27.9 44.2 29.7
           C43.1 31.9 40 34.6 38.6 37.6
           C37.7 39.7 38 42.6 35.9 45.2
           C33.5 48.1 27.9 48.7 24.5 46.9
           C21.3 45.1 20.8 40.3 20.8 36 Z"/>
</g>
<g {FINE}>
  <path d="M24.6 43.6 Q29.8 46.6 34.4 43.2"/>
</g>'''

HERE = pathlib.Path(__file__).parent
QA = HERE / "qa"
QA.mkdir(exist_ok=True)

SUBJ = ["lantern", "chalice", "tent", "hand"]
cells = []
for r, s in enumerate(SUBJ):
    cells.append(f'<g transform="translate(14 {14 + r*84})">{icons[f"p2-{s}"]}</g>')
sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 350" width="92" height="350" color="{GOLD}">'
         f'<rect width="92" height="350" fill="{INK}"/>' + "".join(cells) + '</svg>')
(QA / "sheet-p2.svg").write_text(sheet)
for name, inner in icons.items():
    (QA / f"{name}.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" color="{GOLD}">'
        f'<rect width="64" height="64" fill="{INK}"/>{inner}\n</svg>')
print("pass 2 written")

if len(sys.argv) > 1:
    OUT = pathlib.Path(sys.argv[1]) / "pass-2"
    OUT.mkdir(parents=True, exist_ok=True)
    for name, inner in icons.items():
        (OUT / f"{name}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{inner}\n</svg>')
    print("deliverables in", OUT)
