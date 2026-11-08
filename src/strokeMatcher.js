/**
 * StrokeMatcher.js
 * Order-Agnostic Geometric Hanzi Stroke Evaluator
 * 
 * Implements the 5 Quantitative Tolerance Bands for L2 vocabulary recall:
 * 1. Angular Tolerance (±40° deviation from target stroke vector)
 * 2. Reverse Drawing (Bidirectional leniency, 180° ± 40° accepted)
 * 3. Length / Extent Ratio (45% <= L_user / L_target <= 190%)
 * 4. Positional Drift (Centroid offset <= 28% of canvas dimension)
 * 5. Micro-Hook & Feature Forgiveness (Straight vertical satisfies 亅)
 * + Compound Stroke Merging (横 + 竖 merged for 横折 𠃍)
 */

export function computeLength(pts) {
  if (!pts || pts.length < 2) return 0;
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  }
  return len;
}

export function computeCentroid(pts) {
  if (!pts || pts.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (let i = 0; i < pts.length; i++) {
    sx += pts[i][0];
    sy += pts[i][1];
  }
  return [sx / pts.length, sy / pts.length];
}

export function computeAngle(pts) {
  if (!pts || pts.length < 2) return 0;
  const p0 = pts[0];
  const pEnd = pts[pts.length - 1];
  return Math.atan2(pEnd[1] - p0[1], pEnd[0] - p0[0]) * (180 / Math.PI);
}

export function angleDifference(a, b) {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function resamplePoints(pts, count = 12) {
  if (!pts || pts.length <= 1) return pts || [];
  const totalLen = computeLength(pts);
  if (totalLen === 0) return Array(count).fill(pts[0]);
  
  const step = totalLen / (count - 1);
  const res = [pts[0]];
  let curDist = 0;
  let segIdx = 0;
  let segStart = pts[0];
  let segEnd = pts[1];
  let segLen = Math.hypot(segEnd[0] - segStart[0], segEnd[1] - segStart[1]);

  for (let i = 1; i < count - 1; i++) {
    const targetDist = i * step;
    while (curDist + segLen < targetDist && segIdx < pts.length - 2) {
      curDist += segLen;
      segIdx++;
      segStart = pts[segIdx];
      segEnd = pts[segIdx + 1];
      segLen = Math.hypot(segEnd[0] - segStart[0], segEnd[1] - segStart[1]);
    }
    const t = segLen === 0 ? 0 : Math.max(0, Math.min(1, (targetDist - curDist) / segLen));
    res.push([
      segStart[0] + t * (segEnd[0] - segStart[0]),
      segStart[1] + t * (segEnd[1] - segStart[1])
    ]);
  }
  res.push(pts[pts.length - 1]);
  return res;
}

export function meanDistToPolyline(userPts, polyline) {
  if (!userPts || userPts.length === 0 || !polyline || polyline.length < 2) return Infinity;
  let totalMinDist = 0;
  for (let i = 0; i < userPts.length; i++) {
    const up = userPts[i];
    let minDist = Infinity;
    for (let j = 0; j < polyline.length - 1; j++) {
      const d = pointToSegmentDist(up[0], up[1], polyline[j][0], polyline[j][1], polyline[j + 1][0], polyline[j + 1][1]);
      if (d < minDist) minDist = d;
    }
    totalMinDist += minDist;
  }
  return totalMinDist / userPts.length;
}

export function getHanziPositioner(width, height, padding) {
  if (typeof window !== 'undefined' && window.HanziWriter && typeof window.HanziWriter.getScalingTransform === 'function') {
    return window.HanziWriter.getScalingTransform(width, height, padding);
  }
  // Exact HanziWriter Positioner matching Makemeahanzi bounds [0, -124] to [1024, 900]
  const b = 1024;
  const $ = 1024;
  const s = width - 2 * padding;
  const o = height - 2 * padding;
  const scale = Math.min(s / b, o / $);
  const h = padding + (s - scale * b) / 2;
  const l = padding + (o - scale * $) / 2;
  const xOffset = h;
  const yOffset = 124 * scale + l;
  return {
    x: xOffset,
    y: yOffset,
    scale: scale,
    transform: `translate(${xOffset}, ${height - yOffset}) scale(${scale}, ${-1 * scale})`
  };
}

export class StrokeMatcher {
  constructor(options = {}) {
    this.options = Object.assign({
      angularTolerance: 42,           // ±42° angular leniency
      acceptBackwards: true,          // Allow reverse drawing
      lengthRatioMin: 0.45,           // Min 45% of target length
      lengthRatioMax: 2.10,           // Max 210% of target length
      maxCentroidDriftPct: 0.28,      // Centroid offset within 28% of canvas
      maxMeanDistPct: 0.20,           // Average point distance within 20% of canvas
      compoundMergeWindowMs: 1200     // Auto-merge consecutive strokes within 1.2s
    }, options);

    this.charData = null;
    this.canvasSize = 320;
    this.padding = 25;
    this.transform = null;
    this.targetStrokes = [];
    this.unclaimedStrokes = [];
    this.claimedStrokes = [];
    this.claimedStrokeDetails = [];
    this.recentUnmatchedStrokes = [];
  }

  /**
   * Initializes or updates character data and screen coordinates.
   */
  setCharacter(charData, canvasSize = 320, padding = 25) {
    this.charData = charData;
    this.canvasSize = Math.max(100, canvasSize);
    this.padding = padding;

    // Pixel-perfect HanziWriter Positioner coordinate transform
    const pos = getHanziPositioner(this.canvasSize, this.canvasSize, this.padding);
    this.transform = {
      x: pos.x,
      y: pos.y,
      scale: pos.scale,
      transform: pos.transform,
      height: this.canvasSize,
      toScreen: (px, py) => [
        pos.x + px * pos.scale,
        (this.canvasSize - pos.y) - py * pos.scale
      ]
    };

    this.targetStrokes = [];
    const strokes = charData.strokes || [];
    const medians = charData.medians || [];

    for (let i = 0; i < strokes.length; i++) {
      const rawMedian = medians[i] || [];
      const screenMedian = rawMedian.map(([px, py]) => this.transform.toScreen(px, py));
      const len = computeLength(screenMedian);
      const centroid = computeCentroid(screenMedian);
      const angle = computeAngle(screenMedian);

      // Micro-hook forgiveness: compute trunk angle for hooked strokes (last 20% omitted)
      let trunkAngle = angle;
      if (screenMedian.length >= 4) {
        const trunkPts = screenMedian.slice(0, Math.max(2, Math.floor(screenMedian.length * 0.8)));
        trunkAngle = computeAngle(trunkPts);
      }

      this.targetStrokes.push({
        index: i,
        path: strokes[i],
        rawMedian: rawMedian,
        screenMedian: screenMedian,
        length: len,
        centroid: centroid,
        angle: angle,
        trunkAngle: trunkAngle,
        isCompound: screenMedian.length > 5
      });
    }

    this.unclaimedStrokes = this.targetStrokes.map(s => s.index);
    this.claimedStrokes = [];
    this.claimedStrokeDetails = [];
    this.recentUnmatchedStrokes = [];
  }

  /**
   * Checks whether a single candidate stroke matches a target stroke definition.
   */
  evaluateCandidate(candidatePts, target) {
    const userLen = computeLength(candidatePts);
    if (userLen < 12) return { isMatch: false, reason: 'too_short' };

    // 1. Length Ratio Check
    const lenRatio = userLen / Math.max(1, target.length);
    // Extra leniency for very short target strokes (e.g. dots 点 < 35px)
    const minRatio = target.length < 35 ? 0.35 : this.options.lengthRatioMin;
    const maxRatio = target.length < 35 ? 2.50 : this.options.lengthRatioMax;
    if (lenRatio < minRatio || lenRatio > maxRatio) {
      return { isMatch: false, reason: 'length_mismatch', lenRatio };
    }

    // 2. Centroid Offset Check
    const userCentroid = computeCentroid(candidatePts);
    const centroidDist = Math.hypot(userCentroid[0] - target.centroid[0], userCentroid[1] - target.centroid[1]);
    const maxCentroidDist = this.canvasSize * this.options.maxCentroidDriftPct;
    if (centroidDist > maxCentroidDist) {
      return { isMatch: false, reason: 'centroid_drift', centroidDist };
    }

    // 3. Angular Tolerance Check (with Reverse Drawing support)
    const userAngle = computeAngle(candidatePts);
    const diffNormal = angleDifference(userAngle, target.angle);
    const diffTrunk = angleDifference(userAngle, target.trunkAngle);
    const diffAngle = Math.min(diffNormal, diffTrunk);

    let angleAccepted = (diffAngle <= this.options.angularTolerance);

    if (!angleAccepted && this.options.acceptBackwards) {
      const diffRevNormal = Math.abs(180 - diffNormal);
      const diffRevTrunk = Math.abs(180 - diffTrunk);
      const diffRev = Math.min(diffRevNormal, diffRevTrunk);
      if (diffRev <= this.options.angularTolerance) {
        angleAccepted = true;
      }
    }

    // Special allowance for short dots or compound strokes with steep turns
    if (!angleAccepted && (target.length < 40 || target.isCompound)) {
      if (diffAngle <= 55) {
        angleAccepted = true;
      }
    }

    if (!angleAccepted) {
      return { isMatch: false, reason: 'angle_mismatch', diffAngle };
    }

    // 4. Mean Distance to Target Median Polyline Check
    const resampledUser = resamplePoints(candidatePts, 12);
    const meanDist = meanDistToPolyline(resampledUser, target.screenMedian);
    const maxMeanDist = this.canvasSize * this.options.maxMeanDistPct;

    if (meanDist > maxMeanDist) {
      return { isMatch: false, reason: 'path_deviation', meanDist };
    }

    // 5. Extent / Endpoint Span Check for Compound Strokes
    // Ensures both segments of a compound turn (e.g. 横折 𠃍) are drawn rather than just one arm
    if (target.isCompound) {
      const tStart = target.screenMedian[0];
      const tEnd = target.screenMedian[target.screenMedian.length - 1];
      const uStart = candidatePts[0];
      const uEnd = candidatePts[candidatePts.length - 1];

      const maxEndDist = Math.max(30, target.length * 0.25);
      const fwdMatch = (Math.hypot(uStart[0] - tStart[0], uStart[1] - tStart[1]) <= maxEndDist) &&
                       (Math.hypot(uEnd[0] - tEnd[0], uEnd[1] - tEnd[1]) <= maxEndDist);
      const revMatch = (Math.hypot(uStart[0] - tEnd[0], uStart[1] - tEnd[1]) <= maxEndDist) &&
                       (Math.hypot(uEnd[0] - tStart[0], uEnd[1] - tStart[1]) <= maxEndDist);

      if (!fwdMatch && !revMatch) {
        return { isMatch: false, reason: 'compound_endpoints_uncovered' };
      }
    }

    return {
      isMatch: true,
      score: 1.0 - (meanDist / maxMeanDist) * 0.5,
      meanDist: meanDist,
      centroidDist: centroidDist,
      diffAngle: diffAngle
    };
  }

  /**
   * Evaluates user drawn points against all remaining unclaimed strokes in the pool.
   * Supports automatic compound stroke merging if drawn as two separate strokes.
   */
  matchUserStroke(userPoints) {
    if (!userPoints || userPoints.length < 2 || this.unclaimedStrokes.length === 0) {
      return { matched: false, reason: 'empty_input' };
    }

    // A. First: Test the direct stroke as drawn against all unclaimed strokes
    let bestMatch = null;
    let bestScore = -Infinity;

    for (const strokeIdx of this.unclaimedStrokes) {
      const target = this.targetStrokes[strokeIdx];
      const result = this.evaluateCandidate(userPoints, target);
      if (result.isMatch && result.score > bestScore) {
        bestScore = result.score;
        bestMatch = {
          strokeIndex: strokeIdx,
          target: target,
          isCompoundMerged: false,
          diffAngle: result.diffAngle || 0
        };
      }
    }

    if (bestMatch) {
      this.recentUnmatchedStrokes = [];
      return {
        matched: true,
        strokeIndex: bestMatch.strokeIndex,
        strokePath: bestMatch.target.path,
        isCompoundMerged: false,
        diffAngle: bestMatch.diffAngle
      };
    }

    // B. Second: Auto-Merge Compound Stroke Check
    // If user drew part of a compound stroke (e.g. 横 then 竖 within 1.2s), merge points and test
    const now = Date.now();
    const cleanRecent = this.recentUnmatchedStrokes.filter(item => (now - item.time) <= this.options.compoundMergeWindowMs);
    this.recentUnmatchedStrokes = cleanRecent;

    for (const prev of cleanRecent) {
      const prevEnd = prev.pts[prev.pts.length - 1];
      const curStart = userPoints[0];
      const gap = Math.hypot(curStart[0] - prevEnd[0], curStart[1] - prevEnd[1]);

      // If connection point is close (within 55px on canvas)
      if (gap <= 55) {
        const mergedPts = prev.pts.concat(userPoints);
        for (const strokeIdx of this.unclaimedStrokes) {
          const target = this.targetStrokes[strokeIdx];
          if (target.isCompound) {
            const mergedResult = this.evaluateCandidate(mergedPts, target);
            if (mergedResult.isMatch) {
              this.recentUnmatchedStrokes = [];
              return {
                matched: true,
                strokeIndex: strokeIdx,
                strokePath: target.path,
                isCompoundMerged: true,
                diffAngle: mergedResult.diffAngle || 0
              };
            }
          }
        }
      }
    }

    // Record this stroke as recent unmatched stroke for potential compound merging
    this.recentUnmatchedStrokes.push({
      pts: userPoints,
      time: now
    });

    return {
      matched: false,
      softMiss: true
    };
  }

  /**
   * Claims a matching stroke and removes it from the unclaimed pool.
   */
  claimStroke(strokeIndex, meta = {}) {
    const idxInUnclaimed = this.unclaimedStrokes.indexOf(strokeIndex);
    if (idxInUnclaimed !== -1) {
      this.unclaimedStrokes.splice(idxInUnclaimed, 1);
      this.claimedStrokes.push(strokeIndex);
      this.claimedStrokeDetails.push({
        index: strokeIndex,
        diffAngle: meta.diffAngle || 0,
        isCompoundMerged: !!meta.isCompoundMerged
      });
    }
    return {
      isComplete: this.unclaimedStrokes.length === 0,
      claimedCount: this.claimedStrokes.length,
      unclaimedCount: this.unclaimedStrokes.length
    };
  }

  /**
   * Undoes the most recently claimed stroke (User clarification #4).
   */
  undoLastStroke() {
    if (this.claimedStrokes.length === 0) return null;
    const undoneIndex = this.claimedStrokes.pop();
    this.claimedStrokeDetails.pop();
    if (!this.unclaimedStrokes.includes(undoneIndex)) {
      this.unclaimedStrokes.push(undoneIndex);
      this.unclaimedStrokes.sort((a, b) => a - b);
    }
    return {
      undoneStrokeIndex: undoneIndex,
      isComplete: false,
      claimedCount: this.claimedStrokes.length,
      unclaimedCount: this.unclaimedStrokes.length
    };
  }

  /**
   * Resets all stroke claims back to full unclaimed pool.
   */
  reset() {
    this.unclaimedStrokes = this.targetStrokes.map(s => s.index);
    this.claimedStrokes = [];
    this.claimedStrokeDetails = [];
    this.recentUnmatchedStrokes = [];
  }

  isComplete() {
    return this.targetStrokes.length > 0 && this.unclaimedStrokes.length === 0;
  }

  /**
   * Returns maximum angular deviation among all claimed strokes.
   */
  getMaxAngleDeviation() {
    if (!this.claimedStrokeDetails || this.claimedStrokeDetails.length === 0) return 0;
    return Math.max(...this.claimedStrokeDetails.map(d => d.diffAngle || 0));
  }

  /**
   * Checks if strokes were drawn in canonical traditional sequence (0, 1, 2, ...).
   */
  isCanonicalOrder() {
    if (this.claimedStrokes.length === 0) return true;
    return this.claimedStrokes.every((idx, pos) => idx === pos);
  }

  /**
   * Returns metadata for all stroke origin badges (Mode A Scaffolding).
   */
  getStrokeOriginBadges() {
    return this.targetStrokes.map(s => {
      const startPt = s.screenMedian[0] || [0, 0];
      return {
        strokeIndex: s.index,
        badgeNumber: s.index + 1,
        x: Math.round(startPt[0]),
        y: Math.round(startPt[1]),
        isClaimed: this.claimedStrokes.includes(s.index)
      };
    });
  }

  /**
   * Returns the first unclaimed stroke in canonical order (for missing stroke flash).
   */
  getFirstUnclaimedStroke() {
    if (this.unclaimedStrokes.length === 0) return null;
    const sorted = [...this.unclaimedStrokes].sort((a, b) => a - b);
    return this.targetStrokes[sorted[0]] || null;
  }
}

/**
 * Three-Tier Diagnostic Classifier
 * Evaluates drawing against the Hanzi Drawing Feedback Engine Spec.
 *
 * Tier 1: Clean Pass (Native / Flawless)
 * Tier 2: Soft Pass (2A: Tolerance / 2B: Order drift + Pro-Tip)
 * Tier 3: Diagnostic Failure (Missing stroke, wrong angle, extra stroke, unrecognized)
 */
export function classifyDrawing(charMatcher, userDrawnStrokes = []) {
  if (!charMatcher || !charMatcher.targetStrokes) {
    return { tier: 'TIER_3_UNRECOGNIZED', badge: '❓ Unrecognized', detail: 'No character data available.', status: 'fail' };
  }

  const targetCount = charMatcher.targetStrokes.length;
  const unclaimed = charMatcher.unclaimedStrokes;
  const maxAngleDev = charMatcher.getMaxAngleDeviation();
  const isStandardOrder = charMatcher.isCanonicalOrder();
  const userStrokeCount = userDrawnStrokes.length;
  const extraneousCount = Math.max(0, userStrokeCount - targetCount);

  // 1. Complete Pass (All target strokes claimed)
  if (unclaimed.length === 0 && extraneousCount === 0) {
    if (maxAngleDev <= 15 && isStandardOrder) {
      return {
        tier: 'TIER_1_CLEAN_PASS',
        badge: '🎯 Perfect Form!',
        detail: 'Native execution with canonical stroke order and accurate angles.',
        status: 'pass',
        showOrderReplay: false
      };
    }
    if (!isStandardOrder) {
      return {
        tier: 'TIER_2_SOFT_PASS_ORDER',
        badge: '✓ Recognized!',
        detail: '💡 Pro Tip: Native stroke order goes top-to-bottom, left-to-right.',
        status: 'pass',
        showOrderReplay: true
      };
    }
    return {
      tier: 'TIER_2_SOFT_PASS_TOLERANCE',
      badge: '✓ Passed with Tolerance!',
      detail: '💡 Tip: Keep strokes aligned and upright for balanced proportions.',
      status: 'pass',
      showOrderReplay: false
    };
  }

  // 2. Diagnostic Failures
  if (extraneousCount > 0 && unclaimed.length === 0) {
    return {
      tier: 'TIER_3_EXTRA_STROKE',
      badge: '⚠️ Extra Stroke Detected',
      detail: `Target has ${targetCount} strokes, but you drew ${userStrokeCount}.`,
      status: 'fail',
      extraCount: extraneousCount
    };
  }

  if (unclaimed.length > 0 && userStrokeCount < targetCount) {
    return {
      tier: 'TIER_3_MISSING_STROKE',
      badge: '⚠️ Almost There!',
      detail: `${unclaimed.length} stroke${unclaimed.length > 1 ? 's are' : ' is'} missing (highlighted above).`,
      status: 'fail',
      missingIndex: unclaimed[0],
      missingCount: unclaimed.length
    };
  }

  if (maxAngleDev > 40) {
    return {
      tier: 'TIER_3_WRONG_ANGLE',
      badge: '⚠️ Angle Alert',
      detail: 'A stroke angle deviated significantly from the traditional trajectory.',
      status: 'fail'
    };
  }

  return {
    tier: 'TIER_3_UNRECOGNIZED',
    badge: '❓ Shape Unrecognized',
    detail: 'Listen again, or tap [Guide: ON] to trace the reference strokes.',
    status: 'fail'
  };
}
