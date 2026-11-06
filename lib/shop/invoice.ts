// Printable invoice for a delivered order: the figures from the order's own bill, and an HTML page that escapes every value.
// Pure functions (no server imports). The route checks ownership and the order state; this file never invents a tax rate:
// taxes appear only when the order carries a tax amount, and the GST number only when the order carries one.
import { deliveredAtOf, isCancelled, isDelivered, orderLines, toMillis, type Doc } from "./orderState";

export interface InvoiceSeller {
  name: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  email?: string;
}

// Legal details come from server environment variables. Anything not set is left out of the invoice.
export function sellerFromEnv(env: Record<string, string | undefined>): InvoiceSeller {
  const pick = (key: string): string | undefined => {
    const value = (env[key] ?? "").trim();
    return value && value.length <= 200 ? value : undefined;
  };
  const seller: InvoiceSeller = { name: "GlowVai" };
  const legalName = pick("GLOWVAI_LEGAL_NAME");
  const gstin = pick("GLOWVAI_GSTIN");
  const pan = pick("GLOWVAI_PAN");
  const address = pick("GLOWVAI_REGISTERED_ADDRESS");
  const email = pick("GLOWVAI_SUPPORT_EMAIL");
  if (legalName) seller.legalName = legalName;
  if (gstin) seller.gstin = gstin;
  if (pan) seller.pan = pan;
  if (address) seller.address = address;
  if (email) seller.email = email;
  return seller;
}

export interface InvoiceLine {
  title: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceModel {
  orderNumber: string;
  orderDate: string | null;
  deliveredDate: string | null;
  seller: InvoiceSeller;
  buyer: { name: string; address: string } | null;
  // The customer's GST number, only when the order carries one.
  buyerGstin: string | null;
  lines: InvoiceLine[];
  totals: {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    // A tip for the delivery partner. Shown as a tip, never as a tax.
    tip: number;
    // Only when the order carries a tax amount; null otherwise.
    taxes: number | null;
    beautyProtection: number;
    coinsRedeemed: number;
    grandTotal: number;
  };
  // False when the recorded total does not add up from the recorded parts (shown as recorded, with a note).
  totalsAddUp: boolean;
  payment: { method: string; transactionId: string | null };
}

const GSTIN = /^[0-9A-Z]{15}$/;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const dateText = (ms: number | null): string | null =>
  ms === null
    ? null
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(ms));

