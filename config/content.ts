import { BRAND_NAME } from "./site";

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  concern: string;
  skinTypeTag: string;
  size: string;
  image: string;
  altText: string;
  artDirectionNote: string;
  badge?: string;
  featured?: boolean;
  description: string;
  keyIngredients: string[];
  howToUse: string;
}

export interface ConcernItem {
  id: string;
  slug: string;
  title: string;
  oneLiner: string;
  bgTint: 'skymist' | 'blush' | 'mint' | 'yellow';
  image: string;
  artDirectionNote: string;
}

export interface FAQItemData {
  question: string;
  answer: string;
  category: string;
}

export interface Testimonial {
  id: string;
  author: string;
  city: string;
  skinType: string;
  rating: number;
  quote: string;
  productUsed: string;
  avatar: string;
}

export interface JournalArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  image: string;
  artDirectionNote: string;
}

export const announcementMessages = [
  "⚡ Fresh formulations delivered to your doorstep in ~15 mins.",
  "✨ Take our 30-sec free face scan and get ₹200 off your first order!",
  "🌿 Dermatologist tested, zero toxic fillers, cruelty free",
];

export const heroContent = {
  eyebrow: "15-Minute Doorstep Express",
  headlines: [
    { text: "Skincare that knows your face. At your door in 15.", accentWord: "knows" },
    { text: "Scan your face. Get your routine. Fifteen minutes later, it is at your door.", accentWord: "Fifteen" },
    { text: "Your skin has opinions. We listen, then deliver.", accentWord: "listen" },
  ],
  selectedHeadlineIndex: 0,
  subheadline: "Your bestie says you’re glowing. Let’s see if your skin agrees. 👀 Scan your face in 30 seconds for an instant skin check & personalized routine.",
  primaryCTA: "Scan my face, it's free",
  secondaryCTA: "Shop now",
  ratingText: "4.95 / 5 star rating",
  customerCountText: "18,000+ happy customers",
  deliveryBadge: "Delivered in ~15 min",
  floatingCards: {
    skinScore: {
      score: 84,
      status: "Barrier Strong",
      hydrationScore: "92%",
    },
    deliveryChip: {
      city: "Hyderabad",
      mins: "Arriving in 14 min",
    },
    ingredientChip: {
      name: "2% Niacinamide + Centella",
      origin: "Fresh Batch",
    },
  },
};

export const trustStripItems = [
  { icon: "ShieldCheck", label: "Dermatologist Approved", detail: "Tested on 500+ Indian skin types" },
  { icon: "Zap", label: "Doorstep in 15 Mins", detail: "Hyperlocal micro dark-stores" },
  { icon: "Leaf", label: "Cruelty-Free & Vegan", detail: "PETA certified, zero toxins" },
  { icon: "Lock", label: "Safe Camera Privacy", detail: "Face scans auto-delete instantly" },
  { icon: "RefreshCw", label: "Small Fresh Batches", detail: "Made in last 14 days" },
];

export const faceAnalysisFeature = {
  eyebrow: "30-Second Smart Scan",
  heading: "No 20-question quizzes. Just snap a photo and see what your skin needs.",
  subheading: "Our browser AI analyzes oil distribution, redness, hydration depth, and pore density without storing your photo.",
  steps: [
    {
      number: "01",
      title: "Snap a quick clean photo",
      description: "Good lighting, no filters. Takes 3 seconds inside your browser.",
    },
    {
      number: "02",
      title: "Get your instant 4-point breakdown",
      description: "See clear scores for hydration, barrier clarity, pore texture, and pigmentation.",
    },
    {
      number: "03",
      title: "Order exact matches in 1-click",
      description: "Buy only what your skin needs right now. Delivered in 15 mins.",
    },
  ],
  sampleResult: {
    overallScore: 82,
    subScores: [
      { name: "Hydration Depth", score: 88, color: "bg-brand" },
      { name: "Barrier Balance", score: 74, color: "bg-coral" },
      { name: "Texture Smoothness", score: 81, color: "bg-yellow" },
      { name: "Tone Clarity", score: 85, color: "bg-brand" },
    ],
    recommendationsCount: 2,
    privacyNote: "🔒 Your face photo is analysed on your phone. Storing it is optional.",
  },
  ctaText: "Start free face scan",
};

