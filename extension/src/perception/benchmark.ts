import * as ort from "onnxruntime-web";

export interface BenchmarkResult {
  coldStartMs: number;
  warmInferenceMs: number;
  peakMemoryBytes: number;
  runtime: string;
}

export async function runBenchmark(modelUrl: string, inputs: Record<string, ort.Tensor>): Promise<BenchmarkResult> {
  const result: BenchmarkResult = {
    coldStartMs: 0,
    warmInferenceMs: 0,
    peakMemoryBytes: 0,
    runtime: "wasm",
  };

  // Note: performance.memory is Chrome specific, but useful for approximations
  const startMemory = (performance as any)?.memory?.usedJSHeapSize ?? 0;

  // Cold Start
  const coldStartBegin = performance.now();
  let session: ort.InferenceSession;
  try {
    session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['webgpu', 'wasm'] });
    result.runtime = "webgpu";
  } catch (err) {
    console.warn("WebGPU failed, falling back to wasm");
    session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  }
  const coldStartEnd = performance.now();
  result.coldStartMs = coldStartEnd - coldStartBegin;

  // Warmup run
  await session.run(inputs);

  // Warm Inference
  const warmStart = performance.now();
  for (let i = 0; i < 5; i++) {
    await session.run(inputs);
  }
  const warmEnd = performance.now();
  result.warmInferenceMs = (warmEnd - warmStart) / 5;

  const endMemory = (performance as any)?.memory?.usedJSHeapSize ?? 0;
  result.peakMemoryBytes = Math.max(0, endMemory - startMemory);

  return result;
}
