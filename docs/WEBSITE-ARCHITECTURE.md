# Website architecture

Status date: 16 Nov 2026. Read from `origin/main` (`a375fdc`). Nothing was run.

## Folders

| Folder | What it holds |
|---|---|
| `app/` | Next.js App Router: site pages, `/shop` catch-all, `/vendor` portal, `/rider`, `/admin2006`, 114 API route handlers under `app/api/` |
| `glowvai-app/` | The shop single-page app mounted at `/shop`. `App.tsx` (screen switch), `routes.tsx` (merges `features/*/routes.tsx`), `context/AppContext` (navigation, account gate), `core/` (Firebase client, stores, catalogue feed, theme loader, i18n), `features/` (auth, commerce, notifications, orders, privacy, profile, recommendations, returns, reviews, scan, settings, shop, wallet), `components/common` (header, bottom bar), `glowvai.css` (scoped tokens) |
| `lib/shop/` | Server rules for the shop API: order creation (`orderCore.ts`), pending/unpaid orders, Razorpay, refunds, wallet, growth (coins, referral), notifications, home layout reader (`homeLayout.ts`), accents, theme, presets, rate limit |
| `lib/vendor/`, `lib/vendor-web/` | Vendor API rules (auth, state, orders, ledger, returns, analytics, push) and vendor portal client code |
| `lib/rider/` | Delivery partner API rules (PIN sign-in, deliveries, location) |
| `components/` | Marketing site components (home, layout, pages, product, seo, consent, analytics, affiliate, referral) and `components/vendor-web/` (portal shell, ops screens, ui kit) |
| `config/`, `content/` | Marketing copy, products (6), concerns (5), journal (4 articles, 1 published), subpages (careers, help, partners), legal markdown |
| `__tests__/` | 131 test files in 44 folders |
| `scripts/` | `deploy-guard.mjs`, SEO checks, merchant feed export, email DNS check |
| `docs/` | Documentation (this suite plus the older marketing docs) |
| `middleware.ts` | Guards `/admin2006/console` (HMAC session cookie, Web Crypto) and redirects old `/shop?product=` links |
| `vercel.json` | Two crons: `/api/cron/subscriptions` at 02:30 UTC and `/api/cron/rate-limits` at 03:00 UTC |

Config: `next.config.js` sets security headers and **three Content Security Policies**: the marketing default, a wider one for `/shop` (Firebase, Razorpay, reCAPTCHA, optional Google Maps when a key is in the build), and a strict self-only one for `/rider`. `/shop` may be framed only by itself and the admin console (for the designer preview). A production build fails if the shop's Firebase web settings are missing.

## Firebase usage

One project, `glowvai-38bde`, shared by shop, admin console and vendor app, on the **free Spark plan** (50,000 reads a day shared by all). The browser reads some public data directly (catalogue feed, auth). Customers never write Firestore from the browser: they call `/api/shop/*`, which verifies the Firebase ID token (`customerFrom` in `lib/shop/server.ts`) and writes with the Admin SDK in the shape the admin reads. Collections the code touches include `orders`, `users`, `admin_orders`, `products`, `admin_tickets`, `vendors`, `vendorApplications`, `vendorInventory`, `siteContent` (homeLayout, theme, home), `homePresets`, `flashSales`, `offers`, `wishlist`, `addresses`, `reviews`, `subscriptions`, `giftCards`, `payments`, `notifications`, `pushTokens`, `devices`, `deliveryPartners`, `riderLocations`, `rateLimits`, `admin_settlements`, `admin_config`, `productRequests`. Auth: phone (customers), email and password (vendors, `sign_in_provider == "password"` required), anonymous sessions for browsing. Push: FCM web push (`public/firebase-messaging-sw.js`). Email: Resend (webhook `/api/webhooks/resend`) and a Google Apps Script proxy for forms.

## API routes, security and rate limits

Helpers (`lib/shop/server.ts`): `limitByIp` (per IP, in memory per server instance), `limitByUser` (per signed-in uid), `limitByIpShared` and `limitByUserShared` (Firestore counter in the `rateLimits` collection, shared across instances, fails open to the in-memory limiter, stores only hashes; the daily cron deletes expired counters). Checks run IP limit, then token, then user limit, then validation. Responses use `Cache-Control: no-store` and JSON errors. In-memory limits are per instance, so they are abuse control, not exact quotas.

Shop customer routes (72 route files under `app/api/shop/`), pattern: IP limit then Firebase ID token then user limit. Examples of the real numbers:

