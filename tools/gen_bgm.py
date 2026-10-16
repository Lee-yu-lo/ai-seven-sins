#!/usr/bin/env python3
"""
程序化电子音乐生成器 — 为 VJ 混合器打造 BGM
风格：科技感 / 节奏感 / 电影感 / 未来感 / 金属质感
BPM 138 · A minor · 40s · 44.1kHz stereo
"""
import numpy as np
import struct, wave, sys

SR = 44100
BPM = 138
BEAT = 60.0 / BPM          # 0.4348s per beat
SIXTEENTH = BEAT / 4       # 0.1087s
TOTAL_BEATS = 92          # ~40s
DUR = TOTAL_BEATS * BEAT
N = int(SR * DUR)

# ── helpers ──────────────────────────────────────────────
def env_exp(n, attack=0.005, decay_rate=6.0):
    """指数衰减包络"""
    e = np.ones(n)
    a = int(SR * attack)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    t = np.arange(n) / SR
    e[a:] = np.exp(-decay_rate * (t[a:] - attack))
    return e

def env_gate(n, attack=0.003, release=0.05, sustain=1.0):
    """门控包络（鼓点用）"""
    e = np.ones(n)
    a = int(SR * attack)
    r = int(SR * release)
    if a > 0: e[:a] = np.linspace(0, 1, a)
    if r > 0 and r < n: e[-r:] *= np.linspace(1, 0, r)
    return e * sustain

def lp(x, cutoff, mix=1.0):
    """简单一阶低通"""
    dt = 1.0 / SR
    rc = 1.0 / (2 * np.pi * cutoff)
    a = rc / (rc + dt)
    y = np.zeros_like(x)
    y[0] = x[0] * a
    for i in range(1, len(x)):
        y[i] = a * y[i-1] + (1-a) * x[i]
    return y * mix + x * (1 - mix)

def hp(x, cutoff, mix=1.0):
    """一阶高通"""
    dt = 1.0 / SR
    rc = 1.0 / (2 * np.pi * cutoff)
    a = rc / (rc + dt)
    y = np.zeros_like(x)
    prev_x = 0
    prev_y = 0
    for i in range(len(x)):
        y[i] = a * (prev_y + x[i] - prev_x)
        prev_x = x[i]
        prev_y = y[i]
    return y * mix + x * (1 - mix)

def noise(n):
    return np.random.uniform(-1, 1, n)

# ── synth voices ────────────────────────────────────────
def kick(n=None, freq=55):
    if n is None: n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = freq + 120 * np.exp(-25 * t)   # pitch drop
    phase = 2*np.pi * np.cumsum(f) / SR
    wave_s = np.sin(phase) * env_exp(n, 0.002, 8.0)
    click = noise(n) * env_exp(n, 0.001, 40) * 0.3
    return (wave_s * 0.85 + click * 0.15)

def snare(n=None, freq=200):
    if n is None: n = int(SR * 0.2)
    bt = noise(n) * env_exp(n, 0.003, 12)
    bt = hp(bt, 1500, 1.0)
    tone = np.sin(2*np.pi*freq*np.arange(n)/SR) * env_exp(n, 0.002, 18) * 0.25
    return bt * 0.65 + tone * 0.35

def hat(n=None, closed=True):
    if n is None: n = int(SR * (0.04 if closed else 0.1))
    h = noise(n) * env_exp(n, 0.001, 35 if closed else 15)
    return hp(h, 7000, 1.0) * (0.35 if closed else 0.5)

def clap(n=None):
    if n is None: n = int(SR * 0.15)
    out = np.zeros(n)
    for off in [0, 0.008, 0.016, 0.028]:
        s = int(SR * off)
        if s < n:
            e = int(SR * 0.02)
            chunk = noise(min(e, n - s)) * env_exp(min(e, n - s), 0.001, 20)
            chunk = hp(chunk, 1200, 1.0)
            out[s:s+len(chunk)] += chunk * 0.4
    return out * 0.5

def fm_bass(freq, n, ratio=2.0, mod_index=3.0):
    """FM 金属低音"""
    t = np.arange(n) / SR
    carrier = 2*np.pi*freq*t
    mod = 2*np.pi*freq*ratio*t + mod_index * np.sin(2*np.pi*freq*ratio*t)
    sig = np.sin(carrier + mod)
    e = env_gate(n, 0.004, 0.06, 0.9)
    return sig * e * 0.6

def saw_bass(freq, n):
    t = np.arange(n) / SR
    # band-limited-ish sawtooth via additive
    sig = np.zeros(n)
    for h in range(1, 8):
        sig += (1.0/h) * np.sin(2*np.pi*freq*h*t)
    sig /= 5.0
    e = env_gate(n, 0.005, 0.08, 0.85)
    return lp(sig, freq*5, 0.7) * e * 0.5

