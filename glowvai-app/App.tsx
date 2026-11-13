import React from 'react';
import { auth } from './core/config/firebase';
import { AppProvider } from './context/AppContext';
import { ThemeLoader } from './core/theme/ThemeLoader';
import { useApp } from './context/useApp';
import { AndroidStatusBar } from './components/common/AndroidStatusBar';
import { BottomNavBar } from './components/common/BottomNavBar';
import { WebHeader } from './components/common/WebHeader';
import { portedRoutes } from './routes';
import { startProductFeed } from './core/services/productFeed';
import { ProductFeedNotice } from './components/common/ProductFeedNotice';
import { OrderNotifications } from './core/notifications/OrderNotifications';
import { InboxBridge } from './core/notifications/InboxBridge';
import { applyScroll, takeScrollRestore } from './context/scrollMemory';

// Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { PhoneSignInScreen } from './features/auth/PhoneSignInScreen';
import { OtpScreen } from './features/auth/OtpScreen';
import { FaceAnalysisPrepScreen } from './screens/FaceAnalysisPrepScreen';
import { FaceAnalysisCameraScreen } from './screens/FaceAnalysisCameraScreen';
import { FaceAnalysisLoadingScreen } from './screens/FaceAnalysisLoadingScreen';
import { SkinReportScreen } from './screens/SkinReportScreen';
import { ShopHomeScreen } from './features/shop/screens/ShopHomeScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { StreakTrackingScreen } from './screens/StreakTrackingScreen';
import { SupportScreen } from './screens/SupportScreen';
import { StudentReferralScreen } from './screens/StudentReferralScreen';
import { OrdersListScreen } from './features/orders/OrdersListScreen';
import { OrderDetailsScreen } from './features/orders/OrderDetailsScreen';
import { OrderTrackingScreen } from './features/orders/OrderTrackingScreen';
import { PaymentSuccessScreen } from './features/commerce/PaymentResultScreens';
import { ProfileOverviewScreen } from './features/profile/ProfileOverviewScreen';

const AppContent: React.FC = () => {
  const { currentScreen, activeParams, toastMessage, navigate } = useApp();

  // Each screen opens at the top, except when Back returns to a list: that list comes back at the position it was left.
  React.useEffect(() => {
    const restoreY = takeScrollRestore();
    const y = restoreY ?? 0;
    applyScroll(y);
    // The list may not be laid out yet on this frame, so the position is applied again on the next one.
    if (restoreY !== null) requestAnimationFrame(() => applyScroll(y));
  }, [currentScreen, activeParams]);

  // Products come from the database. The feed stays open while the app is on screen.
  React.useEffect(() => startProductFeed(), []);

  // A shared product link (/shop?product=ID) opens that product once the app starts.
  React.useEffect(() => {
    try {
      const productId = new URLSearchParams(window.location.search).get('product');
      if (productId && /^[A-Za-z0-9_-]{1,140}$/.test(productId)) navigate('shop-product', { productId });
      // A notification link: an order opens its details, and inbox=1 opens the notifications list.
      const orderId = new URLSearchParams(window.location.search).get('order');
      if (orderId && /^[A-Za-z0-9_-]{1,140}$/.test(orderId)) navigate('orders-detail', { orderId });
      else if (new URLSearchParams(window.location.search).get('inbox') === '1') navigate('notifications-list');
      // A shared tracking link (/shop?track=ORDER&k=TOKEN): the public view of that one order.
      const track = new URLSearchParams(window.location.search).get('track');
      const shareToken = new URLSearchParams(window.location.search).get('k');
      if (track && shareToken && /^[A-Za-z0-9-]{6,40}$/.test(track) && /^[A-Za-z0-9_-]{43}$/.test(shareToken)) navigate('orders-shared-tracking', { orderId: track, token: shareToken });
    } catch {
      // Unreadable address: open the normal start screen.
    }
  }, []);

  const renderScreen = () => {
    const PortedScreen = portedRoutes[currentScreen as keyof typeof portedRoutes];
    if (PortedScreen) return <PortedScreen />;

    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      // Sign-in with a mobile number, then the code. The details form (name, email, address) is 'customer-details'.
      case 'login':
        return <PhoneSignInScreen />;
      case 'otp':
        return <OtpScreen />;
      case 'customer-details':
        return <LoginScreen />;
      case 'face-prep':
        return <FaceAnalysisPrepScreen />;
      case 'face-capture':
        return <FaceAnalysisCameraScreen />;
      case 'face-loading':
        return <FaceAnalysisLoadingScreen />;
      case 'skin-report':
        return <SkinReportScreen />;
      case 'home':
        return <ShopHomeScreen />;
      case 'categories':
        return <CategoryScreen />;
      case 'search':
        return <SearchScreen />;
      case 'product-detail':
        return <ProductDetailScreen />;
      case 'cart':
        return <CartScreen />;
      // Older order screen names open the screens that read orders from the server.
      case 'payment-status':
      case 'order-confirmation':
        return <PaymentSuccessScreen />;
      case 'order-cancelled':
        return <OrderDetailsScreen />;
      case 'order-tracking':
        return <OrderTrackingScreen />;
      case 'streak-tracking':
        return <StreakTrackingScreen />;
      case 'order-history':
        return <OrdersListScreen />;
      case 'profile':
        return <ProfileOverviewScreen />;
      case 'support':
        return <SupportScreen />;
      case 'student-referral':
        return <StudentReferralScreen />;
      default:
        return <ShopHomeScreen />;
    }
  };

  return (
    <div className="app-viewport">
      <AndroidStatusBar tone={['welcome', 'onboarding', 'login', 'otp'].includes(currentScreen) ? 'brand' : 'light'} />
      <WebHeader />
      <ProductFeedNotice />
      <div className="screen-content">{renderScreen()}</div>
      <BottomNavBar />
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '76px',
            left: '20px',
            right: '20px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center',
            boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.25)',
            zIndex: 300,
          }}
        >
          {toastMessage}
        </div>
      )}
      <OrderNotifications />
      <InboxBridge />
    </div>
  );
};

// The saved session is read before the shop opens, so the first screen is chosen with the right account. A slow
// Firebase answer never holds the shop for more than five seconds.
const useSessionReady = (): boolean => {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, 5000);
    const restored = auth?.authStateReady ? auth.authStateReady() : Promise.resolve();
    restored.then(finish, finish);
    return () => window.clearTimeout(timer);
  }, []);
  return ready;
};

export const App: React.FC = () => {
  const ready = useSessionReady();
  if (!ready) return <div className="app-viewport glowvai-boot" aria-busy="true" />;
  return (
    <AppProvider>
      <ThemeLoader />
      <AppContent />
    </AppProvider>
  );
};
