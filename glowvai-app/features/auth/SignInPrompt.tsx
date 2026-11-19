import React from 'react';
import { UserRound } from 'lucide-react';
import { useApp } from '../../context/useApp';

// Shown in place of a screen that needs a profile when the visitor has none (only while the phone sign-in gate is off,
// see REQUIRE_PHONE_SIGN_IN in accountGate.ts). A friendly empty state, never an error.
export const SignInPrompt: React.FC = () => {
  const { navigate, currentScreen, activeParams } = useApp();
  return (
    <main className="gv7-signin-prompt">
      <div className="gv7-signin-prompt-card">
        <span className="gv7-signin-prompt-icon" aria-hidden="true"><UserRound size={28} /></span>
        <h1>Sign in to see this</h1>
        <p>Your orders, wallet and saved details live with your account. You can keep browsing and shopping in the meantime.</p>
        <button type="button" className="gv7-signin-prompt-btn" onClick={() => navigate('auth-login', { returnTo: currentScreen, returnParams: activeParams ?? null })}>Sign in</button>
        <button type="button" className="gv7-signin-prompt-link" onClick={() => navigate('shop-home')}>Continue shopping</button>
      </div>
    </main>
  );
};
