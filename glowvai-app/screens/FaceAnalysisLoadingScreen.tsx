import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, RefreshCw, ScanFace } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/entry-scan.css';

const stages = ['Checking the photo', 'Preparing your scan', 'Building your beauty guide', 'Preparing your report'];

export const FaceAnalysisLoadingScreen: React.FC = () => {
  const { navigate, runAnalysis, activeParams } = useApp();
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFailed(false); setStage(0);
    const stageTimer = setInterval(() => setStage((current) => Math.min(stages.length - 1, current + 1)), 1000);
    const execute = async () => {
      try {
        const report = await runAnalysis(activeParams?.image || '', activeParams?.retainImage ?? true);
        navigate('skin-report', { reportId: report.id });
      } catch {
        clearInterval(stageTimer);
        setFailed(true);
      }
    };
    execute();
    return () => clearInterval(stageTimer);
  }, [attempt]);

  if (failed) return <main className="scan-failed">
    <div><AlertCircle size={34} /><h1>We couldn’t read that photo.</h1><p>Nothing was saved. Try again in softer light and keep your face fully inside the guide.</p></div>
    <button onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={17} />Try analysis again</button>
    <button onClick={() => navigate('face-capture')}>Retake photo</button>
  </main>;

  return <main className="scan-loading">
    <div className="scan-animation"><ScanFace size={58} /><i /><span /></div>
    <p>Skin scan in progress</p><h1>{stages[stage]}</h1><small>This usually takes a few seconds.</small>
    <div className="scan-stage-list">{stages.map((item, index) => <span key={item} className={index < stage ? 'is-done' : index === stage ? 'is-current' : ''}>{index < stage ? <Check size={13} /> : <i />}{item}</span>)}</div>
  </main>;
};
