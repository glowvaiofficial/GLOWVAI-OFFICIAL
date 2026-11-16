# Website: known issues and what is next

Status date: 16 Nov 2026. Honest list. Sources: `PROGRESS.md`, `AUDIT-2026-11-15.md`, `design-reference/` (MORNING-REPORT-2026-11-16, gap-list, audit-web-pc, qa-web-live, audit-vendor-portal) and the code on `origin/main`. Items marked fixed were fixed after the audit.

## Held or pending (needs the owner)

1. **PR #127 `web-auth` is not merged.** It requires phone-verified accounts for orders, payments, addresses, returns and wallet. Until it merges the shop server still accepts anonymous sessions for customer actions (fake COD orders, tickets, returns, referrals; `lib/shop/server.ts` `customerFrom` returns `anonymous: true`). Merge only when real OTP works and the app signs in by phone. Merging deploys the shop.
2. **Real SMS for OTP.** Firebase phone sign-in works only for the test number on the free plan. Options: Firebase Blaze (10 free SMS a day, then about 6 rupees each) or MSG91/2Factor (about 0.18 to 0.25 rupees, DLT registration about 5,900 rupees, 1 to 7 days).
3. **PR #146 Roboto font parity is open.** Website still uses the system stack on main; see [WEBSITE-DESIGN-SYSTEM.md](WEBSITE-DESIGN-SYSTEM.md).
4. **Test data in the live catalogue.** A product "Test" (Rs 1, Serums), a "Test" brand filter, a "cars" concern and about 18 test orders (`qa-web-live.md`, `PROGRESS.md`). "Treatments" shows 0 products. Remove in the admin.
5. **Admin theme brand colour** was red `#ff0000`; the shop ignores warm colours, but set `#0057FB` in the admin.
6. **Old vendor backend on Render** may still be running; its `/api/payment/verify` always answers success and it creates orders without sign-in (`GLOW VAI VENDOR/glowvai-vendor-app/backend/src/server.js:1416`). Owner must confirm it is stopped.
7. Footer app links (App Store, Play Store), support contacts, homepage pictures and hero image come from the owner.
8. No Firestore backups exist on the Spark plan (admin has an on-demand backup).

## Design and product gaps

- **Designer style options are not read by the shop.** `STYLE-OPTIONS-CONTRACT.md` (per-section layout, card, badge, motion, countdown, stock bar; global `look`) is written, but `lib/shop/homeLayout.ts` ignores `style` and `look`.
- Font weights 600/650/800 are used in 332 CSS declarations; the spec wants 400/500/700 (addressed by pending PR #146).
- Accent palette: code still has lime `#84CC16`; the spec later changed cleansers to emerald `#10B981`.
- Hard-coded fallbacks that are not admin controlled: PC fallback promo cards ("Flat GLOW50 OFF", "Free Delivery"), the PC utility strip text (free delivery threshold, GLOW50), "Areas we deliver to" and "pincodes 520xxx" copy (`data/serviceability.ts`), PC side tiles.
- Search: suggested searches on the empty state, and applying home deep-link filters (concern, max price) on the search screen, are not built (`audit-web-pc.md`).
- Profile-setup gate: a signed-in user who skipped profile setup is not blocked from Account or checkout (needs an AppContext change).
- Phone header: the location chip can still clip to "Set l..." on narrow phones (QA 16 Nov). Several 34 px or 27 px small targets remain (product name button, legal links on sign-in).
- Marketing pages load Inter, Familjen Grotesk and a mono font (intentional) and have 20 to 22 px contact links and checkbox.
- Brands, Trust and Help-gift sections were never reviewed as their own sections (`PROGRESS.md` 14 Nov).
- Decorative icons lack `aria-hidden`; focus order and 390 px layout of the vendor portal were judged from classes, not a browser.

## Platform and cost risks

- Rate limits are per server instance unless a route uses the shared Firestore limiter; most shop routes are in-memory.
- Banner pictures over about 510 KB in total fail to publish (Firestore 1 MB document holds draft and published together).
- Shared free quota: 50,000 Firestore reads a day for shop, admin and vendor. The admin Products tab polling was fixed (15 Nov), but affiliates and search are still expensive.
- Vercel Hobby 100 deployments a day; the deploy guard stops at 90. Every merge to `main` deploys the shop.
- `shop-main-deploy` is stale but linked to the live project; deploy only from `wt-deploy-shop`.
- Not built yet: Beauty Insurance and product streaks (PRD), multi-vendor order matching and split delivery, cart sync to the account, a shop proxy route for the scan API, in-app legal reader, uptime and error monitoring.
- Marketing README facts (WhatsApp ordering, Bricolage and DM Sans fonts, coral and yellow palette) describe the original landing build and are out of date for `/shop`.

## Vendor portal gaps
No return decisions, no rider handover button, no bank or tax document upload, earnings page shows no earnings figure (the payouts page has the ledger and needs the admin's commission rate), push delivery unconfirmed, no vendor phone OTP. See [VENDOR-PORTAL.md](VENDOR-PORTAL.md) and [VENDOR-APP.md](VENDOR-APP.md).

## Suggested next steps, in order
1. Owner: choose the SMS provider, then merge PR #127 and deploy once.
2. Owner: review and merge PR #146 (fonts), then re-check PC and phone for weight changes.
3. Owner: remove test data, set theme colour, confirm the Render service is stopped.
4. Shop: read the designer's `style` and `look` fields once the admin writes them.
5. Shop: block account and checkout until profile setup is finished; admin-drive the remaining hard-coded promo and delivery copy.
6. Vendor: connect the vendor app to the new ready, returns and payouts routes (the app still shows Returns and settlements as "not available yet").
7. Monitoring: add an uptime check and error tracking.
