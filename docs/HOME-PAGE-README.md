# GLOW VAI home page: handoff

## Run it
- `npm install`, then `npm run dev` (local) or `npm run build && npm start` (production check).
- Checks: `npm run seo:test`, `npx tsx --test __tests__/entity.test.ts __tests__/forms_submit.test.ts`.
- Hosting: Vercel. The static export for GitHub Pages is switched on only when `DEPLOY_TARGET=github-pages`.

## Where things live
| What | File |
|---|---|
| All home page copy (steps, concerns, products, delivery, story, promises, feedback) | `config/home-content.ts` |
| The ONE privacy statement, short form, medical note | `config/privacy-copy.ts` |
| FAQ questions and answers (page and FAQ schema read the same array) | `faqItems` in `config/content.ts` |
| Prices, sizes, product ids | `bestsellerProducts` in `config/content.ts` |
| Colours, fonts, shadows | `tailwind.config.ts`, `app/globals.css` |
| Home sections | `components/home/*` |
| Header, footer, sticky bar, WhatsApp button | `components/layout/*` |
| Analytics events (allowed list, banned keys) | `config/analytics-events.ts`, `lib/analytics/` |
| Security headers, redirects, cache rules | `next.config.js` |
| Serviceable pincodes (empty until you provide the list) | `config/serviceablePincodes.ts` |

## How to edit
- **Change wording:** edit the text in `config/home-content.ts`. No component change is needed.
- **Change the privacy line:** edit `config/privacy-copy.ts` only. It is used on the home page, FAQ, scan page and footer.
- **Change a price:** edit the product in `bestsellerProducts`. Discount badges and the routine total are calculated from it.
- **Add a pincode:** add it to `serviceablePincodes`. Until the list has entries, the pincode check shows "[REAL PINCODE LIST NEEDED]" and never says "available".
- **Change a concern card count:** counts come from the catalogue (`config/products.ts`); do not type them.
- **Add an FAQ:** add an item to `faqItems`. The schema updates by itself.

## Placeholders you must fill (search for `[` in `config/home-content.ts`)
1. `brandSourcePlaceholder` (sourcing line under the products)
2. Promise 04 "Genuine stock" body
3. Delivery step 2 "[CONFIRM: store type]"
4. Founder bios (three) and Rehmit's title
5. Timeline: two dates and two milestones
6. `referralStrip.terms` (reward wording and amount)
7. Scan page: "[CONFIRM AGE POLICY]" in `app/face-analysis/FaceAnalysisClient.tsx`
8. FAQ answers for data saved and returns: confirm against the real privacy and returns policies

## Privacy statement (important)
The scan currently uploads the photo and scores when the report form is submitted. The wording everywhere says so. If you change the scan so photos stay on the phone, change `config/privacy-copy.ts` and the scan code together.
