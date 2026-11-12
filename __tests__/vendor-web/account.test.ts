import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseApplication, parseTicket, STORE_CATEGORIES, VENDOR_TICKET_CATEGORIES } from "../../lib/vendor/validation";
import * as v from "../../lib/vendor-web/validation";
import {
  buildApplicationInput,
  draftable,
  EMPTY_FORM,
  firstStepWithErrors,
  formFromDraft,
  stepForServerField,
  validateStep,
  type OnboardingForm,
} from "../../lib/vendor-web/application";
import { friendlyMessage, GENERIC_MESSAGE, messageForError, NETWORK_MESSAGE, RATE_LIMIT_MESSAGE, VendorApiError, VENDOR_ERROR_MESSAGES, fieldForError } from "../../lib/vendor-web/errors";
import { authCodeOf, authErrorMessage, AUTH_NOT_ENABLED_MESSAGE, AUTH_FALLBACK_MESSAGE, changePasswordMessage } from "../../lib/vendor-web/firebaseErrors";
import { decideVendorRoute, routeForState, VENDOR_HOME_ROUTES, type RoutingInput } from "../../lib/vendor-web/routing";
import { canEditApplication, formatIst, RESET_CONFIRMATION, STATE_COPY, SUPPORT_CATEGORY_LABELS, supportCategoryLabel } from "../../lib/vendor-web/copy";
import { clearAllDrafts, clearDraft, DRAFT_PREFIX, loadDraft, saveDraft } from "../../lib/vendor-web/drafts";
import type { VendorStateName } from "../../lib/vendor-web/types";

// The valid onboarding form every parity case starts from.
const VALID: OnboardingForm = {
  ...EMPTY_FORM,
  storeName: "Glow Store",
  ownerName: "Asha Rao",
  mobile: "9876543210",
  street: "12 MG Road, Shop 4",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  extraPincodes: ["560034"],
  openTime: "10:00",
  closeTime: "21:00",
  isOpenToday: true,
  categories: ["skincare", "makeup"],
};

const withBank: OnboardingForm = { ...VALID, bankHolder: "Asha Rao", bankName: "HDFC Bank", ifsc: "HDFC0001234", accLast4: "1234" };

/** Client builds the request body; the server's own validator must accept it. */
function clientBody(form: OnboardingForm) {
  const built = buildApplicationInput(form);
  if (!built.ok) throw new Error(`client rejected a form the server must accept: ${JSON.stringify(built.errors)}`);
  return built.value;
}

/** The value of a passing check (throws when it failed, so the test shows why). */
function valueOf<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(`expected a value, got: ${r.error}`);
  return r.value;
}

/** Server verdict for the same form (the body the client would send). */
function serverVerdict(form: OnboardingForm) {
  const built = buildApplicationInput(form);
  if (!built.ok) return { ok: false as const, client: false };
  return { ...parseApplication(JSON.parse(JSON.stringify(built.value))), client: true };
}

