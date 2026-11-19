# GlowVai backend rules: rate limits, quotas and the checklist for new routes

Dated 19 Nov 2026. Branch `be-rules`. Everything here was read from the code in this repository (the routes under
`app/api`, `lib/shop/server.ts`, `lib/shop/rateLimit.ts`, `lib/otp/rules.ts`, `lib/vendor/http.ts`, `lib/rider/http.ts`,
`vercel.json`, `scripts/deploy-guard.mjs`) and from the earlier reviews:
the workspace audit of 15 Nov 2026 (`AUDIT-2026-11-15.md` in the workspace root), [SECURITY-AND-LINKS-REVIEW-2026-11-16.md](SECURITY-AND-LINKS-REVIEW-2026-11-16.md),
[WEBSITE-ARCHITECTURE.md](WEBSITE-ARCHITECTURE.md) and [OTP-HTTPSMS-SETUP.md](OTP-HTTPSMS-SETUP.md). The admin console has its
own twin document, `docs/ADMIN-RULES.md` in the admin repo. Nothing was called live: the route table was built by reading
each handler, not by sending requests.

Plain-English summary: the website and the apps share one free Firebase database (about 50,000 reads and 20,000 writes a
day). Every route must therefore (1) know who is calling, (2) refuse floods early and cheaply, (3) check what it is given,
(4) fail without leaking details, and (5) never spend more database or SMS budget than we can afford. Most routes already
do this. The gaps that remain are listed in section 5, and the ones that need the owner are marked **Decision**.

How to read the limits below: `(mem)` means a per-server-instance counter (`limitByIp`, `limitByUser`, `tooMany`,
`rateLimit`): it slows one client down but is not a global cap, because every serverless instance keeps its own counts.
`(S)` means the shared Firestore counter (`limitByIpShared`, `limitByUserShared`, `checkShared`): one transaction, one read
and one write per check, counted for every instance, document ids are hashes and stale documents are removed by
`/api/cron/rate-limits`.

## 1. Rules every new route must follow (checklist)

Copy this into the pull request description of any PR that adds or changes a file under `app/api`.

- [ ] **Who may call it is written down.** One of: public, customer token (guest allowed), customer token with a verified
  phone (`/api/shop/account/create` shows how), vendor (`vendorRoute`), rider session (`riderRoute`), cron secret,
  signed internal call, webhook signature, admin cookie. Customer routes call `customerFrom`; money, orders and anything that
  creates records for other people should say whether a guest may do it (see Decision 1).
- [ ] **Owner checks.** A route that takes an order, return, ticket or address id checks the record belongs to the caller
  before reading or changing it.
- [ ] **A rate limit runs first, before the token is verified and before any database read.** Customer routes use
  `limitByIp` then `limitByUser`; vendor routes use `vendorRoute`; rider routes use `riderRoute`; hand-written routes
  use `rateLimit` from `lib/security/rateLimit.ts`. Use the numbers in section 3 unless there is a reason.
- [ ] **Anything that costs money, sends a message, or writes a document per call uses the shared limiter (S)**, with a
  daily or hourly cap, not only a per-minute one. A daily cap kept in memory resets whenever the instance does.
- [ ] **Input is validated by a parser written for the route** (a `parseXxx` or `validateXxx` function in `lib`, or zod),
  with length caps, an allow-list for choices, a body-size cap and `ORDER_ID_*` style id patterns. Never trust prices,
  totals or stock from the client.
- [ ] **Errors are safe.** Return a short, friendly message and a status code. Never return a stack trace, a Firestore
  path, an environment name or whether an account exists. Unknown, expired and forbidden records give the same answer.
- [ ] **No secrets or personal data in logs.** Log the route name and the error type only. Never log a token, PIN, OTP, phone
  number, address, raw IP or request body. Responses carry `Cache-Control: no-store` unless they are deliberately cached.
- [ ] **A quota budget is stated.** Write in the route's header comment how many Firestore reads and writes one call costs
  and what stops a loop (a page cap, a daily cap, a cache). Public reads of shared data get a CDN cache header
  (`s-maxage=60`). Never read a whole collection per request.
- [ ] **Secrets are checked in constant time** (`timingSafeEqual`, `sameSecret`) and a missing secret answers 503, not
  "allowed".
- [ ] **Tests are added.** A pure rules test for the parser and the limits (see `__tests__/ratelimit`), and the route has a
  row in the table in section 2 (the test `__tests__/rules/route-rules.test.ts` fails if it does not).
- [ ] **Docs and deploy.** Update this file. Docs-only commits carry `[skip ci]`; code commits do not.

## 2. Route table

116 route handler files under `app/api` (147 method handlers). Auth column: "customer" means a Firebase ID
token checked by `customerFrom`, which accepts anonymous guest sessions (the table says "guest ok" where it matters).
Quota cost for the Firestore reads and writes is in section 4; every `(S)` check costs one read and one write.
The scan routes live on the separate Render server and are at the end of this section.

