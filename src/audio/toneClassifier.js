/**
 * toneClassifier.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 4: Directional Slope & Tone Curvature Classifier
 *
 * Performs first-order regression slope analysis, curvature inflection checks,
 * and linguistic gatekeeping to ensure fundamental Mandarin tone geometry.
 */

function exactMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function theilSenSlope(vals) {
  if (!vals || vals.length < 2) return 0;
  const slopes = [];
  for (let a = 0; a < vals.length - 1; a++) {
    for (let b = a + 1; b < vals.length; b++) {
      slopes.push((vals[b] - vals[a]) / (b - a));
    }
  }
  return exactMedian(slopes);
}

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

export class ToneClassifier {
  /**
   * Extract geometric and tri-zone core pitch metrics from a normalized semitone contour.
   * Preserves all legacy keys alongside onset/core/release metrics.
   *
   * @param {number[]} contour  Array of normalized semitone values (e.g. 30 points)
   */
  static extractMetrics(contour) {
    if (!contour || contour.length < 3) {
      return {
        slope: 0, delta: 0, mean: 0, min: 0, max: 0, start: 0, end: 0, minIdx: 0,
        edgeStart: 0, edgeEnd: 0, coreStart: 0, coreMid: 0, coreEnd: 0, lateHold: 0,
        coreDelta: 0, onsetDrop: 0, tailDelta: 0, coreSlope: 0, lateSlope: 0,
        coreMean: 0, coreMin: 0, coreMax: 0, coreMinIdx: 0, coreMaxIdx: 0, coreSpan: 0, coreResidStd: 0,
      };
    }

    const n = contour.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    let minVal = Infinity;
    let maxVal = -Infinity;
    let minIdx = 0;

    for (let i = 0; i < n; i++) {
      const y = contour[i];
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumXX += i * i;

      if (y < minVal) {
        minVal = y;
        minIdx = i;
      }
      if (y > maxVal) {
        maxVal = y;
      }
    }

    const meanX = sumX / n;
    const meanY = sumY / n;
    const denom = sumXX - sumX * meanX;
    const slope = denom !== 0 ? (sumXY - sumX * meanY) / denom : 0;

    // Legacy first/last 20% averages
    const chunkLen = Math.max(1, Math.floor(n * 0.2));
    const startChunk = contour.slice(0, chunkLen);
    const endChunk = contour.slice(n - chunkLen);
    const startMean = startChunk.reduce((a, b) => a + b, 0) / startChunk.length;
    const endMean = endChunk.reduce((a, b) => a + b, 0) / endChunk.length;
    const delta = endMean - startMean;

    let edgeStart, edgeEnd, coreStart, coreMid, coreEnd, lateHold;
    let coreDelta, onsetDrop, tailDelta, coreSlope, lateSlope;
    let coreMean, coreMin, coreMax, coreMinIdx, coreMaxIdx, coreSpan, coreResidStd;

    if (n >= 10) {
      const kEdge = Math.max(2, Math.round(n * 0.13));
      const cLo = kEdge;
      const cHi = n - kEdge;

      edgeStart = exactMedian(contour.slice(0, kEdge));
      edgeEnd = exactMedian(contour.slice(n - kEdge));

      coreStart = exactMedian(contour.slice(cLo, Math.max(cLo + 1, Math.round(n * 0.34))));
      coreMid = exactMedian(contour.slice(Math.round(n * 0.37), Math.max(Math.round(n * 0.37) + 1, Math.round(n * 0.64))));
      coreEnd = exactMedian(contour.slice(Math.round(n * 0.67), Math.max(Math.round(n * 0.67) + 1, cHi)));
      lateHold = exactMedian(contour.slice(Math.round(n * 0.77)));

      coreDelta = coreEnd - coreStart;
      onsetDrop = edgeStart - coreMid;
      tailDelta = edgeEnd - coreMid;

      const coreSlice = contour.slice(cLo, cHi);
      coreSlope = theilSenSlope(coreSlice);
      lateSlope = theilSenSlope(contour.slice(Math.floor(n * 0.45), Math.ceil(n * 0.94)));

      coreMean = coreSlice.reduce((a, b) => a + b, 0) / coreSlice.length;
      coreMin = Infinity;
      coreMax = -Infinity;
      coreMinIdx = cLo;
      coreMaxIdx = cLo;
      for (let i = 0; i < coreSlice.length; i++) {
        if (coreSlice[i] < coreMin) {
          coreMin = coreSlice[i];
          coreMinIdx = cLo + i;
        }
        if (coreSlice[i] > coreMax) {
          coreMax = coreSlice[i];
          coreMaxIdx = cLo + i;
        }
      }
      coreSpan = coreMax - coreMin;

      // Residual std of core around coreSlope line anchored at coreMid-level median
      const residVals = coreSlice.map((v, idx) => v - coreSlope * idx);
      const medIntercept = exactMedian(residVals);
      const sqErr = coreSlice.reduce((acc, v, idx) => {
        const err = v - (coreSlope * idx + medIntercept);
        return acc + err * err;
      }, 0);
      coreResidStd = Math.sqrt(sqErr / coreSlice.length);
    } else {
      edgeStart = startMean;
      edgeEnd = endMean;
      coreStart = startMean;
      coreMid = exactMedian(contour);
      coreEnd = endMean;
      lateHold = endMean;
      coreDelta = delta;
      onsetDrop = startMean - coreMid;
      tailDelta = endMean - coreMid;
      coreSlope = slope;
      lateSlope = slope;
      coreMean = meanY;
      coreMin = minVal;
      coreMax = maxVal;
      coreMinIdx = minIdx;
      coreMaxIdx = contour.indexOf(maxVal);
      coreSpan = maxVal - minVal;
      coreResidStd = 0;
    }

    return {
      slope: r3(slope),
      delta: r2(delta),
      mean: r2(meanY),
      min: r2(minVal),
      max: r2(maxVal),
      start: r2(startMean),
      end: r2(endMean),
      minIdx,
      edgeStart: r2(edgeStart),
      edgeEnd: r2(edgeEnd),
      coreStart: r2(coreStart),
      coreMid: r2(coreMid),
      coreEnd: r2(coreEnd),
      lateHold: r2(lateHold),
      coreDelta: r2(coreDelta),
      onsetDrop: r2(onsetDrop),
      tailDelta: r2(tailDelta),
      coreSlope: r3(coreSlope),
      lateSlope: r3(lateSlope),
      coreMean: r2(coreMean),
      coreMin: r2(coreMin),
      coreMax: r2(coreMax),
      coreMinIdx,
      coreMaxIdx,
      coreSpan: r2(coreSpan),
      coreResidStd: r2(coreResidStd),
    };
  }

