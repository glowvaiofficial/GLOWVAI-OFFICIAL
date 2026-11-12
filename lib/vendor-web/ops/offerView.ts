// What an offer (and the detail screen) may show. An allow-list: the customer's phone, address, landmark, email and
// payment details are never copied, and the first name appears only once this store has accepted the order. Pure.
import type { OpsOrder, OpsOrderItem } from "./types";

export interface OfferItemView {
  title: string;
  brand: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface OfferView {
  orderId: string;
  itemCount: number;
  itemsValue: number;
  placedAt: number;
  items: OfferItemView[];
  /** Present only after this store accepted the order. */
  customerFirstName?: string;
}

const itemView = (it: OpsOrderItem): OfferItemView => ({
  title: it.title,
  brand: it.brand,
  variantLabel: it.variantLabel,
  quantity: it.quantity,
  unitPrice: it.unitPrice,
  imageUrl: it.imageUrl,
});

export function offerView(order: OpsOrder): OfferView {
  const view: OfferView = {
    orderId: order.orderId,
    itemCount: order.itemCount,
    itemsValue: order.itemsValue,
    placedAt: order.placedAt,
    items: order.items.map(itemView),
  };
  const accepted = !order.isOffer && typeof order.acceptedAt === "number";
  if (accepted && order.customerFirstName) view.customerFirstName = order.customerFirstName;
  return view;
}
