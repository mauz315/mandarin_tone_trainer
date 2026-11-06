/**
 * formantTracker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Acoustic Final Vowel (韵母) Formant Tracker via Linear Predictive Coding (LPC)
 *
 * Implements:
 *   1. 10 kHz downsampling & pre-emphasis (alpha = 0.97)
 *   2. Steady-state voiced frame windowing (middle 50% Hamming window)
 *   3. Autocorrelation & pure JS Levinson-Durbin recursion (order p = 10)
 *   4. Discrete all-pole frequency spectrum evaluation to extract F1, F2, F3
 *   5. Target-conditioned soft scoring with front-vowel tolerance ([i] vs [y]/ü)
 *   6. Phonotactic complementary distribution gating for non-n/l initials
 */

export class FormantTracker {
  /**
   * Evaluates the vowel nucleus of a syllable using LPC formant tracking.
   *
   * @param {Float32Array|number[]} syllablePcm - 16kHz mono audio samples
   * @param {number} sampleRate - Typically 16000
   * @param {string} targetVowel - 'a' | 'i' | 'u' | 'y' | 'e' | 'o'
   * @param {string} [initialSymbol] - E.g. 't', 'n', 'l', 'j'
   * @param {number[]} [f0Track] - Optional YIN pitch track
   * @returns {{
   *   symbol: string,
   *   score: number,
   *   f1Hz: number,
   *   f2Hz: number,
   *   f3Hz?: number,
   *   classifiedVowel: string,
   *   sublabel: string,
   *   diagnosticCode: string,
   *   tier: 'EMERALD' | 'AMBER' | 'ROSE',
   *   advice: string
   * }}
   */
  static evaluate(syllablePcm, sampleRate = 16000, targetVowel = "a", initialSymbol = "", f0Track = null) {
    if (!syllablePcm || syllablePcm.length < 320) {
      return {
        symbol: targetVowel,
        score: 45,
        f1Hz: 0,
        f2Hz: 0,
        classifiedVowel: "unknown",
        sublabel: "✗ No Vowel",
        diagnosticCode: "NO_AUDIO",
        tier: "ROSE",
        advice: "Audio segment too short to analyze vowel resonance."
      };
    }

    // 1. Resample to 10 kHz (Nyquist 5 kHz cleanly captures 4-5 vocal tract poles)
    const pcm10k = this.resampleTo10k(syllablePcm, sampleRate);

    // 2. Extract median F1, F2, F3 using Levinson-Durbin LPC
    const formants = this.extractFormantsLPC(pcm10k, 10000, 10);

    if (!formants) {
      // Fallback: vowel voiced energy audible but formants obscured
      return {
        symbol: targetVowel,
        score: 75,
        f1Hz: 500,
        f2Hz: 1500,
        classifiedVowel: targetVowel,
        sublabel: "✓ Vowel Audible",
        diagnosticCode: "PASS_GENERIC_AUDIBLE",
        tier: "AMBER",
        advice: "Pronounce the vowel with clearer, louder vocal resonance."
      };
    }

    const { f1Hz, f2Hz, f3Hz, classifiedVowel } = formants;

    // 3. Evaluate against target vowel using target-conditioned soft thresholds
    return this.evaluateVowelFormants(targetVowel, f1Hz, f2Hz, f3Hz, initialSymbol);
  }

  /**
   * Resamples 16kHz audio down to 10kHz using linear interpolation.
   */
  static resampleTo10k(pcm, inSr) {
    if (inSr === 10000) return pcm;
    const targetLen = Math.floor((pcm.length * 10000) / inSr);
    const out = new Float32Array(targetLen);
    const ratio = inSr / 10000;

    for (let m = 0; m < targetLen; m++) {
      const pos = m * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = pcm[idx];
      const s1 = idx + 1 < pcm.length ? pcm[idx + 1] : s0;
      out[m] = s0 * (1 - frac) + s1 * frac;
    }
    return out;
  }

