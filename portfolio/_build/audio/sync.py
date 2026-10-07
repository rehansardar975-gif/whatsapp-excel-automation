# Finds when each subtitle actually appears in the recorded video (from the pixels, not from logs),
# then builds voice.wav with every clip starting as its subtitle appears, after removing the cut ranges.
# Usage: python sync.py <recorded.mp4> <cut-start>-<cut-end> ...   -> voice.wav + cuts.txt (ffmpeg filter)
import json, subprocess, sys, numpy as np, soundfile as sf
src = sys.argv[1]; cuts = [tuple(map(float, c.split("-"))) for c in sys.argv[2:]]
W, H, FPS = 360, 225, 25
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
T = len(fr) / FPS
caps = json.load(open("captions.json")); dur = json.load(open("durations.json"))
TOP = {"n8n-intro", "n8n-run", "n8n-wait", "report"}
def region(i, top):  # centre of the subtitle box: always covered by it when a subtitle is shown
    return fr[i, 33:47, 135:225] if top else fr[i, 201:214, 135:225]
starts = {}; prev_sig = None; i = 0
for c in caps:
    cid = c["id"]
    if c.get("card"):
        while i < len(fr) and fr[i].mean() > 45: i += 1
    else:
        top = cid in TOP
        while i < len(fr):
            r = region(i, top)
            if fr[i].mean() > 110 and r.mean() < 75 and (prev_sig is None or prev_sig.shape != r.shape or np.abs(r - prev_sig).mean() > 6):
                break
            i += 1
        prev_sig = region(min(i + 5, len(fr) - 1), top)
    if c.get("card"): prev_sig = None
    starts[cid] = i / FPS
    print(f"{cid:<11} on screen at {starts[cid]:6.2f}s  (voice {dur[cid]:.2f}s)")
    i += int(FPS * max(1.0, dur[cid] * 0.6))
# map original time -> cut time
def mapt(t):
    s = 0.0
    for a, b in cuts:
        if t >= b: s += b - a
        elif t > a: return a - s
    return t - s
keep, last = [], 0.0
for a, b in cuts: keep.append((last, a)); last = b
keep.append((last, T))
final_len = sum(b - a for a, b in keep)
SR = 24000; out = np.zeros(int(SR * (final_len + 1)), np.float32)
for c in caps:
    a, sr = sf.read(f"lines/{c['id']}.wav", dtype="float32")
    st = mapt(starts[c["id"]]) + (0.35 if c.get("card") else 0.2)
    j = int(st * SR); out[j:j + len(a)] += a[: len(out) - j]
    nxt = [mapt(starts[d["id"]]) for d in caps if starts[d["id"]] > starts[c["id"]]]
    print(f"  {c['id']:<11} voice {st:6.2f}-{st + len(a)/sr:6.2f}  next subtitle {min(nxt) if nxt else final_len:6.2f}")
sf.write("voice.wav", out[: int(SR * final_len)], SR)
parts = "".join(f"[0:v]trim={a:.2f}:{b:.2f},setpts=PTS-STARTPTS[p{k}];" for k, (a, b) in enumerate(keep))
open("cuts.txt", "w").write(parts + "".join(f"[p{k}]" for k in range(len(keep))) + f"concat=n={len(keep)}:v=1[out]")
print("final length", round(final_len, 2))
