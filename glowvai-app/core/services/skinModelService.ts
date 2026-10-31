/**
 * GlowVAI — Skin Analysis Result & Optional On-Device Inference (web build)
 * ========================================================================
 * Shared scoring rules for the skin scan. Both inference paths return the
 * same SkinAnalysisResult shape, so the report screen does not care which
 * path produced it.
 *
 * Inference paths:
 *   1. Backend (default) — POST the image to the CNN backend (see
 *      features/scan/services/scanApi.ts). Used unless the switch below is on.
 *   2. On-device (opt-in) — onnxruntime-web runs skin_model.onnx in the
 *      browser. Off by default because the model is ~181 MB.
 *
 * Enable on-device inference:
 *   VITE_ENABLE_ON_DEVICE_INFERENCE=true
 *   VITE_SKIN_MODEL_URL=https://<host>/skin_model.onnx   (CORS-enabled URL)
 *
 * FAIL POLICY: if the model cannot load or returns invalid output, this
 * module throws. It never invents scores.
 */

import type { InferenceSession, Tensor } from 'onnxruntime-web';

// ─── Inference switch (off by default) ───────────────────────────────────────
export const ON_DEVICE_INFERENCE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_ON_DEVICE_INFERENCE === 'true';

const ORT_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

// ─── Label registries (single source of truth — must match Phase 5 dataset.py) ─

export const CONCERN_LABELS = [
  'oiliness',
  'dryness',
  'redness',
  'uneven_tone',
  'visible_blemishes',
] as const;

export const SKIN_TYPE_LABELS = [
  'oily',
  'dry',
  'combination',
  'normal',
] as const;

export type ConcernKey = (typeof CONCERN_LABELS)[number];
export type SkinTypeKey = (typeof SKIN_TYPE_LABELS)[number];

// ─── Model versioning ────────────────────────────────────────────────────────
export const MODEL_VERSION = 'skin_model_v1_2026';

// Minimum plausible file size for a real MobileNetV3-based ONNX export.
const MIN_MODEL_BYTES = 1_000_000; // 1 MB

// ─── Output types ────────────────────────────────────────────────────────────

/** Human-readable concern with all scoring fields needed by the report */
export interface ConcernScore {
  key: ConcernKey;
  label: string;
  score: number;        // probability 0–1 from the model
  severity: 'mild' | 'moderate' | 'pronounced';
  confidence: number;   // distance from 0.5 decision boundary, 0–1
  present: boolean;     // threshold: score > 0.5
}

/** Full result shape consumed by the scan report screen */
export interface SkinAnalysisResult {
  scanId: string;
  modelVersion: string;
  status: 'completed' | 'low_confidence' | 'failed';
  confidence: number;              // 0–1 overall
  skinProfile: {
    skinType: SkinTypeKey | 'uncertain';
    skinTypeConfidence: number;    // probability of predicted class
    skinTypeProbs: number[];       // [oily, dry, combo, normal]; empty when the backend does not return it
  };
  concerns: ConcernScore[];
  disclaimer: string;
  inferenceMethod: 'backend_cnn' | 'onnx_on_device';
  inferenceLatencyMs: number;
}

export const DISCLAIMER =
  'This is a cosmetic skin assessment only — not a medical diagnosis. ' +
  'Consult a dermatologist for medical concerns.';

// ─── Concern display labels (cosmetic, non-medical) ──────────────────────────
const CONCERN_DISPLAY: Record<ConcernKey, string> = {
  oiliness: 'Oiliness around the T-zone',
  dryness: 'Dryness or dehydration',
  redness: 'Visible redness',
  uneven_tone: 'Uneven-looking skin tone',
  visible_blemishes: 'Visible blemishes',
};

// ─── Model confidence threshold ──────────────────────────────────────────────
// Below this, skin type is reported as 'uncertain' rather than a wrong
// confident label — honesty over false precision.
export const CONFIDENCE_FLOOR = 0.5;

