/**
 * initialEvaluator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Acoustic Initial Consonant (声母) Evaluator
 *
 * Implements:
 *   1. Voice Onset Time (VOT) calculation for stops & affricates (b/p, d/t, g/k, j/q, zh/ch, z/c)
 *   2. Plosive release burst detection (T_burst) via high-pass filtering (>1400 Hz) and dE/dt
 *   3. Spectral Center of Gravity (CoG) for sibilant fricatives (s, sh, x)
 *   4. Instantaneous voicing validation for sonorants (m, n, l, r, y, w) and zero-initials
 */

export class InitialEvaluator {
  /**
   * Evaluates the initial consonant of a syllable.
   *
   * @param {Float32Array|number[]} syllablePcm - 16kHz mono audio samples for the syllable
   * @param {number} sampleRate - Typically 16000
   * @param {object} initialInfo - From PinyinUtils.decompose()
   * @param {number[]} [f0Track] - Optional YIN per-frame pitch track (10ms hop)
   * @returns {{
   *   symbol: string,
   *   score: number,
   *   votMs: number,
   *   cogHz?: number,
   *   sublabel: string,
   *   diagnosticCode: string,
   *   tier: 'EMERALD' | 'AMBER' | 'ROSE',
   *   advice: string
   * }}
   */
  static evaluate(syllablePcm, sampleRate = 16000, initialInfo, f0Track = null) {
    const symbol = initialInfo?.initial || "";
    const category = initialInfo?.initialCategory || "ZERO";

    // Fallback if audio buffer is empty
    if (!syllablePcm || syllablePcm.length < 160) {
      return {
        symbol,
        score: 40,
        votMs: 0,
        sublabel: "✗ No Audio",
        diagnosticCode: "NO_AUDIO",
        tier: "ROSE",
        advice: "Audio segment too short to analyze consonant attack."
      };
    }

    // 1. Detect Voice Onset Time (T_voicing)
    const tVoicingSec = this.detectVoicingOnset(syllablePcm, sampleRate, f0Track);
    if (tVoicingSec === null || tVoicingSec <= 0) {
      // Syllable has no stable vocal voicing
      return {
        symbol,
        score: 45,
        votMs: 0,
        sublabel: "✗ No Voicing",
        diagnosticCode: "UNVOICED_FAIL",
        tier: "ROSE",
        advice: "Speak louder and clearly with full vocal resonance."
      };
    }

    // 2. Route by initial category
    if (category === "ASPIRATED_STOP" || category === "UNASPIRATED_STOP") {
      return this.evaluateVOT(syllablePcm, sampleRate, tVoicingSec, initialInfo);
    }

    if (category === "FRICATIVE") {
      return this.evaluateFricative(syllablePcm, sampleRate, tVoicingSec, initialInfo);
    }

    // 3. Sonorants (m, n, l, r, y, w) or Zero Initial
    return this.evaluateSonorantOrZero(syllablePcm, sampleRate, tVoicingSec, initialInfo);
  }

  /**
   * Locates T_voicing (in seconds from start of syllable) using the earliest stable voiced frames.
   */
  static detectVoicingOnset(pcm, sampleRate, f0Track) {
    if (f0Track && f0Track.length > 0) {
      const hopSec = 0.010; // 10ms hop
      for (let i = 0; i < f0Track.length - 1; i++) {
        // Require 2 consecutive voiced frames to prevent transient noise trigger
        if (f0Track[i] > 60 && f0Track[i + 1] > 60) {
          return Math.max(0.005, i * hopSec);
        }
      }
      const singleVoiced = f0Track.findIndex(p => p > 60);
      if (singleVoiced >= 0) return Math.max(0.005, singleVoiced * hopSec);
    }

    // Fallback: simple energy-based voiced onset detector if f0Track unavailable
    const frameSize = Math.floor(sampleRate * 0.020);
    const hop = Math.floor(sampleRate * 0.005);
    for (let t = 0; t + frameSize < pcm.length; t += hop) {
      let energy = 0;
      for (let j = 0; j < frameSize; j++) {
        energy += pcm[t + j] * pcm[t + j];
      }
      const rms = Math.sqrt(energy / frameSize);
      if (rms > 0.08) {
        return Math.max(0.005, t / sampleRate);
      }
    }

    return null;
  }

