import { NextRequest } from "next/server";
import { customerFrom, json, limitByIp, limitByIpShared, limitByUser, limitByUserShared } from "@/lib/shop/server";
import { PRODUCT_ID_PATTERN, reviewFailure } from "@/lib/shop/reviews";
import { createQuestion, listApprovedQuestions } from "@/lib/shop/qna";
import { validateQuestionText } from "@/lib/shop/qnaRules";

export const dynamic = "force-dynamic";

// Public questions of a product: APPROVED only, with any approved staff answer. 20 per page, newest first.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = limitByIp(req, "product-questions", 60);
  if (ipLimited) return ipLimited;
  const { id } = await params;
  if (!PRODUCT_ID_PATTERN.test(id)) return json({ ok: false, error: "That product could not be found." }, 404);
  const page = await listApprovedQuestions(id, req.nextUrl.searchParams.get("cursor"));
  if (page === "invalid-cursor") return json({ ok: false, error: "Those questions could not be opened. Start again from the first page." }, 400);
  return json({ ok: true, productId: id, questions: page.questions, nextCursor: page.nextCursor });
}

// Asking a question. Anyone signed in (anonymous is fine) may ask, 3 an hour. The question is PENDING until a moderator
// approves it. The product id is checked against the catalogue; the asker's name is read from their profile.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipLimited = await limitByIpShared(req, "product-questions-post", 20, 60_000);
  if (ipLimited) return ipLimited;
  const customer = await customerFrom(req);
  if (!customer) return json({ ok: false, error: "Sign in again to continue." }, 401);
  const userLimited = limitByUser(customer.uid, "product-questions", 60);
  if (userLimited) return userLimited;
  const askLimited = await limitByUserShared(customer.uid, "question", 3, 60 * 60 * 1000, "You have asked several questions recently. Try again in an hour.");
  if (askLimited) return askLimited;

  const { id } = await params;
  if (!PRODUCT_ID_PATTERN.test(id)) return json({ ok: false, error: "That product could not be found." }, 404);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Invalid request." }, 400);
  const checked = validateQuestionText(body.text);
  if (!checked.ok) return json({ ok: false, error: checked.error }, 400);

  try {
    const created = await createQuestion(customer.uid, id, checked.value, Date.now());
    return json({ ok: true, questionId: created.id, status: created.status });
  } catch (err) {
    const refused = reviewFailure(err);
    if (refused) return refused;
    throw err;
  }
}