// ─── Math helpers ────────────────────────────────────────────────────────────

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function softmax(logits: ArrayLike<number>): number[] {
  const arr = Array.from(logits);
  const max = Math.max(...arr);
  const exps = arr.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function severityFromScore(score: number): ConcernScore['severity'] {
  if (score < 0.4) return 'mild';
  if (score < 0.7) return 'moderate';
  return 'pronounced';
}

/** Builds one ConcernScore from a 0–1 probability. */
export function buildConcern(key: ConcernKey, probability: number): ConcernScore {
  const score = clamp01(Math.round(probability * 1000) / 1000);
  return {
    key,
    label: CONCERN_DISPLAY[key],
    score,
    severity: severityFromScore(score),
    confidence: clamp01(Math.round(Math.abs(score - 0.5) * 2 * 1000) / 1000),
    present: score > 0.5,
  };
}

/**
 * Assembles the shared result: skin type gating and overall confidence.
 * Both inference paths call this, so the rules stay in one place.
 */
export function composeAnalysisResult(input: {
  scanId: string;
  skinType: SkinTypeKey | null;
  skinTypeConfidence: number;
  skinTypeProbs: number[];
  concernProbs: Record<ConcernKey, number>;
  inferenceMethod: SkinAnalysisResult['inferenceMethod'];
  inferenceLatencyMs: number;
}): SkinAnalysisResult {
  const skinTypeConf = clamp01(input.skinTypeConfidence);
  const skinType: SkinTypeKey | 'uncertain' =
    input.skinType && skinTypeConf >= CONFIDENCE_FLOOR ? input.skinType : 'uncertain';

  const concerns = CONCERN_LABELS.map((key) => buildConcern(key, input.concernProbs[key]));

  const avgConcernConf =
    concerns.reduce((sum, c) => sum + c.confidence, 0) / concerns.length;
  const overallConf = clamp01((skinTypeConf + avgConcernConf) / 2);

  return {
    scanId: input.scanId,
    modelVersion: MODEL_VERSION,
    status: overallConf < CONFIDENCE_FLOOR ? 'low_confidence' : 'completed',
    confidence: Math.round(overallConf * 100) / 100,
    skinProfile: {
      skinType,
      skinTypeConfidence: Math.round(skinTypeConf * 100) / 100,
      skinTypeProbs: input.skinTypeProbs.map((p) => Math.round(p * 1000) / 1000),
    },
    concerns,
    disclaimer: DISCLAIMER,
    inferenceMethod: input.inferenceMethod,
    inferenceLatencyMs: input.inferenceLatencyMs,
  };
}

// ─── On-device session (opt-in) ──────────────────────────────────────────────

let _sessionPromise: Promise<InferenceSession> | null = null;

async function getSession(): Promise<InferenceSession> {
  if (_sessionPromise) return _sessionPromise;

  _sessionPromise = (async () => {
    const modelUrl = process.env.NEXT_PUBLIC_SKIN_MODEL_URL;
    if (!modelUrl) {
      throw new Error('[SkinModel] VITE_SKIN_MODEL_URL is not set. Host skin_model.onnx and set its URL.');
    }

    const head = await fetch(modelUrl, { method: 'HEAD' });
    const size = Number(head.headers.get('content-length') ?? 0);
    if (!head.ok || (size > 0 && size < MIN_MODEL_BYTES)) {
      throw new Error(`[SkinModel] Model at ${modelUrl} is missing or suspiciously small (${size} bytes).`);
    }

    const ort = await import('onnxruntime-web');
    ort.env.wasm.wasmPaths = ORT_WASM_BASE;
    return ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  })();

  // If session creation fails, clear the promise so the next call retries
  _sessionPromise.catch(() => {
    _sessionPromise = null;
  });

  return _sessionPromise;
}

/**
 * Converts a flat RGB Uint8Array (HWC, 0–255) to a CHW float32 tensor with
 * ImageNet normalisation.
 */
export async function preprocessToTensor(
  rgbPixels: Uint8Array,
  width: number = 224,
  height: number = 224
): Promise<Tensor> {
  const MEAN = [0.485, 0.456, 0.406];
  const STD = [0.229, 0.224, 0.225];
  const floatData = new Float32Array(3 * width * height);

  for (let c = 0; c < 3; c++) {
    const meanVal = MEAN[c] ?? 0;
    const stdVal = STD[c] ?? 1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hwcIdx = (y * width + x) * 3 + c;
        const chwIdx = c * width * height + y * width + x;
        floatData[chwIdx] = ((rgbPixels[hwcIdx] ?? 0) / 255 - meanVal) / stdVal;
      }
    }
  }

  const ort = await import('onnxruntime-web');
  return new ort.Tensor('float32', floatData, [1, 3, height, width]);
}

/**
 * Runs on-device ONNX inference on a masked 224×224 RGB input.
 * Throws when ON_DEVICE_INFERENCE_ENABLED is false.
 */
export async function runSkinAnalysis(
  maskedPixels: Uint8Array,
  scanId: string
): Promise<SkinAnalysisResult> {
  if (!ON_DEVICE_INFERENCE_ENABLED) {
    throw new Error('[SkinModel] On-device inference is disabled. Set VITE_ENABLE_ON_DEVICE_INFERENCE=true to enable it.');
  }

  const startMs = Date.now();
  const session = await getSession();
  const inputTensor = await preprocessToTensor(maskedPixels, 224, 224);
  const outputs = await session.run({ input_image: inputTensor });

  const rawSkinType = outputs['skin_type_logits']?.data;
  const rawConcern = outputs['concern_logits']?.data;
  if (!rawSkinType || !rawConcern) {
    throw new Error('[SkinModel] Inference output tensors skin_type_logits or concern_logits missing');
  }

  const skinTypeLogits = Array.from(rawSkinType as Float32Array);
  const concernLogits = Array.from(rawConcern as Float32Array);
  const hasNaNOrInf = [...skinTypeLogits, ...concernLogits].some((v) => !Number.isFinite(v));
  if (hasNaNOrInf) {
    throw new Error('[SkinModel] Inference output contains NaN or Infinity values — invalid model output');
  }

  const skinTypeProbs = softmax(skinTypeLogits);
  const maxIdx = skinTypeProbs.indexOf(Math.max(...skinTypeProbs));
  const concernProbs = Object.fromEntries(
    CONCERN_LABELS.map((key, i) => [key, sigmoid(concernLogits[i] ?? 0)])
  ) as Record<ConcernKey, number>;

  const result = composeAnalysisResult({
    scanId,
    skinType: SKIN_TYPE_LABELS[maxIdx] ?? null,
    skinTypeConfidence: skinTypeProbs[maxIdx] ?? 0,
    skinTypeProbs,
    concernProbs,
    inferenceMethod: 'onnx_on_device',
    inferenceLatencyMs: Date.now() - startMs,
  });

  console.log(
    `[SkinModel] ${MODEL_VERSION} inference done in ${result.inferenceLatencyMs}ms | ` +
      `skin_type=${result.skinProfile.skinType} | overall_conf=${Math.round(result.confidence * 100)}%`
  );

  return result;
}
