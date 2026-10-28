# GLOW VAI Verified Review Policy & Anti-Fake Review Guidelines

This document outlines GLOW VAI's policy regarding customer reviews, moderation criteria, legal compliance under India's Consumer Protection Act (Guidelines for Preventing Fake or Misleading Reviews), and Schema.org structured data rules.

---

## 1. Core Review Principles

1. **Genuine Customer Purchases Only**: Reviews are collected strictly from verified customers via single-use signed tokens (`/review/{token}`) generated after order delivery. Unverified public reviews are not accepted.
2. **Zero Selective Suppression**: Reviews are never deleted or suppressed simply because they express negative feedback, low ratings, or critical opinions.
3. **No Unfair Incentives**: No payment, gift, or discount is offered for writing positive reviews. Any general promotional incentive offered for leaving feedback is provided regardless of rating and disclosed next to the published review.
4. **No Third-Party Review Copying**: GLOW VAI never copies, translates, aggregates, or imports reviews from Minimalist, The Derma Co, Nykaa, Amazon, Google, or competitor websites.

---

## 2. Moderation Guidelines

Reviews enter an initial status of `new` and are reviewed by human moderators before publication.

### Approved Reviews
A review is set to `status = approved` if it meets the following criteria:
- Originates from a verified purchase token.
- Contains feedback regarding the product texture, skin experience, packaging, or customer service.
- Includes explicit user consent to publish.

### Rejected Reviews
A review is set to `status = rejected` ONLY if it contains:
- Spam, commercial solicitations, or irrelevant web links.
- Profanity, hate speech, or personally identifiable information (phone numbers, addresses).
- False medical claims or statements violating cosmetics advertising regulations.
- Content completely unrelated to the purchased product.

---

## 3. Structured Data Thresholds (`MIN_REVIEWS_FOR_SCHEMA = 5`)

To prevent misleading search engines with sparse or premature ratings:
- **Product Pages**: Reviews are displayed visibly on the product page as soon as 1 approved review exists.
- **JSON-LD Schema**: `aggregateRating` and `review` array schema markup are rendered ONLY when a product has accrued **5 or more approved verified customer reviews**. Below 5 reviews, no review schema is output.
- **Organization / WebSite Pages**: `aggregateRating` and `review` markup are NEVER rendered on Organization, WebSite, home page, brand, or category pages.

---

## 4. User Rights & Data Request Flow

Customers may request the modification or removal of their published review at any time by contacting `contact@glowvai.in` or utilizing our privacy data request endpoint `/api/data-request`. Requests are processed within 48 hours.
