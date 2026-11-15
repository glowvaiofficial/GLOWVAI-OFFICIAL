/**
 * What the scan report may show (pure, no React imports, unit tested). Same file in the app and the web shop.
 *
 * Rules (CNN docs/scan-response.md): show only metrics the model really measured; label pixel estimates as
 * estimates; never show a placeholder metric (hydration, pores, ...), a "0", "N/A" or an empty ring; show the overall
 * skin score only with "based on N of M metrics" and hide it when it is null. Everything is backward compatible: when
 * the server still sends the old payload, none of the new fields exist and the helpers return empty / null.
 */

export type QualityCode = 'TOO_DARK' | 'TOO_BRIGHT' | 'BLUR_DETECTED' | 'FACE_TOO_SMALL' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES';

export const QUALITY_CODES: readonly QualityCode[] = ['TOO_DARK', 'TOO_BRIGHT', 'BLUR_DETECTED', 'FACE_TOO_SMALL', 'NO_FACE_DETECTED', 'MULTIPLE_FACES'];

/** Metric names the model never produces: dropped even if a server, proxy or old client adds a value for them. */
export const PLACEHOLDER_METRICS: readonly string[] = ['hydration', 'pores', 'sebum', 'sensitivity'];

export interface DisplayMetric {
  key: string;
  label: string;
  /** 0 to 10, higher means more of that concern. */
  score: number;
  /** True when the number is a pixel estimate from the face crop, not a trained model. */
  estimate: boolean;
  count?: number;
}

export interface SkinScoreView {
  /** Whole number 1 to 100, higher is healthier. */
  score: number;
  label: string;
  /** "Based on 8 of 10 metrics". */
  caption: string;
}

