#!/usr/bin/env python3
"""Round-based icon generation via gpt-image-1. Reads OPENAI_API_KEY from env.
Usage: imagegen.py <round-dir> then edit PROMPTS below per round."""
import base64, json, os, pathlib, subprocess, sys

def load_key():
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    env = pathlib.Path("/Users/chante/Documents/Glaum/website/glaum-camp-website/.env.local")
    for line in env.read_text().splitlines():
        if line.startswith("OPENAI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no OPENAI_API_KEY found")

KEY = load_key()

STYLE = (
    "Fine-line engraving style icon, delicate hairline linework with tapered strokes, "
    "ornamental four-pointed sparkle stars and tiny dots, subtle art-nouveau filigree, "
    "elegant elongated proportions, perfectly symmetrical and balanced composition, centered "
    "with generous margins. Pure black line art on a plain white background — no shading, "
    "no gradients, no gray tones, no cross-hatching fills, no text. The aesthetic of an "
    "antique ex-libris bookplate engraving crossed with celestial tarot ornament."
)

PROMPTS = {
    "hand": "A single open raised hand, palm forward, slender elongated fingers, "
            "a small four-pointed star set in the palm and delicate rays above the fingertips. " + STYLE,
    "chalice": "A single ceremonial chalice with a three-tongued flame rising from it, "
               "a dotted swag ornament under the rim and a slender knopped stem. " + STYLE,
}

N = 2
outdir = pathlib.Path(sys.argv[1]); outdir.mkdir(parents=True, exist_ok=True)

for name, prompt in PROMPTS.items():
    body = json.dumps({
        "model": "gpt-image-1", "prompt": prompt, "n": N,
        "size": "1024x1024", "quality": "medium",
    })
    bodyfile = outdir / f".{name}-req.json"
    bodyfile.write_text(body)
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "300",
         "https://api.openai.com/v1/images/generations",
         "-H", f"Authorization: Bearer {KEY}",
         "-H", "Content-Type: application/json",
         "-d", f"@{bodyfile}"],
        capture_output=True, text=True)
    bodyfile.unlink()
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        print(name, "curl failed:", r.stderr[:300], r.stdout[:300]); continue
    if "error" in data:
        print(name, "API error:", data["error"].get("message", "")[:400]); continue
    for i, img in enumerate(data["data"]):
        p = outdir / f"{name}-{i+1}.png"
        p.write_bytes(base64.b64decode(img["b64_json"]))
        print("saved", p)
