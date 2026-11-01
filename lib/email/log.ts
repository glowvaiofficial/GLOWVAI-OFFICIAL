import crypto from "node:crypto";
import { storage } from "@/lib/storage";

/**
 * GLOW VAI Email Event Logger.
 * Writes email status to Google Sheets EmailEvents tab.
 * Privacy rule: NEVER logs email address in plain text. SHA-256 hash only.
 */

export interface LogEmailEventParams {
  messageId: string;
  template: string;
  relatedId: string;
  status: "queued" | "sent" | "failed" | "delivered" | "bounced" | "complained";
  eventType: string;
  recipientEmail?: string;
  recipientHash?: string;
  errorCode?: string;
}

export async function logEmailEvent(params: LogEmailEventParams): Promise<void> {
  let toHash = params.recipientHash || "";
  if (!toHash && params.recipientEmail) {
    toHash = crypto.createHash("sha256").update(params.recipientEmail.trim().toLowerCase()).digest("hex");
  }

  try {
    await storage.callSheet({
      tab: "EmailEvents",
      action: "create",
      data: {
        created_at: new Date().toISOString(),
        message_id: params.messageId || `msg_${Date.now()}`,
        template: params.template,
        related_id: params.relatedId,
        status: params.status,
        event_type: params.eventType,
        to_hash: toHash,
        error_code: params.errorCode || "",
      },
    });
  } catch (err) {
    console.error("Non-blocking email log error:", err);
  }
}
