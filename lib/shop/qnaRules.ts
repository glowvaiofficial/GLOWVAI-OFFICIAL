// Product questions and answers: the rules, as pure functions. The routes (app/api/shop/products/[id]/questions) and
// lib/shop/qna.ts use these; the tests run them directly. No server imports here.
import { contentProblem, CONTENT_PROBLEM_MESSAGE } from "./contentFilter";
import type { Checked } from "./reviewRules";

export const QUESTION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_MIN = 10;
export const QUESTION_MAX = 300;
export const ANSWER_MAX = 1000;
export const QUESTION_PAGE_SIZE = 20;

export function validateQuestionText(value: unknown): Checked<string> {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (text.length < QUESTION_MIN) return { ok: false, error: `Write at least ${QUESTION_MIN} characters so the team can answer.` };
  if (text.length > QUESTION_MAX) return { ok: false, error: `Keep the question to ${QUESTION_MAX} characters or fewer.` };
  const problem = contentProblem(text);
  if (problem) return { ok: false, error: CONTENT_PROBLEM_MESSAGE[problem] };
  return { ok: true, value: text };
}

// Answers are staff-written. Only the staff path (lib/shop/qna.ts answerQuestion) may write one; the brand store role is
// reserved for later and is refused for now.
export function validateAnswerText(value: unknown): Checked<string> {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 2) return { ok: false, error: "Write the answer." };
  if (text.length > ANSWER_MAX) return { ok: false, error: `Keep the answer to ${ANSWER_MAX} characters or fewer.` };
  if (/https?:\/\/|www\./i.test(text) || /[^\s@]+@[^\s@]+/.test(text)) return { ok: false, error: CONTENT_PROBLEM_MESSAGE.LINK };
  return { ok: true, value: text };
}

// Moderation moves: a question can be approved or rejected from PENDING; an APPROVED question can be taken down, and a
// REJECTED one can be restored. Anything else is refused.
export function canMoveQuestion(from: string, to: QuestionStatus): boolean {
  if (from === to) return false;
  if (to === "APPROVED") return from === "PENDING" || from === "REJECTED";
  if (to === "REJECTED") return from === "PENDING" || from === "APPROVED";
  return false;
}

type Doc = Record<string, unknown>;

export interface PublicAnswer {
  text: string;
  answeredAt: string;
  // Always the same label. The staff member's name or id is never shown.
  by: "GlowVai team";
}

export interface PublicQuestion {
  id: string;
  text: string;
  askedBy: string;
  createdAt: string;
  answer: PublicAnswer | null;
}

// Only approved questions are public. The answer is shown with the question, and only while the question is approved.
export function publicQuestion(id: string, d: Doc): PublicQuestion | null {
  if (d.status !== "APPROVED") return null;
  const text = typeof d.text === "string" ? d.text : "";
  if (!text) return null;
  const a = d.answer as Doc | null | undefined;
  const answer =
    a && typeof a.text === "string" && a.text
      ? { text: a.text, answeredAt: isoOf(a.answeredAtMs), by: "GlowVai team" as const }
      : null;
  return {
    id,
    text,
    askedBy: typeof d.askedBy === "string" ? d.askedBy : "",
    createdAt: isoOf(d.createdAtMs),
    answer,
  };
}

function isoOf(ms: unknown): string {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : "";
}
