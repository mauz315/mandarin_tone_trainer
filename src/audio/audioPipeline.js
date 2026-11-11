/**
 * audioPipeline.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 3: Unified Client-Side Audio Pipeline & Processing Orchestrator
 *
 * Coordinates:
 *   1. AudioRecorder (16kHz PCM capture + volume meters)
 *   2. AlignerClient (Sherpa-ONNX Web Worker or VAD fallback)
 *   3. PitchTracker (YIN F0 extraction + semitone normalization + 30-point resampling)
 *
 * Provides a clean high-level async API for the practice UI:
 *   const pipeline = new AudioPipeline();
 *   await pipeline.startRecording((volume) => updateMeter(volume));
 *   const result = await pipeline.stopAndProcess({
 *     word: "一",
 *     pinyin: "yī",
 *     referenceProfile: profile
 *   });
 */

import { AudioRecorder } from "./recorder.js";
import { PitchTracker } from "./pitchTracker.js";
import { AlignerClient } from "./alignerClient.js";
import { DTWComparator } from "./dtwComparator.js";
import { PinyinUtils } from "./pinyinUtils.js";
import { InitialEvaluator } from "./initialEvaluator.js";
import { FormantTracker } from "./formantTracker.js";
import {
  scoreSyllableTone,
  computeSyllableCoaching,
  computeUtterancePriority,
} from "./toneGrading.js";

export class AudioPipeline {
  constructor(options = {}) {
    this.recorder = new AudioRecorder(options);
    this.aligner = new AlignerClient();
    this.isInitialized = false;
  }

  /**
   * Pre-warm AudioContext and Web Worker.
   */
  async init() {
    if (this.isInitialized) return;
    await this.recorder.init();
    await this.aligner.init();
    this.isInitialized = true;
  }

  /**
   * Start recording microphone input.
   * @param {(volume: number) => void} [onVolumeChange]
   */
  async startRecording(onVolumeChange = null) {
    if (onVolumeChange) {
      this.recorder.onVolumeChange = onVolumeChange;
    }
    await this.start();
  }

  async start() {
    await this.init();
    await this.recorder.start();
  }

  get isRecording() {
    return this.recorder.isRecording;
  }

