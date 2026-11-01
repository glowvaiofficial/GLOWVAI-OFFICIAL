import React, { useEffect, useState } from 'react';
import { Camera, ChevronRight, Droplets, FileText, Image as ImageIcon, ScanFace, ShieldCheck, Sparkles, Sun, CircleDot } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { SkinAnalysisResult } from '../../core/services/skinModelService';
import { SKIN_TYPE_LABEL } from './components/ConcernLevel';
import { loadLatestScanEntry } from './services/scanHistory';

// The five concerns the skin model scores, plus skin type. Matches CONCERN_LABELS in skinModelService.
const CHECKS = [
  { label: 'Oiliness', icon: Droplets },
  { label: 'Dryness', icon: Droplets },
  { label: 'Redness', icon: CircleDot },
  { label: 'Uneven tone', icon: Sun },
  { label: 'Visible blemishes', icon: Sparkles },
  { label: 'Skin type', icon: ScanFace },
];

const STEPS = [
  { title: 'Take one clear photo', body: 'Use your camera or upload a front-facing photo in even light.' },
  { title: 'We read what is visible', body: 'A skin model looks for five common cosmetic concerns.' },
  { title: 'Get a simple routine', body: 'See what each result means, what helps, and products to start with.' },
];

export const ScanTabScreen: React.FC = () => {
  const { navigate } = useApp();
  const [latest, setLatest] = useState<{ savedAt: number | null; result: SkinAnalysisResult } | null>(null);

  useEffect(() => {
    let active = true;
    loadLatestScanEntry().then((entry) => {
      if (active) setLatest(entry);
    });
    return () => {
      active = false;
    };
  }, []);

  const latestPresent = latest ? latest.result.concerns.filter((c) => c.present).length : 0;
  const latestDate = latest?.savedAt ? new Date(latest.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

  return (
    <div className="scan-screen scan-tab-screen">
      <div className="scan-body scan-tab-body">
        <header className="scan-tab-header">
          <span className="scan-badge">Cosmetic skin check</span>
          <h1 className="scan-tab-title">Face scan</h1>
          <p className="scan-tab-subtitle">One photo shows what is visible on your skin today and a simple routine to match.</p>
        </header>

        <div className="scan-tab-grid">
          <section className="scan-target-card" aria-labelledby="scan-checks-title">
            <div className="scan-target-icon" aria-hidden="true">
              <ScanFace size={48} strokeWidth={1.6} />
            </div>
            <h2 id="scan-checks-title" className="scan-target-heading">What the scan looks at</h2>
            <ul className="scan-metric-grid">
              {CHECKS.map(({ label, icon: Icon }) => (
                <li key={label} className="scan-metric-pill">
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <div className="scan-tab-side">

            <div className="scan-tab-actions">
              <button type="button" className="scan-primary-button" onClick={() => navigate('scan-intro')}>
                <Camera size={20} />
                Start face scan
              </button>
              <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-gallery')}>
                <ImageIcon size={18} />
                Upload a photo
              </button>
            </div>

            {latest && (
              <button type="button" className="scan-latest-card" onClick={() => navigate('scan-report')}>
                <span className="scan-latest-icon" aria-hidden="true"><FileText size={20} /></span>
                <span className="scan-latest-copy">
                  <b>Your latest report{latestDate ? ` · ${latestDate}` : ''}</b>
                  <small>
                    {SKIN_TYPE_LABEL[latest.result.skinProfile.skinType]} skin · {latestPresent} of {latest.result.concerns.length} concerns visible
                  </small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            )}

            <ol className="scan-how-list">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span aria-hidden="true">{index + 1}</span>
                  <div>
                    <b>{step.title}</b>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="scan-privacy">
              <ShieldCheck size={14} /> Cosmetic guidance only, not a medical diagnosis. Your photo is used only for this assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
