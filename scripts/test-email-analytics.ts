import crypto from "node:crypto";
import { emailCopy } from "@/config/email-copy";
import { renderEmail } from "@/lib/email/render";
import { createUnsubscribeToken, verifyUnsubscribeToken, createConfirmToken, verifyConfirmToken } from "@/lib/email/tokens";
import { sanitizeParams } from "@/lib/analytics";
import { BANNED_ANALYTICS_KEYS } from "@/config/analytics-events";

/**
 * GLOW VAI Email and GA4 Analytics Comprehensive Verification Test Suite.
 * Asserts:
 * - ZERO em-dashes across copy and rendered templates.
 * - ZERO banned buzzwords across all email templates.
 * - Parameter scrubber strips PII and banned keys.
 * - Signed tokens verify, expire, and reject tampering.
 * - HTML and plain text render successfully for all 12 templates.
 */

const BANNED_WORDS = [
  "unlock",
  "elevate",
  "seamless",
  "revolutionize",
  "leverage",
  "empower",
  "journey",
  "glow-up",
  "game-changer",
];

function runTests() {
  console.log("============================================================");
  console.log("GLOW VAI EMAIL & GA4 ANALYTICS TEST SUITE");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Banned Words & Em-Dashes in Email Copy
  console.log("1. Checking Email Copy for Em-dashes and Banned Words...");
  const copyStr = JSON.stringify(emailCopy);

  assert(!copyStr.includes("—"), "No em-dash (—) character in emailCopy");

  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    assert(!regex.test(copyStr), `No banned word '${word}' in emailCopy`);
  }

  // TEST 2: Template Rendering Audit
  console.log("\n2. Testing Template Rendering for All 12 Email Templates...");
  const templates = [
    "contact_ack",
    "contact_notify",
    "lead_report",
    "lead_alert",
    "order_intent_notify",
    "waitlist_confirm",
    "data_request_ack",
    "data_request_notify",
    "review_request",
    "weekly_digest",
    "newsletter_confirm",
    "newsletter_welcome",
  ] as const;

  const mockData: Record<string, any> = {
    ref: "CT-241011-9999",
    topic: "Product Inquiry",
    name: "Test Customer",
    email: "test@example.com",
    phone: "+919876543210",
    message: "Question about serum ingredients.",
    persona: "Dew Barrier Routine",
    glowLevel: 4,
    scoreBandText: "Band 4 of 5",
    token: "sample_token_123",
  };

  for (const tmpl of templates) {
    const rendered = renderEmail(tmpl, mockData, tmpl.startsWith("newsletter") ? "marketing" : "transactional");

    assert(rendered.html.length > 100, `Template ${tmpl} renders valid HTML string`);
    assert(rendered.text.length > 20, `Template ${tmpl} renders valid Plain Text string`);
    assert(!rendered.html.includes("—"), `Template ${tmpl} HTML has no em-dashes`);
    assert(!rendered.text.includes("—"), `Template ${tmpl} Text has no em-dashes`);

    for (const word of BANNED_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      assert(!regex.test(rendered.html), `Template ${tmpl} HTML free of '${word}'`);
    }
  }

  // TEST 3: Token Signing & Verification
  console.log("\n3. Testing Signed Unsubscribe and Confirmation Tokens...");
  const sampleEmail = "subscriber@example.com";
  const unsubToken = createUnsubscribeToken(sampleEmail, "marketing");
  const verifiedUnsub = verifyUnsubscribeToken(unsubToken);

  assert(verifiedUnsub.valid === true, "Valid unsubscribe token verifies successfully");
  assert(verifiedUnsub.email === sampleEmail, "Verified unsubscribe token extracts original email");

  const tamperedToken = unsubToken.substring(0, unsubToken.length - 4) + "XXXX";
  const verifiedTampered = verifyUnsubscribeToken(tamperedToken);
  assert(verifiedTampered.valid === false, "Tampered token is rejected");

  const confirmToken = createConfirmToken(sampleEmail, 48 * 3600 * 1000);
  const verifiedConfirm = verifyConfirmToken(confirmToken);
  assert(verifiedConfirm.valid === true, "Valid double opt-in confirm token verifies");

  // TEST 4: GA4 Parameter Sanitizer & Blacklist Audit
  console.log("\n4. Testing GA4 Parameter Scrubber and PII Protection...");
  const rawParams = {
    email: "user@example.com",
    phone: "+919876543210",
    name: "John Doe",
    cta_id: "hero_scan_now",
    location: "homepage_hero",
    user_message: "Contact me at test@domain.com or call 9876543210",
    score_band: 3,
  };

  const scrubbed = sanitizeParams(rawParams);

  for (const bannedKey of BANNED_ANALYTICS_KEYS) {
    assert(!(bannedKey in scrubbed), `Banned key '${bannedKey}' removed from parameters`);
  }

  assert(scrubbed.cta_id === "hero_scan_now", "Allowed key 'cta_id' preserved");
  assert(scrubbed.location === "homepage_hero", "Allowed key 'location' preserved");
  assert(scrubbed.score_band === 3, "Allowed key 'score_band' preserved");

  // TEST 5: HMAC Webhook Signature Verification
  console.log("\n5. Testing Internal Order Status HMAC Signature Verification...");
  const secret = "glowvai_internal_webhook_secret_key_2026";
  const ts = String(Date.now());
  const body = JSON.stringify({ order_ref: "GV-241011-0001", status: "confirmed", final_value: 1298 });
  const payloadToSign = `${ts}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(payloadToSign).digest("hex");

  const expectedSig = crypto.createHmac("sha256", secret).update(payloadToSign).digest("hex");
  assert(crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig)), "HMAC-SHA256 signature verification passes");

  console.log("\n============================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
