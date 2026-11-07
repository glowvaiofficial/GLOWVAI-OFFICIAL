import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVITY_CAP,
  ACTIVITY_MESSAGES,
  ACTIVITY_TYPES,
  DEFAULT_LANGUAGE,
  RETURN_WINDOW_DAYS,
  LANGUAGE_CODES,
  decodeActivityCursor,
  encodeActivityCursor,
  isActivityType,
  isLanguageCode,
  nextConsents,
  planActivityTrim,
  subscriptionActionsFor,
  validateProfileInput,
  type ConsentState,
} from "../../lib/shop/settings/rules";
import { transition } from "../../lib/shop/growth/subscriptions";
import { RETURN_WINDOW_MS } from "../../lib/shop/returns";
import { DEFAULT_PREFS, prefsFrom, pushDecision } from "../../lib/shop/notifications/policy";
import { en, hi, te } from "../../glowvai-app/core/i18n/messages";
import { translate } from "../../glowvai-app/core/i18n/translate";
import { LEGAL_DRAFT_BANNER, faqItems, privacyPage, termsPage, type LegalFacts } from "../../glowvai-app/features/settings/legalContent";

const DAY = 86_400_000;
const facts: LegalFacts = {
  legalName: "Test Operator Pvt. Ltd.",
  address: "1 Test Road",
  supportEmail: "support@example.test",
  supportPhone: "+91 00000 00000",
  supportHours: null,
  manufacturerName: null,
  licenceNumber: null,
};

const validBody = { name: "Asha Rao", phone: "9876543210", email: "asha@example.com", marketingOptIn: true, analyticsOptIn: false };

describe("profile validation", () => {
  test("accepts a complete valid profile and normalises it", () => {
    const r = validateProfileInput({ ...validBody, email: "  ASHA@Example.COM " });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, "Asha Rao");
      assert.equal(r.value.phone, "9876543210");
      assert.equal(r.value.email, "asha@example.com");
      assert.equal(r.value.marketing, true);
      assert.equal(r.value.analytics, false);
      assert.equal(r.value.address, null);
    }
  });

  test("name: required, at least two characters with a letter, at most 80", () => {
    const short = validateProfileInput({ ...validBody, name: "A" });
    assert.deepEqual(short, { ok: false, field: "name", error: "Enter your name." });
    assert.equal(validateProfileInput({ ...validBody, name: "1234" }).ok, false);
    assert.equal(validateProfileInput({ ...validBody, name: "" }).ok, false);
    assert.equal(validateProfileInput({ ...validBody, name: "a".repeat(81) }).ok, false);
    assert.equal(validateProfileInput({ ...validBody, name: "a".repeat(80) }).ok, true);
    // Names in Hindi and Telugu are letters too.
    assert.equal(validateProfileInput({ ...validBody, name: "आशा राव" }).ok, true);
    assert.equal(validateProfileInput({ ...validBody, name: "ఆశా రావు" }).ok, true);
  });

  test("Indian mobile: 10 digits starting 6 to 9, optional +91 or 91 prefix", () => {
    assert.equal(validateProfileInput({ ...validBody, phone: "+91 98765 43210" }).ok, true);
    assert.equal(validateProfileInput({ ...validBody, phone: "919876543210" }).ok, true);
    for (const bad of ["1234567890", "5876543210", "98765432", "98765432101", "", "abcdefghij"]) {
      const r = validateProfileInput({ ...validBody, phone: bad });
      assert.equal(r.ok, false, `expected ${bad} to be refused`);
      if (!r.ok) assert.equal(r.field, "phone");
    }
  });

  test("email is optional and must be valid when given", () => {
    const none = validateProfileInput({ ...validBody, email: "" });
    assert.equal(none.ok, true);
    if (none.ok) assert.equal(none.value.email, "");
    for (const bad of ["asha", "asha@", "@example.com", "a b@example.com", "a@b"]) {
      const r = validateProfileInput({ ...validBody, email: bad });
      assert.equal(r.ok, false, `expected ${bad} to be refused`);
      if (!r.ok) assert.equal(r.field, "email");
    }
  });

  test("consent choices must be booleans when sent; absent means unchanged", () => {
    const bad = validateProfileInput({ ...validBody, marketingOptIn: "yes" });
    assert.equal(bad.ok, false);
    const absent = validateProfileInput({ name: "Asha Rao", phone: "9876543210" });
    assert.equal(absent.ok, true);
    if (absent.ok) {
      assert.equal(absent.value.marketing, undefined);
      assert.equal(absent.value.analytics, undefined);
    }
  });

  test("address is optional; a 7-digit pincode is refused, not shortened", () => {
    const withAddress = validateProfileInput({ ...validBody, address: { fullAddress: "Flat 2", city: "Vijayawada", pincode: "520001", landmark: "" } });
    assert.equal(withAddress.ok, true);
    if (withAddress.ok) assert.equal(withAddress.value.address?.pincode, "520001");
    const seven = validateProfileInput({ ...validBody, address: { fullAddress: "x", city: "y", pincode: "5200011" } });
    assert.equal(seven.ok, false);
    if (!seven.ok) assert.equal(seven.field, "pincode");
  });
});