describe("validation parity with the server (lib/vendor/validation.ts)", () => {
  test("a valid form is accepted by both, with the same stored values", () => {
    const body = clientBody(withBank);
    const server = parseApplication(body);
    assert.equal(server.ok, true);
    if (!server.ok) return;
    assert.equal(server.value.contactNumber, "+919876543210");
    assert.deepEqual(server.value.servicePincodes, ["560001", "560034"]);
    assert.equal(server.value.bank?.ifsc, "HDFC0••••34");
    assert.equal(server.value.bank?.accLast4, "1234");
  });

  test("the store name is 2 to 120 characters after trimming and collapsing spaces", () => {
    assert.equal(v.checkStoreName("A").ok, false);
    assert.equal(v.checkStoreName("A".repeat(121)).ok, false);
    assert.equal(valueOf(v.checkStoreName("  Glow   Store ")), "Glow Store");
    assert.equal(serverVerdict({ ...VALID, storeName: "A" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, storeName: "A".repeat(121) }).ok, false);
    assert.equal(serverVerdict({ ...VALID, storeName: "AB" }).ok, true);
    assert.equal(serverVerdict({ ...VALID, storeName: "A".repeat(120) }).ok, true);
  });

  test("the owner name follows the same 2 to 120 rule", () => {
    assert.equal(serverVerdict({ ...VALID, ownerName: " " }).ok, false);
    assert.equal(serverVerdict({ ...VALID, ownerName: "Z" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, ownerName: "Zoe" }).ok, true);
  });

  test("the mobile is a 10-digit Indian number, with or without +91", () => {
    const goodCases: [string, string][] = [
      ["9876543210", "9876543210"],
      ["+91 98765 43210", "9876543210"],
      ["919876543210", "9876543210"],
      ["6000000000", "6000000000"],
    ];
    for (const [input, digits] of goodCases) {
      assert.equal(v.normaliseMobile(input), digits, input);
      assert.equal(serverVerdict({ ...VALID, mobile: input }).ok, true, input);
    }
    for (const bad of ["1234567890", "98765", "98765432109", "abcdefghij", "5876543210"]) {
      assert.equal(serverVerdict({ ...VALID, mobile: bad }).ok, false, bad);
    }
  });

  test("the pincode is 6 digits and never starts with 0", () => {
    assert.equal(v.checkPincode("012345").ok, false);
    assert.equal(v.checkPincode("12345").ok, false);
    assert.equal(serverVerdict({ ...VALID, pincode: "012345" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, pincode: "1234567" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, pincode: "123456" }).ok, true);
  });

  test("service pincodes: the store pincode is always served, duplicates collapse, the limit is 20 including the store", () => {
    const nineteen = Array.from({ length: 19 }, (_, i) => String(110000 + i));
    const twenty = Array.from({ length: 20 }, (_, i) => String(110000 + i));
    assert.equal(serverVerdict({ ...VALID, extraPincodes: nineteen }).ok, true);
    assert.equal(serverVerdict({ ...VALID, extraPincodes: twenty }).ok, false);
    assert.equal(serverVerdict({ ...VALID, extraPincodes: ["abc123"] }).ok, false);
    assert.equal(serverVerdict({ ...VALID, extraPincodes: ["012345"] }).ok, false);
    // The store's own pincode listed again is fine, and the server keeps it once.
    const dup = serverVerdict({ ...VALID, extraPincodes: ["560001", "560034", "560034"] });
    assert.equal(dup.ok, true);
    if (dup.ok) assert.deepEqual(dup.value.servicePincodes, ["560001", "560034"]);
    assert.deepEqual(v.checkServicePincodes(["560034", "560034"], "560001"), { ok: true, value: ["560001", "560034"] });
  });

  test("opening hours are HH:mm 24-hour, not equal, and isOpenToday is a boolean when given", () => {
    assert.equal(serverVerdict({ ...VALID, openTime: "9:00" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, openTime: "24:00" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, closeTime: "7:60" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, openTime: "10:00", closeTime: "10:00" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, openTime: "00:00", closeTime: "23:59" }).ok, true);
    assert.equal(serverVerdict({ ...VALID, isOpenToday: false }).ok, true);
    const closed = clientBody({ ...VALID, isOpenToday: false });
    assert.equal(closed.operatingHours.isOpenToday, false);
  });

  test("categories: one to seven, lower-cased, each one of the server's seven ids", () => {
    assert.equal(serverVerdict({ ...VALID, categories: [] }).ok, false);
    assert.equal(serverVerdict({ ...VALID, categories: ["perfume"] }).ok, false);
    assert.equal(serverVerdict({ ...VALID, categories: ["Skincare", "MAKEUP"] }).ok, true);
    assert.deepEqual(v.STORE_CATEGORY_IDS, STORE_CATEGORIES);
    assert.equal(v.MAX_CATEGORIES, 7);
    assert.equal(v.checkCategories([...STORE_CATEGORIES]).ok, true);
    for (const id of STORE_CATEGORIES) assert.equal(v.checkCategories([id]).ok, true, id);
  });

  test("GSTIN is optional, but when given it must match the 15-character format (case and spaces are tidied)", () => {
    assert.equal(v.checkGstin("").ok, true);
    assert.equal(v.checkGstin("27ABCDE1234F1Z5").ok, true);
    assert.equal(valueOf(v.checkGstin(" 27abcde1234f1z5 ")), "27ABCDE1234F1Z5");
    assert.equal(v.checkGstin("27ABCDE1234F1X5").ok, false);
    assert.equal(serverVerdict({ ...VALID, gstNumber: "27ABCDE1234F1Z5" }).ok, true);
    assert.equal(serverVerdict({ ...VALID, gstNumber: "27ABCDE1234F1X5" }).ok, false);
  });

  test("the registration number is 3 to 40 letters, digits, spaces, slash, dot or dash", () => {
    assert.equal(v.checkRegistration("AB").ok, false);
    assert.equal(v.checkRegistration("ABC-123/4").ok, true);
    assert.equal(v.checkRegistration("").ok, true);
    assert.equal(serverVerdict({ ...VALID, registrationNumber: "AB" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, registrationNumber: "ABC-123/4" }).ok, true);
  });

  test("PAN is optional; when given it must match the format, and the server keeps only its last four", () => {
    assert.equal(v.checkPan("").ok, true);
    assert.equal(v.checkPan("ABCD1234F").ok, false);
    assert.equal(serverVerdict({ ...VALID, pan: "ABCD1234F" }).ok, false);
    assert.equal(serverVerdict({ ...VALID, pan: "abcde1234f" }).ok, true);
    const server = parseApplication(clientBody({ ...VALID, pan: "abcde1234f" }));
    assert.equal(server.ok && server.value.panLast4, "234F");
    assert.ok(!("pan" in (server.ok ? server.value : {})), "the full PAN must not be stored");
  });

  test("bank: optional as a whole, but once any part is filled the holder, bank, IFSC and last four are all needed", () => {
    assert.deepEqual(v.checkBank({ holderName: "", bankName: "", ifsc: "", accLast4: "", upiVpa: "" }), { ok: true, value: undefined });
    const partial = v.checkBank({ holderName: "Asha Rao", bankName: "", ifsc: "", accLast4: "", upiVpa: "" });
    assert.equal(partial.ok, false);
    assert.equal(serverVerdict({ ...VALID, bankHolder: "Asha Rao" }).ok, false);
    assert.equal(serverVerdict(withBank).ok, true);
  });

  test("IFSC: 11 characters, fifth character 0; stored masked by the server", () => {
    assert.equal(serverVerdict({ ...withBank, ifsc: "HDFC1001234" }).ok, false);
    assert.equal(serverVerdict({ ...withBank, ifsc: "HDFC000123" }).ok, false);
    assert.equal(serverVerdict({ ...withBank, ifsc: "hdfc0001234" }).ok, true);
  });

  test("account last-four rule: exactly four digits; the full account number is never part of the request", () => {
    assert.equal(serverVerdict({ ...withBank, accLast4: "12" }).ok, false);
    assert.equal(serverVerdict({ ...withBank, accLast4: "12345" }).ok, false);
    assert.equal(serverVerdict({ ...withBank, accLast4: "12a4" }).ok, false);
    assert.equal(serverVerdict({ ...withBank, accLast4: "0042" }).ok, true);
    const body = clientBody(withBank);
    const text = JSON.stringify(body);
    for (const key of ["accountNumber", "accNumber", "accountNo", "accNo"]) assert.ok(!text.includes(key), key);
    // The server refuses a full account number outright, so a stray field could never be stored.
    const leaked = parseApplication({ ...body, bank: { ...body.bank, accountNumber: "123456789012" } });
    assert.equal(leaked.ok, false);
  });

  test("UPI is optional; when given it needs a handle and a bank suffix", () => {
    assert.equal(serverVerdict({ ...withBank, upiVpa: "store@okhdfc" }).ok, true);
    assert.equal(serverVerdict({ ...withBank, upiVpa: "store" }).ok, false);
    assert.equal(serverVerdict({ ...withBank, upiVpa: "a@b" }).ok, false);
    const bankWithBadUpi = { holderName: "Asha Rao", bankName: "HDFC Bank", ifsc: "HDFC0001234", accLast4: "1234", upiVpa: "store" };
    assert.equal(v.checkBank(bankWithBadUpi).ok, false);
  });

  test("the request body from the builder has the exact keys the server reads", () => {
    const body = clientBody(withBank);
    const serverKeys = ["storeName", "ownerName", "contactNumber", "streetAddress", "city", "state", "pincode", "servicePincodes", "operatingHours", "categories", "bank"];
    for (const k of serverKeys) assert.ok(k in body, `missing ${k}`);
    assert.equal(body.operatingHours.openTime, "10:00");
  });

  test("support tickets: the category list and the limits match the server", () => {
    assert.deepEqual(Object.keys(SUPPORT_CATEGORY_LABELS).sort(), [...VENDOR_TICKET_CATEGORIES].sort());
    const ok = v.checkTicket({ category: "ORDER_DELAY", subject: "Late pickup", description: "The rider has not come yet.", orderId: "ORD-42" });
    assert.equal(ok.ok, true);
    const serverOk = parseTicket({ category: "ORDER_DELAY", subject: "Late pickup", description: "The rider has not come yet.", orderId: "ORD-42" });
    assert.equal(serverOk.ok, true);
    assert.equal(v.checkTicket({ category: "ORDER_DELAY", subject: "ab", description: "The rider has not come yet.", orderId: "" }).ok, false);
    assert.equal(parseTicket({ category: "ORDER_DELAY", subject: "ab", description: "The rider has not come yet.", orderId: "" }).ok, false);
    assert.equal(v.checkTicket({ category: "ORDER_DELAY", subject: "Late pickup", description: "short", orderId: "" }).ok, false);
    assert.equal(parseTicket({ category: "ORDER_DELAY", subject: "Late pickup", description: "short", orderId: "" }).ok, false);
    assert.equal(v.checkTicket({ category: "ORDER_DELAY", subject: "Late pickup", description: "The rider has not come yet.", orderId: "bad id!" }).ok, false);
    assert.equal(parseTicket({ category: "ORDER_DELAY", subject: "Late pickup", description: "The rider has not come yet.", orderId: "bad id!" }).ok, false);
  });
});

