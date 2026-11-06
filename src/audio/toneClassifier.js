/**
 * toneClassifier.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 4: Directional Slope & Tone Curvature Classifier
 *
 * Performs first-order regression slope analysis, curvature inflection checks,
 * and linguistic gatekeeping to ensure fundamental Mandarin tone geometry.
 */

export class ToneClassifier {
  /**
   * Extract geometric pitch metrics from a normalized semitone contour.
   *
   * @param {number[]} contour  Array of normalized semitone values (e.g. 30 points)
   * @returns {{ slope: number, delta: number, mean: number, min: number, max: number, start: number, end: number, minIdx: number }}
   */
  static extractMetrics(contour) {
    if (!contour || contour.length < 3) {
      return { slope: 0, delta: 0, mean: 0, min: 0, max: 0, start: 0, end: 0, minIdx: 0 };
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

    // First and last 20% averages for onset/coda stability
    const chunkLen = Math.max(1, Math.floor(n * 0.2));
    const startChunk = contour.slice(0, chunkLen);
    const endChunk = contour.slice(n - chunkLen);
    const startMean = startChunk.reduce((a, b) => a + b, 0) / startChunk.length;
    const endMean = endChunk.reduce((a, b) => a + b, 0) / endChunk.length;
    const delta = endMean - startMean;

    return {
      slope: Math.round(slope * 1000) / 1000,
      delta: Math.round(delta * 100) / 100,
      mean: Math.round(meanY * 100) / 100,
      min: Math.round(minVal * 100) / 100,
      max: Math.round(maxVal * 100) / 100,
      start: Math.round(startMean * 100) / 100,
      end: Math.round(endMean * 100) / 100,
      minIdx,
    };
  }

  /**
   * Determine the most likely Mandarin tone based purely on contour shape.
   *
   * @param {number[]} contour
   * @returns {number} 1, 2, 3, 4, or 5
   */
  static detectTone(contour) {
    if (!contour || contour.length < 3) return 5;
    const m = this.extractMetrics(contour);

    // Tone 4: Steep negative slope with significant downward plunge
    if (m.slope <= -0.09 || m.delta <= -2.4) {
      return 4;
    }

    // Tone 2: Positive climbing slope with clear net rise
    if (m.slope >= 0.05 && m.delta >= 1.2) {
      return 2;
    }

    // Tone 3: Distinct dip in the middle/latter portion
    if (m.minIdx >= 5 && m.minIdx <= 25 && m.min <= -1.2 && m.end > m.min + 0.8) {
      return 3;
    }

    // Tone 1: Level/flat slope and elevated pitch level
    if (Math.abs(m.slope) <= 0.045 && m.mean >= 0.6) {
      return 1;
    }

    // Secondary checks
    if (m.slope > 0.03) return 2;
    if (m.slope < -0.05) return 4;
    return 1;
  }

  /**
   * Verify and evaluate the user contour against the target syllable's tone.
   *
   * @param {number[]} userContour
   * @param {number} targetTone 1, 2, 3, 4, or 5
   * @param {string} syllableName e.g., "mā" or "hǎo"
   * @returns {{
   *   score: number,
   *   detectedTone: number,
   *   isAccurate: boolean,
   *   status: string,
   *   comment: string,
   *   diagnosticCode: string,
   *   advice: string,
   *   metrics: object
   * }}
   */
  static evaluate(userContour, targetTone, syllableName = '') {
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
      };
    }

    const m = this.extractMetrics(userContour);
    const detected = this.detectTone(userContour);

    let score = 90;
    let isAccurate = true;
    let status = 'ACCURATE CONTOUR';
    let comment = '✓ Exact Contour';
    let diagnosticCode = 'EXACT';
    let advice = '';

    const sylLabel = syllableName ? `<strong>'${syllableName}'</strong>` : 'this syllable';

