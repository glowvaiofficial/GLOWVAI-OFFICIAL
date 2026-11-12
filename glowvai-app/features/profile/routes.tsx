import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './profile.css';
import '../../responsive/profile-admin.css';
import { ProfileOverviewScreen } from './ProfileOverviewScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { SettingsHubScreen } from '../settings/SettingsHubScreen';
import { routes as settingsRoutes } from '../settings/routes';
import { HelpAndSupportScreen } from './HelpAndSupportScreen';
import { ReferralHubScreen } from './ReferralHubScreen';
import { StudentReferralScreen } from './StudentReferralScreen';
import { ReferralTransactionsScreen } from './ReferralTransactionsScreen';
import { SubscriptionsScreen } from './SubscriptionsScreen';
import { StudentStatusScreen } from './StudentStatusScreen';
import { AppDoctorScreen } from './AppDoctorScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  ...settingsRoutes,
  'profile-tab': ProfileOverviewScreen,
  // The mobile app's profile-overview route renders the edit screen, so both names do.
  'profile-overview': EditProfileScreen,
  'profile-edit': EditProfileScreen,
  'profile-settings': SettingsHubScreen,
  'profile-support': HelpAndSupportScreen,
  'profile-referrals': ReferralHubScreen,
  'profile-referral-code': StudentReferralScreen,
  'profile-referral-transactions': ReferralTransactionsScreen,
  'profile-subscriptions': SubscriptionsScreen,
  'profile-student-status': StudentStatusScreen,
  'debug-app-doctor': AppDoctorScreen,
};
