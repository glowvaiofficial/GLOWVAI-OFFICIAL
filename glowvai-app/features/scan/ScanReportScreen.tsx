import React, { useEffect, useState } from 'react';
import { AlertTriangle, Camera, RotateCcw, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { SkinAnalysisResult } from '../../core/services/skinModelService';
import { ScanHeader } from './components/ScanHeader';
import { RoutineSection } from './recommendations/RoutineSection';
import { loadLatestScanResult } from './services/scanHistory';

const SKIN_TYPE_LABEL: Record<SkinAnalysisResult['skinProfile']['skinType'], string> = {
  oily: 'Oily',
  dry: 'Dry',
  combination: 'Combination',
  normal: 'Normal',
  uncertain: 'Not confident enough',
};

const SEVERITY_LABEL: Record<SkinAnalysisResult['concerns'][number]['severity'], string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  pronounced: 'Pronounced',
};

export const ScanReportScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const passedResult = activeParams?.result as SkinAnalysisResult | undefined;
  const [stored, setStored] = useState<SkinAnalysisResult | null>(null);
  const [loaded, setLoaded] = useState(Boolean(passedResult));

  // Fall back to the latest saved scan when no result was passed in
  useEffect(() => {
    if (passedResult) return;
    let active = true;
    loadLatestScanResult().then((result) => {
      if (!active) return;
      setStored(result);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [passedResult]);

  const result = passedResult ?? stored;

  if (!loaded) {
    return (
      <div className="scan-screen">
        <ScanHeader title="Your glow profile" onBack={goBack} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="scan-screen">
        <ScanHeader title="Your glow profile" subtitle="No active scan found" onBack={goBack} />
        <div className="scan-body scan-empty">
          <span className="scan-permission-icon">
            <Sparkles size={36} />
          </span>
          <h2 className="scan-headline">Complete a scan to view your glow profile</h2>
          <p className="scan-lead">
            Capture a clear photo or select an image from your gallery to get your personalised cosmetic skin assessment.
          </p>
          <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
            <Camera size={18} />
            Start scan
          </button>
        </div>
      </div>
    );
  }

  const presentConcerns = result.concerns.filter((c) => c.present);
  const lowConfidence = result.status === 'low_confidence';

  return (
    <div className="scan-screen">
      <ScanHeader title="Your glow profile" subtitle="Cosmetic skin assessment" onBack={goBack} />
      <div className="scan-body scan-report-body">
        <div className="scan-split">
          <div className="scan-split-main">
            {lowConfidence && (
              <div className="scan-alert scan-alert-warn" role="status">
                <AlertTriangle size={18} />
                <span>
                  Low confidence result. Lighting or angle may have affected accuracy. Consider retaking your scan for more precise insights.
                </span>
              </div>
            )}

            <div className="scan-summary">
              <div className="scan-summary-cell">
                <span className="scan-summary-label">Skin type</span>
                <span className="scan-summary-value">{SKIN_TYPE_LABEL[result.skinProfile.skinType]}</span>
              </div>
              <div className="scan-summary-cell">
                <span className="scan-summary-label">Concerns</span>
                <span className="scan-summary-value">{presentConcerns.length} of {result.concerns.length}</span>
              </div>
              <div className="scan-summary-cell">
                <span className="scan-summary-label">Confidence</span>
                <span className="scan-summary-value">{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>

            <section className="scan-section">
              <h2 className="scan-section-title">Skin concerns</h2>
              <ul className="scan-concern-list">
                {result.concerns.map((concern) => (
                  <li key={concern.key} className="scan-concern-item">
                    <div className="scan-concern-head">
                      <span className="scan-concern-name">{concern.label}</span>
                      <span className={`scan-severity scan-severity-${concern.severity}`}>
                        {concern.present ? SEVERITY_LABEL[concern.severity] : 'Not detected'}
                      </span>
                    </div>
                    <div className="scan-meter" aria-hidden="true">
                      <span className="scan-meter-fill" style={{ width: `${Math.round(concern.score * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="scan-split-side">
            <RoutineSection />

            <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-camera')}>
              <RotateCcw size={18} />
              Retake scan
            </button>
          </div>
        </div>

        <p className="scan-disclaimer">{result.disclaimer}</p>
        <p className="scan-privacy">Your photo is used only for this skin assessment.</p>
        <p className="scan-model-note">
          {result.modelVersion} · {result.inferenceMethod === 'backend_cnn' ? 'CNN backend' : 'On-device model'}
        </p>
      </div>
    </div>
  );
};
