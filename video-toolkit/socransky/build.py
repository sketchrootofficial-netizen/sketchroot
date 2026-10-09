# Compose So-Cranky's Bar as one cutaway sketch, laid out like socransky/layout-ref.png:
#   left: the graffiti street wall (blue, yellow, green, purple complexes) above the street where the
#         two outsiders stand; middle: the door with So-Cranky handing out wristbands;
#   right: the orange main floor upstairs, the red basement VIP bar below; checkerboard pavement along the bottom.
# Run from video-toolkit/:  python3 socransky/build.py
# Out (git-ignored): socransky/building.jpg (colour), socransky/building_pencil.jpg (pencil under-drawing)
# Every number here is mirrored in beats.js (BOX); change both together.
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
import numpy as np, cv2, random

D = 'socransky/'
REF = Image.open(D + 'layout-ref.png').convert('RGB')
wall, floor, base = (Image.open(D + n + '.png').convert('RGB') for n in ('wall', 'floor', 'basement'))
S = 1882 / 750                     # reference → building scale for the parts taken from layout-ref.png
TOP, G = 150, 2032                 # roofline, ground line
LW, DW = 1672, 966                 # left column (wall) width, door column width
IX = LW + DW                       # interior x
W, H = IX + 1672, G + 230
B = Image.new('RGB', (W, H), (252, 251, 247))
d = ImageDraw.Draw(B)
INK = (39, 37, 37)
rnd = random.Random(7)

def bricks(box, colour_at, bh=46, bw=112):
    x0, y0, x1, y1 = box
    for r, y in enumerate(range(y0, y1, bh)):
        off = (bw // 2) * (r % 2)
        for x in range(x0 - off, x1, bw):
            c = np.array(colour_at(x + bw / 2, y + bh / 2), float) * rnd.uniform(.9, 1.08)
            d.rectangle((max(x, x0), y, min(x + bw, x1), min(y + bh, y1)), fill=tuple(np.clip(c, 0, 255).astype(int)),
                        outline=tuple((np.clip(c, 0, 255) * .5).astype(int)), width=3)

# roof parapet
bricks((0, 96, W, TOP), lambda x, y: (96, 88, 84), bh=27, bw=90)
d.line((0, TOP, W, TOP), fill=INK, width=6)

# street below the mural: the four colour bands run down the wall and fade into bare brick
band = [(0, 310, wall.crop((20, 500, 60, 540))), (310, 700, wall.crop((650, 500, 690, 540))),
        (700, 1340, wall.crop((1300, 500, 1330, 540))), (1340, LW, wall.crop((1620, 500, 1660, 540)))]
band = [(a, b, np.median(np.asarray(c).reshape(-1, 3), 0)) for a, b, c in band]
brick = np.array([140, 123, 112], float)
def street_colour(x, y):
    c = next(col for a, b, col in band if a <= x < b) if x < LW else brick
    t = np.clip((y - 1050) / 760, 0, 1) ** 1.2 * .9
    return c * (1 - t) + brick * t
MY = TOP + 900                     # bottom of the mural
bricks((0, MY, LW, G - 70), street_colour)
for _ in range(26):                # paint drips off the mural
    x = rnd.randint(10, LW - 10); col = tuple(street_colour(x, MY).astype(int)); L = rnd.randint(60, 260)
    d.line((x, MY, x, MY + L), fill=col, width=rnd.randint(6, 14)); d.ellipse((x - 8, MY + L - 8, x + 8, MY + L + 8), fill=col)
bricks((0, G - 70, LW, G), lambda x, y: (150, 146, 140), bh=35, bw=150)   # kerb stones

# mural (the detailed street wall, without its own pavement strip)
B.paste(wall.crop((0, 0, 1672, 900)), (0, TOP))
d.rectangle((0, TOP, LW, MY), outline=INK, width=6)

# door column from the reference: sign, So-Cranky with his clipboard and wristbands, velvet ropes
door = REF.crop((395, 90, 780, 840)).resize((DW, G - TOP), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 80, 2))
B.paste(door, (LW, TOP))

