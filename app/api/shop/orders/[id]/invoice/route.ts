import { NextRequest } from "next/server";
import { customerFrom, db, json, limitByIp, limitByUser } from "@/lib/shop/server";
import { ORDER_ID_PATTERN, type Doc } from "@/lib/shop/orderState";
import { buildInvoice, renderInvoiceHtml, sellerFromEnv } from "@/lib/shop/invoice";

export const dynamic = "force-dynamic";

// The printable invoice of a delivered order, as HTML. Only the owner gets it. The customer prints it or saves it as a PDF
// from the browser. The page is served with a no-script policy and every value escaped.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "invoice", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  // Twenty invoices an hour per customer.
  const userLimited = limitByUser(customer.uid, "invoice", 20, 60 * 60 * 1000);
  if (userLimited) return userLimited;

  const { id } = await params;
  if (!ORDER_ID_PATTERN.test(id)) return json({ ok: false, error: "Order not found." }, 404);
  const store = db();
  const [orderSnap, overlaySnap] = await store.getAll(store.collection("orders").doc(id), store.collection("admin_orders").doc(id));
  const order = orderSnap.data() as Doc | undefined;
  if (!orderSnap.exists || !order || order.userId !== customer.uid) return json({ ok: false, error: "Order not found." }, 404);
  const overlay = overlaySnap.exists ? (overlaySnap.data() as Doc) : null;

  const invoice = buildInvoice(order, overlay, sellerFromEnv(process.env));
  if (!invoice) return json({ ok: false, error: "An invoice is available once the order is delivered." }, 409);

  return new Response(renderInvoiceHtml(invoice), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}