### A. Public site and forms

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/contact` | POST | none |  Retired: answers 410 first. Old in-memory IP 5/min sits behind it | zod contactFormSchema | Retired (RETIRED_FORM_ROUTES). None. |
| `/api/data-request` | POST | none |  Retired (410). Old in-memory IP 5/min | zod dataRequestSchema | Retired. None. |
| `/api/feedback` | POST | none |  Retired (410). Old in-memory IP 10/min | zod | Retired. None. |
| `/api/lead` | POST, PATCH | POST none; PATCH admin cookie |  Retired (410). Old in-memory IP limits | zod | Retired. None. |
| `/api/lead/image` | POST | admin cookie (verifySession) |  Retired (410). Old IP 5/min | size check | Retired. None. |
| `/api/newsletter` | GET, POST | GET signed confirm token; POST none |  GET IP 20/min (mem). POST retired (410) | GET token verify; POST zod | GET sends one welcome email per valid token. In-memory limit only. |
| `/api/order-intent` | POST | none |  Retired (410). Old IP 10/min | zod | Retired. None. |
| `/api/waitlist` | POST | none |  Retired (410). Old IP 10/min | zod | Retired. None. |
| `/api/review` | POST | review token in the body (checked by the Apps Script) |  IP 5/min (mem) | zod reviewSubmitSchema | Not retired. In-memory limit only. SHEETS_SECRET is empty (audit), so the Apps Script takes any caller. |
| `/api/unsubscribe` | GET, POST | signed unsubscribe token |  GET IP 30/min, POST IP 10/min (mem) | token length and signature | Token required since 15 Nov. In-memory limit only. |

### B. Webhooks and server-to-server

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/shop/payments/razorpay/webhook` | POST | Razorpay signature (x-razorpay-signature on the raw body) |  IP 120/min (mem) | signature, then JSON; amount and status re-checked against the order | Transactional and idempotent. In-memory limit only. |
| `/api/webhooks/resend` | POST | Svix signature (svix-id, svix-timestamp, svix-signature) |  IP 300/min (mem), added 19 Nov | signature, JSON | Fixed 19 Nov (had no limit, was force-static, unbounded dedupe set). Dedupe is still per instance. |
| `/api/internal/order-status` | POST | HMAC-SHA256 with INTERNAL_WEBHOOK_SECRET plus a 5-minute timestamp |  IP 60/min (mem), before the HMAC | JSON, status allow-list | The duplicate-purchase set is per instance (a repeat on another instance can send a second GA4 event). |
| `/api/shop/internal/growth/coins` | POST | HMAC with INTERNAL_API_SECRET plus 5-minute timestamp |  IP 60/min (mem) | body cap, schema | None. |
| `/api/shop/internal/growth/referral-rewards` | POST | HMAC (INTERNAL_API_SECRET) |  IP 60/min (mem) | body cap, schema | None. |
| `/api/shop/internal/notify` | POST | HMAC (INTERNAL_API_SECRET) |  IP 60/min (mem) | parseInternalNotify; once per (uid, type, relatedId) | None. |
| `/api/shop/internal/refund` | POST | HMAC (INTERNAL_API_SECRET) |  IP 30/min (mem) | parseRefundRequest, body cap | None. |
| `/api/shop/internal/wallet/recheck` | POST | HMAC (INTERNAL_API_SECRET) |  IP 30/min (mem) | parseRecheckBody | None. |
| `/api/shop/internal/wallet/topups` | POST | HMAC (INTERNAL_API_SECRET) |  IP 60/min (mem) | body cap, schema | None. |

### C. Cron

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/cron/rate-limits` | GET | CRON_SECRET bearer (16+ characters, constant-time compare) |  none (secret only). Daily 03:00 UTC in vercel.json | none needed | Deletes up to 3,000 rate-limit documents a run, closes unpaid orders, retries late-payment refunds. Spends writes and deletes (section 4). |
| `/api/cron/subscriptions` | GET | CRON_SECRET bearer |  none (secret only). Daily 02:30 UTC in vercel.json | none needed | Reads every due subscription each run. |
| `/api/cron/weekly-digest` | GET, POST | CRON_SECRET bearer (constant-time) |  none (secret only) | none needed | Not in vercel.json, so nothing schedules it. One team email per call. |

### D. Auth and OTP

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/auth/otp/request` | POST | none (sends an SMS) |  IP 10/hour and 30/day (S). Phone: 30 s cooldown, 5/hour, 10/day (S). Global OTP_DAILY_CAP, default 300/day (S) | normalisePhone (Indian mobile, E.164) | Cost route: SMS credit plus several Firestore operations per request. 503 when httpSMS is not set up. |
| `/api/auth/otp/verify` | POST | none (returns a Firebase custom token) |  IP 30/hour (S). 5 wrong codes per challenge, then locked | normalisePhone, 6-digit code, HMAC compare | None. |
| `/api/shop/account/create` | POST | Firebase ID token from a phone provider (verifyIdToken) |  IP 10/hour (S). uid 5/hour (S) | phone claims; body phone must match the token | The only customer route that requires a verified phone account. |

