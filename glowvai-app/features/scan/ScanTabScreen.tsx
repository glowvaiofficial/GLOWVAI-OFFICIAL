import React, { useEffect, useState } from 'react';
import { Camera, FileText, Image as ImageIcon, ScanFace, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { loadLatestScanResult } from './services/scanHistory';

// What the model actually reports (skin type plus the five concern labels in skinModelService).
const CHECKS = ['Skin type', 'Oiliness', 'Dryness', 'Redness', 'Uneven tone', 'Visible blemishes'];

const HOW_IT_WORKS = [
  { title: 'Take or upload a photo', body: 'Face the camera in even light, without glasses.' },
  { title: 'We check what is visible', body: 'Skin type and five common concerns, in a few seconds.' },
  { title: 'Get a simple routine', body: 'Four steps picked from our shop for what the scan found.' },
];

export const ScanTabScreen: React.FC = () => {
  const { navigate } = useApp();
  const [hasPreviousReport, setHasPreviousReport] = useState(false);

  useEffect(() => {
    let active = true;
    loadLatestScanResult().then((result) => {
      if (active && result) setHasPreviousReport(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="scan-screen scan-tab-screen">
      <div className="scan-body scan-tab-body">
        <div className="scan-split">
          <div className="scan-split-main">
            <div className="scan-tab-header">
              <span className="scan-badge">Cosmetic skin check</span>
              <h1 className="scan-tab-title">Face scan</h1>
              <p className="scan-tab-subtitle">One clear photo shows your skin type and five visible concerns, with a routine to match.</p>
            </div>

            <div className="scan-target-card">
              <div className="scan-target-icon">
                <ScanFace size={56} strokeWidth={1.6} />
              </div>
              <h2 className="scan-target-heading">What the scan checks</h2>
              <div className="scan-metric-grid">
                {CHECKS.map((name) => (
                  <span key={name} className="scan-metric-pill">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="scan-split-side">
            <h2 className="scan-section-title scan-desktop-only">How it works</h2>
            <ol className="scan-how-list scan-desktop-only">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <b>{step.title}</b>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
              <Camera size={20} />
              Start face scan
            </button>
            <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-gallery')}>
              <ImageIcon size={18} />
              Upload a photo
            </button>
            {hasPreviousReport && (
              <button type="button" className="scan-text-button" onClick={() => navigate('scan-report')}>
                <FileText size={16} />
                View latest skin report
              </button>
            )}
            <p className="scan-privacy">
              <ShieldCheck size={14} /> Cosmetic assessment only, not a medical diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
