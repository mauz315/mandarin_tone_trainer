/**
 * dtwComparator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 4: Fast Dynamic Time Warping (Fast-DTW) Contour Comparator
 *
 * Compares two pitch trajectories (user vs. native reference) in semitone space:
 *   1. Sakoe-Chiba band constraint (limits temporal distortion)
 *   2. Symmetric slope weight (step-size normalization)
 *   3. Cumulative Euclidean trajectory distance
 *   4. Exponential mapping to an intuitive 0-100% trajectory match score
 */

function coreMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const kEdge = arr.length >= 10 ? Math.max(2, Math.round(arr.length * 0.13)) : 0;
  const slice = arr.length >= 10 ? arr.slice(kEdge, arr.length - kEdge) : arr;
  const sorted = [...slice].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class DTWComparator {
  /**
   * Compare two equal or unequal length 1D semitone contours using DTW.
   * Remains 100% strict by default (deadzoneSt = 0, alignShift = false, decaySigma = 1.75).
   * Pass { mode: 'conversational' } or compareLenient(...) for perceptual corridor tolerance.
   *
   * @param {number[]} userContour  e.g., 30 resampled semitone points
   * @param {number[]} refContour   e.g., 30 resampled semitone points
   * @param {object} [options]
   * @returns {{ distance: number, score: number, path: Array<[number, number]>, isCloseMatch: boolean, registerShiftSt?: number }}
   */
  static compare(userContour, refContour, options = {}) {
    if (!userContour || !refContour || userContour.length < 2 || refContour.length < 2) {
      return {
        distance: 99.0,
        score: 0,
        path: [],
        isCloseMatch: false,
        registerShiftSt: 0,
      };
    }

    const n = userContour.length;
    const m = refContour.length;
    const maxDim = Math.max(n, m);
    const maxWindow = options.maxWindow !== undefined ? options.maxWindow : Math.max(4, Math.floor(maxDim * 0.25));

    const isConv = options.mode === 'conversational';
    const alignShift = options.alignShift !== undefined ? Boolean(options.alignShift) : isConv;
    const deadzoneSt = options.deadzoneSt !== undefined ? options.deadzoneSt : (isConv ? 0.80 : 0);
    const decaySigma = options.decaySigma || (isConv ? 2.25 : 1.75);
    const edgeWeight = options.edgeWeight !== undefined ? options.edgeWeight : (isConv ? 0.35 : 1.0);

    let registerShiftSt = 0;
    let activeUser = userContour;
    if (alignShift) {
      const maxShiftSt = options.maxShiftSt !== undefined
        ? options.maxShiftSt
        : ((options.totalSyllables || 1) === 1 ? 3.0 : 1.5);
      const rawShift = coreMedian(userContour) - coreMedian(refContour);
      registerShiftSt = Math.max(-maxShiftSt, Math.min(maxShiftSt, rawShift));
      activeUser = userContour.map((v) => v - registerShiftSt);
    }

    const weightAt = (i) => {
      if (edgeWeight === 1.0) return 1.0;
      return (i < 0.13 * n || i >= 0.87 * n) ? edgeWeight : 1.0;
    };

    const pointDist = (i, j) => {
      const rawDiff = Math.abs(activeUser[i] - refContour[j]);
      const bandDiff = deadzoneSt > 0 ? Math.max(0, rawDiff - deadzoneSt) : rawDiff;
      return weightAt(i) * bandDiff;
    };

    // Cost matrix initialization with Infinity
    const cost = Array.from({ length: n }, () => new Float32Array(m).fill(Infinity));
    cost[0][0] = pointDist(0, 0);

    // Forward Dynamic Programming with Generalized Sakoe-Chiba Band
    const slope = (m - 1) / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const centerJ = Math.round(i * slope);
      const jStart = Math.max(0, centerJ - maxWindow);
      const jEnd = Math.min(m - 1, centerJ + maxWindow);

      for (let j = jStart; j <= jEnd; j++) {
        if (i === 0 && j === 0) continue;

        const dist = pointDist(i, j);
        let minPrev = Infinity;

        if (i > 0 && j > 0) minPrev = Math.min(minPrev, cost[i - 1][j - 1]);
        if (i > 0) minPrev = Math.min(minPrev, cost[i - 1][j]);
        if (j > 0) minPrev = Math.min(minPrev, cost[i][j - 1]);

        cost[i][j] = dist + minPrev;
      }
    }

    // Backtracking to find the optimal warping path
    let i = n - 1;
    let j = m - 1;
    const path = [[i, j]];

    while (i > 0 || j > 0) {
      if (i === 0) {
        j--;
      } else if (j === 0) {
        i--;
      } else {
        const diag = cost[i - 1][j - 1];
        const left = cost[i][j - 1];
        const up = cost[i - 1][j];

        if (diag <= left && diag <= up) {
          i--;
          j--;
        } else if (left <= up) {
          j--;
        } else {
          i--;
        }
      }
      path.push([i, j]);
    }

    path.reverse();

    const totalDist = cost[n - 1][m - 1];
    const weightSum = path.reduce((acc, [pi]) => acc + weightAt(pi), 0);
    const avgDistance = Number.isFinite(totalDist) && weightSum > 0 ? totalDist / weightSum : 99.0;

    const rawScore = 100 * Math.exp(-avgDistance / decaySigma);
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      distance: Math.round(avgDistance * 1000) / 1000,
      score,
      path,
      isCloseMatch: avgDistance <= 1.25,
      registerShiftSt: Math.round(registerShiftSt * 1000) / 1000,
    };
  }

  /**
   * Conversational corridor DTW comparison with register alignment and onset/coda attenuation.
   */
  static compareLenient(userContour, refContour, options = {}) {
    return DTWComparator.compare(userContour, refContour, {
      mode: 'conversational',
      ...options,
    });
  }

  /**
   * Generates a canonical 30-point Chao contour (citation or half_third for Tone 3).
   *
   * @param {number} tone 1, 2, 3, 4, or 5
   * @param {number} [numPoints=30]
   * @param {'citation' | 'half_third'} [style='citation']
   * @returns {number[]} 30 normalized semitone points
   */
  static getCanonicalContour(tone, numPoints = 30, style = 'citation') {
    const pts = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      let st = 0.0;

      if (tone === 1) {
        // Tone 1: High Level 55 (Steady +2.6 semitones)
        st = 2.6;
      } else if (tone === 2) {
        // Tone 2: Rising 35 (From 0.0 up to +2.7 semitones)
        st = -0.3 + Math.pow(t, 1.2) * 3.0;
      } else if (tone === 3) {
        if (style === 'half_third') {
          // Conversational Half-Third 21: Steady descent into low register
          st = -0.5 - 2.0 * Math.pow(t, 0.7);
        } else if (t < 0.55) {
          const subT = t / 0.55;
          st = -0.8 - Math.sin(subT * Math.PI * 0.5) * 2.0;
        } else {
          const subT = (t - 0.55) / 0.45;
          st = -2.8 + Math.pow(subT, 1.4) * 3.6;
        }
      } else if (tone === 4) {
        // Tone 4: High Falling 51 (Plunges from +3.2 down to -2.6 semitones)
        st = 3.2 - Math.pow(t, 0.85) * 5.8;
      } else {
        // Tone 5 (Neutral): Light mid-low decay
        st = -0.2 - t * 0.8;
      }

      pts[i] = Math.round(st * 1000) / 1000;
    }
    return pts;
  }
}
