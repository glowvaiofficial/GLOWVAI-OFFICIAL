/**
 * Backend skin analysis client (default inference path on web).
 *
 * POSTs the captured face image to the CNN backend (POST /predict, the same
 * contract as the cnn_model FastAPI server). The primary base URL is tried
 * first, then the cloud backend. Any failure throws ScanError. No scores are
 * invented when the backend is unavailable.
 */

import { getBackendBaseUrl, getCloudBackendUrl } from '../../../core/services/apiConfig';
import {
  CONCERN_LABELS,
  SKIN_TYPE_LABELS,
  composeAnalysisResult,
  type ConcernKey,
  type SkinAnalysisResult,
  type SkinTypeKey,
} from '../../../core/services/skinModelService';

export type ScanFailureReason =
  | 'photo_missing'
  | 'backend_unreachable'
  | 'invalid_response'
  | 'timeout'
  | 'processing_error';

export class ScanError extends Error {
  reason: ScanFailureReason;

  constructor(reason: ScanFailureReason, message: string) {
    super(message);
    this.name = 'ScanError';
    this.reason = reason;
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

interface PredictResponse {
  success?: boolean;
  scanId?: string;
  skinType?: string;
  skinTypeConfidence?: number;
  concerns?: Partial<Record<ConcernKey, { present?: boolean; score?: number }>>;
  inferenceLatencyMs?: number;
}

/** Posts with a per-request timeout, also honouring an outer abort signal. */
async function postWithTimeout(url: string, body: FormData, outer?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  outer?.addEventListener('abort', onOuterAbort);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}

/** Maps the backend /predict payload onto the shared SkinAnalysisResult. */
function toAnalysisResult(data: PredictResponse, scanId: string, startMs: number): SkinAnalysisResult {
  if (data.success === false || !data.concerns || typeof data.concerns !== 'object') {
    throw new ScanError('invalid_response', 'Analysis service returned an unexpected response.');
  }

  const concernProbs = {} as Record<ConcernKey, number>;
  for (const key of CONCERN_LABELS) {
    const score = data.concerns[key]?.score;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
      throw new ScanError('invalid_response', `Analysis service omitted a valid score for ${key}.`);
    }
    concernProbs[key] = score;
  }

  const skinTypeKey = typeof data.skinType === 'string' ? data.skinType.toLowerCase() : '';
  const skinType = (SKIN_TYPE_LABELS as readonly string[]).includes(skinTypeKey)
    ? (skinTypeKey as SkinTypeKey)
    : null;
  const skinTypeConfidence = Number.isFinite(data.skinTypeConfidence) ? Number(data.skinTypeConfidence) : 0;

  return composeAnalysisResult({
    scanId: data.scanId ?? scanId,
    skinType,
    skinTypeConfidence,
    skinTypeProbs: [],
    concernProbs,
    inferenceMethod: 'backend_cnn',
    inferenceLatencyMs: Number.isFinite(data.inferenceLatencyMs)
      ? Number(data.inferenceLatencyMs)
      : Date.now() - startMs,
  });
}

/**
 * Sends the face image to the CNN backend and returns the shared result.
 * Throws ScanError with a reason the failed screen can explain.
 */
export async function analyzeFaceImage(
  file: Blob,
  scanId: string,
  signal?: AbortSignal
): Promise<SkinAnalysisResult> {
  const startMs = Date.now();
  const bases = Array.from(new Set([getBackendBaseUrl(), getCloudBackendUrl()]));
  let lastError: unknown = null;

  for (const base of bases) {
    const form = new FormData();
    form.append('file', file, 'face_capture.jpg');

    let response: Response;
    try {
      response = await postWithTimeout(`${base}/predict`, form, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
      continue; // network error or timeout: try the next base
    }

    if (!response.ok) {
      lastError = new Error(`HTTP ${response.status} from ${base}`);
      continue;
    }

    let data: PredictResponse;
    try {
      data = (await response.json()) as PredictResponse;
    } catch {
      throw new ScanError('invalid_response', 'Analysis service returned a non-JSON response.');
    }
    return toAnalysisResult(data, scanId, startMs);
  }

  if (signal?.aborted) throw new ScanError('timeout', 'Analysis request was aborted.');
  throw new ScanError(
    'backend_unreachable',
    `Skin analysis service unreachable: ${String(lastError ?? 'no response')}`
  );
}
