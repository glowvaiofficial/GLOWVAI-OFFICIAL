import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOCK_SLACK_MS,
  collectOrderEvents,
  eventsForChange,
  messageFor,
  sanitizeReason,
  serverDelay,
  snapshotOrder,
  withOrderMarked,
  type OrderSnapshot,
  type SeenOrders,
} from './orderEvents';

const NOW = 1_800_000_000_000;

const order = (overrides: Record<string, unknown> = {}) => ({
  orderId: 'GV-260101-AAAAAA',
  status: 'PLACED',
  cancellationReason: null,
  createdAt: NOW,
  payment: { method: 'COD', status: 'PENDING' },
  pricing: { grandTotal: 499.4 },
  ...overrides,
});

const snap = (overrides: Partial<OrderSnapshot> = {}): OrderSnapshot => ({
  orderId: 'GV-1',
  status: 'PLACED',
  paymentStatus: 'PENDING',
  paymentMethod: 'COD',
  delayed: false,
  createdAt: NOW,
  amount: 499,
  reason: null,
  ...overrides,
});

const seenWith = (orders: SeenOrders['orders'], baselineAt = NOW - 60_000): SeenOrders => ({ baselineAt, orders });

describe('first load is silent', () => {
  test('orders present on the first load produce no events but are recorded', () => {
    const { events, next } = collectOrderEvents([order({ status: 'DELIVERED' })], null);
    assert.deepEqual(events, []);
    assert.equal(next.orders['GV-260101-AAAAAA'].s, 'DELIVERED');
  });
});

describe('status changes', () => {
  test('a new order created after the watch started announces placed with amount', () => {
    const { events } = collectOrderEvents([order()], seenWith({}));
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'placed');
    assert.equal(events[0].amount, 499);
    const copy = messageFor(events[0]);
    assert.equal(copy.variant, 'modal');
    assert.equal(copy.amountText, '₹499');
  });

  test('an old order seen for the first time is not announced', () => {
    const { events } = collectOrderEvents([order({ createdAt: NOW - 3_600_000 })], seenWith({}));
    assert.deepEqual(events, []);
  });

  test('clock slack keeps an order placed just before the baseline', () => {
    const { events } = collectOrderEvents([order({ createdAt: NOW - CLOCK_SLACK_MS + 1000 })], seenWith({}));
    assert.equal(events[0]?.kind, 'placed');
  });

  test('accepted, packed, out for delivery map to toasts', () => {
    const prev = { s: 'PLACED', p: 'PENDING', m: 'COD', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'VENDOR_ACCEPTED' }), false), ['accepted']);
    assert.deepEqual(eventsForChange({ ...prev, s: 'VENDOR_ACCEPTED' }, snap({ status: 'PACKED' }), false), ['packed']);
    assert.deepEqual(eventsForChange({ ...prev, s: 'PACKED' }, snap({ status: 'OUT_FOR_DELIVERY' }), false), ['out_for_delivery']);
    assert.equal(messageFor({ kind: 'accepted', orderId: 'GV-1', amount: null, reason: null }).variant, 'toast');
  });

  test('delivered and cancelled are modals', () => {
    const prev = { s: 'PACKED', p: 'PENDING', m: 'COD', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'DELIVERED' }), false), ['delivered']);
    assert.deepEqual(eventsForChange(prev, snap({ status: 'CANCELLED' }), false), ['cancelled']);
    assert.equal(messageFor({ kind: 'delivered', orderId: 'GV-1', amount: null, reason: null }).variant, 'modal');
    assert.equal(messageFor({ kind: 'cancelled', orderId: 'GV-1', amount: null, reason: null }).variant, 'modal');
  });

  test('an unchanged status produces nothing', () => {
    const prev = { s: 'PACKED', p: 'PENDING', m: 'COD', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'PACKED' }), false), []);
  });

  test('cancellation reason is passed through as text and kept short', () => {
    const { events } = collectOrderEvents([order({ status: 'CANCELLED', cancellationReason: '  Out   of stock\n here ' })], seenWith({ [ 'GV-260101-AAAAAA' ]: { s: 'PLACED', p: 'PENDING', m: 'COD', d: false } }));
    assert.equal(events[0].kind, 'cancelled');
    assert.equal(events[0].reason, 'Out of stock here');
    assert.equal(messageFor(events[0]).body, 'Reason: Out of stock here');
  });

  test('a cancellation without a reason uses fixed copy', () => {
    const copy = messageFor({ kind: 'cancelled', orderId: 'GV-1', amount: null, reason: null });
    assert.equal(copy.body, 'This order was cancelled and will not be delivered.');
  });
});

