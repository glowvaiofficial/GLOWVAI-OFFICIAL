# Website pages and shop screens (complete list)

Status date: 16 Nov 2026. Read from `app/**/page.tsx` and `glowvai-app/features/*/routes.tsx` on `origin/main`.

**Totals.** 59 `page.tsx` files in `app/` (39 site pages, 20 vendor portal pages). Dynamic pages expand to 4 careers areas, 5 concern pages, 3 help topics, 3 partner kinds, 1 published journal article and 6 product pages (from `config/products.ts`, 6 published products). Shop app: 76 registered screen routes plus 23 older screen names kept in `glowvai-app/App.tsx` (99 names in all; `checkout-express`, `settings-wallet`, `settings-gift-cards` and `settings-privacy` are typed in `core/routes/names.ts` but have no route of their own). Rider page 1. API routes: 114 (see [WEBSITE-ARCHITECTURE.md](WEBSITE-ARCHITECTURE.md)).

## 1. Site pages (all public, all devices)

| Path | Purpose | Signed in? |
|---|---|---|
| `/` | Landing page: free AI skin scan and 15-min delivery (`app/page.tsx`) | No |
| `/shop` and `/shop/...` | The shop app, see section 3 (`app/shop/[[...slug]]/page.tsx`) | Guests browse, see rules below |
| `/store` | Redirects to `/shop` (`app/store/page.tsx`) | No |
| `/face-analysis` | Free AI face scan page | No |
| `/product/[slug]` | Marketing product page (6 products) | No |
| `/concerns/[slug]` | Concern guides: breakouts-and-pores, dullness-and-glow, dehydration, dark-spots, sun-protection | No |
| `/journal`, `/journal/[slug]` | Skincare articles (1 published of 4 in `config/journal.ts`) | No |
| `/about`, `/our-story` | Brand pages | No |
| `/contact`, `/faq`, `/help`, `/help/[topic]` | Support. Topics: orders, payments, face-scan | No |
| `/delivery`, `/returns`, `/track-order` | Delivery, returns policy, order lookup form | No |
| `/privacy`, `/terms`, `/accessibility`, `/grievance` | Legal and compliance | No |
| `/careers`, `/careers/[area]` | Areas: marketing-sales-revenue, operations-delivery, engineering-product, customer-care | No |
| `/partners`, `/partners/[kind]` | Kinds: stores, brands, rider | No |
| `/sell` | Sell on GlowVai (vendor sign-up information) | No |
| `/affiliate`, `/affiliate/apply`, `/affiliate/dashboard`, `/affiliate/terms` | Affiliate programme | Dashboard needs sign-in |
| `/referral` | Referral portal (static, `ReferralPortalClient`) | No |
| `/press`, `/press/brand-kit` | Press pages | No |
| `/review/[token]` | Verified product review by email token | Token |
| `/unsubscribe` | Email unsubscribe (needs the signed token from the email) | Token |
| `/site-map` | HTML site map | No |
| `/rider` | Delivery partner page (phone + PIN, own strict CSP) | Rider PIN |
| `/admin`, `/admin2006` | Admin entry. `/admin` redirects to `/admin2006`; `/admin2006/console` is guarded by `middleware.ts` (session cookie `gv_admin`) | Admin |
| `/sitemap.xml`, `/robots.txt`, opengraph image | Generated (`app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx`) | No |

Old links `/shop?product=<id>` redirect (307) to the product page via `middleware.ts`.

## 2. Vendor portal pages (20, vendor email account)

Covered page by page in [VENDOR-PORTAL.md](VENDOR-PORTAL.md): `/vendor` (router), account group (sign-in, create-account, verify-email, forgot-password, onboarding, status, profile, security, support) and ops group (home, orders, order detail, pack, inventory, product-requests, analytics, earnings, payouts, notifications).

## 3. Shop screens (`/shop`)

One URL, screens switch in memory (`context/AppContext`). Deep links: `/shop?product=ID` opens a product, `?order=ID` opens an order, `?inbox=1` opens notifications, `?track=ORDER&k=TOKEN` opens the public shared tracking view (`glowvai-app/App.tsx`).

Guest rules come from `features/auth/accountGate.ts`: **guest** screens open without an account; everything else (default deny) needs a phone-verified account and sends the visitor to sign-in, which remembers where to return. A guest can browse, add to cart, open the cart, set a delivery area, check a pincode, toggle the heart and read the scan intro. Sign-in is asked for checkout, placing an order, payment, orders, account, saving a named address, starting a scan and uploading a scan photo.

Device column: **Both** = same screen on phone and PC (phone frame on wide screens for the older screens), **Phone/PC** = a separate PC layout exists (switches at 1024 px, `useIsPc.ts`, `homeDevice.ts`).

