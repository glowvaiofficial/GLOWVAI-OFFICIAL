import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { indianE164, indianNationalNumber, otpCode, OTP_LENGTH } from "../../lib/shop/account/rules";
import {
  maskedPhone,
  needsNewCode,
  NOT_SWITCHED_ON,
  sendErrorMessage,
  verifyErrorMessage,
} from "../../glowvai-app/features/auth/phoneAuthRules";

const root = join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(join(root, file), "utf8").replace(/\r\n/g, "\n");

describe("phone number: India, 10 digits starting 6 to 9, +91", () => {
  test("accepts a 10-digit mobile and the usual ways it is typed", () => {
    const expected = "+919876543210";
    for (const typed of ["9876543210", "98765 43210", "98765-43210", " 9876543210 ", "+919876543210", "+91 98765 43210", "919876543210", "09876543210"]) {
      assert.equal(indianE164(typed), expected, `typed: ${typed}`);
    }
  });

  test("starts with 6, 7, 8 or 9 only", () => {
    for (const first of ["6", "7", "8", "9"]) assert.equal(indianE164(`${first}123456789`), `+91${first}123456789`);
    for (const first of ["0", "1", "2", "3", "4", "5"]) assert.equal(indianE164(`${first}123456789`), null, `starts with ${first}`);
  });

  test("refuses other lengths and other countries", () => {
    for (const typed of ["987654321", "98765432100", "12345678901", "+9198765432", "+447911123456", "+1 5551234567", ""]) {
      assert.equal(indianE164(typed), null, `typed: ${typed}`);
    }
    assert.equal(indianE164(null), null);
    assert.equal(indianE164(9876543210), null);
    assert.equal(indianE164(undefined), null);
  });

  test("the national number is the 10 digits without the country code", () => {
    assert.equal(indianNationalNumber("+91 98765 43210"), "9876543210");
    assert.equal(indianNationalNumber("+91 12345 67890"), null);
  });
});

describe("the 6-digit code", () => {
  test("accepts exactly six digits, spaces allowed", () => {
    assert.equal(OTP_LENGTH, 6);
    assert.equal(otpCode("123456"), "123456");
    assert.equal(otpCode("123 456"), "123456");
    assert.equal(otpCode(" 000000 "), "000000");
  });

  test("refuses short, long, or non-digit codes", () => {
    for (const code of ["", "12345", "1234567", "12a456", "12-456", "١٢٣٤٥٦"]) {
      assert.equal(otpCode(code), null, `code: ${code}`);
    }
    assert.equal(otpCode(123456), null);
    assert.equal(otpCode(undefined), null);
  });
});

describe("friendly messages for the phone sign-in errors", () => {
  test("invalid number", () => {
    assert.match(sendErrorMessage("auth/invalid-phone-number"), /doesn't look right/);
    assert.match(sendErrorMessage("auth/missing-phone-number"), /doesn't look right/);
  });

  test("phone sign-in not switched on", () => {
    assert.equal(sendErrorMessage("auth/operation-not-allowed"), NOT_SWITCHED_ON);
    assert.equal(verifyErrorMessage("auth/operation-not-allowed"), NOT_SWITCHED_ON);
    assert.match(NOT_SWITCHED_ON, /Phone sign-in is not switched on yet/);
  });

  test("too many attempts and SMS quota", () => {
    assert.match(sendErrorMessage("auth/too-many-requests"), /Too many attempts/);
    assert.match(verifyErrorMessage("auth/too-many-requests"), /Too many attempts/);
    assert.match(sendErrorMessage("auth/quota-exceeded"), /cannot send codes/);
  });

  test("wrong code and expired code", () => {
    assert.match(verifyErrorMessage("auth/invalid-verification-code"), /wrong/);
    assert.match(verifyErrorMessage("auth/code-expired"), /expired/);
    assert.equal(needsNewCode("auth/code-expired"), true);
    assert.equal(needsNewCode("auth/session-expired"), true);
    assert.equal(needsNewCode("auth/invalid-verification-code"), false);
  });

  test("unknown codes get a plain message, never the raw code", () => {
    assert.equal(sendErrorMessage(undefined), "We could not send the code. Try again.");
    assert.equal(verifyErrorMessage("auth/something-new"), "We could not check the code. Try again.");
    assert.doesNotMatch(sendErrorMessage("auth/something-new"), /auth\//);
  });
});

describe("what the screen shows of the number", () => {
  test("only the last four digits are shown", () => {
    const shown = maskedPhone("+919876543210");
    assert.equal(shown, "+91 ••••• 3210");
    assert.doesNotMatch(shown, /98765/);
  });
});

describe("no PII in logs", () => {
  // Files that touch the phone number, the code or the ID token. None of them may log anything: a log line is a place
  // a number or a token could leak from.
  const files = [
    "lib/shop/account/rules.ts",
    "app/api/shop/account/create/route.ts",
    "app/api/shop/profile/route.ts",
    "glowvai-app/features/auth/accountGate.ts",
    "glowvai-app/features/auth/accountService.ts",
    "glowvai-app/features/auth/phoneAuthRules.ts",
    "glowvai-app/features/auth/phoneSignIn.ts",
    "glowvai-app/features/auth/resumeAction.ts",
    "glowvai-app/features/auth/PhoneSignInScreen.tsx",
    "glowvai-app/features/auth/OtpScreen.tsx",
  ];

  for (const file of files) {
    test(`${file} writes no console output`, () => {
      assert.doesNotMatch(read(file), /console\.(log|info|warn|error|debug|trace)/);
    });
  }

  test("the sign-in code never puts the number in the URL or storage", () => {
    const source = read("glowvai-app/features/auth/phoneSignIn.ts");
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
    const screen = read("glowvai-app/features/auth/PhoneSignInScreen.tsx");
    assert.doesNotMatch(screen, /localStorage|sessionStorage/);
  });
});
