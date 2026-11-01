import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Camera, RotateCcw, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { SkinAnalysisResult } from '../../core/services/skinModelService';
import { CONCERN_GUIDANCE } from './concernGuidance';
import { ScanHeader } from './components/ScanHeader';
import { ConcernChip, ConcernLevel, SKIN_TYPE_LABEL, sortConcerns } from './components/ConcernLevel';
import { RoutineSection } from './recommendations/RoutineSection';
import { loadLatestScanEntry } from './services/scanHistory';

interface ScanReportContentProps {
  result: SkinAnalysisResult;
  savedAt?: number | null;
}

/** The report body: summary, every concern with what it means and what helps, and the starter routine. */
export const ScanReportContent: React.FC<ScanReportContentProps> = ({ result, savedAt }) => {
  const { navigate } = useApp();
  const present = result.concerns.filter((c) => c.present);
  const lowConfidence = result.status === 'low_confidence';
  const skinType = result.skinProfile.skinType;
  const scannedOn = savedAt ? new Date(savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <>
      <div className="scan-layout scan-report-layout">
        <div className="scan-layout-main">
          <section className="scan-report-hero">
            <span className="scan-report-kicker">{scannedOn ? `Scanned ${scannedOn}` : 'Your latest scan'}</span>
            <h2 className="scan-headline">{skinType === 'uncertain' ? 'Skin type unclear' : `${SKIN_TYPE_LABEL[skinType]} skin`}</h2>
            <p className="scan-lead">
              {present.length
                ? `${present.length} of ${result.concerns.length} concerns were visible in this photo. Each one explains what it means and what usually helps.`
                : `None of the ${result.concerns.length} concerns we check were clearly visible in this photo.`}
            </p>
          </section>

          {lowConfidence && (
            <div className="scan-alert scan-alert-warn" role="status">
              <AlertTriangle size={18} />
              <span>Low confidence result. Lighting or angle may have affected it, so a retake in even light may give a clearer reading.</span>
            </div>
          )}

          <div className="scan-summary">
            <div className="scan-summary-cell">
              <span className="scan-summary-label">Skin type</span>
              <span className="scan-summary-value">{SKIN_TYPE_LABEL[skinType]}</span>
            </div>
            <div className="scan-summary-cell">
              <span className="scan-summary-label">Visible concerns</span>
              <span className="scan-summary-value">{present.length} of {result.concerns.length}</span>
            </div>
            <div className="scan-summary-cell">
              <span className="scan-summary-label">Confidence</span>
              <span className="scan-summary-value">{Math.round(result.confidence * 100)}%</span>
            </div>
          </div>

          <section className="scan-section">
            <h2 className="scan-section-title">What we noticed</h2>
            <ul className="scan-concern-list">
              {sortConcerns(result.concerns).map((concern) => {
                const guide = CONCERN_GUIDANCE[concern.key];
                return (
                  <li key={concern.key} className={`scan-concern-item${concern.present ? ' is-present' : ''}`}>
                    <div className="scan-concern-head">
                      <h3 className="scan-concern-name">{concern.label}</h3>
                      <ConcernChip concern={concern} />
                    </div>
                    <ConcernLevel concern={concern} />
                    {concern.present && guide ? (
                      <>
                        <div className="scan-guide">
                          <h4>What it means</h4>
                          <p>{guide.meaning}</p>
                        </div>
                        <div className="scan-guide is-helps">
                          <h4>What helps</h4>
                          <ul>
                            {guide.helps.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                        <button type="button" className="scan-link-button" onClick={() => navigate('scan-concern', { concern: concern.key, result })}>
                          View details <ArrowRight size={15} />
                        </button>
                      </>
                    ) : (
                      <p className="scan-concern-quiet">Not clearly visible in this photo.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="scan-layout-side">
          <RoutineSection />
          <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-intro')}>
            <RotateCcw size={18} />
            Retake scan
          </button>
        </aside>
      </div>

      <footer className="scan-report-footer">
        <p className="scan-disclaimer">{result.disclaimer}</p>
        <p className="scan-privacy">Your photo is used only for this skin assessment.</p>
        <p className="scan-model-note">
          Model {result.modelVersion} · {result.inferenceMethod === 'backend_cnn' ? 'analysed on our server' : 'analysed on this device'}
        </p>
      </footer>
    </>
  );
};

/** Empty state when no scan has been saved in this browser. */
export const ScanReportEmpty: React.FC = () => {
  const { navigate } = useApp();
  return (
    <div className="scan-body scan-empty">
      <span className="scan-permission-icon">
        <Sparkles size={34} />
      </span>
      <h2 className="scan-headline">No skin report yet</h2>
      <p className="scan-lead">Take one clear photo of your face and we will show what is visible today, what it means and a simple routine.</p>
      <button type="button" className="scan-primary-button" onClick={() => navigate('scan-intro')}>
        <Camera size={18} />
        Start a scan
      </button>
    </div>
  );
};

export const ScanReportScreen: React.FC = () => {
  const { goBack, activeParams } = useApp();
  const passedResult = activeParams?.result as SkinAnalysisResult | undefined;
  const [stored, setStored] = useState<{ savedAt: number | null; result: SkinAnalysisResult } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Read the saved scan for its date; the passed result (fresh from analysis) wins when present.
  useEffect(() => {
    let active = true;
    loadLatestScanEntry().then((entry) => {
      if (!active) return;
      setStored(entry);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const result = passedResult ?? stored?.result ?? null;
  const savedAt = passedResult ? (stored?.result.scanId === passedResult.scanId ? stored.savedAt : Date.now()) : stored?.savedAt;

  return (
    <div className="scan-screen scan-report-screen">
      <ScanHeader title="Your skin report" subtitle={result ? 'Cosmetic skin assessment' : undefined} onBack={goBack} />
      {!loaded && !passedResult ? null : result ? (
        <div className="scan-body scan-report-body">
          <ScanReportContent result={result} savedAt={savedAt} />
        </div>
      ) : (
        <ScanReportEmpty />
      )}
    </div>
  );
};
