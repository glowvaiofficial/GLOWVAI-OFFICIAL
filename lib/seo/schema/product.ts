import { Product, isValidGTIN } from "@/types/product";
import { buildOfferSchema } from "./offer";
import { buildReviewSchema, StoredReview } from "./review";
import { SITE_URL } from "@/lib/site-url";

export function buildProductSchema(
  product: Product,
  reviews: StoredReview[] = []
): Record<string, any> {
  const fullUrl = `${SITE_URL}/product/${product.slug}`;
  const brandName = product.brand || (product.name.startsWith("Minimalist") ? "Minimalist" : "The Derma Co");
  
  const cleanName = `${brandName} ${product.name.replace(brandName, "").trim()} ${product.size}`.replace(/\s+/g, " ").trim();

  const rawDescription = product.description_original || product.description || product.tagline;
  const cleanDescription = rawDescription.replace(/<[^>]*>/g, "").slice(0, 5000);

  const absoluteImages = (product.images || []).slice(0, 6).map((img) =>
    img.startsWith("http") ? img : `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`
  );

  let categoryName = "Skin Care > Face Serums";
  if (product.category === "moisturiser") categoryName = "Skin Care > Moisturizers";
  if (product.category === "sunscreen") categoryName = "Skin Care > Sunscreen";
  if (product.category === "cleanser") categoryName = "Skin Care > Face Washes";

  const productSchema: Record<string, any> = {
    "@type": "Product",
    "@id": `${fullUrl}#product`,
    "name": cleanName,
    "description": cleanDescription,
    "image": absoluteImages,
    "brand": {
      "@type": "Brand",
      "name": brandName,
    },
    "category": categoryName,
    "size": product.size,
    "url": fullUrl,
    "offers": buildOfferSchema(product),
  };

  if (product.sku) productSchema["sku"] = product.sku;
  if (product.mpn) productSchema["mpn"] = product.mpn;

  if (product.gtin && isValidGTIN(product.gtin)) {
    const len = product.gtin.length;
    if (len === 13) productSchema["gtin13"] = product.gtin;
    else if (len === 12) productSchema["gtin12"] = product.gtin;
    else if (len === 8) productSchema["gtin8"] = product.gtin;
    else productSchema["gtin"] = product.gtin;
  }

  const reviewData = buildReviewSchema(reviews);
  if (reviewData.aggregateRating) {
    productSchema["aggregateRating"] = reviewData.aggregateRating;
  }
  if (reviewData.reviews && reviewData.reviews.length > 0) {
    productSchema["review"] = reviewData.reviews;
  }

  return productSchema;
}