// Builds the invoice model for a delivered order. Null when the order is not delivered (or was cancelled).
export function buildInvoice(order: Doc, overlay: Doc | null | undefined, seller: InvoiceSeller): InvoiceModel | null {
  if (isCancelled(order, overlay) || !isDelivered(order, overlay)) return null;
  const pricing = (order.pricing ?? {}) as Doc;
  const payment = (order.payment ?? {}) as Doc;
  const address = (order.shippingAddress ?? {}) as Doc;

  const lines: InvoiceLine[] = orderLines(order).map((l) => {
    const raw = (Array.isArray(order.items) ? order.items : []).find((it) => String((it as Doc)?.productId ?? "") === l.productId) as Doc | undefined;
    return {
      title: l.title,
      brand: String(raw?.brand ?? ""),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: num(l.unitPrice * l.quantity),
    };
  });
  const itemSum = lines.reduce((s, l) => s + l.lineTotal, 0);
  const subtotal = pricing.subtotal !== undefined ? num(pricing.subtotal) : pricing.itemTotal !== undefined ? num(pricing.itemTotal) : num(itemSum);
  const discount = num(pricing.discountAmount);
  const deliveryFee = num(pricing.deliveryFee);
  const tip = num(pricing.tip);
  const beautyProtection = num(pricing.beautyProtectionTotal);
  const coinsRedeemed = num(pricing.coinsRedeemed);
  const taxRaw = pricing.taxAmount ?? pricing.tax;
  const taxes = typeof taxRaw === "number" && Number.isFinite(taxRaw) && taxRaw >= 0 ? num(taxRaw) : null;
  const grandTotal = num(pricing.grandTotal);
  const expected = subtotal - discount - coinsRedeemed + deliveryFee + tip + beautyProtection + (taxes ?? 0);
  const totalsAddUp = Math.abs(expected - grandTotal) < 1;

  const gstRaw = String(order.gstin ?? order.gstNumber ?? (order.billing as Doc | undefined)?.gstin ?? "").trim().toUpperCase();
  const buyerAddress = [address.fullAddress, address.landmark, address.area, address.city, address.pincode]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const buyerName = String(address.recipientName ?? order.customerName ?? "").trim();
  const method = String(payment.method ?? "COD").toUpperCase();
  const transactionId = typeof payment.transactionId === "string" && payment.transactionId ? payment.transactionId : typeof order.transactionId === "string" && order.transactionId ? order.transactionId : null;

  return {
    orderNumber: String(order.orderId ?? ""),
    orderDate: dateText(toMillis(order.createdAt)),
    deliveredDate: dateText(deliveredAtOf(order)),
    seller,
    buyer: buyerName || buyerAddress ? { name: buyerName, address: buyerAddress } : null,
    buyerGstin: GSTIN.test(gstRaw) ? gstRaw : null,
    lines,
    totals: { subtotal, discount, deliveryFee, tip, taxes, beautyProtection, coinsRedeemed, grandTotal },
    totalsAddUp,
    payment: { method: method === "ONLINE" ? "Online payment" : "Cash on delivery", transactionId },
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const money = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Printable page, with no script (the page is served under a no-script CSP). Every value goes through escapeHtml.
// The customer prints it or saves it as a PDF from the browser.
export function renderInvoiceHtml(inv: InvoiceModel): string {
  const e = escapeHtml;
  const t = inv.totals;
  const row = (label: string, value: string, cls = "") => `<tr class="${cls}"><th scope="row">${e(label)}</th><td>${e(value)}</td></tr>`;
  const lineRows = inv.lines
    .map(
      (l) =>
        `<tr><td>${e(l.title)}${l.brand ? `<div class="muted">${e(l.brand)}</div>` : ""}</td><td class="num">${l.quantity}</td><td class="num">${money(l.unitPrice)}</td><td class="num">${money(l.lineTotal)}</td></tr>`,
    )
    .join("");
  const sellerLines = [
    inv.seller.legalName ? `<div>${e(inv.seller.legalName)}</div>` : "",
    inv.seller.address ? `<div>${e(inv.seller.address)}</div>` : "",
    inv.seller.gstin ? `<div>GSTIN: ${e(inv.seller.gstin)}</div>` : "",
    inv.seller.pan ? `<div>PAN: ${e(inv.seller.pan)}</div>` : "",
    inv.seller.email ? `<div>${e(inv.seller.email)}</div>` : "",
  ].join("");
  const buyer = inv.buyer
    ? `<div>${e(inv.buyer.name)}</div>${inv.buyer.address ? `<div>${e(inv.buyer.address)}</div>` : ""}${inv.buyerGstin ? `<div>GSTIN: ${e(inv.buyerGstin)}</div>` : ""}`
    : "";
  const taxRow = t.taxes === null ? "" : row("Taxes (as recorded on the order)", money(t.taxes));
  const beautyRow = t.beautyProtection > 0 ? row("Beauty protection", money(t.beautyProtection)) : "";
  const coinRow = t.coinsRedeemed > 0 ? row("Coins redeemed", `−${money(t.coinsRedeemed)}`) : "";
  const discountRow = t.discount > 0 ? row("Discount", `−${money(t.discount)}`) : "";
  const tipRow = t.tip > 0 ? row("Tip for the delivery partner (not a tax)", money(t.tip)) : "";
  const note = inv.totalsAddUp ? "" : `<p class="note">The total is shown as it was recorded at checkout.</p>`;

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Invoice ${e(inv.orderNumber)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1d1b20; background: #fff; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 40px; }
  header { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-bottom: 2px solid #1d1b20; padding-bottom: 12px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: .02em; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #5b5661; margin: 20px 0 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; font-size: 14px; line-height: 1.5; }
  .muted { color: #5b5661; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e6e1ea; vertical-align: top; }
  thead th { font-size: 12px; text-transform: uppercase; color: #5b5661; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; width: min(360px, 100%); }
  .totals th { font-weight: 400; }
  .totals .grand th, .totals .grand td { font-weight: 700; font-size: 16px; border-top: 2px solid #1d1b20; border-bottom: none; }
  .note { font-size: 12px; color: #5b5661; }
  @media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
  @media print { .actions { display: none; } body { font-size: 12pt; } main { padding: 0; } }
</style>
</head>
<body>
<main>
  <header>
    <div>
      <h1>Tax invoice</h1>
      <div class="muted">Order ${e(inv.orderNumber)}</div>
    </div>
    <div class="muted">
      ${inv.orderDate ? `<div>Order date: ${e(inv.orderDate)}</div>` : ""}
      ${inv.deliveredDate ? `<div>Delivered on: ${e(inv.deliveredDate)}</div>` : ""}
    </div>
  </header>
  <div class="grid">
    <section>
      <h2>Sold by</h2>
      <div><strong>${e(inv.seller.name)}</strong></div>
      ${sellerLines}
    </section>
    <section>
      <h2>Delivered to</h2>
      ${buyer || `<div class="muted">Not recorded</div>`}
    </section>
  </div>
  <h2>Items</h2>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="totals">
    <tbody>
      ${row("Item total", money(t.subtotal))}
      ${discountRow}
      ${coinRow}
      ${row("Delivery fee", money(t.deliveryFee))}
      ${tipRow}
      ${beautyRow}
      ${taxRow}
      <tr class="grand"><th scope="row">Total</th><td class="num">${e(money(t.grandTotal))}</td></tr>
    </tbody>
  </table>
  ${note}
  <h2>Payment</h2>
  <div>${e(inv.payment.method)}${inv.payment.transactionId ? ` · Reference ${e(inv.payment.transactionId)}` : ""}</div>
</main>
</body>
</html>`;
}
