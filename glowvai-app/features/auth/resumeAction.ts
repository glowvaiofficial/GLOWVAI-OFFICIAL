// An action that needs an account (add to bag, save to wishlist) waits here while the phone sign-in runs, and runs once
// the account is signed in. Held in memory only, and dropped when it is more than ten minutes old.
const MAX_AGE_MS = 10 * 60 * 1000;

let held: { run: () => void; at: number } | null = null;

export function holdAction(run: () => void): void {
  held = { run, at: Date.now() };
}

export function takeHeldAction(): (() => void) | null {
  const current = held;
  held = null;
  if (!current || Date.now() - current.at > MAX_AGE_MS) return null;
  return current.run;
}
