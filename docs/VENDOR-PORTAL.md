# Vendor web portal

Status date: 16 Nov 2026. Code: `app/vendor/` (20 pages), `components/vendor-web/`, `lib/vendor-web/`, `app/api/vendor/` (15 routes), `lib/vendor/`. Older API note: [VENDOR_API.md](VENDOR_API.md) (written before ready, returns and payouts; the table below is the current one). Audit: `design-reference/audit-vendor-portal.md`. Tests: `npm run test:vendor`, `test:vendor-web`, `test:vendor-remaining`.

## Who can sign in

A store signs in with **Firebase email and password** (project `glowvai-38bde`). `lib/vendor/auth.ts` verifies the ID token with revocation checking, refuses anything that is not `sign_in_provider == "password"` (anonymous shop customers, phone and Google accounts are not vendors) and refuses unverified emails on every route except `GET /me`. Browser calls from other origins are refused unless listed in `VENDOR_WEB_ORIGINS`; the native app sends no Origin header.

## Auth and rate limits: `vendorRoute`

Every route is wrapped by `vendorRoute` (`lib/vendor/http.ts`). Fixed order: origin check (403), IP rate limit (429), Firebase token (401), per-user rate limit (429), params, then the route's own validation and work. Body cap 32 KB (413). JSON errors with stable codes (`UNAUTHENTICATED`, `NOT_A_VENDOR_ACCOUNT`, `EMAIL_NOT_VERIFIED`, `NOT_APPROVED`, `ORDER_ALREADY_ASSIGNED`, `OUT_OF_STOCK`, `INVALID_STATE`, `RATE_LIMITED`, `INTERNAL`, and others in `lib/vendor/errors.ts`), `Cache-Control: no-store`. Unexpected errors are logged and answered with a friendly message. Limits are per server instance unless the route sets `shared: true` (only product-requests POST). Data is scoped by `vendorUid`; another store's order answers 404.

A store's state (`lib/vendor/state.ts`) is its application (`vendorApplications/VAPP-{uid}`, written by this API) with the team's decision on top (`admin_vendors/VAPP-{uid}`, written by the admin): NO_APPLICATION, SUBMITTED, UNDER_REVIEW, DOCUMENTS_REQUESTED, REJECTED, APPROVED_ACTIVE, APPROVED_PAUSED, SUSPENDED. It may operate only when approved and active.

## API routes (15)

