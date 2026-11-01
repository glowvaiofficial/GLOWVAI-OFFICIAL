import React from 'react';
import { AlertCircle, Camera, CheckCircle2, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ScanHeader } from './components/ScanHeader';
import type { ScanFailureReason } from './services/scanApi';

interface FailureCopy {
  headline: string;
  title: string;
  body: string;
}

const COPY: Record<ScanFailureReason | 'default', FailureCopy> = {
  photo_missing: {
    headline: 'Captured photo not found',
    title: 'Photo loading error',
    body: 'We couldn’t load the photo. Please capture it again or select an image from your gallery.',
  },
  backend_unreachable: {
    headline: 'Skin analysis is not available right now',
    title: 'Analysis service unavailable',
    body: 'We could not reach the skin analysis service. Check your connection and try again.',
  },
  invalid_response: {
    headline: 'Skin analysis is not available right now',
    title: 'Unexpected analysis response',
    body: 'The analysis service returned a result we could not read. Please try again in a moment.',
  },
  timeout: {
    headline: 'Analysis took too long',
    title: 'Request timed out',
    body: 'Try again on a stronger connection, in better light, with your face clearly visible.',
  },
  processing_error: {
    headline: 'Let’s try that again',
    title: 'We couldn’t get a clear scan',
    body: 'A few small changes will help us read your skin more clearly.',
  },
  default: {
    headline: 'Let’s try that again',
    title: 'We couldn’t get a clear scan',
    body: 'A few small changes will help us read your skin more clearly.',
  },
};

const NEXT_STEPS = [
  'Move to bright, even light',
  'Keep your face centred',
  'Remove glasses or sunglasses',
  'Look directly at the camera',
];

export const ScanFailedScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const reason = (activeParams?.reason as ScanFailureReason | undefined) ?? 'default';
  const details = typeof activeParams?.details === 'string' ? activeParams.details : '';
  const copy = COPY[reason] ?? COPY.default;

  return (
    <div className="scan-screen">
      <ScanHeader title="Skin scan" subtitle="We could not finish this scan" onBack={goBack} />
      <div className="scan-body scan-failed-body">
        <div className="scan-failed-head">
          <span className="scan-permission-icon is-warn" aria-hidden="true">
            <AlertCircle size={34} />
          </span>
          <h2 className="scan-headline">{copy.headline}</h2>
          <p className="scan-lead">{copy.body}</p>
        </div>

        <section className="scan-card scan-next-steps">
          <h3 className="scan-section-label">Before you try again</h3>
          <ul className="scan-check-list">
            {NEXT_STEPS.map((step) => (
              <li key={step} className="scan-check-item">
                <CheckCircle2 size={16} />
                {step}
              </li>
            ))}
          </ul>
        </section>

        <div className="scan-failed-actions">
          <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
            <Camera size={18} />
            Try again
          </button>
          <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-gallery')}>
            <ImageIcon size={18} />
            Choose another photo
          </button>
          <button type="button" className="scan-text-button" onClick={() => navigate('shop-home')}>
            Continue shopping
          </button>
        </div>

        <p className="scan-privacy">
          <ShieldCheck size={14} /> Your photo is used only for this skin assessment.
        </p>

        <details className="scan-diagnostic">
          <summary className="scan-diagnostic-title">Technical details</summary>
          <span className="scan-diagnostic-row">{copy.title} ({reason})</span>
          {details && <span className="scan-diagnostic-row">{details}</span>}
        </details>
      </div>
    </div>
  );
};
