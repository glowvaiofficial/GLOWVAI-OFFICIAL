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
    { title: "Breakouts and pores", href: "/concerns/breakouts-and-pores" },
    { title: "Dullness and glow", href: "/concerns/dullness-and-glow" },
    { title: "Dehydration", href: "/concerns/dehydration" },
    { title: "Dark spots", href: "/concerns/dark-spots" },
    { title: "Sun protection", href: "/concerns/sun-protection" },
    { title: "Free face scan", href: "/face-analysis" },
  ],
  company: [
    { title: "Our story", href: "/our-story" },
    { title: "Journal", href: "/journal" },
    { title: "Referral program", href: "/referral" },
    { title: "Careers", href: "/careers" },
    { title: "Press", href: "/press" },
    { title: "Brand kit", href: "/press/brand-kit" },
    { title: "Accessibility", href: "/accessibility" },
  ],
  help: [
    { title: "Help center", href: "/help" },
    { title: "Track order", href: "/track-order" },
    { title: "Orders and cancellations", href: "/help/orders" },
    { title: "Payments", href: "/help/payments" },
    { title: "Face scan help", href: "/help/face-scan" },
    { title: "Delivery", href: "/delivery" },
    { title: "Returns and refunds", href: "/returns" },
  ],
  partners: [
    { title: "Partner with us", href: "/partners" },
    { title: "Partner stores", href: "/partners/stores" },
    { title: "Brands and suppliers", href: "/partners/brands" },
    { title: "Become a rider", href: "/partners/rider" },
    { title: "Auto and campus partners", href: "/referral" },
    { title: "FAQ", href: "/faq" },
    { title: "Contact us", href: "/contact" },
  ],
  legal: [
    { title: "Privacy policy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
    { title: "Grievance redressal", href: "/grievance" },
    { title: "Site map", href: "/site-map" },
  ],
};