describe("consent dates", () => {
  const none: ConsentState = { marketing: false, analytics: false, marketingAt: null, analyticsAt: null };

  test("a first answer is dated now, even when it is no", () => {
    const next = nextConsents(none, { marketing: false, analytics: true }, 1000);
    assert.equal(next.marketingAt, 1000);
    assert.equal(next.analyticsAt, 1000);
  });

  test("the same answer again keeps the earlier date", () => {
    const first = nextConsents(none, { marketing: true, analytics: undefined }, 1000);
    const again = nextConsents(first, { marketing: true, analytics: undefined }, 5000);
    assert.equal(again.marketingAt, 1000);
  });

  test("a change, either way, takes the new date", () => {
    const on = nextConsents(none, { marketing: true, analytics: undefined }, 1000);
    const off = nextConsents(on, { marketing: false, analytics: undefined }, 9000);
    assert.equal(off.marketing, false);
    assert.equal(off.marketingAt, 9000);
  });

  test("a choice the request does not mention is kept with its date", () => {
    const on = nextConsents(none, { marketing: true, analytics: true }, 1000);
    const later = nextConsents(on, { marketing: undefined, analytics: false }, 4000);
    assert.equal(later.marketing, true);
    assert.equal(later.marketingAt, 1000);
    assert.equal(later.analytics, false);
    assert.equal(later.analyticsAt, 4000);
  });
});

describe("returns window", () => {
  test("the shop text uses the same window as the server rule", () => {
    assert.equal(RETURN_WINDOW_DAYS * DAY, RETURN_WINDOW_MS);
  });
});

describe("language allow-list", () => {
  test("only en, hi and te are accepted", () => {
    assert.deepEqual([...LANGUAGE_CODES], ["en", "hi", "te"]);
    for (const ok of ["en", "hi", "te"]) assert.equal(isLanguageCode(ok), true);
    for (const bad of ["fr", "EN", " hi", "hi ", "", "english", "ta", undefined, null, 1, ["en"], { language: "en" }]) {
      assert.equal(isLanguageCode(bad), false, `expected ${String(bad)} to be refused`);
    }
  });

  test("the default is English", () => {
    assert.equal(DEFAULT_LANGUAGE, "en");
  });
});

