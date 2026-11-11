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

function exactMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function getVoicedIslands(track) {
  const islands = [];
  let start = -1;
  for (let i = 0; i < track.length; i++) {
    if (track[i] > 0) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      islands.push([start, i - 1]);
      start = -1;
    }
  }
  if (start !== -1) {
    islands.push([start, track.length - 1]);
  }
  return islands;
}

export class PitchTracker {
  /**
   * Remove boundary clicks, isolated spikes, and octave-doubling/halving artifacts
   * from a raw Hz F0 track.
   *
   * @param {number[]} f0Array
   * @returns {number[]}
   */
  static cleanF0Track(f0Array) {
    if (!Array.isArray(f0Array) || f0Array.length === 0) return [];
    const cleaned = [...f0Array];

    // 1. Prune 1-frame spikes first, then isolated subharmonic micro-islands (> 10 st jump vs adjacent syllable)
    for (const [s, e] of getVoicedIslands(cleaned)) {
      if (s === e) cleaned[s] = 0.0;
    }
    const islands1 = getVoicedIslands(cleaned);
    for (let i = 0; i < islands1.length; i++) {
      const [s, e] = islands1[i];
      const len = e - s + 1;
      if (len <= 3) {
        const vals = [];
        for (let k = s; k <= e; k++) if (cleaned[k] > 0) vals.push(cleaned[k]);
        if (vals.length === 0) continue;
        const subMed = exactMedian(vals);
        const adjBounds = [];
        if (i > 0) {
          const pe = islands1[i - 1][1];
          if (cleaned[pe] > 0) adjBounds.push(cleaned[pe]);
        }
        if (i + 1 < islands1.length) {
          const ns = islands1[i + 1][0];
          if (cleaned[ns] > 0) adjBounds.push(cleaned[ns]);
        }
        if (adjBounds.length > 0 && Math.min(...adjBounds.map((nb) => Math.abs(12 * Math.log2(subMed / nb)))) > 10.5) {
          for (let idx = s; idx <= e; idx++) cleaned[idx] = 0.0;
        }
      }
    }

    // 2. Octave-error folding (> 7.5 st) using 5-pt neighborhood + upward octave-doubling guard
    const allVoiced = cleaned.filter((v) => v > 0);
    const globalMed = allVoiced.length > 0 ? exactMedian(allVoiced) : 0;
    const folded = [...cleaned];
    for (const [s, e] of getVoicedIslands(cleaned)) {
      if (s === e) {
        folded[s] = 0.0;
        continue;
      }
      for (let idx = s; idx <= e; idx++) {
        const win = [];
        for (let j = Math.max(s, idx - 2); j <= Math.min(e, idx + 2); j++) {
          if (cleaned[j] > 0) win.push(cleaned[j]);
        }
        if (win.length === 0) continue;
        const med = exactMedian(win);
        const cur = cleaned[idx];
        if (med <= 0 || cur <= 0) continue;

        if (globalMed > 0 && 12 * Math.log2(cur / globalMed) > 9.5) {
          const dn = cur * 0.5;
          if (Math.abs(12 * Math.log2(dn / globalMed)) <= 3.5) {
            folded[idx] = dn;
            continue;
          }
        }
        if (Math.abs(12 * Math.log2(cur / med)) > 7.5) {
          const up = cur * 2.0;
          const dn = cur * 0.5;
          const dUp = Math.abs(12 * Math.log2(up / med));
          const dDn = Math.abs(12 * Math.log2(dn / med));
          if (Math.min(dUp, dDn) <= 3.5) {
            folded[idx] = dUp <= dDn ? up : dn;
          } else {
            folded[idx] = 0.0;
          }
        }
      }
    }

    // 3. Trim boundary cliffs (> 6.0 st vs adjacent interior median)
    const trimmed = [...folded];
    for (const [s, e] of getVoicedIslands(folded)) {
      const len = e - s + 1;
      if (len === 1) {
        trimmed[s] = 0.0;
      } else if (len === 3) {
        const midVal = folded[s + 1];
        if (midVal > 0) {
          for (const idx of [s, e]) {
            if (trimmed[idx] > 0 && Math.abs(12 * Math.log2(trimmed[idx] / midVal)) > 6.0) {
              trimmed[idx] = 0.0;
            }
          }
        }
      } else if (len >= 4) {
        const leftWin = [];
        for (let j = s + 2; j <= Math.min(e, s + 4); j++) {
          if (folded[j] > 0) leftWin.push(folded[j]);
        }
        const leftRef = leftWin.length > 0 ? exactMedian(leftWin) : folded[s + 2];
        for (const idx of [s, s + 1]) {
          if (leftRef > 0 && trimmed[idx] > 0 && Math.abs(12 * Math.log2(trimmed[idx] / leftRef)) > 6.0) {
            trimmed[idx] = 0.0;
          }
        }
        const rightWin = [];
        for (let j = Math.max(s, e - 4); j <= e - 2; j++) {
          if (folded[j] > 0) rightWin.push(folded[j]);
        }
        const rightRef = rightWin.length > 0 ? exactMedian(rightWin) : folded[e - 2];
        for (const idx of [e - 1, e]) {
          if (rightRef > 0 && trimmed[idx] > 0 && Math.abs(12 * Math.log2(trimmed[idx] / rightRef)) > 6.0) {
            trimmed[idx] = 0.0;
          }
        }
        if (len >= 8) {
          const deepRight = [];
          for (let j = Math.max(s, e - 5); j <= e - 3; j++) {
            if (folded[j] > 0) deepRight.push(folded[j]);
          }
          const deepRef = deepRight.length > 0 ? exactMedian(deepRight) : folded[e - 3];
          if (
            deepRef > 0 &&
            [e - 2, e - 1, e].every((idx) => folded[idx] > 0 && folded[idx] < 115.0 && Math.abs(12 * Math.log2(folded[idx] / deepRef)) > 8.0)
          ) {
            for (const idx of [e - 2, e - 1, e]) trimmed[idx] = 0.0;
          }
        }
      }
    }

    // 4. 3-point within-island median smoother
    const smoothed = [...trimmed];
    for (const [s, e] of getVoicedIslands(trimmed)) {
      if (s === e) {
        smoothed[s] = 0.0;
        continue;
      }
      for (let idx = s; idx <= e; idx++) {
        const win = [];
        for (let j = Math.max(s, idx - 1); j <= Math.min(e, idx + 1); j++) {
          if (trimmed[j] > 0) win.push(trimmed[j]);
        }
        if (win.length > 0) {
          smoothed[idx] = exactMedian(win);
        }
      }
    }

    return smoothed;
  }

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
    const useEnergyGate = options.energyGate !== false;