describe("onboarding form helpers", () => {
  test("a blank form fails the store step first, and the server would refuse it too", () => {
    assert.equal(firstStepWithErrors(EMPTY_FORM), "store");
    assert.equal(buildApplicationInput(EMPTY_FORM).ok, false);
    assert.equal(parseApplication({}).ok, false);
  });

  test("each step only reports its own errors", () => {
    const bad = { ...VALID, storeName: "A", state: "" };
    assert.ok(validateStep("store", bad).storeName);
    assert.equal(validateStep("address", bad).storeName, undefined);
    assert.ok(validateStep("address", bad).state);
    assert.equal(validateStep("tax", VALID).gstNumber, undefined);
    assert.equal(firstStepWithErrors(VALID), null);
  });

  test("the draft keeps everything except the full PAN", () => {
    const d = draftable({ ...withBank, pan: "ABCDE1234F" });
    assert.equal("pan" in d, false);
    assert.equal(d.accLast4, "1234");
    assert.equal(JSON.stringify(d).includes("ABCDE1234F"), false);
  });

  test("a restored draft ignores unknown fields, a PAN and wrong types", () => {
    const restored = formFromDraft({ storeName: "Glow", pan: "ABCDE1234F", isOpenToday: "yes", categories: ["skincare", 4], junk: 1 });
    assert.ok(restored);
    if (!restored) return;
    assert.equal(restored.storeName, "Glow");
    assert.equal(restored.pan, "");
    assert.equal(restored.isOpenToday, true);
    assert.deepEqual(restored.categories, ["skincare"]);
    assert.equal(formFromDraft(null), null);
    assert.equal(formFromDraft("text"), null);
  });

  test("a server field error sends the user back to the step that holds that field", () => {
    assert.equal(stepForServerField("storeName"), "store");
    assert.equal(stepForServerField("contactNumber"), "store");
    assert.equal(stepForServerField("pincode"), "address");
    assert.equal(stepForServerField("servicePincodes"), "address");
    assert.equal(stepForServerField("operatingHours"), "address");
    assert.equal(stepForServerField("gstNumber"), "tax");
    assert.equal(stepForServerField("pan"), "tax");
    assert.equal(stepForServerField("bank.ifsc"), "tax");
    assert.equal(stepForServerField(null), "store");
  });
});

