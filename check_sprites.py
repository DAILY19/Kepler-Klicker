from PIL import Image
import os, glob

def check_bg(path):
    try:
        img = Image.open(path).convert("RGBA")
        # Sample 4 corners
        w, h = img.size
        corners = [img.getpixel((0,0)), img.getpixel((w-1,0)), img.getpixel((0,h-1)), img.getpixel((w-1,h-1))]
        # Check if any corner is NOT transparent and NOT fully opaque meaningful color
        has_opaque_bg = any(c[3] > 10 and c[:3] in [(0,0,0),(255,255,255)] for c in corners)
        all_opaque = all(c[3] == 255 for c in corners)
        mode = img.mode
        return f"{path}: corners={corners[:2]}... opaque_bg={has_opaque_bg} all_corners_opaque={all_opaque}"
    except Exception as e:
        return f"{path}: ERROR {e}"

paths = (
    glob.glob("assets/fish/*.png") +
    glob.glob("assets/ui/*.png") +
    glob.glob("assets/rod/*-icon.png") +
    glob.glob("pixel ocean/*.png")
)
for p in sorted(paths):
    print(check_bg(p))