# interior: orange main floor upstairs, red basement below
B.paste(floor, (IX, TOP)); B.paste(base, (IX, TOP + 941))
d.rectangle((IX, TOP, W - 1, G), outline=INK, width=8); d.line((IX, TOP + 941, W, TOP + 941), fill=INK, width=8)

# the two outsiders (no wristband), cut out of the reference by their ink outlines
c = cv2.cvtColor(np.asarray(REF.crop((0, 440, 345, 832))), cv2.COLOR_RGB2BGR)
h, w = c.shape[:2]
ff = cv2.dilate(((cv2.cvtColor(c, cv2.COLOR_BGR2GRAY) < 70) * 255).astype(np.uint8), np.ones((3, 3), np.uint8))
m = np.zeros((h + 2, w + 2), np.uint8)
for s in [(0, 0), (w - 1, 0), (5, h // 2), (w - 1, h // 3), (w // 2, 0)] + [(x, h - 1) for x in range(0, w, 6)] + [(x, h - 12) for x in range(0, w, 6)]:
    if ff[s[1], s[0]] == 0: cv2.floodFill(ff, m, s, 128)
fg = (ff != 128).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
keep = np.isin(lab, [i for i in range(1, n) if st[i, 4] > 4000]).astype(np.uint8)
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
for poly in ([(205, 276), (234, 270), (234, 342), (176, 342), (176, 318), (200, 300)],
             [(0, 280), (26, 280), (26, 320), (72, 316), (84, 346), (0, 346)], [(318, 296), (345, 296), (345, 392), (322, 392)]):
    cv2.fillPoly(keep, [np.array(poly, np.int32)], 0)
outs = Image.fromarray(np.dstack([np.asarray(REF.crop((0, 440, 345, 832))), keep * 255]), 'RGBA')
outs = outs.resize((round(w * S), round(h * S)), Image.LANCZOS)
OX, OY = 700, G + 12 - outs.height
B.paste(outs, (OX, OY), outs)

# checkerboard pavement
sq = 115
for r, y in enumerate(range(G, H, sq)):
    for k, x in enumerate(range(0, W, sq)):
        d.rectangle((x, y, x + sq, y + sq), fill=INK if (k + r) % 2 else (236, 232, 222))
d.line((0, G, W, G), fill=INK, width=6)

# name tags in the scenes' style (white card, ink border, block capitals)
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def tag(text, cx, cy, ang=-3, size=46):
    f = ImageFont.truetype(FB, size); tw = int(ImageDraw.Draw(B).textlength(text, font=f))
    t = Image.new('RGBA', (tw + 60, size + 44), (0, 0, 0, 0)); g = ImageDraw.Draw(t)
    g.rounded_rectangle((4, 4, tw + 54, size + 38), 8, fill=(250, 248, 240, 255), outline=INK + (255,), width=5)
    g.text((30, 14), text, font=f, fill=INK + (255,))
    t = t.rotate(ang, expand=True, resample=Image.BICUBIC); B.paste(t, (cx - t.width // 2, cy - t.height // 2), t)
tag('S. NOXIA', 1010, 1985, 3)
tag('A. ACTINO B', 1420, 1985, -2)
tag('SO-CRANKY', 2210, 1985, -2)

B.save(D + 'building.jpg', quality=92)

# pencil: colour-dodge of grey over its blurred negative, lines darkened a little
g = np.asarray(ImageOps.grayscale(B), dtype=np.float32)
bl = np.asarray(ImageOps.grayscale(B).filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)
dodge = np.clip(g * 255 / np.maximum(1, bl), 0, 255)
dodge = np.clip(255 - (255 - dodge) * 1.6, 0, 255)
paper, ink = np.array([252, 251, 247], np.float32), np.array([42, 36, 34], np.float32)
Image.fromarray((ink + (paper - ink) * (dodge / 255.0)[..., None]).astype(np.uint8)).save(D + 'building_pencil.jpg', quality=90)
print('building', B.size)
