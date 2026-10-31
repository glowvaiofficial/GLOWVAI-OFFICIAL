import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './profile.css';
import '../../responsive/profile-admin.css';
import { ProfileOverviewScreen } from './ProfileOverviewScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { SettingsAndSecurityScreen } from './SettingsAndSecurityScreen';
import { HelpAndSupportScreen } from './HelpAndSupportScreen';
import { ReferralHubScreen } from './ReferralHubScreen';
import { StudentReferralScreen } from './StudentReferralScreen';
import { AppDoctorScreen } from './AppDoctorScreen';
import { ReferralTransactionsScreen } from './ReferralTransactionsScreen';
import { StudentStatusScreen } from './StudentStatusScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'profile-tab': ProfileOverviewScreen,
  // The mobile app's profile-overview route renders the edit screen, so both names do.
  'profile-overview': EditProfileScreen,
  'profile-edit': EditProfileScreen,
  'profile-settings': SettingsAndSecurityScreen,
  'profile-support': HelpAndSupportScreen,
  'profile-referrals': ReferralHubScreen,
  'profile-referral-code': StudentReferralScreen,
  'profile-referral-transactions': ReferralTransactionsScreen,
  'profile-student-status': StudentStatusScreen,
  'debug-app-doctor': AppDoctorScreen,
};
