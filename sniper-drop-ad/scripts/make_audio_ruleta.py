"""Synthesises the music bed and sound effects for the 'ruleta' ad (no external samples).
Writes public/audio/ruleta-music.wav and public/audio/sfx-*.wav (44.1 kHz mono)."""
import numpy as np, wave, os
SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
rng = np.random.default_rng(7)

def save(name, x):
    x = np.clip(x, -1, 1)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def lp(x, k=8):
    return np.convolve(x, np.ones(k) / k, "same")

# --- SFX -------------------------------------------------------------------
n = int(0.35 * SR); t = np.arange(n) / SR
tap = (np.sin(2 * np.pi * 95 * t) * env(n, 0.001, 0.05) * 0.9 + lp(rng.standard_normal(n), 6) * env(n, 0.0005, 0.012) * 0.6)
save("sfx-tap.wav", tap * 0.9)

n = int(0.32 * SR); t = np.arange(n) / SR
noise = rng.standard_normal(n)
swipe = lp(noise, 3) - lp(noise, 40)
swipe *= np.sin(np.pi * np.clip(t / 0.32, 0, 1)) ** 2 * 0.35
save("sfx-swipe.wav", swipe)

n = int(0.12 * SR); t = np.arange(n) / SR
click = (np.sin(2 * np.pi * 1900 * t) * env(n, 0.0002, 0.006) + rng.standard_normal(n) * env(n, 0.0001, 0.003) * 0.5
         + np.sin(2 * np.pi * 180 * t) * env(n, 0.0005, 0.02) * 0.5)
save("sfx-click.wav", click * 0.8)

# roulette: rolling ball (dense ticks slowing down) then final hit
dur = 1.5; n = int(dur * SR); roll = np.zeros(n)
pos = 0.0; gap = 0.035
while pos < dur - 0.08:
    i = int(pos * SR); m = min(n - i, int(0.02 * SR)); tt = np.arange(m) / SR
    roll[i:i + m] += (np.sin(2 * np.pi * (2600 + rng.uniform(-300, 300)) * tt) * np.exp(-tt / 0.004)) * 0.35
    pos += gap; gap *= 1.06
roll += lp(rng.standard_normal(n), 20) * np.linspace(0.12, 0.02, n)
save("sfx-roll.wav", roll)

n = int(0.6 * SR); t = np.arange(n) / SR
hit = (np.sin(2 * np.pi * 60 * t) * env(n, 0.001, 0.18) * 1.0 + np.sin(2 * np.pi * 2300 * t) * env(n, 0.0002, 0.02) * 0.6
       + rng.standard_normal(n) * env(n, 0.0002, 0.01) * 0.5)
save("sfx-hit.wav", hit * 0.95)

n = int(0.5 * SR); t = np.arange(n) / SR
whoosh = (lp(rng.standard_normal(n), 4) - lp(rng.standard_normal(n), 60)) * np.sin(np.pi * t / 0.5) ** 3 * 0.3
save("sfx-whoosh.wav", whoosh)

# --- Music bed: warm minor pad + soft pulse, 100 bpm, ducked under the question
DUR = 42.85; n = int(DUR * SR); t = np.arange(n) / SR
bpm = 100; beat = 60 / bpm
chords = [[110.0, 130.81, 164.81], [87.31, 110.0, 130.81], [98.0, 123.47, 146.83], [82.41, 103.83, 123.47]]  # Am F G E
pad = np.zeros(n)
for i in range(int(DUR / (beat * 4)) + 1):
    s = int(i * beat * 4 * SR); e = min(n, int((i + 1) * beat * 4 * SR) + int(0.2 * SR))
    if s >= n: break
    tt = np.arange(e - s) / SR; ch = chords[i % 4]
    seg = sum(np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt + 0.3) for f in ch) / 6
    fade = np.minimum(1, tt / 0.25) * np.minimum(1, (tt[-1] - tt) / 0.25 + 1e-3)
    pad[s:e] += seg * fade
kick = np.zeros(n)
for k in range(int(DUR / beat)):
    i = int(k * beat * SR); m = min(n - i, int(0.3 * SR)); tt = np.arange(m) / SR
    f = 55 + 70 * np.exp(-tt / 0.03)
    kick[i:i + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.12)
hat = np.zeros(n)
for k in range(int(DUR / (beat / 2))):
    if k % 2 == 0: continue
    i = int(k * beat / 2 * SR); m = min(n - i, int(0.05 * SR))
    hat[i:i + m] += (rng.standard_normal(m) - lp(rng.standard_normal(m), 3)) * np.exp(-np.arange(m) / SR / 0.01) * 0.15
music = pad * 0.22 + kick * 0.35 + hat
# energy curve: lighter intro, full in the demo, duck under the question, stop for the roulette
gain = np.interp(t, [0, 4.2, 4.4, 11.0, 11.3, 13.3, 13.7, 36.6, 40.6, 41.2, DUR], [0.55, 0.6, 0.8, 0.8, 0.22, 0.22, 1.0, 1.0, 0.7, 0.0, 0.0])
music *= gain
music /= np.max(np.abs(music)) + 1e-9
save("ruleta-music.wav", music * 0.5)
print("ok")
