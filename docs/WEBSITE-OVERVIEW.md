# GLOW VAI website: overview and status

Status date: 16 Nov 2026. Repo: `glowvaiofficial/GLOWVAI-OFFICIAL` (Next.js 16 App Router, TypeScript, Tailwind). Live at https://glowvai.in.
Everything below was read from the code on `origin/main` (head `a375fdc`, PR #145 merged 16 Nov 2026 08:56 IST). Nothing was run.

Related docs: [WEBSITE-SCREENS.md](WEBSITE-SCREENS.md), [WEBSITE-HOME-DESIGN.md](WEBSITE-HOME-DESIGN.md), [WEBSITE-DESIGN-SYSTEM.md](WEBSITE-DESIGN-SYSTEM.md), [WEBSITE-ARCHITECTURE.md](WEBSITE-ARCHITECTURE.md), [VENDOR-PORTAL.md](VENDOR-PORTAL.md), [VENDOR-APP.md](VENDOR-APP.md), [WEBSITE-KNOWN-ISSUES-AND-NEXT.md](WEBSITE-KNOWN-ISSUES-AND-NEXT.md).

## What the website is

One Next.js project that serves three things on one host:

1. **Marketing and info pages** (landing page, scan page, about, FAQ, legal, careers, partners, press, journal). 39 non-vendor `page.tsx` files under `app/`.
2. **The shop at `/shop`** (`app/shop/[[...slug]]/page.tsx`). It is a single-page app (`glowvai-app/`) that switches screens by an in-memory screen name (76 registered screen routes plus 23 older names in `glowvai-app/App.tsx`). It has two designs: a phone design (under 1024 px) and a PC design (1024 px and wider) for home, browse, category, search and product.
3. **The vendor web portal** at `/vendor` (20 pages under `app/vendor/`) with 15 vendor API routes under `app/api/vendor/`. See [VENDOR-PORTAL.md](VENDOR-PORTAL.md).

The same Firebase project (`glowvai-38bde`) is shared with the admin console and the vendor app. The admin console is where the owner designs the home page; the shop only reads it (`/api/shop/layout`).

## Status on 16 Nov 2026

| Area | State | Evidence |
|---|---|---|
| Phone home (premium layout, admin driven, accent wash) | Live | `glowvai-app/features/shop/screens/ShopHomeScreen.tsx`, `mobile/MobileHomeParts.tsx` |
| PC home (own design, own admin layout, utility strip, hero + side tiles, brands, trust, footer) | Live | `features/shop/screens/ShopDesktopHome.tsx` (1,507 lines) |
| Designer driven order (admin Mobile / Desktop layouts, draft and published, preview token) | Live | `lib/shop/homeLayout.ts`, `app/api/shop/layout/route.ts` |
| Guest browsing (cart, location, scan intro open without sign-in) | Live (PR #134) | `features/auth/accountGate.ts` |
| Stale order popup fix | Live (PR #139) | commit `f972ffe` |
| PC browse, category, search and product pages | Live (PR #143) | `features/shop/desktop/PcListing.tsx`, `PcProduct.tsx` |
| Blank gap on PC home fix | Live (PR #145) | commit `778f27a`, `useRevealOnScroll` in `ShopDesktopHome.tsx` |
| Vendor portal: orders, ready for pickup, read-only returns, payouts ledger | Live (PRs #135, #138) | [VENDOR-PORTAL.md](VENDOR-PORTAL.md) |
| Roboto font parity, 400/500/700 weights, one colour set, shared hover motion | **Done: PR #146 (`web-font-parity`) merged 16 Nov 2026** | see [WEBSITE-DESIGN-SYSTEM.md](WEBSITE-DESIGN-SYSTEM.md) |
| Phone-verified accounts required for orders and payments | **Held: PR #127 (`web-auth`) is not merged** (owner decision: wait for real OTP) | `MORNING-REPORT-2026-11-16.md` |
| Real SMS for phone sign-in | Not set up (Firebase test number only) | `PROGRESS.md` owner to-do 4 |

Tests: 131 test files under `__tests__/` containing about 1,742 `test(`/`it(` cases (static count, `grep`). The 15 Nov audit recorded 1,581 passing. There is no single `npm test` for all of them: each folder has its own script in `package.json` (for example `npm run test:vendor-web`, `npm run test:layout`).

## Timeline (from `git log`)

The repository has 394 commits. First commit 3 Oct 2026 ("Complete GLOW VAI quick-commerce landing page & face analysis application"). Commits per day around the shop and vendor work: 5 Nov 17, 6 Nov 51, 7 Nov 13, 12 Nov 23, 13 Nov 60, 14 Nov 34, 15 Nov 62, 16 Nov 42 (up to the time of this document).

| When (IST) | PR | What changed |
|---|---|---|
| 13 Nov, evening | #85 to #92 | Designer layout order, block content, offers, flash sales, seasonal presets with a hero slide show, product rows, item pictures |
| 14 Nov, early | #93 to #99 | Staff preview opens the home, hero content from admin, mini banners, offers strip, category tiles, deals, promos |
| 14 Nov, morning | #100 to #106 | Premium footer, new navigation bar, header search hint, voice search and cart count, footer links from admin |
| 14 Nov, afternoon to night | #107 to #109 | Sponsored spotlight banner, price band and price drop rows, 10 orders a day limit with a burst guard |
| 15 Nov, afternoon | #110 to #116 | Admin hero shown on shop, scan uses live CNN route, profile save fix, unpaid order expiry, late payment refunds, **desktop home with its own layout (#114)**, deploy guard at 90 of 100 |
| 15 Nov, evening | #117 to #119 | Accent data in the layout API, desktop home premium look, accent per section, PC logo-sized brand tiles |
| 15 Nov, night | #120 to #125 | **Premium mobile screens from the references (cart, checkout, payment, order placed, tracking, mobile home)**, website v4 (real logo, order from designer blocks), blocks rendering, header settings and maintenance mode, **PC home never copies the mobile layout (#124)**, accent wash and system font (#125) |
| 16 Nov, 02:58 to 03:51 | #126 to #135 | PC shop audit, QA fixes, scan results like the app, vendor portal audit, blue onboarding, theme cannot bring back warm colours or web fonts, **guest browsing (#134)**, vendor ready for pickup and returns tab (#135) |
| 16 Nov, 04:11 | #136 | Phone header logo readable on bright accent backdrops |
| 16 Nov, 07:42 | #137, #138 | Image-only admin hero shown as a full-bleed poster; **vendor payout ledger** |
| 16 Nov, 07:58 | #139, #140 | **Order placed/cancelled popup no longer replays on a fresh load**; phone home gets a Deals of the day rail, compact greeting, distinct category pictures, richer cards |
| 16 Nov, 08:27 | #141, #142 | Page titles and `/sell` h1; **PC shop home rebuilt** (utility strip, two-line delivery chip, search suggestions, category hover panels, hero with side tiles, sticky section links, brands and trust strips, richer footer) |
| 16 Nov, 08:30 | #143, #144 | **PC browse, category, search and product pages**; home category tiles white at rest, soft tint on press |
| 16 Nov, 08:56 | #145 | **Blank gap fix**: PC home sections can no longer stay invisible; scroll reveal arms only after a real scroll |
| 16 Nov, 08:59 | #146 (merged) | Roboto font parity, one colour set, shared hover motion |

## How the home page is controlled

The admin Homepage Designer writes Firestore `siteContent/homeLayout`. The shop reads it through `GET /api/shop/layout` (cached 60 s at the edge). Order, on/off, items, pictures, accents, footer details, header settings and maintenance mode all come from that one document. When the admin has saved nothing, the built-in default order is used. Details: [WEBSITE-HOME-DESIGN.md](WEBSITE-HOME-DESIGN.md).

## Where the numbers come from

- Route counts: `find app -name page.tsx` (59, 20 of them vendor), `find app -name route.ts` (114: 72 shop, 15 vendor, 10 rider, the rest cron, admin, forms and webhooks).
- Shop screen count: union of the `routes` maps in `glowvai-app/features/*/routes.tsx` (76 unique names) plus the `switch` in `glowvai-app/App.tsx` (23 older names).
- Deploy rules come from `PROGRESS.md` and `scripts/deploy-guard.mjs`.
