// Product questions and answers on the server. The rules are in ./qnaRules (pure, tested); this file reads and writes
// Firestore with the Admin SDK.
//
// Collection: product_questions/{id}. Questions start PENDING and show publicly only once a moderator approves them.
// Answers are written by staff only, through answerQuestion below. There is no HTTP route that writes an answer, so an
// answer can only come from code the admin team runs with a staff actor. The brand store role is reserved and refused.
//
// Admin team functions: approveQuestion(qid, actor), rejectQuestion(qid, actor, reason), answerQuestion(qid, text, actor),
// setQuestionStatus(qid, status, actor, reason?).
import { randomBytes } from "node:crypto";
import { db } from "./server";
import { ReviewError, type ModerationActor } from "./reviews";
import { firstNameFor } from "./reviewRules";
import {
  QUESTION_PAGE_SIZE,
  canMoveQuestion,
  publicQuestion,
  validateAnswerText,
  type PublicQuestion,
  type QuestionStatus,
} from "./qnaRules";
import { decodeCursor, encodeCursor } from "./reviewRules";

export const QUESTIONS = "product_questions";

export interface StaffActor extends ModerationActor {
  // Only "STAFF" may answer for now. "BRAND_STORE" is reserved for the verified store account and is refused.
  role: "STAFF" | "BRAND_STORE";
}

// Approved questions for a product, newest first, with any approved answer. Twenty per page, with a cursor.
export async function listApprovedQuestions(
  productId: string,
  cursorRaw: unknown,
): Promise<{ questions: PublicQuestion[]; nextCursor: string | null } | "invalid-cursor"> {
  const cursor = decodeCursor(cursorRaw);
  if (cursor === "invalid") return "invalid-cursor";
  let q = db().collection(QUESTIONS).where("productId", "==", productId).where("status", "==", "APPROVED").orderBy("createdAtMs", "desc");
  if (cursor) q = q.startAfter(cursor.createdAtMs);
  const snap = await q.limit(QUESTION_PAGE_SIZE).get();
  const questions = snap.docs.map((d) => publicQuestion(d.id, d.data())).filter((x): x is PublicQuestion => x !== null);
  let nextCursor: string | null = null;
  if (snap.docs.length === QUESTION_PAGE_SIZE) {
    const createdAtMs = Number(snap.docs[snap.docs.length - 1].data().createdAtMs);
    nextCursor = encodeCursor({ value: createdAtMs, createdAtMs });
  }
  return { questions, nextCursor };
}

// Stores a customer's question as PENDING. The product must exist; the asker is shown only by first name.
export async function createQuestion(uid: string, productId: string, text: string, nowMs: number): Promise<{ id: string; status: QuestionStatus }> {
  const store = db();
  const product = await store.collection("products").doc(productId).get();
  if (!product.exists) throw new ReviewError(404, "That product could not be found.", "NOT_FOUND");
  const user = await store.collection("users").doc(uid).get();
  const askedBy = firstNameFor(user.data()?.name) || "Shopper";
  const id = `q_${nowMs.toString(36)}_${randomBytes(4).toString("hex")}`;
  await store.collection(QUESTIONS).doc(id).create({
    productId,
    text,
    askedBy,
    createdBy: uid,
    status: "PENDING",
    answer: null,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    moderatedBy: null,
    moderatedAt: null,
    rejectionReason: null,
  });
  return { id, status: "PENDING" };
}

// Moves a question to a new moderation status (approve, reject, take down, restore). A rejection needs a reason.
export async function setQuestionStatus(
  qid: string,
  next: QuestionStatus,
  actor: ModerationActor,
  reason?: string,
): Promise<{ changed: boolean; status: QuestionStatus }> {
  const rejectionReason = (reason ?? "").trim().slice(0, 300);
  if (next === "REJECTED" && rejectionReason.length < 3) throw new ReviewError(400, "Give a reason for rejecting the question.", "REASON_REQUIRED");
  const ref = db().collection(QUESTIONS).doc(qid);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ReviewError(404, "That question could not be found.", "NOT_FOUND");
    const from = String(snap.data()?.status);
    if (!canMoveQuestion(from, next)) return { changed: false, status: from as QuestionStatus };
    const now = Date.now();
    tx.update(ref, {
      status: next,
      moderatedBy: actor.uid,
      moderatedAt: now,
      rejectionReason: next === "REJECTED" ? rejectionReason : null,
      updatedAtMs: now,
    });
    return { changed: true, status: next };
  });
}

export function approveQuestion(qid: string, actor: ModerationActor) {
  return setQuestionStatus(qid, "APPROVED", actor);
}

export function rejectQuestion(qid: string, actor: ModerationActor, reason: string) {
  return setQuestionStatus(qid, "REJECTED", actor, reason);
}

// Writes the staff answer. Shown publicly while the question is APPROVED. Refused for a rejected question and for any
// actor that is not STAFF.
export async function answerQuestion(qid: string, text: string, actor: StaffActor): Promise<{ answeredAt: number }> {
  if (actor.role !== "STAFF") throw new ReviewError(403, "Only the GlowVai team can answer questions.", "FORBIDDEN");
  const checked = validateAnswerText(text);
  if (!checked.ok) throw new ReviewError(400, checked.error, "INVALID_ANSWER");
  const ref = db().collection(QUESTIONS).doc(qid);
  const now = Date.now();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ReviewError(404, "That question could not be found.", "NOT_FOUND");
    if (snap.data()?.status === "REJECTED") throw new ReviewError(409, "This question was rejected, so it cannot be answered.", "REJECTED");
    tx.update(ref, {
      answer: { text: checked.value, answeredBy: actor.uid, answeredAtMs: now },
      updatedAtMs: now,
    });
  });
  return { answeredAt: now };
}
