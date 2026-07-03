#!/usr/bin/env python3
"""Strike a new icon in the Regal Register (design-philosophy.md §7 verdict 9).

The method that produced the installed icon set (commit 2ad9ef1): gpt-image-1's
EDITS endpoint, anchored to files we already love instead of re-describing taste
in text. The raised hand (public/asset-library/icons/raised-hand.webp) rides
along as the STYLE anchor — its smooth sculpted regal gold is the standard —
and, when refining existing art, the subject's own image rides along as the
GEOMETRY anchor. The raw strike is then keyed transparent (the baked
ink-aubergine background lifts out; interior cutouts go transparent by design),
cropped to the subject +7% margin, capped at 800px, and saved as webp q92 —
the library convention.

Usage:
  # New subject from a description (style anchor only):
  scripts/strike-icon.py crescent-moon "a crescent moon"

  # Re-strike existing art into the regal metal (style + geometry anchors):
  scripts/strike-icon.py ornate-urn "a ceremonial urn with two curled handles" \
      --geometry public/asset-library/icons/ornate-urn.webp

  # Surgical fix — your text becomes the whole instruction (see regal_fix.py
  # in the design-exploration archive for the proven "Reproduce EXACTLY ...
  # No other change." phrasing):
  scripts/strike-icon.py lantern "Reproduce the object in the second image \
      EXACTLY ... but open the space between flame and cage to dark \
      background. Nothing else changes." --geometry out/lantern.png --verbatim

  # When it's blessed, install into the app's library:
  scripts/strike-icon.py flame "a three-tongued flame" --install

Review the raw strike (NAME.png) and the processed cutout (NAME.webp) in the
output dir before installing — never install unseen. Cutout law: "a little bit
goes a long way."
"""
import argparse
import base64
import json
import os
import pathlib
import subprocess
import sys
import time

REPO = pathlib.Path(__file__).resolve().parent.parent
ICONS = REPO / "public" / "asset-library" / "icons"
DEFAULT_STYLE_ANCHOR = ICONS / "raised-hand.webp"

# The regal register, frozen from the blessed batch. Do not stack intensifiers.
STYLE = ("the EXACT material and rendering style of the first image: smooth sculpted "
         "regal gold, soft embossed dimensionality, gentle rim lighting, clean elegant "
         "polish — NOT rough or hammered texture, NOT flat graphic, NOT glossy plastic. "
         "Deep ink-aubergine (#1A0A24) background, centered, generous margins, no text.")


def load_key():
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key
    env = REPO / ".env.local"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("OPENAI_API_KEY not found (env var or .env.local)")


def mime_type_suffix(path: pathlib.Path) -> str:
    # curl -F infers most types, but .webp uploads need the type spelled out or
    # the API rejects them as application/octet-stream.
    return ";type=image/webp" if path.suffix.lower() == ".webp" else ""


def strike(key, prompt, style_anchor, geometry, dest, quality):
    args = ["curl", "-sS", "--max-time", "300",
            "https://api.openai.com/v1/images/edits",
            "-H", f"Authorization: Bearer {key}",
            "-F", "model=gpt-image-1",
            "-F", f"image[]=@{style_anchor}{mime_type_suffix(style_anchor)}"]
    if geometry:
        args += ["-F", f"image[]=@{geometry}{mime_type_suffix(geometry)}"]
    args += ["-F", f"prompt={prompt}", "-F", "size=1024x1024", "-F", f"quality={quality}"]
    r = subprocess.run(args, capture_output=True, text=True)
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        return r.stderr[:300] or "no response"
    if "error" in data:
        return data["error"].get("message", "unknown API error")[:300]
    dest.write_bytes(base64.b64decode(data["data"][0]["b64_json"]))
    return None


