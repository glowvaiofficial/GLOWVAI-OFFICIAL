import { z } from "zod";
import { env } from "@/lib/env";
import { isSuppressed } from "@/lib/email/suppression";
import { checkRecipientRateLimit, recordEmailSent } from "@/lib/email/rate-limit";
import { renderEmail } from "@/lib/email/render";
import { sendViaResendApi } from "@/lib/email/client";
import { logEmailEvent } from "@/lib/email/log";
import { createUnsubscribeToken } from "@/lib/email/tokens";
import { SendEmailOptions, SendEmailResult } from "@/lib/email/types";
import { SITE_URL } from "@/lib/site-url";

const emailRecipientSchema = z
  .string()
  .email()
  .max(254)
  .refine((val) => !/[\r\n]/.test(val), { message: "No control characters allowed" });

export async function sendEmail<T extends Record<string, unknown>>(
  options: SendEmailOptions<T>
): Promise<SendEmailResult> {
  try {
    const { template, to, data, relatedId, stream = "transactional", replyTo } = options;

    // 1. Zod validation of recipient address
    const parsedEmail = emailRecipientSchema.safeParse(to);
    if (!parsedEmail.success) {
      return { ok: false, error: "Invalid recipient email address" };
    }
    const cleanTo = parsedEmail.data.trim().toLowerCase();

    // 2. Suppression check
    const suppressed = await isSuppressed(cleanTo, stream);
    if (suppressed) {
      return { ok: true, skipped: true, reason: "Address suppressed" };
    }

    // 3. Per-recipient rate limit check
    const rateCheck = checkRecipientRateLimit(cleanTo);
    if (!rateCheck.allowed) {
      return { ok: false, error: rateCheck.reason || "Rate limit exceeded" };
    }

    // 4. Determine From address and Headers based on stream
    const fromAddress = stream === "marketing" ? env.EMAIL_FROM_MARKETING : env.EMAIL_FROM_TRANSACTIONAL;
    const defaultReplyTo = replyTo || env.EMAIL_REPLY_TO;

    const headers: Record<string, string> = {};
    if (stream === "marketing") {
      const unsubToken = createUnsubscribeToken(cleanTo);
      const unsubHttps = `${SITE_URL}/unsubscribe?token=${unsubToken}`;
      const unsubMailto = `mailto:unsubscribe@glowvai.in?subject=unsubscribe`;

      headers["List-Unsubscribe"] = `<${unsubHttps}>, <${unsubMailto}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    // 5. Render HTML and Plain Text versions
    const rendered = renderEmail(template, data, stream);

    // 6. Idempotency Key
    const idempotencyKey = `${template}:${relatedId}`;

    // 7. Execute via Resend Client
    const res = await sendViaResendApi({
      from: fromAddress,
      to: cleanTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: defaultReplyTo,
      idempotencyKey,
      relatedId,
      headers,
    });

    if (res.ok) {
      recordEmailSent(cleanTo);
      await logEmailEvent({
        messageId: res.id || `msg_${Date.now()}`,
        template,
        relatedId,
        status: "sent",
        eventType: "email.sent",
        recipientEmail: cleanTo,
      });
      return { ok: true, id: res.id };
    } else {
      await logEmailEvent({
        messageId: `failed_${Date.now()}`,
        template,
        relatedId,
        status: "failed",
        eventType: "email.failed",
        recipientEmail: cleanTo,
        errorCode: res.error || `HTTP_${res.statusCode || 500}`,
      });
      return { ok: false, error: res.error || "Failed to send email" };
    }
  } catch (err) {
    // Non-blocking catch: NEVER throw into caller
    const msg = err instanceof Error ? err.message : "Unexpected email send error";
    console.error("Non-blocking sendEmail error:", msg);
    return { ok: false, error: msg };
  }
}

export function queueEmail<T extends Record<string, unknown>>(options: SendEmailOptions<T>): void {
  // Fire and forget in background
  Promise.resolve().then(() => sendEmail(options)).catch((err) => {
    console.error("Queued email execution error:", err);
  });
}
