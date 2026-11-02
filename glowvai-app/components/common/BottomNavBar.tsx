import React, { useEffect, useState } from 'react';
import { ChevronRight, Home, LayoutGrid, RotateCcw, ScanFace, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { activeTabFor, NavTab, showsBottomNav, showsMiniCart, TAB_TARGET } from './navGroups';
import { itemsLabel, useShellCart } from './useShellCart';

// Phone tab bar, same destinations and order as the desktop header.
const NAV_ITEMS: { label: string; tab: NavTab; Icon: typeof Home }[] = [
  { label: 'Home', tab: 'home', Icon: Home },
  { label: 'Categories', tab: 'categories', Icon: LayoutGrid },
  { label: 'Skin scan', tab: 'scan', Icon: ScanFace },
  { label: 'Orders', tab: 'orders', Icon: RotateCcw },
  { label: 'Account', tab: 'account', Icon: User },
];

export const BottomNavBar: React.FC = () => {
  const { currentScreen, navigate } = useApp();
  const cart = useShellCart();
  const [reportCommerceVisible, setReportCommerceVisible] = useState(false);

  useEffect(() => {
    if (currentScreen !== 'skin-report') setReportCommerceVisible(false);
    const handleReveal = (event: Event) => setReportCommerceVisible(Boolean((event as CustomEvent<{ visible: boolean }>).detail?.visible));
    window.addEventListener('glowvai:commerce-reveal', handleReveal);
    return () => window.removeEventListener('glowvai:commerce-reveal', handleReveal);
  }, [currentScreen]);

  if (!showsBottomNav(currentScreen) || (currentScreen === 'skin-report' && !reportCommerceVisible)) return null;

  const activeTab = activeTabFor(currentScreen);

  return (
    <div className="bottom-commerce-shell">
      {cart.count > 0 && showsMiniCart(currentScreen) && (
        <button onClick={() => navigate(TAB_TARGET.cart)} className="mini-cart-bar" aria-label={`View cart, ${itemsLabel(cart.count)}, ${cart.totalLabel}`}>
          <span className="mini-cart-icon" aria-hidden="true"><ShoppingCart size={20} /></span>
          <span className="mini-cart-copy"><b>View cart</b><small>{itemsLabel(cart.count)} · {cart.totalLabel}</small></span>
          <span className="mini-cart-action" aria-hidden="true"><ChevronRight size={20} /></span>
        </button>
      )}
      <nav className="quick-bottom-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map(({ label, tab, Icon }) => {
          const active = activeTab === tab;
          return <button key={tab} onClick={() => navigate(TAB_TARGET[tab])} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
            <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            <span>{label}</span>
          </button>;
        })}
      </nav>
    </div>
  );
};
