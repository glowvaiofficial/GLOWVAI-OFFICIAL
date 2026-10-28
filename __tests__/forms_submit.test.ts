import { test } from "node:test";
import assert from "node:assert/strict";
import { submitPublicForm, normalizePhone } from "../lib/forms/submit";

function mockFetch(impl: () => Promise<Response>) {
  (globalThis as { fetch: unknown }).fetch = impl;
}

test("submitPublicForm returns true when the backend acknowledges", async () => {
  mockFetch(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  assert.equal(await submitPublicForm("Contact", { name: "A", email: "a@b.co" }), true);
});

test("submitPublicForm returns false when the backend rejects", async () => {
  mockFetch(async () => new Response(JSON.stringify({ ok: false, error: "bad_tab" }), { status: 200 }));
  assert.equal(await submitPublicForm("Contact", {}), false);
});

test("submitPublicForm returns false on network failure instead of throwing", async () => {
  mockFetch(async () => {
    throw new TypeError("Failed to fetch");
  });
  assert.equal(await submitPublicForm("Waitlist", { email: "a@b.co" }), false);
});

test("submitPublicForm returns false when the response is not JSON", async () => {
  mockFetch(async () => new Response("<html>nope</html>", { status: 405 }));
  assert.equal(await submitPublicForm("Newsletter", {}), false);
});

test("normalizePhone keeps digits and a leading plus", () => {
  assert.equal(normalizePhone("+91 89778 55998"), "+918977855998");
  assert.equal(normalizePhone("(98490) 12-345"), "9849012345");
});
