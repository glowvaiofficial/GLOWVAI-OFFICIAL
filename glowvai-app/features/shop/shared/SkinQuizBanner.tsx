import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { browserStore, dismissQuiz, firstVisitState } from '../lib/firstVisit';

// Optional skin quiz offer on the shop home. "Take the quiz" opens the intro, which leads to the quiz.
// "Skip" hides it for good on this device.
export const SkinQuizBanner: React.FC = () => {
  const { navigate } = useApp();
  const [visible, setVisible] = useState(() => firstVisitState(browserStore()).showQuizBanner);

  if (!visible) return null;

  const skip = () => {
    dismissQuiz(browserStore());
    setVisible(false);
  };

  return (
    <section className="shop-quiz-banner" aria-label="Skin quiz">
      <span className="shop-quiz-banner-icon" aria-hidden="true"><Sparkles size={18} /></span>
      <div className="shop-quiz-banner-copy">
        <strong>Get skin-matched picks</strong>
        <span>Take a 1-minute skin quiz.</span>
        <button type="button" className="shop-quiz-banner-cta" onClick={() => navigate('auth-onboarding')}>
          Take the quiz
        </button>
      </div>
      <button type="button" className="shop-quiz-banner-skip" onClick={skip} aria-label="Skip the skin quiz">
        <X size={16} aria-hidden="true" />
        <span>Skip</span>
      </button>
    </section>
  );
};
