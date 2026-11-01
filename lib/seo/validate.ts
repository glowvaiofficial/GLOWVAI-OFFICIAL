import { isValidGTIN } from "@/types/product";
import { SITE_URL } from "@/lib/site-url";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSchema(graphOrNode: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodes = graphOrNode["@graph"] ? graphOrNode["@graph"] : [graphOrNode];
  const ids = new Set<string>();

  nodes.forEach((node: any, idx: number) => {
    const type = node["@type"];
    const id = node["@id"];

    // 1. @id uniqueness
    if (id) {
      if (ids.has(id)) {
        errors.push(`Duplicate @id found: '${id}'`);
      }
      ids.add(id);
    }

    // 2. Absolute HTTPS URLs check
    const checkUrls = (obj: any, path: string = "") => {
      if (typeof obj === "string") {
        if (
          obj.startsWith("http://") ||
          obj.includes("localhost") ||
          obj.includes("glowvai.com")
        ) {
          errors.push(`Banned URL string '${obj}' at ${path}`);
        }
        if (
          (path.endsWith("url") || path.endsWith("@id") || path.endsWith("image")) &&
          !obj.startsWith("https://") &&
          !obj.startsWith("http://") &&
          !obj.startsWith("#")
        ) {
          errors.push(`Relative URL '${obj}' at ${path} must be absolute HTTPS`);
        }
      } else if (typeof obj === "object" && obj !== null) {
        Object.keys(obj).forEach((k) => checkUrls(obj[k], `${path}.${k}`));
      }
    };
    checkUrls(node, `Node[${idx}]`);

    // 3. Em-dash check
    const nodeJson = JSON.stringify(node);
    if (nodeJson.includes("—")) {
      errors.push(`Node[${idx}] contains forbidden em-dash ('—')`);
    }

    // 4. Product Type Specific Validation
    if (type === "Product") {
      if (!node.name || node.name.trim() === "") errors.push("Product missing name");
      if (!node.description) warnings.push("Product missing description");
      if (!node.offers) errors.push("Product missing offers");
      if (node.gtin13 && !isValidGTIN(node.gtin13)) errors.push(`Invalid GTIN-13: ${node.gtin13}`);
      if (node.gtin12 && !isValidGTIN(node.gtin12)) errors.push(`Invalid GTIN-12: ${node.gtin12}`);
      if (node.gtin8 && !isValidGTIN(node.gtin8)) errors.push(`Invalid GTIN-8: ${node.gtin8}`);

      if (node.aggregateRating) {
        const rating = Number(node.aggregateRating.ratingValue);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          errors.push(`Invalid ratingValue: ${node.aggregateRating.ratingValue}`);
        }
        const count = Number(node.aggregateRating.reviewCount);
        if (isNaN(count) || count < 5) {
          errors.push(`aggregateRating reviewCount ${count} is below threshold of 5!`);
        }
      }
    }

    // 5. Offer Type Validation
    if (type === "Offer") {
      if (!node.priceCurrency || node.priceCurrency !== "INR") {
        errors.push(`Offer priceCurrency must be 'INR', got '${node.priceCurrency}'`);
      }
      if (!node.price || !/^\d+\.\d{2}$/.test(String(node.price))) {
        errors.push(`Offer price must be a 2-decimal number string, got '${node.price}'`);
      }
      if (
        node.availability !== "https://schema.org/InStock" &&
        node.availability !== "https://schema.org/OutOfStock"
      ) {
        errors.push(`Invalid offer availability: '${node.availability}'`);
      }
    }

    // 6. Banned Types Check
    const bannedTypes = [
      "FoodEstablishment",
      "Restaurant",
      "Menu",
      "MenuItem",
      "LocalBusiness",
      "Store",
      "HowTo",
    ];
    if (bannedTypes.includes(type)) {
      errors.push(`Banned Schema type '${type}' found!`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
