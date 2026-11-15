// Deploy guard. Run before every production deploy:
//   node scripts/deploy-guard.mjs <project-name> [--emergency] && vercel deploy --prod --yes
//
// Vercel's Hobby plan allows 100 deployments per account in a rolling 24 hours, and EVERY deployment counts: CLI deploys,
// preview deploys made by git pushes, all projects in the account. So this guard asks Vercel how many deployments the
// whole account made in the last 24 hours and works close to the limit without ever reaching it:
//   under 80   -> allowed
//   80 to 89   -> allowed, with a warning
//   90 or more -> refused (10 left for emergencies); with --emergency it allows up to 97
// If Vercel cannot be asked, it falls back to this computer's own log of deploys with a lower cap (60), so it never
// guesses high. The Vercel CLI login token is read from its auth file and is never printed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const VERCEL_LIMIT = 100;
const WARN_AT = 80;
const STOP_AT = 90;
const EMERGENCY_STOP_AT = 97;
const LOCAL_FALLBACK_STOP_AT = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const args = process.argv.slice(2);
const project = args.find((a) => !a.startsWith('--')) || 'unknown-project';
const emergency = args.includes('--emergency');
const since = Date.now() - DAY_MS;

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function vercelToken() {
  const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
  const candidates = [
    join(appData, 'com.vercel.cli', 'Data', 'auth.json'),
    join(appData, 'com.vercel.cli', 'auth.json'),
    join(homedir(), '.local', 'share', 'com.vercel.cli', 'auth.json'),
    join(homedir(), 'Library', 'Application Support', 'com.vercel.cli', 'auth.json'),
  ];
  for (const file of candidates) {
    const token = readJson(file)?.token;
    if (typeof token === 'string' && token) return token;
  }
  return null;
}

function teamId() {
  return readJson(join(process.cwd(), '.vercel', 'project.json'))?.orgId || null;
}

// Counts the account's deployments created in the last 24 hours (all projects, CLI and git), following pages.
async function countFromVercel() {
  const token = vercelToken();
  const team = teamId();
  if (!token || !team) return null;
  let count = 0;
  let until = undefined;
  for (let page = 0; page < 5; page++) {
    const url = new URL('https://api.vercel.com/v6/deployments');
    url.searchParams.set('teamId', team);
    url.searchParams.set('since', String(since));
    url.searchParams.set('limit', '100');
    if (until) url.searchParams.set('until', String(until));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data.deployments) ? data.deployments : [];
    count += list.filter((d) => Number(d.created ?? d.createdAt) >= since).length;
    const next = data.pagination?.next;
    if (!next || list.length === 0) break;
    until = next;
  }
  return count;
}

// Local fallback: this computer's own log of deploys made through this guard (rolling 24 hours, all projects).
const logFile = join(homedir(), '.glowvai', 'deploy-log.json');
function localLog() {
  const raw = readJson(logFile);
  return Array.isArray(raw) ? raw.filter((e) => Number(e?.at) >= since) : [];
}
function recordLocal(entries) {
  mkdirSync(dirname(logFile), { recursive: true });
  writeFileSync(logFile, JSON.stringify([...entries, { project, at: Date.now() }], null, 2));
}

const recent = localLog();
let used = null;
try {
  used = await countFromVercel();
} catch {
  used = null;
}

const source = used === null ? 'this computer\'s log (Vercel could not be asked)' : 'Vercel, whole account';
if (used === null) used = recent.length;
const stopAt = used === recent.length && source.startsWith('this') ? LOCAL_FALLBACK_STOP_AT : emergency ? EMERGENCY_STOP_AT : STOP_AT;

if (used >= stopAt) {
  console.error(`Deploy blocked for ${project}: ${used} of ${VERCEL_LIMIT} deployments used in the last 24 hours (${source}). The guard stops at ${stopAt} so the account never runs out.${emergency ? '' : ' For an urgent fix, run again with --emergency.'}`);
  process.exit(1);
}

recordLocal(recent);
const left = VERCEL_LIMIT - used - 1;
const note = used + 1 >= WARN_AT ? ' Warning: close to the limit, batch the next changes.' : '';
console.log(`Deploy allowed for ${project}: ${used + 1} of ${VERCEL_LIMIT} in the last 24 hours (${source}); ${left} left.${note}`);
