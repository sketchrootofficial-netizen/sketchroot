"""Find beat onsets and big musical moments in a track, for timing scenes.

usage: python tools/beats.py <audio> [start_s] [duration_s]
prints: an energy profile (to spot the drop / swells) and a JSON list of
onset times relative to start_s (save it as beats.json for the reels).
"""
import sys, json, math, subprocess, struct

path = sys.argv[1]
ss = float(sys.argv[2]) if len(sys.argv) > 2 else 0
dur = sys.argv[3] if len(sys.argv) > 3 else None
cmd = ['ffmpeg', '-v', 'quiet', '-ss', str(ss)] + (['-t', dur] if dur else []) + ['-i', path, '-ac', '1', '-ar', '8000', '-f', 's16le', '-']
raw = subprocess.run(cmd, capture_output=True).stdout
a = struct.unpack('<%dh' % (len(raw) // 2), raw)

# 0.25 s energy profile: a run of near-silence followed by a jump = the drop
w = 2000
for i in range(0, len(a) - w, w):
    s = a[i:i + w]; r = math.sqrt(sum(x * x for x in s) / len(s))
    print('%7.2f %6d %s' % (i / 8000, r, '#' * int(r / 300)))

# onsets: 20 ms energy rising 1.6x over the previous 60 ms
w = 160
e = [math.sqrt(sum(x * x for x in a[i:i + w]) / w) for i in range(0, len(a) - w, w)]
on, last = [], -1
for k in range(3, len(e)):
    t = k * 0.02; base = sum(e[k - 3:k]) / 3
    if e[k] > 1.6 * base and e[k] > 2500 and t - last > 0.22:
        on.append(round(t, 2)); last = t
print(json.dumps(on))
