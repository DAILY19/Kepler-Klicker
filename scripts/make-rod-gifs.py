"""
make-rod-sprites.py
Generates transparent PNG sprite strips from fishingRodSprites.png.
GIFs have unreliable browser transparency -- we use RGBA PNGs instead.

Each output is a horizontal strip: all frames side-by-side.
The JS animator slices frames by offsetting the strip inside a clip container.

Output: assets/rod/{name}.png       -- horizontal RGBA strip
        assets/rod/{name}-icon.png  -- first frame only (for button icons)

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
        (255, 255, 255, 0) if r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH
        else (r, g, b, 255)
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

        # Horizontal strip: all frames side-by-side, RGBA transparent background
        strip = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
        for i, frame in enumerate(frames):
            strip.paste(frame, (i * fw, 0), frame)

        strip.save(os.path.join(OUT_DIR, f"{name}.png"), "PNG")
        frames[0].save(os.path.join(OUT_DIR, f"{name}-icon.png"), "PNG")

        print(f"  [{row_idx}] {name}.png -- {len(frames)} frames @ {delay}ms  ({fw * len(frames)}x{fh}px)")

    print(f"\nDone! PNG strips in {OUT_DIR}")


if __name__ == "__main__":
    main()
