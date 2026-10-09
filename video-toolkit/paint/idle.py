"""Idle-life animation for Ramu's Kada.

Each character is its own layer cut from the original art (pixel-perfect, no
redrawing) and gets small, looping motion: breathing, sway, a tail flick, a
sip. Atmosphere is added on top: geyser steam, lamp flicker, floating dust.
All periods divide LOOP so the clip loops seamlessly.

usage: idle.py <out.mp4> [seconds] [width]
"""
import sys, json, math, subprocess
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

LOOP = 12.0
SRC = Image.open('ramus/ramus.png').convert('RGBA')
BG = Image.open('paint/background_empty.png').convert('RGBA')
W, H = SRC.size
TAU = 2 * math.pi

def layer(name):
    m = Image.open(f'paint/mask_{name}.png').convert('L').filter(ImageFilter.GaussianBlur(0.7))
    bb = m.getbbox(); pad = 14
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(W, bb[2] + pad), min(H, bb[3] + pad))
    rgba = SRC.crop(bb).copy(); rgba.putalpha(m.crop(bb))
    return {'img': rgba, 'x': bb[0], 'y': bb[1]}

# breathing period P (s), amplitude a, sway degrees s with period Ps, phase
CHAR = {
    'ramu':     dict(P=4.0, a=.010, s=.5, Ps=6.0, ph=.3),
    'abkari':   dict(P=3.0, a=.008, s=.3, Ps=4.0, ph=1.1),
    'hulligan': dict(P=3.0, a=.013, s=.7, Ps=6.0, ph=2.0),
    'blair':    dict(P=4.0, a=.010, s=.5, Ps=6.0, ph=.7),
    'cat':      dict(P=2.4, a=.012, s=.4, Ps=4.0, ph=1.7),
    'trauma':   dict(P=4.0, a=.008, s=.3, Ps=6.0, ph=2.6),
    'hugo':     dict(P=2.4, a=.016, s=.5, Ps=3.0, ph=.2, bob=2.0),
    'dal':      dict(P=4.0, a=.010, s=.8, Ps=6.0, ph=1.4),
    'hen':      dict(P=2.0, a=.012, s=.3, Ps=4.0, ph=.9),
}
ORDER = ['ramu', 'abkari', 'hulligan', 'blair', 'cat', 'trauma', 'hugo', 'dal', 'hen']
L = {k: layer(k) for k in ORDER}

def local_warp(arr, fn):
    """Inverse-map warp of a small RGBA array: fn(xx,yy) -> (sx,sy) source coords."""
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    sx, sy = fn(xx, yy)
    out = np.empty_like(arr)
    for c in range(4):
        out[..., c] = ndimage.map_coordinates(arr[..., c], [sy, sx], order=1, mode='nearest')
    return out

def bend(arr, ox, oy, base, tip, ang):
    """Rotate a limb (tail) about its base; motion grows toward the tip."""
    bx, by = base[0] - ox, base[1] - oy
    Lt = math.hypot(tip[0] - base[0], tip[1] - base[1])
    def fn(xx, yy):
        dx, dy = xx - bx, yy - by
        r = np.hypot(dx, dy)
        wgt = np.clip(r / Lt, 0, 1) * np.clip(1.6 - r / Lt, 0, 1)  # fades out past the tip
        # only the side of the base where the tail is
        side = np.clip(((tip[0] - base[0]) * dx + (tip[1] - base[1]) * dy) / (Lt * r + 1e-6), 0, 1)
        a = -ang * wgt * side
        return bx + dx * np.cos(a) - dy * np.sin(a), by + dx * np.sin(a) + dy * np.cos(a)
    return local_warp(arr, fn)

def nudge(arr, ox, oy, centre, radius, dx, dy):
    """Shift a soft circular region (a head) by (dx,dy)."""
    cx, cy = centre[0] - ox, centre[1] - oy
    def fn(xx, yy):
        wgt = np.clip(1 - np.hypot(xx - cx, yy - cy) / radius, 0, 1) ** 1.5
        return xx - dx * wgt, yy - dy * wgt
    return local_warp(arr, fn)

