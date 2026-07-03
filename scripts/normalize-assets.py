#!/usr/bin/env python3
"""Normalize built-in library art onto the app's standard icon frame.

Mirrors lib/icon-image.ts (`normalizeIconImage`) exactly — the pipeline every
UPLOADED icon already goes through: trim to the artwork's bounding box
(ignoring near-transparent and near-white pixels), scale so the box DIAGONAL
equals TARGET_DIAGONAL (side capped at MAX_SIDE), and center on a transparent
1536x1024 frame. Diagonal sizing equalizes how far each icon reaches toward a
circular clip's edge regardless of aspect ratio — the site's circle frames
(profile commitments, /roles emblems, Cabinet medals) and EventIcon's 1.5x
image scale are all tuned against this convention.

Usage: normalize-assets.py file.webp [file2.webp ...]   (in place, webp q92)
"""
import pathlib
import sys

import numpy as np
from PIL import Image

ICON_FRAME_W, ICON_FRAME_H = 1536, 1024
TARGET_DIAGONAL = 1060
MAX_SIDE = 980
ALPHA_FLOOR = 16
WHITE_CEIL = 245


def normalize(path: pathlib.Path) -> tuple[int, int]:
    im = Image.open(path).convert("RGBA")
    px = np.asarray(im)
    content = (px[..., 3] >= ALPHA_FLOOR) & ~(
        (px[..., 0] > WHITE_CEIL) & (px[..., 1] > WHITE_CEIL) & (px[..., 2] > WHITE_CEIL)
    )
    ys, xs = np.nonzero(content)
    if not len(ys):
        raise SystemExit(f"{path.name}: blank image")
    cropped = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    cw, ch = cropped.size
    factor = min(TARGET_DIAGONAL / (cw**2 + ch**2) ** 0.5, MAX_SIDE / max(cw, ch))
    scaled = cropped.resize((max(1, round(cw * factor)), max(1, round(ch * factor))),
                            Image.LANCZOS)
    frame = Image.new("RGBA", (ICON_FRAME_W, ICON_FRAME_H), (0, 0, 0, 0))
    frame.paste(scaled, ((ICON_FRAME_W - scaled.width) // 2,
                         (ICON_FRAME_H - scaled.height) // 2), scaled)
    frame.save(path, "WEBP", quality=92)
    return scaled.size


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for arg in sys.argv[1:]:
        p = pathlib.Path(arg)
        w, h = normalize(p)
        print(f"{p.name}: art {w}x{h} on {ICON_FRAME_W}x{ICON_FRAME_H}")
