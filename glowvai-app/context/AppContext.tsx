import React, { useEffect, useRef, useState } from 'react';
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
import { NO_ADDRESS } from '../data/serviceability';
import { useAddressStore, toNovAddress } from '../features/commerce/lib/addressStore';
import { useCartStore } from '../core/state/cartStore';
import { PRODUCTS } from '../data/products';
import { ApiService } from '../services/api';
import { AppContext, AppContextType, ScreenName } from './contextDefinition';
export { AppContext, type AppContextType, type ScreenName } from './contextDefinition';

// Screens that run one step and then navigate on by themselves. Back never returns to them.
const PASS_THROUGH_SCREENS: ScreenName[] = ['welcome', 'auth-onboarding', 'scan-analyzing', 'face-loading', 'checkout-payment-processing'];

const QA_SCREENS: ScreenName[] = ['skin-report', 'home', 'cart', 'checkout', 'customer-details', 'payment-status', 'order-confirmation', 'order-cancelled', 'order-tracking', 'profile', 'order-history'];
const requestedQaScreen = (process.env.NODE_ENV !== 'production') ? new URLSearchParams(window.location.search).get('screen') as ScreenName | null : null;
// Development only: any screen name can be opened directly with ?screen=<name> so each layout can be checked.
const initialScreen: ScreenName = requestedQaScreen && (QA_SCREENS.includes(requestedQaScreen) || process.env.NODE_ENV !== 'production') ? requestedQaScreen : 'welcome';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation stack
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(initialScreen);
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>([]);
  const [activeParams, setActiveParams] = useState<any>(null);

  // User state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginPhonePending, setLoginPhonePending] = useState<string>('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(() => {
    try {
      const saved = window.localStorage.getItem('glowvai:customer-details');
      return saved ? JSON.parse(saved) as CustomerDetails : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (customerDetails) window.localStorage.setItem('glowvai:customer-details', JSON.stringify(customerDetails));
    else window.localStorage.removeItem('glowvai:customer-details');
  }, [customerDetails]);

  // Location
  // Start from the address the customer picked last time (kept by the checkout address store), or none.
  const [currentAddress, setCurrentAddress] = useState<Address>(() => {
    const { addresses, selectedId } = useAddressStore.getState();
    const saved = addresses.find((a) => a.id === selectedId);
    return saved ? toNovAddress(saved) : NO_ADDRESS;
  });
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  // Preference
  const [shoppingPreference, setShoppingPreference] = useState<ShoppingPreference>('all');

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem('glowvai:cart');
      if (saved !== null) return JSON.parse(saved) as CartItem[];
    } catch { /* fall through to the development starter bag */ }
    return [{
      id: 'cart-init-1',
      product: PRODUCTS[0], // Minimalist SPF 50
      variantId: 'v-1',
      quantity: 1,
      withInsurance: true,
      insuranceFee: 29,
    }];
  });

  useEffect(() => {
    window.localStorage.setItem('glowvai:cart', JSON.stringify(cart));
  }, [cart]);

  // Wishlist
  // Kept on this device so saved products are still there after a reload.
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('glowvai:wishlist') || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { window.localStorage.setItem('glowvai:wishlist', JSON.stringify(wishlist)); } catch { /* storage unavailable */ }
  }, [wishlist]);

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    try { return JSON.parse(window.localStorage.getItem('glowvai:orders') || '[]') as Order[]; } catch { return []; }
  });
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    try { return JSON.parse(window.localStorage.getItem('glowvai:active-order') || 'null') as Order | null; } catch { return null; }
  });

  useEffect(() => {
    window.localStorage.setItem('glowvai:orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (activeOrder) window.localStorage.setItem('glowvai:active-order', JSON.stringify(activeOrder));
    else window.localStorage.removeItem('glowvai:active-order');
  }, [activeOrder]);

  // Face Analysis
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);
  const [skinReports, setSkinReports] = useState<SkinReport[]>([]);
  const [activeReport, setActiveReport] = useState<SkinReport | null>(null);

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
  const [activeStreak, setActiveStreak] = useState<BeautyInsuranceStreak | null>(null);

  // Support
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => (process.env.NODE_ENV !== 'production') ? [
    {
      id: 'TCK-89210',
      createdAt: 'Yesterday, 4:12 PM',
      orderId: 'GLOW-729481',
      category: 'Delivery issue',
      subject: 'ETA query regarding Benz Circle drop-off',
      status: 'Resolved',
      messages: [
        { sender: 'user', text: 'Hi, what is the exact delivery time for Benz Circle?', timestamp: '4:12 PM' },
        { sender: 'agent', text: 'Delivered in 14 minutes by rider K. Ramesh Babu.', timestamp: '4:26 PM' },
      ],
    },
  ] : []);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Navigation handlers
  // Each history entry keeps the params its screen was opened with, so going back to a product, category or
  // order shows that same item again instead of whatever was opened after it.
  const [paramsHistory, setParamsHistory] = useState<any[]>([]);

  const navigate = (screen: ScreenName, params?: any) => {
    setScreenHistory((prev) => [...prev, currentScreen]);
    setParamsHistory((prev) => [...prev, activeParams]);
    setCurrentScreen(screen);
    // A screen opened without params starts clean, so a filter or item from an earlier screen does not leak into it.
    setActiveParams(params === undefined ? null : params);
  };

  const goBack = () => {
    if (screenHistory.length === 0) {
      if (currentScreen !== 'home' && currentScreen !== 'shop-home') {
        setCurrentScreen('shop-home');
        setActiveParams(null);
      }
      return;
    }
    // Skip screens that only run a step and move on (analysing a scan, processing a payment, redirects):
    // going back into them would rerun that step or bounce straight forward again.
    let index = screenHistory.length - 1;
    while (index > 0 && PASS_THROUGH_SCREENS.includes(screenHistory[index])) index -= 1;
    if (PASS_THROUGH_SCREENS.includes(screenHistory[index])) {
      setScreenHistory([]);
      setParamsHistory([]);
      setCurrentScreen('shop-home');
      setActiveParams(null);
      return;
    }
    setScreenHistory((h) => h.slice(0, index));
    setParamsHistory((h) => h.slice(0, index));
    setCurrentScreen(screenHistory[index]);
    setActiveParams(paramsHistory[index] ?? null);
  };

  // Returns to an earlier screen in the history (dropping the steps after it), or opens it if it is not there.
  // Used when a side flow such as adding an address finishes and should hand back to the screen that started it.
  const goBackTo = (screen: ScreenName) => {
    const index = screenHistory.lastIndexOf(screen);
    if (index === -1) {
      navigate(screen);
      return;
    }
    setActiveParams(paramsHistory[index] ?? null);
    setScreenHistory((h) => h.slice(0, index));
    setParamsHistory((h) => h.slice(0, index));
    setCurrentScreen(screen);
  };

  // Auth actions
  const loginUser = async (phone: string) => {
    setLoginPhonePending(phone);
    await ApiService.requestOtp(phone);
  };

  const verifyUserOtp = async (otp: string) => {
    if (!loginPhonePending) throw new Error('Your session expired. Enter your mobile number again.');
    const res = await ApiService.verifyOtp(loginPhonePending, otp);
    setUser(res.user);
    showToast('Login successful!');
  };

  const logout = () => {
    setUser(null);
    navigate('welcome');
    showToast('Logged out of session');
  };

  const deleteAccount = () => {
    // Everything the settings screen promises to remove: scan history, saved addresses and profile details,
    // plus the bag, wishlist and ratings kept on this device.
    ['@glowvai_scan_history', 'glowvai:skin-concerns', 'glowvai:profile-demographics', 'glowvai:order-ratings', 'glowvai:wishlist'].forEach((key) => {
      try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
    });
    useAddressStore.setState({ addresses: [], selectedId: null });
    useCartStore.getState().clearCart();
    setCurrentAddress(NO_ADDRESS);
    setSavedAddresses([]);
    setWishlist([]);
    setUser(null);
    setCart([]);
    setOrders([]);
    setStreaks([]);
    setSkinReports([]);
    setCustomerDetails(null);
    navigate('welcome');
    showToast('Your account data was removed from this device.');
  };

  const saveCustomerDetails = (details: CustomerDetails) => {
    setCustomerDetails(details);
    setUser((current) => current ? { ...current, name: details.fullName, email: details.email, phoneNumber: details.phoneNumber } : current);
    showToast('Contact details saved');
  };

  // Address
  const selectAddress = (addr: Address) => {
    setCurrentAddress(addr);
    showToast(`Switched delivery location to ${addr.area}`);
  };

  const addAddress = (addr: Address) => {
    setSavedAddresses((prev) => [addr, ...prev]);
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

  const toggleItemInsurance = (cartItemId: string) => {
    const target = cart.find((item) => item.id === cartItemId);
    if (!target?.product.insuranceEligible) return;
    const toggled = !target.withInsurance;
    setCart((prev) => prev.map((item) => (item.id === cartItemId ? { ...item, withInsurance: toggled } : item)));
    showToast(toggled ? 'Beauty Insurance added' : 'Beauty Insurance removed');
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Authoritative cart pricing computed via ApiService
  const cartAuthoritative = ApiService.validateCartPricing(cart, currentAddress);

  // Wishlist
  const toggleWishlist = (productId: string) => {
    const exists = wishlist.includes(productId);
    setWishlist(exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId]);
    showToast(exists ? 'Removed from saved wishlist' : 'Saved to wishlist');
  };

  // Place Order. One key per checkout attempt, so a retry after a network failure cannot create a second order.
  const pendingCheckoutKey = useRef<string | null>(null);
  const recordOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    setActiveOrder(order);
  };

  const placeOrder = async (paymentMethod: PaymentMethodType, checkoutDiscount = 0, verification?: PaymentVerification): Promise<Order> => {
    pendingCheckoutKey.current ??= `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newOrder = await ApiService.createOrder(pendingCheckoutKey.current, cart, currentAddress, paymentMethod, checkoutDiscount, verification);
    pendingCheckoutKey.current = null;
    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrder(newOrder);

    // If order has insured items, generate tracking streaks
    const newStreaks = ApiService.createStreakFromOrder(newOrder);
    if (newStreaks.length > 0) {
      setStreaks((prev) => [...newStreaks, ...prev]);
    }

    clearCart();
    return newOrder;
  };

  const cancelOrder = (orderId: string, reason: string): Order | null => {
    const source = activeOrder?.id === orderId ? activeOrder : orders.find((order) => order.id === orderId);
    if (!source || ['on_the_way', 'delivered', 'cancelled'].includes(source.status)) return null;
    const cancelled: Order = {
      ...source,
      status: 'cancelled',
      paymentStatus: source.paymentStatus === 'successful' ? 'processing' : 'cancelled',
      splitDeliveryNote: `Cancellation requested: ${reason}`,
    };
    setOrders((previous) => previous.map((order) => order.id === orderId ? cancelled : order));
    if (activeOrder?.id === orderId) setActiveOrder(cancelled);
    return cancelled;
  };

  // Facial Analysis
  const runAnalysis = async (image: string, retain: boolean): Promise<SkinReport> => {
    const res = await ApiService.analyzeFaceImage(image, retain);
    setSkinReports((prev) => [res.report, ...prev]);
    setActiveReport(res.report);
    if (user) {
      setUser({ ...user, facialAnalysisCompleted: true, consentGiven: true });
    }
    return res.report;
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
    showToast('Daily check-in photo evidence uploaded!');
  };

  const reportAdverseReaction = async (trackingId: string, description: string) => {
    setStreaks((prev) =>
      prev.map((s) => (s.trackingId === trackingId ? { ...s, status: 'adverse_reaction_reported' } : s))
    );
    await ApiService.submitSupportTicket(
      'Skin-related adverse reaction',
      `Adverse Reaction on Tracking #${trackingId}`,
      description
    );
    showToast('Safety ticket created. Our support team will contact you.');
  };

  // A claim is only recorded for review. No refund or decision is made on the device.
  const submitClaim = async (trackingId: string, feedback: string) => {
    setStreaks((prev) =>
      prev.map((s) => (s.trackingId === trackingId ? { ...s, status: 'claim_submitted', claimFeedback: feedback } : s))
    );
    showToast('Claim submitted for review. We will update you once a decision is made.');
  };

  // Support
  // Adds the customer's reply to the ticket. Replies are queued for the support team; no automatic answer is generated.
  const replyToTicket = (ticketId: string, message: string) => {
    const text = message.trim();
    if (!text) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSupportTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'Open' : ticket.status,
              messages: [...ticket.messages, { sender: 'user', text, timestamp }],
            }
          : ticket
      )
    );
  };

  const createTicket = async (
    category: SupportTicket['category'],
    subject: string,
    message: string,
    orderId?: string
  ): Promise<SupportTicket> => {
    const t = await ApiService.submitSupportTicket(category, subject, message, orderId);
    setSupportTickets((prev) => [t, ...prev]);
    showToast(`Support ticket #${t.id} opened.`);
    return t;
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        screenHistory,
        navigate,
        goBack,
        goBackTo,
        activeParams,
        user,
        customerDetails,
        saveCustomerDetails,
        loginUser,
        verifyUserOtp,
        logout,
        deleteAccount,
        currentAddress,
        savedAddresses,
        selectAddress,
        addAddress,
        shoppingPreference,
        setShoppingPreference,
        cart,
        addToCart,
        updateQuantity,
        toggleItemInsurance,
        removeFromCart,
        clearCart,
        cartItemCount,
        cartAuthoritative,
        wishlist,
        toggleWishlist,
        orders,
        activeOrder,
        setActiveOrder,
        recordOrder,
        placeOrder,
        cancelOrder,
        capturedFaceImage,
        setCapturedFaceImage,
        skinReports,
        activeReport,
        runAnalysis,
        streaks,
        activeStreak,
        setActiveStreak,
        logStreakEvidence,
        reportAdverseReaction,
        submitClaim,
        supportTickets,
        createTicket,
        replyToTicket,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export { useApp } from './useApp';
