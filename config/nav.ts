export interface NavItem {
  title: string;
  href: string;
  badge?: string;
}

export const routesReady: Record<string, boolean> = {
  "/": true,
  "/shop": true,
  "/our-story": true,
  "/face-analysis": true,
  "/referral": true,
  "/journal": true,
  "/contact": true,
  "/privacy": true,
  "/terms": true,
  "/returns": true,
  "/delivery": true,
  "/faq": true,
  "/admin": true,
  "/admin2006": true,
  "/#faq": true,
  "/#delivery": true,
  "/#journal": true,
  "/#ingredients": true,
};

export const navLinks: NavItem[] = [
  { title: "Shop", href: "/shop" },
  { title: "How it works", href: "/#how-it-works" },
  { title: "Our story", href: "/our-story" },
  { title: "Referral", href: "/referral" },
];

export const footerLinks = {
  shop: [
    { title: "All products", href: "/shop" },
    { title: "Breakouts and pores", href: "/shop?concern=acne" },
    { title: "Dullness and glow", href: "/shop?concern=dullness" },
    { title: "Dehydration", href: "/shop?concern=dryness" },
    { title: "Dark spots", href: "/shop?concern=pigmentation" },
    { title: "Sun protection", href: "/shop?concern=sun-care" },
  ],
  company: [
    { title: "Our story", href: "/our-story" },
    { title: "Referral program", href: "/referral" },
    { title: "Journal", href: "/journal" },
    { title: "Face scan", href: "/face-analysis" },
    { title: "Contact", href: "/contact" },
  ],
  help: [
    { title: "Delivery", href: "/delivery" },
    { title: "FAQ and support", href: "/faq" },
    { title: "Returns and refunds", href: "/returns" },
    { title: "Partner stores", href: "/store" },
  ],
  legal: [
    { title: "Privacy policy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
  ],
};