def synth_lead(freq, n, fm_ratio=1.5, mi=2.0):
    """FM 主旋律合成器"""
    t = np.arange(n) / SR
    carrier = 2*np.pi*freq*t
    mod = 2*np.pi*freq*fm_ratio*t + mi * np.sin(2*np.pi*freq*fm_ratio*t)
    sig = np.sin(carrier + mod)
    # add detuned saw for thickness
    sig2 = np.zeros(n)
    for h in range(1, 5):
        sig2 += (1.0/h) * np.sin(2*np.pi*freq*h*t + 0.7)
    sig2 /= 3
    return (sig * 0.6 + sig2 * 0.4) * env_exp(n, 0.01, 3.0) * 0.35

def pad(freq, n):
    """电影感氛围铺垫 — 多失谐正弦"""
    t = np.arange(n) / SR
    sig = np.zeros(n)
    detunes = [0, 0.3, -0.25, 0.6, -0.5]
    for d in detunes:
        sig += np.sin(2*np.pi*(freq+d)*t)
    sig /= len(detunes)
    # slow vibrato
    vib = 1.0 + 0.003 * np.sin(2*np.pi*5*t)
    sig *= vib
    e = np.ones(n)
    a = int(n * 0.2); r = int(n * 0.3)
    e[:a] = np.linspace(0,1,a)
    if r < n: e[-r:] = np.linspace(1,0,r)
    return lp(sig, freq*4, 0.5) * e * 0.25

def metallic_hit(freq, n):
    """金属质感打击 — 环形调制"""
    t = np.arange(n) / SR
    a = 2*np.pi*freq*t
    b = 2*np.pi*(freq*1.413)*t
    sig = np.sin(a) * np.sin(b)   # ring mod
    sig += 0.3 * np.sin(2*np.pi*freq*2.01*t)
    return sig * env_exp(n, 0.001, 10) * 0.4

def sweep(freq_start, freq_end, n, kind='saw'):
    """扫频合成器"""
    t = np.arange(n) / SR
    freq = np.linspace(freq_start, freq_end, n)
    phase = 2*np.pi * np.cumsum(freq) / SR
    if kind == 'saw':
        sig = 2*(phase/(2*np.pi) % 1) - 1
    else:
        sig = np.sin(phase)
    e = env_gate(n, 0.01, n/SR*0.5, 0.7)
    return lp(sig, 3000, 0.6) * e * 0.18

def riser(n):
    """上扬过渡效果"""
    t = np.arange(n) / SR
    nz = noise(n)
    # fixed band-pass approximation: hp then soft clip
    filt = hp(nz, 300, 1.0)
    e = np.linspace(0, 1, n) ** 2
    tone = np.sin(2*np.pi*np.linspace(100, 2000, n) * np.arange(n) / SR * 0.01)
    return (filt * 0.6 + tone * 0.4) * e * 0.2

# ── scheduling ──────────────────────────────────────────
track = np.zeros(N, dtype=np.float64)

def place(signal, beat_start):
    """把信号放到 beat_start 位置"""
    s = int(beat_start * BEAT * SR)
    e = min(s + len(signal), N)
    if s < N:
        track[s:e] += signal[:e-s]

def beat(n):
    return n

# note frequencies (A minor pentatonic + chromatic)
A2, C3, D3, E3, G3, A3, C4, D4, E4, G4, A4 = 110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7, 329.6, 392, 440
Ab2 = 103.8; Eb3 = 155.6; Bb3 = 233.1; B3 = 246.9; F4 = 349.2

# ── ARRANGEMENT (92 beats ≈ 40s) ────────────────────────
# Section A: Intro (0-8) — pad + atmosphere + metallic shimmer
for b in range(0, 8, 4):
    ln = int(SR * 4 * BEAT)
    place(pad(A2, ln), b)
    place(pad(E3, ln), b)

# metallic shimmer hits on beat 2, 6
place(metallic_hit(E4, int(SR*0.4)), 2)
place(metallic_hit(A4, int(SR*0.4)), 6)

# intro riser
place(riser(int(SR*2*BEAT)), 6)

# Section B: Beat drops (8-24) — kick 4-on-floor, hats, bass
for b in range(8, 24):
    place(kick(), b)                          # kick every beat
    if b % 2 == 1:                            # snare on off-beats
        place(snare(), b)
    for s16 in range(4):                      # 16th hats
        if not (b % 2 == 0 and s16 == 0):
            place(hat(closed=True), b + s16*0.25)
    # bass line: A A C A | A A G A (per 4 beats)
    pat = [A2, A2, C3, A2]
    if b % 4 < len(pat):
        place(fm_bass(pat[b%4], int(SR*SIXTEENTH*2)), b)
    # saw bass doubling
    if b % 2 == 0:
        place(saw_bass(A2, int(SR*BEAT*0.8)), b)

# Section C: Lead enters (24-48) — synth melody + full drums
melody_notes = [
    (A3, 2), (C4, 1), (D4, 1), (E4, 2), (D4, 1), (C4, 1),
    (A3, 2), (G3, 1), (A3, 1), (C4, 2), (B3, 1), (A3, 1),
    (E4, 1), (D4, 1), (C4, 1), (B3, 1), (A3, 2), (G3, 2),
]
mb = 24
for note, dur in melody_notes:
    if mb >= 48: break
    place(synth_lead(note, int(SR * dur * BEAT)), mb)
    mb += dur

