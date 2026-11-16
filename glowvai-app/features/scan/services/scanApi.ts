/**
 * Backend skin analysis client (default inference path on web).
 *
 * POSTs the captured face image to the CNN backend (POST /api/v1/scan/analyze, falling back to /predict; the same
 * contract as the cnn_model FastAPI server). The primary base URL is tried
 * first, then the cloud backend. Any failure throws ScanError. No scores are
 * invented when the backend is unavailable.
 */

import { getBackendBaseUrl, getCloudBackendUrl } from '../../../core/services/apiConfig';
import {
  QUALITY_CODES,
  chooseDisplayMetrics,
  concernsFromMetrics,
  hasNewMetrics,
  parseQualityFailure,
  placeholderConcerns,
  qualityMessage,
  skinScoreCaption,
  type QualityCode,
} from './scanDisplay';
import {
  CONCERN_LABELS,
  SKIN_TYPE_LABELS,
  composeAnalysisResult,
  type ConcernKey,
  type SkinAnalysisResult,
  type SkinTypeKey,
} from '../../../core/services/skinModelService';

export type ScanFailureReason =
  | QualityCode
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

// The hosted scan server sleeps when idle (free plan) and takes about 20-25 s to wake: 50 s covers that wake-up plus the scan.
const REQUEST_TIMEOUT_MS = 50_000;

interface PredictResponse {
  success?: boolean;
  scanId?: string;
  skinType?: string;
  skinTypeConfidence?: number;
  concerns?: Partial<Record<ConcernKey, { present?: boolean; score?: number }>>;
  /** Live GlowVAI CNN server (/api/v1/scan/analyze): 0-100 health per metric, higher = healthier. */
  metrics?: Record<string, { score?: number }>;
  /** New scan API: overall score 0-100 with metrics_used / metrics_total. */
  skin_score?: unknown;
  inferenceLatencyMs?: number;
}

// The deployed CNN server answers on /api/v1/scan/analyze with the photo in field "image" (it has no /predict route,
// checked 15 Nov 2026). /predict with field "file" stays as the fallback for older servers.
const ANALYZE_PATH = '/api/v1/scan/analyze';
const METRIC_FOR_CONCERN: Record<ConcernKey, string> = {
  oiliness: 'sebum',
  dryness: 'hydration',
  redness: 'sensitivity',
  uneven_tone: 'pigmentation',
  visible_blemishes: 'acne',
};

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
  const quality = parseQualityFailure(data);
  if (quality) throw new ScanError(quality, qualityMessage(quality)!.body);
  const hasConcerns = !!data.concerns && typeof data.concerns === 'object';
  const hasMetrics = !!data.metrics && typeof data.metrics === 'object';
  if (data.success === false || (!hasConcerns && !hasMetrics)) {
    throw new ScanError('invalid_response', 'Analysis service returned an unexpected response.');
  }

  const concernProbs = {} as Record<ConcernKey, number>;
  const fromNew = hasNewMetrics(data.metrics) ? concernsFromMetrics(data.metrics) : null;
  for (const key of CONCERN_LABELS) {
    if (fromNew) {
      concernProbs[key] = fromNew.probs[key] ?? 0;
    } else if (hasConcerns) {
      const score = data.concerns![key]?.score;
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
        throw new ScanError('invalid_response', `Analysis service omitted a valid score for ${key}.`);
      }
      concernProbs[key] = score;
    } else {
      const health = data.metrics![METRIC_FOR_CONCERN[key]]?.score;
      if (typeof health !== 'number' || !Number.isFinite(health) || health < 0 || health > 100) {
        throw new ScanError('invalid_response', `Analysis service omitted a valid score for ${key}.`);
      }
      concernProbs[key] = Math.round((1 - health / 100) * 1000) / 1000;
    }
  }

  const skinTypeKey = typeof data.skinType === 'string' ? data.skinType.toLowerCase() : '';
  const skinType = (SKIN_TYPE_LABELS as readonly string[]).includes(skinTypeKey)
    ? (skinTypeKey as SkinTypeKey)
    : null;
  const skinTypeConfidence = Number.isFinite(data.skinTypeConfidence) ? Number(data.skinTypeConfidence) : 0;

  const composed = composeAnalysisResult({
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
  if (!fromNew) {
    const hiddenConcerns = placeholderConcerns(data.metrics, hasConcerns);
    return hiddenConcerns.length ? { ...composed, hiddenConcerns } : composed;
  }
  return { ...composed, metrics: chooseDisplayMetrics(data.metrics), skinScore: skinScoreCaption(data.skin_score), hiddenConcerns: fromNew.hidden };
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
  const bases = Array.from(new Set([getBackendBaseUrl(), getCloudBackendUrl()].filter((base): base is string => Boolean(base))));
  let lastError: unknown = null;

  for (const base of bases) {
   for (const route of ['analyze', 'predict'] as const) {
    const form = new FormData();
    form.append(route === 'analyze' ? 'image' : 'file', file, 'face_capture.jpg');

    let response: Response;
    try {
      response = await postWithTimeout(`${base}${route === 'analyze' ? ANALYZE_PATH : '/predict'}`, form, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
      break; // network error or timeout: try the next base
    }

    if (response.status === 404 && route === 'analyze') continue; // older server: try /predict
    if (!response.ok) {
      // A failed photo-quality gate may come as a 4xx with an error code: show the retake screen, not a network error.
      const body = await response.json().catch(() => null);
      const quality = parseQualityFailure(body);
      if (quality) throw new ScanError(quality, qualityMessage(quality)!.body);
      lastError = new Error(`HTTP ${response.status} from ${base}`);
      break;
    }

    let data: PredictResponse;
    try {
      data = (await response.json()) as PredictResponse;
    } catch {
      throw new ScanError('invalid_response', 'Analysis service returned a non-JSON response.');
    }
    return toAnalysisResult(data, scanId, startMs);
   }
  }

  if (signal?.aborted) throw new ScanError('timeout', 'Analysis request was aborted.');
  throw new ScanError(
    'backend_unreachable',
    `Skin analysis service unreachable: ${String(lastError ?? 'no response')}`
  );
}

/** Wakes the hosted scan server before the customer needs it (fire and forget; it answers GET /health). Safe to call often. */
let lastWarm = 0;
export function warmScanServer(now: number = Date.now()): void {
  if (now - lastWarm < 4 * 60_000) return;
  lastWarm = now;
  try {
    const base = getCloudBackendUrl();
    if (!base) return;
    void fetch(`${base.replace(/\/$/, '')}/health`, { method: 'GET', mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
  } catch {
    // Warming is best effort only.
  }
}
