import { useEffect, useState } from 'react';
import { Activity, Camera, Copy, Database, Globe, RefreshCw, Stethoscope, Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { apiLogger } from '../../core/services/apiLogger';
import { getCloudBackendUrl } from '../../core/services/apiConfig';
import { copyText, ProfileHeader } from './ProfileShared';

type CheckStatus = 'PASS' | 'WARN' | 'FAIL';

interface DoctorCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  icon: 'camera' | 'storage' | 'api' | 'runtime';
}

interface DoctorReport {
  ranAt: string;
  apiBaseUrl: string;
  apiLatencyMs: number | null;
  apiStatusCode: number | null;
  cameraCount: number;
  checks: DoctorCheck[];
}

const STORAGE_TEST_KEY = 'glowvai:app-doctor-test';
const SCORE_BY_STATUS: Record<CheckStatus, number> = { PASS: 100, WARN: 70, FAIL: 0 };

const checkStorage = (): DoctorCheck => {
  let ok = false;
  try {
    window.localStorage.setItem(STORAGE_TEST_KEY, 'valid');
    ok = window.localStorage.getItem(STORAGE_TEST_KEY) === 'valid';
    window.localStorage.removeItem(STORAGE_TEST_KEY);
  } catch {
    ok = false;
  }
  return {
    id: 'storage',
    label: 'Local storage read and write',
    status: ok ? 'PASS' : 'FAIL',
    detail: ok ? 'Saved preferences can be read and written.' : 'Browser storage is blocked. Preferences will not persist.',
    icon: 'storage',
  };
};

const checkCamera = async (): Promise<{ check: DoctorCheck; count: number }> => {
  let count = 0;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    count = devices.filter((device) => device.kind === 'videoinput').length;
  } catch {
    count = 0;
  }
  return {
    count,
    check: {
      id: 'camera',
      label: 'Camera',
      status: count > 0 ? 'PASS' : 'FAIL',
      detail: count > 0 ? `${count} camera${count === 1 ? '' : 's'} detected.` : 'No camera found, or the browser blocked device access.',
      icon: 'camera',
    },
  };
};

const checkRuntime = (): DoctorCheck => {
  if (!navigator.onLine) {
    return { id: 'runtime', label: 'Network and secure context', status: 'FAIL', detail: 'The browser is offline.', icon: 'runtime' };
  }
  if (!window.isSecureContext) {
    return { id: 'runtime', label: 'Network and secure context', status: 'WARN', detail: 'Page is not served over HTTPS. Camera features may be blocked.', icon: 'runtime' };
  }
  return { id: 'runtime', label: 'Network and secure context', status: 'PASS', detail: 'Online over a secure connection.', icon: 'runtime' };
};

const checkApi = async (baseUrl: string): Promise<{ check: DoctorCheck; latencyMs: number | null; statusCode: number | null }> => {
  const requestId = apiLogger.logStart('GET', '/health');
  const started = performance.now();
  try {
    const res = await fetch(`${baseUrl}/health`);
    const latencyMs = Math.round(performance.now() - started);
    // A 404 still proves the host answered, the same rule the mobile app uses.
    const reachable = res.ok || res.status === 404;
    apiLogger.logComplete(requestId, res.status, reachable);
    return {
      latencyMs,
      statusCode: res.status,
      check: {
        id: 'api',
        label: 'Backend reachability',
        status: res.ok ? 'PASS' : reachable ? 'WARN' : 'FAIL',
        detail: `HTTP ${res.status} in ${latencyMs} ms.`,
        icon: 'api',
      },
    };
  } catch {
    apiLogger.logComplete(requestId, 0, false, 'NETWORK_ERROR');
    return {
      latencyMs: null,
      statusCode: null,
      check: { id: 'api', label: 'Backend reachability', status: 'FAIL', detail: 'Request failed. The backend is unreachable from this browser.', icon: 'api' },
    };
  }
};

const runAllChecks = async (): Promise<DoctorReport> => {
  const baseUrl = getCloudBackendUrl();
  const storageCheck = checkStorage();
  const [camera, api] = await Promise.all([checkCamera(), checkApi(baseUrl)]);
  return {
    ranAt: new Date().toLocaleTimeString(),
    apiBaseUrl: baseUrl,
    apiLatencyMs: api.latencyMs,
    apiStatusCode: api.statusCode,
    cameraCount: camera.count,
    checks: [camera.check, storageCheck, api.check, checkRuntime()],
  };
};

