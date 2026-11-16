# Security and links review, 16 Nov 2026

Branch `web-links-sec`. Live crawl of https://glowvai.in with a guest browser at 390 and 1440 wide (52 pages each, every internal `<a>` from nav, footer, landing pages and /shop), plus a code read of `app/api` (117 handlers), `next.config.js`, `middleware.ts`.

## Part 1, links

| Finding | Status |
|---|---|
| Every crawled page returned 200 except `/concerns` (404). No redirect loops, no `href="#"`, no anchors without href, no console-visible dead footer links. | `/concerns` fixed |
| `/concerns` had no index although the footer and home section link to concern pages | Added `app/concerns/page.tsx` (cards from `config/concerns`, links to each `/concerns/<slug>`, link to /shop) |
| `/shop/<anything>` returned 200 with the home screen (soft 404) | Fixed: `dynamicParams = false` on `app/shop/[[...slug]]`, so only `/shop` renders, other paths give a real 404 (checked on a local production build: /shop 200, /shop/zzz 404, /shop/a/b 404) |
| Onboarding intro: Tab cycles only Next and Skip (it is a full-screen page, not a modal over other content, so there is nothing to escape to). Escape did nothing. | Escape now does the same as "Skip, show me products". The analytics consent banner (non-modal `role=dialog`) was not changed |
| Mobile menu | Opened and links followed during the crawl at 390; no failure seen |
| The shop is one client-side screen; its buttons are not links | Not crawled by URL. Button-by-button handlers inside /shop were covered by the earlier QA (qa-web-live.md) |

## Part 2, security

Already in place (verified live): HSTS, nosniff, Referrer-Policy, Permissions-Policy on pages, X-Frame-Options DENY on marketing pages and `frame-ancestors` on all (the shop allows only itself and the admin console), CSP enforced with `object-src 'none'`, `base-uri 'self'`, strict rider policy. Razorpay webhook verifies `x-razorpay-signature` on the raw body and is IP rate limited; Resend webhook verifies the Svix signature. Shop routes use `customerFrom` plus `limitByIp` and `limitByUser`, vendor routes `vendorRoute` and rider routes `riderRoute` (auth, IP and per-user limits). Cron routes check a secret. No `.env` is committed (only `.env.example`). `NEXT_PUBLIC_` values are Firebase web config, GA id, Maps key, site URL: all public by design (restrict the Maps and Firebase API keys by referrer in GCP). No source maps are served (`/_next` maps return 404; `productionBrowserSourceMaps` is not set).

Fixed here: `X-Powered-By: Next.js` header removed (`poweredByHeader: false`).

### Left alone (needs an owner decision or would change behaviour)
1. **Anonymous shop sessions** are accepted for orders, tickets, returns, referrals (`lib/shop/server.ts` `customerFrom`). Held with PR #127 and phone sign-in.
2. **CSP stays as it is.** It still has `'unsafe-inline'` for scripts and styles (Next inline bootstrap). Moving to nonces or a stricter enforced policy needs a browser pass on every page; do it as Report-Only first.
3. **Anyone can unsubscribe any email** (`/api/unsubscribe` POST has no token). Needs signed links in emails.
4. **`Access-Control-Allow-Origin: *`** is sent on static pages and static files by the host (not by our code); API routes do not send it. Vendor API CORS is an allow-list (`lib/vendor/cors.ts`). No change.
5. **`/shop` has no `X-Frame-Options`** by design: the admin console embeds it, and `frame-ancestors` already limits that to self plus the admin origin.
6. **Rate limits are in memory per server instance** on most routes (Firestore-backed only on rider sign-in and a few others), so a determined attacker spreads across instances. `/api/webhooks/resend` and the cron routes have no IP limit (signature or secret protected). Old public form routes (contact, data-request, feedback, order-intent, waitlist, review) have an in-memory limit only and are retired behind `RETIRED_FORM_ROUTES`.
7. **Dependencies:** `npm audit --omit=dev` reports 19 (5 high, 14 moderate), all transitive through `firebase-admin`/`@google-cloud/*` (`@grpc/grpc-js`, `undici`, `uuid`, `retry-request`). `npm audit fix` without `--force` changes none of them and `--force` is a breaking downgrade, so nothing was changed. Revisit when firebase-admin ships a fix.
8. **Console logging:** only mock-mode analytics and email logs (no secrets or customer data) and `[notify]` messages. No change.
9. **File uploads:** the website API has no direct upload route; images go to Firebase Storage under Storage rules (not in this repo, not reviewed).
10. Admin and vendor pages: `/admin2006/console` is gated by the signed session cookie in `middleware.ts`; `/admin2006` and `/vendor` login pages are public by design. Admin and vendor pages are not blocked from search by this review (SEO is another agent's area).

### Unverified
- Button handlers inside the /shop SPA were not clicked one by one here.
- File upload limits and Storage rules, Firestore rules, and Vercel environment values were not inspected.
- The route table was classified by code patterns, not by calling each route.
