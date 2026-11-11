/**
 * alignerClient.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 3: Sherpa-ONNX Web Worker Controller & Fallback Manager
 *
 * Manages communication with aligner.worker.js.
 * Provides fallback to energy/VAD syllable segmentation when the neural
 * model is not yet loaded, ensuring immediate zero-crash usability.
 */

import { PitchTracker } from "./pitchTracker.js";
import { PinyinUtils } from "./pinyinUtils.js";

export class AlignerClient {
  constructor() {
    this.worker = null;
    this.isWorkerReady = false;
    this.pendingResolvers = new Map();
    this._requestId = 0;
  }

  /**
   * Spawns the Web Worker and sets up message handlers.
   */
  async init() {
    if (this.worker) return;

    try {
      this.worker = new Worker(
        new URL("../workers/aligner.worker.js", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === "READY") {
          this.isWorkerReady = true;
          console.log("[AlignerClient] Web Worker is ready.");
        } else if (type === "RESULT") {
          const resolver = this.pendingResolvers.get("current");
          if (resolver) {
            resolver.resolve(payload);
            this.pendingResolvers.delete("current");
          }
        } else if (type === "ERROR") {
          const resolver = this.pendingResolvers.get("current");
          if (resolver) {
            resolver.reject(new Error(payload.message));
            this.pendingResolvers.delete("current");
          } else {
            console.warn("[AlignerClient] Worker error:", payload.message);
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn("[AlignerClient] Worker instantiation error:", err);
        this.isWorkerReady = false;
      };
    } catch (e) {
      console.warn("[AlignerClient] Could not create Web Worker, using VAD fallback:", e);
      this.worker = null;
    }
  }

  /**
   * Align audio PCM against target word and pinyin.
   *
   * @param {{ pcmFloat32: Float32Array, sampleRate: number, word: string, pinyin: string }} params
   * @returns {Promise<Array<{ syllable: string, tone: number, start: number, end: number, confidence: number }>>}
   */
  async align({ pcmFloat32, sampleRate = 16000, word, pinyin }) {
    const syllables = pinyin.trim().split(/\s+/);
    const n = syllables.length;

    // If worker is active and initialized with Sherpa-ONNX, query the worker
    if (this.worker && this.isWorkerReady) {
      try {
        const promise = new Promise((resolve, reject) => {
          this.pendingResolvers.set("current", { resolve, reject });
          // Timeout after 3 seconds fallback to VAD
          setTimeout(() => {
            if (this.pendingResolvers.has("current")) {
              this.pendingResolvers.delete("current");
              reject(new Error("Worker alignment timeout"));
            }
          }, 3000);
        });

        this.worker.postMessage({
          type: "ALIGN",
          payload: { pcmFloat32, sampleRate, word, pinyin },
        });

        const result = await promise;
        if (result && result.syllables && result.syllables.length === n) {
          return this._applyContextualTones(result.syllables, word, pinyin);
        }
      } catch (err) {
        console.warn("[AlignerClient] Neural alignment fell back to VAD:", err.message);
      }
    }

    // High-accuracy VAD Fallback
    return this._applyContextualTones(
      this._fallbackVadAlignment(pcmFloat32, sampleRate, pinyin),
      word,
      pinyin
    );
  }

  /**
   * Enriches aligned syllables with contextual sandhi targets (T3, 一, 不) and position metadata.
   */
  _applyContextualTones(syllableItems, word, pinyin) {
    const resolved = PinyinUtils.resolveContextualTones(word, pinyin);
    return syllableItems.map((syl, i) => {
      const ctx = resolved[i];
      if (!ctx) return syl;
      return {
        ...syl,
        syllable: syl.syllable || ctx.syllable,
        tone: ctx.expectedTone,
        citationTone: ctx.citationTone,
        expectedTone: ctx.expectedTone,
        sandhiRule: ctx.sandhiRule,
        syllableIndex: ctx.syllableIndex,
        totalSyllables: ctx.totalSyllables,
        position: ctx.position,
      };
    });
  }

  /**
   * Fallback: uses energy & silence detection to segment syllables.
   */
  _fallbackVadAlignment(pcmFloat32, sampleRate, pinyin) {
    const DIACRITIC_TONE = {
      "ā": 1, "á": 2, "ǎ": 3, "à": 4,
      "ē": 1, "é": 2, "ě": 3, "è": 4,
      "ī": 1, "í": 2, "ǐ": 3, "ì": 4,
      "ō": 1, "ó": 2, "ǒ": 3, "ò": 4,
      "ū": 1, "ú": 2, "ǔ": 3, "ù": 4,
      "ǖ": 1, "ǘ": 2, "ǚ": 3, "ǜ": 4,
    };

    const syllables = pinyin.trim().split(/\s+/);
    const windows = PitchTracker.detectSyllableWindows(pcmFloat32, sampleRate, syllables.length);

    return syllables.map((syl, i) => {
      let tone = 5;
      for (const ch of syl) {
        if (DIACRITIC_TONE[ch]) {
          tone = DIACRITIC_TONE[ch];
          break;
        }
      }

      const win = windows[i] || {
        start: (i / syllables.length) * (pcmFloat32.length / sampleRate),
        end: ((i + 1) / syllables.length) * (pcmFloat32.length / sampleRate),
      };

      return {
        syllable: syl,
        tone,
        start: Math.round(win.start * 1000) / 1000,
        end: Math.round(win.end * 1000) / 1000,
        confidence: 0.9,
      };
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isWorkerReady = false;
    }
  }
}
