// Builds the GLOW VAI vendor app (Expo) for the web and copies it into public/sellers, served at /sellers.
//
// Usage:
//   VENDOR_APP_DIR="../GLOW VAI VENDOR/glowvai-vendor-app/mobile" \
//   NEXT_PUBLIC_VENDOR_API_URL="https://<vendor-backend-host>" \
//   node scripts/build-sellers.mjs
//
// NEXT_PUBLIC_VENDOR_API_URL is baked into the build (as EXPO_PUBLIC_VENDOR_API_URL) and must also be set on the
// website deployment, because next.config.js allows that host in the /sellers content security policy.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const appDir = path.resolve(process.env.VENDOR_APP_DIR || '../GLOW VAI VENDOR/glowvai-vendor-app/mobile');
const apiUrl = process.env.NEXT_PUBLIC_VENDOR_API_URL || 'http://localhost:4000';
const outDir = path.join(tmpdir(), 'glowvai-sellers-build');
const target = path.resolve('public/sellers');
const tempConfig = path.join(appDir, 'app.config.js');

if (!existsSync(path.join(appDir, 'app.json'))) {
  throw new Error(`Vendor app not found at ${appDir}. Set VENDOR_APP_DIR.`);
}
if (existsSync(tempConfig)) {
  throw new Error(`${tempConfig} already exists; this script would overwrite it.`);
}

// Serve the app under /sellers without editing the vendor project: a temporary config adds the base URL.
writeFileSync(
  tempConfig,
  "const base = require('./app.json').expo;\nmodule.exports = { ...base, experiments: { ...(base.experiments || {}), baseUrl: '/sellers' } };\n"
);
try {
  rmSync(outDir, { recursive: true, force: true });
  execSync(`npx expo export -p web --output-dir "${outDir}"`, {
    cwd: appDir,
    stdio: 'inherit',
    env: { ...process.env, CI: '1', EXPO_PUBLIC_VENDOR_API_URL: apiUrl },
  });
} finally {
  rmSync(tempConfig, { force: true });
}

rmSync(target, { recursive: true, force: true });
cpSync(outDir, target, { recursive: true });
rmSync(path.join(target, 'metadata.json'), { force: true });
console.log(`Seller portal built for ${apiUrl} and copied to ${target}`);
