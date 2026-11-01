import React from 'react';
import { ChevronRight, Image as ImageIcon, Lightbulb, ScanFace, Glasses, Eye } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ScanHeader } from './components/ScanHeader';

const STEPS = [
  {
    icon: Lightbulb,
    title: 'Use bright, even light',
    body: 'Natural light from a window works great. Avoid harsh shadows and dim lighting.',
  },
  {
    icon: Glasses,
    title: 'Remove glasses & keep your face clear',
    body: 'Take off sunglasses or glasses, and make sure your hair isn’t covering your face.',
  },
  {
    icon: Eye,
    title: 'Look straight at the camera',
    body: 'Keep your head centred and your face fully visible in the frame.',
  },
];

export const ScanIntroScreen: React.FC = () => {
  const { navigate, goBack } = useApp();

  return (
    <div className="scan-screen">
      <ScanHeader title="Before you scan" subtitle="Three quick checks" onBack={goBack} />
      <div className="scan-body scan-intro-body">
        <div className="scan-progress" role="progressbar" aria-label="Scan steps" aria-valuemin={1} aria-valuemax={3} aria-valuenow={1} aria-valuetext="Step 1 of 3">
          <span className="scan-progress-bar" style={{ width: '33%' }} />
        </div>
        <span className="scan-step-label">Step 1 of 3</span>

        <h2 className="scan-headline">Let’s get your best glow reading</h2>
        <p className="scan-lead">A few quick steps help us make your scan clearer and more useful.</p>

        <div className="scan-stack">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="scan-tip-card">
              <span className="scan-tip-icon">
                <Icon size={20} />
              </span>
              <div>
                <h3 className="scan-card-title">{title}</h3>
                <p className="scan-card-body">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="scan-privacy">
          <ScanFace size={14} /> Your photo is used only for this skin assessment.
        </p>

        <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
          Start camera
          <ChevronRight size={18} />
        </button>
        <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-gallery')}>
          <ImageIcon size={18} />
          Upload a photo instead
        </button>
      </div>
    </div>
  );
};
