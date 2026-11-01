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
import { INITIAL_USER_ADDRESS, SAMPLE_SAVED_ADDRESSES } from '../data/serviceability';
import { PRODUCTS } from '../data/products';
import { ApiService } from '../services/api';
import { AppContext, AppContextType, ScreenName } from './contextDefinition';
export { AppContext, type AppContextType, type ScreenName } from './contextDefinition';

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
  const [currentAddress, setCurrentAddress] = useState<Address>(INITIAL_USER_ADDRESS);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(SAMPLE_SAVED_ADDRESSES);

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
  const [wishlist, setWishlist] = useState<string[]>([]);

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