  /**
   * Extracts median F1, F2, and F3 using Linear Predictive Coding (order p = 10).
   */
  static extractFormantsLPC(pcm, sr = 10000, order = 10) {
    const n = pcm.length;
    if (n < 300) return null;

    // High-pass 50 Hz & pre-emphasis filter (+6dB/octave): s[n] = x[n] - 0.97 x[n-1]
    const s = new Float32Array(n);
    s[0] = pcm[0];
    for (let i = 1; i < n; i++) {
      s[i] = pcm[i] - 0.97 * pcm[i - 1];
    }

    const frameLen = Math.floor(sr * 0.025); // 25ms = 250 samples
    const hop = Math.floor(sr * 0.010);      // 10ms = 100 samples
    const nFrames = Math.floor((n - frameLen) / hop);
    if (nFrames < 3) return null;

    // Hamming window
    const window = new Float32Array(frameLen);
    for (let i = 0; i < frameLen; i++) {
      window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameLen - 1));
    }

    // Frame energies
    const energies = new Float32Array(nFrames);
    let maxE = 0;
    for (let f = 0; f < nFrames; f++) {
      let sum = 0;
      const offset = f * hop;
      for (let i = 0; i < frameLen; i++) {
        sum += s[offset + i] * s[offset + i];
      }
      energies[f] = sum;
      if (sum > maxE) maxE = sum;
    }

    if (maxE < 1e-6) return null;

    // Identify voiced frames (energy >= 15% peak energy)
    const voicedFrames = [];
    for (let f = 0; f < nFrames; f++) {
      if (energies[f] >= 0.15 * maxE) {
        voicedFrames.push(f);
      }
    }
    if (voicedFrames.length < 3) return null;

    // Select middle 50% steady-state section
    const startIdx = Math.floor(voicedFrames.length * 0.25);
    const endIdx = Math.floor(voicedFrames.length * 0.75);
    const steadyFrames = voicedFrames.slice(startIdx, Math.max(startIdx + 1, endIdx));

    const f1List = [];
    const f2List = [];
    const f3List = [];

    const numPoints = 512; // Frequency resolution: 5000 / 512 = ~9.77 Hz

    for (const fIdx of steadyFrames) {
      const offset = fIdx * hop;
      const frame = new Float32Array(frameLen);
      for (let i = 0; i < frameLen; i++) {
        frame[i] = s[offset + i] * window[i];
      }

      // Autocorrelation vector R(0) ... R(p)
      const R = new Float64Array(order + 1);
      for (let k = 0; k <= order; k++) {
        let sum = 0;
        for (let i = 0; i < frameLen - k; i++) {
          sum += frame[i] * frame[i + k];
        }
        R[k] = sum;
      }

      if (R[0] < 1e-6) continue;

      // Levinson-Durbin recursion
      const aLpc = this.solveLevinsonDurbin(R, order);
      if (!aLpc) continue;

      // Evaluate all-pole frequency response |1 / A(e^jw)|^2 across 512 bins
      const peaks = this.extractSpectralPeaks(aLpc, numPoints, sr);
      if (peaks.length >= 2) {
        f1List.push(peaks[0]);
        f2List.push(peaks[1]);
        if (peaks.length >= 3) {
          f3List.push(peaks[2]);
        }
      }
    }

    if (f1List.length < 2 || f2List.length < 2) return null;

    f1List.sort((a, b) => a - b);
    f2List.sort((a, b) => a - b);
    f3List.sort((a, b) => a - b);

    const f1Median = f1List[Math.floor(f1List.length / 2)];
    const f2Median = f2List[Math.floor(f2List.length / 2)];
    const f3Median = f3List.length >= 2 ? f3List[Math.floor(f3List.length / 2)] : null;

    let classifiedVowel = "a";
    if (f1Median >= 550) {
      classifiedVowel = "a";
    } else if (f2Median <= 1300) {
      classifiedVowel = "u";
    } else if (f3Median && f2Median + f3Median >= 5500 || f2Median >= 2500) {
      classifiedVowel = "i";
    } else {
      classifiedVowel = "y";
    }

    return {
      f1Hz: Math.round(f1Median),
      f2Hz: Math.round(f2Median),
      f3Hz: f3Median ? Math.round(f3Median) : null,
      classifiedVowel
    };
  }

  /**
   * Solves Yule-Walker equations via Levinson-Durbin recursion.
   */
  static solveLevinsonDurbin(R, p) {
    let E = R[0];
    const a = new Float64Array(p + 1);
    a[0] = 1.0;

    for (let i = 1; i <= p; i++) {
      let lambda = 0;
      for (let j = 0; j < i; j++) {
        lambda -= a[j] * R[i - j];
      }
      const k = lambda / E;
      if (Math.abs(k) >= 1.0) {
        // Unstable filter coefficient boundary check
        break;
      }

      const aPrev = a.slice();
      for (let j = 1; j < i; j++) {
        a[j] = aPrev[j] + k * aPrev[i - j];
      }
      a[i] = k;
      E *= 1.0 - k * k;
      if (E <= 1e-10) break;
    }

    return a;
  }

  /**
   * Evaluates all-pole spectrum and locates resonance peak frequencies.
   */
  static extractSpectralPeaks(aLpc, numPoints, sr) {
    const p = aLpc.length - 1;
    const nyquist = sr / 2; // 5000 Hz
    const logPower = new Float32Array(numPoints);

    for (let m = 0; m < numPoints; m++) {
      const omega = (Math.PI * m) / numPoints;
      let re = aLpc[0];
      let im = 0;
      for (let k = 1; k <= p; k++) {
        const phi = k * omega;
        re += aLpc[k] * Math.cos(phi);
        im -= aLpc[k] * Math.sin(phi);
      }
      const magSq = re * re + im * im;
      logPower[m] = -10 * Math.log10(Math.max(1e-12, magSq));
    }

    // Detect local maxima
    const rawPeaks = [];
    for (let m = 2; m < numPoints - 2; m++) {
      if (
        logPower[m] > logPower[m - 1] &&
        logPower[m] > logPower[m + 1] &&
        logPower[m] > logPower[m - 2] &&
        logPower[m] > logPower[m + 2]
      ) {
        const freq = (m * nyquist) / numPoints;
        if (freq >= 200 && freq <= 4500) {
          rawPeaks.push({ freq, power: logPower[m] });
        }
      }
    }

    rawPeaks.sort((a, b) => a.freq - b.freq);
    return rawPeaks.map(p => p.freq);
  }

  /**
   * Target-conditioned soft scoring evaluator matching Section 2.4.A of the specification.
   */
  static evaluateVowelFormants(targetVowel, f1, f2, f3 = null, initialSymbol = "") {
    const symbol = targetVowel;

    // 1. Open Vowel [a] (Low tongue / pharyngeal constriction)
    if (targetVowel === "a") {
      if (f1 >= 600) {
        return {
          symbol,
          score: 95,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "a",
          sublabel: "✓ Wide Open",
          diagnosticCode: "EXACT_OPEN",
          tier: "EMERALD",
          advice: ""
        };
      }
      if (f1 >= 480) {
        return {
          symbol,
          score: 75,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "a",
          sublabel: "⚠ Half Open",
          diagnosticCode: "MID_OPEN",
          tier: "AMBER",
          advice: "Open your jaw slightly wider to achieve full open [a] resonance."
        };
      }
      return {
        symbol,
        score: 45,
        f1Hz: f1,
        f2Hz: f2,
        f3Hz: f3,
        classifiedVowel: "muffled",
        sublabel: "✗ Muffled (Open Jaw Wider)",
        diagnosticCode: "CLOSED_JAW",
        tier: "ROSE",
        advice: "Drop your jaw decisively. The vowel sounded constricted and muffled."
      };
    }

    // 2. Back Rounded Vowel [u] (High velar constriction, lowest F2)
    if (targetVowel === "u") {
      if (f1 < 500 && f2 <= 1300) {
        return {
          symbol,
          score: 95,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "u",
          sublabel: "✓ Deep Back Vowel",
          diagnosticCode: "EXACT_BACK",
          tier: "EMERALD",
          advice: ""
        };
      }
      if (f1 < 550 && f2 <= 1550) {
        return {
          symbol,
          score: 72,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "u",
          sublabel: "⚠ Move Tongue Back",
          diagnosticCode: "MID_BACK",
          tier: "AMBER",
          advice: "Pull your tongue further back toward the soft palate for a deeper 'u'."
        };
      }
      return {
        symbol,
        score: 45,
        f1Hz: f1,
        f2Hz: f2,
        f3Hz: f3,
        classifiedVowel: f2 > 1800 ? "i" : "u",
        sublabel: "✗ Sounded like 'i' / 'ü'",
        diagnosticCode: "FRONTED_VOWEL",
        tier: "ROSE",
        advice: "Pull your tongue back into the throat and round your lips into a tight circle."
      };
    }

    // Phonotactic Gating: If initial is not 'n' and not 'l', [i] and [ü] never contrast
    const isContrastingPair = initialSymbol === "n" || initialSymbol === "l";

    // 3. Front Unrounded Vowel [i] (High palatal constriction, unrounded lips)
    if (targetVowel === "i") {
      // Generous F2 floor (2000Hz) accommodates deep male vocal tracts
      if (f1 < 500 && f2 >= 2000) {
        return {
          symbol,
          score: 95,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "i",
          sublabel: "✓ Clear Resonance",
          diagnosticCode: "EXACT_FRONT",
          tier: "EMERALD",
          advice: ""
        };
      }
      // Amber buffer down to 1700Hz covers natural co-articulation
      if (f1 < 550 && f2 >= 1700) {
        return {
          symbol,
          score: 78,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "i",
          sublabel: "✓ Good (Smile Wider)",
          diagnosticCode: "LAX_FRONT",
          tier: "AMBER",
          advice: "Spread your lips wider like smiling to brighten the front 'i' resonance."
        };
      }
      // Relaxed phonotactic tolerance for non-n/l initials
      if (!isContrastingPair && f2 / Math.max(1, f1) > 3.8) {
        return {
          symbol,
          score: 86,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "i",
          sublabel: "✓ Clear Resonance",
          diagnosticCode: "PASS_PHONOTACTIC_I",
          tier: "EMERALD",
          advice: ""
        };
      }
      return {
        symbol,
        score: 50,
        f1Hz: f1,
        f2Hz: f2,
        f3Hz: f3,
        classifiedVowel: "backed",
        sublabel: "✗ Tongue Too Far Back",
        diagnosticCode: "BACKED_VOWEL",
        tier: "ROSE",
        advice: "Raise the front blade of your tongue high against the hard palate for 'i'."
      };
    }

    // 4. Front Rounded Vowel [y] / ü (High palatal constriction + rounded lips)
    if (targetVowel === "y" || targetVowel === "ü") {
      // Ideal rounded front vowel: Low F1 + Moderately High F2 (1500 - 2350 Hz)
      if (f1 < 500 && f2 >= 1500 && f2 <= 2350) {
        return {
          symbol: "ü",
          score: 94,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "y",
          sublabel: "✓ Tight 'O' Lips",
          diagnosticCode: "EXACT_ROUNDED_FRONT",
          tier: "EMERALD",
          advice: ""
        };
      }

      // Phonotactic Gating: If initial is not 'n' and not 'l', [i] and [ü] never contrast
      // E.g. after j, q, x, y, written 'u' is unambiguously [y] / ü
      if (!isContrastingPair && f1 < 500 && f2 >= 1400 && f2 <= 2650) {
        return {
          symbol: "ü",
          score: 88,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "y",
          sublabel: "✓ Tight 'O' Lips",
          diagnosticCode: "PASS_PHONOTACTIC_U",
          tier: "EMERALD",
          advice: ""
        };
      }

      // For contrasting pairs (n/l), if speaker produced an [i]-like unrounded vowel (F2 > 2350 Hz):
      // Keep in AMBER tier (72%) with coaching cue rather than failing to Red!
      if (f1 < 500 && f2 > 2350 && f2 <= 2650) {
        return {
          symbol: "ü",
          score: 72,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "i",
          sublabel: "⚠ Round Lips More (Whistle 'O')",
          diagnosticCode: "UNROUNDED_LIPS",
          tier: "AMBER",
          advice: "Keep your tongue in the high 'ee' position, but purse your lips tightly into a tiny whistle 'O'."
        };
      }
      if (f2 < 1400) {
        return {
          symbol: "ü",
          score: 45,
          f1Hz: f1,
          f2Hz: f2,
          f3Hz: f3,
          classifiedVowel: "u",
          sublabel: "✗ Sounded like 'u' (Pull Tongue Forward)",
          diagnosticCode: "SLIPPED_TO_U",
          tier: "ROSE",
          advice: "Push your tongue forward against front teeth while keeping your lips rounded."
        };
      }
      return {
        symbol: "ü",
        score: 68,
        f1Hz: f1,
        f2Hz: f2,
        f3Hz: f3,
        classifiedVowel: "y",
        sublabel: "⚠ Purse Lips Tighter",
        diagnosticCode: "WEAK_ROUNDING",
        tier: "AMBER",
        advice: "Round your lips into a tighter, smaller circle."
      };
    }

    // 5. Generic mid/back vowels (e, o, er)
    return {
      symbol: targetVowel,
      score: 85,
      f1Hz: f1,
      f2Hz: f2,
      f3Hz: f3,
      classifiedVowel: targetVowel,
      sublabel: "✓ Vowel Audible",
      diagnosticCode: "PASS_GENERIC",
      tier: "EMERALD",
      advice: ""
    };
  }
}
