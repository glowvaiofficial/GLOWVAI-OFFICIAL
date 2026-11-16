import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { collectOrderEvents, type SeenOrders } from '../../glowvai-app/core/notifications/orderEvents';

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

describe('first load of a session is silent', () => {
  const seenPlaced: SeenOrders = { baselineAt: NOW - 86_400_000, orders: { 'GV-260101-AAAAAA': { s: 'PLACED', p: 'PENDING', m: 'COD', d: false } } };

  test('an order cancelled while the site was closed is not announced when announce is false', () => {
    const { events, next } = collectOrderEvents([order({ status: 'CANCELLED', cancellationReason: 'Ordered by mistake' })], seenPlaced, false);
    assert.deepEqual(events, []);
    assert.equal(next.orders['GV-260101-AAAAAA'].s, 'CANCELLED');
  });

  test('an unseen recent order is not announced on the silent load, and is recorded', () => {
    const { events, next } = collectOrderEvents([order({ orderId: 'GV-NEW' })], seenPlaced, false);
    assert.deepEqual(events, []);
    assert.ok(next.orders['GV-NEW']);
  });

  test('after the silent load, a cancel in the same session is announced once', () => {
    const first = collectOrderEvents([order({ status: 'PLACED' })], seenPlaced, false);
    const second = collectOrderEvents([order({ status: 'CANCELLED', cancellationReason: 'x' })], first.next, true);
    assert.deepEqual(second.events.map((e) => e.kind), ['cancelled']);
    const third = collectOrderEvents([order({ status: 'CANCELLED', cancellationReason: 'x' })], second.next, true);
    assert.deepEqual(third.events, []);
  });
});
