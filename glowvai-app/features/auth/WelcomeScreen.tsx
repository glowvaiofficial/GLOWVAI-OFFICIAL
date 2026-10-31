import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { storage } from '../../core/utils/storage';
import { logScreenMount, logTouch } from '../../core/utils/touchDoctor';
const slideAiScan = '/glowvai/features/auth/assets/slide-ai-face-scan.png';
const slideSkincare = '/glowvai/features/auth/assets/slide-skincare-ordering.png';
const slideExpress = '/glowvai/features/auth/assets/slide-express-delivery.png';
const slideFifteenMin = '/glowvai/features/auth/assets/slide-fifteen-min-guarantee.png';

const SLIDES = [
  {
    id: 'slide-1',
    image: slideAiScan,
    badge: 'AI FACE SCAN',
    title: 'AI Skin Scan in Seconds',
    body: 'Scan your face using smartphone AI computer vision to uncover acne, hydration & 8-point skin metrics.',
  },
  {
    id: 'slide-2',
    image: slideSkincare,
    badge: 'COSMETICS CATALOG',
    title: 'Custom Skincare & Cosmetics',
    body: 'Zero guesswork. Browse and order targeted serums, creams & derm-backed cosmetics tailored to your skin.',
  },
  {
    id: 'slide-3',
    image: slideExpress,
    badge: 'DOORSTEP DELIVERY',
    title: 'Hyperlocal Express Parcel',
    body: 'Verified Glow VAI rider hands over your tamper-proof skincare parcel right at your doorstep.',
  },
  {
    id: 'slide-4',
    image: slideFifteenMin,
    badge: '15-MIN EXPRESS',
    title: '15-Minute Delivery Guarantee',
    body: 'Ultra-fast hyper-commerce delivery guarantee — get your skincare products delivered in 15 minutes flat.',
  },
];

const AUTO_ADVANCE_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

export const WelcomeScreen: React.FC = () => {
  const { navigate } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
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

  return (
    <section className="auth-welcome">
      <div className="auth-welcome-brand">
        <span className="auth-brand-wordmark">glowvai</span>
      </div>

      <div className="auth-slider" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="auth-slider-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {SLIDES.map((slide) => (
            <article className="auth-slide" key={slide.id}>
              <div className="auth-slide-image">
                <img src={slide.image} alt="" />
                <span className="auth-slide-badge">{slide.badge}</span>
              </div>
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
            aria-label={`Show slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="auth-welcome-footer">
        <button type="button" className="auth-primary-button" onClick={handleGetStarted}>
          Get Started
        </button>
        <button type="button" className="auth-secondary-button" onClick={handleExploreProducts}>
          Explore Products
        </button>
      </div>
    </section>
  );
};

export default WelcomeScreen;
