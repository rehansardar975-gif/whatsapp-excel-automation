# Original background music for the P07 demo video, generated in code (no samples, loops or third-party material).
# Calm pad: Dmaj9 - Bm7 - Gmaj7 - A6sus, 5 s per chord, soft bell arpeggio at 72 bpm. Output: music.wav
import numpy as np, soundfile as sf
SR = 48000; DUR = 131.440000; t = np.arange(int(SR * DUR)) / SR
note = lambda m: 440.0 * 2 ** ((m - 69) / 12)
chords = [[50, 57, 66, 73, 76], [47, 54, 62, 69, 74], [43, 50, 59, 66, 71], [45, 52, 61, 64, 71]]
CH = 5.0; BEAT = 60 / 72
pad = np.zeros_like(t); arp = np.zeros_like(t)
for i in range(int(np.ceil(DUR / CH)) + 1):
    c = chords[i % 4]; t0 = i * CH
    seg = (t >= t0 - 1.2) & (t < t0 + CH + 1.2); tt = t[seg] - t0
    env = np.clip((tt + 1.2) / 1.8, 0, 1) * np.clip((CH + 1.2 - tt) / 1.8, 0, 1)
    for m in c:
        f = note(m)
        for det in (-0.1, 0.1):
            pad[seg] += env * (0.6 * np.sin(2 * np.pi * f * (1 + det / 100) * tt) + 0.12 * np.sin(2 * np.pi * 2 * f * tt)) / len(c)
    for b in range(int(CH / BEAT)):
        m = c[2 + (b % 3)] + 12; f = note(m); ts = t0 + b * BEAT
        s2 = (t >= ts) & (t < ts + 2.2); u = t[s2] - ts
        arp[s2] += 0.15 * np.sin(2 * np.pi * f * u) * np.exp(-u * 2.4) * (1 - np.exp(-u * 60))
mix = pad * 0.5 + arp
y = np.zeros_like(mix); a = 0.12
for i in range(1, len(mix)):
    y[i] = y[i - 1] + a * (mix[i] - y[i - 1])          # one-pole low-pass, keeps it warm
fade = np.minimum(np.clip(t / 2.0, 0, 1), np.clip((DUR - t) / 3.0, 0, 1))
y = y * fade; y = y / np.max(np.abs(y)) * 0.5
sf.write("music.wav", np.stack([y, np.roll(y, int(0.012 * SR))], axis=1), SR)
print("music.wav", DUR, "s")