### E. Customer shop (Firebase ID token; anonymous guest accepted unless noted)

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/shop/home` | GET | none |  IP 120/min (mem). CDN cache 60 s | none (read) | None. |
| `/api/shop/layout` | GET | none (staff preview token optional) |  IP 120/min (mem). CDN cache 60 s | preview token | None. |
| `/api/shop/theme` | GET | none (preview token optional) |  IP 120/min (mem). CDN cache 60 s | preview token | None. |
| `/api/shop/config` | GET | none |  IP 120/min (mem) | none | No CDN cache header. |
| `/api/shop/flash-sales` | GET | none |  IP 120/min (mem). CDN cache 30 s | none | None. |
| `/api/shop/ratings` | GET | none |  IP 60/min (mem) | id list | No cache header: reads per call. |
| `/api/shop/products/[id]/reviews` | GET | none |  IP 60/min (mem) | parseSort | No cache header: reads per call. |
| `/api/shop/products/[id]/questions` | GET, POST | GET none; POST customer (guest ok) |  GET IP 60/min (mem). POST IP 20/min (S), user 60/min (mem), 3 questions/hour (S) | validateQuestionText | Guests can ask (held for moderation). |
| `/api/shop/offers/quote` | POST | none (customer token optional, adds per-customer caps) |  IP 60/min (mem) | parseCartLines (max 20 lines), code max 40 characters | Public by design. Reads products on every call. |
| `/api/shop/slots` | GET | customer (guest ok) |  IP 60/min, user 60/min (mem) | none | None. |
| `/api/shop/affiliate/click` | POST | none (visitor id) |  IP 60/min (mem) | isVisitorId | Public write. In-memory limit only. |
| `/api/shop/shared-tracking` | GET | signed share token (k) in the query |  IP 30/min, token 60/min (mem) | ORDER_ID_RE, token check, generic 404 | None. |
| `/api/shop/orders` | GET, POST | customer (guest ok) |  GET IP 30/min, user 60/min (mem). POST IP 60/hour (S), replay 30/min (mem), burst 3 per 10 min (S), 10/day (S) | parseOrderRequest, Idempotency-Key, prices and stock re-read on the server | Guests can place COD orders (PR #127 held). Decision 1. |
| `/api/shop/orders/[id]` | GET | customer, owner only |  IP 60/min, user 120/min (mem) | ORDER_ID_PATTERN | None. |
| `/api/shop/orders/[id]/cancel` | POST | customer, owner only |  IP 30/min, user 60/min (mem) | text, state rules | None. |
| `/api/shop/orders/[id]/delivery-code` | GET | customer, owner only |  IP 60/min, user 60/min (mem) | ORDER_ID_RE | Returns the code that hands over the parcel. In-memory limit only. |
| `/api/shop/orders/[id]/invoice` | GET | customer, owner only |  IP 30/min, user 20/hour (mem) | ORDER_ID_PATTERN | None. |
| `/api/shop/orders/[id]/preferences` | PATCH | customer, owner only |  IP 60/min, user 30/hour (mem) | parseSubstitutionPreference | None. |
| `/api/shop/orders/[id]/reorder` | GET | customer, owner only |  IP 30/min, user 60/min (mem) | ORDER_ID | None. |
| `/api/shop/orders/[id]/share` | POST, DELETE | customer, owner only |  IP 20/min, user 10 (POST) or 20 (DELETE) per min, order 10/hour (mem) | ORDER_ID_RE | None. |
| `/api/shop/orders/[id]/tracking` | GET | customer, owner only |  IP 120/min, user 60/min (mem) | ORDER_ID_RE | None. |
| `/api/shop/reorder-items` | GET | customer |  IP 60/min (mem) | none | No per-user limit (IP only). |
| `/api/shop/payments/razorpay/verify` | POST | customer, owner only |  IP 30/min, user 60/min (mem) | Razorpay signature check | Money route with an in-memory limit only. Decision 2. |
| `/api/shop/returns` | GET, POST | customer (guest ok) |  GET IP 30/min, user 60/min (mem). POST IP 20/min (mem), user 5/day (S, changed 19 Nov) | parseReturnRequest, requestId, ORDER_ID_PATTERN | Guests can request returns. Decision 1. |
| `/api/shop/returns/[id]` | GET | customer, owner only |  IP 60/min, user 120/min (mem) | none | None. |
| `/api/shop/support` | GET, POST | customer (guest ok) |  GET IP 30/min, user 60/min (mem). POST IP 30/min (S), user 5/hour (S) | text, length caps | Guests can open tickets. Decision 1. |
| `/api/shop/support/reply` | POST | customer, owner only |  IP 30/min, user 60/min (mem) | validateCustomerReply | None. |
| `/api/shop/reviews` | GET, POST, PATCH | customer (guest ok) |  GET IP 60/min, user 60/min (mem). POST and PATCH IP 30/min (S), 5 reviews/hour (S) | validateReviewInput | Guests can post reviews (buyer rules apply). |
| `/api/shop/profile` | GET, POST | customer |  GET IP 60/min, user 60/min (mem). POST IP 20/min, user 20/hour (mem) | validateProfileInput, indianMobile | Phone is recorded as typed until verified (phoneChangeAllowed locks a verified number). |
| `/api/shop/profile/language` | POST | customer |  IP 20/min, user 30/min and 30/hour (mem) | language allow-list | None. |
| `/api/shop/addresses` | GET, POST, PATCH, DELETE | customer |  GET IP 60/min, user 60/min. Writes IP 30/min, user 60/min and 60/hour (mem) | address rules, MAX_BODY_KEYS | None. |
| `/api/shop/wishlist` | GET, PUT, DELETE | customer |  IP 60/min, user 60/min (GET, PUT) or 120/min (DELETE), writes 300/hour (mem) | id rules | None. |
| `/api/shop/notifications` | GET | customer |  IP 60/min, user 60/min (mem) | none | None. |
| `/api/shop/notifications/read` | POST | customer |  IP 60/min, user 60/min (mem) | parseReadRequest | None. |
| `/api/shop/notifications/prefs` | GET, POST | customer |  GET IP 60/min. POST IP 20/min, user 60/min and 20/hour (mem) | preference allow-list | None. |
| `/api/shop/notifications/token` | POST, DELETE | customer |  IP 30/min, user 10/hour (mem) | parseTokenType | None. |
| `/api/shop/activity` | GET | customer |  IP 60/min, user 60/min (mem) | none | None. |
| `/api/shop/coins` | GET | customer |  IP 60/min, user 60/min (mem) | none | None. |
| `/api/shop/coins/redeem-preview` | POST | customer |  IP 60/min, user 20/hour (mem) | parseBagLines | None. |
| `/api/shop/referral` | GET | customer |  IP 60/min, user 60/min (mem) | none | None. |
| `/api/shop/referral/apply` | POST | customer (guest ok) |  IP 10/day (S, changed 19 Nov). User 10/day (S) | code format, one-time rule | Guests can apply a code once. |
| `/api/shop/affiliate` | GET, POST | customer (applying needs a verified email or a 7-day-old account) |  GET IP 120/min, user 60/min (mem). POST IP 10/day (mem), user 3/day (S, changed 19 Nov) | parseApplication | The IP daily cap is still in memory. |
| `/api/shop/subscriptions` | GET, POST | customer |  GET IP 60/min, user 60/min. POST IP 30/min, user 20/hour (mem) | validateSubscriptionInput, parseDeliveryAddress | None. |
| `/api/shop/subscriptions/[id]` | POST | customer, owner only |  IP 60/min, user 20/hour (mem) | status allow-list | None. |
| `/api/shop/wallet` | GET | customer |  IP 120/min, user 60/min (mem) | none | None. |
| `/api/shop/wallet/history` | GET | customer |  IP 120/min, user 60/min (mem) | none | None. |
| `/api/shop/wallet/topup` | GET, POST | customer |  POST IP 20/hour, user 5/hour (S). GET IP 120/min, user 60/min (mem) | amount limits (TOPUP_LIMITS, wallet-config) | Guests can start a wallet top-up. Decision 1. |
| `/api/shop/wallet/topup/verify` | POST | customer, owner only |  IP 60/hour, user 30/hour (mem) | Razorpay signature check | Money route with an in-memory limit only. Decision 2. |
| `/api/shop/wallet/topup/fail` | POST | customer, owner only |  IP 60/hour, user 30/hour (mem) | id check | None. |
| `/api/shop/gift-cards` | GET | customer (gate) |  IP and user 60/min (mem) | none | None. |
| `/api/shop/gift-cards/purchase` | POST | customer (gate) |  IP and user 10/min (mem); 10 purchases a day per account (Firestore counter) | validateGiftAmount, validateGiftDetails | Guests can buy. Per-minute limit is in memory. |
| `/api/shop/gift-cards/purchase/verify` | POST | customer (gate) |  IP and user 30/min (mem) | Razorpay signature check | Money route with an in-memory limit only. Decision 2. |
| `/api/shop/gift-cards/redeem` | POST | customer |  IP 30/min (mem). User 5 per 15 min (S) | code format | None. |
| `/api/shop/payment-methods` | GET, POST | customer (gate). Off unless PAYMENT_METHODS_SAVE_ENABLED=true |  GET 30/min, POST 10/min, IP and user (mem) | Razorpay token API | Off by default. |
| `/api/shop/payment-methods/confirm` | POST | customer (gate) |  IP and user 20/min (mem) | isPaymentId | Money-adjacent, in-memory limit only. |
| `/api/shop/payment-methods/preferred` | POST | customer (gate) |  IP and user 20/min (mem) | token id | None. |
| `/api/shop/payment-methods/[tokenId]` | DELETE | customer (gate) |  IP and user 20/min (mem) | isTokenId | None. |
| `/api/shop/privacy/consent` | GET, POST | customer (gate) |  GET 60/min, POST 20/min, IP and user (mem) | parseConsentBody | None. |
| `/api/shop/privacy/deletion` | GET, POST | customer (gate) |  GET 30/min, POST 10/min, IP and user (mem) | none | The request goes to the admin queue. |
| `/api/shop/privacy/export` | GET | customer (gate) |  IP and user 5/min (mem). 2 exports a day per account (Firestore counter) | none | Reads many documents; the 2/day cap protects the quota. |
| `/api/shop/privacy/summary` | GET | customer (gate) |  IP and user 30/min (mem) | none | None. |
| `/api/shop/devices` | GET | customer (gate) |  IP and user 60/min (mem) | device-id header | None. |
| `/api/shop/devices/[hash]` | DELETE | customer (gate) |  IP and user 20/min (mem) | isDeviceHash | None. |
| `/api/shop/devices/sign-out-others` | POST | customer (gate) |  IP and user 10/min, 5/hour (mem) | none | None. |

### F. Vendor API (vendorRoute: origin check, IP limit, Firebase password account with verified email, user limit)

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/vendor/me` | GET | vendor (email may be unverified) |  IP 60/min, user 60/min (mem) | none | None. |
| `/api/vendor/application` | POST | vendor (verified email) |  IP 10/min, user 10/hour (mem) | parseApplication, 32 KB body cap | None. |
| `/api/vendor/analytics` | GET | vendor |  IP 30/min, user 20/min (mem) | parseDays | None. |
| `/api/vendor/inventory` | GET, PUT | vendor |  GET IP 60/min, user 30/min. PUT IP 30/min, user 20/min (mem) | parseInventory, 32 KB cap | Stock writes with an in-memory limit only. |
| `/api/vendor/orders` | GET | vendor |  IP 120/min, user 60/min (mem) | parseSince | None. |
| `/api/vendor/orders/[orderId]/accept` | POST | vendor, must own the order |  IP 30/min, user 20/min (mem) | ORDER_ID_RE | None. |
| `/api/vendor/orders/[orderId]/decline` | POST | vendor, must own the order |  IP 30/min, user 20/min (mem) | ORDER_ID_RE, parseDecline | None. |
| `/api/vendor/orders/[orderId]/packed` | POST | vendor, must own the order |  IP 30/min, user 20/min (mem) | parseCheckedProductIds | None. |
| `/api/vendor/orders/[orderId]/ready` | POST | vendor, must own the order |  IP 30/min, user 20/min (mem) | ORDER_ID_RE | None. |
| `/api/vendor/payouts` | GET | vendor |  IP 30/min, user 15/min (mem) | none | None. |
| `/api/vendor/product-requests` | GET, POST | vendor |  GET IP 60/min, user 30/min (mem). POST IP 10/min, user 10/min (S) | parseProductRequest | None. |
| `/api/vendor/push-token` | POST | vendor |  IP 10/min, user 5/min (mem) | parseVendorPushToken | None. |
| `/api/vendor/returns` | GET | vendor |  IP 60/min, user 30/min (mem) | none | None. |
| `/api/vendor/status` | POST | vendor |  IP 30/min, user 20/min (mem) | status allow-list | None. |
| `/api/vendor/support` | GET, POST | vendor |  GET IP and user 30/min. POST IP 10/min, user 5/hour (mem) | parseTicket | None. |