    if (targetTone === 1) {
      // ─────────────────────────────────────────────────────────────
      // Tone 1: High Level 55 (Flat, High)
      // ─────────────────────────────────────────────────────────────
      if (m.delta < -1.8 || m.slope < -0.07) {
        score = 62;
        isAccurate = false;
        status = 'FALLING TONE';
        comment = '⚠ Dropped';
        diagnosticCode = 'DROPPED';
        advice = `Tone 1 on ${sylLabel} dropped at the end. Keep your vocal cords steady like singing a sustained musical note.`;
      } else if (m.delta > 1.8 || m.slope > 0.07) {
        score = 68;
        isAccurate = false;
        status = 'RISING TONE';
        comment = '⚠ Climbed';
        diagnosticCode = 'CLIMBED';
        advice = `Tone 1 on ${sylLabel} drifted upward into Tone 2. Keep it flat at the top of your range without questioning intonation.`;
      } else if (m.mean < -0.5) {
        score = 74;
        isAccurate = false;
        status = 'TOO LOW';
        comment = '⚠ Low Pitch';
        diagnosticCode = 'TOO_LOW';
        advice = `Tone 1 on ${sylLabel} is flat, but pitched too low in your vocal range. Sing it at Level 5 (high soprano/head voice).`;
      } else {
        score = 96;
        comment = '✓ High Flat 55';
      }

    } else if (targetTone === 2) {
      // ─────────────────────────────────────────────────────────────
      // Tone 2: Rising 35 (Positive slope, distinct upward delta)
      // ─────────────────────────────────────────────────────────────
      if (m.slope <= 0.01 && m.delta < 0.9) {
        score = 60;
        isAccurate = false;
        status = 'FLAT CONTOUR';
        comment = '⚠ Too Flat';
        diagnosticCode = 'FLAT_RISE';
        advice = `Tone 2 on ${sylLabel} flattened out too early. Keep your pitch climbing all the way to the top, like asking: <em>'Really?!'</em>`;
      } else if (m.slope < -0.06 || m.delta < -1.5) {
        score = 55;
        isAccurate = false;
        status = 'WRONG DIRECTION';
        comment = '⚠ Plunged';
        diagnosticCode = 'FALLING_INSTEAD_OF_RISING';
        advice = `Tone 2 on ${sylLabel} plunged downward instead of rising. Start at mid-pitch and sweep up firmly.`;
      } else if (m.delta < 1.5) {
        score = 78;
        isAccurate = true;
        comment = '✓ Gentle Rise';
      } else {
        score = 95;
        comment = '✓ Crisp Rise 35';
      }

    } else if (targetTone === 3) {
      // ─────────────────────────────────────────────────────────────
      // Tone 3: Low Dipping 214 (Reaches bottom register)
      // ─────────────────────────────────────────────────────────────
      if (m.min > -0.6) {
        score = 64;
        isAccurate = false;
        status = 'NOT DEEP ENOUGH';
        comment = '⚠ Shallow Dip';
        diagnosticCode = 'SHALLOW_DIP';
        advice = `Tone 3 on ${sylLabel} didn't dip deep enough into your lower register. Let your voice bottom out into your chest register (Level 1).`;
      } else if (m.slope > 0.08 && m.delta > 2.0) {
        score = 66;
        isAccurate = false;
        status = 'ROSE TOO EARLY';
        comment = '⚠ Premature Rise';
        diagnosticCode = 'ROSE_TOO_EARLY';
        advice = `Tone 3 on ${sylLabel} climbed too fast and sounded like Tone 2. Spend more time at the lowest pitch before rising.`;
      } else {
        score = 94;
        comment = '✓ Dipped 214';
      }

    } else if (targetTone === 4) {
      // ─────────────────────────────────────────────────────────────
      // Tone 4: High Falling 51 (Sharp, decisive plunge)
      // ─────────────────────────────────────────────────────────────
      if (m.delta > -1.2 || m.slope > -0.04) {
        score = 58;
        isAccurate = false;
        status = 'NOT FALLING';
        comment = '⚠ Failed to Drop';
        diagnosticCode = 'NOT_FALLING';
        advice = `Tone 4 on ${sylLabel} needs a sharp, decisive downward plunge. Start at your highest note and drop firmly, like commanding: <em>'Stop!'</em>`;
      } else if (m.delta > -2.2) {
        score = 76;
        isAccurate = true;
        comment = '✓ Moderate Drop';
        advice = `Good downward pitch on ${sylLabel}, but make the drop steeper and sharper from top to bottom.`;
      } else {
        score = 96;
        comment = '✓ Sharp Plunge 51';
      }

    } else {
      // ─────────────────────────────────────────────────────────────
      // Tone 5: Neutral Tone (Short, light, soft)
      // ─────────────────────────────────────────────────────────────
      score = 90;
      comment = '✓ Light Neutral';
      advice = `Keep ${sylLabel} brief, relaxed, and unstressed.`;
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
    };
  }
}
