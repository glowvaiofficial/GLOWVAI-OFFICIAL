import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/security/adminAuth";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { generateGlowVaiEmailHTML } from "@/lib/resend";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
const TEMPLATES = ["scan_report", "order_confirmation", "waitlist_alert", "support_reply"] as const;
type Template = (typeof TEMPLATES)[number];

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Sends one admin email through the email proxy. The proxy URL and secret are read on the server only, so they are
 * never sent to the browser. Only a valid admin session may call this.
 */
export async function POST(req: NextRequest) {
  const sessionSecret = process.env.SESSION_SECRET;
  const jar = await cookies();
  const authed = Boolean(sessionSecret) && verifySession(jar.get(ADMIN_COOKIE)?.value, sessionSecret as string);
  if (!authed) return json({ ok: false, error: "Sign in to the admin first." }, 401);

  const limit = rateLimit(`admin-email:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return json({ ok: false, error: "Too many emails. Try again later." }, 429);

  const proxyUrl = process.env.EMAIL_PROXY_URL || "";
  const proxySecret = process.env.EMAIL_PROXY_SECRET || "";
  if (!proxyUrl || !proxySecret) return json({ ok: false, error: "Email proxy is not configured on the server." }, 503);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "Request too large." }, 413);

  let body: { to?: unknown; subject?: unknown; templateType?: unknown; data?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  const templateType = body.templateType as Template;
  const data = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (!subject) return json({ ok: false, error: "Add a subject." }, 400);
  if (!TEMPLATES.includes(templateType)) return json({ ok: false, error: "Unknown template." }, 400);

  const html = generateGlowVaiEmailHTML(templateType, data as Parameters<typeof generateGlowVaiEmailHTML>[1]);

  try {
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: proxySecret, to, subject, html }),
    });
    const result = await res.json().catch(() => ({ ok: false, error: "Bad proxy response" }));
    if (!result.ok) return json({ ok: false, error: result.error || "Email proxy call failed" }, 502);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "Could not reach the email proxy." }, 502);
  }
}
