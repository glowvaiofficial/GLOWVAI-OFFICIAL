// Fixed, reviewed copy for every customer notification. Pure: no server imports, so the tests can load it.
//
// Rules for this table:
// - Copy is written here and nowhere else. Staff and other teams send an event type, never text.
// - No placeholders: titles and bodies are constants, so no name, phone, address, amount or internal code can enter.
// - The related id (an order or review id) travels as a separate field, never inside the text.

export const NOTIFICATION_TYPES = [
  "order_placed",
  "store_accepted",
  "order_packed",
  "out_for_delivery",
  "order_delivered",
  "order_cancelled",
  "payment_failed",
  "refund_processed",
  "return_update",
  "review_approved",
  "question_answered",
  "referral_reward",
  "coins_credited",
  "subscription_processed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// The preference a push is checked against. "offers" needs explicit marketing consent as well (see policy.ts).
export type NotificationCategory = "orders" | "reviews" | "offers";

// What the related id points at, so the app knows where a tap goes.
export type RelatedType = "order" | "review" | "question" | "account" | "subscription";

export interface NotificationTemplate {
  category: NotificationCategory;
  relatedType: RelatedType;
  title: string;
  body: string;
}

export const TEMPLATES: Readonly<Record<NotificationType, NotificationTemplate>> = {
  order_placed: { category: "orders", relatedType: "order", title: "Order placed", body: "Thanks for your order. We will let you know as it moves along." },
  store_accepted: { category: "orders", relatedType: "order", title: "Order accepted", body: "Your order has been accepted and is being prepared." },
  order_packed: { category: "orders", relatedType: "order", title: "Order packed", body: "Your order is packed and will be dispatched soon." },
  out_for_delivery: { category: "orders", relatedType: "order", title: "Out for delivery", body: "Your order is on its way." },
  order_delivered: { category: "orders", relatedType: "order", title: "Order delivered", body: "Your order has been delivered. Enjoy your products." },
  order_cancelled: { category: "orders", relatedType: "order", title: "Order cancelled", body: "Your order has been cancelled. Open it to see the details." },
  payment_failed: { category: "orders", relatedType: "order", title: "Payment failed", body: "We could not complete the payment for your order. You can try again from the order." },
  refund_processed: { category: "orders", relatedType: "order", title: "Refund processed", body: "Your refund has been processed. It can take a few days to reach your account." },
  return_update: { category: "orders", relatedType: "order", title: "Return update", body: "There is an update on your return request." },
  review_approved: { category: "reviews", relatedType: "review", title: "Review published", body: "Thanks for your review. It is now live on the product page." },
  question_answered: { category: "reviews", relatedType: "question", title: "Question answered", body: "Your question about a product has been answered." },
  referral_reward: { category: "offers", relatedType: "account", title: "Referral reward", body: "You have earned a referral reward. Check your rewards in your account." },
  coins_credited: { category: "offers", relatedType: "account", title: "Coins added", body: "Coins have been added to your account." },
  subscription_processed: { category: "orders", relatedType: "subscription", title: "Subscription update", body: "Your subscription has been processed." },
};

export interface RenderedNotification {
  type: NotificationType;
  category: NotificationCategory;
  relatedType: RelatedType;
  title: string;
  body: string;
}

export const isNotificationType = (value: unknown): value is NotificationType =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(TEMPLATES, value);

// Returns the fixed copy for an event type, or null for a type not in the table.
export function renderNotification(type: unknown): RenderedNotification | null {
  if (!isNotificationType(type)) return null;
  const t = TEMPLATES[type];
  return { type, category: t.category, relatedType: t.relatedType, title: t.title, body: t.body };
}

// Related ids are the document ids we create or receive (order ids, review ids). Anything else is refused.
export const RELATED_ID_PATTERN = /^[A-Za-z0-9_-]{1,140}$/;
export const isRelatedId = (value: unknown): value is string => typeof value === "string" && RELATED_ID_PATTERN.test(value);
