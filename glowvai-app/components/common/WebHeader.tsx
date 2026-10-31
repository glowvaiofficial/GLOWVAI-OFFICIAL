import React from 'react';
import { Home, LayoutGrid, RotateCcw, ScanFace, ShoppingCart, User } from 'lucide-react';
import { useApp, ScreenName } from '../../context/AppContext';

// Top navigation for tablet and desktop widths. Phones keep the bottom bar, so this is hidden there by CSS.
const HIDDEN_ON: ScreenName[] = ['welcome', 'onboarding', 'login', 'otp'];

export const WebHeader: React.FC = () => {
  const { currentScreen, navigate, cartItemCount, cartAuthoritative } = useApp();

  if (HIDDEN_ON.includes(currentScreen)) return null;

  const links: { label: string; screen: ScreenName; icon: React.ReactNode }[] = [
    { label: 'Home', screen: 'home', icon: <Home size={16} /> },
    { label: 'Categories', screen: 'categories', icon: <LayoutGrid size={16} /> },
    { label: 'Skin scan', screen: 'face-prep', icon: <ScanFace size={16} /> },
    { label: 'Orders', screen: 'order-history', icon: <RotateCcw size={16} /> },
    { label: 'Account', screen: 'profile', icon: <User size={16} /> },
  ];

  return (
    <header className="web-header">
      <div className="web-header-inner">
        <a className="web-header-back" href="/" aria-label="Back to glowvai.in">
          <span aria-hidden="true">←</span> glowvai.in
        </a>
        <button className="web-header-brand" onClick={() => navigate('home')} aria-label="glowvai home">glowvai</button>
        <nav className="web-header-nav" aria-label="Primary navigation">
          {links.map((link) => {
            const active = currentScreen === link.screen;
            return (
              <button key={link.label} onClick={() => navigate(link.screen)} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
                {link.icon}
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="web-header-cart" onClick={() => navigate('cart')} aria-label={`Cart, ${cartItemCount} items`}>
          <ShoppingCart size={18} />
          <span>Cart</span>
          {cartItemCount > 0 && (
            <small>{cartItemCount} · ₹{cartAuthoritative.finalPayable}</small>
          )}
        </button>
      </div>
    </header>
  );
};
