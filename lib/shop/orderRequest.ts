// Order request checks: the bag, the delivery address and the payment method, in the order the shop has always
// checked them. Pure (no server imports) so the node tests can run them. The order route and the subscription cron use these.
import { text, indianMobile } from "./text";
import { parseCoinsRequested } from "./growth/coins";
import { parseCartLines, type CartLine } from "./variants";

export const MAX_LINES = 20;
export const MAX_QTY = 10;

// A saved address is sent by id; the server reads it again from the customer's own addresses.
export const ADDRESS_ID_PATTERN = /^adr_[a-f0-9]{16}$/;

export interface DeliveryAddress {
  name: string;
  phone: string;
  fullAddress: string;
  city: string;
  pincode: string;
  area: string;
  landmark: string;
}

export interface ParsedOrderRequest {
  paymentMethod: "COD" | "ONLINE";
  // The bag: one line per product and variant, quantities already merged and capped.
  lines: CartLine[];
  // Either a saved address id (checked again by the order core) or the typed address, never both.
  addressId: string | null;
  address: DeliveryAddress | null;
  // A delivery slot id the server offered, or null for the next available time.
  deliverySlotId: string | null;
  couponCode: string;
  tipRaw: unknown;
  coinsRequested: number;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

// Checks the order request in the order the route always has: payment method, bag, then the delivery address.
export function parseOrderRequest(body: Record<string, unknown>, options: { onlineAvailable: boolean }): ParseResult<ParsedOrderRequest> {
  const method = String(body.paymentMethod ?? "COD").toUpperCase();
  if (method !== "COD" && method !== "ONLINE") return { ok: false, status: 400, error: "Choose a payment method." };
  if (method === "ONLINE" && !options.onlineAvailable) {
    return { ok: false, status: 503, error: "Online payment is being set up. Please choose cash on delivery for now." };
  }

  const bag = parseBagLines(body.items);
  if (!bag.ok) return bag;

  // A saved address is taken by id when one is sent; the typed address is checked only when no id is sent.
  const addressId = typeof body.addressId === "string" && body.addressId ? body.addressId : null;
  let address: DeliveryAddress | null = null;
  if (addressId === null) {
    const typed = parseDeliveryAddress(body.address);
    if (!typed.ok) return typed;
    address = typed.value;
  }

  const coins = parseCoinsRequested(body.coinsToRedeem);
  if (!coins.ok) return { ok: false, status: 400, error: coins.error };
  const couponCode = text(body.couponCode, 20).toUpperCase();
  const slotRaw = body.deliverySlot === undefined || body.deliverySlot === null || body.deliverySlot === "" ? null : text(body.deliverySlot, 60);
  return {
    ok: true,
    value: {
      paymentMethod: method === "ONLINE" ? "ONLINE" : "COD",
      lines: bag.value,
      addressId,
      address,
      deliverySlotId: slotRaw,
      couponCode,
      tipRaw: body.tip,
      coinsRequested: coins.value,
    },
  };
}

// The bag: up to MAX_LINES lines, each a product (and its variant) with a quantity. A repeated line is added up, capped at MAX_QTY.
export function parseBagLines(raw: unknown): ParseResult<CartLine[]> {
  const lines = Array.isArray(raw) ? raw : [];
  if (lines.length === 0) return { ok: false, status: 400, error: "Your bag is empty." };
  if (lines.length > MAX_LINES) return { ok: false, status: 400, error: `Up to ${MAX_LINES} different products per order.` };
  const cart = parseCartLines(lines, MAX_QTY);
  if (!cart.ok) return { ok: false, status: 400, error: cart.error };
  return { ok: true, value: cart.lines };
}

export function parseDeliveryAddress(raw: unknown): ParseResult<DeliveryAddress> {
  const addr = (raw ?? {}) as Record<string, unknown>;
  const value: DeliveryAddress = {
    name: text(addr.name, 80),
    phone: indianMobile(addr.phone),
    fullAddress: text(addr.fullAddress, 300),
    city: text(addr.city, 60),
    // Not truncated: a 7-digit pincode must be refused, not cut down to six digits.
    pincode: text(addr.pincode, 20),
    area: text(addr.area, 80),
    landmark: text(addr.landmark, 120),
  };
  if (value.name.length < 2) return { ok: false, status: 400, error: "Enter the name for delivery." };
  if (!value.phone) return { ok: false, status: 400, error: "Enter a 10-digit Indian mobile number for delivery." };
  if (value.fullAddress.length < 8) return { ok: false, status: 400, error: "Enter the full delivery address." };
  if (!value.city) return { ok: false, status: 400, error: "Enter the city." };
  if (!/^\d{6}$/.test(value.pincode)) return { ok: false, status: 400, error: "Enter a 6-digit pincode." };
  return { ok: true, value };
}