    const frameSize = Math.floor(sampleRate * 0.025); // 25ms window
    const hopSize = Math.floor((sampleRate * frameMs) / 1000);
    const tauMin = Math.max(1, Math.floor(sampleRate / f0Max));
    const tauMax = Math.min(Math.floor(sampleRate / f0Min), Math.floor(frameSize / 2));
    const searchLen = frameSize - tauMax;

    const n = pcm.length;
    const times = [];
    const rawF0 = [];
    const rmsArr = [];

    // Pre-allocated difference buffers
    const d = new Float64Array(tauMax + 1);
    const cmn = new Float64Array(tauMax + 1);

    let t = 0;
    while (t + frameSize <= n) {
      let sumSq = 0.0;
      for (let j = 0; j < frameSize; j++) {
        const s = pcm[t + j];
        sumSq += s * s;
      }
      rmsArr.push(Math.sqrt(sumSq / frameSize));

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
      rawF0.push(isVoiced ? pitchHz : 0.0);

      t += hopSize;
    }

    // Adaptive RMS energy gate (silence/breath floor)
    if (useEnergyGate && rmsArr.length > 0) {
      const sortedRms = [...rmsArr].sort((a, b) => a - b);
      const p95Idx = Math.min(sortedRms.length - 1, Math.floor(0.95 * (sortedRms.length - 1)));
      const peakRms = sortedRms[p95Idx];
      const absFloor = options.absRmsFloor !== undefined ? options.absRmsFloor : 0.002;
      const gate = Math.max(absFloor, 0.05 * peakRms);
      for (let i = 0; i < rawF0.length; i++) {
        if (rmsArr[i] < gate) {
          rawF0[i] = 0.0;
        }
      }
    }

    const f0 = PitchTracker.cleanF0Track(rawF0);
    const voiced = f0.map((v) => v > 0);

    // Compute speaker median Hz across cleaned voiced frames
    const voicedF0 = f0.filter((v) => v > 0);
    const medianHz = voicedF0.length > 0 ? exactMedian(voicedF0) : 0;
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
    if (clean.length < 2) return null;

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
    const startFrame = Math.max(0, firstSpeech - padFrames);
    const endFrame = Math.min(numFrames - 1, lastSpeech + padFrames);
    const frameSec = hopSize / sampleRate;
    const startSec = startFrame * frameSec;
    const endSec = Math.min(pcm.length / sampleRate, endFrame * frameSec);

    // Single syllable
    if (expectedSyllables <= 1) {
      return [{ start: startSec, end: endSec }];
    }

    // Multi-syllable RMS valley search (5-frame moving average smoothing)
    const smoothRms = new Float32Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      let acc = 0;
      let cnt = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(numFrames - 1, i + 2); j++) {
        acc += energies[j];
        cnt++;
      }
      smoothRms[i] = cnt > 0 ? acc / cnt : energies[i];
    }

    const stepFrames = (lastSpeech - firstSpeech) / expectedSyllables;
    const halfWin = Math.max(2, Math.round(stepFrames * 0.35));
    const minSylFrames = 8; // 80ms minimum syllable duration

    const cutFrames = [startFrame];
    let prevFrame = startFrame;
    for (let k = 1; k < expectedSyllables; k++) {
      const nom = firstSpeech + Math.round(((lastSpeech - firstSpeech) * k) / expectedSyllables);
      const lo = Math.max(prevFrame + minSylFrames, nom - halfWin);
      const hi = Math.min(lastSpeech - (expectedSyllables - k) * minSylFrames, nom + halfWin);

      let cutFrame = Math.max(prevFrame + 1, Math.min(endFrame - 1, nom));
      if (hi > lo) {
        let minVal = Infinity;
        cutFrame = lo;
        for (let fIdx = lo; fIdx <= hi; fIdx++) {
          if (smoothRms[fIdx] < minVal) {
            minVal = smoothRms[fIdx];
            cutFrame = fIdx;
          }
        }
      }
      cutFrames.push(cutFrame);
      prevFrame = cutFrame;
    }
    cutFrames.push(endFrame);

    const result = [];
    for (let k = 0; k < expectedSyllables; k++) {
      const sSec = k === 0 ? startSec : cutFrames[k] * frameSec;
      const eSec = k === expectedSyllables - 1 ? endSec : Math.max(sSec + 0.02, cutFrames[k + 1] * frameSec);
      result.push({ start: sSec, end: eSec });
    }

    return result;
  }
}
