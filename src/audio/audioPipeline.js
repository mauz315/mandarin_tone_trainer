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
import { ToneClassifier } from "./toneClassifier.js";
import { PinyinUtils } from "./pinyinUtils.js";
import { InitialEvaluator } from "./initialEvaluator.js";
import { FormantTracker } from "./formantTracker.js";

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

    // Step 1: Overall utterance pitch extraction
    const overallPitch = PitchTracker.extractF0(pcmFloat32, sampleRate);
    const userMedianHz = overallPitch.medianHz;

    // Step 2: Temporal syllable alignment (Sherpa-ONNX Worker or VAD)
    const alignedSyllables = await this.aligner.align({
      pcmFloat32,
      sampleRate,
      word,
      pinyin,
    });

    // Step 3: Per-syllable pitch extraction & normalization
    const processedSyllables = alignedSyllables.map((syl, i) => {
      const startSample = Math.max(0, Math.floor(syl.start * sampleRate));
      const endSample = Math.min(pcmFloat32.length, Math.floor(syl.end * sampleRate));
      const syllablePcm = pcmFloat32.slice(startSample, endSample);

      let syllablePitch = { f0: [], voiced: [] };
      let userNormContour = null;

      if (syllablePcm.length > 0) {
        syllablePitch = PitchTracker.extractF0(syllablePcm, sampleRate);
        const { semitones } = PitchTracker.normalizeToSemitones(syllablePitch.f0, userMedianHz);
        userNormContour = PitchTracker.resampleContour(semitones, 30);
      }

      // Grab matching reference contour from precalculated tone_profiles.json
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
        refContour = DTWComparator.getCanonicalContour(syl.tone, 30);
      }

      // Phase 4: DTW Trajectory Matching & Directional Slope Classification (Tone)
      const dtwResult = DTWComparator.compare(userNormContour, refContour);
      const evalResult = ToneClassifier.evaluate(userNormContour, syl.tone, syl.syllable);
      const toneScore = userNormContour
        ? Math.round(0.60 * dtwResult.score + 0.40 * evalResult.score)
        : 35;
      const toneTier = toneScore >= 85 ? "EMERALD" : (toneScore >= 65 ? "AMBER" : "ROSE");

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

      // The "One Critical Fix" Feedback Hierarchy per syllable: Tone (<65%) -> Final (<65%) -> Initial (<65%)
      let sylPriority = "PERFECT";
      let sylAdvice = "Excellent pronunciation! All phonemic targets verified.";

      if (toneScore < 65) {
        sylPriority = "TONE";
        sylAdvice = evalResult.advice || `Tone ${syl.tone} pitch contour collapsed. Adjust your pitch direction.`;
      } else if (finalResult.score < 65) {
        sylPriority = "FINAL";
        sylAdvice = finalResult.advice || `Vowel resonance muffled. Adjust your mouth opening.`;
      } else if (initialResult.score < 65) {
        sylPriority = "INITIAL";
        sylAdvice = initialResult.advice || `Consonant burst timing off. Adjust your breath puff.`;
      } else if (toneScore < 85) {
        sylPriority = "TONE";
        sylAdvice = evalResult.advice || `Good tone contour. Polish your pitch stability.`;
      } else if (finalResult.score < 85) {
        sylPriority = "FINAL";
        sylAdvice = finalResult.advice || `Almost clear vowel. Fine-tune your lip and jaw position.`;
      } else if (initialResult.score < 85) {
        sylPriority = "INITIAL";
        sylAdvice = initialResult.advice || `Good consonant attack. Keep the release crisp.`;
      }

      const toneResultObj = {
        tone: syl.tone,
        score: toneScore,
        dtwScore: dtwResult.score,
        slopeScore: evalResult.score,
        sublabel: evalResult.comment || "✓ Exact",
        status: evalResult.status,
        diagnosticCode: evalResult.diagnosticCode,
        tier: toneTier,
        advice: evalResult.advice || "",
      };

      return {
        syllable: syl.syllable,
        tone: syl.tone,
        timeRange: [syl.start, syl.end],
        confidence: syl.confidence,
        userF0Raw: syllablePitch.f0,
        userF0Norm: userNormContour, // 30-point normalized semitone array (null if unvoiced)
        referenceF0Norm: refContour, // 30-point native reference array
        dtwDistance: dtwResult.distance,
        dtwScore: dtwResult.score,
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
    let utterancePriority = "PERFECT";
    let primaryAdvice = "Outstanding pronunciation! All phonemic targets verified.";

    // 1. Any critical Tone failure (<65%) across all syllables
    const criticalToneSyl = processedSyllables.find(s => s.toneScore < 65);
    if (criticalToneSyl) {
      utterancePriority = "TONE";
      primaryAdvice = criticalToneSyl.advice || criticalToneSyl.coachingAdvice;
    } else {
      // 2. Any critical Final failure (<65%)
      const criticalFinalSyl = processedSyllables.find(s => s.final?.score < 65);
      if (criticalFinalSyl) {
        utterancePriority = "FINAL";
        primaryAdvice = criticalFinalSyl.final?.advice || criticalFinalSyl.coachingAdvice;
      } else {
        // 3. Any critical Initial failure (<65%)
        const criticalInitialSyl = processedSyllables.find(s => s.initial?.score < 65);
        if (criticalInitialSyl) {
          utterancePriority = "INITIAL";
          primaryAdvice = criticalInitialSyl.initial?.advice || criticalInitialSyl.coachingAdvice;
        } else {
          // 4. Amber polish tips (<85%)
          const amberSyl = processedSyllables.find(s => s.finalScore < 85 && s.coachingAdvice);
          if (amberSyl) {
            utterancePriority = amberSyl.coachingPriority;
            primaryAdvice = amberSyl.coachingAdvice;
          }
        }
      }
    }

    return {
      word,
      pinyin,
      duration,
      sampleRate,
      userAudioBlob: audioBlob,
      userPcm: pcmFloat32,
      userMedianHz,
      voicedRatio: overallPitch.voicedRatio,
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