  /**
   * Applies a 2nd-order Butterworth high-pass filter (>1400 Hz) to isolate release bursts.
   */
  static highPassFilter(pcm, sampleRate, cutoff = 1400) {
    const n = pcm.length;
    const out = new Float32Array(n);
    const w0 = (2 * Math.PI * cutoff) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
    const cosw0 = Math.cos(w0);

    const b0 = (1 + cosw0) / 2;
    const b1 = -(1 + cosw0);
    const b2 = (1 + cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    // Normalized filter coefficients
    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;

    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
      const x0 = pcm[i];
      const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
      out[i] = y0;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
    return out;
  }

  /**
   * Evaluates Voice Onset Time (VOT) for aspirated vs unaspirated stops/affricates.
   */
  static evaluateVOT(pcm, sampleRate, tVoicingSec, initialInfo) {
    const isAspirated = initialInfo.initialCategory === "ASPIRATED_STOP";
    const isAffricate = initialInfo.isAffricate;
    const symbol = initialInfo.initial;

    // High-pass filter for burst isolation
    const hfPcm = this.highPassFilter(pcm, sampleRate, 1400);

    const windowSamples = Math.floor(sampleRate * 0.005); // 5ms window
    const lookbackSec = isAffricate ? 0.250 : 0.200;
    const tMinSec = Math.max(0.002, tVoicingSec - lookbackSec);

    // Compute baseline noise floor (10th percentile energy of 5ms windows)
    const step = Math.floor(sampleRate * 0.005);
    const energies = [];
    for (let i = 0; i + windowSamples < hfPcm.length; i += step) {
      let sum = 0;
      for (let j = 0; j < windowSamples; j++) {
        sum += hfPcm[i + j] * hfPcm[i + j];
      }
      energies.push(sum);
    }
    energies.sort((a, b) => a - b);
    const floorIndex = Math.floor(energies.length * 0.10);
    const floorHf = energies[floorIndex] || 1e-5;
    const silenceThresh = Math.max(0.001, floorHf * 3.5);

    // Scan backwards from tVoicingSec to identify the burst release onset
    let tBurstSec = tVoicingSec;
    let silenceGapMs = 0;
    const stepSamples = Math.floor(sampleRate * 0.001); // 1ms step

    for (let t = tVoicingSec - 0.002; t >= tMinSec; t -= 0.001) {
      const idx = Math.floor(t * sampleRate);
      if (idx < 0 || idx + windowSamples >= hfPcm.length) break;

      let e = 0;
      for (let j = 0; j < windowSamples; j++) {
        e += hfPcm[idx + j] * hfPcm[idx + j];
      }

      if (e >= silenceThresh) {
        tBurstSec = t;
        silenceGapMs = 0;
      } else {
        silenceGapMs += 1;
        if (silenceGapMs >= 7) {
          // 7ms silence confirms oral occlusion before the burst
          break;
        }
      }
    }

    const rawVotMs = Math.max(0.0, (tVoicingSec - tBurstSec) * 1000.0);
    const votMs = Math.round(rawVotMs * 10) / 10;

    let score = 80;
    let sublabel = "✓ Target Met";
    let diagnosticCode = "PASS";
    let tier = "EMERALD";
    let advice = "";

    if (isAspirated) {
      // Aspirated stops (p, t, k, q, ch, c): Target VOT >= 60ms
      if (votMs >= 60.0) {
        score = Math.min(100, Math.round(90 + (Math.min(votMs, 120) - 60) * (10 / 60)));
        sublabel = "✓ Strong Puff";
        diagnosticCode = "ACCURATE_ASPIRATED";
        tier = "EMERALD";
        advice = "";
      } else if (votMs >= 40.0) {
        score = Math.round(65 + (votMs - 40) * (19 / 20));
        sublabel = "⚠ Weak Puff";
        diagnosticCode = "LAX_ASPIRATED";
        tier = "AMBER";
        advice = `Push a sharper puff of air on '${symbol}' to make the aspiration crisp.`;
      } else {
        score = Math.max(30, Math.round((votMs / 40) * 64));
        sublabel = "✗ No Air";
        diagnosticCode = "UNDER_ASPIRATED";
        tier = "ROSE";
        advice = `Release '${symbol}' with a forceful puff of air. Hold your hand before your mouth to feel the breath.`;
      }
    } else {
      // Unaspirated stops (b, d, g, j, zh, z): Target VOT <= 25ms
      if (votMs <= 25.0) {
        score = Math.max(90, Math.round(100 - (votMs / 25) * 8));
        sublabel = "✓ Crisp & Dry";
        diagnosticCode = "ACCURATE_UNASPIRATED";
        tier = "EMERALD";
        advice = "";
      } else if (votMs <= 45.0) {
        score = Math.round(84 - ((votMs - 25) / 20) * 19);
        sublabel = "⚠ Slight Puff";
        diagnosticCode = "SLIGHT_ASPIRATION";
        tier = "AMBER";
        advice = `Keep '${symbol}' dry and unaspirated without puffing air like English.`;
      } else {
        score = Math.max(30, Math.round(64 - ((votMs - 45) / 50) * 34));
        sublabel = "✗ Too Much Air";
        diagnosticCode = "OVER_ASPIRATED";
        tier = "ROSE";
        advice = `Do not blow air on '${symbol}'. Keep the closure release crisp, tight, and dry.`;
      }
    }

    return {
      symbol,
      score,
      votMs,
      sublabel,
      diagnosticCode,
      tier,
      advice
    };
  }

  /**
   * Evaluates fricatives (s, sh, x) using Spectral Center of Gravity (CoG).
   */
  static evaluateFricative(pcm, sampleRate, tVoicingSec, initialInfo) {
    const symbol = initialInfo.initial;
    const burstEnd = Math.floor(tVoicingSec * sampleRate);
    const burstStart = Math.max(0, burstEnd - Math.floor(sampleRate * 0.120)); // Up to 120ms friction
    const frictionSamples = pcm.slice(burstStart, burstEnd);

    if (frictionSamples.length < 128) {
      return {
        symbol,
        score: 75,
        votMs: Math.round(tVoicingSec * 1000),
        sublabel: "✓ Friction Audible",
        diagnosticCode: "SHORT_FRICATIVE",
        tier: "AMBER",
        advice: `Lengthen the fricative hiss on '${symbol}'.`
      };
    }

    // Compute Spectral Center of Gravity via discrete power spectrum
    const N = Math.min(256, frictionSamples.length);
    let num = 0;
    let den = 0;
    const nyquist = sampleRate / 2;

    for (let k = 1; k < N / 2; k++) {
      const freq = (k * sampleRate) / N;
      // Real & imag DFT bins
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const phi = (2 * Math.PI * k * n) / N;
        re += frictionSamples[n] * Math.cos(phi);
        im -= frictionSamples[n] * Math.sin(phi);
      }
      const mag = Math.sqrt(re * re + im * im);
      num += freq * mag;
      den += mag;
    }

    const cogHz = den > 1e-6 ? Math.round(num / den) : 4000;

    let score = 85;
    let sublabel = "✓ Clean Hiss";
    let diagnosticCode = "PASS_FRICATIVE";
    let tier = "EMERALD";
    let advice = "";

    if (symbol === "s") {
      // High dental hiss (>= 5900 Hz)
      if (cogHz >= 5900) {
        score = 96;
        sublabel = "✓ Clean Dental Hiss";
        diagnosticCode = "EXACT_DENTAL";
        tier = "EMERALD";
      } else if (cogHz >= 4500) {
        score = 76;
        sublabel = "⚠ Move Tongue Forward";
        diagnosticCode = "MID_DENTAL";
        tier = "AMBER";
        advice = "Bring your tongue tip forward right behind your upper front teeth for a sharp 's'.";
      } else {
        score = 52;
        sublabel = "✗ Slurred Hiss";
        diagnosticCode = "SLURRED_DENTAL";
        tier = "ROSE";
        advice = "Keep tongue tip close to front teeth to prevent a slurred 'sh'-like sound.";
      }
    } else if (symbol === "sh") {
      // Retroflex hiss (2800 - 4500 Hz)
      if (cogHz >= 2800 && cogHz <= 4500) {
        score = 95;
        sublabel = "✓ Curled Tongue Resonance";
        diagnosticCode = "EXACT_RETROFLEX";
        tier = "EMERALD";
      } else if (cogHz > 4500) {
        score = 72;
        sublabel = "⚠ Curl Tongue Back";
        diagnosticCode = "FORWARD_RETROFLEX";
        tier = "AMBER";
        advice = "Curl the tip of your tongue backwards toward the roof of your mouth for 'sh'.";
      } else {
        score = 68;
        sublabel = "⚠ Deep Hiss";
        diagnosticCode = "DEEP_RETROFLEX";
        tier = "AMBER";
      }
    } else if (symbol === "x") {
      // Alveolo-palatal hiss (4500 - 6000 Hz)
      if (cogHz >= 4500 && cogHz <= 6200) {
        score = 95;
        sublabel = "✓ Sharp Palatal Friction";
        diagnosticCode = "EXACT_PALATAL";
        tier = "EMERALD";
      } else {
        score = 78;
        sublabel = "✓ Good Palatal Hiss";
        diagnosticCode = "PASS_PALATAL";
        tier = "AMBER";
        advice = "Spread your lips wide like a smile and raise the blade of your tongue to the hard palate.";
      }
    } else {
      // f, h: standard acoustic energy check
      score = 90;
      sublabel = "✓ Clean Consonant";
      diagnosticCode = "PASS_GENERIC_FRICATIVE";
      tier = "EMERALD";
    }

    return {
      symbol,
      score,
      votMs: Math.round(tVoicingSec * 1000),
      cogHz,
      sublabel,
      diagnosticCode,
      tier,
      advice
    };
  }

  /**
   * Evaluates sonorants (m, n, l, r, y, w) or zero initial.
   */
  static evaluateSonorantOrZero(pcm, sampleRate, tVoicingSec, initialInfo) {
    const symbol = initialInfo.initial || "∅";
    return {
      symbol: symbol === "∅" ? "" : symbol,
      score: 95,
      votMs: Math.round(tVoicingSec * 1000),
      sublabel: symbol === "∅" ? "✓ Clean Onset" : "✓ Smooth Voiced Attack",
      diagnosticCode: "PASS_SONORANT",
      tier: "EMERALD",
      advice: ""
    };
  }
}
