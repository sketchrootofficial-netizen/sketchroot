"""Procedural "painting replay" for one scene element.

Builds the element the way an artist would: pencil lines trace in, flat
colour goes on in broad brush strokes region by region, finer strokes add
detail, and the finished art settles in. Output is a folder of RGBA frames
the size of the element's bounding box, plus its position in the scene.

usage: painter.py <scene.png> <mask.png>[,<mask2.png>...] <out_dir> [frames]
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from skimage import measure, filters, morphology
from scipy import ndimage

rng = np.random.default_rng(7)
src = Image.open(sys.argv[1]).convert('RGB')
mask = np.zeros(src.size[::-1], bool)
for p in sys.argv[2].split(','):
    mask |= np.asarray(Image.open(p).convert('L')) > 127
out = sys.argv[3]; N = int(sys.argv[4]) if len(sys.argv) > 4 else 120
os.makedirs(out, exist_ok=True)

ys, xs = np.nonzero(mask); pad = 12
x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
x1, y1 = min(src.width, xs.max() + pad), min(src.height, ys.max() + pad)
img = np.asarray(src.crop((x0, y0, x1, y1))).astype(float)
M = mask[y0:y1, x0:x1]
H, W = M.shape
gray = img.mean(2)

# ---- pencil layer: ink lines, traced component by component ----
blur = ndimage.gaussian_filter(gray, 4)
ink = (gray < blur - 18) & (gray < 140) & morphology.binary_dilation(M, morphology.disk(2))
ink = morphology.remove_small_objects(ink, 6)
lab = measure.label(ink, connectivity=2)
props = sorted(measure.regionprops(lab), key=lambda r: (r.bbox[0] // 40, r.bbox[1]))
pencil_t = np.full((H, W), np.inf)
n = len(props)
for i, r in enumerate(props):
    start, dur = 0.02 + 0.30 * i / max(1, n), 0.05
    coords = r.coords
    d = np.hypot(*(coords - coords[0]).T)  # trace outward from first pixel
    d = d / (d.max() + 1e-6)
    pencil_t[coords[:, 0], coords[:, 1]] = start + dur * d

# ---- colour strokes: coarse pass by colour region, then a fine pass ----
gx, gy = filters.sobel_h(gray), filters.sobel_v(gray)
def strokes(radius, spacing, t0, t1, by_cluster):
    sm = np.stack([ndimage.gaussian_filter(img[..., c], radius / 2) for c in range(3)], -1)
    pts = []
    for yy in range(spacing // 2, H, spacing):
        for xx in range(spacing // 2, W, spacing):
            jx, jy = xx + rng.integers(-spacing // 3, spacing // 3 + 1), yy + rng.integers(-spacing // 3, spacing // 3 + 1)
            if 0 <= jx < W and 0 <= jy < H and M[jy, jx]:
                pts.append((jx, jy))
    pts = np.array(pts)
    if len(pts) == 0:
        return []
    cols = sm[pts[:, 1], pts[:, 0]]
    if by_cluster:  # paint one colour family at a time, like filling cape, shirt, trousers
        k = 6; cent = cols[rng.choice(len(cols), k, replace=False)]
        for _ in range(8):
            lab_ = np.argmin(((cols[:, None] - cent[None]) ** 2).sum(-1), 1)
            cent = np.array([cols[lab_ == j].mean(0) if (lab_ == j).any() else cent[j] for j in range(k)])
        order_c = np.argsort([pts[lab_ == j][:, 1].mean() if (lab_ == j).any() else 1e9 for j in range(k)])
        rank = np.empty(k); rank[order_c] = np.arange(k)
        key = rank[lab_] * 1e6 + pts[:, 1] + rng.random(len(pts)) * 30
    else:
        key = pts[:, 1] + rng.random(len(pts)) * 60
    order = np.argsort(key)
    res = []
    for j, idx in enumerate(order):
        x, y = pts[idx]; c = cols[idx]
        ang = np.arctan2(gy[y, x], gx[y, x]) + np.pi / 2  # stroke along edges
        L = radius * 1.6
        res.append((t0 + (t1 - t0) * j / len(order), (x - L * np.cos(ang), y - L * np.sin(ang), x + L * np.cos(ang), y + L * np.sin(ang)), tuple(int(v) for v in c), radius))
    return res

coarse = strokes(9, 11, 0.34, 0.66, True)
fine = strokes(4, 6, 0.62, 0.86, False)
all_strokes = coarse + fine

alpha_mask = Image.fromarray((M * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
final = Image.fromarray(img.astype('uint8')).convert('RGBA')
paint = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pd = ImageDraw.Draw(paint)
si = 0
for f in range(N):
    t = (f + 1) / N
    while si < len(all_strokes) and all_strokes[si][0] <= t:
        _, seg, c, r = all_strokes[si]
        pd.line(seg, fill=c + (235,), width=int(r * 2)); si += 1
    # pencil fades back as colour covers it, ink stays visible through paint
    pen_a = np.clip((pencil_t <= t) * 1.0, 0, 1) * (1 - 0.6 * np.clip((t - 0.5) / 0.4, 0, 1))
    pencil = np.zeros((H, W, 4), 'uint8'); pencil[..., :3] = 40; pencil[..., 3] = (pen_a * 230).astype('uint8')
    frame = Image.alpha_composite(paint.copy(), Image.fromarray(pencil))
    k = np.clip((t - 0.84) / 0.16, 0, 1)  # settle into the finished art
    if k > 0:
        frame = Image.blend(frame, final, k)
    a = np.minimum(np.asarray(frame)[..., 3], np.asarray(alpha_mask))
    fr = np.asarray(frame).copy(); fr[..., 3] = a
    Image.fromarray(fr).save(f'{out}/{f:04d}.png')
json.dump({'x': int(x0), 'y': int(y0), 'w': int(W), 'h': int(H), 'frames': N}, open(f'{out}/meta.json', 'w'))
print('done', out, W, H, len(props), 'pencil comps', len(all_strokes), 'strokes')