describe("error-code-to-message map (lib/vendor-web/errors.ts)", () => {
  const serverCodes = [
    "UNAUTHENTICATED",
    "NOT_A_VENDOR_ACCOUNT",
    "EMAIL_NOT_VERIFIED",
    "NOT_APPROVED",
    "APPLICATION_LOCKED",
    "ORDER_ALREADY_ASSIGNED",
    "ORDER_CANCELLED",
    "OUT_OF_STOCK",
    "NOT_ELIGIBLE",
    "NOT_FOUND",
    "INVALID_INPUT",
    "INVALID_STATE",
    "ITEMS_NOT_CHECKED",
    "PRODUCT_NOT_PUBLISHED",
    "ORIGIN_NOT_ALLOWED",
    "PAYLOAD_TOO_LARGE",
    "RATE_LIMITED",
    "DAILY_LIMIT",
    "INTERNAL",
  ];

  test("every code the API documents has friendly copy", () => {
    for (const code of serverCodes) {
      assert.ok(VENDOR_ERROR_MESSAGES[code], `no copy for ${code}`);
      assert.notEqual(friendlyMessage(code, "raw server text"), "raw server text", code);
    }
  });

  test("the named messages read exactly as the brief asks", () => {
    assert.equal(friendlyMessage("NETWORK"), "Can't reach GlowVai. Check your internet and try again.");
    assert.equal(friendlyMessage("RATE_LIMITED"), "Too many requests, try again in a minute.");
    assert.equal(friendlyMessage("NOT_A_VENDOR_ACCOUNT").startsWith("This account is not a GlowVai store account"), true);
    assert.equal(friendlyMessage("OUT_OF_STOCK"), "You do not have enough stock for every item in this order.");
    assert.equal(friendlyMessage("ORDER_ALREADY_ASSIGNED"), "Another store accepted this order first.");
    assert.equal(NETWORK_MESSAGE, "Can't reach GlowVai. Check your internet and try again.");
    assert.equal(RATE_LIMIT_MESSAGE, "Too many requests, try again in a minute.");
  });

  test("an unknown code shows the server's sentence, trimmed, or the generic one when there is none", () => {
    assert.equal(friendlyMessage("SOMETHING_NEW", "  Please try later.  "), "Please try later.");
    assert.equal(friendlyMessage("SOMETHING_NEW"), GENERIC_MESSAGE);
    assert.equal(friendlyMessage("SOMETHING_NEW", "x".repeat(400)).length, 300);
  });

  test("errors carry their status, code and field; messageForError never shows a raw value", () => {
    const e = new VendorApiError(400, "INVALID_INPUT", "Enter a valid GSTIN.", { field: "gstNumber" });
    assert.equal(e.status, 400);
    assert.equal(e.code, "INVALID_INPUT");
    assert.equal(messageForError(e), "Enter a valid GSTIN.");
    assert.equal(fieldForError(e), "gstNumber");
    assert.equal(messageForError(new Error("boom: stack trace")), GENERIC_MESSAGE);
    assert.equal(fieldForError(new Error("x")), null);
    const net = new VendorApiError(0, "NETWORK", NETWORK_MESSAGE);
    assert.equal(messageForError(net), NETWORK_MESSAGE);
  });
});