def char_frame(k, t):
    p = CHAR[k]; lay = L[k]; im = lay['img']
    arr = np.asarray(im)
    if k == 'cat':   # tail flick: two quick flicks then rest
        ang = math.radians(9) * math.sin(TAU * t / 2.0) * (0.6 + 0.4 * math.sin(TAU * t / 6.0))
        arr = bend(arr, lay['x'], lay['y'], (482, 458), (450, 424), ang)
    if k == 'hen':   # little sip: head dips, then lifts
        s = max(0, math.sin(TAU * t / 3.0)) ** 3
        arr = nudge(arr, lay['x'], lay['y'], (1402, 470), 34, 1.2 * s, 3.0 * s)
    im = Image.fromarray(arr)
    w, h = im.size
    br = math.sin(TAU * t / p['P'] + p['ph'])
    sy, sx = 1 + p['a'] * br, 1 - p['a'] * .35 * br
    rot = math.radians(p['s'] * math.sin(TAU * t / p['Ps'] + p['ph'] * 1.7))
    bob = p.get('bob', 0) * math.sin(TAU * t / p['P'] + p['ph'] + 1.2)
    px, py = w / 2, h  # pivot at the feet
    c, s_ = math.cos(rot), math.sin(rot)
    # inverse affine: output -> input, about the pivot
    a_ = c / sx; b_ = s_ / sx; d_ = -s_ / sy; e_ = c / sy
    cx_ = px - a_ * px - b_ * (py - bob)
    cy_ = py - d_ * px - e_ * (py - bob)
    out = im.transform((w, h), Image.AFFINE, (a_, b_, cx_, d_, e_, cy_), resample=Image.BICUBIC)
    return out, lay['x'], lay['y']

# ---- atmosphere ----
def soft_dot(r, col, alpha):
    s = int(r * 4); im = Image.new('RGBA', (s, s), col + (0,)); d = ImageDraw.Draw(im)
    d.ellipse((s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r), fill=col + (alpha,))
    return im.filter(ImageFilter.GaussianBlur(r * .6))
PUFF = [soft_dot(r, (245, 245, 245), 150) for r in range(6, 40)]
rng = np.random.default_rng(3)
STEAM = [dict(t0=i * LOOP / 20, x=rng.choice([892, 925, 908]) + rng.normal(0, 4), drift=rng.normal(0, 14)) for i in range(20)]
DUST = [dict(x=rng.uniform(380, 1500), y=rng.uniform(150, 600), r=rng.uniform(1.2, 2.6), ph=rng.uniform(0, 1)) for _ in range(46)]
GLOW = {'lantern': ((405, 113), 70, (255, 190, 90)), 'lamp': ((1716, 216), 90, (255, 200, 110))}

def atmosphere(canvas, t):
    for s in STEAM:  # rising, swelling, fading puffs over the geyser's open top
        life = ((t - s['t0']) % LOOP) / 3.2
        if life > 1: continue
        r = int(6 + 30 * life)
        y = 150 - 140 * life
        x = s['x'] + s['drift'] * life + 6 * math.sin(TAU * life * 1.5)
        im = PUFF[min(len(PUFF) - 1, r - 6)].copy()
        a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * (1 - life) ** 1.3 * min(1, life * 6)).astype('uint8')
        im = Image.fromarray(a); canvas.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2)))
    for name, ((x, y), r, col) in GLOW.items():  # flame flicker
        f = .55 + .2 * math.sin(TAU * t / 1.5) + .15 * math.sin(TAU * t / .6 + 1) + .1 * math.sin(TAU * t / .4 + 2)
        g = soft_dot(r, col, int(70 * f))
        canvas.alpha_composite(g, (int(x - g.width / 2), int(y - g.height / 2)))
    d = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); dd = ImageDraw.Draw(d)
    for p in DUST:  # slow drift up-and-across, wrapping each loop
        k = (t / LOOP + p['ph']) % 1
        x = p['x'] + 60 * k + 10 * math.sin(TAU * k * 3 + p['ph'] * 9)
        y = p['y'] - 90 * k
        a = int(140 * math.sin(math.pi * k))
        dd.ellipse((x - p['r'], y - p['r'], x + p['r'], y + p['r']), fill=(255, 240, 200, a))
    canvas.alpha_composite(d.filter(ImageFilter.GaussianBlur(.8)))

def frame(t):
    c = BG.copy()
    for k in ORDER:
        im, x, y = char_frame(k, t)
        c.alpha_composite(im, (x, y))
    atmosphere(c, t)
    return c

if __name__ == '__main__':
    out = sys.argv[1]; secs = float(sys.argv[2]) if len(sys.argv) > 2 else LOOP
    outw = int(sys.argv[3]) if len(sys.argv) > 3 else 1920
    outh = int(round(outw * H / W / 2) * 2)
    fps = 30
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{outw}x{outh}', '-r', str(fps), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(int(secs * fps)):
        f = frame(i / fps).convert('RGB').resize((outw, outh), Image.LANCZOS)
        ff.stdin.write(f.tobytes())
    ff.stdin.close(); ff.wait(); print('wrote', out)
