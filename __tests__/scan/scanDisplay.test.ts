import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseDisplayMetrics,
  concernsFromMetrics,
  hasNewMetrics,
  metricFillPercent,
  metricLevel,
  metricScoreText,
  parseQualityFailure,
  placeholderConcerns,
  qualityMessage,
  sanitizeScanPayload,
  skinScoreCaption,
  QUALITY_CODES,
} from '../../glowvai-app/features/scan/services/scanDisplay';

const metrics = {
  acne: { label: 'Acne', measured: true, score: 2.1, method: 'model', count: 3 },
  redness: { label: 'Redness', measured: true, score: 0, method: 'pixel_estimate' },
  hydration: { label: 'Hydration', measured: false, score: null, method: null, reason: 'x' },
  pores: { label: 'Pores', measured: true, score: 5, method: 'model' },
  texture: { label: 'Texture', measured: true, score: 99, method: 'model' },
  oiliness: { measured: true, score: 4, method: 'pixel_estimate' },
};

test('chooseDisplayMetrics keeps only measured, valid, non-placeholder metrics', () => {
  const out = chooseDisplayMetrics(metrics);
  assert.deepEqual(out.map((m) => m.key), ['acne', 'redness', 'oiliness']);
  assert.equal(out[0].count, 3);
  assert.equal(out[0].estimate, false);
  assert.equal(out[1].estimate, true);
  assert.equal(out[2].label, 'Oiliness');
});

test('chooseDisplayMetrics is empty for the old payload or junk', () => {
  assert.deepEqual(chooseDisplayMetrics(undefined), []);
  assert.deepEqual(chooseDisplayMetrics({ acne: { score: 80 } }), []);
  assert.equal(hasNewMetrics({ acne: { score: 80 } }), false);
  assert.equal(hasNewMetrics(metrics), true);
});

test('a measured zero never reads as 0', () => {
  assert.equal(metricLevel(0), 'None seen');
  assert.equal(metricScoreText(0), null);
  assert.equal(metricScoreText(0.04), null);
  assert.equal(metricFillPercent(0), null);
  assert.equal(metricScoreText(2.14), '2.1/10');
  assert.equal(metricFillPercent(2.1), 21);
  assert.equal(metricLevel(7), 'High');
});

test('skinScoreCaption shows N of M and hides null scores', () => {
  const v = skinScoreCaption({ score: 73.6, label: 'Fair', metrics_used: 8, metrics_total: 10 });
  assert.deepEqual(v, { score: 74, label: 'Fair', caption: 'Based on 8 of 10 metrics' });
  assert.equal(skinScoreCaption({ score: null, label: '', metrics_used: 0, metrics_total: 10 }), null);
  assert.equal(skinScoreCaption(undefined), null);
  assert.equal(skinScoreCaption({ score: 0, metrics_used: 3, metrics_total: 10 }), null);
  assert.equal(skinScoreCaption({ score: 60, metrics_used_names: ['a', 'b'] })?.caption, 'Based on 2 metrics');
});

test('every quality code has friendly copy; unknown codes have none', () => {
  for (const code of QUALITY_CODES) assert.ok(qualityMessage(code)?.body.length);
  assert.equal(qualityMessage('TOO_DARK')?.title, 'Too dark');
  assert.match(qualityMessage('TOO_DARK')!.body, /window/);
  assert.equal(qualityMessage('SOMETHING'), null);
});

test('parseQualityFailure reads error_code', () => {
  assert.equal(parseQualityFailure({ status: 'failed', error_code: 'BLUR_DETECTED' }), 'BLUR_DETECTED');
  assert.equal(parseQualityFailure({ status: 'failed', error_code: 'WHAT' }), null);
  assert.equal(parseQualityFailure(null), null);
});

test('sanitizeScanPayload drops placeholders and passes the rest untouched', () => {
  const payload = { status: 'ok', metrics, skin_score: { score: 70 }, extra: 1 };
  const out = sanitizeScanPayload(payload);
  assert.equal('hydration' in out.metrics, false);
  assert.equal('pores' in out.metrics, false);
  assert.deepEqual(out.metrics.acne, metrics.acne);
  assert.equal(out.skin_score, payload.skin_score);
  assert.equal(payload.metrics.hydration.measured, false);
  assert.equal(sanitizeScanPayload({ a: 1 }).a, 1);
});

test('placeholderConcerns hides placeholder-fed concerns in the old metrics payload only', () => {
  assert.deepEqual(placeholderConcerns({ acne: { score: 1 } }, false), ['dryness', 'oiliness', 'redness']);
  assert.deepEqual(placeholderConcerns({ acne: { score: 1 } }, true), []);
});

test('concernsFromMetrics maps measured metrics and hides the rest', () => {
  const { probs, hidden } = concernsFromMetrics(metrics);
  assert.equal(probs.visible_blemishes, 0.21);
  assert.equal(probs.oiliness, 0.4);
  assert.deepEqual(hidden, ['dryness', 'uneven_tone']);
});
