// All home page copy lives here. Edit text in this file; no component changes needed.
// Anything in [SQUARE BRACKETS] is a visible placeholder that must be replaced with confirmed content.
// The privacy statement itself lives in config/privacy-copy.ts. FAQ answers live in config/content.ts (faqItems).

export const howSteps = [
  { stamp: "0:00", title: "Scan", body: "Open your camera in good light. No filters, no makeup needed.", icon: "scan" },
  { stamp: "0:30", title: "Score", body: "Get a plain-language breakdown across four skin markers.", icon: "layers" },
  { stamp: "~15:00", title: "Shop what fits", body: "See products matched to your scores, delivered in about 15 minutes.", icon: "bag" },
] as const;

export const scanTips = [
  { label: "Face a window", icon: "sun" },
  { label: "Remove glasses", icon: "glasses" },
  { label: "Hair off your face", icon: "user" },
] as const;

export const scanMarkers = [
  { title: "Hydration", body: "How well your skin holds water.", icon: "droplet" },
  { title: "Texture", body: "Surface smoothness and pore visibility.", icon: "layers" },
  { title: "Tone", body: "Evenness and sun-related discoloration.", icon: "sun" },
  { title: "Clarity", body: "Visible redness and how calm your skin barrier looks.", icon: "heart" },
] as const;

export const scanPrivacyChecks = [
  "Photos stored privately",
  "Scores saved only when you submit your report",
  "Delete your data anytime",
] as const;

// Example values only. Always shown with the "Sample report" label.
export const sampleScores = [
  { label: "Hydration", value: 82 },
  { label: "Texture", value: 64 },
  { label: "Tone", value: 71 },
  { label: "Clarity", value: 76 },
] as const;

export const concernCards = [
  { slug: "acne", title: "Breakouts and pores", line: "Breakouts that won’t take a hint.", icon: "target" },
  { slug: "dullness", title: "Dullness and glow", line: "Skin that looks tired by 3 pm.", icon: "sun" },
  { slug: "dryness", title: "Dehydration", line: "Tight, flaky, thirsty skin.", icon: "droplet" },
  { slug: "pigmentation", title: "Dark spots", line: "Marks that overstayed their welcome.", icon: "dot" },
  { slug: "sun-care", title: "Sun protection", line: "Sunscreen you’ll actually wear.", icon: "sunMedium" },
  { slug: "hair-body", title: "Scalp and body", line: "Elbows, knees, everything below the chin.", icon: "user" },
] as const;

export const routineProducts = [
  {
    step: "Cleanse",
    slug: "velvet-cloud-cica-cleanser",
    name: "Velvet Cloud Cica Cleanser",
    descriptor: "pH 5.5 gentle hydrating facial wash",
    skin: "All skin types",
    actives: ["Cica", "pH 5.5"],
    image: "/images/products/cleanser-1.png",
  },
  {
    step: "Treat",
    slug: "clarity-pop-niacinamide-serum",
    name: "Clarity Pop Niacinamide Serum",
    descriptor: "10% Niacinamide + 1% Zinc PCA pore balancing serum",
    skin: "Oily and acne-prone",
    actives: ["Niacinamide 10%", "Zinc PCA 1%"],
    image: "/images/products/serum-1.png",
  },
  {
    step: "Moisturise",
    slug: "dew-barrier-daily-hydrator",
    name: "Dew Barrier Daily Hydrator",
    descriptor: "Lightweight gel-cream with Hyaluronic Acid and Ceramide NP",
    skin: "Dry and combination",
    actives: ["Hyaluronic Acid", "Ceramide NP", "Centella Asiatica"],
    image: "/images/products/moisturiser-1.png",
  },
  {
    step: "Protect",
    slug: "sun-shield-invisible-fluid-spf50",
    name: "Sun Shield Invisible Fluid SPF 50",
    descriptor: "PA++++ weightless sunscreen with zero white cast",
    skin: "All skin types",
    actives: ["SPF 50", "PA++++"],
    image: "/images/products/sunscreen-1.png",
  },
] as const;

export const brandSourcePlaceholder =
  "[CONFIRM BRAND SOURCE: for example ‘Sourced from authorised partners.’]";

export const deliverySteps = [
  { title: "Order", body: "Pick a routine or take the scan.", icon: "bag" },
  { title: "Packed", body: "A partner store near you packs it. [CONFIRM: store type]", icon: "box" },
  { title: "Rider on the way", body: "Your rider heads to your address.", icon: "bike" },
  { title: "At your door", body: "About 15 minutes in covered areas.", icon: "home" },
] as const;

export const storyParagraphs = [
  "Buying skincare often means guessing in a shop aisle or waiting days for a delivery. Many people spend money on products that do not match their skin.",
  "We asked a simple question: what if your phone could read your skin in 30 seconds, and the right products reached you in 15 minutes?",
  "GLOW VAI began with three founders in Vijayawada, Visakhapatnam and Hyderabad. We are building it in Andhra Pradesh and listening closely to every message we get.",
] as const;

export const storyQuote = "What if the best tool for understanding your skin was already in your pocket?";

export const founders = [
  { name: "Sardar Musthafa", role: "Founder and CEO", bio: "Leads the company, the partner stores and delivery.", photo: "teamAtDesk", position: "object-center" },
  { name: "Nalla Satvik", role: "Co-Founder and Technical Lead", bio: "Builds the website, the face scan and the ordering system.", photo: "workingMoment", position: "object-center" },
  { name: "Rehmit", role: "Co-Founder", bio: "", photo: "productCloseUp", position: "object-top" },
] as const;

export const timeline = [
  { date: "Feb 2025", iso: "2025-02", title: "The first conversation" },
  { date: "Mar 2025", iso: "2025-03", title: "Listening to the beauty industry" },
  { date: "[DATE]", iso: "", title: "[REAL MILESTONE: for example first test scans]" },
  { date: "[DATE]", iso: "", title: "[REAL MILESTONE: for example Vijayawada launch]" },
] as const;

export const promises = [
  { n: "01", title: "Honest picks", body: "We show full ingredient lists and explain what each active does, in plain words." },
  { n: "02", title: "Privacy first", body: "Your photo is stored privately, and you can ask us to delete it at any time." },
  { n: "03", title: "Fair prices", body: "Prices are at MRP or lower. You always see the MRP next to our price." },
  {
    n: "04",
    title: "Genuine stock",
    body: "[CONFIRM EXACT SOURCING: for example ‘Products come from authorised partners and arrive sealed.’]",
  },
] as const;

export const referralStrip = {
  eyebrow: "Referral program",
  title: "Invite a friend. You both earn wallet credit.",
  terms:
    "[CONFIRM TERMS: for example ‘When a friend completes their first scan and order, you each get INR 100 in wallet credit.’]",
  button: "Join the referral program",
} as const;

export const feedbackUses = [
  "We read every submission personally.",
  "We fix what is broken and refine our picks.",
  "We publish feedback only with your explicit permission.",
] as const;
