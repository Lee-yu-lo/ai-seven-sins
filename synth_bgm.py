#!/usr/bin/env python3
"""
Synthesize a cinematic / futuristic / metallic electronic BGM
for the Seven Sins VJ mixer.

Style: sci-fi techno, 128 BPM, D minor, ~40s loop-friendly
Textures: 科技感(arp+sweep), 节奏感(kick+snare+hh), 电影感(pad+sub),
          未来感(FM+glitch), 旋律感(lead melody), 金属质感(FM metallic)
"""

import numpy as np
import struct, wave, os

SR = 44100          # sample rate
BPM = 128
BEAT = 60.0 / BPM   # seconds per beat (0.46875)
DUR = 40.0          # total seconds
N = int(SR * DUR)
t_all = np.arange(N) / SR

# ── D minor scale frequencies ──────────────────────────────────
def note(freq, octave=4):
    return freq * (2 ** (octave - 4))

Nm = {
    'D2': 73.42, 'A2': 110.00,
    'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00,
    'Bb3': 233.08, 'C4': 261.63,
    'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
    'Bb4': 466.16, 'C5': 523.25, 'D5': 587.33, 'F5': 698.46,
}

# ── Envelope helpers ───────────────────────────────────────────
def adsr(length, a=0.005, d=0.05, s=0.7, r=0.05, sr=SR):
    """ADSR envelope as numpy array."""
    n = int(length * sr)
    a_s = int(a * sr); d_s = int(d * sr); r_s = int(r * sr)
    s_s = max(0, n - a_s - d_s - r_s)
    env = np.zeros(n)
    if a_s: env[:a_s] = np.linspace(0, 1, a_s)
    if d_s: env[a_s:a_s+d_s] = np.linspace(1, s, d_s)
    if s_s: env[a_s+d_s:a_s+d_s+s_s] = s
    if r_s: env[a_s+d_s+s_s:] = np.linspace(s, 0, n - a_s - d_s - s_s)
    return env

def env_exp(length, decay=0.15, sr=SR):
    """Exponential decay envelope (for drums/percussion)."""
    n = int(length * sr)
    return np.exp(-np.arange(n) / (decay * sr))

# ── Oscillators ────────────────────────────────────────────────
def sine(freq, length, sr=SR):
    n = int(length * sr)
    return np.sin(2 * np.pi * freq * np.arange(n) / sr)

def saw(freq, length, sr=SR):
    n = int(length * sr)
    x = np.arange(n) / sr
    return 2 * (freq * x - np.floor(0.5 + freq * x))

def square(freq, length, sr=SR):
    return np.sign(sine(freq, length, sr))

def tri(freq, length, sr=SR):
    n = int(length * sr)
    x = np.arange(n) / sr
    return 2 * np.abs(2 * (freq * x - np.floor(freq * x + 0.5))) - 1

def noise(length, sr=SR):
    n = int(length * sr)
    return np.random.uniform(-1, 1, n)

# ── FM synthesis (metallic / futuristic tone) ───────────────────
def fm(freq_carrier, freq_mod, index, length, sr=SR):
    """Phase-modulate a sine carrier — produces metallic bell-like timbres."""
    n = int(length * sr)
    t = np.arange(n) / sr
    phase = 2 * np.pi * freq_carrier * t + index * np.sin(2 * np.pi * freq_mod * t)
    return np.sin(phase)

# ── Simple one-pole filters ─────────────────────────────────────
def lp1(sig, cutoff, sr=SR):
    """One-pole low-pass."""
    rc = 1.0 / (2 * np.pi * cutoff)
    dt = 1.0 / sr
    alpha = dt / (rc + dt)
    out = np.zeros_like(sig)
    prev = 0.0
    for i in range(len(sig)):
        prev = prev + alpha * (sig[i] - prev)
        out[i] = prev
    return out

def hp1(sig, cutoff, sr=SR):
    """One-pole high-pass."""
    rc = 1.0 / (2 * np.pi * cutoff)
    dt = 1.0 / sr
    alpha = rc / (rc + dt)
    out = np.zeros_like(sig)
    prev_in = prev_out = 0.0
    for i in range(len(sig)):
        prev_out = alpha * (prev_out + sig[i] - prev_in)
        prev_in = sig[i]
        out[i] = prev_out
    return out

def bp_simple(sig, center, q=2.0, sr=SR):
    """Band-pass via cascaded lp+hp."""
    low = max(50, center - center / (2 * q))
    high = center + center / (2 * q)
    return hp1(lp1(sig, high, sr), low, sr)

