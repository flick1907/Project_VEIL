import { Region } from "../contracts.js";
import { createWorker } from "tesseract.js";

declare const chrome: any;

export interface OcrResult {
  text: string;
  box: { x: number, y: number, width: number, height: number };
  confidence: number;
}

export async function detectText(imageBitmap: ImageBitmap): Promise<OcrResult[]> {
  // Convert ImageBitmap to canvas for tesseract
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(imageBitmap, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");

  const worker = await createWorker('eng', 1, {
    workerPath: chrome.runtime.getURL("assets/models/tesseract/worker.min.js"),
    corePath: chrome.runtime.getURL("assets/models/tesseract/tesseract-core.wasm.js"),
    langPath: chrome.runtime.getURL("assets/models/tesseract"),
  });
  const ret = await worker.recognize(dataUrl);
  await worker.terminate();

  const results: OcrResult[] = [];
  if (ret && ret.data && ret.data.words) {
    for (const word of ret.data.words) {
      if (word.confidence > 10) {
        results.push({
          text: word.text,
          box: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          },
          confidence: word.confidence
        });
      }
    }
  }

  return results;
}
