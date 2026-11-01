import React from 'react';
import { ChevronDown, LayoutGrid, MapPin, RotateCcw, ScanFace, Search, ShoppingCart, User } from 'lucide-react';
import { useApp, ScreenName } from '../../context/AppContext';
import { activeNavKey, NavKey } from './navGroups';
import { useCartSummary } from '../../features/commerce/lib/useCartSummary';
import { useDeliveryMinutes } from '../../features/commerce/components/shared';

// Top bar for tablet and desktop widths, laid out like a quick-commerce store: logo, delivery address,
// search, then shortcuts and the cart. Phones keep the bottom bar, so this is hidden there by CSS.
const HIDDEN_ON: ScreenName[] = ['welcome', 'onboarding', 'login', 'otp'];

export const WebHeader: React.FC = () => {
  const { currentScreen, navigate, currentAddress } = useApp();
  const { itemCount: cartItemCount, grandTotal } = useCartSummary();
  const minutes = useDeliveryMinutes();

  if (HIDDEN_ON.includes(currentScreen)) return null;

  const hasAddress = Boolean(currentAddress?.pincode);
  const addressLine = hasAddress
    ? [currentAddress.label, currentAddress.area || currentAddress.city].filter(Boolean).join(' · ')
    : 'Set delivery address';

  const links: { key: NavKey; label: string; screen: ScreenName; icon: React.ReactNode }[] = [
    { key: 'categories', label: 'Categories', screen: 'shop-browse', icon: <LayoutGrid size={18} /> },
    { key: 'scan', label: 'Skin scan', screen: 'scan-tab', icon: <ScanFace size={18} /> },
    { key: 'orders', label: 'Orders', screen: 'orders-list', icon: <RotateCcw size={18} /> },
    { key: 'account', label: 'Account', screen: 'profile-tab', icon: <User size={18} /> },
  ];
  const activeKey = activeNavKey(currentScreen);

  return (
    <header className="web-header">
      <div className="web-header-inner">
        <div className="web-header-brandbox">
          <button className="web-header-brand" onClick={() => navigate('shop-home')} aria-label="glowvai shop home" aria-current={activeKey === 'home' ? 'page' : undefined}>
            glowvai
          </button>
          <a className="web-header-back" href="/">
            glowvai.in
          </a>
        </div>

        <button className="web-header-location" onClick={() => navigate('location-setup')} aria-label={`Delivery address: ${addressLine}. Change`}>
          <MapPin size={18} />
          <span>
            <b>{hasAddress && minutes ? `Delivery in ${minutes} mins` : 'Deliver to'}</b>
            <small>{addressLine}</small>
          </span>
          <ChevronDown size={16} />
        </button>

        <button className="web-header-search" onClick={() => navigate('shop-search-filters')}>
          <Search size={18} />
          <span>Search niacinamide, sunscreen, brands…</span>
        </button>

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
          <ShoppingCart size={20} />
          {cartItemCount > 0 ? (
            <span className="web-header-cart-copy">
              <b>
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </b>
              <small>₹{grandTotal}</small>
            </span>
          ) : (
            <span>Cart</span>
          )}
        </button>
      </div>
    </header>
  );
};
