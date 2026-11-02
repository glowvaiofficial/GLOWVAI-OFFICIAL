import React, { useRef, useState } from 'react';
import { AlertTriangle, Award, Camera, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { openWhatsAppSupport } from '../core/utils/whatsapp';
import { ProfileHeader } from '../features/profile/ProfileShared';
import '../features/profile/profile.css';
import '../responsive/profile-admin.css';

// Reaction reports and claims have no backend yet, so both go to the support team on WhatsApp with the details filled in.
// Day check-ins are kept in the app state on this device.
export const StreakTrackingScreen: React.FC = () => {
  const { goBack, navigate, streaks, activeStreak, logStreakEvidence } = useApp();

  const streak = activeStreak || streaks[0];

  const [uploading, setUploading] = useState(false);
  const dailyPhotoInput = useRef<HTMLInputElement>(null);
  const [adverseModalOpen, setAdverseModalOpen] = useState(false);
  const [reactionDescription, setReactionDescription] = useState('');
  const [claimFeedback, setClaimFeedback] = useState('');

  if (!streak) {
    return (
      <main className="profile-screen">
        <ProfileHeader title="Suitability cover" onBack={goBack} />
        <div className="profile-body">
          <section className="profile-card profile-card-body profile-empty-state">
            <span className="profile-feature-icon"><ShieldCheck size={22} /></span>
            <h2 className="profile-card-title">No covered products yet</h2>
            <p className="profile-card-sub">When you add suitability cover to a product at checkout, its daily check-in shows up here after you order.</p>
            <div className="profile-button-row">
              <button type="button" className="profile-button is-primary" onClick={() => navigate('shop-home')}>Browse products</button>
              <button type="button" className="profile-button is-outline" onClick={() => navigate('orders-list')}>View orders</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const isCompleted = streak.completedDays >= streak.totalDaysRequired;
  const progressPercent = Math.round((streak.completedDays / streak.totalDaysRequired) * 100);
  const reference = `${streak.productName} (order #${streak.orderId}, tracking ${streak.trackingId})`;

  // Evidence is the photo the customer takes or chooses. No placeholder image is ever recorded for a day.
  const handleQuickDailyLog = () => dailyPhotoInput.current?.click();

  const handleDailyPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      logStreakEvidence(streak.trackingId, 'photo', String(reader.result));
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const handleReportReaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactionDescription.trim()) return;
    openWhatsAppSupport(`Hi GlowVai support,\nI want to report a skin reaction to ${reference}.\n\n${reactionDescription.trim()}`);
    setAdverseModalOpen(false);
    setReactionDescription('');
  };

  const handleSendClaim = () => {
    const feedback = claimFeedback.trim() || 'I completed the routine and the product did not suit my skin.';
    openWhatsAppSupport(`Hi GlowVai support,\nI would like to make a suitability claim for ${reference}.\n\n${feedback}`);
  };

  return (
    <main className="profile-screen">
      <ProfileHeader
        title="Suitability cover"
        eyebrow={`Policy ${streak.policyVersion}`}
        onBack={goBack}
        right={(
          <button type="button" className="profile-button is-danger-outline is-small" onClick={() => setAdverseModalOpen(true)}>
            <AlertTriangle size={14} />
            Report reaction
          </button>
        )}
      />

      <div className="profile-body">
        <div className="profile-side">
          <section className="profile-card profile-product-row">
            <img src={streak.productImage} alt="" className="profile-product-image" />
            <span className="profile-list-copy">
              <span className="profile-pill">Covered routine</span>
              <span className="profile-list-title">{streak.productName}</span>
              <span className="profile-list-note">Tracking {streak.startDate} – {streak.endDate}</span>
            </span>
          </section>

          <section className="profile-card profile-card-body">
            <div className="profile-stat-row">
              <span className="profile-label">Routine progress</span>
              <span className="profile-stat-value">{progressPercent}%</span>
            </div>
            <h2 className="profile-card-title">Day {streak.completedDays} of {streak.totalDaysRequired} logged</h2>
            <div className="profile-progress" role="progressbar" aria-valuemin={0} aria-valuemax={streak.totalDaysRequired} aria-valuenow={streak.completedDays}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>

            {isCompleted ? (
              <div className="profile-notice is-success">
                <Award size={18} />
                <span><b>Routine completed.</b> You can now send a suitability claim if the product did not suit you.</span>
              </div>
            ) : (
              <div className="profile-notice profile-log-row">
                <span>
                  <b>Today's photo check-in</b><br />
                  Take a photo in natural light after applying the product.
                </span>
                <button type="button" className="profile-button is-primary is-small" onClick={handleQuickDailyLog} disabled={uploading}>
                  <Camera size={14} />
                  {uploading ? 'Saving…' : 'Log day'}
                </button>
                <input ref={dailyPhotoInput} type="file" accept="image/*" capture="user" onChange={handleDailyPhoto} hidden aria-label="Daily check-in photo" />
              </div>
            )}
          </section>
        </div>

        <div className="profile-main">
          <p className="profile-label">Daily check-ins</p>
          <section className="profile-card profile-card-body">
            <div className="profile-day-grid">
              {streak.days.map((d) => (
                <div key={d.day} className={d.completed ? 'profile-day is-done' : 'profile-day'} aria-label={`Day ${d.day} ${d.completed ? 'logged' : 'not logged'}`}>
                  <span>Day {d.day}</span>
                  {d.completed ? <CheckCircle2 size={15} /> : <i />}
                </div>
              ))}
            </div>
          </section>

          {streak.claimOutcome ? (
            <section className={streak.claimOutcome.approved ? 'profile-notice is-success' : 'profile-notice is-error'}>
              <CheckCircle2 size={18} />
              <span>
                <b>Suitability claim {streak.claimOutcome.approved ? 'approved' : 'declined'}.</b>{' '}
                {streak.claimOutcome.approved ? `Benefit: ₹${streak.claimOutcome.amount}. Our team will confirm how it is paid.` : 'No benefit was approved for this claim.'}
                <br />Decided {streak.claimOutcome.decisionDate} · {streak.claimOutcome.reason}
              </span>
            </section>
          ) : streak.status === 'claim_submitted' ? (
            <section className="profile-card profile-card-body">
              <h2 className="profile-card-title">Claim under review</h2>
              <p className="profile-card-sub">No refund has been issued yet. We will update you once a decision is made.</p>
            </section>
          ) : isCompleted ? (
            <section className="profile-card profile-card-body">
              <h2 className="profile-card-title">Send a suitability claim</h2>
              <p className="profile-card-sub">Did the product cause breakouts, too much dryness, or not suit your skin? Tell the team what happened.</p>
              <textarea
                className="profile-input is-textarea"
                placeholder="Describe how your skin reacted"
                value={claimFeedback}
                onChange={(e) => setClaimFeedback(e.target.value)}
                aria-label="Describe your skin experience"
              />
              <button type="button" className="profile-button is-primary is-block" onClick={handleSendClaim}>
                <MessageSquare size={16} />
                Send claim on WhatsApp
              </button>
              <p className="profile-field-hint">Opens WhatsApp with your claim filled in. The team reviews it and replies there.</p>
            </section>
          ) : null}

          <section className="profile-notice is-warning">
            <AlertTriangle size={18} />
            <span><b>Safety:</b> if you get severe redness, burning, swelling or irritation, stop using the product and see a dermatologist.</span>
          </section>
        </div>
      </div>

      {adverseModalOpen && (
        <div className="profile-modal-backdrop">
          <form className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="reaction-title" onSubmit={handleReportReaction}>
            <h2 id="reaction-title">Report a skin reaction</h2>
            <p>Stop using this product now. Describe what happened and we will open WhatsApp so you can send it to our support team.</p>
            <textarea
              className="profile-input is-textarea"
              required
              placeholder="Itching, rash, burning…"
              value={reactionDescription}
              onChange={(e) => setReactionDescription(e.target.value)}
              aria-label="Describe your symptoms"
            />
            <button type="submit" className="profile-button is-danger is-block">
              <MessageSquare size={16} />
              Send on WhatsApp
            </button>
            <button type="button" className="profile-button is-outline is-block" onClick={() => setAdverseModalOpen(false)}>Cancel</button>
          </form>
        </div>
      )}
    </main>
  );
};
