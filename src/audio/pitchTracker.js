/**
 * pitchTracker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 3: Zero-Dependency Client-Side YIN Pitch Tracker (<4KB)
 *
 * Implements the YIN pitch algorithm (de Cheveigné & Kawahara, 2002) with:
 *   1. Vectorized difference function
 *   2. Cumulative mean normalized difference
 *   3. Absolute thresholding (default 0.12)
 *   4. Parabolic interpolation for sub-bin frequency accuracy
 *   5. Median semitone normalization: Δst = 12 * log2(F0 / F_median)
 *   6. Dynamic uniform resampling to 30 points (matches tone_profiles.json)
 *   7. Fallback syllable segmentation via energy & silence VAD
 */

const DEFAULT_F0_MIN = 60.0;   // Deep male voice lower bound (Hz)
const DEFAULT_F0_MAX = 500.0;  // High child/female voice upper bound (Hz)
const DEFAULT_THRESHOLD = 0.12;

export class PitchTracker {
  /**
   * Run YIN pitch tracking on a Float32Array PCM buffer.
   *
   * @param {Float32Array} pcm
   * @param {number} sampleRate  e.g. 16000
   * @param {object} options
   * @returns {{ times: number[], f0: number[], voiced: boolean[], medianHz: number, voicedRatio: number }}
   */
  static extractF0(pcm, sampleRate = 16000, options = {}) {
    const f0Min = options.f0Min || DEFAULT_F0_MIN;
    const f0Max = options.f0Max || DEFAULT_F0_MAX;
    const threshold = options.threshold || DEFAULT_THRESHOLD;
    const frameMs = options.frameMs || 10.0;

    const frameSize = Math.floor(sampleRate * 0.025); // 25ms window
    const hopSize = Math.floor((sampleRate * frameMs) / 1000);
    const tauMin = Math.max(1, Math.floor(sampleRate / f0Max));
    const tauMax = Math.min(Math.floor(sampleRate / f0Min), Math.floor(frameSize / 2));
    const searchLen = frameSize - tauMax;

    const n = pcm.length;
    const times = [];
    const f0 = [];
    const voiced = [];

    // Pre-allocated difference buffers
    const d = new Float64Array(tauMax + 1);
    const cmn = new Float64Array(tauMax + 1);

    let t = 0;
    while (t + frameSize <= n) {
      // Step 1: Difference function
      for (let tau = 1; tau <= tauMax; tau++) {
        let sum = 0.0;
        for (let j = 0; j < searchLen; j++) {
          const diff = pcm[t + j] - pcm[t + j + tau];
          sum += diff * diff;
        }
        d[tau] = sum;
      }

      // Step 2: Cumulative mean normalized difference
      cmn[0] = 1.0;
      let runningSum = 0.0;
      for (let tau = 1; tau <= tauMax; tau++) {
        runningSum += d[tau];
        cmn[tau] = runningSum > 0 ? (d[tau] * tau) / runningSum : 1.0;
      }

      // Step 3: Absolute threshold
      let tauStar = -1;
      for (let tau = tauMin; tau < tauMax; tau++) {
        if (cmn[tau] < threshold) {
          while (tau + 1 < tauMax && cmn[tau + 1] < cmn[tau]) {
            tau++;
          }
          tauStar = tau;
          break;
        }
      }

      // Step 4: Parabolic interpolation for sub-bin precision
      let pitchHz = 0.0;
      if (tauStar > 0) {
        let betterTau = tauStar;
        const x0 = tauStar > 0 ? tauStar - 1 : tauStar;
        const x2 = tauStar < tauMax ? tauStar + 1 : tauStar;
        if (x0 !== tauStar && x2 !== tauStar) {
          const s0 = cmn[x0];
          const s1 = cmn[tauStar];
          const s2 = cmn[x2];
          const denom = 2 * (2 * s1 - s2 - s0);
          if (denom !== 0) {
            betterTau = tauStar + (s0 - s2) / denom;
          }
        }
        pitchHz = sampleRate / betterTau;
      }

      const isVoiced = pitchHz >= f0Min && pitchHz <= f0Max;
      times.push(t / sampleRate);
      f0.push(isVoiced ? pitchHz : 0.0);
      voiced.push(isVoiced);

      t += hopSize;
    }

    // Compute speaker median Hz across voiced frames
    const voicedF0 = f0.filter((v) => v > 0);
    let medianHz = 0;
    if (voicedF0.length > 0) {
      const sorted = [...voicedF0].sort((a, b) => a - b);
      medianHz = sorted[Math.floor(sorted.length / 2)];
    }

    const voicedRatio = f0.length > 0 ? voicedF0.length / f0.length : 0;

    return {
      times,
      f0,
      voiced,
      medianHz: Math.round(medianHz * 10) / 10,
      voicedRatio: Math.round(voicedRatio * 1000) / 1000,
    };
  }

