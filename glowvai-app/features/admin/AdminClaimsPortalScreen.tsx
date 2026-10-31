import { useState } from 'react';
import { CheckCircle2, Eye, Stethoscope, XCircle } from 'lucide-react';
import { AdminChip, AdminEmpty, AdminNotice, AdminShell } from './components/AdminShell';

interface PendingClaim {
  id: string;
  orderId: string;
  customer: string;
  product: string;
  reason: string;
  amount: number;
  photo: string;
}

const INITIAL_CLAIMS: PendingClaim[] = [
  {
    id: 'CLM-89210',
    orderId: 'GV28491',
    customer: 'Ananya Sharma',
    product: 'GlowVAI Barrier Repair Serum',
    reason: 'Adverse Reaction (Breakout on Day 3)',
    amount: 699,
    photo: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'CLM-89211',
    orderId: 'GV28399',
    customer: 'Kavya T.',
    product: 'Minimalist Niacinamide 10%',
    reason: 'Transit Leakage / Damaged Bottle',
    amount: 599,
    photo: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=300&q=80',
  },
];

export const AdminClaimsPortalScreen = () => {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>(INITIAL_CLAIMS);
  const [notice, setNotice] = useState<{ title: string; text: string; tone: 'success' | 'info' } | null>(null);

  const removeClaim = (claimId: string) => {
    setPendingClaims((prev) => prev.filter((c) => c.id !== claimId));
  };

  const handleApprove = (claim: PendingClaim) => {
    removeClaim(claim.id);
    setNotice({
      title: 'Claim approved',
      text: `Claim #${claim.id} approved. ₹${claim.amount} refunded to customer wallet.`,
      tone: 'success',
    });
  };

  const handleReject = (claimId: string) => {
    removeClaim(claimId);
    setNotice({
      title: 'Claim rejected',
      text: `Claim #${claimId} rejected with clinical review notes sent to user.`,
      tone: 'info',
    });
  };

  return (
    <AdminShell
      active="admin-claims"
      title="Dermatology claims"
      subtitle="Beauty protection claims queue for 14-day warranty refunds."
    >
      {notice && (
        <AdminNotice title={notice.title} text={notice.text} tone={notice.tone} onClose={() => setNotice(null)} />
      )}

      <div className="admin-hero">
        <div className="admin-hero-icon">
          <Stethoscope size={22} />
        </div>
        <div>
          <p className="admin-hero-title">Review photo evidence and medical descriptions</p>
          <p className="admin-hero-text">Approve to refund the customer wallet, or reject with review notes.</p>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">Pending review queue</h2>
          <AdminChip tone={pendingClaims.length > 0 ? 'warning' : 'success'}>
            {pendingClaims.length} pending
          </AdminChip>
        </div>

        {pendingClaims.length === 0 ? (
          <AdminEmpty
            icon={<CheckCircle2 size={28} />}
            title="All beauty protection claims reviewed"
            text="New claims will appear here as customers submit them."
          />
        ) : (
          <div className="admin-claim-grid">
            {pendingClaims.map((claim) => (
              <article key={claim.id} className="admin-claim-card">
                <div className="admin-claim-top">
                  <div>
                    <p className="admin-claim-id">{claim.id}</p>
                    <span className="admin-section-note">
                      Order #{claim.orderId} · {claim.customer}
                    </span>
                  </div>
                  <span className="admin-claim-amount">₹{claim.amount}</span>
                </div>

                <div className="admin-claim-body">
                  <img className="admin-claim-photo" src={claim.photo} alt={`Evidence for claim ${claim.id}`} />
                  <div className="admin-claim-lines">
                    <div>
                      <span className="admin-claim-label">Product</span>
                      <div>{claim.product}</div>
                    </div>
                    <div>
                      <span className="admin-claim-label">Reason</span>
                      <div className="admin-claim-reason">{claim.reason}</div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm"
                      onClick={() => window.open(claim.photo, '_blank', 'noopener')}
                    >
                      <Eye size={14} />
                      View full photo
                    </button>
                  </div>
                </div>

                <div className="admin-claim-actions">
                  <button type="button" className="admin-btn admin-btn--success" onClick={() => handleApprove(claim)}>
                    <CheckCircle2 size={16} />
                    Approve refund
                  </button>
                  <button type="button" className="admin-btn admin-btn--danger" onClick={() => handleReject(claim.id)}>
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
};