export const bestsellerProducts: Product[] = [
  {
    id: "prod-1",
    slug: "dew-barrier-daily-hydrator",
    name: "Dew Barrier Daily Hydrator",
    subtitle: "Lightweight gel-cream with Hyaluronic Acid & Ceramide NP",
    price: 499,
    originalPrice: 599,
    rating: 4.9,
    reviewCount: 420,
    concern: "Dryness & Dullness",
    skinTypeTag: "Dry & Combination Skin",
    size: "50 ml / 1.7 fl oz",
    image: "/images/products/moisturiser-1.png",
    altText: `${BRAND_NAME} Dew Barrier Cream Jar`,
    artDirectionNote: "Close-up of matte glass cream jar showing creamy white texture swirl beside a splash of pure water.",
    badge: "",
    featured: true,
    description: "Plumps parched skin instantly with zero sticky residue. Built with cold-pressed botanical oils and Hyaluronic Acid that penetrate deep into epidermal layers.",
    keyIngredients: ["Sodium Hyaluronate (2%)", "Ceramide NP", "Centella Asiatica Extract"],
    howToUse: "Smooth 2 pumps onto clean face and neck morning and night. Follow with sun care during the day.",
  },
  {
    id: "prod-2",
    slug: "clarity-pop-niacinamide-serum",
    name: "Clarity Pop Niacinamide Serum",
    subtitle: "10% Niacinamide + 1% Zinc PCA Pore Balancing Elixir",
    price: 549,
    originalPrice: 699,
    rating: 4.8,
    reviewCount: 312,
    concern: "Acne & Pores",
    skinTypeTag: "Oily & Acne-Prone",
    size: "30 ml / 1.0 fl oz",
    image: "/images/products/serum-1.png",
    altText: `${BRAND_NAME} Clarity Pop Serum dropper bottle`,
    artDirectionNote: "Dropper suspended above a crystal glass surface with golden hour sunlight shining through liquid.",
    badge: "",
    featured: false,
    description: "Tames midday shine and reduces visible pore size within 3 weeks. Gentle enough for reactive skin.",
    keyIngredients: ["Niacinamide (10%)", "Zinc PCA (1%)", "Sarcosine"],
    howToUse: "Apply 3-4 drops to cleansed skin before heavy creams. Use daily morning or evening.",
  },
  {
    id: "prod-3",
    slug: "velvet-cloud-cica-cleanser",
    name: "Velvet Cloud Cica Cleanser",
    subtitle: "pH 5.5 Gentle Hydrating Facial Wash",
    price: 399,
    originalPrice: 499,
    rating: 4.9,
    reviewCount: 188,
    concern: "Redness & Sensitivity",
    skinTypeTag: "All Skin Types",
    size: "120 ml / 4.0 fl oz",
    image: "/images/products/cleanser-1.png",
    altText: `${BRAND_NAME} Velvet Cloud Cleanser bottle`,
    artDirectionNote: "Clean mint green tube next to fresh botanical leaves and fluffy white lather.",
    badge: "",
    featured: false,
    description: "Melt away city grime and waterproof makeup without stripping your natural lipid barrier. Leaves skin feeling velvety soft.",
    keyIngredients: ["Centella Asiatica (Cica)", "Colloidal Oatmeal", "Glycerin"],
    howToUse: "Massage onto wet face for 60 seconds. Rinse thoroughly with lukewarm water.",
  },
  {
    id: "prod-4",
    slug: "sun-shield-invisible-fluid-spf50",
    name: "Sun Shield Invisible Fluid SPF 50",
    subtitle: "PA++++ Zero White-Cast Weightless Sunscreen",
    price: 599,
    originalPrice: 749,
    rating: 4.95,
    reviewCount: 560,
    concern: "Sun Care & UV",
    skinTypeTag: "All Indian Skin Tones",
    size: "50 ml / 1.7 fl oz",
    image: "/images/products/sunscreen-1.png",
    altText: `${BRAND_NAME} Sun Shield Fluid SPF 50 bottle`,
    artDirectionNote: "Sleek white & blue tube standing on warm sunlit sand with clear water reflection.",
    badge: "",
    featured: false,
    description: "Absorbs in 10 seconds with zero greasy feeling and zero chalky white cast. Tested under high humidity and heat.",
    keyIngredients: ["Modern UV Filters (Tinosorb S)", "Vitamin E", "Aloe Barbadensis Leaf Juice"],
    howToUse: "Apply generously as the final step of your skincare routine 15 minutes before sun exposure.",
  },
];

