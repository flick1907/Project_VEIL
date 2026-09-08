import { Region } from "../contracts.js";

// Mock OCR for Milestone 2
// In a real scenario, this would load Tesseract.js or ONNX OCR models

export interface OcrResult {
  text: string;
  box: { x: number, y: number, width: number, height: number };
  confidence: number;
}

export async function detectText(imageBitmap: ImageBitmap): Promise<OcrResult[]> {
  // Mock logic
  return [];
}
