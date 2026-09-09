import fs from 'fs';
import path from 'path';
import https from 'https';

const MODELS_DIR = path.resolve('./assets/models');

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// We use UltraFace (RFB-320) which is a popular, lightweight BlazeFace-like ONNX model.
const FACE_MODEL_URL = "https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB/raw/master/models/onnx/version-RFB-320.onnx";
const FACE_MODEL_PATH = path.join(MODELS_DIR, 'face-detector.onnx');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`Model already exists: ${dest}`);
      return resolve();
    }
    console.log(`Downloading ${url} to ${dest}...`);
    
    // Handle redirects
    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    await download(FACE_MODEL_URL, FACE_MODEL_PATH);

    // Download Tesseract eng.traineddata.gz
    const TESS_DIR = path.join(MODELS_DIR, 'tesseract');
    if (!fs.existsSync(TESS_DIR)) fs.mkdirSync(TESS_DIR, { recursive: true });
    
    const TESS_LANG_URL = "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata.gz";
    const TESS_LANG_PATH = path.join(TESS_DIR, 'eng.traineddata.gz');
    await download(TESS_LANG_URL, TESS_LANG_PATH);

    // Copy WASM files from onnxruntime-web
    const ORT_WASM_DIR = path.resolve('./node_modules/onnxruntime-web/dist');
    const files = fs.readdirSync(ORT_WASM_DIR);
    const WASM_FILES = files.filter(f => f.startsWith('ort-wasm'));
    
    for (const file of WASM_FILES) {
      const src = path.join(ORT_WASM_DIR, file);
      const dest = path.join(MODELS_DIR, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        console.log(`Copying ${file} to assets/models...`);
        fs.copyFileSync(src, dest);
      }
    }

    // Copy Tesseract dependencies
    const TESS_WORKER_SRC = path.resolve('./node_modules/tesseract.js/dist/worker.min.js');
    const TESS_CORE_SRC = path.resolve('./node_modules/tesseract.js-core/tesseract-core.wasm.js');
    if (fs.existsSync(TESS_WORKER_SRC) && !fs.existsSync(path.join(TESS_DIR, 'worker.min.js'))) {
        console.log("Copying worker.min.js...");
        fs.copyFileSync(TESS_WORKER_SRC, path.join(TESS_DIR, 'worker.min.js'));
    }
    if (fs.existsSync(TESS_CORE_SRC) && !fs.existsSync(path.join(TESS_DIR, 'tesseract-core.wasm.js'))) {
        console.log("Copying tesseract-core.wasm.js...");
        fs.copyFileSync(TESS_CORE_SRC, path.join(TESS_DIR, 'tesseract-core.wasm.js'));
    }
    
    const TESS_WASM_SRC = path.resolve('./node_modules/tesseract.js-core/tesseract-core.wasm');
    if (fs.existsSync(TESS_WASM_SRC) && !fs.existsSync(path.join(TESS_DIR, 'tesseract-core.wasm'))) {
        console.log("Copying tesseract-core.wasm...");
        fs.copyFileSync(TESS_WASM_SRC, path.join(TESS_DIR, 'tesseract-core.wasm'));
    }
  } catch (err) {
    console.error("Failed to fetch models:", err);
    process.exit(1);
  }
}

main();
