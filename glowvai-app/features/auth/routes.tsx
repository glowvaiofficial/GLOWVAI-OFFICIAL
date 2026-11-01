import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './auth.css';
import '../../responsive/auth-ported.css';
import { WelcomeScreen } from './WelcomeScreen';
import { OnboardingRedirect } from './OnboardingRedirect';
import { OnboardingSuccessScreen } from './OnboardingSuccessScreen';
import { LoginScreen } from './LoginScreen';
import { OtpVerificationScreen } from './OtpVerificationScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { SkinSurveyScreen } from './SkinSurveyScreen';
import { ChangePhoneNumberScreen } from './ChangePhoneNumberScreen';
import { StudentVerificationScreen } from './StudentVerificationScreen';
import { PermissionsScreen } from './PermissionsScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'auth-welcome': WelcomeScreen,
  'auth-onboarding': OnboardingRedirect,
  'auth-onboarding-success': OnboardingSuccessScreen,
  'auth-login': LoginScreen,
  'auth-otp': OtpVerificationScreen,
  'auth-verify-otp': OtpVerificationScreen,
  'auth-profile-setup': ProfileSetupScreen,
  'auth-skin-survey': SkinSurveyScreen,
  'auth-change-phone': ChangePhoneNumberScreen,
  'auth-student-verify': StudentVerificationScreen,
  'auth-permissions': PermissionsScreen,
};
