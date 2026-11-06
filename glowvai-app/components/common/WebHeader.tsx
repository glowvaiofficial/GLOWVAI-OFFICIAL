import React from 'react';
import { Bell, LayoutGrid, RotateCcw, ScanFace, Search, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { activeTabFor, NavTab, showsWebHeader, TAB_TARGET } from './navGroups';
import { itemsLabel, useShellCart } from './useShellCart';
import { useInbox } from '../../core/notifications/inboxStore';

// Top navigation for tablet and desktop widths. Phones keep the bottom bar, so this is hidden there by CSS.
const LINKS: { label: string; tab: NavTab; icon: React.ReactNode }[] = [
  { label: 'Categories', tab: 'categories', icon: <LayoutGrid size={18} /> },
  { label: 'Skin scan', tab: 'scan', icon: <ScanFace size={18} /> },
  { label: 'Orders', tab: 'orders', icon: <RotateCcw size={18} /> },
  { label: 'Account', tab: 'account', icon: <User size={18} /> },
];

export const WebHeader: React.FC = () => {
  const { currentScreen, navigate } = useApp();
  const cart = useShellCart();
  const unread = useInbox((s) => s.unreadCount);

  if (!showsWebHeader(currentScreen)) return null;

  const activeTab = activeTabFor(currentScreen);
  const go = (tab: NavTab) => navigate(TAB_TARGET[tab]);

  return (
    <header className="web-header">
      <div className="web-header-inner">
        <a className="web-header-back" href="/" aria-label="Back to glowvai.in">
          <span aria-hidden="true">←</span> <span>glowvai.in</span>
        </a>
        <button className="web-header-brand" onClick={() => go('home')} aria-label="glowvai shop home" aria-current={activeTab === 'home' ? 'page' : undefined}>glowvai</button>
        <button className="web-header-search" onClick={() => navigate('shop-search-filters')} aria-label="Search products">
          <Search size={18} aria-hidden="true" />
          <span>Search for serums, sunscreen and more</span>
        </button>
        <nav className="web-header-nav" aria-label="Primary navigation">
          {LINKS.map((link) => {
            const active = activeTab === link.tab;
            return (
              <button key={link.tab} onClick={() => go(link.tab)} aria-current={active ? 'page' : undefined} aria-label={link.label} title={link.label} className={active ? 'is-active' : ''}>
                {link.icon}
                <span>{link.label}</span>
              </button>
            );
          })}
          <button type="button" className="notif-bell" onClick={() => navigate('notifications-list')} aria-current={currentScreen === 'notifications-list' ? 'page' : undefined} aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} title="Notifications">
            <Bell size={18} aria-hidden="true" />
            <span>Alerts</span>
            {unread > 0 && <b className="notif-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</b>}
          </button>
        </nav>
        <button
          className={`web-header-cart${cart.count > 0 ? ' has-items' : ''}`}
          onClick={() => go('cart')}
          aria-current={activeTab === 'cart' ? 'page' : undefined}
          aria-label={cart.count > 0 ? `Cart, ${itemsLabel(cart.count)}, ${cart.totalLabel}` : 'Cart, empty'}
        >
          <ShoppingCart size={20} aria-hidden="true" />
          {cart.count > 0 ? (
            <span className="web-header-cart-copy">
              <b>{itemsLabel(cart.count)}</b>
              <small>{cart.totalLabel}</small>
            </span>
          ) : (
            <span>Cart</span>
          )}
        </button>
      </div>
    </header>
  );
};
