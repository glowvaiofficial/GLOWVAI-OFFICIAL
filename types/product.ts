export interface ProductVariant {
  size: string;
  price: number;
  mrp: number;
  sku?: string;
  gtin?: string;
}

export interface Product {
  id: string;
  sku?: string;
  mpn?: string;
  gtin?: string;
  brand?: "Minimalist" | "The Derma Co" | string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  description_original?: string;
  category: "serum" | "moisturiser" | "sunscreen" | "cleanser" | "lip" | "body" | string;
  concerns: string[];
  skinTypes: string[];
  price: number;
  mrp: number;
  size: string;
  size_unit?: "ml" | "g";
  in_stock?: boolean;
  return_eligible?: "yes" | "no";
  sizes?: ProductVariant[];
  images: string[];
  ingredients: string;
  keyIngredients: string[];
  howToUse: string[];
  cautions: string;
  shelfLife: string;
  countryOfOrigin: string;
  marketerName: string;
  marketerAddress: string;
  status: "draft" | "published";
  seo: {
    title: string;
    description: string;
  };
}

/**
 * Validates a GTIN (GTIN-8, GTIN-12, GTIN-13, or GTIN-14) using GS1 standard check digit algorithm.
 */
export function isValidGTIN(gtin?: string): boolean {
  if (!gtin || typeof gtin !== "string") return false;
  const clean = gtin.trim();
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(clean)) return false;

  const digits = clean.split("").map(Number);
  const checkDigit = digits.pop()!;
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const revIndex = digits.length - 1 - i;
    const multiplier = revIndex % 2 === 0 ? 3 : 1;
    sum += digits[i] * multiplier;
  }
  
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}
