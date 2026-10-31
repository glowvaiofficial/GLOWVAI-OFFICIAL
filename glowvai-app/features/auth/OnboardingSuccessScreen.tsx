import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getCurrentUser } from '../../core/services/authService';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';

const AUTO_NAVIGATE_MS = 2000;

export const OnboardingSuccessScreen: React.FC = () => {
  const { navigate } = useApp();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    void storage.setItem('glowvai_onboarding_completed', 'true');
    syncUserOnboardingData({ onboardingCompleted: true }).catch(() => {});

    const user = getCurrentUser();
    if (user?.displayName) {
      setUserName(user.displayName.split(' ')[0] || '');
    }

    const timer = window.setTimeout(() => navigate('shop-home'), AUTO_NAVIGATE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const handleExplore = () => {
    safeHapticImpact();
    navigate('shop-home');
  };

  return (
    <section className="auth-success">
      <CheckCircle2 className="auth-success-icon" aria-hidden="true" />
      <h1 className="auth-title auth-success-title">
        {userName ? `Welcome to GlowVAI, ${userName}!` : 'Welcome to GlowVAI!'}
      </h1>
      <p className="auth-subtitle">
        Your clinical skincare engine is ready. Explore formulations backed by computer vision diagnostics.
      </p>

      <div className="auth-success-footer">
        <button type="button" className="auth-primary-button" onClick={handleExplore}>
          Explore Products
        </button>
        <div className="auth-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
};

export default OnboardingSuccessScreen;
