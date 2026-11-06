import React from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { AndroidStatusBar } from './components/common/AndroidStatusBar';
import { BottomNavBar } from './components/common/BottomNavBar';
import { WebHeader } from './components/common/WebHeader';
import { portedRoutes } from './routes';
import { startProductFeed } from './core/services/productFeed';
import { OrderNotifications } from './core/notifications/OrderNotifications';

// Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
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
import { LiveRiderTrackingScreen } from './features/orders/LiveRiderTrackingScreen';
import { PaymentSuccessScreen } from './features/commerce/PaymentResultScreens';
import { ProfileOverviewScreen } from './features/profile/ProfileOverviewScreen';

const AppContent: React.FC = () => {
  const { currentScreen, activeParams, toastMessage, navigate } = useApp();

  // Each screen opens at the top, rather than keeping the previous screen's scroll position.
  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('.glowvai-root .screen-content')?.scrollTo(0, 0);
  }, [currentScreen, activeParams]);

  // Products come from the database. The feed stays open while the app is on screen.
  React.useEffect(() => startProductFeed(), []);

  // A shared product link (/shop?product=ID) opens that product once the app starts.
  React.useEffect(() => {
    try {
      const productId = new URLSearchParams(window.location.search).get('product');
      if (productId && /^[A-Za-z0-9_-]{1,140}$/.test(productId)) navigate('shop-product', { productId });
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
      // There is no sign-in code yet: these older names open the "Your details" step.
      case 'login':
      case 'otp':
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
        return <LiveRiderTrackingScreen />;
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
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};
