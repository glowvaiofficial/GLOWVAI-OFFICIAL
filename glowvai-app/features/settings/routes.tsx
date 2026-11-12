import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { LanguageSettings } from './LanguageSettings';
import { NotificationSettings } from './NotificationSettings';
import { ActivityScreen } from './ActivityScreen';
import { FaqScreen, HelpIndexScreen, PrivacyPolicyScreen, TermsScreen } from './HelpScreens';
import { SettingsWebPage } from './SettingsLinks';

// Full-page routes for the Settings hub. The profile route map spreads these in.
// Wallet, gift cards and privacy open their own team's pages from the hub. Sell and affiliate open the web pages.
export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'settings-language': () => <LanguageSettings />,
  'settings-notifications': () => <NotificationSettings />,
  'settings-activity': () => <ActivityScreen />,
  'settings-sell': () => <SettingsWebPage href="/sell" titleKey="section.sell.title" label="Open Sell on GlowVai" />,
  'settings-affiliate': () => <SettingsWebPage href="/affiliate" titleKey="section.affiliate.title" label="Open affiliate programme" />,
  'help-index': () => <HelpIndexScreen />,
  'help-faq': () => <FaqScreen />,
  'help-terms': () => <TermsScreen />,
  'help-privacy': () => <PrivacyPolicyScreen />,
};
