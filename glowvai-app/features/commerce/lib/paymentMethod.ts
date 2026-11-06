// Payment method rules for checkout. Pure functions only (no imports), so the same logic runs in the screens and in
// the node tests under __tests__/checkout.

// The customer's choice: cash on delivery, or online through Razorpay (UPI, card, netbanking, wallet).
export type PayMethod = 'cod' | 'online';

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  cod: 'Cash on delivery',
  online: 'UPI / card / netbanking via Razorpay',
};

// Reads a method from navigation params or stored state. Anything else is null, so callers fail closed.
export const parsePayMethod = (value: unknown): PayMethod | null => (value === 'cod' || value === 'online' ? value : null);

// The value the shop server expects in POST /api/shop/orders.
export const toApiPaymentMethod = (method: PayMethod): 'COD' | 'ONLINE' => (method === 'online' ? 'ONLINE' : 'COD');

// The shape of the shop server's reply to POST /api/shop/orders (only the parts the decision needs).
export interface PlaceOrderOutcome<P> {
  ok: boolean;
  error?: string | null;
  data?: {
    orderId?: string;
    payment?: P;
    pricing?: { grandTotal?: number };
  } | null;
}

export type PlacementDecision<P> =
  // Online: the server created a Razorpay order; the customer still has to pay before the order is placed.
  | { kind: 'razorpay'; orderId: string; payment: P }
  // Cash on delivery: the order is placed.
  | { kind: 'placed'; orderId: string; total?: number }
  // Anything else. For an online choice this includes a server reply without a payment, which is never a success.
  | { kind: 'failed'; error: string };

const FAILED_MESSAGE = 'The order could not be placed. Try again.';
const ONLINE_NOT_STARTED = 'The payment could not be started. Nothing was charged.';

// Decides what the screen does with the server reply for the method the customer chose.
export const decidePlacement = <P extends { amount: number }>(method: PayMethod, result: PlaceOrderOutcome<P>): PlacementDecision<P> => {
  if (!result.ok) return { kind: 'failed', error: result.error || FAILED_MESSAGE };
  const orderId = result.data?.orderId;
  if (method === 'online') {
    const payment = result.data?.payment;
    if (!orderId || !payment) return { kind: 'failed', error: ONLINE_NOT_STARTED };
    return { kind: 'razorpay', orderId, payment };
  }
  if (!orderId) return { kind: 'failed', error: FAILED_MESSAGE };
  return { kind: 'placed', orderId, total: result.data?.pricing?.grandTotal };
};
