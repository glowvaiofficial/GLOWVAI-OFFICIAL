/**
 * Glowvai Core Data Models and Types
 * Formulated from the Glowvai PRD v1.0 specifications
 */

export type ShoppingPreference = 'all' | 'men' | 'women';

export interface Address {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  street: string;
  landmark?: string;
  area: string; // e.g., Benz Circle, MG Road, Governorpet, Patamata, Auto Nagar
  city: string; // Vijayawada
  pincode: string;
  serviceable: boolean;
  deliveryMinutes: number; // e.g., 12, 15, 25
  isDefault: boolean;
  deliveryInstructions?: string;
}

export interface ProductVariant {
  id: string;
  size: string; // e.g., "50ml", "100g"
  mrp: number;
  price: number;
  discountPercent: number;
  inStock: boolean;
  stockCount: number;
}

export type StockAvailability =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock_nearby'
  | 'available_from_another_location'
  | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'skincare' | 'cosmetics' | 'accessories';
  subcategory: string;
  genderTarget: ShoppingPreference;
  description: string;
  ingredients: string[];
  usageInstructions: string;
  keyBenefits: string[];
  skinTypes: ('Oily' | 'Dry' | 'Combination' | 'Normal' | 'Sensitive')[];
  variants: ProductVariant[];
  currentVariantId: string;
  images: string[];
  availability: StockAvailability;
  availableStock: number;
  deliveryMinutes: number; // calculated for current address
  // Multi-source fulfilment metadata (Internal or client-facing indication)
  isSourcedNearby: boolean;
  sourceNote?: string;
  // Beauty Insurance
  insuranceEligible: boolean;
  insuranceFee?: number; // ₹20–₹50 per PRD
  insuranceTerms?: string;
  rating?: number; // only if verified reviews exist
  reviewCount?: number;
}

export interface CartItem {
  id: string; // unique item id in cart
  product: Product;
  variantId: string;
  quantity: number;
  withInsurance: boolean;
  insuranceFee: number;
}

export type PaymentMethodType = 'upi' | 'card' | 'cod' | 'netbanking';

export interface PaymentVerification {
  provider: 'razorpay';
  paymentId: string;
  providerOrderId: string;
}

export interface CustomerDetails {
  fullName: string;
  phoneNumber: string;
  email: string;
  deliveryNote?: string;
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  variantSize: string;
  quantity: number;
  unitPrice: number;
  insuranceSelected: boolean;
  insuranceFee: number;
  imageUrl: string;
}

export interface DeliveryTask {
  taskId: string;
  sourceType: 'dark_store' | 'partner_retailer' | 'distributor';
  sourceName?: string; // Internal only, hidden from client or generalized
  status: 'assigned' | 'collected' | 'in_transit' | 'delivered';
  etaMinutes: number;
  riderName?: string;
  riderPhoneMasked?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  address: Address;
  itemSubtotal: number;
  discount: number;
  deliveryFee: number;
  insuranceTotal: number;
  finalPayable: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  paymentProvider?: 'razorpay';
  paymentReference?: string;
  status:
    | 'order_placed'
    | 'confirmed'
    | 'preparing'
    | 'rider_assigned'
    | 'on_the_way'
    | 'delivered'
    | 'cancelled';
  estimatedDeliveryMinutes: number;
  isSplitDelivery: boolean;
  splitDeliveryNote?: string;
  fulfilmentTasks: DeliveryTask[];
}

export interface SkinConcernObservation {
  name: string; // 'Acne & Blemishes' | 'Dark Spots / Pigmentation' | 'Redness & Sensitivity' | 'Hydration & Texture'
  severity: 'low' | 'moderate' | 'high';
  score: number; // 0-100
  notes: string;
}

export interface SkinReport {
  id: string;
  timestamp: string;
  skinScore: number; // 0-100 validated overall skin health score
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Normal' | 'Sensitive';
  skinTone: 'Fair' | 'Medium' | 'Deep' | 'Olive' | 'Rich';
  observations: SkinConcernObservation[];
  recommendedIngredients: string[];
  ingredientsToAvoid: string[];
  recommendedProductIds: string[];
  retainedImage: boolean;
  isSample?: boolean; // true while the analysis engine is not connected and the values are placeholders
}

export interface StreakDayRecord {
  day: number;
  date: string;
  completed: boolean;
  missed: boolean;
  evidenceType?: 'photo' | 'video';
  evidenceUrl?: string;
  timestamp?: string;
  feedback?: string;
}

export interface BeautyInsuranceStreak {
  trackingId: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  policyVersion: string;
  startDate: string;
  endDate: string;
  totalDaysRequired: number; // e.g. 14 or 21 days
  completedDays: number;
  missedDays: number;
  status: 'active' | 'claim_ready' | 'claim_submitted' | 'approved' | 'declined' | 'adverse_reaction_reported';
  days: StreakDayRecord[];
  claimFeedback?: string; // customer's note when the claim was submitted
  claimOutcome?: {
    approved: boolean;
    benefitType: 'full_refund' | 'partial_refund' | 'coupon' | 'store_credit';
    amount: number;
    decisionDate: string;
    reason: string;
  };
}

export interface SupportTicket {
  id: string;
  createdAt: string;
  orderId?: string;
  category:
    | 'Order issue'
    | 'Delivery issue'
    | 'Payment issue'
    | 'Refund issue'
    | 'Damaged product'
    | 'Beauty Insurance claim'
    | 'Skin-related adverse reaction'
    | 'Other';
  subject: string;
  status: 'Open' | 'In progress' | 'Waiting for customer' | 'Resolved' | 'Closed';
  messages: {
    sender: 'user' | 'agent';
    text: string;
    timestamp: string;
  }[];
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  shoppingPreference: ShoppingPreference;
  onboardingCompleted: boolean;
  facialAnalysisCompleted: boolean;
  consentGiven: boolean;
  consentTimestamp?: string;
}
