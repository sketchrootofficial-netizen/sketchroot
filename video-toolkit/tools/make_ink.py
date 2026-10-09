"""Extract the ink line-art of a sketch (for the pencil draw-on intro).

usage: python tools/make_ink.py <scene.png> <out_ink.png> [width]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
im = Image.open(sys.argv[1]).convert('L')
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
im = im.resize((W, int(im.height * W / im.width)), Image.LANCZOS)
a = np.asarray(im).astype(float)
blur = np.asarray(im.filter(ImageFilter.GaussianBlur(5))).astype(float)
ink = (a < blur - 24) & (a < 120)  # dark, locally-contrasting pixels = ink lines
Image.fromarray(np.where(ink, 0, 255).astype('uint8')).filter(ImageFilter.MedianFilter(3)).save(sys.argv[2])
print('ink coverage', round(ink.mean(), 3))
