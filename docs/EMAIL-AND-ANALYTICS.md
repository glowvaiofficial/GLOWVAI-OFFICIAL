# GLOW VAI Transactional Email and GA4 Analytics Architecture

This document describes the design, deliverability safeguards, privacy compliance rules, and operations runbook for email sending (Resend) and conversion analytics (Google Analytics 4) on glowvai.in.

---

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 VISITOR BROWSER                                   |
|  - Cookie Notice Banner (Consent Mode: default denied for analytics/ad storage)  |
|  - Typed Client Tracker (/lib/analytics) scrubs PII & truncates strings to 100 char |
|  - Route Change Listener dispatches manual page_view without query PII            |
+-----------------------------------------------------------------------------------+
                                         |
                       [Consent Granted] | [Order Intent / Lead Form]
                                         v
+-----------------------------------------------------------------------------------+
|                               NEXT.JS SERVER (API)                                |
|                                                                                   |
|  1. EMAIL SERVICE LAYER (/lib/email):                                             |
|     - Validates recipient with Zod                                                |
|     - Checks Suppressions list (Bounced / Complained / Unsubscribed)              |
|     - Enforces Rate Limit (3/hr, 10/day per recipient)                            |
|     - Direct Resend REST API send with Idempotency-Key                            |
|     - Retries on 429/5xx with exponential backoff                                 |
|                                                                                   |
|  2. ORDER STATUS & GA4 MP (/lib/analytics/mp):                                    |
|     - Receives HMAC signed order status from Google Sheets onOrderStatusEdit       |
|     - Dispatches GA4 Measurement Protocol "purchase" / "refund" server-side       |
+-----------------------------------------------------------------------------------+
       |                                      |                               |
       | Outbound Email                       | Order Intent / Leads Log      | Webhook Status
       v                                      v                               v
+---------------+                    +------------------+           +-------------------+
|  RESEND API   |                    |  GOOGLE SHEETS   |           |  RESEND WEBHOOK   |
| send.glowvai  |                    | Apps Script Host |           | /api/webhooks/resend
| news.glowvai  |                    | EmailEvents Tab  |           | Svix HMAC Check   |
+---------------+                    | Suppressions Tab |           +-------------------+
                                     +------------------+
```

---

## 2. Environment Variables Summary

| Env Variable | Scope | Description |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Server | Restricted API key for domain sending |
| `RESEND_WEBHOOK_SECRET` | Server | Svix webhook signature verification secret |
| `EMAIL_FROM_TRANSACTIONAL` | Server | Sender address: `GLOW VAI <hello@send.glowvai.in>` |
| `EMAIL_FROM_MARKETING` | Server | Sender address: `GLOW VAI <tips@news.glowvai.in>` |
| `EMAIL_REPLY_TO` | Server | Customer reply address: `contact@glowvai.in` |
| `TEAM_NOTIFY_EMAIL` | Server | Comma separated staff notification emails |
| `UNSUBSCRIBE_SECRET` | Server | Secret for HMAC token signing (32+ bytes) |
| `NEXT_PUBLIC_GA_ID` | Public | GA4 Measurement ID (`G-XXXXXXXXXX`) |
| `GA_API_SECRET` | Server | GA4 Measurement Protocol API Secret |
| `INTERNAL_WEBHOOK_SECRET` | Server | HMAC secret for Apps Script to Next.js webhook |
| `SHEETS_WEBAPP_URL` | Server | Apps Script web app URL |
| `SHEETS_SECRET` | Server | Apps Script access secret |

---

## 3. Email Templates Catalog

| Template Name | Stream | Recipient | Subject Line | Trigger Point |
| :--- | :--- | :--- | :--- | :--- |
| `contact_ack` | Transactional | Customer | We got your message | `/api/contact` submission |
| `contact_notify` | Transactional | Staff | New enquiry: {topic} ({ref}) | `/api/contact` submission |
| `lead_report` | Transactional | Customer | Your GLOW VAI card: {persona name} | Face scan form save |
| `lead_alert` | Transactional | Staff | New scan lead received | Face scan save (`LEAD_ALERTS=true`) |
| `order_intent_notify` | Transactional | Staff | WhatsApp order intent {ref} | `/api/order-intent` POST |
| `waitlist_confirm` | Transactional | Customer | You are on the GLOW VAI waitlist | `/api/waitlist` POST |
| `data_request_ack` | Transactional | Customer | We received your data request | `/api/data-request` POST |
| `data_request_notify` | Transactional | Staff | [ACTION] New data request {ref} | `/api/data-request` POST |
| `review_request` | Transactional | Customer | How is your GLOW VAI routine working? | Order status set to `delivered` |
| `weekly_digest` | Transactional | Staff | GLOW VAI Weekly Performance Summary | Scheduled Vercel Cron (Monday 9:00 IST) |
| `newsletter_confirm` | Marketing | Subscriber | Confirm your GLOW VAI skin tips | Double opt-in request |
| `newsletter_welcome` | Marketing | Subscriber | Welcome to GLOW VAI Skin Tips | Confirmation link click |

---

## 4. Runbook for Bounces, Complaints, and Failures

1. **Hard Bounces**: Automatically captured by `/api/webhooks/resend`. Address is added to `Suppressions` sheet with reason `bounced`. Outbound mail to this address is skipped silently in future.
2. **Spam Complaints**: Capture complaint webhook event. Address added to `Suppressions` sheet with reason `complained`.
3. **Unsubscribe Requests**: Handled via RFC 8058 one-click header or `/unsubscribe?token=...` GET/POST. Address added to `Suppressions` sheet with reason `unsubscribed`.
4. **Key Rotation**:
   - Resend API key: Generate new key in Resend dashboard, update `RESEND_API_KEY` in Vercel settings, redeploy.
   - Webhook Secret: Update `RESEND_WEBHOOK_SECRET` in Vercel settings and Resend Webhook endpoint settings simultaneously.
   - Internal Webhook Secret: Update `INTERNAL_WEBHOOK_SECRET` in both Vercel environment settings and Google Apps Script script properties.
