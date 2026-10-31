import React, { useState } from 'react';
import { Camera, Check, ChevronRight, EyeOff, ShieldCheck, Sparkles, SunMedium, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';

const prepSteps = [
  { icon: <SunMedium size={21} />, title: 'Face a soft light', copy: 'Stand near a window. Keep strong backlight behind the phone, not behind you.', tone: 'sun' },
  { icon: <EyeOff size={21} />, title: 'Keep your face bare', copy: 'Remove glasses and heavy makeup so the scan can see your skin clearly.', tone: 'blue' },
  { icon: <Sparkles size={21} />, title: 'Hold still for a moment', copy: 'Center your face in the guide. The capture takes only a few seconds.', tone: 'green' },
];

export const FaceAnalysisPrepScreen: React.FC = () => {
  const { navigate } = useApp();
  const [consentChecked, setConsentChecked] = useState(true);
  const [retainChoice, setRetainChoice] = useState<'retain' | 'auto_delete'>('auto_delete');

  return (
    <main className="scan-prep">
      <header className="scan-prep-header">
        <button onClick={() => navigate('home')}>Shop instead</button>
        <div className="scan-step"><span>1</span><i /><span>2</span></div>
        <h1>Let’s get a clear skin scan.</h1>
        <p>Three quick checks help us recommend products that better match what is visible today.</p>
      </header>

      <section className="prep-checks" aria-labelledby="prep-heading">
        <h2 id="prep-heading">Before you open the camera</h2>
        {prepSteps.map((step, index) => (
          <article key={step.title}>
            <span className={`prep-icon prep-icon--${step.tone}`}>{step.icon}</span>
            <div><b>{step.title}</b><p>{step.copy}</p></div>
            <span className="prep-number">0{index + 1}</span>
          </article>
        ))}
      </section>

      <section className="photo-choice" aria-labelledby="photo-choice-heading">
        <div className="photo-choice-title"><ShieldCheck size={20} /><div><h2 id="photo-choice-heading">Your photo, your choice</h2><p>Used only to create this cosmetic report.</p></div></div>
        <div className="retention-options">
          <label className={retainChoice === 'auto_delete' ? 'is-selected' : ''}>
            <input type="radio" name="retention" checked={retainChoice === 'auto_delete'} onChange={() => setRetainChoice('auto_delete')} />
            <Trash2 size={18} /><span><b>Delete after my report</b><small>The original photo is removed after analysis.</small></span><Check size={17} />
          </label>
          <label className={retainChoice === 'retain' ? 'is-selected' : ''}>
            <input type="radio" name="retention" checked={retainChoice === 'retain'} onChange={() => setRetainChoice('retain')} />
            <Sparkles size={18} /><span><b>Save for progress</b><small>Keep it securely to compare future scans.</small></span><Check size={17} />
          </label>
        </div>
        <label className="scan-consent"><input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} /><span>I agree to photo processing for non-medical skincare recommendations.</span></label>
      </section>

      <div className="scan-prep-action">
        <button className="scan-start" disabled={!consentChecked} onClick={() => navigate('face-capture', { retainImage: retainChoice === 'retain' })}><Camera size={19} /><span>Open camera</span><ChevronRight size={18} /></button>
        <p><ShieldCheck size={13} /> Private by default. You can delete saved scans later.</p>
      </div>
    </main>
  );
};
