import React, { useState } from 'react';
import { Camera, ChevronRight, EyeOff, Image as ImageIcon, ShieldCheck, Sparkles, SunMedium } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScanHeader } from '../features/scan/components/ScanHeader';
import '../responsive/entry-scan.css';

const prepSteps = [
  { icon: SunMedium, title: 'Face a soft light', copy: 'Stand near a window. Keep strong light in front of you, not behind you.' },
  { icon: EyeOff, title: 'Keep your face bare', copy: 'Remove glasses and heavy makeup so the scan can see your skin clearly.' },
  { icon: Sparkles, title: 'Hold still for a moment', copy: 'Centre your face in the guide. The capture takes only a few seconds.' },
];

export const FaceAnalysisPrepScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <div className="scan-screen face-prep-screen">
      <ScanHeader title="Face scan" subtitle="Step 1 of 3 · Get ready" onBack={goBack} />
      <div className="scan-body">
        <div className="scan-split">
          <div className="scan-split-main">
            <div className="scan-progress" aria-label="Step 1 of 3">
              <span className="scan-progress-bar" style={{ width: '33%' }} />
            </div>
            <h2 className="scan-headline">Let’s get a clear skin scan</h2>
            <p className="scan-lead">Three quick checks help us suggest products that match what is visible today.</p>

            <div className="scan-stack">
              {prepSteps.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="scan-tip-card">
                  <span className="scan-tip-icon">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="scan-card-title">{title}</h3>
                    <p className="scan-card-body">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="scan-split-side">
            <div className="scan-consent-card">
              <div className="scan-consent-title">
                <ShieldCheck size={20} />
                <div>
                  <h3 className="scan-card-title">Your photo, your choice</h3>
                  <p className="scan-card-body">Your photo is used only for this cosmetic skin assessment. It is not a medical diagnosis.</p>
                </div>
              </div>
              <label className="scan-consent-check">
                <input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} />
                <span>I agree to my photo being processed for non-medical skincare suggestions.</span>
              </label>
            </div>

            <button type="button" className="scan-primary-button" disabled={!consentChecked} onClick={() => navigate('face-capture')}>
              <Camera size={19} />
              Open camera
              <ChevronRight size={18} />
            </button>
            <button type="button" className="scan-secondary-button" disabled={!consentChecked} onClick={() => navigate('scan-gallery')}>
              <ImageIcon size={18} />
              Upload a photo instead
            </button>
            {!consentChecked && <p className="scan-privacy">Tick the box above to continue.</p>}
            <button type="button" className="scan-text-button" onClick={() => navigate('home')}>
              Shop instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
