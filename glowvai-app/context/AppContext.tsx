import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
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
import { NO_ADDRESS } from '../data/serviceability';
import { useAddressStore, toNovAddress } from '../features/commerce/lib/addressStore';
import { PRODUCTS } from '../data/products';
import { auth } from '../core/config/firebase';
import { ensureCustomerSession } from '../core/services/customerSession';
import { refreshSavedAddresses } from '../features/commerce/lib/savedAddresses';
import { pushWishlistAdd, pushWishlistRemove, syncWishlistWithAccount } from '../features/shop/lib/wishlistSync';
import type { ShopProfileAddress } from '../core/services/shopApi';
import { useCustomerStore, type ActionResult } from '../core/state/customerStore';
import { AppContext, AppContextType, ScreenName } from './contextDefinition';
import { useCartStore } from '../core/state/cartStore';
import { buildState, entryFromState, popDecision, restoreTarget, safeParams, sameEntry, type NavEntry } from './navHistory';
import { currentScrollY, queueScrollRestore, rememberScroll } from './scrollMemory';
export { AppContext, type AppContextType, type ScreenName } from './contextDefinition';

const QA_SCREENS: ScreenName[] = ['skin-report', 'home', 'cart', 'checkout', 'customer-details', 'payment-status', 'order-confirmation', 'order-cancelled', 'order-tracking', 'profile', 'order-history'];
const requestedQaScreen = (process.env.NODE_ENV !== 'production') ? new URLSearchParams(window.location.search).get('screen') as ScreenName | null : null;
// Every visit opens the product list. The intro and the skin quiz are optional and are offered from a banner there
// (features/shop/lib/firstVisit.ts), so nothing stands between a new visitor and the products.
const firstScreen = (): ScreenName => 'shop-home';

// Development only: any screen name can be opened directly with ?screen=<name> so each layout can be checked.
const initialScreen: ScreenName = requestedQaScreen && (QA_SCREENS.includes(requestedQaScreen) || process.env.NODE_ENV !== 'production') ? requestedQaScreen : firstScreen();

const bagUnitsNow = (): number => Object.values(useCartStore.getState().items).reduce((n, item) => n + item.quantity, 0);

