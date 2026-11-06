#!/usr/bin/env node
/**
 * download_model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloads the Sherpa-ONNX WASM runtime and Chinese Zipformer int8 model,
 * extracts only the required files, and places them in
 * public/models/sherpa-onnx/.
 *
 * Run from: mandarin_tone_trainer/
 *   node scripts/download_model.js
 *
 * Requirements: Node.js 18+ (uses built-in fetch + stream APIs).
 */

import { createWriteStream, existsSync, mkdirSync, createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { createGunzip, createBrotliDecompress } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────────
const OUTPUT_DIR = join(__dirname, "..", "public", "models", "sherpa-onnx");

const DOWNLOADS = [
  {
    name: "Sherpa-ONNX WASM Runtime",
    url: "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.11.3/sherpa-onnx-wasm-asr-v1.11.3.tar.bz2",
    tarball: "/tmp/sherpa-onnx-wasm.tar.bz2",
    extract: "/tmp/sherpa-onnx-wasm-extracted/",
    files: [
      { src: "sherpa-onnx.js",   dest: "sherpa-onnx.js"   },
      { src: "sherpa-onnx.wasm", dest: "sherpa-onnx.wasm" },
    ],
  },
  {
    name: "Zipformer Bilingual ZH-EN int8 Model",
    url: "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20.tar.bz2",
    tarball: "/tmp/sherpa-onnx-model.tar.bz2",
    extract: "/tmp/sherpa-onnx-model-extracted/",
    files: [
      { src: "encoder.int8.onnx", dest: "encoder.int8.onnx" },
      { src: "decoder.onnx",      dest: "decoder.onnx"      },
      { src: "joiner.int8.onnx",  dest: "joiner.int8.onnx"  },
      { src: "tokens.txt",        dest: "tokens.txt"         },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function downloadFile(url, destPath) {
  console.log(`  ⬇  Downloading → ${destPath}`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);

  const total = parseInt(response.headers.get("content-length") || "0", 10);
  let downloaded = 0;
  const fileStream = createWriteStream(destPath);
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(Buffer.from(value));
    downloaded += value.length;
    if (total > 0) {
      const pct = ((downloaded / total) * 100).toFixed(0);
      process.stdout.write(`\r     ${pct}% (${(downloaded / 1_000_000).toFixed(1)} MB / ${(total / 1_000_000).toFixed(1)} MB)   `);
    }
  }
  await new Promise((res, rej) => fileStream.end((err) => (err ? rej(err) : res())));
  process.stdout.write("\n");
}

async function extractTarball(tarPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  console.log(`  📦 Extracting → ${outDir}`);
  await execAsync(`tar -xjf "${tarPath}" -C "${outDir}" --strip-components=1`);
}

async function copyFile(src, dest) {
  if (!existsSync(src)) throw new Error(`File not found after extraction: ${src}`);
  await execAsync(`cp "${src}" "${dest}"`);
  const { stdout } = await execAsync(`wc -c < "${dest}"`);
  const bytes = parseInt(stdout.trim(), 10);
  console.log(`  ✓  ${dest.split("/").pop()} (${(bytes / 1_000_000).toFixed(1)} MB)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`\nSherpa-ONNX Model Downloader`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  for (const pkg of DOWNLOADS) {
    // Skip if all target files already exist
    const allExist = pkg.files.every((f) => existsSync(join(OUTPUT_DIR, f.dest)));
    if (allExist) {
      console.log(`✅ [SKIP] ${pkg.name} — all files already present.\n`);
      continue;
    }

    console.log(`\n── ${pkg.name} ──`);

    if (!existsSync(pkg.tarball)) {
      await downloadFile(pkg.url, pkg.tarball);
    } else {
      console.log(`  ⏭  Tarball already downloaded: ${pkg.tarball}`);
    }

    await extractTarball(pkg.tarball, pkg.extract);

    for (const { src, dest } of pkg.files) {
      // Try to find the file (may be nested in extracted dir)
      const { stdout } = await execAsync(
        `find "${pkg.extract}" -name "${src}" | head -1`
      );
      const srcPath = stdout.trim();
      if (!srcPath) throw new Error(`Could not find ${src} in ${pkg.extract}`);
      await copyFile(srcPath, join(OUTPUT_DIR, dest));
    }

    // Clean up tarball and extracted dir to save disk space
    await execAsync(`rm -rf "${pkg.tarball}" "${pkg.extract}"`);
    console.log(`  🧹 Cleaned up temporary files.`);
  }

  console.log(`\n✅ All Sherpa-ONNX model assets ready in:\n   ${OUTPUT_DIR}\n`);
  console.log(`Next: run "npm run dev" or "npm run build" to continue.\n`);
})().catch((err) => {
  console.error("\n❌ Download failed:", err.message);
  process.exit(1);
});
