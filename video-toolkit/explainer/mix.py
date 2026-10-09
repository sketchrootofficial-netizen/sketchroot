"""Music bed + sound effects + narration -> public/mix.wav (run after tts.py, from explainer/).

Everything is synthesised here (no licensed audio): an upbeat 118 BPM groove in D
(marimba hook, plucked chords, bass, kick/clap/hats, a tabla-style figure), which
drops to a held pad while the viewer is thinking in the recall test. Sound effects
follow the same timeline rules as the video (src/Explainer.tsx): whooshes on scene
changes, pencil scratch while characters paint in, pops on labels, impacts on the
punch words, clock ticks in the countdown and a ding on each answer. The music
ducks under the voice.
"""
import json, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(3)
TL = json.load(open('public/timeline.json'))
L = TL['lines']
DUR = TL['duration']
N = int(DUR * SR) + SR

def cue(c): return next(l for l in L if l.get('cue') == c)
def word_at(l, w):
    k = max(0, l['cap'].lower().find(w.lower()))
    return l['start'] + (l['end'] - l['start']) * k / len(l['cap'])
SCENES = ['hook', 'problem', 'loci', 'kitchen', 'idea', 'kada', 'recall', 'compare', 'cta']
def scene_start(s):
    return 0 if s == SCENES[0] else next(l for l in L if l['scene'] == s)['start'] - 0.35

# ---------- tiny synth ----------
def env(n, a=0.002, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)
def sine(f, n, ph=0):
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(f, (n,))) / SR + ph)
def lp(x, a):  # one-pole low-pass, a in (0,1): higher = brighter
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return y
def hp(x, a): return x - lp(x, a)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.045)
    return (sine(f, n) * np.exp(-t / 0.16) + 0.3 * rng.standard_normal(n) * np.exp(-t / 0.004)) * 0.9
def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR
    e = sum(np.exp(-np.clip(t - o, 0, None) / 0.012) * (t >= o) for o in (0, 0.011, 0.023)) + 0.5 * np.exp(-t / 0.09)
    return hp(rng.standard_normal(n), 0.25) * e * 0.35
def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    return hp(rng.standard_normal(n), 0.6) * env(n, 0.001, 0.06 if open_ else 0.012) * 0.16
def pluck(f, dur=0.6, bright=0.5):  # Karplus-Strong
    n = int(dur * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * (0.992 + 0.006 * bright)
    return out * env(n, 0.001, dur / 2.5)
def marimba(f, dur=0.5):
    n = int(dur * SR)
    return (sine(f, n) * env(n, 0.001, dur / 3) + 0.25 * sine(4 * f, n) * env(n, 0.001, 0.03)) * 0.5
def bass(f, dur=0.24):
    n = int(dur * SR)
    x = sum(sine(k * f, n) / k for k in range(1, 6))
    return lp(x, 0.08) * env(n, 0.004, dur / 1.5) * 0.9
def tabla(kind):
    n = int(0.3 * SR); t = np.arange(n) / SR
    if kind == 'na':  # bright ringing stroke
        return (sine(520, n) + 0.4 * sine(1040, n)) * np.exp(-t / 0.07) * 0.22 + hp(rng.standard_normal(n), 0.5) * np.exp(-t / 0.004) * 0.08
    f = 85 * (1 + 0.5 * np.clip(t / 0.12, 0, 1))  # 'ge': bass stroke that bends up
    return sine(f, n) * np.exp(-t / 0.18) * 0.45
def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(sine(f * d, n) for f in freqs for d in (0.997, 1.003))
    a = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.6)
    return lp(x, 0.05) * a * 0.12

