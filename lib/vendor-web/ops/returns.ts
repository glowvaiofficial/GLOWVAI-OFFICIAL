// Copy and helpers for the read-only returns queue. Pure.
export const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved by GlowVai",
  REJECTED: "Not approved",
  PICKUP_SCHEDULED: "Pickup scheduled",
  RECEIVED: "Received",
  REFUNDED: "Refunded by GlowVai",
  REPLACEMENT_SHIPPED: "Replacement sent",
  CLOSED: "Closed",
};

export const RETURN_REASON_LABELS: Record<string, string> = {
  DAMAGED: "Arrived damaged",
  WRONG_ITEM: "Wrong item",
  EXPIRED_OR_DEFECTIVE: "Expired or defective",
  NOT_AS_DESCRIBED: "Not as described",
  NO_LONGER_NEEDED: "No longer needed",
};

export const RETURNS_EMPTY = { title: "No return requests", body: "Return requests on your orders show here. GlowVai staff decide them; you do not need to act." };
export const RETURNS_NOTE = "Read only. GlowVai staff review each request and handle any refund.";

export const returnStatusLabel = (s: string) => RETURN_STATUS_LABELS[s] ?? "Requested";
export const returnReasonLabel = (r: string) => RETURN_REASON_LABELS[r] ?? "Other";
export const returnTypeLabel = (t: string) => (t === "REPLACEMENT" ? "Replacement" : "Return");
