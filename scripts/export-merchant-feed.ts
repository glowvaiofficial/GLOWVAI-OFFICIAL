import fs from "fs";
import path from "path";
import { sampleProducts } from "../config/products";
import { SITE_URL } from "../lib/site-url";
import { isValidGTIN } from "../types/product";

function exportMerchantFeed() {
  console.log("📦 Exporting Google Merchant Center CSV Feed...");

  const headers = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "price",
    "availability",
    "brand",
    "gtin",
    "mpn",
    "condition",
    "google_product_category",
  ];

  const rows = sampleProducts.map((p) => {
    const brandName = p.brand || (p.name.startsWith("Minimalist") ? "Minimalist" : "The Derma Co");
    const fullTitle = `${brandName} ${p.name.replace(brandName, "").trim()} ${p.size}`.replace(/\s+/g, " ").trim();
    const cleanDesc = (p.description_original || p.description || p.tagline).replace(/<[^>]*>/g, "").replace(/"/g, '""');
    const fullLink = `${SITE_URL}/product/${p.slug}`;
    
    const firstImage = p.images && p.images.length > 0 ? p.images[0] : "/og.jpg";
    const fullImageLink = firstImage.startsWith("http")
      ? firstImage
      : `${SITE_URL}${firstImage.startsWith("/") ? "" : "/"}${firstImage}`;

    const formattedPrice = `${p.price.toFixed(2)} INR`;
    const availability = p.in_stock !== false ? "in_stock" : "out_of_stock";
    const validGtin = p.gtin && isValidGTIN(p.gtin) ? p.gtin : "";

    return [
      `"${p.sku || p.slug}"`,
      `"${fullTitle}"`,
      `"${cleanDesc}"`,
      `"${fullLink}"`,
      `"${fullImageLink}"`,
      `"${formattedPrice}"`,
      `"${availability}"`,
      `"${brandName}"`,
      `"${validGtin}"`,
      `"${p.mpn || ""}"`,
      `"new"`,
      `"Health & Beauty > Personal Care > Cosmetics > Skin Care"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const outputPath = path.join(process.cwd(), "public", "merchant-feed.csv");

  fs.writeFileSync(outputPath, csvContent, "utf-8");
  console.log(`✅ Merchant Center CSV Feed successfully written to: public/merchant-feed.csv (${rows.length} products)`);
}

exportMerchantFeed();
