import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  GATE_OFF_MESSAGE,
  choosePreferred,
  paymentMethodsEnabled,
  preferredAfterRemoval,
  resolvePreferred,
  savedTokenFromPayment,
  viewOfToken,
  type RazorpayToken,
} from "../../lib/shop/paymentMethods/rules";
import {
  RazorpayCallError,
  createRazorpayCustomer,
  listRazorpayTokens,
  deleteRazorpayToken,
  fetchRazorpayPayment,
} from "../../lib/shop/paymentMethods/razorpayCustomers";

const KEYS = { RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "secret_value" };
const CARD: RazorpayToken = {
  id: "token_AbC123xyz",
  method: "card",
  card: { network: "Visa", last4: "4242", issuer: "HDFC" },
};
const UPI: RazorpayToken = { id: "token_Upi987654", method: "upi", vpa: { username: "priya", handle: "okhdfcbank" } };

type Call = { url: string; init: RequestInit };
function fakeFetch(status: number, body: unknown): { calls: Call[]; fn: (url: string, init: RequestInit) => Promise<Response> } {
  const calls: Call[] = [];
  return {
    calls,
    fn: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    },
  };
}

describe("payment methods gate", () => {
  test("only the exact value true turns saving on", () => {
    assert.equal(paymentMethodsEnabled({ PAYMENT_METHODS_SAVE_ENABLED: "true" }), true);
    for (const v of ["TRUE", "True", "1", "yes", "", " true"]) {
      assert.equal(paymentMethodsEnabled({ PAYMENT_METHODS_SAVE_ENABLED: v }), false, `"${v}" must not enable`);
    }
    assert.equal(paymentMethodsEnabled({}), false);
  });

  test("the message with the gate off is the one the screen shows", () => {
    assert.equal(GATE_OFF_MESSAGE, "Saved payment methods are not available yet.");
  });
});

describe("what the customer sees of a saved method", () => {
  test("a card shows brand and last four as Razorpay returns them", () => {
    assert.deepEqual(viewOfToken(CARD, null), { id: "token_AbC123xyz", kind: "card", label: "Visa ending 4242", preferred: false });
  });

  test("a card object with card numbers in it still shows only brand and last four", () => {
    const leaky = { ...CARD, card: { network: "Visa", last4: "4242", number: "4111111111111111", cvv: "123" } } as unknown as RazorpayToken;
    const view = viewOfToken(leaky, null);
    assert.ok(view);
    assert.deepEqual(Object.keys(view ?? {}).sort(), ["id", "kind", "label", "preferred"]);
    assert.ok(!JSON.stringify(view).includes("4111"));
    assert.ok(!JSON.stringify(view).includes("cvv"));
  });

  test("a UPI handle shows the VPA", () => {
    assert.equal(viewOfToken(UPI, null)?.label, "priya@okhdfcbank");
    assert.equal(viewOfToken(UPI, null)?.kind, "upi");
  });

  test("malformed entries are left out", () => {
    assert.equal(viewOfToken({ id: "bad-id", card: { network: "Visa", last4: "4242" } }, null), null);
    assert.equal(viewOfToken({ id: "token_Abcdef", card: { network: "Visa", last4: "42<script>" } }, null), null);
    assert.equal(viewOfToken({ id: "token_Abcdef" }, null), null);
  });

  test("the preferred flag follows the stored token id", () => {
    assert.equal(viewOfToken(CARD, "token_AbC123xyz")?.preferred, true);
  });
});

describe("preferred payment method rule", () => {
  test("a preferred token counts only while Razorpay still lists it", () => {
    assert.equal(resolvePreferred("token_AbC123xyz", ["token_AbC123xyz", "token_Upi987654"]), "token_AbC123xyz");
    assert.equal(resolvePreferred("token_AbC123xyz", ["token_Upi987654"]), null);
    assert.equal(resolvePreferred(null, ["token_AbC123xyz"]), null);
  });

  test("removing the preferred method clears the preference", () => {
    assert.equal(preferredAfterRemoval("token_AbC123xyz", "token_AbC123xyz"), null);
  });

  test("removing another method keeps the preference", () => {
    assert.equal(preferredAfterRemoval("token_AbC123xyz", "token_Upi987654"), "token_AbC123xyz");
  });

  test("setting a preferred method needs one of the customer's live tokens, or null to clear", () => {
    const live = ["token_AbC123xyz"];
    assert.deepEqual(choosePreferred("token_AbC123xyz", live), { ok: true, tokenId: "token_AbC123xyz" });
    assert.deepEqual(choosePreferred(null, live), { ok: true, tokenId: null });
    assert.equal(choosePreferred("token_Other999", live).ok, false, "a token of another account is refused");
    assert.equal(choosePreferred("token_", live).ok, false, "a malformed id is refused");
    assert.equal(choosePreferred(42, live).ok, false);
  });
});