describe("Firebase sign-in error mapping (lib/vendor-web/firebaseErrors.ts)", () => {
  test("wrong password, not found and too many attempts read plainly", () => {
    assert.match(authErrorMessage("auth/wrong-password"), /password is not right/);
    assert.match(authErrorMessage("auth/invalid-credential"), /do not match/);
    assert.match(authErrorMessage("auth/user-not-found"), /No store account uses this email/);
    assert.equal(authErrorMessage("auth/too-many-requests"), "Too many attempts. Wait a few minutes and try again.");
  });

  test("operation-not-allowed says store sign-in is not switched on yet", () => {
    assert.equal(authErrorMessage("auth/operation-not-allowed"), "Store sign-in is not switched on yet.");
    assert.equal(AUTH_NOT_ENABLED_MESSAGE, "Store sign-in is not switched on yet.");
  });

  test("network failures use the shared network line; unknown codes never show the raw code", () => {
    assert.equal(authErrorMessage("auth/network-request-failed"), NETWORK_MESSAGE);
    assert.equal(authErrorMessage("auth/some-new-code"), AUTH_FALLBACK_MESSAGE);
    assert.equal(authErrorMessage(undefined), AUTH_FALLBACK_MESSAGE);
    assert.equal(authErrorMessage(""), AUTH_FALLBACK_MESSAGE);
    assert.ok(!authErrorMessage("auth/some-new-code").includes("auth/"));
  });

  test("authCodeOf reads the code from a thrown Firebase-style error only", () => {
    assert.equal(authCodeOf({ code: "auth/wrong-password" }), "auth/wrong-password");
    assert.equal(authCodeOf(new Error("nope")), "");
    assert.equal(authCodeOf(null), "");
    assert.equal(authCodeOf("auth/x"), "");
  });

  test("a wrong current password during a change is named as such", () => {
    assert.equal(changePasswordMessage("auth/invalid-credential"), "Your current password is not right.");
    assert.equal(changePasswordMessage("auth/requires-recent-login"), "For safety, enter your current password again.");
    assert.equal(changePasswordMessage("auth/network-request-failed"), NETWORK_MESSAGE);
  });

  test("the password reset answer is the same whether or not the account exists", () => {
    assert.equal(RESET_CONFIRMATION, "If an account exists, we've sent a reset link.");
  });
});

