import React, { useEffect, useState } from 'react';
import { AlertCircle, Camera, ImageIcon, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ScanHeader } from './components/ScanHeader';

const MIN_SIDE_PX = 224; // the model input is 224×224; smaller photos cannot be read well

export const ScanPreviewScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const file: Blob | undefined = activeParams?.file;
  const previewUrl: string | undefined = activeParams?.previewUrl;
  const [photoError, setPhotoError] = useState<string | null>(
    file && previewUrl ? null : 'We couldn’t load the photo. Please capture it again or select an image from your gallery.'
  );
  const [verified, setVerified] = useState(false);

  // Confirm the image decodes and is large enough before analysis
  useEffect(() => {
    if (!previewUrl || !file) return;
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      if (img.naturalWidth < MIN_SIDE_PX || img.naturalHeight < MIN_SIDE_PX) {
        setPhotoError('This photo is too small. Use a higher-resolution image.');
        return;
      }
      setVerified(true);
    };
    img.onerror = () => {
      if (active) setPhotoError('We couldn’t read this photo. Try another image.');
    };
    img.src = previewUrl;
    return () => {
      active = false;
    };
  }, [file, previewUrl]);

  const canUse = verified && !photoError && !!file;

  return (
    <div className="scan-screen">
      <ScanHeader title="Review your photo" onBack={goBack} />
      <div className="scan-body">
        <div className="scan-layout">
          <div className="scan-preview-frame">
            {previewUrl && !photoError ? (
              <img className="scan-preview-image" src={previewUrl} alt="Your captured face" />
            ) : (
              <div className="scan-preview-empty">
                <ImageIcon size={36} />
              </div>
            )}
          </div>

          <div className="scan-layout-side">
            {photoError && (
              <div className="scan-alert" role="alert">
                <AlertCircle size={18} />
                <span>{photoError}</span>
              </div>
            )}

            {!photoError && (
              <p className="scan-lead">
                Make sure your face is centred and fully visible. Retake the photo if the lighting looks poor.
              </p>
            )}

            <button
              type="button"
              className="scan-primary-button"
              disabled={!canUse}
              onClick={() => navigate('scan-analyzing', { file, previewUrl })}
            >
              <Sparkles size={18} />
              Use this photo
            </button>
            <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-camera')}>
              <Camera size={18} />
              Retake photo
            </button>
            <button type="button" className="scan-text-button" onClick={() => navigate('scan-gallery')}>
              Choose another photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
