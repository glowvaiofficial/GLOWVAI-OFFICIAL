import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatAddressForDisplay } from "../../glowvai-app/features/commerce/lib/displayText";

describe("formatAddressForDisplay", () => {
  test("title-cases a lowercase state name without spaces", () => {
    assert.equal(formatAddressForDisplay("andhrapradesh, NALLA, Payakapuram, Vijayawada"), "Andhra Pradesh, NALLA, Payakapuram, Vijayawada");
  });
  test("handles upper case and multi-word states", () => {
    assert.equal(formatAddressForDisplay("12 MG Road, TAMILNADU 600001"), "12 MG Road, Tamil Nadu 600001");
  });
  test("leaves text without a state alone", () => {
    assert.equal(formatAddressForDisplay("Flat 4B, Vijayawada, 520015"), "Flat 4B, Vijayawada, 520015");
  });
  test("does not change words that only contain a state name", () => {
    assert.equal(formatAddressForDisplay("Goalpara colony"), "Goalpara colony");
  });
});
