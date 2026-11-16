# Website home design: phone and PC

Status date: 16 Nov 2026. Code: `glowvai-app/features/shop/`. Owner direction and references: `design-reference/DESIGN-SPEC.md` (workspace root), one structure for app, phone web and PC web, dense, no orange, real logo.

`ShopHomeScreen` (`screens/ShopHomeScreen.tsx`) picks the design with `useHomeDevice`: 1024 px and wider gets `ShopDesktopHome`, narrower gets `ShopMobileHome`. `?device=desktop|mobile` forces one (the admin preview frames use it). Resizing across 1024 px switches without a reload (`lib/homeDevice.ts`). The home inside the skin report is always the phone one (`embedded`).

## Data model (designer)

Firestore `siteContent/homeLayout` (written by the admin, read only by the shop):

- `published` and `draft`: the **mobile** layout (also the default). Shape `{ blocks: [{id, enabled, position}], settings: [...per block], rows: [...], hero: {...} }`.
- `desktop: { published, draft }`: the PC layout, same shape.
- `maintenance: { enabled, message, until }` (document level).
- `headerSettings: { searchHints[], deliveryModes[], showDeliveryModes }` (read from the mobile layout, shared by both devices).
- Footer details (`appStoreUrl`, `playStoreUrl`, social URLs on allowed hosts only, `companyLine`) are always read from the mobile layout, so both devices share one footer.

Block ids (`lib/shop/homeLayout.ts` `HOME_BLOCK_IDS`, 20): hero, festival-strip, mini-banners, offers, bank-offers, cashback, categories, promos, deals, sponsored, reorder, product-rails, recommended, recently-viewed, brands, partners, trust, stories, help-gift, footer. Unknown ids are dropped, duplicates keep their first place, footer is always last and on. Item limits (`BLOCK_ITEM_LIMITS`): mini-banners 3, offers 3, brands 12, trust 3, help-gift 3, categories 8, deals 8, promos 4, festival-strip 6, bank-offers 4, cashback 3, partners 12, stories 8, sponsored 1. Product rows: sources category, brand, bestsellers, new, price-band, price-drop; at most 6 rows, limit 4 to 12, shown only with 4 or more products. Each item and block may carry a `#RRGGBB` accent (`lib/shop/accents.ts`); a bad value is dropped.

`GET /api/shop/layout` (`app/api/shop/layout/route.ts`): optional `?device=desktop|mobile` (anything else, or two values, answers 400), optional `?preview=<token>` for a staff draft (HMAC token, 403 when expired). It returns `{ blocks, settings, rows, hero, footer, headerSettings, maintenance, sectionAccents, preview, device, fallback }`. A live seasonal preset can replace the block order and theme (`lib/shop/presets.ts`). Limit 120 per minute per IP. Cache `public, s-maxage=60, stale-while-revalidate=120` (private no-store for preview). On a read error it answers the default layout, never a 500.