  /**
   * Stop recording and process user audio against target word and reference profile.
   *
   * @param {{ word: string, pinyin: string, referenceProfile?: object }} params
   * @returns {Promise<ProcessedUtterance>}
   */
  async stopAndProcess({ word, pinyin, referenceProfile = null }) {
    const recordResult = await this.recorder.stop();
    if (!recordResult || !recordResult.pcmFloat32 || recordResult.pcmFloat32.length === 0) {
      throw new Error("No audio recorded. Please check your microphone.");
    }

    const { pcmFloat32, sampleRate, duration, audioBlob } = recordResult;

    // Step 1: Temporal syllable alignment (Sherpa-ONNX Worker or Energy-Valley VAD) BEFORE baseline calculation
    const alignedSyllables = await this.aligner.align({
      pcmFloat32,
      sampleRate,
      word,
      pinyin,
    });

    // Step 2: Per-syllable cleaned YIN pitch extraction & aligned-window speaker medianHz
    const perSyllableAudio = alignedSyllables.map((syl) => {
      const startSample = Math.max(0, Math.floor(syl.start * sampleRate));
      const endSample = Math.min(pcmFloat32.length, Math.floor(syl.end * sampleRate));
      const syllablePcm = pcmFloat32.slice(startSample, endSample);
      const syllablePitch = syllablePcm.length > 0
        ? PitchTracker.extractF0(syllablePcm, sampleRate)
        : { f0: [], voiced: [], voicedRatio: 0 };
      return { syl, syllablePcm, syllablePitch };
    });

    const alignedVoicedHz = [];
    let totalAlignedFrames = 0;
    for (const item of perSyllableAudio) {
      totalAlignedFrames += item.syllablePitch.f0.length;
      for (const hz of item.syllablePitch.f0) {
        if (hz > 0) alignedVoicedHz.push(hz);
      }
    }

    let userMedianHz = 0;
    let voicedRatio = totalAlignedFrames > 0
      ? Math.round((alignedVoicedHz.length / totalAlignedFrames) * 1000) / 1000
      : 0;
    if (alignedVoicedHz.length >= 3) {
      alignedVoicedHz.sort((a, b) => a - b);
      const mid = Math.floor(alignedVoicedHz.length / 2);
      userMedianHz = alignedVoicedHz.length % 2 === 1
        ? alignedVoicedHz[mid]
        : (alignedVoicedHz[mid - 1] + alignedVoicedHz[mid]) / 2;
      userMedianHz = Math.round(userMedianHz * 10) / 10;
    } else {
      const overallPitch = PitchTracker.extractF0(pcmFloat32, sampleRate);
      userMedianHz = overallPitch.medianHz;
      voicedRatio = overallPitch.voicedRatio;
    }

    // Step 3: Per-syllable contour normalization & unified context-aware tone grading
    const processedSyllables = perSyllableAudio.map(({ syl, syllablePcm, syllablePitch }, i) => {
      let userNormContour = null;
      if (syllablePitch.f0.length > 0 && userMedianHz > 0) {
        const { semitones } = PitchTracker.normalizeToSemitones(syllablePitch.f0, userMedianHz);
        userNormContour = PitchTracker.resampleContour(semitones, 30);
      }

      const targetTone = syl.expectedTone ?? syl.tone ?? 1;

      // Grab matching reference contour from precalculated tone_profiles*.json
      let refContour = null;
      if (referenceProfile?.syllables?.[i]?.f0_norm && referenceProfile.syllables[i].f0_norm.length >= 2) {
        refContour = PitchTracker.resampleContour(referenceProfile.syllables[i].f0_norm, 30);
      } else if (referenceProfile && referenceProfile.f0_norm && referenceProfile.f0_norm.length >= 2) {
        const fullRef = referenceProfile.f0_norm;
        const ptsPerSyl = Math.floor(fullRef.length / alignedSyllables.length);
        const sliceStart = i * ptsPerSyl;
        const sliceEnd = i === alignedSyllables.length - 1 ? fullRef.length : (i + 1) * ptsPerSyl;
        const sylSlice = fullRef.slice(sliceStart, sliceEnd);
        refContour = PitchTracker.resampleContour(sylSlice, 30);
      }
      if (!refContour || refContour.length < 2) {
        refContour = DTWComparator.getCanonicalContour(targetTone, 30);
      }

      // Context-Aware Tone Classifier + Permissive Corridor DTW
      const {
        toneScore,
        toneTier,
        evalResult,
        dtwResult,
        effectiveDtwScore,
        registerShiftSt,
      } = scoreSyllableTone(userNormContour, refContour, syl);

      // Phonetic Triad: Pinyin linguistic decomposition
      const rawSylPinyin = syl.syllable || syl.pinyin || (pinyin ? pinyin.trim().split(/\s+/)[i] : "") || "";
      const sylDecomp = PinyinUtils.decompose(rawSylPinyin);

      // Phonetic Triad: Initial Consonant Evaluation (VOT & Fricative CoG)
      const initialResult = InitialEvaluator.evaluate(syllablePcm, sampleRate, sylDecomp, syllablePitch.f0);

      // Phonetic Triad: Final Vowel Evaluation (10kHz downsampling & LPC Formants)
      const finalResult = FormantTracker.evaluate(
        syllablePcm,
        sampleRate,
        sylDecomp.vowelTarget,
        sylDecomp.initial,
        syllablePitch.f0
      );

      // Weighted Composite Syllable Score: 50% Tone + 30% Final Vowel + 20% Initial Consonant
      const compositeScore = userNormContour
        ? Math.round(0.50 * toneScore + 0.30 * finalResult.score + 0.20 * initialResult.score)
        : 35;

      const { coachingPriority: sylPriority, coachingAdvice: sylAdvice } = computeSyllableCoaching(
        toneScore,
        evalResult,
        finalResult,
        initialResult,
        targetTone
      );

      const toneResultObj = {
        tone: targetTone,
        citationTone: syl.citationTone ?? targetTone,
        expectedTone: targetTone,
        sandhiRule: syl.sandhiRule ?? null,
        score: toneScore,
        dtwScore: effectiveDtwScore,
        slopeScore: evalResult.score,
        sublabel: evalResult.comment || "✓ Exact",
        status: evalResult.status,
        diagnosticCode: evalResult.diagnosticCode,
        tier: toneTier,
        advice: evalResult.advice || "",
      };

      return {
        syllable: syl.syllable,
        tone: targetTone,
        citationTone: syl.citationTone ?? targetTone,
        expectedTone: targetTone,
        sandhiRule: syl.sandhiRule ?? null,
        syllableIndex: syl.syllableIndex ?? i,
        totalSyllables: syl.totalSyllables ?? alignedSyllables.length,
        position: syl.position || (alignedSyllables.length === 1 ? "single" : (i === 0 ? "initial" : (i === alignedSyllables.length - 1 ? "final" : "medial"))),
        timeRange: [syl.start, syl.end],
        confidence: syl.confidence,
        userF0Raw: syllablePitch.f0,
        userF0Norm: userNormContour, // 30-point normalized semitone array (null if unvoiced)
        referenceF0Norm: refContour, // 30-point native reference array
        registerShiftSt,
        dtwDistance: dtwResult.distance,
        dtwScore: effectiveDtwScore,
        slopeScore: evalResult.score,
        finalScore: compositeScore, // Triad composite score
        toneScore: toneScore,
        detectedTone: evalResult.detectedTone,
        isAccurate: evalResult.isAccurate,
        status: evalResult.status,
        comment: evalResult.comment,
        diagnosticCode: evalResult.diagnosticCode,
        advice: evalResult.advice,
        metrics: evalResult.metrics,
        dtwPath: dtwResult.path,
        // Phonetic Triad Structured Outputs
        initial: initialResult,
        toneResult: toneResultObj,
        final: finalResult,
        overallScore: compositeScore,
        coachingPriority: sylPriority,
        coachingAdvice: sylAdvice,
        decomposition: sylDecomp,
      };
    });

    const overallScore = processedSyllables.length > 0
      ? Math.round(processedSyllables.reduce((acc, s) => acc + s.finalScore, 0) / processedSyllables.length)
      : 0;

    // Utterance-level "One Critical Fix" selection across all syllables
    const { coachingPriority: utterancePriority, coachingAdvice: primaryAdvice } = computeUtterancePriority(processedSyllables);

    return {
      word,
      pinyin,
      duration,
      sampleRate,
      userAudioBlob: audioBlob,
      userPcm: pcmFloat32,
      userMedianHz,
      voicedRatio,
      overallScore,
      coachingPriority: utterancePriority,
      coachingAdvice: primaryAdvice,
      syllables: processedSyllables,
    };
  }

  destroy() {
    this.recorder._cleanupStream();
    this.aligner.destroy();
    this.isInitialized = false;
  }
}