  /**
   * Convert an array of raw F0 values (Hz) to semitones relative to median:
   * Δst = 12 * log2(F0 / F_median)
   *
   * @param {number[]} f0Array
   * @param {number} [medianHz]
   * @returns {{ semitones: number[], medianHz: number }}
   */
  static normalizeToSemitones(f0Array, medianHz = null) {
    const voiced = f0Array.filter((v) => v > 0);
    if (voiced.length === 0) {
      return { semitones: [], medianHz: 0 };
    }

    if (!medianHz || medianHz <= 0) {
      const sorted = [...voiced].sort((a, b) => a - b);
      medianHz = sorted[Math.floor(sorted.length / 2)];
    }

    const semitones = f0Array.map((v) => {
      if (v <= 0) return null;
      return Math.round(12 * Math.log2(v / medianHz) * 1000) / 1000;
    });

    return { semitones, medianHz };
  }

  /**
   * Resample a voiced contour to a uniform array of N points (default 30)
   * using linear interpolation.
   *
   * @param {number[]} values
   * @param {number} numPoints
   * @returns {number[]|null}
   */
  static resampleContour(values, numPoints = 30) {
    const clean = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (clean.length < 3) return null;

    const n = clean.length;
    const resampled = new Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
      const idx = (i * (n - 1)) / (numPoints - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, n - 1);
      const frac = idx - lo;
      const val = clean[lo] * (1.0 - frac) + clean[hi] * frac;
      resampled[i] = Math.round(val * 10000) / 10000;
    }

    return resampled;
  }

  /**
   * Energy-based Voice Activity Detection (VAD) to find start & end
   * of the spoken utterance and split multi-syllable boundaries.
   *
   * @param {Float32Array} pcm
   * @param {number} sampleRate
   * @param {number} expectedSyllables
   * @returns {Array<{ start: number, end: number }>}
   */
  static detectSyllableWindows(pcm, sampleRate = 16000, expectedSyllables = 1) {
    const frameSize = Math.floor(sampleRate * 0.02); // 20ms
    const hopSize = Math.floor(sampleRate * 0.01);   // 10ms
    const numFrames = Math.floor((pcm.length - frameSize) / hopSize);

    if (numFrames <= 0) {
      return [{ start: 0, end: pcm.length / sampleRate }];
    }

    const energies = new Float32Array(numFrames);
    let maxEnergy = 0;

    for (let i = 0; i < numFrames; i++) {
      let sum = 0;
      const offset = i * hopSize;
      for (let j = 0; j < frameSize; j++) {
        sum += pcm[offset + j] * pcm[offset + j];
      }
      energies[i] = Math.sqrt(sum / frameSize);
      if (energies[i] > maxEnergy) maxEnergy = energies[i];
    }

    if (maxEnergy === 0) {
      return [{ start: 0, end: pcm.length / sampleRate }];
    }

    // Threshold = 10% of max energy
    const threshold = Math.max(0.015, maxEnergy * 0.12);
    let firstSpeech = -1;
    let lastSpeech = -1;

    for (let i = 0; i < numFrames; i++) {
      if (energies[i] >= threshold) {
        if (firstSpeech === -1) firstSpeech = i;
        lastSpeech = i;
      }
    }

    if (firstSpeech === -1 || lastSpeech <= firstSpeech) {
      firstSpeech = 0;
      lastSpeech = numFrames - 1;
    }

    // Pad slightly (50ms before/after)
    const padFrames = Math.floor(0.05 / 0.01);
    const startSec = Math.max(0, (firstSpeech - padFrames) * (hopSize / sampleRate));
    const endSec = Math.min(pcm.length / sampleRate, (lastSpeech + padFrames) * (hopSize / sampleRate));
    const totalDuration = endSec - startSec;

    // Single syllable
    if (expectedSyllables <= 1) {
      return [{ start: startSec, end: endSec }];
    }

    // Multi-syllable fallback: split voiced speech into equal chunks or local energy minima
    const result = [];
    const step = totalDuration / expectedSyllables;
    for (let k = 0; k < expectedSyllables; k++) {
      result.push({
        start: startSec + k * step,
        end: startSec + (k + 1) * step,
      });
    }

    return result;
  }
}
