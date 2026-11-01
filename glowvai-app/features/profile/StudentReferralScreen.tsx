import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Clock, Copy, GraduationCap, Share2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { storage } from '../../core/utils/storage';
import { syncUserOnboardingData } from '../../core/services/userSyncService';
import { copyText, getReferralCode, openExternal, ProfileHeader } from './ProfileShared';

type StudentStatus = 'UNSUBMITTED' | 'PENDING' | 'VERIFIED';

const STATUS_KEY = 'glowvai:student-status';
const STUDENT_PORTAL_URL = 'https://earn.glowvai.in';

const isCollegeEmail = (email: string): boolean => email.endsWith('.ac.in') || email.endsWith('.edu');

export const StudentReferralScreen = () => {
  const { user, goBack, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<StudentStatus>('UNSUBMITTED');
  const [collegeName, setCollegeName] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOn, setSubmittedOn] = useState<string | null>(null);
  const referralCode = getReferralCode(user?.id);
  const shareMessage = `Join GlowVAI with my student referral code ${referralCode} to get FLAT ₹100 OFF your first clinical skincare order!`;
  const emailIsCollegeDomain = isCollegeEmail(collegeEmail.trim());
  const isFormValid = collegeName.trim().length >= 3 && (Boolean(idPreviewUrl) || emailIsCollegeDomain);

  useEffect(() => {
    storage.getItem(STATUS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { status?: StudentStatus; submittedOn?: string };
        if (saved.status === 'VERIFIED' || saved.status === 'PENDING') setStatus(saved.status);
        if (saved.submittedOn) setSubmittedOn(saved.submittedOn);
      } catch {
        // ignore corrupt saved status
      }
    });
  }, []);

  // Free the preview URL when the ID photo changes or the screen unmounts.
  useEffect(() => () => {
    if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl);
  }, [idPreviewUrl]);

  const handleIdChange = (file: File | undefined) => {
    if (!file) return;
    setIdPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await syncUserOnboardingData({ name: user?.name || 'Student Member' });
    } catch {
      // the local status still moves forward, as in the mobile app
    }
    const nextStatus: StudentStatus = emailIsCollegeDomain ? 'VERIFIED' : 'PENDING';
    const date = new Date().toLocaleDateString();
    setStatus(nextStatus);
    setSubmittedOn(date);
    storage.setItem(STATUS_KEY, JSON.stringify({ status: nextStatus, submittedOn: date }));
    setIsSubmitting(false);
  };

  const handleShareCode = async () => {
    if (!navigator.share) {
      const ok = await copyText(shareMessage);
      showToast(ok ? 'Referral message copied' : 'Sharing is not available on this browser');
      return;
    }
    try {
      await navigator.share({ text: shareMessage });
    } catch {
      // user cancelled the share sheet
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyText(referralCode);
    showToast(ok ? 'Referral code copied' : 'Could not copy the code');
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Student verification" onBack={goBack} />

      <div className="profile-body">
        {status === 'VERIFIED' && (
          <>
            <span className="profile-pill is-success profile-status-pill"><CheckCircle2 size={14} />Verified student</span>
            <section className="profile-card profile-card-body">
              <span className="profile-card-title">Your student referral code</span>
              <p className="profile-card-sub">Share this code with fellow students and earn 50 GlowVAI Coins per friend's first order!</p>
              <div className="profile-code-row">
                <span className="profile-code-text">{referralCode}</span>
                <button type="button" className="profile-icon-button" onClick={handleCopyCode} aria-label="Copy referral code">
                  <Copy size={16} />
                </button>
              </div>
              <button type="button" className="profile-button is-primary is-block" onClick={handleShareCode}>
                <Share2 size={16} />
                Share code
              </button>
            </section>
          </>
        )}

        {status === 'PENDING' && (
          <>
            <span className="profile-pill is-warning profile-status-pill"><Clock size={14} />Under review</span>
            <section className="profile-card profile-card-body">
              <span className="profile-card-title">Verification timeline</span>
              <div className="profile-timeline">
                <span className="profile-timeline-row"><CheckCircle2 size={18} />1. Submitted{submittedOn ? ` · ${submittedOn}` : ''}</span>
                <span className="profile-timeline-row"><Clock size={18} />2. Under review (current)</span>
                <span className="profile-timeline-row is-pending"><GraduationCap size={18} />3. Decision</span>
              </div>
            </section>
            <p className="profile-card-sub">Student ID reviews typically take 24–48 hours. You will receive an alert once approved.</p>
          </>
        )}

        {status === 'UNSUBMITTED' && (
          <>
            <section className="profile-notice">
              <GraduationCap size={18} />
              <span>Verified students unlock exclusive discounts and earn referral coins.</span>
            </section>

            <section className="profile-card profile-card-body">
              <label className="profile-field">
                <span className="profile-field-label">College or university name</span>
                <input className="profile-input" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="e.g. VIT Vellore" />
              </label>

              <div className="profile-field">
                <span className="profile-field-label">Student ID card photo</span>
                <button type="button" className="profile-upload" onClick={() => fileInputRef.current?.click()}>
                  {idPreviewUrl ? <img src={idPreviewUrl} alt="Student ID preview" /> : <><Camera size={28} />Tap to upload student ID</>}
                </button>
                {idPreviewUrl && (
                  <button type="button" className="profile-text-link" onClick={() => fileInputRef.current?.click()}>Retake photo</button>
                )}
                <input
                  ref={fileInputRef}
                  className="profile-file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleIdChange(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              <p className="profile-label profile-or">or</p>

              <label className="profile-field">
                <span className="profile-field-head">
                  <span className="profile-field-label">College email (instant verify)</span>
                  {emailIsCollegeDomain && <span className="profile-pill is-success">Instant</span>}
                </span>
                <input className="profile-input" type="email" value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)} placeholder="name@college.ac.in" autoCapitalize="none" />
                <span className="profile-field-hint">Use a .ac.in or .edu address to verify instantly.</span>
              </label>

              <button type="button" className="profile-button is-primary is-block" onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
                Submit for verification
              </button>
            </section>
          </>
        )}

        <button type="button" className="profile-text-link" onClick={() => openExternal(STUDENT_PORTAL_URL)}>
          Open the student earn portal ↗
        </button>
      </div>
    </main>
  );
};