### Auth and onboarding (11)
| Screen name | Purpose | Device | Access |
|---|---|---|---|
| `auth-welcome`, `auth-onboarding` | Blue onboarding intro (also from settings) | Both | Guest |
| `auth-onboarding-success` | End of onboarding | Both | Account |
| `auth-login` | Phone number sign-in | Both | Guest |
| `auth-otp`, `auth-verify-otp` | SMS code | Both | Guest |
| `auth-profile-setup` | Name and details after first sign-in | Both | Account |
| `auth-skin-survey` | Skin quiz with photos | Both | Account |
| `auth-change-phone` | Change phone number | Both | Account |
| `auth-student-verify` | Student verification | Both | Account |
| `auth-permissions` | Location and notification permissions | Both | Account |

### Shop, catalogue (7)
| Screen name | Purpose | Device | Access |
|---|---|---|---|
| `shop-home` (and legacy `home`) | Home | Phone/PC | Guest |
| `shop-browse` (legacy `categories`) | All products with filters | Phone/PC | Guest |
| `shop-category` | One category | Phone/PC | Guest |
| `shop-product` (legacy `product-detail`) | Product page | Phone/PC | Guest |
| `shop-product-reviews` | Reviews and questions | Both | Guest |
| `shop-search-filters` (legacy `search`) | Search, filters, sort | Phone/PC | Guest |
| `shop-wishlist` | Wishlist | Both | Account |

### Cart, checkout, location (13)
| Screen name | Purpose | Device | Access |
|---|---|---|---|
| `cart-tab` (legacy `cart`) | Cart, coupons, coins | Both | Guest |
| `checkout`, `checkout-review` | Delivery details and review | Both | Account |
| `checkout-payment-method` | Payment options (COD, Razorpay) | Both | Account |
| `checkout-payment-processing` | Confirming your order | Both | Account |
| `checkout-payment-success`, `checkout-payment-failed` | Result screens | Both | Account |
| `address-list`, `address-add`, `address-saved` | Saved addresses | Both | Account |
| `location-setup`, `location-map-picker`, `location-serviceability` | Delivery area, map pin, pincode check | Both | Guest |

### Orders (6)
`orders-list` (legacy `order-history`), `orders-detail`, `orders-tracking` (legacy `order-tracking`), `returns-request`, `orders-rate` (all Account, Both devices); `orders-shared-tracking` (public with token, Guest).

### Skin scan and routine (13)
Scan: `scan-tab` and `scan-intro` (Guest), `scan-camera`, `scan-gallery`, `scan-preview`, `scan-analyzing`, `scan-report`, `scan-failed` (Account to start). Routine: `recommend-overview`, `recommend-routine`, `recommend-ingredients`, `recommend-patch-test`, `recommend-checkout` (Account). Older scan screens still in `App.tsx`: `face-prep`, `face-capture`, `face-loading`, `skin-report`, `streak-tracking`.

### Account, settings, help (20 registered)
`profile-tab` (legacy `profile`), `profile-overview` and `profile-edit` (edit screen), `profile-settings` (settings hub, 15 sections: profile, addresses, language, notifications, subscriptions, wallet, gift cards, privacy, sell, affiliate, quiz, intro, help, activity, sign out), `profile-support` (legacy `support`), `profile-referrals`, `profile-referral-code`, `profile-referral-transactions`, `profile-subscriptions`, `profile-student-status`, `debug-app-doctor`; settings pages `settings-language`, `settings-notifications`, `settings-activity`, `settings-sell` and `settings-affiliate` (open `/sell` and `/affiliate`), `help-index`, `help-faq`, `help-terms`, `help-privacy`. All need an account.

### Wallet, notifications, privacy (6)
`wallet-home` (coins wallet), `notifications-list`, `privacy-center`, `privacy-devices`, `payment-methods`, `gift-cards`. All need an account.

### Older names kept in `App.tsx` (23)
`welcome`, `onboarding`, `login`, `otp`, `customer-details`, `face-prep`, `face-capture`, `face-loading`, `skin-report`, `home`, `categories`, `search`, `product-detail`, `cart`, `payment-status`, `order-confirmation`, `order-cancelled`, `order-tracking`, `streak-tracking`, `order-history`, `profile`, `support`, `student-referral`. Unknown names fall back to the shop home.

### Shell
Phone bottom bar (`components/common/BottomNavBar.tsx`): Home, Categories, Skin scan, Orders, Account, with a "View cart" mini bar above it when the bag has items. PC top header on `/shop` home is `ShopDesktopHome`'s own header; other screens use `components/common/WebHeader.tsx`. The maintenance page (`features/shop/MaintenanceGate.tsx`) replaces the shop when the admin turns maintenance on.
