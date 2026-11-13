import { NextRequest } from "next/server";
import { FieldPath, type DocumentData } from "firebase-admin/firestore";
import { customerFrom, db, json, limitByIp } from "@/lib/shop/server";
import { customerStatus } from "@/lib/shop/orderHistory";
import { listCustomerOrderPage, type OrderPagingPort, type StoredOrderRow } from "@/lib/shop/orderPaging";
import { toMillis } from "@/lib/shop/orderState";
import { catalogViewOf, type CatalogView } from "@/lib/shop/reorder";
import { REORDER_RAIL_ORDERS, reorderProductIds, reorderRailItems } from "@/lib/shop/reorderRail";

export const dynamic = "force-dynamic";

// "Buy it again" for the signed-in customer: up to six distinct products from their last six orders (cancelled ones left
// out), with today's name, price and picture. Read only. Limit: 60 requests a minute per IP address.
export async function GET(req: NextRequest) {
  const limited = limitByIp(req, "reorder-items", 60);
  if (limited) return limited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);

  const store = db();
  type Row = StoredOrderRow & { data: DocumentData };
  // The same paging helper and status rules as the orders page, read for this customer only.
  const port: OrderPagingPort<Row> = {
    async readBatch(uid, after, size) {
      let query = store.collection("orders").where("userId", "==", uid).orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
      if (after) query = query.startAfter(after.createdAt, after.orderId);
      const snap = await query.limit(size).get();
      return snap.docs.map((d) => ({ orderId: d.id, createdAt: toMillis(d.data().createdAt), data: d.data() }));
    },
    async classify(rows) {
      const overlays = await store.getAll(...rows.map((r) => store.collection("admin_orders").doc(r.orderId)));
      return rows.map((r, i) => {
        const overlay = overlays[i]?.exists ? (overlays[i].data() as Record<string, unknown>) : undefined;
        return { status: customerStatus(String(r.data.status ?? ""), overlay), hasReturn: false };
      });
    },
  };
  const page = await listCustomerOrderPage(port, customer.uid, { filter: "all", limit: REORDER_RAIL_ORDERS, cursor: null });
  const ids = reorderProductIds(
    page.items.map((row) => ({ userId: row.data.userId, status: row.status, items: Array.isArray(row.data.items) ? row.data.items : [] })),
    customer.uid,
  );

  const catalog = new Map<string, CatalogView | null>();
  if (ids.length) {
    const snaps = await store.getAll(...ids.map((pid) => store.collection("products").doc(pid)));
    for (const snap of snaps) catalog.set(snap.id, catalogViewOf(snap.id, snap.exists ? (snap.data() as Record<string, unknown>) : undefined));
  }

  const res = json({ ok: true, items: reorderRailItems(ids, catalog) });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
