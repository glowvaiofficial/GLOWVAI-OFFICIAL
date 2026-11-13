import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Download, Gift, KeyRound, ScrollText, ShieldCheck, Trash2, CreditCard, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from '../profile/ProfileShared';
import '../profile/profile.css';
import './privacy.css';
import {
  changeDeletion,
  downloadMyData,
  fetchConsents,
  fetchDeletion,
  fetchSummary,
  saveConsents,
  type ConsentState,
  type DeletionTiming,
  type DeletionView,
  type PrivacySummary,
} from './privacyApi';

const dateLabel = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;

const DELETION_COPY: Record<string, string> = {
  REQUESTED: 'We have your request. You can cancel it until our team starts working on it.',
  PROCESSING: 'Our team has started deleting your account. This request can no longer be cancelled.',
  COMPLETED: 'Your account has been deleted.',
  CANCELLED: 'You cancelled your last request. Your account is unchanged.',
};

// The privacy centre: your data, download, consent, links to security and devices, saved payment methods and gift cards,
// account deletion requests, and the policies. Each change is a server call; nothing here is stored in the browser.
export const PrivacyCenterScreen = () => {
  const { navigate, goBack, showToast } = useApp();
  const [summary, setSummary] = useState<PrivacySummary | null>(null);
  const [consents, setConsents] = useState<ConsentState | null>(null);
  const [deletion, setDeletion] = useState<{ request: DeletionView | null; timing: DeletionTiming } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const [s, c, d] = await Promise.all([fetchSummary(), fetchConsents(), fetchDeletion()]);
    if (s.ok && s.data) setSummary(s.data.summary);
    if (c.ok && c.data) setConsents(c.data.consents);
    if (d.ok && d.data) setDeletion(d.data);
    setError(!s.ok ? s.error : !c.ok ? c.error : !d.ok ? d.error : null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: 'marketing' | 'analytics') => {
    if (!consents) return;
    setBusy(key);
    const next = !consents[key];
    const res = await saveConsents({ [key]: next });
    setBusy(null);
    if (!res.ok || !res.data) {
      showToast(res.error || 'That choice could not be saved.');
      return;
    }
    setConsents(res.data.consents);
    showToast(next ? 'Thanks. Your choice is saved.' : key === 'marketing' ? 'Offers notifications are off too.' : 'Your choice is saved.');
  };

  const download = async () => {
    setBusy('export');
    const res = await downloadMyData();
    setBusy(null);
    if (!res.ok) showToast(res.error);
    else showToast('Your data file is downloading.');
  };

  const requestDeletion = async () => {
    setConfirmDelete(false);
    setBusy('delete');
    const res = await changeDeletion('request');
    setBusy(null);
    if (!res.ok || !res.data) {
      showToast(res.error || 'The request could not be sent. Try again.');
      return;
    }
    setDeletion(res.data);
    showToast('Your deletion request is recorded.');
  };

  const cancelDeletion = async () => {
    setBusy('cancel');
    const res = await changeDeletion('cancel');
    setBusy(null);
    if (!res.ok || !res.data) {
      showToast(res.error || 'The request could not be cancelled.');
      return;
    }
    setDeletion(res.data);
    showToast('Your deletion request is cancelled.');
  };

  const openRequest = deletion?.request && (deletion.request.status === 'REQUESTED' || deletion.request.status === 'PROCESSING') ? deletion.request : null;

  return (
    <main className="profile-screen privacy-screen">
      <ProfileHeader title="Privacy and security" eyebrow="Your account" onBack={goBack} />

      <div className="profile-body">
        {error && <p className="profile-notice privacy-error" role="alert">{error}</p>}

        <p className="profile-label">Your data</p>
        <section className="profile-card profile-card-body" aria-label="Your data">
          {summary ? (
            <>
              <div className="privacy-kv">
                <span>Name</span>
                <strong>{summary.profile.name || 'Not added'}</strong>
                <span>Mobile</span>
                <strong>{summary.profile.phone || 'Not added'}</strong>
                <span>Email</span>
                <strong>{summary.profile.email || 'Not added'}</strong>
              </div>
              <p className="profile-card-sub">
                {summary.counts.orders} orders, {summary.counts.addresses} saved addresses, {summary.counts.reviews} reviews,{' '}
                {summary.counts.wishlist} wishlist items, {summary.counts.subscriptions} subscriptions, {summary.counts.supportTickets} support requests,{' '}
                {summary.counts.devices} devices.
              </p>
            </>
          ) : (
            <p className="profile-card-sub">{error ? 'Your data could not be loaded. Try again later.' : 'Loading your data...'}</p>
          )}
          <button type="button" className="profile-button is-outline is-block" onClick={download} disabled={busy === 'export'}>
            <Download size={16} /> {busy === 'export' ? 'Preparing your file...' : 'Download my data (JSON)'}
          </button>
          <p className="profile-card-sub">
            The file holds your profile, addresses, order summaries, reviews, wishlist, subscriptions, activity and support request list. It does not
            include internal notes or staff information. It is made when you ask for it and is not emailed.
          </p>
        </section>

        <p className="profile-label">Consent</p>
        <section className="profile-card profile-card-body" aria-label="Consent choices">
          <ConsentRow
            title="Marketing"
            note="Offers, new products and news. Turning this off also turns off offers notifications."
            on={consents?.marketing ?? false}
            changed={dateLabel(consents?.marketingUpdatedAt ?? null)}
            disabled={!consents || busy === 'marketing'}
            onToggle={() => toggle('marketing')}
          />
          <ConsentRow
            title="Analytics"
            note="Anonymous usage measurements that help us improve the shop."
            on={consents?.analytics ?? false}
            changed={dateLabel(consents?.analyticsUpdatedAt ?? null)}
            disabled={!consents || busy === 'analytics'}
            onToggle={() => toggle('analytics')}
          />
        </section>

        <p className="profile-label">Security and payments</p>
        <section className="profile-card" aria-label="Security and payments">
          <LinkRow icon={<ShieldCheck size={18} />} title="Security and devices" note="See where your account is signed in and sign out other devices" onClick={() => navigate('privacy-devices')} />
          <LinkRow icon={<CreditCard size={18} />} title="Saved payment methods" note="Cards and UPI handles saved by Razorpay" onClick={() => navigate('payment-methods')} />
          <LinkRow icon={<Gift size={18} />} title="Gift cards" note="Buy a gift card or redeem a code" onClick={() => navigate('gift-cards')} />
        </section>

        <p className="profile-label">Delete my account</p>
        <section className="profile-card profile-card-body" aria-label="Account deletion">
          <p className="profile-card-sub">
            Asking to delete your account starts a request. Our team acknowledges requests within {deletion?.timing.acknowledgeWithin ?? '48 hours'} and resolves
            them within {deletion?.timing.resolveWithin ?? '7 business days'}. The deletion itself is carried out by the GlowVai team, not by this app.
          </p>
          {openRequest ? (
            <>
              <p className="profile-card-sub" role="status">
                {DELETION_COPY[openRequest.status]} Requested on {dateLabel(openRequest.requestedAt)}.
              </p>
              {openRequest.status === 'REQUESTED' && (
                <button type="button" className="profile-button is-outline is-block" onClick={cancelDeletion} disabled={busy === 'cancel'}>
                  {busy === 'cancel' ? 'Cancelling...' : 'Cancel my deletion request'}
                </button>
              )}
            </>
          ) : (
            <button type="button" className="profile-button is-danger is-block" onClick={() => setConfirmDelete(true)} disabled={!deletion || busy === 'delete'}>
              <Trash2 size={16} /> Request account deletion
            </button>
          )}
          {deletion?.request && deletion.request.status === 'CANCELLED' && !openRequest && (
            <p className="profile-card-sub">{DELETION_COPY.CANCELLED}</p>
          )}
        </section>

        <p className="profile-label">Policies</p>
        <section className="profile-card" aria-label="Policies">
          <a className="profile-list-item privacy-link" href="/privacy" target="_blank" rel="noopener noreferrer">
            <span className="profile-list-icon"><ScrollText size={18} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">Privacy policy</span></span>
            <ChevronRight size={18} className="profile-chevron" />
          </a>
          <a className="profile-list-item privacy-link" href="/terms" target="_blank" rel="noopener noreferrer">
            <span className="profile-list-icon"><KeyRound size={18} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">Terms of use</span></span>
            <ChevronRight size={18} className="profile-chevron" />
          </a>
        </section>
      </div>

      {confirmDelete && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-delete-title">
            <h2 id="privacy-delete-title">Request account deletion?</h2>
            <p>
              We will record your request. Until our team starts processing it, you can cancel it here. Once it is processed, it cannot be undone.
            </p>
            <button type="button" className="profile-button is-danger is-block" onClick={requestDeletion}>
              Yes, request deletion
            </button>
            <button type="button" className="profile-button is-outline is-block" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

const ConsentRow = ({ title, note, on, changed, disabled, onToggle }: { title: string; note: string; on: boolean; changed: string | null; disabled: boolean; onToggle: () => void }) => (
  <div className="privacy-consent-row">
    <div className="privacy-consent-copy">
      <strong>{title}</strong>
      <span className="profile-card-sub">{note}</span>
      <span className="privacy-consent-date">{changed ? `Last changed ${changed}` : 'Not changed yet'}</span>
    </div>
    <button type="button" role="switch" aria-checked={on} aria-label={`${title} consent`} className={`privacy-switch${on ? ' is-on' : ''}`} disabled={disabled} onClick={onToggle}>
      <span className="privacy-switch-knob" />
    </button>
  </div>
);

const LinkRow = ({ icon, title, note, onClick }: { icon: ReactNode; title: string; note: string; onClick: () => void }) => (
  <button type="button" className="profile-list-item" onClick={onClick}>
    <span className="profile-list-icon">{icon}</span>
    <span className="profile-list-copy">
      <span className="profile-list-title">{title}</span>
      <span className="profile-list-note">{note}</span>
    </span>
    <ChevronRight size={18} className="profile-chevron" />
  </button>
);
