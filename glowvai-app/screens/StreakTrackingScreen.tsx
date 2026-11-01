import React, { useRef, useState } from 'react';
import { AlertTriangle, Award, Camera, Check, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OrdersHeader } from '../features/orders/components/OrdersHeader';
import { OrdersState } from '../features/orders/components/OrderParts';

// Daily check-ins for a product bought with suitability cover. Every value comes from the streak in app state.
export const StreakTrackingScreen: React.FC = () => {
  const { goBack, navigate, streaks, activeStreak, logStreakEvidence, reportAdverseReaction, submitClaim } = useApp();
  const streak = activeStreak || streaks[0];

  const [uploading, setUploading] = useState(false);
  const dailyPhotoInput = useRef<HTMLInputElement>(null);
  const [adverseOpen, setAdverseOpen] = useState(false);
  const [reactionDescription, setReactionDescription] = useState('');
  const [claimFeedback, setClaimFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  if (!streak) {
    return (
      <main className="orders-screen streak-screen">
        <OrdersHeader title="Suitability cover" onBack={goBack} />
        <div className="orders-content">
          <OrdersState icon={<ShieldCheck size={30} />} title="No routine to check in yet" body="When you buy a product with suitability cover, its daily check-ins appear here.">
            <button className="orders-primary-button" onClick={() => navigate('shop-home')}>Browse products</button>
          </OrdersState>
        </div>
      </main>
    );
  }

  const total = streak.totalDaysRequired;
  const isCompleted = streak.completedDays >= total;
  const progressPercent = Math.min(100, Math.round((streak.completedDays / total) * 100));

  // Evidence is the photo the customer takes or chooses. No placeholder image is ever recorded for a day.
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

  const handleReportReaction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reactionDescription.trim()) return;
    setBusy(true);
    await reportAdverseReaction(streak.trackingId, reactionDescription.trim());
    setBusy(false);
    setAdverseOpen(false);
    setReactionDescription('');
  };

  const handleSubmitClaim = async () => {
    if (!claimFeedback.trim()) return;
    setBusy(true);
    await submitClaim(streak.trackingId, claimFeedback.trim());
    setBusy(false);
  };

  return (
    <main className="orders-screen streak-screen">
      <OrdersHeader
        title="Suitability cover"
        subtitle={`Policy ${streak.policyVersion}`}
        onBack={goBack}
        right={
          <button className="streak-report-button" onClick={() => setAdverseOpen(true)}>
            <AlertTriangle size={15} /> Report reaction
          </button>
        }
      />

      <div className="orders-content">
        <div className="orders-two-col">
          <div className="orders-col-main">
            <section className="orders-card streak-product">
              {streak.productImage ? <img src={streak.productImage} alt="" /> : <span className="orders-thumb-empty is-large" aria-hidden="true"><ShieldCheck size={22} /></span>}
              <div>
                <span className="streak-kicker">Covered routine</span>
                <h2>{streak.productName}</h2>
                <small>Check-in period {streak.startDate} to {streak.endDate} · Order #{streak.orderId}</small>
              </div>
            </section>

            <section className="orders-card streak-progress-card">
              <div className="streak-progress-head">
                <div>
                  <span className="streak-kicker">Days logged</span>
                  <strong>{streak.completedDays} of {total} days</strong>
                </div>
                <b>{progressPercent}%</b>
              </div>
              <div className="streak-progress" role="progressbar" aria-label="Days logged" aria-valuemin={0} aria-valuemax={total} aria-valuenow={streak.completedDays} aria-valuetext={`${streak.completedDays} of ${total} days logged`}>
                <span style={{ width: `${progressPercent}%` }} className={isCompleted ? 'is-complete' : ''} />
              </div>
              <div className="streak-progress-scale" aria-hidden="true"><span>Day 1</span><span>Day {total}</span></div>

              {isCompleted ? (
                <div className="streak-callout is-success">
                  <Award size={20} />
                  <div>
                    <b>{total}-day routine complete</b>
                    <small>You can now ask for a suitability review.</small>
                  </div>
                </div>
              ) : (
                <div className="streak-callout">
                  <Camera size={20} />
                  <div>
                    <b>Today’s check-in photo</b>
                    <small>Take a photo in natural light after applying the product.</small>
                  </div>
                  <button className="orders-primary-button" onClick={() => dailyPhotoInput.current?.click()} disabled={uploading}>
                    {uploading ? 'Saving…' : 'Log today'}
                  </button>
                  <input ref={dailyPhotoInput} type="file" accept="image/*" capture="user" onChange={handleDailyPhoto} hidden aria-label="Daily check-in photo" />
                </div>
              )}
            </section>

            <section className="orders-card">
              <div className="orders-card-title-row">
                <h2 className="orders-card-title">Daily log</h2>
                <span className="streak-legend"><i className="is-done" /> Logged <i /> Not yet</span>
              </div>
              <ol className="streak-days">
                {streak.days.map((day) => (
                  <li key={day.day} className={day.completed ? 'is-done' : day.missed ? 'is-missed' : ''} aria-label={`Day ${day.day}, ${day.date}: ${day.completed ? 'logged' : day.missed ? 'missed' : 'not logged yet'}`}>
                    <small>Day {day.day}</small>
                    {day.completed ? <Check size={15} strokeWidth={3} /> : <span className="streak-day-dot" />}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="orders-col-side">
            {streak.claimOutcome ? (
              <section className={`orders-card streak-claim ${streak.claimOutcome.approved ? 'is-approved' : 'is-declined'}`}>
                <h2 className="orders-card-title">Review {streak.claimOutcome.approved ? 'approved' : 'declined'}</h2>
                <p>
                  {streak.claimOutcome.approved
                    ? `Benefit: ₹${streak.claimOutcome.amount}. Our team will confirm how it is paid.`
                    : 'No benefit was approved for this review.'}
                </p>
                <small>Decided {streak.claimOutcome.decisionDate} · {streak.claimOutcome.reason}</small>
              </section>
            ) : streak.status === 'claim_submitted' ? (
              <section className="orders-card streak-claim">
                <h2 className="orders-card-title">Review in progress</h2>
                <p>We have your request. No refund has been issued yet; we will update you when a decision is made.</p>
              </section>
            ) : streak.status === 'adverse_reaction_reported' ? (
              <section className="orders-card streak-claim is-declined">
                <h2 className="orders-card-title">Reaction reported</h2>
                <p>Please stop using this product. Our team will contact you about your report.</p>
              </section>
            ) : isCompleted ? (
              <section className="orders-card streak-claim">
                <h2 className="orders-card-title">Ask for a suitability review</h2>
                <p>Did this product not suit your skin, for example breakouts or dryness? Tell us what you noticed.</p>
                <textarea aria-label="What did you notice?" placeholder="What did you notice?" value={claimFeedback} onChange={(event) => setClaimFeedback(event.target.value)} />
                <button className="orders-primary-button is-block" onClick={handleSubmitClaim} disabled={!claimFeedback.trim() || busy}>
                  Send for review
                </button>
              </section>
            ) : (
              <section className="orders-card streak-claim">
                <h2 className="orders-card-title">How the review works</h2>
                <p>Log a photo each day for {total} days. After the last day you can ask for a suitability review of this product.</p>
              </section>
            )}

            <section className="streak-safety" role="note">
              <AlertTriangle size={16} />
              <p>
                <b>Stop using the product</b> if you notice strong redness, burning, swelling or irritation, and see a dermatologist.
              </p>
            </section>
          </div>
        </div>
      </div>

      {adverseOpen && (
        <div className="orders-dialog-backdrop">
          <form className="orders-dialog" role="dialog" aria-modal="true" aria-labelledby="reaction-title" onSubmit={handleReportReaction}>
            <span className="orders-dialog-icon" aria-hidden="true"><AlertTriangle size={22} /></span>
            <h2 id="reaction-title">Report a reaction</h2>
            <p>Please stop using this product. Tell us what happened and our team will follow up.</p>
            <label className="orders-field">
              <span>What happened?</span>
              <textarea required value={reactionDescription} onChange={(event) => setReactionDescription(event.target.value)} placeholder="For example itching, rash or burning" />
            </label>
            <button type="submit" className="orders-danger-button is-block" disabled={!reactionDescription.trim() || busy}>Send report</button>
            <button type="button" className="orders-secondary-button is-block is-quiet" onClick={() => setAdverseOpen(false)}>Cancel</button>
          </form>
        </div>
      )}
    </main>
  );
};
