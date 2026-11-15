// What the payment screen does when the verify call after Razorpay Checkout does not answer cleanly. Money may already
// have been taken (Razorpay confirms it to the server by webhook too), so a lost answer must not be shown as a failed
// payment: verify is retried, then the order itself is read. Pure and dependency-injected, so it is unit tested.

export type VerifyAnswer = { ok: boolean; status: number; orderId: string | null; error: string | null };
export type OrderStatusAnswer = { ok: boolean; status: number; orderStatus: string | null };

export type RecheckOutcome =
  // The payment is confirmed: clear the bag and show the order.
  | { kind: 'placed'; orderId: string }
  // Not confirmed yet (still waiting, or the order could not be read): keep the bag, but tell the customer to check
  // their orders before paying again. A retry of the same bag reuses this order and its Razorpay order, so a second
  // payment is refused by Razorpay if the first went through.
  | { kind: 'unconfirmed'; message: string }
  // The server answered that the payment was not accepted (or the order was closed): keep the bag.
  | { kind: 'failed'; message: string };

export const UNCONFIRMED_MESSAGE =
  'We could not confirm your payment yet. If money was taken, your order will be confirmed automatically in a few minutes. Check My orders before paying again.';
const FAILED_FALLBACK = 'The payment could not be confirmed.';

// A verify answer worth retrying: no answer at all (network), or a server error. A 4xx is the server's real answer.
export const verifyIsRetryable = (status: number): boolean => status === 0 || status >= 500;

// The order statuses that mean the payment was confirmed and the order placed.
const NOT_PLACED = new Set(['PAYMENT_PENDING', 'CANCELLED', '']);
export function outcomeFromOrderStatus(orderId: string, answer: OrderStatusAnswer): RecheckOutcome {
  if (!answer.ok) return { kind: 'unconfirmed', message: UNCONFIRMED_MESSAGE };
  const status = String(answer.orderStatus ?? '').toUpperCase();
  if (!NOT_PLACED.has(status)) return { kind: 'placed', orderId };
  if (status === 'CANCELLED') return { kind: 'failed', message: 'This order was closed before the payment was confirmed. If money was taken, the order will be confirmed automatically or the money refunded.' };
  return { kind: 'unconfirmed', message: UNCONFIRMED_MESSAGE };
}

export async function confirmPayment(
  orderId: string,
  deps: {
    verify: () => Promise<VerifyAnswer>;
    readOrderStatus: (orderId: string) => Promise<OrderStatusAnswer>;
    wait: (ms: number) => Promise<void>;
    retryDelaysMs?: number[];
  },
): Promise<RecheckOutcome> {
  const delays = deps.retryDelaysMs ?? [1500, 3000];
  let answer = await deps.verify();
  for (let i = 0; !answer.ok && verifyIsRetryable(answer.status) && i < delays.length; i++) {
    await deps.wait(delays[i]);
    answer = await deps.verify();
  }
  if (answer.ok && answer.orderId) return { kind: 'placed', orderId: answer.orderId };
  // The server refused the payment (for example the signature did not match): that is its real answer.
  if (!answer.ok && !verifyIsRetryable(answer.status)) return { kind: 'failed', message: answer.error || FAILED_FALLBACK };
  // No clean answer: the order itself says whether the payment was confirmed (verify or the webhook).
  return outcomeFromOrderStatus(orderId, await deps.readOrderStatus(orderId));
}
