import type { SubScores } from "./analysis";

export interface ExcelProduct {
  id: string;
  brand: "Minimalist" | "The Derma Co";
  name: string;
  category: "Cleanser" | "Serum" | "Moisturizer" | "Sunscreen";
  keyActives: string;
  suitableSkin: string;
  primaryConcern: string;
  price: number;
  mrp: number;
  tag: string;
  benefit: string;
}

export const EXCEL_DATABASE_PRODUCTS: ExcelProduct[] = [
  // Minimalist
  {
    id: "min-clean-1",
    brand: "Minimalist",
    name: "Minimalist 2% Salicylic Acid + LHA Face Cleanser",
    category: "Cleanser",
    keyActives: "Salicylic Acid 2% + LHA",
    suitableSkin: "Oily, Acne-prone",
    primaryConcern: "Active acne, excess oil, clogged pores",
    price: 299,
    mrp: 349,
    tag: "Deep Cleanse",
    benefit: "Gently clears pores and reduces excess oil.",
  },
  {
    id: "min-clean-2",
    brand: "Minimalist",
    name: "Minimalist 6% Oat Extract Gentle Cleanser",
    category: "Cleanser",
    keyActives: "Oat Extract 6%",
    suitableSkin: "Sensitive, Dry, Normal",
    primaryConcern: "Sensitivity, irritation, redness",
    price: 299,
    mrp: 349,
    tag: "Barrier Care",
    benefit: "Calms irritated skin while maintaining natural moisture.",
  },
  {
    id: "min-serum-1",
    brand: "Minimalist",
    name: "Minimalist 10% Niacinamide Face Serum",
    category: "Serum",
    keyActives: "Niacinamide 10%",
    suitableSkin: "Oily, Combination",
    primaryConcern: "Acne, excess oil, pores, acne marks",
    price: 599,
    mrp: 649,
    tag: "Texture Refiner",
    benefit: "Helps refine texture and even out skin tone.",
  },
  {
    id: "min-serum-2",
    brand: "Minimalist",
    name: "Minimalist 2% Hyaluronic Acid + PGA Face Serum",
    category: "Serum",
    keyActives: "Hyaluronic Acid 2% + PGA",
    suitableSkin: "All, especially dry",
    primaryConcern: "Dehydration, dryness, tightness",
    price: 599,
    mrp: 649,
    tag: "Hydration Boost",
    benefit: "Multi-depth hydration for plump, bouncy glass skin.",
  },
  {
    id: "min-moist-1",
    brand: "Minimalist",
    name: "Minimalist 10% Vitamin B5 Gel Moisturizer",
    category: "Moisturizer",
    keyActives: "Vitamin B5 10%",
    suitableSkin: "Oily, Combination, Acne-prone",
    primaryConcern: "Lightweight hydration, barrier support",
    price: 349,
    mrp: 399,
    tag: "Oil-Free Hydration",
    benefit: "Lightweight gel hydration for daily barrier nourishment.",
  },
  {
    id: "min-moist-2",
    brand: "Minimalist",
    name: "Minimalist 0.3% Ceramide + Bisabolol Moisturizing Cream",
    category: "Moisturizer",
    keyActives: "Ceramide + Bisabolol",
    suitableSkin: "Dry, Sensitive",
    primaryConcern: "Barrier repair, dryness, sensitivity",
    price: 599,
    mrp: 649,
    tag: "Barrier Shield",
    benefit: "Restores skin barrier and locks in deep hydration.",
  },
  {
    id: "min-sun-1",
    brand: "Minimalist",
    name: "Minimalist Light Fluid SPF 50 Sunscreen",
    category: "Sunscreen",
    keyActives: "SPF 50 PA++++",
    suitableSkin: "Oily, Combination, Acne-prone",
    primaryConcern: "Daily UV protection, lightweight finish",
    price: 499,
    mrp: 549,
    tag: "Invisible Shield",
    benefit: "Daily broad-spectrum protection from UVA/UVB.",
  },

  // The Derma Co
  {
    id: "derma-clean-1",
    brand: "The Derma Co",
    name: "The Derma Co 2% Sali-Cinamide Anti-Acne Face Wash",
    category: "Cleanser",
    keyActives: "Salicylic Acid 2% + Niacinamide 2%",
    suitableSkin: "Oily, Acne-prone",
    primaryConcern: "Acne, acne marks, excess oil",
    price: 349,
    mrp: 399,
    tag: "Acne Control",
    benefit: "Deep cleans pores and prevents stubborn breakouts.",
  },
  {
    id: "derma-clean-2",
    brand: "The Derma Co",
    name: "The Derma Co 2% Niacinamide Gentle Skin Cleanser",
    category: "Cleanser",
    keyActives: "Niacinamide 2%",
    suitableSkin: "Sensitive, Dry, Normal",
    primaryConcern: "Gentle cleansing, barrier-friendly care",
    price: 299,
    mrp: 349,
    tag: "Gentle Glow",
    benefit: "Non-stripping daily cleanser for sensitive skin.",
  },
  {
    id: "derma-serum-1",
    brand: "The Derma Co",
    name: "The Derma Co 10% Niacinamide Face Serum + 2% Zinc PCA",
    category: "Serum",
    keyActives: "Niacinamide 10% + Zinc PCA 2%",
    suitableSkin: "Oily, Combination, Acne-prone",
    primaryConcern: "Acne marks, sebum, pores",
    price: 599,
    mrp: 649,
    tag: "Spot Control",
    benefit: "Supports smoother, clearer, and more even-looking skin.",
  },
  {
    id: "derma-serum-2",
    brand: "The Derma Co",
    name: "The Derma Co 10% Vitamin C Face Serum + 5% Niacinamide + HA",
    category: "Serum",
    keyActives: "Vitamin C 10% + Niacinamide 5% + HA",
    suitableSkin: "All skin types",
    primaryConcern: "Dark spots, pigmentation, dullness",
    price: 649,
    mrp: 699,
    tag: "Radiance Boost",
    benefit: "Fades dark spots and boosts natural skin radiance.",
  },
  {
    id: "derma-moist-1",
    brand: "The Derma Co",
    name: "The Derma Co 5% Nia-Ceramide Daily Hydrating Moisturizer",
    category: "Moisturizer",
    keyActives: "Niacinamide 5% + Ceramide 2%",
    suitableSkin: "All skin types",
    primaryConcern: "Hydration, barrier support, acne marks",
    price: 399,
    mrp: 449,
    tag: "Barrier Hydrator",
    benefit: "Hydrates deeply while strengthening skin barrier.",
  },
  {
    id: "derma-sun-1",
    brand: "The Derma Co",
    name: "The Derma Co 1% Hyaluronic Sunscreen Aqua Gel SPF 50 PA++++",
    category: "Sunscreen",
    keyActives: "Hyaluronic Acid + SPF 50 PA++++",
    suitableSkin: "All skin types",
    primaryConcern: "Daily UV protection, hydration",
    price: 499,
    mrp: 549,
    tag: "Dewy Sun Protection",
    benefit: "Non-greasy daily sun protection with dewy hydration.",
  },
  {
    id: "derma-sun-2",
    brand: "The Derma Co",
    name: "The Derma Co 1% Hyaluronic Sunscreen Oil-Free Matte Gel SPF 50 PA++++",
    category: "Sunscreen",
    keyActives: "Hyaluronic Acid + SPF 50 PA++++",
    suitableSkin: "Oily, Acne-prone",
    primaryConcern: "Daily UV protection, oil control",
    price: 499,
    mrp: 549,
    tag: "Matte Sun Gel",
    benefit: "Ultra-lightweight oil-free sun protection.",
  },
];

export function getRecommendedProducts(subScores?: SubScores): ExcelProduct[] {
  // Always return 4-5 balanced products covering Cleanser, Serum, Moisturizer, Sunscreen mixing Minimalist and The Derma Co
  const cleanserMin = EXCEL_DATABASE_PRODUCTS.find((p) => p.id === "min-clean-1")!;
  const serumDerma = EXCEL_DATABASE_PRODUCTS.find((p) => p.id === "derma-serum-1")!;
  const moistMin = EXCEL_DATABASE_PRODUCTS.find((p) => p.id === "min-moist-1")!;
  const sunDerma = EXCEL_DATABASE_PRODUCTS.find((p) => p.id === "derma-sun-1")!;
  const serumMin = EXCEL_DATABASE_PRODUCTS.find((p) => p.id === "min-serum-2")!;

  return [cleanserMin, serumDerma, moistMin, sunDerma, serumMin];
}

