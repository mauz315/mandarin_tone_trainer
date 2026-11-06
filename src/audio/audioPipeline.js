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
      if (referenceProfile && referenceProfile.f0_norm) {
        refContour = referenceProfile.f0_norm;
      }

      return {
        syllable: syl.syllable,
        tone: syl.tone,
        timeRange: [syl.start, syl.end],
        confidence: syl.confidence,
        userF0Raw: syllablePitch.f0,
        userF0Norm: userNormContour, // 30-point normalized semitone array (null if unvoiced)
        referenceF0Norm: refContour, // 30-point native reference array
      };
    });

    return {
      word,
      pinyin,
      duration,
      sampleRate,
      userAudioBlob: audioBlob,
      userPcm: pcmFloat32,
      userMedianHz,
      voicedRatio: overallPitch.voicedRatio,
      syllables: processedSyllables,
    };
  }

  destroy() {
    this.recorder._cleanupStream();
    this.aligner.destroy();
    this.isInitialized = false;
  }
}
