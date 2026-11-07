import { useCallback, useEffect, useState } from 'react';
import { LogOut, Smartphone } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useApp } from '../../context/useApp';
import { auth } from '../../core/config/firebase';
import { ProfileHeader } from '../profile/ProfileShared';
import '../profile/profile.css';
import './privacy.css';
import { fetchDevices, removeDevice, signOutOtherDevices, type DeviceView } from './privacyApi';

const when = (ms: number) =>
  new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

// Security and devices: the devices signed in to this account, the "This device" marker, a last sign-in line, and the two
// sign-out actions. Signing out ends the browser's session; for a guest account the next session is a new guest account.
export const DevicesScreen = () => {
  const { goBack, showToast } = useApp();
  const [devices, setDevices] = useState<DeviceView[] | null>(null);
  const [max, setMax] = useState(10);
  const [lastSignInAt, setLastSignInAt] = useState<number | null>(null);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchDevices();
    if (res.ok && res.data) {
      setDevices(res.data.devices);
      setMax(res.data.max);
      setLastSignInAt(res.data.lastSignInAt);
      setGuest(res.data.guest);
      setError(null);
    } else {
      setError(res.error || 'Your devices could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const endLocalSession = async () => {
    try {
      await signOut(auth);
    } catch {
      // The session may already be gone. Either way this browser starts fresh on the next request.
    }
  };

  const signOutThisDevice = async () => {
    setBusy('this');
    const current = devices?.find((d) => d.current);
    if (current) {
      const res = await removeDevice(current.id);
      if (!res.ok) {
        setBusy(null);
        showToast(res.error || 'This device could not be signed out. Try again.');
        return;
      }
    }
    await endLocalSession();
    setBusy(null);
    showToast('This device is signed out.');
    void load();
  };

  const signOutOthers = async () => {
    setConfirmAll(false);
    setBusy('others');
    const res = await signOutOtherDevices();
    if (!res.ok) {
      setBusy(null);
      showToast(res.error || 'Other devices could not be signed out. Try again.');
      return;
    }
    await endLocalSession();
    setBusy(null);
    showToast('Other devices are signed out. This device has been signed out too.');
    void load();
  };

  const forget = async (id: string) => {
    setBusy(id);
    const res = await removeDevice(id);
    setBusy(null);
    if (!res.ok) {
      showToast(res.error || 'That device could not be removed.');
      return;
    }
    void load();
  };

  const others = devices?.filter((d) => !d.current) ?? [];

  return (
    <main className="profile-screen privacy-screen">
      <ProfileHeader title="Security and devices" eyebrow="Privacy" onBack={goBack} />
      <div className="profile-body">
        {error && <p className="profile-notice privacy-error" role="alert">{error}</p>}

        <section className="profile-card profile-card-body" aria-label="Last sign-in">
          <span className="profile-card-title">Last sign-in</span>
          <p className="profile-card-sub" data-testid="last-sign-in">
            {lastSignInAt ? when(lastSignInAt) : 'Not available yet'}
          </p>
          <p className="profile-card-sub">
            {devices ? `${devices.length} of ${max} devices` : 'Loading devices...'}. The oldest device that has not been used is removed when the list is full.
          </p>
        </section>

        <p className="profile-label">Devices</p>
        <section className="profile-card" aria-label="Signed-in devices">
          {devices?.map((d) => (
            <div key={d.id} className="privacy-device-row">
              <span className="profile-list-icon"><Smartphone size={18} /></span>
              <div className="privacy-device-copy">
                <span className="profile-list-title">
                  {d.name} {d.current && <span className="privacy-this-device">This device</span>}
                </span>
                <span className="profile-list-note">
                  First seen {when(d.firstSeenAt)} · Last seen {when(d.lastSeenAt)}
                </span>
              </div>
              {!d.current && (
                <button type="button" className="profile-button is-small is-outline" onClick={() => forget(d.id)} disabled={busy === d.id} aria-label={`Remove ${d.name}`}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {devices && devices.length === 0 && <p className="profile-card-sub privacy-empty">No other devices are signed in.</p>}
        </section>

        <p className="profile-label">Sign out</p>
        <section className="profile-card profile-card-body" aria-label="Sign out">
          <button type="button" className="profile-button is-outline is-block" onClick={signOutThisDevice} disabled={busy !== null}>
            <LogOut size={16} /> {busy === 'this' ? 'Signing out...' : 'Sign out this device'}
          </button>
          <button type="button" className="profile-button is-outline is-block" onClick={() => setConfirmAll(true)} disabled={busy !== null || others.length === 0}>
            Sign out all other devices
          </button>
          {others.length === 0 && <p className="profile-card-sub">There are no other devices to sign out.</p>}
        </section>
      </div>

      {confirmAll && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-signout-title">
            <h2 id="privacy-signout-title">Sign out all other devices?</h2>
            <p>
              This signs out every other device of your account. It also signs out this device, so you will need to start a new session here.
            </p>
            {guest && (
              <p className="privacy-warning" role="note">
                This is a guest account. On this device the new session is a new guest account, so your order history and saved details will stay with the
                old one and will not show here.
              </p>
            )}
            <button type="button" className="profile-button is-danger is-block" onClick={signOutOthers}>
              Yes, sign out everywhere else
            </button>
            <button type="button" className="profile-button is-outline is-block" onClick={() => setConfirmAll(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
