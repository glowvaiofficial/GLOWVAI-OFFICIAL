# GLOW VAI — Quick-Commerce Skincare Retail Platform

GLOW VAI is an editorial, high-performance quick-commerce skincare retail platform built with Next.js 16 (App Router), TypeScript, and Tailwind CSS. The platform combines on-device facial skin analysis with instant WhatsApp ordering for authorized products from **Minimalist** and **The Derma Co**.

---

## Key Features

- **Retail Pivot Catalog**: Stocking authorized products strictly from **Minimalist** and **The Derma Co** across 4 categories: Face Serums, Face Washes, Sunscreens, and Moisturizers, sourced from `Glowvai_Product_Recommendation_Database.xlsx`.
- **Order on WhatsApp**: Instant checkout flow creating structured WhatsApp messages (`GV-YYMMDD-XXXX`) and logging intent data server-side via `/api/order-intent`.
- **Scan-Then-Lead Data Collection**: Face scan happens first on-device. Results are displayed immediately, followed by an optional lead form to save reports and claim 15% discount coupons.
- **Gen Z Gamified Glow Card**: Persona archetypes (*Dew Drop*, *Smooth Operator*, *Even Steven*, *Clear Skies*, *Balanced Boss*), level bands 1–5 (*Fresh Start* to *Radiant*), and 4-question habit quiz fallback for Event Mode.
- **On-Device AI Skin Analysis**: Pixel luminance sampled locally within the browser canvas ($0.299R + 0.587G + 0.114B$), mapped to scores 23–92 with small random variation ($\pm 3$).
- **Strict Compliance & Privacy**: DPDP Act compliant privacy policy. Photos are processed in-browser. Optional private cloud storage with explicit consent (90-day retention).
- **Google Sheets Webhook Sync**: Automated payload sync to Google Apps Script (`Leads`, `OrderIntents`, `Waitlist`, `Newsletter`, `Contact`, `Feedback`, `DataRequests`).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v3 with Electric Blue (`#0050FF`), Coral (`#FF6B57`), Butter Yellow (`#FFD84D`), Sky Mist (`#E6EEFF`), and Ink (`#0F172A`).
- **State Management**: React Context & Zustand Cart Store
- **Forms & Validation**: Zod schema validation
- **Fonts**: Bricolage Grotesque, Instrument Serif, DM Sans (loaded via `next/font/google`)
- **Backend Integration**: Next.js Route Handlers + Google Apps Script Web App

---

## Quick Start & Local Execution

### 1. Prerequisites

Ensure Node.js 18.17.0+ or Node.js 20+ is installed.

### 2. Installation

```bash
git clone https://github.com/Sathveek123/GLOWVAI-.git
cd "glow vai landing page"
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Google Apps Script Web App URL for data sync
SHEETS_WEBAPP_URL="your_google_apps_script_url_here"

# Secret token matching Google Apps Script Script Properties
SHEETS_SECRET="your_sheets_secret_here"

# Session secret for secure HMAC lead cookies
SESSION_SECRET="glowvai_session_encryption_key_32_bytes_min"
```

### 4. Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build Verification

```bash
npm run build
npm run start
```

---

## Documentation Suite in `/docs/`

- [docs/00-README.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/00-README.md): Index, retail decisions log, and pre-launch checklist.
- [docs/01-DESIGN-SYSTEM.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/01-DESIGN-SYSTEM.md): Electric Blue color tokens, typography rules, and voice guidelines.
- [docs/02-CLAIMS-AND-COMPLIANCE.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/02-CLAIMS-AND-COMPLIANCE.md): Independent retailer claims, ASCI standards, and compliance rules.
- [docs/03-DATA-AND-PRIVACY.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/03-DATA-AND-PRIVACY.md): Data collection table, optional photo storage policy, and DPDP rules.
- [docs/04-API-AND-SHEETS.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/04-API-AND-SHEETS.md): Route handlers (`/api/lead`, `/api/order-intent`), Apps Script setup, and sheet tabs.
- [docs/05-FACE-ANALYSIS.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/05-FACE-ANALYSIS.md): Luminance pixel sampling, Glow Card personas, recommendations, and Event Quiz Mode.
- [docs/06-CHECKOUT-PLAN.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/06-CHECKOUT-PLAN.md): WhatsApp order integration & future payments roadmap.
- [docs/07-ASSETS.md](file:///d:/Client%20Projects/GlowVai/glow%20vai%20landing%20page/docs/07-ASSETS.md): Product image guidelines for Minimalist & The Derma Co stock.

---

## Repository Sync

Repository URL: [https://github.com/Sathveek123/GLOWVAI-](https://github.com/Sathveek123/GLOWVAI-)

---

## Docs (status 16 Nov 2026)

Note: the sections above describe the original landing-page build (WhatsApp ordering, first font and palette choices). The live `/shop`, its designer-driven home and the vendor portal are documented here:

- [docs/WEBSITE-OVERVIEW.md](docs/WEBSITE-OVERVIEW.md): status and timeline
- [docs/WEBSITE-SCREENS.md](docs/WEBSITE-SCREENS.md): every page and shop screen
- [docs/WEBSITE-HOME-DESIGN.md](docs/WEBSITE-HOME-DESIGN.md): phone and PC home, designer data model, `/api/shop/layout`
- [docs/WEBSITE-DESIGN-SYSTEM.md](docs/WEBSITE-DESIGN-SYSTEM.md): fonts, colour tokens, motion, accessibility
- [docs/WEBSITE-ARCHITECTURE.md](docs/WEBSITE-ARCHITECTURE.md): folders, API security and rate limits, Firebase, deploy, tests
- [docs/BACKEND-RULES.md](docs/BACKEND-RULES.md): rules checklist for new routes, all 116 API routes (auth, rate limit, validation, gaps), rate-limit policy, free-plan quotas (Firestore, OTP SMS, Vercel, Render, Resend), decisions needed (19 Nov 2026)
- [docs/VENDOR-PORTAL.md](docs/VENDOR-PORTAL.md): vendor web portal pages and API
- [docs/VENDOR-APP.md](docs/VENDOR-APP.md): the vendor mobile app
- [docs/WEBSITE-KNOWN-ISSUES-AND-NEXT.md](docs/WEBSITE-KNOWN-ISSUES-AND-NEXT.md): honest issues and next steps
