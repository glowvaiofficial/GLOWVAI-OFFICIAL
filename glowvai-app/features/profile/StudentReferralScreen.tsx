import { ExternalLink, GraduationCap, Info } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { openExternal, ProfileHeader, STUDENT_PORTAL_URL } from './ProfileShared';

// Student verification is handled on the earn portal. The shop does not store a student status or issue a
// student referral code, so this page explains the programme and links to the portal instead of verifying here.
const PORTAL_LABEL = STUDENT_PORTAL_URL.replace(/^https:\/\//, '');

const STEPS = [
  { title: 'Open the earn portal', desc: `Go to ${PORTAL_LABEL} on your phone or laptop.` },
  { title: 'Sign up and verify', desc: 'Follow the steps on the portal to register and verify your student status.' },
  { title: 'Track it on the portal', desc: 'Your verification status and any campus referrals are shown on the portal, not in the shop.' },
];

export const StudentReferralScreen = () => {
  const { goBack } = useApp();

  return (
    <main className="profile-screen is-narrow">
      <ProfileHeader title="Student programme" eyebrow="Glow rewards" onBack={goBack} />

      <div className="profile-body">
        <section className="profile-card profile-card-body">
          <div className="profile-status-head">
            <span className="profile-status-icon"><GraduationCap size={20} /></span>
            <div>
              <h2 className="profile-card-title">glowvai campus programme</h2>
              <p className="profile-card-sub">
                Students can apply to the campus programme on the glowvai earn portal. Verification happens there.
              </p>
            </div>
          </div>
        </section>

        <p className="profile-label">How it works</p>
        <ol className="profile-card profile-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="profile-step">
              <span className="profile-step-badge">{index + 1}</span>
              <span className="profile-list-copy">
                <span className="profile-list-title">{step.title}</span>
                <span className="profile-list-note">{step.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="profile-notice">
          <Info size={16} />
          <span>Your student status is not stored in the web shop, so this page cannot show whether you are verified.</span>
        </p>

        <button type="button" className="profile-button is-primary is-block" onClick={() => openExternal(STUDENT_PORTAL_URL)}>
          Open earn portal
          <ExternalLink size={16} />
        </button>
      </div>
    </main>
  );
};