| Route | Limits (IP / user) | What it does |
|---|---|---|
| `GET /api/vendor/me` | 60/min / 60/min | Account and store state; works before email verification |
| `POST /api/vendor/application` | 10/min / 10/hour | Create or resubmit the store application; locked while under review or approved |
| `POST /api/vendor/status` | 30/min / 20/min | Online or offline; also the 60 s heartbeat |
| `GET /api/vendor/orders` | 120/min / 60/min | Offers and my orders; `since=<ms>` returns only changes; staff cancellations are applied |
| `POST /api/vendor/orders/[orderId]/accept` | 30/min / 20/min | One transaction: check stock, reserve it, assign the order; first store wins, others get `ORDER_ALREADY_ASSIGNED`; needs an operating store |
| `POST .../decline` | 30/min / 20/min | Decline with a reason (Out of stock, Store is busy, Closing soon, Item damaged, Other with a 3 to 200 character note); the order stays offered to others |
| `POST .../packed` | 30/min / 20/min | Mark packed; the body must list every item as checked, enforced on the server |
| `POST .../ready` | 30/min / 20/min | Packed to READY_FOR_PICKUP; transactional, idempotent, vendor-scoped. Says only that the parcel is waiting; no rider is assigned here (PR #135) |
| `GET /api/vendor/returns` | 60/min / 30/min | Read-only return requests on this store's orders; staff decide, no refund here (PR #135) |
| `GET /api/vendor/payouts` | 30/min / 15/min | Read-only payout ledger (PR #138), see below |
| `GET /api/vendor/analytics` | 30/min / 20/min | 7 or 30 days from this store's own orders (two reads of up to 500); cached 5 min per instance |
| `GET`, `PUT /api/vendor/inventory` | 60/30 and 30/20 per min | Stock lines, up to 500; PUT saves 1 to 100 lines, per option (`variantId`), store price may not exceed MRP |
| `GET`, `POST /api/vendor/product-requests` | 60/30 and 10/10 per min | Request a product not in the catalogue; 5 per IST day per vendor, counted in the same transaction as the write (shared limiter) |
| `GET`, `POST /api/vendor/support` | 30/30 per min and 10/min / 5 per hour | Own tickets; creates an `admin_tickets` document; internal notes never leave the server |
| `POST /api/vendor/push-token` | 10/min / 5/min | Register a device for notifications (Expo or FCM, web), max devices per vendor, token never returned |

Approval rules: analytics, inventory, product requests, payouts, returns and packed/ready need an approved store; accept, decline and online need an operating (approved and active) store; a paused store may still finish orders it already accepted. Support and application work for pending stores.

### Payout ledger (`lib/vendor/ledger.ts`)
Computed, never written. Orders: this store's orders with status DELIVERED (500 read, 25 recent shown). Commission: the admin's saved `commissionPercent` in `admin_config/financeSettings`; while none is saved, commission, net earnings and balance are `null` and the portal says so. Settlements: `admin_settlements` for `VAPP-<uid>` (100 read); only RELEASED counts as paid, PENDING and ON_HOLD show as "not yet paid". Balance due is net minus paid, never below zero. Cached 2 minutes per instance.

## Pages (20)

`/vendor` is a router (`lib/vendor-web/routing.ts`): signed out to sign-in, unverified email to verify-email, no application to onboarding, any review or decision state to status, approved to home. Never a blank page.

Account group (`app/vendor/(account)/`):
| Path | Purpose |
|---|---|
| `/vendor/sign-in`, `/vendor/create-account`, `/vendor/verify-email`, `/vendor/forgot-password` | Email and password account, verification link, reset |
| `/vendor/onboarding` | Store application (also edit and resubmit while editable: store and owner, contact, address, service pincodes, hours, categories, PAN last 4, bank details masked) |
| `/vendor/status` | Application state with copy per state, requested documents, reason |
| `/vendor/profile`, `/vendor/security`, `/vendor/support` | Store profile, password and security, support tickets |

Operations group (`app/vendor/(ops)/`, shell `components/vendor-web/Shell.tsx`, side nav on PC and bottom nav on phone, sign-out asks to confirm):
| Path | Purpose |
|---|---|
| `/vendor/home` | Command centre: open or closed toggle (heartbeat every 60 s while visible and online), what needs doing |
| `/vendor/orders` | Tabs Offers, Preparing, Packed, Completed, Cancelled and **Returns** (read-only panel). Polls every 20 s while online and visible, 60 s offline; loading, empty, error and stale states |
| `/vendor/orders/[orderId]` | Offer or order detail; accept, or decline with a reason |
| `/vendor/orders/[orderId]/pack` | Tick every item, mark packed, then **Ready for pickup** (copy no longer claims a rider) |
| `/vendor/inventory` | Stock per option, MRP cap on store price, low-stock chip, unsaved-change warning, Save disabled when unchanged |
| `/vendor/product-requests` | Ask for new products, status chips, daily cap of 5 |
| `/vendor/analytics` | 7 or 30 day activity, truncation noted |
| `/vendor/earnings` | Honest: "Settlements will appear here once GlowVai sets up payouts" plus 30-day order value labelled "Order value, not your earnings" |
| `/vendor/payouts` | The ledger: delivered orders, commission, paid out, balance due, settlements list |
| `/vendor/notifications` | Order alerts and web push registration |

## Not in the portal
Handing to the rider (done by the rider flow; the portal shows only the recorded time), return decisions and refunds, bank and tax documents upload, multiple stores or staff accounts, delivered marking (a vendor never marks delivered). Real push delivery is unconfirmed.

## Styling rules
System font stack set in `app/vendor/layout.tsx`, blue and slate only (amber removed), 44 px targets, tab roles and `aria-current`; locked by `__tests__/vendor-web/portal-style.test.ts`. Pages are `noindex`.
