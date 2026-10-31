import React from 'react';
import { Camera, CheckCircle2, Image as ImageIcon, ShieldCheck } from 'lucide-react';
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
    headline: 'AI analysis is not available yet',
    title: 'Analysis service unavailable',
    body: 'We could not reach the skin analysis service. Check your connection and try again.',
  },
  invalid_response: {
    headline: 'AI analysis is not available yet',
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
  'Try retaking the scan photo',
  'Move to brighter, even light',
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
      <ScanHeader title="GlowVAI scan" subtitle="Beauty · smarter · faster" onBack={goBack} />
      <div className="scan-body">
        <h2 className="scan-headline">{copy.headline}</h2>
        <p className="scan-error-title">{copy.title}</p>
        <p className="scan-lead">{copy.body}</p>

        <div className="scan-diagnostic">
          <span className="scan-diagnostic-title">Diagnostic details</span>
          <span className="scan-diagnostic-row">Reason: {reason}</span>
          {details && <span className="scan-diagnostic-row">{details}</span>}
        </div>

        <h3 className="scan-section-label">Next steps</h3>
        <ul className="scan-check-list">
          {NEXT_STEPS.map((step) => (
            <li key={step} className="scan-check-item">
              <CheckCircle2 size={16} />
              {step}
            </li>
          ))}
        </ul>

        <p className="scan-privacy">
          <ShieldCheck size={14} /> Your photo is used only for this skin assessment.
        </p>

        <button type="button" className="scan-primary-button" onClick={() => navigate('scan-camera')}>
          <Camera size={18} />
          Try again
        </button>
        <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-gallery')}>
          <ImageIcon size={18} />
          Choose another photo
        </button>
        <button type="button" className="scan-text-button" onClick={() => navigate('home')}>
          Continue shopping
        </button>
      </div>
    </div>
  );
};