describe("routing decision table for /vendor (lib/vendor-web/routing.ts)", () => {
  const base: RoutingInput = { auth: "signed-in", state: "APPROVED_ACTIVE", emailVerified: true, errorCode: null };

  test("while auth is loading, wait", () => {
    assert.deepEqual(decideVendorRoute({ auth: "loading" }), { kind: "wait" });
  });

  test("not signed in goes to sign-in", () => {
    assert.deepEqual(decideVendorRoute({ auth: "signed-out" }), { kind: "redirect", href: "/vendor/sign-in" });
  });

  test("signed in but email not verified goes to verify-email, whatever the store state", () => {
    for (const state of ["NO_APPLICATION", "SUBMITTED", "APPROVED_ACTIVE", "SUSPENDED"] as VendorStateName[]) {
      assert.deepEqual(decideVendorRoute({ ...base, state, emailVerified: false }), { kind: "redirect", href: "/vendor/verify-email" }, state);
    }
  });

  test("with the account loaded but no store state yet, wait", () => {
    assert.deepEqual(decideVendorRoute({ ...base, state: null }), { kind: "wait" });
    assert.deepEqual(decideVendorRoute({ ...base, emailVerified: null }), { kind: "wait" });
  });

  const table: [VendorStateName, string][] = [
    ["NO_APPLICATION", "/vendor/onboarding"],
    ["SUBMITTED", "/vendor/status"],
    ["UNDER_REVIEW", "/vendor/status"],
    ["DOCUMENTS_REQUESTED", "/vendor/status"],
    ["REJECTED", "/vendor/status"],
    ["SUSPENDED", "/vendor/status"],
    ["APPROVED_ACTIVE", "/vendor/home"],
    ["APPROVED_PAUSED", "/vendor/home"],
  ];
  for (const [state, href] of table) {
    test(`store state ${state} goes to ${href}`, () => {
      assert.deepEqual(decideVendorRoute({ ...base, state }), { kind: "redirect", href });
      assert.equal(routeForState(state), href);
    });
  }

  test("a network failure shows a friendly notice with the network line, never a blank page", () => {
    assert.deepEqual(decideVendorRoute({ ...base, state: null, emailVerified: null, errorCode: "NETWORK" }), { kind: "notice", message: NETWORK_MESSAGE });
  });

  test("rate limiting shows the minute-long line", () => {
    assert.deepEqual(decideVendorRoute({ ...base, state: null, emailVerified: null, errorCode: "RATE_LIMITED" }), { kind: "notice", message: RATE_LIMIT_MESSAGE });
  });

  test("an expired session goes back to sign-in", () => {
    assert.deepEqual(decideVendorRoute({ ...base, state: null, emailVerified: null, errorCode: "UNAUTHENTICATED" }), { kind: "redirect", href: "/vendor/sign-in" });
  });

  test("the route constants are the ones the brief names", () => {
    assert.deepEqual(VENDOR_HOME_ROUTES, {
      signIn: "/vendor/sign-in",
      verifyEmail: "/vendor/verify-email",
      onboarding: "/vendor/onboarding",
      status: "/vendor/status",
      home: "/vendor/home",
    });
  });
});