const overallLabel = (score: number): string => {
  if (score >= 90) return 'Healthy';
  if (score >= 70) return 'Needs attention';
  return 'Critical';
};

const CheckIcon = ({ icon }: { icon: DoctorCheck['icon'] }) => {
  if (icon === 'camera') return <Camera size={18} />;
  if (icon === 'storage') return <Database size={18} />;
  if (icon === 'api') return <Globe size={18} />;
  return <Activity size={18} />;
};

export const AppDoctorScreen = () => {
  const { goBack, showToast } = useApp();
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunChecks = async () => {
    setIsRunning(true);
    try {
      setReport(await runAllChecks());
    } finally {
      setIsRunning(false);
    }
  };

  // Runs once on open; the refresh button reruns the checks.
  useEffect(() => {
    handleRunChecks();
  }, []);

  const score = report && report.checks.length > 0
    ? Math.round(report.checks.reduce((sum, check) => sum + SCORE_BY_STATUS[check.status], 0) / report.checks.length)
    : null;

  const handleCopyReport = async () => {
    if (!report) return;
    const ok = await copyText(JSON.stringify({ ...report, score }, null, 2));
    showToast(ok ? 'Diagnostics copied to clipboard' : 'Could not copy diagnostics');
  };

  const handleClearLogs = () => {
    apiLogger.clearLogs();
    showToast('Diagnostic logs cleared');
  };

  return (
    <main className="profile-screen">
      <ProfileHeader
        title="GlowVAI App Doctor"
        eyebrow="Diagnostics"
        onBack={goBack}
        right={(
          <button type="button" className="profile-icon-button" onClick={handleRunChecks} disabled={isRunning} aria-label="Run checks again">
            <RefreshCw size={18} className={isRunning ? 'profile-spin' : undefined} />
          </button>
        )}
      />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card profile-score">
          <div>
            <span className="profile-label">Overall system health</span>
            <p className="profile-card-title">{score === null ? 'Checking…' : overallLabel(score)}</p>
          </div>
          <span className="profile-score-value">{score ?? '–'}<small>/100</small></span>
        </section>

        <section className="profile-card profile-card-body">
          <div className="profile-meta-grid">
            <span>Last run: {report?.ranAt ?? 'Not run yet'}</span>
            <span>Platform: Web</span>
            <span>Cameras: {report?.cameraCount ?? '–'}</span>
            <span>API latency: {report?.apiLatencyMs != null ? `${report.apiLatencyMs} ms` : '–'}</span>
          </div>
          {report && <p className="profile-mono">API: {report.apiBaseUrl}</p>}
        </section>

        </div>

        <div className="profile-main">
        <p className="profile-label">Checks</p>
        <section className="profile-card">
          {(report?.checks ?? []).map((check) => (
            <div key={check.id} className="profile-check-row">
              <span className="profile-list-icon"><CheckIcon icon={check.icon} /></span>
              <span className="profile-check-copy">
                <span className="profile-list-title">{check.label}</span>
                <span className="profile-check-detail">{check.detail}</span>
              </span>
              <span className={`profile-pill ${check.status === 'PASS' ? 'is-success' : check.status === 'WARN' ? 'is-warning' : 'is-error'}`}>
                {check.status}
              </span>
            </div>
          ))}
          {!report && <p className="profile-empty">Running checks…</p>}
        </section>

        <p className="profile-card-sub">
          Face detector and CNN model checks run on the mobile app only and are not part of the web doctor.
        </p>

        <div className="profile-button-row">
          <button type="button" className="profile-button is-primary" onClick={handleRunChecks} disabled={isRunning}>
            <RefreshCw size={16} />
            {isRunning ? 'Running…' : 'Run all checks'}
          </button>
          <button type="button" className="profile-button is-outline" onClick={handleCopyReport} disabled={!report}>
            <Copy size={16} />
            Copy report
          </button>
        </div>
        <button type="button" className="profile-text-link" onClick={handleClearLogs}>
          <Trash2 size={14} /> Clear request logs
        </button>
        <p className="profile-card-sub"><Stethoscope size={14} /> Diagnostics are local to this browser and contain no account data.</p>
        </div>
      </div>
    </main>
  );
};
