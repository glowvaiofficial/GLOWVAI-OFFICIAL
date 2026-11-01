// Content for the footer sub-pages. Facts here are only what the business has stated or what the site does.
export type SubSection = { title: string; items: string[] };
export type SubPageData = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  sections: SubSection[];
  apply?: { label: string; emailKey: "careers" | "partners" | "support" | "returns" | "privacy" | "contact"; subject: string };
};

export const careerAreas: SubPageData[] = [
  {
    slug: "marketing-sales-revenue",
    eyebrow: "Careers",
    title: "Marketing, sales and revenue",
    intro: "Grow GLOW VAI in Andhra Pradesh and turn interest into orders.",
    sections: [
      { title: "What you would do", items: ["Plan and run campaigns for the free face scan.", "Work with partner stores, campus ambassadors and auto partners.", "Track sales and revenue and report what is working."] },
      { title: "What we look for", items: ["Clear writing in English, Telugu or both.", "Comfort talking to customers and shop owners.", "Curiosity about numbers."] },
    ],
    apply: { label: "Apply for marketing and sales", emailKey: "careers", subject: "Marketing, sales and revenue" },
  },
  {
    slug: "operations-delivery",
    eyebrow: "Careers",
    title: "Operations and delivery",
    intro: "Keep orders moving from partner store to door.",
    sections: [
      { title: "What you would do", items: ["Coordinate packing at partner stores.", "Manage riders and delivery times.", "Fix stock and delay problems the same day."] },
      { title: "What we look for", items: ["Calm under pressure.", "Good knowledge of Vijayawada or Visakhapatnam roads.", "Honest reporting."] },
    ],
    apply: { label: "Apply for operations", emailKey: "careers", subject: "Operations and delivery" },
  },
  {
    slug: "engineering-product",
    eyebrow: "Careers",
    title: "Engineering and product",
    intro: "Build the face scan, the shop and the order system.",
    sections: [
      { title: "What you would do", items: ["Work on the Next.js website and its forms.", "Improve the face scan and the results page.", "Keep the site fast, accessible and secure."] },
      { title: "What we look for", items: ["TypeScript and React experience.", "Care for accessibility and privacy.", "Willingness to ship small and often."] },
    ],
    apply: { label: "Apply for engineering", emailKey: "careers", subject: "Engineering and product" },
  },
  {
    slug: "customer-care",
    eyebrow: "Careers",
    title: "Customer care",
    intro: "Be the friendly voice customers meet first.",
    sections: [
      { title: "What you would do", items: ["Answer WhatsApp and email questions.", "Help with orders, returns and scan results.", "Pass problems to the right team."] },
      { title: "What we look for", items: ["Patience and clear replies.", "English and Telugu.", "Basic skincare interest."] },
    ],
    apply: { label: "Apply for customer care", emailKey: "careers", subject: "Customer care" },
  },
];

export const helpTopics: SubPageData[] = [
  {
    slug: "orders",
    eyebrow: "Help center",
    title: "Orders and cancellations",
    intro: "How to place, change or cancel an order.",
    sections: [
      { title: "Placing an order", items: ["Add items to your bag and send the order, or message us on WhatsApp at +91 89778 55998.", "We confirm the order with you before dispatch."] },
      { title: "Changing or cancelling", items: ["Write to us as soon as you can, with your order number.", "If your order has not left the store yet, we will do our best to cancel it."] },
      { title: "Something wrong with your order", items: ["Missing or damaged items: write to support with a photo.", "Late order: see how delivery works on the delivery page."] },
    ],
    apply: { label: "Email order support", emailKey: "support", subject: "Order help" },
  },
  {
    slug: "payments",
    eyebrow: "Help center",
    title: "Payments",
    intro: "How you pay for an order.",
    sections: [
      { title: "Ways to pay", items: ["We confirm how you can pay when we confirm your order on WhatsApp."] },
      { title: "Prices", items: ["Prices are at MRP or lower. You always see the MRP next to our price."] },
      { title: "Payment problems", items: ["Money taken but no confirmation: write to support with the time and amount."] },
    ],
    apply: { label: "Email payment support", emailKey: "support", subject: "Payment help" },
  },
  {
    slug: "face-scan",
    eyebrow: "Help center",
    title: "Face scan help",
    intro: "Get a good result from the free scan.",
    sections: [
      { title: "Before you scan", items: ["Face a window for even light.", "Remove glasses.", "Keep hair off your face."] },
      { title: "Your photo", items: ["Your photo is sent to us only when you submit your report, and it is stored privately.", "Delete your data anytime by writing to contact@glowvai.in."] },
      { title: "If the scan will not start", items: ["Allow camera access in your browser.", "Try another browser or reload the page."] },
    ],
    apply: { label: "Email us about the scan", emailKey: "contact", subject: "Face scan help" },
  },
];

export const partnerKinds: SubPageData[] = [
  {
    slug: "stores",
    eyebrow: "Partners",
    title: "Partner stores",
    intro: "Pack and hand over orders close to customers.",
    sections: [
      { title: "What you do", items: ["Keep genuine stock.", "Pack orders quickly when a rider arrives.", "Tell us when an item runs out."] },
      { title: "What we look for", items: ["A shop in or near Vijayawada.", "Valid purchase invoices.", "Clean, safe storage."] },
    ],
    apply: { label: "Apply as a partner store", emailKey: "partners", subject: "Partner store" },
  },
  {
    slug: "brands",
    eyebrow: "Partners",
    title: "Brands and suppliers",
    intro: "Want your skincare stocked on GLOW VAI?",
    sections: [
      { title: "What to send", items: ["Your catalogue with MRP.", "Batch and expiry details.", "Proof you may sell the products."] },
      { title: "How we decide", items: ["Genuine, labelled stock only.", "Full ingredient lists.", "Fair prices."] },
    ],
    apply: { label: "Send your catalogue", emailKey: "partners", subject: "Brand listing" },
  },
  {
    slug: "rider",
    eyebrow: "Partners",
    title: "Become a rider",
    intro: "Deliver GLOW VAI orders in your area.",
    sections: [
      { title: "What you do", items: ["Collect orders from partner stores.", "Deliver to the customer quickly and safely.", "Keep the customer informed."] },
      { title: "What to send", items: ["Your name, phone number and area.", "Vehicle type and licence details."] },
    ],
    apply: { label: "Apply as a rider", emailKey: "partners", subject: "Rider" },
  },
];
