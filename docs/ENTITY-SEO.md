# GLOW VAI Entity SEO Checklist

Source of truth for identity data: `config/entity.ts`. Graph builders: `lib/seo/entity-graph.ts`. Tests: `__tests__/entity.test.ts`.

## Rendered facts
- Name: GLOW VAI (exact casing). Alternate names: Glow Vai, GlowVai.
- Site: https://glowvai.in
- Contact: contact@glowvai.in, +91 89778 55998
- Official profiles: Instagram https://www.instagram.com/glowvai/ , X https://x.com/Glowvai , LinkedIn https://www.linkedin.com/company/glowvai/
- Independent retailer of Minimalist and The Derma Co. Not the manufacturer, not an authorised dealer.

## Open TODOs (not rendered until filled and verified)
- [ ] Foundation year (`foundingDate`, flag `foundingDateVerified`)
- [ ] Legal name, confirmed against the registration certificate (`legalName`, flag `legalNameVerified`)
- [ ] Registered address (`address`, flag `addressVerified`)
- [ ] GSTIN or CIN (`taxID`, flag `taxIDVerified`)
- [ ] Founder personal profile URLs, each confirmed by the person (`founderProfilesVerified`)
- [ ] Founder name conflict: the spec and `config/entity.ts` use "Nalla Satvik", but the site shows both "Nalla Satvik" and "Sathveek Nalla". Pick one spelling and make the site and `config/entity.ts` match.
- [ ] Founder bio for Rahimath says "connecting dermatological insights with customer needs". Confirm it is accurate or edit it.
- [ ] Press mentions for `/press` (real links only)

## Consistency (do first)
- [ ] Same name, logo, and one-line description on Instagram, X, LinkedIn, WhatsApp Business, Google Business Profile (only if eligible), and the website.
- [ ] Each profile's website field links to https://glowvai.in.
- [ ] Instagram: professional account, category set, contact email, clean profile link (no tracking token).
- [ ] LinkedIn company page: logo, description, website, industry, founders listed with their own profiles linking back.
- [ ] Each founder's personal profile says "Founder at GLOW VAI" and links to the site. Only then add it to `sameAs`.
- [ ] Same phone and email everywhere.

## Search consoles
- [ ] Google Search Console: Domain property for glowvai.in verified.
- [ ] Bing Webmaster Tools verified.
- [ ] Submit https://glowvai.in/sitemap.xml.
- [ ] URL Inspection, request indexing: home, /our-story, /contact.

## Google Business Profile
- [ ] Create only with a real, verifiable public address or a service-area business. Do not use a virtual or placeholder address. Skip if not eligible.

## Third-party presence
- [ ] Coverage in independent sources (news, beauty or startup blogs, interviews, podcasts, incubator pages) that links to https://glowvai.in and names the founders.
- [ ] Directory listings: Crunchbase, LinkedIn, Startup India portal (if registered), MSME or industry listings.
- [ ] Wikipedia and Wikidata: do not create now. Only consider after multiple independent published sources exist, and follow their conflict-of-interest rules.

## Knowledge Panel
- [ ] When a panel appears, claim it through Search Console or the social profiles.
- [ ] Use "Suggest edits" to correct logo, description, or profiles.

## Monthly monitoring
- [ ] Search "GLOW VAI", "GLOW VAI skincare", "GLOW VAI founder", "Sardhar Musthafa GLOW VAI". Record results.
- [ ] Run Rich Results Test and Schema Markup Validator on / and /our-story.
- [ ] Review Search Console Enhancements, Pages, and Performance for brand queries.
