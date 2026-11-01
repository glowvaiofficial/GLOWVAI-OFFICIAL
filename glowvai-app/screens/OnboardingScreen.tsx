import React, { useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';
const skinHero = '/glowvai/assets/onboarding/hero-skin-v2.png';
const deliveryHero = '/glowvai/assets/onboarding/hero-delivery-v2.png';
const progressHero = '/glowvai/assets/onboarding/hero-progress-v2.png';

const steps = [
  {
    image: skinHero,
    lead: '',
    highlight: 'Know',
    tail: ' your skin.',
    body: 'AI-powered face analysis to understand your unique skin needs.',
    action: 'Next',
  },
  {
    image: deliveryHero,
    lead: 'Your',
    highlight: ' glow,',
    tail: ' delivered.',
    body: 'Personalized skincare products and quick commerce, right to your door.',
    action: 'Next',
  },
  {
    image: progressHero,
    lead: 'Your',
    highlight: ' progress',
    tail: ' matters.',
    body: 'Track your journey, compare results, and get support when you need it.',
    action: 'Start My Glow Journey',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { navigate } = useApp();
  const [step, setStep] = useState(0);
  const item = steps[step];

  const advance = () => {
    if (step < steps.length - 1) setStep((value) => value + 1);
    else navigate('login');
  };

  return (
    <main className="onboarding-screen" style={{ position: 'relative', flex: 1, minHeight: '100%', overflow: 'hidden', background: '#0861f7' }}>
      <div className="onboarding-media" style={{ position: 'absolute', inset: 'var(--onb-hero-inset, 0 0 35% 0)', overflow: 'hidden' }}>
        <img
          key={item.image}
          src={item.image}
          alt=""
          aria-hidden="true"
          className="onboarding-hero"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: step === 2 ? 'center 46%' : 'center 52%' }}
        />
        <span className="brand-wordmark" style={{ position: 'absolute', top: 25, left: 29, color: '#fff', fontSize: 26, fontWeight: 500, letterSpacing: '-.055em', textShadow: '0 2px 12px rgba(0,53,170,.18)' }}>
          glowvai
        </span>
        {step === 1 && (
          <span style={{ position: 'absolute', top: 84, right: 18, display: 'inline-flex', minHeight: 48, alignItems: 'center', gap: 7, padding: '7px 12px', border: '2px solid rgba(255,255,255,.82)', borderRadius: 14, background: 'rgba(15,105,248,.72)', color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: 1.05 }}>
            <Zap size={18} fill="currentColor" /> Within<br />30 Minutes
          </span>
        )}
      </div>

      <section className="onboarding-sheet" style={{ position: 'absolute', inset: 'var(--onb-sheet-inset, auto 0 0 0)', minHeight: `var(--onb-sheet-min, ${step === 2 ? '43%' : '40%'})`, padding: `var(--onb-sheet-pad, ${step === 2 ? 27 : 34}px 30px calc(${step === 2 ? 32 : 22}px + var(--safe-bottom)))`, borderRadius: 'var(--onb-sheet-radius, 30px 30px 0 0)', background: '#fff', boxShadow: '0 -10px 32px rgba(0,48,150,.08)' }}>
        <h1 aria-live="polite" style={{ maxWidth: 350, fontFamily: 'var(--font-heading)', fontSize: step === 2 ? 'clamp(29px, 8vw, 36px)' : 'clamp(31px, 8.6vw, 39px)', lineHeight: 1.08, letterSpacing: '-.035em' }}>
          {item.lead}<span style={{ color: '#0d62f8' }}>{item.highlight}</span>{item.tail}
        </h1>
        <p style={{ maxWidth: 360, marginTop: 15, color: '#6d7589', fontSize: 16, lineHeight: 1.55 }}>{item.body}</p>

        <div aria-label={`Step ${step + 1} of ${steps.length}`} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: step === 2 ? 23 : 30 }}>
          {steps.map((_, index) => <span key={index} aria-hidden="true" style={{ width: 11, height: 11, borderRadius: '50%', background: index === step ? '#0d62f8' : '#dce8fa', transition: 'background-color .2s ease' }} />)}
        </div>

        <button type="button" onClick={advance} style={{ display: 'flex', width: '100%', minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: step === 2 ? 19 : 25, borderRadius: 999, background: '#0d62f8', boxShadow: '0 10px 24px rgba(13,98,248,.22)', color: '#fff', fontSize: step === 2 ? 15 : 18, fontWeight: 750 }}>
          {item.action}<ArrowRight size={22} />
        </button>
        <span aria-hidden="true" style={{ position: 'absolute', bottom: 8, left: '50%', width: 118, height: 4, transform: 'translateX(-50%)', borderRadius: 999, background: '#7f8794' }} />
      </section>
    </main>
  );
};
