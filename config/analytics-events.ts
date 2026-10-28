/**
 * GA4 Analytics Event Catalog and Typed Parameter Schemas.
 * Strict compliance with Indian DPDP Act and GLOW VAI Privacy Guidelines:
 * NO PII allowed: email, phone, name, ip, address, photo data, free text, or raw skin concern.
 */

export const BANNED_ANALYTICS_KEYS = [
  "email",
  "phone",
  "name",
  "ip",
  "address",
  "concern",
  "message",
  "text",
  "query_raw",
  "session_id",
  "token",
  "image",
  "photo",
  "skin_concern",
] as const;

export interface GA4Item {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

export interface EventParamsMap {
  page_view: { page_path: string; page_title?: string; page_location?: string };
  cta_click: { cta_id: string; location: string };
  faq_open: { question_id: string };
  search: { search_term: string };
  pincode_check: { result: "serviceable" | "not_serviceable" | "invalid" };
  whatsapp_click: { location: string };

  scan_started: { scan_type: "camera" | "upload" | "quiz" };
  camera_permission: { result: "granted" | "denied" };
  scan_failed: { reason: "low_light" | "no_face" | "multiple_faces" | "unsupported" };
  scan_completed: {
    scan_type: "camera" | "upload" | "quiz";
    score_band: number; // 1 to 5
    persona: string;
  };
  result_viewed: { persona: string; glow_level: number };
  save_form_view: Record<string, never> | { source?: string };
  image_consent_choice: { granted: boolean };
  generate_lead: {
    lead_source: "scan" | "contact" | "newsletter" | "waitlist";
    currency?: "INR";
    value?: number;
  };
  share: { method: string; content_type: "glow_card" };
  quest_added: { category: string };
  full_stack_complete: Record<string, never>;

  view_item_list: { item_list_id?: string; item_list_name?: string; items: GA4Item[] };
  select_item: { item_list_id?: string; items: GA4Item[] };
  view_item: { currency?: "INR"; value?: number; items: GA4Item[] };
  add_to_cart: { currency?: "INR"; value?: number; items: GA4Item[] };
  remove_from_cart: { currency?: "INR"; value?: number; items: GA4Item[] };
  view_cart: { currency?: "INR"; value?: number; items: GA4Item[] };
  begin_checkout: { currency: "INR"; value: number; items: GA4Item[]; method: "whatsapp" };

  purchase: {
    transaction_id: string;
    value: number;
    currency: "INR";
    items: GA4Item[];
    session_id?: string;
  };
  refund: {
    transaction_id: string;
    value: number;
    currency: "INR";
    items: GA4Item[];
  };

  web_vital: { name: string; value: number; rating: "good" | "needs-improvement" | "poor" };
  app_error: { area: string; code: string };
  newsletter_confirmed: Record<string, never>;
}

export type GA4EventName = keyof EventParamsMap;

export const ALLOWED_EVENT_NAMES = new Set<GA4EventName>([
  "page_view",
  "cta_click",
  "faq_open",
  "search",
  "pincode_check",
  "whatsapp_click",
  "scan_started",
  "camera_permission",
  "scan_failed",
  "scan_completed",
  "result_viewed",
  "save_form_view",
  "image_consent_choice",
  "generate_lead",
  "share",
  "quest_added",
  "full_stack_complete",
  "view_item_list",
  "select_item",
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "purchase",
  "refund",
  "web_vital",
  "app_error",
  "newsletter_confirmed",
]);
