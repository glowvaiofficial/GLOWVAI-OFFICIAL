// Shapes the vendor operations screens read from the vendor API (docs/VENDOR_API.md, lib/vendor/*). Kept local so the
// pure modules in this folder have no imports from the foundation files.

export type SubstitutionPreference = "ALLOW_SUBSTITUTE" | "NO_SUBSTITUTE" | "CALL_ME";

export interface OpsOrderItem {
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
  title: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface OpsTimelineStep {
  stage: "ACCEPTED" | "PACKED" | "HANDED_TO_RIDER";
  at: number | null;
}

export interface OpsOrder {
  orderId: string;
  reference: string;
  status: string;
  vendorStatus: string;
  isOffer: boolean;
  items: OpsOrderItem[];
  itemCount: number;
  itemsValue: number;
  placedAt: number;
  updatedAt: number;
  acceptedAt?: number;
  packedAt?: number;
  customerFirstName?: string;
  cancelled: boolean;
  cancellationReason?: string;
  substitutionPreference: SubstitutionPreference | null;
  timeline: OpsTimelineStep[];
}

/** GET /api/vendor/orders response (ok flag stripped by the client). */
export interface OrdersPage {
  serverTime: number;
  offers: OpsOrder[];
  orders: OpsOrder[];
  removed?: string[];
  full?: boolean;
}

export interface InventoryLine {
  productId: string;
  variantId: string | null;
  stock: number;
  isAvailable: boolean;
  unitPriceOverride?: number;
  updatedAt: number;
  lastRestockedAt: number;
}

export interface VariantView {
  id: string;
  label: string;
  price: number;
  mrp: number;
  stock: number | null;
  isAvailable: boolean;
  sku?: string;
}

export type ProductRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO";

export interface ProductRequestView {
  id: string;
  name: string;
  brand: string;
  category: string;
  mrp: number;
  barcode: string | null;
  pictureUrls: string[];
  reason: string;
  status: ProductRequestStatus;
  staffNote: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AnalyticsDayRow {
  date: string;
  orders: number;
  accepted: number;
  declined: number;
}

export interface AnalyticsResult {
  days: 7 | 30;
  ordersPerDay: AnalyticsDayRow[];
  totals: { orders: number; accepted: number; declined: number };
  averageAcceptSeconds: number | null;
  fulfilmentRate: number | null;
  fulfilled: number;
  settled: number;
  itemsSold: { productId: string; title: string; quantity: number }[];
  orderValue: { amount: number; orderCount: number };
  bounds: { perQueryLimit: number; truncated: boolean };
}
