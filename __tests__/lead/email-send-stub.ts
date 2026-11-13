// Test-only stand-in for lib/email/send. The real module pulls in JSX email templates that the test loader cannot run.
// The route only queues email, so a no-op that records the call is enough. Nothing is sent.
export const queued: unknown[] = [];

export function queueEmail(options: unknown): void {
  queued.push(options);
}
