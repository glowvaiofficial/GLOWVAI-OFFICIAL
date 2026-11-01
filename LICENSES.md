# Third-party licences (GLOW VAI)

Checked: 28 October 2026. Package licences were read from the installed `package.json` files. Fonts and images
are marked where I could not verify the source or licence from inside the repository.

## Software (npm)
| Item | Licence | Version | Used for |
|---|---|---|---|
| next | MIT | 16.3.8 | Web framework |
| react, react-dom | MIT | 19.3.0 | UI library |
| tailwindcss, postcss, autoprefixer | MIT | 3.4.19 / 8.5.28 / 10.6.1 | Styling build |
| tailwind-merge, clsx | MIT | 3.7.0 / 2.1.1 | Class name helpers |
| zustand | MIT | 5.0.15 | Cart state |
| zod | MIT | 4.6.5 | Form and env validation |
| resend, svix | MIT | 6.32.1 / 2.8.0 | Email sending and webhook signatures (server routes) |
| lucide-react | ISC | 1.50.0 | Icons (one set, line style) |
| typescript, @types/* | Apache-2.0 / MIT | 6.0.3 / various | Type checking |
| eslint, eslint-config-next | MIT | 9.39.5 / 16.3.8 | Linting |

`framer-motion` was removed on 28 October 2026 because it was not used.

## Fonts (self-hosted by `next/font`)
| Font | Licence | Used for | Status |
|---|---|---|---|
| Familjen Grotesk | SIL Open Font License 1.1 (as listed on Google Fonts) | Headings and numerals | Licence per Google Fonts listing. Re-check at fonts.google.com before launch. |
| Inter | SIL Open Font License 1.1 (as listed on Google Fonts) | Body text | Same as above. |

## Images and graphics
Source, author and commercial-use terms for the files below are **not recorded in this repository**. Until the
owner records them, treat each as UNCONFIRMED (see Part 9 D5 and D7).

| Files | What they are | Status |
|---|---|---|
| `public/images/founders/*` | Photos of the three founders | Own photos. Owner to confirm consent and file ownership. |
| `public/images/hero/face-scan-selfie.*`, `public/images/home-ai/*`, `public/images/story-ai/*`, `public/images/referral/*`, `public/images/face-scan/*`, `public/images/face-analysis/*` | Illustrations and photo-style images (folder names suggest AI generation) | UNCONFIRMED. Owner to record the tool or photographer and the licence. They show people and must be fictional or consented. |
| `public/images/products/*`, `public/images/hero/product.*`, `public/images/hero/skincare-studio-hero.jpg` | Product photo-style images carrying "GLOW VAI" labels | UNCONFIRMED. Part 4 asks for real product photos. Replace with own photos when available. |
| `public/favicon.svg`, `public/logo/glowvai-logo.svg`, `public/*.png`, `public/favicon.ico` | Scan-corners mark | Original. Drawn for GLOW VAI on 28 October 2026 from basic shapes. |
| Hero scan overlay, minute dial, phone frame | Inline SVG and CSS | Original. Drawn for GLOW VAI. |
| `app/opengraph-image.tsx` | Share image | Original. Built from the brand mark, text and shapes. |

## Code
All page and component code was written for this project. No code from templates, blogs or Q&A sites was pasted.

## Open item
`lib/recommend.ts` (used by the scan result) names third-party branded products. Using another company's product
names needs written permission (Part 9 C1 and C2). It is listed as an open risk in `docs/ORIGINALITY-REPORT.md`.