describe("saving a card from a Razorpay payment", () => {
  const expected = { customerId: "cust_Abc12345", orderId: "order_Abc12345" };
  const good = { id: "pay_Abc12345", order_id: expected.orderId, customer_id: expected.customerId, token_id: "token_AbC123xyz", status: "captured" };

  test("accepts a captured payment that belongs to this customer and setup order", () => {
    assert.deepEqual(savedTokenFromPayment(good, expected), { ok: true, tokenId: "token_AbC123xyz" });
  });

  test("refuses a payment of another customer", () => {
    assert.equal(savedTokenFromPayment({ ...good, customer_id: "cust_Other999" }, expected).ok, false);
  });

  test("refuses a payment for another order", () => {
    assert.equal(savedTokenFromPayment({ ...good, order_id: "order_Other999" }, expected).ok, false);
  });

  test("refuses a payment that did not succeed or did not save a token", () => {
    assert.equal(savedTokenFromPayment({ ...good, status: "failed" }, expected).ok, false);
    assert.equal(savedTokenFromPayment({ ...good, token_id: undefined }, expected).ok, false);
  });
});

describe("Razorpay customer and token calls", () => {
  test("the customer is created with the contact details only, never card fields", async () => {
    const f = fakeFetch(200, { id: "cust_NewOne123" });
    const id = await createRazorpayCustomer(KEYS, { name: "Priya", contact: "+919876543210", email: "p@example.com" }, f.fn);
    assert.equal(id, "cust_NewOne123");
    assert.equal(f.calls[0].url, "https://api.razorpay.com/v1/customers");
    const body = JSON.parse(String(f.calls[0].init.body));
    assert.deepEqual(Object.keys(body).sort(), ["contact", "email", "fail_existing", "name"]);
    assert.ok(!/card|cvv|number/i.test(String(f.calls[0].init.body)));
  });

  test("requests use the account keys as Basic auth", async () => {
    const f = fakeFetch(200, { items: [CARD, UPI] });
    await listRazorpayTokens(KEYS, "cust_Abc12345", f.fn);
    const auth = (f.calls[0].init.headers as Record<string, string>).Authorization;
    assert.equal(auth, "Basic " + Buffer.from("rzp_test_key:secret_value").toString("base64"));
    assert.equal(f.calls[0].url, "https://api.razorpay.com/v1/customers/cust_Abc12345/tokens");
  });

  test("the token list is read as given", async () => {
    const tokens = await listRazorpayTokens(KEYS, "cust_Abc12345", fakeFetch(200, { items: [CARD, UPI] }).fn);
    assert.equal(tokens.length, 2);
  });

  test("delete calls the token endpoint of that customer", async () => {
    const f = fakeFetch(200, { deleted: true });
    await deleteRazorpayToken(KEYS, "cust_Abc12345", "token_AbC123xyz", f.fn);
    assert.equal(f.calls[0].init.method, "DELETE");
    assert.equal(f.calls[0].url, "https://api.razorpay.com/v1/customers/cust_Abc12345/tokens/token_AbC123xyz");
  });

  test("a payment read goes to the payments endpoint", async () => {
    const f = fakeFetch(200, { id: "pay_Abc12345", status: "captured" });
    await fetchRazorpayPayment(KEYS, "pay_Abc12345", f.fn);
    assert.equal(f.calls[0].url, "https://api.razorpay.com/v1/payments/pay_Abc12345");
  });

  test("a missing key stops before any call is made", async () => {
    const f = fakeFetch(200, {});
    await assert.rejects(() => listRazorpayTokens({}, "cust_Abc12345", f.fn), (err: unknown) => err instanceof RazorpayCallError && err.status === 503);
    assert.equal(f.calls.length, 0);
  });

  test("a Razorpay error is reported with its status and no secret", async () => {
    const f = fakeFetch(400, { error: { description: "The id provided does not exist" } });
    await assert.rejects(() => deleteRazorpayToken(KEYS, "cust_Abc12345", "token_Nope123", f.fn), (err: unknown) => {
      return err instanceof RazorpayCallError && err.status === 400 && !String(err.message).includes("secret_value");
    });
  });
});
