# GLOW VAI VENDOR: the vendor mobile app

Status date: 16 Nov 2026. Location: `d:\Client Projects\GlowVai\GLOW VAI VENDOR\glowvai-vendor-app` (its own git repo, `Sathveek123/GLOWVAI-VENDOR-APPLICATION`, branch `frontend-preview`, head `2d90848`, last commit 12 Nov 2026, 45 commits; the parent folder `GLOW VAI VENDOR` itself is not a repo). The app is the phone companion of the web portal ([VENDOR-PORTAL.md](VENDOR-PORTAL.md)); both talk to the same API on the shop server.

## What it is

The app local beauty and skincare stores use to sell through GlowVai: create a store account, apply, go online, receive order offers, accept or decline, pack, see what is waiting for pickup, manage stock, request products, see activity, get support. Expo SDK 51, Expo Router 3.5, React Native 0.74, TypeScript, Zustand, Firebase JS SDK 10. Android and web run; iOS config exists but is untested. Package `com.glowvai.vendor`, scheme `glowvaivendor`.

## Backend dependency (read this)

- **Current code**: the app no longer uses its old Express backend. Commit `b6aaec5` ("remove the legacy Express backend client and socket") and the `vendor-connect*` merges moved every call to the **shop server's `/api/vendor/*`** (`mobile/src/services/vendorApi/*`, base URL from `EXPO_PUBLIC_VENDOR_API_URL`, production value `https://glowvai.in`). Sign-in is Firebase email and password on the shared project `glowvai-38bde`.
- **The old Render server** (`backend/`, `render.yaml`, service `glowvai-vendor-api`, Firebase project `glowvai-v2`, mock mode) is **legacy and retired in code**, but the Render service may still be running: it has a payment check that always succeeds and order creation without sign-in (`backend/src/server.js:1416`). It is flagged in the 15 Nov audit as P0 item 6. Owner must confirm it is stopped. The app does not need it.
- **Local `.env` points at `http://localhost:4000`.** Production builds refuse to start when the API URL is missing, local, or not https (`mobile/src/config/env.ts`, `getConfigStatus()`), so the app must be built with `EXPO_PUBLIC_VENDOR_API_URL=https://glowvai.in`.
- Everything the app can do depends on the shop deploy being live with the vendor routes. Recent routes (`ready`, `returns`, `payouts`) exist on the server but the app does not call them yet.

## Structure

| Path | What it is |
|---|---|
| `mobile/app/` | Expo Router screens: `(auth)`, `(onboarding)`, `(vendor)`, `index.tsx` (splash and session router), `_layout.tsx` (fonts, config gate, auth listener) |
| `mobile/src/services/vendorApi/` | Typed client: `http.ts` (fetch with token, friendly errors), `account`, `orders`, `inventory`, `analytics`, `productRequests`, `push`, `support` and pure rule files |
| `mobile/src/features/` | `orders` (sync, offers, order cards, packing), `catalog` (stock), `onboarding`, `money`, `notifications`, `profile`, `support` |
| `mobile/src/store/useVendorStore.ts` | Zustand store |
| `mobile/src/theme/` | Tokens and typography (Inter, JetBrains Mono for codes; blue `#0057FB`, canvas `#F4F6FA`). **This app still uses Inter, not the website's system font or Roboto** |
| `mobile/tests/unit/` | 4 test files, 29 tests (`npm run test:unit`) |
| `backend/`, `render.yaml` | Legacy Express server, retired |
| `web/` | Static `index.html` PC prototype, not connected |
| `docs/`, `screen_docs/`, `web_screen_docs/` | Specs. `docs/CONNECTIONS.md` is the Firestore contract, `docs/VENDOR_API.md` the API; docs 00, 01, 02, 04, 07 and 09 describe an older design that was never built |

