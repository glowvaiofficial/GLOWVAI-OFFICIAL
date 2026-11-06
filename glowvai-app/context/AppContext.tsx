import React, { useEffect, useState } from 'react';
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
import type { ShopProfileAddress } from '../core/services/shopApi';
import { useCustomerStore, type ActionResult } from '../core/state/customerStore';
import { AppContext, AppContextType, ScreenName } from './contextDefinition';
export { AppContext, type AppContextType, type ScreenName } from './contextDefinition';

const QA_SCREENS: ScreenName[] = ['skin-report', 'home', 'cart', 'checkout', 'customer-details', 'payment-status', 'order-confirmation', 'order-cancelled', 'order-tracking', 'profile', 'order-history'];
const requestedQaScreen = (process.env.NODE_ENV !== 'production') ? new URLSearchParams(window.location.search).get('screen') as ScreenName | null : null;
// A visitor who already passed the welcome screen goes straight to the shop. Storage can be blocked, so reads are guarded.
const hasSeenWelcome = (): boolean => {
  try {
    return ['skipped_onboarding', 'glowvai_onboarding_completed', 'welcome_seen'].some((key) => window.localStorage.getItem(key) === 'true');
  } catch {
    return false;
  }
};

// The app renders only in the browser (GlowVaiShop loads it with ssr: false), so the first screen is chosen once,
// at load, before the first paint. The splash plays once per device and is marked as seen when it first shows.
const firstScreen = (): ScreenName => {
  if (hasSeenWelcome()) return 'shop-home';
  try {
    window.localStorage.setItem('welcome_seen', 'true');
  } catch {
    // Storage blocked: the splash simply shows again next time.
  }
  return 'welcome';
};

// Development only: any screen name can be opened directly with ?screen=<name> so each layout can be checked.
const initialScreen: ScreenName = requestedQaScreen && (QA_SCREENS.includes(requestedQaScreen) || process.env.NODE_ENV !== 'production') ? requestedQaScreen : firstScreen();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation stack
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(initialScreen);
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>([]);
  const [activeParams, setActiveParams] = useState<any>(null);

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

  // Navigation handlers
  const navigate = (screen: ScreenName, params?: any) => {
    setScreenHistory((prev) => [...prev, currentScreen]);
    setCurrentScreen(screen);
    if (params !== undefined) setActiveParams(params);
  };

  const goBack = () => {
    if (screenHistory.length === 0) {
      if (currentScreen !== 'home') setCurrentScreen('home');
      return;
    }
    const prev = screenHistory[screenHistory.length - 1];
    setScreenHistory((h) => h.slice(0, -1));
    setCurrentScreen(prev);
  };

  // Saves the customer's details on the server (users/{uid}). The saved address is kept unless a new one is given.
  const saveCustomerDetails = async (details: CustomerDetails, address?: ShopProfileAddress): Promise<ActionResult> => {
    const { addresses, selectedId } = useAddressStore.getState();
    const selected = addresses.find((a) => a.id === selectedId);
    const fallback: ShopProfileAddress = selected
      ? {
          fullAddress: [selected.houseNo, selected.buildingName, selected.areaAddress].filter(Boolean).join(', '),
          city: selected.city,
          pincode: selected.pincode,
          landmark: selected.landmark ?? '',
        }
      : { fullAddress: '', city: '', pincode: '' };
    const result = await useCustomerStore.getState().saveProfile({
      name: details.fullName,
      phone: details.phoneNumber,
      email: details.email,
      address: address ?? profile?.address ?? fallback,
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
    setWishlist(exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId]);
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
