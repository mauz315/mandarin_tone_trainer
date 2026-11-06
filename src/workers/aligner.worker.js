/**
 * aligner.worker.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Step 2: Sherpa-ONNX Alignment Web Worker
 *
 * Runs entirely off the main thread. Receives user audio as a Float32Array
 * plus the target word/pinyin, runs the Sherpa-ONNX streaming recognizer to
 * get CTC frame-level token timestamps, and returns character-level time
 * boundaries keyed to pinyin syllables.
 *
 * Message Protocol (postMessage from main → worker):
 *   { type: "INIT", payload: { Module, modelConfig } }
 *   { type: "ALIGN", payload: { pcmFloat32: Float32Array, sampleRate: number, word: string, pinyin: string } }
 *
 * Message Protocol (postMessage from worker → main):
 *   { type: "READY" }
 *   { type: "RESULT", payload: { syllables: Array<SyllableResult>, rawText: string } }
 *   { type: "ERROR",  payload: { message: string } }
 *
 * SyllableResult shape:
 *   { syllable: string, tone: number, start: number, end: number, confidence: number }
 */

let _recognizer = null;
let _Module = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "INIT":
      await handleInit(payload);
      break;
    case "ALIGN":
      await handleAlign(payload);
      break;
    default:
      self.postMessage({ type: "ERROR", payload: { message: `Unknown message type: ${type}` } });
  }
};

// ── INIT ──────────────────────────────────────────────────────────────────────
async function handleInit({ Module, modelConfig }) {
  try {
    _Module = Module;

    // Build streaming recognizer config
    const config = new Module.OnlineRecognizerConfig();
    config.modelConfig = new Module.OnlineModelConfig();

    // Transducer model paths (blob URLs passed from main thread)
    config.modelConfig.transducer.encoder = modelConfig.transducer.encoder;
    config.modelConfig.transducer.decoder = modelConfig.transducer.decoder;
    config.modelConfig.transducer.joiner  = modelConfig.transducer.joiner;
    config.modelConfig.tokens             = modelConfig.tokens;
    config.modelConfig.numThreads         = 1; // single-thread in Web Worker
    config.modelConfig.debug              = false;
    config.modelConfig.provider           = "cpu";

    config.decodingMethod     = modelConfig.decodingMethod || "greedy_search";
    config.maxActivePaths     = modelConfig.maxActivePaths || 4;
    config.enableEndpoint     = modelConfig.enableEndpoint ?? true;
    config.rule1MinTrailingSilence = modelConfig.rule1MinTrailingSilence ?? 2.4;
    config.rule2MinTrailingSilence = modelConfig.rule2MinTrailingSilence ?? 1.2;
    config.rule3MinUtteranceLength = modelConfig.rule3MinUtteranceLength ?? 20;

    _recognizer = new Module.OnlineRecognizer(config);

    self.postMessage({ type: "READY" });
    console.log("[Aligner Worker] Recognizer initialized.");
  } catch (err) {
    self.postMessage({ type: "ERROR", payload: { message: `INIT failed: ${err.message}` } });
  }
}

// ── ALIGN ─────────────────────────────────────────────────────────────────────
async function handleAlign({ pcmFloat32, sampleRate, word, pinyin }) {
  if (!_recognizer || !_Module) {
    self.postMessage({ type: "ERROR", payload: { message: "Recognizer not initialized. Send INIT first." } });
    return;
  }

  try {
    // Create a fresh stream for each utterance
    const stream = _recognizer.createStream();

    // Feed audio in one shot (forced alignment is offline / full utterance)
    stream.acceptWaveform({ sampleRate, samples: pcmFloat32 });

    // Signal end of audio
    const tailPaddingSeconds = 0.3;
    const silencePad = new Float32Array(Math.round(sampleRate * tailPaddingSeconds));
    stream.acceptWaveform({ sampleRate, samples: silencePad });

    // Decode until done
    while (_recognizer.isReady(stream)) {
      _recognizer.decode(stream);
    }

    const result = _recognizer.getResult(stream);

    // Extract raw recognized text and timestamps
    const rawText = result.text || "";
    const tokens  = result.tokens || [];      // Array of { token: string, timeMs: number }

    // Map CTC token timestamps → pinyin syllables
    const syllableResults = alignTokensToSyllables(tokens, pinyin, rawText);

    stream.free();

    self.postMessage({
      type: "RESULT",
      payload: { syllables: syllableResults, rawText },
    });
  } catch (err) {
    self.postMessage({ type: "ERROR", payload: { message: `ALIGN failed: ${err.message}` } });
  }
}

// ── Token → Syllable Mapper ───────────────────────────────────────────────────
/**
 * Maps the CTC token timeline to the known pinyin syllable sequence.
 * Since we know the target word (target-driven / forced alignment), we
 * distribute the recognized token timestamps across the syllable count.
 *
 * @param {Array<{token: string, timeMs: number}>} tokens
 * @param {string} pinyinStr  e.g. "nǐ hǎo"
 * @param {string} rawText    raw ASR output
 * @returns {Array<SyllableResult>}
 */
function alignTokensToSyllables(tokens, pinyinStr, rawText) {
  const DIACRITIC_TONE = {
    "ā": 1, "á": 2, "ǎ": 3, "à": 4,
    "ē": 1, "é": 2, "ě": 3, "è": 4,
    "ī": 1, "í": 2, "ǐ": 3, "ì": 4,
    "ō": 1, "ó": 2, "ǒ": 3, "ò": 4,
    "ū": 1, "ú": 2, "ǔ": 3, "ù": 4,
    "ǖ": 1, "ǘ": 2, "ǚ": 3, "ǜ": 4,
  };

  const syllables = pinyinStr.trim().split(/\s+/);
  const n = syllables.length;

  if (tokens.length === 0 || n === 0) {
    // Fallback: evenly spaced, no token data
    const totalMs = 1000;
    return syllables.map((syl, i) => ({
      syllable: syl,
      tone: getTone(syl, DIACRITIC_TONE),
      start: (i / n) * totalMs / 1000,
      end: ((i + 1) / n) * totalMs / 1000,
      confidence: 0,
    }));
  }

  // Distribute token timestamps across syllable count
  const chunkSize = Math.max(1, Math.floor(tokens.length / n));
  return syllables.map((syl, i) => {
    const lo = i * chunkSize;
    const hi = i === n - 1 ? tokens.length - 1 : Math.min((i + 1) * chunkSize - 1, tokens.length - 1);
    const startMs = tokens[lo]?.timeMs ?? 0;
    const endMs   = tokens[hi]?.timeMs ?? startMs + 200;
    return {
      syllable:   syl,
      tone:       getTone(syl, DIACRITIC_TONE),
      start:      startMs / 1000,
      end:        endMs / 1000,
      confidence: 1,
    };
  });
}

function getTone(syllable, map) {
  for (const ch of syllable) {
    if (map[ch]) return map[ch];
  }
  return 5;
}