# ── Drum synthesis ─────────────────────────────────────────────
def kick(length=0.18, sr=SR):
    n = int(length * sr)
    t = np.arange(n) / sr
    # Pitch envelope: 150Hz -> 50Hz
    freq_env = 50 + 100 * np.exp(-t * 30)
    phase = 2 * np.pi * np.cumsum(freq_env) / sr
    body = np.sin(phase)
    # Click transient
    click = np.random.uniform(-1, 1, min(int(0.003 * sr), n))
    click_pad = np.zeros(n)
    click_pad[:len(click)] = click * 0.5
    env = np.exp(-t / (0.04 * sr / sr))  # ~40ms decay
    env = np.exp(-np.arange(n) / (0.06 * sr))
    return (body * env + click_pad) * 0.85

def snare(length=0.15, sr=SR):
    n = int(length * sr)
    t = np.arange(n) / sr
    # Noise body
    nz = np.random.uniform(-1, 1, n)
    body = np.sin(2 * np.pi * 180 * t) * 0.3
    env = np.exp(-np.arange(n) / (0.08 * sr))
    return (nz * 0.6 + body) * env * 0.55

def hihat(length=0.05, sr=SR):
    n = int(length * sr)
    nz = np.random.uniform(-1, 1, n)
    # High-pass to make it crisp/metallic
    filtered = hp1(nz, 7000, sr)
    env = np.exp(-np.arange(n) / (0.012 * sr))
    return filtered * env * 0.25

def metallic_hit(freq=800, length=0.3, sr=SR):
    """Metallic bell hit using FM + resonant noise."""
    n = int(length * sr)
    t = np.arange(n) / sr
    # FM metallic tone
    fm_tone = fm(freq, freq * 3.47, 8, length, sr)
    # Add resonant noise burst
    nz = np.random.uniform(-1, 1, n)
    resonant = bp_simple(nz, freq, q=8, sr=sr)
    env = np.exp(-np.arange(n) / (0.15 * sr))
    return (fm_tone * 0.5 + resonant * 0.3) * env * 0.4

# ── Pad (cinematic strings) ────────────────────────────────────
def pad_chord(freqs, length, sr=SR):
    """Layered sine/triangle detuned chord with slow attack."""
    n = int(length * sr)
    out = np.zeros(n)
    for f in freqs:
        # Detune layers for richness
        out += sine(f, length, sr) * 0.25
        out += sine(f * 1.005, length, sr) * 0.15
        out += tri(f * 0.5, length, sr) * 0.1
    # Slow attack/release envelope
    a = int(0.3 * sr)
    r = int(0.5 * sr)
    env = np.ones(n)
    if a < n: env[:a] = np.linspace(0, 1, a)
    if r < n: env[-r:] = np.linspace(1, 0, r)
    return out * env

# ── Build the arrangement ──────────────────────────────────────
mix = np.zeros(N)

# Helper: place a sound at a time offset
def place(sig, offset):
    start = int(offset * SR)
    end = start + len(sig)
    if end > N:
        sig = sig[:N - start]
        end = N
    if start < N and start >= 0:
        mix[start:end] += sig[:end - start]

beat = BEAT  # 0.46875s

# ─── Section 1: Intro (0 - 8s) — cinematic pad + metallic atmosphere ──
# Dm pad chord: D3, F3, A3, C4
intro_end = 8.0
pad_len = intro_end
pad = pad_chord([Nm['D3'], Nm['F3'], Nm['A3'], Nm['C4']], pad_len)
place(pad * 0.18, 0)

# Sub bass drone
sub = sine(Nm['D2'], intro_end) * 0.12
place(sub, 0)

# Metallic hits scattered (future/metallic texture)
for i, ts in enumerate([0.5, 2.0, 3.5, 5.0, 6.5]):
    hit = metallic_hit(freq=600 + i * 80, length=0.4)
    place(hit * 0.3, ts)

# Sweep (future/tech texture)
sweep_len = 4.0
sweep_n = int(sweep_len * SR)
sweep_t = np.arange(sweep_n) / SR
sweep_freq = 200 + (2000 - 200) * (sweep_t / sweep_len)
sweep_phase = 2 * np.pi * np.cumsum(sweep_freq) / SR
sweep_sig = np.sin(sweep_phase) * np.exp(-sweep_t * 0.3) * 0.08
place(sweep_sig, 2.0)

# ─── Section 2: Build (8 - 16s) — add drums + arp ───────────────
build_start = 8.0
# Four-on-the-floor kicks from 8s
for b in range(0, 16):
    t = build_start + b * beat
    if t < 16.0:
        place(kick(), t)

# Hihat offbeats
for b in range(0, 32):
    t = build_start + b * (beat / 2)
    if t < 16.0:
        place(hihat(), t)

# Snare on beats 2 and 4
for b in range(4, 16, 4):
    t = build_start + b * beat
    if t < 16.0:
        place(snare(), t)