def place(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    j = min(len(buf), i + len(x)); buf[max(0, i):j] += g * x[max(0, -i):j - i]

from functools import lru_cache
pluck, marimba, bass, tabla = (lru_cache(None)(f) for f in (pluck, marimba, bass, tabla))

# ---------- arrangement ----------
BPM = 118; B = 60 / BPM; BAR = 4 * B
CHORDS = [(62, [62, 66, 69, 74]), (59, [59, 62, 66, 71]), (55, [55, 59, 62, 67]), (57, [57, 61, 64, 69])]  # D Bm G A
HOOK = [74, 76, 78, 81, 78, 76, 74, 69]  # marimba motif in eighths, D major pentatonic
music = np.zeros(N)
quiet = []  # windows where the groove stops (recall thinking time)
for q, a in (('q1', 'a1'), ('q2', 'a2')):
    quiet.append((cue(q)['end'] + 0.05, cue(a)['start'] - 0.05))
def in_quiet(t): return any(a <= t < b for a, b in quiet)
def energy(t):
    s = [x for x in SCENES if scene_start(x) <= t][-1]
    return {'hook': 2, 'kada': 2, 'idea': 2, 'cta': 2, 'recall': 1, 'compare': 1}.get(s, 1)

K, C, H, HO = kick(), clap(), hat(), hat(True)
bar = 0; t0 = 0.0
while t0 < DUR:
    root, ch = CHORDS[bar % 4]
    for step in range(8):  # eighth notes
        t = t0 + step * B / 2
        if t >= DUR or in_quiet(t): continue
        e = energy(t)
        if step % 2 == 0 and (e == 2 or step in (0, 4)): place(music, K, t)
        if step in (2, 6): place(music, C, t, 0.9 if e == 2 else 0.6)
        place(music, HO if step % 2 else H, t, 0.8 if e == 2 else 0.5)
        place(music, bass(mtof(root - 24)), t, 0.55 if step % 2 == 0 else 0.35)
        if step in (1, 3, 5, 7):  # off-beat strums
            for k, m in enumerate(ch):
                place(music, pluck(mtof(m), 0.45, 0.6), t + k * 0.008, 0.10)
        if e == 2 and not (bar % 4 == 3 and step >= 6):
            place(music, marimba(mtof(HOOK[(step + bar * 3) % 8 if bar % 2 else step])), t, 0.32)
        if e == 1:  # tabla figure: ge . na na ge na . na
            pat = ['ge', None, 'na', 'na', 'ge', 'na', None, 'na'][step]
            if pat: place(music, tabla(pat), t, 0.8)
    bar += 1; t0 += BAR
for a, b in quiet:
    place(music, pad([mtof(m) for m in (50, 57, 62, 65)], b - a + 0.3), a, 1.0)

# ---------- sound effects ----------
sfx = np.zeros(N)
def whoosh(dur=0.45):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); y = np.empty(n); acc = 0.0
    for i in range(n):
        a = 0.02 + 0.25 * np.sin(np.pi * t[i] / dur) ** 2; acc += a * (x[i] - acc); y[i] = acc
    return y * np.sin(np.pi * t / dur) ** 1.5 * 0.5
def pencil(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    strokes = (np.sin(2 * np.pi * 7 * t + 3 * np.sin(2 * np.pi * 1.3 * t)) > 0.2).astype(float)
    return hp(rng.standard_normal(n), 0.55) * lp(strokes, 0.002) * 0.10 * np.minimum(1, (dur - t) / 0.2)
def pop():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return sine(500 + 900 * t / 0.12, n) * np.exp(-t / 0.03) * 0.35
def impact():
    n = int(0.6 * SR); t = np.arange(n) / SR
    return sine(55 + 60 * np.exp(-t / 0.05), n) * np.exp(-t / 0.25) * 0.8 + lp(rng.standard_normal(n), 0.3) * np.exp(-t / 0.05) * 0.3
def tick():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return sine(2200, n) * np.exp(-t / 0.008) * 0.35
def ding():
    n = int(1.4 * SR); t = np.arange(n) / SR
    return sum(sine(f, n) * a for f, a in ((1320, 1), (2640, 0.4), (3700, 0.15))) * np.exp(-t / 0.4) * 0.22

for s in SCENES[1:]:
    place(sfx, whoosh(), scene_start(s) - 0.15)
place(sfx, pencil(4.2), 0.2)  # the hook: whole shop paints in
for c in ('ramu', 'hugo', 'dal', 'hen', 'abkari'):
    place(sfx, pencil(1.4), cue(c)['start'] - 0.15)
place(sfx, pencil(1.8), cue('palace')['start'] - 0.1)
place(sfx, pop(), cue('ramu')['start'] + 1.2)
for c in ('hugoTag', 'dalTag', 'henTag', 'abkariTag'):
    place(sfx, pop(), cue(c)['start'] + 0.1)
PUNCH = [(cue('blank'), 'Blank'), (cue('places'), 'place'), (cue('hugoTag'), 'Obwegesser'), (cue('dalTag'), 'Dal Pont'),
         (cue('henTag'), 'Hunsuck'), (cue('abkariTag'), 'Epker'), (cue('bsso'), 'BSSO'), (cue('a1'), 'Hunsuck'), (cue('a2'), 'Epker')]
for l, w in PUNCH:
    place(sfx, impact(), word_at(l, w))
for a, b in quiet:
    for k in range(3):
        place(sfx, tick(), a + (b - a) * k / 3)
for c in ('a1', 'a2', 'done'):
    place(sfx, ding(), cue(c)['start'] - 0.05)

# ---------- mix ----------
w = wave.open('public/narration.wav'); vsr = w.getframerate()
v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
voice = np.zeros(N); voice[:len(v)] = v[:N]
lvl = np.convolve(np.abs(voice), np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')
duck = np.clip(lvl / 0.04, 0, 1)
k = int(0.25 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')  # smooth attack/release
music *= 0.13 * (1 - 0.55 * np.clip(duck, 0, 1))
mix = voice * 1.0 + music + sfx * 0.7
fade = np.ones(N); fn = int(1.2 * SR); end = int(DUR * SR)
fade[end - fn:end] = np.linspace(1, 0, fn); fade[end:] = 0
mix *= fade
mix = np.tanh(mix / np.abs(mix).max() * 1.4) / np.tanh(1.4) * 0.95
st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
o = wave.open('public/mix.wav', 'wb'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(st.tobytes()); o.close()
print('public/mix.wav', round(DUR, 2), 's')
