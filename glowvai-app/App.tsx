import React from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { BottomNavBar } from './components/common/BottomNavBar';
import { WebHeader } from './components/common/WebHeader';
import { portedRoutes } from './routes';

// Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OtpScreen } from './screens/OtpScreen';
import { FaceAnalysisPrepScreen } from './screens/FaceAnalysisPrepScreen';
import { FaceAnalysisCameraScreen } from './screens/FaceAnalysisCameraScreen';
import { FaceAnalysisLoadingScreen } from './screens/FaceAnalysisLoadingScreen';
import { SkinReportScreen } from './screens/SkinReportScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { CustomerDetailsScreen } from './screens/CustomerDetailsScreen';
import { PaymentStatusScreen } from './screens/PaymentStatusScreen';
import { OrderConfirmationScreen } from './screens/OrderConfirmationScreen';
import { OrderCancelledScreen } from './screens/OrderCancelledScreen';
import { OrderTrackingScreen } from './screens/OrderTrackingScreen';
import { StreakTrackingScreen } from './screens/StreakTrackingScreen';
import { OrderHistoryScreen } from './screens/OrderHistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SupportScreen } from './screens/SupportScreen';
import { StudentReferralScreen } from './screens/StudentReferralScreen';

const AppContent: React.FC = () => {
  const { currentScreen, toastMessage } = useApp();

  const renderScreen = () => {
    const PortedScreen = portedRoutes[currentScreen as keyof typeof portedRoutes];
    if (PortedScreen) return <PortedScreen />;

    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      case 'login':
        return <LoginScreen />;
      case 'otp':
        return <OtpScreen />;
      case 'face-prep':
        return <FaceAnalysisPrepScreen />;
      case 'face-capture':
        return <FaceAnalysisCameraScreen />;
      case 'face-loading':
        return <FaceAnalysisLoadingScreen />;
      case 'skin-report':
        return <SkinReportScreen />;
      case 'home':
        return <HomeScreen />;
      case 'categories':
        return <CategoryScreen />;
      case 'search':
        return <SearchScreen />;
      case 'product-detail':
        return <ProductDetailScreen />;
      case 'cart':
        return <CartScreen />;
      case 'checkout':
        return <CheckoutScreen />;
      case 'customer-details':
        return <CustomerDetailsScreen />;
      case 'payment-status':
        return <PaymentStatusScreen />;
      case 'order-confirmation':
        return <OrderConfirmationScreen />;
      case 'order-cancelled':
        return <OrderCancelledScreen />;
      case 'order-tracking':
        return <OrderTrackingScreen />;
      case 'streak-tracking':
        return <StreakTrackingScreen />;
      case 'order-history':
        return <OrderHistoryScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'support':
        return <SupportScreen />;
      case 'student-referral':
        return <StudentReferralScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="app-viewport">
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
