import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ANSWER_MAX,
  QUESTION_MAX,
  canMoveQuestion,
  publicQuestion,
  validateAnswerText,
  validateQuestionText,
} from "../../lib/shop/qnaRules";

const NOW = Date.parse("2026-11-06T10:00:00.000Z");
// Ordinary text of exactly n characters, with no repeated letters or words in a row.
const longText = (n: number): string => "does this cream suit oily skin in a humid climate ".repeat(20).slice(0, n).replace(/ $/, "e");
const question = (over: Record<string, unknown> = {}) => ({
  productId: "prod-min-spf50",
  text: "Is this safe for oily skin in summer?",
  askedBy: "Ravi",
  createdBy: "uid-customer-1",
  status: "APPROVED",
  answer: null,
  createdAtMs: NOW,
  updatedAtMs: NOW,
  moderatedBy: "staff-1",
  moderatedAt: NOW,
  rejectionReason: null,
  ...over,
});

describe("question validation", () => {
  test("a question is 10 to 300 characters", () => {
    assert.equal(validateQuestionText("too short").ok, false);
    assert.equal(validateQuestionText("Is it vegan?").ok, true);
    assert.equal(validateQuestionText(longText(QUESTION_MAX)).ok, true);
    assert.equal(validateQuestionText(longText(QUESTION_MAX + 1)).ok, false);
  });

  test("whitespace is collapsed and the text is trimmed before the length check", () => {
    const r = validateQuestionText("   Is   it   vegan?   ");
    assert.deepEqual(r, { ok: true, value: "Is it vegan?" });
    assert.equal(validateQuestionText("        short    ").ok, false);
  });

  test("links, email addresses and repeated text are refused", () => {
    assert.equal(validateQuestionText("Is it sold at www.cheap-deals.in ?").ok, false);
    assert.equal(validateQuestionText("Can you mail me at ravi@mail.com please?").ok, false);
    assert.equal(validateQuestionText("buy buy buy buy buy now").ok, false);
    assert.equal(validateQuestionText("aaaaaaaaaaaaaaaaaa").ok, false);
  });

  test("non-string input is refused", () => {
    assert.equal(validateQuestionText(undefined).ok, false);
    assert.equal(validateQuestionText(12345678901).ok, false);
  });
});

describe("answer validation", () => {
  test("an answer needs text and may not carry a link or an email", () => {
    assert.equal(validateAnswerText("").ok, false);
    assert.equal(validateAnswerText("Yes, it is.").ok, true);
    assert.equal(validateAnswerText("See https://example.com").ok, false);
    assert.equal(validateAnswerText("Write to team@glowvai.in").ok, false);
    assert.equal(validateAnswerText("a".repeat(ANSWER_MAX + 1)).ok, false);
  });
});

describe("moderation moves", () => {
  test("pending or rejected questions can be approved", () => {
    assert.equal(canMoveQuestion("PENDING", "APPROVED"), true);
    assert.equal(canMoveQuestion("REJECTED", "APPROVED"), true);
  });

  test("pending or approved questions can be rejected", () => {
    assert.equal(canMoveQuestion("PENDING", "REJECTED"), true);
    assert.equal(canMoveQuestion("APPROVED", "REJECTED"), true);
  });

  test("no move to the same status, and nothing moves back to pending", () => {
    assert.equal(canMoveQuestion("APPROVED", "APPROVED"), false);
    assert.equal(canMoveQuestion("APPROVED", "PENDING"), false);
    assert.equal(canMoveQuestion("PENDING", "PENDING"), false);
  });
});

describe("public projection of questions", () => {
  test("only approved questions are public", () => {
    assert.equal(publicQuestion("q1", question({ status: "PENDING" })), null);
    assert.equal(publicQuestion("q1", question({ status: "REJECTED" })), null);
    assert.ok(publicQuestion("q1", question()));
  });

  test("the public view has the question, the first name and any answer, and no internal fields", () => {
    const q = publicQuestion(
      "q1",
      question({ answer: { text: "Yes, it is non-comedogenic.", answeredBy: "staff-9", answeredAtMs: NOW + 60_000 } }),
    );
    assert.ok(q);
    assert.deepEqual(Object.keys(q).sort(), ["answer", "askedBy", "createdAt", "id", "text"]);
    assert.equal(q.askedBy, "Ravi");
    assert.deepEqual(Object.keys(q.answer ?? {}).sort(), ["answeredAt", "by", "text"]);
    assert.equal(q.answer?.by, "GlowVai team");
    assert.equal(q.answer?.text, "Yes, it is non-comedogenic.");
    const text = JSON.stringify(q);
    for (const secret of ["uid-customer-1", "staff-9", "staff-1", "createdBy", "answeredBy", "moderatedBy"]) {
      assert.equal(text.includes(secret), false, secret);
    }
  });

  test("a question without an answer shows no answer", () => {
    assert.equal(publicQuestion("q1", question())?.answer, null);
    assert.equal(publicQuestion("q1", question({ answer: { text: "", answeredBy: "s", answeredAtMs: NOW } }))?.answer, null);
  });
});
