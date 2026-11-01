/**
 * GLOW VAI Email Service Layer Types.
 */

export type EmailTemplateName =
  | "contact_ack"
  | "contact_notify"
  | "lead_report"
  | "lead_alert"
  | "order_intent_notify"
  | "waitlist_confirm"
  | "data_request_ack"
  | "data_request_notify"
  | "review_request"
  | "weekly_digest"
  | "newsletter_confirm"
  | "newsletter_welcome";

export type EmailStream = "transactional" | "marketing";

export interface SendEmailOptions<T = Record<string, unknown>> {
  template: EmailTemplateName;
  to: string;
  data: T;
  relatedId: string; // Ref ID e.g. "CT-241011-001" or "GV-241011-99"
  stream?: EmailStream; // Default: transactional
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}
