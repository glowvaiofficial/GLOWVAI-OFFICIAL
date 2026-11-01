import { SITE_URL } from "@/lib/site-url";

export const BRAND_NAME = "GLOW VAI";

export const siteConfig = {
  name: BRAND_NAME,
  legalName: "GLOW VAI Technologies Pvt. Ltd.",
  description: "Scan your face for free, get a plain-language skin report, and shop a routine that fits.",
  url: SITE_URL,
  ogImage: `${SITE_URL}/opengraph-image`,
  supportEmail: "contact@glowvai.in",
  phone: "+91 89778 55998",
  address: "Studio 4B, Design District, Hyderabad, Telangana 500081",
  deliveryEstimateMinutes: 15,
  defaultCity: "Vijayawada",
  LEGAL_APPROVED: false, // Set to true when privacy & terms text is final
  // Real ratings and customer counts go here ONLY when verified before launch.
  // If empty, components hide them automatically.
  rating: "", // e.g. "4.95 / 5" when verified
  customerCount: "", // e.g. "18,000+ happy customers" when verified
  // TODO: Founders to fill manufacturing and compliance details before launch (required for cosmetic sales in India)
  compliance: {
    manufacturerName: "", // e.g. "GLOW VAI Laboratories Pvt. Ltd."
    licenceNumber: "", // e.g. "COS-AP-2024-8891"
  },
  socials: {
    instagram: "https://www.instagram.com/glowvai",
    twitter: "https://x.com/Glowvai",
    youtube: "",
    linkedin: "https://www.linkedin.com/company/glowvai/",
  },
};