export const concernCategories: ConcernItem[] = [
  {
    id: "c-1",
    slug: "acne",
    title: "Breakouts & Pores",
    oneLiner: "Calm active spots and clear clogged pores without peeling.",
    bgTint: "skymist",
    image: "/images/products/serum-1.png",
    artDirectionNote: "Close up skin texture showing clean dewiness and herbal ingredients.",
  },
  {
    id: "c-2",
    slug: "dullness",
    title: "Dullness & Dark Spots",
    oneLiner: "Brighten stubborn marks with stable Vitamin C and Niacinamide.",
    bgTint: "yellow",
    image: "/images/products/moisturiser-1.png",
    artDirectionNote: "Bright sunlight illuminating citrus botanical swatches.",
  },
  {
    id: "c-3",
    slug: "dryness",
    title: "Dehydration & Flakiness",
    oneLiner: "Deep 24-hour hydration that locks in moisture instantly.",
    bgTint: "blush",
    image: "/images/products/cleanser-1.png",
    artDirectionNote: "Smooth cream texture swatch spreading over clean skin.",
  },
  {
    id: "c-4",
    slug: "pigmentation",
    title: "Uneven Tone & Sun Damage",
    oneLiner: "Target excess melanin production with gentle botanical actives.",
    bgTint: "mint",
    image: "/images/products/serum-2.png",
    artDirectionNote: "Aesthetic bottle on clear glass with water ripples.",
  },
  {
    id: "c-5",
    slug: "sun-care",
    title: "Daily Sun Protection",
    oneLiner: "Broad spectrum SPF 50 PA++++ that wears like invisible silk.",
    bgTint: "skymist",
    image: "/images/products/sunscreen-1.png",
    artDirectionNote: "Sunlight shining through clear gel texture.",
  },
  {
    id: "c-6",
    slug: "hair-body",
    title: "Scalp & Body Barrier",
    oneLiner: "Nourishing body washes and scalp serums for total balance.",
    bgTint: "blush",
    image: "/images/products/body-1.png",
    artDirectionNote: "Warm shower droplets on sleek glass bottle.",
  },
];

export const founderStory = {
  eyebrow: "Why We Started",
  title: "We got tired of waiting 4 days for cosmetics that did not suit our climate.",
  pullQuote: `"Skincare shouldn't feel like a high-school chemistry exam or a logistics nightmare. When you break out before an important day, you need the right solution now."`,
  narrative: [
    `Back in 2023, after living through humid summers in Hyderabad and dusty winters in Delhi, our founders spent thousands on imported serums that broke out their skin. Worse still, when skin flared up, standard e-commerce took 3 to 5 days to deliver a simple calming gel.`,
    `We asked a simple question: If we can get hot food and groceries in 10 minutes, why are we buying cosmetics made 8 months ago that sit in warehouses for weeks?`,
    `That is when ${BRAND_NAME} was born. We built a network of fresh, small-batch formulations tailored specifically for Indian skin tones and humid weather. Paired with our 30-second camera scan, you get hyper-personalized skin routine recommendations.`,
  ],
  founderName: "SK Sardar Musthafa",
  founderRole: "Co-Founder",
  founderImage: "/images/founders/sardhar-musthafa.jpeg",
  founderImageAlt: "SK Sardar Musthafa, co-founder of GLOW VAI",
  artDirectionNote: "Warm candid studio photograph of founder.",
  timeline: [
    { year: "2023", title: "The Frustration", desc: "Founders test 40+ products during peak monsoon; 80% cause breakouts in humid weather." },
    { year: "2024", title: "Lab Formulations", desc: "Partnered with cosmetic chemists to craft zero-fillers, pH 5.5 daily barrier formulas." },
    { year: "2025", title: "Face Scan Launch", desc: "Launched 30-second client-side face analysis and local distribution." },
  ],
};

export const brandValues = {
  eyebrow: "Our Core Standards",
  heading: "Formulated for real skin in real weather. No gimmicks, no toxic fillers.",
  values: [
    {
      title: "1. Fresh Formulations",
      description: "Our products don't rot on warm warehouse shelves for months. Batches are produced monthly in small runs.",
    },
    {
      title: "2. Climate-Adaptive Formulas",
      description: "Indian humidity requires light, fast-absorbing water-gel textures that won't clog pores under sweat or dust.",
    },
    {
      title: "3. Transparency You Can Read",
      description: "Every active ingredient is clearly printed on the label. No secret proprietary blends.",
    },
    {
      title: "4. Zero-Hassle Camera Scan",
      description: "No guesswork. Our browser scan accurately checks your barrier health. Storing your photo is completely optional.",
    },
  ],
  bannedIngredientsHeading: "What We NEVER Put in Our Bottles:",
  bannedIngredients: [
    "Parabens & Phthalates",
    "Synthetic Fragrance / Parfum",
    "Drying Denatured Alcohol",
    "Mineral Oil & Petrolatum",
    "Sulphates (SLS / SLES)",
    "Formaldehyde Releasers",
  ],
};

