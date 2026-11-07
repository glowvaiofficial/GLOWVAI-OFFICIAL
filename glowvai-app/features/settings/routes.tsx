import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { LanguageSettings } from './LanguageSettings';
import { NotificationSettings } from './NotificationSettings';
import { ActivityScreen } from './ActivityScreen';
import { FaqScreen, HelpIndexScreen, PrivacyPolicyScreen, TermsScreen } from './HelpScreens';
import { PlaceholderBody } from './SettingsParts';
import { SettingsAndSecurityScreen } from '../profile/SettingsAndSecurityScreen';

// Full-page routes for the Settings hub. The profile route map spreads these in.
// The wallet, gift card, sell and affiliate pages are placeholders: the owning team replaces the component here.
export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'settings-language': () => <LanguageSettings />,
  'settings-notifications': () => <NotificationSettings />,
  'settings-activity': () => <ActivityScreen />,
  'settings-wallet': () => <PlaceholderBody titleKey="section.wallet.title" />,
  'settings-gift-cards': () => <PlaceholderBody titleKey="section.giftCards.title" />,
  // Interim: the existing privacy content. The privacy team replaces it with their pages.
  'settings-privacy': SettingsAndSecurityScreen,
  'settings-sell': () => <PlaceholderBody titleKey="section.sell.title" />,
  'settings-affiliate': () => <PlaceholderBody titleKey="section.affiliate.title" />,
  'help-index': () => <HelpIndexScreen />,
  'help-faq': () => <FaqScreen />,
  'help-terms': () => <TermsScreen />,
  'help-privacy': () => <PrivacyPolicyScreen />,
};
