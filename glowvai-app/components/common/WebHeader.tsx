import React from 'react';
import { Home, LayoutGrid, RotateCcw, ScanFace, ShoppingCart, User } from 'lucide-react';
import { useApp, ScreenName } from '../../context/AppContext';
import { activeNavKey, NavKey } from './navGroups';

// Top navigation for tablet and desktop widths. Phones keep the bottom bar, so this is hidden there by CSS.
const HIDDEN_ON: ScreenName[] = ['welcome', 'onboarding', 'login', 'otp'];

export const WebHeader: React.FC = () => {
  const { currentScreen, navigate, cartItemCount, cartAuthoritative } = useApp();

  if (HIDDEN_ON.includes(currentScreen)) return null;

  const links: { key: NavKey; label: string; screen: ScreenName; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', screen: 'shop-home', icon: <Home size={16} /> },
    { key: 'categories', label: 'Categories', screen: 'shop-browse', icon: <LayoutGrid size={16} /> },
    { key: 'scan', label: 'Skin scan', screen: 'scan-tab', icon: <ScanFace size={16} /> },
    { key: 'orders', label: 'Orders', screen: 'orders-list', icon: <RotateCcw size={16} /> },
    { key: 'account', label: 'Account', screen: 'profile-tab', icon: <User size={16} /> },
  ];
  const activeKey = activeNavKey(currentScreen);

  return (
    <header className="web-header">
      <div className="web-header-inner">
        <a className="web-header-back" href="/" aria-label="Back to glowvai.in">
          <span aria-hidden="true">←</span> glowvai.in
        </a>
        <button className="web-header-brand" onClick={() => navigate('shop-home')} aria-label="glowvai home">glowvai</button>
        <nav className="web-header-nav" aria-label="Primary navigation">
          {links.map((link) => {
            const active = activeKey === link.key;
            // aria-label keeps the name when the text label is hidden at tablet width.
            return (
              <button key={link.label} onClick={() => navigate(link.screen)} aria-current={active ? 'page' : undefined} aria-label={link.label} title={link.label} className={active ? 'is-active' : ''}>
                {link.icon}
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="web-header-cart" onClick={() => navigate('cart-tab')} aria-label={`Cart, ${cartItemCount} items`}>
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