export const quickDeliveryContent = {
  eyebrow: "Hyperlocal Cosmetics Engine",
  heading: "How we get fresh cosmetics to your doorstep.",
  description: "We store fresh formulations in local hubs near your neighborhood for fast, reliable doorstep delivery.",
  steps: [
    { step: "01", title: "Smart Matching", desc: "Your scan picks the exact fresh batch needed for your skin concern." },
    { step: "02", title: "Hub Dispatch", desc: "Order packed carefully at your nearest neighborhood hub." },
    { step: "03", title: "Doorstep Delivery", desc: "Delivered to your hands cleanly and safely." },
  ],
  stats: [
    { value: "Fast", label: "Doorstep Delivery" },
    { value: "Fresh", label: "Small-Batch Runs" },
    { value: "Full", label: "Transparent INCI" },
    { value: "Free", label: "Camera Skin Scan" },
  ],
  activeCities: ["Hyderabad", "Bengaluru", "Mumbai", "Delhi NCR", "Chennai"],
  pincodePlaceholder: "Enter your 6-digit pincode...",
};

export const testimonials: Testimonial[] = [
  {
    id: "t-1",
    author: "Ananya Sharma",
    city: "Hyderabad",
    skinType: "Combination / Sensitive",
    rating: 5,
    quote: "I used the face scan and ordered the Clarity Pop Serum. By next morning the redness had dropped significantly.",
    productUsed: "Clarity Pop Serum",
    avatar: "/images/products/serum-1.png",
  },
  {
    id: "t-2",
    author: "Rohan Varma",
    city: "Bengaluru",
    skinType: "Oily Skin",
    rating: 5,
    quote: "Most sunscreens make me look like a ghost. The Sun Shield Gel feels weightless and invisible on skin.",
    productUsed: "Sun Shield Fluid SPF 50",
    avatar: "/images/products/sunscreen-1.png",
  },
];

export const journalArticles: JournalArticle[] = [
  {
    id: "j-1",
    slug: "how-to-read-ingredient-lists",
    title: "How to read cosmetic labels without a degree in biochemistry",
    category: "Skin Education",
    readTime: "4 min read",
    excerpt: "Learn why the first 5 ingredients on any bottle matter most, and how to spot active percentages.",
    image: "/images/products/moisturiser-1.png",
    artDirectionNote: "Flatlay of skincare bottles with handwritten notebook notes and glass dropper.",
  },
  {
    id: "j-2",
    slug: "humidity-and-skin-barrier",
    title: "Why heavy western creams fail in Indian humidity and what to do instead",
    category: "Formulation Science",
    readTime: "5 min read",
    excerpt: "High humidity traps sweat under heavy occlusives. Here is how water-gel matrices keep your barrier hydrated.",
    image: "/images/products/cleanser-1.png",
    artDirectionNote: "Clean glass container filled with clear hydrating gel with light reflections.",
  },
];

export const faqItems: FAQItemData[] = [
  {
    question: "How does doorstep delivery work?",
    answer: "When you place an order, our system dispatches your fresh product batch from the nearest local hub directly to your address.",
    category: "Delivery",
  },
  {
    question: "Is my face scan photo saved on your servers?",
    answer: "Only if you tick the optional box. Then it is kept privately for up to 90 days.",
    category: "Privacy & Scan",
  },
  {
    question: "Are GLOW VAI products safe for sensitive or acne-prone skin?",
    answer: "Yes! Every single product is non-comedogenic, pH 5.5 balanced, and free from synthetic fragrances, drying alcohols, and essential oils.",
    category: "Formulation",
  },
  {
    question: "Can I return a product if it does not suit my skin?",
    answer: "Yes. We offer a 14-day Skin Satisfaction Guarantee. Contact support if a formula does not suit your skin.",
    category: "Orders & Returns",
  },
];

export const finalCTABannerContent = {
  heading: "Ready to give your skin what it actually wants?",
  subheading: "Takes 30 seconds to scan. Get your custom skin report for free.",
  primaryCTA: "Scan My Face Now",
  secondaryCTA: "Browse Full Shop",
  newsletterHeading: "Subscribe for skin tips and fresh batch alerts",
  newsletterSubheading: "Join our subscriber list for plain-language skincare science and new drop announcements.",
  privacyDisclaimer: "We respect your inbox. No spam ever. Unsubscribe anytime.",
};
