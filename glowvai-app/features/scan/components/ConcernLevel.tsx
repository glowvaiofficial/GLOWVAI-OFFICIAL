import React from 'react';
import type { SkinAnalysisResult } from '../../../core/services/skinModelService';

type Concern = SkinAnalysisResult['concerns'][number];

export const SEVERITY_LABEL: Record<Concern['severity'], string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  pronounced: 'Pronounced',
};

export const SKIN_TYPE_LABEL: Record<SkinAnalysisResult['skinProfile']['skinType'], string> = {
  oily: 'Oily',
  dry: 'Dry',
  combination: 'Combination',
  normal: 'Normal',
  uncertain: 'Unclear',
};

export const concernStatus = (concern: Concern) => (concern.present ? SEVERITY_LABEL[concern.severity] : 'Not detected');

/** Present concerns first, most visible first; the rest keep the model's order. */
export const sortConcerns = (concerns: Concern[]) =>
  [...concerns].sort((a, b) => Number(b.present) - Number(a.present) || (a.present && b.present ? b.score - a.score : 0));

export const ConcernChip: React.FC<{ concern: Concern }> = ({ concern }) => (
  <span className={`scan-severity ${concern.present ? `scan-severity-${concern.severity}` : 'scan-severity-none'}`}>{concernStatus(concern)}</span>
);

/**
 * How visible the concern looked in the photo, on a labelled scale. A fuller bar means the concern
 * was more visible, which is not better or worse skin, so both ends of the scale are named.
 */
export const ConcernLevel: React.FC<{ concern: Concern }> = ({ concern }) => {
  const percent = Math.max(4, Math.min(100, Math.round(concern.score * 100)));
  return (
    <div className="scan-level">
      <div className="scan-level-head">
        <span>How visible in your photo</span>
      </div>
      <div
        className={`scan-level-track${concern.present ? '' : ' is-quiet'}`}
        role="meter"
        aria-label={`${concern.label}: how visible in your photo`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(concern.score * 100)}
        aria-valuetext={concernStatus(concern)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="scan-level-scale" aria-hidden="true">
        <span>Barely visible</span>
        <span>Very visible</span>
      </div>
    </div>
  );
};
