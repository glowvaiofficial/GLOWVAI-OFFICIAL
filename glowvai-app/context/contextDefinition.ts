import type { PortedScreenName } from '../core/routes/names';
import { createContext } from 'react';
import type { ShopProfileAddress } from '../core/services/shopApi';
import {
  Address,
  CartItem,
  CustomerDetails,
  Product,
  ShoppingPreference,
  SkinReport,
  BeautyInsuranceStreak,
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
  navigate: (screen: ScreenName, params?: any) => void;
  goBack: () => void;
  activeParams: any;

  // User state
  user: UserProfile | null;
  customerDetails: CustomerDetails | null;
  // 'ready' once the server answered whether this device has saved details (customerDetails is null if not).
  profileStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveCustomerDetails: (details: CustomerDetails, address?: ShopProfileAddress) => Promise<{ ok: boolean; error: string | null }>;

  // Address
  currentAddress: Address;
  selectAddress: (address: Address) => void;
  addAddress: (address: Address) => void;

  // Shopping mode
  shoppingPreference: ShoppingPreference;
  setShoppingPreference: (pref: ShoppingPreference) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variantId?: string, withInsurance?: boolean) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  cartItemCount: number;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  // Facial diagnostics & Skin reports
  skinReports: SkinReport[];
  activeReport: SkinReport | null;

  // Beauty Insurance Streaks
  streaks: BeautyInsuranceStreak[];
  activeStreak: BeautyInsuranceStreak | null;
  logStreakEvidence: (trackingId: string, evidenceType: 'photo' | 'video', evidenceUrl: string) => void;

  // Toast / System Notification
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
