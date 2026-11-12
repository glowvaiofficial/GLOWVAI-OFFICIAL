import type { ComponentType, ReactNode } from 'react';
import { Activity, Bell, Gift, HelpCircle, Languages, LogOut, MapPin, Repeat, Share2, ShieldCheck, Store, User, Wallet } from 'lucide-react';
import type { PortedScreenName } from '../../core/routes/names';
import type { MessageKey } from '../../core/i18n/messages';
import { useApp } from '../../context/useApp';
import { useT } from '../../core/i18n/store';
import { SettingsPage } from './SettingsParts';
import { EditProfileScreen } from '../profile/EditProfileScreen';
import { SubscriptionsScreen } from '../profile/SubscriptionsScreen';
import { LanguageSettings } from './LanguageSettings';
import { NotificationSettings } from './NotificationSettings';
import { ActivityScreen } from './ActivityScreen';
import { HelpIndexScreen } from './HelpScreens';
import { SettingsLinkPanel, SettingsWebPage } from './SettingsLinks';

// One entry in the Settings hub. `route` is the full-page screen on phones; `Panel` is the same content shown next to the
// list on large screens. The sign-out entry has no route: it asks for confirmation instead.
export interface SettingsSection {
  id: 'profile' | 'addresses' | 'language' | 'notifications' | 'subscriptions' | 'wallet' | 'giftCards' | 'privacy' | 'sell' | 'affiliate' | 'help' | 'activity' | 'signOut';
  icon: ReactNode;
  titleKey: MessageKey;
  descKey: MessageKey;
  route: PortedScreenName | null;
  Panel: ComponentType | null;
}

const icon = (Icon: typeof User) => <Icon size={18} aria-hidden="true" />;

// The address book is the existing one: the section links to it, nothing is rebuilt here.
const AddressesPanel = () => {
  const t = useT();
  const { navigate } = useApp();
  return (
    <SettingsPage title={t('section.addresses.title')} embedded>
      <div className="settings-stack">
        <p className="settings-note">{t('addresses.help')}</p>
        <button type="button" className="profile-button is-primary" onClick={() => navigate('address-list')}>{t('addresses.edit')}</button>
      </div>
    </SettingsPage>
  );
};

// Rows that open another team's page. Wallet and privacy/gift cards open their own full pages; sell and affiliate are web pages.
const WalletPanel = () => <SettingsLinkPanel route="wallet-home" titleKey="section.wallet.title" label="Open wallet" />;
const GiftCardsPanel = () => <SettingsLinkPanel route="gift-cards" titleKey="section.giftCards.title" label="Open gift cards" />;
const PrivacyPanel = () => <SettingsLinkPanel route="privacy-center" titleKey="section.privacy.title" label="Open privacy centre" />;
const SellPanel = () => <SettingsWebPage href="/sell" titleKey="section.sell.title" label="Open Sell on GlowVai" />;
const AffiliatePanel = () => <SettingsWebPage href="/affiliate" titleKey="section.affiliate.title" label="Open affiliate programme" />;

export const settingsSections: SettingsSection[] = [
  { id: 'profile', icon: icon(User), titleKey: 'section.profile.title', descKey: 'section.profile.desc', route: 'profile-edit', Panel: () => <EditProfileScreen embedded /> },
  { id: 'addresses', icon: icon(MapPin), titleKey: 'section.addresses.title', descKey: 'section.addresses.desc', route: 'address-list', Panel: AddressesPanel },
  { id: 'language', icon: icon(Languages), titleKey: 'section.language.title', descKey: 'section.language.desc', route: 'settings-language', Panel: () => <LanguageSettings embedded /> },
  { id: 'notifications', icon: icon(Bell), titleKey: 'section.notifications.title', descKey: 'section.notifications.desc', route: 'settings-notifications', Panel: () => <NotificationSettings embedded /> },
  { id: 'subscriptions', icon: icon(Repeat), titleKey: 'section.subscriptions.title', descKey: 'section.subscriptions.desc', route: 'profile-subscriptions', Panel: SubscriptionsScreen },
  { id: 'wallet', icon: icon(Wallet), titleKey: 'section.wallet.title', descKey: 'section.wallet.desc', route: 'wallet-home', Panel: WalletPanel },
  { id: 'giftCards', icon: icon(Gift), titleKey: 'section.giftCards.title', descKey: 'section.giftCards.desc', route: 'gift-cards', Panel: GiftCardsPanel },
  { id: 'privacy', icon: icon(ShieldCheck), titleKey: 'section.privacy.title', descKey: 'section.privacy.desc', route: 'privacy-center', Panel: PrivacyPanel },
  { id: 'sell', icon: icon(Store), titleKey: 'section.sell.title', descKey: 'section.sell.desc', route: 'settings-sell', Panel: SellPanel },
  { id: 'affiliate', icon: icon(Share2), titleKey: 'section.affiliate.title', descKey: 'section.affiliate.desc', route: 'settings-affiliate', Panel: AffiliatePanel },
  { id: 'help', icon: icon(HelpCircle), titleKey: 'section.help.title', descKey: 'section.help.desc', route: 'help-index', Panel: () => <HelpIndexScreen embedded /> },
  { id: 'activity', icon: icon(Activity), titleKey: 'section.activity.title', descKey: 'section.activity.desc', route: 'settings-activity', Panel: () => <ActivityScreen embedded /> },
  { id: 'signOut', icon: icon(LogOut), titleKey: 'section.signOut.title', descKey: 'section.signOut.desc', route: null, Panel: null },
];
