import React, { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { measureLuminance } from '../../core/services/imagePreprocessing';
import { ScanHeader } from './components/ScanHeader';

type CameraStatus = 'starting' | 'ready' | 'denied' | 'unavailable';
type Lighting = 'ok' | 'dark' | 'bright';

// Mean luminance thresholds (0–1), same as the mobile validation
const DARK_BELOW = 0.32;
const BRIGHT_ABOVE = 0.9;
const LIGHT_CHECK_MS = 500;

const LIGHTING_MESSAGE: Record<Lighting, string> = {
  ok: 'Lighting looks good. Keep your face centred.',
  dark: 'Too dark. Move closer to a window or light source.',
  bright: 'Too bright. Move out of direct light.',
};

export const ScanCameraScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<CameraStatus>('starting');
  const [lighting, setLighting] = useState<Lighting>('ok');
  const [capturing, setCapturing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Request the front camera (browser permission prompt)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setStatus('starting');

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      }
    };

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  // Live lighting check on a downsampled frame
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const luminance = measureLuminance(video, 64, 48);
      if (luminance < DARK_BELOW) setLighting('dark');
      else if (luminance > BRIGHT_ABOVE) setLighting('bright');
      else setLighting('ok');
    }, LIGHT_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [status]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || status !== 'ready' || lighting !== 'ok' || capturing) return;
    if (!video.videoWidth || !video.videoHeight) return;

    setCapturing(true);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCapturing(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;
        const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
        navigate('scan-preview', { file, previewUrl: URL.createObjectURL(file) });
      },
      'image/jpeg',
      0.92
    );
  };

  const isBlocked = status === 'denied' || status === 'unavailable';
  const captureDisabled = status !== 'ready' || lighting !== 'ok' || capturing;

  return (
    <div className="scan-screen scan-camera-screen">
      <ScanHeader title="AI viewfinder" onBack={goBack} />

      <div className="scan-body scan-camera-body">
        {isBlocked && (
          <div className="scan-permission">
            <span className="scan-permission-icon">
              <ShieldAlert size={36} />
            </span>
            <h2 className="scan-headline">
              {status === 'denied' ? 'Camera permission needed' : 'No camera available'}
            </h2>
            <p className="scan-lead">
              {status === 'denied'
                ? 'The browser blocked camera access. Allow the camera for this site in your browser’s address bar, then try again.'
                : 'We could not open a camera on this device. Try another device, or upload a photo instead.'}
            </p>
            <button type="button" className="scan-primary-button" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw size={18} />
              Try again
            </button>
            <button type="button" className="scan-secondary-button" onClick={() => navigate('scan-gallery')}>
              <ImageIcon size={18} />
              Upload a photo instead
            </button>
          </div>
        )}

        {/* The video stays mounted so a retry can attach a new stream */}
        <div className="scan-split">
          <div className="scan-video-frame" hidden={isBlocked}>
            <video ref={videoRef} className="scan-video" playsInline muted autoPlay />
            <div className="scan-guide-oval" aria-hidden="true" />
            {status === 'starting' && <p className="scan-video-status">Starting camera…</p>}
          </div>

          {!isBlocked && (
            <div className="scan-split-side">
              <p className={`scan-lighting-note scan-lighting-${lighting}`} role="status">
                {status === 'ready' ? LIGHTING_MESSAGE[lighting] : 'Allow camera access when your browser asks.'}
              </p>
              <button type="button" className="scan-capture-button" onClick={handleCapture} disabled={captureDisabled}>
                <Camera size={22} />
                {capturing ? 'Capturing…' : 'Capture photo'}
              </button>
              <button type="button" className="scan-text-button" onClick={() => navigate('scan-gallery')}>
                Choose from gallery instead
              </button>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} hidden />
    </div>
  );
};
