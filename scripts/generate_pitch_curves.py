#!/usr/bin/env python3
"""
Step 1: Reference Pitch Curve Generator
Processes each word MP3 from hsk_deck.json, extracts a normalized F0 (pitch)
contour using a vectorized YIN algorithm, and outputs tone_profiles.json.

Output: mandarin_tone_trainer/public/tone_profiles.json
Schema: keyed by audio filename (e.g. "hskstory-hsk1-001.mp3"), maps to:
  {
    "word_index": 0,         // position in hsk_deck.json
    "hsk_level": "HSK 1",
    "hanzi_simp": "一",
    "pinyin": "yī",
    "syllables": [
      {"syllable": "yī", "tone": 1}
    ],
    "f0_norm": [0.1, 0.2, ...],  // 30-point normalized semitone contour
    "voiced_ratio": 0.47,         // fraction of voiced frames
    "f0_median_hz": 210.5         // speaker baseline Hz
  }

If fewer than 3 voiced frames are found, f0_norm is null (unvoiceable entry).
"""

import json
import math
import os
import subprocess
import tempfile
import wave
import array
import time

import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = "/Users/mauricio/Documents/Scripts/mandarin_tone_trainer"
APP_DIR = os.path.join(BASE_DIR, "mandarin_tone_trainer")
HSK_DECK_PATH = os.path.join(APP_DIR, "other_dbs", "hsk_deck.json")
AUDIO_BASE_DIR = os.path.join(APP_DIR, "public")
OUTPUT_PATH = os.path.join(APP_DIR, "public", "tone_profiles.json")

# ── Pinyin diacritic → tone number ───────────────────────────────────────────
DIACRITIC_TONE = {
    "ā": 1, "á": 2, "ǎ": 3, "à": 4,
    "ē": 1, "é": 2, "ě": 3, "è": 4,
    "ī": 1, "í": 2, "ǐ": 3, "ì": 4,
    "ō": 1, "ó": 2, "ǒ": 3, "ò": 4,
    "ū": 1, "ú": 2, "ǔ": 3, "ù": 4,
    "ǖ": 1, "ǘ": 2, "ǚ": 3, "ǜ": 4,
}


def parse_pinyin_tones(pinyin_str: str) -> list[dict]:
    """Split pinyin into syllables and infer tone number from diacritics."""
    syllables = pinyin_str.strip().split()
    result = []
    for syl in syllables:
        tone = 5  # neutral/toneless default
        for ch in syl:
            if ch in DIACRITIC_TONE:
                tone = DIACRITIC_TONE[ch]
                break
        result.append({"syllable": syl, "tone": tone})
    return result


# ── Audio decoding ────────────────────────────────────────────────────────────
def mp3_to_pcm_float32(mp3_path: str) -> tuple[np.ndarray, int]:
    """
    Decode an MP3 to 16kHz (native SR preserved) mono float32 PCM
    using macOS built-in afconvert — no network or external deps.
    """
    tmp = tempfile.mktemp(suffix=".wav")
    try:
        subprocess.run(
            ["afconvert", mp3_path, tmp, "-d", "LEI16", "-f", "WAVE", "-c", "1"],
            check=True,
            stderr=subprocess.DEVNULL,
        )
        with wave.open(tmp) as w:
            sr = w.getframerate()
            raw = w.readframes(w.getnframes())
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
        return samples, sr
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


