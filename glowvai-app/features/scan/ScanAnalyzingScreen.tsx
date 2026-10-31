import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { prepareModelInput } from '../../core/services/imagePreprocessing';
import {
  ON_DEVICE_INFERENCE_ENABLED,
  runSkinAnalysis,
  type SkinAnalysisResult,
} from '../../core/services/skinModelService';
import { ScanError, analyzeFaceImage } from './services/scanApi';
import { saveScanResult } from './services/scanHistory';

const STEPS = [
  'Analysing sebum & oiliness…',
  'Checking skin tone & texture…',
  'Detecting active concerns…',
  'Building your skin profile…',
] as const;

const STEP_INTERVAL_MS = 2200;
const WARN_TIMEOUT_MS = 10_000;
const HARD_TIMEOUT_MS = 25_000;
const COMPLETE_DELAY_MS = 500;

/** On-device path: full image, no skin mask (no face segmentation on web). */
async function analyzeOnDevice(file: Blob, scanId: string): Promise<SkinAnalysisResult> {
  const prepared = await prepareModelInput(file, null, new Uint8Array(224 * 224).fill(1));
  return runSkinAnalysis(prepared.maskedPixels, scanId);
}

export const ScanAnalyzingScreen: React.FC = () => {
  const { navigate, activeParams } = useApp();
  const file: Blob | undefined = activeParams?.file;
  const [stepIndex, setStepIndex] = useState(0);
  const [statusNote, setStatusNote] = useState('This usually takes 5–8 seconds');

  useEffect(() => {
    if (!file) {
      navigate('scan-failed', { reason: 'photo_missing' });
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    let completeTimer: number | undefined;

    const stepTimer = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    const warnTimer = window.setTimeout(() => {
      setStatusNote('Still working — this is taking a bit longer than usual.');
    }, WARN_TIMEOUT_MS);
    const hardTimer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, HARD_TIMEOUT_MS);

    const clearTimers = () => {
      window.clearInterval(stepTimer);
      window.clearTimeout(warnTimer);
      window.clearTimeout(hardTimer);
    };

    const run = async () => {
      try {
        const scanId = `SCAN-${Date.now()}`;
        const result = ON_DEVICE_INFERENCE_ENABLED
          ? await analyzeOnDevice(file, scanId)
          : await analyzeFaceImage(file, scanId, controller.signal);
        if (controller.signal.aborted) return;

        clearTimers();
        setStepIndex(STEPS.length - 1);
        await saveScanResult(result);
        completeTimer = window.setTimeout(() => navigate('scan-report', { result }), COMPLETE_DELAY_MS);
      } catch (err) {
        clearTimers();
        if (controller.signal.aborted && !timedOut) return; // left the screen
        const message = err instanceof Error ? err.message : String(err);
        const reason = timedOut ? 'timeout' : err instanceof ScanError ? err.reason : 'processing_error';
        navigate('scan-failed', { reason, details: message });
      }
    };

    run();

    return () => {
      clearTimers();
      if (completeTimer !== undefined) window.clearTimeout(completeTimer);
      controller.abort();
    };
  }, [file]);

  return (
    <div className="scan-screen scan-analyzing-screen">
      <div className="scan-body scan-analyzing-body">
        <div className="scan-orb" aria-hidden="true">
          <Sparkles size={40} />
        </div>
        <h1 className="scan-headline">Analysing your skin</h1>
        <p className="scan-lead" role="status">
          {statusNote}
        </p>

        <ul className="scan-step-list">
          {STEPS.map((label, index) => {
            const done = index < stepIndex || (index === stepIndex && stepIndex === STEPS.length - 1);
            const active = index === stepIndex && !done;
            return (
              <li
                key={label}
                className={`scan-step-item${done ? ' scan-step-done' : ''}${active ? ' scan-step-active' : ''}`}
              >
                {done ? <CheckCircle2 size={18} /> : <span className="scan-step-dot" />}
                <span>{label}</span>
              </li>
            );
          })}
        </ul>

        <p className="scan-privacy">
          <ShieldCheck size={14} /> Cosmetic assessment only. Not a medical diagnosis.
        </p>

        <button type="button" className="scan-text-button" onClick={() => navigate('scan-intro')}>
          Cancel
        </button>
      </div>
    </div>
  );
};
