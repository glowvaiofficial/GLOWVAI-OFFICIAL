// The one decision for who may see which shop screen. Pure: no React, no Firebase, no window, so the decision table is
// tested directly (__tests__/account-setup/account-gate.test.ts). AppContext asks these functions before it opens a
// screen, restores a saved step, or runs an action that needs an account.
//
// Rules:
// - A visitor with no phone account starts on the onboarding screens, then the sign-in (phone) screen.
// - A signed-in phone account starts on the shop.
// - Preview screens (the product list and product pages, the onboarding and sign-in screens) open without an account.
// - Every other shop screen needs a phone account. Any other name is refused too (default deny).
// - The sign-in screens are never shown to someone already signed in: they go to the shop (or where they were going).

export type AccountState = 'none' | 'phone';

export const ONBOARDING_SCREEN = 'auth-onboarding';
export const SIGN_IN_SCREEN = 'auth-login';
export const SHOP_SCREEN = 'shop-home';

// Screens that open the phone sign-in (the legacy 'login' and 'otp' names included, as the app still uses them).
const SIGN_IN_SCREENS = new Set<string>(['auth-login', 'login', 'auth-otp', 'auth-verify-otp', 'otp']);

// Opened without an account: the products (read only) and the public sign-in path.
const PREVIEW_SCREENS = new Set<string>([
  'home',
  'shop-home',
  'shop-browse',
  'shop-category',
  'shop-product',
  'shop-product-reviews',
  'shop-search-filters',
  'search',
  'categories',
  'product-detail',
  'orders-shared-tracking',
  'auth-welcome',
  'auth-onboarding',
  ...SIGN_IN_SCREENS,
]);

export interface UserLike {
  isAnonymous: boolean;
  providerData: ReadonlyArray<{ providerId: string } | null>;
}

// A phone account is a non-anonymous Firebase user that signed in with a phone number. An anonymous browsing session
// is not an account.
export function accountStateOf(user: UserLike | null | undefined): AccountState {
  if (!user || user.isAnonymous) return 'none';
  return user.providerData.some((provider) => provider?.providerId === 'phone') ? 'phone' : 'none';
}

// The first screen for this visitor when no step was saved.
export function startScreenFor(account: AccountState): string {
  return account === 'phone' ? SHOP_SCREEN : ONBOARDING_SCREEN;
}

export function screenOpensWithoutAccount(screen: string): boolean {
  return PREVIEW_SCREENS.has(screen);
}

export interface ScreenTarget {
  screen: string;
  params: unknown;
}

// Where a navigation really goes. A refused screen becomes the sign-in screen, which remembers where to return.
// A sign-in screen opened by a signed-in account goes to the return target (or the shop) instead.
export function gateNavigation(account: AccountState, target: ScreenTarget): ScreenTarget {
  if (account === 'phone' && SIGN_IN_SCREENS.has(target.screen)) return afterSignIn(target.params);
  if (account === 'none' && !screenOpensWithoutAccount(target.screen)) {
    return { screen: SIGN_IN_SCREEN, params: { returnTo: target.screen, returnParams: target.params ?? null } };
  }
  return target;
}

// The screen to open once the phone account is signed in: the one that asked for sign-in, or the shop.
export function afterSignIn(params: unknown): ScreenTarget {
  const data = (params && typeof params === 'object' ? params : {}) as { returnTo?: unknown; returnParams?: unknown };
  if (typeof data.returnTo === 'string' && /^[a-z0-9-]{1,64}$/.test(data.returnTo) && !SIGN_IN_SCREENS.has(data.returnTo)) {
    return { screen: data.returnTo, params: data.returnParams ?? null };
  }
  return { screen: SHOP_SCREEN, params: null };
}