# ── YIN pitch tracker (numpy-vectorized) ─────────────────────────────────────
def yin_pitch(
    samples: np.ndarray,
    sr: int,
    f0_min: float = 60.0,
    f0_max: float = 500.0,
    frame_ms: float = 10.0,
    threshold: float = 0.12,
) -> list[float]:
    """
    Returns a list of per-frame F0 estimates in Hz.
    0.0 = unvoiced frame.
    """
    frame_size = int(sr * 0.025)   # 25ms analysis window
    hop_size = int(sr * frame_ms / 1000)
    tau_min = max(1, int(sr / f0_max))
    tau_max = min(int(sr / f0_min), frame_size // 2)
    n = len(samples)
    f0_track = []

    t = 0
    while t + frame_size <= n:
        frame = samples[t : t + frame_size]

        # Difference function (vectorized)
        search_len = frame_size - tau_max
        d = np.zeros(tau_max + 1)
        for tau in range(1, tau_max + 1):
            diff = frame[:search_len] - frame[tau : tau + search_len]
            d[tau] = float(np.dot(diff, diff))

        # Cumulative mean normalized difference
        cmn = np.ones(tau_max + 1)
        cum = 0.0
        for tau in range(1, tau_max + 1):
            cum += d[tau]
            cmn[tau] = d[tau] * tau / cum if cum > 0 else 1.0

        # First tau below threshold (parabolic refinement skipped for speed)
        tau_star = -1
        for tau in range(tau_min, tau_max):
            if cmn[tau] < threshold:
                while tau + 1 < tau_max and cmn[tau + 1] < cmn[tau]:
                    tau += 1
                tau_star = tau
                break

        f0_track.append(float(sr / tau_star) if tau_star > 0 else 0.0)
        t += hop_size

    return f0_track


# ── Contour normalization ─────────────────────────────────────────────────────
def normalize_contour(f0_track: list[float], n_points: int = 30) -> tuple[list | None, float | None]:
    """
    Extracts only voiced frames, converts to semitones relative to median,
    and resamples to n_points via linear interpolation.
    Returns (contour, median_hz) or (None, None) if too few voiced frames.
    """
    voiced = [v for v in f0_track if v > 0.0]
    if len(voiced) < 3:
        return None, None

    sorted_v = sorted(voiced)
    median_hz = sorted_v[len(sorted_v) // 2]

    semitones = [12.0 * math.log2(v / median_hz) for v in voiced]
    n = len(semitones)
    contour = []
    for i in range(n_points):
        idx = i * (n - 1) / (n_points - 1)
        lo = int(idx)
        hi = min(lo + 1, n - 1)
        frac = idx - lo
        val = semitones[lo] * (1.0 - frac) + semitones[hi] * frac
        contour.append(round(val, 4))

    return contour, round(median_hz, 2)


# ── Main pipeline ─────────────────────────────────────────────────────────────
def main():
    print("Loading hsk_deck.json ...")
    with open(HSK_DECK_PATH, "r", encoding="utf-8") as f:
        hsk_deck = json.load(f)

    print(f"Processing {len(hsk_deck)} entries ...\n")

    profiles: dict = {}
    null_count = 0
    t_start = time.time()

    for idx, entry in enumerate(hsk_deck):
        audio_rel = entry["audio"]          # e.g. "audio/hsk1/hskstory-hsk1-001.mp3"
        audio_filename = os.path.basename(audio_rel)
        mp3_path = os.path.join(AUDIO_BASE_DIR, audio_rel)

        if not os.path.exists(mp3_path):
            print(f"  [SKIP] Missing file: {mp3_path}")
            null_count += 1
            continue

        try:
            samples, sr = mp3_to_pcm_float32(mp3_path)
            f0_track = yin_pitch(samples, sr)
            contour, median_hz = normalize_contour(f0_track)

            voiced_frames = sum(1 for v in f0_track if v > 0)
            voiced_ratio = round(voiced_frames / len(f0_track), 3) if f0_track else 0.0

            syllables = parse_pinyin_tones(entry["pinyin"])

            profiles[audio_filename] = {
                "word_index": idx,
                "hsk_level": entry["hsk_level"],
                "hanzi_simp": entry["hanzi_simp"],
                "pinyin": entry["pinyin"],
                "syllables": syllables,
                "f0_norm": contour,
                "voiced_ratio": voiced_ratio,
                "f0_median_hz": median_hz,
            }

            if contour is None:
                null_count += 1

        except Exception as e:
            print(f"  [ERROR] {audio_filename}: {e}")
            null_count += 1
            profiles[audio_filename] = {
                "word_index": idx,
                "hsk_level": entry["hsk_level"],
                "hanzi_simp": entry["hanzi_simp"],
                "pinyin": entry["pinyin"],
                "syllables": parse_pinyin_tones(entry["pinyin"]),
                "f0_norm": None,
                "voiced_ratio": 0.0,
                "f0_median_hz": None,
                "error": str(e),
            }

        # Progress every 50 entries
        if (idx + 1) % 50 == 0:
            elapsed = time.time() - t_start
            rate = (idx + 1) / elapsed
            remaining = (len(hsk_deck) - idx - 1) / rate
            print(f"  [{idx+1}/{len(hsk_deck)}] {elapsed:.1f}s elapsed — ~{remaining:.0f}s remaining")

    total_time = time.time() - t_start
    valid_count = len(profiles) - null_count

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, separators=(",", ":"))

    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"\n✓ Done in {total_time:.1f}s")
    print(f"  Profiles written : {len(profiles)}")
    print(f"  Valid contours   : {valid_count}")
    print(f"  Null/skipped     : {null_count}")
    print(f"  Output file      : {OUTPUT_PATH} ({file_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
