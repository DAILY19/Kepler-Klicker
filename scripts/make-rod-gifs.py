"""
make-rod-gifs.py
Slice fishingRodSprites.png into clean animated GIFs with transparent backgrounds.

Sprite sheet layout (from 0_readMe.txt):
  Total: 768x512 px  |  Each frame: 64x64 px  |  12 cols x 8 rows

  Row 0 - Preparing to cast   -> antic.gif
  Row 1 - Casting rod          -> cast.gif
  Row 2 - Idle, hook out (loop)-> idle-out.gif
  Row 3 - Idle, hook in (loop) -> idle-in.gif
  Row 4 - Setting the hook     -> set-hook.gif
  Row 5 - Reeling (loop)       -> reel.gif
  Row 6 - Catching / pulling   -> catch.gif
  Row 7 - Single sprite        -> (skipped)

Usage:
  python scripts/make-rod-gifs.py
  python scripts/make-rod-gifs.py --scale 6   # 6x upscale (384px)
"""

import os
import sys
import argparse
from PIL import Image

# ── Config ─────────────────────────────────────────────────────────────────────

SPRITE_W = 64
SPRITE_H = 64
COLS     = 12   # 768 / 64
ROWS     = 8    # 512 / 64

# White threshold – pixels with all channels >= this are treated as background
WHITE_THRESH = 230

# Near-black "magic" colour used as the GIF transparent index.
# Must NOT appear in the actual artwork (rod is grey/red/white).
MAGIC = (0, 0, 0)

# Scale factor applied to every frame (pixel-art upscale, nearest-neighbour)
DEFAULT_SCALE = 4  # 64 → 256 px

# (row, output_name, frame_delay_ms, loops) – loops=0 means infinite
ANIMATIONS = [
    (0, "antic",    100, 0),
    (1, "cast",      70, 0),
    (2, "idle-out", 180, 0),
    (3, "idle-in",  220, 0),
    (4, "set-hook",  70, 0),
    (5, "reel",     110, 0),
    (6, "catch",    140, 0),
]

SHEET_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "assets", "source", "FISHING ROD", "fishingRodSprites.png"
)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "rod")

# ── Helpers ────────────────────────────────────────────────────────────────────

def make_transparent(img: Image.Image) -> Image.Image:
    """Return a copy with near-white pixels set to alpha=0."""
    img = img.convert("RGBA")
    pixels = list(img.getdata())
    cleaned = []
    for r, g, b, a in pixels:
        if r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH:
            cleaned.append((255, 255, 255, 0))
        else:
            cleaned.append((r, g, b, 255))
    img.putdata(cleaned)
    return img


def has_content(sheet: Image.Image, col: int, row: int) -> bool:
    """Return True if this 64×64 cell contains non-transparent pixels."""
    x, y = col * SPRITE_W, row * SPRITE_H
    tile = sheet.crop((x, y, x + SPRITE_W, y + SPRITE_H))
    visible = sum(1 for _, _, _, a in tile.getdata() if a > 10)
    return visible > 30


def crop_frame(sheet: Image.Image, col: int, row: int) -> Image.Image:
    x, y = col * SPRITE_W, row * SPRITE_H
    return sheet.crop((x, y, x + SPRITE_W, y + SPRITE_H))


def rgba_to_gif_frame(rgba: Image.Image, scale: int) -> tuple[Image.Image, int]:
    """
    Convert an RGBA frame to a palette image suitable for GIF export.
    Returns (palette_image, transparent_palette_index).

    Strategy:
      1. Scale up (nearest-neighbour) for crisp pixel art.
      2. Paste onto a solid MAGIC-coloured background so transparent areas
         get that exact RGB value.
      3. Quantise to 255 colours, leaving index 0 reserved.
      4. Scan the palette to find the index that maps closest to MAGIC —
         that index becomes the transparent colour.
    """
    size = (rgba.width * scale, rgba.height * scale)
    rgba = rgba.resize(size, Image.NEAREST)

    # Build RGB image: transparent → MAGIC colour
    bg = Image.new("RGB", size, MAGIC)
    bg.paste(rgba.convert("RGB"), mask=rgba.split()[3])

    # Quantise to palette (255 colours; index 0 left for transparency)
    p_img = bg.quantize(colors=255)

    # Find palette index closest to MAGIC
    palette = p_img.getpalette()  # flat [R,G,B, R,G,B, ...]
    num_entries = len(palette) // 3
    mr, mg, mb = MAGIC
    best_idx = 0
    best_dist = float("inf")
    for i in range(num_entries):
        r, g, b = palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]
        dist = (r - mr) ** 2 + (g - mg) ** 2 + (b - mb) ** 2
        if dist < best_dist:
            best_dist = dist
            best_idx = i

    return p_img, best_idx


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=DEFAULT_SCALE,
                        help=f"Upscale factor (default {DEFAULT_SCALE}×)")
    args = parser.parse_args()

    if not os.path.exists(SHEET_PATH):
        print(f"ERROR: Sprite sheet not found at:\n  {SHEET_PATH}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Loading sprite sheet…")
    sheet = Image.open(SHEET_PATH)
    sheet = make_transparent(sheet)
    print(f"  {sheet.width}×{sheet.height} px, {COLS} cols × {ROWS} rows → "
          f"each frame {SPRITE_W}×{SPRITE_H} px → output {SPRITE_W * args.scale}×{SPRITE_H * args.scale} px")

    for row_idx, name, delay, loops in ANIMATIONS:
        frames_rgba = []
        for col in range(COLS):
            if has_content(sheet, col, row_idx):
                frames_rgba.append(crop_frame(sheet, col, row_idx))

        if not frames_rgba:
            print(f"  [skip] Row {row_idx} ({name}) — no content found")
            continue

        # Convert all frames to palette mode
        gif_frames = []
        trans_idx  = 0
        for f in frames_rgba:
            p, tidx = rgba_to_gif_frame(f, args.scale)
            gif_frames.append(p)
            trans_idx = tidx  # same for every frame (same palette search logic)

        out_path = os.path.join(OUT_DIR, f"{name}.gif")
        gif_frames[0].save(
            out_path,
            save_all=True,
            append_images=gif_frames[1:],
            duration=delay,
            loop=loops,
            transparency=trans_idx,
            disposal=2,        # clear each frame before drawing next
            optimize=False,
        )
        print(f"  [{row_idx}] {name}.gif  — {len(gif_frames)} frames @ {delay} ms/frame  →  {out_path}")

    print("\nDone! All GIFs written to assets/rod/")


if __name__ == "__main__":
    main()
