import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';

export const WelcomeScreen: React.FC = () => {
  const { navigate } = useApp();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('onboarding'), 2400);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <button
      type="button"
      className="welcome-screen"
      onClick={() => navigate('onboarding')}
      aria-label="glowvai. Always for you. Continue"
      style={{
        position: 'relative',
        display: 'grid',
        width: '100%',
        minHeight: '100%',
        overflow: 'hidden',
        placeItems: 'center',
        background: 'linear-gradient(180deg, #0c57fa 0%, #155eff 35%, #78a2ff 66%, #ffffff 95%)',
        color: '#fff',
      }}
    >
      <span className="brand-wordmark" style={{ transform: 'translateY(-54px)', fontSize: 'clamp(46px, 14vw, 64px)', fontWeight: 500, letterSpacing: '-.065em' }}>
        glowvai
      </span>
      <strong style={{ position: 'absolute', bottom: '11%', color: '#111522', fontSize: 18, fontWeight: 800, letterSpacing: '-.03em' }}>
        always for you!!
      </strong>
    </button>
  );
};
