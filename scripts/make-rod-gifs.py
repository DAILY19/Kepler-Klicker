"""
make-rod-sprites.py
Generates individual transparent PNG frames from fishingRodSprites.png.

Each animation gets its own subfolder of per-frame PNGs.
JS animates by swapping <img src> — no canvas, no clip-div needed.

Output: assets/rod/{name}/frame-{N}.png  -- individual RGBA frames
        assets/rod/{name}-icon.png        -- first frame (for button icons)

Usage:
  python scripts/make-rod-gifs.py
  python scripts/make-rod-gifs.py --scale 6
"""

import os
import sys
import argparse
from PIL import Image

SPRITE_W = 64
SPRITE_H = 64
COLS     = 12
WHITE_THRESH = 230
DEFAULT_SCALE = 4

ANIMATIONS = [
    (0, "antic",    100),
    (1, "cast",      70),
    (2, "idle-out", 180),
    (3, "idle-in",  220),
    (4, "set-hook",  70),
    (5, "reel",     110),
    (6, "catch",    140),
]

SHEET_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "assets", "source", "FISHING ROD", "fishingRodSprites.png"
)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "rod")


def make_transparent(img):
    img = img.convert("RGBA")
    cleaned = [
        (r, g, b, 0) if a > 0 and r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH
        else (r, g, b, a)
        for r, g, b, a in img.getdata()
    ]
    img.putdata(cleaned)
    return img


def has_content(sheet, col, row):
    x, y = col * SPRITE_W, row * SPRITE_H
    tile = sheet.crop((x, y, x + SPRITE_W, y + SPRITE_H))
    return sum(1 for _, _, _, a in tile.getdata() if a > 10) > 30


def crop_frame(sheet, col, row):
    x, y = col * SPRITE_W, row * SPRITE_H
    return sheet.crop((x, y, x + SPRITE_W, y + SPRITE_H))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=DEFAULT_SCALE)
    args = parser.parse_args()

    if not os.path.exists(SHEET_PATH):
        print(f"ERROR: Sprite sheet not found:\n  {SHEET_PATH}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    print("Loading sprite sheet...")
    sheet = Image.open(SHEET_PATH)
    sheet = make_transparent(sheet)
    fw = SPRITE_W * args.scale
    fh = SPRITE_H * args.scale
    print(f"  {sheet.width}x{sheet.height} px -> each frame {fw}x{fh} px (scale {args.scale}x)")

    for row_idx, name, delay in ANIMATIONS:
        frames = []
        for col in range(COLS):
            if has_content(sheet, col, row_idx):
                raw = crop_frame(sheet, col, row_idx)
                scaled = raw.resize((fw, fh), Image.NEAREST)
                frames.append(scaled)

        if not frames:
            print(f"  [skip] {name} -- no content in row {row_idx}")
            continue

        # Individual frame PNGs in a subfolder
        frame_dir = os.path.join(OUT_DIR, name)
        os.makedirs(frame_dir, exist_ok=True)
        for i, frame in enumerate(frames):
            frame.save(os.path.join(frame_dir, f"frame-{i}.png"), "PNG")

        # First-frame icon at top level (for button images)
        frames[0].save(os.path.join(OUT_DIR, f"{name}-icon.png"), "PNG")

        print(f"  [{row_idx}] {name}/ -- {len(frames)} frames @ {delay}ms  ({fw}x{fh}px each)")

    print(f"\nDone! Individual frame PNGs in {OUT_DIR}")


if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()
