// Attempt counters with windows and lockouts. Pure: the caller reads the stored state, calls one of these, and writes
// the result back inside a transaction. Times are epoch milliseconds.

export const SIGNIN_MAX_ATTEMPTS = 5;
export const SIGNIN_WINDOW_MS = 15 * 60_000;
export const SIGNIN_LOCK_MS = 15 * 60_000;
export const CODE_MAX_WRONG = 5;
export const CODE_LOCK_MS = 30 * 60_000;

export interface AttemptState {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

export interface AttemptDecision {
  allowed: boolean;
  state: AttemptState;
  retryAfterMs: number;
}

/**
 * One sign-in attempt. Attempts 1 to 5 inside a 15-minute window are allowed. The 6th attempt in the window is refused
 * and starts a 15-minute lockout. While locked, every attempt is refused and the lock is not extended.
 */
export function attemptStep(prev: AttemptState | null | undefined, now: number): AttemptDecision {
  const base: AttemptState = prev
    ? { count: prev.count, windowStart: prev.windowStart, lockedUntil: prev.lockedUntil }
    : { count: 0, windowStart: now, lockedUntil: 0 };
  if (base.lockedUntil > now) return { allowed: false, state: base, retryAfterMs: base.lockedUntil - now };
  if (base.windowStart === 0 || now - base.windowStart >= SIGNIN_WINDOW_MS) {
    base.count = 0;
    base.windowStart = now;
  }
  if (base.count >= SIGNIN_MAX_ATTEMPTS) {
    base.lockedUntil = now + SIGNIN_LOCK_MS;
    return { allowed: false, state: base, retryAfterMs: SIGNIN_LOCK_MS };
  }
  base.count += 1;
  return { allowed: true, state: base, retryAfterMs: 0 };
}

export interface CodeState {
  wrong: number;
  lockedUntil: number;
}

export const CLEAR_CODE_STATE: CodeState = { wrong: 0, lockedUntil: 0 };

/** How long an order's delivery code stays locked, in ms. 0 when it is open. */
export function codeLockRemaining(prev: CodeState | null | undefined, now: number): number {
  return prev && prev.lockedUntil > now ? prev.lockedUntil - now : 0;
}

/** The state after a wrong code. The 5th wrong code locks the order's code for 30 minutes and resets the count. */
export function afterWrongCode(prev: CodeState | null | undefined, now: number): CodeState {
  const wrong = (prev?.wrong ?? 0) + 1;
  if (wrong >= CODE_MAX_WRONG) return { wrong: 0, lockedUntil: now + CODE_LOCK_MS };
  return { wrong, lockedUntil: 0 };
}