  /**
   * Determine the most likely Mandarin tone based on tri-zone contour shape
   * (including Half-Third 21 and consonant-onset-settled Tone 1).
   *
   * @param {number[]} contour
   * @returns {number} 1, 2, 3, 4, or 5
   */
  static detectTone(contour) {
    if (!contour || contour.length < 3) return 5;
    const n = contour.length;
    const m = this.extractMetrics(contour);

    // Tone 4: Steep negative core/late slope or significant downward plunge
    if (m.coreSlope <= -0.085 || m.coreDelta <= -2.2 || (m.lateSlope <= -0.09 && m.tailDelta <= -1.6)) {
      return 4;
    }

    // Tone 2: Positive climbing core/late slope with net rise
    const riseFromCoreMin = Math.max(m.coreEnd, m.edgeEnd) - m.coreMin;
    if ((m.coreSlope >= 0.045 && m.coreDelta >= 1.0) || (m.lateSlope >= 0.05 && riseFromCoreMin >= 1.4 && m.coreMin > -1.2)) {
      return 2;
    }

    // Tone 3: Full Dipping 214 OR Conversational Half-Third 21
    const recovery = m.edgeEnd - Math.min(m.coreMin, m.min);
    const isDip214 = m.coreMin <= -0.8 && recovery >= 0.7 && m.minIdx >= Math.floor(0.15 * n) && m.minIdx <= Math.ceil(0.85 * n);
    const isHalfThird = m.coreMin <= -0.8 && m.coreEnd <= 0.6 && m.lateSlope <= 0.04 && (m.coreEnd - m.coreMin) < 1.2;
    if (isDip214 || isHalfThird) {
      return 3;
    }

    // Tone 1: Consonant onset settle OR flat/gently declined high pitch
    if (
      (m.onsetDrop >= 0.85 && m.lateSlope >= -0.035 && m.tailDelta >= -0.8) ||
      (Math.abs(m.coreSlope) <= 0.055 && Math.abs(m.coreDelta) <= 1.35 && m.coreMean >= -0.6)
    ) {
      return 1;
    }

    if (m.coreSlope > 0.035 && m.coreDelta > 0.5) return 2;
    if (m.coreSlope < -0.05 || m.coreDelta < -1.2) return 4;
    return 1;
  }