def key_out(img, np, Image):
    """Baked background -> transparent RGBA (bg = median of the 40px corners)."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    c = np.concatenate([a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3),
                        a[-40:, :40].reshape(-1, 3), a[-40:, -40:].reshape(-1, 3)])
    bg = np.median(c, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    lo, hi = 26.0, 72.0
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1)
    return Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA")


def crop_margin(img, np, frac=0.07):
    alpha = np.asarray(img.getchannel("A"))
    ys, xs = np.nonzero(alpha > 24)
    if not len(ys):
        return img
    m = int(max(ys.max() - ys.min(), xs.max() - xs.min()) * frac)
    return img.crop((max(0, xs.min() - m), max(0, ys.min() - m),
                     min(img.width, xs.max() + m), min(img.height, ys.max() + m)))


def process(raw_png, dest_webp):
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        sys.exit("processing needs numpy + Pillow: pip3 install numpy Pillow")
    img = key_out(Image.open(raw_png), np, Image)
    img = crop_margin(img, np)
    # Finish on the app's standard icon frame (lib/icon-image.ts convention —
    # the same normalization every uploaded icon gets): artwork diagonal scaled
    # to a fixed target, centered on a transparent 1536x1024 canvas, so every
    # icon reaches equally far toward the site's circular clips. Keep in sync
    # with scripts/normalize-assets.py.
    FRAME_W, FRAME_H, TARGET_DIAGONAL, MAX_SIDE = 1536, 1024, 1060, 980
    cw, ch = img.size
    factor = min(TARGET_DIAGONAL / (cw**2 + ch**2) ** 0.5, MAX_SIDE / max(cw, ch))
    img = img.resize((max(1, round(cw * factor)), max(1, round(ch * factor))),
                     Image.LANCZOS)
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    frame.paste(img, ((FRAME_W - img.width) // 2, (FRAME_H - img.height) // 2), img)
    frame.save(dest_webp, "WEBP", quality=92)
    return img.size


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("name", help="output stem, e.g. crescent-moon")
    ap.add_argument("description", help="the subject (or, with --verbatim, the whole instruction)")
    ap.add_argument("--geometry", type=pathlib.Path,
                    help="geometry anchor image — the subject's own existing artwork")
    ap.add_argument("--style-anchor", type=pathlib.Path, default=DEFAULT_STYLE_ANCHOR,
                    help="style anchor image (default: the raised hand, THE standard)")
    ap.add_argument("--out", type=pathlib.Path, default=pathlib.Path("strikes"),
                    help="output dir for raw png + processed webp (default: ./strikes)")
    ap.add_argument("--install", action="store_true",
                    help=f"also write the processed webp to {ICONS}/NAME.webp")
    ap.add_argument("--verbatim", action="store_true",
                    help="use the description as the full prompt (surgical fixes); "
                         "only the background clause is appended")
    ap.add_argument("--quality", default="medium", choices=["low", "medium", "high"])
    args = ap.parse_args()

    for f in [args.style_anchor] + ([args.geometry] if args.geometry else []):
        if not f.exists():
            sys.exit(f"missing anchor: {f}")

    if args.verbatim:
        prompt = (f"{args.description} Deep ink-aubergine (#1A0A24) background, "
                  "centered, no text.")
    elif args.geometry:
        prompt = (f"Render {args.description}, keeping its shape and proportions, "
                  f"in {STYLE}")
    else:
        prompt = f"Render {args.description} in {STYLE}"

    args.out.mkdir(parents=True, exist_ok=True)
    raw = args.out / f"{args.name}.png"
    key = load_key()
    err = None
    for attempt in (1, 2):
        err = strike(key, prompt, args.style_anchor, args.geometry, raw, args.quality)
        if err is None:
            break
        print(f"attempt {attempt} failed: {err}", file=sys.stderr)
        time.sleep(15)
    if err is not None:
        sys.exit("strike failed")

    webp = args.out / f"{args.name}.webp"
    size = process(raw, webp)
    print(f"raw strike:  {raw}")
    print(f"processed:   {webp}  {size[0]}x{size[1]}")

    if args.install:
        installed = ICONS / f"{args.name}.webp"
        if installed == args.style_anchor:
            sys.exit("refusing to overwrite the style anchor")
        process(raw, installed)
        print(f"installed:   {installed}  (register it in lib/asset-library.ts)")


if __name__ == "__main__":
    main()
