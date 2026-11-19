import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..', 'glowvai-app');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

test('every scan route opens the app-only screen (report stays view only)', () => {
  const routes = read('features/scan/routes.tsx');
  for (const name of ['scan-tab', 'scan-intro', 'scan-camera', 'scan-gallery', 'scan-preview', 'scan-analyzing', 'scan-failed']) {
    assert.match(routes, new RegExp(`'${name}': ScanInAppScreen`), name);
  }
  assert.match(routes, /'scan-report': ScanReportScreen/);
  const app = read('App.tsx');
  assert.match(app, /case 'face-prep':\s*case 'face-capture':\s*case 'face-loading':\s*return <ScanInAppScreen \/>/);
});

test('the website has no camera or photo-picker code for scanning', () => {
  for (const gone of ['features/scan/ScanCameraScreen.tsx', 'features/scan/ScanGalleryScreen.tsx', 'screens/FaceAnalysisCameraScreen.tsx']) {
    assert.equal(existsSync(join(root, gone)), false, gone);
  }
  assert.doesNotMatch(read('features/auth/authUtils.ts'), /getUserMedia/);
  assert.doesNotMatch(read('features/scan/ScanInAppScreen.tsx'), /getUserMedia|type="file"/);
});

test('the app-only screen says the scan is in the app and uses only configured store links', () => {
  const src = read('features/scan/ScanInAppScreen.tsx');
  assert.match(src, /Skin scan is in the GlowVai app/);
  assert.match(src, /Scan your face with your phone camera for a personalised routine/);
  assert.match(src, /Search GlowVai on Google Play/);
  assert.match(src, /Continue shopping/);
  assert.match(src, /Browse products/);
  assert.match(src, /footer\.playStoreUrl/);
  assert.doesNotMatch(src, /https?:\/\//);
  assert.doesNotMatch(src, /not applicable|not supported/i);
});
