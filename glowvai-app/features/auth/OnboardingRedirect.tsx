import { useEffect, type FC } from 'react';
import { useApp } from '../../context/useApp';

// The USER app's onboarding carousel was retired; this step forwards to login.
export const OnboardingRedirect: FC = () => {
  const { navigate } = useApp();

  useEffect(() => {
    navigate('auth-login');
  }, []);

  return null;
};