Shell (`app/(vendor)/_layout.tsx`): every vendor route needs a signed-in vendor whose store is approved (`GET /api/vendor/me` APPROVED_ACTIVE or APPROVED_PAUSED); other states go to the status screen. Five tabs: **Home, Orders, Inventory, Earnings, Profile** (bottom bar on phones, left sidebar from 1024 px). The shell runs order polling (20 s online, 60 s offline, backoff 40 s to 5 min) and a 60 s presence heartbeat, and shows new offers over every screen.

## Screens (40 route files)

Connected to the live API:
- Auth: `login` (email and password), `register`, `verify-email`, `forgot-password`; `otp` only explains that SMS sign-in is not available.
- Onboarding: `step-a` store details, `step-b` PAN and GSTIN, `step-c` payout bank account, `step-d` categories, review and submit; `pending` shows application status (also for rejected, documents requested, suspended).
- Vendor: `home` (command centre, online toggle), `orders`, `order-detail`, `pack-order` (checklist then mark packed), `ready-pickup` (view only: packed orders waiting; no handover button), `catalog` and `add-sku` (stock per product and option, from the published catalogue), `product-request`, `analytics`, `earnings` (order value only, "not your earnings"), `notifications` (built from real order events), `profile`, `bank-edit`, `compliance`, `security` (change password), `support` (tickets), `payout-detail` and `tax-documents` (honest "not set up yet" states).

Shown as "not available yet" (`ComingLater`): `returns`, `reviews`, `expiry` (batches), `recommended-skus`, `procurement`, `promotions`, `multi-store`, `team`.

Rules the app follows: no sample data or fake success; never shows a customer's phone, address or location; a vendor never marks an order delivered; declining always needs a reason.

## Status

| Area | State |
|---|---|
| Sign-in, onboarding A to D, status | Connected to `/api/vendor/me` and `/application` |
| Orders: offers, accept (atomic), decline, pack, packed | Connected |
| Ready for pickup | View only; the server has `POST .../ready`, the app does not call it |
| Inventory and product requests | Connected |
| Analytics, support | Connected |
| Push for new orders | Registration code exists (`pushRegistration.ts`, `POST /api/vendor/push-token`); real delivery unconfirmed |
| Earnings and settlements | Not connected; the server now has `GET /api/vendor/payouts`, the app does not use it |
| Returns | Not connected; the server has `GET /api/vendor/returns` (read only) |
| Phone OTP sign-in | Not available (needs an SMS provider) |
| Release signing | **Not ready**: release builds are signed with the debug keystore; must not go to the Play Store. Expo SDK 51 is old and should be upgraded before launch |
| Tests | 29 pass (15 Nov audit) |

## Unbuilt
Handover to rider with QR or code verification, return handling, reviews, batches and expiry, demand suggestions, promotions, supplier purchase orders, multiple stores, staff accounts, payout and tax statements, vendor phone OTP, real-device push confirmation, iOS testing, Play Store signing.

## Run it
```bash
cd mobile
npm install
cp .env.example .env     # set EXPO_PUBLIC_VENDOR_API_URL (https://glowvai.in for production)
npx expo start
npm run test:unit
npx tsc --noEmit
```
Environment variables: `EXPO_PUBLIC_VENDOR_API_URL`, `EXPO_PUBLIC_CUSTOMER_APP_URL`, six `EXPO_PUBLIC_FIREBASE_*` keys (public identifiers, not secrets), `EXPO_PUBLIC_SELLER_SUPPORT_EMAIL`, `EXPO_PUBLIC_SELLER_SUPPORT_PHONE`. Never put a secret in an `EXPO_PUBLIC_` variable. Known weak spots from the audit: `backend/.env` holds weak, human-chosen secrets and is ignored by the backend; Android release build uses the debug key.

## Documentation links
`docs/README.md` (index), `docs/CONNECTIONS.md` (data contract), `docs/VENDOR_API.md` (API), `docs/12_TYPOGRAPHY_SYSTEM.md`. Website side: `VENDOR-PORTAL.md` in the shop repo `docs/` folder.
