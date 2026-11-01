import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';
import { logScreenMount, logTouch } from '../../core/utils/touchDoctor';

// Same artwork as the main onboarding flow (see DESIGN.md: decorative hero media only).
const SLIDES = [
  {
    id: 'slide-scan',
    image: '/glowvai/assets/onboarding/hero-skin-v2.png',
    badge: 'SKIN SCAN',
    title: 'Know your skin',
    body: 'A guided camera scan checks your skin and explains what it finds in plain language.',
  },
  {
    id: 'slide-shop',
    image: '/glowvai/assets/onboarding/hero-delivery-v2.png',
    badge: 'SHOP AND DELIVERY',
    title: 'Your glow, delivered',
    body: 'Shop skincare and cosmetics matched to your skin, packed at a store near you.',
  },
  {
    id: 'slide-progress',
    image: '/glowvai/assets/onboarding/hero-progress-v2.png',
    badge: 'ORDERS AND ROUTINE',
    title: 'Keep track in one place',
    body: 'Follow every order, reorder favourites and get help from your account.',
  },
];

const AUTO_ADVANCE_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const WelcomeScreen: React.FC = () => {
  const { navigate } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(() => !prefersReducedMotion());
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    logScreenMount('WelcomeScreen');
  }, []);

  // Auto advance until the user interacts with the carousel
  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const goToSlide = (index: number) => {
    setAutoPlay(false);
    setActiveIndex(index);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    setAutoPlay(false);
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    setActiveIndex((index) =>
      deltaX < 0 ? Math.min(index + 1, SLIDES.length - 1) : Math.max(index - 1, 0)
    );
  };

  const handleGetStarted = () => {
    logTouch('Get Started Button', { screen: 'WelcomeScreen' });
    safeHapticImpact();
    navigate('auth-onboarding');
  };

  const handleExploreProducts = () => {
    logTouch('Explore Products Button', { screen: 'WelcomeScreen' });
    safeHapticImpact();
    void storage.setItem('skipped_onboarding', 'true');
    navigate('shop-home');
  };

  const trackStyle = { transform: `translateX(-${activeIndex * 100}%)` };

  return (
    <section className="auth-welcome" aria-roledescription="carousel" aria-label="Welcome to glowvai">
      <div className="auth-welcome-brand">
        <span className="auth-brand-wordmark">glowvai</span>
      </div>

      <div className="auth-slider auth-slider-media" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="auth-slider-track" style={trackStyle}>
          {SLIDES.map((slide, index) => (
            <div className="auth-slide" key={slide.id} aria-hidden={index !== activeIndex}>
              <div className="auth-slide-image">
                <img src={slide.image} alt="" />
                <span className="auth-slide-badge">{slide.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-slider auth-slider-copy" aria-live={autoPlay ? 'off' : 'polite'} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="auth-slider-track" style={trackStyle}>
          {SLIDES.map((slide, index) => (
            <article className="auth-slide" key={slide.id} aria-hidden={index !== activeIndex}>
              <h2 className="auth-slide-title">{slide.title}</h2>
              <p className="auth-slide-body">{slide.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="auth-dots">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`auth-dot${index === activeIndex ? ' is-active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Show slide ${index + 1} of ${SLIDES.length}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          />
        ))}
      </div>

      <div className="auth-welcome-footer">
        <button type="button" className="auth-primary-button" onClick={handleGetStarted}>
          Get started
        </button>
        <button type="button" className="auth-secondary-button" onClick={handleExploreProducts}>
          Explore products
        </button>
      </div>
    </section>
  );
};

export default WelcomeScreen;