describe("store state copy and edit rules (lib/vendor-web/copy.ts)", () => {
  test("edit and resubmit is offered only where the server allows it (not under review, not approved, not suspended)", () => {
    assert.equal(canEditApplication("NO_APPLICATION"), true);
    assert.equal(canEditApplication("SUBMITTED"), true);
    assert.equal(canEditApplication("DOCUMENTS_REQUESTED"), true);
    assert.equal(canEditApplication("REJECTED"), true);
    assert.equal(canEditApplication("UNDER_REVIEW"), false);
    assert.equal(canEditApplication("APPROVED_ACTIVE"), false);
    assert.equal(canEditApplication("APPROVED_PAUSED"), false);
    assert.equal(canEditApplication("SUSPENDED"), false);
    assert.equal(canEditApplication(null), false);
  });

  test("every store state has a label, a tone and a summary", () => {
    for (const state of Object.keys(STATE_COPY) as VendorStateName[]) {
      assert.ok(STATE_COPY[state].label && STATE_COPY[state].summary, state);
    }
    assert.equal(STATE_COPY.UNDER_REVIEW.label, "Under review");
  });

  test("support categories fall back to a plain label for an unknown code", () => {
    assert.equal(supportCategoryLabel("ORDER_DELAY"), "Order delay");
    assert.equal(supportCategoryLabel("SOMETHING"), "Other");
  });

  test("dates show in India time, and missing dates show nothing", () => {
    assert.equal(formatIst(null), "");
    assert.equal(formatIst("not a date"), "");
    assert.match(formatIst(Date.UTC(2026, 10, 12, 6, 30)), /2026/);
  });
});

describe("browser storage helpers never throw (lib/vendor-web/drafts.ts)", () => {
  test("without a browser (no window), drafts are simply not kept", () => {
    assert.equal(DRAFT_PREFIX, "glowvai.vendor.onboarding.v1.");
    assert.equal(loadDraft("uid-1"), null);
    assert.doesNotThrow(() => saveDraft("uid-1", { storeName: "Glow" }));
    assert.doesNotThrow(() => clearDraft("uid-1"));
    assert.doesNotThrow(() => clearAllDrafts());
  });
});

describe("new password and email checks", () => {
  test("a new password is at least 8 characters, and not more than 128", () => {
    assert.equal(v.checkNewPassword("short").ok, false);
    assert.equal(v.checkNewPassword("longenough").ok, true);
    assert.equal(v.checkNewPassword("x".repeat(129)).ok, false);
  });

  test("email must look like an address; it is lower-cased", () => {
    assert.equal(v.checkEmail("no-at-sign").ok, false);
    assert.equal(v.checkEmail("a@b").ok, false);
    assert.equal(valueOf(v.checkEmail(" Store@Example.IN ")), "store@example.in");
  });
});
