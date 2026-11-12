#!/usr/bin/env python3
"""
موسيقى خلفية وثائقية أصلية مولّدة برمجيًا (بلا حقوق ملكية خارجية) — 300 ثانية.
وسادة صوتية دافئة + بيانو خفيف + جهير + ضربات منخفضة عند فواصل المشاهد + صدى.
تُقرأ حدود المشاهد من TIMELINE في src/config.ts.

الاستخدام: npm run music   (يتطلب numpy و ffmpeg)
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.check_call(["node", os.path.join(ROOT, "scripts", "export-data.mjs")])
data = json.load(open(os.path.join(ROOT, "out", "report.json"), encoding="utf-8"))
SR = 44100
DUR = float(data["video"]["durationInSeconds"])
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(2040)
boundaries = [s["from"] for s in data["timeline"]][1:]

def hz(m):  # MIDI → Hz
    return 440.0 * 2 ** ((m - 69) / 12)

# تتابع الأكوردات (د الصغير ← فا الكبير في الخاتمة): كل أكورد 8 ثوانٍ
D, F_, G, A, Bb, C_, E = 50, 53, 55, 57, 58, 48, 52
prog_main = [
    [38, 50, 53, 57, 64],      # Dm9
    [34, 50, 53, 57, 62],      # Bbmaj7
    [41, 48, 53, 57, 64],      # Fmaj7
    [36, 48, 52, 55, 62],      # Cadd9
]
prog_end = [
    [34, 50, 53, 58, 62],      # Bb
    [41, 48, 53, 57, 60],      # F
    [36, 48, 52, 55, 64],      # C
    [41, 48, 53, 57, 65],      # F
]
CH = 8.0
n_chords = int(np.ceil(DUR / CH))
end_start = boundaries[-1] if boundaries else DUR - 30

L = np.zeros(N); R = np.zeros(N)

def env_chord(i):
    """نافذة جيبية متداخلة لكل أكورد (انتقال سلس)"""
    s, e = i * CH - 1.5, (i + 1) * CH + 1.5
    a = np.clip((t - s) / 3.0, 0, 1)
    b = np.clip((e - t) / 3.0, 0, 1)
    return np.sin(np.pi / 2 * a) ** 2 * np.sin(np.pi / 2 * b) ** 2

# الوسادة
for i in range(n_chords):
    chord = (prog_end if i * CH >= end_start else prog_main)[i % 4]
    env = env_chord(i)
    idx = np.nonzero(env)[0]
    if idx.size == 0: continue
    tt = t[idx]
    for k, m in enumerate(chord):
        f = hz(m + 12 if k == 0 else m)
        amp = 0.05 if k == 0 else 0.032
        for det, side in ((0.9985, L), (1.0015, R)):
            ph = rng.uniform(0, 2 * np.pi)
            lfo = 1 + 0.12 * np.sin(2 * np.pi * 0.11 * tt + ph)
            w = np.sin(2 * np.pi * f * det * tt + ph) + 0.28 * np.sin(4 * np.pi * f * det * tt + ph) + 0.08 * np.sin(6 * np.pi * f * det * tt)
            side[idx] += amp * env[idx] * lfo * w
    # جهير
    bass_f = hz(chord[0] - 12 if chord[0] > 40 else chord[0])
    bb = 0.07 * env[idx] * (np.sin(2 * np.pi * bass_f * tt) + 0.2 * np.sin(4 * np.pi * bass_f * tt))
    L[idx] += bb; R[idx] += bb

# بيانو خفيف (نغمات من الأكورد) — أكثف في المشاهد الوسطى
def piano(at, m, vel):
    f = hz(m)
    n = int(SR * 4.5)
    s = int(at * SR)
    if s >= N: return
    n = min(n, N - s)
    tt = np.arange(n) / SR
    env = np.exp(-tt * 1.6) * np.clip(tt / 0.006, 0, 1)
    w = sum(a * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * h * 0.6) for h, a in ((1, 1), (2, 0.45), (3, 0.18), (4, 0.08)))
    pan = rng.uniform(-0.5, 0.5)
    L[s:s + n] += vel * env * w * (0.5 - pan / 2)
    R[s:s + n] += vel * env * w * (0.5 + pan / 2)

beat = 60 / 64.0
x = 6.0
pattern = [2, 4, 3, 4, 1, 3, 4, 2]
step = 0
while x < DUR - 8:
    i = int(x // CH)
    chord = (prog_end if x >= end_start else prog_main)[i % 4]
    dense = 1.0 if 30 <= x < end_start else 0.55
    if rng.random() < 0.82 * dense:
        m = chord[pattern[step % len(pattern)]] + 12
        piano(x + rng.uniform(-0.01, 0.01), m, 0.05 * (0.8 + 0.4 * rng.random()))
    step += 1
    x += beat * (1 if dense > 0.9 else 2)

# ضربات منخفضة وتضخم قبل كل فاصل مشهد
for b in boundaries:
    s = int((b - 0.15) * SR); n = int(SR * 4)
    if s + n > N: n = N - s
    tt = np.arange(n) / SR
    f = 55 * np.exp(-tt * 0.6) + 32
    boom = 0.22 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.4)
    L[s:s + n] += boom; R[s:s + n] += boom
    # تضخم ضوضائي مُرشّح
    n2 = int(SR * 2.2); s2 = int((b - 2.2) * SR)
    noise = rng.standard_normal(n2)
    k = 60
    noise = np.convolve(noise, np.ones(k) / k, mode="same")  # ترشيح منخفض بسيط
    ramp = np.linspace(0, 1, n2) ** 3
    L[s2:s2 + n2] += 0.5 * noise * ramp; R[s2:s2 + n2] += 0.5 * noise[::-1] * ramp

# جرس افتتاحي ونغمة ختامية
for at, m in ((2.6, 74), (2.62, 81), (4.4, 69)):
    piano(at, m, 0.06)
for at, m in ((DUR - 13, 65), (DUR - 12.6, 69), (DUR - 12.2, 72), (DUR - 11.8, 77)):
    piano(at, m, 0.055)

# تلاشٍ في البداية والنهاية
fade = np.clip(t / 3.0, 0, 1) * np.clip((DUR - t) / 6.0, 0, 1)
L *= fade; R *= fade
mix = np.stack([L, R], axis=1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.85

tmp = os.path.join(ROOT, "out")
os.makedirs(tmp, exist_ok=True)
def write(path, arr):
    with wave.open(path, "wb") as w:
        w.setnchannels(arr.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(arr, -1, 1) * 32767).astype("<i2").tobytes())
dry = os.path.join(tmp, "music-dry.wav"); write(dry, mix)

# استجابة نبضية لصدى قاعة (3.2 ثانية)
nir = int(SR * 3.2); ti = np.arange(nir) / SR
ir = np.stack([rng.standard_normal(nir), rng.standard_normal(nir)], axis=1) * np.exp(-ti * 2.2)[:, None]
ir[:int(SR * 0.012)] = 0
ir /= np.max(np.abs(ir))
irp = os.path.join(tmp, "ir.wav"); write(irp, ir * 0.9)

out = os.path.join(ROOT, "public", data["audio"]["music"])
os.makedirs(os.path.dirname(out), exist_ok=True)
subprocess.check_call([
    "ffmpeg", "-y", "-loglevel", "error", "-i", dry, "-i", irp,
    "-filter_complex", "[0][1]afir=dry=7:wet=3[r];[r]highpass=f=28,lowpass=f=11000,loudnorm=I=-20:TP=-2:LRA=9,atrim=0:%s" % DUR,
    "-ar", str(SR), "-ac", "2", "-c:a", "libmp3lame", "-b:a", "160k", out,
])
print("music →", os.path.relpath(out, ROOT))
