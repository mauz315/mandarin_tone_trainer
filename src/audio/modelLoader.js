/**
 * modelLoader.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Step 2: Sherpa-ONNX WASM Model Loader
 *
 * Downloads the Sherpa-ONNX WASM runtime + model assets on first run,
 * stores them in the browser's Cache API, and returns cached copies on
 * subsequent loads. This keeps the initial experience snappy: the user
 * downloads the ~65-80 MB model ONCE and never again.
 *
 * Assets staged in: public/models/sherpa-onnx/
 *   ├── sherpa-onnx.js          (~120 KB)  Emscripten glue / JS API
 *   ├── sherpa-onnx.wasm        (~14-16 MB) ONNX Runtime + Sherpa engine
 *   ├── encoder.int8.onnx       (~50-80 MB) Zipformer encoder (int8 quantized)
 *   ├── decoder.onnx            (~12-14 MB) Transducer decoder
 *   ├── joiner.int8.onnx        (~2-3 MB)   Transducer joiner (int8 quantized)
 *   └── tokens.txt              (~40 KB)    Chinese character token vocab
 *
 * Usage:
 *   import { loadModel, getModelStatus } from './audio/modelLoader.js';
 *   const model = await loadModel({ onProgress: (pct) => console.log(pct) });
 */

const CACHE_NAME = "mtt-sherpa-onnx-v1";
const BASE_URL = import.meta.env.BASE_URL;
const MODEL_DIR = `${BASE_URL}models/sherpa-onnx/`;

/**
 * All assets that must be fetched and cached.
 * Total: ~65-96 MB compressed (gzip) over the wire; cached raw in Cache API.
 */
const MODEL_ASSETS = [
  { file: "sherpa-onnx.js",       label: "Runtime JS",          critical: true  },
  { file: "sherpa-onnx.wasm",     label: "WASM Engine",         critical: true  },
  { file: "encoder.int8.onnx",    label: "Encoder (int8)",      critical: true  },
  { file: "decoder.onnx",         label: "Decoder",             critical: true  },
  { file: "joiner.int8.onnx",     label: "Joiner (int8)",       critical: true  },
  { file: "tokens.txt",           label: "Token Vocabulary",    critical: true  },
];

/** Singleton state so we don't double-load within a session */
let _modelReady = false;
let _loadPromise = null;

/**
 * Returns a simple status object for displaying in the UI before load.
 * @returns {{ ready: boolean, cached: boolean }}
 */
export async function getModelStatus() {
  if (_modelReady) return { ready: true, cached: true };
  if (!("caches" in window)) return { ready: false, cached: false };

  const cache = await caches.open(CACHE_NAME);
  const firstUrl = `${MODEL_DIR}${MODEL_ASSETS[0].file}`;
  const hit = await cache.match(firstUrl);
  return { ready: false, cached: !!hit };
}

/**
 * Loads the Sherpa-ONNX model. Fetches assets on first run, then uses
 * cached copies. Reports download progress via onProgress callback.
 *
 * @param {{ onProgress?: (percent: number, label: string) => void,
 *           onPhase?: (phase: string) => void }} options
 * @returns {Promise<{ Module: object, modelConfig: object }>}
 */
export async function loadModel({ onProgress = null, onPhase = null } = {}) {
  if (_modelReady && _loadPromise) return _loadPromise;
  if (_loadPromise) return _loadPromise;

  _loadPromise = _doLoad({ onProgress, onPhase });
  return _loadPromise;
}

async function _doLoad({ onProgress, onPhase }) {
  const phase = (msg) => onPhase && onPhase(msg);
  const progress = (pct, label) => onProgress && onProgress(pct, label);

  // ── Step 1: Check / populate Cache API ───────────────────────────────────
  if (!("caches" in window)) {
    console.warn("[ModelLoader] Cache API unavailable — will fetch each time.");
  }

  phase("Checking model cache…");
  const assetBuffers = await _fetchAllAssets({ progress });

  // ── Step 2: Instantiate Sherpa-ONNX WASM module ───────────────────────────
  phase("Initializing WASM engine…");
  progress(95, "WASM Engine");

  const jsBlob = new Blob([assetBuffers["sherpa-onnx.js"]], { type: "text/javascript" });
  const jsUrl = URL.createObjectURL(jsBlob);

  // Sherpa-ONNX needs the .wasm at a known URL — place it in a blob URL too
  const wasmBlob = new Blob([assetBuffers["sherpa-onnx.wasm"]], { type: "application/wasm" });
  const wasmUrl = URL.createObjectURL(wasmBlob);

  // Dynamic import of the Emscripten JS module
  const { default: createModule } = await import(/* @vite-ignore */ jsUrl);
  const Module = await createModule({
    locateFile: (name) => {
      if (name.endsWith(".wasm")) return wasmUrl;
      return name;
    },
  });

  // ── Step 3: Build model config for Sherpa-ONNX Recognizer ─────────────────
  phase("Building recognizer…");

  const toDataUrl = (buffer) => {
    const blob = new Blob([buffer]);
    return URL.createObjectURL(blob);
  };

  const modelConfig = {
    transducer: {
      encoder: toDataUrl(assetBuffers["encoder.int8.onnx"]),
      decoder: toDataUrl(assetBuffers["decoder.onnx"]),
      joiner:  toDataUrl(assetBuffers["joiner.int8.onnx"]),
    },
    tokens: toDataUrl(assetBuffers["tokens.txt"]),
    // Enable timestamp output from CTC/transducer decoding
    enableEndpoint: true,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20,
    decodingMethod: "greedy_search",
    maxActivePaths: 4,
    sampleRate: 16000,
    featureDim: 80,
  };

  _modelReady = true;
  progress(100, "Ready");
  phase("Model ready");

  console.log("[ModelLoader] Sherpa-ONNX model loaded successfully.");
  return { Module, modelConfig };
}

/**
 * Fetches all MODEL_ASSETS, using Cache API when available.
 * Returns a map of { filename: ArrayBuffer }.
 */
async function _fetchAllAssets({ progress }) {
  const cache = "caches" in window ? await caches.open(CACHE_NAME) : null;
  const buffers = {};
  const total = MODEL_ASSETS.length;

  for (let i = 0; i < total; i++) {
    const { file, label } = MODEL_ASSETS[i];
    const url = `${MODEL_DIR}${file}`;

    let response = cache ? await cache.match(url) : null;

    if (!response) {
      // Not cached — download and store
      progress(Math.round((i / total) * 90), `Downloading ${label}…`);
      response = await fetch(url);
      if (!response.ok) {
        throw new Error(`[ModelLoader] Failed to fetch ${file}: HTTP ${response.status}`);
      }
      // Store in cache (clone before consuming)
      if (cache) {
        try {
          await cache.put(url, response.clone());
        } catch (cacheErr) {
          console.warn(`[ModelLoader] Cache put failed for ${file}:`, cacheErr);
        }
      }
    } else {
      progress(Math.round((i / total) * 90), `Loading ${label} from cache…`);
    }

    buffers[file] = await response.arrayBuffer();
  }

  return buffers;
}

/**
 * Clears the cached model (useful for forcing re-downloads on updates).
 */
export async function clearModelCache() {
  if ("caches" in window) {
    await caches.delete(CACHE_NAME);
    _modelReady = false;
    _loadPromise = null;
    console.log("[ModelLoader] Model cache cleared.");
  }
}
