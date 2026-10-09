# Stack the three So-Cranky's Bar scenes into one building and make its pencil version.
# Run from video-toolkit/:  python3 socransky/build.py
# Out: socransky/building.jpg (colour) and socransky/building_pencil.jpg (pencil under-drawing)
from PIL import Image, ImageFilter, ImageOps, ImageChops
import numpy as np

D = 'socransky/'
parts = [Image.open(D + n + '.png').convert('RGB') for n in ('wall', 'floor', 'basement')]
W, H = parts[0].size
b = Image.new('RGB', (W, H * 3))
for i, p in enumerate(parts):
    b.paste(p, (0, H * i))
b.save(D + 'building.jpg', quality=92)

# pencil: colour-dodge of grey over its blurred negative, then darken the lines a little
g = np.asarray(ImageOps.grayscale(b), dtype=np.float32)
inv = 255 - np.asarray(ImageOps.grayscale(b).filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)
inv = 255 - inv
dodge = np.clip(g * 255 / np.maximum(1, 255 - (255 - inv)), 0, 255)
dodge = np.clip(255 - (255 - dodge) * 1.6, 0, 255)
paper = np.array([252, 251, 247], dtype=np.float32)
ink = np.array([42, 36, 34], dtype=np.float32)
k = (dodge / 255.0)[..., None]
out = (ink + (paper - ink) * k).astype(np.uint8)
Image.fromarray(out).save(D + 'building_pencil.jpg', quality=90)
print('building', b.size)
