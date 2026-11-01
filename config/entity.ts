import { SITE_URL } from "@/lib/site-url";

export interface FounderEntity {
  id: string;
  name: string;
  jobTitle: string;
  role: string;
  anchorId: string;
  anchorUrl: string;
  image: string;
  bio: string;
  sameAs: string[];
}

export interface EntityConfig {
  brand: {
    name: string;
    alternateName: string[];
    url: string;
    description: string;
    slogan: string;
    email: string;
    telephone: string;
    telephoneSchema: string;
    areaServed: string;
    foundingLocation: string;
    logoSvg: string;
    logoPng512: string;
    logoPng512Url: string;
    ogImage: string;
    ogImageUrl: string;
  };
  socials: {
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  founders: FounderEntity[];
  // Legal & verification flags (default false until verified with documents)
  flags: {
    legalNameVerified: boolean;
    foundingDateVerified: boolean;
    addressVerified: boolean;
    taxIDVerified: boolean;
    founderProfilesVerified: {
      sardharMusthafa: boolean;
      rahimath: boolean;
      nallaSatvik: boolean;
    };
  };
  // TODO fields (rendered in schema ONLY when their matching verification flag is true)
  unverifiedData: {
    legalName: string;
    foundingDate: string;
    address: string;
    taxID: string;
  };
}

export const entityConfig: EntityConfig = {
  brand: {
    name: "GLOW VAI",
    alternateName: ["Glow Vai", "GlowVai"],
    url: SITE_URL,
    description: "GLOW VAI is an Indian skincare retail brand offering a free face scan and WhatsApp ordering.",
    slogan: "Skincare that starts with a selfie.",
    email: "contact@glowvai.in",
    telephone: "+91 89778 55998",
    telephoneSchema: "+918977855998",
    areaServed: "IN",
    foundingLocation: "Andhra Pradesh, India",
    logoSvg: "/logo/glowvai-logo.svg",
    logoPng512: "/logo/glowvai-logo-512.png",
    logoPng512Url: `${SITE_URL}/logo/glowvai-logo-512.png`,
    ogImage: "/opengraph-image",
    ogImageUrl: `${SITE_URL}/opengraph-image`,
  },

  socials: {
    instagram: "https://www.instagram.com/glowvai/",
    twitter: "https://x.com/Glowvai",
    linkedin: "https://www.linkedin.com/company/glowvai/",
  },

  founders: [
    {
      id: "sardhar-musthafa",
      name: "SK Sardar Musthafa",
      jobTitle: "Founder",
      role: "Founder (vision and direction)",
      anchorId: "sardhar-musthafa",
      anchorUrl: `${SITE_URL}/our-story#sardhar-musthafa`,
      image: `${SITE_URL}/images/founders/sardhar-musthafa.jpeg`,
      bio: "Founder of GLOW VAI, leading vision and direction for AI skin analysis and skincare retail in India.",
      sameAs: [], // TODO: Add personal LinkedIn/X profile once verified by founder
    },
    {
      id: "rahimath",
      name: "Rehmit",
      jobTitle: "Market Explorer",
      role: "Market Explorer",
      anchorId: "rahimath",
      anchorUrl: `${SITE_URL}/our-story#rahimath`,
      image: `${SITE_URL}/images/founders/rahimath.jpeg`,
      bio: "Market Explorer at GLOW VAI.",
      sameAs: [], // TODO: Add personal LinkedIn profile once verified by founder
    },
    {
      id: "nalla-satvik",
      name: "Nalla Satvik",
      jobTitle: "Co-Founder & Technical Lead",
      role: "Co-Founder & Technical Lead",
      anchorId: "nalla-satvik",
      anchorUrl: `${SITE_URL}/our-story#nalla-satvik`,
      image: `${SITE_URL}/images/founders/nalla-satvik.jpg`,
      bio: "Co-Founder & Technical Lead at GLOW VAI, building high-speed AI skin analysis telemetry and web infrastructure.",
      sameAs: [], // TODO: Add personal LinkedIn profile once verified by founder
    },
  ],

  flags: {
    legalNameVerified: false,
    foundingDateVerified: false,
    addressVerified: false,
    taxIDVerified: false,
    founderProfilesVerified: {
      sardharMusthafa: false,
      rahimath: false,
      nallaSatvik: false,
    },
  },

  unverifiedData: {
    legalName: "GLOW VAI Technologies Pvt. Ltd.",
    foundingDate: "TODO: Confirm official foundation year",
    address: "TODO: Add verified registered office address",
    taxID: "TODO: Add verified GSTIN/CIN number",
  },
};

/**
 * Returns clean entity config for rendering JSON-LD.
 * Only includes unverified fields if their matching flag is explicitly set to true.
 */
export function getRenderableEntityConfig() {
  const cfg = { ...entityConfig };
  
  return {
    name: cfg.brand.name,
    alternateName: cfg.brand.alternateName,
    url: cfg.brand.url,
    description: cfg.brand.description,
    slogan: cfg.brand.slogan,
    email: cfg.brand.email,
    telephone: cfg.brand.telephoneSchema,
    areaServed: cfg.brand.areaServed,
    foundingLocation: cfg.brand.foundingLocation,
    logoPng512Url: cfg.brand.logoPng512Url,
    ogImageUrl: cfg.brand.ogImageUrl,
    sameAs: [
      cfg.socials.instagram,
      cfg.socials.twitter,
      cfg.socials.linkedin,
    ],
    // Only include legalName if verified flag is true
    legalName: cfg.flags.legalNameVerified ? cfg.unverifiedData.legalName : undefined,
    foundingDate: cfg.flags.foundingDateVerified ? cfg.unverifiedData.foundingDate : undefined,
    address: cfg.flags.addressVerified ? cfg.unverifiedData.address : undefined,
    taxID: cfg.flags.taxIDVerified ? cfg.unverifiedData.taxID : undefined,
    founders: cfg.founders.map((f) => {
      let isVerified = false;
      if (f.id === "sardhar-musthafa" && cfg.flags.founderProfilesVerified.sardharMusthafa) isVerified = true;
      if (f.id === "rahimath" && cfg.flags.founderProfilesVerified.rahimath) isVerified = true;
      if (f.id === "nalla-satvik" && cfg.flags.founderProfilesVerified.nallaSatvik) isVerified = true;
      return {
        ...f,
        sameAs: isVerified ? f.sameAs : [],
      };
    }),
  };
}
