# GLOW VAI Structured Data (JSON-LD) QA & Manual Validation Guide

This document outlines the step-by-step Quality Assurance (QA) and verification protocol for structured data implementation on `https://glowvai.in`.

---

## 1. Automated Validation Tools

Run the automated validation test suite before every release:

```bash
npm run test:schema
```

This verifies:
- All URLs are absolute HTTPS on `https://glowvai.in`.
- Absence of banned terms (`localhost`, `glowvai.com`, `http://`, `—`).
- GTIN check-digit accuracy.
- Gatekeeper logic for shipping and return policies.
- Review schema threshold enforcing `MIN_REVIEWS_FOR_SCHEMA = 5`.

---

## 2. Google Rich Results Testing Protocol

1. Open [Google Rich Results Test](https://search.google.com/test/rich-results).
2. Test the following live URLs or code snippets:
   - **Product Page**: `https://glowvai.in/product/dew-barrier-daily-hydrator`
     - Verify: Product snippet, Offer price, Currency (INR), Availability (InStock).
   - **Brand Landing Page**: `https://glowvai.in/shop/minimalist`
     - Verify: CollectionPage, ItemList (up to 24 items), BreadcrumbList.
   - **FAQ Page / Our Story**: `https://glowvai.in/our-story`
     - Verify: AboutPage, Organization, Person nodes, FAQPage.
3. Resolve all reported Errors; review any optional Warnings.

---

## 3. Schema Markup Validator (validator.schema.org)

1. Open [Schema Markup Validator](https://validator.schema.org/).
2. Submit URLs for:
   - `https://glowvai.in/` (Home Page)
   - `https://glowvai.in/contact` (Contact Page)
   - `https://glowvai.in/face-analysis` (Face Analysis Page)
3. Ensure zero syntax errors, zero missing required schema attributes, and zero duplicate `@id` entries.

---

## 4. Google Search Console Enhancements Audit

1. Sign in to Google Search Console for domain `glowvai.in`.
2. Navigate to **Enhancements** in the left navigation sidebar.
3. Inspect reports for:
   - **Product Snippets**
   - **Merchant Listings**
   - **Breadcrumbs**
   - **FAQ**
4. Verify weekly for the first month following launch to catch any unparseable structured data warnings.

---

## 5. Random 5-Product Visual Match Audit

Perform a manual comparison for 5 randomly selected products:

| Product SKU | Visible Page Price | Schema `price` | Visible Stock Status | Schema `availability` | Visible Rating | Schema `ratingValue` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dew-barrier-daily-hydrator` | ₹499.00 | `"499.00"` | In Stock | `InStock` | No Reviews | Omitted |
| `clarity-pop-niacinamide-serum` | ₹549.00 | `"549.00"` | In Stock | `InStock` | No Reviews | Omitted |
| `sun-shield-invisible-fluid-spf50` | ₹599.00 | `"599.00"` | In Stock | `InStock` | No Reviews | Omitted |
| `velvet-cloud-cica-cleanser` | ₹399.00 | `"399.00"` | In Stock | `InStock` | No Reviews | Omitted |
| `petal-plump-peptide-lip-butter` | ₹299.00 | `"299.00"` | In Stock | `InStock` | No Reviews | Omitted |

> [!IMPORTANT]
> Any discrepancy between on-page visible numbers and JSON-LD schema values violates Google Search Console rules and risks a manual action.
