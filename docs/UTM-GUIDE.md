# GLOW VAI UTM Link Tracking & Campaign Guide

This document establishes the official link-tracking conventions for GLOW VAI marketing campaigns across social media, WhatsApp, offline QR codes, and campus events.

## 1. Golden Rules for UTM Links

1. **Lowercase Only**: Always use lowercase strings for source, medium, campaign, content, and term.
2. **Hyphenated Values**: Use hyphens (`-`) instead of spaces or underscores.
3. **No PII**: Never attach customer names, phone numbers, or email addresses as query parameters.
4. **Clean URLs**: Avoid trailing ampersands or duplicate parameters.

---

## 2. Parameter Definitions

- `utm_source`: Where traffic originates (e.g. `instagram`, `whatsapp`, `qr-flyer`, `campus-ambassador`).
- `utm_medium`: Marketing channel type (e.g. `bio`, `status`, `print-qr`, `email`, `influencer`).
- `utm_campaign`: Specific campaign name (e.g. `monsoon-glow`, `hydra-launch`, `college-fest-2026`).
- `utm_content`: Specific link placement or visual variant (e.g. `hero-cta`, `story-swipe`, `blue-poster`).
- `utm_term`: Specific audience or search term (optional).
- `ref`: Referral token for social challenges (e.g. `ref=GLV-AUTO-007-TADF`). Automatically defaults `utm_campaign` to `glowcard-share`.

---

## 3. Standard Campaign Examples

| Scenario | Target URL |
| :--- | :--- |
| **Instagram Bio Link** | `https://glowvai.in/?utm_source=instagram&utm_medium=bio&utm_campaign=brand-launch` |
| **WhatsApp Status Post** | `https://glowvai.in/face-analysis?utm_source=whatsapp&utm_medium=status&utm_campaign=free-scan` |
| **College Campus QR Poster** | `https://glowvai.in/?utm_source=campus-event&utm_medium=print-qr&utm_campaign=vizag-techfest` |
| **Influencer Collaboration** | `https://glowvai.in/shop?utm_source=influencer-ananya&utm_medium=reel&utm_campaign=clarity-serum` |
| **Glow Card Friend Share** | `https://glowvai.in/?ref=friend&utm_source=glowcard-share&utm_medium=referral` |

---

## 4. Using the CLI UTM Builder Tool

Generate clean campaign links instantly from your terminal:
```bash
npx tsx scripts/utm-builder.ts --source=instagram --medium=bio --campaign=hydra-launch
```