for b in range(24, 48):
    place(kick(), b)
    if b % 2 == 1:
        place(snare(), b)
    if b % 4 == 3:
        place(clap(), b + 0.5)
    for s16 in range(4):
        place(hat(closed=(s16 != 2)), b + s16*0.25)
    pat = [A2, A2, C3, A2]
    place(fm_bass(pat[b%4], int(SR*SIXTEENTH*2)), b)
    # metallic accents
    if b % 4 == 2:
        place(metallic_hit(E4, int(SR*0.3)), b)
    if b % 8 == 6:
        place(metallic_hit(G4, int(SR*0.35)), b)

# pad continues under lead
for b in range(24, 48, 4):
    place(pad(A2, int(SR*4*BEAT)), b)
    place(pad(E3, int(SR*4*BEAT)), b)

# transition riser at 46-48
place(riser(int(SR*2*BEAT)), 46)

# Section D: Breakdown (48-56) — strip drums, atmospheric
for b in range(48, 56, 4):
    place(pad(A2, int(SR*4*BEAT)), b)
    place(pad(D3, int(SR*4*BEAT)), b)
    place(pad(E3, int(SR*4*BEAT)), b)
# sparse metallic
place(metallic_hit(A4, int(SR*0.5)), 50)
place(metallic_hit(E4, int(SR*0.5)), 52)
place(metallic_hit(C4, int(SR*0.5)), 54)
# slow sweep
place(sweep(200, 800, int(SR*4*BEAT)), 48)

# Section E: Final build + climax (56-88) — everything
melody2 = [
    (E4, 1), (G4, 1), (A4, 2), (G4, 1), (E4, 1), (D4, 2),
    (C4, 1), (E4, 1), (A3, 2), (G3, 1), (A3, 1), (E4, 2),
    (A4, 1), (G4, 1), (E4, 1), (D4, 1), (C4, 2), (A3, 2),
    (E4, 2), (D4, 2), (C4, 2), (A3, 2),
]
mb = 56
for note, dur in melody2:
    if mb >= 88: break
    place(synth_lead(note, int(SR * dur * BEAT), 1.5, 2.5), mb)
    mb += dur

for b in range(56, 88):
    place(kick(), b)
    if b % 2 == 1:
        place(snare(), b)
    if b % 4 == 3 or b % 4 == 2:
        place(clap(), b + 0.25)
    for s16 in range(4):
        place(hat(closed=(s16 != 2)), b + s16*0.25)
    pat = [A2, A2, Ab2, A2]
    place(fm_bass(pat[b%4], int(SR*SIXTEENTH*2)), b)
    if b % 2 == 0:
        place(saw_bass(A2 if b%8<4 else C3, int(SR*BEAT*0.8)), b)
    if b % 4 == 2:
        place(metallic_hit([E4,G4,A4][b%12//4], int(SR*0.3)), b)
    # rolling snares at end
    if b >= 84:
        for off in [0.25, 0.5, 0.75]:
            place(snare(int(SR*0.08)), b + off)

# pad bed
for b in range(56, 88, 4):
    place(pad(A2, int(SR*4*BEAT)), b)
    if b >= 64: place(pad(E3, int(SR*4*BEAT)), b)

# big riser 84-88
place(riser(int(SR*4*BEAT)), 84)

# Section F: Outro (88-92) — fade out, decay
for b in range(88, 92, 4):
    place(pad(A2, int(SR*4*BEAT)), b)
place(metallic_hit(A4, int(SR*0.8)), 88)
place(metallic_hit(E4, int(SR*0.8)), 90)

# ── mix / master ────────────────────────────────────────
# normalize
peak = np.max(np.abs(track))
if peak > 0:
    track = track / peak * 0.92

# soft saturation for warmth
track = np.tanh(track * 1.1) * 0.9

# simple stereo: slight delay on right for width
delay_s = int(SR * 0.012)
stereo = np.zeros((N, 2), dtype=np.float64)
stereo[:, 0] = track
stereo[delay_s:, 1] = track[:-delay_s] * 0.85
stereo[:delay_s, 1] = track[:delay_s] * 0.5
# add a bit of the dry to right too
stereo[:, 1] += track * 0.15

# fade out last 2 beats
fo = int(SR * 2 * BEAT)
stereo[-fo:, 0] *= np.linspace(1, 0, fo)
stereo[-fo:, 1] *= np.linspace(1, 0, fo)

# fade in first beat
fi = int(SR * BEAT)
stereo[:fi, 0] *= np.linspace(0, 1, fi)
stereo[:fi, 1] *= np.linspace(0, 1, fi)

# convert to 16-bit PCM
pcm = np.clip(stereo, -1, 1)
pcm16 = (pcm * 32767).astype(np.int16)

# write WAV
wav_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/vj_bgm.wav"
with wave.open(wav_path, 'w') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm16.tobytes())

print(f"Generated: {wav_path}")
print(f"Duration: {len(pcm16)/SR:.2f}s | Samples: {len(pcm16)} | BPM: {BPM}")
