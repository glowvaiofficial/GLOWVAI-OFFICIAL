import { sampleProducts } from "../config/products";
import { sitePolicies } from "../config/policies";
import { MIN_REVIEWS_FOR_SCHEMA } from "../config/seo";
import { isValidGTIN } from "../types/product";
import {
  buildProductSchema,
  buildOfferSchema,
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildCollectionPageSchema,
  buildFAQSchema,
  buildWebPageSchema,
  buildArticleSchema,
  buildReviewSchema,
  StoredReview,
} from "../lib/seo/schema";
import { validateSchema } from "../lib/seo/validate";

function runSchemaTests() {
  console.log("🧪 Running Structured Data (Schema.org JSON-LD) Unit Tests...");
  let errors = 0;

  // Test 1: GTIN Check Digit Validation
  const validGTINs = ["6291041500213", "012345678905", "12345670"];
  const invalidGTINs = ["6291041500214", "123456", "ABC1234567890"];

  validGTINs.forEach((g) => {
    if (!isValidGTIN(g)) {
      console.error(`❌ Valid GTIN '${g}' failed GTIN validator!`);
      errors++;
    }
  });

  invalidGTINs.forEach((g) => {
    if (isValidGTIN(g)) {
      console.error(`❌ Invalid GTIN '${g}' passed GTIN validator unexpectedly!`);
      errors++;
    }
  });

  // Test 2: Product Schema & Offer Price Formatting
  const sampleProd = sampleProducts[0];
  const prodSchema = buildProductSchema(sampleProd);
  const validation = validateSchema(prodSchema);

  if (!validation.valid) {
    console.error(`❌ Product schema validation errors:`, validation.errors);
    errors += validation.errors.length;
  }

  if (prodSchema.offers.price !== sampleProd.price.toFixed(2)) {
    console.error(
      `❌ Offer price formatting mismatch: expected '${sampleProd.price.toFixed(2)}', got '${prodSchema.offers.price}'`
    );
    errors++;
  }

  // Test 3: Stock State Mapping
  const outOfStockProd = { ...sampleProd, in_stock: false };
  const outOfStockSchema = buildProductSchema(outOfStockProd);
  if (outOfStockSchema.offers.availability !== "https://schema.org/OutOfStock") {
    console.error(
      `❌ Out of stock product must map to OutOfStock, got '${outOfStockSchema.offers.availability}'`
    );
    errors++;
  }

  // Test 4: Gated Policy Flags Test
  if (sitePolicies.shipping.ready === false) {
    if (prodSchema.offers.shippingDetails !== undefined) {
      console.error("❌ shippingDetails rendered in Offer schema when shipping.ready is false!");
      errors++;
    }
  } else {
    if (!prodSchema.offers.shippingDetails) {
      console.error("❌ shippingDetails missing from Offer schema when shipping.ready is true!");
      errors++;
    }
  }

  if (sitePolicies.returns.ready === false) {
    if (prodSchema.offers.hasMerchantReturnPolicy !== undefined) {
      console.error("❌ hasMerchantReturnPolicy rendered in Offer schema when returns.ready is false!");
      errors++;
    }
  } else {
    if (!prodSchema.offers.hasMerchantReturnPolicy) {
      console.error("❌ hasMerchantReturnPolicy missing from Offer schema when returns.ready is true!");
      errors++;
    }
  }

  // Test 5: Review Threshold Test (< 5 reviews => NO schema)
  const sparseReviews: StoredReview[] = [
    {
      review_id: "r1",
      created_at: "2026-01-10T10:00:00Z",
      rating: 5,
      body: "Great serum for my skin!",
      display_name: "Ananya R.",
      verified_purchase: true,
      status: "approved",
    },
    {
      review_id: "r2",
      created_at: "2026-01-11T10:00:00Z",
      rating: 4,
      body: "Hydrates really well without oiliness.",
      display_name: "Pooja K.",
      verified_purchase: true,
      status: "approved",
    },
  ];

  const sparseProdSchema = buildProductSchema(sampleProd, sparseReviews);
  if (sparseProdSchema.aggregateRating !== undefined || sparseProdSchema.review !== undefined) {
    console.error("❌ Product schema rendered aggregateRating / review with fewer than 5 approved reviews!");
    errors++;
  }

  // Test 6: Review Threshold Test (>= 5 approved reviews => VALID schema)
  const fullReviews: StoredReview[] = Array.from({ length: 5 }, (_, i) => ({
    review_id: `r-${i}`,
    created_at: `2026-01-1${i}T10:00:00Z`,
    rating: 5,
    body: `Verified review text #${i + 1} with more than twenty characters.`,
    display_name: `Customer ${i + 1}`,
    verified_purchase: true,
    status: "approved",
  }));

  const fullProdSchema = buildProductSchema(sampleProd, fullReviews);
  if (!fullProdSchema.aggregateRating) {
    console.error("❌ Product schema missing aggregateRating when 5 approved reviews are present!");
    errors++;
  } else {
    if (fullProdSchema.aggregateRating.ratingValue !== "5.0") {
      console.error(`❌ Computed ratingValue expected '5.0', got '${fullProdSchema.aggregateRating.ratingValue}'`);
      errors++;
    }
    if (fullProdSchema.aggregateRating.reviewCount !== 5) {
      console.error(`❌ Computed reviewCount expected 5, got ${fullProdSchema.aggregateRating.reviewCount}`);
      errors++;
    }
  }

  // Test 7: Collection Page & ItemList Schema
  const breadcrumbs = [
    { name: "Home", urlPath: "/" },
    { name: "Shop", urlPath: "/shop" },
    { name: "Face Serums" },
  ];
  const collectionGraph = buildCollectionPageSchema(
    "Face Serums",
    "/shop/face-serums",
    "Collection of face serums",
    sampleProducts,
    breadcrumbs
  );

  const collectionValidation = validateSchema(collectionGraph);
  if (!collectionValidation.valid) {
    console.error("❌ Collection page schema validation failed:", collectionValidation.errors);
    errors += collectionValidation.errors.length;
  }

  // Test 8: Missing GTIN / MPN Audit Warning Test
  const missingBarcodes = sampleProducts.filter((p) => !p.gtin || !p.mpn);
  if (missingBarcodes.length > 0) {
    console.log(
      `ℹ️ Build-time Audit: ${missingBarcodes.length} catalog products missing gtin/mpn barcode metadata (omitted safely from schema).`
    );
  }

  if (errors > 0) {
    console.error(`❌ Structured Data unit tests failed with ${errors} error(s).`);
    process.exit(1);
  }

  console.log("✅ All Structured Data (Schema.org JSON-LD) unit tests passed successfully!");
}

runSchemaTests();