  /**
   * Verify and evaluate the user contour against the target syllable's tone.
   *
   * @param {number[]} userContour
   * @param {number} targetTone 1, 2, 3, 4, or 5
   * @param {string} syllableName e.g., "mā" or "hǎo"
   * @param {object} [context] { syllableIndex, totalSyllables, position, initialCategory, initialSymbol, sandhiRule, citationTone }
   */
  static evaluate(userContour, targetTone, syllableName = '', context = {}) {
    if (!userContour || userContour.length < 3) {
      return {
        score: 35,
        detectedTone: 0,
        isAccurate: false,
        status: 'UNVOICED',
        comment: '⚠ Silent / No Pitch',
        diagnosticCode: 'UNVOICED',
        advice: `Could not detect vocal pitch on <strong>'${syllableName}'</strong>. Speak clearly and closer to the microphone.`,
        metrics: null,
        citationTone: context?.citationTone ?? null,
        sandhiRule: context?.sandhiRule ?? null,
      };
    }

    const n = userContour.length;
    const m = this.extractMetrics(userContour);
    const detected = this.detectTone(userContour);

    let score = 90;
    let isAccurate = true;
    let status = 'ACCURATE CONTOUR';
    let comment = '✓ Exact Contour';
    let diagnosticCode = 'EXACT';
    let advice = '';

    const sylLabel = syllableName ? `<strong>'${syllableName}'</strong>` : 'this syllable';
    const totalSyllables = context?.totalSyllables || 1;
    const position = context?.position || (totalSyllables === 1 ? 'single' : 'medial');

    if (targetTone === 1) {
      // ─────────────────────────────────────────────────────────────
      // Tone 1: High Level 55 (Onset-immune & declination-tolerant)
      // ─────────────────────────────────────────────────────────────
      const isLateCollapsing = (m.lateSlope < -0.055 && m.tailDelta < -1.1) || (m.coreDelta < -1.85 && m.lateSlope < -0.025);
      const isClimbing = m.coreDelta > 1.65 || (m.lateSlope > 0.075 && m.tailDelta > 1.1);
      const tooLowThreshold = totalSyllables === 1 ? -1.4 : -1.2;

      if (isLateCollapsing) {
        score = 60;
        isAccurate = false;
        status = 'FALLING TONE';
        comment = '⚠ Dropped';
        diagnosticCode = 'DROPPED';
        advice = `Tone 1 on ${sylLabel} dropped in the second half. Keep your pitch steady to the end like holding a musical note.`;
      } else if (isClimbing) {
        score = 66;
        isAccurate = false;
        status = 'RISING TONE';
        comment = '⚠ Climbed';
        diagnosticCode = 'CLIMBED';
        advice = `Tone 1 on ${sylLabel} drifted upward into Tone 2. Keep it flat at the top of your range without questioning intonation.`;
      } else if (m.coreMean < tooLowThreshold) {
        score = 72;
        isAccurate = false;
        status = 'TOO LOW';
        comment = '⚠ Low Pitch';
        diagnosticCode = 'TOO_LOW';
        advice = `Tone 1 on ${sylLabel} is flat, but pitched too low in your vocal range. Start it comfortably higher.`;
      } else if (m.onsetDrop >= 0.85 && m.lateSlope >= -0.035 && m.tailDelta >= -0.8) {
        score = 92;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ Steady Hold 55';
      } else if (m.coreSlope >= -0.105 && m.coreSlope <= 0.085 && m.coreDelta >= -1.65 && m.coreDelta <= 1.55 && m.lateSlope >= -0.05 && m.lateSlope <= 0.065) {
        score = Math.abs(m.coreSlope) <= 0.05 && Math.abs(m.coreDelta) <= 1.35 ? 96 : 90;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ High Flat 55';
      } else {
        score = 68;
        isAccurate = false;
        if (m.coreDelta < 0) {
          status = 'FALLING TONE';
          comment = '⚠ Dropped';
          diagnosticCode = 'DROPPED';
          advice = `Tone 1 on ${sylLabel} dropped in the second half. Keep your pitch steady to the end like holding a musical note.`;
        } else {
          status = 'RISING TONE';
          comment = '⚠ Climbed';
          diagnosticCode = 'CLIMBED';
          advice = `Tone 1 on ${sylLabel} drifted upward into Tone 2. Keep it flat at the top of your range.`;
        }
      }

    } else if (targetTone === 2) {
      // ─────────────────────────────────────────────────────────────
      // Tone 2: Rising 35 (Supports natural delayed conversational rise)
      // ─────────────────────────────────────────────────────────────
      const riseFromCoreMin = Math.max(m.coreEnd, m.edgeEnd) - m.coreMin;

      if (m.coreSlope <= -0.06 || m.coreDelta <= -1.4) {
        score = 52;
        isAccurate = false;
        status = 'WRONG DIRECTION';
        comment = '⚠ Plunged';
        diagnosticCode = 'FALLING_INSTEAD_OF_RISING';
        advice = `Tone 2 on ${sylLabel} plunged downward instead of rising. Start at mid-pitch and sweep up firmly.`;
      } else if (m.coreDelta < 0.75 && riseFromCoreMin < 1.1 && m.lateSlope < 0.03) {
        score = 58;
        isAccurate = false;
        status = 'FLAT CONTOUR';
        comment = '⚠ Too Flat';
        diagnosticCode = 'FLAT_RISE';
        advice = `Tone 2 on ${sylLabel} flattened out too early. Keep your pitch climbing all the way to the top, like asking: <em>'Really?!'</em>`;
      } else if (m.coreDelta >= 1.6 || riseFromCoreMin >= 2.0) {
        score = 96;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ Crisp Rise 35';
      } else if ((riseFromCoreMin >= 1.15 && m.lateSlope >= 0.02) || m.coreDelta >= 0.8) {
        score = 88;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ Natural Rise 35';
      } else {
        score = 58;
        isAccurate = false;
        status = 'FLAT CONTOUR';
        comment = '⚠ Too Flat';
        diagnosticCode = 'FLAT_RISE';
        advice = `Tone 2 on ${sylLabel} flattened out too early. Keep your pitch climbing all the way to the top, like asking: <em>'Really?!'</em>`;
      }

    } else if (targetTone === 3) {
      // ─────────────────────────────────────────────────────────────
      // Tone 3: Full Dipping 214 & Conversational Half-Third 21
      // ─────────────────────────────────────────────────────────────
      const recovery = m.edgeEnd - Math.min(m.coreMin, m.min);
      const isDipping214 = m.coreMin <= -0.60 && recovery >= 0.85 && m.minIdx >= 2 && m.minIdx <= Math.ceil(0.88 * n);
      const isHalfThird = m.lateSlope <= 0.055 && m.coreEnd <= 1.05 && (
        totalSyllables > 1
          ? (m.coreMin <= -0.50 || (m.min <= -0.8 && (m.edgeStart - m.min) >= 1.5))
          : (m.min <= -0.45 && (m.edgeStart - m.min >= 0.9 || m.coreMean <= 0.1))
      );

      if (isDipping214) {
        score = 95;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ Dipped 214';
      } else if (isHalfThird) {
        isAccurate = true;
        comment = '✓ Low Tone 3';
        if (totalSyllables > 1 && position !== 'final') {
          score = 94;
          diagnosticCode = 'HALF_THIRD_PASS';
        } else {
          score = 92;
          diagnosticCode = 'HALF_THIRD_SOLO';
          advice = 'Clean low Tone 3! When speaking a single word slowly on its own, you can also let the pitch rise slightly at the end (214).';
        }
      } else if (m.coreSlope > 0.08 && m.coreDelta > 2.0 && m.min > -0.8) {
        score = 66;
        isAccurate = false;
        status = 'ROSE TOO EARLY';
        comment = '⚠ Premature Rise';
        diagnosticCode = 'ROSE_TOO_EARLY';
        advice = `Tone 3 on ${sylLabel} climbed too fast and sounded like Tone 2. Stay low longer in your relaxed register.`;
      } else {
        score = 62;
        isAccurate = false;
        status = 'NOT DEEP ENOUGH';
        comment = '⚠ Shallow Dip';
        diagnosticCode = 'SHALLOW_DIP';
        advice = `Tone 3 on ${sylLabel} didn't dip deep enough into your lower register. Let your voice drop into your lowest relaxed pitch.`;
      }

    } else if (targetTone === 4) {
      // ─────────────────────────────────────────────────────────────
      // Tone 4: High Falling 51 & Conversational 53/42
      // ─────────────────────────────────────────────────────────────
      const effDrop = Math.min(m.coreDelta, m.edgeEnd - Math.max(m.coreStart, m.edgeStart));

      if (effDrop > -1.2 && m.coreSlope > -0.04) {
        score = 56;
        isAccurate = false;
        status = 'NOT FALLING';
        comment = '⚠ Failed to Drop';
        diagnosticCode = 'NOT_FALLING';
        advice = `Tone 4 on ${sylLabel} needs a sharp, decisive downward plunge. Start high and drop firmly, like commanding: <em>'Stop!'</em>`;
      } else if (effDrop <= -2.3) {
        score = 96;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ Sharp Plunge 51';
      } else if (effDrop <= -1.4 && (m.coreSlope <= -0.045 || m.lateSlope <= -0.045)) {
        score = 86;
        isAccurate = true;
        diagnosticCode = 'EXACT';
        comment = '✓ Natural Drop';
      } else {
        score = 56;
        isAccurate = false;
        status = 'NOT FALLING';
        comment = '⚠ Failed to Drop';
        diagnosticCode = 'NOT_FALLING';
        advice = `Tone 4 on ${sylLabel} needs a sharp, decisive downward plunge. Start high and drop firmly, like commanding: <em>'Stop!'</em>`;
      }

    } else {
      // ─────────────────────────────────────────────────────────────
      // Tone 5: Neutral Tone (Short, light, unstressed)
      // ─────────────────────────────────────────────────────────────
      score = m.coreDelta > 2.5 ? 80 : 92;
      isAccurate = true;
      diagnosticCode = 'EXACT';
      comment = '✓ Light Neutral';
      advice = m.coreDelta > 2.5
        ? `Keep ${sylLabel} brief, relaxed, and unstressed instead of lifting pitch.`
        : `Keep ${sylLabel} brief, relaxed, and unstressed.`;
    }

    // Append sandhi explanation if a contextual tone rule shifted this syllable and it failed
    if (!isAccurate && context?.sandhiRule) {
      const sandhiTip = context.sandhiRule === 'T3_SANDHI'
        ? 'Reminder: before another 3rd tone, raise this syllable like Tone 2.'
        : 'Reminder: this syllable shifts tone before the following tone.';
      advice = advice ? `${advice} ${sandhiTip}` : sandhiTip;
    }

    return {
      score,
      detectedTone: detected,
      isAccurate,
      status,
      comment,
      diagnosticCode,
      advice,
      metrics: m,
      citationTone: context?.citationTone ?? null,
      sandhiRule: context?.sandhiRule ?? null,
    };
  }
}
