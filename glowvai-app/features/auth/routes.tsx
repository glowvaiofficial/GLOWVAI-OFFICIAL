import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './auth.css';
import '../../responsive/auth-ported.css';
import { WelcomeScreen } from './WelcomeScreen';
import { OnboardingRedirect } from './OnboardingRedirect';
import { OnboardingSuccessScreen } from './OnboardingSuccessScreen';
import { LoginScreen } from '../../screens/LoginScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { SkinSurveyScreen } from './SkinSurveyScreen';
import { ChangePhoneNumberScreen } from './ChangePhoneNumberScreen';
import { StudentVerificationScreen } from './StudentVerificationScreen';
import { PermissionsScreen } from './PermissionsScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'auth-welcome': WelcomeScreen,
  'auth-onboarding': OnboardingRedirect,
  'auth-onboarding-success': OnboardingSuccessScreen,
  // No sign-in code is offered until SMS sign-in exists: these open the "Your details" step.
  'auth-login': LoginScreen,
  'auth-otp': LoginScreen,
  'auth-verify-otp': LoginScreen,
  'auth-profile-setup': ProfileSetupScreen,
  'auth-skin-survey': SkinSurveyScreen,
  'auth-change-phone': ChangePhoneNumberScreen,
  'auth-student-verify': StudentVerificationScreen,
  'auth-permissions': PermissionsScreen,
};
