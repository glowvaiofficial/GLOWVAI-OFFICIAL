import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { SkinAnalysisResult } from '../../../core/services/skinModelService';
import { metricFillPercent, metricLevel, metricScoreText } from '../services/scanDisplay';
import { RoutineSection } from '../recommendations/RoutineSection';

const SKIN_TYPE_LABEL: Record<SkinAnalysisResult['skinProfile']['skinType'], string> = {
  oily: 'Oily',
  dry: 'Dry',
  combination: 'Combination',
  normal: 'Normal',
  uncertain: 'Not sure',
};

const SEVERITY_LABEL: Record<SkinAnalysisResult['concerns'][number]['severity'], string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  pronounced: 'Pronounced',
};

interface ScanResultViewProps {
  result: SkinAnalysisResult;
  onRetake: () => void;
}

/** The result of a real analysis: skin type, the five visible concerns and a catalogue routine. */
export const ScanResultView: React.FC<ScanResultViewProps> = ({ result, onRetake }) => {
  const concerns = result.concerns.filter((c) => !(result.hiddenConcerns ?? []).includes(c.key));
  const presentConcerns = concerns.filter((c) => c.present);
  const lowConfidence = result.status === 'low_confidence';

  return (
    <>
      <div className="scan-split scan-report-split">
        <div className="scan-split-main">
          {lowConfidence && (
            <div className="scan-alert scan-alert-warn" role="status">
              <AlertTriangle size={18} />
              <span>Low confidence result. Lighting or angle may have affected it. Retaking the scan in even light can help.</span>
            </div>
          )}

          {result.skinScore && (
            <div className="scan-skin-score">
              <span className="v5-ring">
                <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                  <circle className="v5-ring-track" cx="60" cy="60" r="52" />
                  <circle className="v5-ring-fill" cx="60" cy="60" r="52" pathLength={100} strokeDasharray={`${Math.max(0, Math.min(100, result.skinScore.score))} 100`} />
                </svg>
                <span className="scan-skin-score-num" aria-label={`Skin score ${result.skinScore.score} out of 100`}>{result.skinScore.score}</span>
              </span>
              <div>
                <span className="scan-summary-value">Skin score{result.skinScore.label ? `: ${result.skinScore.label}` : ''}</span>
                <span className="scan-summary-label">{result.skinScore.caption}</span>
              </div>
            </div>
          )}

          <div className="scan-summary">
            <div className="scan-summary-cell">
              <span className="scan-summary-label">Skin type</span>
              <span className="scan-summary-value">{SKIN_TYPE_LABEL[result.skinProfile.skinType]}</span>
            </div>
            <div className="scan-summary-cell">
              <span className="scan-summary-label">Concerns seen</span>
              <span className="scan-summary-value">
                {presentConcerns.length} of {concerns.length}
              </span>
            </div>
            <div className="scan-summary-cell">
              <span className="scan-summary-label">Model confidence</span>
              <span className="scan-summary-value">{Math.round(result.confidence * 100)}%</span>
            </div>
          </div>

          {result.metrics ? (
            result.metrics.length > 0 && (
              <section className="scan-section">
                <h2 className="scan-section-title">What we measured</h2>
                <ul className="scan-concern-list">
                  {result.metrics.map((m) => {
                    const fill = metricFillPercent(m.score);
                    const text = metricScoreText(m.score);
                    return (
                      <li key={m.key} className={`scan-concern-item${m.score >= 0.5 ? ' is-present' : ''}`}>
                        <div className="scan-concern-head">
                          <span className="scan-concern-name">{m.label}</span>
                          {m.estimate && <span className="scan-severity scan-severity-none">Estimate</span>}
                          <span className="scan-severity scan-severity-mild">{metricLevel(m.score)}{text ? `, ${text}` : ''}</span>
                        </div>
                        {fill && (
                          <div className="scan-meter" aria-hidden="true">
                            <span className="scan-meter-fill" style={{ width: `${fill}%` }} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )
          ) : concerns.length > 0 && (
          <section className="scan-section">
            <h2 className="scan-section-title">Visible skin concerns</h2>
            <ul className="scan-concern-list">
              {concerns.map((concern) => (
                <li key={concern.key} className={`scan-concern-item${concern.present ? ' is-present' : ''}`}>
                  <div className="scan-concern-head">
                    <span className="scan-concern-name">{concern.label}</span>
                    <span className={`scan-severity ${concern.present ? `scan-severity-${concern.severity}` : 'scan-severity-none'}`}>
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
          )}

          <p className="scan-disclaimer">{result.disclaimer}</p>
        </div>

        <div className="scan-split-side">
          <RoutineSection result={result} />
          <button type="button" className="scan-secondary-button" onClick={onRetake}>
            <RotateCcw size={18} />
            Retake scan
          </button>
          <p className="scan-privacy">Your photo is used only for this skin assessment.</p>
        </div>
      </div>
    </>
  );
};
