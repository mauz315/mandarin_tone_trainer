#!/usr/bin/env python3
"""
generate_context_lab_audio.py
─────────────────────────────────────────────────────────────────────────────
Multi-Speaker Edge-TTS Audio Synthesizer with Deterministic Stitching
Mandarin Tone Trainer • Context Lab

Synthesizes conversational turns for duo_dialogues.json:
- Speaker A: zh-CN-XiaoxiaoNeural (Female)
- Speaker B: zh-CN-YunxiNeural (Male)
- Inter-turn natural conversational gap: 450ms silence (encoded via lameenc)
- Automatically computes exact millisecond timestamps and total duration.
- Updates duo_dialogues.json and mirrors assets to public/ and docs/.

Usage:
  # Pilot batch (Unit 1, 10 dialogues):
  .venv/bin/python scripts/generate_context_lab_audio.py --pilot

  # Full database (All 350 dialogues):
  .venv/bin/python scripts/generate_context_lab_audio.py --all

  # Specific unit:
  .venv/bin/python scripts/generate_context_lab_audio.py --unit 1
"""

import argparse
import asyncio
import json
import os
import shutil
import sys
from pathlib import Path

import edge_tts
import lameenc
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
APP_DIR = PROJECT_DIR if (PROJECT_DIR / "package.json").exists() else PROJECT_DIR / "mandarin_tone_trainer"

DB_PATHS = [
    APP_DIR / "other_dbs" / "duo_dialogues.json",
    APP_DIR / "public" / "duo_dialogues.json",
    APP_DIR / "docs" / "duo_dialogues.json",
]

PUBLIC_AUDIO_DIR = APP_DIR / "public" / "audio" / "duo_dialogues"
DOCS_AUDIO_DIR = APP_DIR / "docs" / "audio" / "duo_dialogues"

SILENCE_BUFFER_MS = 450
SAMPLE_RATE = 24000
BITRATE_KBPS = 48

VOICE_MAP = {
    "A": "zh-CN-XiaoxiaoNeural",
    "B": "zh-CN-YunxiNeural",
}


def build_silent_mp3(duration_ms: int = SILENCE_BUFFER_MS, sample_rate: int = SAMPLE_RATE, bitrate: int = BITRATE_KBPS) -> bytes:
    """Encodes pure PCM silence to an MP3 block matching Edge-TTS format."""
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    samples = np.zeros(num_samples, dtype=np.int16)

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    mp3_data = encoder.encode(samples.tobytes())
    mp3_data += encoder.flush()
    return mp3_data


def get_mp3_duration_ms(data: bytes) -> int:
    """Accurately calculates total duration of an MP3 byte stream in milliseconds by parsing frame headers."""
    pos = 0
    total_samples = 0
    detected_sr = 24000

    bitrate_map_v2_l3 = {1: 8, 2: 16, 3: 24, 4: 32, 5: 40, 6: 48, 7: 56, 8: 64, 9: 80, 10: 96, 11: 112, 12: 128, 13: 144, 14: 160}
    bitrate_map_v1_l3 = {1: 32, 2: 40, 3: 48, 4: 56, 5: 64, 6: 80, 7: 96, 8: 112, 9: 128, 10: 160, 11: 192, 12: 224, 13: 256, 14: 320}
    sr_map_v1 = {0: 44100, 1: 48000, 2: 32000}
    sr_map_v2 = {0: 22050, 1: 24000, 2: 16000}
    sr_map_v25 = {0: 11025, 1: 12000, 2: 8000}

    # Skip ID3v2 header if present
    if data.startswith(b"ID3") and len(data) >= 10:
        size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F)
        pos = 10 + size

    while pos + 4 <= len(data):
        if data[pos] == 0xFF and (data[pos + 1] & 0xE0) == 0xE0:
            h = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]
            ver_idx = (h >> 19) & 3
            layer_idx = (h >> 17) & 3
            br_idx = (h >> 12) & 0xF
            sr_idx = (h >> 10) & 3
            pad = (h >> 9) & 1

            if ver_idx == 3 and layer_idx == 1 and br_idx in bitrate_map_v1_l3 and sr_idx in sr_map_v1:
                sr = sr_map_v1[sr_idx]
                br = bitrate_map_v1_l3[br_idx] * 1000
                frame_len = (144 * br) // sr + pad
                total_samples += 1152
                detected_sr = sr
                pos += frame_len
            elif ver_idx in (0, 2) and layer_idx == 1:
                sr_map = sr_map_v2 if ver_idx == 2 else sr_map_v25
                if sr_idx in sr_map and br_idx in bitrate_map_v2_l3:
                    sr = sr_map[sr_idx]
                    br = bitrate_map_v2_l3[br_idx] * 1000
                    frame_len = (72 * br) // sr + pad
                    total_samples += 576
                    detected_sr = sr
                    pos += frame_len
                else:
                    pos += 1
            else:
                pos += 1
        else:
            pos += 1

    return round((total_samples / detected_sr) * 1000) if detected_sr else 0


