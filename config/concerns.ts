// One landing page per skin concern, linked from the footer and the shop.
// Guidance is general cosmetic advice, not medical advice.
export type ConcernPage = {
  slug: string;
  key: string; // matches Product.concerns
  name: string;
  title: string;
  intro: string;
  image: string;
  imageAlt: string;
  signs: string[];
  look: { name: string; why: string }[];
  routine: { step: string; tip: string }[];
  avoid: string[];
};

export const concernPages: ConcernPage[] = [
  {
    slug: "breakouts-and-pores",
    key: "acne",
    name: "Breakouts and pores",
    title: "Calmer skin, clearer pores.",
    intro: "Products and simple habits for oily skin, blocked pores and the odd breakout.",
    image: "/images/face-scan/skin_grid.png",
    imageAlt: "Close view of skin texture and pores",
    signs: ["Shine by midday", "Blackheads on the nose and chin", "Small bumps that come and go"],
    look: [
      { name: "Salicylic acid", why: "Clears oil from inside pores." },
      { name: "Niacinamide", why: "Helps balance oil and calm redness." },
      { name: "Light gel moisturisers", why: "Hydrate without feeling heavy." },
    ],
    routine: [
      { step: "Cleanse", tip: "A gentle face wash, morning and night." },
      { step: "Treat", tip: "One active at a time. Start every other night." },
      { step: "Moisturise", tip: "Yes, even oily skin needs it." },
      { step: "Protect", tip: "A light sunscreen every morning." },
    ],
    avoid: ["Scrubbing hard", "Picking or squeezing", "Stacking many actives at once"],
  },
  {
    slug: "dullness-and-glow",
    key: "dullness",
    name: "Dullness and glow",
    title: "Bring back the glow.",
    intro: "For skin that looks tired, flat or uneven, especially after sun, heat and late nights.",
    image: "/images/face-analysis/glow_results.png",
    imageAlt: "Illustration of a skin score improving",
    signs: ["Skin looks flat in photos", "Rough patches", "Make-up sits unevenly"],
    look: [
      { name: "Vitamin C", why: "Helps skin look brighter and more even." },
      { name: "Niacinamide", why: "Supports an even-looking tone." },
      { name: "Hyaluronic acid", why: "Plumps with water so skin reflects light." },
    ],
    routine: [
      { step: "Cleanse", tip: "Remove sunscreen and sweat fully at night." },
      { step: "Treat", tip: "A brightening serum in the morning." },
      { step: "Moisturise", tip: "Hydrated skin looks smoother." },
      { step: "Protect", tip: "Sun is the main cause of dullness." },
    ],
    avoid: ["Skipping sunscreen", "Harsh soaps", "Hot water on the face"],
  },
  {
    slug: "dehydration",
    key: "dryness",
    name: "Dehydration",
    title: "Skin that holds its water.",
    intro: "For tight, flaky or rough skin, whether you are dry, oily or in between.",
    image: "/images/face-analysis/barrier_depth.png",
    imageAlt: "Illustration of the skin barrier holding moisture",
    signs: ["Tightness after washing", "Flaky patches", "Fine lines that fade after moisturiser"],
    look: [
      { name: "Hyaluronic acid", why: "Draws water into the skin." },
      { name: "Ceramides", why: "Support the barrier that keeps water in." },
      { name: "Glycerin", why: "A simple, gentle humectant." },
    ],
    routine: [
      { step: "Cleanse", tip: "A cream or gel wash that does not squeak." },
      { step: "Treat", tip: "A hydrating serum on damp skin." },
      { step: "Moisturise", tip: "Seal it in, morning and night." },
      { step: "Protect", tip: "Sun and wind dry skin out further." },
    ],
    avoid: ["Foaming soaps", "Long hot showers", "Alcohol-heavy toners"],
  },
  {
    slug: "dark-spots",
    key: "pigmentation",
    name: "Dark spots",
    title: "A more even tone.",
    intro: "For marks left after breakouts, sun spots and patches of uneven colour.",
    image: "/images/face-scan/indian_female.png",
    imageAlt: "A woman checking her skin with a phone scan",
    signs: ["Brown marks after a pimple heals", "Spots that darken in summer", "Uneven patches on cheeks"],
    look: [
      { name: "Niacinamide", why: "Helps fade the look of marks over time." },
      { name: "Vitamin C", why: "Supports a brighter, even tone." },
      { name: "Broad-spectrum sunscreen", why: "Stops spots getting darker." },
    ],
    routine: [
      { step: "Cleanse", tip: "Gentle, so skin is not irritated." },
      { step: "Treat", tip: "Be patient. Marks fade over weeks, not days." },
      { step: "Moisturise", tip: "Irritated skin marks more easily." },
      { step: "Protect", tip: "Every day, and reapply outdoors." },
    ],
    avoid: ["Skipping sunscreen", "Picking at marks", "Lemon or DIY bleaching"],
  },
  {
    slug: "sun-protection",
    key: "sun-care",
    name: "Sun protection",
    title: "Your daily shield.",
    intro: "The one step that helps every other concern. Light textures made for Indian heat.",
    image: "/images/home-ai/express_delivery.png",
    imageAlt: "A rider out in the sun delivering an order",
    signs: ["You go outside most days", "Spots get darker in summer", "Skin feels hot after sun"],
    look: [
      { name: "SPF 30 or higher", why: "Protects against burning rays." },
      { name: "Broad spectrum (PA+++ or higher)", why: "Protects against ageing rays too." },
      { name: "Light, non-greasy finish", why: "So you will wear it every day." },
    ],
    routine: [
      { step: "Cleanse", tip: "Wash it off fully at night." },
      { step: "Treat", tip: "Serums go under sunscreen." },
      { step: "Moisturise", tip: "Let it settle before sunscreen." },
      { step: "Protect", tip: "Two finger-lengths for the face and neck." },
    ],
    avoid: ["Using too little", "Only wearing it on sunny days", "Forgetting to reapply outdoors"],
  },
];

export const concernBySlug = (slug: string) => concernPages.find((c) => c.slug === slug);
