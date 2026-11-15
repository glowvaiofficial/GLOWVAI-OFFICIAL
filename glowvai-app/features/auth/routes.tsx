import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './auth.css';
import '../../responsive/auth-ported.css';
import { OnboardingScreen } from '../../screens/OnboardingScreen';
import { OnboardingSuccessScreen } from './OnboardingSuccessScreen';
import { PhoneSignInScreen } from './PhoneSignInScreen';
import { OtpScreen } from './OtpScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { SkinSurveyScreen } from './SkinSurveyScreen';
import { ChangePhoneNumberScreen } from './ChangePhoneNumberScreen';
import { StudentVerificationScreen } from './StudentVerificationScreen';
import { PermissionsScreen } from './PermissionsScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'auth-welcome': OnboardingScreen,
  // The optional intro (also reached from the shop banner and the settings hub). Its last step opens the skin quiz.
  'auth-onboarding': OnboardingScreen,
  'auth-onboarding-success': OnboardingSuccessScreen,
  // Sign-in with a mobile number and the SMS code. No name, email or skin questions at sign-up.
  'auth-login': PhoneSignInScreen,
  'auth-otp': OtpScreen,
  'auth-verify-otp': OtpScreen,
  'auth-profile-setup': ProfileSetupScreen,
  'auth-skin-survey': SkinSurveyScreen,
  'auth-change-phone': ChangePhoneNumberScreen,
  'auth-student-verify': StudentVerificationScreen,
  'auth-permissions': PermissionsScreen,
};
