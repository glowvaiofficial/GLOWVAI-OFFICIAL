import type { ScreenName } from '../../context/AppContext';

// One place that decides, for every screen, which tab is active and where the header, the bottom bar and the floating cart show.
// Both the old NOV FINAL screen names and the ported mobile-app names are listed, so the active tab is right on either.

export type NavTab = 'home' | 'categories' | 'scan' | 'orders' | 'account' | 'cart';

// Where each tab opens. These are the screens the shop itself links to.
export const TAB_TARGET: Record<NavTab, ScreenName> = {
  home: 'shop-home',
  categories: 'shop-browse',
  scan: 'scan-tab',
  orders: 'orders-list',
  account: 'profile-tab',
  cart: 'cart-tab',
};

const TAB_SCREENS: Record<NavTab, ScreenName[]> = {
  home: ['home', 'shop-home'],
  categories: ['categories', 'shop-browse', 'shop-category'],
  scan: ['face-prep', 'face-capture', 'face-loading', 'skin-report', 'scan-tab', 'scan-intro', 'scan-camera', 'scan-gallery', 'scan-preview', 'scan-analyzing', 'scan-report', 'scan-failed'],
  orders: ['order-history', 'order-tracking', 'order-cancelled', 'streak-tracking', 'orders-list', 'orders-detail', 'orders-tracking', 'orders-rate'],
  account: ['profile', 'support', 'student-referral', 'profile-tab', 'profile-overview', 'profile-edit', 'profile-settings', 'profile-support', 'profile-referrals', 'profile-referral-code', 'profile-subscriptions', 'auth-change-phone', 'auth-student-verify', 'address-list', 'address-saved', 'address-add', 'shop-wishlist'],
  cart: ['cart', 'cart-tab'],
};

export const activeTabFor = (screen: ScreenName): NavTab | null => {
  for (const tab of Object.keys(TAB_SCREENS) as NavTab[]) {
    if (TAB_SCREENS[tab].includes(screen)) return tab;
  }
  return null;
};

// Sign-in and onboarding: no shop chrome at all.
const SIGN_IN: ScreenName[] = ['welcome', 'onboarding', 'login', 'otp', 'auth-welcome', 'auth-onboarding', 'auth-onboarding-success', 'auth-login', 'auth-otp', 'auth-verify-otp', 'auth-profile-setup', 'auth-skin-survey', 'auth-permissions'];

// Checkout, from the order review to the payment result: the shopper stays on task, so the header and the tabs are hidden.
const CHECKOUT: ScreenName[] = ['checkout', 'customer-details', 'payment-status', 'checkout-review', 'checkout-express', 'checkout-payment-method', 'checkout-payment-processing', 'checkout-payment-failed'];

export const showsWebHeader = (screen: ScreenName): boolean => !SIGN_IN.includes(screen) && !CHECKOUT.includes(screen);

// Phones: the tab bar shows only on the top-level shopping screens. Detail, form, camera and payment screens
// have their own back button and bottom buttons, so the bar is left off there instead of covering them.
const BOTTOM_NAV_ON: ScreenName[] = ['home', 'shop-home', 'categories', 'shop-browse', 'shop-category', 'order-history', 'orders-list', 'streak-tracking', 'scan-tab', 'profile', 'profile-tab', 'skin-report'];

export const showsBottomNav = (screen: ScreenName): boolean => BOTTOM_NAV_ON.includes(screen);

// The floating "View cart" bar sits above the tab bar on the shopping screens only.
const MINI_CART_ON: ScreenName[] = ['home', 'shop-home', 'categories', 'shop-browse', 'shop-category', 'order-history', 'orders-list', 'skin-report'];

export const showsMiniCart = (screen: ScreenName): boolean => MINI_CART_ON.includes(screen);
