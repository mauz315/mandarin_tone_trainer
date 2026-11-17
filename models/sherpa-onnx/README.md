# Sherpa-ONNX Model Assets

This directory hosts the Sherpa-ONNX WASM runtime and Chinese acoustic model for
the Mandarin Tone Trainer pronunciation practice feature.

## Why These Files Are Not Committed to Git

The model files are **large binary assets (65–96 MB total)** and are excluded from
the Git repository via `.gitignore`. They must be downloaded once using the
instructions below before running `npm run dev` or `npm run build`.

---

## Directory Structure (after download)

```
public/models/sherpa-onnx/
├── sherpa-onnx.js           ~120 KB   Emscripten JS glue / browser API
├── sherpa-onnx.wasm         ~14 MB    Compiled WASM engine (ONNX Runtime + Sherpa)
├── encoder.int8.onnx        ~50 MB    Zipformer encoder (int8 quantized)
├── decoder.onnx             ~13 MB    Transducer decoder
├── joiner.int8.onnx         ~2.5 MB   Transducer joiner (int8 quantized)
└── tokens.txt               ~40 KB    Chinese character token vocabulary
```

**Total download:** ~79 MB over the wire (gzip-compressed from GitHub releases).

---

## Download Instructions

### Option A — Automated (recommended)

Run the helper script from the workspace root directory:

```bash
node scripts/download_model.js
```

This script will:
1. Download the Sherpa-ONNX streaming WASM runtime from the official GitHub releases.
2. Download the `sherpa-onnx-streaming-zipformer-bilingual-zh-en` int8 model package.
3. Extract only the required files into `public/models/sherpa-onnx/`.
4. Verify SHA-256 checksums for all assets.

### Option B — Manual Download

#### 1. WASM Runtime (JS + WASM binary)

Download from the official Sherpa-ONNX GitHub releases:

```
https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.11.3/sherpa-onnx-wasm-asr-v1.11.3.tar.bz2
```

Extract and copy:
- `sherpa-onnx.js`   → `public/models/sherpa-onnx/`
- `sherpa-onnx.wasm` → `public/models/sherpa-onnx/`

#### 2. Chinese Acoustic Model (int8 quantized)

Download from GitHub ASR model releases:

```
https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20.tar.bz2
```

Extract and copy:
- `encoder.int8.onnx` → `public/models/sherpa-onnx/`
- `decoder.onnx`      → `public/models/sherpa-onnx/`
- `joiner.int8.onnx`  → `public/models/sherpa-onnx/`
- `tokens.txt`        → `public/models/sherpa-onnx/`

---

## Browser Caching Behavior

After the user loads the app for the first time, all model assets are automatically
stored in the browser's **Cache API** (key: `mtt-sherpa-onnx-v1`).

Subsequent page visits load the model from the local cache with **zero network
usage**. The model only re-downloads if:
- The cache is explicitly cleared (via `clearModelCache()` in `modelLoader.js`)
- The browser's storage quota is exceeded (rare)
- A new model version is deployed (cache key is bumped)

---

## Cross-Origin Isolation Headers (Required for SharedArrayBuffer)

If multi-threaded WASM is enabled in future builds, the web server must send:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

For GitHub Pages, add to `vite.config.js`:

```js
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}
```

For the single-threaded WASM build (current default), these headers are **not required**.

---

## Model Choice Rationale

| Model                                     | Size  | Languages      | WER (zh) | WASM Ready |
|:------------------------------------------|:-----:|:---------------|:--------:|:----------:|
| zipformer-bilingual-zh-en (int8)          | ~65MB | Mandarin + EN  | ~6%      | ✅          |
| zipformer-ctc-zh-int8 (2025)              | ~350MB| Mandarin only  | ~4%      | ⚠️ too large|
| paraformer-zh (int8)                      | ~220MB| Mandarin       | ~3.8%    | ⚠️ too large|

The **bilingual Zipformer int8** model is chosen for its optimal size-accuracy tradeoff
and confirmed WASM compatibility. Its CTC output naturally provides character-level
frame timestamps needed for forced alignment against the user's audio.