### G. Rider API (riderRoute: same-origin and JSON on writes, IP limit, rider session cookie, partner limit)

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/rider/signin` | POST | none (phone and PIN) |  IP 5 per 15 min (S). Lockout per phone: 5 tries per 15 min, then a 15-minute lock (Firestore) | indianMobile, PIN format | None. |
| `/api/rider/logout` | POST | none (clears the cookie) |  IP 20/min (mem) | none | None. |
| `/api/rider/me` | GET | rider session |  IP 60/min, partner 60/min (mem) | none | None. |
| `/api/rider/deliveries` | GET | rider session |  IP 120/min, partner 60/min (mem) | none | None. |
| `/api/rider/deliveries/[orderId]/start` | POST | rider session, assigned order |  IP 60/min, partner 30/min (mem) | checkOrderId | None. |
| `/api/rider/deliveries/[orderId]/code` | POST | rider session, assigned order |  IP 40/min, partner 20/min (mem). 5 wrong codes lock for 30 minutes | code format | None. |
| `/api/rider/deliveries/[orderId]/cash` | POST | rider session, assigned order |  IP 40/min, partner 20/min (mem) | whole rupees, must equal the order total | Cash confirmation with an in-memory limit only. |
| `/api/rider/deliveries/[orderId]/exception` | POST | rider session, assigned order |  IP 40/min, partner 20/min (mem) | reason and note checked in recordException | None. |
| `/api/rider/location` | POST | rider session |  IP 60/min, partner 4/min (mem) | validCoords, accuracy clamped | None. |
| `/api/rider/location/stop` | POST | rider session |  IP 40/min, partner 20/min (mem) | none | None. |

### H. Shop-hosted admin gate

| Route | Methods | Auth | Rate limit | Validation | Gap |
|---|---|---|---|---|---|
| `/api/admin/session` | GET, POST, DELETE | POST: the /admin2006 passcode. GET and DELETE: the gv_admin cookie |  GET IP 60/min, POST IP 5 per 15 min, DELETE IP 20/min (mem) | passcode, body cap | In-memory limit only. The passcode is shared, not per person. |
| `/api/admin/email` | GET, POST | gv_admin cookie |  GET IP 60/min. POST IP 30/hour (mem) | email format, template allow-list, 413 body cap | Sends mail through the Apps Script proxy. In-memory limit only. |

### Scan server (Render, outside this repo)

The skin-scan API is `GLOW VAI CNN MODEL/glowvai_inference_api.py` (FastAPI on Render free). The website and the app call it
straight from the browser or phone: there is no shop route in front of it. Read from branch `scan-honest` (the version
live on Render may be older). The shop repo only calls `/health` (keep-alive, section 4).

| Route | Method | Auth | Rate limit (per client IP, in memory on the one server) | Notes |
|---|---|---|---|---|
| `/health`, `/api/health`, `/` | GET | none | global 600/min | Used by the keep-alive workflow. |
| `/validate/frame` | POST | none | 300/min | Live camera, polled about every 500 ms. |
| `/validate/photo`, `/revalidate/photo` | POST | none | 30/min each | Body cap 12 MB, 40 MP, JPEG/PNG/WEBP/BMP only. |
| `/analyze_skin`, `/analyze` | POST | none | 20/min | The expensive model call. |
| `/results/save`, `/results/delete`, `/reset/session` | POST | none (id pattern only) | 30/min, 30/min, 60/min | JSON body cap 64 KB. Saves results, never the photo. |
| `/scans/upload` | POST | none, consent flag required | 30/min, plus a daily cap of 5,000 uploads and 15,000 stored scans | Body cap 8 MB. Stores photos in Firestore, so the caps protect the 1 GiB storage. |
| `/admin/summary`, `/admin/scans`, `/admin/scan/{id}`, `/admin/export.csv` | GET | admin key or Firebase token of an email in `GLOWVAI_ADMIN_EMAILS` | 60/min, export 5/min, daily cap 500 listings | 403 for anyone else. |

Scan gaps: CORS defaults to `*` unless `GLOWVAI_CORS_ORIGINS` is set (Decision 6); the limits are per instance, and anyone can
call `/analyze` anonymously (the CPU cost is the free Render instance, not money).

## 3. Rate-limit policy

The numbers in the "In code today" column are the ones the routes use now. "Recommended" is where it differs.

| Class of route | In code today | Recommended | Helper |
|---|---|---|---|
| Public read of shared data (home, layout, theme, config, flash sales) | IP 120/min (mem) plus a CDN cache of 30 to 60 s | Same. Add `s-maxage` to `config`, `ratings`, `products/[id]/reviews` | `limitByIp` |
| Public read by id or search (ratings, product reviews, offer quote, shared tracking) | IP 60/min (mem); shared tracking also 60/min per token | Same | `limitByIp`, `tooMany` |
| Guest write (affiliate click, `review`, unsubscribe, newsletter confirm) | IP 5 to 60/min (mem) | Same, plus a shared daily cap where an email is sent | `rateLimit`, `limitByIp` |
| Signed-in read | IP 60/min and user 60/min (mem) | Same | `limitByIp`, `limitByUser` |
| Signed-in write (profile, addresses, wishlist, prefs, tokens) | IP 20 to 30/min, user 20 to 60/hour (mem) | Same; any write that creates a document per call also gets a shared hourly cap | `limitByIp`, `limitByUser`, `tooMany` |
| User content with moderation (questions, reviews, support tickets, returns, referral and affiliate applications) | IP 20 to 30/min, per-user hourly or daily caps (S) | Same (affiliate IP daily cap moves to shared) | `limitByIpShared`, `limitByUserShared` |
| Money, orders, payments (`orders` POST, wallet top-up, gift cards, Razorpay verify) | Orders: IP 60/hour (S), 3 per 10 min (S), 10/day (S). Top-up create: IP 20/hour, user 5/hour (S). Verify routes: IP 30/min, user 60/min (mem) | Keep orders and top-up create. Verify routes and `payment-methods/confirm`: add a shared hourly cap (Decision 2) | `limitByIpShared`, `limitByUserShared` |
| Auth, OTP and SMS cost | OTP request: IP 10/hour and 30/day, phone 5/hour and 10/day, 30 s cooldown, global 300/day (S). Verify: IP 30/hour (S), 5 tries per code. Account create: IP 10/hour, uid 5/hour (S). Rider sign-in: IP 5 per 15 min (S) plus a per-phone lockout | Same. Lower `OTP_DAILY_CAP` to the SMS credit on the SIM, not to 300 by default | `checkShared` |
| Vendor API | IP 10 to 120/min, user 5 to 60/min (mem); product requests (S) | Same | `vendorRoute` |
| Rider API | IP 20 to 120/min, partner 4 to 60/min (mem); sign-in (S) | Same | `riderRoute` |
| Webhooks (Razorpay, Resend, order status) | IP 60 to 300/min (mem) before the signature check | Same | `limitByIp`, `rateLimit` |
| Signed internal calls (`/api/shop/internal/*`) | IP 30 to 60/min (mem) before the HMAC | Same | `limitByIp` |
| Cron | No IP limit: the bearer secret (16+ characters) is the control | Same. Never expose a cron path without the secret check | `sameSecret` |
| Admin gate on the shop | Passcode: IP 5 per 15 min; session 60/min; email 30/hour (mem) | Move to per-person sign-in with the admin console and drop the shared passcode (Decision 7) | `rateLimit` |
| Admin console | See ADMIN-RULES.md in the admin repo | | |

Why only some routes use the shared limiter: each check costs a Firestore read and a write. A busy read route with a
shared limiter would burn the free quota on limiting alone. So (S) is reserved for routes where a per-instance counter would
let abuse through: money, SMS, accounts, and caps per day. If the shared store is slow or down, `checkRateLimit` fails open to the
in-memory limiter (2 s timeout), so the site stays up.

## 4. Quotas and free-plan limits

Figures for Google, Vercel, Resend and Render are the published free-plan numbers as we understand them on 19 Nov 2026;
recheck on the vendor's pricing page before relying on them. Our own caps are read from the code.

### Firestore (Firebase project glowvai-38bde, Spark plan, shared by the website, apps, vendor portal and admin)

| Free daily quota | Value | Resets |
|---|---|---|
| Document reads | 50,000 | midnight Pacific (about 1:30 pm IST) |
| Document writes | 20,000 | same |
| Document deletes | 20,000 | same |
| Stored data | 1 GiB total; outbound transfer 10 GiB a month | |

What protects it on the shop side:
- Public home, layout, theme and flash-sale reads are cached at the CDN for 30 to 60 s, so traffic does not become reads.
- Customer lists are paged or capped (orders and wallet history are paged, returns and devices stop at 50).
- Orders: 10 a day and 3 per 10 minutes per customer, 60 an hour per IP, all shared, so a script cannot write unlimited orders.
- Privacy export is 2 a day per account (it reads many documents); gift-card purchases 10 a day.
- The shared limiter costs 1 read and 1 write per check. A route with two checks costs 2 and 2. Abandoned counters are deleted
  by `/api/cron/rate-limits` (the Firestore TTL policy is not available on the free plan), at most 3,000 documents a run.
- Admin: the quotaGuard budgets in ADMIN-RULES.md (1,000 admin calls a day, 15,000 backup document reads, and so on).

Cost of the biggest consumers, from the code: one OTP request is about 7 reads and 6 writes (five limiter checks, the
cooldown read and one transaction); one verify is about 2 reads and 2 writes. At the default 300 OTPs a day that is about
3,300 reads and 3,000 writes, roughly 7 percent of reads and 15 percent of writes. One order placement adds 3 limiter
reads and 3 writes on top of the order's own documents.

### Phone sign-in SMS

We no longer depend on Firebase phone SMS (the audit of 15 Nov found it fails on the free plan except for the test number;
Blaze gives 10 free SMS a day then about Rs 6 each). Sign-in uses httpSMS: an Android phone with a SIM sends the SMS
([OTP-HTTPSMS-SETUP.md](OTP-HTTPSMS-SETUP.md)). Our own caps in `lib/otp/rules.ts`:

| Cap | Value |
|---|---|
| Whole site per day (`OTP_DAILY_CAP`, default 300) | 300 SMS |
| Per phone | 1 per 30 s, 5 per hour, 10 per day |
| Per IP | 10 per hour, 30 per day for sending; 30 per hour for verifying |
| Wrong codes | 5 per code, then locked; codes last 5 minutes and are stored only as a keyed hash |

A carrier can block a SIM that sends bulk SMS, so keep the daily cap at what the SIM plan and carrier allow.

### Vercel Hobby (hosting for the shop and the admin)

- 100 deployments a day for the whole account in a rolling 24 hours. Every deployment counts: merges to main, failed builds,
  preview builds of every pushed branch, CLI deploys, all projects.
- `scripts/deploy-guard.mjs` asks Vercel for the real count and refuses at 90 (warns from 80; `--emergency` allows up to 97; if
  Vercel cannot be asked it falls back to a local log with a cap of 60). Run it before every `vercel deploy`.
- The shop deploys on merge to main, so batch shop merges. **Docs-only commits and PRs carry `[skip ci]`** so they do not use a
  deployment. Code changes never do.
- `vercel.json` has two daily crons (subscriptions at 02:30 UTC, rate-limits at 03:00 UTC). Hobby allows few cron jobs and
  only daily schedules, which is why `/api/cron/weekly-digest` is not scheduled.

### Render free (scan server)

The free web service sleeps after about 15 minutes idle and takes 20 to 25 s to wake. The workflow
`.github/workflows/keep-scan-server-awake.yml` calls `/health` every 10 minutes (GitHub scheduled runs can be late or skipped,
so a cold start is still possible). One always-on free service fits inside Render's monthly free instance hours; a second one
would not. Do not add a second always-awake service.

### Razorpay

No free-tier request cap that we hit, but every payment is a real fee. Rules in code: the browser never decides the amount
(prices are re-read on the server); the webhook checks the signature on the raw body; unpaid orders expire after 30 minutes
and late payments are refunded; verify routes are signature-checked and idempotent; orders have Idempotency-Key. Webhook
retries come from Razorpay, so the webhook must stay fast and idempotent.

### Resend (email)

Free plan figures as we understand them: about 100 emails a day and 3,000 a month. In code there is only a per-recipient limit
(3 an hour and 10 a day, in memory, `lib/email/rate-limit.ts`) and no global daily cap, so a burst of customers or a bounce
storm could pass the plan limit and later mail would fail silently (Decision 5). Bounce and complaint events arrive at
`/api/webhooks/resend` and add the address to the suppression list.

### Firebase Storage

Spark-plan storage is small (published figure about 5 GB stored and 1 GB a day download; check the console, new buckets may
need the Blaze plan). The website API has no upload route; images go to Storage under Storage rules (not in this repo). The
scan server stores photos in Firestore with caps (15,000 scans, 8 MB per upload). Banner pictures share one 1 MB
Firestore document (the admin layout document), which is its own limit.

## 5. Known gaps and decisions needed

### Fixed on 19 Nov 2026 (with tests in `__tests__/rules/route-rules.test.ts`)
1. `/api/webhooks/resend` had no rate limit, was `force-static` and its duplicate set grew without end. Now an IP limit (300/min),
   `force-dynamic` and a 5,000 entry cap on the set.
2. `/api/shop/returns` POST: the 5-a-day cap was in memory; now shared (S).
3. `/api/shop/affiliate` POST: the 3-a-day per-user cap was in memory; now shared (S).
4. `/api/shop/referral/apply`: the 10-a-day per-IP cap was in memory; now shared (S).

Earlier audit item 19 (routes with no rate limit) was closed on 15 Nov in PR #112; the table confirms every route now has one
except cron (secret) and the retired forms (410).

### Gaps needing a decision (not changed: they could break live apps or cost money)
1. **Anonymous guests are accepted on every customer route**, including placing COD orders, wallet top-ups, gift-card
   purchases, returns, tickets, reviews and referral codes (`customerFrom` allows anonymous sessions). Requiring a verified phone
   account is PR #127, held until phone sign-in works in the app. Owner decision: when OTP sign-in is live on web and app, merge
   #127. Until then guest orders are rate limited (3 per 10 min, 10 a day, 60 an hour per IP) but not tied to a phone.
2. **Money routes limited only in memory:** `payments/razorpay/verify`, `wallet/topup/verify`, `gift-cards/purchase/verify`,
   `payment-methods/confirm`. They need a valid Razorpay signature, so abuse is cheap to refuse, but a shared hourly cap would
   cost one read and one write per call. Recommended: yes, shared 60 an hour per user. Not done because it adds quota use on
   live payment paths.
3. **Delivery code and cash confirmation** (`orders/[id]/delivery-code`, `rider/.../cash`, `rider/.../code`) are limited per
   instance only. The rider code route has a stored lockout (5 wrong, 30 minutes). Acceptable; a shared per-order cap would be
   stricter.
4. **Public reads without a CDN cache:** `config`, `ratings`, `products/[id]/reviews`, `reorder-items`. Each call is a read.
   Adding `s-maxage` changes freshness (a new review appears up to a minute later): owner to accept.
5. **Email has no global daily cap** (Resend free about 100 a day). Decision: add a Firestore counter of 80 a day that stops
   marketing mail first and keeps order mail.
6. **Scan server CORS is `*`** unless `GLOWVAI_CORS_ORIGINS` is set on Render. Set it to `https://glowvai.in` (the native app does
   not need CORS). Needs the owner to set the variable. Also `SHEETS_SECRET` is empty, so the Apps Script endpoints accept any
   caller (audit).
7. **Shop admin gate is one shared passcode** (`/api/admin/session`) with an in-memory limit. The admin console has per-person
   sign-in; retiring the shared gate is a product decision.
8. **Per-instance limits everywhere else.** A determined attacker spreads across serverless instances. Moving more routes to
   the shared limiter is a trade of free Firestore quota for strictness; the current split is in section 3.
9. **Cron weekly digest is not scheduled** (Hobby cron limit). Decision: keep unscheduled or swap it for another cron.
10. **Dependencies:** `npm audit --omit=dev` showed 19 transitive findings through `firebase-admin` (16 Nov review). No change.
11. **`/api/review` is not retired** and its Apps Script endpoint has no secret. Decide whether to retire it like the other form routes.

## 6. How to verify

Run in this repo (Node, no network, no real Firebase):

```
npx tsc --noEmit
npm run test:rules        # route rules: every route has a limiter, the fixes, this document lists every route
npm run test:ratelimit    # limiter maths and the per-IP checks
npm run test:all          # every suite
```

`test:rules` reads the route files and fails when a route has no limiter or no row in section 2, so a new route cannot
skip these rules. To spot-check a live limit: call a cheap route (`/api/shop/config`) 130 times in a minute from one machine and
expect 429 with `Retry-After`; do not do this to money or OTP routes.

Manual checks after changing limits: sign in as a guest and place an order (still works); request an OTP (counts one of the
300 a day); open the admin Health card (quota counters).
