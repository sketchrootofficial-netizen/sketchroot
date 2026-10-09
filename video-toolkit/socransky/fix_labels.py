# One-off fixes to the AI-generated scenes (run from video-toolkit/, on the original images):
#  - wall.png: the streptococci bubble said "CRAVES LACTATE" (they make lactate; Veillonella eats it) -> "CRAVES SUGAR"
#  - basement.png: P. gingivalis's bottle had garbled text -> "HEME"
# python3 socransky/fix_labels.py stills/wall_orig.png stills/base_orig.png
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
LABEL_X, LABEL_Y, LABEL_ANGLE = 228, 402, -22
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(sz):
    try: return ImageFont.truetype(FB, sz)
    except OSError: return ImageFont.load_default()
def med(im, box, keep=lambda a: np.ones(len(a), bool)):
    a = np.asarray(im.crop(box)).reshape(-1, 3).astype(int); a = a[keep(a)]; return tuple(int(v) for v in np.median(a, 0))
isred = lambda a: (a[:, 0] > 150) & (a[:, 1] < 90) & (a[:, 2] < 90)
iscream = lambda a: a.min(1) > 175

w = Image.open(sys.argv[1]).convert('RGB'); d = ImageDraw.Draw(w)
cream = med(w, (470, 50, 580, 125), iscream)
d.rounded_rectangle((463, 55, 548, 103), 10, fill=cream)           # old text
d.rounded_rectangle((543, 80, 588, 119), 12, fill=cream)           # lactate dots
f = font(19)
for txt, y in (('CRAVES', 58), ('SUGAR', 80)):
    tw = d.textlength(txt, font=f); d.text((512 - tw / 2, y), txt, font=f, fill=(25, 22, 20))
for x, y in ((550, 104), (566, 98), (572, 110)):                    # three sugar cubes
    d.rectangle((x, y, x + 10, y + 10), fill=(255, 255, 255), outline=(25, 22, 20), width=2)
w.save('socransky/wall.png')

b = Image.open(sys.argv[2]).convert('RGB')
# a fresh cream sticker label over the old one, tilted with the bottle
L = Image.new('RGBA', (118, 66), (0, 0, 0, 0)); g = ImageDraw.Draw(L)
g.rounded_rectangle((2, 2, 115, 63), 8, fill=(244, 232, 205, 255), outline=(20, 16, 14, 255), width=3)
g.rectangle((5, 5, 22, 60), fill=(200, 30, 30, 255))
g.text((30, 10), 'HEME', font=font(25), fill=(20, 16, 14, 255))
g.ellipse((60, 42, 72, 56), fill=(200, 30, 30, 255)); g.polygon([(61, 46), (71, 46), (66, 36)], fill=(200, 30, 30, 255))
L = L.rotate(LABEL_ANGLE, expand=True, resample=Image.BICUBIC)
b.paste(L, (LABEL_X - L.width // 2, LABEL_Y - L.height // 2), L)
b.save('socransky/basement.png')
