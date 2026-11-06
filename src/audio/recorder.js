/**
 * recorder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 3: Client-Side Audio Capture (16kHz Mono Float32 PCM)
 *
 * Captures microphone audio using Web Audio API, resamples/converts to 16kHz
 * mono Float32Array PCM suitable for Sherpa-ONNX WASM and YIN pitch extraction.
 *
 * Uses AudioWorkletNode with fallback to ScriptProcessorNode.
 * AudioWorklet processor code is inlined as a Blob URL for zero-friction Vite builds.
 */

const TARGET_SAMPLE_RATE = 16000;

export class AudioRecorder {
  constructor(options = {}) {
    this.targetSampleRate = options.sampleRate || TARGET_SAMPLE_RATE;
    this.onVolumeChange = options.onVolumeChange || null; // (rms: number) => void
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.workletNode = null;
    this.scriptNode = null;
    this.pcmChunks = [];
    this.isRecording = false;
    this.startTime = 0;
  }

  /**
   * Request microphone permission and prepare AudioContext.
   */
  async init() {
    if (this.audioContext && this.audioContext.state !== "closed") {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    this.audioContext = new AudioContextClass();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Start recording from the microphone.
   */
  async start() {
    await this.init();

    if (this.isRecording) {
      console.warn("[AudioRecorder] Already recording.");
      return;
    }

    this.pcmChunks = [];
    this.isRecording = true;
    this.startTime = performance.now();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Attempt to load AudioWorklet; fallback to ScriptProcessor if unavailable
      let workletReady = false;
      if (this.audioContext.audioWorklet) {
        try {
          const workletCode = `
            class RecorderProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input[0]) {
                  this.port.postMessage(input[0]);
                }
                return true;
              }
            }
            registerProcessor('recorder-processor', RecorderProcessor);
          `;
          const blob = new Blob([workletCode], { type: "application/javascript" });
          const workletUrl = URL.createObjectURL(blob);
          await this.audioContext.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          this.workletNode = new AudioWorkletNode(this.audioContext, "recorder-processor");
          this.workletNode.port.onmessage = (event) => {
            if (!this.isRecording) return;
            this._handleAudioChunk(event.data);
          };

          this.sourceNode.connect(this.workletNode);
          workletReady = true;
        } catch (workletErr) {
          console.warn("[AudioRecorder] AudioWorklet failed, using ScriptProcessor fallback:", workletErr);
          workletReady = false;
        }
      }

      if (!workletReady) {
        // Fallback: ScriptProcessorNode
        const bufferSize = 4096;
        this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        this.scriptNode.onaudioprocess = (event) => {
          if (!this.isRecording) return;
          const channelData = event.inputBuffer.getChannelData(0);
          this._handleAudioChunk(channelData);
        };
        this.sourceNode.connect(this.scriptNode);
        this.scriptNode.connect(this.audioContext.destination);
      }
    } catch (err) {
      this.isRecording = false;
      this._cleanupStream();
      throw new Error(`Microphone access denied or error: ${err.message}`);
    }
  }

  _handleAudioChunk(inputFloat32) {
    // Copy chunk
    const copy = new Float32Array(inputFloat32);
    this.pcmChunks.push(copy);

    if (this.onVolumeChange) {
      let sumSq = 0;
      for (let i = 0; i < copy.length; i++) {
        sumSq += copy[i] * copy[i];
      }
      const rms = Math.sqrt(sumSq / copy.length);
      this.onVolumeChange(rms);
    }
  }

  /**
   * Stop recording and return resampled 16kHz Float32 PCM buffer and playback audio blob.
   * @returns {Promise<{ pcmFloat32: Float32Array, sampleRate: number, duration: number, audioBlob: Blob }>}
   */
  async stop() {
    if (!this.isRecording) {
      return null;
    }

    this.isRecording = false;
    const duration = (performance.now() - this.startTime) / 1000;

    // Disconnect and clean up stream
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this._cleanupStream();

    // Flatten chunks
    const totalSamples = this.pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const nativePcm = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      nativePcm.set(chunk, offset);
      offset += chunk.length;
    }
    this.pcmChunks = [];

    const nativeSampleRate = this.audioContext.sampleRate;

    // Resample to targetSampleRate (16000 Hz) if needed
    let resampledPcm = nativePcm;
    if (nativeSampleRate !== this.targetSampleRate && nativePcm.length > 0) {
      resampledPcm = this._resampleLinear(nativePcm, nativeSampleRate, this.targetSampleRate);
    }

    // Create a playable WAV Blob from the resampled 16kHz PCM
    const wavBlob = this._encodeWav(resampledPcm, this.targetSampleRate);

    return {
      pcmFloat32: resampledPcm,
      sampleRate: this.targetSampleRate,
      duration,
      audioBlob: wavBlob,
    };
  }

  _cleanupStream() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * High-quality linear resampling between sample rates.
   */
  _resampleLinear(input, inRate, outRate) {
    if (inRate === outRate) return input;
    const ratio = inRate / outRate;
    const newLen = Math.round(input.length / ratio);
    const output = new Float32Array(newLen);

    for (let i = 0; i < newLen; i++) {
      const srcPos = i * ratio;
      const lo = Math.floor(srcPos);
      const hi = Math.min(lo + 1, input.length - 1);
      const frac = srcPos - lo;
      output[i] = input[lo] * (1 - frac) + input[hi] * frac;
    }
    return output;
  }

  /**
   * Encode 16-bit PCM WAV Blob from Float32Array.
   */
  _encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");

    // fmt sub-chunk
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);  // NumChannels (1 = mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true);  // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    // Write 16-bit PCM samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      index += 2;
    }

    return new Blob([view], { type: "audio/wav" });
  }
}
