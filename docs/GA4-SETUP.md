# GLOW VAI Google Analytics 4 Setup Checklist

Follow these steps in the Google Analytics 4 admin console for glowvai.in:

---

## Step 1: Create GA4 Property
- Property Name: GLOW VAI Official
- Reporting Time Zone: India (GMT+05:30)
- Currency: Indian Rupee (INR)

---

## Step 2: Configure Web Data Stream
- Stream Name: GLOW VAI Web Stream
- Stream URL: https://glowvai.in
- Enhanced Measurement Settings:
  - Page views: TURN OFF automatic page changes based on browser history events (we send manual page_view events).
  - Site search: TURN OFF (we send our custom search event).
  - Scrolls: KEEP ON.
  - Outbound clicks: KEEP ON.
  - File downloads: KEEP ON.

---

## Step 3: Privacy & Data Retention Settings
- **Google Signals**: TURN OFF.
- **Ads Personalization**: TURN OFF.
- **Event Data Retention**: Change from default 2 months to **14 months**.
- **User Data Deletion Requests**: Enabled under Data Settings.

---

## Step 4: Key Events (Conversions)
Mark the following events as Key Events in Admin > Key Events:
1. `generate_lead`
2. `begin_checkout`
3. `purchase`
4. `whatsapp_click`
5. `scan_completed`

---

## Step 5: Custom Dimensions (Event Scope)
Create Event-Scoped Custom Dimensions in Admin > Custom Definitions:
- `cta_id`
- `location`
- `scan_type`
- `score_band`
- `persona`
- `lead_source`
- `item_list_id`
- `method`
- `result`
- `reason`

---

## Step 6: Measurement Protocol API Secret
1. Go to Admin > Data Streams > glowvai.in > Measurement Protocol API secrets.
2. Click Create. Name: `NextServerSecret`.
3. Copy Secret Value to server env var `GA_API_SECRET`.

---

## Step 7: Internal Traffic Filter
1. In Data Stream > Configure tag settings > Define internal traffic, add team office IP addresses.
2. Under Data Settings > Data Filters, activate the Internal Traffic filter after testing.

---

## Step 8: Integrations & Exports
1. Link Google Search Console property.
2. Enable daily BigQuery export (free tier).

---

## Step 9: Funnel Exploration Setup
Build Funnel Exploration in GA4:
1. Step 1: `page_view`
2. Step 2: `scan_started`
3. Step 3: `scan_completed`
4. Step 4: `generate_lead`
5. Step 5: `begin_checkout`
6. Step 6: `purchase`
Break down by: `sessionSourceMedium`, `deviceCategory`, and `persona`.