// The step to start on: the one saved in this history entry (a reload), or the normal first screen. The entry is written
// now so that every later step has an earlier entry to come back to.
const startEntry = (): NavEntry => {
  const saved = entryFromState(window.history.state);
  const entry: NavEntry = saved ? restoreTarget(saved, bagUnitsNow()).entry : { screen: initialScreen, params: null, trail: [] };
  try {
    window.history.replaceState(buildState(window.history.state, entry), '', window.location.href);
  } catch {
    // History unavailable: start on the normal screen without Back support.
  }
  return entry;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation stack. The step is restored from the browser history entry on load (reload), so it starts from there.
  const [start] = useState<NavEntry>(startEntry);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(start.screen as ScreenName);
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>(start.trail as ScreenName[]);
  const [activeParams, setActiveParams] = useState<any>(start.params);
  // The current step, kept in a ref so handlers (including popstate) always see the latest one.
  const navRef = useRef<NavEntry>(start);

  // Customer: a Firebase session for this device (anonymous until SMS sign-in exists) and the details the customer
  // saved on the server (users/{uid}). Nothing is treated as signed in or verified on the device alone.
  const profile = useCustomerStore((s) => s.profile);
  const profileStatus = useCustomerStore((s) => s.profileStatus);
  useEffect(() => {
    // Details used to be kept only in this browser; they now live on the server.
    try { window.localStorage.removeItem('glowvai:customer-details'); } catch { /* storage blocked */ }
    ensureCustomerSession()
      .then(() => useCustomerStore.getState().loadProfile())
      .catch(() => undefined);
  }, []);

  const customerDetails: CustomerDetails | null = profile
    ? { fullName: profile.name, phoneNumber: profile.phone, email: profile.email }
    : null;
  const skinFlags = { facialAnalysisCompleted: false, consentGiven: false };
  const user: UserProfile | null = profile
    ? {
        id: auth?.currentUser?.uid ?? '',
        phoneNumber: profile.phone,
        name: profile.name,
        email: profile.email,
        shoppingPreference: 'all',
        onboardingCompleted: true,
        ...skinFlags,
      }
    : null;

  // Location
  // Start from the address the customer picked last time (kept by the checkout address store), or none.
  const [currentAddress, setCurrentAddress] = useState<Address>(() => {
    const { addresses, selectedId } = useAddressStore.getState();
    const saved = addresses.find((a) => a.id === selectedId);
    return saved ? toNovAddress(saved) : NO_ADDRESS;
  });

  // Preference
  const [shoppingPreference, setShoppingPreference] = useState<ShoppingPreference>('all');

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem('glowvai:cart');
      if (saved !== null) return JSON.parse(saved) as CartItem[];
    } catch { /* storage blocked: start with an empty bag */ }
    return [];
  });

  useEffect(() => {
    window.localStorage.setItem('glowvai:cart', JSON.stringify(cart));
  }, [cart]);

  // Wishlist
  // Saved products stay on this device (kept in browser storage, read safely: a blocked storage is simply empty).
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('glowvai_wishlist_v1') ?? '[]');
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string').slice(0, 200) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('glowvai_wishlist_v1', JSON.stringify(wishlist.slice(0, 200)));
    } catch {
      // Storage blocked: the list works for this visit only.
    }
  }, [wishlist]);
  // Once per signed-in session: the device list is merged into the account wishlist, and the saved addresses are read.
  const wishlistRef = useRef(wishlist);
  wishlistRef.current = wishlist;
  useEffect(() => {
    if (!auth) return undefined;
    let lastUid: string | null = null;
    return onAuthStateChanged(auth, (signedIn) => {
      if (!signedIn || signedIn.uid === lastUid) return;
      lastUid = signedIn.uid;
      void refreshSavedAddresses();
      void syncWishlistWithAccount(wishlistRef.current).then((merged) => {
        if (merged) setWishlist(merged.slice(0, 200));
      });
    });
  }, []);

  // Face Analysis. Scan results are kept by the scan screens (features/scan); nothing here records a report.
  const [skinReports] = useState<SkinReport[]>([]);
  const [activeReport] = useState<SkinReport | null>(null);

  // Beauty Insurance Streaks (Seed with 1 active streak for immediate testing & auditability)
  // Seed fixtures exist only in local development. Production starts with no streaks or tickets.
  const [streaks, setStreaks] = useState<BeautyInsuranceStreak[]>(() => (process.env.NODE_ENV !== 'production') ? [
    {
      trackingId: 'strk-seed-101',
      orderId: 'GLOW-729481',
      productId: 'prod-min-spf50',
      productName: 'Minimalist SPF 50 PA++++ Sunscreen',
      productImage: PRODUCTS[0].images[0],
      policyVersion: 'Glowvai-Suitability-v1.2',
      startDate: '12 Oct',
      endDate: '26 Oct',
      totalDaysRequired: 14,
      completedDays: 7,
      missedDays: 0,
      status: 'active',
      days: Array.from({ length: 14 }, (_, i) => ({
        day: i + 1,
        date: `${12 + i} Oct`,
        completed: i < 7,
        missed: false,
        evidenceType: i < 7 ? 'photo' : undefined,
        timestamp: i < 7 ? `Day ${i + 1} Logged at 08:30 AM` : undefined,
      })),
    },
  ] : []);
  const [activeStreak] = useState<BeautyInsuranceStreak | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Navigation handlers. Every screen change is one browser history entry, so the browser Back button and the in-app back
  // move through the same steps. The rules (checkout, bag, payment) live in navHistory.ts.
  const writeEntry = (entry: NavEntry, mode: 'push' | 'replace') => {
    try {
      const state = buildState(window.history.state, entry);
      if (mode === 'push') window.history.pushState(state, '', window.location.href);
      else window.history.replaceState(state, '', window.location.href);
    } catch {
      // History unavailable: the in-app stack still works, only Back is limited.
    }
  };
  const showEntry = (next: NavEntry) => {
    navRef.current = next;
    setScreenHistory(next.trail as ScreenName[]);
    setCurrentScreen(next.screen as ScreenName);
    setActiveParams(next.params);
  };

  const navigate = (screen: ScreenName, params?: any) => {
    const cur = navRef.current;
    const nextParams = params !== undefined ? params : cur.params;
    // Opening the screen that is already on show (a tab tapped twice, a link to the current step) adds no history step,
    // so Back never has to pass through copies of the same screen.
    if (screen === cur.screen && JSON.stringify(safeParams(nextParams)) === JSON.stringify(safeParams(cur.params))) return;
    rememberScroll(cur.screen, cur.params, currentScrollY());
    const next: NavEntry = { screen, params: nextParams, trail: [...cur.trail, cur.screen] };
    writeEntry(next, 'push');
    showEntry(next);
  };

  const goBack = () => {
    const cur = navRef.current;
    if (cur.trail.length === 0) {
      // No earlier step in this app: the home screen, unless that would take a customer out of checkout with items in the bag.
      if (cur.screen === 'home' || popDecision(cur.screen, 'home', bagUnitsNow()) === 'block') return;
      const home: NavEntry = { screen: 'home', params: null, trail: [] };
      writeEntry(home, 'replace');
      showEntry(home);
      return;
    }
    // Normal case: step back in the browser history; the popstate handler applies the same step as the browser Back button.
    if (entryFromState(window.history.state)) {
      window.history.back();
      return;
    }
    const prev: NavEntry = { screen: cur.trail[cur.trail.length - 1], params: null, trail: cur.trail.slice(0, -1) };
    writeEntry(prev, 'replace');
    showEntry(prev);
  };

  // Browser Back, Forward and history traversal. Only entries written by this app are handled.
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const target = entryFromState(event.state);
      if (!target) return;
      const cur = navRef.current;
      const bag = bagUnitsNow();
      if (popDecision(cur.screen, target.screen, bag) === 'block') {
        // Back out of checkout to home with items in the bag is refused: step forward again to where the customer was.
        window.history.go(1);
        return;
      }
      const { entry: next, fallback } = restoreTarget(target, bag);
      if (fallback) window.history.replaceState(buildState(event.state, next), '', window.location.href);
      if (sameEntry(cur, next)) return;
      showEntry(next);
      queueScrollRestore(next.screen, next.params);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Saves the customer's details on the server (users/{uid}). The saved address is kept unless a new one is given.
  const saveCustomerDetails = async (details: CustomerDetails, address?: ShopProfileAddress): Promise<ActionResult> => {
    // users.address mirrors the default saved address on the server, so the profile carries the default too.
    const { addresses } = useAddressStore.getState();
    const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
    const fallback: ShopProfileAddress = defaultAddress
      ? {
          fullAddress: defaultAddress.fullAddress,
          city: defaultAddress.city,
          pincode: defaultAddress.pincode,
          landmark: defaultAddress.landmark ?? '',
        }
      : { fullAddress: '', city: '', pincode: '' };
    const result = await useCustomerStore.getState().saveProfile({
      name: details.fullName,
      phone: details.phoneNumber,
      email: details.email,
      address: address ?? (defaultAddress ? fallback : profile?.address ?? fallback),
      marketingOptIn: profile?.marketingOptIn ?? false,
    });
    if (result.ok) showToast('Your details are saved');
    return result;
  };

  // Address
  const selectAddress = (addr: Address) => {
    setCurrentAddress(addr);
    showToast(`Switched delivery location to ${addr.area}`);
  };

  const addAddress = (addr: Address) => {
    setCurrentAddress(addr);
    showToast(`Saved address in ${addr.area}`);
  };

  // Cart operations
  const addToCart = (product: Product, variantId?: string, withInsurance = false) => {
    const chosenVariantId = variantId || product.currentVariantId || product.variants[0].id;
    const chosenVariant = product.variants.find((variant) => variant.id === chosenVariantId);
    if (!chosenVariant?.inStock) {
      showToast(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.variantId === chosenVariantId);
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          product,
          variantId: chosenVariantId,
          quantity: 1,
          withInsurance: withInsurance && product.insuranceEligible,
          insuranceFee: product.insuranceFee || 29,
        },
      ];
    });
    showToast(`Added ${product.name} to cart`);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => setCart([]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Wishlist
  const toggleWishlist = (productId: string) => {
    const exists = wishlist.includes(productId);
    if (!exists && wishlist.length >= 200) {
      showToast('Your wishlist is full. Remove an item to save another.');
      return;
    }
    setWishlist(exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId]);
    // The device list changes at once; the account copy follows (see wishlistSync).
    if (exists) pushWishlistRemove(productId);
    else pushWishlistAdd(productId);
    showToast(exists ? 'Removed from saved wishlist' : 'Saved to wishlist');
  };

  // Beauty Insurance Streaks
  const logStreakEvidence = (trackingId: string, evidenceType: 'photo' | 'video', evidenceUrl: string) => {
    setStreaks((prev) =>
      prev.map((streak) => {
        if (streak.trackingId === trackingId) {
          const nextDayIndex = streak.completedDays;
          if (nextDayIndex < streak.totalDaysRequired) {
            const updatedDays = [...streak.days];
            updatedDays[nextDayIndex] = {
              ...updatedDays[nextDayIndex],
              completed: true,
              evidenceType,
              evidenceUrl,
              timestamp: `Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            };
            const updatedCompleted = streak.completedDays + 1;
            const isReady = updatedCompleted >= streak.totalDaysRequired;
            return {
              ...streak,
              completedDays: updatedCompleted,
              status: isReady ? 'claim_ready' : 'active',
              days: updatedDays,
            };
          }
        }
        return streak;
      })
    );
    showToast('Check-in photo saved on this device.');
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigate,
        goBack,
        activeParams,
        user,
        customerDetails,
        profileStatus,
        saveCustomerDetails,
        currentAddress,
        selectAddress,
        addAddress,
        shoppingPreference,
        setShoppingPreference,
        cart,
        addToCart,
        updateQuantity,
        clearCart,
        cartItemCount,
        wishlist,
        toggleWishlist,
        skinReports,
        activeReport,
        streaks,
        activeStreak,
        logStreakEvidence,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export { useApp } from './useApp';
