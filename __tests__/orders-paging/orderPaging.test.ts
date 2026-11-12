import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { compareNewestFirst, decodeOrderCursor, encodeOrderCursor, type OrderCursor, type OrderFilter } from "../../lib/shop/orderHistory";
import { ORDER_PAGE_BATCH, listCustomerOrderPage, type OrderPagingPort, type StoredOrderRow } from "../../lib/shop/orderPaging";

// A stub of the orders collection: rows carry the owner, the shop status and the return flag, and readBatch behaves like
// the Firestore query in app/api/shop/orders/route.ts (owner match, createdAt desc then id desc, strictly after the cursor).
interface StubOrder extends StoredOrderRow {
  userId: string;
  status: string;
  hasReturn: boolean;
}

function stubStore(orders: StubOrder[]) {
  const reads: { uid: string; after: OrderCursor | null; size: number }[] = [];
  const port: OrderPagingPort<StubOrder> = {
    async readBatch(uid, after, size) {
      reads.push({ uid, after, size });
      const rows = orders
        .filter((o) => o.userId === uid)
        .sort((a, b) => compareNewestFirst(a, b))
        .filter((o) => !after || compareNewestFirst(o, after) > 0);
      return rows.slice(0, size);
    },
    async classify(rows) {
      return rows.map((r) => ({ status: r.status, hasReturn: r.hasReturn }));
    },
  };
  return { port, reads };
}

// Newest first with ties broken by id, the same total order the store uses.
const expectedOrder = (orders: StubOrder[]) => [...orders].sort((a, b) => compareNewestFirst(a, b)).map((o) => o.orderId);

// Walks every page for one customer and returns the pages.
async function walk(port: OrderPagingPort<StubOrder>, uid: string, filter: OrderFilter, limit: number) {
  const pages: string[][] = [];
  let cursor: OrderCursor | null = null;
  for (let guard = 0; guard < 1000; guard++) {
    const page = await listCustomerOrderPage(port, uid, { filter, limit, cursor });
    pages.push(page.items.map((i) => i.orderId));
    if (!page.nextCursor) return pages;
    const decoded = decodeOrderCursor(page.nextCursor);
    assert.notEqual(decoded, "invalid");
    cursor = decoded as OrderCursor;
  }
  throw new Error("paging did not end");
}

// Builds orders for one customer. Every third order shares a timestamp with its neighbour, so ties are covered.
function ordersFor(uid: string, count: number, prefix = "GV"): StubOrder[] {
  return Array.from({ length: count }, (_, i) => ({
    orderId: `${prefix}-${String(i).padStart(4, "0")}`,
    userId: uid,
    createdAt: 1_700_000_000_000 + Math.floor(i / 2) * 60_000,
    status: i % 4 === 0 ? "DELIVERED" : i % 7 === 0 ? "CANCELLED" : "PLACED",
    hasReturn: i % 5 === 0,
  }));
}

describe("order history cursor paging", () => {
  test("three pages of 20, 20 and 10 cover every order once, in order, with no next cursor at the end", async () => {
    const orders = ordersFor("u1", 50);
    const { port } = stubStore(orders);
    const pages = await walk(port, "u1", "all", 20);
    assert.deepEqual(pages.map((p) => p.length), [20, 20, 10]);
    const flat = pages.flat();
    assert.equal(new Set(flat).size, flat.length, "no order appears twice");
    assert.deepEqual(flat, expectedOrder(orders), "no order is skipped and the order is newest first");
  });

  test("walks past the first store batch without gaps or repeats", async () => {
    const orders = ordersFor("u1", ORDER_PAGE_BATCH * 2 + 30);
    const { port, reads } = stubStore(orders);
    const pages = await walk(port, "u1", "all", 20);
    const flat = pages.flat();
    assert.equal(flat.length, orders.length);
    assert.equal(new Set(flat).size, orders.length);
    assert.deepEqual(flat, expectedOrder(orders));
    assert.ok(reads.length > 3, "more than one store read was needed");
    assert.ok(reads.every((r) => r.size === ORDER_PAGE_BATCH), "every read asks the store for one batch");
  });

  test("a filter pages through only the matching orders, with no duplicates or gaps", async () => {
    const orders = ordersFor("u1", 61);
    const { port } = stubStore(orders);
    const delivered = expectedOrder(orders.filter((o) => o.status === "DELIVERED"));
    const pages = await walk(port, "u1", "delivered", 7);
    const flat = pages.flat();
    assert.deepEqual(flat, delivered);
    assert.equal(new Set(flat).size, flat.length);
    assert.ok(pages.slice(0, -1).every((p) => p.length === 7), "every page but the last is full");
  });

  test("the returns filter pages through orders with a return request", async () => {
    const orders = ordersFor("u1", 45);
    const { port } = stubStore(orders);
    const flat = (await walk(port, "u1", "returns", 4)).flat();
    assert.deepEqual(flat, expectedOrder(orders.filter((o) => o.hasReturn)));
  });

  test("a customer only ever sees their own orders", async () => {
    const mine = ordersFor("u1", 33, "MINE");
    const theirs = ordersFor("u2", 40, "THEIRS");
    const { port } = stubStore([...mine, ...theirs]);
    const flat = (await walk(port, "u1", "all", 20)).flat();
    assert.deepEqual(flat, expectedOrder(mine));
    assert.ok(flat.every((id) => id.startsWith("MINE")));
    const other = (await walk(port, "u2", "all", 20)).flat();
    assert.ok(other.every((id) => id.startsWith("THEIRS")));
    await assert.rejects(() => listCustomerOrderPage(port, "", { filter: "all", limit: 20, cursor: null }));
  });

  test("an empty history gives one empty page and no next cursor", async () => {
    const { port, reads } = stubStore([]);
    const page = await listCustomerOrderPage(port, "nobody", { filter: "all", limit: 20, cursor: null });
    assert.deepEqual(page, { items: [], nextCursor: null });
    assert.equal(reads.length, 1);
  });

  test("a page that exactly fills gives no next cursor, and one more order gives a cursor", async () => {
    const twenty = stubStore(ordersFor("u1", 20)).port;
    const full = await listCustomerOrderPage(twenty, "u1", { filter: "all", limit: 20, cursor: null });
    assert.equal(full.items.length, 20);
    assert.equal(full.nextCursor, null);

    const twentyOne = stubStore(ordersFor("u1", 21)).port;
    const first = await listCustomerOrderPage(twentyOne, "u1", { filter: "all", limit: 20, cursor: null });
    assert.ok(first.nextCursor);
    const second = await listCustomerOrderPage(twentyOne, "u1", { filter: "all", limit: 20, cursor: decodeOrderCursor(first.nextCursor) as OrderCursor });
    assert.equal(second.items.length, 1);
    assert.equal(second.nextCursor, null);
  });

  test("a malformed or tampered cursor is refused", () => {
    assert.equal(decodeOrderCursor("not a cursor!"), "invalid");
    assert.equal(decodeOrderCursor("W1,Im9rZCBpZCJd"), "invalid");
    assert.equal(decodeOrderCursor(Buffer.from(JSON.stringify([1, "bad id!"])).toString("base64url")), "invalid");
    assert.equal(decodeOrderCursor(Buffer.from(JSON.stringify(["x", "GV-1"])).toString("base64url")), "invalid");
    assert.equal(decodeOrderCursor("x".repeat(301)), "invalid");
    assert.equal(decodeOrderCursor(null), null);
    assert.deepEqual(decodeOrderCursor(encodeOrderCursor({ createdAt: 5, orderId: "GV-1" })), { createdAt: 5, orderId: "GV-1" });
  });
});