describe("notification gating", () => {
  const optedIn = { ...DEFAULT_PREFS, offers: true };
  // 12:30 in India: outside the quiet hours, so only the rules under test decide.
  const NOON_IST = DAY + 7 * 3_600_000;
  const base = { prefs: DEFAULT_PREFS, marketingConsent: false, nowMs: NOON_IST };

  test("offers need marketing consent, even when the offers switch is on", () => {
    assert.deepEqual(pushDecision({ ...base, category: "offers", prefs: optedIn, marketingConsent: false }), { send: false, reason: "no-marketing-consent" });
    assert.deepEqual(pushDecision({ ...base, category: "offers", prefs: optedIn, marketingConsent: true }), { send: true });
  });

  test("offers stay off by default, and an explicit true is required for consent", () => {
    assert.equal(DEFAULT_PREFS.offers, false);
    assert.deepEqual(pushDecision({ ...base, category: "offers", prefs: DEFAULT_PREFS, marketingConsent: true }), { send: false, reason: "preference-off" });
    assert.deepEqual(pushDecision({ ...base, category: "offers", prefs: optedIn, marketingConsent: "true" as unknown as boolean }), { send: false, reason: "no-marketing-consent" });
  });

  test("each sub-topic switch is honoured for its notification type", () => {
    const off = (key: keyof typeof DEFAULT_PREFS) => ({ ...DEFAULT_PREFS, [key]: false });
    assert.deepEqual(pushDecision({ ...base, category: "orders", type: "refund_processed", prefs: off("returns") }), { send: false, reason: "preference-off" });
    assert.deepEqual(pushDecision({ ...base, category: "orders", type: "return_update", prefs: off("returns") }), { send: false, reason: "preference-off" });
    assert.deepEqual(pushDecision({ ...base, category: "orders", type: "subscription_processed", prefs: off("subscriptions") }), { send: false, reason: "preference-off" });
    assert.deepEqual(pushDecision({ ...base, category: "orders", type: "subscription_processed", prefs: DEFAULT_PREFS }), { send: true });
    assert.deepEqual(pushDecision({ ...base, category: "offers", type: "coins_credited", prefs: { ...optedIn, referrals: false }, marketingConsent: true }), { send: false, reason: "preference-off" });
  });

  test("stored prefs with missing or wrong values fall back to the defaults", () => {
    assert.deepEqual(prefsFrom({ returns: false, offers: "yes" }), { ...DEFAULT_PREFS, returns: false });
    assert.deepEqual(prefsFrom(null), DEFAULT_PREFS);
  });
});

describe("activity log", () => {
  test("the cap is 200 entries", () => {
    assert.equal(ACTIVITY_CAP, 200);
  });

  test("a write at the cap removes the oldest entries so that 200 remain afterwards", () => {
    const existing = Array.from({ length: 200 }, (_, i) => ({ id: `e${i}`, createdAt: 1000 + i }));
    const drop = planActivityTrim(existing);
    assert.deepEqual(drop, ["e0"]);
    assert.equal(existing.length - drop.length + 1, ACTIVITY_CAP);
  });

  test("an over-full log is trimmed to the newest 199 before the new entry", () => {
    const existing = Array.from({ length: 250 }, (_, i) => ({ id: `e${i}`, createdAt: 1000 + i }));
    const drop = planActivityTrim(existing);
    assert.equal(drop.length, 51);
    assert.equal(existing.length - drop.length + 1, ACTIVITY_CAP);
    assert.ok(!drop.includes("e249"), "newest entry is kept");
  });

  test("messages are fixed copy with no personal values", () => {
    for (const type of ACTIVITY_TYPES) {
      const message = ACTIVITY_MESSAGES[type];
      assert.ok(message.length > 0, `${type} has a message`);
      assert.doesNotMatch(message, /\d/, `${type} has no digits`);
      assert.doesNotMatch(message, /@|\+91|₹|https?:/i, `${type} has no contact, amount or link`);
    }
    assert.equal(ACTIVITY_MESSAGES.phone_updated, "Phone number updated");
  });

  test("type guard and cursor round trip", () => {
    assert.equal(isActivityType("address_added"), true);
    assert.equal(isActivityType("bogus"), false);
    const cursor = encodeActivityCursor(1700000000000, "abc_DEF-1");
    assert.deepEqual(decodeActivityCursor(cursor), { createdAt: 1700000000000, id: "abc_DEF-1" });
    assert.equal(decodeActivityCursor("nope"), null);
  });
});

