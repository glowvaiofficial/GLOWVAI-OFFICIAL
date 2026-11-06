import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByUser, tooMany } from "@/lib/shop/server";
import { ADDRESS_ID, MAX_ADDRESSES, sortAddresses, type StoredAddress } from "@/lib/shop/addressRules";
import { listAddresses, runAddressOp } from "@/lib/shop/addressService";
import { addressRepo, newAddressId } from "@/lib/shop/addressRepo";

export const dynamic = "force-dynamic";

// The customer's saved delivery addresses (up to five, exactly one default). Stored under users/{uid}/addresses; the
// default is also written to users.address for the GlowVai admin panel. Every request is for the signed-in customer only.

const MAX_BODY_KEYS = 20;

const view = (a: StoredAddress) => ({
  id: a.id,
  label: a.label,
  recipientName: a.recipientName,
  phone: a.phone,
  fullAddress: a.fullAddress,
  city: a.city,
  pincode: a.pincode,
  landmark: a.landmark,
  isDefault: a.isDefault,
});

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  const body = (await req.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (Object.keys(body).length > MAX_BODY_KEYS) return null;
  return body as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const ipLimited = limitByIp(req, "addresses-get", 60);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "addresses-get", 60);
  if (userLimited) return userLimited;
  const addresses = await listAddresses(addressRepo, customer.uid);
  return json({ ok: true, max: MAX_ADDRESSES, addresses: sortAddresses(addresses).map(view) });
}

// Adds an address. The first one becomes the default; later ones can be made the default with makeDefault.
export async function POST(req: NextRequest) {
  const ipLimited = limitByIp(req, "addresses-post", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "addresses-write", 60);
  if (userLimited) return userLimited;
  if (tooMany(`addresses-write:${customer.uid}`, 60, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = await readBody(req);
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const outcome = await runAddressOp(addressRepo, customer.uid, { kind: "create", input: body, makeDefault: body.makeDefault === true }, Date.now(), newAddressId());
  if (!outcome.ok) return json({ ok: false, error: outcome.error }, outcome.status);
  return json({ ok: true, addresses: outcome.addresses.map(view) });
}

// Edits an address (id in the body, any of the address fields), or makes it the default with makeDefault: true.
export async function PATCH(req: NextRequest) {
  const ipLimited = limitByIp(req, "addresses-patch", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "addresses-write", 60);
  if (userLimited) return userLimited;
  if (tooMany(`addresses-write:${customer.uid}`, 60, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = await readBody(req);
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const id = typeof body.id === "string" ? body.id : "";
  if (!ADDRESS_ID.test(id)) return json({ ok: false, error: "That address is not on your account." }, 404);
  const { id: _id, makeDefault, ...fields } = body;
  const outcome = await runAddressOp(
    addressRepo,
    customer.uid,
    { kind: "update", id, input: fields, makeDefault: typeof makeDefault === "boolean" ? makeDefault : undefined },
    Date.now(),
    newAddressId(),
  );
  if (!outcome.ok) return json({ ok: false, error: outcome.error }, outcome.status);
  return json({ ok: true, addresses: outcome.addresses.map(view) });
}

// Deletes an address (id in the body). Deleting the default promotes the most recently changed address. An order that
// already uses the address is not affected: it keeps its own copy of the delivery details.
export async function DELETE(req: NextRequest) {
  const ipLimited = limitByIp(req, "addresses-delete", 30);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "addresses-write", 60);
  if (userLimited) return userLimited;
  if (tooMany(`addresses-write:${customer.uid}`, 60, 60 * 60 * 1000)) return json({ ok: false, error: "Too many changes. Try again later." }, 429);

  const body = await readBody(req);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!ADDRESS_ID.test(id)) return json({ ok: false, error: "That address is not on your account." }, 404);
  const outcome = await runAddressOp(addressRepo, customer.uid, { kind: "delete", id }, Date.now(), newAddressId());
  if (!outcome.ok) return json({ ok: false, error: outcome.error }, outcome.status);
  return json({ ok: true, addresses: outcome.addresses.map(view) });
}
