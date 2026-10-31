import React, { useEffect, useState } from 'react';
import { Camera, ChevronRight, Home, LayoutGrid, RotateCcw, ScanFace, ShoppingCart } from 'lucide-react';
import { useApp, ScreenName } from '../../context/AppContext';
import { activeNavKey, NavKey } from './navGroups';

export const BottomNavBar: React.FC = () => {
  const { currentScreen, navigate, cartItemCount, cartAuthoritative } = useApp();
  const [reportCommerceVisible, setReportCommerceVisible] = useState(false);

  useEffect(() => {
    if (currentScreen !== 'skin-report') setReportCommerceVisible(false);
    const handleReveal = (event: Event) => setReportCommerceVisible(Boolean((event as CustomEvent<{ visible: boolean }>).detail?.visible));
    window.addEventListener('glowvai:commerce-reveal', handleReveal);
    return () => window.removeEventListener('glowvai:commerce-reveal', handleReveal);
  }, [currentScreen]);

  const pillHiddenScreens: ScreenName[] = ['cart', 'cart-tab', 'shop-product', 'shop-search-filters', 'location-map-picker'];
  const hidden: ScreenName[] = ['welcome', 'onboarding', 'login', 'otp', 'auth-welcome', 'auth-onboarding', 'auth-login', 'auth-otp', 'auth-verify-otp', 'auth-profile-setup', 'auth-skin-survey', 'auth-change-phone', 'auth-student-verify', 'auth-permissions', 'auth-onboarding-success', 'cart-tab', 'face-prep', 'face-capture', 'face-loading', 'cart', 'checkout', 'checkout-payment-method', 'checkout-payment-success', 'checkout-payment-failed', 'customer-details', 'payment-status', 'order-confirmation', 'order-cancelled', 'order-tracking'];
  if (hidden.includes(currentScreen) || (currentScreen === 'skin-report' && !reportCommerceVisible)) return null;

  const navItems: { key: NavKey; label: string; screen: ScreenName; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', screen: 'shop-home', icon: <Home size={20} /> },
    { key: 'orders', label: 'Order Again', screen: 'orders-list', icon: <RotateCcw size={20} /> },
    { key: 'categories', label: 'Categories', screen: 'shop-browse', icon: <LayoutGrid size={20} /> },
    { key: 'scan', label: 'Face scan', screen: 'scan-tab', icon: <span className="nav-face-scan"><ScanFace size={20} /><Camera size={10} /></span> },
  ];
  const activeKey = activeNavKey(currentScreen);

  return (
    <div className="bottom-commerce-shell">
      {/* These screens have their own sticky bottom bar, which the pill would cover. */}
      {cartItemCount > 0 && !pillHiddenScreens.includes(currentScreen) && (
        <button onClick={() => navigate('cart-tab')} className="mini-cart-bar" aria-label={`View cart, ${cartItemCount} items, ₹${cartAuthoritative.finalPayable}`}>
          <span className="mini-cart-icon"><ShoppingCart size={20} /></span>
          <span className="mini-cart-copy"><b>View cart</b><small>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} · ₹{cartAuthoritative.finalPayable}</small></span>
          <span className="mini-cart-action"><ChevronRight size={17} /></span>
        </button>
      )}
      <nav className="quick-bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const active = activeKey === item.key;
          return <button key={item.label} onClick={() => navigate(item.screen)} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
            {item.icon}
            <span>{item.label}</span>
          </button>;
        })}
      </nav>
    </div>
  );
};
