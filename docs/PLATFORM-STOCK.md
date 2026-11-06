# Platform stock (shop products)

Stock for the shop's own products lives on the product document: `products/{id}.stock` (whole number, 0 or more) and
`products/{id}.stockUpdatedAt`. The GlowVai admin sets it on the Inventory screen; the shop's checkout changes it.

## Tracking

- A product is **tracked** only when `stock` is a number.
- A product with **no `stock` field is not tracked**: checkout never blocks it and never decrements it. This is the
  starting state for every existing product, so nothing changes until the admin sets a value.
- The admin's "Set stock" makes a product tracked. A product that appears in `products` later is untracked until then.

## What an order does (`app/api/shop/orders/route.ts`)

One Firestore transaction creates the order:

1. Reads every product in the bag fresh (`readProductStock`).
2. Checks each line: the product must still be `PUBLISHED`, the price must match what the customer saw, and every
   tracked line must have `stock >= quantity`. Repeated lines for one product are added up first.
3. Refuses the whole order if any line fails (no partial order). The customer sees the first problem, for example
   "Only 1 of Serum left" or "Serum is sold out".
4. Otherwise decrements each tracked product and stores `stockReservation: { platform: [{productId, quantity}], releasedAt: null }`
   on the order.

Stock never goes negative: an exact match is allowed (3 in stock, order 3, leaves 0).

## Giving stock back (once)

Platform stock is returned at most once per order, because the check and the write happen in the same transaction
and `stockReservation.releasedAt` is set when it is returned:

- **Customer cancels** (`app/api/shop/orders/[id]/cancel/route.ts`), while the order is PLACED or VENDOR_ACCEPTED.
- **Staff cancel** in the admin (`src/server/adminStore.ts`, the same transaction as the vendor restore).
- **Payment failed** for an online order (`app/api/shop/payments/razorpay/webhook/route.ts`, `payment.failed`).

If a later payment for the same order succeeds (a failed attempt, then a retry), the webhook and the verify route take
the stock again. If it is no longer there, it is taken down to 0 and the order gets an event note for the admin to review.

## Known gap

An online order whose payment is started but never completed and never reports `payment.failed` (the customer simply
closes the payment window) keeps its stock held. There is no abandon signal yet; a sweeper for old `PAYMENT_PENDING`
orders would close this gap.

## Vendor stock

Vendor stock (`vendors/{uid}/vendorInventory/{productId}`) is separate and still decremented when a vendor accepts an
order. The vendor accept route writes its part of `stockReservation` with dotted keys so the platform part survives.
Whether vendor stock should also be decremented at checkout is an open decision for the owner.

## Writes

Only `stock` and `stockUpdatedAt` are written to a product by stock code. Every stock change happens inside a Firestore
transaction. The admin writes these fields only through `POST /api/admin/stock` (roles `super_admin` and `inventory`,
rate-limited, audited with the reason).

## Tests

- `npm run test:stock`: the pure rules in `lib/shop/platformStock.ts` (refuse when short, exact quantity, untracked
  products not blocked, restore once, multi-line atomicity, retake that never goes below 0).