describe('payment', () => {
  test('payment pending is a toast on change but not on first sight', () => {
    assert.deepEqual(eventsForChange(null, snap({ status: 'PAYMENT_PENDING', paymentMethod: 'ONLINE' }), true), []);
    const prev = { s: 'PLACED', p: 'PENDING', m: 'ONLINE', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'PAYMENT_PENDING', paymentMethod: 'ONLINE' }), false), ['payment_pending']);
  });

  test('online payment confirmed moves from pending to placed', () => {
    const prev = { s: 'PAYMENT_PENDING', p: 'PENDING', m: 'ONLINE', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'PLACED', paymentMethod: 'ONLINE', paymentStatus: 'PAID' }), false), ['placed']);
  });

  test('payment failure is announced once when it first appears', () => {
    const prev = { s: 'PAYMENT_PENDING', p: 'PENDING', m: 'ONLINE', d: false };
    const failed = snap({ status: 'PAYMENT_PENDING', paymentMethod: 'ONLINE', paymentStatus: 'FAILED' });
    assert.deepEqual(eventsForChange(prev, failed, false), ['payment_failed']);
    assert.deepEqual(eventsForChange({ ...prev, p: 'FAILED' }, failed, false), []);
  });

  test('payment failure is ignored for cash on delivery', () => {
    const prev = { s: 'PLACED', p: 'PENDING', m: 'COD', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ paymentMethod: 'COD', paymentStatus: 'FAILED' }), false), []);
  });
});

describe('delay', () => {
  test('no delay field from the server means no delay message', () => {
    const { events } = collectOrderEvents([order({ status: 'VENDOR_ACCEPTED', createdAt: NOW - 7_200_000 })], seenWith({ 'GV-260101-AAAAAA': { s: 'PLACED', p: 'PENDING', m: 'COD', d: false } }));
    assert.deepEqual(events.map((e) => e.kind), ['accepted']);
  });

  test('old timestamps never count as a delay', () => {
    assert.equal(serverDelay({ createdAt: NOW - 86_400_000, updatedAt: NOW - 86_400_000 } as never), false);
  });

  test('a server delay flag raises one delay message', () => {
    assert.equal(serverDelay({ delay: true } as never), true);
    assert.equal(serverDelay({ delay: { active: true } } as never), true);
    const prev = { s: 'PACKED', p: 'PENDING', m: 'COD', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'PACKED', delayed: true }), false), ['delayed']);
    assert.deepEqual(eventsForChange({ ...prev, d: true }, snap({ status: 'PACKED', delayed: true }), false), []);
  });

  test('a delay flag on a delivered order is ignored', () => {
    const prev = { s: 'PACKED', p: 'PENDING', m: 'COD', d: false };
    assert.deepEqual(eventsForChange(prev, snap({ status: 'DELIVERED', delayed: true }), false), ['delivered']);
  });
});

describe('snapshot and copy', () => {
  test('snapshot reads only the fields it needs and rounds the amount', () => {
    const s = snapshotOrder(order({ status: 'packed' }) as never);
    assert.equal(s.status, 'PACKED');
    assert.equal(s.amount, 499);
    assert.equal(s.delayed, false);
  });

  test('sanitizeReason rejects non-strings and blanks', () => {
    assert.equal(sanitizeReason(42), null);
    assert.equal(sanitizeReason('   '), null);
    assert.equal(sanitizeReason('x'.repeat(500))?.length, 200);
  });

  test('copy never shows internal status codes', () => {
    const kinds = ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'payment_pending', 'payment_failed', 'delayed'] as const;
    for (const kind of kinds) {
      const copy = messageFor({ kind, orderId: 'GV-1', amount: 100, reason: null });
      const text = `${copy.title} ${copy.body}`;
      assert.doesNotMatch(text, /[A-Z]{4,}_[A-Z_]+/, `${kind} copy leaks a code`);
    }
  });
});

describe('withOrderMarked', () => {
  test('creates a record with the current time as baseline when none exists', () => {
    const next = withOrderMarked(null, 'GV-9', 'placed', NOW);
    assert.equal(next.baselineAt, NOW);
    assert.deepEqual(next.orders['GV-9'], { s: 'PLACED', p: '', m: '', d: false });
  });

  test('keeps the existing baseline and other orders', () => {
    const base = seenWith({ 'GV-1': { s: 'PACKED', p: 'PENDING', m: 'COD', d: false } }, NOW - 500);
    const next = withOrderMarked(base, 'GV-2', 'PLACED', NOW);
    assert.equal(next.baselineAt, NOW - 500);
    assert.equal(next.orders['GV-1'].s, 'PACKED');
    assert.equal(next.orders['GV-2'].s, 'PLACED');
  });

  test('a marked order is not announced again on the next poll', () => {
    const marked = withOrderMarked(seenWith({}), 'GV-260101-0002', 'PLACED', NOW);
    const { events } = collectOrderEvents([order({ orderId: 'GV-260101-0002', createdAt: NOW })], marked);
    assert.deepEqual(events, []);
  });
});
