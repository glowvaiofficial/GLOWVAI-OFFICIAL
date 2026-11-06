import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CLEAR_CODE_STATE, afterWrongCode, attemptStep, codeLockRemaining, type AttemptState } from "../../lib/rider/lockout";

const MIN = 60_000;
const T0 = 1_800_000_000_000;

function run(times: number[], start?: AttemptState | null) {
  let state: AttemptState | null | undefined = start;
  const results: boolean[] = [];
  for (const t of times) {
    const d = attemptStep(state, t);
    results.push(d.allowed);
    state = d.state;
  }
  return { results, state };
}

describe("sign-in attempts", () => {
  test("five attempts in the window are allowed, the sixth is refused and starts a 15-minute lock", () => {
    const { results, state } = run([T0, T0 + MIN, T0 + 2 * MIN, T0 + 3 * MIN, T0 + 4 * MIN, T0 + 5 * MIN]);
    assert.deepEqual(results, [true, true, true, true, true, false]);
    assert.equal(state?.lockedUntil, T0 + 5 * MIN + 15 * MIN);
  });

  test("while locked every attempt is refused and the lock is not extended", () => {
    const { state } = run([T0, T0 + MIN, T0 + 2 * MIN, T0 + 3 * MIN, T0 + 4 * MIN, T0 + 5 * MIN]);
    const lockedUntil = state?.lockedUntil ?? 0;
    const d = attemptStep(state, T0 + 10 * MIN);
    assert.equal(d.allowed, false);
    assert.equal(d.retryAfterMs, lockedUntil - (T0 + 10 * MIN));
    assert.equal(d.state.lockedUntil, lockedUntil);
  });

  test("after the lock ends a new window starts and attempts are allowed again", () => {
    const { state } = run([T0, T0 + MIN, T0 + 2 * MIN, T0 + 3 * MIN, T0 + 4 * MIN, T0 + 5 * MIN]);
    const after = T0 + 5 * MIN + 15 * MIN + 1;
    const { results } = run([after, after + MIN], state);
    assert.deepEqual(results, [true, true]);
  });

  test("attempts spread over more than the 15-minute window never reach the limit", () => {
    const times = [0, 1, 2, 3, 4, 5, 6].map((i) => T0 + i * 16 * MIN);
    assert.deepEqual(run(times).results, [true, true, true, true, true, true, true]);
  });

  test("a fresh start counts from the first attempt", () => {
    const d = attemptStep(null, T0);
    assert.equal(d.allowed, true);
    assert.equal(d.state.count, 1);
    assert.equal(d.state.windowStart, T0);
  });
});

describe("delivery code lock", () => {
  test("four wrong codes leave the code open", () => {
    let state = CLEAR_CODE_STATE;
    for (let i = 0; i < 4; i++) state = afterWrongCode(state, T0 + i * MIN);
    assert.equal(codeLockRemaining(state, T0 + 4 * MIN), 0);
  });

  test("the fifth wrong code locks the code for 30 minutes", () => {
    let state = CLEAR_CODE_STATE;
    for (let i = 0; i < 5; i++) state = afterWrongCode(state, T0 + i * MIN);
    assert.equal(state.lockedUntil, T0 + 4 * MIN + 30 * MIN);
    assert.equal(codeLockRemaining(state, T0 + 5 * MIN), 29 * MIN);
    assert.equal(codeLockRemaining(state, T0 + 34 * MIN + 1), 0);
  });

  test("the lock lifts after 30 minutes and the count starts again", () => {
    let state = CLEAR_CODE_STATE;
    for (let i = 0; i < 5; i++) state = afterWrongCode(state, T0);
    assert.equal(codeLockRemaining(state, T0 + 30 * MIN), 0);
    const next = afterWrongCode(state, T0 + 31 * MIN);
    assert.deepEqual(next, { wrong: 1, lockedUntil: 0 });
  });

  test("a missing code state counts as open with no wrong attempts", () => {
    assert.equal(codeLockRemaining(undefined, T0), 0);
    assert.equal(codeLockRemaining(null, T0), 0);
    assert.deepEqual(afterWrongCode(null, T0), { wrong: 1, lockedUntil: 0 });
  });
});
