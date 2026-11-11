/**
 * toneGrading.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for runtime syllable tone grading and feedback priority,
 * shared by both AudioPipeline.stopAndProcess and reevaluateUtteranceAgainstProfile.
 */

import { DTWComparator } from "./dtwComparator.js";
import { ToneClassifier } from "./toneClassifier.js";

// Register-only miss (flat Tone 1 pitched low): stays in Amber (<= 78) instead of Rose.
// Contour/category/sandhi failures cap at <= 64 (Rose) so "Adjust Pitch Direction" fires.
const REGISTER_ONLY_CODES = new Set(["TOO_LOW"]);

/**
 * Evaluates user contour against active reference profile with ToneClassifier authority.
 *
 * @param {number[]|null} userNormContour
 * @param {number[]} activeRefContour
 * @param {object} [syllableMeta]
 */
export function scoreSyllableTone(userNormContour, activeRefContour, syllableMeta = {}) {
  const targetTone = syllableMeta.expectedTone ?? syllableMeta.tone ?? 1;
  const evalResult = ToneClassifier.evaluate(
    userNormContour,
    targetTone,
    syllableMeta.syllable || "",
    syllableMeta
  );

  if (!userNormContour || userNormContour.length < 3) {
    return {
      toneScore: 35,
      toneTier: "ROSE",
      evalResult,
      dtwResult: { distance: 99.0, score: 0, path: [], isCloseMatch: false, registerShiftSt: 0 },
      effectiveDtwScore: 0,
      registerShiftSt: 0,
    };
  }

  const dtwActive = DTWComparator.compareLenient(userNormContour, activeRefContour, syllableMeta);
  const canonicalContours = [DTWComparator.getCanonicalContour(targetTone, 30)];
  if (targetTone === 3) {
    canonicalContours.push(DTWComparator.getCanonicalContour(3, 30, "half_third"));
  }
  const dtwCanonicalScores = canonicalContours.map(
    (c) => DTWComparator.compareLenient(userNormContour, c, syllableMeta).score
  );
  const effectiveDtwScore = Math.max(dtwActive.score, ...dtwCanonicalScores);

  const rawBlended = Math.round(0.70 * evalResult.score + 0.30 * effectiveDtwScore);

  let toneScore = rawBlended;
  if (evalResult.isAccurate) {
    const gateFloor = evalResult.score >= 85 ? 85 : evalResult.score;
    toneScore = Math.max(gateFloor, rawBlended);
  } else if (REGISTER_ONLY_CODES.has(evalResult.diagnosticCode)) {
    toneScore = Math.min(78, Math.max(rawBlended, 35), evalResult.score + 10);
  } else {
    // Directional contour / wrong-tone / sandhi error
    toneScore = Math.min(64, Math.max(rawBlended, 35), evalResult.score + 4);
  }

  const toneTier = toneScore >= 85 ? "EMERALD" : (toneScore >= 65 ? "AMBER" : "ROSE");

  return {
    toneScore,
    toneTier,
    evalResult,
    dtwResult: dtwActive,
    effectiveDtwScore,
    registerShiftSt: dtwActive.registerShiftSt || 0,
  };
}

/**
 * Computes syllable coaching priority & advice consistently across initial capture and track switch.
 */
export function computeSyllableCoaching(toneScore, evalResult, finalResult, initialResult, targetTone) {
  const initialScore = initialResult?.score !== undefined ? initialResult.score : 90;
  const finalScore = finalResult?.score !== undefined ? finalResult.score : 85;
  let coachingPriority = "PERFECT";
  let coachingAdvice = "Everything sounded clear.";

  if (toneScore < 65) {
    coachingPriority = "TONE";
    coachingAdvice = evalResult?.advice || `Tone ${targetTone} pitch contour shifted. Adjust pitch direction.`;
  } else if (finalScore < 65) {
    coachingPriority = "FINAL";
    coachingAdvice = finalResult?.advice || "Vowel resonance muffled. Adjust your mouth opening.";
  } else if (initialScore < 65) {
    coachingPriority = "INITIAL";
    coachingAdvice = initialResult?.advice || "Check breath release on the starting consonant.";
  } else if (toneScore < 85) {
    coachingPriority = "TONE";
    coachingAdvice = evalResult?.advice || "Good tone contour. Keep pitch steady.";
  } else if (finalScore < 85) {
    coachingPriority = "FINAL";
    coachingAdvice = finalResult?.advice || "Almost clear vowel. Fine-tune lip and jaw shape.";
  } else if (initialScore < 85) {
    coachingPriority = "INITIAL";
    coachingAdvice = initialResult?.advice || "Good starting consonant.";
  } else if (evalResult?.diagnosticCode === "HALF_THIRD_SOLO" && evalResult?.advice) {
    coachingPriority = "PERFECT";
    coachingAdvice = evalResult.advice;
  }

  return { coachingPriority, coachingAdvice };
}

/**
 * Selects the single utterance-level "One Critical Fix" across all syllables.
 */
export function computeUtterancePriority(syllables) {
  let coachingPriority = "PERFECT";
  let primaryAdvice = "Outstanding pronunciation! All phonemic targets verified.";

  const criticalTone = syllables.find((s) => s.toneScore < 65);
  if (criticalTone) {
    return {
      coachingPriority: "TONE",
      coachingAdvice: criticalTone.advice || criticalTone.coachingAdvice,
    };
  }
  const criticalFinal = syllables.find((s) => s.final?.score < 65);
  if (criticalFinal) {
    return {
      coachingPriority: "FINAL",
      coachingAdvice: criticalFinal.final?.advice || criticalFinal.coachingAdvice,
    };
  }
  const criticalInit = syllables.find((s) => s.initial?.score < 65);
  if (criticalInit) {
    return {
      coachingPriority: "INITIAL",
      coachingAdvice: criticalInit.initial?.advice || criticalInit.coachingAdvice,
    };
  }
  const amberSyl = syllables.find((s) => s.finalScore < 85 && s.coachingAdvice);
  if (amberSyl) {
    return {
      coachingPriority: amberSyl.coachingPriority,
      coachingAdvice: amberSyl.coachingAdvice,
    };
  }

  const soloTipSyl = syllables.find((s) => s.diagnosticCode === "HALF_THIRD_SOLO" && s.coachingAdvice);
  if (soloTipSyl) {
    return {
      coachingPriority: "PERFECT",
      coachingAdvice: soloTipSyl.coachingAdvice,
    };
  }

  return { coachingPriority, coachingAdvice: primaryAdvice };
}