**Mobile and PC are separate designs.** `chooseLayoutSource` serves `desktop.published` only. With no saved desktop layout the response has `fallback: true` and the PC home uses its **own built-in default**; the mobile design is never copied to PC (PR #124, `64ccbfb`). The client default order when nothing loads is `DEFAULT_BLOCK_ORDER` in `lib/useHomeLayout.ts`: hero, categories, offers, promos, deals, product-rails, brands, mini-banners, reorder, help-gift, trust, footer.

`homeSequence(layoutOrder)` (`lib/homeModel.ts`) expands each block into drawing modules, so one designer block can draw several sections: deals gives deals + price-points; product-rails gives bestsellers + new-launches + product-rails + concerns; reorder gives reorder + recent (the built-in recent rail is dropped when the designer's recently-viewed block is on); footer gives scan + footer. The scan card is always shown, before the footer.

A contract for per-section style drop-downs and a global `look` (`design-reference/STYLE-OPTIONS-CONTRACT.md`, 16 Nov) exists, but **`lib/shop/homeLayout.ts` on main does not read `style` or `look` yet**; nothing changes visually from it.

## Phone home (`ShopMobileHome`, `mobile/MobileHomeParts.tsx`)

Top to bottom, then the admin's blocks in their published order:

1. **Header** (`MobileHomeHeader`): wordmark logo (white or ink, whichever reads on the current accent), location chip ("Deliver to ..." opens location setup), search button with rotating hint (`SearchHint`, hints from `headerSettings`) and a voice search button, optional delivery-mode switch (admin links, max 4), cart button with count, "Skin scan" pill, avatar with unread dot. Under it a tab row: For You, Acne care, Hydration, Glow, Firming, Barrier repair, All categories (`mobile/homeChrome.ts`).
2. **Accent wash**: the selected tab sets `--wash` on the whole header region; For You is brand blue `#0057FB`, concern tabs take palette accents (`paletteAccent`). A concern tab also narrows the "picks" shown under the greeting.
3. `SkinQuizBanner`, then the **greeting card**: "Hi, <first name>" or "Hi there", delivery cell ("Delivery in ~15 mins" or "Delivering to <area>"), and Track Order only when an order is in an active status (PLACED to OUT_FOR_DELIVERY).
4. **Blocks in admin order**. Built-in modules:
   - **Hero carousel** (admin hero, banners; an image-only hero shows as a full-bleed poster, `lib/heroPoster.ts`), followed by a **Deals of the day** rail (biggest rupee savings vs own MRP, hidden when a concern tab is chosen).
   - **Trending** (mini-banners), **Offers** chips, **Category tiles** (admin tiles, else Serums, Moisturizers, Sunscreen, Cleansers, Treatments plus Best sellers, New launches, Shop all; white at rest, soft tint on press, PR #144), **Promos**, **Flash Deals** (live flash sales with "Ends in" countdown, one row per sale), **Buy it again** (signed in only), product rails (configured rows, "Picked for your skin"), **price-point tiles** (Under 299 / 499 / 999, only those with products), Bestsellers, New launches, **Shop by concern** grid, Recently viewed, Recommended, **Brands**, **Trust**, **Help and gifts**, then the Face scan card.
   - Empty admin slots show nothing to customers (placeholders only in a staff preview).
5. "You've seen it all" card, then the **footer** (white logo, "Skincare, delivered.", store and social links only when set, four link groups: Shop, Help, Company, Legal, copyright and company line). A floating cart pill shows when the bag has items.
6. Phone bottom bar: Home, Categories, Skin scan, Orders, Account.

Loading shows skeleton rows; a failed catalogue shows "Products could not be loaded" with Try again while categories and offers still work.

## PC home (`ShopDesktopHome`, `styles/shop-desktop-home.css`)

1. **Sticky header band** tinted by the selected tab accent (`--wash`): a **utility strip** (free delivery threshold, coupon GLOW50, Free AI skin check), then logo, **two-line delivery chip** ("Delivery in N mins" over the city), **search** with rotating hint, voice button and a hover panel of **popular searches and shop-by-concern**, optional delivery-mode switch, and actions: Skin scan pill, Orders, Wishlist heart, Notifications bell with unread badge, Account/Login, Cart with count and total. Then a **category tab row** (For You plus the 5 categories, hover panels) and **in-page section links** (Deals of the day, Top deals, Best sellers, New launches, Shop by concern, Brands) that appear once the page is scrolled.
2. **Greeting strip**: "Hi, <name>" or "Welcome to GlowVai", "Discover. Shop. Glow.", delivery estimate, Track Order when active.
3. `SkinQuizBanner`; a category tab other than For You shows a spotlight rail for that category first.
4. **Blocks in admin order** (desktop layout or built-in PC default): **hero carousel with two side tiles** (Face scan, Coupon GLOW50; slides auto-advance every 6 s, pause on hover/focus), Deals of the day rail, Trending, Offers, **category tiles** (balanced columns, up to 10 per row), **promos** (up to 4), Top deals with flash-sale countdown, Buy it again, product rails, price points, bestsellers, new launches, concerns, recently viewed, recommended, **brands** (admin logos, else live catalogue brands, 12 max), **trust strip**, help-gift, scan card.
5. "You've seen it all", then a **richer footer**: Back to top, brand, store/social pills, Categories column plus the four link groups.
6. Motion: sections below the fold rise in once with staggered cards, hover lifts on cards, reduced motion respected. **The reveal only arms after the visitor actually scrolls** (wheel, touch, key or scroll), so a captured, printed or unscrolled page never shows an empty gap (PR #145).

Product cards on PC show brand lines, discount badge, price and MRP, Add and wishlist heart (`DeskProductCard`).

## PC browse, category, search, product (PR #143)

`ShopBrowseScreen`, `ShopCategoryScreen`, `ShopSearchFiltersScreen` and `ShopProductScreen` switch to `desktop/PcListing.tsx` and `desktop/PcProduct.tsx` when `useIsPc()` is true (1024 px+). Listing has category and concern filters (labels such as "Serums & Actives", "Acne & Blemishes"), sort (relevance, price both ways, top rated), grid or list view, refresh and empty states. Styles in `styles/shop-pc-browse.css`.

## Accent rules in one place

Brand blue `#0057FB` and neutrals at rest; per-section or per-item accents appear only as the header wash, selected tab, or when the admin sets an accent; text on an accent is white or deep ink by contrast (`mobile/accentTheme.ts`, 4.5:1 target). Palette in `lib/shop/accents.ts`: amethyst `#7C3AED`, sky `#0EA5E9`, teal `#14B8A6`, lime `#84CC16`, rose `#F43F5E`, berry `#C026D3`, indigo `#4F46E5`, ink `#1E293B` (the spec text later renames lime to emerald `#10B981`; the code on main still has lime). See [WEBSITE-DESIGN-SYSTEM.md](WEBSITE-DESIGN-SYSTEM.md).
