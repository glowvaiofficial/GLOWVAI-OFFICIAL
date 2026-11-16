import React from 'react';
import { Bell, CreditCard, Gift, HelpCircle, MapPin, Package, Repeat, Settings, ShieldCheck, Smartphone, UserRound, Users, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ScreenName } from '../../context/AppContext';

// The account menu on the left of the account screens (PC widths only: CSS hides it below 1024px, where the account
// screen's own list is the menu). Plain navigation: every item opens a screen the shop already has, and each of those
// screens keeps its own sign-in rule.
interface MenuItem {
  label: string;
  target: ScreenName;
  icon: React.ReactNode;
  // Every screen that belongs to this item, so the item stays highlighted on its sub-screens.
  screens: string[];
}

const ICON = 18;

const ITEMS: MenuItem[] = [
  { label: 'Profile', target: 'profile-tab', icon: <UserRound size={ICON} />, screens: ['profile', 'profile-tab', 'profile-overview', 'profile-edit', 'profile-student-status', 'settings-language', 'settings-activity'] },
  { label: 'Orders', target: 'orders-list', icon: <Package size={ICON} />, screens: ['order-history', 'orders-list', 'orders-detail', 'orders-rate', 'returns-request'] },
  { label: 'Addresses', target: 'address-list', icon: <MapPin size={ICON} />, screens: ['address-list', 'address-saved', 'address-add'] },
  { label: 'Wallet and coins', target: 'wallet-home', icon: <Wallet size={ICON} />, screens: ['wallet-home', 'settings-wallet'] },
  { label: 'Gift cards', target: 'gift-cards', icon: <Gift size={ICON} />, screens: ['gift-cards', 'settings-gift-cards'] },
  { label: 'Payment methods', target: 'payment-methods', icon: <CreditCard size={ICON} />, screens: ['payment-methods'] },
  { label: 'Notifications', target: 'notifications-list', icon: <Bell size={ICON} />, screens: ['notifications-list', 'settings-notifications'] },
  { label: 'Referrals', target: 'profile-referrals', icon: <Users size={ICON} />, screens: ['profile-referrals', 'profile-referral-code', 'profile-referral-transactions', 'settings-affiliate', 'student-referral'] },
  { label: 'Subscriptions', target: 'profile-subscriptions', icon: <Repeat size={ICON} />, screens: ['profile-subscriptions'] },
  { label: 'Privacy', target: 'privacy-center', icon: <ShieldCheck size={ICON} />, screens: ['privacy-center', 'settings-privacy'] },
  { label: 'Devices', target: 'privacy-devices', icon: <Smartphone size={ICON} />, screens: ['privacy-devices'] },
  { label: 'Settings', target: 'profile-settings', icon: <Settings size={ICON} />, screens: ['profile-settings'] },
  { label: 'Help', target: 'profile-support', icon: <HelpCircle size={ICON} />, screens: ['profile-support', 'support', 'help-index', 'help-faq', 'help-terms', 'help-privacy'] },
];

// The screens that carry the menu. The public shared tracking page and the live tracking map keep the full width.
const WITH_MENU = new Set<string>(ITEMS.flatMap((item) => item.screens));
export const showsAccountMenu = (screen: string): boolean => WITH_MENU.has(screen);

export const AccountMenu: React.FC = () => {
  const { currentScreen, navigate, user } = useApp();
  const name = user?.name?.trim() || 'Your account';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'G';

  return (
    <nav className="v5a-menu" aria-label="Account menu">
      <div className="v5a-menu-user">
        <span className="v5a-menu-avatar" aria-hidden="true">{initials}</span>
        <span className="v5a-menu-who">
          <small>Hello,</small>
          <strong>{name}</strong>
        </span>
      </div>
      <ul className="v5a-menu-list">
        {ITEMS.map((item) => {
          const active = item.screens.includes(currentScreen);
          return (
            <li key={item.label}>
              <button type="button" className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} onClick={() => { if (!active) navigate(item.target); }}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
