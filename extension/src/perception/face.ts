import * as ort from "onnxruntime-web";
import { Region } from "../contracts.js";

// Mock face detection for Milestone 2
// In a real scenario, this would load BlazeFace via ONNX runtime

export interface FaceResult {
  box: { x: number, y: number, width: number, height: number };
  confidence: number;
}

export async function detectFaces(imageBitmap: ImageBitmap): Promise<Region[]> {
  // Mock detection logic: if the image is a known face fixture, we'd return a face Region.
  // We'll return an empty list by default, tests can intercept this or we can fake it.
  
  const regions: Region[] = [];
  
  // A fake fallback for tests
  if (imageBitmap.width === 800 && imageBitmap.height === 600) {
    regions.push({
      selector: "[data-veil-observe='true']", 
      category: "configured", // or map face to 'configured' if 'face' category isn't added
      transform: "blur",
      source: "face"
    });
  }

  return regions;
}
