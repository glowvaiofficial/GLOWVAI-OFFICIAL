import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { burnVerification, hashSecret, riderPhoneHash, verifySecret, weakPin } from "../../lib/rider/pin";

describe("PIN and code hashing", () => {
  test("a stored hash verifies its own secret and rejects any other", async () => {
    const stored = await hashSecret("482913");
    assert.equal(await verifySecret("482913", stored), true);
    assert.equal(await verifySecret("482914", stored), false);
    assert.equal(await verifySecret("48291", stored), false);
    assert.equal(await verifySecret("", stored), false);
  });

  test("the salt is random: the same PIN gives different hashes that both verify", async () => {
    const a = await hashSecret("135790");
    const b = await hashSecret("135790");
    assert.notEqual(a, b);
    assert.notEqual(a.split("$")[4], b.split("$")[4]);
    assert.equal(await verifySecret("135790", a), true);
    assert.equal(await verifySecret("135790", b), true);
  });

  test("the stored value does not contain the secret and uses scrypt with N=16384", async () => {
    const stored = await hashSecret("246801");
    assert.ok(!stored.includes("246801"));
    assert.ok(stored.startsWith("scrypt1$16384$8$1$"));
  });

  test("malformed or missing stored values never verify", async () => {
    assert.equal(await verifySecret("123456", undefined), false);
    assert.equal(await verifySecret("123456", null), false);
    assert.equal(await verifySecret("123456", 12345), false);
    assert.equal(await verifySecret("123456", "not-a-hash"), false);
    assert.equal(await verifySecret("123456", "scrypt1$16384$8$1$AAAA$AAAA"), false);
    assert.equal(await verifySecret("123456", "md5$1$2$3$4$5"), false);
    assert.equal(await verifySecret("123456", "scrypt1$1$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="), false);
  });

  test("a miss on an unknown partner runs a full check and is false", async () => {
    assert.equal(await burnVerification("123456"), false);
  });

  test("trivially guessable PINs are refused", () => {
    assert.equal(weakPin("000000"), true);
    assert.equal(weakPin("777777"), true);
    assert.equal(weakPin("123456"), true);
    assert.equal(weakPin("987654"), true);
    assert.equal(weakPin("482913"), false);
    assert.equal(weakPin("135790"), false);
  });

  test("the phone lookup key is stable, 64 hex characters, and only for valid mobiles", () => {
    const h = riderPhoneHash("9876543210");
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(riderPhoneHash("9876543210"), h);
    assert.notEqual(riderPhoneHash("9876543211"), h);
    assert.equal(riderPhoneHash("1234567890"), "");
    assert.equal(riderPhoneHash("98765"), "");
  });
});
