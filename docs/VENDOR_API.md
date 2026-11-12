# GlowVai vendor API (operator note)

The vendor app (Expo, `mobile/`) talks only to these routes on the shop host (https://glowvai.in). They run as Next.js
route handlers with firebase-admin on project **glowvai-38bde** (free Spark plan). The app never writes Firestore.
Code: `app/api/vendor/**`, `lib/vendor/**`. Tests: `npm run test:vendor` (pure modules only, no Firebase calls).

## Routes

Every response is `{ ok: true, ... }` or `{ ok: false, error, code }`, with `Cache-Control: no-store`.
Order of checks on every route: CORS origin, IP limit, Firebase ID token, per-user limit, input validation, work.

| Route | Limits (IP / user) | Notes |
|---|---|---|
| `GET /api/vendor/me` | 60/min / 60/min | Works before email verification (`emailVerified:false`). |
| `POST /api/vendor/application` | 10/min / 10/hour | Create or resubmit. Locked while under review or once approved. |
| `POST /api/vendor/status` | 30/min / 20/min | `{ isOnline }`, also the 60 s heartbeat. Returns `{ isOnline, lastSeenAt }`. |
| `GET /api/vendor/orders?since=<ms>` | 120/min / 60/min | Offers + my orders. `full:true` when since is 0 or the change page overflowed. |
| `POST /api/vendor/orders/{id}/accept` | 30/min / 20/min | One transaction: checks, decrements stock, reserves it, assigns the order. |
| `POST /api/vendor/orders/{id}/decline` | 30/min / 20/min | `{ reason, note? }`. |
| `POST /api/vendor/orders/{id}/packed` | 30/min / 20/min | `{ checkedProductIds }` must cover every item. |
| `GET /api/vendor/inventory` | 60/min / 30/min | Up to 500 lines. `?variants=1` also returns each listed product's options (read-only, one extra read per product). |
| `PUT /api/vendor/inventory` | 30/min / 20/min | 1-100 lines; products must be PUBLISHED; store price at most MRP. A line may carry `variantId` (one of the product's options): stock and availability only, no price. |
| `GET /api/vendor/support` | 30/min / 30/min | My tickets (30). |
| `POST /api/vendor/support` | 10/min / 5/hour | Creates `admin_tickets/TKT-VND-...` in the admin ticket shape. |
| `GET /api/vendor/product-requests` | 60/min / 30/min | My product requests (50, newest first) with status. |
| `POST /api/vendor/product-requests` | 10/min / 10/min | Request a product that is not in the catalogue. 5 per IST day per vendor (`DAILY_LIMIT`). |
| `GET /api/vendor/analytics?days=7\|30` | 30/min / 20/min | Store activity from my own orders; bounded reads (500 each); cached 5 min per instance. |
| `POST /api/vendor/push-token` | 10/min / 5/min | Registers an FCM device token (hashed id, max 3 devices per vendor). |

Error codes: `UNAUTHENTICATED` 401, `NOT_A_VENDOR_ACCOUNT` 403, `EMAIL_NOT_VERIFIED` 403, `NOT_APPROVED` 403,
`APPLICATION_LOCKED` 409, `ORDER_ALREADY_ASSIGNED` 409, `ORDER_CANCELLED` 409, `OUT_OF_STOCK` 409 (+`missing`),
`NOT_ELIGIBLE` 403, `NOT_FOUND` 404, `INVALID_INPUT` 400 (+`field`), `INVALID_STATE` 409, `ITEMS_NOT_CHECKED` 400
(+`missing`), `PRODUCT_NOT_PUBLISHED` 409 (+`productIds`), `ORIGIN_NOT_ALLOWED` 403, `PAYLOAD_TOO_LARGE` 413,
`RATE_LIMITED` 429, `DAILY_LIMIT` 429 (product requests), `INTERNAL` 500.

Rate limits are per server instance (in memory), like the shop's own routes.

## Setup

1. **Firebase console > Authentication > Sign-in method: enable Email/Password.** Vendors sign in with email and
   password; only tokens with `sign_in_provider == "password"` are accepted (anonymous shop customers are refused).
   Email verification links are sent by the app (Firebase JS SDK); unverified accounts can only call `GET /me`.
2. **Env var `VENDOR_WEB_ORIGINS`** (Vercel, optional): comma-separated browser origins allowed to call the API, for
   example `https://vendor.glowvai.in`. The native app sends no Origin header and needs nothing. Outside production
   `http://localhost:8081` and `http://localhost:19006` (Expo web) are also allowed. Never use `*`.
3. Nothing else: no Firestore rules change, no Cloud Functions, no new indexes (all queries are single-field or
   equality-only).

## Who decides what

- The vendor's application: `vendorApplications/VAPP-{uid}` (written only by this API).
- Staff decisions: overlay `admin_vendors/VAPP-{uid}` (written only by the admin panel): `applicationStatus`,
  `operationalStatus`, `documents[]`, `history[]`, `overlayUpdatedAt`. A vendor may operate only when
  `applicationStatus == APPROVED` and `operationalStatus == ACTIVE`. A resubmission later than `overlayUpdatedAt`
  shows as SUBMITTED again.
- Staff order cancellations: `admin_orders/{orderId}.fulfilment == "CANCELLED"`; accept and packed refuse them.
- Stock: `vendors/{uid}/vendorInventory/{productId}`. Accept decrements it and stores `stockReservation` on the order;
  a customer cancel (allowed while PLACED or VENDOR_ACCEPTED, not once PACKED) gives the reserved stock back.

## Firestore read cost (free quota: 50k reads/day for shop + admin + vendor)

- `/me` and every route that needs the vendor's state: 2 reads (application + overlay), cached 30 s per server
  instance and refreshed in place on this API's own writes.
- Heartbeat: no reads when cached; skips the write when the last one is under 45 s old and the flag is unchanged.
- Orders poll (every 20 s online, 60 s offline, never in background): incremental polls cost one read per order
  changed since the last poll (max 60). A full load costs up to 50 (mine) + 30 (offer pool) + up to 10 overlay reads.
- Accept: order + overlay + one read per product line. Packed: 2. Decline: 1.
- Inventory: GET up to 500 reads, so the app should load it on screen open, not poll it. PUT reads 2 per line.
- Support: GET up to 30; POST 1 (+1 when an order is linked, + vendor state if not cached).
- Offers do not read the staff overlay (it would cost one read per offer per poll); a staff-cancelled order still in
  `PLACED` is refused at accept with `ORDER_CANCELLED`. The admin panel should also bump `orders/{id}.updatedAt` when
  staff cancel an order, so vendors' incremental polls pick it up.

## Remaining vendor features (product requests, options, analytics, push, timeline)

### Product requests: `productRequests/{id}`

Written only by `POST /api/vendor/product-requests` (`lib/vendor/productRequests.ts`). Fields: `id`, `vendorUid`,
`vendorApplicationId`, `name`, `brand`, `category`, `mrp`, `barcode` (8-14 digits or null), `pictureUrls` (up to 3,
https, hosts `images.unsplash.com`, `firebasestorage.googleapis.com`, `storage.googleapis.com` only), `reason`,
`status`, `staffNote`, `dayKey` (IST day), `createdAt`, `updatedAt`.

**Status enum for the admin team** (the only values the vendor app understands; anything else shows as PENDING):

| Value | Meaning | Who sets it |
|---|---|---|
| `PENDING` | New request, not yet reviewed. | Created by this API. |
| `APPROVED` | The product will be added to the catalogue. | Admin panel. |
| `REJECTED` | Not added. `staffNote` says why, in plain words. | Admin panel. |
| `NEEDS_INFO` | Needs more detail; `staffNote` says what. The vendor cannot edit a request, so they send a new one. | Admin panel. |

The admin team sets `status` and `staffNote` (no more than 200 characters of plain text; contact details are masked on
the vendor side). The vendor never sees `vendorUid`. The daily cap counter is `vendors/{uid}/productRequestDays/{IST day}`.

### Options (variants) on the vendor side

- The product's options are read-only from `products/{id}.variants` (shop shape: id, label, price, mrp, stock|null,
  isAvailable, sku).
- The vendor's own stock for an option is `vendors/{uid}/vendorInventory/{productId}::{variantId}`; the product line
  stays `vendors/{uid}/vendorInventory/{productId}`.
- Accept reserves the stock line each order item needs (option lines for option items). The customer cancel path gives
  reserved stock back to the same line (`stockReservation.items[].variantId`).

### Packing: substitution preference

Each order projection carries `substitutionPreference`: `ALLOW_SUBSTITUTE | NO_SUBSTITUTE | CALL_ME | null`. Read-only.
No route lets a vendor change it.

### Order timeline

`timeline` (my orders only): `[{stage: "ACCEPTED" | "PACKED" | "HANDED_TO_RIDER", at: ms | null}]`, reached stages only.
Handover is the first order event whose text is "Out for delivery"; the event text itself is never returned.

### Analytics: `GET /api/vendor/analytics?days=7|30`

Counted from the vendor's own orders: `vendorUid == me` (accepted) and `dispatch.declinedBy array-contains me` (declined),
500 documents each with no ordering, so on a very busy store the window can be partial (`bounds.truncated`). Response
fields: `ordersPerDay`, `totals`, `averageAcceptSeconds`, `fulfilmentRate` (packed or later over packed-or-later plus
cancelled), `fulfilled`, `settled`, `itemsSold` (top 10), `orderValue` (`amount`, `orderCount`, label "Order value — not
your earnings"). Nulls mean nothing to divide yet. Cached 5 minutes per instance per store and window.

### Push: `POST /api/vendor/push-token`

Body `{token, platform: android|ios|web}`. Stored at `vendors/{uid}/pushTokens/{sha256(token)}`. At most 3 devices; a
device already registered can be refreshed at the cap. Tokens are FCM device tokens (not Expo tokens). Offers are pushed
by `lib/vendor/notify.ts` (`notifyOfferPool`, called when an order becomes PLACED: COD placement, and Razorpay verify and
webhook after payment). Only approved, online, recently seen stores with a servicePincode match are pushed (at most 10
per order). Tokens FCM rejects are deleted. Nothing is sent without `FIREBASE_SERVICE_ACCOUNT_JSON`. Never throws.

The vendor app does not register a token yet: `expo-notifications` is not installed.

### Tests

`npm run test:vendor-remaining` (`__tests__/vendor-remaining/`).
