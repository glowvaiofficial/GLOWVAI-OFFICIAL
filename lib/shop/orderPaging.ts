// Cursor paging over a customer's whole order history. The store is read newest first (createdAt desc, then order id desc),
// a batch at a time, and each batch is filtered until one page is full. The cursor is the last order returned, so a
// page never repeats an order and never skips one, whatever the filter. Pure apart from the port, so the server route
// and the tests run the same paging rules against a Firestore adapter or a stub.

import { encodeOrderCursor, matchesFilter, type OrderCursor, type OrderFilter } from "./orderHistory";

// Orders read from the store per round trip. Larger than a page so a filter that matches few orders still finishes quickly.
export const ORDER_PAGE_BATCH = 50;

export interface StoredOrderRow {
  // The order id, which is also the Firestore document id.
  orderId: string;
  createdAt: number | null;
}

export interface OrderPagingPort<R extends StoredOrderRow> {
  // Up to `size` orders of this customer only, strictly after `after` in (createdAt desc, orderId desc) order.
  // `after` null means from the newest order.
  readBatch(uid: string, after: OrderCursor | null, size: number): Promise<R[]>;
  // Customer-facing status and return flag for each row of a batch, in the same order as the rows.
  classify(rows: R[]): Promise<{ status: string; hasReturn: boolean }[]>;
}

export type ClassifiedRow<R> = R & { status: string; hasReturn: boolean };

export interface OrderPageResult<R> {
  items: ClassifiedRow<R>[];
  // Set only when more matching orders follow this page, so the last page never offers an empty "load more".
  nextCursor: string | null;
}

export async function listCustomerOrderPage<R extends StoredOrderRow>(
  port: OrderPagingPort<R>,
  uid: string,
  options: { filter: OrderFilter; limit: number; cursor: OrderCursor | null },
): Promise<OrderPageResult<R>> {
  if (!uid) throw new Error("A customer id is needed to list orders.");
  const matches: ClassifiedRow<R>[] = [];
  let after = options.cursor;
  let exhausted = false;
  // Read until one more match than a page is in hand (that extra match proves another page exists) or the store runs out.
  while (matches.length <= options.limit && !exhausted) {
    const batch = await port.readBatch(uid, after, ORDER_PAGE_BATCH);
    if (batch.length === 0) break;
    const info = await port.classify(batch);
    batch.forEach((row, i) => {
      const state = info[i];
      if (matchesFilter(state, options.filter)) matches.push({ ...row, status: state.status, hasReturn: state.hasReturn });
    });
    const last = batch[batch.length - 1];
    after = { createdAt: last.createdAt, orderId: last.orderId };
    if (batch.length < ORDER_PAGE_BATCH) exhausted = true;
  }
  const items = matches.slice(0, options.limit);
  const tail = items[items.length - 1];
  const more = matches.length > options.limit && tail !== undefined;
  return {
    items,
    nextCursor: more ? encodeOrderCursor({ createdAt: tail.createdAt, orderId: tail.orderId }) : null,
  };
}
