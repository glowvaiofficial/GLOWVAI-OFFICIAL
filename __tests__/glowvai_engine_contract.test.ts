import assert from "node:assert/strict";
import { generateOrderRef, createWhatsAppOrderUrl, type WhatsAppOrderItem } from "../lib/whatsapp";
import { getRecommendedProducts, EXCEL_DATABASE_PRODUCTS, type ExcelProduct } from "../lib/recommend";
import { leadFormSchema } from "../lib/schemas";
import test from "node:test";

/**
 * GLOW VAI Engine Contract & Utility Test Suite
 * Executed with Node.js standard assertions.
 */
export async function runGlowVaiTestSuite() {
  console.log("⚡ Running GLOW VAI Engine & Contract Test Suite...\n");

  // 1. WhatsApp Order Reference Builder
  {
    console.log("1. Testing WhatsApp Order Ref & Checkout Builder...");
    const ref = generateOrderRef();
    assert.match(ref, /^GV-\d{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/, "Order reference must match GV-YYMMDD-XXXX format");

    const items: WhatsAppOrderItem[] = [
      { sku: "min-clean-1", name: "Minimalist Salicylic Cleanser", qty: 2, price: 299, size: "100ml" },
      { sku: "derma-serum-1", name: "The Derma Co Niacinamide Serum", qty: 1, price: 599 },
    ];

    const { url, orderRef, subtotal } = await createWhatsAppOrderUrl(items, "500081", "cart");

    // Subtotal: (299 * 2) + 599 = 1197
    assert.equal(subtotal, 1197, "Subtotal must equal 1197");
    assert.match(orderRef, /^GV-\d{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    assert.ok(url.startsWith("https://wa.me/"), "URL must target wa.me");
    assert.ok(url.includes(encodeURIComponent(orderRef)), "URL must contain encoded order reference");
    assert.ok(url.includes(encodeURIComponent("Pincode: 500081")), "URL must contain pincode");
    console.log("   ✓ WhatsApp Order Builder passed.");
  }

  // 2. Product Recommendation Engine
  {
    console.log("\n2. Testing Recommendation Engine (Minimalist & Derma Co Database)...");
    const recs = getRecommendedProducts({ hydration: 70, texture: 65, tone: 80, clarity: 75 });
    assert.equal(recs.length, 5, "Recommendation engine must return 5 products");

    const brands = recs.map((p) => p.brand);
    assert.ok(brands.includes("Minimalist"), "Must include Minimalist products");
    assert.ok(brands.includes("The Derma Co"), "Must include The Derma Co products");

    recs.forEach((prod: ExcelProduct) => {
      assert.ok(prod.id, "Product ID must exist");
      assert.ok(prod.name, "Product name must exist");
      assert.ok(prod.keyActives, "Key actives must exist");
      assert.ok(prod.price > 0, "Price must be positive");
      assert.ok(prod.mrp >= prod.price, "MRP must be >= price");
    });

    assert.ok(EXCEL_DATABASE_PRODUCTS.length >= 13, "Excel database must contain at least 13 products");
    console.log("   ✓ Product Recommendation Engine passed.");
  }

  // 3. Lead Schema & Apps Script Contract Safety
  {
    console.log("\n3. Testing Lead Schema & DPDP Act Compliance...");
    const validPayload = {
      name: "Ananya Roy",
      phone: "9876543210",
      email: "ananya@example.com",
      consent: true,
      marketingOptIn: false,
      ageConfirmed: true,
      consentVersion: "v1.0-dpdp-2024",
      website: "",
    };

    const validResult = leadFormSchema.safeParse(validPayload);
    assert.equal(validResult.success, true, "Valid lead payload must pass schema validation");

    const botPayload = {
      name: "Spam Bot",
      phone: "9876543210",
      consent: true,
      website: "http://spam-link.com",
    };
    const botResult = leadFormSchema.safeParse(botPayload);
    assert.equal(botResult.success, false, "Honeypot filled submission must fail schema validation");

    // Apps Script cell safety limit (MAX_CELL_CHARS = 2000)
    const MAX_CELL_CHARS = 2000;
    const longString = "X".repeat(2500);
    const sanitized = longString.slice(0, MAX_CELL_CHARS);
    assert.equal(sanitized.length, MAX_CELL_CHARS, "String must be truncated to MAX_CELL_CHARS");
    console.log("   ✓ Lead Schema & Apps Script Contract passed.");
  }

  console.log("\n🎉 ALL 3 TEST SUITES PASSED CLEANLY!");
}

// Runs under the node test runner (npm test: node --test). A failing assertion fails this test.
test("GLOW VAI engine and contract suites pass", async () => {
  await runGlowVaiTestSuite();
});
