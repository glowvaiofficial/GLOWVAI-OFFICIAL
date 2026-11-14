// Deploy limit guard. Run before every production deploy: it counts deploys per day in a file in the user's home folder
// and stops the deploy once the daily limit is reached, so the free Vercel plan limit (100 a day) is never used up by
// accident. Usage:  node scripts/deploy-guard.mjs && vercel deploy --prod --yes
// Limit: 3 production deploys per UTC day for this project. Change MAX_PER_DAY if you decide on another number.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const MAX_PER_DAY = 3;
const project = process.argv[2] || 'glowvai-admin-console';
const file = join(homedir(), '.glowvai', 'deploy-count.json');
const today = new Date().toISOString().slice(0, 10);

let log = {};
if (existsSync(file)) {
  try {
    log = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    log = {};
  }
}
const key = `${project}:${today}`;
const used = log[key] ?? 0;

if (used >= MAX_PER_DAY) {
  console.error(`Deploy blocked: ${project} already has ${used} production deploys today (limit ${MAX_PER_DAY}). Try again tomorrow (UTC).`);
  process.exit(1);
}

log[key] = used + 1;
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(log, null, 2));
console.log(`Deploy allowed: ${project} deploy ${used + 1} of ${MAX_PER_DAY} today.`);
