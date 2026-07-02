#!/usr/bin/env python3
"""Icon lab pass 3 — sacred hands. Three candidates in the engraved-ornament
language, modeled on Chante's hands-left/right ink drawings and the badge hand.
Hairlines pushed finer: 1.05 main / 0.7 fine."""
import pathlib, sys

GOLD = "#C8A848"
INK = "#1A0A24"
MAIN = 'stroke="currentColor" stroke-width="1.05" fill="none" stroke-linecap="round" stroke-linejoin="round"'
FINE = 'stroke="currentColor" stroke-width="0.7" fill="none" stroke-linecap="round" stroke-linejoin="round"'

def sparkle(cx, cy, r, vstretch=1.4):
    rv = r * vstretch
    return (f'<path d="M{cx} {cy-rv} Q{cx+r*0.15} {cy-r*0.15} {cx+r} {cy} '
            f'Q{cx+r*0.15} {cy+r*0.15} {cx} {cy+rv} '
            f'Q{cx-r*0.15} {cy+r*0.15} {cx-r} {cy} '
            f'Q{cx-r*0.15} {cy-r*0.15} {cx} {cy-rv} Z" fill="currentColor"/>')

def dot(cx, cy, r=0.6):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="currentColor"/>'

icons = {}

# H1 — the reaching hand (from her ink drawings): three-quarter view,
# index extended toward a sparkle, others softly curled, sleeve cuff.
icons["h1-reaching"] = f'''
{sparkle(48.5, 8, 2.3)}
{dot(42, 4.5, 0.55)}{dot(53.5, 15.5, 0.55)}{dot(24, 14, 0.5)}
<g {MAIN}>
  <path d="M7.5 44.5 C13 39.5 17.5 36 21 33"/>
  <path d="M13.5 55.5 C18 50 21.5 46.5 25.5 42.5"/>
  <path d="M21 33 C24.5 29.5 27 26.5 29.5 23.5"/>
  <path d="M29.5 23.5 C32.5 19.5 35.8 14.5 38.8 10.8 C39.6 9.8 40.9 10.4 40.6 11.7 C38.2 16 35.8 19.6 33.6 22.6"/>
  <path d="M33.6 22.6 C35.9 19.9 38.6 16.4 40.5 13.9 C41.3 12.9 42.4 13.6 41.9 14.8 C40 17.9 37.4 21 35.2 23.6"/>
  <path d="M35.2 23.6 C36.5 24.7 36.3 26.2 34.8 26.7 C35.6 27.7 35 28.9 33.6 29.2"/>
  <path d="M33.6 29.2 C31.5 31.5 28.5 34.5 26.8 37 C26 38.6 25.7 40.5 25.5 42.5"/>
  <path d="M26.8 37 C29 35.4 31.2 34.5 33.4 34.3 C34.4 34.25 34.7 35.1 33.9 35.7"/>
</g>
<g {FINE}>
  <path d="M10.8 42.8 C13.8 44.6 16 47.6 16.8 51.2"/>
  <path d="M13.4 40.4 C16.4 42.2 18.6 45.2 19.4 48.8"/>
</g>'''

PALM_D = ("M21.55 35.5 V26 A1.55 1.55 0 0 1 24.65 26 V31.5 "
          "L25.6 31.5 V19 A1.55 1.55 0 0 1 28.7 19 V30 "
          "L29.75 30 V16 A1.55 1.55 0 0 1 32.85 16 V30 "
          "L33.9 30 V18.5 A1.55 1.55 0 0 1 37 18.5 V32.5 "
          "C38.1 31.3 40.2 29.1 41.8 28.3 C43.4 27.5 44.6 28.8 43.9 30.4 "
          "C42.9 32.5 40.2 34.7 39.1 37.4 "
          "C38.2 39.6 38.5 42.4 36.5 44.9 "
          "C34.2 47.6 29.4 48.2 26.2 46.5 "
          "C23.2 44.8 21.55 40.8 21.55 35.5 Z")

# H2 — the radiant palm: refined frontal hand, rays fanned above,
# sparkle set in the palm, cuff line. Sacred-icon composition.
icons["h2-radiant"] = f'''
<g {FINE}>
  <path d="M31.3 5 V10.5"/>
  <path d="M25 6.6 L27.1 11.6"/>
  <path d="M37.6 6.6 L35.5 11.6"/>
  <path d="M19.6 10 L23 13.8"/>
  <path d="M43 10 L39.6 13.8"/>
</g>
{sparkle(16.2, 17.5, 1.7)}{sparkle(46.4, 17.5, 1.7)}
{dot(20.6, 13.2, 0.55)}{dot(42, 13.2, 0.55)}
<g {MAIN}>
  <path d="{PALM_D}"/>
</g>
{sparkle(30.6, 38.6, 1.9)}
<g {FINE}>
  <path d="M25 44.3 Q30 47 34.5 43.9"/>
</g>
{dot(30.4, 51.5, 0.7)}'''

# H3 — reciprocity: two tiny hands reaching across the gap, spark between.
H3PALM = f'''<g {MAIN}><path d="{PALM_D}"/></g>
<g {FINE}><path d="M25 44.3 Q30 47 34.5 43.9"/></g>'''

icons["h3-reciprocity"] = f'''
{sparkle(32, 19.5, 2.3)}
{dot(26, 14.5, 0.55)}{dot(38, 14.5, 0.55)}{dot(32, 10.5, 0.5)}
<g transform="translate(3.5 18.8) scale(0.55)"><g transform="rotate(14 33 33)">{H3PALM}</g></g>
<g transform="translate(60.5 18.8) scale(-0.55 0.55)"><g transform="rotate(14 33 33)">{H3PALM}</g></g>'''

HERE = pathlib.Path(__file__).parent
QA = HERE / "qa"
QA.mkdir(exist_ok=True)

NAMES = list(icons)
cells = []
for r, n in enumerate(NAMES):
    cells.append(f'<g transform="translate(14 {14 + r*84})">{icons[n]}</g>')
sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 {14 + len(NAMES)*84}" width="92" height="{14 + len(NAMES)*84}" color="{GOLD}">'
         f'<rect width="92" height="{14 + len(NAMES)*84}" fill="{INK}"/>' + "".join(cells) + '</svg>')
(QA / "sheet-p3.svg").write_text(sheet)

if len(sys.argv) > 1:
    OUT = pathlib.Path(sys.argv[1]) / "pass-3-hands"
    OUT.mkdir(parents=True, exist_ok=True)
    for name, inner in icons.items():
        (OUT / f"{name}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{inner}\n</svg>')
    print("deliverables in", OUT)
print("pass 3 written")
