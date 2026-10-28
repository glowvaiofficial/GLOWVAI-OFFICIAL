# ORIGINALITY REPORT (Part 9 self-audit)

Date: 28 October 2026. Scope: the home page, the shared header and footer, and the copy on pages I edited.
I did not run Copyscape, Google quote searches or reverse-image search. Those are manual checks (section 7).

## 1. Items checked
- Every heading, button label and paragraph on the home page (built HTML, 12 H2s, 1 H1).
- All copy in `config/home-content.ts`, `config/privacy-copy.ts`, and the FAQ array.
- Repository-wide search for the banned phrases in Part 9 B3.
- Repository-wide search for competitor and third-party brand names.
- Every font, icon set, npm package and image folder (see `LICENSES.md`).

## 2. Source of each line (home page)
| Section | SUPPLIED by you | WRITTEN by me |
|---|---|---|
| Top bar, header | Labels, phone, nav names | Short privacy line "Photos stored privately. Delete anytime." |
| Hero | Headline A, buttons, trust items, "Takes about 30 seconds. Face a window." (your Part 10 example) | Sub line "A 30-second face scan, then your routine at your door in Vijayawada." (shortened per Part 10), "or browse the shop" |
| How it works | Title, intro, three steps, tips, disclaimer | Time stamps 0:00 / 0:30 / ~15:00, eyebrow "Free face scan, 0:00 to 15:00" |
| What the scan checks | Title, four markers, sample values, "Your top pick" | Table headings, "seconds, start to finish" |
| Shop by concern | Title, intro, six concerns and lines | None (counts come from the catalogue) |
| Products | Titles, descriptors, actives, prices | "Full routine" line (computed) |
| Delivery | Title, intro, steps, pincode copy, note | Step numbers, "minutes, about" |
| Story | Title, three paragraphs, pull quote, timeline | None |
| Promises | Titles and bodies | Body 02 reworded to match what the scan does |
| Feedback | Title, body, list, form labels | None |
| Journal row | Title, excerpt, meta | None |
| FAQ | Questions and most answers | Answers 2, 3 and 7 reworded to be true to the product |
| Final call to action | Title, body, buttons | "or chat on WhatsApp" (was a button) |
| Footer | Links, newsletter copy | None |
THIRD-PARTY text: none.

## 3. Lines that could match a known slogan or competitor wording
No line matched a competitor slogan I know of. These were rewritten anyway because they were generic or unproven:
| Before | After |
|---|---|
| "temperature-controlled micro-hubs stocked with Minimalist, The Derma Co..." | "orders are packed at partner stores in Vijayawada and sent by rider" |
| "authentic Minimalist and The Derma Co formulations" (several pages) | Removed. Neutral wording. |
| "dermatological routine selection clear, fast, and reliable" | "choosing a skincare routine clear and fast" |
| "recommendations curated based on climate suitability and skin metrics" | "recommendations are based on your scan results" |
| "Democratise dermatological intelligence..." | "Make choosing skincare simple and fast..." |
| "it became a way to transform ideas into reality" | "a way to turn ideas into working things" |
| "Whether exploring Python, ... or ..." | "He explored Python, ..., and kept looking for ways to learn" |

## 4. Banned phrases found and removed
"transform" (2), "Whether ... or ..." (1). No other Part 9 B3 phrase remains in visible copy.
Note: "diagnostic", "unlock", "journey" and similar were removed earlier in this project.

## 5. Licences
See `LICENSES.md`. Packages: all MIT, ISC or Apache-2.0. Fonts: three SIL OFL fonts (re-check at fonts.google.com).
Images: **founder photos are own; every other image has no recorded source or licence** (UNCONFIRMED).

## 6. Claims that need proof, and whether proof was supplied
| Claim | Where | Proof supplied? |
|---|---|---|
| Delivery in about 15 minutes in covered areas | Home, FAQ, footer | No. Stated as "about" and "covered areas". Needs your operating data. |
| Partner stores pack orders | Delivery | No. Store type is a visible placeholder. |
| Products are genuine or sourced from authorised partners | Products, promises | No. Visible placeholders. |
| Prices at MRP or lower | Promises | No. Please confirm. |
| Camera reads texture, hydration, tone and clarity | Home, FAQ | **Not confirmed.** The scan appears to start from age and gender choices. Please confirm. |
| Photo stored privately, deletable on request | Privacy line | Matches the code. Confirm you honour deletion requests. |
| Instagram, X, LinkedIn profiles | Footer, schema | Supplied by you. |

## 7. Open risks
1. **Third-party brand names in the scan result.** `lib/recommend.ts` lists named Minimalist and The Derma Co products. Part 9 C1 and C2 need written permission. I did not change it.
2. **Brand-named pages and URLs.** `/shop/minimalist` and `/shop/the-derma-co` and their SEO copy (`config/seo-copy.ts`) name other brands.
3. **Image provenance.** Most images have no recorded source. Some show people and branded-looking packaging.
4. **Old unused sections** (`components/sections/*`, `components/chat/GlowVaiBot.tsx`) still contain older copy, including brand names and unproven claims. They are not on any page. Delete them or rewrite before reuse.
5. **Unproven wording on other pages** (shop, product, referral, scan) was not fully audited.

## 8. Manual checks you must do (Part 9 O-G)
- Run each main paragraph through Copyscape or Grammarly.
- Search ten key sentences in quotes on Google.
- Reverse-image-search every image (Google Lens, TinEye).
- Read each licence in `LICENSES.md`.
- Check the name, logo and tagline in the IP India trademark database.
- Have one person read the page aloud.
