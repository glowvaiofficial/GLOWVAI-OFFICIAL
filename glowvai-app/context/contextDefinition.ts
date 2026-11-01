import type { PortedScreenName } from '../core/routes/names';
import { createContext } from 'react';
import {
  Address,
  CartItem,
  CustomerDetails,
  Order,
  PaymentMethodType,
  PaymentVerification,
  Product,
  ShoppingPreference,
  SkinReport,
  BeautyInsuranceStreak,
  SupportTicket,
  UserProfile,
} from '../types';

export type ScreenName =
  | 'welcome'
  | 'onboarding'
  | 'login'
  | 'otp'
  | 'face-prep'
  | 'face-capture'
  | 'face-loading'
  | 'skin-report'
  | 'home'
  | 'categories'
  | 'search'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'customer-details'
  | 'payment-status'
  | 'order-confirmation'
  | 'order-cancelled'
  | 'order-tracking'
  | 'streak-tracking'
  | 'order-history'
  | 'profile'
  | 'support'
  | 'student-referral'
  | PortedScreenName;

export interface AppContextType {
  currentScreen: ScreenName;
  screenHistory: ScreenName[];
  navigate: (screen: ScreenName, params?: any) => void;
  goBack: () => void;
  /** Return to an earlier screen in the history, or open it when it is not in the history. */
  goBackTo: (screen: ScreenName) => void;
  activeParams: any;

  // User state
  user: UserProfile | null;
  customerDetails: CustomerDetails | null;
  saveCustomerDetails: (details: CustomerDetails) => void;
  loginUser: (phone: string) => Promise<void>;
  verifyUserOtp: (otp: string) => Promise<void>;
  logout: () => void;
  deleteAccount: () => void;

  // Address
  currentAddress: Address;
  savedAddresses: Address[];
  selectAddress: (address: Address) => void;
  addAddress: (address: Address) => void;

  // Shopping mode
  shoppingPreference: ShoppingPreference;
  setShoppingPreference: (pref: ShoppingPreference) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variantId?: string, withInsurance?: boolean) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  toggleItemInsurance: (cartItemId: string) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartItemCount: number;
  cartAuthoritative: {
    itemSubtotal: number;
    discountTotal: number;
    insuranceTotal: number;
    deliveryFee: number;
    finalPayable: number;
    isSplitDelivery: boolean;
    sourcingNotice?: string;
  };

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  // Orders
  orders: Order[];
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  /** Adds or replaces an order in the local order history and makes it the active order. */
  recordOrder: (order: Order) => void;
  placeOrder: (paymentMethod: PaymentMethodType, checkoutDiscount?: number, verification?: PaymentVerification) => Promise<Order>;
  cancelOrder: (orderId: string, reason: string) => Order | null;

  // Facial diagnostics & Skin reports
  capturedFaceImage: string | null;
  setCapturedFaceImage: (img: string | null) => void;
  skinReports: SkinReport[];
  activeReport: SkinReport | null;
  runAnalysis: (image: string, retain: boolean) => Promise<SkinReport>;

  // Beauty Insurance Streaks
  streaks: BeautyInsuranceStreak[];
  activeStreak: BeautyInsuranceStreak | null;
  setActiveStreak: (streak: BeautyInsuranceStreak | null) => void;
  logStreakEvidence: (trackingId: string, evidenceType: 'photo' | 'video', evidenceUrl: string) => void;
  reportAdverseReaction: (trackingId: string, description: string) => Promise<void>;
  submitClaim: (trackingId: string, feedback: string) => Promise<void>;

  // Support tickets
  supportTickets: SupportTicket[];
  createTicket: (category: SupportTicket['category'], subject: string, message: string, orderId?: string) => Promise<SupportTicket>;
  replyToTicket: (ticketId: string, message: string) => void;

  // Toast / System Notification
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
