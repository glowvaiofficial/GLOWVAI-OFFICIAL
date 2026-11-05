import { useEffect, type FC } from 'react';
import { useApp } from '../../context/useApp';

// Onboarding order: welcome, skin survey, then "Your details", then the shop.
export const OnboardingRedirect: FC = () => {
  const { navigate } = useApp();

  useEffect(() => {
    navigate('auth-skin-survey');
  }, []);

  return null;
};
