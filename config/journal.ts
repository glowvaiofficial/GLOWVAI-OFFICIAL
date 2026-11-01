export interface JournalArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  excerpt: string;
  imageSlot?: string;
  author: {
    name: string;
    role: string;
  };
  datePublished: string;
  dateModified: string;
  status: "draft" | "published";
  summary: string;
  sections: {
    heading: string;
    paragraphs: string[];
    listItems?: string[];
    table?: {
      headers: string[];
      rows: string[][];
    };
  }[];
}

export const journalArticles: JournalArticle[] = [
  {
    id: "how-to-read-a-skincare-label",
    slug: "how-to-read-a-skincare-label",
    title: "How to Read a Skincare Label Without a Chemistry Degree",
    description: "A plain guide to ingredient lists, percentages, and key actives, so you can pick skincare with confidence.",
    category: "Skin Basics",
    readTime: "6 min read",
    imageSlot: "/images/hero/skincare-studio-hero.jpg",
    excerpt: "The front of a skincare bottle tells you what the brand wants you to notice. The back tells you what is actually inside. Here is how to read the back in three straightforward steps.",
    author: {
      name: "SK Sardar Musthafa",
      role: "Founder, GLOW VAI",
    },
    datePublished: "2026-10-10",
    dateModified: "2026-10-11",
    status: "published",
    summary: "A skincare label has two jobs. The front tells you what the brand wants you to notice. The back tells you what is actually in the bottle. Learn to read the back in three steps and shopping gets a lot less confusing.",
    sections: [
      {
        heading: "Why labels feel so confusing",
        paragraphs: [
          "Walk into any skincare aisle and every pack promises something: glow, calm, clear, or barrier repair. The back of the same pack lists scientific terms like Sodium Hyaluronate or Phenoxyethanol, making it tempting to give up and pick whatever looks attractive.",
          "You do not need to memorise organic chemistry. You only need to know where to look and what questions to ask.",
        ],
      },
      {
        heading: "Step 1: Find the ingredient list",
        paragraphs: [
          "Look for a line that starts with 'Ingredients' or 'INCI'. INCI stands for International Nomenclature of Cosmetic Ingredients. It is a globally standardized naming system, ensuring the same ingredient has the exact same name across every brand.",
          "That is why you see 'Aqua' instead of water, and Latin botanical names for plant extracts. It is not designed to conceal ingredients; it provides a shared global standard.",
        ],
      },
      {
        heading: "Step 2: Understand ingredient ordering",
        paragraphs: [
          "In cosmetic manufacturing regulations, ingredients are listed in descending order by concentration from highest to lowest amount.",
          "The first 3 to 5 ingredients make up the vast majority of the bottle (often 70% to 90%). For serums, gels, and lotions, Aqua (water) almost always comes first.",
          "Ingredients present at 1 percent or less can legally be listed in any order at the end of the list. A star active displayed in large letters on the front bottle label may sit near the end of the list. That is not inherently bad, as certain actives are clinically potent at 0.1% to 1%, but it shows that the front is marketing and the back is factual formulation.",
        ],
      },
      {
        heading: "Step 3: Spot the three kinds of ingredients",
        paragraphs: [
          "Most skincare formulations are composed of three distinct functional tiers:",
        ],
        listItems: [
          "1. The Base: Water, glycerin, propanediol, and carrier fluids that provide spreadability and skin hydration.",
          "2. The Actives: Key targeted ingredients such as Niacinamide, Salicylic Acid, Hyaluronic Acid, or SPF filters. When a brand advertises a percentage (like 10% Niacinamide), it should be verified on the back label.",
          "3. The Supporting Cast: Preservatives (such as Phenoxyethanol) that prevent microbial growth in water-based products, emulsifiers, and pH stabilizers.",
        ],
      },
      {
        heading: "A worked example: Decoding a gel moisturiser",
        paragraphs: [
          "Consider this standard back-of-pack ingredient list for a hydrating gel moisturiser:",
          "Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Ceramide NP, Phenoxyethanol, Ethylhexylglycerin, Carbomer, Sodium Hydroxide.",
        ],
        table: {
          headers: ["Ingredient", "Functional Purpose"],
          rows: [
            ["Aqua", "Purified water, the hydrating liquid base"],
            ["Glycerin", "Humectant that draws moisture into the skin barrier"],
            ["Niacinamide", "Active Vitamin B3 for tone balance and sebum control"],
            ["Sodium Hyaluronate", "Deep surface hydration and water retention"],
            ["Ceramide NP", "Essential barrier lipid that prevents moisture loss"],
            ["Phenoxyethanol", "Safe preservative system that prevents bacterial contamination"],
            ["Carbomer", "Gel matrix thickener for a lightweight feel"],
            ["Sodium Hydroxide", "Mild pH adjuster for skin-safe acidity"],
          ],
        },
      },
      {
        heading: "Key checklist before purchasing",
        paragraphs: [
          "Before buying any new product, run through these practical checks:",
        ],
        listItems: [
          "Check fragrance: If you have sensitive skin, opt for fragrance-free formulations.",
          "Check alcohols: Fatty alcohols like cetyl alcohol are nourishing; denatured alcohol can feel drying on stripped barriers.",
          "Review batch and expiry dates: Look for the open jar symbol showing how many months the product remains stable after unsealing.",
          "Always patch test: Apply a drop behind your ear or inner arm 24 hours prior to full-face use.",
        ],
      },
    ],
  },
  {
    id: "the-4-step-routine",
    slug: "the-4-step-routine",
    title: "The 4-Step Routine: Wash, Treat, Moisturise, Protect",
    description: "A straightforward daily routine framework for Indian weather without unnecessary extra steps.",
    category: "Daily Routines",
    readTime: "5 min read",
    excerpt: "You do not need a ten-step vanity shelf. Cleanse, treat, hydrate, and apply SPF is all an effective skincare regimen requires.",
    author: {
      name: "SK Sardar Musthafa",
      role: "Founder, GLOW VAI",
    },
    datePublished: "2026-10-18",
    dateModified: "2026-10-18",
    status: "draft",
    summary: "A practical guide to building an essential morning and evening routine suited for warm Indian climates.",
    sections: [],
  },
  {
    id: "sunscreen-mistakes-in-india",
    slug: "sunscreen-mistakes-in-india",
    title: "Sunscreen in India: Common Mistakes and Easy Fixes",
    description: "How to choose between fluid and gel sunscreens for humid summers and high UV exposure.",
    category: "Sun Protection",
    readTime: "5 min read",
    excerpt: "Sweat and humidity break down heavy sunscreens quickly. Here is how lightweight broad-spectrum filters keep you protected without clogged pores.",
    author: {
      name: "SK Sardar Musthafa",
      role: "Founder, GLOW VAI",
    },
    datePublished: "2026-10-25",
    dateModified: "2026-10-25",
    status: "draft",
    summary: "Clear rules on sunscreen quantity, reapplication frequency, and texture matching for South Indian weather.",
    sections: [],
  },
];
