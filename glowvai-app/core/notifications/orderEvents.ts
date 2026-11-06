// Pure rules for order messages: what changed between the last seen order and the one the server returned now, and
// the words shown for it. No browser or Firebase imports, so the rules can be tested on their own.
//
// Only fields the server already returns from GET /api/shop/orders are used. Nothing here is inferred from
// timestamps: a delay is shown only when the server sends a `delay` field that says so (see serverDelay).

export type OrderEventKind =
  | 'placed'
  | 'accepted'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'payment_pending'
  | 'payment_failed'
  | 'delayed';

export interface OrderEvent {
  kind: OrderEventKind;
  orderId: string;
  amount: number | null;
  reason: string | null;
}

// The parts of an order the notifier compares. Upper-cased codes are internal; they never reach the screen.
export interface OrderSnapshot {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  delayed: boolean;
  createdAt: number;
  amount: number | null;
  reason: string | null;
  orderId: string;
}

// What is kept on the device per order between polls (no names, phone numbers or addresses).
export interface StoredOrderState {
  s: string;
  p: string;
  m: string;
  d: boolean;
}

export interface SeenOrders {
  baselineAt: number;
  orders: Record<string, StoredOrderState>;
}

// Orders created this long before the first record are still treated as new. This covers a device clock that runs
// behind the server's clock, so a fresh order is not missed.
export const CLOCK_SLACK_MS = 2 * 60 * 1000;

const MAX_REASON_LENGTH = 200;

interface ServerOrderLike {
  orderId?: unknown;
  status?: unknown;
  cancellationReason?: unknown;
  createdAt?: unknown;
  payment?: { method?: unknown; status?: unknown } | null;
  pricing?: { grandTotal?: unknown } | null;
  delay?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The reason the server gives for a cancellation, as plain text and kept short.
export const sanitizeReason = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > MAX_REASON_LENGTH ? `${text.slice(0, MAX_REASON_LENGTH - 1)}…` : text;
};

// Delay hook. The server does not send a delay today, so this returns false for every order. When it does, it must
// send `delay: true` or `delay: { active: true }` on the order. Timestamps never count as a delay.
export const serverDelay = (order: ServerOrderLike): boolean => {
  const raw = order.delay;
  return raw === true || (isRecord(raw) && raw.active === true);
};

export const snapshotOrder = (order: ServerOrderLike & { orderId: string }): OrderSnapshot => {
  const grandTotal = Number(order.pricing?.grandTotal);
  return {
    orderId: order.orderId,
    status: String(order.status ?? '').toUpperCase(),
    paymentStatus: String(order.payment?.status ?? '').toUpperCase(),
    paymentMethod: String(order.payment?.method ?? 'COD').toUpperCase(),
    delayed: serverDelay(order),
    createdAt: Number(order.createdAt) || 0,
    amount: Number.isFinite(grandTotal) && grandTotal > 0 ? Math.round(grandTotal) : null,
    reason: sanitizeReason(order.cancellationReason),
  };
};

// Which message a status change produces. Statuses not listed here produce no message.
const STATUS_EVENTS: Record<string, OrderEventKind> = {
  PLACED: 'placed',
  VENDOR_ACCEPTED: 'accepted',
  PACKED: 'packed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DISPATCHED: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  VENDOR_REJECTED: 'cancelled',
  PAYMENT_PENDING: 'payment_pending',
};

const ACTIVE_STATUSES = new Set(['PLACED', 'PAYMENT_PENDING', 'VENDOR_ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DISPATCHED']);

// Works out the messages for one order. `prev` is null when the order has not been seen on this device before;
// `isNew` says it was created after the device started watching, so its current state is news. Older orders seen for
// the first time are recorded without a message.
export const eventsForChange = (prev: StoredOrderState | null, next: OrderSnapshot, isNew: boolean): OrderEventKind[] => {
  if (!prev && !isNew) return [];
  const out: OrderEventKind[] = [];

  if (!prev) {
    const kind = STATUS_EVENTS[next.status];
    // Payment pending is not announced for an order the customer has only just started paying for.
    if (kind && kind !== 'payment_pending') out.push(kind);
  } else if (next.status !== prev.s) {
    const kind = STATUS_EVENTS[next.status];
    if (kind) out.push(kind);
  }

  const wasFailed = prev?.p === 'FAILED';
  if (
    next.paymentMethod === 'ONLINE' &&
    next.paymentStatus === 'FAILED' &&
    !wasFailed &&
    next.status !== 'CANCELLED' &&
    next.status !== 'VENDOR_REJECTED' &&
    next.status !== 'DELIVERED'
  ) {
    out.push('payment_failed');
  }

  if (next.delayed && !prev?.d && ACTIVE_STATUSES.has(next.status)) out.push('delayed');

  return out;
};