describe("subscription action gating by status", () => {
  const statuses = ["ACTIVE", "PAUSED", "CANCELLED"];
  const actions = ["pause", "resume", "quantity", "cancel"] as const;

  test("the buttons shown match what the server's transition allows, for every status", () => {
    for (const status of statuses) {
      for (const action of actions) {
        const shown = subscriptionActionsFor(status).includes(action);
        const serverOk = transition({ status, intervalWeeks: 4 }, action, 1_000, { quantity: 2 }).ok;
        assert.equal(shown, serverOk, `${status} ${action}`);
      }
    }
  });

  test("a cancelled subscription offers no actions", () => {
    assert.deepEqual(subscriptionActionsFor("CANCELLED"), []);
    assert.deepEqual(subscriptionActionsFor("ACTIVE"), ["pause", "quantity", "cancel"]);
    assert.deepEqual(subscriptionActionsFor("PAUSED"), ["resume", "quantity", "cancel"]);
  });
});

describe("i18n", () => {
  test("Hindi and Telugu return their own text, and English is the default", () => {
    assert.equal(translate("hi", "settings.title"), hi["settings.title"]);
    assert.equal(translate("te", "settings.title"), te["settings.title"]);
    assert.equal(translate("en", "settings.title"), "Settings");
    assert.equal(translate("fr", "settings.title"), "Settings");
  });

  test("every key falls back to English when a language does not have it", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const expected = (te as Record<string, string | undefined>)[key] ?? en[key];
      assert.equal(translate("te", key), expected, key);
      const hindi = (hi as Record<string, string | undefined>)[key] ?? en[key];
      assert.equal(translate("hi", key), hindi, key);
    }
  });

  test("placeholders are filled as plain text and unknown placeholders are kept", () => {
    assert.equal(translate("en", "profile.choiceDate", { date: "1 Jan 2026" }), "Chosen on 1 Jan 2026");
    assert.equal(translate("en", "profile.choiceDate", {}), "Chosen on {date}");
    assert.equal(translate("en", "profile.choiceDate", { date: "<b>x</b>" }), "Chosen on <b>x</b>");
  });

  test("the catalogue header carries the native-review note", () => {
    const source = readFileSync(join(process.cwd(), "glowvai-app/core/i18n/messages.ts"), "utf8");
    assert.ok(source.includes("Translations drafted; reviewed by a native speaker before wide release"));
  });
});

describe("FAQ, terms and privacy pages", () => {
  test("the FAQ has answers, including returns and delivery facts from the code", () => {
    const items = faqItems(facts);
    assert.ok(items.length >= 6);
    const all = items.map((i) => i.answer).join(" ");
    assert.ok(all.includes("₹49"), "Gannavaram fee");
    assert.ok(all.includes("₹499"), "free delivery threshold");
    assert.ok(all.includes("7 days"), "return window");
    assert.ok(items.every((i) => i.question.length > 0 && i.answer.length > 0));
  });

  test("the support answer says to contact from the app when hours are not configured", () => {
    const contact = faqItems(facts).find((i) => i.id === "contact");
    assert.ok(contact?.answer.includes("Contact support from the app for help."));
    const withHours = faqItems({ ...facts, supportHours: "10:00 to 18:00 IST" }).find((i) => i.id === "contact");
    assert.ok(withHours?.answer.includes("Support hours: 10:00 to 18:00 IST."));
  });

  test("the terms and the privacy policy state the review banner", () => {
    assert.equal(LEGAL_DRAFT_BANNER, "Draft — pending legal review before publication");
    assert.equal(termsPage(facts).banner, LEGAL_DRAFT_BANNER);
    assert.equal(privacyPage(facts).banner, LEGAL_DRAFT_BANNER);
  });

  test("values not configured show as Not set, and nothing is invented", () => {
    const empty: LegalFacts = { legalName: null, address: null, supportEmail: null, supportPhone: null, supportHours: null, manufacturerName: null, licenceNumber: null };
    const terms = JSON.stringify(termsPage(empty));
    assert.ok(terms.includes("Not set"));
    assert.ok(terms.includes("Product manufacturer: Not set"));
    assert.ok(!terms.includes("Test Operator"));
  });

  test("the privacy policy covers retention limits from the code and the deletion route", () => {
    const text = JSON.stringify(privacyPage(facts));
    assert.ok(text.includes("the newest 100 are kept"));
    assert.ok(text.includes("the newest 200 entries are kept"));
    assert.ok(text.includes("up to 5 devices"));
    assert.ok(text.includes("Privacy and security"));
  });
});