export interface QualityMessage {
  title: string;
  body: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** True when the payload uses the new metric shape (each value has a boolean `measured`). */
export function hasNewMetrics(metrics: unknown): boolean {
  return isObj(metrics) && Object.values(metrics).some((m) => isObj(m) && typeof m.measured === 'boolean');
}

function titleCase(key: string): string {
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The metrics to draw: measured, with a real 0 to 10 score, not a placeholder. Empty for the old payload. */
export function chooseDisplayMetrics(metrics: unknown): DisplayMetric[] {
  if (!isObj(metrics)) return [];
  const out: DisplayMetric[] = [];
  for (const [key, raw] of Object.entries(metrics)) {
    if (PLACEHOLDER_METRICS.includes(key) || !isObj(raw)) continue;
    if (raw.measured !== true || !isNum(raw.score) || raw.score < 0 || raw.score > 10) continue;
    out.push({
      key,
      label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : titleCase(key),
      score: raw.score,
      estimate: raw.method === 'pixel_estimate',
      ...(isNum(raw.count) && raw.count > 0 ? { count: Math.round(raw.count) } : {}),
    });
  }
  return out;
}

/** Plain-words level for a metric score. A measured 0 reads "None seen", never "0". */
export function metricLevel(score: number): string {
  if (score < 0.5) return 'None seen';
  if (score < 3) return 'Low';
  if (score < 6) return 'Moderate';
  return 'High';
}

/** "x.x/10" text, or null when it would read 0. */
export function metricScoreText(score: number): string | null {
  const rounded = Math.round(score * 10) / 10;
  return rounded > 0 ? `${rounded.toFixed(1)}/10` : null;
}

/** Bar fill 1 to 100, or null when there is nothing to fill (no empty bar is drawn). */
export function metricFillPercent(score: number): number | null {
  const pct = Math.round(Math.min(10, Math.max(0, score)) * 10);
  return pct > 0 ? pct : null;
}

/** The overall score with its caption, or null (hide the score) when it is missing, null or would read 0. */
export function skinScoreCaption(skinScore: unknown): SkinScoreView | null {
  if (!isObj(skinScore) || !isNum(skinScore.score)) return null;
  const score = Math.round(Math.min(100, skinScore.score));
  if (score < 1) return null;
  const names = Array.isArray(skinScore.metrics_used_names) ? skinScore.metrics_used_names.length : null;
  const used = isNum(skinScore.metrics_used) ? skinScore.metrics_used : names;
  const total = isNum(skinScore.metrics_total) ? skinScore.metrics_total : null;
  if (used === null || used < 1) return null;
  const caption = total !== null && total >= used ? `Based on ${used} of ${total} metrics` : `Based on ${used} ${used === 1 ? 'metric' : 'metrics'}`;
  const label = typeof skinScore.label === 'string' ? skinScore.label.trim() : '';
  return { score, label, caption };
}

const QUALITY_MESSAGES: Record<QualityCode, QualityMessage> = {
  TOO_DARK: { title: 'Too dark', body: 'Face a window or a bright light so your whole face is evenly lit, then retake.' },
  TOO_BRIGHT: { title: 'Too bright', body: 'Move out of direct sun or harsh light. Soft, even light works best.' },
  BLUR_DETECTED: { title: 'Photo is blurry', body: 'Hold your phone steady, tap to focus and keep still while it captures.' },
  FACE_TOO_SMALL: { title: 'Move closer', body: 'Bring your face closer so it fills the oval, then retake.' },
  NO_FACE_DETECTED: { title: 'We could not see your face', body: 'Look straight at the camera with your whole face in the frame, hair and hands away.' },
  MULTIPLE_FACES: { title: 'More than one face', body: 'Make sure only you are in the photo, then retake.' },
};

export function isQualityCode(value: unknown): value is QualityCode {
  return typeof value === 'string' && (QUALITY_CODES as readonly string[]).includes(value);
}

/** Friendly retake copy for a quality code, or null for anything else. */
export function qualityMessage(code: unknown): QualityMessage | null {
  return isQualityCode(code) ? QUALITY_MESSAGES[code] : null;
}

/** The quality code when a response is a failed quality gate (a known error_code), else null. */
export function parseQualityFailure(data: unknown): QualityCode | null {
  if (!isObj(data)) return null;
  const code = data.error_code ?? (isObj(data.error) ? data.error.code : undefined);
  return isQualityCode(code) ? code : null;
}

/**
 * Passes a scan payload through untouched except that placeholder metrics are removed. `metrics`, `skin_score`,
 * `status`, `error_code` and `message` keep their values. Not mutating: returns a shallow copy.
 */
export function sanitizeScanPayload<T>(data: T): T {
  if (!isObj(data) || !isObj(data.metrics)) return data;
  const metrics: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data.metrics)) {
    if (!PLACEHOLDER_METRICS.includes(key)) metrics[key] = value;
  }
  return { ...data, metrics } as T;
}

/** Report concern keys to hide for the old payload: those fed by a metric the model never produces. */
export function placeholderConcerns(metrics: unknown, hasConcerns: boolean): string[] {
  if (hasConcerns || !isObj(metrics)) return [];
  const source: Record<string, string> = { dryness: 'hydration', oiliness: 'sebum', redness: 'sensitivity' };
  return Object.keys(source).filter((concern) => PLACEHOLDER_METRICS.includes(source[concern] ?? ''));
}

const CONCERN_METRIC: Record<string, string> = {
  oiliness: 'oiliness',
  dryness: 'hydration',
  redness: 'redness',
  uneven_tone: 'uneven_tone',
  visible_blemishes: 'acne',
};

/**
 * New payload to report concerns: probability 0 to 1 per concern from the 0 to 10 metric score. A concern whose metric
 * was not measured gets 0 internally and is listed in `hidden`, so the screens never draw it.
 */
export function concernsFromMetrics(metrics: unknown): { probs: Record<string, number>; hidden: string[] } {
  const shown = chooseDisplayMetrics(metrics);
  const probs: Record<string, number> = {};
  const hidden: string[] = [];
  for (const [concern, metric] of Object.entries(CONCERN_METRIC)) {
    const m = shown.find((x) => x.key === metric);
    probs[concern] = m ? Math.round((m.score / 10) * 1000) / 1000 : 0;
    if (!m) hidden.push(concern);
  }
  return { probs, hidden };
}