const toStored = (next: OrderSnapshot): StoredOrderState => ({
  s: next.status,
  p: next.paymentStatus,
  m: next.paymentMethod,
  d: next.delayed,
});

// Compares every order returned now with what was seen before. Returns the events and the new record to keep.
export const collectOrderEvents = (
  orders: ServerOrderLike[],
  seen: SeenOrders | null,
): { events: OrderEvent[]; next: SeenOrders } => {
  const events: OrderEvent[] = [];
  const nextOrders: Record<string, StoredOrderState> = {};
  const baselineAt = seen?.baselineAt ?? Date.now();

  for (const raw of orders) {
    if (typeof raw.orderId !== 'string' || !raw.orderId) continue;
    const snapshot = snapshotOrder({ ...raw, orderId: raw.orderId });
    const prev = seen?.orders[snapshot.orderId] ?? null;
    // With no earlier record (first load on this device) nothing is announced.
    if (!seen) {
      nextOrders[snapshot.orderId] = toStored(snapshot);
      continue;
    }
    const isNew = !prev && snapshot.createdAt >= baselineAt - CLOCK_SLACK_MS;
    for (const kind of eventsForChange(prev, snapshot, isNew)) {
      events.push({ kind, orderId: snapshot.orderId, amount: snapshot.amount, reason: snapshot.reason });
    }
    nextOrders[snapshot.orderId] = toStored(snapshot);
  }

  return { events, next: { baselineAt, orders: nextOrders } };
};

export const formatAmount = (amount: number): string => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// Modal events are the important ones; everything else is a top toast.
export const isModalEvent = (kind: OrderEventKind): boolean => kind === 'placed' || kind === 'cancelled' || kind === 'delivered';

export type MessageTone = 'info' | 'success' | 'warning' | 'danger';

export interface OrderMessageCopy {
  kind: OrderEventKind;
  variant: 'toast' | 'modal';
  tone: MessageTone;
  title: string;
  body: string;
  orderId: string;
  amountText: string | null;
}

// The words shown to the customer. Fixed copy only: no status codes and no server text beyond the cancellation reason.
export const messageFor = (event: OrderEvent): OrderMessageCopy => {
  const base = { kind: event.kind, orderId: event.orderId, variant: isModalEvent(event.kind) ? 'modal' : 'toast' } as const;
  switch (event.kind) {
    case 'placed':
      return {
        ...base,
        tone: 'success',
        title: 'Order placed',
        body: 'We have received your order. You can follow it from My orders.',
        amountText: event.amount !== null ? formatAmount(event.amount) : null,
      };
    case 'cancelled':
      return {
        ...base,
        tone: 'danger',
        title: 'Order cancelled',
        body: event.reason ? `Reason: ${event.reason}` : 'This order was cancelled and will not be delivered.',
        amountText: null,
      };
    case 'delivered':
      return {
        ...base,
        tone: 'success',
        title: 'Order delivered',
        body: 'Thank you for shopping with GlowVai.',
        amountText: null,
      };
    case 'accepted':
      return { ...base, tone: 'info', title: 'Store accepted your order', body: 'It is being prepared now.', amountText: null };
    case 'packed':
      return { ...base, tone: 'info', title: 'Packed, waiting for pickup', body: 'Your order is ready to go.', amountText: null };
    case 'out_for_delivery':
      return { ...base, tone: 'info', title: 'Out for delivery', body: 'Your order is on its way.', amountText: null };
    case 'payment_pending':
      return { ...base, tone: 'warning', title: 'Payment pending', body: 'Complete the payment to confirm your order.', amountText: null };
    case 'payment_failed':
      return { ...base, tone: 'danger', title: 'Payment failed', body: 'Your order is not confirmed yet. You can try the payment again.', amountText: null };
    case 'delayed':
      return { ...base, tone: 'warning', title: 'Your order is running late', body: 'We are on it. Thanks for your patience.', amountText: null };
  }
};