| Route | Limits |
|---|---|
| `POST /api/shop/orders` | IP 60 per hour (shared); per user 3 per 10 min burst and **10 per day** (shared); idempotency key per attempt; replay 30 per min |
| `GET /api/shop/orders`, `/orders/[id]` and sub-routes (cancel, tracking, invoice, reorder, share, delivery-code, preferences) | IP 20 to 120 per min, user 20 to 120 per min (invoice 20 per hour) |
| `POST /api/shop/payments/razorpay/verify` | IP 30 per min, user 60 per min, HMAC signature check |
| `POST /api/shop/payments/razorpay/webhook` | IP 120 per min then webhook HMAC (`x-razorpay-signature`) |
| `/api/shop/wallet/*` | IP 60 to 120 per min; top-up create is shared (IP and customer per hour), verify and fail per hour |
| `POST /api/shop/returns` | IP 20 per min, user 5 per day; `GET` 30 per min |
| `POST /api/shop/support` | IP 30 per min, 5 tickets per hour per user (shared) |
| `POST /api/shop/reviews`, `/products/[id]/questions` | shared IP limits; 5 reviews per hour, 3 questions per hour per user |
| `POST /api/shop/account/create` | IP 10 per hour, user 5 per hour (shared) |
| `POST /api/shop/gift-cards/redeem` | IP 30 per min, 5 per 15 min per user (shared); purchase verify checks the Razorpay signature |
| `/api/shop/privacy/*`, `/devices/*` | shared `gate()`: IP and user limits (5 to 60 per min); export 2 per day, deletion requests per day |
| `/api/shop/referral/apply`, `/affiliate/*`, `/coins/*`, `/subscriptions/*` | limits from `growth-config.ts` and `AFFILIATE_CONFIG` |
| Public reads: `/api/shop/layout`, `/home`, `/theme`, `/config`, `/flash-sales` | IP 120 per min; `/offers/quote` 60 per min |
| `/api/shop/internal/*` (notify, refund, wallet, growth) | IP 30 to 60 per min then a signed request: HMAC signature header plus a timestamp within 5 minutes (stale refused) |

Other routes: `/api/vendor/*` (15 routes, see [VENDOR-PORTAL.md](VENDOR-PORTAL.md)); `/api/rider/*` (10 routes: PIN sign-in with 5 attempts per 15 min per phone and per IP then a 15-minute lock counted in Firestore, deliveries, location at most 4 writes a minute, per-delivery code, cash, exception); `/api/admin/session` (login 5 per 15 min per IP, status 60 per min) and `/api/admin/email`; `/api/cron/*` (subscriptions, rate-limits plus unpaid-order sweep, weekly-digest; only Vercel Cron with the `CRON_SECRET` bearer token, 503 when the secret is shorter than 16 characters); `/api/internal/order-status` (per-IP limit before the HMAC check); `/api/webhooks/resend` (Svix signature); `/api/unsubscribe` (signed token). Eight old public form routes (contact, data-request, feedback, lead, lead/image, newsletter POST, order-intent, waitlist) answer **410 Gone** while `RETIRED_FORM_ROUTES` is true in `lib/http/retired.ts` (the site forms post to the Google Sheet instead). Known gap: anonymous Firebase sessions are still accepted by the shop server for customer actions until PR #127 merges (see [WEBSITE-KNOWN-ISSUES-AND-NEXT.md](WEBSITE-KNOWN-ISSUES-AND-NEXT.md)).

## Deploy

- **Shop (this repo)**: Vercel project `glowvai` deploys automatically on **merge to `main`** (GitHub integration). Merging a PR therefore deploys the website. Docs-only commits are pushed with `[skip ci]` in the message so Vercel does not redeploy.
- Deploy only from the clean checkout `wt-deploy-shop` (equal to origin/main). `shop-main-deploy` is stale (148 commits behind, stray edits) but still linked to the live project: do not deploy from it.
- **Admin console** is a separate repo and deploys by CLI.
- **Vercel Hobby limit: 100 deployments per account per rolling 24 hours, every project and every preview deploy counts.** `scripts/deploy-guard.mjs <project>` asks Vercel for the real account count: under 80 allowed, 80 to 89 allowed with a warning, **90 or more refused** (`--emergency` allows up to 97), and a local-log fallback that stops at 60 if Vercel cannot be asked. Run it before every `vercel deploy`. The 14 Nov block happened when the limit was reached.
- The Spark plan has no Firestore TTL, which is why the daily cron deletes expired rate-limit counters.

## Tests

131 files, about 1,742 `test(`/`it(` cases by static count (15 Nov audit: 1,581 passing). Runner: Node's built-in `node --test` through `__tests__/vendor/register.mjs`, one `npm run test:<area>` script per folder (vendor, vendor-web, vendor-remaining, refunds, support, stock, reviews, returns, variants, notify, features, affiliate, growth, wallet, rider, tracking, wishlist-orders, checkout, settings, shop-gaps, orders-paging, privacy, first-visit, account-setup, layout, session, lead, ratelimit, orders-pending, polish, and more), plus `npm test` for entity, schema and email-analytics scripts. Tests call pure modules; none calls Firebase. Style tests such as `__tests__/vendor-web/portal-style.test.ts` fail on warm colours, web fonts or emoji.

## Temporary phone sign-in switch

`REQUIRE_PHONE_SIGN_IN` in `glowvai-app/features/auth/accountGate.ts` (env `NEXT_PUBLIC_REQUIRE_PHONE_SIGN_IN`, default off) lets every visitor open Orders, Account, wishlist and wallet while phone verification is not live; screens that need a profile show a "Sign in" empty state, and checkout keeps using the current guest session.
Set `NEXT_PUBLIC_REQUIRE_PHONE_SIGN_IN=true` (and redeploy) to restore the full gate; both values are tested in `__tests__/account-setup/account-gate.test.ts`.