async def synthesize_turn_mp3(text: str, voice: str, retries: int = 3) -> bytes:
    """Synthesizes text using Edge-TTS and returns MP3 bytes."""
    clean_text = text.strip()
    for attempt in range(retries):
        try:
            communicate = edge_tts.Communicate(clean_text, voice)
            audio_data = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])
            if audio_data:
                return bytes(audio_data)
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"TTS synthesis failed for '{clean_text}' ({voice}): {e}") from e
            await asyncio.sleep(0.6 * (attempt + 1))
    return b""


async def process_single_dialogue(dialogue: dict, silent_gap: bytes, out_dir: Path, force: bool = False) -> bool:
    """Synthesizes all turns, stitches MP3 with silent buffer, and calculates exact timestamps."""
    d_id = dialogue["dialogue_id"]
    out_file = out_dir / f"{d_id}.mp3"

    # Check if already generated with non-zero timestamps
    if not force and out_file.exists() and dialogue.get("total_duration_ms", 0) > 0:
        return False

    combined_mp3 = bytearray()
    current_ms = 0
    turns = dialogue.get("turns", [])

    for i, turn in enumerate(turns):
        speaker_tag = turn.get("speaker", "A")
        voice = turn.get("voice") or VOICE_MAP.get(speaker_tag, VOICE_MAP["A"])
        text = turn.get("hanzi", "")

        turn_bytes = await synthesize_turn_mp3(text, voice)
        turn_dur_ms = get_mp3_duration_ms(turn_bytes)
        if turn_dur_ms == 0:
            turn_dur_ms = max(500, int(len(turn_bytes) / 6.0))  # fallback heuristic

        turn["audio_start_ms"] = current_ms
        turn["audio_end_ms"] = current_ms + turn_dur_ms

        combined_mp3.extend(turn_bytes)
        current_ms += turn_dur_ms

        # Inter-turn silence if not the last turn
        if i < len(turns) - 1:
            combined_mp3.extend(silent_gap)
            current_ms += SILENCE_BUFFER_MS

    dialogue["total_duration_ms"] = current_ms
    dialogue["audio_file"] = f"audio/duo_dialogues/{d_id}.mp3"

    # Write output MP3
    out_file.write_bytes(combined_mp3)
    return True


async def main():
    parser = argparse.ArgumentParser(description="Multi-Speaker Edge-TTS Audio Synthesizer for Context Lab")
    parser.add_argument("--pilot", action="store_true", help="Generate pilot batch only (Unit 1, 10 dialogues)")
    parser.add_argument("--all", action="store_true", help="Generate all 350 dialogues")
    parser.add_argument("--unit", type=int, default=None, help="Generate for a specific unit index (1-35)")
    parser.add_argument("--force", action="store_true", help="Force re-generation of existing audio")
    parser.add_argument("--concurrency", type=int, default=3, help="Concurrent dialogue synthesis jobs")
    args = parser.parse_args()

    # Determine target units
    if args.pilot:
        target_units = {1}
        print("Mode: PILOT BATCH (Unit 1 only, 10 dialogues)")
    elif args.unit:
        target_units = {args.unit}
        print(f"Mode: SINGLE UNIT (Unit {args.unit})")
    elif args.all:
        target_units = set(range(1, 36))
        print("Mode: FULL GENERATION (All 35 units, 350 dialogues)")
    else:
        # Default to pilot batch for safe verification
        target_units = {1}
        print("No mode specified: defaulting to PILOT BATCH (Unit 1, 10 dialogues).")

    # Ensure output directories exist
    PUBLIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    # Load master database
    primary_db_path = DB_PATHS[0]
    if not primary_db_path.exists():
        print(f"Error: {primary_db_path} not found.")
        sys.exit(1)

    with open(primary_db_path, "r", encoding="utf-8") as f:
        db = json.load(f)

    dialogues = db.get("dialogues", [])
    target_dialogues = [d for d in dialogues if d.get("unit_index") in target_units]
    total_target = len(target_dialogues)

    print(f"Total target dialogues: {total_target}")
    print("Preparing 450ms silence buffer with lameenc (24kHz 48kbps mono)...")
    silent_gap = build_silent_mp3(SILENCE_BUFFER_MS, SAMPLE_RATE, BITRATE_KBPS)

    sem = asyncio.Semaphore(args.concurrency)
    counter = [0]
    generated_count = [0]

    async def worker(dlg):
        async with sem:
            did_generate = await process_single_dialogue(dlg, silent_gap, PUBLIC_AUDIO_DIR, args.force)
            if did_generate:
                generated_count[0] += 1
                # Copy to docs
                src_file = PUBLIC_AUDIO_DIR / f"{dlg['dialogue_id']}.mp3"
                if src_file.exists():
                    shutil.copy2(src_file, DOCS_AUDIO_DIR / f"{dlg['dialogue_id']}.mp3")
            counter[0] += 1
            print(f"  [{counter[0]}/{total_target}] {dlg['dialogue_id']} ({dlg.get('title_en', '')}) - {dlg.get('total_duration_ms', 0)}ms")

    tasks = [worker(d) for d in target_dialogues]
    await asyncio.gather(*tasks)

    # Save updated master DB to other_dbs, public, and docs
    for path in DB_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        print(f"Updated timestamps saved to {path}")

    print(f"\nFinished! Synthesized {generated_count[0]} new MP3 files in public/audio/duo_dialogues and docs/audio/duo_dialogues.")


if __name__ == "__main__":
    asyncio.run(main())
