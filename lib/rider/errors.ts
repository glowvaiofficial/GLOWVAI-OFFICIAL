// Errors the rider API answers with as { ok: false, error, code }. `error` is a sentence that is safe to show as is.
// Internal details (Firestore paths, stack traces, the PIN, the delivery code) are never put in an error.

export class RiderError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(code: string, status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const NOT_FOUND_MESSAGE = "We could not find that delivery.";
