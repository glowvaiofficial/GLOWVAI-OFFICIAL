import React, { useRef, useState } from 'react';
import { Camera, ImageIcon, Upload } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ScanHeader } from './components/ScanHeader';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const TIPS = ['One face only', 'No sunglasses', 'Bright even light', 'No heavy filter'];

export const ScanGalleryScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG or WEBP).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is too large. Choose a photo under 20 MB.');
      return;
    }
    setError(null);
    navigate('scan-preview', { file, previewUrl: URL.createObjectURL(file) });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="scan-screen">
      <ScanHeader title="Choose a clear photo" onBack={goBack} />
      <div className="scan-body">
        <div className="scan-layout">
          <div className="scan-layout-main">
            <h2 className="scan-headline">Already have a photo?</h2>
            <p className="scan-lead">
              Choose a front-facing image with clear lighting for an accurate cosmetic skin assessment.
            </p>

            <div
              className={`scan-dropzone${dragging ? ' scan-dropzone-active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <span className="scan-dropzone-icon">
                <ImageIcon size={32} />
              </span>
              <p className="scan-dropzone-text">Drop a photo here, or choose one from your device</p>
              <button type="button" className="scan-primary-button" onClick={() => inputRef.current?.click()}>
                <Upload size={18} />
                Choose from gallery
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="scan-file-input"
                onChange={(event) => {
                  acceptFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>

            {error && (
              <p className="scan-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="scan-layout-side">
            <h3 className="scan-section-label">Photo quality tips</h3>
            <ul className="scan-tip-list">
              {TIPS.map((tip) => (
                <li key={tip} className="scan-tip-item">
                  {tip}
                </li>
              ))}
            </ul>

            <p className="scan-privacy">Your photo is used only for this skin assessment.</p>

            <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-camera')}>
              <Camera size={18} />
              Open camera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
