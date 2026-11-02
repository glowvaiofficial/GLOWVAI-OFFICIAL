/**
 * Screen names for every screen ported from the GlowVAI mobile app.
 * These are added to the navigation ScreenName union so the existing AppContext navigate() works for them.
 * Existing NOV FINAL screen names are not changed.
 */

export type PortedScreenName =
  // Auth & onboarding (features/auth, features/onboarding)
  | 'auth-welcome'
  | 'auth-onboarding'
  | 'auth-onboarding-success'
  | 'auth-login'
  | 'auth-otp'
  | 'auth-verify-otp'
  | 'auth-profile-setup'
  | 'auth-skin-survey'
  | 'auth-change-phone'
  | 'auth-student-verify'
  | 'auth-permissions'
  // Shop, catalog, search, product (features/shop)
  | 'shop-home'
  | 'shop-browse'
  | 'shop-category'
  | 'shop-product'
  | 'shop-product-reviews'
  | 'shop-search-filters'
  | 'shop-wishlist'
  // Cart, checkout, payment, address, location (features/cart, checkout, location)
  | 'cart-tab'
  | 'checkout'
  | 'checkout-review'
  | 'checkout-express'
  | 'checkout-payment-method'
  | 'checkout-payment-processing'
  | 'checkout-payment-success'
  | 'checkout-payment-failed'
  | 'address-list'
  | 'address-add'
  | 'address-saved'
  | 'location-setup'
  | 'location-map-picker'
  | 'location-serviceability'
  // Orders & tracking (features/orders)
  | 'orders-list'
  | 'orders-detail'
  | 'orders-tracking'
  | 'orders-rate'
  // Skin scan (features/scan, features/recommendations)
  | 'scan-tab'
  | 'scan-intro'
  | 'scan-camera'
  | 'scan-gallery'
  | 'scan-preview'
  | 'scan-analyzing'
  | 'scan-report'
  | 'scan-failed'
  // Profile, settings, support, referrals (features/profile, settings, support, referrals)
  | 'profile-tab'
  | 'profile-overview'
  | 'profile-edit'
  | 'profile-settings'
  | 'profile-support'
  | 'profile-referrals'
  | 'profile-referral-code'
  | 'profile-referral-transactions'
  | 'profile-student-status'
  // Routine and ingredient guidance (features/recommendations)
  | 'recommend-overview'
  | 'recommend-routine'
  | 'recommend-ingredients'
  | 'recommend-patch-test'
  | 'recommend-checkout'
  // Admin & vendor (features/admin, features/vendor)
  | 'admin-portal'
  | 'admin-claims'
  | 'admin-darkstore'
  | 'admin-vendor-portal'
  | 'vendor-home'
  // Debug
  | 'debug-app-doctor';
