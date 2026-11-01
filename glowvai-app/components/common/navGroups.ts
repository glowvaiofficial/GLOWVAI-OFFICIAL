// Which primary navigation tab a screen belongs to. The header and bottom nav both use this, so a tab stays
// highlighted on every screen under it, including the ported screens that use newer names.
export type NavKey = 'home' | 'categories' | 'scan' | 'orders' | 'account';

export const activeNavKey = (screen: string): NavKey | null => {
  if (screen === 'home' || screen === 'shop-home') return 'home';
  if (screen === 'categories' || screen === 'shop-browse' || screen === 'shop-category') return 'categories';
  if (screen.startsWith('scan-') || screen.startsWith('face-') || screen === 'skin-report') return 'scan';
  if (screen.startsWith('orders-') || ['order-history', 'order-tracking', 'streak-tracking'].includes(screen)) return 'orders';
  if (screen === 'profile' || screen.startsWith('profile-')) return 'account';
  return null;
};
