# API and Sheets

## Endpoints
| Method | Path | Tab | Notes |
|---|---|---|---|
| POST | /api/lead | Leads | Creates lead row with scores after scan |
| POST | /api/lead/image | Leads | Uploads resized JPEG (about 800px, q0.8) if image_consent is true |
| POST | /api/order-intent | OrderIntents | Logs WhatsApp checkout intent (`order_ref`, `items_json`, `subtotal`, `pincode`) |
| POST | /api/newsletter | Newsletter | Duplicates accepted silently |
| POST | /api/waitlist | Waitlist | Location and pincode capture |
| POST | /api/contact | Contact | Customer inquiries |
| POST | /api/feedback | Feedback | Product feedback (status: new) |
| POST | /api/data-request | DataRequests | DPDP privacy requests |

## Rules for every route
Zod validation, honeypot field "website", per-IP rate limit (Firestore counter in production),
Origin check, 4KB body limit (the image route has its own limit), no request bodies in logs.

## Google Sheets Structure (Tabs & Headers)

### Leads
`session_id`, `created_at`, `name`, `phone`, `email`, `skin_concern`, `ip`, `city`, `region`, `country`, `device`, `browser`, `os`, `referrer`, `utm_source`, `utm_campaign`, `consent`, `consent_version`, `image_consent`, `marketing_opt_in`, `age_confirmed`, `consent_at`, `status`, `completed_at`, `overall_score`, `sub_scores`, `scan_count`, `image_file_id`, `image_url`, `scan_type`, `persona`, `glow_level`

### OrderIntents
`created_at`, `order_ref`, `items_json`, `subtotal`, `pincode`, `source_page`, `status`

## Server to script
Next.js adds `secret` (`SHEETS_SECRET`) to the JSON body. Actions: `create`, `update_lead`, `upload_image`, `append`. The script fails closed if no secret property exists.

## Env vars
`SHEETS_WEBAPP_URL`, `SHEETS_SECRET`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`.