# Arpeggio (tech/future) — Dm arp: D4 F4 A4 C5 repeating
arp_notes = [Nm['D4'], Nm['F4'], Nm['A4'], Nm['C5'], Nm['A4'], Nm['F4']]
arp_step = beat / 4  # 16th notes
for i in range(0, 64):
    t = build_start + i * arp_step
    if t >= 16.0:
        break
    freq = arp_notes[i % len(arp_notes)]
    arp_sig = fm(freq, freq * 2.0, 3.0, 0.15) * 0.15
    place(arp_sig, t)

# Pad continues (lower volume)
pad2 = pad_chord([Nm['D3'], Nm['F3'], Nm['A3']], 8.0)
place(pad2 * 0.12, build_start)

# ─── Section 3: Drop (16 - 24s) — full energy ──────────────────
drop_start = 16.0
# Kicks
for b in range(0, 17):
    t = drop_start + b * beat
    if t < 24.0:
        place(kick(), t)

# Snares on 2 and 4
for b in range(2, 17, 4):
    t = drop_start + b * beat
    if t < 24.0:
        place(snare(), t)

# Hihats 16th
for b in range(0, 34):
    t = drop_start + b * (beat / 2)
    if t < 24.0:
        place(hihat(), t)

# Bass line (Dm groove) — saw bass, low-passed
bass_pattern = ['D2', 'D2', 'A2', 'D2', 'D2', 'F3', 'A2', 'D2']
for b in range(0, 16):
    t = drop_start + b * (beat / 2)
    if t >= 24.0:
        break
    freq = Nm[bass_pattern[b % len(bass_pattern)]]
    b_len = beat / 2 * 0.9
    b_sig = saw(freq, b_len) 
    b_sig = lp1(b_sig, 400)
    b_env = adsr(b_len, a=0.005, d=0.02, s=0.8, r=0.03)
    b_sig = b_sig[:len(b_env)] * b_env * 0.35
    place(b_sig, t)

# Lead melody (metallic FM) — D minor pentatonic
melody = [
    (Nm['D4'], beat * 0.5), (Nm['F4'], beat * 0.5), (Nm['A4'], beat),
    (Nm['D5'], beat * 0.5), (Nm['C5'], beat * 0.5), (Nm['A4'], beat),
    (Nm['G4'], beat * 0.5), (Nm['F4'], beat * 0.5), (Nm['D4'], beat * 2),
    (Nm['F5'], beat * 0.5), (Nm['D5'], beat * 0.5), (Nm['A4'], beat),
    (Nm['G4'], beat * 0.5), (Nm['F4'], beat * 0.5), (Nm['D4'], beat * 1.5),
]
mt = drop_start
for freq, dur in melody:
    if mt >= 24.0:
        break
    # Metallic FM lead: carrier + modulator at 3.5x with high index
    lead = fm(freq, freq * 3.47, 6.0, dur * 0.95)
    lead_env = adsr(dur * 0.95, a=0.01, d=0.03, s=0.7, r=0.05)
    lead = lead[:len(lead_env)] * lead_env * 0.18
    place(lead, mt)
    mt += dur

# Pad under the drop (darker)
pad3 = pad_chord([Nm['D3'], Nm['F3'], Nm['A3']], 8.0)
place(pad3 * 0.10, drop_start)

# Metallic percussion accents
for i, ts in enumerate([17.0, 18.5, 20.0, 21.5, 23.0]):
    hit = metallic_hit(freq=700 + i * 100, length=0.3)
    place(hit * 0.25, ts)

# ─── Section 4: Breakdown (24 - 32s) — melody + pad, drums reduced ──
break_start = 24.0
# Sparse kicks
for b in range(0, 8):
    t = break_start + b * beat * 2
    if t < 32.0:
        place(kick(0.15) * 0.6, t)

# Hihat occasional
for b in range(0, 16):
    t = break_start + b * beat
    if t < 32.0 and b % 2 == 1:
        place(hihat() * 0.7, t)

# Sweeping pad (cinematic)
pad4 = pad_chord([Nm['A3'], Nm['C4'], Nm['D4'], Nm['F4']], 8.0)
place(pad4 * 0.20, break_start)

# Sub bass
sub2 = sine(Nm['A2'], 8.0) * 0.10
place(sub2, break_start)

