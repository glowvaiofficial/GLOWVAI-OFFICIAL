import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkTransition, nextStatuses, isActiveStatus, AFFILIATE_STATUSES, type AffiliateStatus } from "../../lib/shop/affiliate/state";
import { validateUrl, safeHttpUrl } from "../../lib/shop/affiliate/url";

describe("affiliate application state machine", () => {
  test("the five statuses are the ones the programme uses", () => {
    assert.deepEqual([...AFFILIATE_STATUSES], ["APPLIED", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]);
  });

  test("allowed moves", () => {
    assert.equal(checkTransition("APPLIED", "UNDER_REVIEW", null).ok, true);
    assert.equal(checkTransition("APPLIED", "APPROVED", null).ok, true);
    assert.equal(checkTransition("UNDER_REVIEW", "APPROVED", null).ok, true);
    assert.equal(checkTransition("APPROVED", "SUSPENDED", "Repeated misleading claims").ok, true);
    assert.equal(checkTransition("SUSPENDED", "APPROVED", null).ok, true);
    assert.equal(checkTransition("SUSPENDED", "REJECTED", "Ended by GlowVai").ok, true);
  });

  test("refused moves, including anything out of REJECTED and back to review", () => {
    const refused: Array<[AffiliateStatus, AffiliateStatus]> = [
      ["APPLIED", "SUSPENDED"],
      ["UNDER_REVIEW", "APPLIED"],
      ["APPROVED", "APPROVED"],
      ["APPROVED", "REJECTED"],
      ["REJECTED", "APPROVED"],
      ["REJECTED", "UNDER_REVIEW"],
      ["SUSPENDED", "UNDER_REVIEW"],
    ];
    for (const [from, to] of refused) {
      const r = checkTransition(from, to, "a reason");
      assert.equal(r.ok, false, `${from} -> ${to} must be refused`);
      if (!r.ok) assert.equal(r.code, "INVALID_TRANSITION");
    }
  });

  test("REJECTED and SUSPENDED need a reason of at least three characters", () => {
    for (const to of ["REJECTED", "SUSPENDED"] as const) {
      for (const reason of [null, "", "  ", "no"]) {
        const from: AffiliateStatus = to === "SUSPENDED" ? "APPROVED" : "UNDER_REVIEW";
        const r = checkTransition(from, to, reason);
        assert.equal(r.ok, false);
        if (!r.ok) assert.equal(r.code, "REASON_REQUIRED");
      }
      assert.equal(checkTransition(to === "SUSPENDED" ? "APPROVED" : "UNDER_REVIEW", to, "clear reason").ok, true);
    }
  });

  test("APPROVED needs no reason; REJECTED has no onward moves", () => {
    assert.equal(checkTransition("UNDER_REVIEW", "APPROVED", null).ok, true);
    assert.deepEqual([...nextStatuses("REJECTED")], []);
  });

  test("open statuses for the one-active-application rule", () => {
    for (const s of ["APPLIED", "UNDER_REVIEW", "APPROVED", "SUSPENDED"] as const) assert.equal(isActiveStatus(s), true);
    assert.equal(isActiveStatus("REJECTED"), false);
  });
});

describe("channel URL validation", () => {
  test("http and https addresses are accepted and normalised", () => {
    const ok = validateUrl("  https://www.instagram.com/priya.glow  ");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.url, "https://www.instagram.com/priya.glow");
    assert.equal(validateUrl("http://example.com/blog").ok, true);
  });

  test("an empty value is allowed and means no link", () => {
    assert.deepEqual(validateUrl(""), { ok: true, url: null });
    assert.deepEqual(validateUrl(undefined), { ok: true, url: null });
    assert.deepEqual(validateUrl("   "), { ok: true, url: null });
  });

  test("javascript: and data: are refused, in any letter case", () => {
    for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox", "file:///etc/passwd", "ftp://example.com/x"]) {
      assert.equal(validateUrl(bad).ok, false, bad);
    }
  });

  test("link shorteners are refused, including their subdomains", () => {
    for (const bad of ["https://bit.ly/abc", "https://tinyurl.com/x", "https://t.co/abc", "https://sub.bit.ly/x", "https://goo.gl/x"]) {
      assert.equal(validateUrl(bad).ok, false, bad);
    }
  });

  test("credentials, localhost, spaces and over-long values are refused", () => {
    assert.equal(validateUrl("https://user:pass@example.com").ok, false);
    assert.equal(validateUrl("https://localhost/page").ok, false);
    assert.equal(validateUrl("https://example.com/a b").ok, false);
    assert.equal(validateUrl(`https://example.com/${"a".repeat(300)}`).ok, false);
    assert.equal(validateUrl(42).ok, false);
  });

  test("httpsOnly refuses plain http (used for the seller entry)", () => {
    assert.equal(validateUrl("http://example.com", { httpsOnly: true }).ok, false);
    assert.equal(validateUrl("https://example.com", { httpsOnly: true }).ok, true);
  });

  test("display helper returns null for anything that is not a safe link", () => {
    assert.equal(safeHttpUrl("javascript:alert(1)"), null);
    assert.equal(safeHttpUrl("https://bit.ly/x"), null);
    assert.equal(safeHttpUrl("https://example.com/p"), "https://example.com/p");
  });
});
