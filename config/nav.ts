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
    { title: "Journal", href: "/journal" },
    { title: "Face scan", href: "/face-analysis" },
    { title: "Referral program", href: "/referral" },
    { title: "Careers", href: "/careers" },
    { title: "Press", href: "/press" },
    { title: "Brand kit", href: "/press/brand-kit" },
  ],
  help: [
    { title: "Help center", href: "/help" },
    { title: "Track order", href: "/track-order" },
    { title: "Orders and cancellations", href: "/help/orders" },
    { title: "Payments", href: "/help/payments" },
    { title: "Face scan help", href: "/help/face-scan" },
    { title: "Delivery", href: "/delivery" },
    { title: "Returns and refunds", href: "/returns" },
    { title: "FAQ", href: "/faq" },
    { title: "Contact us", href: "/contact" },
  ],
  partners: [
    { title: "Partner with us", href: "/partners" },
    { title: "Partner stores", href: "/partners/stores" },
    { title: "Brands and suppliers", href: "/partners/brands" },
    { title: "Become a rider", href: "/partners/rider" },
    { title: "Auto and campus partners", href: "/referral" },
  ],
  legal: [
    { title: "Privacy policy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
    { title: "Grievance redressal", href: "/grievance" },
    { title: "Accessibility", href: "/accessibility" },
    { title: "Site map", href: "/site-map" },
  ],
};