# Lead melody variation (higher, more emotional)
melody2 = [
    (Nm['A4'], beat), (Nm['C5'], beat), (Nm['D5'], beat * 1.5),
    (Nm['C5'], beat * 0.5), (Nm['A4'], beat), (Nm['F4'], beat * 1.5),
    (Nm['D4'], beat * 0.5), (Nm['F4'], beat), (Nm['A4'], beat * 2),
    (Nm['D5'], beat * 0.5), (Nm['C5'], beat * 0.5), (Nm['A4'], beat),
]
mt = break_start
for freq, dur in melody2:
    if mt >= 32.0:
        break
    lead = fm(freq, freq * 3.47, 5.0, dur * 0.95)
    lead_env = adsr(dur * 0.95, a=0.02, d=0.05, s=0.6, r=0.08)
    lead = lead[:len(lead_env)] * lead_env * 0.15
    place(lead, mt)
    mt += dur

# Reverse-style metallic swell (future texture)
swell_len = 3.0
swell_n = int(swell_len * SR)
swell_t = np.arange(swell_n) / SR
swell = np.sin(2 * np.pi * 440 * swell_t) * (swell_t / swell_len) * 0.05
place(swell, 26.0)

# ─── Section 5: Final Drop + Outro (32 - 40s) ──────────────────
final_start = 32.0
# Full drums return
for b in range(0, 17):
    t = final_start + b * beat
    if t < 40.0:
        place(kick(), t)
for b in range(2, 17, 4):
    t = final_start + b * beat
    if t < 40.0:
        place(snare(), t)
for b in range(0, 34):
    t = final_start + b * (beat / 2)
    if t < 40.0:
        place(hihat(), t)

# Bass returns
for b in range(0, 16):
    t = final_start + b * (beat / 2)
    if t >= 40.0:
        break
    freq = Nm[bass_pattern[b % len(bass_pattern)]]
    b_len = beat / 2 * 0.9
    b_sig = lp1(saw(freq, b_len), 400)
    b_env = adsr(b_len, a=0.005, d=0.02, s=0.8, r=0.03)
    b_sig = b_sig[:len(b_env)] * b_env * 0.30
    place(b_sig, t)

# Lead melody (reprise with variation)
melody3 = [
    (Nm['D5'], beat * 0.5), (Nm['F5'], beat * 0.5), (Nm['D5'], beat),
    (Nm['C5'], beat * 0.5), (Nm['A4'], beat * 0.5), (Nm['F4'], beat),
    (Nm['A4'], beat * 0.5), (Nm['D5'], beat * 0.5), (Nm['F5'], beat * 1.5),
]
mt = final_start
for freq, dur in melody3:
    if mt >= 40.0:
        break
    lead = fm(freq, freq * 3.47, 7.0, dur * 0.95)
    lead_env = adsr(dur * 0.95, a=0.008, d=0.02, s=0.75, r=0.04)
    lead = lead[:len(lead_env)] * lead_env * 0.20
    place(lead, mt)
    mt += dur

# Arp continues for energy
for i in range(0, 34):
    t = final_start + i * arp_step
    if t >= 40.0:
        break
    freq = arp_notes[i % len(arp_notes)]
    arp_sig = fm(freq, freq * 2.0, 3.5, 0.12) * 0.10
    place(arp_sig, t)

# Pad under final drop
pad5 = pad_chord([Nm['D3'], Nm['F3'], Nm['A3'], Nm['C4']], 8.0)
place(pad5 * 0.12, final_start)

# Metallic accents
for i, ts in enumerate([33.0, 34.5, 36.0, 37.5, 39.0]):
    hit = metallic_hit(freq=800 + i * 60, length=0.35)
    place(hit * 0.22, ts)

# Outro fade (last 2s)
fade_n = int(2.0 * SR)
fade = np.linspace(1, 0, fade_n)
mix[-fade_n:] *= fade

# ── Master processing ──────────────────────────────────────────
# Soft saturation for warmth
mix = np.tanh(mix * 1.2) * 0.9

# Normalize to -1dBFS
peak = np.max(np.abs(mix))
if peak > 0:
    mix = mix / peak * 0.89

# Convert to stereo (slight stereo widening)
left = mix.copy()
right = mix.copy()
# Haas effect for width on highs — delay right channel slightly
delay_s = int(0.012 * SR)  # 12ms
right_delayed = np.zeros_like(right)
right_delayed[delay_s:] = right[:-delay_s]
right = right_delayed * 0.7 + right * 0.3

stereo = np.column_stack([left, right])

# Convert to 16-bit
stereo_int = np.clip(stereo, -1, 1)
stereo_int = (stereo_int * 32767).astype(np.int16)

# Write WAV
wav_path = '/Users/jiangzhuang/WorkBuddy/2026-08-20-17-21-51/website/assets/audio/vj_bgm.wav'
with wave.open(wav_path, 'w') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(stereo_int.tobytes())

print(f"WAV written: {wav_path}")
print(f"Duration: {DUR}s, Samples: {N}, Peak: {peak:.3f}")
print(f"File size: {os.path.getsize(wav_path) / 1024 / 1024:.2f} MB")
