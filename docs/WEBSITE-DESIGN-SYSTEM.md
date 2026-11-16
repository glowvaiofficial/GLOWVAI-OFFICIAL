# Website design system

Status date: 16 Nov 2026. Owner rules live in `design-reference/DESIGN-SPEC.md` (workspace root, sections 2b and 9). Code: `glowvai-app/glowvai.css` (tokens), `glowvai-app/features/shop/styles/*.css`, `lib/shop/theme.ts`, `lib/shop/accents.ts`. The older marketing-site design system is in [01-DESIGN-SYSTEM.md](01-DESIGN-SYSTEM.md) and still describes the landing pages (Inter and Familjen Grotesk in `app/layout.tsx`).

## Fonts

**On main (as of 16 Nov 2026): one system UI stack on `/shop` and `/vendor`, no web font loaded.**
`--gv-font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` in `glowvai-app/glowvai.css`; `--font-body`, `--font-heading` and `--font-brand` alias it. `app/shop/[[...slug]]/page.tsx` loads no `next/font`. The vendor layout sets the same stack inline (`app/vendor/layout.tsx`). A saved admin theme font can never bring a web font back: both allowed names (`manrope`, `syne`) map to the system stack (`lib/shop/theme.ts`). The marketing pages (`/about`, `/contact`, `/privacy`, `/terms`, `/returns`) still load Inter, Familjen Grotesk and a mono font from `app/layout.tsx`; that was left on purpose (QA note in `design-reference/qa-web-live.md`).

**DONE (merged 16 Nov 2026): Roboto font parity.** PR #146 (`web-font-parity`) is **merged**; it was checked by eye in headless Chrome at 1440 and 390 on the home, browse and product screens only (cart with items and the filter sheet were not captured). It changes the token to `--gv-font: var(--font-roboto), Roboto, system-ui, ...` so the website uses the same Roboto as the Android app, moves weights to 400/500/700 (the audit counted 332 declarations using 600/650/800), and adds the colour tokens and hover motion described below. Until it merges, nothing in this document about Roboto is live. Numbers use tabular numerals for prices, MRP, phone numbers, counts and timers (spec section 9).

Type scale (spec): display 28/32, h1 22/28, h2 18/24, section title 16/22, body 14/20, caption 12/16, micro 10/14, price 16/20, MRP struck 12/16.

## Colour tokens

Rule (owner, 15 Nov): **one colour, not a rainbow.** Brand blue plus neutrals, green for savings, red for errors. No orange, amber, brown or gold in UI code (enforced for the vendor portal by `__tests__/vendor-web/portal-style.test.ts`; the theme loader ignores warm hues 0 to 75 and 335 to 360 through `isWarmColour`).

On main (`glowvai-app/glowvai.css`): `--primary #0057fb`, `--primary-dark #0046cc`, `--primary-light #eaf1ff`, `--bg #f7f9ff`, `--text-primary #161a22`, `--text-secondary #545b69`, `--success #19734f`, `--error #c13f4b`. PC home tokens (`shop-desktop-home.css`): `--desk-bg #f5f7fd`, `--desk-surface #fff`, `--desk-line #e6eaf5`, `--desk-ink #141b34`, `--desk-muted #5b6178`, `--desk-brand #0057fb`, `--desk-brand-dark #0046cc`, `--desk-success #17753a`, radii 12/16/20/24, max width 1440, page padding 24. Admin theme defaults (`lib/shop/theme.ts`): brand `#0057fb`, ink `#071b4d`, muted `#53617d`, line `#dce6ff`. The legacy `.is-saffron` stripe is the India flag beside the phone field, not UI colour. A few older rules still carry amber-ish `--warning` tokens for warning notices; PR #146 consolidates tokens into `--gv-blue`, `--gv-blue-dark`, `--gv-blue-tint #eef3ff`, `--gv-ink #0b1b3f`, `--gv-muted #5b6780`, `--gv-hairline #e1e6f0` (pending).

Accent palette for items, sections and the header wash (`lib/shop/accents.ts`): amethyst `#7C3AED`, sky `#0EA5E9`, teal `#14B8A6`, lime `#84CC16`, rose `#F43F5E`, berry `#C026D3`, indigo `#4F46E5`, ink `#1E293B`. Category map: serums amethyst, moisturizers sky, sunscreen teal, cleansers lime, treatments rose, offers berry, brands and trust indigo, shop all ink. Admin accents must be `#RRGGBB`; anything else is dropped.

## Hover and motion

- PC home: motion tokens `--desk-fast 160ms`, `--desk-mid 240ms`, `--desk-slow 360ms`, ease `cubic-bezier(.22,.61,.36,1)`; card hover lifts with `--desk-shadow-hover`; hero auto-advances every 6 s and pauses on hover or focus; sections rise in once with staggered cards, armed only after a real scroll (PR #145).
- Phone home: accent wash cross-fades in about 250 ms on tab change; presses scale slightly (`button:active { transform: scale(.98) }`); category tiles are white at rest with a soft tint on press (PR #144).
- A shared hover motion set across shop screens is part of pending PR #146.

## Accessibility

- Reduced motion: `prefers-reduced-motion` handled in 10 places in `glowvai.css` and in the home CSS and JS (smooth scroll, hero auto-advance, reveal are switched off).
- Focus: `:focus-visible` outline 2 px on buttons, links and inputs (`glowvai.css`); PC focus ring token `--desk-ring`.
- Tap targets: 40 px minimum on phone controls (PR #133), 44 px on the vendor portal.
- Names: PC header buttons carry `aria-label`s (Orders, Account, Wishlist, Notifications with unread count, Cart with total); sections use `aria-labelledby`; skeleton rows set `aria-busy`; carousel has `aria-roledescription`.
- Known gaps (audit `audit-web-pc.md`): decorative icons in commerce screens lack `aria-hidden`; focus order in the vendor portal and several screens was never checked in a browser; a signed-in user who skipped profile setup is not blocked from Account.
- Public statement page: `/accessibility`.
