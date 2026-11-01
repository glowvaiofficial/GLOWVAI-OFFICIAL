# GLOW VAI DNS Configuration Runbook: Resend Email Deliverability

To protect our primary domain reputation (glowvai.in), all transactional and marketing emails use dedicated subdomains on Resend.

## 1. Subdomain Architecture

- **Transactional Domain**: send.glowvai.in (From: GLOW VAI <hello@send.glowvai.in>)
- **Marketing Domain**: news.glowvai.in (From: GLOW VAI <tips@news.glowvai.in>)
- **Reply Address**: contact@glowvai.in
- **DMARC Domain**: _dmarc.glowvai.in

---

## 2. Exact DNS Records to Add in Domain Registrar (e.g. Cloudflare / GoDaddy)

### A. Transactional Domain (send.glowvai.in)

1. **SPF TXT Record**
   - Name: `send` (or `send.glowvai.in`)
   - Type: `TXT`
   - Value: `v=spf1 include:amazonses.com ~all` (Use exact value shown in Resend dashboard)

2. **DKIM TXT Record(s)**
   - Name: `resend._domainkey.send`
   - Type: `TXT` (or `CNAME` as instructed in Resend dashboard)
   - Value: Resend DKIM public key provided in dashboard

3. **Return-Path MX Record**
   - Name: `send`
   - Type: `MX`
   - Priority: `10`
   - Value: `feedback-smtp.us-east-1.amazonses.com` (Use exact MX host shown in Resend dashboard)

---

### B. Marketing Domain (news.glowvai.in)

1. **SPF TXT Record**
   - Name: `news`
   - Type: `TXT`
   - Value: `v=spf1 include:amazonses.com ~all` (Use exact value shown in Resend dashboard)

2. **DKIM Record**
   - Name: `resend._domainkey.news`
   - Type: `TXT`
   - Value: Resend DKIM public key provided in dashboard

3. **Return-Path MX Record**
   - Name: `news`
   - Type: `MX`
   - Priority: `10`
   - Value: Resend MX host provided in dashboard

---

### C. DMARC Alignment Record (_dmarc.glowvai.in)

1. **Phase 1: Monitoring Mode (Initial 2 to 4 Weeks)**
   - Name: `_dmarc`
   - Type: `TXT`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@glowvai.in; fo=1`

2. **Phase 2: Quarantine Mode**
   - Value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@glowvai.in; fo=1`

3. **Phase 3: Reject Mode (Strict Enforcement)**
   - Value: `v=DMARC1; p=reject; rua=mailto:dmarc@glowvai.in; fo=1`

---

## 3. Deliverability Settings in Resend Dashboard

- **Open Tracking**: OFF for send.glowvai.in (privacy and deliverability protection).
- **Click Tracking**: OFF for send.glowvai.in.
- **TLS**: Enforce TLS 1.2+ for outbound delivery.

---

## 4. Verification Command

Run the automated DNS validator script from terminal:
```bash
npx tsx scripts/check-email-dns.ts
```
