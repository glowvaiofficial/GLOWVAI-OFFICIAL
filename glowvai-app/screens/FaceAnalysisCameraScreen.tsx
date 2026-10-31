import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';

export const FaceAnalysisCameraScreen: React.FC = () => {
  const { navigate, goBack, setCapturedFaceImage, activeParams } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start front camera
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setStreamActive(true);
        }
      } catch {
        // No stock or placeholder photo is substituted. Without a live camera the customer cannot capture.
        setCameraError('Camera access is blocked or unavailable. Allow camera access in your browser settings and try again.');
      }
    };

    if (!capturedImage) {
      startCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [capturedImage]);

  // Capture frame
  const handleCapture = () => {
    if (!streamActive || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    setCapturedFaceImage(capturedImage);
    navigate('face-loading', {
      retainImage: activeParams?.retainImage ?? true,
      image: capturedImage,
    });
  };

  return (
    <div
      className="face-capture-screen"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Controls */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        }}
      >
        <button
          onClick={goBack}
          aria-label="Go back"
          style={{
            padding: '8px',
            borderRadius: '999px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            color: '#FFFFFF',
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <span style={{ fontSize: '13px', fontWeight: 600, color: '#E2E5EB' }}>
          {capturedImage ? 'Review Capture' : 'Position Face in Oval'}
        </span>

        <div style={{ width: '36px' }} />
      </div>

      {/* Main Viewfinder / Canvas Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // mirror for natural selfie feel
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Oval Guide Overlay */}
            <div
              style={{
                position: 'absolute',
                width: '240px',
                height: '320px',
                borderRadius: '50%',
                border: '2px dashed #00C2FF',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                pointerEvents: 'none',
              }}
            />

            {/* Notice if camera was blocked */}
            {cameraError && (
              <div
                style={{
                  position: 'absolute',
                  top: '80px',
                  left: '20px',
                  right: '20px',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  fontSize: '12px',
                  lineHeight: '18px',
                  textAlign: 'center',
                  color: '#818896',
                }}
              >
                {cameraError}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={capturedImage}
              alt="Face preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Quality Check Pill */}
            <div
              style={{
                position: 'absolute',
                top: '70px',
                left: '20px',
                right: '20px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={14} color="#10B981" />
              <span style={{ fontSize: '11px', color: '#E2E5EB' }}>Photo captured. Check that your face is clearly visible before you continue.</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter / Action Controls */}
      <div
        style={{
          padding: '24px 20px 32px 20px',
          backgroundColor: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 20,
        }}
      >
        {!capturedImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
            <button
              onClick={handleCapture}
              disabled={!streamActive}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '4px solid #2854C5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(26, 115, 232, 0.5)',
                opacity: streamActive ? 1 : 0.4,
              }}
              aria-label="Capture photo"
            >
              <Camera size={28} color="#2854C5" />
            </button>
            <span style={{ fontSize: '12px', color: '#818896' }}>Tap to capture diagnostic photo</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={handleRetake}
              style={{
                flex: 1,
                height: '48px',
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={16} />
              <span>Retake</span>
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 2,
                height: '48px',
                backgroundColor: '#2854C5',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Check size={18} />
              <span>Proceed to Analysis</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
